/* ── MITTI — Supabase browser client ──
 *
 * Used from Client Components. The session lives in cookies (not localStorage)
 * so that Server Components and the proxy can read it too.
 */
'use client';

import { createBrowserClient } from '@supabase/ssr';
import { readSupabaseEnv } from './config';

type BrowserClient = ReturnType<typeof createBrowserClient>;

let cached: BrowserClient | null = null;

/**
 * Returns the singleton browser client.
 *
 * A singleton matters here: each createBrowserClient call registers its own
 * auth listener and token-refresh timer, so creating one per render would
 * multiply refresh requests and can race them against each other.
 */
export function createClient(): BrowserClient {
  if (cached) return cached;
  const { url, anonKey } = readSupabaseEnv();
  cached = createBrowserClient(url, anonKey);
  return cached;
}
