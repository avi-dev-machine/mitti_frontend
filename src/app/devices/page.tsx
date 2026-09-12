'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { useDeviceStore } from '@/lib/store';
import { timeAgo, getSeverityLabel } from '@/lib/utils';
import styles from './devices.module.css';

export default function DevicesPage() {
  const { devices, loading, error, fetchDevices, selectDevice } = useDeviceStore();

  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  return (
    <AppShell>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Devices</h1>
          <Link href="/scan" className={styles.scanBtn}>📱 Scan NFC</Link>
        </div>

        {loading ? (
          <div className={styles.loading}><div className={styles.spinner} /><p>Loading devices...</p></div>
        ) : error ? (
          <div className={styles.error}><p>⚠️ {error}</p><button className="btn btn-primary" onClick={fetchDevices}>Retry</button></div>
        ) : (
          <div className={styles.deviceList}>
            {devices.map((device, i) => (
              <Link
                key={device.device_id}
                href={`/devices/${device.device_id}`}
                className={styles.deviceRow}
                style={{ animationDelay: `${i * 60}ms` }}
                onClick={() => selectDevice(device.device_id)}
              >
                <div className={styles.deviceLeft}>
                  <div className={`severity-dot ${device.alert_severity}`} />
                  <div>
                    <h3 className={styles.deviceName}>{device.device_name}</h3>
                    <p className={styles.deviceField}>{device.field_name} • {device.crop}</p>
                  </div>
                </div>
                <div className={styles.deviceRight}>
                  <span className={`badge badge-${device.alert_severity}`}>
                    {getSeverityLabel(device.alert_severity)}
                  </span>
                  <span className={styles.syncTime}>{timeAgo(device.last_sync_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
