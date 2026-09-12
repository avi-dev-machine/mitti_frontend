'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { useDeviceStore } from '@/lib/store';
import styles from './scan.module.css';

type ScanState = 'ready' | 'scanning' | 'detected' | 'success' | 'not_found' | 'unsupported' | 'error';

export default function ScanPage() {
  const router = useRouter();
  const { selectDevice } = useDeviceStore();
  const [state, setState] = useState<ScanState>('ready');
  const [manualId, setManualId] = useState('');
  const [message, setMessage] = useState('');
  const [showManual, setShowManual] = useState(false);

  async function startNfcScan() {
    if (!('NDEFReader' in window)) {
      setState('unsupported');
      setMessage('NFC is not supported in this browser. Enter the device ID manually.');
      setShowManual(true);
      return;
    }

    setState('scanning');
    setMessage('Hold your phone near the NFC tag on your MITTI device...');

    try {
      const ndef = new (window as unknown as { NDEFReader: new () => { scan: () => Promise<void>; onreading: ((event: { message: { records: { data: ArrayBuffer }[] } }) => void) | null } }).NDEFReader();
      await ndef.scan();
      ndef.onreading = (event) => {
        const record = event.message.records[0];
        const decoder = new TextDecoder();
        const deviceId = decoder.decode(record.data);
        handleDeviceId(deviceId);
      };
    } catch (err) {
      setState('error');
      setMessage('Failed to start NFC scan. Please try manual entry.');
      setShowManual(true);
    }
  }

  async function handleDeviceId(deviceId: string) {
    setState('detected');
    setMessage(`Device detected: ${deviceId}`);

    try {
      const result = await api.validateDevice(deviceId);
      if (result.valid) {
        setState('success');
        setMessage(`✅ Device found: ${result.device?.device_name}`);
        await selectDevice(deviceId);
        setTimeout(() => router.push(`/devices/${deviceId}`), 1500);
      } else {
        setState('not_found');
        setMessage(result.message || 'This device is not linked to your account.');
      }
    } catch (err) {
      setState('error');
      setMessage('Failed to validate device. Please try again.');
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualId.trim()) return;
    await handleDeviceId(manualId.trim().toUpperCase());
  }

  return (
    <AppShell>
      <div className={styles.page}>
        <button onClick={() => router.back()} className={styles.backBtn}>← Back</button>

        <div className={styles.scanContainer}>
          <h1 className={styles.title}>Scan MITTI Device</h1>

          {/* NFC Animation Area */}
          <div className={`${styles.scanArea} ${state === 'scanning' ? styles.scanAreaActive : ''}`}>
            <div className={styles.scanRings}>
              <div className={styles.ring1} />
              <div className={styles.ring2} />
              <div className={styles.ring3} />
              <span className={styles.phoneIcon}>📱</span>
            </div>
          </div>

          {/* Status Message */}
          <p className={`${styles.statusMessage} ${styles[`status_${state}`]}`}>{message || 'Tap the button below to start scanning'}</p>

          {/* Actions */}
          {state === 'ready' && (
            <div className={styles.actions}>
              <button className="btn btn-primary" onClick={startNfcScan}>Start NFC Scan</button>
              <button className="btn btn-ghost" onClick={() => setShowManual(true)}>Enter Device ID manually</button>
            </div>
          )}

          {state === 'scanning' && (
            <div className={styles.actions}>
              <p className={styles.hint}>Hold your phone near the NFC tag on your MITTI device</p>
              <button className="btn btn-ghost" onClick={() => { setState('ready'); setMessage(''); }}>Cancel</button>
            </div>
          )}

          {(state === 'unsupported' || state === 'error' || state === 'not_found') && (
            <div className={styles.actions}>
              <button className="btn btn-secondary" onClick={() => { setState('ready'); setMessage(''); setShowManual(true); }}>Try Again</button>
            </div>
          )}

          {state === 'success' && (
            <div className={styles.successAnimation}>
              <span className={styles.checkmark}>✅</span>
              <p>Redirecting to device...</p>
            </div>
          )}

          {/* Manual Entry */}
          {showManual && state !== 'success' && (
            <form className={styles.manualForm} onSubmit={handleManualSubmit}>
              <label className={styles.manualLabel}>Device ID</label>
              <div className={styles.manualInputRow}>
                <input
                  type="text"
                  className={styles.manualInput}
                  placeholder="e.g. MITTI-DEVICE-001"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  pattern="MITTI-DEVICE-\d+"
                />
                <button type="submit" className="btn btn-primary">Verify</button>
              </div>
              <p className={styles.manualHint}>Enter the device ID printed on your MITTI device label.</p>
            </form>
          )}
        </div>
      </div>
    </AppShell>
  );
}
