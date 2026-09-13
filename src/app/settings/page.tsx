/* ── MITTI — /settings ── */
import type { Metadata } from 'next';
import { SettingsView } from './SettingsView';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Language, alerts and device preferences for MITTI.',
};

export default function SettingsPage() {
  return <SettingsView />;
}
