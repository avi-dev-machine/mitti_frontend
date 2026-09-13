/* ── MITTI — Client UI state ──
 *
 * Only state the user owns lives here: which device they are looking at, and
 * whether the sidebar is collapsed. Server data belongs to TanStack Query, so
 * there is one source of truth for anything that came from the API.
 *
 * The selection is persisted so reopening the app returns to the field the
 * user was last looking at — an operator walking between plots should not have
 * to reselect every time.
 */
'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface UiState {
  /** device_id of the device in focus, or null for "all fields". */
  selectedDeviceId: string | null;
  sidebarCollapsed: boolean;

  selectDevice: (deviceId: string | null) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  /** Wipes user-specific client state. Called on sign-out. */
  clear: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      selectedDeviceId: null,
      sidebarCollapsed: false,

      selectDevice: (deviceId) => set({ selectedDeviceId: deviceId }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      clear: () => set({ selectedDeviceId: null }),
    }),
    {
      name: 'mitti.ui',
      storage: createJSONStorage(() => localStorage),
      // A device id is not sensitive, but nothing else here should be
      // persisted, so the allowed keys are listed explicitly.
      partialize: (state) => ({
        selectedDeviceId: state.selectedDeviceId,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  ),
);
