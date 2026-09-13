/* ── MITTI — Service health ──
 * Used by the connection indicator to tell "the backend is down" apart from
 * "this device has no data", which look identical to a user otherwise.
 */
'use client';

import { apiFetch } from './client';

export const healthApi = {
  check: (signal?: AbortSignal) =>
    apiFetch<{ status: string }>('/api/health', { anonymous: true, signal }),
};
