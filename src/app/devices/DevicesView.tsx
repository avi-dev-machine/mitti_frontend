/* ── MITTI — Devices ──
 *
 * Every device the signed-in user can see: their own, plus the shared demo
 * fleet, which is badged so a demo location is never mistaken for a real one.
 */
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Radio, ScanLine, Search } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { EmptyState, ErrorState, LoadingAnnouncement, SkeletonCard } from '@/components/ui/states';
import { useDevices, useDeviceSummaries } from '@/lib/hooks/useDevices';
import { useUiStore } from '@/lib/store';
import { ApiError } from '@/lib/api';
import type { Device, DeviceSummary } from '@/lib/types';
import { getSeverityLabel, severityBadgeClass, severityRank, timeAgo } from '@/lib/utils';
import styles from './devices.module.css';

type Filter = 'all' | 'attention' | 'healthy' | 'offline';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'attention', label: 'Needs attention' },
  { id: 'healthy', label: 'Healthy' },
  { id: 'offline', label: 'Offline' },
];

function matchesFilter(device: Device, filter: Filter): boolean {
  const severity = device.alert_severity ?? 'grey';
  switch (filter) {
    case 'attention':
      return severity === 'red' || severity === 'orange' || severity === 'yellow';
    case 'healthy':
      return severity === 'green';
    case 'offline':
      return device.connection_status === 'offline' || severity === 'grey';
    default:
      return true;
  }
}

export function DevicesView() {
  const devicesQuery = useDevices();
  const summariesQuery = useDeviceSummaries();
  const selectedDeviceId = useUiStore((s) => s.selectedDeviceId);
  const selectDevice = useUiStore((s) => s.selectDevice);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  // Memoised so the fallback [] is not a new array on every render, which
  // would invalidate the filter memo below each time.
  const devices = useMemo(() => devicesQuery.data ?? [], [devicesQuery.data]);
  const summaries = summariesQuery.data ?? {};

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return devices
      .filter((d) => matchesFilter(d, filter))
      .filter((d) =>
        needle
          ? [d.device_name, d.device_id, d.field_name, d.crop]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(needle))
          : true,
      )
      // Most urgent first: an operator opening this page wants the problems.
      .sort((a, b) => severityRank(a.alert_severity) - severityRank(b.alert_severity));
  }, [devices, filter, query]);

  return (
    <AppShell>
      <div className={styles.page}>
        <header className={styles.head}>
          <div>
            <h1 className={styles.title}>Devices</h1>
            <p className={styles.lead}>
              {devices.length === 1
                ? '1 MITTI unit on your account'
                : `${devices.length} MITTI units on your account`}
            </p>
          </div>
          <Link href="/scan" className="btn btn-primary">
            <ScanLine size={16} aria-hidden="true" />
            Add a device
          </Link>
        </header>

        {devices.length > 0 && (
          <div className={styles.toolbar}>
            <div className={styles.search}>
              <Search size={17} className={styles.searchIcon} aria-hidden="true" />
              <input
                type="search"
                className={styles.searchInput}
                placeholder="Search by name, field, crop or device ID"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search devices"
              />
            </div>

            <div className={styles.filters} role="radiogroup" aria-label="Filter devices">
              {FILTERS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={filter === id}
                  className={`${styles.filterButton} ${filter === id ? styles.filterButtonActive : ''}`}
                  onClick={() => setFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {devicesQuery.isLoading ? (
          <div className={styles.grid}>
            <LoadingAnnouncement label="Loading your devices" />
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : devicesQuery.error ? (
          <ErrorState
            description={
              devicesQuery.error instanceof ApiError
                ? devicesQuery.error.friendlyMessage
                : undefined
            }
            onRetry={() => void devicesQuery.refetch()}
          />
        ) : devices.length === 0 ? (
          <EmptyState
            icon={Radio}
            title="No devices linked yet"
            description="Scan the NFC tag on your MITTI unit, or type its device ID, to link it to your account."
            action={
              <Link href="/scan" className="btn btn-primary">
                <ScanLine size={16} aria-hidden="true" />
                Add a device
              </Link>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            inline
            icon={Search}
            title="No devices match"
            description="Try a different search term, or clear the filter."
            action={
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setQuery('');
                  setFilter('all');
                }}
              >
                Clear filters
              </button>
            }
          />
        ) : (
          <div className={styles.grid}>
            {visible.map((device) => (
              <DeviceCard
                key={device.device_id}
                device={device}
                summary={summaries[device.device_id] ?? null}
                isSelected={device.device_id === selectedDeviceId}
                onSelect={() => selectDevice(device.device_id)}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

interface DeviceCardProps {
  device: Device;
  summary: DeviceSummary | null;
  isSelected: boolean;
  onSelect: () => void;
}

function DeviceCard({ device, summary, isSelected, onSelect }: DeviceCardProps) {
  const severity = device.alert_severity ?? 'grey';
  const reading = summary?.latest_sensor;

  return (
    /* The card is a link to the detail page; "Select" is a separate button, so
       the two actions never fight over one target. */
    <Link
      href={`/devices/${encodeURIComponent(device.device_id)}`}
      className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
    >
      <div className={styles.cardHead}>
        <div className={styles.cardIdentity}>
          <h2 className={styles.cardName}>
            <span className={styles.cardNameText}>{device.device_name}</span>
            {device.is_demo && <span className="badge badge-blue">Demo</span>}
          </h2>
          <p className={styles.cardField}>
            {device.field_name || 'Field not named'}
            {device.crop ? ` · ${device.crop}` : ''}
          </p>
        </div>

        <span className={severityBadgeClass(severity)}>
          <span className={`severity-dot ${severity}`} aria-hidden="true" />
          {getSeverityLabel(severity)}
        </span>
      </div>

      <div className={styles.cardFacts}>
        <div>
          <p className={styles.factLabel}>Soil</p>
          <p className={styles.factValue}>
            {typeof reading?.soil_moisture_percent === 'number'
              ? `${reading.soil_moisture_percent.toFixed(1)}%`
              : '—'}
          </p>
        </div>
        <div>
          <p className={styles.factLabel}>Temp</p>
          <p className={styles.factValue}>
            {typeof reading?.temperature_c === 'number'
              ? `${reading.temperature_c.toFixed(1)}°C`
              : '—'}
          </p>
        </div>
        <div>
          <p className={styles.factLabel}>Synced</p>
          <p className={styles.factValue}>{timeAgo(device.last_sync_at)}</p>
        </div>
      </div>

      <div className={styles.cardFoot}>
        <span className={styles.deviceId}>{device.device_id}</span>
        {isSelected ? (
          <span className={styles.selectButton}>Selected</span>
        ) : (
          <button
            type="button"
            className={styles.selectButton}
            onClick={(event) => {
              // Stop the click from also following the card's link.
              event.preventDefault();
              event.stopPropagation();
              onSelect();
            }}
          >
            Select
          </button>
        )}
        <ChevronRight size={16} aria-hidden="true" />
      </div>
    </Link>
  );
}
