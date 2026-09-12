'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './splash.module.css';

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/dashboard');
    }, 2000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className={styles.splash}>
      <div className={styles.content}>
        <div className={styles.logoContainer}>
          <span className={styles.logoEmoji}>🌱</span>
          <h1 className={styles.title}>MITTI</h1>
        </div>
        <p className={styles.tagline}>Crop intelligence rooted in Indian soil.</p>
        <div className={styles.loader}>
          <div className={styles.loaderBar} />
        </div>
      </div>
      <footer className={styles.footer}>
        <p>Smart Agriculture • IoT Monitoring</p>
      </footer>
    </div>
  );
}
