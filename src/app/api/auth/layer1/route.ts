import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyTurnstile } from '@/lib/auth/turnstile';
import { clearLayerCookies, setLayerCookie } from '@/lib/auth/layers';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rate-limit';
import { logActivity, getClientIp } from '@/lib/activity-log';
import { getGeoInfo, isOutsideSlovakia } from '@/lib/geo';
import { sendGeoAlertEmail } from '@/lib/email';

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

  if (!username || !password) {
    return NextResponse.json(
      { error: 'Zadajte používateľské meno a heslo.' },
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
    .select('id, username, password_hash, is_active, identity_confirmed, role, email, first_name, last_name')
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

  // Compare password
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
      { error: 'Nesprávne prihlasovacie údaje.' },
      { status: 401 }
    );
  }

  await logActivity({
    userId: user.id,
    eventType: 'login_attempt',
    success: true,
    ipAddress: ip,
    userAgent,
    metadata: { layer: 1 },
  });

  // Returning users who already confirmed identity and email skip further verification.
  if (user.identity_confirmed && user.email) {
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
