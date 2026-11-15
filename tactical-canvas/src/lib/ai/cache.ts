/**
 * IA · caché de respuestas por hash del pedido: el mismo pedido (proveedor + modelo + sistema +
 * prompt + esquema) devuelve la respuesta guardada en 0 ms, sin gastar cuota. Vive en localStorage
 * (6 h, 40 entradas como máximo, la más vieja sale primero) con una copia en memoria por si el
 * almacenamiento está bloqueado. Sólo se guardan respuestas que son JSON válido.
 */

const KEY = 'jp-tactical-canvas:ai-cache'
const TTL = 6 * 3600 * 1000
const MAX = 40

type Entry = { t: number; v: string }

const memory = new Map<string, Entry>()

/** FNV-1a de 53 bits (dos pasadas de 32): rápido y sin colisiones prácticas para este volumen. */
export function hashPrompt(text: string): string {
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 0x01000193)
    h2 = Math.imul(h2 ^ c, 0x5bd1e995)
  }
  return `${(h1 >>> 0).toString(36)}${(h2 >>> 0).toString(36)}${text.length.toString(36)}`
}

function read(): Record<string, Entry> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, Entry>
  } catch {
    return {}
  }
}

function write(all: Record<string, Entry>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    /* cuota llena o almacenamiento bloqueado: queda la copia en memoria */
  }
}

export function cacheGet(key: string, now = Date.now()): string | null {
  const e = memory.get(key) ?? read()[key]
  if (!e || now - e.t > TTL) return null
  return e.v
}

export function cacheSet(key: string, value: string, now = Date.now()) {
  const entry = { t: now, v: value }
  memory.set(key, entry)
  const all = read()
  all[key] = entry
  const fresh = Object.entries(all)
    .filter(([, e]) => now - e.t <= TTL)
    .sort((a, b) => b[1].t - a[1].t)
    .slice(0, MAX)
  write(Object.fromEntries(fresh))
}

/** Borra la caché (REINTENTAR FORZADO): el próximo pedido va sí o sí a la API. */
export function clearAiCache() {
  memory.clear()
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* sin almacenamiento */
  }
}
