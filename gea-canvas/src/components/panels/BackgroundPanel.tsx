'use client';
import { useRef, useState } from 'react';
import { ImagePlus, Trash2, Video } from 'lucide-react';
import { FILTERS } from '@/lib/canvas/render';
import { deleteMedia, normalizeImage, saveMedia } from '@/lib/media';
import type { FilterKey } from '@/lib/types';
import { usePage, useStudio } from '@/store/studio';
import { Btn, Section, Slider } from '../ui';

const SOLIDS = ['#212121', '#121212', '#2B0A1C', '#06161C', '#2A1A08', '#FFFFFF'];

export function BackgroundPanel() {
  const page = usePage();
  const bg = page.background;
  const setBackground = useStudio((s) => s.setBackground);
  const checkpoint = useStudio((s) => s.checkpoint);
  const projects = useStudio((s) => s.projects);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  const load = async (file?: File | null) => {
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    if (!isVideo && !file.type.startsWith('image/')) return;
    setBusy(true);
    try {
      const blob = isVideo ? file : await normalizeImage(file);
      const id = await saveMedia(blob);
      setBackground({ kind: isVideo ? 'video' : 'image', mediaId: id, mediaName: file.name, zoom: 1, offsetX: 0, offsetY: 0 });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const id = bg.mediaId;
    setBackground({ kind: 'none', mediaId: undefined, mediaName: undefined });
    // borra el archivo solo si ninguna otra página lo usa
    const stillUsed = projects.some((p) => p.pages.some((pg) => pg.id !== page.id && pg.background.mediaId === id));
    if (id && !stillUsed) await deleteMedia(id);
  };

  return (
    <div>
      <Section title="Foto o video de fondo">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            load(e.dataTransfer.files?.[0]);
          }}
          onClick={() => input.current?.click()}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition ${
            drag ? 'border-neon bg-neon/10' : 'border-white/15 hover:border-white/35'
          }`}
        >
          <div className="flex gap-2 text-white/60">
            <ImagePlus className="h-5 w-5" />
            <Video className="h-5 w-5" />
          </div>
          <div className="text-xs text-white/70">{busy ? 'Procesando…' : 'Tocá o arrastrá una foto / video de la suite'}</div>
          <div className="text-[10px] text-white/35">JPG · PNG · HEIC · MP4 · MOV — se guarda solo en este dispositivo</div>
        </div>
        <input ref={input} type="file" accept="image/*,video/*" hidden onChange={(e) => load(e.target.files?.[0])} />
        {bg.kind !== 'none' && (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-xs">
            <span className="truncate text-white/70">
              {bg.kind === 'video' ? '🎞 ' : '🖼 '}
              {bg.mediaName ?? 'media'}
            </span>
            <Btn variant="danger" onClick={remove} className="!px-2 !py-1">
              <Trash2 className="h-3.5 w-3.5" />
            </Btn>
          </div>
        )}
      </Section>

      {bg.kind !== 'none' && (
        <Section title="Encuadre">
          <div className="space-y-3">
            <Slider label="Zoom" value={bg.zoom} min={1} max={3} onStart={checkpoint} onChange={(zoom) => setBackground({ zoom }, { history: false })} format={(v) => `${v.toFixed(2)}×`} />
            <Slider label="Horizontal" value={bg.offsetX} min={-1} max={1} onStart={checkpoint} onChange={(offsetX) => setBackground({ offsetX }, { history: false })} />
            <Slider label="Vertical" value={bg.offsetY} min={-1} max={1} onStart={checkpoint} onChange={(offsetY) => setBackground({ offsetY }, { history: false })} />
          </div>
        </Section>
      )}

      <Section title="Filtro neón">
        <div className="grid grid-cols-5 gap-2">
          {(Object.keys(FILTERS) as FilterKey[]).map((f) => (
            <button key={f} onClick={() => setBackground({ filter: f })} className="flex flex-col items-center gap-1">
              <span
                className={`h-11 w-11 rounded-xl ring-2 transition ${bg.filter === f ? 'ring-white' : 'ring-white/10 hover:ring-white/40'}`}
                style={{ background: FILTERS[f].swatch }}
              />
              <span className="text-center text-[9px] leading-tight text-white/60">{FILTERS[f].name}</span>
            </button>
          ))}
        </div>
        {bg.filter !== 'none' && (
          <div className="mt-3">
            <Slider label="Intensidad" value={bg.intensity} min={0} max={1} onStart={checkpoint} onChange={(intensity) => setBackground({ intensity }, { history: false })} format={(v) => `${Math.round(v * 100)}%`} />
          </div>
        )}
      </Section>

      <Section title="Color base (sin foto)">
        <div className="flex flex-wrap gap-2">
          {SOLIDS.map((c) => (
            <button
              key={c}
              onClick={() => setBackground({ solid: c })}
              className={`h-8 w-8 rounded-lg ring-2 ${bg.solid === c ? 'ring-neon' : 'ring-white/10'}`}
              style={{ background: c }}
              title={c}
            />
          ))}
          <input type="color" value={bg.solid} onChange={(e) => setBackground({ solid: e.target.value }, { history: false })} className="h-8 w-10 cursor-pointer rounded-lg bg-transparent" />
        </div>
      </Section>
    </div>
  );
}
