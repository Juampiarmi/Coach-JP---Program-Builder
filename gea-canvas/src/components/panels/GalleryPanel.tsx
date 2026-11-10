'use client';
import { useRef, useState } from 'react';
import { Check, ImagePlus, Loader2, Play, Trash2 } from 'lucide-react';
import { uid } from '@/lib/id';
import { deleteMedia, makeThumb, mediaInUse, normalizeImage, saveMedia } from '@/lib/media';
import { ASSET_CATEGORIES, usePage, useStudio, type Asset, type AssetCategory } from '@/store/studio';
import { Section } from '../ui';

const CATS = Object.keys(ASSET_CATEGORIES) as AssetCategory[];

/** Galería GEA: fondos de las instalaciones guardados en el dispositivo (IndexedDB), por categoría. */
export function GalleryPanel() {
  const assets = useStudio((s) => s.assets);
  const addAsset = useStudio((s) => s.addAsset);
  const updateAsset = useStudio((s) => s.updateAsset);
  const removeAsset = useStudio((s) => s.removeAsset);
  const setBackground = useStudio((s) => s.setBackground);
  const page = usePage();
  const [filter, setFilter] = useState<AssetCategory | 'all'>('all');
  const [target, setTarget] = useState<AssetCategory>('suite');
  const [busy, setBusy] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList | File[] | null) => {
    const list = [...(files ?? [])].filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'));
    for (const [i, f] of list.entries()) {
      setBusy(`${i + 1}/${list.length}`);
      const kind = f.type.startsWith('video/') ? 'video' : 'image';
      const blob = kind === 'video' ? f : await normalizeImage(f);
      const mediaId = await saveMedia(blob);
      const thumb = await makeThumb(blob, kind);
      addAsset({ id: uid('as_'), mediaId, name: f.name.replace(/\.[^.]+$/, ''), kind, category: filter === 'all' ? target : filter, thumb, createdAt: Date.now() });
    }
    setBusy(null);
  };

  const use = (a: Asset) => setBackground({ kind: a.kind, mediaId: a.mediaId, mediaName: a.name, zoom: 1, offsetX: 0, offsetY: 0 });

  const remove = async (a: Asset) => {
    if (!confirm(`¿Quitar “${a.name}” de la galería?`)) return;
    removeAsset(a.id);
    const s = useStudio.getState();
    if (!mediaInUse(a.mediaId, s.projects, s.assets)) await deleteMedia(a.mediaId);
  };

  const shown = assets.filter((a) => filter === 'all' || a.category === filter);

  return (
    <div>
      <Section title="Galería GEA" right={<span className="text-[10px] text-white/40">{assets.length} fondo(s)</span>}>
        <p className="mb-3 text-[11px] leading-snug text-white/50">
          Cargá una vez las fotos y videos de las instalaciones y usalos de fondo en cualquier pieza, sin buscar en el carrete. Quedan guardados en este dispositivo y entran en el respaldo JSON.
        </p>
        <div className="mb-3 flex flex-wrap gap-1">
          <Chip on={filter === 'all'} onClick={() => setFilter('all')}>
            Todas · {assets.length}
          </Chip>
          {CATS.map((c) => (
            <Chip key={c} on={filter === c} onClick={() => setFilter(c)}>
              {ASSET_CATEGORIES[c]} · {assets.filter((a) => a.category === c).length}
            </Chip>
          ))}
        </div>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            upload(e.dataTransfer.files);
          }}
          className={`rounded-xl border border-dashed p-3 transition ${drag ? 'border-neon bg-neon/10' : 'border-white/15'}`}
        >
          <div className="flex items-center gap-2">
            {filter === 'all' && (
              <select value={target} onChange={(e) => setTarget(e.target.value as AssetCategory)} className="rounded-lg bg-black/40 px-2 py-2 text-xs text-white ring-1 ring-white/10" aria-label="Categoría">
                {CATS.map((c) => (
                  <option key={c} value={c}>
                    {ASSET_CATEGORIES[c]}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => input.current?.click()}
              disabled={!!busy}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/10 hover:bg-white/10"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              {busy ? `Guardando ${busy}…` : `Subir a ${ASSET_CATEGORIES[filter === 'all' ? target : filter]}`}
            </button>
          </div>
          <div className="mt-1.5 text-center text-[10px] text-white/35">Podés elegir o arrastrar varias a la vez</div>
        </div>
        <input ref={input} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => upload(e.target.files)} />
      </Section>

      <Section title={filter === 'all' ? 'Todos los fondos' : ASSET_CATEGORIES[filter]}>
        {shown.length === 0 ? (
          <p className="text-[11px] text-white/40">Todavía no hay fondos en esta categoría.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {shown.map((a) => {
              const active = page.background.mediaId === a.mediaId;
              return (
                <div key={a.id} className={`group relative overflow-hidden rounded-lg ring-2 ${active ? 'ring-neon' : 'ring-white/10'}`}>
                  <button onClick={() => use(a)} title="Usar de fondo" className="block aspect-[9/14] w-full bg-ink">
                    {a.thumb && <img src={a.thumb} alt={a.name} className="h-full w-full object-cover" />}
                  </button>
                  {a.kind === 'video' && <Play className="pointer-events-none absolute left-1.5 top-1.5 h-3.5 w-3.5 fill-white text-white drop-shadow" />}
                  {active && <Check className="pointer-events-none absolute right-1.5 top-1.5 h-4 w-4 rounded-full bg-neon p-0.5 text-white" />}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-1.5 pt-5">
                    <div className="truncate text-[10px] font-semibold text-white">{a.name}</div>
                    <div className="mt-1 flex items-center gap-1 opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100">
                      <select
                        value={a.category}
                        onChange={(e) => updateAsset(a.id, { category: e.target.value as AssetCategory })}
                        className="min-w-0 flex-1 rounded bg-black/70 px-1 py-0.5 text-[9px] text-white"
                        aria-label="Cambiar categoría"
                      >
                        {CATS.map((c) => (
                          <option key={c} value={c}>
                            {ASSET_CATEGORIES[c]}
                          </option>
                        ))}
                      </select>
                      <button onClick={() => remove(a)} title="Quitar" className="rounded bg-black/70 p-0.5 text-red-300">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${on ? 'bg-white text-ink' : 'bg-white/[0.05] text-white/60 hover:bg-white/10'}`}>
      {children}
    </button>
  );
}
