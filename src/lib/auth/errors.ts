/* ── MITTI — Supabase error translation ──
 *
 * Supabase messages are written for developers ("Invalid login credentials",
 * "AuthApiError: For security purposes, you can only request this after 41
 * seconds"). Farmers and field operators should never see those. This module
 * is the single place where an auth failure becomes a sentence a person can
 * act on.
 *
 * Anything unrecognised falls back to a neutral message; the original is
 * logged for developers but never rendered.
 */

export interface FriendlyError {
  /** Shown to the user. Plain language, actionable, never technical. */
  message: string;
  /** Set when the fix is to wait — drives resend countdowns. */
  retryAfterSeconds?: number;
  /** True when the cause is connectivity rather than the credentials. */
  isNetwork?: boolean;
  /** True when the deployment is misconfigured rather than the user at fault. */
  isConfiguration?: boolean;
}

const GENERIC =
  'Something went wrong. Please try again in a moment.';

/** Pull the "after N seconds" hint out of a Supabase rate-limit message. */
function parseRetryAfter(raw: string): number | undefined {
  const match = raw.match(/after (\d+) seconds?/i);
  return match ? Number(match[1]) : undefined;
}

interface SupabaseLikeError {
  message?: string;
  code?: string;
  status?: number;
  name?: string;
}

export function translateAuthError(error: unknown): FriendlyError {
  if (!error) return { message: GENERIC };

  const err = error as SupabaseLikeError;
  const raw = (err.message ?? String(error)).trim();
  const code = err.code ?? '';
  const lower = raw.toLowerCase();

  // Developers still get the detail; users never do.
  if (process.env.NODE_ENV !== 'production') {
    console.error('[mitti:auth]', code || err.status || '', raw);
  }

  // ── Connectivity ──
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    err.name === 'TypeError'
  ) {
    return {
      message:
        'MITTI cannot reach the server. Check your internet connection and try again.',
      isNetwork: true,
    };
  }

  // ── Deployment is misconfigured, not the user ──
  if (err.name === 'SupabaseConfigError') {
    return {
      message: err.message || 'MITTI is not connected to Supabase. Missing environment variables.',
      isConfiguration: true,
    };
  }

  if (
    code === 'phone_provider_disabled' ||
    lower.includes('phone provider') ||
    lower.includes('unsupported phone provider') ||
    (lower.includes('sms') && lower.includes('not') && lower.includes('enabled'))
  ) {
    return {
      message:
        'Mobile sign-in is not switched on for this MITTI deployment yet. Please sign in with your email address, or ask your administrator to enable phone sign-in.',
      isConfiguration: true,
    };
  }

  if (code === 'signup_disabled' || lower.includes('signups not allowed')) {
    return {
      message:
        'New accounts are currently closed on this MITTI deployment. Please contact your administrator.',
      isConfiguration: true,
    };
  }

  // ── Rate limits ──
  if (
    code === 'over_email_send_rate_limit' ||
    code === 'over_sms_send_rate_limit' ||
    code === 'over_request_rate_limit' ||
    err.status === 429 ||
    lower.includes('rate limit') ||
    lower.includes('for security purposes')
  ) {
    const seconds = parseRetryAfter(raw);
    return {
      message: seconds
        ? `Too many attempts. Please wait ${seconds} seconds and try again.`
        : 'Too many attempts. Please wait a minute and try again.',
      retryAfterSeconds: seconds,
    };
  }

  // ── Credentials ──
  if (code === 'invalid_credentials' || lower.includes('invalid login credentials')) {
    return { message: 'That email address and password do not match. Please try again.' };
  }

  if (code === 'email_not_confirmed' || lower.includes('email not confirmed')) {
    return {
      message:
        'Please confirm your email address first. Check your inbox for the link we sent you.',
    };
  }

  if (code === 'user_already_exists' || lower.includes('already registered')) {
    return {
      message: 'An account already exists for this email address. Try signing in instead.',
    };
  }

  if (code === 'weak_password' || lower.includes('password should be at least')) {
    return { message: 'Please choose a longer password — at least 8 characters.' };
  }

  if (lower.includes('different from the old password')) {
    return { message: 'Please choose a password you have not used before.' };
  }

  // ── OTP ──
  if (
    code === 'otp_expired' ||
    lower.includes('token has expired') ||
    lower.includes('otp_expired')
  ) {
    return {
      message: 'That code has expired. Request a new one and enter it within a few minutes.',
    };
  }

  if (
    code === 'otp_disabled' ||
    lower.includes('invalid token') ||
    lower.includes('token not found')
  ) {
    return { message: 'That code is not correct. Please check it and try again.' };
  }

  if (lower.includes('invalid phone') || lower.includes('phone number')) {
    return {
      message: 'That mobile number does not look right. Check the country code and number.',
    };
  }

  // ── Session ──
  if (
    code === 'session_not_found' ||
    lower.includes('session') ||
    lower.includes('jwt expired')
  ) {
    return { message: 'Your session has expired. Please sign in again.' };
  }

  if (err.status === 403 || lower.includes('not authorized')) {
    return { message: 'You do not have access to this. Please sign in again.' };
  }

  return { message: GENERIC };
}
