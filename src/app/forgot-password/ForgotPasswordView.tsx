/* ── MITTI — Forgot password ──
 *
 * The confirmation is deliberately identical whether or not an account exists
 * for the address. Saying "no account found" would let anyone use this form to
 * discover which email addresses are registered.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MailCheck, Send } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Alert } from '@/components/ui/Alert';
import { FormField } from '@/components/ui/FormField';
import { Spinner } from '@/components/ui/Spinner';
import { sendPasswordReset } from '@/lib/auth/actions';
import type { FriendlyError } from '@/lib/auth/errors';
import { validateEmail } from '@/lib/auth/validation';
import { useCountdown } from '@/lib/hooks/useCountdown';
import styles from './forgot.module.css';

const RESEND_COOLDOWN_SECONDS = 60;

export function ForgotPasswordView() {
  const cooldown = useCountdown();
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [banner, setBanner] = useState<FriendlyError | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || cooldown.isRunning) return;

    const problem = validateEmail(email);
    setFieldError(problem);
    if (problem) return;

    setBusy(true);
    setBanner(null);

    const result = await sendPasswordReset(email);
    setBusy(false);

    if (!result.ok) {
      // Rate limits and network failures are real and worth showing. An
      // unknown address is not reported — see the note at the top.
      setBanner(result.error);
      if (result.error.retryAfterSeconds) cooldown.start(result.error.retryAfterSeconds);
      return;
    }

    setSent(true);
    cooldown.start(RESEND_COOLDOWN_SECONDS);
  }

  if (sent) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle="If an account exists for that address, a reset link is on its way."
        backHref="/login"
        backLabel="Back to sign in"
      >
        <div className={styles.sentWrap}>
          <span className={styles.illustration}>
            <MailCheck size={28} aria-hidden="true" />
          </span>
          <p className={styles.sentBody}>
            Open the link in the email to choose a new password. The link expires after a
            short time, so use it soon.
          </p>

          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={() => setSent(false)}
            disabled={cooldown.isRunning}
          >
            {cooldown.isRunning ? (
              <>
                Send again in <span className={styles.countdown}>{cooldown.formatted}</span>
              </>
            ) : (
              'Use a different email address'
            )}
          </button>

          <Link href="/login" className="btn btn-ghost btn-block">
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email address and we will send you a link to set a new one."
      backHref="/login"
      backLabel="Back to sign in"
    >
      <form className={styles.form} noValidate onSubmit={handleSubmit}>
        {banner && (
          <Alert tone="error" onDismiss={() => setBanner(null)}>
            {banner.message}
          </Alert>
        )}

        <FormField
          label="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          error={fieldError}
          disabled={busy}
          autoFocus
          onChange={(e) => {
            setEmail(e.target.value);
            setFieldError(null);
          }}
        />

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? <Spinner size={16} /> : <Send size={16} aria-hidden="true" />}
          {busy ? 'Sending link…' : 'Send reset link'}
        </button>
      </form>
    </AuthLayout>
  );
}
