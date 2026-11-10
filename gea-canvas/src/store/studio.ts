'use client';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { kindSpec } from '@/data/library';
import { uid } from '@/lib/id';
import type { Background, CopyPiece, FormatKey, Layer, Page, PillarKey, Project, StickerProps, ToneKey } from '@/lib/types';
import { FORMATS } from '@/lib/types';
import { renderSticker } from '@/lib/canvas/stickers';

export type PanelKey = 'stickers' | 'fondo' | 'galeria' | 'copys' | 'paginas' | 'proyectos';

export type AssetCategory = 'suite' | 'jacuzzi' | 'bar' | 'confort';

export const ASSET_CATEGORIES: Record<AssetCategory, string> = {
  suite: 'Suite Neón',
  jacuzzi: 'Jacuzzi',
  bar: 'Bar',
  confort: 'Detalle Confort',
};

/** Fondo guardado en la Galería GEA (el archivo vive en IndexedDB, acá solo la ficha). */
export interface Asset {
  id: string;
  mediaId: string;
  name: string;
  kind: 'image' | 'video';
  category: AssetCategory;
  /** Miniatura JPEG chica (dataURL). */
  thumb: string;
  createdAt: number;
}

export interface WeekItem {
  day: string;
  /** YYYY-MM-DD */
  date: string;
  pillar: PillarKey;
  format: FormatKey | 'carousel';
  piece: CopyPiece;
  projectId?: string;
}

export interface WeekPlan {
  id: string;
  /** Lunes de la semana, YYYY-MM-DD. */
  start: string;
  tone: ToneKey;
  source: 'banco' | 'ia';
  items: WeekItem[];
}

export const newBackground = (): Background => ({
  kind: 'none',
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  filter: 'magenta',
  intensity: 0.6,
  solid: '#212121',
});

export const newPage = (span = 1): Page => ({ id: uid('pg_'), span, background: newBackground(), layers: [] });

export function newProject(format: FormatKey = 'story', name?: string): Project {
  const now = Date.now();
  return {
    id: uid('pr_'),
    name: name ?? `Pieza ${new Date(now).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}`,
    format,
    pages: [newPage()],
    createdAt: now,
    updatedAt: now,
    status: 'borrador',
  };
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

interface StudioState {
  projects: Project[];
  currentId: string;
  pageIndex: number;
  selectedId: string | null;
  guides: boolean;
  igUi: boolean;
  panel: PanelKey;
  assets: Asset[];
  week: WeekPlan | null;
  past: Project[];
  future: Project[];

  current: () => Project;
  page: () => Page;
  setPanel: (p: PanelKey) => void;
  toggleGuides: () => void;
  toggleIgUi: () => void;
  select: (id: string | null) => void;

  /** Guarda un punto de deshacer antes de una edición. */
  checkpoint: () => void;
  undo: () => void;
  redo: () => void;

  mutate: (fn: (p: Project) => void, opts?: { history?: boolean }) => void;
  mutatePage: (fn: (pg: Page) => void, opts?: { history?: boolean }) => void;

  setFormat: (f: FormatKey) => void;
  addLayer: (props: StickerProps, place?: Partial<Layer>) => string;
  updateLayer: (id: string, patch: Partial<Layer>, opts?: { history?: boolean }) => void;
  updateProps: (id: string, patch: Partial<StickerProps>) => void;
  removeLayer: (id: string) => void;
  duplicateLayer: (id: string) => void;
  moveLayer: (id: string, dir: 1 | -1 | 'top' | 'bottom') => void;
  setBackground: (patch: Partial<Background>, opts?: { history?: boolean }) => void;

  goPage: (i: number) => void;
  addPage: (span?: number) => void;
  duplicatePage: (i: number) => void;
  removePage: (i: number) => void;
  movePage: (i: number, dir: -1 | 1) => void;
  setSpan: (span: number) => void;

  createProject: (format?: FormatKey) => void;
  openProject: (id: string) => void;
  duplicateProject: (id: string) => void;
  deleteProject: (id: string) => void;
  importProject: (p: Project) => void;
  setCopy: (c: CopyPiece) => void;

  addAsset: (a: Asset) => void;
  updateAsset: (id: string, patch: Partial<Asset>) => void;
  removeAsset: (id: string) => void;
  setWeek: (w: WeekPlan | null) => void;
  /** Agrega proyectos sin abrirlos (piezas de la semana). */
  addProjects: (ps: Project[]) => void;
}

const first = newProject('story', 'Primera pieza GEA');

export const useStudio = create<StudioState>()(
  persist(
    (set, get) => ({
      projects: [first],
      currentId: first.id,
      pageIndex: 0,
      selectedId: null,
      guides: true,
      igUi: false,
      panel: 'stickers',
      assets: [],
      week: null,
      past: [],
      future: [],

      current: () => {
        const s = get();
        return s.projects.find((p) => p.id === s.currentId) ?? s.projects[0];
      },
      page: () => {
        const p = get().current();
        return p.pages[Math.min(get().pageIndex, p.pages.length - 1)];
      },
      setPanel: (panel) => set({ panel }),
      toggleGuides: () => set((s) => ({ guides: !s.guides })),
      toggleIgUi: () => set((s) => ({ igUi: !s.igUi })),
      select: (selectedId) => set({ selectedId }),

      checkpoint: () => set((s) => ({ past: [...s.past.slice(-49), clone(s.current())], future: [] })),
      undo: () => {
        const s = get();
        const prev = s.past[s.past.length - 1];
        if (!prev) return;
        const cur = clone(s.current());
        set({
          projects: s.projects.map((p) => (p.id === prev.id ? prev : p)),
          past: s.past.slice(0, -1),
          future: [cur, ...s.future].slice(0, 50),
          pageIndex: Math.min(s.pageIndex, prev.pages.length - 1),
          selectedId: null,
        });
      },
      redo: () => {
        const s = get();
        const next = s.future[0];
        if (!next) return;
        const cur = clone(s.current());
        set({
          projects: s.projects.map((p) => (p.id === next.id ? next : p)),
          future: s.future.slice(1),
          past: [...s.past, cur],
          pageIndex: Math.min(s.pageIndex, next.pages.length - 1),
          selectedId: null,
        });
      },

      mutate: (fn, opts) => {
        if (opts?.history !== false) get().checkpoint();
        set((s) => ({
          projects: s.projects.map((p) => {
            if (p.id !== s.currentId) return p;
            const c = clone(p);
            fn(c);
            c.updatedAt = Date.now();
            return c;
          }),
        }));
      },
      mutatePage: (fn, opts) => {
        const i = get().pageIndex;
        get().mutate((p) => fn(p.pages[Math.min(i, p.pages.length - 1)]), opts);
      },

      setFormat: (f) =>
        get().mutate((p) => {
          // reubica las capas proporcionalmente al nuevo alto
          const oldH = FORMATS[p.format].h;
          const newH = FORMATS[f].h;
          p.pages.forEach((pg) => pg.layers.forEach((l) => (l.y = (l.y / oldH) * newH)));
          p.format = f;
        }),

      addLayer: (props, place) => {
        const id = uid('ly_');
        const p = get().current();
        const pg = get().page();
        const fw = FORMATS[p.format].w;
        const H = FORMATS[p.format].h;
        const spec = kindSpec(props.kind);
        // posición por defecto: centro del slide visible; la pestaña se pega al borde
        let x = (pg.span * fw) / 2;
        if (props.kind === 'tab') {
          const r = renderSticker(props);
          const sc = place?.scale ?? spec.scale ?? 1;
          x = (props.side ?? 'right') === 'right' ? pg.span * fw - (r.w * sc) / 2 : (r.w * sc) / 2;
        }
        const layer: Layer = {
          id,
          props,
          x,
          y: H * 0.5,
          scale: spec.scale ?? 1,
          rotation: spec.rotation ?? 0,
          opacity: 1,
          ...place,
        };
        get().mutatePage((pg2) => pg2.layers.push(layer));
        set({ selectedId: id });
        return id;
      },
      updateLayer: (id, patch, opts) =>
        get().mutatePage((pg) => {
          const l = pg.layers.find((x) => x.id === id);
          if (l) Object.assign(l, patch);
        }, opts),
      updateProps: (id, patch) =>
        get().mutatePage((pg) => {
          const l = pg.layers.find((x) => x.id === id);
          if (l) l.props = { ...l.props, ...patch };
        }),
      removeLayer: (id) => {
        get().mutatePage((pg) => (pg.layers = pg.layers.filter((l) => l.id !== id)));
        set({ selectedId: null });
      },
      duplicateLayer: (id) => {
        const nid = uid('ly_');
        get().mutatePage((pg) => {
          const l = pg.layers.find((x) => x.id === id);
          if (l) pg.layers.push({ ...clone(l), id: nid, x: l.x + 40, y: l.y + 40 });
        });
        set({ selectedId: nid });
      },
      moveLayer: (id, dir) =>
        get().mutatePage((pg) => {
          const i = pg.layers.findIndex((l) => l.id === id);
          if (i < 0) return;
          const [l] = pg.layers.splice(i, 1);
          const j = dir === 'top' ? pg.layers.length : dir === 'bottom' ? 0 : Math.max(0, Math.min(pg.layers.length, i + dir));
          pg.layers.splice(j, 0, l);
        }),
      setBackground: (patch, opts) => get().mutatePage((pg) => Object.assign(pg.background, patch), opts),

      goPage: (i) => set({ pageIndex: i, selectedId: null }),
      addPage: (span = 1) => {
        get().mutate((p) => {
          const bg = p.pages[p.pages.length - 1]?.background;
          const pg = newPage(span);
          if (bg) pg.background = { ...clone(bg), kind: 'none', mediaId: undefined, mediaName: undefined };
          p.pages.push(pg);
        });
        set({ pageIndex: get().current().pages.length - 1, selectedId: null });
      },
      duplicatePage: (i) => {
        get().mutate((p) => {
          const c = clone(p.pages[i]);
          c.id = uid('pg_');
          c.layers.forEach((l) => (l.id = uid('ly_')));
          p.pages.splice(i + 1, 0, c);
        });
        set({ pageIndex: i + 1, selectedId: null });
      },
      removePage: (i) => {
        if (get().current().pages.length <= 1) return;
        get().mutate((p) => p.pages.splice(i, 1));
        set((s) => ({ pageIndex: Math.max(0, Math.min(s.pageIndex, s.current().pages.length - 1)), selectedId: null }));
      },
      movePage: (i, dir) => {
        const j = i + dir;
        if (j < 0 || j >= get().current().pages.length) return;
        get().mutate((p) => {
          const [pg] = p.pages.splice(i, 1);
          p.pages.splice(j, 0, pg);
        });
        set({ pageIndex: j });
      },
      setSpan: (span) =>
        get().mutatePage((pg) => {
          const fw = 1080;
          // si se achica, las capas que quedan afuera vuelven al último slide
          pg.span = span;
          pg.layers.forEach((l) => {
            if (l.x > span * fw) l.x = span * fw - fw / 2;
          });
        }),

      createProject: (format = 'story') => {
        const p = newProject(format);
        set((s) => ({ projects: [p, ...s.projects], currentId: p.id, pageIndex: 0, selectedId: null, past: [], future: [] }));
      },
      openProject: (id) => set({ currentId: id, pageIndex: 0, selectedId: null, past: [], future: [] }),
      duplicateProject: (id) => {
        const src = get().projects.find((p) => p.id === id);
        if (!src) return;
        const c = clone(src);
        c.id = uid('pr_');
        c.name = `${src.name} (copia)`;
        c.createdAt = c.updatedAt = Date.now();
        set((s) => ({ projects: [c, ...s.projects] }));
      },
      deleteProject: (id) => {
        const rest = get().projects.filter((p) => p.id !== id);
        const projects = rest.length ? rest : [newProject()];
        set((s) => ({
          projects,
          currentId: s.currentId === id ? projects[0].id : s.currentId,
          pageIndex: 0,
          selectedId: null,
          past: [],
          future: [],
        }));
      },
      importProject: (p) => {
        const c = { ...p, id: uid('pr_'), updatedAt: Date.now() };
        set((s) => ({ projects: [c, ...s.projects], currentId: c.id, pageIndex: 0, selectedId: null, past: [], future: [] }));
      },
      setCopy: (copy) => get().mutate((p) => {
        p.copy = copy;
        p.pillar = copy.pillar;
      }),

      addAsset: (a) => set((s) => ({ assets: [a, ...s.assets] })),
      updateAsset: (id, patch) => set((s) => ({ assets: s.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
      removeAsset: (id) => set((s) => ({ assets: s.assets.filter((a) => a.id !== id) })),
      setWeek: (week) => set({ week }),
      addProjects: (ps) => set((s) => ({ projects: [...ps, ...s.projects.filter((p) => !ps.some((n) => n.id === p.id))] })),
    }),
    {
      name: 'gea-canvas:v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ projects: s.projects, currentId: s.currentId, guides: s.guides, igUi: s.igUi, assets: s.assets, week: s.week }),
    },
  ),
);

/** Selector del proyecto actual (re-render solo cuando cambia). */
export const useCurrent = () =>
  useStudio((s) => s.projects.find((p) => p.id === s.currentId) ?? s.projects[0]);

export const usePage = () => {
  const p = useCurrent();
  const i = useStudio((s) => s.pageIndex);
  return p.pages[Math.min(i, p.pages.length - 1)];
};
