/* ── MITTI — Create account ──
 *
 * Email and password only. A mobile number can be added, and is stored on the
 * profile, but it is not a second sign-in credential here: mixing the two at
 * signup creates accounts that behave differently depending on which field was
 * filled. Mobile sign-in lives on its own path.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Alert } from '@/components/ui/Alert';
import { FormField } from '@/components/ui/FormField';
import { PasswordField } from '@/components/ui/PasswordField';
import { PhoneField } from '@/components/ui/PhoneField';
import { Spinner } from '@/components/ui/Spinner';
import { signUpWithEmail } from '@/lib/auth/actions';
import { DEFAULT_COUNTRY, type Country } from '@/lib/auth/countries';
import type { FriendlyError } from '@/lib/auth/errors';
import {
  MIN_PASSWORD_LENGTH,
  normalisePhoneDigits,
  toE164,
  validateEmail,
  validateFullName,
  validatePassword,
  validatePasswordConfirmation,
  validatePhone,
} from '@/lib/auth/validation';
import styles from './signup.module.css';

interface Errors {
  fullName?: string | null;
  email?: string | null;
  password?: string | null;
  confirm?: string | null;
  phone?: string | null;
}

export function SignupView() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState('');

  const [errors, setErrors] = useState<Errors>({});
  const [banner, setBanner] = useState<FriendlyError | null>(null);
  const [busy, setBusy] = useState(false);

  function clearError(key: keyof Errors) {
    setErrors((prev) => ({ ...prev, [key]: null }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    const next: Errors = {
      fullName: validateFullName(fullName),
      email: validateEmail(email),
      password: validatePassword(password),
      confirm: validatePasswordConfirmation(password, confirm),
      // The number is optional, so only validate what was actually entered.
      phone: normalisePhoneDigits(phone) ? validatePhone(country.dial, phone) : null,
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setBusy(true);
    setBanner(null);

    const result = await signUpWithEmail({
      email,
      password,
      fullName,
      phone: normalisePhoneDigits(phone) ? toE164(country.dial, phone) : undefined,
    });

    if (!result.ok) {
      setBusy(false);
      setBanner(result.error);
      return;
    }

    if (result.data.needsEmailConfirmation) {
      // No session yet — the account exists but is unconfirmed. Say so on a
      // dedicated screen rather than pretending the user is signed in.
      router.replace(`/verify?email=${encodeURIComponent(result.data.email)}`);
      return;
    }

    router.replace('/dashboard');
    router.refresh();
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start monitoring your fields with MITTI."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login">Sign in</Link>
        </>
      }
      legal="By creating an account you agree to the applicable terms of use for this MITTI deployment."
    >
      <form className={styles.form} noValidate onSubmit={handleSubmit}>
        {banner && (
          <Alert tone={banner.isConfiguration ? 'warning' : 'error'} onDismiss={() => setBanner(null)}>
            {banner.message}
          </Alert>
        )}

        <FormField
          label="Full name"
          autoComplete="name"
          placeholder="Your name"
          value={fullName}
          error={errors.fullName}
          disabled={busy}
          autoFocus
          onChange={(e) => {
            setFullName(e.target.value);
            clearError('fullName');
          }}
        />

        <FormField
          label="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          error={errors.email}
          disabled={busy}
          onChange={(e) => {
            setEmail(e.target.value);
            clearError('email');
          }}
        />

        <PhoneField
          label="Mobile number"
          country={country}
          onCountryChange={setCountry}
          value={phone}
          onValueChange={(v) => {
            setPhone(v);
            clearError('phone');
          }}
          error={errors.phone}
          hint="Optional. Used for field alerts and mobile sign-in."
          disabled={busy}
        />

        <PasswordField
          label="Password"
          autoComplete="new-password"
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          value={password}
          error={errors.password}
          disabled={busy}
          showStrength
          onChange={(e) => {
            setPassword(e.target.value);
            clearError('password');
          }}
        />

        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={confirm}
          error={errors.confirm}
          disabled={busy}
          onChange={(e) => {
            setConfirm(e.target.value);
            clearError('confirm');
          }}
        />

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? <Spinner size={16} /> : <UserPlus size={16} aria-hidden="true" />}
          {busy ? 'Creating your account…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  );
}
