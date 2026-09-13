/* ── MITTI — / ──
 *
 * The entry point resolves the session on the server and redirects. Doing it
 * here rather than with a timed client-side splash means no one watches a logo
 * for two seconds, and a signed-out visitor never sees a frame of the app.
 */
import { redirect } from 'next/navigation';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getAuthenticatedUser } from '@/lib/supabase/server';

// Depends on the request's cookies, so it can never be prerendered.
export const dynamic = 'force-dynamic';

export default async function RootPage() {
  if (!isSupabaseConfigured()) redirect('/login');

  const user = await getAuthenticatedUser().catch(() => null);
  redirect(user ? '/dashboard' : '/login');
}
