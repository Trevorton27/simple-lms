// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',                  // home
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/courses(.*)',       // both /courses and /courses/...
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
};
