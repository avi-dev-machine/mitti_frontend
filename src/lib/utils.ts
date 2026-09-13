/* ── MITTI — Formatting and status helpers ──
 *
 * The freshness rules here implement MITTI_PWA_UIUX_SPECIFICATION.md §15: a
 * reading is never shown without saying how old it is, and stale data is
 * labelled rather than quietly presented as current.
 */

import type { DataSource, Freshness, SensorReading, SeverityLevel } from './types';

/* ── Time ── */

export function timeAgo(dateString: string | null | undefined): string {
  if (!dateString) return 'Never';
  const then = new Date(dateString).getTime();
  if (Number.isNaN(then)) return 'Unknown';

  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return new Date(then).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

/** "Good morning" / "Good afternoon" / "Good evening", by local clock. */
export function greeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatToday(now: Date = new Date()): string {
  return now.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/* ── Freshness ──
 * Thresholds: under 15 minutes is current, under 2 hours is recent, beyond
 * that the reading is explicitly stale. A device that reports every few
 * minutes crossing 2 hours is a real signal, not a rounding artefact. */

const FRESH_SECONDS = 15 * 60;
const RECENT_SECONDS = 2 * 60 * 60;

export function getFreshness(dateString: string | null | undefined): Freshness {
  if (!dateString) {
    return { label: 'No data yet', status: 'unavailable', ageSeconds: null };
  }

  const then = new Date(dateString).getTime();
  if (Number.isNaN(then)) {
    return { label: 'No data yet', status: 'unavailable', ageSeconds: null };
  }

  const ageSeconds = Math.max(0, Math.floor((Date.now() - then) / 1000));

  if (ageSeconds < FRESH_SECONDS) {
    return { label: `Updated ${timeAgo(dateString)}`, status: 'fresh', ageSeconds };
  }
  if (ageSeconds < RECENT_SECONDS) {
    return { label: `Updated ${timeAgo(dateString)}`, status: 'recent', ageSeconds };
  }
  return {
    label: `This reading may be old. Last updated ${timeAgo(dateString)}.`,
    status: 'stale',
    ageSeconds,
  };
}

/* ── Severity ── */

export function getSeverityLabel(severity: SeverityLevel | string | null | undefined): string {
  const labels: Record<string, string> = {
    green: 'Healthy',
    yellow: 'Monitor',
    orange: 'Action required',
    red: 'Critical',
    grey: 'Offline',
  };
  return labels[severity ?? ''] ?? 'Unknown';
}

/** The one-line meaning of a severity, for the alert card. */
export function getSeverityMessage(severity: SeverityLevel | string | null | undefined): string {
  const messages: Record<string, string> = {
    green: 'No current warning for this field.',
    yellow: 'Please keep an eye on this field.',
    orange: 'This field needs your attention.',
    red: 'This field needs immediate attention.',
    grey: 'This device has not connected recently.',
  };
  return messages[severity ?? ''] ?? 'Status is not available for this device.';
}

/** The CSS badge class for a severity. Always paired with its text label. */
export function severityBadgeClass(severity: SeverityLevel | string | null | undefined): string {
  const known = ['green', 'yellow', 'orange', 'red', 'grey'];
  return `badge badge-${known.includes(severity ?? '') ? severity : 'grey'}`;
}

/** Rank used to surface the most urgent device first. */
export function severityRank(severity: SeverityLevel | string | null | undefined): number {
  const order: Record<string, number> = { red: 0, orange: 1, yellow: 2, grey: 3, green: 4 };
  return order[severity ?? ''] ?? 5;
}

/* ── Connection and source ── */

export function getConnectionLabel(status: DataSource | string | null | undefined): string {
  const labels: Record<string, string> = {
    live: 'Live',
    synced: 'Synced',
    cached: 'Cached',
    stale: 'Stale',
    offline: 'Offline',
    unavailable: 'Unavailable',
  };
  return labels[status ?? ''] ?? 'Unknown';
}

export function getConnectionDescription(status: DataSource | string | null | undefined): string {
  const descriptions: Record<string, string> = {
    live: 'Connected directly to your MITTI device.',
    synced: 'Showing synchronised data from the cloud.',
    cached: 'Showing information saved on this device.',
    stale: 'This device has not synced recently.',
    offline: 'You are offline. Showing the latest saved information.',
    unavailable: 'No data is available for this device.',
  };
  return descriptions[status ?? ''] ?? 'Connection status is not known.';
}

/* ── Sensor values ──
 * A missing reading is shown as "Unavailable", never as 0 — a farmer acting on
 * a fabricated zero for soil moisture would water a field that does not need
 * it. This is the rule in UIUX spec §11. */

export function formatSensorValue(
  value: number | null | undefined,
  unit = '',
  decimals = 1,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'Unavailable';
  const rounded = Number.isInteger(value) ? value : Number(value.toFixed(decimals));
  return `${rounded}${unit}`;
}

export function hasValue(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && !Number.isNaN(value);
}

export type SensorStatus = 'normal' | 'low' | 'high' | 'unavailable';

/**
 * Classify a reading against a comfortable band.
 *
 * These bands are broad, general-purpose guides for display only. They are not
 * agronomic advice and they never override the advisory the Raspberry Pi
 * produced.
 */
export function classifySensor(
  metric: 'soil_moisture' | 'temperature' | 'humidity' | 'aqi' | 'pressure',
  value: number | null | undefined,
): SensorStatus {
  if (!hasValue(value)) return 'unavailable';

  const bands: Record<string, [number, number]> = {
    soil_moisture: [30, 70],
    temperature: [15, 35],
    humidity: [40, 80],
    aqi: [0, 100],
    pressure: [980, 1040],
  };

  const band = bands[metric];
  if (!band) return 'normal';
  const [min, max] = band;
  if (value < min) return 'low';
  if (value > max) return 'high';
  return 'normal';
}

export function sensorStatusLabel(status: SensorStatus): string {
  const labels: Record<SensorStatus, string> = {
    normal: 'Normal',
    low: 'Low',
    high: 'High',
    unavailable: 'Unavailable',
  };
  return labels[status];
}

/** Direction of travel between the two most recent readings. */
export function trendOf(
  readings: SensorReading[],
  key: keyof SensorReading,
): 'up' | 'down' | 'flat' | null {
  const values = readings
    .map((r) => r[key])
    .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
  if (values.length < 2) return null;

  const previous = values[values.length - 2];
  const current = values[values.length - 1];
  if (previous === 0) return current === 0 ? 'flat' : 'up';

  const change = (current - previous) / Math.abs(previous);
  if (change > 0.02) return 'up';
  if (change < -0.02) return 'down';
  return 'flat';
}

/* ── Misc ── */

export function initialsOf(name: string | null | undefined, fallback = 'M'): string {
  if (!name?.trim()) return fallback;
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || fallback;
}

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
