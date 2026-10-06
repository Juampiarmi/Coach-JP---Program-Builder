import { STORY_SAFE } from './canvas/TacticalCanvas'

interface Props {
  aspect: 'feed' | 'story'
  w: number
  h: number
  count: number
  index: number
}

const INK = '#FFFFFF'

/** Íconos de Instagram simplificados (trazo blanco, 24×24). */
const ICONS = {
  heart: 'M12 20.5s-7.5-4.6-9.3-9.1C1.4 8 3.4 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.6 0 5.6 3.5 4.3 6.9-1.8 4.5-9.3 9.1-9.3 9.1Z',
  comment: 'M20.5 12a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.1-4.2A8.5 8.5 0 1 1 20.5 12Z',
  send: 'M21.5 3 10.5 13.8M21.5 3 15 21l-4.5-7.2L3 9.5 21.5 3Z',
  save: 'M6 3.5h12v17l-6-4.6-6 4.6v-17Z',
  carousel: 'M8 3.5h12.5V16M4 7.5h12v13H4z',
}

function Icon({ d, x, y, size }: { d: string; x: number; y: number; size: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size / 24})`}>
      <path d={d} fill="none" stroke={INK} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
    </g>
  )
}

/**
 * Simulador de la interfaz de Instagram sobre la placa (sólo en pantalla). Vive fuera del nodo
 * que se exporta, así que nunca aparece en el PNG ni en el ZIP; además se apaga mientras exporta.
 */
export function GhostOverlay({ aspect, w, h, count, index }: Props) {
  const n = Math.max(1, Math.min(10, count))
  const font = { fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600 } as const
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ opacity: 0.35, filter: 'drop-shadow(0 0 3px rgba(0,0,0,.9))' }}
      aria-hidden
    >
      {aspect === 'feed' ? (
        <>
          {/* Cabecera del post */}
          <circle cx={58} cy={58} r={24} fill="none" stroke={INK} strokeWidth={4} />
          <text x={96} y={68} fill={INK} style={{ ...font, fontSize: 30 }}>coachjp.training</text>
          {/* Indicador de carrusel 1/N */}
          <rect x={w - 150} y={30} width={118} height={56} rx={28} fill="rgba(0,0,0,.55)" />
          <text x={w - 91} y={68} textAnchor="middle" fill={INK} style={{ ...font, fontSize: 28 }}>{`${index + 1}/${n}`}</text>
          <Icon d={ICONS.carousel} x={w - 210} y={34} size={46} />
          {/* Paginador de puntos */}
          {Array.from({ length: n }, (_, i) => (
            <circle key={i} cx={w / 2 + (i - (n - 1) / 2) * 26} cy={16} r={i === index ? 7 : 5} fill={i === index ? '#38BDF8' : INK} />
          ))}
          {/* Acciones laterales */}
          {[
            ['heart', '2.418'],
            ['comment', '186'],
            ['send', ''],
            ['save', ''],
          ].map(([k, label], i) => (
            <g key={k}>
              <Icon d={ICONS[k as keyof typeof ICONS]} x={w - 104} y={h - 560 + i * 128} size={64} />
              {label && (
                <text x={w - 72} y={h - 560 + i * 128 + 100} textAnchor="middle" fill={INK} style={{ ...font, fontSize: 24 }}>
                  {label}
                </text>
              )}
            </g>
          ))}
        </>
      ) : (
        <>
          {/* Barras de progreso de historias */}
          {Array.from({ length: n }, (_, i) => {
            const gap = 8
            const segW = (w - 48 - gap * (n - 1)) / n
            return <rect key={i} x={24 + i * (segW + gap)} y={24} width={segW} height={7} rx={3.5} fill={INK} fillOpacity={i <= index ? 1 : 0.4} />
          })}
          {/* Perfil */}
          <circle cx={84} cy={112} r={42} fill="none" stroke={INK} strokeWidth={4} />
          <text x={148} y={124} fill={INK} style={{ ...font, fontSize: 34 }}>coachjp.training</text>
          <text x={440} y={124} fill={INK} fillOpacity={0.7} style={{ ...font, fontSize: 30 }}>2 h</text>
          <text x={w - 150} y={126} fill={INK} style={{ ...font, fontSize: 44 }}>···</text>
          <path d={`M${w - 70},${92} l36,36 M${w - 34},${92} l-36,36`} stroke={INK} strokeWidth={5} strokeLinecap="round" />
          {/* Margen seguro de stickers */}
          <rect x={60} y={STORY_SAFE} width={w - 120} height={h - STORY_SAFE * 2} rx={24} fill="none" stroke={INK} strokeWidth={3} strokeDasharray="18 14" />
          <text x={w / 2} y={STORY_SAFE - 18} textAnchor="middle" fill={INK} style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, fontSize: 24, letterSpacing: 4 }}>
            MARGEN SEGURO · STICKERS
          </text>
          {/* Respuesta rápida */}
          <rect x={24} y={h - 150} width={w - 250} height={100} rx={50} fill="none" stroke={INK} strokeWidth={4} />
          <text x={74} y={h - 88} fill={INK} style={{ ...font, fontSize: 34 }}>Enviar mensaje</text>
          <Icon d={ICONS.heart} x={w - 205} y={h - 136} size={72} />
          <Icon d={ICONS.send} x={w - 108} y={h - 136} size={72} />
        </>
      )}
    </svg>
  )
}
