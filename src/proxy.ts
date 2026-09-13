/* ── MITTI — Next.js Proxy entry point ──
 *
 * Next.js 16 replaced `middleware.ts` with `proxy.ts`. The logic lives in
 * lib/supabase/proxy.ts; this file only wires it up and declares the matcher.
 */
import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Every path except static assets and the PWA files. Matching those would
     * add a needless auth round-trip to each icon and chunk request, and would
     * stop the service worker from being served while signed out.
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
