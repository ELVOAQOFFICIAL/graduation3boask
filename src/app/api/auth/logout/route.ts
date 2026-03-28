import { NextResponse } from 'next/server';
import { getSession, clearSession } from '@/lib/auth/session';
import { logActivity, getClientIp } from '@/lib/activity-log';

export const runtime = 'edge';


export async function POST(request: Request) {
  const session = await getSession();
  const ip = getClientIp(request);

  if (session) {
    await logActivity({
      userId: session.userId,
      eventType: 'session_ended',
      ipAddress: ip,
    });
  }

  await clearSession();

  return NextResponse.json({ success: true, message: 'Odhlásenie úspešné.' });
}
