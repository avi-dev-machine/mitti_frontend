/* ── MITTI — /dashboard ──
 * src/proxy.ts has already established that a session exists by the time this
 * renders, so the view never has to handle a signed-out state.
 */
import type { Metadata } from 'next';
import { DashboardView } from './DashboardView';

export const metadata: Metadata = {
  title: 'Overview',
  description: 'The latest status, readings and advisories from your MITTI fields.',
};

export default function DashboardPage() {
  return <DashboardView />;
}
