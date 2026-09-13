/* ── MITTI — /forgot-password ── */
import type { Metadata } from 'next';
import { ForgotPasswordView } from './ForgotPasswordView';

export const metadata: Metadata = {
  title: 'Reset your password',
  description: 'Request a link to set a new MITTI password.',
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordView />;
}
