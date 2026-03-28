import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyTurnstile } from '@/lib/auth/turnstile';
import { clearLayerCookies, setLayerCookie } from '@/lib/auth/layers';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rate-limit';
import { logActivity, getClientIp } from '@/lib/activity-log';
import { getGeoInfo, isOutsideSlovakia } from '@/lib/geo';
import { sendGeoAlertEmail, sendOtpEmail } from '@/lib/email';
import { hash } from 'bcryptjs';
import { maskEmail } from '@/lib/utils';

export const runtime = 'edge';


export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || '';

  // Rate limit: 5 attempts per 15 min per IP
  const limit = rateLimit(`login_layer1_${ip}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) {
    await logActivity({
      eventType: 'login_blocked',
      ipAddress: ip,
      userAgent,
      metadata: { reason: 'rate_limit', layer: 1 },
    });
    return NextResponse.json(
      { error: 'Príliš veľa pokusov. Skúste znova o 15 minút.' },
      { status: 429 }
    );
  }

  const body = await request.json();
  const { username, password, turnstileToken } = body;

  if (!username) {
    return NextResponse.json(
      { error: 'Zadajte používateľské meno.' },
      { status: 400 }
    );
  }

  // Verify Turnstile
  const turnstileValid = await verifyTurnstile(turnstileToken || '');
  if (!turnstileValid) {
    return NextResponse.json(
      { error: 'Overenie CAPTCHA zlyhalo. Skúste znova.' },
      { status: 400 }
    );
  }

  // Look up user
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, username, password_hash, is_active, identity_confirmed, role, email, first_name, last_name, last_login_at')
    .eq('username', username.trim())
    .single();

  if (error || !user) {
    await logActivity({
      eventType: 'login_attempt',
      success: false,
      ipAddress: ip,
      userAgent,
      metadata: { layer: 1, reason: 'user_not_found' },
    });
    return NextResponse.json(
      { error: 'Nesprávne prihlasovacie údaje.' },
      { status: 401 }
    );
  }

  if (!user.is_active) {
    return NextResponse.json(
      { error: 'Tento účet bol deaktivovaný.' },
      { status: 403 }
    );
  }

  // Returning users: confirmed identity + email + completed at least one full login (password was set).
  // Users who abandoned setup before layer 4 (password setup) have identity_confirmed + email
  // but no last_login_at — they should go through first-time flow again.
  if (user.identity_confirmed && user.email && user.last_login_at) {
    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Zadajte heslo pre návrat do účtu.' },
        { status: 400 }
      );
    }

    const passwordValid = await compare(password, user.password_hash);
    if (!passwordValid) {
      await logActivity({
        userId: user.id,
        eventType: 'login_attempt',
        success: false,
        ipAddress: ip,
        userAgent,
        metadata: { layer: 1, reason: 'wrong_password' },
      });
      return NextResponse.json(
        { error: 'Nesprávne heslo. Ak ste heslo zabudli, kontaktujte správcu na lukasrajnic@elvoaq.com.' },
        { status: 401 }
      );
    }

    await logActivity({
      userId: user.id,
      eventType: 'login_attempt',
      success: true,
      ipAddress: ip,
      userAgent,
      metadata: { layer: 1, mode: 'returning_password' },
    });

    // Optional 2FA for users (stored in user_security_settings table)
    let userTwoFactorEnabled = false;
    const twoFactorRes = await supabaseAdmin
      .from('user_security_settings')
      .select('two_factor_enabled')
      .eq('user_id', user.id)
      .single();

    if (!twoFactorRes.error && twoFactorRes.data?.two_factor_enabled) {
      userTwoFactorEnabled = true;
    }

    if (userTwoFactorEnabled) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const codeHash = await hash(code, 12);

      await supabaseAdmin
        .from('otp_codes')
        .delete()
        .eq('user_id', user.id)
        .eq('used', false);

      await supabaseAdmin
        .from('otp_codes')
        .insert({
          user_id: user.id,
          code_hash: codeHash,
          email: user.email,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        });

      const sent = await sendOtpEmail(user.email, code);
      if (!sent) {
        return NextResponse.json(
          { error: 'Nepodarilo sa odoslať 2FA kód. Skúste znova.' },
          { status: 500 }
        );
      }

      await setLayerCookie(1, user.id);

      await logActivity({
        userId: user.id,
        eventType: 'otp_requested',
        ipAddress: ip,
        userAgent,
        metadata: { email: maskEmail(user.email), reason: 'user_2fa_login' },
      });

      return NextResponse.json({
        success: true,
        nextLayer: 3,
        requiresTwoFactor: true,
        maskedEmail: maskEmail(user.email),
        message: '2FA kód bol odoslaný na váš email.',
      });
    }

    const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;

    const token = await createSession({
      userId: user.id,
      role: user.role as 'user' | 'admin',
      displayName,
    }, 24);

    await setSessionCookie(token, 24);
    await clearLayerCookies();

    await supabaseAdmin
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    const geo = await getGeoInfo(ip);
    const geoAlert = geo ? isOutsideSlovakia(geo.countryCode) : false;

    await logActivity({
      userId: user.id,
      eventType: 'session_started',
      success: true,
      ipAddress: ip,
      countryCode: geo?.countryCode || null,
      city: geo?.city || null,
      userAgent,
      geoAlert,
      metadata: { note: 'Opätovná relácia — bez email OTP' },
    });

    if (geoAlert && geo) {
      await sendGeoAlertEmail({
        displayName,
        ip,
        country: geo.countryCode,
        city: geo.city,
        userAgent,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      sessionReady: true,
      message: 'Prihlásenie úspešné. Vitajte späť!',
    });
  }

  await logActivity({
    userId: user.id,
    eventType: 'login_attempt',
    success: true,
    ipAddress: ip,
    userAgent,
    metadata: { layer: 1, mode: 'first_login_username' },
  });

  // Set layer 1 cookie
  await setLayerCookie(1, user.id);

  // If identity already confirmed, skip Layer 2
  const nextLayer = user.identity_confirmed ? 3 : 2;

  return NextResponse.json({
    success: true,
    nextLayer,
    message: user.identity_confirmed
      ? 'Prihlásenie úspešné. Pokračujte overením emailu.'
      : 'Prihlásenie úspešné. Pokračujte overením totožnosti.',
  });
}
