/* ── MITTI — Profile API ── */
'use client';

import type { Profile } from '@/lib/types';
import { apiFetch } from './client';

export interface ProfileUpdate {
  full_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  language?: string | null;
}

export const profileApi = {
  /** The signed-in user's own profile. Identity comes from the token. */
  get: (signal?: AbortSignal) => apiFetch<Profile>('/api/profile', { signal }),

  update: (changes: ProfileUpdate) =>
    apiFetch<Profile>('/api/profile', { method: 'PATCH', body: changes }),
};
