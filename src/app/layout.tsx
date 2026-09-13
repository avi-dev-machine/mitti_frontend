/* ── MITTI — Root layout ──
 *
 * Resolves the session on the server so the shell renders already knowing who
 * is signed in. getUser() validates the token with Supabase rather than
 * trusting the cookie, and the profile is read through RLS, so this layout
 * cannot return another user's data even if the cookie were tampered with.
 */
import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Sans_Bengali, Noto_Sans_Devanagari } from 'next/font/google';
import type { User } from '@supabase/supabase-js';
import { Providers } from '@/components/providers/Providers';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types';
import './globals.css';

/* Self-hosted at build time, so there is no third-party request on first
   paint. Noto covers the Devanagari and Bengali the spec requires; each face
   exposes a CSS variable that globals.css picks up in --font-sans. */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-devanagari',
});

const notoBengali = Noto_Sans_Bengali({
  subsets: ['bengali'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-bengali',
});

export const metadata: Metadata = {
  title: {
    default: 'MITTI — Crop Intelligence',
    template: '%s · MITTI',
  },
  description:
    'Crop intelligence rooted in Indian soil. Monitor your MITTI field devices, read sensor data, and act on crop advisories.',
  applicationName: 'MITTI',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MITTI',
  },
  formatDetection: { telephone: false },
  icons: {
    icon: '/icons/icon-192.jpg',
    apple: '/icons/icon-192.jpg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Pinch-zoom stays available: capping it would fail WCAG 1.4.4, and text
  // scaling matters for the farmers this app is built for.
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2E7D32' },
    { media: '(prefers-color-scheme: dark)', color: '#1B5E20' },
  ],
};

async function loadSession(): Promise<{ user: User | null; profile: Profile | null }> {
  if (!isSupabaseConfigured()) return { user: null, profile: null };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { user: null, profile: null };

    // RLS restricts this to the caller's own row; maybeSingle avoids throwing
    // in the window between signup and the profile trigger completing.
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    return { user, profile: (profile as Profile | null) ?? null };
  } catch {
    // A Supabase outage must not blank the whole app. The proxy still guards
    // protected routes, and pages render their own unavailable states.
    return { user: null, profile: null };
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await loadSession();

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${notoDevanagari.variable} ${notoBengali.variable}`}
    >
      <body>
        <a href="#main-content" className="visually-hidden">
          Skip to main content
        </a>
        <Providers initialUser={user} initialProfile={profile}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
