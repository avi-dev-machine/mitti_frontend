/* ── MITTI — TanStack Query provider ──
 *
 * Server state for a field app on a rural connection: cache what was fetched,
 * show it immediately on the next visit, and revalidate quietly in the
 * background. That is also what makes the offline experience honest — the last
 * good data stays on screen with its own timestamp beside it.
 */
'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/client';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Sensor readings arrive every few minutes; a 60s stale window avoids
        // refetching on every tab focus without showing yesterday's numbers.
        staleTime: 60_000,
        gcTime: 30 * 60_000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: (failureCount, error) => {
          // Retrying an expired session or a forbidden device only produces
          // the same answer more slowly.
          if (error instanceof ApiError) {
            if (error.isUnauthorized || error.status === 403 || error.status === 404) {
              return false;
            }
          }
          return failureCount < 2;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      },
      mutations: { retry: false },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === 'undefined') return makeQueryClient();
  // One client for the browser session, so the cache survives navigation.
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(getQueryClient);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
