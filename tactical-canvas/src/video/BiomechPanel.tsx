import { Field, Segmented, TextInput, Toggle } from '../components/controls/primitives'
import { jointAngle } from './biomech'
import { timecode } from './render'
import type { BarRep, Biomech, Goniometer } from './types'

interface Props {
  bio: Biomech
  calibrating: boolean
  rep: BarRep | null
  time: number
  selectedAngle: string | null
  canEdit: boolean
  onCalibrate: () => void
  onRepTime: (k: 'start' | 'bottomT' | 'end') => void
  onRep: (patch: Partial<BarRep>) => void
  onToggleInflection: () => void
  onSeek: (t: number) => void
  onChange: (patch: Partial<Biomech>) => void
  onAddAngle: () => void
  onSelectAngle: (id: string) => void
  onAngle: (id: string, patch: Partial<Goniometer>) => void
  onRemoveAngle: (id: string) => void
}

const GON_TIP = 'Análisis en punto crítico: pausa en el fondo del levantamiento y ajusta los 3 puntos sobre las articulaciones'

const LABELS = ['PROFUNDIDAD VÁLIDA', 'SIN PARALELO', 'BLOQUEO', 'VALGO']

/** Panel B1: Bar Path calibrado (paramétrico) y goniómetro articular. */
export function BiomechPanel({ bio, calibrating, rep, time, selectedAngle, canEdit, onCalibrate, onRepTime, onRep, onToggleInflection, onSeek, onChange, onAddAngle, onSelectAngle, onAngle, onRemoveAngle }: Props) {
  const path = bio.path
  const sel = bio.angles.find((g) => g.id === selectedAngle) ?? null
  const timeBtn = (k: 'start' | 'bottomT' | 'end', label: string, t: number) => (
    <div className="space-y-1">
      <button type="button" onClick={() => onSeek(t)} title="Ir a este instante" className="w-full rounded border border-line py-1 font-mono text-[10px] tracking-wider text-white tabular-nums hover:border-cyan/50">
        {timecode(t)}
      </button>
      <button type="button" onClick={() => onRepTime(k)} title="Fijar en la posición del cabezal" className="w-full rounded border border-cyan/40 py-1 font-mono text-[8px] font-semibold tracking-[0.06em] text-cyan hover:bg-cyan/10">
        {label} = {timecode(time).slice(3)}
      </button>
    </div>
  )
  return (
    <div className="space-y-4">
      {/* Bar Path */}
      <div className="space-y-2.5">
        <p className="font-mono text-[9px] tracking-[0.16em] text-steel uppercase">Bar Path · trayectoria de la barra</p>
        <button
          type="button"
          onClick={onCalibrate}
          disabled={!canEdit}
          aria-pressed={calibrating}
          className={`w-full rounded-lg border py-2 font-mono text-[10px] font-semibold tracking-[0.1em] transition disabled:cursor-not-allowed disabled:opacity-40 ${
            calibrating ? 'animate-pulse border-cyan bg-cyan/15 text-cyan' : 'border-cyan/50 text-cyan hover:bg-cyan/10'
          }`}
        >
          {calibrating ? '[ ◎ CLICK SOBRE EL DISCO · CANCELAR ]' : rep ? '[ 📍 RECALIBRAR BAR PATH ]' : '[ 📍 BAR PATH ]'}
        </button>
        {calibrating && (
          <p className="font-mono text-[9px] leading-relaxed text-cyan/85">
            Pausá en el frame inicial de la repetición y hacé clic sobre el extremo de la barra / disco: ese punto queda como ancla y tope superior.
          </p>
        )}
        {rep && !calibrating && (
          <div className="space-y-2 rounded-md border border-cyan/30 bg-cyan/[.04] p-2">
            <p className="font-mono text-[9px] leading-relaxed text-steel/80">
              Arrastrá <span className="text-cyan">[ TOPE SUPERIOR ]</span> y <span className="text-cyan">[ PROFUNDIDAD MÁXIMA ]</span> sobre el disco en el visor. La línea sólo existe entre el inicio del excéntrico y el bloqueo.
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {timeBtn('start', 'INICIO', rep.start)}
              {timeBtn('bottomT', 'FONDO', rep.bottomT)}
              {timeBtn('end', 'BLOQUEO', rep.end)}
            </div>
            <div className="grid grid-cols-[1fr_auto] items-end gap-2">
              <Field label="Recorrido real (cm)" hint="opcional · marcas en cm">
                <input
                  className="tc-input text-[12px]"
                  type="number"
                  min={0}
                  step={1}
                  value={rep.romCm ?? ''}
                  placeholder="% del recorrido"
                  onChange={(e) => onRep({ romCm: e.target.value ? Math.max(1, Number(e.target.value)) : undefined })}
                  aria-label="Recorrido real en centímetros"
                />
              </Field>
              <button
                type="button"
                onClick={onToggleInflection}
                className={`mb-px h-9 rounded border px-2 font-mono text-[9px] tracking-wider transition ${rep.mid ? 'border-cyan/60 text-cyan' : 'border-line text-steel hover:text-white'}`}
                title="Punto intermedio para registrar el drift horizontal real"
              >
                {rep.mid ? '✕ INFLEXIÓN' : '+ INFLEXIÓN'}
              </button>
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={() => onChange({ path: { ...path, points: [], rep: undefined } })} className="rounded border border-line px-2 py-0.5 font-mono text-[10px] tracking-wider text-steel hover:border-fire/60 hover:text-fire">
                LIMPIAR BAR PATH
              </button>
            </div>
          </div>
        )}
        <Toggle label="Línea vertical de referencia (eje gravedad)" checked={path.showVertical} onChange={(showVertical) => onChange({ path: { ...path, showVertical } })} />
      </div>

      {/* Goniómetro */}
      <div className="space-y-2.5 border-t border-line pt-3">
        <p className="font-mono text-[9px] tracking-[0.16em] text-steel uppercase">Goniómetro articular</p>
        <button
          type="button"
          onClick={onAddAngle}
          disabled={!canEdit}
          title={GON_TIP}
          className="w-full rounded-lg border border-fire/50 py-2 font-mono text-[10px] font-semibold tracking-[0.1em] text-fire transition hover:bg-fire/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          [ ∠ MEDIR ÁNGULO ARTICULAR ]
        </button>
        <p className="flex gap-1.5 rounded-md border border-fire/30 bg-fire/5 px-2 py-1.5 font-mono text-[9px] leading-relaxed text-fire/90" role="note">
          <span aria-hidden>ⓘ</span>
          <span>{GON_TIP}. Bloque fijo de 1,8 s (se mueve, no se estira).</span>
        </p>
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
            <p className="font-mono text-[9px] leading-relaxed text-steel/70">Arrastrá los 3 puntos en el visor: CADERA → RODILLA (vértice) → TOBILLO. El ángulo se recalcula en vivo.</p>
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
            <Toggle label="Punch-in 1.15x durante el bloque (zoom de énfasis)" checked={Boolean(sel.punch)} onChange={(punch) => onAngle(sel.id, { punch })} />
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
