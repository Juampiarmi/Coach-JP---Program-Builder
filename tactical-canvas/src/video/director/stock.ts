import type { MusicMood, StockType } from '../../types/timelineDirector'

/**
 * Medios de respaldo del Director (sin archivos ni servicios externos):
 * - V1: fondo táctico procedural (canvas → MediaRecorder) cuando no hay clip cargado.
 * - A2: beat sintetizado offline con Web Audio (OfflineAudioContext → WAV), según el mood.
 */

// ── A2 · música sintetizada ──────────────────────────────────────────────────────

const MOOD: Record<MusicMood, { bpm: number; root: number; label: string }> = {
  dark_tactical_bass: { bpm: 92, root: 55, label: 'DARK TACTICAL BASS' },
  cyberpunk_industrial: { bpm: 112, root: 49, label: 'CYBERPUNK INDUSTRIAL' },
  minimal_drill: { bpm: 142, root: 46.25, label: 'MINIMAL DRILL' },
}
export const MOOD_LABEL: Record<MusicMood, string> = Object.fromEntries(Object.entries(MOOD).map(([k, v]) => [k, v.label])) as Record<MusicMood, string>

function noiseBuffer(ctx: BaseAudioContext) {
  const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const d = b.getChannelData(0)
  let seed = 7
  for (let i = 0; i < d.length; i++) {
    seed = (seed * 16807) % 2147483647
    d[i] = (seed / 2147483647) * 2 - 1
  }
  return b
}

function env(ctx: BaseAudioContext, out: AudioNode, at: number, peak: number, attack: number, decay: number) {
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(peak, at + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay)
  g.connect(out)
  return g
}

/** Renderiza `seconds` de beat en el mood pedido y lo devuelve como WAV estéreo 16 bits. */
export async function synthMusic(mood: MusicMood, seconds: number): Promise<File> {
  const { bpm, root } = MOOD[mood]
  const rate = 44100
  const len = Math.ceil((seconds + 0.5) * rate)
  const ctx = new OfflineAudioContext(2, len, rate)
  const master = ctx.createDynamicsCompressor()
  master.threshold.value = -14
  master.ratio.value = 3
  const out = ctx.createGain()
  out.gain.value = 0.8
  master.connect(out).connect(ctx.destination)
  const noise = noiseBuffer(ctx)
  const beat = 60 / bpm
  const kick = (t: number, peak = 1) => {
    const o = ctx.createOscillator()
    o.frequency.setValueAtTime(150, t)
    o.frequency.exponentialRampToValueAtTime(40, t + 0.18)
    o.connect(env(ctx, master, t, peak, 0.004, 0.32))
    o.start(t)
    o.stop(t + 0.4)
  }
  const hit = (t: number, f: number, q: number, peak: number, decay: number, type: BiquadFilterType = 'bandpass') => {
    const s = ctx.createBufferSource()
    s.buffer = noise
    const bq = ctx.createBiquadFilter()
    bq.type = type
    bq.frequency.value = f
    bq.Q.value = q
    s.connect(bq).connect(env(ctx, master, t, peak, 0.002, decay))
    s.start(t, Math.random() * 0.5)
    s.stop(t + decay + 0.05)
  }
  const bass = (t: number, f: number, dur: number, peak: number, wave: OscillatorType, glideTo?: number) => {
    const o = ctx.createOscillator()
    o.type = wave
    o.frequency.setValueAtTime(f, t)
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur * 0.6)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = wave === 'sine' ? 400 : 900
    o.connect(lp).connect(env(ctx, master, t, peak, 0.01, dur))
    o.start(t)
    o.stop(t + dur + 0.05)
  }
  const metal = (t: number, peak: number) => {
    for (const [f, g] of [
      [523, 1],
      [1397, 0.6],
      [2213, 0.35],
    ]) {
      const o = ctx.createOscillator()
      o.type = 'square'
      o.frequency.value = f
      o.connect(env(ctx, master, t, peak * g, 0.002, 0.25))
      o.start(t)
      o.stop(t + 0.3)
    }
  }
  const pattern = [0, 0, 3, 0, -2, 0, 5, 3] // semitonos del bajo por compás
  const note = (semi: number) => root * 2 ** (semi / 12)
  for (let bar = 0, t = 0.05; t < seconds; bar++) {
    const n = note(pattern[bar % pattern.length])
    for (let b = 0; b < 4; b++) {
      const tb = t + b * beat
      if (tb >= seconds) break
      if (mood === 'minimal_drill') {
        // Half-time: bombo en 1, snare en 3, hats en tresillos con rolls y 808 con glide.
        if (b === 0) {
          kick(tb)
          bass(tb, n, beat * 1.8, 0.7, 'sine', bar % 2 ? n * 0.84 : undefined)
        }
        if (b === 2) hit(tb, 1800, 0.8, 0.5, 0.18)
        for (let k = 0; k < (b === 3 && bar % 2 ? 6 : 3); k++) hit(tb + (k * beat) / (b === 3 && bar % 2 ? 6 : 3), 8000, 1.5, 0.12, 0.03, 'highpass')
      } else if (mood === 'cyberpunk_industrial') {
        kick(tb, 0.9)
        bass(tb + beat / 2, n * 2, beat * 0.45, 0.32, 'sawtooth')
        bass(tb, n, beat * 0.4, 0.4, 'sawtooth')
        if (b % 2 === 1) metal(tb, 0.08)
        hit(tb + beat / 2, 9000, 1, 0.1, 0.04, 'highpass')
      } else {
        // Dark tactical: bombo en 1 y 3, golpe grave en 2 y 4, sub continuo y hats a corcheas.
        if (b % 2 === 0) kick(tb)
        else hit(tb, 900, 0.7, 0.4, 0.22)
        if (b === 0) bass(tb, n, beat * 3.8, 0.55, 'sine')
        hit(tb + beat / 2, 7000, 1.2, 0.07, 0.04, 'highpass')
      }
    }
    t += beat * 4
  }
  const buf = await ctx.startRendering()
  return new File([encodeWav(buf, seconds)], `${mood}_${Math.round(bpm)}bpm.wav`, { type: 'audio/wav' })
}

function encodeWav(buf: AudioBuffer, seconds: number) {
  const ch = buf.numberOfChannels
  const n = Math.min(buf.length, Math.ceil(seconds * buf.sampleRate))
  const data = new DataView(new ArrayBuffer(44 + n * ch * 2))
  const w = (o: number, s: string) => [...s].forEach((c, i) => data.setUint8(o + i, c.charCodeAt(0)))
  w(0, 'RIFF')
  data.setUint32(4, 36 + n * ch * 2, true)
  w(8, 'WAVE')
  w(12, 'fmt ')
  data.setUint32(16, 16, true)
  data.setUint16(20, 1, true)
  data.setUint16(22, ch, true)
  data.setUint32(24, buf.sampleRate, true)
  data.setUint32(28, buf.sampleRate * ch * 2, true)
  data.setUint16(32, ch * 2, true)
  data.setUint16(34, 16, true)
  w(36, 'data')
  data.setUint32(40, n * ch * 2, true)
  const chans = Array.from({ length: ch }, (_, c) => buf.getChannelData(c))
  let o = 44
  // Fade-out final de 0,4 s para que el loop no corte en seco.
  const fade = Math.floor(0.4 * buf.sampleRate)
  for (let i = 0; i < n; i++) {
    const g = i > n - fade ? (n - i) / fade : 1
    for (let c = 0; c < ch; c++) {
      data.setInt16(o, Math.max(-1, Math.min(1, chans[c][i] * g)) * 0x7fff, true)
      o += 2
    }
  }
  return data.buffer
}

// ── V1 · fondo táctico procedural ────────────────────────────────────────────────

export const STOCK_LABEL: Record<StockType, string> = {
  dark_gym_heavy_lift: 'DARK GYM · HEAVY LIFT',
  barbell_setup: 'BARBELL SETUP',
  athlete_chalk: 'ATHLETE CHALK',
}

const W = 540
const H = 960

function drawStock(ctx: CanvasRenderingContext2D, type: StockType, t: number) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#05070A')
  g.addColorStop(0.55, '#0D1117')
  g.addColorStop(1, '#030405')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  // Conos de luz cenital con parpadeo leve.
  for (const [x, ph] of [
    [140, 0],
    [400, 1.7],
  ]) {
    const a = 0.1 + 0.03 * Math.sin(t * 3 + ph) + (Math.sin(t * 17 + ph * 5) > 0.97 ? -0.05 : 0)
    const cone = ctx.createLinearGradient(x, 0, x, H * 0.8)
    cone.addColorStop(0, `rgba(170,190,215,${a + 0.08})`)
    cone.addColorStop(1, 'rgba(170,190,215,0)')
    ctx.fillStyle = cone
    ctx.beginPath()
    ctx.moveTo(x - 18, 0)
    ctx.lineTo(x + 18, 0)
    ctx.lineTo(x + 170, H * 0.8)
    ctx.lineTo(x - 170, H * 0.8)
    ctx.fill()
  }
  // Piso
  ctx.fillStyle = '#07090C'
  ctx.fillRect(0, H * 0.8, W, H * 0.2)
  ctx.strokeStyle = 'rgba(56,189,248,0.12)'
  ctx.lineWidth = 1
  for (let i = 0; i < 9; i++) {
    ctx.beginPath()
    ctx.moveTo(W / 2 + (i - 4) * 30, H * 0.8)
    ctx.lineTo(W / 2 + (i - 4) * 140, H)
    ctx.stroke()
  }
  const bar = (cx: number, cy: number, half: number, plate: number) => {
    ctx.fillStyle = '#9AA4B2'
    ctx.fillRect(cx - half, cy - 4, half * 2, 8)
    for (const s of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        const px = cx + s * (half - 26 - k * 16)
        ctx.fillStyle = k === 0 ? '#1B222C' : '#11161D'
        ctx.fillRect(px - 7, cy - plate / 2 + k * 6, 14, plate - k * 12)
        ctx.strokeStyle = 'rgba(255,255,255,0.08)'
        ctx.strokeRect(px - 7, cy - plate / 2 + k * 6, 14, plate - k * 12)
      }
    }
  }
  if (type === 'dark_gym_heavy_lift') {
    // Ciclo de sentadilla de 3,2 s: la barra baja lento y sube explosiva.
    const ph = (t % 3.2) / 3.2
    const depth = ph < 0.55 ? Math.sin((ph / 0.55) * (Math.PI / 2)) : Math.cos(((ph - 0.55) / 0.45) * (Math.PI / 2))
    const y = 380 + depth * 170
    // Silueta del atleta
    ctx.fillStyle = '#0A0D12'
    ctx.beginPath()
    ctx.ellipse(W / 2, y - 34, 26, 30, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillRect(W / 2 - 60, y, 120, 150 - depth * 40)
    ctx.beginPath()
    ctx.moveTo(W / 2 - 60, y + 150 - depth * 40)
    ctx.lineTo(W / 2 - 90 - depth * 30, H * 0.8)
    ctx.lineTo(W / 2 - 40, H * 0.8)
    ctx.lineTo(W / 2 + 40, H * 0.8)
    ctx.lineTo(W / 2 + 90 + depth * 30, H * 0.8)
    ctx.lineTo(W / 2 + 60, y + 150 - depth * 40)
    ctx.fill()
    bar(W / 2, y, 230, 120)
  } else if (type === 'barbell_setup') {
    const z = 1 + 0.06 * Math.sin(t * 0.4)
    ctx.save()
    ctx.translate(W / 2, H * 0.62)
    ctx.scale(z, z)
    bar(0, 0, 300, 190)
    ctx.restore()
  }
  // Polvo de magnesio / partículas (más denso en athlete_chalk).
  const count = type === 'athlete_chalk' ? 140 : 40
  for (let i = 0; i < count; i++) {
    const sx = (Math.sin(i * 91.7) * 0.5 + 0.5) * W
    const sy = (Math.sin(i * 47.3) * 0.5 + 0.5) * H
    const x = (sx + Math.sin(t * 0.6 + i) * 30 + t * (8 + (i % 5) * 3)) % W
    const y = (sy - t * (14 + (i % 7) * 4) + H * 10) % H
    ctx.fillStyle = `rgba(230,236,245,${type === 'athlete_chalk' ? 0.18 + (i % 4) * 0.06 : 0.08})`
    ctx.beginPath()
    ctx.arc(x, y, type === 'athlete_chalk' ? 1.5 + (i % 3) : 1, 0, Math.PI * 2)
    ctx.fill()
  }
  if (type === 'athlete_chalk') {
    const r = ctx.createRadialGradient(W / 2, H * 0.45, 20, W / 2, H * 0.45, 320)
    r.addColorStop(0, 'rgba(220,228,240,0.16)')
    r.addColorStop(1, 'rgba(220,228,240,0)')
    ctx.fillStyle = r
    ctx.fillRect(0, 0, W, H)
  }
  // Viñeta
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.75)
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(1, 'rgba(0,0,0,0.7)')
  ctx.fillStyle = v
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = 'rgba(138,153,173,0.55)'
  ctx.font = '600 13px "IBM Plex Mono", monospace'
  ctx.textAlign = 'center'
  ctx.fillText(`STOCK TÁCTICO · ${STOCK_LABEL[type]} · SUBÍ TU CLIP PARA REEMPLAZAR`, W / 2, H - 18)
}

/**
 * Graba `seconds` del fondo procedural (tiempo real: MediaRecorder no puede ir más rápido).
 * `speed` es el playbackRate sugerido por el Director, horneado en la animación.
 */
export async function recordStockClip(type: StockType, seconds: number, speed: number, onProgress?: (r: number) => void, signal?: AbortSignal): Promise<File> {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  drawStock(ctx, type, 0)
  const stream = canvas.captureStream(30)
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find((m) => MediaRecorder.isTypeSupported(m))
  const rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 2_500_000 })
  const chunks: Blob[] = []
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
  const stopped = new Promise<void>((r) => (rec.onstop = () => r()))
  rec.start(500)
  const t0 = performance.now()
  await new Promise<void>((resolve, reject) => {
    const id = window.setInterval(() => {
      const t = (performance.now() - t0) / 1000
      if (signal?.aborted) {
        window.clearInterval(id)
        rec.stop()
        reject(new DOMException('Cancelado', 'AbortError'))
        return
      }
      drawStock(ctx, type, t * speed)
      onProgress?.(Math.min(1, t / seconds))
      if (t >= seconds) {
        window.clearInterval(id)
        resolve()
      }
    }, 1000 / 30)
  })
  rec.stop()
  await stopped
  stream.getTracks().forEach((tr) => tr.stop())
  const type0 = (mime ?? 'video/webm').split(';')[0]
  return new File([new Blob(chunks, { type: type0 })], `stock_${type}.${type0 === 'video/mp4' ? 'mp4' : 'webm'}`, { type: type0 })
}
