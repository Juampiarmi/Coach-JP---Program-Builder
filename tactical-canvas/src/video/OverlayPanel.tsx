import { Field, Range, Segmented, TextInput } from '../components/controls/primitives'
import { timecode } from './render'
import type { OverlayConfig, OverlayEntrance, OverlayItem, OverlayKind, OverlayPosition } from './types'

interface Props {
  items: OverlayItem[]
  selected: OverlayItem | null
  onSelect: (id: string) => void
  onChange: (patch: Partial<OverlayConfig>) => void
  onAdd: () => void
  onRemove: () => void
}

const KINDS: { value: OverlayKind; label: string }[] = [
  { value: 'badge', label: 'MÉTRICA' },
  { value: 'headline', label: 'PLACA' },
  { value: 'watermark', label: 'FIRMA' },
]

/** Panel de la capa V2: qué componente táctico se superpone y cómo entra. */
export function OverlayPanel({ items, selected, onSelect, onChange, onAdd, onRemove }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-[11px] font-semibold tracking-[0.18em] text-cyan">[ V2 · OVERLAY TÁCTICO ]</h3>
        <button type="button" onClick={onAdd} className="rounded-md border border-line px-2 py-1 font-mono text-[9px] tracking-wider text-steel hover:border-cyan/50 hover:text-cyan">
          + AGREGAR BLOQUE
        </button>
      </div>
      {items.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((it, i) => (
            <button
              key={it.id}
              type="button"
              onClick={() => onSelect(it.id)}
              className={`rounded border px-2 py-0.5 font-mono text-[9px] tracking-wider ${it.id === selected?.id ? 'border-fire/70 bg-fire/10 text-fire' : 'border-line text-steel hover:text-white'}`}
            >
              {String(i + 1).padStart(2, '0')} · {timecode(it.start).slice(0, 5)}
            </button>
          ))}
        </div>
      )}
      {!selected ? (
        <p className="font-mono text-[10px] text-steel/70">Agregá un bloque para superponer una métrica, una placa o la firma.</p>
      ) : (
        <>
          <Segmented<OverlayKind> value={selected.overlay.kind} onChange={(kind) => onChange({ kind })} options={KINDS} size="sm" />
          {selected.overlay.kind === 'badge' && (
            <div className="grid grid-cols-[1fr_2fr] gap-2">
              <Field label="Valor">
                <TextInput value={selected.overlay.value} onChange={(value) => onChange({ value })} placeholder="82%" />
              </Field>
              <Field label="Subtítulo">
                <TextInput value={selected.overlay.label} onChange={(label) => onChange({ label })} uppercase placeholder="DEL TIEMPO CAMINANDO" />
              </Field>
            </div>
          )}
          {selected.overlay.kind === 'headline' && (
            <>
              <Field label="Tag superior">
                <TextInput value={selected.overlay.tag} onChange={(tag) => onChange({ tag })} uppercase />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Titular · blanco">
                  <TextInput value={selected.overlay.headlineA} onChange={(headlineA) => onChange({ headlineA })} uppercase />
                </Field>
                <Field label="Remate · naranja">
                  <TextInput value={selected.overlay.headlineB} onChange={(headlineB) => onChange({ headlineB })} uppercase />
                </Field>
              </div>
            </>
          )}
          {selected.overlay.kind === 'watermark' && (
            <p className="font-mono text-[10px] leading-relaxed text-steel/70">Firma Coach JP fija en la esquina inferior izquierda, por encima del pie de Reels.</p>
          )}
          <Field label="Opacidad">
            <Range value={selected.overlay.opacity} onChange={(opacity) => onChange({ opacity })} min={0} max={100} step={5} suffix="%" />
          </Field>
          {selected.overlay.kind !== 'watermark' && (
            <Field label="Posición vertical" plain>
              <Segmented<OverlayPosition>
                value={selected.overlay.position}
                onChange={(position) => onChange({ position })}
                options={[
                  { value: 'top', label: 'SUPERIOR' },
                  { value: 'center', label: 'CENTRO' },
                  { value: 'bottom', label: 'INFERIOR' },
                ]}
                size="sm"
              />
            </Field>
          )}
          <Field label="Entrada animada · 0,3 s" plain>
            <Segmented<OverlayEntrance>
              value={selected.overlay.entrance}
              onChange={(entrance) => onChange({ entrance })}
              options={[
                { value: 'fade', label: 'FADE' },
                { value: 'slide', label: 'SLIDE ↑' },
              ]}
              size="sm"
            />
          </Field>
          <div className="flex items-center justify-between font-mono text-[10px] text-steel">
            <span>
              {timecode(selected.start)} → {timecode(selected.end)}
            </span>
            <button type="button" onClick={onRemove} className="rounded border border-line px-2 py-0.5 tracking-wider hover:border-fire/60 hover:text-fire">
              ELIMINAR BLOQUE
            </button>
          </div>
        </>
      )}
    </div>
  )
}
