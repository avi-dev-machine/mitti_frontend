/* ── MITTI — /scan ── */
import type { Metadata } from 'next';
import { ScanView } from './ScanView';

export const metadata: Metadata = {
  title: 'Add a device',
  description: 'Scan the NFC tag on your MITTI unit, or enter its device ID.',
};

export default function ScanPage() {
  return <ScanView />;
}
