/* ── MITTI — Service worker registration ──
 *
 * Registered from the client after hydration, and only in production: in
 * development a cached app shell would serve stale bundles and make edits look
 * as though they had not applied.
 */
'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error) => {
        // A failed registration costs offline support, not the app itself.
        console.warn('[mitti] Service worker registration failed:', error);
      });
    };

    // Wait for load so the worker never competes with the first render.
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });

    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
