import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { logActivity, getClientIp } from '@/lib/activity-log';

export const runtime = 'edge';

const challengeSecret = new TextEncoder().encode(process.env.SESSION_SECRET || 'fallback-secret-change-me');

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

  const body = await request.json();
  const { code } = body;

  if (!code || typeof code !== 'string' || code.length !== 6) {
    return NextResponse.json(
      { error: 'Zadajte 6-miestny 2FA kód.' },
      { status: 400 }
    );
  }

  const challengeToken = request.cookies.get('admin_2fa_challenge')?.value;
  if (!challengeToken) {
    return NextResponse.json(
      { error: '2FA výzva vypršala. Prihláste sa znova.' },
      { status: 401 }
    );
  }

  try {
    const { payload } = await jwtVerify(challengeToken, challengeSecret);
    const expectedCode = String(payload.code || '');

    const validCode = await timingSafeEqual(code, expectedCode);
    if (!validCode) {
      await logActivity({
        eventType: 'admin_login',
        success: false,
        ipAddress: ip,
        userAgent,
        metadata: { reason: 'wrong_admin_2fa_code' },
      });
      return NextResponse.json(
        { error: 'Nesprávny 2FA kód.' },
        { status: 401 }
      );
    }

    const token = await createSession({
      userId: 'admin',
      role: 'admin',
      displayName: 'Admin',
    }, 8);

    await setSessionCookie(token, 8);

    await logActivity({
      eventType: 'admin_login',
      success: true,
      ipAddress: ip,
      userAgent,
      metadata: { twoFactor: true },
    });

    const response = NextResponse.json({
      success: true,
      message: 'Admin 2FA overenie úspešné.',
    });

    response.cookies.delete('admin_2fa_challenge');
    return response;
  } catch {
    return NextResponse.json(
      { error: '2FA výzva vypršala. Prihláste sa znova.' },
      { status: 401 }
    );
  }
}
