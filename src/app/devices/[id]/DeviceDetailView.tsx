/* ── MITTI — Device detail ──
 *
 * Everything known about one unit. Farmer-facing information leads; the
 * component-by-component hardware state stays folded into an operator section,
 * because a farmer does not need to know whether the LoRa radio is up to
 * decide whether to water the field.
 */
'use client';

import Link from 'next/link';
import {
  Activity,
  ArrowLeft,
  Camera,
  Cloud,
  Cpu,
  Database,
  Gauge,
  HardDrive,
  Radio,
  Sprout,
  ToggleLeft,
  Wheat,
  Wifi,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import MapPanel from '@/components/MapWrapper';
import { AdvisoryCard } from '@/components/monitoring/AdvisoryCard';
import { SensorGrid } from '@/components/monitoring/SensorCard';
import { EmptyState, ErrorState, LoadingAnnouncement, SkeletonCard } from '@/components/ui/states';
import { useDeviceSummary } from '@/lib/hooks/useDevices';
import { useUiStore } from '@/lib/store';
import { ApiError } from '@/lib/api';
import type { DeviceHealth } from '@/lib/types';
import {
  getConnectionDescription,
  getConnectionLabel,
  getFreshness,
  getSeverityLabel,
  severityBadgeClass,
  timeAgo,
} from '@/lib/utils';
import styles from './detail.module.css';

/* Friendly label first, hardware name second — the spec asks for plain
   language, with the technical detail available but not prominent. */
const HEALTH_COMPONENTS: Array<{
  key: keyof DeviceHealth;
  label: string;
  icon: typeof Cpu;
}> = [
  { key: 'raspberry_pi_status', label: 'Main controller', icon: Cpu },
  { key: 'esp32_status', label: 'Sensor hub', icon: HardDrive },
  { key: 'camera_status', label: 'Camera', icon: Camera },
  { key: 'vision_model_status', label: 'Image analysis', icon: Sprout },
  { key: 'qwen_model_status', label: 'Advisory model', icon: Wheat },
  { key: 'database_status', label: 'On-device storage', icon: Database },
  { key: 'lora_status', label: 'Long-range radio', icon: Radio },
  { key: 'relay_status', label: 'Pump control', icon: ToggleLeft },
  { key: 'cloud_sync_status', label: 'Cloud sync', icon: Cloud },
];

function statusBadge(value: string | null | undefined): { className: string; label: string } {
  const normalised = (value ?? '').toLowerCase();
  if (['online', 'synced', 'healthy', 'ok', 'normal'].includes(normalised)) {
    return { className: 'badge badge-green', label: 'Working' };
  }
  if (['degraded', 'warning', 'pending', 'slow'].includes(normalised)) {
    return { className: 'badge badge-yellow', label: 'Degraded' };
  }
  if (['offline', 'error', 'failed', 'critical'].includes(normalised)) {
    return { className: 'badge badge-red', label: 'Not working' };
  }
  return { className: 'badge badge-grey', label: 'Unknown' };
}

export function DeviceDetailView({ deviceId }: { deviceId: string }) {
  const selectDevice = useUiStore((s) => s.selectDevice);
  const selectedDeviceId = useUiStore((s) => s.selectedDeviceId);
  const query = useDeviceSummary(deviceId);

  const summary = query.data ?? null;
  const device = summary?.device ?? null;
  const health = summary?.health ?? null;
  const reading = summary?.latest_sensor ?? null;
  const advisory = summary?.latest_advisory ?? null;
  const sync = summary?.sync_status ?? null;

  const severity = device?.alert_severity ?? 'grey';
  const freshness = getFreshness(reading?.captured_at ?? null);

  if (query.isLoading) {
    return (
      <AppShell>
        <div className={styles.page}>
          <LoadingAnnouncement label="Loading device details" />
          <SkeletonCard lines={4} />
          <SkeletonCard lines={3} />
        </div>
      </AppShell>
    );
  }

  if (query.error || !device) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return (
      <AppShell>
        <div className={styles.page}>
          <Link href="/devices" className={styles.back}>
            <ArrowLeft size={16} aria-hidden="true" />
            All devices
          </Link>
          {notFound || !query.error ? (
            <EmptyState
              icon={Radio}
              title="This device is not linked to your account."
              description="Check the device ID, or scan the NFC tag on the unit."
              action={
                <Link href="/scan" className="btn btn-primary">
                  Scan a device
                </Link>
              }
            />
          ) : (
            <ErrorState
              description={
                query.error instanceof ApiError ? query.error.friendlyMessage : undefined
              }
              onRetry={() => void query.refetch()}
            />
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className={styles.page}>
        <Link href="/devices" className={styles.back}>
          <ArrowLeft size={16} aria-hidden="true" />
          All devices
        </Link>

        <header className={styles.header}>
          <div className={styles.headerBody}>
            <h1 className={styles.title}>
              {device.device_name}
              <span className={severityBadgeClass(severity)}>
                <span className={`severity-dot ${severity}`} aria-hidden="true" />
                {getSeverityLabel(severity)}
              </span>
              {device.is_demo && <span className="badge badge-blue">Demo data</span>}
            </h1>
            <p className={styles.subtitle}>
              {device.field_name || 'Field not named'}
              {device.crop ? ` · ${device.crop}` : ''}
            </p>
            <p className={styles.deviceId}>{device.device_id}</p>
          </div>

          {selectedDeviceId !== device.device_id && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => selectDevice(device.device_id)}
            >
              Show on dashboard
            </button>
          )}
        </header>

        <div className={styles.statusStrip}>
          <div className={styles.statusCard}>
            <p className={styles.statusLabel}>Connection</p>
            <p className={styles.statusValue}>
              <Wifi size={17} aria-hidden="true" />
              {getConnectionLabel(device.connection_status)}
            </p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 4 }}>
              {getConnectionDescription(device.connection_status)}
            </p>
          </div>

          <div className={styles.statusCard}>
            <p className={styles.statusLabel}>Last sync</p>
            <p className={styles.statusValue}>{timeAgo(device.last_sync_at)}</p>
          </div>

          <div className={styles.statusCard}>
            <p className={styles.statusLabel}>Device health</p>
            <p className={styles.statusValue}>
              <Activity size={17} aria-hidden="true" />
              {health?.overall_status
                ? health.overall_status.charAt(0).toUpperCase() + health.overall_status.slice(1)
                : 'Not reported'}
            </p>
          </div>

          <div className={styles.statusCard}>
            <p className={styles.statusLabel}>Pending uploads</p>
            <p className={styles.statusValue}>
              {typeof sync?.pending_records === 'number' ? sync.pending_records : '—'}
            </p>
            {sync?.last_error && (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--critical-text)', marginTop: 4 }}>
                The last sync reported a problem.
              </p>
            )}
          </div>
        </div>

        <section className={styles.section} aria-label="Latest readings">
          <div className={styles.sectionTitle}>
            <Gauge size={18} aria-hidden="true" />
            Latest readings
            <span
              style={{
                marginLeft: 'auto',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                color: freshness.status === 'stale' ? 'var(--warning-text)' : 'var(--text-muted)',
              }}
            >
              {freshness.label}
            </span>
          </div>

          {reading ? (
            <SensorGrid reading={reading} />
          ) : (
            <EmptyState
              inline
              icon={Gauge}
              title="This device has not sent any readings."
              description="Measurements appear here once the unit syncs."
            />
          )}
        </section>

        <div className={styles.split}>
          <MapPanel
            devices={[device]}
            selectedDeviceId={device.device_id}
            onSelectDevice={() => selectDevice(device.device_id)}
            title="Device location"
          />

          <section className={`card ${styles.section}`} aria-label="Device health">
            <div className={styles.sectionTitle}>
              <Activity size={18} aria-hidden="true" />
              Device health
            </div>

            {health ? (
              <>
                <ul className={styles.healthList}>
                  {HEALTH_COMPONENTS.map(({ key, label, icon: Icon }) => {
                    const badge = statusBadge(health[key] as string | undefined);
                    return (
                      <li key={String(key)} className={styles.healthRow}>
                        <Icon size={16} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />
                        <span className={styles.healthName}>{label}</span>
                        <span className={badge.className}>{badge.label}</span>
                      </li>
                    );
                  })}
                </ul>

                <details className={styles.technical}>
                  <summary className={styles.technicalToggle}>
                    Technical status (for operators)
                  </summary>
                  <div
                    style={{
                      marginTop: 'var(--space-3)',
                      padding: 'var(--space-3) var(--space-4)',
                      background: 'var(--bg-surface-sunken)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--text-sm)',
                      fontFamily: 'var(--font-mono)',
                      display: 'grid',
                      gap: 4,
                    }}
                  >
                    {HEALTH_COMPONENTS.map(({ key }) => (
                      <span key={String(key)}>
                        {String(key)}: {String(health[key] ?? 'unknown')}
                      </span>
                    ))}
                    <span>last_checked_at: {health.last_checked_at}</span>
                  </div>
                </details>
              </>
            ) : (
              <EmptyState
                inline
                icon={Activity}
                title="No health report yet"
                description="This device has not reported the state of its components."
              />
            )}
          </section>
        </div>

        <section className={styles.section} aria-label="Latest advisory">
          <div className={styles.sectionTitle}>
            <Wheat size={18} aria-hidden="true" />
            Latest advisory
          </div>

          {advisory ? (
            <AdvisoryCard advisory={advisory} href="/advisories" />
          ) : (
            <EmptyState
              inline
              icon={Wheat}
              title="No advisory is available for this device."
              description="Press the button on your MITTI unit to run an assessment. Results appear here once it finishes."
            />
          )}
        </section>

        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <Link href="/history" className="btn btn-secondary">
            View full history
          </Link>
          <Link href="/sensors" className="btn btn-secondary">
            View sensor trends
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
