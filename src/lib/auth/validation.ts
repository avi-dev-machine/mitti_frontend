/* ── MITTI — Form validation ──
 *
 * Deliberately dependency-free. These forms are short and the rules are few,
 * so a schema library would add weight to the first-load bundle of an app
 * whose users are on rural mobile connections.
 *
 * Every validator returns `null` when valid, or a sentence to show beside the
 * field. Messages are written for farmers, not developers.
 */

export type FieldError = string | null;

/* ── Email ──
 * Pragmatic rather than RFC-complete: catches real typos without rejecting
 * valid but unusual addresses. Supabase performs the authoritative check. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(value: string): FieldError {
  const email = value.trim();
  if (!email) return 'Enter your email address.';
  if (!EMAIL_RE.test(email)) return 'That does not look like a valid email address.';
  return null;
}

/* ── Password ── */
export const MIN_PASSWORD_LENGTH = 8;

export function validatePassword(value: string): FieldError {
  if (!value) return 'Enter a password.';
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!/[a-zA-Z]/.test(value)) return 'Include at least one letter.';
  if (!/[0-9]/.test(value)) return 'Include at least one number.';
  return null;
}

export function validatePasswordConfirmation(
  password: string,
  confirmation: string,
): FieldError {
  if (!confirmation) return 'Re-enter your password.';
  if (password !== confirmation) return 'The two passwords do not match.';
  return null;
}

export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  level: PasswordStrength;
  label: string;
}

/**
 * A rough strength signal for the meter beside the password field.
 *
 * It measures variety and length, not true entropy — it exists to nudge
 * people away from `password1`, and never blocks submission on its own.
 */
export function scorePassword(value: string): PasswordStrengthResult {
  if (!value) return { score: 0, level: 'weak', label: 'Too short' };

  let score = 0;
  if (value.length >= MIN_PASSWORD_LENGTH) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value)) score += 1;

  const clamped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  const levels: Record<number, { level: PasswordStrength; label: string }> = {
    0: { level: 'weak', label: 'Too short' },
    1: { level: 'weak', label: 'Weak' },
    2: { level: 'fair', label: 'Fair' },
    3: { level: 'good', label: 'Good' },
    4: { level: 'strong', label: 'Strong' },
  };
  return { score: clamped, ...levels[clamped] };
}

/* ── Full name ── */
export function validateFullName(value: string): FieldError {
  const name = value.trim();
  if (!name) return 'Enter your name.';
  if (name.length < 2) return 'Enter your full name.';
  if (name.length > 80) return 'That name is too long.';
  return null;
}

/* ── Phone ──
 * Supabase requires E.164: a leading +, country code, then subscriber digits,
 * 15 digits maximum in total. We validate the assembled number rather than the
 * national part, because country rules vary too widely to encode here. */
const E164_RE = /^\+[1-9]\d{6,14}$/;

/** Strip everything a person might type for readability: spaces, dashes, parens. */
export function normalisePhoneDigits(value: string): string {
  return value.replace(/[^\d]/g, '');
}

/** Assemble a dial code and national number into E.164. */
export function toE164(dialCode: string, nationalNumber: string): string {
  const digits = normalisePhoneDigits(nationalNumber);
  const code = dialCode.startsWith('+') ? dialCode : `+${dialCode}`;
  return `${code}${digits}`;
}

export function validatePhone(dialCode: string, nationalNumber: string): FieldError {
  const digits = normalisePhoneDigits(nationalNumber);
  if (!digits) return 'Enter your mobile number.';
  if (digits.length < 6) return 'That mobile number looks too short.';
  const e164 = toE164(dialCode, digits);
  if (!E164_RE.test(e164)) return 'That mobile number does not look right.';
  return null;
}

/** Mask a number for display on the OTP screen: +91 ••••• ••210 */
export function maskPhone(e164: string): string {
  if (e164.length < 5) return e164;
  const tail = e164.slice(-3);
  const head = e164.slice(0, Math.min(3, e164.length - 3));
  return `${head} ••••• ••${tail}`;
}

/* ── Device ID ──
 * MITTI units are labelled MITTI-DEVICE-001. Validating the shape before a
 * lookup means an arbitrary NFC tag is rejected locally, and a mistyped id
 * gives a useful message instead of "not found". */
const DEVICE_ID_RE = /^MITTI-[A-Z0-9]+-\d{1,6}$/i;

export function validateDeviceId(value: string): FieldError {
  const id = value.trim();
  if (!id) return 'Enter the device ID printed on your MITTI unit.';
  if (!DEVICE_ID_RE.test(id)) {
    return 'Device IDs look like MITTI-DEVICE-001. Check the label on your unit.';
  }
  return null;
}

export function isValidDeviceId(value: string): boolean {
  return validateDeviceId(value) === null;
}
