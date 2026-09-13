/* ── MITTI — Connection banner ──
 *
 * Shown only when something is actually wrong. The spec is firm that offline
 * must be a banner, not a blocking error: the cached data below it is still
 * useful, and a farmer standing in a field with no signal still needs to read
 * this morning's advisory.
 */
'use client';

import { CloudOff, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import styles from './ConnectionBanner.module.css';

export function ConnectionBanner() {
  const { isOnline, isBackendReachable, hasChecked } = useOnlineStatus();

  if (!hasChecked) return null;
  if (isOnline && isBackendReachable) return null;

  const offline = !isOnline;
  const Icon = offline ? WifiOff : CloudOff;

  return (
    <div
      className={`${styles.banner} ${offline ? styles.offline : styles.degraded}`}
      // Polite: worth knowing, but it must not interrupt whatever the user is
      // reading or typing.
      role="status"
      aria-live="polite"
    >
      <Icon size={18} className={styles.icon} aria-hidden="true" />
      <div className={styles.body}>
        <span className={styles.title}>
          {offline ? 'You are offline.' : 'MITTI service unavailable.'}
        </span>{' '}
        <span className={styles.detail}>
          {offline
            ? 'Showing the latest saved information. Reconnect to refresh.'
            : 'Cannot reach the server. Showing the latest saved information.'}
        </span>
      </div>
    </div>
  );
}
