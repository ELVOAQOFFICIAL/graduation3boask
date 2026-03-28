import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyLayerCookie, clearLayerCookies } from '@/lib/auth/layers';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { logActivity, getClientIp } from '@/lib/activity-log';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || '';

  const layer3 = await verifyLayerCookie(3);
  if (!layer3) {
    return NextResponse.json(
      { error: 'Najprv dokončite overenie účtu.' },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { password, confirmPassword } = body;

  if (!password || !confirmPassword) {
    return NextResponse.json(
      { error: 'Zadajte nové heslo a jeho potvrdenie.' },
      { status: 400 }
    );
  }

  if (password !== confirmPassword) {
    return NextResponse.json(
      { error: 'Heslá sa nezhodujú.' },
      { status: 400 }
    );
  }

  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json(
      { error: 'Heslo musí mať aspoň 8 znakov.' },
      { status: 400 }
    );
  }

  const passwordHash = await hash(password, 12);

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, username, first_name, last_name, role')
    .eq('id', layer3.userId)
    .single();

  if (!user) {
    return NextResponse.json(
      { error: 'Používateľ nebol nájdený.' },
      { status: 404 }
    );
  }

  await supabaseAdmin
    .from('users')
    .update({
      password_hash: passwordHash,
      last_login_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;

  const token = await createSession({
    userId: user.id,
    role: user.role as 'user' | 'admin',
    displayName,
  }, 24);

  await setSessionCookie(token, 24);
  await clearLayerCookies();

  await logActivity({
    userId: user.id,
    eventType: 'password_set',
    success: true,
    ipAddress: ip,
    userAgent,
  });

  await logActivity({
    userId: user.id,
    eventType: 'session_started',
    success: true,
    ipAddress: ip,
    userAgent,
    metadata: { note: 'Prvé prihlásenie po nastavení hesla' },
  });

  return NextResponse.json({
    success: true,
    message: 'Heslo bolo nastavené a prihlásenie je dokončené.',
  });
}
