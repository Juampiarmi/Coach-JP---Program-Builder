'use client';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { HANDLE, handlePoints, hitLayer, renderScene, type MediaEl } from '@/lib/canvas/render';
import { findConflicts, layerAABB } from '@/lib/canvas/safe';
import { FORMATS, type Layer } from '@/lib/types';
import { useCurrent, usePage, useStudio } from '@/store/studio';

type Drag =
  | { mode: 'move'; id: string; dx: number; dy: number }
  | { mode: 'scale'; id: string; startDist: number; startScale: number }
  | { mode: 'rotate'; id: string; startAngle: number; startRot: number }
  | { mode: 'pinch'; id: string; startDist: number; startAngle: number; startScale: number; startRot: number };

const SNAP = 14; // px de pantalla

/** Pizarra interactiva: dibuja la escena a resolución nativa y la escala con CSS. */
export function CanvasStage({ media, fontsReady }: { media: MediaEl | null; fontsReady: boolean }) {
  const project = useCurrent();
  const page = usePage();
  const selectedId = useStudio((s) => s.selectedId);
  const guides = useStudio((s) => s.guides);
  const igUi = useStudio((s) => s.igUi);
  const select = useStudio((s) => s.select);
  const updateLayer = useStudio((s) => s.updateLayer);
  const checkpoint = useStudio((s) => s.checkpoint);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<Drag | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const [box, setBox] = useState({ w: 300, h: 500 });
  const [snap, setSnap] = useState<{ x?: boolean; y?: boolean } | null>(null);

  const fw = FORMATS[project.format].w;
  const W = fw * page.span;
  const H = FORMATS[project.format].h;

  // ajuste del canvas al contenedor
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const fitBox = () => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      const s = Math.min(cw / W, ch / H);
      setBox({ w: Math.floor(W * s), h: Math.floor(H * s) });
    };
    fitBox();
    const ro = new ResizeObserver(fitBox);
    ro.observe(el);
    return () => ro.disconnect();
  }, [W, H]);

  const ui = W / Math.max(1, box.w);

  // stickers que pisan la UI de Instagram: se marcan en rojo mientras haya guías o simulador
  const conflicts = useMemo(() => {
    if (!fontsReady || (!guides && !igUi)) return [];
    const ids = findConflicts(page, project.format);
    return page.layers.filter((l) => ids.has(l.id)).map(layerAABB);
  }, [page, project.format, guides, igUi, fontsReady]);

  const draw = useCallback(() => {
    const c = canvasRef.current;
    if (!c || !fontsReady) return;
    renderScene(c.getContext('2d')!, page, { format: project.format, media, guides, selectedId, ui, snap, igUi, conflicts });
  }, [page, project.format, media, guides, selectedId, ui, snap, fontsReady, igUi, conflicts]);

  useEffect(() => {
    draw();
    if (!(media instanceof HTMLVideoElement)) return;
    let raf = 0;
    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [draw, media]);

  const toDoc = (e: { clientX: number; clientY: number }) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  };

  const selected = page.layers.find((l) => l.id === selectedId) ?? null;

  const onDown = (e: React.PointerEvent) => {
    const p = toDoc(e);
    pointers.current.set(e.pointerId, p);
    (e.target as Element).setPointerCapture(e.pointerId);

    // dos dedos sobre una capa seleccionada → pellizco (escala + rotación)
    if (pointers.current.size === 2 && selected && !selected.locked) {
      const [a, b] = [...pointers.current.values()];
      if (!drag.current) checkpoint();
      drag.current = {
        mode: 'pinch',
        id: selected.id,
        startDist: Math.hypot(b.x - a.x, b.y - a.y),
        startAngle: Math.atan2(b.y - a.y, b.x - a.x),
        startScale: selected.scale,
        startRot: selected.rotation,
      };
      return;
    }

    const tol = HANDLE * ui * 1.4;
    if (selected && !selected.locked) {
      const hp = handlePoints(selected, ui);
      if (Math.hypot(p.x - hp.rotate.x, p.y - hp.rotate.y) < tol) {
        checkpoint();
        drag.current = { mode: 'rotate', id: selected.id, startAngle: Math.atan2(p.y - selected.y, p.x - selected.x), startRot: selected.rotation };
        return;
      }
      if (hp.corners.some((c) => Math.hypot(p.x - c.x, p.y - c.y) < tol)) {
        checkpoint();
        drag.current = { mode: 'scale', id: selected.id, startDist: Math.hypot(p.x - selected.x, p.y - selected.y), startScale: selected.scale };
        return;
      }
    }
    const hit = [...page.layers].reverse().find((l: Layer) => !l.hidden && hitLayer(l, p.x, p.y));
    if (!hit) {
      select(null);
      drag.current = null;
      return;
    }
    select(hit.id);
    if (hit.locked) return;
    checkpoint();
    drag.current = { mode: 'move', id: hit.id, dx: p.x - hit.x, dy: p.y - hit.y };
  };

  const onMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const p = toDoc(e);
    pointers.current.set(e.pointerId, p);
    const d = drag.current;
    if (!d) return;
    const l = page.layers.find((x) => x.id === d.id);
    if (!l) return;
    if (d.mode === 'move') {
      let x = p.x - d.dx;
      let y = p.y - d.dy;
      const s: { x?: boolean; y?: boolean } = {};
      const slideCx = Math.floor(x / fw) * fw + fw / 2;
      if (Math.abs(x - slideCx) < SNAP * ui) {
        x = slideCx;
        s.x = true;
      }
      if (Math.abs(y - H / 2) < SNAP * ui) {
        y = H / 2;
        s.y = true;
      }
      setSnap(s.x || s.y ? s : null);
      updateLayer(d.id, { x, y }, { history: false });
    } else if (d.mode === 'scale') {
      const dist = Math.hypot(p.x - l.x, p.y - l.y);
      const scale = Math.max(0.15, Math.min(4, (d.startScale * dist) / Math.max(1, d.startDist)));
      updateLayer(d.id, { scale }, { history: false });
    } else if (d.mode === 'rotate') {
      const ang = Math.atan2(p.y - l.y, p.x - l.x);
      let rot = d.startRot + ((ang - d.startAngle) * 180) / Math.PI;
      rot = ((((rot + 180) % 360) + 360) % 360) - 180;
      for (const t of [-90, 0, 90, 180, -180]) if (Math.abs(rot - t) < 3) rot = t;
      updateLayer(d.id, { rotation: Math.round(rot * 10) / 10 }, { history: false });
    } else if (d.mode === 'pinch' && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      updateLayer(
        d.id,
        {
          scale: Math.max(0.15, Math.min(4, (d.startScale * dist) / Math.max(1, d.startDist))),
          rotation: Math.round((d.startRot + ((ang - d.startAngle) * 180) / Math.PI) * 10) / 10,
        },
        { history: false },
      );
    }
  };

  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      drag.current = null;
      setSnap(null);
    }
  };

  return (
    <div ref={wrapRef} className="relative flex h-full w-full items-center justify-center">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ width: box.w, height: box.h }}
        className="touch-none rounded-md shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/10"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        aria-label="Pizarra de edición"
      />
      {!fontsReady && <div className="absolute inset-0 grid place-items-center text-xs text-white/50">Cargando tipografías…</div>}
    </div>
  );
}
