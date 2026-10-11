import { FX_META } from './fx'
import type { Biomech, OverlayItem, SoundFx } from './types'
import { OUT_H, OUT_W } from './types'

/**
 * VFX tácticos del cuadro: screen shake y punch-in digital. Son funciones puras del tiempo
 * del clip, así la vista previa (CSS + canvas) y la exportación (canvas) coinciden cuadro a cuadro.
 */

/** Amplitud de la sacudida en px de salida y duración (4 cuadros a 30 fps). */
export const SHAKE_PX = 6
export const SHAKE_DUR = FX_META.shake.duration
export const PUNCH = 1.15
/** Rampa de entrada / salida del punch-in */
const PUNCH_RAMP = 0.22

/** Pseudoaleatorio estable en [-1, 1] (mismo valor en preview y export para el mismo cuadro). */
const rand = (n: number) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453
  return (x - Math.floor(x)) * 2 - 1
}

/** Desplazamiento del cuadro en `t` (px de salida): ±6 px durante 4 cuadros tras cada disparo. */
export function shakeAt(fx: SoundFx, t: number): { x: number; y: number } {
  for (const h of fx.hits) {
    if (h.kind !== 'shake' && !(h.kind === 'impact' && fx.shake !== false)) continue
    const dt = t - h.t
    if (dt < 0 || dt >= SHAKE_DUR) continue
    const frame = Math.floor(dt * 30)
    const seed = Math.round(h.t * 1000) + frame * 7
    // La amplitud cae un poco en cada cuadro.
    const k = SHAKE_PX * (1 - frame * 0.15)
    return { x: rand(seed) * k, y: rand(seed + 3) * k }
  }
  return { x: 0, y: 0 }
}

const ease = (x: number) => x * x * (3 - 2 * x)

/** Escala del punch-in en `t`: 1.15x durante los bloques marcados, con rampa suave. */
export function punchAt(bio: Biomech, overlays: OverlayItem[], t: number): number {
  let best = 1
  const ranges = [...bio.angles.filter((g) => g.punch), ...overlays.filter((o) => o.overlay.punch)]
  for (const r of ranges) {
    if (t < r.start || t > r.end) continue
    const ramp = Math.min(PUNCH_RAMP, (r.end - r.start) / 2)
    const k = ease(Math.min(1, (t - r.start) / ramp, (r.end - t) / ramp))
    best = Math.max(best, 1 + (PUNCH - 1) * k)
  }
  return best
}

/** Escala extra mientras sacude, para que no se vean bordes negros. */
export const shakeOverscan = (s: { x: number; y: number }) => (s.x || s.y ? 1 + (2 * SHAKE_PX) / OUT_W + 0.004 : 1)

/** Aplica al contexto el zoom centrado (punch-in) — para el video y el HUD biomecánico. */
export function applyZoom(ctx: CanvasRenderingContext2D, scale: number) {
  if (scale === 1) return
  ctx.translate(OUT_W / 2, OUT_H / 2)
  ctx.scale(scale, scale)
  ctx.translate(-OUT_W / 2, -OUT_H / 2)
}

/** Punto de pantalla (px de salida) → punto del cuadro sin zoom (para editar el HUD con zoom activo). */
export const unzoom = (px: number, py: number, scale: number) => ({ px: OUT_W / 2 + (px - OUT_W / 2) / scale, py: OUT_H / 2 + (py - OUT_H / 2) / scale })
