import type { VoiceClip } from './types'

/**
 * A1 · Voz en off: grabación por micrófono, cadena "Studio Clean" y detección de habla para el
 * auto-ducking de A2. La misma cadena se arma en la vista previa y en la exportación.
 */

/** Audio de una toma (sólo en memoria) + tramos con habla y picos para dibujar la onda. */
export interface VoiceTake {
  buffer: AudioBuffer
  /** Tramos con habla [inicio, fin] en segundos de la grabación */
  activity: [number, number][]
  /** Picos 0–1 en 400 ventanas sobre toda la grabación */
  peaks: number[]
}

/**
 * Cadena de la toma hacia `out`: [highpass 85 Hz → peaking 3,2 kHz Q 1,2 +3,5 dB → compresor
 * −20 dB / 4:1 / knee 10 / 5 ms / 150 ms] si `enhance`, y siempre la ganancia (0–150 %).
 * Devuelve el nodo de entrada. (El compresor de los navegadores ya aplica su propia ganancia de
 * compensación: la voz mejorada no queda más baja.)
 */
export function voiceChain(ctx: BaseAudioContext, clip: Pick<VoiceClip, 'enhance' | 'gain'>, out: AudioNode): AudioNode {
  const gain = ctx.createGain()
  gain.gain.value = clip.gain / 100
  gain.connect(out)
  if (!clip.enhance) return gain
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 85
  hp.Q.value = 0.707
  const presence = ctx.createBiquadFilter()
  presence.type = 'peaking'
  presence.frequency.value = 3200
  presence.Q.value = 1.2
  presence.gain.value = 3.5
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -20
  comp.knee.value = 10
  comp.ratio.value = 4
  comp.attack.value = 0.005
  comp.release.value = 0.15
  hp.connect(presence).connect(comp).connect(gain)
  return hp
}

/** Analiza una toma: tramos con habla (RMS > 150 Hz en ventanas de 30 ms, huecos < 0,35 s unidos) y picos. */
export function analyzeTake(buffer: AudioBuffer): VoiceTake {
  const data = buffer.getChannelData(0)
  const rate = buffer.sampleRate
  const win = Math.max(1, Math.round(rate * 0.03))
  // Pasa-altos de 1 polo a 150 Hz: el rumble y los golpes graves no cuentan como habla.
  const rc = 1 / (2 * Math.PI * 150)
  const k = rc / (rc + 1 / rate)
  const hp = new Float32Array(data.length)
  for (let i = 1; i < data.length; i++) hp[i] = k * (hp[i - 1] + data[i] - data[i - 1])
  const rms: number[] = []
  for (let i = 0; i < data.length; i += win) {
    let sum = 0
    const end = Math.min(data.length, i + win)
    for (let j = i; j < end; j++) sum += hp[j] * hp[j]
    rms.push(Math.sqrt(sum / Math.max(1, end - i)))
  }
  // Umbral adaptativo: por encima del piso de ruido y nunca menor a −46 dBFS.
  const sorted = [...rms].sort((a, b) => a - b)
  const floor = sorted[Math.floor(sorted.length * 0.2)] ?? 0
  const thr = Math.max(0.005, floor * 3)
  const activity: [number, number][] = []
  rms.forEach((v, k) => {
    if (v < thr) return
    const a = (k * win) / rate
    const b = ((k + 1) * win) / rate
    const last = activity[activity.length - 1]
    if (last && a - last[1] < 0.35) last[1] = b
    else activity.push([a, b])
  })
  const bins = 400
  const step = Math.max(1, Math.floor(data.length / bins))
  const peaks: number[] = []
  for (let i = 0; i < bins; i++) {
    let m = 0
    for (let j = i * step; j < Math.min(data.length, (i + 1) * step); j++) m = Math.max(m, Math.abs(data[j]))
    peaks.push(m)
  }
  const top = Math.max(0.05, ...peaks)
  return { buffer, activity, peaks: peaks.map((p) => p / top) }
}

/** Tramos con habla de todas las tomas en tiempo del clip (para el ducking de A2). */
export function voiceSegments(clips: VoiceClip[], takes: Map<string, VoiceTake>): [number, number][] {
  const out: [number, number][] = []
  for (const c of clips) {
    const take = takes.get(c.id)
    if (!take) continue
    for (const [a, b] of take.activity) {
      const from = Math.max(a, c.offset)
      const to = Math.min(b, c.offset + c.duration)
      if (to > from) out.push([c.start + from - c.offset, c.start + to - c.offset])
    }
  }
  return out
}

/** Picos del tramo recortado de la toma (para la onda en el timeline). */
export function clipPeaks(c: VoiceClip, take: VoiceTake, n = 60): number[] {
  const per = take.peaks.length / Math.max(0.01, c.total)
  const a = c.offset * per
  const span = c.duration * per
  return Array.from({ length: n }, (_, i) => {
    let m = 0
    for (let j = Math.floor(a + (i * span) / n); j < Math.ceil(a + ((i + 1) * span) / n); j++) m = Math.max(m, take.peaks[j] ?? 0)
    return m
  })
}

/** Agenda la toma en `ctx` para que suene alineada con el clip: el clip está en `t0` cuando el reloj marca `now`. */
export function scheduleVoice(ctx: BaseAudioContext, c: VoiceClip, take: VoiceTake, t0: number, now: number, out: AudioNode): AudioBufferSourceNode | null {
  const end = c.start + c.duration
  if (end <= t0) return null
  const skip = Math.max(0, t0 - c.start)
  const src = ctx.createBufferSource()
  src.buffer = take.buffer
  src.connect(voiceChain(ctx, c, out))
  src.start(now + Math.max(0, c.start - t0), c.offset + skip, c.duration - skip)
  return src
}

const AUDIO_MIMES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']

/** Grabación en curso: nivel en vivo (0–1) y stop → Blob. */
export interface Recording {
  level: () => number
  stop: () => Promise<Blob>
  cancel: () => void
}

/**
 * Pide el micrófono (cancelación de eco y supresión de ruido del navegador) y graba con
 * MediaRecorder; un AnalyserNode da el nivel para el VU meter.
 */
export async function startRecording(ctx: AudioContext): Promise<Recording> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Este navegador no permite grabar desde el micrófono.')
  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
  } catch (err) {
    const denied = err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError')
    throw new Error(denied ? 'Permiso de micrófono denegado. Habilitalo en el candado de la barra de direcciones.' : 'No se encontró un micrófono disponible.')
  }
  const mimeType = AUDIO_MIMES.find((m) => MediaRecorder.isTypeSupported(m))
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)
  const source = ctx.createMediaStreamSource(stream)
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 1024
  source.connect(analyser)
  const buf = new Float32Array(analyser.fftSize)
  const release = () => {
    source.disconnect()
    stream.getTracks().forEach((t) => t.stop())
  }
  recorder.start(100)
  return {
    level: () => {
      analyser.getFloatTimeDomainData(buf)
      let peak = 0
      for (const v of buf) peak = Math.max(peak, Math.abs(v))
      return Math.min(1, peak)
    },
    stop: () =>
      new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          release()
          resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }))
        }
        recorder.stop()
      }),
    cancel: () => {
      recorder.onstop = release
      if (recorder.state !== 'inactive') recorder.stop()
      else release()
    },
  }
}
