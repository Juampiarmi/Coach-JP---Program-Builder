'use client';
import { useEffect, useState } from 'react';
import { CANVAS_FONT_FACES } from '@/brand/tokens';
import { clearStickerCache } from '@/lib/canvas/stickers';

/** El canvas no espera a las webfonts: las forzamos y recién ahí habilitamos el dibujo. */
export function useFontsReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    Promise.all(CANVAS_FONT_FACES.map((f) => document.fonts.load(f).catch(() => undefined)))
      .then(() => document.fonts.ready)
      .finally(() => {
        if (!alive) return;
        clearStickerCache();
        setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);
  return ready;
}
