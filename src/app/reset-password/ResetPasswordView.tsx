/* ── MITTI — Set a new password ──
 *
 * Reached from the link in a recovery email, which the /auth/callback handler
 * has already exchanged for a session. That session is what authorises the
 * change, so the form must confirm it exists before showing itself — otherwise
 * someone opening this URL directly would see a form that cannot work.
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, KeyRound } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Alert } from '@/components/ui/Alert';
import { PasswordField } from '@/components/ui/PasswordField';
import { Spinner } from '@/components/ui/Spinner';
import { updatePassword } from '@/lib/auth/actions';
import type { FriendlyError } from '@/lib/auth/errors';
import { createClient } from '@/lib/supabase/client';
import {
  MIN_PASSWORD_LENGTH,
  validatePassword,
  validatePasswordConfirmation,
} from '@/lib/auth/validation';
import styles from './reset.module.css';

type SessionState = 'checking' | 'ready' | 'missing';

export function ResetPasswordView() {
  const router = useRouter();
  const [sessionState, setSessionState] = useState<SessionState>('checking');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [banner, setBanner] = useState<FriendlyError | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;

    async function check() {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (!active) return;
        setSessionState(data.user ? 'ready' : 'missing');
      } catch {
        if (active) setSessionState('missing');
      }
    }

    void check();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    const passwordProblem = validatePassword(password);
    const confirmProblem = validatePasswordConfirmation(password, confirm);
    setPasswordError(passwordProblem);
    setConfirmError(confirmProblem);
    if (passwordProblem || confirmProblem) return;

    setBusy(true);
    setBanner(null);

    const result = await updatePassword(password);

    if (!result.ok) {
      setBusy(false);
      setBanner(result.error);
      return;
    }

    setDone(true);
    // Give the confirmation a beat to register before moving on.
    setTimeout(() => {
      router.replace('/dashboard');
      router.refresh();
    }, 1200);
  }

  if (sessionState === 'checking') {
    return (
      <AuthLayout title="Set a new password" subtitle="Checking your reset link…">
        <div className={styles.centered} role="status" aria-live="polite">
          <Spinner size={28} label="Checking your reset link" />
        </div>
      </AuthLayout>
    );
  }

  if (sessionState === 'missing') {
    return (
      <AuthLayout
        title="This link is no longer valid"
        subtitle="Reset links expire after a short time and can only be used once."
        backHref="/login"
        backLabel="Back to sign in"
      >
        <div className={styles.centered}>
          <Alert tone="warning" title="Request a new link">
            Ask for a fresh password reset email and open the new link straight away.
          </Alert>
          <Link href="/forgot-password" className="btn btn-primary btn-block">
            Send a new reset link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout title="Password updated" subtitle="You are signed in with your new password.">
        <div className={styles.centered} role="status" aria-live="polite">
          <span className={styles.successRing}>
            <CheckCircle2 size={28} aria-hidden="true" />
          </span>
          <p className={styles.successBody}>Opening your dashboard…</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Choose a password you have not used before."
    >
      <form className={styles.form} noValidate onSubmit={handleSubmit}>
        {banner && (
          <Alert tone="error" onDismiss={() => setBanner(null)}>
            {banner.message}
          </Alert>
        )}

        <PasswordField
          label="New password"
          autoComplete="new-password"
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          value={password}
          error={passwordError}
          disabled={busy}
          showStrength
          autoFocus
          onChange={(e) => {
            setPassword(e.target.value);
            setPasswordError(null);
          }}
        />

        <PasswordField
          label="Confirm new password"
          autoComplete="new-password"
          placeholder="Re-enter your new password"
          value={confirm}
          error={confirmError}
          disabled={busy}
          onChange={(e) => {
            setConfirm(e.target.value);
            setConfirmError(null);
          }}
        />

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? <Spinner size={16} /> : <KeyRound size={16} aria-hidden="true" />}
          {busy ? 'Updating password…' : 'Update password'}
        </button>
      </form>
    </AuthLayout>
  );
}
