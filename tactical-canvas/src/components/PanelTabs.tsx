import type { PanelTab } from './controls/ControlPanel'

export const PANEL_TABS: { id: PanelTab; n: string; icon: string; label: string; title: string }[] = [
  { id: 'text', n: '01', icon: '✍️', label: 'CONTENIDO', title: 'Los campos de la placa activa (sólo los de su plantilla), fuente científica y Biblioteca de Papers' },
  { id: 'style', n: '02', icon: '🎨', label: 'DISEÑO & FOTO', title: 'Plantilla, fondo, banco de fotos reales, kit de marca y layout' },
  { id: 'export', n: '03', icon: '🎞️', label: 'CARRUSEL & CAPTION', title: 'Caption + hashtags, doctor de retención, hilo continuo, remix 9:16 y exportación' },
]

/** Pestañas viejas guardadas (IA & Plan, Servicios): ahora viven en «+ Crear» y en Contenido. */
export const normalizeTab = (t: string): PanelTab => (t === 'style' || t === 'export' ? t : 'text')

interface Props {
  tab: PanelTab
  onChange: (t: PanelTab) => void
  /** Puntaje del doctor de retención (se muestra en la pestaña 03) */
  score?: number
}

/** Pestañas del panel lateral: 3 módulos (contenido · diseño · carrusel) en lugar de una columna larga de secciones. */
export function PanelTabs({ tab, onChange, score }: Props) {
  return (
    <div role="tablist" aria-label="Módulos del panel" className="sticky top-0 z-20 grid grid-cols-3 gap-1 border-b border-line bg-carbon/95 px-2 py-2 backdrop-blur">
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
