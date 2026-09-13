/* ── MITTI — Mobile number sign-in ──
 *
 * Two steps in one component: collect the number, then verify the code.
 *
 * Everything about the code itself belongs to Supabase — it generates it,
 * sends it through the project's SMS provider, and checks it. MITTI never
 * creates a code, never stores one, and never logs one. If phone sign-in is
 * not enabled on the project, the error surfaces as a setup message; there is
 * no path that fakes a successful verification.
 */
'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, MessageSquare, Pencil, Send } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { OtpInput } from '@/components/ui/OtpInput';
import { PhoneField } from '@/components/ui/PhoneField';
import { Spinner } from '@/components/ui/Spinner';
import { sendPhoneOtp, verifyPhoneOtp } from '@/lib/auth/actions';
import { DEFAULT_COUNTRY, type Country } from '@/lib/auth/countries';
import type { FriendlyError } from '@/lib/auth/errors';
import { maskPhone, toE164, validatePhone } from '@/lib/auth/validation';
import { useCountdown } from '@/lib/hooks/useCountdown';
import styles from './MobileOtpFlow.module.css';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

export type MobileOtpStep = 'phone' | 'code' | 'done';

interface MobileOtpFlowProps {
  /** Where to go once the session exists. */
  redirectTo: string;
  /** Rendered under the phone step, e.g. a link back to email sign-in. */
  alternative?: React.ReactNode;
  onStepChange?: (step: MobileOtpStep) => void;
}

export function MobileOtpFlow({ redirectTo, alternative, onStepChange }: MobileOtpFlowProps) {
  const router = useRouter();
  const cooldown = useCountdown();

  const [step, setStepState] = useState<MobileOtpStep>('phone');
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [nationalNumber, setNationalNumber] = useState('');
  const [code, setCode] = useState('');

  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [banner, setBanner] = useState<FriendlyError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Guards a double-tap or an Enter key landing while a request is in flight.
  const inFlight = useRef(false);

  const e164 = toE164(country.dial, nationalNumber);

  const setStep = useCallback(
    (next: MobileOtpStep) => {
      setStepState(next);
      onStepChange?.(next);
    },
    [onStepChange],
  );

  function beginCooldown(error?: FriendlyError) {
    cooldown.start(error?.retryAfterSeconds ?? RESEND_COOLDOWN_SECONDS);
  }

  async function requestCode(isResend: boolean) {
    if (inFlight.current) return;

    const validationError = validatePhone(country.dial, nationalNumber);
    if (validationError) {
      setPhoneError(validationError);
      return;
    }

    inFlight.current = true;
    setBusy(true);
    setPhoneError(null);
    setBanner(null);
    setNotice(null);

    const result = await sendPhoneOtp(e164);

    inFlight.current = false;
    setBusy(false);

    if (!result.ok) {
      setBanner(result.error);
      // A rate limit still means "wait", so honour the server's own interval.
      if (result.error.retryAfterSeconds) beginCooldown(result.error);
      return;
    }

    setCode('');
    setCodeError(null);
    setStep('code');
    beginCooldown();
    if (isResend) setNotice('We have sent a new code.');
  }

  async function submitCode(value: string) {
    if (inFlight.current) return;
    if (value.length !== OTP_LENGTH) {
      setCodeError(`Enter all ${OTP_LENGTH} digits.`);
      return;
    }

    inFlight.current = true;
    setBusy(true);
    setCodeError(null);
    setBanner(null);
    setNotice(null);

    const result = await verifyPhoneOtp(e164, value);

    inFlight.current = false;

    if (!result.ok) {
      setBusy(false);
      setCodeError(result.error.message);
      setCode('');
      return;
    }

    // Session established. Show it landed, then hand over to the server so the
    // proxy sees the new cookie and the dashboard renders already signed in.
    setStep('done');
    router.replace(redirectTo);
    router.refresh();
  }

  /* ── Step: phone number ── */
  if (step === 'phone') {
    return (
      <form
        className={styles.form}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void requestCode(false);
        }}
      >
        {banner && (
          <Alert
            tone={banner.isConfiguration ? 'warning' : 'error'}
            onDismiss={() => setBanner(null)}
          >
            {banner.message}
          </Alert>
        )}

        <PhoneField
          country={country}
          onCountryChange={(c) => {
            setCountry(c);
            setPhoneError(null);
          }}
          value={nationalNumber}
          onValueChange={(v) => {
            setNationalNumber(v);
            setPhoneError(null);
          }}
          error={phoneError}
          hint="We will send a one-time code by SMS."
          disabled={busy}
          autoFocus
        />

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? <Spinner size={16} /> : <Send size={16} aria-hidden="true" />}
          {busy ? 'Sending code…' : 'Send code'}
        </button>

        {alternative && (
          <>
            <span className={styles.divider}>or</span>
            {alternative}
          </>
        )}
      </form>
    );
  }

  /* ── Step: verification code ── */
  if (step === 'code') {
    return (
      <form
        className={styles.form}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submitCode(code);
        }}
      >
        {banner && (
          <Alert tone="error" onDismiss={() => setBanner(null)}>
            {banner.message}
          </Alert>
        )}
        {notice && (
          <Alert tone="success" onDismiss={() => setNotice(null)}>
            {notice}
          </Alert>
        )}

        <p className={styles.sentTo}>
          We sent a {OTP_LENGTH}-digit code to
          <span className={styles.sentToNumber}>{maskPhone(e164)}</span>
        </p>

        <OtpInput
          value={code}
          onChange={(v) => {
            setCode(v);
            if (codeError) setCodeError(null);
          }}
          onComplete={(v) => void submitCode(v)}
          length={OTP_LENGTH}
          disabled={busy}
          error={codeError}
          label={`${OTP_LENGTH}-digit verification code`}
        />

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={busy || code.length !== OTP_LENGTH}
        >
          {busy ? <Spinner size={16} /> : <CheckCircle2 size={16} aria-hidden="true" />}
          {busy ? 'Verifying…' : 'Verify and continue'}
        </button>

        <div className={styles.resendRow}>
          {cooldown.isRunning ? (
            /* Polite live region: announces when resend unlocks without
               interrupting someone mid-way through typing the code. */
            <span aria-live="polite">
              You can request a new code in{' '}
              <span className={styles.countdown}>{cooldown.formatted}</span>
            </span>
          ) : (
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => void requestCode(true)}
              disabled={busy}
            >
              <MessageSquare size={15} aria-hidden="true" />
              Did not receive it? Send again
            </button>
          )}

          <button
            type="button"
            className={styles.changeNumber}
            disabled={busy}
            onClick={() => {
              setStep('phone');
              setCode('');
              setCodeError(null);
              setBanner(null);
              setNotice(null);
              cooldown.reset();
            }}
          >
            <Pencil size={14} aria-hidden="true" />
            Change mobile number
          </button>
        </div>
      </form>
    );
  }

  /* ── Step: signed in, navigating ── */
  return (
    <div className={styles.success} role="status" aria-live="polite">
      <span className={styles.successRing}>
        <CheckCircle2 size={28} aria-hidden="true" />
      </span>
      <p className={styles.successTitle}>Mobile number verified</p>
      <p className={styles.successBody}>Opening your dashboard…</p>
    </div>
  );
}
