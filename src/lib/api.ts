/* ── MITTI PWA — API Client ── */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    cache: 'no-store',
    ...options,
  });

  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export const api = {
  // Devices
  getDevices: () => apiFetch<{ devices: import('./types').Device[]; count: number }>('/api/devices'),
  getDevice: (id: string) => apiFetch<import('./types').Device>(`/api/devices/${id}`),
  async getDeviceSummary(deviceId: string) {
    return apiFetch<import('./types').DeviceSummary>(`/api/devices/${deviceId}/summary`);
  },

  async getAllDeviceSummaries() {
    return apiFetch<Record<string, import('./types').DeviceSummary>>(`/api/devices/summary/all`);
  },

  // Auth endpoints
  async sendOtp(phone: string) {
    return apiFetch<{ status: string, message: string }>(`/api/auth/send-otp`, {
      method: 'POST',
      body: JSON.stringify({ phone })
    });
  },

  async verifyOtp(phone: string, otp: string) {
    return apiFetch<{ status: string, token: string, user: any }>(`/api/auth/verify-otp`, {
      method: 'POST',
      body: JSON.stringify({ phone, otp })
    });
  },
  validateDevice: (id: string) => apiFetch<{ valid: boolean; device?: import('./types').Device; message?: string }>(`/api/devices/validate/${id}`),

  // Sensors
  getLatestSensors: (deviceId: string) => apiFetch<{ sensor: import('./types').SensorReading | null }>(`/api/sensors/latest/${deviceId}`),
  getSensorHistory: (deviceId: string, range: string = '24h') =>
    apiFetch<{ readings: import('./types').SensorReading[]; count: number }>(`/api/sensors/history/${deviceId}?range=${range}`),

  // Advisories
  getLatestAdvisory: (deviceId: string) => apiFetch<{ advisory: import('./types').Advisory | null }>(`/api/advisories/latest/${deviceId}`),
  getAdvisoryHistory: (deviceId: string, limit = 20, offset = 0) =>
    apiFetch<{ advisories: import('./types').Advisory[]; count: number }>(`/api/advisories/history/${deviceId}?limit=${limit}&offset=${offset}`),

  // Device Health
  getDeviceHealth: (deviceId: string) => apiFetch<{ health: import('./types').DeviceHealth | null }>(`/api/device-health/${deviceId}`),

  // History
  getEventHistory: (deviceId: string) => apiFetch<{
    relay_events?: import('./types').RelayEvent[];
    lora_events?: unknown[];
    sync_status?: import('./types').SyncStatus[];
  }>(`/api/history/events/${deviceId}`),
};
