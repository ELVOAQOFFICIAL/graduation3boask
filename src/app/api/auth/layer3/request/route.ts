import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyTurnstile } from '@/lib/auth/turnstile';
import { verifyLayerCookie } from '@/lib/auth/layers';
import { rateLimit } from '@/lib/rate-limit';
import { logActivity, getClientIp } from '@/lib/activity-log';
import { sendOtpEmail } from '@/lib/email';
import { maskEmail } from '@/lib/utils';

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
  const { email, turnstileToken } = body;

  if (!email || typeof email !== 'string') {
    return NextResponse.json(
      { error: 'Zadajte emailovú adresu.' },
      { status: 400 }
    );
  }

  const cleanEmail = email.trim().toLowerCase();

  // Verify Turnstile
  const turnstileValid = await verifyTurnstile(turnstileToken || '');
  if (!turnstileValid) {
    return NextResponse.json(
      { error: 'Overenie CAPTCHA zlyhalo. Skúste znova.' },
      { status: 400 }
    );
  }

  // Rate limit OTP: 3 per hour per user
  const otpLimit = rateLimit(`otp_request_${layer1.userId}`, 3, 60 * 60 * 1000);
  if (!otpLimit.allowed) {
    return NextResponse.json(
      { error: 'Príliš veľa žiadostí o kód. Skúste znova o hodinu.' },
      { status: 429 }
    );
  }

  // Check if email is already used by a different user
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', cleanEmail)
    .neq('id', layer1.userId)
    .single();

  if (existingUser) {
    return NextResponse.json(
      { error: 'Tento email je už priradený k inému účtu.' },
      { status: 400 }
    );
  }

  // Update user email
  await supabaseAdmin
    .from('users')
    .update({ email: cleanEmail })
    .eq('id', layer1.userId);

  // Generate 6-digit OTP
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const codeHash = await hash(code, 12);

  // Invalidate previous unused OTPs
  await supabaseAdmin
    .from('otp_codes')
    .delete()
    .eq('user_id', layer1.userId)
    .eq('used', false);

  // Store OTP
  await supabaseAdmin.from('otp_codes').insert({
    user_id: layer1.userId,
    code_hash: codeHash,
    email: cleanEmail,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });

  // Send OTP email
  const sent = await sendOtpEmail(cleanEmail, code);

  await logActivity({
    userId: layer1.userId,
    eventType: 'otp_requested',
    ipAddress: ip,
    userAgent,
    metadata: { email: maskEmail(cleanEmail), sent },
  });

  if (!sent) {
    return NextResponse.json(
      { error: 'Nepodarilo sa odoslať overovací kód. Skúste znova.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Overovací kód bol odoslaný na váš email.',
  });
}
