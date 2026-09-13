/* ── MITTI — Safe post-login redirect ──
 *
 * `redirectTo` and `next` arrive from the query string, which anyone can
 * craft. Sending the browser to an unchecked value is an open redirect: a
 * link to `/login?redirectTo=https://evil.example` would bounce a freshly
 * signed-in user off-site, where a convincing copy of MITTI could ask them to
 * sign in again.
 *
 * Only same-origin absolute paths are allowed through.
 */

export const DEFAULT_REDIRECT = '/dashboard';

export function safeRedirect(
  candidate: string | null | undefined,
  fallback: string = DEFAULT_REDIRECT,
): string {
  if (!candidate) return fallback;

  // Must be an absolute path on this origin.
  if (!candidate.startsWith('/')) return fallback;

  // `//host` and `/\host` are protocol-relative URLs — they leave the origin.
  if (candidate.startsWith('//') || candidate.startsWith('/\\')) return fallback;

  // A scheme anywhere means it is not the plain path it appears to be.
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(candidate)) return fallback;

  // Never bounce back into the auth screens; that would loop.
  const path = candidate.split('?')[0];
  if (['/login', '/signup', '/verify'].includes(path)) return fallback;

  return candidate;
}
