/* ── MITTI — Online status ──
 *
 * navigator.onLine only reports whether the device has a network interface, so
 * it says "online" on a Wi-Fi network with no internet behind it. For a farmer
 * on a patchy rural connection that is exactly the case that matters, so this
 * pairs the browser events with a periodic reachability check against the
 * backend's health endpoint.
 *
 * The browser's own flag is read through useSyncExternalStore, which is the
 * API built for external mutable sources: it subscribes, tears down cleanly,
 * and gives the server a defined snapshot so hydration matches.
 */
'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { healthApi } from '@/lib/api/health';

const PROBE_INTERVAL_MS = 45_000;

function subscribeToConnectivity(onChange: () => void): () => void {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

const getOnlineSnapshot = () => navigator.onLine;
// On the server, assume online: rendering an offline banner into the HTML of
// a request that plainly succeeded would be wrong.
const getServerSnapshot = () => true;

export interface OnlineStatus {
  /** The browser believes a network is available. */
  isOnline: boolean;
  /** The MITTI backend answered its health check. */
  isBackendReachable: boolean;
  /** True once the first probe has completed. */
  hasChecked: boolean;
}

export function useOnlineStatus(): OnlineStatus {
  const isOnline = useSyncExternalStore(
    subscribeToConnectivity,
    getOnlineSnapshot,
    getServerSnapshot,
  );

  const [isBackendReachable, setIsBackendReachable] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);

  const probe = useCallback(async (signal: AbortSignal) => {
    if (!navigator.onLine) {
      setIsBackendReachable(false);
      setHasChecked(true);
      return;
    }
    try {
      await healthApi.check(signal);
      if (!signal.aborted) setIsBackendReachable(true);
    } catch {
      if (!signal.aborted) setIsBackendReachable(false);
    } finally {
      if (!signal.aborted) setHasChecked(true);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // Deferred to a task so the first probe is a subscription-driven update
    // rather than a synchronous setState during the effect.
    const initial = window.setTimeout(() => void probe(controller.signal), 0);
    const interval = window.setInterval(() => void probe(controller.signal), PROBE_INTERVAL_MS);

    return () => {
      controller.abort();
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
    // Re-probe as soon as the browser reports the connection came back.
  }, [isOnline, probe]);

  return { isOnline, isBackendReachable, hasChecked };
}
