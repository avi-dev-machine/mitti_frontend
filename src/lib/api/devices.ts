/* ── MITTI — Devices API ── */
'use client';

import type { Device, DeviceHealth, DeviceSummary } from '@/lib/types';
import { apiFetch } from './client';

export const devicesApi = {
  list: (signal?: AbortSignal) =>
    apiFetch<{ devices: Device[]; count: number }>('/api/devices', { signal }),

  get: (deviceId: string, signal?: AbortSignal) =>
    apiFetch<Device>(`/api/devices/${encodeURIComponent(deviceId)}`, { signal }),

  summary: (deviceId: string, signal?: AbortSignal) =>
    apiFetch<DeviceSummary>(`/api/devices/${encodeURIComponent(deviceId)}/summary`, { signal }),

  /** All summaries in one round trip — the dashboard needs every card at once. */
  allSummaries: (signal?: AbortSignal) =>
    apiFetch<Record<string, DeviceSummary>>('/api/devices/summary/all', { signal }),

  health: (deviceId: string, signal?: AbortSignal) =>
    apiFetch<{ health: DeviceHealth | null }>(
      `/api/device-health/${encodeURIComponent(deviceId)}`,
      { signal },
    ),

  /**
   * Check that a scanned or typed device id belongs to the signed-in user.
   * Answers the same way for "does not exist" and "not yours", so the endpoint
   * cannot be used to enumerate which device ids are real.
   */
  validate: (deviceId: string, signal?: AbortSignal) =>
    apiFetch<{ valid: boolean; device?: Device; message?: string }>(
      `/api/devices/validate/${encodeURIComponent(deviceId)}`,
      { signal },
    ),

  /** Link an unclaimed device to the signed-in user. */
  claim: (deviceId: string) =>
    apiFetch<{ claimed: boolean; device?: Device; message?: string }>(
      `/api/devices/${encodeURIComponent(deviceId)}/claim`,
      { method: 'POST' },
    ),
};
