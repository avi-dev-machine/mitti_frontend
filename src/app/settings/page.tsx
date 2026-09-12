'use client';

import { useState } from 'react';
import AppShell from '@/components/AppShell';
import { useDeviceStore } from '@/lib/store';
import styles from './settings.module.css';

export default function SettingsPage() {
  const { selectedDevice } = useDeviceStore();
  const [language, setLanguage] = useState('en');
  const [tempUnit, setTempUnit] = useState('celsius');
  const [notifications, setNotifications] = useState(false);

  return (
    <AppShell>
      <div className={styles.page}>
        <h1 className={styles.pageTitle}>Settings</h1>

        {/* Language */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>🌐 Language</h2>
          <div className={styles.optionGroup}>
            {[
              { value: 'en', label: 'English' },
              { value: 'hi', label: 'हिन्दी (Hindi)' },
              { value: 'bn', label: 'বাংলা (Bengali)' },
            ].map(lang => (
              <button
                key={lang.value}
                className={`${styles.optionBtn} ${language === lang.value ? styles.optionBtnActive : ''}`}
                onClick={() => setLanguage(lang.value)}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Units */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>📏 Temperature Unit</h2>
          <div className={styles.optionGroup}>
            <button
              className={`${styles.optionBtn} ${tempUnit === 'celsius' ? styles.optionBtnActive : ''}`}
              onClick={() => setTempUnit('celsius')}
            >°C Celsius</button>
            <button
              className={`${styles.optionBtn} ${tempUnit === 'fahrenheit' ? styles.optionBtnActive : ''}`}
              onClick={() => setTempUnit('fahrenheit')}
            >°F Fahrenheit</button>
          </div>
        </div>

        {/* Notifications */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>🔔 Notifications</h2>
          <p className={styles.sectionDesc}>Receive alerts when your device reports urgent advisories or goes offline.</p>
          <div className={styles.toggleRow}>
            <span>Push Notifications</span>
            <button
              className={`${styles.toggle} ${notifications ? styles.toggleOn : ''}`}
              onClick={() => setNotifications(!notifications)}
              aria-label="Toggle notifications"
            >
              <span className={styles.toggleKnob} />
            </button>
          </div>
        </div>

        {/* Selected Device */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>📡 Selected Device</h2>
          {selectedDevice ? (
            <div className={styles.deviceInfo}>
              <p className={styles.deviceName}>{selectedDevice.device_name}</p>
              <p className={styles.deviceMeta}>{selectedDevice.device_id} • {selectedDevice.field_name}</p>
            </div>
          ) : (
            <p className={styles.noDevice}>No device selected</p>
          )}
        </div>

        {/* Read-only Technical Info */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>ℹ️ App Information</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}><span className={styles.infoLabel}>Version</span><span className={styles.infoValue}>1.0.0</span></div>
            <div className={styles.infoItem}><span className={styles.infoLabel}>Connection</span><span className={styles.infoValue}>Cloud (Supabase)</span></div>
            <div className={styles.infoItem}><span className={styles.infoLabel}>Cache</span><span className={styles.infoValue}>Active</span></div>
          </div>
        </div>

        {/* Logout */}
        <button className={`btn btn-danger ${styles.logoutBtn}`}>Logout</button>
      </div>
    </AppShell>
  );
}
