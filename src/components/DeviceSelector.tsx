/* ── MITTI — Device selector ──
 *
 * Which field the app is showing. Selection is remembered between visits, and
 * the first device is chosen automatically the first time so the dashboard is
 * never blank for a user who does have devices.
 *
 * Keyboard: Escape closes, and focus returns to the trigger. Options are real
 * buttons in a menu, so Tab and Enter behave as expected without extra code.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Radio } from 'lucide-react';
import { useUiStore } from '@/lib/store';
import { getSeverityLabel } from '@/lib/utils';
import type { Device } from '@/lib/types';
import styles from './DeviceSelector.module.css';

interface DeviceSelectorProps {
  devices: Device[];
  isLoading?: boolean;
}

export function DeviceSelector({ devices, isLoading = false }: DeviceSelectorProps) {
  const selectedDeviceId = useUiStore((s) => s.selectedDeviceId);
  const selectDevice = useUiStore((s) => s.selectDevice);

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected = devices.find((d) => d.device_id === selectedDeviceId) ?? null;

  // Pick a device the first time, and recover if the remembered one is gone
  // (unlinked, or belonged to a different account on this browser).
  useEffect(() => {
    if (devices.length === 0) return;
    const stillExists = devices.some((d) => d.device_id === selectedDeviceId);
    if (!stillExists) selectDevice(devices[0].device_id);
  }, [devices, selectedDeviceId, selectDevice]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (isLoading) {
    return <span className="skeleton" style={{ width: 180, height: 40, borderRadius: 10 }} />;
  }

  if (devices.length === 0) return null;

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Radio size={16} className={styles.triggerIcon} aria-hidden="true" />
        <span className={styles.triggerLabel}>
          {selected ? selected.device_name : 'Select a device'}
        </span>
        <ChevronDown size={15} className={styles.triggerIcon} aria-hidden="true" />
      </button>

      {open && (
        <div className={styles.menu} role="menu" aria-label="Choose a device">
          <p className={styles.menuLabel}>Your devices</p>

          {devices.map((device) => {
            const isActive = device.device_id === selectedDeviceId;
            const severity = device.alert_severity ?? 'grey';
            return (
              <button
                key={device.device_id}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                className={`${styles.option} ${isActive ? styles.optionActive : ''}`}
                onClick={() => {
                  selectDevice(device.device_id);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
              >
                <span className={`severity-dot ${severity} ${styles.optionDot}`} aria-hidden="true" />
                <span className={styles.optionBody}>
                  <span className={styles.optionName}>
                    <span className={styles.optionNameText}>{device.device_name}</span>
                    {device.is_demo && <span className={styles.demoTag}>Demo</span>}
                  </span>
                  <span className={styles.optionMeta}>
                    {device.field_name || 'Field not named'}
                    {device.crop ? ` · ${device.crop}` : ''} · {getSeverityLabel(severity)}
                  </span>
                </span>
                {isActive && <Check size={16} className={styles.optionCheck} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
