/* ── MITTI PWA — Utility Functions ── */

import type { SeverityLevel } from './types';

/** Format a timestamp to relative time string */
export function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

/** Format timestamp to readable date/time */
export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Get severity label */
export function getSeverityLabel(severity: SeverityLevel): string {
  const labels: Record<SeverityLevel, string> = {
    green: 'Healthy',
    yellow: 'Warning',
    orange: 'Action required',
    red: 'Critical',
    grey: 'Offline',
  };
  return labels[severity] || 'Unknown';
}

/** Get severity color variable */
export function getSeverityColor(severity: SeverityLevel): string {
  const colors: Record<SeverityLevel, string> = {
    green: 'var(--healthy-green)',
    yellow: 'var(--warning-yellow)',
    orange: 'var(--action-orange)',
    red: 'var(--critical-red)',
    grey: 'var(--neutral-grey)',
  };
  return colors[severity] || 'var(--neutral-grey)';
}

/** Get connection status label */
export function getConnectionLabel(status: string): string {
  const labels: Record<string, string> = {
    live: 'Live — Connected to device',
    synced: 'Synced — Cloud data',
    cached: 'Cached — Stored data',
    offline: 'Offline — No connection',
  };
  return labels[status] || status;
}

/** Get freshness status */
export function getFreshness(dateString: string): { label: string; status: 'fresh' | 'stale' | 'old' } {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 300) return { label: 'Fresh', status: 'fresh' };
  if (seconds < 3600) return { label: `Updated ${Math.floor(seconds / 60)} min ago`, status: 'fresh' };
  if (seconds < 86400) return { label: `Updated ${Math.floor(seconds / 3600)}h ago`, status: 'stale' };
  return { label: `Last updated ${Math.floor(seconds / 86400)} days ago`, status: 'old' };
}

/** Format sensor value with unit */
export function formatSensorValue(value: number | null | undefined, unit: string): string {
  if (value === null || value === undefined) return 'Unavailable';
  return `${value}${unit}`;
}
