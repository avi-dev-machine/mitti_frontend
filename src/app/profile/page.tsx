/* ── MITTI — /profile ── */
import type { Metadata } from 'next';
import { ProfileView } from './ProfileView';

export const metadata: Metadata = {
  title: 'Your profile',
  description: 'Your MITTI account details.',
};

export default function ProfilePage() {
  return <ProfileView />;
}
