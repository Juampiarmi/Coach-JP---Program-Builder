'use client';
import { useEffect, useState } from 'react';
import { mediaUrl } from '@/lib/media';
import type { Background } from '@/lib/types';
import type { MediaEl } from '@/lib/canvas/render';

/** Carga la foto o video de fondo desde IndexedDB y devuelve el elemento listo para dibujar. */
export function useMedia(bg: Background): MediaEl | null {
  const [el, setEl] = useState<MediaEl | null>(null);
  useEffect(() => {
    let alive = true;
    setEl(null);
    if (!bg.mediaId || bg.kind === 'none') return;
    mediaUrl(bg.mediaId).then((url) => {
      if (!url || !alive) return;
      if (bg.kind === 'video') {
        const v = document.createElement('video');
        v.src = url;
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        v.crossOrigin = 'anonymous';
        v.onloadeddata = () => {
          if (!alive) return;
          v.play().catch(() => undefined);
          setEl(v);
        };
      } else {
        const img = new Image();
        img.onload = () => alive && setEl(img);
        img.src = url;
      }
    });
    return () => {
      alive = false;
    };
  }, [bg.mediaId, bg.kind]);
  return el;
}
