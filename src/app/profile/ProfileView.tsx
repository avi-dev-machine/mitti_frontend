/* ── MITTI — Profile ──
 *
 * The signed-in user's own details. Identity comes from the session token, not
 * from anything the page sends, so there is no way to load or edit another
 * user's profile from here.
 *
 * Email and phone are shown but not edited here: both are Supabase Auth
 * credentials, and changing either requires a re-verification flow of its own.
 */
'use client';

import { useState } from 'react';
import { Mail, Save, Smartphone, UserRound } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Alert } from '@/components/ui/Alert';
import { FormField } from '@/components/ui/FormField';
import { Spinner } from '@/components/ui/Spinner';
import { useSession } from '@/components/providers/SessionProvider';
import { profileApi } from '@/lib/api';
import { ApiError } from '@/lib/api';
import { validateFullName } from '@/lib/auth/validation';
import { formatDateTime, initialsOf } from '@/lib/utils';
import styles from '@/app/settings/settings.module.css';

export function ProfileView() {
  const { user, profile, displayName, setProfile } = useSession();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  /* The profile can arrive after first paint, or change after a save. Adopt
     the new value during render rather than in an effect, so the field never
     shows one frame of the previous name. */
  const [syncedName, setSyncedName] = useState(profile?.full_name ?? '');
  if ((profile?.full_name ?? '') !== syncedName) {
    setSyncedName(profile?.full_name ?? '');
    setFullName(profile?.full_name ?? '');
  }

  const isDirty = (profile?.full_name ?? '') !== fullName;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;

    const problemWithName = validateFullName(fullName);
    setNameError(problemWithName);
    if (problemWithName) return;

    setSaving(true);
    setProblem(null);
    setNotice(null);

    try {
      const updated = await profileApi.update({ full_name: fullName.trim() });
      setProfile(updated);
      setNotice('Your profile has been saved.');
    } catch (error) {
      setProblem(
        error instanceof ApiError
          ? error.friendlyMessage
          : 'Your profile could not be saved. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  const email = profile?.email ?? user?.email ?? null;
  const phone = profile?.phone ?? user?.phone ?? null;

  return (
    <AppShell>
      <div className={styles.page}>
        <header>
          <h1 className={styles.title}>Your profile</h1>
          <p className={styles.lead}>The details MITTI uses to greet you and reach you.</p>
        </header>

        {notice && (
          <Alert tone="success" onDismiss={() => setNotice(null)}>
            {notice}
          </Alert>
        )}
        {problem && (
          <Alert tone="error" onDismiss={() => setProblem(null)}>
            {problem}
          </Alert>
        )}

        <section className={styles.section}>
          <div className={styles.identity}>
            <span className={styles.avatar} aria-hidden="true">
              {initialsOf(displayName)}
            </span>
            <div className={styles.identityBody}>
              <p className={styles.identityName}>{displayName}</p>
              <p className={styles.identityMeta}>
                {profile?.role
                  ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
                  : 'Farmer'}
                {profile?.created_at ? ` · Joined ${formatDateTime(profile.created_at)}` : ''}
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionIcon}>
              <UserRound size={18} aria-hidden="true" />
            </span>
            <div>
              <h2 className={styles.sectionTitle}>Your details</h2>
              <p className={styles.sectionLead}>How MITTI addresses you across the app.</p>
            </div>
          </div>

          <form className={styles.form} noValidate onSubmit={handleSubmit}>
            <FormField
              label="Full name"
              autoComplete="name"
              placeholder="Your name"
              value={fullName}
              error={nameError}
              disabled={saving}
              onChange={(e) => {
                setFullName(e.target.value);
                setNameError(null);
              }}
            />

            <div className={styles.formActions}>
              <button type="submit" className="btn btn-primary" disabled={saving || !isDirty}>
                {saving ? <Spinner size={16} /> : <Save size={16} aria-hidden="true" />}
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              {isDirty && !saving && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setFullName(profile?.full_name ?? '');
                    setNameError(null);
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionIcon}>
              <Mail size={18} aria-hidden="true" />
            </span>
            <div>
              <h2 className={styles.sectionTitle}>Sign-in details</h2>
              <p className={styles.sectionLead}>
                How you sign in. Changing either needs re-verification, so it is not done here.
              </p>
            </div>
          </div>

          <div className={styles.rows}>
            <div className={styles.row}>
              <div className={styles.rowBody}>
                <p className={styles.rowLabel}>Email address</p>
                <p className={styles.rowValue}>{email ?? 'Not set'}</p>
              </div>
              {user?.email_confirmed_at ? (
                <span className="badge badge-green">Confirmed</span>
              ) : email ? (
                <span className="badge badge-yellow">Not confirmed</span>
              ) : null}
            </div>

            <div className={styles.row}>
              <div className={styles.rowBody}>
                <p className={styles.rowLabel}>
                  <Smartphone
                    size={15}
                    aria-hidden="true"
                    style={{ display: 'inline', verticalAlign: -2, marginRight: 6 }}
                  />
                  Mobile number
                </p>
                <p className={styles.rowValue}>{phone ?? 'Not set'}</p>
              </div>
              {user?.phone_confirmed_at ? (
                <span className="badge badge-green">Verified</span>
              ) : phone ? (
                <span className="badge badge-grey">Not verified</span>
              ) : null}
            </div>

            <div className={styles.row}>
              <div className={styles.rowBody}>
                <p className={styles.rowLabel}>Account created</p>
                <p className={styles.rowValue}>
                  {formatDateTime(profile?.created_at ?? user?.created_at ?? null)}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
