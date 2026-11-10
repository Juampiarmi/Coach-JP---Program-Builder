'use client';
import { useMemo, useState } from 'react';
import { AlertTriangle, Clapperboard, Download, Grid3x3, Images, Loader2, Redo2, Settings, Smartphone, Undo2 } from 'lucide-react';
import { findConflicts, fitIntoSafe } from '@/lib/canvas/safe';
import { SettingsModal } from './SettingsModal';
import { GeaLogo } from '@/brand/GeaLogo';
import { exportPage, exportVideo, slug, videoMime } from '@/lib/canvas/export';
import type { MediaEl } from '@/lib/canvas/render';
import { loadMediaElement } from '@/lib/media';
import { deliver } from '@/lib/share';
import { FORMATS, type FormatKey } from '@/lib/types';
import { useCurrent, usePage, useStudio } from '@/store/studio';
import { Btn } from './ui';

export function TopBar({ media }: { media: MediaEl | null }) {
  const project = useCurrent();
  const page = usePage();
  const pageIndex = useStudio((s) => s.pageIndex);
  const setFormat = useStudio((s) => s.setFormat);
  const mutate = useStudio((s) => s.mutate);
  const undo = useStudio((s) => s.undo);
  const redo = useStudio((s) => s.redo);
  const canUndo = useStudio((s) => s.past.length > 0);
  const canRedo = useStudio((s) => s.future.length > 0);
  const guides = useStudio((s) => s.guides);
  const toggleGuides = useStudio((s) => s.toggleGuides);
  const igUi = useStudio((s) => s.igUi);
  const toggleIgUi = useStudio((s) => s.toggleIgUi);
  const [busy, setBusy] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);

  const conflicts = useMemo(() => findConflicts(page, project.format), [page, project.format]);
  const fixAll = () =>
    mutate((p) => {
      const pg = p.pages.find((x) => x.id === page.id);
      if (!pg) return;
      for (const l of pg.layers) if (conflicts.has(l.id)) Object.assign(l, fitIntoSafe(l, p.format, pg.span));
    });
  /** Antes de exportar: avisa si algo queda tapado por Instagram. */
  const okToExport = (pages = [page]) => {
    const n = pages.reduce((s, pg) => s + findConflicts(pg, project.format).size, 0);
    return n === 0 || confirm(`${n} sticker(s) quedan debajo de la interfaz de Instagram. ¿Exportar igual?`);
  };

  const base = `gea-${slug(project.name)}`;
  const startIndex = project.pages.slice(0, pageIndex).reduce((a, p) => a + p.span, 0) + 1;

  const exportCurrent = async () => {
    if (!okToExport()) return;
    setBusy('png');
    try {
      await deliver(await exportPage(page, project.format, media, base, startIndex));
    } finally {
      setBusy(null);
    }
  };

  const exportAll = async () => {
    if (!okToExport(project.pages)) return;
    setBusy('all');
    try {
      const files = [];
      let n = 1;
      for (const pg of project.pages) {
        const m = pg.id === page.id ? media : await loadMediaElement(pg.background);
        files.push(...(await exportPage(pg, project.format, m, base, n)));
        n += pg.span;
      }
      await deliver(files);
    } finally {
      setBusy(null);
    }
  };

  const exportMp4 = async () => {
    if (!(media instanceof HTMLVideoElement)) return;
    setBusy('video:0');
    try {
      const { blob, ext } = await exportVideo(page, project.format, media, (p) => setBusy(`video:${Math.round(p * 100)}`));
      await deliver([{ blob, name: `${base}-${FORMATS[project.format].w}x${FORMATS[project.format].h}.${ext}` }]);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const isVideo = media instanceof HTMLVideoElement && page.span === 1 && !!videoMime();

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-night/90 px-3 backdrop-blur md:gap-3 md:px-4">
      <div className="flex items-center gap-2.5">
        <GeaLogo className="h-5 w-auto text-white" />
        <span className="hidden font-display text-[9px] font-bold uppercase tracking-[0.3em] text-neon lg:inline">Content Canvas</span>
      </div>
      <input
        value={project.name}
        onChange={(e) => mutate((p) => (p.name = e.target.value), { history: false })}
        className="hidden min-w-0 max-w-[220px] flex-1 rounded-md bg-transparent px-2 py-1 text-sm text-white/85 hover:bg-white/5 focus:bg-white/5 focus:outline-none md:block"
        aria-label="Nombre de la pieza"
      />
      <select
        value={project.format}
        onChange={(e) => setFormat(e.target.value as FormatKey)}
        className="rounded-lg bg-white/[0.05] px-2 py-1.5 text-xs font-semibold text-white ring-1 ring-white/10 focus:outline-none"
        aria-label="Formato"
      >
        {(Object.keys(FORMATS) as FormatKey[]).map((f) => (
          <option key={f} value={f} className="bg-ink">
            {FORMATS[f].short} · {FORMATS[f].w}×{FORMATS[f].h}
          </option>
        ))}
      </select>
      <div className="ml-auto flex items-center gap-1.5">
        <Btn className="!px-2" onClick={undo} disabled={!canUndo} title="Deshacer (Ctrl+Z)">
          <Undo2 className="h-4 w-4" />
        </Btn>
        <Btn className="!px-2" onClick={redo} disabled={!canRedo} title="Rehacer (Ctrl+Shift+Z)">
          <Redo2 className="h-4 w-4" />
        </Btn>
        {conflicts.size > 0 && (
          <Btn onClick={fixAll} className="!bg-red-500/15 !text-red-200 !ring-red-400/40" title="Mover a la zona segura los stickers tapados por Instagram">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">{conflicts.size} tapado{conflicts.size > 1 ? 's' : ''} · Reubicar</span>
            <span className="sm:hidden">{conflicts.size}</span>
          </Btn>
        )}
        <Btn className={`!px-2 ${igUi ? '!text-neon' : ''}`} onClick={toggleIgUi} title="Simular la interfaz de Instagram">
          <Smartphone className="h-4 w-4" />
        </Btn>
        <Btn className={`!px-2 ${guides ? '!text-neon' : ''}`} onClick={toggleGuides} title="Zonas seguras">
          <Grid3x3 className="h-4 w-4" />
        </Btn>
        <Btn className="!px-2" onClick={() => setSettings(true)} title="Configuración (IA)">
          <Settings className="h-4 w-4" />
        </Btn>
        {isVideo && (
          <Btn onClick={exportMp4} disabled={!!busy} title="Grabar video con overlays">
            {busy?.startsWith('video') ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clapperboard className="h-4 w-4" />}
            <span className="hidden sm:inline">{busy?.startsWith('video') ? `${busy.split(':')[1]}%` : 'Video'}</span>
          </Btn>
        )}
        {project.pages.length > 1 && (
          <Btn onClick={exportAll} disabled={!!busy} title="Exportar todas las páginas">
            {busy === 'all' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Images className="h-4 w-4" />}
            <span className="hidden sm:inline">Todo</span>
          </Btn>
        )}
        <Btn variant="primary" onClick={exportCurrent} disabled={!!busy}>
          {busy === 'png' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          <span>PNG</span>
        </Btn>
      </div>
      {settings && <SettingsModal onClose={() => setSettings(false)} />}
    </header>
  );
}
