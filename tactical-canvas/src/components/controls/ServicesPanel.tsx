import { useRef, useState } from 'react'
import { generateServiceCopy, loadAiSettings, RateLimitError } from '../../lib/ai'
import { SERVICE_BY_ID, SERVICES, servicePatch } from '../../lib/services'
import type { CanvasState, ServiceMode, ServiceSport } from '../../types'
import { Field, Segmented, TextArea, TextInput } from './primitives'

interface Props {
  state: CanvasState
  update: (patch: Partial<CanvasState>) => void
  /** Reemplaza el caption de Instagram de la pieza (copy de venta de la IA) */
  onCaption?: (caption: string) => void
}

/**
 * Sección «07 · Servicios & Programas Coach JP»: elegir la disciplina y la modalidad (ficha técnica o
 * carátula de catálogo), cargarla en la placa, editar programa / pilares / cupos / CTA y pedirle a la
 * IA el copy de venta de esa disciplina (gancho, 3 pilares y caption orientado a lead).
 */
export function ServicesPanel({ state, update, onCaption }: Props) {
  const isService = state.template === 'service'
  const [mode, setMode] = useState<ServiceMode>(isService ? state.serviceMode : 'single')
  const [sport, setSport] = useState<ServiceSport>(isService ? state.serviceSport : 'rugby')
  const catalog = state.serviceCatalog ?? []
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const abort = useRef<AbortController | null>(null)
  const curMode = isService ? state.serviceMode : mode
  const curSport = isService ? state.serviceSport : sport

  const load = (m: ServiceMode, sp: ServiceSport) => update(servicePatch(m, sp, catalog))
  const pickSport = (id: ServiceSport) => {
    if (curMode === 'catalog') {
      // En la carátula, cada chip suma / saca la disciplina de la grilla (mínimo 1).
      const next = catalog.includes(id) ? catalog.filter((x) => x !== id) : SERVICES.map((x) => x.id).filter((x) => x === id || catalog.includes(x))
      if (next.length) update({ serviceCatalog: next })
      return
    }
    setSport(id)
    // Ficha ya cargada: elegir otra disciplina carga su programa de fábrica.
    if (isService) load('single', id)
  }
  const pickMode = (m: ServiceMode) => {
    setMode(m)
    if (isService) load(m, curSport)
  }

  const writeWithAi = async () => {
    if (busy) {
      abort.current?.abort()
      return
    }
    abort.current = new AbortController()
    setBusy(true)
    setNote('')
    try {
      const copy = await generateServiceCopy(loadAiSettings(), { mode: curMode, sport: curSport, catalog }, abort.current.signal, (s) => setNote(s ?? ''))
      const base = isService ? {} : servicePatch(curMode, curSport, catalog)
      update({
        ...base,
        headlineA: copy.white,
        headlineB: copy.accent,
        serviceItems: copy.pillars,
        ...(copy.cta ? { serviceCta: copy.cta } : {}),
        ...(copy.availability ? { serviceAvailability: copy.availability } : {}),
      })
      if (copy.caption) onCaption?.(copy.caption)
      setNote(copy.caption ? '✓ Gancho, pilares y caption de venta listos (el caption quedó abajo de la placa).' : '✓ Gancho y pilares listos.')
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setNote(err instanceof RateLimitError ? 'Cuota de la API alcanzada. Esperá un momento.' : err instanceof Error ? err.message : 'No se pudo generar el copy.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <Field label="Modalidad" plain>
        <Segmented<ServiceMode>
          value={curMode}
          onChange={pickMode}
          options={[
            { value: 'single', label: 'FICHA TÉCNICA' },
            { value: 'catalog', label: 'CATÁLOGO ALL-IN-ONE' },
          ]}
          size="sm"
        />
      </Field>
      <div>
        <p className="mb-1 font-mono text-[9px] tracking-[0.14em] text-steel/70 uppercase">
          {curMode === 'catalog' ? 'Disciplinas en la carátula (tocá para sumar / sacar)' : 'Especialidad / disciplina'}
        </p>
        <div className="grid grid-cols-2 gap-1">
          {SERVICES.map((sp) => {
            const on = curMode === 'catalog' ? catalog.includes(sp.id) : curSport === sp.id
            return (
              <button
                key={sp.id}
                type="button"
                onClick={() => pickSport(sp.id)}
                aria-pressed={on}
                title={sp.label}
                className={`truncate rounded-md border px-2 py-1.5 text-left font-mono text-[10px] font-semibold tracking-wider transition ${
                  on ? 'border-fire/70 bg-fire/10 text-fire' : 'border-line text-steel hover:border-cyan/40 hover:text-white'
                }`}
              >
                {curMode === 'catalog' ? (on ? '[✓] ' : '[ ] ') : ''}
                {sp.label}
              </button>
            )
          })}
        </div>
      </div>
      {!isService && (
        <button
          type="button"
          onClick={() => load(curMode, curSport)}
          className="w-full rounded-md border border-fire/60 bg-fire/10 py-2 font-mono text-[10px] font-semibold tracking-[0.12em] text-fire transition hover:bg-fire/20"
        >
          {curMode === 'catalog' ? '[ ⬇ CARGAR CARÁTULA DE SERVICIOS EN ESTA PLACA ]' : `[ ⬇ CARGAR FICHA · ${SERVICE_BY_ID[curSport].short} ]`}
        </button>
      )}
      <button
        type="button"
        onClick={writeWithAi}
        aria-busy={busy}
        className={`w-full rounded-md border py-2 font-mono text-[10px] font-semibold tracking-[0.12em] transition ${busy ? 'animate-pulse border-gold/60 text-gold' : 'border-gold/40 text-gold hover:bg-gold/10'}`}
      >
        {busy ? '[ REDACTANDO COPY DE VENTA… · CANCELAR ]' : `[ ✨ COPY DE VENTA CON IA · ${curMode === 'catalog' ? 'CATÁLOGO' : SERVICE_BY_ID[curSport].short} ]`}
      </button>
      {note && <p className={`font-mono text-[10px] leading-relaxed ${note.startsWith('✓') ? 'text-cyan' : busy ? 'text-gold' : 'text-fire'}`}>{note}</p>}

      {isService && (
        <div className="space-y-2 border-t border-line pt-3">
          <Field label="Badge / header">
            <TextInput value={state.tag} onChange={(tag) => update({ tag })} uppercase placeholder="PROGRAMA ALTO RENDIMIENTO // RUGBY" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Programa · blanco">
              <TextInput value={state.headlineA} onChange={(headlineA) => update({ headlineA })} uppercase />
            </Field>
            <Field label="Programa · naranja">
              <TextInput value={state.headlineB} onChange={(headlineB) => update({ headlineB })} uppercase />
            </Field>
          </div>
          <Field label={curMode === 'catalog' ? 'Incluye [ ✓ ] (uno por línea)' : 'Pilares técnicos (uno por línea, 3-4)'}>
            <TextArea value={(state.serviceItems ?? []).join('\n')} onChange={(v) => update({ serviceItems: v.split('\n') })} rows={curMode === 'catalog' ? 4 : 5} />
          </Field>
          <Field label="Disponibilidad / cupos">
            <TextInput value={state.serviceAvailability ?? ''} onChange={(serviceAvailability) => update({ serviceAvailability })} uppercase placeholder="CUPOS LIMITADOS · EVALUACIÓN DE INGRESO" />
          </Field>
          <Field label="Botón de CTA">
            <TextInput value={state.serviceCta ?? ''} onChange={(serviceCta) => update({ serviceCta })} uppercase placeholder="MANDÁ 'PROGRAMA' POR DM" />
          </Field>
        </div>
      )}
    </div>
  )
}
