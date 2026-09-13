/* ── MITTI — Add a device ──
 *
 * Two ways in: tap the NFC tag on the unit, or type the device ID printed on
 * its label. Manual entry is never hidden behind an NFC failure — Web NFC only
 * exists on Chrome for Android, and everyone else needs a way through.
 *
 * A tag is not trusted on its own. Whatever is read is validated for shape and
 * then checked against the backend, which answers only for devices this user
 * is allowed to see.
 */
'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  Nfc,
  Radio,
  ScanLine,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Alert } from '@/components/ui/Alert';
import { FormField } from '@/components/ui/FormField';
import { Spinner } from '@/components/ui/Spinner';
import { devicesApi } from '@/lib/api';
import { ApiError } from '@/lib/api';
import { queryKeys } from '@/lib/hooks/useDevices';
import { useNfc } from '@/lib/hooks/useNfc';
import { useUiStore } from '@/lib/store';
import { validateDeviceId } from '@/lib/auth/validation';
import type { Device } from '@/lib/types';
import styles from './scan.module.css';

type Outcome =
  | { kind: 'idle' }
  | { kind: 'checking'; deviceId: string }
  | { kind: 'found'; device: Device }
  | { kind: 'rejected'; message: string };

export function ScanView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const selectDevice = useUiStore((s) => s.selectDevice);

  const [manualId, setManualId] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' });

  const checkDevice = useCallback(
    async (rawId: string) => {
      const deviceId = rawId.trim().toUpperCase();

      // Reject a malformed id locally, so an arbitrary NFC tag never reaches
      // the API and a typo gets a useful message instead of "not found".
      const shapeProblem = validateDeviceId(deviceId);
      if (shapeProblem) {
        setOutcome({ kind: 'rejected', message: shapeProblem });
        return;
      }

      setOutcome({ kind: 'checking', deviceId });

      try {
        const result = await devicesApi.validate(deviceId);
        if (result.valid && result.device) {
          setOutcome({ kind: 'found', device: result.device });
        } else {
          setOutcome({
            kind: 'rejected',
            // The backend answers the same way for "does not exist" and "not
            // yours", so this message cannot be used to probe which ids exist.
            message: result.message ?? 'This device is not linked to your account.',
          });
        }
      } catch (error) {
        setOutcome({
          kind: 'rejected',
          message:
            error instanceof ApiError
              ? error.friendlyMessage
              : 'The device could not be checked. Please try again.',
        });
      }
    },
    [],
  );

  // A tag read feeds straight into the same validation path as manual entry,
  // so there is exactly one way a device gets accepted. Passing it as a
  // callback keeps it an event rather than an effect reacting to hook state.
  const nfc = useNfc((tagValue) => void checkDevice(tagValue));


  function openDevice(device: Device) {
    selectDevice(device.device_id);
    void queryClient.invalidateQueries({ queryKey: queryKeys.devices });
    router.push(`/devices/${encodeURIComponent(device.device_id)}`);
  }

  function handleManualSubmit(event: React.FormEvent) {
    event.preventDefault();
    const problem = validateDeviceId(manualId);
    setManualError(problem);
    if (problem) return;
    void checkDevice(manualId);
  }

  function resetAll() {
    setOutcome({ kind: 'idle' });
    nfc.reset();
  }

  const scanning = nfc.state === 'scanning';
  const checking = outcome.kind === 'checking';

  return (
    <AppShell>
      <div className={styles.page}>
        <Link href="/devices" className={styles.back}>
          <ArrowLeft size={16} aria-hidden="true" />
          All devices
        </Link>

        <header className={styles.head}>
          <h1 className={styles.title}>Add a device</h1>
          <p className={styles.lead}>
            Tap the NFC tag on your MITTI unit, or type the device ID printed on its label.
          </p>
        </header>

        <section className={styles.scanner} aria-label="NFC scanner">
          <div
            className={`${styles.target} ${
              outcome.kind === 'found'
                ? styles.targetSuccess
                : outcome.kind === 'rejected'
                  ? styles.targetError
                  : ''
            }`}
          >
            {scanning && (
              <>
                <span className={styles.ring} aria-hidden="true" />
                <span className={`${styles.ring} ${styles.ring2}`} aria-hidden="true" />
              </>
            )}

            {outcome.kind === 'found' ? (
              <CheckCircle2 size={44} aria-hidden="true" />
            ) : outcome.kind === 'rejected' ? (
              <XCircle size={44} aria-hidden="true" />
            ) : checking ? (
              <Spinner size={40} />
            ) : (
              <Nfc size={44} aria-hidden="true" />
            )}
          </div>

          {/* One polite live region announces every state change in sequence,
              rather than each branch shouting over the others. */}
          <div role="status" aria-live="polite">
            {outcome.kind === 'found' ? (
              <>
                <p className={styles.statusTitle}>Device found</p>
                <div className={styles.found}>
                  <p className={styles.foundName}>{outcome.device.device_name}</p>
                  <p className={styles.foundMeta}>
                    {outcome.device.field_name || 'Field not named'}
                    {outcome.device.crop ? ` · ${outcome.device.crop}` : ''}
                  </p>
                  <p className={styles.foundMeta}>{outcome.device.device_id}</p>
                </div>
              </>
            ) : outcome.kind === 'rejected' ? (
              <>
                <p className={styles.statusTitle}>Not linked</p>
                <p className={styles.statusBody}>{outcome.message}</p>
              </>
            ) : checking ? (
              <>
                <p className={styles.statusTitle}>Checking device…</p>
                <p className={styles.statusBody}>{outcome.deviceId}</p>
              </>
            ) : scanning ? (
              <>
                <p className={styles.statusTitle}>Hold your phone near the tag</p>
                <p className={styles.statusBody}>
                  Touch the back of your phone to the NFC tag on the MITTI enclosure.
                </p>
              </>
            ) : nfc.isSupported ? (
              <>
                <p className={styles.statusTitle}>Ready to scan</p>
                <p className={styles.statusBody}>
                  Start the scanner, then hold your phone against the tag on your device.
                </p>
              </>
            ) : (
              <>
                <p className={styles.statusTitle}>NFC is not available here</p>
                <p className={styles.statusBody}>
                  NFC scanning works in Chrome on Android. Enter the device ID below instead.
                </p>
              </>
            )}
          </div>

          {nfc.error && nfc.state !== 'read' && (
            <Alert tone={nfc.state === 'permission-denied' ? 'warning' : 'error'}>
              {nfc.error}
            </Alert>
          )}

          <div className={styles.actions}>
            {outcome.kind === 'found' ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={() => openDevice(outcome.device)}
                >
                  Open this device
                </button>
                <button type="button" className="btn btn-ghost btn-block" onClick={resetAll}>
                  Scan another
                </button>
              </>
            ) : nfc.isSupported ? (
              scanning ? (
                <button type="button" className="btn btn-secondary btn-block" onClick={nfc.stop}>
                  Stop scanning
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={() => {
                    setOutcome({ kind: 'idle' });
                    void nfc.start();
                  }}
                  disabled={checking}
                >
                  <ScanLine size={16} aria-hidden="true" />
                  Start NFC scan
                </button>
              )
            ) : null}
          </div>
        </section>

        <span className={styles.divider}>or</span>

        <section className={styles.manual} aria-label="Enter a device ID">
          <div>
            <h2 className={styles.manualTitle}>Enter the device ID</h2>
            <p className={styles.manualLead}>
              You will find it printed on the label of your MITTI unit.
            </p>
          </div>

          <form onSubmit={handleManualSubmit} noValidate style={{ display: 'grid', gap: 'var(--space-4)' }}>
            <FormField
              label="Device ID"
              placeholder="MITTI-DEVICE-001"
              value={manualId}
              error={manualError}
              disabled={checking}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              onChange={(e) => {
                setManualId(e.target.value.toUpperCase());
                setManualError(null);
              }}
            />

            <button type="submit" className="btn btn-primary" disabled={checking || !manualId}>
              {checking ? <Spinner size={16} /> : <Radio size={16} aria-hidden="true" />}
              {checking ? 'Checking…' : 'Find this device'}
            </button>
          </form>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
            <ShieldAlert size={15} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
            MITTI only reads the tag. It never changes what is written on it.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
