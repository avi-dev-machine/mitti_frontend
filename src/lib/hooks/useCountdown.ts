/* ── MITTI — Countdown hook ──
 *
 * Drives the resend cooldown on the OTP screen.
 *
 * It stores a target timestamp rather than decrementing a counter, so the
 * remaining time stays correct when a phone suspends the tab — browsers
 * throttle background timers, and a naive counter would drift and let someone
 * resend early.
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface Countdown {
  /** Whole seconds remaining. 0 when finished. */
  secondsLeft: number;
  isRunning: boolean;
  /** mm:ss, e.g. "00:29". */
  formatted: string;
  start: (seconds: number) => void;
  reset: () => void;
}

export function useCountdown(initialSeconds = 0): Countdown {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const targetRef = useRef<number | null>(null);

  const tick = useCallback(() => {
    if (targetRef.current === null) return;
    const remaining = Math.max(0, Math.ceil((targetRef.current - Date.now()) / 1000));
    setSecondsLeft(remaining);
    if (remaining === 0) targetRef.current = null;
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = window.setInterval(tick, 250);
    // Recompute immediately on return from background, where timers were throttled.
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [secondsLeft, tick]);

  const start = useCallback((seconds: number) => {
    targetRef.current = Date.now() + seconds * 1000;
    setSecondsLeft(seconds);
  }, []);

  const reset = useCallback(() => {
    targetRef.current = null;
    setSecondsLeft(0);
  }, []);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return { secondsLeft, isRunning: secondsLeft > 0, formatted, start, reset };
}
