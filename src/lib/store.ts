/* ── MITTI PWA — Zustand Device Store ── */
import { create } from 'zustand';
import type { Device, DeviceSummary } from './types';
import { api } from './api';

interface DeviceState {
  devices: Device[];
  selectedDevice: Device | null;
  selectedSummary: DeviceSummary | null;
  loading: boolean;
  error: string | null;

  fetchDevices: () => Promise<void>;
  selectDevice: (deviceId: string) => Promise<void>;
  clearSelection: () => void;
}

export const useDeviceStore = create<DeviceState>((set) => ({
  devices: [],
  selectedDevice: null,
  selectedSummary: null,
  loading: false,
  error: null,

  fetchDevices: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.getDevices();
      set({ devices: data.devices, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  selectDevice: async (deviceId: string) => {
    set({ loading: true, error: null });
    try {
      const summary = await api.getDeviceSummary(deviceId);
      set({
        selectedDevice: summary.device,
        selectedSummary: summary,
        loading: false,
      });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  clearSelection: () => {
    set({ selectedDevice: null, selectedSummary: null });
  },
}));

interface AuthState {
  isAuthenticated: boolean;
  user: any | null;
  token: string | null;
  setAuth: (user: any, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  token: null,
  setAuth: (user, token) => set({ isAuthenticated: true, user, token }),
  logout: () => set({ isAuthenticated: false, user: null, token: null }),
}));

