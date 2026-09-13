/* ── MITTI — Authentication shell ──
 *
 * A Server Component: the auth pages themselves are interactive, but this
 * frame is static, so it ships no JavaScript of its own.
 */
import Link from 'next/link';
import { ArrowLeft, Radio, ShieldCheck, Sprout } from 'lucide-react';
import styles from './AuthLayout.module.css';

/* Contour lines, inlined as a data URI so the brand panel paints with the
   first CSS and never waits on a second request. */
const CONTOUR_TEXTURE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='320' viewBox='0 0 320 320'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='1'%3E%3Cpath d='M-40 60c60-40 140-40 200 0s140 40 200 0'/%3E%3Cpath d='M-40 110c60-40 140-40 200 0s140 40 200 0'/%3E%3Cpath d='M-40 160c60-40 140-40 200 0s140 40 200 0'/%3E%3Cpath d='M-40 210c60-40 140-40 200 0s140 40 200 0'/%3E%3Cpath d='M-40 260c60-40 140-40 200 0s140 40 200 0'/%3E%3Cpath d='M-40 310c60-40 140-40 200 0s140 40 200 0'/%3E%3C/g%3E%3C/svg%3E\")";

const HIGHLIGHTS = [
  {
    icon: Radio,
    title: 'Field units, not guesswork',
    body: 'Soil moisture, temperature, humidity and air quality, read straight from the unit in your field.',
  },
  {
    icon: Sprout,
    title: 'Advice you can act on',
    body: 'Plain-language crop advisories with clear steps — and an honest note when the data is uncertain.',
  },
  {
    icon: ShieldCheck,
    title: 'Your field, your data',
    body: 'Every reading is tied to your account and protected by row-level security.',
  },
];

interface AuthLayoutProps {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  legal?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  legal,
  backHref,
  backLabel = 'Back',
}: AuthLayoutProps) {
  return (
    <div className={styles.shell}>
      {/* Presentational only — hidden from assistive tech so the form is the
          first thing a screen-reader user reaches. */}
      <aside className={styles.brand} aria-hidden="true">
        <div className={styles.brandTexture} style={{ backgroundImage: CONTOUR_TEXTURE }} />
        <div className={styles.brandGlow} />

        <div className={styles.brandTop}>
          <span className={styles.wordmark}>
            <span className={styles.wordmarkMark}>
              <Sprout size={19} />
            </span>
            MITTI
          </span>

          <div>
            <h2 className={styles.brandHeadline}>Understand your field.</h2>
            <p className={styles.brandLead}>
              Crop intelligence rooted in Indian soil. Monitor your devices, read your
              sensors, and know what to do next.
            </p>
          </div>
        </div>

        <ul className={styles.brandPoints}>
          {HIGHLIGHTS.map(({ icon: Icon, title: pointTitle, body }) => (
            <li key={pointTitle} className={styles.brandPoint}>
              <span className={styles.brandPointIcon}>
                <Icon size={16} />
              </span>
              <span>
                <strong style={{ display: 'block', color: 'rgba(244,248,243,0.95)' }}>
                  {pointTitle}
                </strong>
                {body}
              </span>
            </li>
          ))}
        </ul>

        <p className={styles.brandFoot}>
          Assessments are started by the button on your MITTI unit. This app is for
          reading results.
        </p>
      </aside>

      <main className={styles.panel}>
        <div className={styles.card}>
          <span className={styles.mobileBrand}>
            <span className={styles.mobileBrandMark}>
              <Sprout size={18} aria-hidden="true" />
            </span>
            MITTI
          </span>

          <div className={styles.header}>
            {backHref && (
              <Link href={backHref} className={styles.back}>
                <ArrowLeft size={16} aria-hidden="true" />
                {backLabel}
              </Link>
            )}
            <h1 className={styles.title}>{title}</h1>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>

          {children}

          {footer && <p className={styles.footer}>{footer}</p>}
          {legal && <p className={styles.legal}>{legal}</p>}
        </div>
      </main>
    </div>
  );
}

export { styles as authStyles };
