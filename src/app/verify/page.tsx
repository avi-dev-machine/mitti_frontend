/* ── MITTI — /verify ── */
import type { Metadata } from 'next';
import { VerifyView } from './VerifyView';

export const metadata: Metadata = {
  title: 'Confirm your email',
  description: 'Confirm your email address to finish setting up MITTI.',
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return <VerifyView email={email ?? null} />;
}
