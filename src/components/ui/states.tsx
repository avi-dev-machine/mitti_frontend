/* ── MITTI — Empty, error and loading states ──
 *
 * Every list and panel in MITTI has all three. The spec is explicit that a
 * farmer must never see a blank card: an absence has to explain what is
 * missing, why it matters, and what to do next.
 */
import type { LucideIcon } from 'lucide-react';
import { Inbox, RefreshCw, WifiOff } from 'lucide-react';
import styles from './states.module.css';

type Tone = 'neutral' | 'positive' | 'warning' | 'error';

const TONE_CLASS: Record<Tone, string> = {
  neutral: styles.iconNeutral,
  positive: styles.iconPositive,
  warning: styles.iconWarning,
  error: styles.iconError,
};

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  tone?: Tone;
  /** Lighter treatment for a state nested inside an existing card. */
  inline?: boolean;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  tone = 'neutral',
  inline = false,
}: EmptyStateProps) {
  return (
    <div className={`${styles.state} ${inline ? styles.stateInline : ''}`}>
      <span className={`${styles.iconRing} ${TONE_CLASS[tone]}`}>
        <Icon size={24} aria-hidden="true" />
      </span>
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.actions}>{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  /** True when the cause is connectivity — changes the icon and wording. */
  offline?: boolean;
  inline?: boolean;
}

export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = 'Try again',
  offline = false,
  inline = false,
}: ErrorStateProps) {
  const resolvedTitle =
    title ?? (offline ? 'You are offline' : 'This information could not be loaded');
  const resolvedDescription =
    description ??
    (offline
      ? 'Showing the latest saved information. Reconnect to refresh.'
      : 'The connection to MITTI failed. Check your internet and try again.');

  return (
    <div className={`${styles.state} ${inline ? styles.stateInline : ''}`}>
      <span className={`${styles.iconRing} ${offline ? styles.iconWarning : styles.iconError}`}>
        {offline ? (
          <WifiOff size={24} aria-hidden="true" />
        ) : (
          <RefreshCw size={24} aria-hidden="true" />
        )}
      </span>
      <h3 className={styles.title}>{resolvedTitle}</h3>
      <p className={styles.description}>{resolvedDescription}</p>
      {onRetry && (
        <div className={styles.actions}>
          <button type="button" className="btn btn-secondary" onClick={onRetry}>
            <RefreshCw size={16} aria-hidden="true" />
            {retryLabel}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Skeletons ──
 * Marked aria-hidden and paired with an sr-only "Loading" message from the
 * caller, so assistive tech hears one announcement rather than a wall of
 * meaningless boxes. */

export function SkeletonLine({ width = '100%' }: { width?: string }) {
  return <span className={`skeleton ${styles.skelLine}`} style={{ width }} aria-hidden="true" />;
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className={styles.skelCard} aria-hidden="true">
      <span className={`skeleton ${styles.skelTitle}`} />
      {Array.from({ length: lines }).map((_, i) => (
        <span
          key={i}
          className={`skeleton ${styles.skelLine}`}
          style={{ width: `${92 - i * 14}%` }}
        />
      ))}
      <span className={`skeleton ${styles.skelChip}`} />
    </div>
  );
}

export function SkeletonBlock({ height }: { height: number | string }) {
  return (
    <span
      className={`skeleton ${styles.skelBlock}`}
      style={{ height: typeof height === 'number' ? `${height}px` : height, display: 'block' }}
      aria-hidden="true"
    />
  );
}

/** Announces loading once, for screen readers, while skeletons render. */
export function LoadingAnnouncement({ label }: { label: string }) {
  return (
    <span className="visually-hidden" role="status" aria-live="polite">
      {label}
    </span>
  );
}
