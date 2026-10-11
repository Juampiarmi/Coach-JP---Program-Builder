import { Field, Range, Segmented, TextInput } from '../components/controls/primitives'
import { timecode } from './render'
import type { CheckItem, OverlayConfig, OverlayEntrance, OverlayExit, OverlayItem, OverlayKind, OverlaySize, OverlayStyle } from './types'

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
  { value: 'timer', label: 'TIMER' },
  { value: 'checklist', label: 'CHECK' },
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
          {selected.overlay.kind === 'timer' && (
            <>
              <Field label="Rótulo del cronómetro">
                <TextInput value={selected.overlay.timerLabel} onChange={(timerLabel) => onChange({ timerLabel })} uppercase placeholder="TUT EXCÉNTRICO" />
              </Field>
              <Field label="Sentido · corre durante el bloque de V2" plain>
                <Segmented<'up' | 'down'>
                  value={selected.overlay.timerDown ? 'down' : 'up'}
                  onChange={(v) => onChange({ timerDown: v === 'down' })}
                  options={[
                    { value: 'up', label: '▲ PROGRESIVO' },
                    { value: 'down', label: '▼ REGRESIVO' },
                  ]}
                  size="sm"
                />
              </Field>
            </>
          )}
          {selected.overlay.kind === 'checklist' && (
            <ChecklistEditor checks={selected.overlay.checks} title={selected.overlay.tag} onChange={onChange} />
          )}
          {selected.overlay.kind === 'watermark' && (
            <p className="font-mono text-[10px] leading-relaxed text-steel/70">Firma Coach JP fija en la esquina inferior izquierda, por encima del pie de Reels.</p>
          )}
          <Field label="Estilo de fondo" plain>
            <Segmented<OverlayStyle>
              value={selected.overlay.style}
              onChange={(style) => onChange({ style })}
              options={[
                { value: 'box', label: 'CAJA TÁCTICA' },
                { value: 'clean', label: 'TEXTO PURO · HUD' },
              ]}
              size="sm"
            />
          </Field>
          <div className="grid grid-cols-[1fr_auto] items-end gap-2">
            <Field label="Tamaño" plain>
              <Segmented<OverlaySize>
                value={selected.overlay.size}
                onChange={(size) => onChange({ size })}
                options={[
                  { value: 'S', label: 'S · COMPACTO' },
                  { value: 'M', label: 'M' },
                  { value: 'L', label: 'L · IMPACTO' },
                ]}
                size="sm"
              />
            </Field>
            <button
              type="button"
              onClick={() => onChange(selected.overlay.kind === 'watermark' ? { x: 28, y: 74 } : { x: 50, y: 45 })}
              title="Arrastrá el overlay en el visor para ubicarlo; esto lo devuelve al centro"
              className="mb-px h-9 rounded-md border border-line px-2.5 font-mono text-[10px] font-semibold tracking-wider whitespace-nowrap text-steel transition hover:border-cyan/50 hover:text-cyan"
            >
              [ ⌖ RECENTRAR OVERLAY ]
            </button>
          </div>
          <p className="-mt-1 font-mono text-[9px] leading-relaxed text-steel/60">Arrastrá el overlay directamente en el visor para ubicarlo.</p>
          <Field label="Opacidad">
            <Range value={selected.overlay.opacity} onChange={(opacity) => onChange({ opacity })} min={0} max={100} step={5} suffix="%" />
          </Field>
          <div className="grid grid-cols-[1fr_1.5fr] gap-2">
            <Field label="Entrada · 0,3 s" plain>
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
            <Field label="Salida · 0,3 s" plain>
              <Segmented<OverlayExit>
                value={selected.overlay.exit}
                onChange={(exit) => onChange({ exit })}
                options={[
                  { value: 'none', label: 'INMEDIATO' },
                  { value: 'fade', label: 'FADE' },
                  { value: 'slide', label: 'SLIDE ↓' },
                ]}
                size="sm"
              />
            </Field>
          </div>
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

/** Checklist rápido: título opcional y 2 o 3 ítems con marcador [ ✓ ] / [ ✗ ]. */
function ChecklistEditor({ checks, title, onChange }: { checks: CheckItem[]; title: string; onChange: (patch: Partial<OverlayConfig>) => void }) {
  const list = checks.slice(0, 3)
  const set = (next: CheckItem[]) => onChange({ checks: next })
  return (
    <>
      <div className="grid grid-cols-[1fr_auto] items-end gap-2">
        <Field label="Título (opcional)">
          <TextInput value={title} onChange={(tag) => onChange({ tag })} uppercase placeholder="SERIE VÁLIDA" />
        </Field>
        <Field label="Ítems" plain>
          <Segmented<string>
            value={String(list.length)}
            onChange={(v) => set(Number(v) === 2 ? list.slice(0, 2) : [...list, { text: 'NUEVO ÍTEM', ok: true }].slice(0, 3))}
            options={[
              { value: '2', label: '2' },
              { value: '3', label: '3' },
            ]}
            size="sm"
          />
        </Field>
      </div>
      {list.map((c, i) => (
        <div key={i} className="flex items-end gap-1.5">
          <button
            type="button"
            onClick={() => set(list.map((x, j) => (j === i ? { ...x, ok: !x.ok } : x)))}
            title="Cambiar marcador"
            className={`mb-px h-9 shrink-0 rounded-md border px-2 font-mono text-[11px] font-bold ${c.ok ? 'border-cyan/60 text-cyan' : 'border-fire/60 text-fire'}`}
          >
            {c.ok ? '[ ✓ ]' : '[ ✗ ]'}
          </button>
          <div className="min-w-0 flex-1">
            <Field label={`Ítem ${i + 1}`}>
              <TextInput value={c.text} onChange={(text) => set(list.map((x, j) => (j === i ? { ...x, text } : x)))} uppercase />
            </Field>
          </div>
        </div>
      ))}
    </>
  )
}
