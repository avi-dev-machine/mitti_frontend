/* ── MITTI — Supabase auth callback ──
 *
 * Every link Supabase emails — confirm your address, reset your password, a
 * magic link — lands here. The link carries a one-time code that has to be
 * exchanged for a session on the server, so the session cookie is set before
 * any page renders.
 *
 * Both shapes are handled:
 *   ?code=...                     the PKCE flow used by @supabase/ssr
 *   ?token_hash=...&type=recovery the older email-link flow
 */
import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { safeRedirect } from '@/lib/auth/redirect';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = safeRedirect(searchParams.get('next'));

  // Supabase reports its own failures on the query string — an expired link,
  // for example. Surface that rather than attempting a doomed exchange.
  const errorDescription =
    searchParams.get('error_description') ?? searchParams.get('error');

  if (errorDescription) {
    const url = new URL('/auth/auth-code-error', origin);
    url.searchParams.set('reason', 'link');
    return NextResponse.redirect(url);
  }

  if (code || (tokenHash && type)) {
    const supabase = await createClient();

    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash: tokenHash as string });

    if (!error) {
      // A recovery link must land on the form that uses it, whatever `next`
      // says, or the user arrives at the dashboard with no way to finish.
      const destination = type === 'recovery' ? '/reset-password' : next;
      return NextResponse.redirect(new URL(destination, origin));
    }

    const url = new URL('/auth/auth-code-error', origin);
    url.searchParams.set('reason', 'exchange');
    return NextResponse.redirect(url);
  }

  const url = new URL('/auth/auth-code-error', origin);
  url.searchParams.set('reason', 'missing');
  return NextResponse.redirect(url);
}
