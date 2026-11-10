'use client';

import { useEffect } from 'react';

/** Registra el service worker solo en producción (en dev interferiría con el hot reload). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* La app funciona igual sin SW; no bloqueamos al usuario. */
    });
  }, []);
  return null;
}
