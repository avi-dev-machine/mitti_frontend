/* ── MITTI — Supabase server client ──
 *
 * For Server Components, Route Handlers and Server Actions. Reads the session
 * from the request cookies so protected pages can resolve auth before any HTML
 * is streamed — this is what prevents a flash of protected content.
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { readSupabaseEnv } from './config';

export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = readSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies. This is expected and safe:
          // proxy.ts refreshes the session on every request, so the refreshed
          // tokens are written there instead.
        }
      },
    },
  });
}

/**
 * The authenticated user, or null.
 *
 * Always use this rather than getSession() on the server. getSession() returns
 * whatever the cookie claims without contacting Supabase; getUser() validates
 * the token against the auth server, so a forged cookie cannot impersonate.
 */
export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
