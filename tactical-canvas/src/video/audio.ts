/**
 * Audio del clip base para transcribir: se decodifica, se recorta al tramo In→Out, se pasa a
 * mono 16 kHz y se codifica como WAV PCM 16 bits en base64 (≈ 32 KB por segundo).
 */
export const MAX_TRANSCRIBE_SEC = 300

export async function clipToWavBase64(url: string, start: number, end: number): Promise<{ base64: string; duration: number }> {
  const buf = await (await fetch(url)).arrayBuffer()
  const ctx = new AudioContext()
  let decoded: AudioBuffer
  try {
    decoded = await ctx.decodeAudioData(buf)
  } catch {
    throw new Error('No se pudo leer el audio del clip (¿el video no tiene sonido o el formato no es compatible?).')
  } finally {
    ctx.close().catch(() => undefined)
  }
  const from = Math.max(0, Math.min(start, decoded.duration))
  const to = Math.min(decoded.duration, Math.max(from + 0.1, end), from + MAX_TRANSCRIBE_SEC)
  const duration = to - from
  const rate = 16000
  const offline = new OfflineAudioContext(1, Math.ceil(duration * rate), rate)
  const src = offline.createBufferSource()
  src.buffer = decoded
  src.connect(offline.destination)
  src.start(0, from, duration)
  const pcm = (await offline.startRendering()).getChannelData(0)
  return { base64: wavBase64(pcm, rate), duration }
}

function wavBase64(samples: Float32Array, rate: number) {
  const bytes = new Uint8Array(44 + samples.length * 2)
  const v = new DataView(bytes.buffer)
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  str(0, 'RIFF')
  v.setUint32(4, 36 + samples.length * 2, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)
  v.setUint16(22, 1, true)
  v.setUint32(24, rate, true)
  v.setUint32(28, rate * 2, true)
  v.setUint16(32, 2, true)
  v.setUint16(34, 16, true)
  str(36, 'data')
  v.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}
