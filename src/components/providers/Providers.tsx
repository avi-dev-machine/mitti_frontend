/* ── MITTI — Client providers ──
 * Mounted once by the root layout, around the whole app.
 */
'use client';

import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/lib/types';
import { QueryProvider } from './QueryProvider';
import { SessionProvider } from './SessionProvider';
import { ServiceWorkerRegistrar } from './ServiceWorkerRegistrar';

interface ProvidersProps {
  initialUser: User | null;
  initialProfile: Profile | null;
  children: React.ReactNode;
}

export function Providers({ initialUser, initialProfile, children }: ProvidersProps) {
  return (
    <QueryProvider>
      <SessionProvider initialUser={initialUser} initialProfile={initialProfile}>
        <ServiceWorkerRegistrar />
        {children}
      </SessionProvider>
    </QueryProvider>
  );
}
