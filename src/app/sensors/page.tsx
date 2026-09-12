'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { useDeviceStore } from '@/lib/store';
import { timeAgo, formatSensorValue, getFreshness } from '@/lib/utils';
import type { SensorReading, TimeRange } from '@/lib/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import styles from './sensors.module.css';

function SensorsContent() {
  const searchParams = useSearchParams();
  const deviceId = searchParams.get('device');
  const { devices, fetchDevices } = useDeviceStore();
  const [activeDevice, setActiveDevice] = useState(deviceId || '');
  const [latest, setLatest] = useState<SensorReading | null>(null);
  const [history, setHistory] = useState<SensorReading[]>([]);
  const [range, setRange] = useState<TimeRange>('24h');
  const [loading, setLoading] = useState(true);
  const [activeSensor, setActiveSensor] = useState('temperature_c');

  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  useEffect(() => {
    if (!activeDevice && devices.length > 0) {
      setActiveDevice(devices[0].device_id);
    }
  }, [devices, activeDevice]);

  useEffect(() => {
    if (activeDevice) loadData();
  }, [activeDevice, range]);

  async function loadData() {
    setLoading(true);
    try {
      const [latestRes, historyRes] = await Promise.all([
        api.getLatestSensors(activeDevice),
        api.getSensorHistory(activeDevice, range),
      ]);
      setLatest(latestRes.sensor);
      setHistory(historyRes.readings);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  const sensorConfigs = [
    { key: 'temperature_c', label: 'Temperature', unit: '°C', icon: '🌡️', color: '#EF6C00', gradientId: 'tempGrad' },
    { key: 'soil_moisture_percent', label: 'Soil Moisture', unit: '%', icon: '💧', color: '#795548', gradientId: 'soilGrad' },
    { key: 'humidity_percent', label: 'Humidity', unit: '%', icon: '💨', color: '#1565C0', gradientId: 'humidGrad' },
    { key: 'air_pressure_hpa', label: 'Air Pressure', unit: ' hPa', icon: '🌀', color: '#616161', gradientId: 'pressGrad' },
    { key: 'aqi', label: 'AQI', unit: '', icon: '🌬️', color: '#2E7D32', gradientId: 'aqiGrad' },
  ];

  const activeConfig = sensorConfigs.find(s => s.key === activeSensor) || sensorConfigs[0];

  const chartData = history.map(r => ({
    time: new Date(r.captured_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    date: new Date(r.captured_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    value: (r as any)[activeSensor] as number,
  }));

  // Down-sample for chart performance
  const sampleRate = Math.max(1, Math.floor(chartData.length / 100));
  const sampledData = chartData.filter((_, i) => i % sampleRate === 0);

  return (
    <AppShell>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Sensor Readings</h1>
          {/* Device selector */}
          <select
            className={styles.deviceSelect}
            value={activeDevice}
            onChange={(e) => setActiveDevice(e.target.value)}
          >
            {devices.map(d => (
              <option key={d.device_id} value={d.device_id}>{d.device_name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>Loading sensor data...</p>
          </div>
        ) : (
          <>
            {/* Current Readings Grid */}
            {latest && (
              <div className={styles.currentGrid}>
                {sensorConfigs.map(sensor => {
                  const value = (latest as any)[sensor.key] as number;
                  const freshness = getFreshness(latest.captured_at);
                  return (
                    <button
                      key={sensor.key}
                      className={`${styles.currentCard} ${activeSensor === sensor.key ? styles.currentCardActive : ''}`}
                      onClick={() => setActiveSensor(sensor.key)}
                      style={activeSensor === sensor.key ? { borderColor: sensor.color } : {}}
                    >
                      <span className={styles.currentIcon}>{sensor.icon}</span>
                      <div className={styles.currentInfo}>
                        <span className={styles.currentLabel}>{sensor.label}</span>
                        <span className={styles.currentValue} style={{ color: sensor.color }}>
                          {formatSensorValue(value, sensor.unit)}
                        </span>
                        <span className={styles.currentFreshness}>{freshness.label}</span>
                      </div>
                    </button>
                  );
                })}
                {/* Rain card */}
                <div className={styles.currentCard}>
                  <span className={styles.currentIcon}>🌧️</span>
                  <div className={styles.currentInfo}>
                    <span className={styles.currentLabel}>Rain</span>
                    <span className={styles.currentValue} style={{ color: '#1565C0' }}>
                      {latest.rain_density || 'None'}
                    </span>
                    <span className={styles.currentFreshness}>{timeAgo(latest.captured_at)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Time Range Selector */}
            <div className={styles.rangeSelector}>
              {(['24h', '7d', '30d'] as TimeRange[]).map(r => (
                <button
                  key={r}
                  className={`${styles.rangeBtn} ${range === r ? styles.rangeBtnActive : ''}`}
                  onClick={() => setRange(r)}
                >
                  {r === '24h' ? '24 Hours' : r === '7d' ? '7 Days' : '30 Days'}
                </button>
              ))}
            </div>

            {/* Trend Chart */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>
                {activeConfig.icon} {activeConfig.label} Trend
              </h3>
              {sampledData.length > 0 ? (
                <div className={styles.chartWrapper}>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={sampledData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id={activeConfig.gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={activeConfig.color} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={activeConfig.color} stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                      <XAxis
                        dataKey={range === '24h' ? 'time' : 'date'}
                        tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                        tickLine={false}
                        axisLine={{ stroke: 'var(--border-light)' }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                        tickLine={false}
                        axisLine={false}
                        unit={activeConfig.unit}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-light)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '13px',
                          boxShadow: 'var(--shadow-md)',
                        }}
                        formatter={(value: any) => [`${value}${activeConfig.unit}`, activeConfig.label] as any}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={activeConfig.color}
                        strokeWidth={2}
                        fill={`url(#${activeConfig.gradientId})`}
                        dot={false}
                        activeDot={{ r: 5, fill: activeConfig.color }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className={styles.noData}>No data available for this time range.</p>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

export default function SensorsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SensorsContent />
    </Suspense>
  );
}
