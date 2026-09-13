/* ── MITTI — Settings ──
 *
 * User-level and display-level options only. Nothing here exposes GPIO pins,
 * model files, Raspberry Pi credentials, or any control that could start an
 * assessment or drive the relay — the spec lists all of those as forbidden in
 * the PWA.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, Globe, Info, LogOut, Radio, Wifi } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Alert } from '@/components/ui/Alert';
import { useSession } from '@/components/providers/SessionProvider';
import { profileApi } from '@/lib/api';
import { useDevices } from '@/lib/hooks/useDevices';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import { useUiStore } from '@/lib/store';
import { API_BASE } from '@/lib/api/client';
import { getConnectionDescription } from '@/lib/utils';
import styles from './settings.module.css';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'bn', label: 'বাংলা (Bengali)' },
];

type NotificationState = 'unsupported' | 'default' | 'granted' | 'denied';

function readNotificationState(): NotificationState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission as NotificationState;
}

export function SettingsView() {
  const { profile, setProfile, signOut } = useSession();
  const queryClient = useQueryClient();
  const { isOnline, isBackendReachable } = useOnlineStatus();

  const selectedDeviceId = useUiStore((s) => s.selectedDeviceId);
  const selectDevice = useUiStore((s) => s.selectDevice);
  const clearSelection = useUiStore((s) => s.clear);

  const devicesQuery = useDevices();
  const devices = devicesQuery.data ?? [];

  const [language, setLanguage] = useState(profile?.language ?? 'en');
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationState>(readNotificationState);

  async function handleLanguageChange(next: string) {
    setLanguage(next);
    setSavingLanguage(true);
    setProblem(null);
    try {
      const updated = await profileApi.update({ language: next });
      setProfile(updated);
      setNotice('Your language preference has been saved.');
    } catch {
      setProblem('Your language preference could not be saved. Please try again.');
      setLanguage(profile?.language ?? 'en');
    } finally {
      setSavingLanguage(false);
    }
  }

  async function requestNotifications() {
    if (!('Notification' in window)) return;
    // Asked only after the benefit has been explained on screen, never on load.
    const result = await Notification.requestPermission();
    setNotifications(result as NotificationState);
  }

  async function handleSignOut() {
    clearSelection();
    // Drop every cached API response so the next account cannot read the
    // previous one's data out of the in-memory cache.
    queryClient.clear();
    await signOut();
  }

  const connectionState = !isOnline ? 'offline' : !isBackendReachable ? 'stale' : 'synced';

  return (
    <AppShell>
      <div className={styles.page}>
        <header>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.lead}>Language, alerts and the device you are viewing.</p>
        </header>

        {notice && (
          <Alert tone="success" onDismiss={() => setNotice(null)}>
            {notice}
          </Alert>
        )}
        {problem && (
          <Alert tone="error" onDismiss={() => setProblem(null)}>
            {problem}
          </Alert>
        )}

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionIcon}>
              <Globe size={18} aria-hidden="true" />
            </span>
            <div>
              <h2 className={styles.sectionTitle}>Language</h2>
              <p className={styles.sectionLead}>Choose the language MITTI uses.</p>
            </div>
          </div>

          <div className={styles.rows}>
            <div className={styles.row}>
              <div className={styles.rowBody}>
                <p className={styles.rowLabel}>Display language</p>
                <p className={styles.rowHint}>
                  Saved to your profile, so it follows you to any device.
                </p>
              </div>
              <select
                className={styles.select}
                value={language}
                disabled={savingLanguage}
                aria-label="Display language"
                onChange={(e) => void handleLanguageChange(e.target.value)}
              >
                {LANGUAGES.map(({ code, label }) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionIcon}>
              <Radio size={18} aria-hidden="true" />
            </span>
            <div>
              <h2 className={styles.sectionTitle}>Selected device</h2>
              <p className={styles.sectionLead}>
                The field shown on your dashboard when you open MITTI.
              </p>
            </div>
          </div>

          <div className={styles.rows}>
            <div className={styles.row}>
              <div className={styles.rowBody}>
                <p className={styles.rowLabel}>Current device</p>
                <p className={styles.rowHint}>Remembered on this phone or computer.</p>
              </div>

              {devices.length > 0 ? (
                <select
                  className={styles.select}
                  value={selectedDeviceId ?? ''}
                  aria-label="Selected device"
                  onChange={(e) => selectDevice(e.target.value || null)}
                >
                  {devices.map((device) => (
                    <option key={device.device_id} value={device.device_id}>
                      {device.device_name}
                    </option>
                  ))}
                </select>
              ) : (
                <Link href="/scan" className="btn btn-secondary">
                  Add a device
                </Link>
              )}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionIcon}>
              <Bell size={18} aria-hidden="true" />
            </span>
            <div>
              <h2 className={styles.sectionTitle}>Alerts</h2>
              <p className={styles.sectionLead}>
                Be told when a field needs action, even when MITTI is closed.
              </p>
            </div>
          </div>

          <div className={styles.rows}>
            <div className={styles.row}>
              <div className={styles.rowBody}>
                <p className={styles.rowLabel}>Notifications on this device</p>
                <p className={styles.rowHint}>
                  {notifications === 'granted'
                    ? 'Allowed. MITTI can alert you about urgent advisories.'
                    : notifications === 'denied'
                      ? 'Blocked. You can re-enable notifications in your browser settings.'
                      : notifications === 'unsupported'
                        ? 'This browser does not support notifications.'
                        : 'Not enabled yet.'}
                </p>
              </div>

              {notifications === 'default' && (
                <button type="button" className="btn btn-secondary" onClick={requestNotifications}>
                  Enable notifications
                </button>
              )}
              {notifications === 'granted' && <span className="badge badge-green">Enabled</span>}
              {notifications === 'denied' && <span className="badge badge-grey">Blocked</span>}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionIcon}>
              <Wifi size={18} aria-hidden="true" />
            </span>
            <div>
              <h2 className={styles.sectionTitle}>Connection</h2>
              <p className={styles.sectionLead}>Read-only information about this session.</p>
            </div>
          </div>

          <div className={styles.rows}>
            <div className={styles.row}>
              <div className={styles.rowBody}>
                <p className={styles.rowLabel}>Data source</p>
                <p className={styles.rowHint}>{getConnectionDescription(connectionState)}</p>
              </div>
              <span
                className={`badge ${
                  connectionState === 'synced'
                    ? 'badge-green'
                    : connectionState === 'stale'
                      ? 'badge-yellow'
                      : 'badge-grey'
                }`}
              >
                {connectionState === 'synced'
                  ? 'Synced'
                  : connectionState === 'stale'
                    ? 'Not syncing'
                    : 'Offline'}
              </span>
            </div>

            <div className={styles.row}>
              <div className={styles.rowBody}>
                <p className={styles.rowLabel}>MITTI service</p>
                {/* The base URL is a public endpoint, not a secret. No keys,
                    tokens or database details are ever shown here. */}
                <p className={styles.rowValue}>{API_BASE}</p>
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.rowBody}>
                <p className={styles.rowLabel}>Devices linked</p>
                <p className={styles.rowValue}>{devices.length}</p>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionIcon}>
              <Info size={18} aria-hidden="true" />
            </span>
            <div>
              <h2 className={styles.sectionTitle}>About MITTI</h2>
              <p className={styles.sectionLead}>Crop intelligence rooted in Indian soil.</p>
            </div>
          </div>

          <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>
            Assessments are started by the button on your MITTI unit. This app is for reading
            results, sensor readings and advisories — it never starts an assessment or controls
            your pump.
          </p>
        </section>

        <section className={`${styles.section} ${styles.danger}`}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionIcon} style={{ background: 'var(--critical-surface)', color: 'var(--critical-red)' }}>
              <LogOut size={18} aria-hidden="true" />
            </span>
            <div>
              <h2 className={styles.sectionTitle}>Sign out</h2>
              <p className={styles.sectionLead}>
                Clears your saved data from this phone or computer.
              </p>
            </div>
          </div>

          <div>
            <button type="button" className="btn btn-danger" onClick={handleSignOut}>
              <LogOut size={16} aria-hidden="true" />
              Sign out
            </button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
