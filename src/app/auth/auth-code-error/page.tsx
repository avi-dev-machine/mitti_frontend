/* ── MITTI — /auth/auth-code-error ──
 *
 * Where /auth/callback sends someone when an email link cannot be turned into
 * a session. Every reason maps to the same recovery: request a fresh link.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Alert } from '@/components/ui/Alert';

export const metadata: Metadata = {
  title: 'Link could not be used',
};

const REASONS: Record<string, string> = {
  link: 'This link has expired, or it has already been used once.',
  exchange: 'This link could not be confirmed. It may have expired.',
  missing: 'This link is incomplete. It may have been cut short by your email app.',
};

export default async function AuthCodeErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const explanation = REASONS[reason ?? ''] ?? REASONS.exchange;

  return (
    <AuthLayout
      title="This link did not work"
      subtitle={explanation}
      backHref="/login"
      backLabel="Back to sign in"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Alert tone="warning" title="What to do next">
          Email links can only be used once, and they expire after a short time. Request a
          new one and open it straight away.
        </Alert>

        <Link href="/forgot-password" className="btn btn-primary btn-block">
          Send a new password reset link
        </Link>
        <Link href="/login" className="btn btn-secondary btn-block">
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  );
}
