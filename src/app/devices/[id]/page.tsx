/* ── MITTI — /devices/[id] ── */
import type { Metadata } from 'next';
import { DeviceDetailView } from './DeviceDetailView';

export const metadata: Metadata = {
  title: 'Device',
  description: 'Status, readings and advisories for one MITTI field unit.',
};

/* In Next.js 16 route params are a promise and must be awaited. */
export default async function DeviceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DeviceDetailView deviceId={decodeURIComponent(id)} />;
}
