/* ── MITTI — /history ── */
import type { Metadata } from 'next';
import { HistoryView } from './HistoryView';

export const metadata: Metadata = {
  title: 'History',
  description: 'Past advisories, crop assessments and device events from your MITTI unit.',
};

export default function HistoryPage() {
  return <HistoryView />;
}
