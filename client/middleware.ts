import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/auth/login', '/auth/signup', '/auth/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Check for tokens in cookies (set by auth.store)
  const accessToken = request.cookies.get('pf_access')?.value;
  const refreshToken = request.cookies.get('pf_refresh')?.value;
  const isAuthenticated = !!(accessToken || refreshToken);

  // Redirect to login if trying to access protected route without auth
  if (!isPublicPath && !isAuthenticated) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to dashboard if already logged in and trying to access auth pages
  if (isPublicPath && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard/overview', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (your backend API)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
};