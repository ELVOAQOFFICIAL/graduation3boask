import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

export const runtime = 'edge';


export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.userId,
      displayName: session.displayName,
      role: session.role,
    },
  });
}
