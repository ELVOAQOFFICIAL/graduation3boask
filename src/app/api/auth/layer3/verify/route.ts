import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyLayerCookie, clearLayerCookies } from '@/lib/auth/layers';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rate-limit';
import { logActivity, getClientIp } from '@/lib/activity-log';
import { getGeoInfo, isOutsideSlovakia } from '@/lib/geo';
import { sendGeoAlertEmail } from '@/lib/email';

export const runtime = 'edge';


export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || '';

  // Verify Layer 1 cookie exists
  const layer1 = await verifyLayerCookie(1);
  if (!layer1) {
    return NextResponse.json(
      { error: 'Najprv dokončite prvý krok prihlásenia.' },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { code } = body;

  if (!code || typeof code !== 'string' || code.length !== 6) {
    return NextResponse.json(
      { error: 'Zadajte 6-miestny overovací kód.' },
      { status: 400 }
    );
  }

  // Rate limit OTP validation: 5 per code
  const otpValidateLimit = rateLimit(`otp_validate_${layer1.userId}`, 5, 10 * 60 * 1000);
  if (!otpValidateLimit.allowed) {
    return NextResponse.json(
      { error: 'Príliš veľa pokusov o overenie kódu. Vyžiadajte si nový kód.' },
      { status: 429 }
    );
  }

  // Find latest unused OTP for user
  const { data: otpRecord } = await supabaseAdmin
    .from('otp_codes')
    .select('id, code_hash, expires_at, used')
    .eq('user_id', layer1.userId)
    .eq('used', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!otpRecord) {
    await logActivity({
      userId: layer1.userId,
      eventType: 'otp_validated',
      success: false,
      ipAddress: ip,
      userAgent,
      metadata: { reason: 'no_otp_found' },
    });
    return NextResponse.json(
      { error: 'Žiadny overovací kód nebol nájdený. Vyžiadajte si nový.' },
      { status: 400 }
    );
  }

  // Mark OTP as used immediately (single-use)
  await supabaseAdmin
    .from('otp_codes')
    .update({ used: true })
    .eq('id', otpRecord.id);

  // Check expiry
  if (new Date(otpRecord.expires_at) < new Date()) {
    await logActivity({
      userId: layer1.userId,
      eventType: 'otp_validated',
      success: false,
      ipAddress: ip,
      userAgent,
      metadata: { reason: 'expired' },
    });
    return NextResponse.json(
      { error: 'Overovací kód vypršal. Vyžiadajte si nový.' },
      { status: 400 }
    );
  }

  // Verify code
  const codeValid = await compare(code, otpRecord.code_hash);
  if (!codeValid) {
    await logActivity({
      userId: layer1.userId,
      eventType: 'otp_validated',
      success: false,
      ipAddress: ip,
      userAgent,
      metadata: { reason: 'wrong_code' },
    });
    return NextResponse.json(
      { error: 'Nesprávny overovací kód.' },
      { status: 401 }
    );
  }

  // OTP valid — get user info
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, first_name, last_name, role, identity_confirmed')
    .eq('id', layer1.userId)
    .single();

  if (!user) {
    return NextResponse.json(
      { error: 'Používateľ nebol nájdený.' },
      { status: 404 }
    );
  }

  const displayName = `${user.first_name} ${user.last_name}`.trim();

  // Create session
  const token = await createSession({
    userId: user.id,
    role: user.role as 'user' | 'admin',
    displayName,
  }, 24);

  await setSessionCookie(token, 24);
  await clearLayerCookies();

  // Update last login
  await supabaseAdmin
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', user.id);

  // Geo check
  const geo = await getGeoInfo(ip);
  const geoAlert = geo ? isOutsideSlovakia(geo.countryCode) : false;

  await logActivity({
    userId: user.id,
    eventType: 'otp_validated',
    success: true,
    ipAddress: ip,
    userAgent,
    metadata: { layer: 3 },
  });

  await logActivity({
    userId: user.id,
    eventType: 'session_started',
    success: true,
    ipAddress: ip,
    countryCode: geo?.countryCode || null,
    city: geo?.city || null,
    userAgent,
    geoAlert,
    metadata: {
      returning: user.identity_confirmed,
      note: user.identity_confirmed ? 'Opätovná relácia — identita potvrdená' : 'Prvá relácia',
    },
  });

  // Send geo alert if outside Slovakia
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
    message: 'Overenie úspešné. Vitajte!',
    user: {
      id: user.id,
      displayName,
      role: user.role,
    },
  });
}
