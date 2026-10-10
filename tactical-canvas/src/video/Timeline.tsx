import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { timecode } from './render'
import type { ClipInfo, OverlayItem, Track, TrackItem } from './types'

interface Props {
  tracks: Track[]
  clip: ClipInfo | null
  duration: number
  time: number
  thumbs: string[]
  selectedId: string | null
  onSeek: (t: number) => void
  onTrim: (inPoint: number, outPoint: number) => void
  onItem: (id: string, start: number, end: number) => void
  onSelect: (id: string) => void
}

const LABEL_W = 132
const ROW_H = 46
const MIN_LEN = 0.3

const KIND_LABEL: Record<OverlayItem['overlay']['kind'], string> = { badge: 'MÉTRICA', headline: 'PLACA', timer: 'TIMER', checklist: 'CHECK', watermark: 'FIRMA' }

/** Texto corto del bloque en la pista. */
function itemText(o: OverlayItem['overlay']) {
  if (o.kind === 'badge') return o.value
  if (o.kind === 'headline') return o.headlineA
  if (o.kind === 'timer') return o.timerLabel ?? 'TIEMPO'
  if (o.kind === 'checklist') return `${(o.checks ?? []).filter((c) => c.text.trim()).length} ítems`
  return 'COACH JP'
}

/** Arrastre horizontal en segundos: devuelve el delta de tiempo desde el pointerdown. */
function useDrag(pps: number) {
  return (e: RPointerEvent, onMove: (dt: number) => void) => {
    e.preventDefault()
    e.stopPropagation()
    const x0 = e.clientX
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => onMove((ev.clientX - x0) / pps)
    const up = () => {
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', up)
      target.removeEventListener('pointercancel', up)
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
    target.addEventListener('pointercancel', up)
  }
}

/**
 * Timeline táctico multicapa. Dibuja cualquier pista genéricamente (V1 video, V2 overlay y,
 * en próximas fases, A1/A2 audio y subtítulos); sólo V1 (trim) y overlay (mover / estirar)
 * tienen edición en la fase 1.
 */
export function Timeline({ tracks, clip, duration, time, thumbs, selectedId, onSeek, onTrim, onItem, onSelect }: Props) {
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
  const scrub = (e: RPointerEvent) => {
    const rect = areaRef.current!.getBoundingClientRect()
    const at = (x: number) => onSeek(clamp((x - rect.left) / pps, 0, d))
    at(e.clientX)
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => at(ev.clientX)
    const up = () => {
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', up)
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
  }

  const renderItem = (track: Track, item: TrackItem) => {
    const left = item.start * pps
    const w = Math.max(6, (item.end - item.start) * pps)
    const editable = item.type === 'overlay'
    const on = item.id === selectedId
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
    return (
      <div
        key={item.id}
        onPointerDown={editable ? (e) => move(e, 'move') : undefined}
        className={`absolute top-1.5 bottom-1.5 flex items-center overflow-hidden rounded-md border font-mono text-[10px] font-semibold tracking-wider select-none ${
          on ? 'border-fire bg-fire/25 text-white' : 'border-cyan/50 bg-cyan/15 text-cyan'
        } ${editable ? 'cursor-grab active:cursor-grabbing' : ''}`}
        style={{ left, width: w, touchAction: 'none' }}
        title={`${timecode(item.start)} → ${timecode(item.end)}`}
      >
        {editable && <span onPointerDown={(e) => move(e, 'start')} className="absolute inset-y-0 left-0 w-2 cursor-ew-resize bg-white/30 hover:bg-white/60" />}
        <span className="truncate px-3">
          {item.type === 'overlay' ? `${KIND_LABEL[item.overlay.kind]} · ${itemText(item.overlay)}` : track.label}
        </span>
        {editable && <span onPointerDown={(e) => move(e, 'end')} className="absolute inset-y-0 right-0 w-2 cursor-ew-resize bg-white/30 hover:bg-white/60" />}
      </div>
    )
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
            <div key={t.id} className="flex items-center pr-2 font-semibold" style={{ height: ROW_H }}>
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
            <div key={t.id} className="relative py-1" style={{ height: ROW_H }}>
              {t.kind === 'video' ? videoRow(t) : <div className="relative h-full rounded-md border border-dashed border-line/70">{t.items.map((i) => renderItem(t, i))}</div>}
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
