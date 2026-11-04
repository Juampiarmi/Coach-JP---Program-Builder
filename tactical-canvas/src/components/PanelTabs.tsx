import type { PanelTab } from './controls/ControlPanel'

export const PANEL_TABS: { id: PanelTab; n: string; icon: string; label: string; title: string }[] = [
  { id: 'ai', n: '01', icon: '🎯', label: 'IA & PLAN', title: 'Generador IA, Plan semanal 7 días, cita célebre y ráfagas de mindset' },
  { id: 'text', n: '02', icon: '✍️', label: 'TEXTO', title: 'Titular, remate, párrafos, editor de la plantilla y evaluador de gancho' },
  { id: 'style', n: '03', icon: '🎨', label: 'ESTILO', title: 'Plantillas por categoría, kits de marca, fondos y layout' },
  { id: 'services', n: '04', icon: '🚀', label: 'SERVICIOS', title: 'Disciplinas, catálogo, ficha técnica y caso de atleta' },
  { id: 'export', n: '05', icon: '⚙️', label: 'EXPORTAR', title: 'Carrusel continuo, historias 9:16 y doctor de retención' },
]

interface Props {
  tab: PanelTab
  onChange: (t: PanelTab) => void
  /** Puntaje del doctor de retención (se muestra en la pestaña 05) */
  score?: number
}

/** Pestañas del panel lateral: 5 módulos con jerarquía clara en lugar de una columna larga de secciones. */
export function PanelTabs({ tab, onChange, score }: Props) {
  return (
    <div role="tablist" aria-label="Módulos del panel" className="sticky top-0 z-20 grid grid-cols-5 gap-1 border-b border-line bg-carbon/95 px-2 py-2 backdrop-blur">
      {PANEL_TABS.map((t) => {
        const on = t.id === tab
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={on}
            title={t.title}
            onClick={() => onChange(t.id)}
            className={`relative flex min-w-0 flex-col items-center gap-0.5 rounded-md border px-1 py-1.5 transition ${
              on ? 'border-fire/70 bg-fire/10 text-fire' : 'border-transparent text-steel hover:border-line hover:text-white'
            }`}
          >
            <span className="text-[14px] leading-none" aria-hidden>
              {t.icon}
            </span>
            <span className="font-mono text-[8px] tracking-[0.12em] opacity-70">{t.n}</span>
            <span className="w-full truncate text-center font-mono text-[9px] font-semibold tracking-[0.08em]">{t.label}</span>
            {t.id === 'export' && typeof score === 'number' && score < 100 && (
              <span className="absolute -top-1 right-0.5 rounded bg-gold px-1 font-mono text-[8px] font-bold text-carbon">{score}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
