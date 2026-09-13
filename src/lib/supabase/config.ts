/* ── MITTI — Supabase environment configuration ──
 *
 * Both values here are public by design: the project URL and the publishable
 * (anon) key are meant to ship to the browser and are protected by Row Level
 * Security. The service-role key must never appear in this codebase.
 *
 * We validate rather than assume, so a missing variable produces one clear
 * message at the point of use instead of an opaque runtime failure deep inside
 * the Supabase client.
 */

export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

export class SupabaseConfigError extends Error {
  readonly missing: string[];

  constructor(missing: string[]) {
    super(
      `MITTI is not connected to Supabase. Missing environment ${
        missing.length === 1 ? 'variable' : 'variables'
      }: ${missing.join(', ')}. Copy frontend/.env.example to frontend/.env.local and fill in your project's values.`,
    );
    this.name = 'SupabaseConfigError';
    this.missing = missing;
  }
}

/** Read and validate the Supabase environment. Throws SupabaseConfigError. */
export function readSupabaseEnv(): SupabaseEnv {
  // Next.js inlines process.env.NEXT_PUBLIC_* at build time only when
  // referenced as a full static member expression, so these cannot be looped.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const missing: string[] = [];
  if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!anonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (missing.length > 0) throw new SupabaseConfigError(missing);

  return { url: url as string, anonKey: anonKey as string };
}

/** Non-throwing probe, for rendering a setup notice instead of crashing. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
