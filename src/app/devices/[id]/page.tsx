'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { timeAgo, getSeverityLabel, formatSensorValue, getFreshness } from '@/lib/utils';
import type { DeviceSummary, DeviceHealth } from '@/lib/types';
import styles from './detail.module.css';

export default function DeviceDetailPage() {
  const params = useParams();
  const deviceId = params.id as string;
  const [summary, setSummary] = useState<DeviceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDevice();
  }, [deviceId]);

  async function loadDevice() {
    setLoading(true);
    try {
      const data = await api.getDeviceSummary(deviceId);
      setSummary(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  if (loading) return (
    <AppShell>
      <div className={styles.loading}><div className={styles.spinner} /><p>Loading device...</p></div>
    </AppShell>
  );

  if (!summary) return (
    <AppShell>
      <div className={styles.error}><p>Device not found</p><Link href="/devices" className="btn btn-primary">Back to Devices</Link></div>
    </AppShell>
  );

  const { device, health, latest_sensor, latest_advisory, sync_status } = summary;

  return (
    <AppShell>
      <div className={styles.page}>
        {/* Device Header */}
        <div className={styles.deviceHeader}>
          <div className={styles.headerTop}>
            <Link href="/devices" className={styles.backBtn}>← Back</Link>
            <div className={`badge badge-${device.alert_severity}`}>
              <span className={`severity-dot ${device.alert_severity}`} />
              {getSeverityLabel(device.alert_severity)}
            </div>
          </div>
          <h1 className={styles.deviceName}>{device.device_name}</h1>
          <p className={styles.deviceMeta}>{device.field_name} • {device.crop}</p>
          <p className={styles.deviceId}>{device.device_id}</p>

          <div className={styles.headerStats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Status</span>
              <span className={styles.statValue}>
                {device.connection_status === 'synced' ? '🟢 Synced' : device.connection_status === 'live' ? '⚡ Live' : '⚫ Offline'}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Last Sync</span>
              <span className={styles.statValue}>{timeAgo(device.last_sync_at)}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Location</span>
              <span className={styles.statValue}>{device.latitude.toFixed(4)}°N, {device.longitude.toFixed(4)}°E</span>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className={styles.quickLinks}>
          <Link href={`/sensors?device=${deviceId}`} className={styles.quickLink}>📊 Sensors</Link>
          <Link href={`/advisories?device=${deviceId}`} className={styles.quickLink}>🌾 Advisories</Link>
          <Link href={`/history?device=${deviceId}`} className={styles.quickLink}>📜 History</Link>
        </div>

        {/* Device Health */}
        {health && <HealthCard health={health} />}

        {/* Latest Sensor Snapshot */}
        {latest_sensor && (
          <div className="card">
            <h3 className={styles.sectionTitle}>📊 Latest Sensor Reading</h3>
            <p className={styles.freshness}>{getFreshness(latest_sensor.captured_at).label}</p>
            <div className={styles.sensorGrid}>
              <SensorItem icon="💧" label="Soil Moisture" value={`${latest_sensor.soil_moisture_percent}%`} />
              <SensorItem icon="🌡️" label="Temperature" value={`${latest_sensor.temperature_c}°C`} />
              <SensorItem icon="💨" label="Humidity" value={`${latest_sensor.humidity_percent}%`} />
              <SensorItem icon="🌀" label="Pressure" value={`${latest_sensor.air_pressure_hpa} hPa`} />
              <SensorItem icon="🌬️" label="AQI" value={`${latest_sensor.aqi}`} />
              <SensorItem icon="🌧️" label="Rain" value={latest_sensor.rain_density} />
            </div>
          </div>
        )}

        {/* Latest Advisory */}
        {latest_advisory && (
          <div className="card" style={{ borderLeft: `4px solid var(--${latest_advisory.severity === 'green' ? 'healthy-green' : latest_advisory.severity === 'orange' ? 'action-orange' : latest_advisory.severity === 'red' ? 'critical-red' : 'warning-yellow'})` }}>
            <div className={styles.advHeader}>
              <h3 className={styles.sectionTitle}>🌾 Latest Advisory</h3>
              <span className={`badge badge-${latest_advisory.severity}`}>{getSeverityLabel(latest_advisory.severity)}</span>
            </div>
            <h4 className={styles.advProblem}>{latest_advisory.primary_problem}</h4>
            <p className={styles.advSummary}>{latest_advisory.summary}</p>
            <Link href={`/advisories?device=${deviceId}`} className={styles.viewMore}>View full advisory →</Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function HealthCard({ health }: { health: DeviceHealth }) {
  const components = [
    { label: 'Raspberry Pi', status: health.raspberry_pi_status, icon: '🖥️' },
    { label: 'ESP32', status: health.esp32_status, icon: '📶' },
    { label: 'Camera', status: health.camera_status, icon: '📷' },
    { label: 'Vision AI', status: health.vision_model_status, icon: '👁️' },
    { label: 'Qwen AI', status: health.qwen_model_status, icon: '🧠' },
    { label: 'Database', status: health.database_status, icon: '💾' },
    { label: 'LoRa', status: health.lora_status, icon: '📡' },
    { label: 'Relay', status: health.relay_status, icon: '⚡' },
    { label: 'Cloud Sync', status: health.cloud_sync_status, icon: '☁️' },
  ];

  return (
    <div className="card">
      <div className={styles.advHeader}>
        <h3 className={styles.sectionTitle}>🔧 Device Health</h3>
        <span className={`badge badge-${health.overall_status === 'healthy' ? 'green' : health.overall_status === 'warning' ? 'yellow' : health.overall_status === 'offline' ? 'grey' : 'red'}`}>
          {health.overall_status}
        </span>
      </div>
      <div className={styles.healthGrid}>
        {components.map(c => (
          <div key={c.label} className={styles.healthItem}>
            <span className={styles.healthIcon}>{c.icon}</span>
            <span className={styles.healthLabel}>{c.label}</span>
            <span className={`${styles.healthStatus} ${styles[`hs_${c.status}`]}`}>{c.status}</span>
          </div>
        ))}
      </div>
      <p className={styles.freshness}>Last checked: {timeAgo(health.last_checked_at)}</p>
    </div>
  );
}

function SensorItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className={styles.sensorItem}>
      <span>{icon}</span>
      <span className={styles.sensorLabel}>{label}</span>
      <span className={styles.sensorValue}>{value}</span>
    </div>
  );
}
