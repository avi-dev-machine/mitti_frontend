/* ── MITTI — Dashboard ──
 *
 * Rewritten to fetch directly from Supabase for DEV-FARM_NODE, bypassing the 
 * proxy API to ensure direct realtime connection and minimal failure points.
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ChevronRight,
  Gauge,
  Radio,
  ScanLine,
  Wheat,
  MapPin,
  Satellite
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import dynamic from 'next/dynamic';
import AppShell from '@/components/AppShell';
import { SensorGrid } from '@/components/monitoring/SensorCard';
import { EmptyState, ErrorState, LoadingAnnouncement } from '@/components/ui/states';
import { useSession } from '@/components/providers/SessionProvider';
import { createClient } from '@/lib/supabase/client';
import type { SeverityLevel } from '@/lib/types';
import { formatToday, getSeverityLabel, greeting, timeAgo } from '@/lib/utils';
import styles from './dashboard.module.css';

const FieldMap = dynamic(() => import('@/components/FieldMap'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-xl)' }}>
      <span>Loading map…</span>
    </div>
  ),
});

const DEVICE_ID = 'DEV-FARM_NODE';

export function DashboardView() {
  const { displayName } = useSession();
  const [device, setDevice] = useState<any>(null);
  const [reading, setReading] = useState<any>(null);
  const [advisory, setAdvisory] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadDashboard() {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch Device
        const { data: d, error: e1 } = await supabase
          .from('devices')
          .select('device_name, connection_status, last_sync_at, alert_severity, is_demo, field_name, crop')
          .eq('device_id', DEVICE_ID)
          .single();
        
        if (e1 && e1.code !== 'PGRST116') throw e1;
        if (d) {
          setDevice({ ...d, device_id: DEVICE_ID });
        }

        // Fetch Latest Reading
        const { data: r, error: e2 } = await supabase
          .from('sensor_readings')
          .select('soil_moisture_percent, temperature_c, humidity_percent, air_pressure_hpa, aqi, rain_density, captured_at, latitude, longitude')
          .eq('device_id', DEVICE_ID)
          .order('captured_at', { ascending: false })
          .limit(1)
          .maybeSingle(); // maybeSingle doesn't throw PGRST116
        
        if (e2) throw e2;
        setReading(r || null);

        // Fetch Advisory & Image
        const { data: a, error: e3 } = await supabase
          .from('image_metadata')
          .select('image_url, analysis_summary, captured_at')
          .eq('device_id', DEVICE_ID)
          .order('captured_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (e3) throw e3;
        setAdvisory(a || null);
        
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load dashboard data.');
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
    
    // Realtime subscription for sensor_readings
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_readings', filter: `device_id=eq.${DEVICE_ID}` }, (payload: any) => {
        setReading(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  if (isLoading) {
    return (
      <AppShell>
        <div className={styles.page}>
          <LoadingAnnouncement label="Loading your field data" />
          <span className={`skeleton ${styles.skeletonHero}`} aria-hidden="true" />
          <div className={styles.skeletonGrid} aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className={`skeleton ${styles.skeletonCard}`} />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className={styles.page}>
          <ErrorState title="Could not load dashboard" description={error} onRetry={() => window.location.reload()} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className={styles.page}>
        <header className={styles.welcome}>
          <div>
            <h1 className={styles.greeting}>
              {greeting()}, {displayName}
            </h1>
            <p className={styles.greetingLead}>
              Here is the latest from your field.
            </p>
          </div>
          <p className={styles.today}>{formatToday()}</p>
        </header>

        {!device ? (
          <EmptyState
            icon={Radio}
            title="Farm Node Not Found"
            description="We could not find the device DEV-FARM_NODE in your account."
          />
        ) : (
          <>
            <HeroSection device={device} />

            <section className={styles.section} aria-label="Sensor readings">
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>
                  <Gauge size={18} aria-hidden="true" />
                  Latest readings
                </h2>
              </div>
              {reading ? (
                <SensorGrid reading={reading as any} />
              ) : (
                <EmptyState
                  inline
                  icon={Gauge}
                  title="No sensor readings yet"
                  description="This device has not uploaded any measurements."
                />
              )}
            </section>

            <div className={styles.split}>
              <MapSection reading={reading} device={device} />
              <AdvisorySection advisory={advisory} />
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function HeroSection({ device }: { device: any }) {
  const severity = (device.alert_severity ?? 'grey') as SeverityLevel;

  return (
    <section className={styles.hero} aria-label="Selected device">
      <span className={styles.heroGlow} aria-hidden="true" />

      <div className={styles.heroTop}>
        <div className={styles.heroIdentity}>
          <p className={styles.heroEyebrow}>
            <Radio size={12} aria-hidden="true" />
            {device.device_id}
            {device.is_demo && <span className={styles.demoPill}>Demo data</span>}
          </p>
          <h2 className={styles.heroName}>{device.device_name || 'FARM NODE'}</h2>
        </div>

        <span className={styles.heroStatus}>
          <span className={`severity-dot ${severity}`} aria-hidden="true" />
          {getSeverityLabel(severity)}
        </span>
      </div>

      <div className={styles.heroFacts}>
        <div>
          <p className={styles.heroFactLabel}>Connection</p>
          <p className={styles.heroFactValue} style={{ textTransform: 'capitalize' }}>
            {device.connection_status || 'Offline'}
          </p>
        </div>
        <div>
          <p className={styles.heroFactLabel}>Last sync</p>
          <p className={styles.heroFactValue}>{timeAgo(device.last_sync_at)}</p>
        </div>
      </div>
    </section>
  );
}

function MapSection({ reading, device }: { reading: any, device: any }) {
  const [layer, setLayer] = useState<'standard' | 'satellite'>('satellite');
  
  const mapDevice = {
    ...device,
    latitude: reading?.latitude,
    longitude: reading?.longitude,
  };

  return (
    <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }} aria-label="Field location">
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
          <MapPin size={18} aria-hidden="true" />
          Your fields
        </h2>
        <div style={{ display: 'flex', gap: 'var(--space-2xs)' }} role="radiogroup" aria-label="Map layer">
          <button
            type="button"
            role="radio"
            aria-checked={layer === 'standard'}
            className={`btn btn-secondary ${layer === 'standard' ? 'active' : ''}`}
            onClick={() => setLayer('standard')}
          >
            Map
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={layer === 'satellite'}
            className={`btn btn-secondary ${layer === 'satellite' ? 'active' : ''}`}
            onClick={() => setLayer('satellite')}
          >
            <Satellite size={14} aria-hidden="true" style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} />
            Satellite
          </button>
        </div>
      </header>

      <div style={{ position: 'relative', height: 320, borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
        {reading?.latitude && reading?.longitude ? (
          <FieldMap
            devices={[mapDevice]}
            selectedDeviceId={device.device_id}
            onSelectDevice={() => {}}
            layer={layer}
          />
        ) : (
          <EmptyState
            inline
            icon={MapPin}
            title="Location unavailable"
            description="No GPS coordinates received from the device."
          />
        )}
      </div>
      
      {reading?.latitude && reading?.longitude && (
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: 0, padding: '0 var(--space-sm)' }}>
          {reading.latitude.toFixed(6)}, {reading.longitude.toFixed(6)}
        </p>
      )}
    </section>
  );
}

function AdvisorySection({ advisory }: { advisory: any }) {
  return (
    <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }} aria-label="Latest advisory">
      <header>
        <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
          <Wheat size={18} aria-hidden="true" />
          Crop Health & Advisories
        </h2>
      </header>

      {advisory ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {advisory.image_url && (
            <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={advisory.image_url} alt="Crop Analysis" style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>
          )}
          
          {advisory.analysis_summary && (
            <div style={{ color: 'var(--color-text)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
              <ReactMarkdown>{advisory.analysis_summary}</ReactMarkdown>
            </div>
          )}
          
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            Captured {timeAgo(advisory.captured_at)}
          </div>
        </div>
      ) : (
        <EmptyState
          inline
          icon={Wheat}
          title="No advisory available"
          description="Analysis will appear here once an assessment is completed."
        />
      )}
    </section>
  );
}
