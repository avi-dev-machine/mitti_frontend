/* ── MITTI — One-time-code input ──
 *
 * Six single-character boxes rather than one long field, because on a phone
 * that gives immediate feedback on each digit and keeps the whole code visible
 * while typing.
 *
 * Behaviours that matter and are easy to get wrong:
 *   - Paste anywhere fills the whole code (people paste from the SMS).
 *   - Backspace on an empty box steps back and clears the previous one.
 *   - Arrow keys move between boxes; Home/End jump to the ends.
 *   - inputMode="numeric" raises the number pad, not the full keyboard.
 *   - autoComplete="one-time-code" lets iOS and Android offer the SMS code.
 *   - The code is never written anywhere but component state.
 */
'use client';

import { useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import styles from './OtpInput.module.css';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Fired when the last digit lands, so the form can submit itself. */
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  error?: string | null;
  /** Describes the code to assistive technology. */
  label?: string;
  autoFocus?: boolean;
}

export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  error = null,
  label = 'Verification code',
  autoFocus = true,
}: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(length, ' ').slice(0, length).split('');

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  function commit(next: string) {
    const clean = next.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
    return clean;
  }

  function focusBox(index: number) {
    const clamped = Math.max(0, Math.min(length - 1, index));
    const el = refs.current[clamped];
    el?.focus();
    el?.select();
  }

  function handleChange(index: number, raw: string) {
    const typed = raw.replace(/\D/g, '');
    if (!typed) return;

    // Typing into a box replaces that position; a multi-character value means
    // the keyboard autofilled the whole code, so spread it from here.
    const chars = value.split('');
    for (let i = 0; i < typed.length && index + i < length; i += 1) {
      chars[index + i] = typed[i];
    }
    const next = commit(chars.join('').slice(0, length));
    focusBox(Math.min(index + typed.length, length - 1));
    if (next.length === length) refs.current[length - 1]?.blur();
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case 'Backspace': {
        event.preventDefault();
        const chars = value.split('');
        if (chars[index]) {
          chars[index] = '';
          commit(chars.join(''));
        } else if (index > 0) {
          chars[index - 1] = '';
          commit(chars.join(''));
          focusBox(index - 1);
        }
        break;
      }
      case 'Delete': {
        event.preventDefault();
        const chars = value.split('');
        chars[index] = '';
        commit(chars.join(''));
        break;
      }
      case 'ArrowLeft':
        event.preventDefault();
        focusBox(index - 1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        focusBox(index + 1);
        break;
      case 'Home':
        event.preventDefault();
        focusBox(0);
        break;
      case 'End':
        event.preventDefault();
        focusBox(length - 1);
        break;
      default:
        break;
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;
    const next = commit(pasted);
    focusBox(Math.min(next.length, length - 1));
  }

  return (
    <div className={styles.wrapper}>
      {/* role="group" ties the six boxes together under one name. */}
      <div className={styles.boxes} role="group" aria-label={label}>
        {digits.map((digit, index) => {
          const char = digit.trim();
          return (
            <input
              key={index}
              ref={(el) => {
                refs.current[index] = el;
              }}
              className={`${styles.box} ${error ? styles.boxError : ''}`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              maxLength={length}
              value={char}
              data-filled={char !== ''}
              disabled={disabled}
              aria-label={`Digit ${index + 1} of ${length}`}
              aria-invalid={error ? true : undefined}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              onFocus={(e) => e.target.select()}
            />
          );
        })}
      </div>

      {error && (
        <p className={styles.error} role="alert">
          <AlertCircle size={15} aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
