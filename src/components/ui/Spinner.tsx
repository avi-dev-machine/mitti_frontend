/* ── MITTI — Spinner ──
 *
 * Decorative by default: when a spinner sits inside a button whose label
 * already changed to "Sending…", announcing it again is noise. Pass `label`
 * only when the spinner is the sole indication that something is happening.
 */
import styles from './Spinner.module.css';

interface SpinnerProps {
  size?: number;
  /** Announced to screen readers. Omit when nearby text already says it. */
  label?: string;
  className?: string;
}

export function Spinner({ size = 16, label, className }: SpinnerProps) {
  return (
    <span
      className={`${styles.spinner} ${className ?? ''}`}
      style={{ width: size, height: size, borderWidth: Math.max(2, Math.round(size / 8)) }}
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
