'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { useDeviceStore } from '@/lib/store';
import { timeAgo, getSeverityLabel, formatDateTime } from '@/lib/utils';
import type { Advisory, RelayEvent } from '@/lib/types';
import styles from './history.module.css';

type Tab = 'advisories' | 'events';

function HistoryContent() {
  const searchParams = useSearchParams();
  const deviceId = searchParams.get('device');
  const { devices, fetchDevices } = useDeviceStore();
  const [activeDevice, setActiveDevice] = useState(deviceId || '');
  const [tab, setTab] = useState<Tab>('advisories');
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [events, setEvents] = useState<RelayEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);
  useEffect(() => {
    if (!activeDevice && devices.length > 0) setActiveDevice(devices[0].device_id);
  }, [devices, activeDevice]);
  useEffect(() => { if (activeDevice) loadHistory(); }, [activeDevice]);

  async function loadHistory() {
    setLoading(true);
    try {
      const [advData, eventData] = await Promise.all([
        api.getAdvisoryHistory(activeDevice, 50),
        api.getEventHistory(activeDevice),
      ]);
      setAdvisories(advData.advisories);
      setEvents(eventData.relay_events || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  return (
    <AppShell>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>History</h1>
          <select className={styles.deviceSelect} value={activeDevice} onChange={(e) => setActiveDevice(e.target.value)}>
            {devices.map(d => <option key={d.device_id} value={d.device_id}>{d.device_name}</option>)}
          </select>
        </div>

        {/* Tab selector */}
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'advisories' ? styles.tabActive : ''}`} onClick={() => setTab('advisories')}>
            🌾 Advisories ({advisories.length})
          </button>
          <button className={`${styles.tab} ${tab === 'events' ? styles.tabActive : ''}`} onClick={() => setTab('events')}>
            ⚡ Events ({events.length})
          </button>
        </div>

        {loading ? (
          <div className={styles.loading}><div className={styles.spinner} /><p>Loading history...</p></div>
        ) : tab === 'advisories' ? (
          advisories.length === 0 ? (
            <div className={styles.empty}>No history available for this time range.</div>
          ) : (
            <div className={styles.list}>
              {advisories.map((adv, i) => (
                <div key={adv.id} className={styles.historyItem} style={{ animationDelay: `${i * 40}ms` }}>
                  <div className={styles.itemLeft}>
                    <span className={`severity-dot ${adv.severity}`} />
                    <div>
                      <p className={styles.itemTitle}>{adv.primary_problem}</p>
                      <p className={styles.itemSub}>{adv.summary?.slice(0, 100)}...</p>
                    </div>
                  </div>
                  <div className={styles.itemRight}>
                    <span className={`badge badge-${adv.severity}`}>{getSeverityLabel(adv.severity)}</span>
                    <span className={styles.itemTime}>{formatDateTime(adv.created_at)}</span>
                    <span className={`badge badge-${adv.source === 'qwen_validated' ? 'blue' : 'grey'}`} style={{ fontSize: '10px' }}>
                      {adv.source === 'qwen_validated' ? 'AI' : 'Fallback'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          events.length === 0 ? (
            <div className={styles.empty}>No events recorded.</div>
          ) : (
            <div className={styles.list}>
              {events.map((evt, i) => (
                <div key={evt.id} className={styles.historyItem} style={{ animationDelay: `${i * 40}ms` }}>
                  <div className={styles.itemLeft}>
                    <span>{evt.event_type === 'pump_on' ? '💧' : '🛑'}</span>
                    <div>
                      <p className={styles.itemTitle}>{evt.event_type.replace('_', ' ').toUpperCase()}</p>
                      <p className={styles.itemSub}>{evt.reason} {evt.duration_seconds > 0 ? `• ${Math.round(evt.duration_seconds / 60)} min` : ''}</p>
                    </div>
                  </div>
                  <div className={styles.itemRight}>
                    <span className={styles.itemTime}>{formatDateTime(evt.triggered_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </AppShell>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HistoryContent />
    </Suspense>
  );
}
