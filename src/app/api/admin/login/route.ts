import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { verifyTurnstile } from '@/lib/auth/turnstile';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rate-limit';
import { logActivity, getClientIp } from '@/lib/activity-log';
import { getGeoInfo, isOutsideSlovakia } from '@/lib/geo';
import { sendGeoAlertEmail, sendAdminOtpEmail } from '@/lib/email';

export const runtime = 'edge';
const challengeSecret = new TextEncoder().encode(process.env.SESSION_SECRET || 'fallback-secret-change-me');

/** Constant-time string comparison via SHA-256 to avoid timing attacks */
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const va = new Uint8Array(ha);
  const vb = new Uint8Array(hb);
  if (va.length !== vb.length) return false;
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || '';

  // Rate limit
  const limit = rateLimit(`admin_login_${ip}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Príliš veľa pokusov. Skúste znova o 15 minút.' },
      { status: 429 }
    );
  }

  const body = await request.json();
  const { username, password, turnstileToken } = body;

  if (!username || !password) {
    return NextResponse.json(
      { error: 'Zadajte prihlasovacie údaje.' },
      { status: 400 }
    );
  }

  // Verify Turnstile
  const turnstileValid = await verifyTurnstile(turnstileToken || '');
  if (!turnstileValid) {
    return NextResponse.json(
      { error: 'Overenie CAPTCHA zlyhalo.' },
      { status: 400 }
    );
  }

  // Verify admin credentials from env (plaintext comparison via SHA-256)
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    return NextResponse.json(
      { error: 'Konfigurácia servera nie je správna.' },
      { status: 500 }
    );
  }

  const usernameValid = await timingSafeEqual(username, adminUsername);
  const passwordValid = await timingSafeEqual(password, adminPassword);

  if (!usernameValid || !passwordValid) {
    await logActivity({
      eventType: 'admin_login',
      success: false,
      ipAddress: ip,
      userAgent,
      metadata: { reason: 'invalid_credentials' },
    });
    return NextResponse.json(
      { error: 'Nesprávne prihlasovacie údaje.' },
      { status: 401 }
    );
  }

  const adminTwoFactorEnabled = String(process.env.ADMIN_2FA_ENABLED || 'false').toLowerCase() === 'true';
  const adminTwoFactorEmail = process.env.ADMIN_2FA_EMAIL || process.env.ADMIN_ALERT_EMAIL;

  if (adminTwoFactorEnabled) {
    if (!adminTwoFactorEmail) {
      return NextResponse.json(
        { error: 'Admin 2FA je zapnuté, ale chýba ADMIN_2FA_EMAIL.' },
        { status: 500 }
      );
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const sent = await sendAdminOtpEmail(adminTwoFactorEmail, code);

    if (!sent) {
      return NextResponse.json(
        { error: 'Nepodarilo sa odoslať admin 2FA kód.' },
        { status: 500 }
      );
    }

    const challenge = await new SignJWT({ code } as unknown as Record<string, unknown>)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('10m')
      .sign(challengeSecret);

    const response = NextResponse.json({
      success: true,
      requiresTwoFactor: true,
      message: '2FA kód bol odoslaný na admin email.',
    });

    response.cookies.set('admin_2fa_challenge', challenge, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 600,
      path: '/',
    });

    await logActivity({
      eventType: 'admin_login',
      success: true,
      ipAddress: ip,
      userAgent,
      metadata: { twoFactor: true, phase: 'challenge_sent' },
    });

    return response;
  }

  // Create admin session (8h TTL)
  const token = await createSession({
    userId: 'admin',
    role: 'admin',
    displayName: 'Admin',
  }, 8);

  await setSessionCookie(token, 8);

  // Geo check
  const geo = await getGeoInfo(ip);
  const geoAlert = geo ? isOutsideSlovakia(geo.countryCode) : false;

  await logActivity({
    eventType: 'admin_login',
    success: true,
    ipAddress: ip,
    countryCode: geo?.countryCode || null,
    city: geo?.city || null,
    userAgent,
    geoAlert,
  });

  if (geoAlert && geo) {
    await sendGeoAlertEmail({
      displayName: 'Admin',
      ip,
      country: geo.countryCode,
      city: geo.city,
      userAgent,
      timestamp: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    success: true,
    message: 'Prihlásenie úspešné.',
  });
}
