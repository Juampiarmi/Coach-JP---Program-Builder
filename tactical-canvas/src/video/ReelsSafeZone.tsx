import { OUT_H, OUT_W } from './types'

/**
 * Zonas que tapa la interfaz de Instagram Reels (aprox. sobre 1080×1920): barra superior,
 * columna de acciones a la derecha y pie con usuario, descripción y audio. Sólo en pantalla.
 */
export function ReelsSafeZone() {
  const zone = { fill: 'rgba(234,88,12,0.16)', stroke: 'rgba(234,88,12,0.7)', strokeWidth: 3, strokeDasharray: '16 12' }
  const label = { fill: '#FDBA74', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, fontSize: 26, letterSpacing: 3 }
  const icon = { fill: 'none', stroke: 'rgba(255,255,255,0.75)', strokeWidth: 4, strokeLinejoin: 'round' as const }
  return (
    <svg viewBox={`0 0 ${OUT_W} ${OUT_H}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      {/* Barra superior: "Reels", cámara */}
      <rect x={0} y={0} width={OUT_W} height={220} {...zone} />
      <text x={40} y={130} {...label}>REELS · CÁMARA</text>
      {/* Columna derecha: like, comentario, enviar, guardar, más, audio */}
      <rect x={900} y={980} width={180} height={720} rx={20} {...zone} />
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} cx={990} cy={1080 + i * 150} r={38} {...icon} />
      ))}
      <rect x={950} y={1650} width={80} height={80} rx={12} {...icon} />
      {/* Pie: usuario, descripción, audio y barra de progreso */}
      <rect x={0} y={1500} width={900} height={420} {...zone} />
      <circle cx={80} cy={1580} r={34} {...icon} />
      <rect x={130} y={1560} width={300} height={36} rx={8} fill="rgba(255,255,255,0.55)" />
      <rect x={40} y={1650} width={760} height={26} rx={8} fill="rgba(255,255,255,0.35)" />
      <rect x={40} y={1700} width={560} height={26} rx={8} fill="rgba(255,255,255,0.35)" />
      <rect x={0} y={1890} width={OUT_W} height={8} fill="rgba(255,255,255,0.6)" />
      <text x={40} y={1800} {...label}>USUARIO · DESCRIPCIÓN · AUDIO</text>
      <text x={OUT_W - 30} y={960} textAnchor="end" {...label}>ACCIONES</text>
    </svg>
  )
}
