/* ── MITTI — /devices ── */
import type { Metadata } from 'next';
import { DevicesView } from './DevicesView';

export const metadata: Metadata = {
  title: 'Devices',
  description: 'The MITTI field units linked to your account.',
};

export default function DevicesPage() {
  return <DevicesView />;
}
