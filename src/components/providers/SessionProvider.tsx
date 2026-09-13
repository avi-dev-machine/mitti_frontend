/* ── MITTI — Session context ──
 *
 * The signed-in user and their profile, available anywhere in the app.
 *
 * The user is passed down from the server (the root layout already resolved it
 * with a validated getUser call), so there is no client-side "checking…"
 * flicker on first paint — the shell renders already knowing who is signed in.
 * The subscription that follows only keeps that in step with sign-out, token
 * refresh, and changes made in another tab.
 */
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { signOut as signOutAction } from '@/lib/auth/actions';
import type { Profile } from '@/lib/types';

interface SessionContextValue {
  user: User | null;
  profile: Profile | null;
  /** The best name available: profile name, then metadata, then the address. */
  displayName: string;
  isAuthenticated: boolean;
  setProfile: (profile: Profile | null) => void;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

interface SessionProviderProps {
  initialUser: User | null;
  initialProfile: Profile | null;
  children: React.ReactNode;
}

function deriveDisplayName(user: User | null, profile: Profile | null): string {
  const fromProfile = profile?.full_name?.trim();
  if (fromProfile) return fromProfile;

  const fromMetadata =
    (user?.user_metadata?.full_name as string | undefined)?.trim() ??
    (user?.user_metadata?.name as string | undefined)?.trim();
  if (fromMetadata) return fromMetadata;

  // Fall back to the local part of the email, or the phone number. Never show
  // the raw uuid — it means nothing to the person reading it.
  if (user?.email) return user.email.split('@')[0];
  if (user?.phone) return user.phone;
  return 'there';
}

export function SessionProvider({
  initialUser,
  initialProfile,
  children,
}: SessionProviderProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(initialUser);
  const [profile, setProfile] = useState<Profile | null>(initialProfile);

  /* The server re-resolves the session on every navigation. When what it sends
     differs from what is held here, adopt it during render rather than in an
     effect: React restarts the render immediately, so the shell never paints
     one frame with a stale user. */
  const [syncedUser, setSyncedUser] = useState<User | null>(initialUser);
  if (initialUser !== syncedUser) {
    setSyncedUser(initialUser);
    setUser(initialUser);
  }

  const [syncedProfile, setSyncedProfile] = useState<Profile | null>(initialProfile);
  if (initialProfile !== syncedProfile) {
    setSyncedProfile(initialProfile);
    setProfile(initialProfile);
  }

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null);

      if (event === 'SIGNED_OUT') {
        setProfile(null);
        // Re-run the server render so the proxy redirects to /login rather
        // than leaving protected markup on screen.
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const signOut = useCallback(async () => {
    await signOutAction();
    setUser(null);
    setProfile(null);
    // replace, not push: Back must not return to the signed-in dashboard.
    router.replace('/login');
    router.refresh();
  }, [router]);

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      profile,
      displayName: deriveDisplayName(user, profile),
      isAuthenticated: Boolean(user),
      setProfile,
      signOut,
    }),
    [user, profile, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used inside a SessionProvider.');
  }
  return context;
}
