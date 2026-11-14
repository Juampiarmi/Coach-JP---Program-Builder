import { useCallback, useEffect, useRef, useState } from 'react'
import { citationKey, parseCitation, verifyCitation, type CitationStatus } from '../lib/paperVerify'

const CACHE_KEY = 'jp-tactical-canvas:paper-checks'
/** Espera tras la última tecla antes de consultar (no se busca a mitad de una palabra). */
const DEBOUNCE = 900
/** Los resultados definitivos se guardan 30 días; los errores de red nunca (se reintenta). */
const TTL = 30 * 24 * 3600 * 1000

type Cached = CitationStatus & { at?: number }

function loadCache(): Record<string, Cached> {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as Record<string, Cached>
    const now = Date.now()
    return Object.fromEntries(Object.entries(raw).filter(([, v]) => v && (v.state === 'verified' || v.state === 'mismatch' || v.state === 'notfound') && now - (v.at ?? 0) < TTL))
  } catch {
    return {}
  }
}

function saveCache(all: Record<string, Cached>) {
  try {
    const keep = Object.fromEntries(Object.entries(all).filter(([, v]) => v.state === 'verified' || v.state === 'mismatch' || v.state === 'notfound'))
    localStorage.setItem(CACHE_KEY, JSON.stringify(keep))
  } catch {
    /* sin almacenamiento: se vuelve a consultar en la próxima sesión */
  }
}

/**
 * Verificación automática de las citas científicas del set contra Crossref / PubMed. Consulta cada
 * cita distinta una sola vez (con caché local) y devuelve su estado para la placa y el Doctor.
 */
export function useCitationChecks(cites: string[]) {
  const [results, setResults] = useState<Record<string, Cached>>(loadCache)
  const resultsRef = useRef(results)
  resultsRef.current = results
  const [nonce, setNonce] = useState(0)

  const wanted = [...new Map(cites.filter((c) => c?.trim() && parseCitation(c)).map((c) => [citationKey(c), c.trim()])).entries()]
  const signature = wanted.map(([k]) => k).join('\n')

  useEffect(() => {
    const todo = wanted.filter(([k]) => !resultsRef.current[k] || resultsRef.current[k].state === 'pending')
    if (!todo.length) return
    const ctrl = new AbortController()
    const set = (k: string, v: Cached | null) =>
      setResults((r) => {
        const next = { ...r }
        if (v) next[k] = v
        else delete next[k]
        if (v && v.state !== 'pending') saveCache(next)
        return next
      })
    const timer = window.setTimeout(async () => {
      for (const [k, cite] of todo) {
        if (ctrl.signal.aborted) return
        set(k, { state: 'pending' })
        try {
          const r = await verifyCitation(cite, fetch, ctrl.signal)
          set(k, r ? { ...r, at: Date.now() } : null)
        } catch {
          // Cancelada (la cita cambió o se fue de la placa): queda para la próxima pasada.
          set(k, null)
          return
        }
      }
    }, DEBOUNCE)
    return () => {
      window.clearTimeout(timer)
      ctrl.abort()
    }
    // `wanted` se deriva de `signature`: sólo se vuelve a consultar cuando cambian las citas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, nonce])

  /** Estado de una cita (null = no es una cita científica). Mientras espera la consulta: pendiente. */
  const get = useCallback(
    (cite: string | undefined): CitationStatus | null => {
      if (!cite?.trim() || !parseCitation(cite)) return null
      return results[citationKey(cite)] ?? { state: 'pending' }
    },
    [results],
  )

  /** Vuelve a consultar una cita (ej: tras un error de red). */
  const recheck = useCallback((cite: string) => {
    setResults((r) => {
      const next = { ...r }
      delete next[citationKey(cite)]
      saveCache(next)
      return next
    })
    setNonce((n) => n + 1)
  }, [])

  return { get, recheck }
}
