import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

export default clerkMiddleware((auth, req) => {
  // Hard-skip webhooks so body/headers are untouched
  if (req.nextUrl.pathname.startsWith("/api/webhooks")) {
    return;
  }

  const isPublicRoute = createRouteMatcher([
    "/",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/courses(.*)",
    "/blog(.*)",
    "/api/blog(.*)",
    "/api/health(.*)",
    // ⛔️ do NOT include /api/webhooks here
  ]);

  if (!isPublicRoute(req)) {
    auth.protect();
  }
});

export const config = {
  matcher: [
    // same static-skipper you had
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Broadly run on API/TRPC (no capture groups, no lookaheads)
    '/api/:path*',
    '/trpc/:path*',
  ],
};
