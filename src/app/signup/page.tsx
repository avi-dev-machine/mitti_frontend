/* ── MITTI — /signup ── */
import type { Metadata } from 'next';
import { SignupView } from './SignupView';

export const metadata: Metadata = {
  title: 'Create account',
  description: 'Create a MITTI account to monitor your fields and crop advisories.',
};

export default function SignupPage() {
  return <SignupView />;
}
