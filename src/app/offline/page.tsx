/* ── MITTI — /offline ──
 *
 * Served by the service worker when a navigation cannot reach the network and
 * the requested page is not in the cache. Deliberately static: it must render
 * from the cache alone, with no data fetch of its own.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { Sprout, WifiOff } from 'lucide-react';
import styles from './offline.module.css';

export const metadata: Metadata = {
  title: 'Offline',
  description: 'MITTI is offline. Showing the latest saved information.',
};

export default function OfflinePage() {
  return (
    <main className={styles.wrap}>
      <span className={styles.brand}>
        <Sprout size={16} aria-hidden="true" style={{ display: 'inline', verticalAlign: -3, marginRight: 6 }} />
        MITTI
      </span>

      <span className={styles.mark}>
        <WifiOff size={26} aria-hidden="true" />
      </span>

      <h1 className={styles.title}>You are offline</h1>
      <p className={styles.body}>
        This page has not been saved to your phone yet. Pages you have already opened stay
        available offline — reconnect to load anything new.
      </p>

      <div className={styles.actions}>
        <Link href="/dashboard" className="btn btn-primary">
          Open the dashboard
        </Link>
      </div>
    </main>
  );
}
