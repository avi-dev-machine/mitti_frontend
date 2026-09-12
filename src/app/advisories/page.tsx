'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { useDeviceStore } from '@/lib/store';
import { timeAgo, getSeverityLabel, formatDateTime } from '@/lib/utils';
import type { Advisory } from '@/lib/types';
import styles from './advisories.module.css';

function AdvisoriesContent() {
  const searchParams = useSearchParams();
  const deviceId = searchParams.get('device');
  const { devices, fetchDevices } = useDeviceStore();
  const [activeDevice, setActiveDevice] = useState(deviceId || '');
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);
  useEffect(() => {
    if (!activeDevice && devices.length > 0) setActiveDevice(devices[0].device_id);
  }, [devices, activeDevice]);
  useEffect(() => { if (activeDevice) loadAdvisories(); }, [activeDevice]);

  async function loadAdvisories() {
    setLoading(true);
    try {
      const data = await api.getAdvisoryHistory(activeDevice, 50);
      setAdvisories(data.advisories);
      if (data.advisories.length > 0) setExpandedId(data.advisories[0].id);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  return (
    <AppShell>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Advisories</h1>
          <select className={styles.deviceSelect} value={activeDevice} onChange={(e) => setActiveDevice(e.target.value)}>
            {devices.map(d => <option key={d.device_id} value={d.device_id}>{d.device_name}</option>)}
          </select>
        </div>

        {loading ? (
          <div className={styles.loading}><div className={styles.spinner} /><p>Loading advisories...</p></div>
        ) : advisories.length === 0 ? (
          <div className={styles.empty}><span>🌾</span><p>No advisory is available for this device.</p></div>
        ) : (
          <div className={styles.advisoryList}>
            {advisories.map((adv, i) => (
              <div
                key={adv.id}
                className={`${styles.advisoryCard} ${expandedId === adv.id ? styles.expanded : ''}`}
                style={{ animationDelay: `${i * 60}ms`, borderLeftColor: `var(--${adv.severity === 'green' ? 'healthy-green' : adv.severity === 'orange' ? 'action-orange' : adv.severity === 'red' ? 'critical-red' : 'warning-yellow'})` }}
              >
                {/* Header — always visible */}
                <button className={styles.advHeader} onClick={() => setExpandedId(expandedId === adv.id ? null : adv.id)}>
                  <div className={styles.advHeaderLeft}>
                    <span className={`badge badge-${adv.severity}`}>
                      <span className={`severity-dot ${adv.severity}`} />
                      {getSeverityLabel(adv.severity)}
                    </span>
                    <h3 className={styles.advProblem}>{adv.primary_problem}</h3>
                    <span className={styles.advTime}>{timeAgo(adv.created_at)}</span>
                  </div>
                  <span className={styles.expandIcon}>{expandedId === adv.id ? '▲' : '▼'}</span>
                </button>

                {/* Expanded content */}
                {expandedId === adv.id && (
                  <div className={styles.advBody}>
                    <p className={styles.advSummary}>{adv.summary}</p>

                    {adv.evidence_used?.length > 0 && (
                      <div className={styles.section}>
                        <h4>🔍 Evidence Used</h4>
                        <ul>{adv.evidence_used.map((e, j) => <li key={j}>{e}</li>)}</ul>
                      </div>
                    )}

                    {adv.step_by_step_guidance?.length > 0 && (
                      <div className={`${styles.section} ${styles.guidanceBox}`}>
                        <h4>✅ What to do</h4>
                        <ol>{adv.step_by_step_guidance.map((s, j) => <li key={j}>{s}</li>)}</ol>
                      </div>
                    )}

                    {adv.recheck_plan && (
                      <div className={styles.section}><h4>🔄 Recheck Plan</h4><p>{adv.recheck_plan}</p></div>
                    )}

                    {adv.uncertainty_note && (
                      <div className={styles.uncertaintyBox}>
                        <span>⚠️</span><p>{adv.uncertainty_note}</p>
                      </div>
                    )}

                    {adv.escalation_note && (
                      <div className={styles.section}><h4>🏥 When to seek expert help</h4><p>{adv.escalation_note}</p></div>
                    )}

                    <div className={styles.advFooter}>
                      <span className={`badge badge-${adv.source === 'qwen_validated' ? 'blue' : 'grey'}`}>
                        {adv.source === 'qwen_validated' ? 'AI Validated' : 'Fallback'}
                      </span>
                      <span className={styles.advConfidence}>Confidence: {Math.round(adv.confidence * 100)}%</span>
                      <span className={styles.advTimestamp}>{formatDateTime(adv.created_at)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function AdvisoriesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdvisoriesContent />
    </Suspense>
  );
}
