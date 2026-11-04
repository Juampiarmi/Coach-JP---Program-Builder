import { useState } from 'react'
import { formatInstagramCaption } from '../lib/captionFormat'
import type { CanvasState } from '../types'

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback para navegadores sin Clipboard API (o contexto no seguro)
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}

interface Props {
  caption: string
  onChange: (c: string) => void
  /** Placas del set: tema y disciplina para los hashtags */
  slides: CanvasState[]
  /** Caption armado con los textos de las placas cuando no hay uno de la IA */
  fallback: string
}

/**
 * Caption de Instagram: se edita en crudo y se copia FORMATEADO (gancho en mayúsculas, viñetas
 * «▸», CTA de cierre y 6-8 hashtags tácticos según el tema).
 */
export function CaptionBar({ caption, onChange, slides, fallback }: Props) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)
  const source = caption.trim() ? caption : fallback
  if (!source.trim()) return null
  const formatted = formatInstagramCaption(source, slides)

  return (
    <div className="w-full">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={async () => {
            if (await copyText(formatted)) {
              setCopied(true)
              window.setTimeout(() => setCopied(false), 2000)
            }
          }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 font-mono text-[11px] font-semibold tracking-[0.12em] transition ${
            copied ? 'border-cyan bg-cyan text-carbon' : 'border-cyan/50 bg-cyan/5 text-cyan hover:bg-cyan/10'
          }`}
        >
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            {copied ? <path d="m5 12 5 5L20 7" /> : <path d="M9 9h10v12H9zM5 15V3h10" />}
          </svg>
          {copied ? '¡COPIADO CON HASHTAGS!' : '[ COPIAR CAPTION + #HASHTAGS ]'}
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="rounded-lg border border-line px-3 font-mono text-[10px] tracking-wider text-steel transition hover:text-white"
        >
          {open ? 'OCULTAR' : `VER · ${formatted.length} car.`}
        </button>
      </div>
      {open && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block font-mono text-[9px] tracking-[0.14em] text-steel/70 uppercase">Texto (editable)</span>
            <textarea className="tc-input tc-scroll max-h-56 resize-y text-[13px] leading-relaxed" rows={8} value={source} onChange={(e) => onChange(e.target.value)} />
          </label>
          <div>
            <span className="mb-1 block font-mono text-[9px] tracking-[0.14em] text-cyan/80 uppercase">Así se copia</span>
            <pre data-part="caption-preview" className="tc-scroll max-h-56 overflow-y-auto rounded-lg border border-line bg-surface-2/60 p-2.5 font-sans text-[12px] leading-relaxed whitespace-pre-wrap text-steel">{formatted}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
