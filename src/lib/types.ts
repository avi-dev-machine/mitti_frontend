/* ── MITTI PWA TypeScript Types ── */

export interface Device {
  id: string;
  device_id: string;
  device_name: string;
  field_name: string;
  crop: string;
  latitude: number;
  longitude: number;
  owner_id: string | null;
  connection_status: 'live' | 'synced' | 'cached' | 'offline';
  alert_severity: 'green' | 'yellow' | 'orange' | 'red' | 'grey';
  last_sync_at: string;
  created_at: string;
  updated_at: string;
}

export interface DeviceHealth {
  id: string;
  device_id: string;
  raspberry_pi_status: string;
  esp32_status: string;
  camera_status: string;
  vision_model_status: string;
  qwen_model_status: string;
  database_status: string;
  lora_status: string;
  relay_status: string;
  cloud_sync_status: string;
  overall_status: 'healthy' | 'warning' | 'critical' | 'offline';
  last_checked_at: string;
  created_at: string;
}

export interface SensorReading {
  id: string;
  device_id: string;
  captured_at: string;
  soil_moisture_percent: number;
  temperature_c: number;
  humidity_percent: number;
  air_pressure_hpa: number;
  aqi: number;
  rain_density: string;
  latitude: number;
  longitude: number;
  sensor_health: string;
  created_at: string;
}

export interface Advisory {
  id: string;
  device_id: string;
  assessment_id: string;
  created_at: string;
  source: 'qwen_validated' | 'fallback';
  severity: 'green' | 'yellow' | 'orange' | 'red';
  confidence: number;
  primary_problem: string;
  summary: string;
  evidence_used: string[];
  step_by_step_guidance: string[];
  recheck_plan: string;
  uncertainty_note: string;
  escalation_note: string;
}

export interface SyncStatus {
  id: string;
  device_id: string;
  last_upload_at: string;
  pending_records: number;
  last_error: string | null;
  status: 'synced' | 'pending' | 'error';
  created_at: string;
  updated_at: string;
}

export interface RelayEvent {
  id: string;
  device_id: string;
  event_type: string;
  triggered_at: string;
  duration_seconds: number;
  reason: string;
  created_at: string;
}

export interface DeviceSummary {
  device: Device;
  health: DeviceHealth | null;
  latest_sensor: SensorReading | null;
  latest_advisory: Advisory | null;
  sync_status: SyncStatus | null;
}

export type SeverityLevel = 'green' | 'yellow' | 'orange' | 'red' | 'grey';
export type TimeRange = '24h' | '7d' | '30d';
