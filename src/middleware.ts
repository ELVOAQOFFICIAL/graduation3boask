import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.SESSION_SECRET || 'fallback-secret-change-me');

const publicPaths = ['/login', '/admin/login', '/api/auth/layer1', '/api/auth/layer2', '/api/auth/layer3', '/api/admin/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((p) => pathname.startsWith(p)) || pathname === '/') {
    return NextResponse.next();
  }

  // Allow static assets
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('session')?.value;

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Neautorizovaný prístup.' }, { status: 401 });
    }
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;

    // Admin routes require admin role
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
      if (role !== 'admin') {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Neautorizovaný prístup.' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    // User routes — both user and admin can access (admin for testing)
    return NextResponse.next();
  } catch {
    // Invalid/expired token
    const response = pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'Relácia vypršala.' }, { status: 401 })
      : NextResponse.redirect(new URL(pathname.startsWith('/admin') ? '/admin/login' : '/login', request.url));

    response.cookies.delete('session');
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
