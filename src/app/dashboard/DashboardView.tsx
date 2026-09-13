/* ── MITTI — Dashboard ──
 *
 * Answers, in order, the seven questions the refinement spec says a farmer
 * should be able to settle in a few seconds: which field, is it healthy, is
 * anything urgent, what are the readings, where is it, when was it updated,
 * and is that live or synced.
 *
 * Nothing here invents a number. Where the backend has no data the section
 * says so and offers the next step.
 */
'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  Activity,
  CheckCircle2,
  ChevronRight,
  Gauge,
  Radio,
  RefreshCw,
  ScanLine,
  Wheat,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import MapPanel from '@/components/MapWrapper';
import { AdvisoryCard } from '@/components/monitoring/AdvisoryCard';
import { SensorGrid } from '@/components/monitoring/SensorCard';
import { EmptyState, ErrorState, LoadingAnnouncement } from '@/components/ui/states';
import { useSession } from '@/components/providers/SessionProvider';
import { useDevices, useDeviceSummaries } from '@/lib/hooks/useDevices';
import { useUiStore } from '@/lib/store';
import { ApiError } from '@/lib/api';
import type { Device, DeviceSummary, SeverityLevel } from '@/lib/types';
import {
  formatToday,
  getFreshness,
  getSeverityLabel,
  getSeverityMessage,
  greeting,
  timeAgo,
} from '@/lib/utils';
import styles from './dashboard.module.css';

const ALERT_TONE: Record<string, string> = {
  green: styles.alertGreen,
  yellow: styles.alertYellow,
  orange: styles.alertOrange,
  red: styles.alertRed,
  grey: styles.alertGrey,
};

export function DashboardView() {
  const { displayName } = useSession();
  const selectedDeviceId = useUiStore((s) => s.selectedDeviceId);
  const selectDevice = useUiStore((s) => s.selectDevice);

  const devicesQuery = useDevices();
  const summariesQuery = useDeviceSummaries();

  const devices = devicesQuery.data ?? [];
  const summaries = summariesQuery.data ?? {};
  const selected = devices.find((d) => d.device_id === selectedDeviceId) ?? null;
  const summary: DeviceSummary | null = selectedDeviceId
    ? (summaries[selectedDeviceId] ?? null)
    : null;

  const isLoading = devicesQuery.isLoading || summariesQuery.isLoading;
  const error = devicesQuery.error ?? summariesQuery.error;

  function refetchAll() {
    void devicesQuery.refetch();
    void summariesQuery.refetch();
  }

  return (
    <AppShell>
      <div className={styles.page}>
        <header className={styles.welcome}>
          <div>
            <h1 className={styles.greeting}>
              {greeting()}, {displayName}
            </h1>
            <p className={styles.greetingLead}>
              {devices.length > 0
                ? 'Here is the latest from your fields.'
                : 'Connect a MITTI device to start monitoring your field.'}
            </p>
          </div>
          <p className={styles.today}>{formatToday()}</p>
        </header>

        {isLoading ? (
          <DashboardSkeleton />
        ) : error ? (
          <ErrorState
            title={error instanceof ApiError ? undefined : 'This information could not be loaded'}
            description={error instanceof ApiError ? error.friendlyMessage : undefined}
            onRetry={refetchAll}
          />
        ) : devices.length === 0 ? (
          <EmptyState
            icon={Radio}
            title="No MITTI device linked yet"
            description="Scan the NFC tag on your MITTI unit, or enter its device ID, to start seeing your field data here."
            action={
              <Link href="/scan" className="btn btn-primary">
                <ScanLine size={16} aria-hidden="true" />
                Add a device
              </Link>
            }
          />
        ) : (
          <>
            {selected && <HeroCard device={selected} summary={summary} />}
            {selected && <AlertCard device={selected} summary={summary} />}

            <SensorSection summary={summary} deviceId={selected?.device_id ?? null} />

            <div className={styles.split}>
              <MapPanel
                devices={devices}
                selectedDeviceId={selectedDeviceId}
                onSelectDevice={selectDevice}
                title="Your fields"
              />
              <ActivitySection summary={summary} />
            </div>

            <AdvisorySection summary={summary} deviceId={selected?.device_id ?? null} />
          </>
        )}
      </div>
    </AppShell>
  );
}

/* ── Hero: the device in focus ── */
function HeroCard({ device, summary }: { device: Device; summary: DeviceSummary | null }) {
  const severity = (device.alert_severity ?? 'grey') as SeverityLevel;
  const health = summary?.health;
  const sync = summary?.sync_status;

  return (
    <section className={styles.hero} aria-label="Selected device">
      <span className={styles.heroGlow} aria-hidden="true" />

      <div className={styles.heroTop}>
        <div className={styles.heroIdentity}>
          <p className={styles.heroEyebrow}>
            <Radio size={12} aria-hidden="true" />
            {device.device_id}
            {device.is_demo && <span className={styles.demoPill}>Demo data</span>}
          </p>
          <h2 className={styles.heroName}>{device.device_name}</h2>
          <p className={styles.heroField}>
            {device.field_name || 'Field not named'}
            {device.crop ? ` · ${device.crop}` : ''}
          </p>
        </div>

        <span className={styles.heroStatus}>
          <span className={`severity-dot ${severity}`} aria-hidden="true" />
          {getSeverityLabel(severity)}
        </span>
      </div>

      <div className={styles.heroFacts}>
        <div>
          <p className={styles.heroFactLabel}>Connection</p>
          <p className={styles.heroFactValue}>
            {device.connection_status === 'live'
              ? 'Live'
              : device.connection_status === 'synced'
                ? 'Synced'
                : device.connection_status === 'cached'
                  ? 'Cached'
                  : 'Offline'}
          </p>
        </div>
        <div>
          <p className={styles.heroFactLabel}>Last sync</p>
          <p className={styles.heroFactValue}>{timeAgo(device.last_sync_at)}</p>
        </div>
        <div>
          <p className={styles.heroFactLabel}>Device health</p>
          <p className={styles.heroFactValue}>
            {health?.overall_status
              ? health.overall_status.charAt(0).toUpperCase() + health.overall_status.slice(1)
              : 'Not reported'}
          </p>
        </div>
        <div>
          <p className={styles.heroFactLabel}>Pending uploads</p>
          <p className={styles.heroFactValue}>
            {typeof sync?.pending_records === 'number' ? sync.pending_records : '—'}
          </p>
        </div>
      </div>

      <div className={styles.heroActions}>
        <Link href={`/devices/${encodeURIComponent(device.device_id)}`} className={styles.heroButton}>
          Device details
          <ChevronRight size={15} aria-hidden="true" />
        </Link>
        <Link href="/sensors" className={styles.heroButton}>
          <Gauge size={15} aria-hidden="true" />
          Sensor trends
        </Link>
      </div>
    </section>
  );
}

/* ── The one thing that needs attention ── */
function AlertCard({ device, summary }: { device: Device; summary: DeviceSummary | null }) {
  const severity = (device.alert_severity ?? 'grey') as SeverityLevel;
  const advisory = summary?.latest_advisory;
  const needsAttention = severity === 'red' || severity === 'orange';

  return (
    <section
      className={`${styles.alert} ${ALERT_TONE[severity] ?? styles.alertGrey}`}
      aria-label="Current field status"
    >
      <span className={styles.alertIcon}>
        {needsAttention ? (
          <AlertTriangle size={20} aria-hidden="true" />
        ) : severity === 'green' ? (
          <CheckCircle2 size={20} aria-hidden="true" />
        ) : (
          <Activity size={20} aria-hidden="true" />
        )}
      </span>

      <div className={styles.alertBody}>
        <p className={styles.alertTitle}>{getSeverityLabel(severity)}</p>
        <p className={styles.alertText}>
          {advisory?.primary_problem ?? getSeverityMessage(severity)}
        </p>
      </div>

      {advisory && (
        <Link href="/advisories" className={styles.alertLink}>
          Read the advisory
          <ChevronRight size={14} aria-hidden="true" style={{ display: 'inline', verticalAlign: -2 }} />
        </Link>
      )}
    </section>
  );
}

/* ── Sensors ── */
function SensorSection({
  summary,
  deviceId,
}: {
  summary: DeviceSummary | null;
  deviceId: string | null;
}) {
  const reading = summary?.latest_sensor ?? null;
  const freshness = getFreshness(reading?.captured_at ?? null);

  return (
    <section className={styles.section} aria-label="Sensor readings">
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>
          <Gauge size={18} aria-hidden="true" />
          Latest readings
        </h2>
        <span
          className={`${styles.sectionMeta} ${
            freshness.status === 'stale' ? styles.sectionMetaStale : ''
          }`}
        >
          {freshness.label}
        </span>
        {deviceId && (
          <Link href="/sensors" className={styles.sectionLink}>
            View trends
          </Link>
        )}
      </div>

      {reading ? (
        <SensorGrid reading={reading} />
      ) : (
        <EmptyState
          inline
          icon={Gauge}
          title="No sensor readings yet"
          description="This device has not uploaded any measurements. Readings appear here once it syncs."
        />
      )}
    </section>
  );
}

/* ── Latest advisory ── */
function AdvisorySection({
  summary,
  deviceId,
}: {
  summary: DeviceSummary | null;
  deviceId: string | null;
}) {
  const advisory = summary?.latest_advisory ?? null;

  return (
    <section className={styles.section} aria-label="Latest advisory">
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>
          <Wheat size={18} aria-hidden="true" />
          Latest advisory
        </h2>
      </div>

      {advisory ? (
        <AdvisoryCard advisory={advisory} href="/advisories" />
      ) : (
        <EmptyState
          inline
          icon={Wheat}
          title="No advisory is available for this device."
          description={
            deviceId
              ? 'An advisory appears after an assessment. Press the button on your MITTI unit to start one.'
              : 'Select a device to see its latest advisory.'
          }
        />
      )}
    </section>
  );
}

/* ── Recent activity ──
 * Built from the timestamps the backend already returns, so every row is a
 * real event. No synthetic history is generated to make the panel look busy. */
function ActivitySection({ summary }: { summary: DeviceSummary | null }) {
  const events: Array<{ id: string; icon: typeof Activity; title: string; meta: string }> = [];

  if (summary?.latest_advisory) {
    events.push({
      id: 'advisory',
      icon: Wheat,
      title: summary.latest_advisory.primary_problem || 'New advisory published',
      meta: `Advisory · ${timeAgo(summary.latest_advisory.created_at)}`,
    });
  }

  if (summary?.latest_sensor) {
    events.push({
      id: 'sensor',
      icon: Gauge,
      title: 'Sensor readings uploaded',
      meta: `Measurements · ${timeAgo(summary.latest_sensor.captured_at)}`,
    });
  }

  if (summary?.health) {
    events.push({
      id: 'health',
      icon: Activity,
      title: `Device reported ${summary.health.overall_status}`,
      meta: `Health check · ${timeAgo(summary.health.last_checked_at)}`,
    });
  }

  if (summary?.sync_status?.last_upload_at) {
    events.push({
      id: 'sync',
      icon: RefreshCw,
      title:
        summary.sync_status.status === 'error'
          ? 'Sync reported a problem'
          : 'Synced with the cloud',
      meta: `Sync · ${timeAgo(summary.sync_status.last_upload_at)}`,
    });
  }

  return (
    <section className={`card ${styles.section}`} aria-label="Recent activity">
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>
          <Activity size={18} aria-hidden="true" />
          Recent activity
        </h2>
      </div>

      {events.length > 0 ? (
        <ul className={styles.timeline}>
          {events.map(({ id, icon: Icon, title, meta }) => (
            <li key={id} className={styles.event}>
              <span className={styles.eventMarker}>
                <Icon size={15} aria-hidden="true" />
              </span>
              <div className={styles.eventBody}>
                <p className={styles.eventTitle}>{title}</p>
                <p className={styles.eventMeta}>{meta}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          inline
          icon={Activity}
          title="Nothing has happened yet"
          description="Activity from your device appears here once it starts reporting."
        />
      )}
    </section>
  );
}

/* ── Loading ── */
function DashboardSkeleton() {
  return (
    <div className={styles.page}>
      <LoadingAnnouncement label="Loading your field data" />
      <span className={`skeleton ${styles.skeletonHero}`} aria-hidden="true" />
      <span className={`skeleton ${styles.skeletonAlert}`} aria-hidden="true" />
      <div className={styles.skeletonGrid} aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className={`skeleton ${styles.skeletonCard}`} />
        ))}
      </div>
    </div>
  );
}
