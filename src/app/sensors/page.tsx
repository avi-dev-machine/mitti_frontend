/* ── MITTI — /sensors ── */
import type { Metadata } from 'next';
import { SensorsView } from './SensorsView';

export const metadata: Metadata = {
  title: 'Sensors',
  description: 'Current field measurements and trends from your MITTI device.',
};

export default function SensorsPage() {
  return <SensorsView />;
}
