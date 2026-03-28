import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secret = new TextEncoder().encode(process.env.SESSION_SECRET!);

export interface SessionPayload {
  userId: string;
  role: 'user' | 'admin';
  displayName: string;
  exp?: number;
}

export async function createSession(payload: Omit<SessionPayload, 'exp'>, ttlHours: number = 24): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ttlHours}h`)
    .sign(secret);
  return token;
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function setSessionCookie(token: string, ttlHours: number = 24) {
  const cookieStore = await cookies();
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: ttlHours * 60 * 60,
    path: '/',
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}
