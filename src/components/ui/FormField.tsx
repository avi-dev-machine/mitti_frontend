/* ── MITTI — Accessible text field ──
 *
 * Wires label, hint and error together with the ids that screen readers need:
 * aria-describedby points at both, aria-invalid marks the state, and the error
 * is a live region so it is announced when it appears rather than only on
 * re-focus.
 */
'use client';

import { forwardRef, useId } from 'react';
import { AlertCircle } from 'lucide-react';
import styles from './controls.module.css';

export interface FormFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  error?: string | null;
  hint?: string;
  optionalLabel?: string;
  /** Rendered inside the input on the right, e.g. a show/hide button. */
  trailing?: React.ReactNode;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  function FormField(
    { label, error, hint, optionalLabel, trailing, className, ...inputProps },
    ref,
  ) {
    const id = useId();
    const hintId = `${id}-hint`;
    const errorId = `${id}-error`;

    const describedBy =
      [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') ||
      undefined;

    return (
      <div className={styles.field}>
        <div className={styles.labelRow}>
          <label className={styles.label} htmlFor={id}>
            {label}
          </label>
          {optionalLabel && <span className={styles.optional}>{optionalLabel}</span>}
        </div>

        <div className={styles.inputWrap}>
          <input
            {...inputProps}
            id={id}
            ref={ref}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={[
              styles.input,
              error ? styles.inputError : '',
              trailing ? styles.hasTrailing : '',
              className ?? '',
            ]
              .filter(Boolean)
              .join(' ')}
          />
          {trailing}
        </div>

        {hint && !error && (
          <p className={styles.hint} id={hintId}>
            {hint}
          </p>
        )}

        {/* role="alert" so the message is announced the moment it appears. */}
        {error && (
          <p className={styles.error} id={errorId} role="alert">
            <AlertCircle size={15} className={styles.errorIcon} aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  },
);
