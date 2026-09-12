'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import styles from './AppShell.module.css';

/* ── Bottom Navigation Items ── */
const navItems = [
  { href: '/dashboard', label: 'Home', icon: '🏠' },
  { href: '/devices', label: 'Devices', icon: '📡' },
  { href: '/advisories', label: 'Advisories', icon: '🌾' },
  { href: '/history', label: 'History', icon: '📊' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!mounted || !isAuthenticated) {
    return null; // Or a loading spinner
  }

  return (
    <div className={styles.shell}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/dashboard" className={styles.logo}>
            <span className={styles.logoIcon}>🌱</span>
            <span className={styles.logoText}>MITTI</span>
          </Link>
          <div className={styles.headerRight}>
            <div className={styles.connectionBadge}>
              <span className={styles.connectionDot} />
              <span className={styles.connectionLabel}>Online</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className={styles.main}>
        <div className={styles.content}>
          {children}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className={styles.bottomNav}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              aria-label={item.label}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
              {isActive && <span className={styles.navIndicator} />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
