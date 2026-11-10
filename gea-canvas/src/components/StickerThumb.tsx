'use client';
import { useEffect, useRef } from 'react';
import { PAD, renderSticker } from '@/lib/canvas/stickers';
import type { StickerProps } from '@/lib/types';

/** Miniatura en vivo de un sticker (mismo motor que la exportación). */
export function StickerThumb({ props, size = 120, ready }: { props: StickerProps; size?: number; ready: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = JSON.stringify(props);
  useEffect(() => {
    const c = ref.current;
    if (!c || !ready) return;
    const r = renderSticker(props, 1);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = size * dpr;
    c.height = size * dpr;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    const s = Math.min((size * dpr) / (r.w + PAD), (size * dpr) / (r.h + PAD));
    const dw = (r.w + PAD * 2) * s;
    const dh = (r.h + PAD * 2) * s;
    ctx.drawImage(r.canvas, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, size, ready]);
  return <canvas ref={ref} style={{ width: size, height: size }} className="pointer-events-none" />;
}
