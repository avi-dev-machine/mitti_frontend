/* ── MITTI — Password field with reveal toggle and optional strength meter ── */
'use client';

import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { scorePassword } from '@/lib/auth/validation';
import { FormField, type FormFieldProps } from './FormField';
import styles from './controls.module.css';

interface PasswordFieldProps extends Omit<FormFieldProps, 'type' | 'trailing'> {
  /** Show the strength meter. Signup only — never on the sign-in form. */
  showStrength?: boolean;
}

export function PasswordField({
  showStrength = false,
  value,
  ...props
}: PasswordFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const meterId = useId();
  const password = typeof value === 'string' ? value : '';
  const strength = scorePassword(password);

  return (
    <div className={styles.field}>
      <FormField
        {...props}
        value={value}
        type={revealed ? 'text' : 'password'}
        trailing={
          <button
            type="button"
            className={styles.trailingButton}
            onClick={() => setRevealed((r) => !r)}
            // The label states the action, not the state, so a screen reader
            // user hears what pressing it will do.
            aria-label={revealed ? 'Hide password' : 'Show password'}
            aria-pressed={revealed}
            tabIndex={0}
          >
            {revealed ? (
              <EyeOff size={18} aria-hidden="true" />
            ) : (
              <Eye size={18} aria-hidden="true" />
            )}
          </button>
        }
      />

      {showStrength && password.length > 0 && (
        <div className={styles.strength}>
          <div
            className={styles.strengthTrack}
            role="meter"
            id={meterId}
            aria-valuenow={strength.score}
            aria-valuemin={0}
            aria-valuemax={4}
            aria-label={`Password strength: ${strength.label}`}
          >
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={styles.strengthSegment}
                data-filled={i < strength.score}
                data-level={strength.level}
              />
            ))}
          </div>
          <span className={styles.strengthLabel}>{strength.label}</span>
        </div>
      )}
    </div>
  );
}
