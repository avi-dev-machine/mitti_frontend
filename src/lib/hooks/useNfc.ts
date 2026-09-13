/* ── MITTI — Web NFC ──
 *
 * Web NFC exists only on Chrome for Android, so support is checked rather than
 * assumed and the manual device-ID entry is always available beside it.
 *
 * The app only ever reads. It never writes to a tag: an NFC tag on a MITTI
 * unit is the manufacturer's label, and overwriting one would make the device
 * unidentifiable in the field.
 */
'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

export type NfcState =
  | 'unsupported'
  | 'idle'
  | 'scanning'
  | 'read'
  | 'permission-denied'
  | 'error';

/* Web NFC is not in TypeScript's DOM library yet. Only what is used is typed. */
interface NdefRecordLike {
  recordType: string;
  encoding?: string;
  data?: BufferSource;
}
interface NdefMessageLike {
  records: readonly NdefRecordLike[];
}
interface NdefReadingEventLike extends Event {
  serialNumber: string;
  message: NdefMessageLike;
}
interface NdefReaderLike extends EventTarget {
  scan: (options?: { signal?: AbortSignal }) => Promise<void>;
}
type NdefReaderConstructor = new () => NdefReaderLike;

function getNdefReader(): NdefReaderConstructor | null {
  if (typeof window === 'undefined') return null;
  const candidate = (window as unknown as { NDEFReader?: NdefReaderConstructor }).NDEFReader;
  return typeof candidate === 'function' ? candidate : null;
}

/** Pull the first readable text payload out of an NDEF message. */
function extractText(message: NdefMessageLike): string | null {
  for (const record of message.records) {
    if (record.recordType !== 'text' && record.recordType !== 'url') continue;
    if (!record.data) continue;
    try {
      const decoder = new TextDecoder(record.encoding ?? 'utf-8');
      const value = decoder.decode(record.data).trim();
      if (value) return value;
    } catch {
      // A record MITTI cannot decode is skipped; another may still be readable.
    }
  }
  return null;
}

/* NDEFReader availability never changes for the life of the page, so this
   "store" never notifies. useSyncExternalStore is still the right tool: it
   gives the server a defined snapshot, so support is derived rather than
   assigned from an effect after hydration. */
const subscribeNever = () => () => {};
const getSupportSnapshot = () => getNdefReader() !== null;
const getSupportServerSnapshot = () => false;

export interface NfcScanner {
  state: NfcState;
  isSupported: boolean;
  /** The text read from the tag, once state is 'read'. */
  value: string | null;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

/** @param onRead called with the tag's text the moment a tag is read. */
export function useNfc(onRead?: (value: string) => void): NfcScanner {
  const [rawState, setState] = useState<NfcState>('idle');
  const [value, setValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isSupported = useSyncExternalStore(
    subscribeNever,
    getSupportSnapshot,
    getSupportServerSnapshot,
  );

  // Derived, not stored: an unsupported browser can never leave this state.
  const state: NfcState = isSupported ? rawState : 'unsupported';

  // Held in a ref so a caller passing an inline function does not have to
  // memoise it to keep `start` stable. Assigned in an effect, not during
  // render, because a render can be discarded and re-run.
  const onReadRef = useRef(onRead);
  useEffect(() => {
    onReadRef.current = onRead;
  }, [onRead]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState((current) => (current === 'scanning' ? 'idle' : current));
  }, []);

  // Never leave the radio scanning after the screen is gone.
  useEffect(() => () => abortRef.current?.abort(), []);

  const start = useCallback(async () => {
    const Reader = getNdefReader();
    if (!Reader) {
      setState('unsupported');
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState('scanning');
    setError(null);
    setValue(null);

    try {
      const reader = new Reader();

      reader.addEventListener('reading', (event: Event) => {
        const reading = event as NdefReadingEventLike;
        const text = extractText(reading.message);
        if (text) {
          setValue(text);
          setState('read');
          controller.abort();
          // An event, not an effect: the caller validates it straight away.
          onReadRef.current?.(text);
        } else {
          setError('That tag does not carry a MITTI device ID.');
          setState('error');
        }
      });

      reader.addEventListener('readingerror', () => {
        setError('The tag could not be read. Hold your phone steady against it and try again.');
        setState('error');
      });

      // Throws immediately if the user declines the permission prompt.
      await reader.scan({ signal: controller.signal });
    } catch (cause) {
      if (controller.signal.aborted) return;
      const name = (cause as Error).name;
      if (name === 'NotAllowedError') {
        setError(
          'MITTI needs permission to use NFC. Allow it in your browser settings, or enter the device ID below.',
        );
        setState('permission-denied');
      } else if (name === 'NotSupportedError') {
        setState('unsupported');
      } else {
        setError('NFC scanning could not start on this device.');
        setState('error');
      }
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setValue(null);
    setError(null);
    setState('idle');
  }, []);

  return { state, isSupported, value, error, start, stop, reset };
}
