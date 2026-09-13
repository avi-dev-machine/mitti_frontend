/* ── MITTI — Sensors ──
 *
 * Current readings plus trends over 24 hours, 7 days or 30 days.
 *
 * Charts are drawn only from rows the backend actually returned. Gaps stay
 * gaps: `connectNulls` is off, so a period when the device was offline shows
 * as a break in the line rather than a straight segment implying readings that
 * were never taken.
 */
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Gauge, Radio } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { SensorGrid } from '@/components/monitoring/SensorCard';
import { EmptyState, ErrorState, LoadingAnnouncement, SkeletonBlock } from '@/components/ui/states';
import { useDeviceSummary, useDevices, useSensorHistory } from '@/lib/hooks/useDevices';
import { useUiStore } from '@/lib/store';
import { ApiError } from '@/lib/api';
import type { SensorReading, TimeRange } from '@/lib/types';
import { formatDateTime, getFreshness } from '@/lib/utils';
import styles from './sensors.module.css';

const RANGES: Array<{ id: TimeRange; label: string }> = [
  { id: '24h', label: '24 hours' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
];

interface ChartSpec {
  key: keyof SensorReading;
  title: string;
  unit: string;
  colour: string;
  decimals: number;
}

const CHARTS: ChartSpec[] = [
  { key: 'soil_moisture_percent', title: 'Soil moisture', unit: '%', colour: '#795548', decimals: 1 },
  { key: 'temperature_c', title: 'Temperature', unit: '°C', colour: '#EF6C00', decimals: 1 },
  { key: 'humidity_percent', title: 'Humidity', unit: '%', colour: '#1565C0', decimals: 1 },
  { key: 'air_pressure_hpa', title: 'Air pressure', unit: 'hPa', colour: '#2E7D32', decimals: 0 },
];

/** Axis ticks: clock time over a day, date over longer spans. */
function tickFormatter(range: TimeRange) {
  return (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return range === '24h'
      ? date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };
}

function ChartTooltip({
  active,
  payload,
  unit,
  decimals,
}: {
  active?: boolean;
  payload?: Array<{ payload: { captured_at: string; value: number | null } }>;
  unit: string;
  decimals: number;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  if (point.value === null || point.value === undefined) return null;

  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipTime}>{formatDateTime(point.captured_at)}</p>
      <p className={styles.tooltipValue}>
        {point.value.toFixed(decimals)} {unit}
      </p>
    </div>
  );
}

function TrendChart({
  spec,
  readings,
  range,
}: {
  spec: ChartSpec;
  readings: SensorReading[];
  range: TimeRange;
}) {
  const data = useMemo(
    () =>
      readings.map((r) => {
        const raw = r[spec.key];
        return {
          captured_at: r.captured_at,
          value: typeof raw === 'number' && !Number.isNaN(raw) ? raw : null,
        };
      }),
    [readings, spec.key],
  );

  const points = data.filter((d) => d.value !== null);
  const latest = points.length > 0 ? points[points.length - 1].value : null;
  const gradientId = `mitti-grad-${String(spec.key)}`;

  return (
    <section className={styles.chartCard}>
      <header className={styles.chartHead}>
        <h3 className={styles.chartTitle}>{spec.title}</h3>
        <span className={styles.chartUnit}>{spec.unit}</span>
        {latest !== null && (
          <span className={styles.chartLatest} style={{ color: spec.colour }}>
            {latest.toFixed(spec.decimals)}
            <span className={styles.chartUnit}> {spec.unit}</span>
          </span>
        )}
      </header>

      {points.length < 2 ? (
        <p className={styles.chartEmpty}>
          Not enough readings in this time range to draw a trend.
        </p>
      ) : (
        <div className={styles.chartArea}>
          {/* The table below is the accessible equivalent of the chart. */}
          <span className="visually-hidden">
            {spec.title} over the selected range. Latest value{' '}
            {latest?.toFixed(spec.decimals)} {spec.unit} from {points.length} readings.
          </span>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 6, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={spec.colour} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={spec.colour} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border-subtle)" vertical={false} />
              <XAxis
                dataKey="captured_at"
                tickFormatter={tickFormatter(range)}
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                axisLine={false}
                tickLine={false}
                minTickGap={28}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                axisLine={false}
                tickLine={false}
                width={44}
                domain={['auto', 'auto']}
              />
              <Tooltip
                content={<ChartTooltip unit={spec.unit} decimals={spec.decimals} />}
                cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={spec.colour}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                // Off on purpose: a gap means the device sent nothing.
                connectNulls={false}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--bg-surface)' }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

export function SensorsView() {
  const selectedDeviceId = useUiStore((s) => s.selectedDeviceId);
  const [range, setRange] = useState<TimeRange>('24h');

  const devicesQuery = useDevices();
  const summaryQuery = useDeviceSummary(selectedDeviceId);
  const historyQuery = useSensorHistory(selectedDeviceId, range);

  const devices = devicesQuery.data ?? [];
  const device = summaryQuery.data?.device ?? null;
  const reading = summaryQuery.data?.latest_sensor ?? null;
  const readings = historyQuery.data?.readings ?? [];
  const freshness = getFreshness(reading?.captured_at ?? null);

  if (!devicesQuery.isLoading && devices.length === 0) {
    return (
      <AppShell>
        <div className={styles.page}>
          <h1 className={styles.title}>Sensors</h1>
          <EmptyState
            icon={Radio}
            title="No device linked yet"
            description="Sensor readings appear here once a MITTI unit is linked to your account."
            action={
              <Link href="/scan" className="btn btn-primary">
                Add a device
              </Link>
            }
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className={styles.page}>
        <header className={styles.head}>
          <div>
            <h1 className={styles.title}>Sensors</h1>
            <p className={`${styles.lead} ${freshness.status === 'stale' ? styles.leadStale : ''}`}>
              {device ? `${device.device_name} · ` : ''}
              {reading ? freshness.label : 'No readings yet'}
            </p>
          </div>

          <div className={styles.ranges} role="radiogroup" aria-label="Time range">
            {RANGES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={range === id}
                className={`${styles.rangeButton} ${range === id ? styles.rangeButtonActive : ''}`}
                onClick={() => setRange(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        <section className={styles.section} aria-label="Current readings">
          <h2 className={styles.sectionTitle}>
            <Gauge size={18} aria-hidden="true" />
            Current readings
          </h2>

          {summaryQuery.isLoading ? (
            <>
              <LoadingAnnouncement label="Loading sensor readings" />
              <SkeletonBlock height={128} />
            </>
          ) : summaryQuery.error ? (
            <ErrorState
              description={
                summaryQuery.error instanceof ApiError
                  ? summaryQuery.error.friendlyMessage
                  : undefined
              }
              onRetry={() => void summaryQuery.refetch()}
            />
          ) : (
            <SensorGrid reading={reading} history={readings} />
          )}
        </section>

        <section className={styles.section} aria-label="Trends">
          <h2 className={styles.sectionTitle}>Trends over the last {range === '24h' ? '24 hours' : range === '7d' ? '7 days' : '30 days'}</h2>

          {historyQuery.isLoading ? (
            <div className={styles.charts}>
              <LoadingAnnouncement label="Loading sensor history" />
              {CHARTS.map((c) => (
                <SkeletonBlock key={String(c.key)} height={248} />
              ))}
            </div>
          ) : historyQuery.error ? (
            <ErrorState
              description={
                historyQuery.error instanceof ApiError
                  ? historyQuery.error.friendlyMessage
                  : undefined
              }
              onRetry={() => void historyQuery.refetch()}
            />
          ) : readings.length === 0 ? (
            <EmptyState
              inline
              icon={Gauge}
              title="No history is available for this time range."
              description="Try a longer range, or check back once the device has synced again."
            />
          ) : (
            <div className={styles.charts}>
              {CHARTS.map((spec) => (
                <TrendChart key={String(spec.key)} spec={spec} readings={readings} range={range} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
