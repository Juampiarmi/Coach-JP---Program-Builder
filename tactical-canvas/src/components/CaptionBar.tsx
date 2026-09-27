import { useState } from 'react'

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
}

/** Copy de Instagram generado por la IA: copiar al portapapeles y ver/editar. */
export function CaptionBar({ caption, onChange }: Props) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)
  if (!caption.trim()) return null

  return (
    <div className="w-full">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={async () => {
            if (await copyText(caption)) {
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
          {copied ? '¡COPIADO!' : '[ COPIAR CAPTION ]'}
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="rounded-lg border border-line px-3 font-mono text-[10px] tracking-wider text-steel transition hover:text-white"
        >
          {open ? 'OCULTAR' : `VER · ${caption.length} car.`}
        </button>
      </div>
      {open && (
        <textarea
          className="tc-input tc-scroll mt-2 max-h-56 resize-y text-[13px] leading-relaxed"
          rows={8}
          value={caption}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  )
}
