/* ── MITTI — Session refresh + route protection for Next.js Proxy ──
 *
 * Next.js 16 renamed Middleware to Proxy; the mechanism is unchanged. This
 * module holds the logic and `src/proxy.ts` is the thin entry point Next looks
 * for.
 *
 * Two jobs:
 *   1. Refresh the Supabase session on every request, so a user who leaves the
 *      tab open overnight is still signed in when they come back.
 *   2. Gate protected routes before any page renders, so protected content is
 *      never streamed to a signed-out visitor.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isSupabaseConfigured, readSupabaseEnv } from './config';

/** Routes reachable while signed out. Everything else requires a session. */
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/verify',
  '/forgot-password',
  /* Public so a signed-out visitor gets the "this link is no longer valid,
     request a new one" screen. Bouncing them to /login instead would leave
     them guessing why the link they were sent did nothing. The page itself
     still requires a recovery session before it shows the form. */
  '/reset-password',
  '/auth/callback',
  '/auth/auth-code-error',
  '/offline',
];

/**
 * Auth screens a signed-in user has no reason to see — visiting them bounces
 * to the dashboard.
 *
 * `/reset-password` is deliberately absent: arriving from a recovery email
 * *creates* a session, so treating it as an auth screen would bounce the user
 * away from the form they were sent there to use.
 */
const SIGNED_IN_REDIRECTS = ['/login', '/signup', '/verify', '/forgot-password'];

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  // Without Supabase configured there is no session to check. Let the request
  // through so the app can render its own setup notice rather than redirect
  // into a login page that cannot work either.
  if (!isSupabaseConfigured()) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const { url, anonKey } = readSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() validates the token with the auth server. Do not replace this
  // with getSession(), which trusts the cookie as-is.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = '';
    // Preserve where they were headed so login can return them there.
    loginUrl.searchParams.set('redirectTo', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (user && SIGNED_IN_REDIRECTS.includes(pathname)) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = '/dashboard';
    dashboardUrl.search = '';
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}
