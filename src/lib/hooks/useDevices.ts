/* ── MITTI — Device and monitoring queries ──
 *
 * Query keys are namespaced by resource so a single device refresh does not
 * invalidate the whole fleet.
 */
'use client';

import { useQuery } from '@tanstack/react-query';
import { advisoriesApi, devicesApi, historyApi, sensorsApi } from '@/lib/api';
import type { TimeRange } from '@/lib/types';

export const queryKeys = {
  devices: ['devices'] as const,
  deviceSummaries: ['devices', 'summaries'] as const,
  device: (id: string) => ['devices', id] as const,
  deviceSummary: (id: string) => ['devices', id, 'summary'] as const,
  deviceHealth: (id: string) => ['devices', id, 'health'] as const,
  sensorsLatest: (id: string) => ['sensors', id, 'latest'] as const,
  sensorHistory: (id: string, range: TimeRange) => ['sensors', id, 'history', range] as const,
  advisoryLatest: (id: string) => ['advisories', id, 'latest'] as const,
  advisoryHistory: (id: string, page: number, severity?: string) =>
    ['advisories', id, 'history', page, severity ?? 'all'] as const,
  events: (id: string) => ['history', id, 'events'] as const,
  images: (id: string, page: number) => ['history', id, 'images', page] as const,
};

export function useDevices() {
  return useQuery({
    queryKey: queryKeys.devices,
    queryFn: ({ signal }) => devicesApi.list(signal),
    select: (data) => data.devices,
  });
}

export function useDeviceSummaries() {
  return useQuery({
    queryKey: queryKeys.deviceSummaries,
    queryFn: ({ signal }) => devicesApi.allSummaries(signal),
  });
}

export function useDeviceSummary(deviceId: string | null) {
  return useQuery({
    queryKey: queryKeys.deviceSummary(deviceId ?? ''),
    queryFn: ({ signal }) => devicesApi.summary(deviceId as string, signal),
    enabled: Boolean(deviceId),
  });
}

export function useSensorHistory(deviceId: string | null, range: TimeRange) {
  return useQuery({
    queryKey: queryKeys.sensorHistory(deviceId ?? '', range),
    queryFn: ({ signal }) => sensorsApi.history(deviceId as string, range, signal),
    enabled: Boolean(deviceId),
  });
}

export function useAdvisoryHistory(
  deviceId: string | null,
  page: number,
  severity?: string,
  pageSize = 10,
) {
  return useQuery({
    queryKey: queryKeys.advisoryHistory(deviceId ?? '', page, severity),
    queryFn: ({ signal }) =>
      advisoriesApi.history(
        deviceId as string,
        { limit: pageSize, offset: page * pageSize, severity },
        signal,
      ),
    enabled: Boolean(deviceId),
    // Keeps the previous page on screen while the next one loads, instead of
    // collapsing the list to a spinner on every page change.
    placeholderData: (previous) => previous,
  });
}

export function useDeviceEvents(deviceId: string | null) {
  return useQuery({
    queryKey: queryKeys.events(deviceId ?? ''),
    queryFn: ({ signal }) => historyApi.events(deviceId as string, signal),
    enabled: Boolean(deviceId),
  });
}

export function useDeviceImages(deviceId: string | null, page: number, pageSize = 12) {
  return useQuery({
    queryKey: queryKeys.images(deviceId ?? '', page),
    queryFn: ({ signal }) =>
      historyApi.images(deviceId as string, { limit: pageSize, offset: page * pageSize }, signal),
    enabled: Boolean(deviceId),
    placeholderData: (previous) => previous,
  });
}
