'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { useDeviceStore } from '@/lib/store';
import { timeAgo, getSeverityLabel, formatSensorValue, getFreshness } from '@/lib/utils';
import type { Device, DeviceSummary } from '@/lib/types';
import styles from './dashboard.module.css';
import Link from 'next/link';
import MapWrapper from '@/components/MapWrapper';

export default function DashboardPage() {
  const { devices, selectedDevice, selectedSummary, loading, error, fetchDevices, selectDevice } = useDeviceStore();
  const [summaries, setSummaries] = useState<Record<string, DeviceSummary>>({});
  const [loadingSummaries, setLoadingSummaries] = useState(true);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  useEffect(() => {
    if (devices.length > 0) {
      loadAllSummaries();
    }
  }, [devices]);

  async function loadAllSummaries() {
    setLoadingSummaries(true);
    try {
      const results = await api.getAllDeviceSummaries();
      setSummaries(results);
    } catch (e) {
      console.error(`Failed to load summaries`, e);
    } finally {
      setLoadingSummaries(false);
      // Auto-select first device if none selected
      if (!selectedDevice && devices.length > 0) {
        selectDevice(devices[0].device_id);
      }
    }
  }

  return (
    <AppShell>
      <div className={styles.page}>
        {/* Page header */}
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>Your farm at a glance</p>
        </div>

        {/* NFC Scan Button */}
        <Link href="/scan" className={styles.scanButton}>
          <span className={styles.scanIcon}>📱</span>
          <span>Scan NFC Tag</span>
        </Link>

        {loading || loadingSummaries ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>Loading your devices...</p>
          </div>
        ) : error ? (
          <div className={styles.errorCard}>
            <span className={styles.errorIcon}>⚠️</span>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={fetchDevices}>Retry</button>
          </div>
        ) : devices.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📡</span>
            <h2>No MITTI device selected</h2>
            <p>Scan the NFC tag on your MITTI device to view its data.</p>
            <Link href="/scan" className="btn btn-primary">Scan NFC</Link>
          </div>
        ) : (
          <>
            {/* Field Map Section */}
            <div className={styles.mapSection}>
              <h3 className={styles.sectionTitle}>🗺️ Field Overview</h3>
              <MapWrapper 
                devices={devices} 
                selectedDeviceId={selectedDevice?.device_id || null} 
                onSelectDevice={selectDevice} 
              />
            </div>

            {/* Device Cards */}
            <div className={styles.deviceGrid}>
              {devices.map((device, index) => {
                const summary = summaries[device.device_id];
                const isSelected = selectedDevice?.device_id === device.device_id;
                return (
                  <DeviceCard
                    key={device.device_id}
                    device={device}
                    summary={summary}
                    isSelected={isSelected}
                    index={index}
                    onSelect={() => selectDevice(device.device_id)}
                  />
                );
              })}
            </div>

            {/* Selected Device Detail */}
            {selectedSummary && (
              <div className={styles.detailSection}>
                <SensorSummaryRow summary={selectedSummary} />
                <AdvisoryCard summary={selectedSummary} />
                <SyncInfo summary={selectedSummary} />
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

/* ── Device Card Component ── */
function DeviceCard({ device, summary, isSelected, index, onSelect }: {
  device: Device;
  summary?: DeviceSummary;
  isSelected: boolean;
  index: number;
  onSelect: () => void;
}) {
  const severity = device.alert_severity || 'grey';
  const health = summary?.health;

  return (
    <button
      className={`${styles.deviceCard} ${isSelected ? styles.deviceCardSelected : ''}`}
      onClick={onSelect}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className={styles.deviceCardHeader}>
        <div className={styles.deviceInfo}>
          <h3 className={styles.deviceName}>{device.device_name}</h3>
          <p className={styles.deviceField}>{device.field_name}</p>
          <p className={styles.deviceCrop}>🌾 {device.crop}</p>
        </div>
        <div className={`badge badge-${severity}`}>
          <span className={`severity-dot ${severity}`} />
          {getSeverityLabel(severity)}
        </div>
      </div>

      <div className={styles.deviceCardMeta}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Status</span>
          <span className={`${styles.metaValue} ${styles[`status_${device.connection_status}`]}`}>
            {device.connection_status === 'synced' ? '🟢 Synced' :
             device.connection_status === 'live' ? '⚡ Live' :
             device.connection_status === 'offline' ? '⚫ Offline' : '📦 Cached'}
          </span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Last Sync</span>
          <span className={styles.metaValue}>{timeAgo(device.last_sync_at)}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Health</span>
          <span className={styles.metaValue}>{health?.overall_status || '—'}</span>
        </div>
      </div>

      <div className={styles.deviceId}>{device.device_id}</div>
    </button>
  );
}

/* ── Sensor Summary Row ── */
function SensorSummaryRow({ summary }: { summary: DeviceSummary }) {
  const sensor = summary.latest_sensor;
  if (!sensor) return (
    <div className={`card ${styles.sensorSection}`}>
      <h3 className={styles.sectionTitle}>📊 Sensor Readings</h3>
      <p className={styles.noData}>No sensor data available</p>
    </div>
  );

  const freshness = getFreshness(sensor.captured_at);

  const sensors = [
    { label: 'Soil Moisture', value: sensor.soil_moisture_percent, unit: '%', icon: '💧', color: 'var(--soil-brown)' },
    { label: 'Temperature', value: sensor.temperature_c, unit: '°C', icon: '🌡️', color: 'var(--action-orange)' },
    { label: 'Humidity', value: sensor.humidity_percent, unit: '%', icon: '💨', color: 'var(--sky-blue)' },
    { label: 'Air Pressure', value: sensor.air_pressure_hpa, unit: ' hPa', icon: '🌀', color: 'var(--neutral-grey)' },
    { label: 'AQI', value: sensor.aqi, unit: '', icon: '🌬️', color: 'var(--green-primary)' },
    { label: 'Rain', value: null, unit: '', icon: '🌧️', color: 'var(--sky-blue)', text: sensor.rain_density },
  ];

  return (
    <div className={styles.sensorSection}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>📊 Sensor Readings</h3>
        <span className={`badge ${freshness.status === 'fresh' ? 'badge-green' : freshness.status === 'stale' ? 'badge-yellow' : 'badge-orange'}`}>
          {freshness.label}
        </span>
      </div>
      <div className={styles.sensorGrid}>
        {sensors.map((s) => (
          <div key={s.label} className={styles.sensorCard}>
            <span className={styles.sensorIcon}>{s.icon}</span>
            <div className={styles.sensorInfo}>
              <span className={styles.sensorLabel}>{s.label}</span>
              <span className={styles.sensorValue} style={{ color: s.color }}>
                {s.text || formatSensorValue(s.value, s.unit)}
              </span>
            </div>
          </div>
        ))}
      </div>
      <Link href={`/sensors?device=${summary.device.device_id}`} className={styles.viewMore}>
        View sensor trends →
      </Link>
    </div>
  );
}

/* ── Advisory Card ── */
function AdvisoryCard({ summary }: { summary: DeviceSummary }) {
  const advisory = summary.latest_advisory;
  if (!advisory) return (
    <div className={`card ${styles.advisoryCard}`}>
      <h3 className={styles.sectionTitle}>🌾 Latest Advisory</h3>
      <p className={styles.noData}>No advisory is available for this device.</p>
    </div>
  );

  const severity = advisory.severity;
  const severityColors: Record<string, string> = {
    green: 'var(--healthy-green)',
    yellow: 'var(--warning-yellow)',
    orange: 'var(--action-orange)',
    red: 'var(--critical-red)',
  };

  return (
    <div
      className={styles.advisoryCard}
      style={{ borderLeft: `4px solid ${severityColors[severity] || 'var(--neutral-grey)'}` }}
    >
      <div className={styles.advisoryHeader}>
        <div className={`badge badge-${severity}`}>
          <span className={`severity-dot ${severity}`} />
          {getSeverityLabel(severity as 'green' | 'yellow' | 'orange' | 'red' | 'grey')}
        </div>
        <span className={styles.advisoryTime}>{timeAgo(advisory.created_at)}</span>
      </div>

      <h4 className={styles.advisoryProblem}>{advisory.primary_problem}</h4>
      <p className={styles.advisorySummary}>{advisory.summary}</p>

      {advisory.step_by_step_guidance && advisory.step_by_step_guidance.length > 0 && (
        <div className={styles.guidanceSection}>
          <h5 className={styles.guidanceTitle}>What to do:</h5>
          <ol className={styles.guidanceList}>
            {advisory.step_by_step_guidance.map((step, i) => (
              <li key={i} className={styles.guidanceStep}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {advisory.uncertainty_note && (
        <div className={styles.uncertaintyNote}>
          <span>⚠️</span> {advisory.uncertainty_note}
        </div>
      )}

      <div className={styles.advisoryMeta}>
        <span className={`badge badge-${advisory.source === 'qwen_validated' ? 'blue' : 'grey'}`}>
          {advisory.source === 'qwen_validated' ? 'AI Validated' : 'Fallback'}
        </span>
        <span className={styles.confidence}>
          Confidence: {Math.round(advisory.confidence * 100)}%
        </span>
      </div>

      <Link href={`/advisories?device=${summary.device.device_id}`} className={styles.viewMore}>
        View all advisories →
      </Link>
    </div>
  );
}

/* ── Sync Info ── */
function SyncInfo({ summary }: { summary: DeviceSummary }) {
  const sync = summary.sync_status;
  if (!sync) return null;

  return (
    <div className={`card ${styles.syncCard}`}>
      <h3 className={styles.sectionTitle}>🔄 Sync Status</h3>
      <div className={styles.syncGrid}>
        <div className={styles.syncItem}>
          <span className={styles.syncLabel}>Last Upload</span>
          <span className={styles.syncValue}>{timeAgo(sync.last_upload_at)}</span>
        </div>
        <div className={styles.syncItem}>
          <span className={styles.syncLabel}>Pending Records</span>
          <span className={styles.syncValue}>{sync.pending_records}</span>
        </div>
        <div className={styles.syncItem}>
          <span className={styles.syncLabel}>Status</span>
          <span className={`badge badge-${sync.status === 'synced' ? 'green' : sync.status === 'pending' ? 'yellow' : 'red'}`}>
            {sync.status}
          </span>
        </div>
        {sync.last_error && (
          <div className={styles.syncItem}>
            <span className={styles.syncLabel}>Last Error</span>
            <span className={styles.syncError}>{sync.last_error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
