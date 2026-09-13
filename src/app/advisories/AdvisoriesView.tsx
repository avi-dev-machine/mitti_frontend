/* ── MITTI — Advisories ──
 *
 * The latest advisory in full, then the history paginated beneath it.
 *
 * Nothing here rewrites what the device produced: the card renders the
 * advisory verbatim, uncertainty note included.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Radio, Wheat } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { AdvisoryCard } from '@/components/monitoring/AdvisoryCard';
import { EmptyState, ErrorState, LoadingAnnouncement, SkeletonCard } from '@/components/ui/states';
import { useAdvisoryHistory, useDeviceSummary, useDevices } from '@/lib/hooks/useDevices';
import { useUiStore } from '@/lib/store';
import { ApiError } from '@/lib/api';
import styles from './advisories.module.css';

const PAGE_SIZE = 10;

const SEVERITY_FILTERS: Array<{ id: string | undefined; label: string; dot?: string }> = [
  { id: undefined, label: 'All' },
  { id: 'red', label: 'Critical', dot: 'red' },
  { id: 'orange', label: 'Action', dot: 'orange' },
  { id: 'yellow', label: 'Monitor', dot: 'yellow' },
  { id: 'green', label: 'Healthy', dot: 'green' },
];

export function AdvisoriesView() {
  const selectedDeviceId = useUiStore((s) => s.selectedDeviceId);
  const [page, setPage] = useState(0);
  const [severity, setSeverity] = useState<string | undefined>(undefined);

  const devicesQuery = useDevices();
  const summaryQuery = useDeviceSummary(selectedDeviceId);
  const historyQuery = useAdvisoryHistory(selectedDeviceId, page, severity, PAGE_SIZE);

  const devices = devicesQuery.data ?? [];
  const device = summaryQuery.data?.device ?? null;
  const latest = summaryQuery.data?.latest_advisory ?? null;
  const history = historyQuery.data?.advisories ?? [];

  // The API returns one page at a time with no total, so "there may be more"
  // is inferred from a full page rather than invented as a page count.
  const hasNextPage = history.length === PAGE_SIZE;

  function changeSeverity(next: string | undefined) {
    setSeverity(next);
    setPage(0);
  }

  if (!devicesQuery.isLoading && devices.length === 0) {
    return (
      <AppShell>
        <div className={styles.page}>
          <h1 className={styles.title}>Advisories</h1>
          <EmptyState
            icon={Radio}
            title="No device linked yet"
            description="Crop advisories appear here once a MITTI unit is linked and has run an assessment."
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
        <header className={styles.head}>
          <div>
            <h1 className={styles.title}>Advisories</h1>
            <p className={styles.lead}>
              {device
                ? `${device.device_name} · ${device.field_name || 'Field not named'}`
                : 'Crop guidance from your field'}
            </p>
          </div>

          <div className={styles.filters} role="radiogroup" aria-label="Filter by severity">
            {SEVERITY_FILTERS.map(({ id, label, dot }) => (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={severity === id}
                className={`${styles.filterButton} ${severity === id ? styles.filterButtonActive : ''}`}
                onClick={() => changeSeverity(id)}
              >
                {dot && <span className={`severity-dot ${dot}`} aria-hidden="true" />}
                {label}
              </button>
            ))}
          </div>
        </header>

        {summaryQuery.isLoading ? (
          <>
            <LoadingAnnouncement label="Loading advisories" />
            <SkeletonCard lines={5} />
          </>
        ) : latest && !severity ? (
          <section className={styles.list} aria-label="Latest advisory">
            <p className={styles.latestLabel}>Latest advisory</p>
            <AdvisoryCard advisory={latest} />
          </section>
        ) : null}

        <section className={styles.list} aria-label="Advisory history">
          <p className={styles.latestLabel}>
            {severity ? 'Matching advisories' : 'Earlier advisories'}
          </p>

          {historyQuery.isLoading ? (
            <>
              <SkeletonCard lines={3} />
              <SkeletonCard lines={3} />
            </>
          ) : historyQuery.error ? (
            <ErrorState
              description={
                historyQuery.error instanceof ApiError
                  ? historyQuery.error.friendlyMessage
                  : undefined
              }
              onRetry={() => void historyQuery.refetch()}
            />
          ) : history.length === 0 ? (
            <EmptyState
              inline
              icon={Wheat}
              title={
                severity
                  ? 'No advisories match this filter.'
                  : 'No advisory is available for this device.'
              }
              description={
                severity
                  ? 'Try a different severity, or view all advisories.'
                  : 'An advisory appears after an assessment. Press the button on your MITTI unit to start one.'
              }
              action={
                severity ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => changeSeverity(undefined)}
                  >
                    View all advisories
                  </button>
                ) : undefined
              }
            />
          ) : (
            <>
              {history.map((advisory) => (
                <AdvisoryCard key={advisory.id} advisory={advisory} />
              ))}

              {(page > 0 || hasNextPage) && (
                <nav className={styles.pagination} aria-label="Advisory pages">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={page === 0 || historyQuery.isFetching}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
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
                    disabled={!hasNextPage || historyQuery.isFetching}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Older
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}
