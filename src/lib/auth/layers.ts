import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secret = new TextEncoder().encode(process.env.SESSION_SECRET!);

interface LayerCookie {
  userId: string;
  layer: number;
}

export async function setLayerCookie(layer: number, userId: string) {
  const token = await new SignJWT({ userId, layer } as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(`layer${layer}_passed`, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 600, // 10 minutes
    path: '/',
  });
}

export async function verifyLayerCookie(layer: number): Promise<LayerCookie | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(`layer${layer}_passed`)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    const data = payload as unknown as LayerCookie;
    if (data.layer !== layer) return null;
    return data;
  } catch {
    return null;
  }
}

export async function clearLayerCookies() {
  const cookieStore = await cookies();
  cookieStore.delete('layer1_passed');
  cookieStore.delete('layer2_passed');
  cookieStore.delete('layer3_passed');
}
