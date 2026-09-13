/* ── MITTI — Sensor cards ──
 *
 * A missing reading renders as "Unavailable" with a muted treatment, never as
 * 0 and never as an empty card. The spec is explicit about this, and the
 * reason is practical: a farmer who reads a fabricated 0% soil moisture will
 * irrigate a field that does not need it.
 */
'use client';

import {
  Activity,
  CloudRain,
  Droplets,
  Gauge,
  Minus,
  Thermometer,
  TrendingDown,
  TrendingUp,
  Wind,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SensorReading } from '@/lib/types';
import {
  classifySensor,
  formatSensorValue,
  getFreshness,
  hasValue,
  sensorStatusLabel,
  trendOf,
  type SensorStatus,
} from '@/lib/utils';
import styles from './SensorCard.module.css';

export interface SensorMetric {
  key: string;
  label: string;
  icon: LucideIcon;
  value: number | null;
  unit: string;
  status: SensorStatus;
  /** 0-1 position within the display band, for the base track. */
  fill: number | null;
  /** Free-text reading, used by rain density which is categorical. */
  text?: string;
  trend?: 'up' | 'down' | 'flat' | null;
}

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus } as const;

function ratio(value: number | null, min: number, max: number): number | null {
  if (!hasValue(value)) return null;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

/** Turn a reading plus its history into the metrics the grid renders. */
export function buildSensorMetrics(
  reading: SensorReading | null,
  history: SensorReading[] = [],
): SensorMetric[] {
  const r = reading;

  return [
    {
      key: 'soil_moisture',
      label: 'Soil moisture',
      icon: Droplets,
      value: r?.soil_moisture_percent ?? null,
      unit: '%',
      status: classifySensor('soil_moisture', r?.soil_moisture_percent),
      fill: ratio(r?.soil_moisture_percent ?? null, 0, 100),
      trend: trendOf(history, 'soil_moisture_percent'),
    },
    {
      key: 'temperature',
      label: 'Temperature',
      icon: Thermometer,
      value: r?.temperature_c ?? null,
      unit: ' °C',
      status: classifySensor('temperature', r?.temperature_c),
      fill: ratio(r?.temperature_c ?? null, 0, 50),
      trend: trendOf(history, 'temperature_c'),
    },
    {
      key: 'humidity',
      label: 'Humidity',
      icon: Wind,
      value: r?.humidity_percent ?? null,
      unit: '%',
      status: classifySensor('humidity', r?.humidity_percent),
      fill: ratio(r?.humidity_percent ?? null, 0, 100),
      trend: trendOf(history, 'humidity_percent'),
    },
    {
      key: 'pressure',
      label: 'Air pressure',
      icon: Gauge,
      value: r?.air_pressure_hpa ?? null,
      unit: ' hPa',
      status: classifySensor('pressure', r?.air_pressure_hpa),
      fill: ratio(r?.air_pressure_hpa ?? null, 950, 1060),
      trend: trendOf(history, 'air_pressure_hpa'),
    },
    {
      key: 'aqi',
      label: 'Air quality',
      icon: Activity,
      value: r?.aqi ?? null,
      unit: '',
      status: classifySensor('aqi', r?.aqi),
      fill: ratio(r?.aqi ?? null, 0, 300),
      trend: trendOf(history, 'aqi'),
    },
    {
      key: 'rain',
      label: 'Rain',
      icon: CloudRain,
      value: null,
      unit: '',
      // Rain density is a category from the device, not a number to classify.
      status: r?.rain_density ? 'normal' : 'unavailable',
      fill: null,
      text: r?.rain_density ? formatRainDensity(r.rain_density) : undefined,
    },
  ];
}

function formatRainDensity(value: string): string {
  const labels: Record<string, string> = {
    none: 'None',
    light: 'Light',
    moderate: 'Moderate',
    heavy: 'Heavy',
  };
  return labels[value.toLowerCase()] ?? value;
}

interface SensorCardProps {
  metric: SensorMetric;
  /** Timestamp of the reading, for the freshness line. */
  capturedAt: string | null;
}

export function SensorCard({ metric, capturedAt }: SensorCardProps) {
  const { icon: Icon, label, value, unit, status, fill, text, trend } = metric;
  const freshness = getFreshness(capturedAt);

  const unavailable = status === 'unavailable' && !text;
  const TrendIcon = trend && trend !== 'flat' ? TREND_ICON[trend] : null;

  const trackClass =
    status === 'low' ? styles.trackLow : status === 'high' ? styles.trackHigh : styles.trackNormal;

  return (
    <article className={styles.card}>
      <div className={styles.head}>
        <span className={styles.iconRing}>
          <Icon size={15} aria-hidden="true" />
        </span>
        <span className={styles.label}>{label}</span>
      </div>

      <div className={styles.valueRow}>
        {unavailable ? (
          <span className={styles.valueUnavailable}>Unavailable</span>
        ) : (
          <>
            <span className={styles.value}>{text ?? formatSensorValue(value, unit)}</span>
            {TrendIcon && trend && (
              <span
                className={`${styles.trend} ${trend === 'up' ? styles.trendUp : styles.trendDown}`}
              >
                <TrendIcon size={13} aria-hidden="true" />
                <span className="visually-hidden">
                  {trend === 'up' ? 'Rising' : 'Falling'} since the previous reading
                </span>
              </span>
            )}
          </>
        )}
      </div>

      <div className={styles.footRow}>
        {/* Status is stated in words, so it does not depend on the colour. */}
        {!unavailable && (
          <span
            className={`badge ${
              status === 'normal' ? 'badge-green' : status === 'high' ? 'badge-yellow' : 'badge-blue'
            }`}
          >
            {sensorStatusLabel(status)}
          </span>
        )}
        <span
          className={`${styles.freshness} ${
            freshness.status === 'stale' ? styles.freshnessStale : ''
          }`}
        >
          {unavailable ? 'No reading' : freshness.status === 'stale' ? 'May be old' : freshness.label}
        </span>
      </div>

      {fill !== null && !unavailable && (
        <div className={styles.track} aria-hidden="true">
          <div className={`${styles.trackFill} ${trackClass}`} style={{ width: `${fill * 100}%` }} />
        </div>
      )}
    </article>
  );
}

interface SensorGridProps {
  reading: SensorReading | null;
  history?: SensorReading[];
}

export function SensorGrid({ reading, history = [] }: SensorGridProps) {
  const metrics = buildSensorMetrics(reading, history);

  return (
    <div className={styles.grid}>
      {metrics.map((metric) => (
        <SensorCard key={metric.key} metric={metric} capturedAt={reading?.captured_at ?? null} />
      ))}
    </div>
  );
}
