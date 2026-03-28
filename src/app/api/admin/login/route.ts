import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { verifyTurnstile } from '@/lib/auth/turnstile';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rate-limit';
import { logActivity, getClientIp } from '@/lib/activity-log';
import { getGeoInfo, isOutsideSlovakia } from '@/lib/geo';
import { sendGeoAlertEmail } from '@/lib/email';

export const runtime = 'edge';


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

  // Verify admin credentials from env
  const adminUsernameHash = process.env.ADMIN_USERNAME_HASH;
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminUsernameHash || !adminPasswordHash) {
    return NextResponse.json(
      { error: 'Konfigurácia servera nie je správna.' },
      { status: 500 }
    );
  }

  const usernameValid = await compare(username, adminUsernameHash);
  const passwordValid = await compare(password, adminPasswordHash);

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
