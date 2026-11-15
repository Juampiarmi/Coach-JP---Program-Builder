import { useEffect, useRef, useState } from 'react'
import { usePersistentState } from '../hooks/usePersistentState'
import { ASPECTS } from '../lib/brand'
import { renderThumb } from '../lib/exporter'
import { EMPTY_FEED, FEED_GRID_KEY, feedThumb, GRID_SLOTS, gridVerdict, sampleColor, type FeedGridStore, type GridVerdict, type RGB } from '../lib/feedGrid'
import type { Project } from '../lib/projects'
import type { CanvasState } from '../types'
import { TacticalCanvas } from './canvas/TacticalCanvas'

interface Props {
  /** Portada del set (placa 1) */
  cover: CanvasState
  coverImage: string | null
  resolveImage: (id: string | null | undefined) => string | null
  slideCount: number
  /** Proyectos de la biblioteca: sus miniaturas completan la grilla si faltan capturas */
  projects: Project[]
  currentProjectId: string | null
  onClose: () => void
}

const TILE_W = 120
const GAP = 2

/**
 * [ ▦ VISTA FEED 3×3 ]: la portada nueva arriba a la izquierda de una grilla de perfil simulada con
 * los últimos posts (capturas propias o proyectos guardados), con lectura de contraste y armonía.
 * Sólo pantalla: nada de esto entra en la exportación.
 */
export function FeedGridPreview({ cover, coverImage, resolveImage, slideCount, projects, currentProjectId, onClose }: Props) {
  const [store, setStore] = usePersistentState<FeedGridStore>(FEED_GRID_KEY, EMPTY_FEED)
  const [verdict, setVerdict] = useState<GridVerdict | null>(null)
  const [measuring, setMeasuring] = useState(false)
  const coverRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Los 8 posts anteriores: primero las capturas reales; si faltan, los proyectos guardados más recientes.
  const fromLibrary = projects
    .filter((p) => !p.draft && p.thumb && p.id !== currentProjectId)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((p) => ({ id: p.id, thumb: p.thumb!, label: p.name, own: false }))
  const feed = [...store.posts.map((p) => ({ id: p.id, thumb: p.thumb, label: 'Captura', own: true })), ...fromLibrary].slice(0, GRID_SLOTS)

  const tileH = store.crop === '3:4' ? (TILE_W * 4) / 3 : TILE_W
  const { w, h } = ASPECTS[cover.aspect]
  const scale = Math.max(TILE_W / w, tileH / h)

  // Contraste y armonía: se mide la portada renderizada y el color medio de cada post.
  const coverKey = JSON.stringify(cover) + (coverImage?.length ?? 0)
  const feedKey = feed.map((f) => f.id).join('|')
  useEffect(() => {
    let alive = true
    const t = window.setTimeout(async () => {
      if (!coverRef.current || !feed.length) return setVerdict(null)
      setMeasuring(true)
      try {
        const coverColor = await sampleColor(await renderThumb(coverRef.current, w, h))
        const colors: RGB[] = []
        for (const f of feed) colors.push(await sampleColor(f.thumb))
        if (alive) setVerdict(gridVerdict(coverColor, colors))
      } catch {
        if (alive) setVerdict(null)
      } finally {
        if (alive) setMeasuring(false)
      }
    }, 500)
    return () => {
      alive = false
      window.clearTimeout(t)
    }
    // Se vuelve a medir sólo si cambian la portada o los posts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coverKey, feedKey])

  const addShots = async (files: File[]) => {
    const posts: FeedGridStore['posts'] = []
    for (const f of files.filter((x) => x.type.startsWith('image/'))) posts.push({ id: `fp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, thumb: await feedThumb(f), addedAt: Date.now() })
    // Elegí las capturas del post más nuevo al más viejo: quedan en ese orden detrás de la portada.
    if (posts.length) setStore((s) => ({ ...s, posts: [...posts, ...s.posts].slice(0, GRID_SLOTS) }))
  }

  const cells = Array.from({ length: GRID_SLOTS }, (_, i) => feed[i] ?? null)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Vista previa en grilla de Instagram"
        className="tc-scroll flex max-h-[92dvh] w-full max-w-[760px] flex-col gap-4 overflow-y-auto rounded-2xl border border-line bg-surface p-4 shadow-2xl sm:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0">
          {/* Perfil simulado */}
          <div className="mb-2 flex items-center gap-2.5">
            <span className="size-10 rounded-full bg-gradient-to-br from-fire to-gold p-0.5">
              <span className="block h-full w-full rounded-full bg-carbon" />
            </span>
            <div>
              <p className="text-[12px] font-semibold text-white">Tu perfil</p>
              <p className="font-mono text-[9px] text-steel">Vista de la grilla · recorte {store.crop}</p>
            </div>
          </div>
          <div className="grid bg-carbon" style={{ gridTemplateColumns: `repeat(3, ${TILE_W}px)`, gap: GAP }} data-testid="feed-grid">
            <div className="relative overflow-hidden ring-2 ring-cyan" style={{ width: TILE_W, height: tileH }} data-testid="feed-cover">
              <div className="absolute origin-top-left" style={{ transform: `scale(${scale})`, left: (TILE_W - w * scale) / 2, top: (tileH - h * scale) / 2 }}>
                <TacticalCanvas ref={coverRef} state={cover} bgImage={coverImage} slideIndex={0} slideCount={slideCount} resolveImage={resolveImage} />
              </div>
              <span className="absolute top-1 left-1 rounded bg-cyan px-1 font-mono text-[7px] font-bold tracking-wider text-carbon">NUEVO</span>
              {slideCount > 1 && <span className="absolute top-1 right-1 font-mono text-[10px] text-white drop-shadow">❐</span>}
            </div>
            {cells.map((c, i) =>
              c ? (
                <div key={c.id} className="group relative overflow-hidden" style={{ width: TILE_W, height: tileH }} title={c.label} data-feed-post={c.own ? 'shot' : 'project'}>
                  <img src={c.thumb} alt="" className="h-full w-full object-cover" />
                  {c.own && (
                    <button
                      type="button"
                      onClick={() => setStore((s) => ({ ...s, posts: s.posts.filter((p) => p.id !== c.id) }))}
                      className="absolute top-1 right-1 hidden rounded bg-carbon/80 px-1 font-mono text-[9px] text-white group-hover:block"
                      aria-label="Quitar captura"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ) : (
                <div key={`empty-${i}`} className="flex items-center justify-center bg-surface-2 font-mono text-[8px] tracking-wider text-steel/40" style={{ width: TILE_W, height: tileH }}>
                  POST {i + 1}
                </div>
              ),
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-mono text-[12px] font-semibold tracking-[0.16em] text-cyan">[ ▦ VISTA FEED 3×3 ]</h2>
            <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-md border border-line px-2.5 py-1 font-mono text-[11px] text-steel hover:text-white">
              ✕
            </button>
          </div>
          <div className="flex gap-1">
            {(['3:4', '1:1'] as const).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={store.crop === c}
                onClick={() => setStore((s) => ({ ...s, crop: c }))}
                className={`rounded-full border px-2.5 py-1 font-mono text-[9px] font-semibold tracking-wider ${store.crop === c ? 'border-cyan/70 bg-cyan/15 text-cyan' : 'border-line text-steel hover:text-white'}`}
              >
                GRILLA {c}
                {c === '3:4' ? ' (ACTUAL)' : ' (CLÁSICA)'}
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-line bg-surface-2/50 p-3" data-testid="grid-verdict">
            <p className="mb-1 font-mono text-[9px] tracking-[0.14em] text-steel uppercase">Contraste y armonía</p>
            {!feed.length ? (
              <p className="text-[11px] leading-snug text-steel">Subí capturas de tus últimos posts (o guardá proyectos en la biblioteca) para comparar la portada con tu feed.</p>
            ) : measuring && !verdict ? (
              <p className="font-mono text-[10px] text-steel">Midiendo…</p>
            ) : verdict ? (
              <ul className="space-y-1.5">
                <li className={`text-[11px] leading-snug ${verdict.standsOut ? 'text-cyan' : 'text-fire'}`}>
                  {verdict.standsOut ? '✓' : '⚠'} {verdict.notes[0]}
                </li>
                <li className={`text-[11px] leading-snug ${verdict.harmonious ? 'text-cyan' : 'text-gold'}`}>
                  {verdict.harmonious ? '✓' : '⚠'} {verdict.notes[1]}
                </li>
              </ul>
            ) : (
              <p className="font-mono text-[10px] text-steel">No se pudo medir la portada.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              aria-label="Subir capturas de los últimos posts"
              onChange={(e) => {
                const files = [...(e.target.files ?? [])]
                e.target.value = ''
                void addShots(files)
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-md border border-dashed border-cyan/40 bg-cyan/5 px-2.5 py-2 font-mono text-[10px] tracking-[0.1em] text-cyan hover:bg-cyan/10"
            >
              + CAPTURAS DE MIS ÚLTIMOS POSTS
            </button>
            <p className="font-mono text-[9px] leading-relaxed text-steel/70">
              Elegilas del post más nuevo al más viejo. {store.posts.length ? `${store.posts.length} capturas` : 'Sin capturas'}
              {fromLibrary.length ? ` · ${Math.min(fromLibrary.length, Math.max(0, GRID_SLOTS - store.posts.length))} de la biblioteca` : ''}. Sólo pantalla: no se exporta.
            </p>
            {store.posts.length > 0 && (
              <button type="button" onClick={() => setStore((s) => ({ ...s, posts: [] }))} className="font-mono text-[9px] text-steel hover:text-fire">
                BORRAR CAPTURAS
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
