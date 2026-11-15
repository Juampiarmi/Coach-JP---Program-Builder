import { useEffect, useState } from 'react'
import { usePersistentState } from '../../hooks/usePersistentState'
import { citeFromPaper, EMPTY_PAPERS, findInLibrary, loadPaperLibrary, mergePapers, newPaperId, paperFromMatch, PAPERS_KEY, PAPERS_UPDATED, weeklyPapers, type OwnPaper, type PaperLibrary } from '../../lib/paperLibrary'
import { lookupDoi } from '../../lib/paperVerify'
import type { CanvasState } from '../../types'
import { TextInput, Toggle } from './primitives'

interface Props {
  state: CanvasState
  update: (patch: Partial<CanvasState>) => void
}

const pill = 'rounded-full border px-2.5 py-1 font-mono text-[9px] font-semibold tracking-[0.1em] transition disabled:opacity-40'
const EMPTY_FORM = { title: '', authors: '', year: '', journal: '', finding: '' }

/**
 * BIBLIOTECA DE PAPERS PROPIOS: la evidencia validada del coach. Se cargan por DOI (datos de Crossref)
 * o a mano; con el modo exclusivo, la IA sólo cita de acá.
 */
export function PaperLibraryPanel({ state, update }: Props) {
  const [lib, setLib] = usePersistentState<PaperLibrary>(PAPERS_KEY, EMPTY_PAPERS)
  const [doi, setDoi] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [manual, setManual] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const inUse = findInLibrary(state.citeMain, lib.papers)
  // Un respaldo importado desde la Biblioteca de proyectos suma papers: se recargan acá.
  useEffect(() => {
    const reload = () => setLib(loadPaperLibrary())
    window.addEventListener(PAPERS_UPDATED, reload)
    return () => window.removeEventListener(PAPERS_UPDATED, reload)
  }, [setLib])

  const add = (p: OwnPaper[]) => setLib((l) => ({ ...l, papers: mergePapers(l.papers, p) }))

  const addByDoi = async () => {
    setBusy(true)
    setNote(null)
    try {
      const m = await lookupDoi(doi)
      if (!m) return setNote('DOI inválido o sin datos en Crossref.')
      add([paperFromMatch(m, form.finding.trim())])
      setDoi('')
      setNote(`✓ Agregado: ${m.title}. Sumale el hallazgo en 1 línea.`)
    } catch {
      setNote('No se pudo consultar Crossref (sin conexión). Cargalo a mano.')
    } finally {
      setBusy(false)
    }
  }

  const addManual = () => {
    const year = Number(form.year)
    if (!form.title.trim() || !form.authors.trim() || !form.journal.trim() || !(year > 1800 && year < 2100)) return setNote('Completá título, autores, año y revista.')
    add([{ id: newPaperId(), title: form.title.trim(), authors: form.authors.trim(), year, journal: form.journal.trim(), finding: form.finding.trim() }])
    setForm(EMPTY_FORM)
    setManual(false)
    setNote('✓ Paper agregado a la biblioteca.')
  }

  const edit = (id: string, patch: Partial<OwnPaper>) => setLib((l) => ({ ...l, papers: l.papers.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
  const remove = (id: string) => setLib((l) => ({ ...l, papers: l.papers.filter((p) => p.id !== id) }))

  return (
    <div className="space-y-2.5" data-testid="paper-library">
      <Toggle checked={lib.exclusive} onChange={(exclusive) => setLib((l) => ({ ...l, exclusive }))} label="La IA cita sólo de mi biblioteca" />
      {lib.exclusive && !lib.papers.length && <p className="font-mono text-[9px] leading-relaxed text-fire">Sin papers cargados el modo exclusivo no tiene efecto.</p>}
      {lib.exclusive && lib.papers.length > 0 && (
        <p className="font-mono text-[9px] leading-relaxed text-cyan">▸ Generación, re-generación y sugerencias citan sólo estos {lib.papers.length} papers; cualquier otra cita se borra.</p>
      )}

      <ul className="space-y-1.5">
        {lib.papers.map((p) => {
          const active = inUse?.id === p.id
          return (
            <li key={p.id} className={`rounded border p-2 ${active ? 'border-cyan/60 bg-cyan/5' : 'border-line'}`}>
              <p className="font-mono text-[9px] tracking-wider text-gold">
                {citeFromPaper(p).citeMain} {p.verified && <span className="text-cyan">· ✓ CROSSREF</span>}
              </p>
              <p className="text-[11px] leading-snug text-white/90">{p.title}</p>
              <input
                className="tc-input mt-1 text-[11px]"
                value={p.finding}
                placeholder="Hallazgo en 1 línea (va como bajada de la cita)"
                onChange={(e) => edit(p.id, { finding: e.target.value })}
              />
              <div className="mt-1.5 flex gap-1.5">
                <button type="button" className={`${pill} ${active ? 'border-cyan/60 text-cyan' : 'border-line text-steel hover:text-white'}`} onClick={() => update(citeFromPaper(p))}>
                  {active ? '✓ EN ESTA PLACA' : 'USAR EN ESTA PLACA'}
                </button>
                {p.doi && (
                  <a className={`${pill} border-line text-steel hover:text-white`} href={`https://doi.org/${p.doi}`} target="_blank" rel="noreferrer">
                    DOI
                  </a>
                )}
                <button type="button" className={`${pill} ml-auto border-line text-steel hover:text-fire`} onClick={() => remove(p.id)} aria-label={`Quitar ${p.title}`}>
                  QUITAR
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="flex gap-1.5">
        <div className="min-w-0 flex-1">
          <TextInput value={doi} onChange={setDoi} placeholder="DOI (ej: 10.1519/JSC.0b013e3181e840f3)" />
        </div>
        <button type="button" disabled={!doi.trim() || busy} onClick={addByDoi} className={`${pill} shrink-0 border-cyan/50 text-cyan hover:bg-cyan/10`}>
          {busy ? 'BUSCANDO…' : '+ POR DOI'}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => setManual((v) => !v)} className={`${pill} border-line text-steel hover:text-white`}>
          {manual ? 'CANCELAR' : '+ CARGAR A MANO'}
        </button>
        <button type="button" onClick={() => (add(weeklyPapers()), setNote('✓ Papers del Plan Semanal en la biblioteca.'))} className={`${pill} border-line text-steel hover:text-white`}>
          + PAPERS DEL PLAN SEMANAL
        </button>
      </div>
      {manual && (
        <div className="space-y-1.5 rounded border border-line p-2">
          <TextInput value={form.title} onChange={(title) => setForm((f) => ({ ...f, title }))} placeholder="Título del paper" />
          <TextInput value={form.authors} onChange={(authors) => setForm((f) => ({ ...f, authors }))} placeholder="Autores (ej: Schoenfeld BJ, Grgic J)" />
          <div className="flex gap-1.5">
            <div className="w-20 shrink-0">
              <TextInput value={form.year} onChange={(year) => setForm((f) => ({ ...f, year: year.replace(/\D/g, '').slice(0, 4) }))} placeholder="Año" />
            </div>
            <div className="min-w-0 flex-1">
              <TextInput value={form.journal} onChange={(journal) => setForm((f) => ({ ...f, journal }))} placeholder="Revista (ej: J Strength Cond Res)" />
            </div>
          </div>
          <TextInput value={form.finding} onChange={(finding) => setForm((f) => ({ ...f, finding }))} placeholder="Hallazgo en 1 línea" />
          <button type="button" onClick={addManual} className={`${pill} border-cyan/50 text-cyan hover:bg-cyan/10`}>
            GUARDAR PAPER
          </button>
        </div>
      )}
      {note && <p className="font-mono text-[9px] leading-relaxed text-steel">{note}</p>}
    </div>
  )
}
