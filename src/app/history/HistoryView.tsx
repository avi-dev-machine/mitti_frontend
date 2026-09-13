/* ── MITTI — History ──
 *
 * Four tabs over the same device: advisories, sensor trends, crop assessment
 * records, and hardware events.
 *
 * The Assessments tab is deliberately read-only. MITTI_PWA_UIUX_SPECIFICATION
 * §1 makes the physical button on the unit the only way to start an
 * assessment, so this app shows what the camera captured and what the on-device
 * model reported — it never asks for a new capture.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Info,
  Radio,
  RadioTower,
  RefreshCw,
  ToggleLeft,
  Wheat,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { AdvisoryCard } from '@/components/monitoring/AdvisoryCard';
import { EmptyState, ErrorState, LoadingAnnouncement, SkeletonCard } from '@/components/ui/states';
import {
  useAdvisoryHistory,
  useDeviceEvents,
  useDeviceImages,
  useDevices,
  useDeviceSummary,
} from '@/lib/hooks/useDevices';
import { useUiStore } from '@/lib/store';
import { ApiError } from '@/lib/api';
import type { ImageRecord } from '@/lib/types';
import { formatDateTime, timeAgo } from '@/lib/utils';
import styles from './history.module.css';

type Tab = 'advisories' | 'assessments' | 'events';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'advisories', label: 'Advisories' },
  { id: 'assessments', label: 'Assessments' },
  { id: 'events', label: 'Device events' },
];

const PAGE_SIZE = 10;
const IMAGE_PAGE_SIZE = 12;

function qualityBadge(status: string | null | undefined): { className: string; label: string } {
  const value = (status ?? '').toLowerCase();
  if (value === 'good') return { className: 'badge badge-green', label: 'Clear image' };
  if (value === 'blurred' || value === 'dark') {
    return { className: 'badge badge-yellow', label: 'Poor image' };
  }
  if (value === 'unusable') return { className: 'badge badge-red', label: 'Unusable' };
  return { className: 'badge badge-grey', label: 'Not rated' };
}

export function HistoryView() {
  const selectedDeviceId = useUiStore((s) => s.selectedDeviceId);
  const [tab, setTab] = useState<Tab>('advisories');
  const [advisoryPage, setAdvisoryPage] = useState(0);
  const [imagePage, setImagePage] = useState(0);

  const devicesQuery = useDevices();
  const summaryQuery = useDeviceSummary(selectedDeviceId);
  const devices = devicesQuery.data ?? [];
  const device = summaryQuery.data?.device ?? null;

  if (!devicesQuery.isLoading && devices.length === 0) {
    return (
      <AppShell>
        <div className={styles.page}>
          <h1 className={styles.title}>History</h1>
          <EmptyState
            icon={Radio}
            title="No device linked yet"
            description="Once a MITTI unit is linked, its advisories, assessments and events appear here."
            action={
              <Link href="/scan" className="btn btn-primary">
                Add a device
              </Link>
            }
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className={styles.page}>
        <header>
          <h1 className={styles.title}>History</h1>
          <p className={styles.lead}>
            {device
              ? `${device.device_name} · ${device.field_name || 'Field not named'}`
              : 'Everything your device has recorded'}
          </p>
        </header>

        {/* A real tab list: arrow keys move between tabs, and each panel is
            associated with its tab for screen readers. */}
        <div className={styles.tabs} role="tablist" aria-label="History sections">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              className={`${styles.tab} ${tab === id ? styles.tabActive : ''}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'advisories' && (
          <div
            className={styles.panel}
            role="tabpanel"
            id="panel-advisories"
            aria-labelledby="tab-advisories"
          >
            <AdvisoryHistoryPanel
              deviceId={selectedDeviceId}
              page={advisoryPage}
              onPageChange={setAdvisoryPage}
            />
          </div>
        )}

        {tab === 'assessments' && (
          <div
            className={styles.panel}
            role="tabpanel"
            id="panel-assessments"
            aria-labelledby="tab-assessments"
          >
            <AssessmentPanel
              deviceId={selectedDeviceId}
              page={imagePage}
              onPageChange={setImagePage}
            />
          </div>
        )}

        {tab === 'events' && (
          <div
            className={styles.panel}
            role="tabpanel"
            id="panel-events"
            aria-labelledby="tab-events"
          >
            <EventsPanel deviceId={selectedDeviceId} />
          </div>
        )}
      </div>
    </AppShell>
  );
}

/* ── Advisories ── */
function AdvisoryHistoryPanel({
  deviceId,
  page,
  onPageChange,
}: {
  deviceId: string | null;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const query = useAdvisoryHistory(deviceId, page, undefined, PAGE_SIZE);
  const advisories = query.data?.advisories ?? [];
  const hasNext = advisories.length === PAGE_SIZE;

  if (query.isLoading) {
    return (
      <>
        <LoadingAnnouncement label="Loading advisory history" />
        <SkeletonCard lines={3} />
        <SkeletonCard lines={3} />
      </>
    );
  }

  if (query.error) {
    return (
      <ErrorState
        description={query.error instanceof ApiError ? query.error.friendlyMessage : undefined}
        onRetry={() => void query.refetch()}
      />
    );
  }

  if (advisories.length === 0) {
    return (
      <EmptyState
        icon={Wheat}
        title="No history is available for this time range."
        description="Advisories appear here after your MITTI unit completes an assessment."
      />
    );
  }

  return (
    <>
      {advisories.map((advisory) => (
        <AdvisoryCard key={advisory.id} advisory={advisory} compact />
      ))}
      <Pager
        page={page}
        hasNext={hasNext}
        busy={query.isFetching}
        onChange={onPageChange}
        label="Advisory pages"
      />
    </>
  );
}

/* ── Crop assessments ──
 * What the camera captured and what the on-device model reported. Read-only:
 * this app never triggers a capture. */
function AssessmentPanel({
  deviceId,
  page,
  onPageChange,
}: {
  deviceId: string | null;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const query = useDeviceImages(deviceId, page, IMAGE_PAGE_SIZE);
  const images = query.data?.images ?? [];
  const hasNext = images.length === IMAGE_PAGE_SIZE;

  return (
    <>
      <p className={styles.note}>
        <Info size={17} className={styles.noteIcon} aria-hidden="true" />
        <span>
          Assessments are started by the button on your MITTI unit. This page shows what the
          camera captured and what the on-device model reported.
        </span>
      </p>

      {query.isLoading ? (
        <>
          <LoadingAnnouncement label="Loading assessment records" />
          <div className={styles.assessmentGrid}>
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} lines={2} />
            ))}
          </div>
        </>
      ) : query.error ? (
        <ErrorState
          description={query.error instanceof ApiError ? query.error.friendlyMessage : undefined}
          onRetry={() => void query.refetch()}
        />
      ) : images.length === 0 ? (
        <EmptyState
          icon={Camera}
          title="No assessments recorded yet"
          description="Press the button on your MITTI unit to run a crop assessment. The captured image and its analysis appear here afterwards."
        />
      ) : (
        <>
          <div className={styles.assessmentGrid}>
            {images.map((record) => (
              <AssessmentCard key={record.id} record={record} />
            ))}
          </div>
          <Pager
            page={page}
            hasNext={hasNext}
            busy={query.isFetching}
            onChange={onPageChange}
            label="Assessment pages"
          />
        </>
      )}
    </>
  );
}

function AssessmentCard({ record }: { record: ImageRecord }) {
  const quality = qualityBadge(record.quality_status);

  return (
    <article className={styles.assessment}>
      <div className={styles.assessmentMediaWrap}>
        {record.image_url ? (
          /* A plain img, not next/image: these URLs come from Supabase Storage
             at runtime and are not known to the image optimiser at build time. */
          <img
            src={record.image_url}
            alt={`Crop image captured on ${formatDateTime(record.captured_at)}`}
            className={styles.assessmentImage}
            loading="lazy"
          />
        ) : (
          <div className={styles.assessmentPlaceholder}>
            <Camera size={22} aria-hidden="true" />
            <span>The image for this assessment is not available to view.</span>
          </div>
        )}
      </div>

      <div className={styles.assessmentHead}>
        <span className={quality.className}>{quality.label}</span>
        <time className={styles.assessmentTime} dateTime={record.captured_at}>
          {timeAgo(record.captured_at)}
        </time>
      </div>

      {record.visible_features && (
        <div>
          <p className={styles.assessmentLabel}>What was visible</p>
          <p className={styles.assessmentText}>{record.visible_features}</p>
        </div>
      )}

      {record.analysis_summary && (
        <div>
          <p className={styles.assessmentLabel}>What the model reported</p>
          <p className={styles.assessmentText}>{record.analysis_summary}</p>
        </div>
      )}

      {!record.visible_features && !record.analysis_summary && (
        <p className={styles.assessmentText}>
          No analysis was recorded for this capture.
        </p>
      )}
    </article>
  );
}

/* ── Device events ──
 * Read-only hardware history. Pump activity is shown because a farmer needs to
 * know when water ran; there is no control to run it from here. */
function EventsPanel({ deviceId }: { deviceId: string | null }) {
  const query = useDeviceEvents(deviceId);

  const relay = query.data?.relay_events ?? [];
  const lora = query.data?.lora_events ?? [];
  const sync = query.data?.sync_status ?? [];

  const rows = [
    ...relay.map((event) => ({
      id: `relay-${event.id}`,
      icon: ToggleLeft,
      title: event.event_type === 'on' ? 'Pump switched on' : `Pump ${event.event_type}`,
      meta: [
        event.reason,
        typeof event.duration_seconds === 'number' ? `${event.duration_seconds}s` : null,
      ]
        .filter(Boolean)
        .join(' · '),
      at: event.triggered_at,
    })),
    ...lora.map((event) => ({
      id: `lora-${event.id}`,
      icon: RadioTower,
      title: event.delivered ? 'Radio message delivered' : 'Radio message not delivered',
      meta: [
        event.message_type,
        typeof event.rssi === 'number' ? `signal ${event.rssi} dBm` : null,
      ]
        .filter(Boolean)
        .join(' · '),
      at: event.sent_at,
    })),
    ...sync
      .filter((status) => status.last_upload_at)
      .map((status) => ({
        id: `sync-${status.id}`,
        icon: RefreshCw,
        title: status.status === 'error' ? 'Sync reported a problem' : 'Synced with the cloud',
        meta: [
          `${status.pending_records} pending`,
          status.last_error ? 'see device details' : null,
        ]
          .filter(Boolean)
          .join(' · '),
        at: status.last_upload_at,
      })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  if (query.isLoading) {
    return (
      <>
        <LoadingAnnouncement label="Loading device events" />
        <SkeletonCard lines={4} />
      </>
    );
  }

  if (query.error) {
    return (
      <ErrorState
        description={query.error instanceof ApiError ? query.error.friendlyMessage : undefined}
        onRetry={() => void query.refetch()}
      />
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Gauge}
        title="No device events recorded"
        description="Pump activity, radio messages and sync results appear here once the device reports them."
      />
    );
  }

  return (
    <ul className={styles.eventList}>
      {rows.map(({ id, icon: Icon, title, meta, at }) => (
        <li key={id} className={styles.eventRow}>
          <span className={styles.eventIcon}>
            <Icon size={16} aria-hidden="true" />
          </span>
          <div className={styles.eventBody}>
            <p className={styles.eventTitle}>{title}</p>
            {meta && <p className={styles.eventMeta}>{meta}</p>}
          </div>
          <time className={styles.eventTime} dateTime={at}>
            {formatDateTime(at)}
          </time>
        </li>
      ))}
    </ul>
  );
}

/* ── Pager ──
 * The API returns a page at a time with no total, so the control offers
 * "newer" and "older" rather than claiming a page count it cannot know. */
function Pager({
  page,
  hasNext,
  busy,
  onChange,
  label,
}: {
  page: number;
  hasNext: boolean;
  busy: boolean;
  onChange: (page: number) => void;
  label: string;
}) {
  if (page === 0 && !hasNext) return null;

  return (
    <nav className={styles.pagination} aria-label={label}>
      <button
        type="button"
        className="btn btn-secondary"
        disabled={page === 0 || busy}
        onClick={() => onChange(Math.max(0, page - 1))}
      >
        <ChevronLeft size={16} aria-hidden="true" />
        Newer
      </button>
      <span className={styles.pageInfo} aria-live="polite">
        Page {page + 1}
      </span>
      <button
        type="button"
        className="btn btn-secondary"
        disabled={!hasNext || busy}
        onClick={() => onChange(page + 1)}
      >
        Older
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </nav>
  );
}
