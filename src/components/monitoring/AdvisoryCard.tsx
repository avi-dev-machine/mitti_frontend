/* ── MITTI — Advisory card ──
 *
 * Renders the advisory exactly as the Raspberry Pi produced it. Nothing is
 * reworded, strengthened, summarised or inferred, and the uncertainty note is
 * never dropped — an advisory that says one image cannot confirm a disease
 * must keep saying so. Both spec documents make this a hard rule.
 */
'use client';

import Link from 'next/link';
import { AlertTriangle, CalendarClock, ChevronRight, Phone } from 'lucide-react';
import type { Advisory, SeverityLevel } from '@/lib/types';
import {
  formatDateTime,
  getSeverityLabel,
  severityBadgeClass,
  timeAgo,
} from '@/lib/utils';
import styles from './AdvisoryCard.module.css';

const RAIL: Record<string, string> = {
  green: styles.railGreen,
  yellow: styles.railYellow,
  orange: styles.railOrange,
  red: styles.railRed,
  grey: styles.railGrey,
};

interface AdvisoryCardProps {
  advisory: Advisory;
  /** Compact omits guidance and evidence — for list views. */
  compact?: boolean;
  /** Adds a "view all" link in the footer. */
  href?: string;
  linkLabel?: string;
}

export function AdvisoryCard({
  advisory,
  compact = false,
  href,
  linkLabel = 'View all advisories',
}: AdvisoryCardProps) {
  const severity = (advisory.severity ?? 'grey') as SeverityLevel;
  const guidance = advisory.step_by_step_guidance ?? [];
  const evidence = advisory.evidence_used ?? [];

  return (
    <article className={`${styles.card} ${compact ? styles.compact : ''}`}>
      <span className={`${styles.rail} ${RAIL[severity] ?? styles.railGrey}`} aria-hidden="true" />

      <header className={styles.head}>
        <span className={severityBadgeClass(severity)}>
          <span className={`severity-dot ${severity}`} aria-hidden="true" />
          {getSeverityLabel(severity)}
        </span>
        {advisory.source === 'qwen_validated' ? (
          <span className="badge badge-blue">AI validated</span>
        ) : (
          <span className="badge badge-grey">Fallback advisory</span>
        )}
        <time className={styles.timestamp} dateTime={advisory.created_at}>
          {timeAgo(advisory.created_at)}
        </time>
      </header>

      {advisory.primary_problem && <h3 className={styles.problem}>{advisory.primary_problem}</h3>}
      {advisory.summary && <p className={styles.summary}>{advisory.summary}</p>}

      {!compact && evidence.length > 0 && (
        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>What was observed</h4>
          <ul className={styles.evidence}>
            {evidence.map((item, index) => (
              <li key={`${item}-${index}`} className={styles.evidenceItem}>
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!compact && guidance.length > 0 && (
        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>What to do</h4>
          <ol className={styles.steps}>
            {guidance.map((step, index) => (
              <li key={`${step}-${index}`} className={styles.step}>
                <span className={styles.stepNumber} aria-hidden="true">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {!compact && advisory.recheck_plan && (
        <p className={`${styles.notice} ${styles.noticeRecheck}`}>
          <CalendarClock size={17} className={styles.noticeIcon} aria-hidden="true" />
          <span>
            <strong>When to check again: </strong>
            {advisory.recheck_plan}
          </span>
        </p>
      )}

      {advisory.uncertainty_note && (
        <p className={`${styles.notice} ${styles.noticeUncertainty}`}>
          <AlertTriangle size={17} className={styles.noticeIcon} aria-hidden="true" />
          <span>
            <strong>Important: </strong>
            {advisory.uncertainty_note}
          </span>
        </p>
      )}

      {!compact && advisory.escalation_note && (
        <p className={`${styles.notice} ${styles.noticeEscalation}`}>
          <Phone size={17} className={styles.noticeIcon} aria-hidden="true" />
          <span>
            <strong>When to seek expert help: </strong>
            {advisory.escalation_note}
          </span>
        </p>
      )}

      {!compact && (
        <details className={styles.technical}>
          {/* Operators need the identifiers; farmers do not, so they stay folded. */}
          <summary className={styles.technicalToggle}>Technical details</summary>
          <div className={styles.technicalBody}>
            <span className={styles.technicalKey}>Advisory ID</span>
            <span className={styles.technicalValue}>{advisory.id}</span>
            <span className={styles.technicalKey}>Assessment</span>
            <span className={styles.technicalValue}>{advisory.assessment_id || 'Not recorded'}</span>
            <span className={styles.technicalKey}>Device</span>
            <span className={styles.technicalValue}>{advisory.device_id}</span>
            <span className={styles.technicalKey}>Created</span>
            <span className={styles.technicalValue}>{formatDateTime(advisory.created_at)}</span>
          </div>
        </details>
      )}

      <footer className={styles.meta}>
        {typeof advisory.confidence === 'number' && (
          <span>Confidence {Math.round(advisory.confidence * 100)}%</span>
        )}
        <span>{formatDateTime(advisory.created_at)}</span>
        {href && (
          <Link href={href} className={styles.link}>
            {linkLabel}
            <ChevronRight size={15} aria-hidden="true" style={{ display: 'inline', verticalAlign: -3 }} />
          </Link>
        )}
      </footer>
    </article>
  );
}
