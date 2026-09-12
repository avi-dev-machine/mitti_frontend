'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return setError('Please enter a valid mobile number');
    
    setLoading(true);
    setError('');
    
    try {
      await api.sendOtp(phone);
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return setError('Please enter the 6-digit OTP');
    
    setLoading(true);
    setError('');
    
    try {
      const data = await api.verifyOtp(phone, otp);
      setAuth(data.user, data.token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.leftPanel}>
        <div className={styles.logo}>🌱 MITTI</div>
        <h1 className={styles.heroTitle}>Crop Intelligence, Rooted in Indian Soil.</h1>
        <p className={styles.heroText}>
          Monitor your fields, track crop health, and receive AI-validated advisories directly from your devices.
        </p>
      </div>

      <div className={styles.rightPanel}>
        <div className={styles.loginCard}>
          <div className={styles.cardHeader}>
            <h2>Welcome Back</h2>
            <p>{step === 'phone' ? 'Enter your mobile number to sign in' : `We sent an OTP to ${phone}`}</p>
          </div>

          {error && <div className={styles.errorBanner}>{error}</div>}

          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className={styles.form}>
              <div className={styles.inputGroup}>
                <label htmlFor="phone">Mobile Number</label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="+91 99999 99999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                  autoComplete="tel"
                />
                <p className={styles.helperText}>Use +91 followed by your 10-digit number</p>
              </div>
              <button type="submit" className={styles.submitBtn} disabled={loading || !phone}>
                {loading ? <span className={styles.spinner} /> : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className={styles.form}>
              <div className={styles.inputGroup}>
                <label htmlFor="otp">6-Digit Code</label>
                <input
                  id="otp"
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  disabled={loading}
                  autoComplete="one-time-code"
                />
                <p className={styles.helperText}>Check your messages for the login code.</p>
              </div>
              <button type="submit" className={styles.submitBtn} disabled={loading || otp.length < 6}>
                {loading ? <span className={styles.spinner} /> : 'Verify & Login'}
              </button>
              <button type="button" className={styles.backBtn} onClick={() => setStep('phone')} disabled={loading}>
                Change mobile number
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
