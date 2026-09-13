/* ── MITTI — /advisories ── */
import type { Metadata } from 'next';
import { AdvisoriesView } from './AdvisoriesView';

export const metadata: Metadata = {
  title: 'Advisories',
  description: 'Crop advisories and guidance from your MITTI field unit.',
};

export default function AdvisoriesPage() {
  return <AdvisoriesView />;
}
