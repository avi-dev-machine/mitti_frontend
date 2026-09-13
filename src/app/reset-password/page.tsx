/* ── MITTI — /reset-password ── */
import type { Metadata } from 'next';
import { ResetPasswordView } from './ResetPasswordView';

export const metadata: Metadata = {
  title: 'Set a new password',
  description: 'Choose a new password for your MITTI account.',
};

export default function ResetPasswordPage() {
  return <ResetPasswordView />;
}
