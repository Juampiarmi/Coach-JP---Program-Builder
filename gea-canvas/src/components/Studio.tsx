'use client';
import { useEffect, useState } from 'react';
import { FolderKanban, GalleryVerticalEnd, Image as ImageIcon, Layers, PenLine, SlidersHorizontal, Sticker } from 'lucide-react';
import { GalleryPanel } from './panels/GalleryPanel';
import { useFontsReady } from '@/hooks/useFontsReady';
import { useMedia } from '@/hooks/useMedia';
import { thumbnail } from '@/lib/canvas/export';
import { FORMATS } from '@/lib/types';
import { useCurrent, usePage, useStudio, type PanelKey } from '@/store/studio';
import { CanvasStage } from './CanvasStage';
import { Inspector } from './Inspector';
import { BackgroundPanel } from './panels/BackgroundPanel';
import { CopyPanel } from './panels/CopyPanel';
import { PagesPanel } from './panels/PagesPanel';
import { ProjectsPanel } from './panels/ProjectsPanel';
import { StickersPanel } from './panels/StickersPanel';
import { TopBar } from './TopBar';

const NAV: { key: PanelKey | 'editar'; label: string; icon: typeof Sticker }[] = [
  { key: 'stickers', label: 'Stickers', icon: Sticker },
  { key: 'fondo', label: 'Fondo', icon: ImageIcon },
  { key: 'galeria', label: 'Galería', icon: GalleryVerticalEnd },
  { key: 'copys', label: 'Copys', icon: PenLine },
  { key: 'paginas', label: 'Páginas', icon: Layers },
  { key: 'proyectos', label: 'Proyectos', icon: FolderKanban },
];

export function Studio() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  if (!hydrated) return <div className="grid h-dvh place-items-center bg-night text-xs text-white/40">Cargando estudio…</div>;
  return <StudioInner />;
}

function StudioInner() {
  const fontsReady = useFontsReady();
  const project = useCurrent();
  const page = usePage();
  const pageIndex = useStudio((s) => s.pageIndex);
  const panel = useStudio((s) => s.panel);
  const setPanel = useStudio((s) => s.setPanel);
  const selectedId = useStudio((s) => s.selectedId);
  const goPage = useStudio((s) => s.goPage);
  const media = useMedia(page.background);
  const [mobileTab, setMobileTab] = useState<PanelKey | 'editar'>('stickers');

  // en el celular, al seleccionar un sticker se abre el inspector
  useEffect(() => {
    if (selectedId) setMobileTab('editar');
  }, [selectedId]);

  useKeyboard();

  // miniatura para la biblioteca (página 1), sin tocar el historial
  const thumbKey = pageIndex === 0 ? JSON.stringify(project.pages[0]) + project.format : null;
  useEffect(() => {
    if (!thumbKey || !fontsReady) return;
    const t = setTimeout(() => {
      try {
        const thumb = thumbnail(project.pages[0], project.format, media);
        useStudio.setState((s) => ({ projects: s.projects.map((p) => (p.id === project.id ? { ...p, thumb } : p)) }));
      } catch {
        /* canvas tainted o sin media todavía */
      }
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thumbKey, media, fontsReady]);

  const renderPanel = (k: PanelKey | 'editar') =>
    k === 'stickers' ? (
      <StickersPanel ready={fontsReady} />
    ) : k === 'fondo' ? (
      <BackgroundPanel />
    ) : k === 'galeria' ? (
      <GalleryPanel />
    ) : k === 'copys' ? (
      <CopyPanel />
    ) : k === 'paginas' ? (
      <PagesPanel ready={fontsReady} />
    ) : k === 'proyectos' ? (
      <ProjectsPanel />
    ) : (
      <Inspector />
    );

  const fmt = FORMATS[project.format];

  return (
    <div className="flex h-dvh flex-col bg-night text-white">
      <TopBar media={media} />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* rail de navegación (escritorio) */}
        <nav className="hidden w-[68px] shrink-0 flex-col items-center gap-1 border-r border-line py-3 lg:flex">
          {NAV.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setPanel(key as PanelKey)}
              className={`flex w-14 flex-col items-center gap-1 rounded-xl py-2 text-[9px] font-semibold transition ${
                panel === key ? 'bg-neon/15 text-neon' : 'text-white/50 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </nav>
        {/* panel izquierdo (escritorio) */}
        <aside className="scroll-thin hidden w-[340px] shrink-0 overflow-y-auto border-r border-line bg-carbon/60 lg:block">{renderPanel(panel)}</aside>

        {/* pizarra */}
        <main className="relative flex min-h-0 flex-1 flex-col">
          <div className="stage-bg relative min-h-0 flex-1 p-3 lg:p-8">
            <CanvasStage media={media} fontsReady={fontsReady} />
          </div>
          <div className="flex h-10 shrink-0 items-center gap-2 overflow-x-auto border-t border-line bg-night px-3 text-[11px] text-white/50">
            <span className="font-tech text-white/70">
              {fmt.w * page.span}×{fmt.h}
            </span>
            <span>·</span>
            <span>{fmt.ratio}</span>
            {page.span > 1 && <span className="text-cyan-300">· carrusel continuo ×{page.span}</span>}
            <div className="ml-auto flex gap-1">
              {project.pages.map((pg, i) => (
                <button
                  key={pg.id}
                  onClick={() => goPage(i)}
                  className={`h-7 min-w-7 rounded-md px-2 font-tech text-[10px] ring-1 ${
                    i === pageIndex ? 'bg-white text-ink ring-white' : 'ring-white/15 hover:ring-white/40'
                  }`}
                >
                  {i + 1}
                  {pg.span > 1 ? `×${pg.span}` : ''}
                </button>
              ))}
            </div>
          </div>
        </main>

        {/* inspector (escritorio) */}
        <aside className="scroll-thin hidden w-[320px] shrink-0 overflow-y-auto border-l border-line bg-carbon/60 lg:block">
          <Inspector />
        </aside>

        {/* celular: pestañas + panel debajo de la pizarra */}
        <div className="flex h-[42dvh] shrink-0 flex-col border-t border-line bg-carbon lg:hidden">
          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">{renderPanel(mobileTab)}</div>
          <nav className="grid shrink-0 grid-cols-7 border-t border-line pb-[env(safe-area-inset-bottom)]">
            {[{ key: 'editar' as const, label: 'Editar', icon: SlidersHorizontal }, ...NAV].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setMobileTab(key)}
                className={`flex flex-col items-center gap-0.5 py-2 text-[9px] font-semibold ${mobileTab === key ? 'text-neon' : 'text-white/50'}`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable]')) return;
      const s = useStudio.getState();
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.shiftKey ? s.redo() : s.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        s.redo();
        return;
      }
      const id = s.selectedId;
      if (!id) return;
      const l = s.page().layers.find((x) => x.id === id);
      if (!l) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        s.removeLayer(id);
      } else if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        s.duplicateLayer(id);
      } else if (e.key === 'Escape') s.select(null);
      else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        s.updateLayer(id, { x: l.x + dx, y: l.y + dy });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
