/* ── MITTI — Sensor, advisory and history APIs ── */
'use client';

import type {
  Advisory,
  ImageRecord,
  LoraEvent,
  RelayEvent,
  SensorReading,
  SyncStatus,
  TimeRange,
} from '@/lib/types';
import { apiFetch } from './client';

export const sensorsApi = {
  latest: (deviceId: string, signal?: AbortSignal) =>
    apiFetch<{ sensor: SensorReading | null }>(
      `/api/sensors/latest/${encodeURIComponent(deviceId)}`,
      { signal },
    ),

  history: (deviceId: string, range: TimeRange = '24h', signal?: AbortSignal) =>
    apiFetch<{ readings: SensorReading[]; count: number; range: TimeRange }>(
      `/api/sensors/history/${encodeURIComponent(deviceId)}?range=${range}`,
      { signal },
    ),
};

export const advisoriesApi = {
  latest: (deviceId: string, signal?: AbortSignal) =>
    apiFetch<{ advisory: Advisory | null }>(
      `/api/advisories/latest/${encodeURIComponent(deviceId)}`,
      { signal },
    ),

  history: (
    deviceId: string,
    { limit = 20, offset = 0, severity }: { limit?: number; offset?: number; severity?: string } = {},
    signal?: AbortSignal,
  ) => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (severity) params.set('severity', severity);
    return apiFetch<{ advisories: Advisory[]; count: number; offset: number; limit: number }>(
      `/api/advisories/history/${encodeURIComponent(deviceId)}?${params}`,
      { signal },
    );
  },

  detail: (advisoryId: string, signal?: AbortSignal) =>
    apiFetch<Advisory>(`/api/advisories/${encodeURIComponent(advisoryId)}`, { signal }),
};

export const historyApi = {
  events: (deviceId: string, signal?: AbortSignal) =>
    apiFetch<{
      relay_events?: RelayEvent[];
      lora_events?: LoraEvent[];
      sync_status?: SyncStatus[];
    }>(`/api/history/events/${encodeURIComponent(deviceId)}`, { signal }),

  /**
   * Capture records for the crop assessments the Raspberry Pi has run.
   * Read-only by design: the PWA never triggers a capture — that is the
   * physical button on the unit. See MITTI_PWA_UIUX_SPECIFICATION.md §1.
   */
  images: (
    deviceId: string,
    { limit = 20, offset = 0 }: { limit?: number; offset?: number } = {},
    signal?: AbortSignal,
  ) =>
    apiFetch<{ images: ImageRecord[]; count: number }>(
      `/api/history/images/${encodeURIComponent(deviceId)}?limit=${limit}&offset=${offset}`,
      { signal },
    ),
};
