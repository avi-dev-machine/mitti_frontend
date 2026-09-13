/* ── MITTI — API client ──
 *
 * One place where the frontend talks to FastAPI. Every call carries the
 * caller's Supabase access token; the backend validates it and lets Row Level
 * Security decide what comes back. The frontend never sends a user id — the
 * backend would have no reason to trust one.
 */
'use client';

import { createClient } from '@/lib/supabase/client';

const RAW_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
/** Tolerate a trailing slash or an accidental /api suffix in the env value. */
export const API_BASE = RAW_BASE.replace(/\/+$/, '').replace(/\/api$/, '');

export class ApiError extends Error {
  readonly status: number;
  /** True when the request never reached the server. */
  readonly isNetwork: boolean;
  /** True when the session is missing or expired. */
  readonly isUnauthorized: boolean;

  constructor(message: string, status: number, options?: { isNetwork?: boolean }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isNetwork = options?.isNetwork ?? false;
    this.isUnauthorized = status === 401;
  }

  /** A sentence for the user. Never exposes the server's own wording. */
  get friendlyMessage(): string {
    if (this.isNetwork) {
      return 'MITTI cannot reach the server. Check your connection and try again.';
    }
    if (this.isUnauthorized) return 'Your session has expired. Please sign in again.';
    if (this.status === 403) return 'You do not have access to this device.';
    if (this.status === 404) return 'That information could not be found.';
    if (this.status >= 500) return 'The MITTI service is not responding. Please try again shortly.';
    return 'Something went wrong loading this information.';
  }
}

async function authHeader(): Promise<Record<string, string>> {
  try {
    const supabase = createClient();
    // getSession reads the cached session and refreshes it when close to
    // expiry. The token's authenticity is the backend's job to verify.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {};
  } catch {
    // Supabase unconfigured: let the request go out unauthenticated and let
    // the backend answer 401, rather than failing with a different shape.
    return {};
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Skip the Authorization header. Health checks only. */
  anonymous?: boolean;
  signal?: AbortSignal;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, anonymous, headers, ...rest } = options;
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

  const auth = anonymous ? {} : await authHeader();

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...auth,
        ...(headers as Record<string, string> | undefined),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      // Sensor data changes constantly; a stale cached response would be
      // presented as current, which the freshness rules forbid.
      cache: 'no-store',
    });
  } catch (error) {
    throw new ApiError((error as Error).message, 0, { isNetwork: true });
  }

  if (!response.ok) {
    // Read the server's detail for the developer log only — never for display.
    let detail = response.statusText;
    try {
      const payload = await response.json();
      if (typeof payload?.detail === 'string') detail = payload.detail;
    } catch {
      /* not JSON; the status line is enough */
    }
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[mitti:api] ${response.status} ${url} — ${detail}`);
    }
    throw new ApiError(detail, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
