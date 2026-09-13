/* ── MITTI — Inline alert ──
 *
 * Colour carries the tone, but the icon and wording carry the meaning, so the
 * message still reads correctly in greyscale or to a screen reader.
 *
 * Errors use role="alert" (interrupts, announced immediately); everything else
 * uses role="status" (polite, waits for a pause).
 */
'use client';

import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import styles from './Alert.module.css';

export type AlertTone = 'error' | 'warning' | 'success' | 'info';

const ICONS = {
  error: AlertCircle,
  warning: AlertTriangle,
  success: CheckCircle2,
  info: Info,
} as const;

interface AlertProps {
  tone?: AlertTone;
  title?: string;
  children: React.ReactNode;
  /** Renders a dismiss button when provided. */
  onDismiss?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function Alert({
  tone = 'info',
  title,
  children,
  onDismiss,
  actions,
  className,
}: AlertProps) {
  const Icon = ICONS[tone];

  return (
    <div
      className={`${styles.alert} ${styles[tone]} ${className ?? ''}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <Icon size={18} className={styles.icon} aria-hidden="true" />
      <div className={styles.body}>
        {title && <p className={styles.title}>{title}</p>}
        <div>{children}</div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
      {onDismiss && (
        <button type="button" className={styles.dismiss} onClick={onDismiss} aria-label="Dismiss">
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
