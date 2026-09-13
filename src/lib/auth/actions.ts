/* ── MITTI — Client-side auth operations ──
 *
 * One wrapper per Supabase auth call. Each returns a discriminated result
 * instead of throwing, so components branch on data rather than try/catch, and
 * every failure passes through translateAuthError on the way out — there is no
 * path by which a raw Supabase message reaches the screen.
 */
'use client';

import { createClient } from '@/lib/supabase/client';
import { translateAuthError, type FriendlyError } from './errors';

export type AuthResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: FriendlyError };

function fail(error: unknown): { ok: false; error: FriendlyError } {
  return { ok: false, error: translateAuthError(error) };
}

/** Absolute URL for Supabase to redirect back to. Browser-only. */
export function callbackUrl(next?: string): string {
  const base = `${window.location.origin}/auth/callback`;
  return next ? `${base}?next=${encodeURIComponent(next)}` : base;
}

/* ── Email and password ── */

export interface SignUpInput {
  email: string;
  password: string;
  fullName: string;
  /** Optional E.164 number, stored on the profile. Not used to sign in. */
  phone?: string;
}

export interface SignUpOutcome {
  /** True when Supabase requires the user to confirm their email first. */
  needsEmailConfirmation: boolean;
  email: string;
}

export async function signUpWithEmail(input: SignUpInput): Promise<AuthResult<SignUpOutcome>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: {
        // Read by the handle_new_user trigger to seed public.profiles.
        data: { full_name: input.fullName.trim(), phone: input.phone ?? null },
        emailRedirectTo: callbackUrl('/dashboard'),
      },
    });

    if (error) return fail(error);

    // Supabase returns a user with no session when confirmation is required.
    // It also returns an obfuscated user with an empty identities array when
    // the address is already registered — treating that as success would tell
    // the caller an account exists, so surface it as the duplicate it is.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return fail({ code: 'user_already_exists' });
    }

    return {
      ok: true,
      data: {
        needsEmailConfirmation: !data.session,
        email: input.email.trim().toLowerCase(),
      },
    };
  } catch (error) {
    return fail(error);
  }
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AuthResult> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    return error ? fail(error) : { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

export async function resendEmailConfirmation(email: string): Promise<AuthResult> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: callbackUrl('/dashboard') },
    });
    return error ? fail(error) : { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

/* ── Password recovery ── */

export async function sendPasswordReset(email: string): Promise<AuthResult> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: callbackUrl('/reset-password') },
    );
    return error ? fail(error) : { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

export async function updatePassword(newPassword: string): Promise<AuthResult> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return error ? fail(error) : { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

/* ── Phone OTP ──
 *
 * These call Supabase Auth directly. Supabase generates, sends and verifies
 * the code through whichever SMS provider the project has configured; MITTI
 * never sees, stores or logs the code. If phone sign-in is not enabled on the
 * project, Supabase returns an error which translateAuthError turns into a
 * setup message — there is deliberately no fallback that pretends to verify.
 */

export async function sendPhoneOtp(e164Phone: string): Promise<AuthResult> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      phone: e164Phone,
      // Existing users sign in; new numbers get an account. Set this to false
      // to make phone sign-in available only to numbers you have pre-created.
      options: { shouldCreateUser: true },
    });
    return error ? fail(error) : { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

export async function verifyPhoneOtp(
  e164Phone: string,
  token: string,
): Promise<AuthResult> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      phone: e164Phone,
      token,
      type: 'sms',
    });
    if (error) return fail(error);
    // A verified code without a session means the sign-in did not complete;
    // do not let the caller navigate as though it had.
    if (!data.session) return fail({ message: 'session_not_found' });
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

/* ── Session ── */

export async function signOut(): Promise<AuthResult> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    return error ? fail(error) : { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}
