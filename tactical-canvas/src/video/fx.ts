import type { FxKind } from './types'

/**
 * Sound FX tácticos sintetizados con Web Audio (sin archivos): se agendan en cualquier
 * AudioContext, así suenan igual en la vista previa y quedan clavados al timestamp en la
 * exportación (reloj del AudioContext).
 */

export const FX_META: Record<FxKind, { label: string; icon: string; duration: number }> = {
  impact: { label: 'IMPACT · SUB', icon: '💥', duration: 0.9 },
  whoosh: { label: 'RECARGA · WHOOSH', icon: '⚙️', duration: 0.8 },
  beep: { label: 'TERMINAL BEEP', icon: '📟', duration: 0.2 },
  bell: { label: 'BELL · GONG', icon: '🔔', duration: 1.8 },
}

const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>()
function noise(ctx: BaseAudioContext) {
  let buf = noiseCache.get(ctx)
  if (!buf) {
    buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    noiseCache.set(ctx, buf)
  }
  return buf
}

function env(ctx: BaseAudioContext, out: AudioNode, at: number, peak: number, attack: number, decay: number) {
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(peak, at + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay)
  g.connect(out)
  return g
}

function tone(ctx: BaseAudioContext, out: AudioNode, type: OscillatorType, freq: number, at: number, peak: number, attack: number, decay: number, endFreq?: number) {
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(freq, at)
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, at + attack + decay)
  o.connect(env(ctx, out, at, peak, attack, decay))
  o.start(at)
  o.stop(at + attack + decay + 0.05)
}

function burst(ctx: BaseAudioContext, out: AudioNode, at: number, peak: number, attack: number, decay: number, filter: BiquadFilterType, f0: number, f1?: number, q = 1) {
  const src = ctx.createBufferSource()
  src.buffer = noise(ctx)
  const bq = ctx.createBiquadFilter()
  bq.type = filter
  bq.Q.value = q
  bq.frequency.setValueAtTime(f0, at)
  if (f1) bq.frequency.exponentialRampToValueAtTime(f1, at + attack + decay)
  src.connect(bq).connect(env(ctx, out, at, peak, attack, decay))
  src.start(at)
  src.stop(at + attack + decay + 0.05)
}

/** Agenda un efecto en `at` (segundos del reloj del AudioContext) hacia `out`. */
export function playFx(ctx: BaseAudioContext, kind: FxKind, at: number, out: AudioNode) {
  const t = Math.max(at, ctx.currentTime)
  if (kind === 'impact') {
    // Golpe sub-grave con caída de tono + transiente seco.
    tone(ctx, out, 'sine', 140, t, 1, 0.005, 0.75, 38)
    tone(ctx, out, 'triangle', 70, t, 0.5, 0.005, 0.5, 30)
    burst(ctx, out, t, 0.6, 0.002, 0.09, 'lowpass', 2200, 300)
  } else if (kind === 'whoosh') {
    // Fricción metálica: ruido con barrido de filtro + parciales inarmónicos que resuenan.
    burst(ctx, out, t, 0.55, 0.28, 0.45, 'bandpass', 600, 5200, 1.4)
    for (const [f, g] of [
      [1180, 0.07],
      [1740, 0.05],
      [2630, 0.04],
    ])
      tone(ctx, out, 'square', f, t + 0.18, g, 0.02, 0.55)
  } else if (kind === 'beep') {
    // Interfaz técnica: dos pulsos cortos ascendentes.
    tone(ctx, out, 'square', 1700, t, 0.22, 0.003, 0.06)
    tone(ctx, out, 'square', 2550, t + 0.07, 0.2, 0.003, 0.08)
  } else {
    // Campana / gong: parciales inarmónicos con caídas largas.
    for (const [ratio, g, d] of [
      [1, 0.5, 1.7],
      [2.0, 0.22, 1.2],
      [2.76, 0.16, 0.9],
      [5.4, 0.08, 0.5],
    ])
      tone(ctx, out, 'sine', 660 * ratio, t, g, 0.004, d)
  }
}
