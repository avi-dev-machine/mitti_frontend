/* ── MITTI — Application shell ──
 *
 * Desktop gets a persistent collapsible sidebar; mobile gets a bottom bar.
 * They are separate layouts rather than one squeezed into the other, which is
 * what the refinement spec asks for.
 *
 * The shell assumes a session exists: src/proxy.ts has already redirected
 * signed-out visitors, so nothing here needs a loading-vs-signed-out branch.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Gauge,
  History,
  LayoutDashboard,
  LogOut,
  Radio,
  Settings,
  Sprout,
  User,
  Wheat,
} from 'lucide-react';
import { useSession } from '@/components/providers/SessionProvider';
import { DeviceSelector } from '@/components/DeviceSelector';
import { ConnectionBanner } from '@/components/ConnectionBanner';
import { useDevices } from '@/lib/hooks/useDevices';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import { useUiStore } from '@/lib/store';
import { initialsOf, severityRank } from '@/lib/utils';
import styles from './AppShell.module.css';

const PRIMARY_NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/devices', label: 'Devices', icon: Radio },
  { href: '/sensors', label: 'Sensors', icon: Gauge },
  { href: '/advisories', label: 'Advisories', icon: Wheat },
  { href: '/history', label: 'History', icon: History },
];

const SECONDARY_NAV = [
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/profile', label: 'Profile', icon: User },
];

/** Five destinations only — more than that and the targets fall below 44px. */
const BOTTOM_NAV = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/devices', label: 'Devices', icon: Radio },
  { href: '/advisories', label: 'Advisories', icon: Wheat },
  { href: '/history', label: 'History', icon: History },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/* ── Profile menu ── */
function ProfileMenu() {
  const { displayName, user, profile, signOut } = useSession();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const clearSelection = useUiStore((s) => s.clear);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  async function handleSignOut() {
    setSigningOut(true);
    // Drop the remembered device before the session goes, so the next person
    // to use this browser does not inherit it.
    clearSelection();
    await signOut();
  }

  const contact = profile?.email ?? user?.email ?? profile?.phone ?? user?.phone ?? '';

  return (
    <div className={styles.profileWrap} ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.avatarButton}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${displayName}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.avatar} aria-hidden="true">
          {initialsOf(displayName)}
        </span>
        <span className={styles.avatarName}>{displayName}</span>
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          <div className={styles.menuHead}>
            <p className={styles.menuName}>{displayName}</p>
            {contact && <p className={styles.menuMeta}>{contact}</p>}
          </div>

          <Link href="/profile" role="menuitem" className={styles.menuItem} onClick={() => setOpen(false)}>
            <User size={17} aria-hidden="true" />
            Your profile
          </Link>
          <Link href="/settings" role="menuitem" className={styles.menuItem} onClick={() => setOpen(false)}>
            <Settings size={17} aria-hidden="true" />
            Settings
          </Link>

          <button
            type="button"
            role="menuitem"
            className={`${styles.menuItem} ${styles.menuItemDanger}`}
            onClick={handleSignOut}
            disabled={signingOut}
          >
            <LogOut size={17} aria-hidden="true" />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Connection pill ── */
function ConnectionPill() {
  const { isOnline, isBackendReachable, hasChecked } = useOnlineStatus();

  // Before the first probe completes, claim nothing.
  if (!hasChecked) return null;

  const state = !isOnline ? 'offline' : !isBackendReachable ? 'degraded' : 'online';
  const label = state === 'offline' ? 'Offline' : state === 'degraded' ? 'No sync' : 'Synced';
  const description =
    state === 'offline'
      ? 'You are offline. Showing saved information.'
      : state === 'degraded'
        ? 'Cannot reach the MITTI service. Showing saved information.'
        : 'Connected. Showing synchronised data.';

  const toneClass =
    state === 'offline'
      ? styles.connectionOffline
      : state === 'degraded'
        ? styles.connectionDegraded
        : styles.connectionOnline;

  return (
    <span className={`${styles.connection} ${toneClass}`} title={description}>
      <span className={styles.connectionDot} aria-hidden="true" />
      {label}
      <span className="visually-hidden">. {description}</span>
    </span>
  );
}

/* ── Shell ── */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  const { data: devices, isLoading } = useDevices();
  const deviceList = devices ?? [];

  // Count devices that need attention, for the badge beside Advisories.
  const attentionCount = deviceList.filter(
    (d) => severityRank(d.alert_severity) <= 1,
  ).length;

  return (
    <div className={styles.shell}>
      <aside
        className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}
        aria-label="Main navigation"
      >
        <Link href="/dashboard" className={styles.brand}>
          <span className={styles.brandMark}>
            <Sprout size={19} aria-hidden="true" />
          </span>
          <span className={styles.brandText}>
            <span className={styles.brandName}>MITTI</span>
            <span className={styles.brandTag}>Crop intelligence</span>
          </span>
        </Link>

        <nav className={styles.navGroup}>
          {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                aria-current={active ? 'page' : undefined}
                title={collapsed ? label : undefined}
              >
                <Icon size={18} className={styles.navIcon} aria-hidden="true" />
                <span>{label}</span>
                {!collapsed && href === '/advisories' && attentionCount > 0 && (
                  <span className={styles.navCount}>{attentionCount}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFoot}>
          <nav className={styles.navGroup} aria-label="Account">
            <p className={styles.navGroupLabel}>Account</p>
            {SECONDARY_NAV.map(({ href, label, icon: Icon }) => {
              const active = isActivePath(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                  aria-current={active ? 'page' : undefined}
                  title={collapsed ? label : undefined}
                >
                  <Icon size={18} className={styles.navIcon} aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            className={styles.collapseButton}
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight size={16} aria-hidden="true" />
            ) : (
              <ChevronLeft size={16} aria-hidden="true" />
            )}
            <span>Collapse</span>
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.header}>
          <Link href="/dashboard" className={styles.headerBrand}>
            <span className={styles.headerBrandMark}>
              <Sprout size={17} aria-hidden="true" />
            </span>
            MITTI
          </Link>

          <DeviceSelector devices={deviceList} isLoading={isLoading} />

          <span className={styles.headerSpacer} />

          <div className={styles.headerActions}>
            <ConnectionPill />

            <Link
              href="/advisories"
              className={styles.iconButton}
              aria-label={
                attentionCount > 0
                  ? `Advisories: ${attentionCount} ${attentionCount === 1 ? 'field needs' : 'fields need'} attention`
                  : 'Advisories'
              }
            >
              <Bell size={19} aria-hidden="true" />
              {attentionCount > 0 && <span className={styles.iconButtonDot} aria-hidden="true" />}
            </Link>

            <ProfileMenu />
          </div>
        </header>

        <ConnectionBanner />

        <main id="main-content" className={styles.content}>
          {children}
        </main>
      </div>

      <nav className={styles.bottomNav} aria-label="Main navigation">
        {BOTTOM_NAV.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`${styles.bottomItem} ${active ? styles.bottomItemActive : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={20} aria-hidden="true" />
              <span className={styles.bottomLabel}>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
