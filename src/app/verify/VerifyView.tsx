/* ── MITTI — Confirm your email ──
 *
 * Reached after signup when the Supabase project requires email confirmation.
 * The account exists but has no session, so this screen states that plainly
 * and offers the two things that actually help: send the email again, or go
 * back and sign in.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MailCheck, RotateCw } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { resendEmailConfirmation } from '@/lib/auth/actions';
import type { FriendlyError } from '@/lib/auth/errors';
import { useCountdown } from '@/lib/hooks/useCountdown';
import styles from './verify.module.css';

const RESEND_COOLDOWN_SECONDS = 60;

const STEPS = [
  'Open the email from MITTI in your inbox.',
  'Tap the confirmation link inside it.',
  'You will be brought straight back here, signed in.',
];

export function VerifyView({ email }: { email: string | null }) {
  const cooldown = useCountdown();
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<FriendlyError | null>(null);
  const [sent, setSent] = useState(false);

  async function handleResend() {
    if (!email || busy || cooldown.isRunning) return;

    setBusy(true);
    setBanner(null);
    setSent(false);

    const result = await resendEmailConfirmation(email);
    setBusy(false);

    if (!result.ok) {
      setBanner(result.error);
      if (result.error.retryAfterSeconds) cooldown.start(result.error.retryAfterSeconds);
      return;
    }

    setSent(true);
    cooldown.start(RESEND_COOLDOWN_SECONDS);
  }

  return (
    <AuthLayout
      title="Confirm your email"
      subtitle={
        email
          ? 'Your account is created. One more step before you can sign in.'
          : 'Check your inbox for the confirmation link we sent you.'
      }
      backHref="/login"
      backLabel="Back to sign in"
    >
      <div className={styles.wrap}>
        <span className={styles.illustration}>
          <MailCheck size={28} aria-hidden="true" />
        </span>

        {email && <span className={styles.address}>{email}</span>}

        {banner && (
          <Alert tone="error" onDismiss={() => setBanner(null)}>
            {banner.message}
          </Alert>
        )}

        {sent && (
          <Alert tone="success" onDismiss={() => setSent(false)}>
            We have sent the confirmation email again. It can take a minute to arrive.
          </Alert>
        )}

        <ol className={styles.steps}>
          {STEPS.map((text, index) => (
            <li key={text} className={styles.step}>
              <span className={styles.stepNumber}>{index + 1}</span>
              <span>{text}</span>
            </li>
          ))}
        </ol>

        <div className={styles.actions}>
          {email && (
            <button
              type="button"
              className="btn btn-secondary btn-block"
              onClick={handleResend}
              disabled={busy || cooldown.isRunning}
            >
              {busy ? <Spinner size={16} /> : <RotateCw size={16} aria-hidden="true" />}
              {cooldown.isRunning ? (
                <>
                  Send again in <span className={styles.countdown}>{cooldown.formatted}</span>
                </>
              ) : busy ? (
                'Sending…'
              ) : (
                'Send the email again'
              )}
            </button>
          )}

          <Link href="/login" className="btn btn-ghost btn-block">
            Back to sign in
          </Link>
        </div>

        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textAlign: 'center' }}>
          No email after a few minutes? Check your spam folder, and make sure the address
          above is correct.
        </p>
      </div>
    </AuthLayout>
  );
}
