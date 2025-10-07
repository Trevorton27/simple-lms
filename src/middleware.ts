// middleware.ts
// middleware.ts
import { NextResponse } from 'next/server';
export default function middleware() { return NextResponse.next(); }
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };

/*import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',                  // home
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/courses(.*)',       // both /courses and /courses/...
    '/api/health',
]);

export default clerkMiddleware((auth, req) => {
  // Protect everything that's NOT public
  if (!isPublicRoute(req)) {
    auth().protect();
  }
});

// Run on all non-static routes (includes /api/*)
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};*/

