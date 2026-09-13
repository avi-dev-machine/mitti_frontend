/* ── MITTI — Sign-in ──
 *
 * One screen, two methods. Email and password is the default because it works
 * on every deployment; mobile OTP needs an SMS provider configured on the
 * Supabase project, and says so plainly if it is not.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, Mail, Smartphone } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { MobileOtpFlow, type MobileOtpStep } from '@/components/auth/MobileOtpFlow';
import { Alert } from '@/components/ui/Alert';
import { FormField } from '@/components/ui/FormField';
import { PasswordField } from '@/components/ui/PasswordField';
import { Spinner } from '@/components/ui/Spinner';
import { signInWithEmail } from '@/lib/auth/actions';
import type { FriendlyError } from '@/lib/auth/errors';
import { validateEmail } from '@/lib/auth/validation';
import styles from './login.module.css';

type Method = 'email' | 'mobile';

export function LoginView({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>('email');
  const [otpStep, setOtpStep] = useState<MobileOtpStep>('phone');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [banner, setBanner] = useState<FriendlyError | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleEmailSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    const emailProblem = validateEmail(email);
    // Only presence is checked here. Validating shape on sign-in would tell an
    // attacker which passwords are well-formed; the server decides.
    const passwordProblem = password ? null : 'Enter your password.';
    setEmailError(emailProblem);
    setPasswordError(passwordProblem);
    if (emailProblem || passwordProblem) return;

    setBusy(true);
    setBanner(null);

    const result = await signInWithEmail(email, password);

    if (!result.ok) {
      setBusy(false);
      setBanner(result.error);
      return;
    }

    router.replace(redirectTo);
    router.refresh();
  }

  const isOtpCodeStep = method === 'mobile' && otpStep === 'code';

  const title = isOtpCodeStep ? 'Enter your code' : 'Welcome back';
  const subtitle = isOtpCodeStep
    ? 'Check your messages for the code we just sent.'
    : method === 'mobile'
      ? 'Sign in with your mobile number.'
      : 'Sign in to see the latest from your fields.';

  return (
    <AuthLayout
      title={title}
      subtitle={subtitle}
      footer={
        <>
          New to MITTI?{' '}
          <Link href="/signup">Create an account</Link>
        </>
      }
    >
      {method === 'mobile' ? (
        <MobileOtpFlow
          redirectTo={redirectTo}
          onStepChange={setOtpStep}
          alternative={
            <button
              type="button"
              className={styles.switchButton}
              onClick={() => setMethod('email')}
            >
              <Mail size={17} aria-hidden="true" />
              Sign in with email instead
            </button>
          }
        />
      ) : (
        <form className={styles.form} noValidate onSubmit={handleEmailSubmit}>
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
            error={emailError}
            disabled={busy}
            autoFocus
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError(null);
            }}
          />

          <div>
            <PasswordField
              label="Password"
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              error={passwordError}
              disabled={busy}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError(null);
              }}
            />
            <div className={styles.forgotRow}>
              <Link href="/forgot-password" className={styles.forgotLink}>
                Forgot your password?
              </Link>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? <Spinner size={16} /> : <LogIn size={16} aria-hidden="true" />}
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <span className={styles.divider}>or</span>

          <button
            type="button"
            className={styles.switchButton}
            onClick={() => setMethod('mobile')}
          >
            <Smartphone size={17} aria-hidden="true" />
            Sign in with mobile number
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
