import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { pressDrag } from './drag'
import { timecode } from './render'
import type { ClipInfo, GenericItem, OverlayItem, Track, TrackItem } from './types'

interface Props {
  tracks: Track[]
  clip: ClipInfo | null
  duration: number
  time: number
  thumbs: string[]
  /** Ítems seleccionados (overlay, goniómetro, disparo de FX) */
  selectedIds: (string | null)[]
  onSeek: (t: number) => void
  onTrim: (inPoint: number, outPoint: number) => void
  onItem: (id: string, start: number, end: number) => void
  onSelect: (id: string) => void
  /** Borra un ítem `deletable` (botón ✕ flotante) */
  onDelete?: (id: string) => void
  /** Estado vacío interactivo por pista (ej. S1 / A2 sin contenido) */
  placeholders?: Partial<Record<string, { label: string; onClick: () => void }>>
}

const LABEL_W = 132
const ROW_H = 38
/** Alto extra por cada carril adicional en pistas apiladas */
const LANE_H = 20
const MIN_LEN = 0.3
/** Ancho fijo del badge de un disparo (A3) */
const BADGE_W = 30
const TONE: Record<string, [string, string]> = {
  cyan: ['border-cyan/60 bg-cyan/15 text-cyan', 'border-white bg-cyan/30 text-white'],
  fire: ['border-fire/60 bg-fire/15 text-fire', 'border-white bg-fire/35 text-white'],
}

/** Ancho en px de un ítem en la pista. */
const itemWidth = (item: TrackItem, pps: number) => {
  if (item.type === 'overlay') return Math.max(6, (item.end - item.start) * pps)
  if (item.data?.badge) return BADGE_W
  // Badges con color (B1): ancho mínimo para que el rótulo se lea.
  return Math.max(item.data?.tone ? 120 : 6, (item.end - item.start) * pps)
}

/** Carril de cada ítem (empaquetado greedy por píxeles, con 4 px de aire): los que se pisan bajan de carril. */
function packLanes(items: TrackItem[], pps: number): { lane: Map<string, number>; count: number } {
  const ends: number[] = []
  const lane = new Map<string, number>()
  for (const it of [...items].sort((a, b) => a.start - b.start)) {
    const x = it.start * pps
    let k = ends.findIndex((e) => e <= x)
    if (k < 0) k = ends.length
    ends[k] = x + itemWidth(it, pps) + 4
    lane.set(it.id, k)
  }
  return { lane, count: Math.max(1, ends.length) }
}

const KIND_LABEL: Record<OverlayItem['overlay']['kind'], string> = { badge: 'MÉTRICA', headline: 'PLACA', timer: 'TIMER', checklist: 'CHECK', watermark: 'FIRMA' }

/**
 * Nivel de la pista A2: relleno proporcional al volumen, con los tramos de auto-ducking
 * (habla en S1) marcados más bajos.
 */
function AudioLevel({ item }: { item: GenericItem }) {
  const volume = Number(item.data?.volume ?? 0)
  const segments = (item.data?.segments ?? []) as [number, number][]
  const span = Math.max(0.01, item.end - item.start)
  return (
    <span className="pointer-events-none absolute inset-0">
      <span className="absolute inset-x-0 bottom-0 bg-cyan/25" style={{ height: `${Math.max(6, volume)}%` }} />
      {segments.map(([a, b], i) => {
        const left = Math.max(0, (a - item.start) / span)
        const right = Math.min(1, (b - item.start) / span)
        if (right <= 0 || left >= 1) return null
        return <span key={i} className="absolute top-0 bottom-0 bg-black/45" style={{ left: `${left * 100}%`, width: `${(right - left) * 100}%` }} title="Auto-ducking" />
      })}
    </span>
  )
}

/** Forma de onda de una toma de voz (picos del tramo recortado). */
function Wave({ peaks }: { peaks: number[] }) {
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center gap-px px-1 opacity-45">
      {peaks.map((p, i) => (
        <span key={i} className="min-w-0 flex-1 rounded-full bg-current" style={{ height: `${Math.max(8, p * 90)}%` }} />
      ))}
    </span>
  )
}

/** Texto corto del bloque en la pista. */
function itemText(o: OverlayItem['overlay']) {
  if (o.kind === 'badge') return o.value
  if (o.kind === 'headline') return o.headlineA
  if (o.kind === 'timer') return o.timerLabel ?? 'TIEMPO'
  if (o.kind === 'checklist') return `${(o.checks ?? []).filter((c) => c.text.trim()).length} ítems`
  return 'COACH JP'
}

/** Arrastre horizontal en segundos (estricto: sólo con el botón presionado). */
function useDrag(pps: number) {
  return (e: RPointerEvent, onMove: (dt: number) => void) => {
    const x0 = e.clientX
    pressDrag(e, (ev) => onMove((ev.clientX - x0) / pps))
  }
}

/**
 * Timeline táctico multicapa. Dibuja cualquier pista genéricamente (V1 video, V2 overlay y,
 * en próximas fases, A1/A2 audio y subtítulos); sólo V1 (trim) y overlay (mover / estirar)
 * tienen edición en la fase 1.
 */
export function Timeline({ tracks, clip, duration, time, thumbs, selectedIds, onSeek, onTrim, onItem, onSelect, onDelete, placeholders = {} }: Props) {
  const areaRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  const d = Math.max(0.1, duration)
  const pps = width / d
  const drag = useDrag(pps)
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
  const step = d > 60 ? 10 : d > 20 ? 5 : d > 8 ? 1 : 0.5

  // Scrub: click o arrastre sobre la regla mueve el cabezal.
  // Scrub: el cabezal se mueve sólo con click directo o arrastre con el botón presionado.
  const scrub = (e: RPointerEvent) => {
    if (e.button !== 0) return
    const rect = areaRef.current!.getBoundingClientRect()
    const at = (x: number) => onSeek(clamp((x - rect.left) / pps, 0, d))
    at(e.clientX)
    pressDrag(e, (ev) => at(ev.clientX))
  }

  // Carriles por pista apilada y alto de cada fila.
  const lanes = new Map(tracks.filter((t) => t.stack).map((t) => [t.id, packLanes(t.items, pps)]))
  const rowH = (t: Track) => ROW_H + ((lanes.get(t.id)?.count ?? 1) - 1) * LANE_H

  const renderItem = (track: Track, item: TrackItem) => {
    const left = item.start * pps
    const w = itemWidth(item, pps)
    // Overlays: mover y estirar. Ítems genéricos: según su `editable` (goniómetros, disparos de FX).
    const editable = item.type === 'overlay' ? 'range' : item.editable
    const on = selectedIds.includes(item.id)
    const pack = lanes.get(track.id)
    const k = pack?.lane.get(item.id) ?? 0
    const n = pack?.count ?? 1
    // En pistas apiladas cada carril ocupa su franja; si no, el ítem llena la fila.
    const pos = pack ? { top: `calc(${(k / n) * 100}% + 3px)`, height: `calc(${100 / n}% - 6px)` } : { top: 6, bottom: 6 }
    const tone = item.type !== 'overlay' && typeof item.data?.tone === 'string' ? TONE[item.data.tone] : null
    const badge = item.type !== 'overlay' && Boolean(item.data?.badge)
    const move = (e: RPointerEvent, mode: 'move' | 'start' | 'end') => {
      onSelect(item.id)
      const { start, end } = item
      drag(e, (dt) => {
        if (mode === 'move') {
          const len = end - start
          const s = clamp(start + dt, 0, d - len)
          onItem(item.id, s, s + len)
        } else if (mode === 'start') onItem(item.id, clamp(start + dt, 0, end - MIN_LEN), end)
        else onItem(item.id, start, clamp(end + dt, start + MIN_LEN, d))
      })
    }
    const cls = tone ? tone[on ? 1 : 0] : on ? 'border-fire bg-fire/25 text-white' : 'border-cyan/50 bg-cyan/15 text-cyan'
    return [
      <div
        key={item.id}
        data-item={item.id}
        onPointerDown={
          editable
            ? (e) => move(e, 'move')
            : (e) => {
                if (e.button !== 0) return
                if (item.type !== 'overlay' && item.deletable) onSelect(item.id)
                onSeek(item.start)
              }
        }
        className={`absolute flex items-center overflow-hidden border font-mono text-[10px] font-semibold tracking-wider select-none ${badge ? 'justify-center rounded-full' : 'rounded-md'} ${cls} ${
          on && tone ? 'ring-1 ring-fire' : ''
        } ${editable ? 'cursor-grab active:cursor-grabbing' : ''}`}
        style={{ left, width: w, ...pos, touchAction: 'none' }}
        title={`${timecode(item.start)}${badge ? '' : ` → ${timecode(item.end)}`}`}
      >
        {editable === 'range' && <span onPointerDown={(e) => move(e, 'start')} className="absolute inset-y-0 left-0 z-10 w-2 cursor-ew-resize bg-white/30 hover:bg-white/60" />}
        {item.type === 'audio' && (Array.isArray(item.data?.wave) ? <Wave peaks={item.data.wave as number[]} /> : <AudioLevel item={item} />)}
        <span className={`relative truncate ${badge ? '' : item.type !== 'overlay' && item.data?.wave ? 'mx-2.5 rounded bg-black/70 px-1.5 text-white' : 'px-3'}`}>
          {item.type === 'overlay' ? `${KIND_LABEL[item.overlay.kind]} · ${itemText(item.overlay)}` : String(item.data?.text ?? track.label)}
        </span>
        {editable === 'range' && <span onPointerDown={(e) => move(e, 'end')} className="absolute inset-y-0 right-0 z-10 w-2 cursor-ew-resize bg-white/30 hover:bg-white/60" />}
      </div>,
      // Borrado en un click: ✕ flotante en la esquina del ítem seleccionado.
      on && item.type !== 'overlay' && item.deletable && onDelete ? (
        <button
          key={`${item.id}-x`}
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onDelete(item.id)}
          aria-label="Eliminar"
          title="Eliminar (Supr)"
          className="absolute z-10 flex size-4 items-center justify-center rounded-full border border-white bg-fire font-mono text-[9px] leading-none font-bold text-white shadow-[0_0_6px_rgba(0,0,0,.8)] hover:brightness-125"
          style={{ left: left + w - 8, top: pack ? `calc(${(k / n) * 100}% - 4px)` : -2 }}
        >
          ✕
        </button>
      ) : null,
    ]
  }

  const videoRow = (track: Track) => {
    const inX = (clip?.in ?? 0) * pps
    const outX = (clip?.out ?? d) * pps
    const trim = (e: RPointerEvent, edge: 'in' | 'out') => {
      if (!clip) return
      const { in: i0, out: o0 } = clip
      drag(e, (dt) => {
        if (edge === 'in') onTrim(clamp(i0 + dt, 0, o0 - MIN_LEN), o0)
        else onTrim(i0, clamp(o0 + dt, i0 + MIN_LEN, clip.duration))
      })
    }
    return (
      <div key={track.id} className="relative h-full overflow-hidden rounded-md border border-line bg-surface-2">
        {clip ? (
          <>
            <div className="absolute inset-0 flex">
              {thumbs.map((src, i) => (
                <img key={i} src={src} alt="" className="h-full min-w-0 flex-1 object-cover opacity-80" draggable={false} />
              ))}
            </div>
            <div className="absolute inset-y-0 left-0 bg-black/70" style={{ width: inX }} />
            <div className="absolute inset-y-0 right-0 bg-black/70" style={{ left: outX }} />
            <div className="absolute inset-y-0 border-y-2 border-cyan/80" style={{ left: inX, width: outX - inX }}>
              <span className="absolute top-1 left-3 rounded bg-black/70 px-1.5 font-mono text-[9px] tracking-wider text-white">
                {clip.name} · {timecode(clip.out - clip.in)}
              </span>
            </div>
            {(['in', 'out'] as const).map((edge) => (
              <div
                key={edge}
                onPointerDown={(e) => trim(e, edge)}
                title={edge === 'in' ? 'Corte inicial (In)' : 'Corte final (Out)'}
                className="absolute inset-y-0 flex w-3 cursor-ew-resize items-center justify-center bg-cyan text-carbon"
                style={{ left: edge === 'in' ? inX : outX - 12, touchAction: 'none' }}
              >
                <span className="font-mono text-[8px] font-bold">{edge === 'in' ? '[' : ']'}</span>
              </div>
            ))}
          </>
        ) : (
          <span className="absolute inset-0 flex items-center px-3 font-mono text-[10px] tracking-wider text-steel/60">SIN CLIP · SUBÍ UN VIDEO</span>
        )}
      </div>
    )
  }

  const ticks = Array.from({ length: Math.floor(d / step) + 1 }, (_, i) => i * step)
  return (
    <div className="shrink-0 rounded-xl border border-line bg-carbon/90 px-3 py-2">
      <div className="flex">
        <div style={{ width: LABEL_W }} className="shrink-0 font-mono text-[9px] tracking-[0.16em] text-steel">
          <div className="flex h-6 items-center">{timecode(time)}</div>
          {tracks.map((t) => (
            <div key={t.id} className="flex items-center pr-2 font-semibold" style={{ height: rowH(t) }}>
              {t.label}
            </div>
          ))}
        </div>
        <div ref={areaRef} className="relative min-w-0 flex-1">
          {/* Regla */}
          <div className="relative h-6 cursor-pointer border-b border-line" onPointerDown={scrub} style={{ touchAction: 'none' }}>
            {ticks.map((t) => (
              <span key={t} className="absolute top-0 h-full border-l border-line/80 pl-1 font-mono text-[8px] text-steel/70" style={{ left: t * pps }}>
                {t % 1 === 0 ? timecode(t).slice(0, 5) : ''}
              </span>
            ))}
          </div>
          {tracks.map((t) => (
            <div key={t.id} className="relative py-1" style={{ height: rowH(t) }}>
              {t.kind === 'video' ? (
                videoRow(t)
              ) : !t.items.length && placeholders[t.id] ? (
                <button
                  type="button"
                  onClick={placeholders[t.id]!.onClick}
                  className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-line/70 font-mono text-[10px] font-semibold tracking-[0.16em] text-steel/50 transition hover:border-cyan/50 hover:bg-cyan/5 hover:text-cyan"
                >
                  {placeholders[t.id]!.label}
                </button>
              ) : (
                <div className="relative h-full rounded-md border border-dashed border-line/70">{t.items.map((i) => renderItem(t, i))}</div>
              )}
            </div>
          ))}
          {/* Cabezal de reproducción */}
          <div className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-fire shadow-[0_0_8px_rgba(234,88,12,.8)]" style={{ left: Math.min(width - 1, time * pps) }}>
            <span className="absolute -top-0.5 -left-[5px] h-0 w-0 border-x-[6px] border-t-[8px] border-x-transparent border-t-fire" />
          </div>
        </div>
      </div>
    </div>
  )
}
