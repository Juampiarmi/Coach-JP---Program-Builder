import { Field, Segmented, TextInput, Toggle } from '../components/controls/primitives'
import { jointAngle } from './biomech'
import { timecode } from './render'
import type { Biomech, Goniometer } from './types'

interface Props {
  bio: Biomech
  tracing: boolean
  selectedAngle: string | null
  canEdit: boolean
  onToggleTrace: () => void
  onChange: (patch: Partial<Biomech>) => void
  onAddAngle: () => void
  onSelectAngle: (id: string) => void
  onAngle: (id: string, patch: Partial<Goniometer>) => void
  onRemoveAngle: (id: string) => void
}

const LABELS = ['PROFUNDIDAD VÁLIDA', 'SIN PARALELO', 'BLOQUEO', 'VALGO']

/** Panel B1: Bar Path y goniómetro articular. */
export function BiomechPanel({ bio, tracing, selectedAngle, canEdit, onToggleTrace, onChange, onAddAngle, onSelectAngle, onAngle, onRemoveAngle }: Props) {
  const path = bio.path
  const sel = bio.angles.find((g) => g.id === selectedAngle) ?? null
  return (
    <div className="space-y-4">
      {/* Bar Path */}
      <div className="space-y-2.5">
        <p className="font-mono text-[9px] tracking-[0.16em] text-steel uppercase">Bar Path · trayectoria de la barra</p>
        <button
          type="button"
          onClick={onToggleTrace}
          disabled={!canEdit}
          aria-pressed={tracing}
          className={`w-full rounded-lg border py-2 font-mono text-[10px] font-semibold tracking-[0.1em] transition disabled:cursor-not-allowed disabled:opacity-40 ${
            tracing ? 'animate-pulse border-cyan bg-cyan/15 text-cyan' : 'border-cyan/50 text-cyan hover:bg-cyan/10'
          }`}
        >
          {tracing ? '[ ● TRAZANDO · CLICK PARA TERMINAR ]' : '[ 📍 TRAZAR BAR PATH ]'}
        </button>
        {tracing && (
          <p className="font-mono text-[9px] leading-relaxed text-cyan/80">
            Hacé click sobre el extremo del disco en cada momento clave (mové el cabezal entre clicks), o reproducí y mantené presionado siguiendo la barra.
          </p>
        )}
        <div className="flex items-center justify-between font-mono text-[10px] text-steel">
          <span>
            {path.points.length} puntos{path.points.length > 1 ? ` · ${timecode(path.points[0].t)} → ${timecode(path.points[path.points.length - 1].t)}` : ''}
          </span>
          <button
            type="button"
            onClick={() => onChange({ path: { ...path, points: [] } })}
            disabled={!path.points.length}
            className="rounded border border-line px-2 py-0.5 tracking-wider hover:border-fire/60 hover:text-fire disabled:opacity-30"
          >
            LIMPIAR TRAZADO
          </button>
        </div>
        <Field label="Grosor del trazo" plain>
          <Segmented<'fino' | 'grueso'>
            value={path.thick ? 'grueso' : 'fino'}
            onChange={(v) => onChange({ path: { ...path, thick: v === 'grueso' } })}
            options={[
              { value: 'fino', label: 'FINO' },
              { value: 'grueso', label: 'GRUESO' },
            ]}
            size="sm"
          />
        </Field>
        <Toggle label="Línea vertical de referencia (eje gravedad)" checked={path.showVertical} onChange={(showVertical) => onChange({ path: { ...path, showVertical } })} />
      </div>

      {/* Goniómetro */}
      <div className="space-y-2.5 border-t border-line pt-3">
        <p className="font-mono text-[9px] tracking-[0.16em] text-steel uppercase">Goniómetro articular</p>
        <button
          type="button"
          onClick={onAddAngle}
          disabled={!canEdit}
          className="w-full rounded-lg border border-fire/50 py-2 font-mono text-[10px] font-semibold tracking-[0.1em] text-fire transition hover:bg-fire/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          [ ∠ MEDIR ÁNGULO ARTICULAR ]
        </button>
        {bio.angles.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {bio.angles.map((g, i) => (
              <button
                key={g.id}
                type="button"
                onClick={() => onSelectAngle(g.id)}
                className={`rounded border px-2 py-0.5 font-mono text-[9px] tracking-wider ${g.id === selectedAngle ? 'border-fire/70 bg-fire/10 text-fire' : 'border-line text-steel hover:text-white'}`}
              >
                ∠{String(i + 1).padStart(2, '0')} · {Math.round(jointAngle(g))}° · {timecode(g.start).slice(0, 5)}
              </button>
            ))}
          </div>
        )}
        {sel && (
          <>
            <p className="font-mono text-[9px] leading-relaxed text-steel/70">Arrastrá los 3 puntos sobre las articulaciones en el visor (el del medio es el vértice).</p>
            <Field label="Rótulo">
              <TextInput value={sel.label} onChange={(label) => onAngle(sel.id, { label })} uppercase placeholder="PROFUNDIDAD VÁLIDA" />
            </Field>
            <div className="-mt-1 flex flex-wrap gap-1">
              {LABELS.map((l) => (
                <button key={l} type="button" onClick={() => onAngle(sel.id, { label: l })} className="rounded border border-line px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-steel hover:text-white">
                  {l}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-[1fr_auto] items-end gap-2">
              <Field label="Color de la pastilla" plain>
                <Segmented<'orange' | 'white'>
                  value={sel.color}
                  onChange={(color) => onAngle(sel.id, { color })}
                  options={[
                    { value: 'orange', label: 'NARANJA' },
                    { value: 'white', label: 'BLANCO' },
                  ]}
                  size="sm"
                />
              </Field>
              <button type="button" onClick={() => onRemoveAngle(sel.id)} className="mb-px h-8 rounded border border-line px-2 font-mono text-[9px] tracking-wider text-steel hover:border-fire/60 hover:text-fire">
                ELIMINAR
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
