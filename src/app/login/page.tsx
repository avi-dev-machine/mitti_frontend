/* ── MITTI — /login ── */
import type { Metadata } from 'next';
import { safeRedirect } from '@/lib/auth/redirect';
import { LoginView } from './LoginView';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to MITTI to monitor your fields and crop advisories.',
};

/* In Next.js 16 searchParams is a promise and must be awaited. */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;
  // Validated here rather than in the client so a crafted link can never reach
  // router.replace(). See lib/auth/redirect.ts.
  return <LoginView redirectTo={safeRedirect(redirectTo)} />;
}
