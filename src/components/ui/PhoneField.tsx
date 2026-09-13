/* ── MITTI — Country code + mobile number ──
 *
 * Supabase phone auth requires E.164, so the country code is not decoration:
 * it is part of the identifier. A native <select> is used on purpose — it gets
 * the platform picker on mobile, full keyboard support, and screen-reader
 * behaviour for free, which a custom dropdown would have to re-earn.
 */
'use client';

import { useId } from 'react';
import { AlertCircle } from 'lucide-react';
import { COUNTRIES, type Country, phonePlaceholder } from '@/lib/auth/countries';
import styles from './controls.module.css';

interface PhoneFieldProps {
  country: Country;
  onCountryChange: (country: Country) => void;
  value: string;
  onValueChange: (value: string) => void;
  error?: string | null;
  hint?: string;
  disabled?: boolean;
  label?: string;
  autoFocus?: boolean;
}

export function PhoneField({
  country,
  onCountryChange,
  value,
  onValueChange,
  error,
  hint,
  disabled = false,
  label = 'Mobile number',
  autoFocus = false,
}: PhoneFieldProps) {
  const id = useId();
  const numberId = `${id}-number`;
  const countryId = `${id}-country`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy =
    [hint && !error ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') ||
    undefined;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={numberId}>
        {label}
      </label>

      <div className={styles.phoneRow}>
        <select
          id={countryId}
          className={styles.select}
          value={country.code}
          disabled={disabled}
          aria-label="Country calling code"
          onChange={(e) => {
            const next = COUNTRIES.find((c) => c.code === e.target.value);
            if (next) onCountryChange(next);
          }}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.dial}
            </option>
          ))}
        </select>

        <input
          id={numberId}
          className={`${styles.input} ${error ? styles.inputError : ''}`}
          type="tel"
          // inputMode raises the phone keypad; autoComplete lets the browser
          // offer a number the user has already saved.
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={phonePlaceholder(country)}
          value={value}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          // Allow the separators people naturally type, reject everything else.
          onChange={(e) => onValueChange(e.target.value.replace(/[^\d\s-]/g, ''))}
        />
      </div>

      {hint && !error && (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      )}

      {error && (
        <p className={styles.error} id={errorId} role="alert">
          <AlertCircle size={15} className={styles.errorIcon} aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
