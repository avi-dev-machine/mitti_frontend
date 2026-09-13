/* ── MITTI — Field map ──
 *
 * Real Leaflet, real tiles, real coordinates from the database. Devices
 * without coordinates are excluded rather than given a plausible-looking
 * position — the spec forbids implying a location MITTI does not know.
 *
 * Tile sources come from the environment so a deployment can point at its own
 * provider. Defaults are OpenStreetMap for the standard layer and Esri World
 * Imagery for satellite; both permit this use with the attribution shown.
 */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Device } from '@/lib/types';
import { getSeverityLabel } from '@/lib/utils';
import { hasCoordinates } from './FieldMap.shared';
import styles from './FieldMap.module.css';

export type MapLayer = 'standard' | 'satellite';

const SEVERITY_COLOUR: Record<string, string> = {
  green: '#2E7D32',
  yellow: '#F9A825',
  orange: '#EF6C00',
  red: '#C62828',
  grey: '#5F6B64',
};

const TILES = {
  standard: {
    url:
      process.env.NEXT_PUBLIC_MAP_TILE_URL ||
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ||
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  satellite: {
    url:
      process.env.NEXT_PUBLIC_MAP_SATELLITE_URL ||
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      process.env.NEXT_PUBLIC_MAP_SATELLITE_ATTRIBUTION ||
      'Imagery &copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
} as const;

/** A coloured pin built from a div, so the status colour is data-driven and
 *  no marker image has to be fetched. */
function buildIcon(severity: string, selected: boolean): L.DivIcon {
  const colour = SEVERITY_COLOUR[severity] ?? SEVERITY_COLOUR.grey;
  const size = selected ? 28 : 22;
  return L.divIcon({
    className: '',
    html: `<span class="${styles.markerPin} ${selected ? styles.markerSelected : ''}" style="background:${colour}"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2)],
  });
}

/** Keeps the viewport in step with the selection without fighting the user:
 *  it recentres when the selected device changes, not on every render. */
function ViewController({
  devices,
  selectedDeviceId,
}: {
  devices: Device[];
  selectedDeviceId: string | null;
}) {
  const map = useMap();
  const lastSelection = useRef<string | null>(null);
  const hasFitted = useRef(false);

  useEffect(() => {
    const located = devices.filter(hasCoordinates);
    if (located.length === 0) return;

    const selected = located.find((d) => d.device_id === selectedDeviceId);

    if (selected && lastSelection.current !== selected.device_id) {
      lastSelection.current = selected.device_id;
      map.flyTo([selected.latitude, selected.longitude], Math.max(map.getZoom(), 14), {
        duration: 0.75,
      });
      return;
    }

    // First paint with no selection: frame every device that has a position.
    if (!hasFitted.current && !selected) {
      hasFitted.current = true;
      if (located.length === 1) {
        map.setView([located[0].latitude, located[0].longitude], 14);
      } else {
        map.fitBounds(
          L.latLngBounds(located.map((d) => [d.latitude, d.longitude] as [number, number])),
          { padding: [48, 48], maxZoom: 15 },
        );
      }
    }
  }, [devices, selectedDeviceId, map]);

  return null;
}

interface FieldMapProps {
  devices: Device[];
  selectedDeviceId: string | null;
  onSelectDevice: (deviceId: string) => void;
  layer: MapLayer;
  /** Called when tiles fail, so the panel can offer the standard layer. */
  onTileError?: () => void;
}

export default function FieldMap({
  devices,
  selectedDeviceId,
  onSelectDevice,
  layer,
  onTileError,
}: FieldMapProps) {
  const located = useMemo(() => devices.filter(hasCoordinates), [devices]);

  // Remember which layer failed, not merely that one did: switching back to a
  // working layer then clears the warning by derivation, with no reset effect.
  const [failedLayer, setFailedLayer] = useState<MapLayer | null>(null);
  const tileFailed = failedLayer === layer;

  if (located.length === 0) {
    return (
      <p className={styles.mapMessage}>
        No device on this account has reported a location yet. A map will appear here once
        one does.
      </p>
    );
  }

  const first = located[0];
  const tiles = TILES[layer];

  return (
    <>
      <MapContainer
        center={[first.latitude, first.longitude]}
        zoom={13}
        className={styles.map}
        // Wheel-zoom without a modifier hijacks page scrolling on a laptop.
        scrollWheelZoom={false}
        // Leaflet's own attribution prefix duplicates our provider credit.
        attributionControl
      >
        <ViewController devices={located} selectedDeviceId={selectedDeviceId} />

        <TileLayer
          key={layer}
          url={tiles.url}
          attribution={tiles.attribution}
          maxZoom={tiles.maxZoom}
          eventHandlers={{
            tileerror: () => {
              setFailedLayer(layer);
              onTileError?.();
            },
          }}
        />

        {located.map((device) => {
          const selected = device.device_id === selectedDeviceId;
          const severity = device.alert_severity ?? 'grey';

          return (
            <Marker
              key={device.device_id}
              position={[device.latitude, device.longitude]}
              icon={buildIcon(severity, selected)}
              // Markers are focusable and respond to Enter, so the map is
              // navigable without a pointer.
              keyboard
              alt={`${device.device_name}, ${getSeverityLabel(severity)}`}
              eventHandlers={{ click: () => onSelectDevice(device.device_id) }}
            >
              <Popup>
                <div className={styles.popup}>
                  <p className={styles.popupName}>{device.device_name}</p>
                  <p className={styles.popupMeta}>
                    {device.field_name || 'Field not named'}
                    {device.crop ? ` · ${device.crop}` : ''}
                  </p>
                  <span className={`badge badge-${severity}`}>
                    {getSeverityLabel(severity)}
                  </span>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {tileFailed && layer === 'satellite' && (
        <p className={styles.mapNotice} role="status">
          Satellite imagery is unavailable right now. Switch to the standard map.
        </p>
      )}
    </>
  );
}
