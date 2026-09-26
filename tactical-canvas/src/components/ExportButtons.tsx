import { useState, type RefObject } from 'react'
import { canShareFiles, downloadBlob, renderPng, shareBlob, slugify } from '../lib/exporter'
import { ASPECTS } from '../lib/brand'
import type { CanvasState } from '../types'

type Status = 'idle' | 'busy' | 'done' | 'error'

interface Props {
  target: RefObject<HTMLDivElement | null>
  state: CanvasState
  compact?: boolean
}

export function ExportButtons({ target, state, compact }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [note, setNote] = useState('')
  const [shareable] = useState(canShareFiles)
  const { w, h } = ASPECTS[state.aspect]

  const run = async (mode: 'download' | 'share') => {
    const node = target.current
    if (!node || status === 'busy') return
    setStatus('busy')
    setNote('')
    try {
      const { blob, ratio } = await renderPng(node, w, h)
      const filename = `coachjp_${state.template}_${state.aspect}_${slugify(`${state.headlineA} ${state.headlineB}`)}.png`
      if (mode === 'share') await shareBlob(blob, filename)
      else downloadBlob(blob, filename)
      setNote(`${Math.round(w * ratio)}×${Math.round(h * ratio)} px · ${(blob.size / 1024 / 1024).toFixed(1)} MB`)
      setStatus('done')
      window.setTimeout(() => setStatus((s) => (s === 'done' ? 'idle' : s)), 3500)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setStatus('idle')
        return
      }
      console.error(err)
      setNote('Falló la exportación. Reintentá.')
      setStatus('error')
    }
  }

  const label =
    status === 'busy' ? 'RENDERIZANDO 3X…' : status === 'done' ? 'PLACA DESCARGADA ✓' : 'DESCARGAR PLACA TÁCTICA [PNG 4K]'

  return (
    <div className="flex w-full flex-col gap-1.5">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => run('download')}
          disabled={status === 'busy'}
          className={`group relative flex-1 overflow-hidden rounded-xl bg-fire font-mono font-bold tracking-[0.1em] text-carbon transition hover:brightness-110 active:scale-[.99] disabled:cursor-wait disabled:opacity-80 ${
            compact ? 'px-3 py-3 text-[11px]' : 'px-5 py-4 text-[13px]'
          } shadow-[0_10px_40px_-12px_rgba(255,107,0,.8)]`}
        >
          {status === 'busy' && <span className="absolute inset-0 animate-pulse bg-white/20" />}
          <span className="relative flex items-center justify-center gap-2">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12m0 0-5-5m5 5 5-5M4 21h16" />
            </svg>
            {label}
          </span>
        </button>
        {shareable && (
          <button
            type="button"
            onClick={() => run('share')}
            disabled={status === 'busy'}
            aria-label="Compartir placa"
            title="Compartir (Instagram, WhatsApp…)"
            className="rounded-xl border border-line bg-surface px-3.5 text-cyan transition hover:border-cyan/60 disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
            </svg>
          </button>
        )}
      </div>
      {note && (
        <p className={`text-center font-mono text-[10px] tracking-wider ${status === 'error' ? 'text-fire' : 'text-steel'}`}>{note}</p>
      )}
    </div>
  )
}
