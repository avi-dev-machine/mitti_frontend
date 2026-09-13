/* ── MITTI — Field map panel ──
 *
 * Leaflet touches `window` at import time, so the map itself must never run on
 * the server. next/dynamic with ssr:false keeps it out of the server bundle
 * and gives the panel a real skeleton while the chunk loads.
 */
'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { MapPin, Satellite } from 'lucide-react';
import type { Device } from '@/lib/types';
import { getSeverityLabel, severityBadgeClass } from '@/lib/utils';
import type { MapLayer } from './FieldMap';
import { hasCoordinates } from './FieldMap.shared';
import styles from './FieldMap.module.css';

const FieldMap = dynamic(() => import('./FieldMap'), {
  ssr: false,
  loading: () => (
    <div className={styles.mapMessage} role="status" aria-live="polite">
      <span className="skeleton" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />
      <span style={{ position: 'relative' }}>Loading map…</span>
    </div>
  ),
});

interface MapPanelProps {
  devices: Device[];
  selectedDeviceId: string | null;
  onSelectDevice: (deviceId: string) => void;
  title?: string;
}

export default function MapPanel({
  devices,
  selectedDeviceId,
  onSelectDevice,
  title = 'Field location',
}: MapPanelProps) {
  const [layer, setLayer] = useState<MapLayer>('standard');

  const selected = useMemo(
    () => devices.find((d) => d.device_id === selectedDeviceId) ?? null,
    [devices, selectedDeviceId],
  );

  const selectedHasPosition = selected ? hasCoordinates(selected) : false;

  return (
    <section className={styles.panel} aria-label={title}>
      <header className={styles.panelHead}>
        <h2 className={styles.panelTitle}>
          <MapPin size={18} aria-hidden="true" />
          {title}
        </h2>

        {/* A radiogroup, not two toggles: exactly one layer is active. */}
        <div className={styles.layerSwitch} role="radiogroup" aria-label="Map layer">
          <button
            type="button"
            role="radio"
            aria-checked={layer === 'standard'}
            className={`${styles.layerButton} ${layer === 'standard' ? styles.layerButtonActive : ''}`}
            onClick={() => setLayer('standard')}
          >
            Map
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={layer === 'satellite'}
            className={`${styles.layerButton} ${layer === 'satellite' ? styles.layerButtonActive : ''}`}
            onClick={() => setLayer('satellite')}
          >
            <Satellite size={14} aria-hidden="true" style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} />
            Satellite
          </button>
        </div>
      </header>

      <div className={styles.mapArea}>
        <FieldMap
          devices={devices}
          selectedDeviceId={selectedDeviceId}
          onSelectDevice={onSelectDevice}
          layer={layer}
        />
      </div>

      <footer className={styles.panelFoot}>
        <div className={styles.footBody}>
          {selected ? (
            <>
              <p className={styles.footName}>
                {selected.device_name}
                <span className={severityBadgeClass(selected.alert_severity)}>
                  {getSeverityLabel(selected.alert_severity)}
                </span>
                {selected.is_demo && <span className="badge badge-blue">Demo data</span>}
              </p>
              <p className={styles.coords}>
                {selectedHasPosition
                  ? `${selected.latitude.toFixed(6)}, ${selected.longitude.toFixed(6)}`
                  : 'This device has not reported a location.'}
              </p>
            </>
          ) : (
            <p className={styles.coords}>Select a device to see its exact location.</p>
          )}
        </div>

        {selected && (
          <Link href={`/devices/${encodeURIComponent(selected.device_id)}`} className={styles.footLink}>
            View device details
          </Link>
        )}
      </footer>
    </section>
  );
}
