'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { Device } from '@/lib/types';
import styles from './FieldMap.module.css';

// Fix Leaflet's default icon path issues in Next.js
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to dynamically set map center when selected device changes
function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 15, { animate: true });
  }, [center, map]);
  return null;
}

export default function FieldMap({
  devices,
  selectedDeviceId,
  onSelectDevice
}: {
  devices: Device[];
  selectedDeviceId: string | null;
  onSelectDevice: (id: string) => void;
}) {
  const [center, setCenter] = useState<[number, number]>([22.5726, 88.3639]); // Default Kolkata

  useEffect(() => {
    if (selectedDeviceId) {
      const dev = devices.find(d => d.device_id === selectedDeviceId);
      if (dev?.latitude && dev?.longitude) {
        setCenter([dev.latitude, dev.longitude]);
      }
    } else if (devices.length > 0) {
      // Default to first device
      const dev = devices[0];
      if (dev?.latitude && dev?.longitude) {
        setCenter([dev.latitude, dev.longitude]);
      }
    }
  }, [selectedDeviceId, devices]);

  const weatherApiKey = process.env.NEXT_PUBLIC_WEATHER_API_KEY;
  const nasaToken = process.env.NEXT_PUBLIC_NASA_EARTHDATA_TOKEN;

  // NASA GIBS (Global Imagery Browse Services) True Color
  const nasaSatelliteUrl = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/current/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;

  return (
    <div className={styles.mapContainer}>
      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom={false}
        className={styles.map}
      >
        <MapController center={center} />
        
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Standard Map">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          
          <LayersControl.BaseLayer name="NASA Satellite (GIBS)">
            <TileLayer
              attribution='Imagery provided by services from the Global Imagery Browse Services (GIBS), operated by the NASA/GSFC/Earth Science Data and Information System'
              url={nasaSatelliteUrl}
              maxNativeZoom={9}
              maxZoom={18}
            />
          </LayersControl.BaseLayer>

          {weatherApiKey && (
            <LayersControl.Overlay name="Weather (Clouds)">
              <TileLayer
                attribution="Weather data © OpenWeatherMap"
                url={`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${weatherApiKey}`}
              />
            </LayersControl.Overlay>
          )}
          
          {weatherApiKey && (
            <LayersControl.Overlay name="Weather (Precipitation)">
              <TileLayer
                attribution="Weather data © OpenWeatherMap"
                url={`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${weatherApiKey}`}
              />
            </LayersControl.Overlay>
          )}
        </LayersControl>

        {devices.map(device => {
          if (!device.latitude || !device.longitude) return null;
          const isSelected = device.device_id === selectedDeviceId;
          
          return (
            <Marker
              key={device.device_id}
              position={[device.latitude, device.longitude]}
              icon={customIcon}
              eventHandlers={{
                click: () => onSelectDevice(device.device_id),
              }}
            >
              <Popup>
                <div className={styles.popupContent}>
                  <strong>{device.device_name}</strong>
                  <br />
                  <span>{device.field_name} • {device.crop}</span>
                  <br />
                  <span className={`badge badge-${device.alert_severity || 'grey'}`} style={{ marginTop: '4px', display: 'inline-block' }}>
                    Status: {device.connection_status}
                  </span>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
