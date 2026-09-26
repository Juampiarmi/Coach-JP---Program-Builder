import { CHART_PRESETS, SAMPLES } from '../../defaults'
import { HEADLINE_FONTS, TAG_PRESETS } from '../../lib/brand'
import { generateScatter } from '../../lib/chart'
import type { Accent, CanvasState, ChartConfig, CompareCard, HeadlineFont, TemplateId } from '../../types'
import { AccentPicker, Field, Range, Section, Segmented, TextArea, TextInput, Toggle } from './primitives'

export const TEMPLATES: { id: TemplateId; n: string; label: string }[] = [
  { id: 'metric', n: '01', label: 'Métrica Gigante' },
  { id: 'compare', n: '02', label: 'Comparativa A/B' },
  { id: 'chart', n: '03', label: 'Gráfico / Telemetría' },
  { id: 'statement', n: '04', label: 'Sentencia de Texto' },
]

const CARD_ACCENTS: Accent[] = ['cyan', 'orange', 'gold', 'gray', 'white']

function AspectLabel({ ratio, size }: { ratio: string; size: string }) {
  return (
    <span className="block leading-tight">
      [ {ratio} ]<span className="block text-[10px] font-normal opacity-70">{size}</span>
    </span>
  )
}

interface Props {
  state: CanvasState
  update: (patch: Partial<CanvasState>) => void
  onReset: () => void
}

export function ControlPanel({ state, update, onReset }: Props) {
  const setChart = (patch: Partial<ChartConfig>) => update({ chart: { ...state.chart, ...patch } })
  const setCard = (key: 'cardA' | 'cardB', patch: Partial<CompareCard>) => update({ [key]: { ...state[key], ...patch } })

  return (
    <div>
      <Section index="01" title="Plantilla">
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATES.map((t) => {
            const on = state.template === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => update({ template: t.id })}
                aria-pressed={on}
                className={`rounded-xl border px-3 py-3 text-left transition ${
                  on
                    ? 'border-cyan/70 bg-cyan/10 shadow-[inset_0_0_0_1px_rgba(0,229,255,.25)]'
                    : 'border-line bg-surface-2 hover:border-steel/40'
                }`}
              >
                <span className={`block font-mono text-[10px] tracking-[0.2em] ${on ? 'text-cyan' : 'text-steel/70'}`}>{t.n}</span>
                <span className={`mt-1 block text-[13px] leading-tight font-semibold ${on ? 'text-white' : 'text-steel'}`}>{t.label}</span>
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={() => update(SAMPLES[state.template])}
          className="w-full rounded-lg border border-dashed border-line py-2 font-mono text-[11px] tracking-[0.14em] text-steel uppercase transition hover:border-cyan/50 hover:text-cyan"
        >
          Cargar ejemplo de esta plantilla
        </button>
      </Section>

      <Section index="02" title="Formato">
        <Field label="Relación de aspecto" plain>
          <Segmented
            value={state.aspect}
            onChange={(aspect) => update({ aspect })}
            options={[
              { value: 'feed', label: <AspectLabel ratio="4:5 FEED" size="1080×1350" /> },
              { value: 'story', label: <AspectLabel ratio="9:16 STORY" size="1080×1920" /> },
            ]}
            size="sm"
          />
        </Field>
        <Field label="Tipografía del titular" plain>
          <Segmented<HeadlineFont>
            value={state.headlineFont}
            onChange={(headlineFont) => update({ headlineFont })}
            options={(Object.keys(HEADLINE_FONTS) as HeadlineFont[]).map((k) => ({ value: k, label: HEADLINE_FONTS[k].label }))}
            size="sm"
          />
        </Field>
        <Field label="Escala del titular">
          <Range value={state.headlineScale} onChange={(headlineScale) => update({ headlineScale })} min={60} max={140} step={2} suffix="%" />
        </Field>
      </Section>

      <Section index="03" title="Header">
        <Field label="Tag superior" hint="se muestra entre [ corchetes ]">
          <TextInput value={state.tag} onChange={(tag) => update({ tag })} uppercase placeholder="DISCIPLINA · CATEGORÍA" />
        </Field>
        <div className="flex flex-wrap gap-1.5">
          {TAG_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => update({ tag: p })}
              className={`rounded-md border px-2 py-1 font-mono text-[10px] tracking-wider transition ${
                state.tag === p ? 'border-cyan/60 bg-cyan/10 text-cyan' : 'border-line text-steel hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <Field label="Titular · parte 1" hint={<span className="text-white">blanco</span>}>
          <TextArea value={state.headlineA} onChange={(headlineA) => update({ headlineA })} rows={2} />
        </Field>
        <Field label="Titular · parte 2" hint={<span className="text-fire">naranja fuego</span>}>
          <TextArea value={state.headlineB} onChange={(headlineB) => update({ headlineB })} rows={2} />
        </Field>
        <p className="font-mono text-[11px] leading-relaxed text-steel/70">
          Tip: envolvé una palabra en <span className="text-white">*asteriscos*</span> para invertir su color dentro de cualquier parte.
        </p>
      </Section>

      <Section index="04" title={TEMPLATES.find((t) => t.id === state.template)!.label}>
        {state.template === 'metric' && (
          <>
            <Field label="Métrica gigante" hint="ej: 3X · ~600 · 7700 · +14%">
              <TextInput value={state.metricValue} onChange={(metricValue) => update({ metricValue })} />
            </Field>
            <Field label="Subtítulo de la métrica">
              <TextInput value={state.metricLabel} onChange={(metricLabel) => update({ metricLabel })} uppercase />
            </Field>
            <Field label="Color de la métrica" plain>
              <AccentPicker value={state.metricAccent} onChange={(metricAccent) => update({ metricAccent })} options={['orange', 'cyan', 'gold']} />
            </Field>
          </>
        )}

        {state.template === 'compare' && (
          <>
            {(['cardA', 'cardB'] as const).map((key, i) => (
              <div key={key} className="space-y-3 rounded-xl border border-line bg-surface-2/60 p-3">
                <p className="font-mono text-[10px] tracking-[0.2em] text-steel/70">TARJETA {i === 0 ? 'A' : 'B'}</p>
                <Field label="Etiqueta">
                  <TextInput value={state[key].label} onChange={(label) => setCard(key, { label })} uppercase />
                </Field>
                <Field label="Valor">
                  <TextInput value={state[key].value} onChange={(value) => setCard(key, { value })} />
                </Field>
                <Field label="Descripción">
                  <TextInput value={state[key].caption} onChange={(caption) => setCard(key, { caption })} />
                </Field>
                <AccentPicker value={state[key].accent} onChange={(accent) => setCard(key, { accent })} options={CARD_ACCENTS} />
              </div>
            ))}
            <Field label="Veredicto" hint={<span className="text-gold">oro táctico</span>}>
              <TextInput value={state.verdict} onChange={(verdict) => update({ verdict })} uppercase />
            </Field>
          </>
        )}

        {state.template === 'chart' && (
          <>
            <Field label="Preset de gráfico" plain>
              <div className="grid grid-cols-2 gap-1.5">
                {CHART_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setChart(p.chart)}
                    className="rounded-md border border-line px-2 py-1.5 text-left font-mono text-[10px] tracking-wider text-steel transition hover:border-cyan/50 hover:text-cyan"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Tipo" plain>
              <Segmented
                value={state.chart.mode}
                onChange={(mode) => setChart({ mode })}
                options={[
                  { value: 'scatter', label: 'DISPERSIÓN' },
                  { value: 'curve', label: 'CURVA' },
                ]}
                size="sm"
              />
            </Field>
            <Field label="Título del gráfico">
              <TextInput value={state.chart.title} onChange={(title) => setChart({ title })} uppercase />
            </Field>

            {state.chart.mode === 'scatter' ? (
              <Field
                label="Puntos (x,y · 0–100)"
                plain
                hint={
                  <button
                    type="button"
                    className="font-mono text-[11px] text-cyan hover:underline"
                    onClick={(e) => {
                      e.preventDefault()
                      setChart({ scatter: generateScatter(Math.floor(Math.random() * 1e6)) })
                    }}
                  >
                    ↻ regenerar
                  </button>
                }
              >
                <TextArea value={state.chart.scatter} onChange={(scatter) => setChart({ scatter })} rows={5} mono />
              </Field>
            ) : (
              <>
                <Field label="Serie principal · cian" hint="valores separados por coma">
                  <TextInput value={state.chart.seriesA} onChange={(seriesA) => setChart({ seriesA })} />
                </Field>
                <Field label="Leyenda serie principal">
                  <TextInput value={state.chart.seriesALabel} onChange={(seriesALabel) => setChart({ seriesALabel })} />
                </Field>
                <Field label="Serie secundaria · naranja" hint="opcional">
                  <TextInput value={state.chart.seriesB} onChange={(seriesB) => setChart({ seriesB })} />
                </Field>
                <Field label="Leyenda serie secundaria">
                  <TextInput value={state.chart.seriesBLabel} onChange={(seriesBLabel) => setChart({ seriesBLabel })} />
                </Field>
              </>
            )}

            <div className="space-y-3 rounded-xl border border-line bg-surface-2/60 p-3">
              <Toggle label="Zona óptima (cian)" checked={state.chart.showZone} onChange={(showZone) => setChart({ showZone })} />
              {state.chart.showZone && (
                <>
                  <Field label="Desde (eje X)">
                    <Range value={state.chart.zoneFrom} onChange={(zoneFrom) => setChart({ zoneFrom })} min={0} max={100} suffix="%" />
                  </Field>
                  <Field label="Hasta (eje X)">
                    <Range value={state.chart.zoneTo} onChange={(zoneTo) => setChart({ zoneTo })} min={0} max={100} suffix="%" />
                  </Field>
                  <Field label="Leyenda de la zona">
                    <TextInput value={state.chart.zoneLabel} onChange={(zoneLabel) => setChart({ zoneLabel })} />
                  </Field>
                </>
              )}
            </div>

            <div className="space-y-3 rounded-xl border border-line bg-surface-2/60 p-3">
              <Toggle label="Umbral horizontal" checked={state.chart.showThreshold} onChange={(showThreshold) => setChart({ showThreshold })} />
              {state.chart.showThreshold && (
                <>
                  <Field label="Altura (eje Y)">
                    <Range value={state.chart.threshold} onChange={(threshold) => setChart({ threshold })} min={0} max={100} suffix="%" />
                  </Field>
                  <Field label="Leyenda del umbral">
                    <TextInput value={state.chart.thresholdLabel} onChange={(thresholdLabel) => setChart({ thresholdLabel })} />
                  </Field>
                </>
              )}
            </div>

            <div className="space-y-3 rounded-xl border border-line bg-surface-2/60 p-3">
              <Toggle label="Marcador vertical (naranja)" checked={state.chart.showMarker} onChange={(showMarker) => setChart({ showMarker })} />
              {state.chart.showMarker && (
                <>
                  <Field label="Posición (eje X)">
                    <Range value={state.chart.marker} onChange={(marker) => setChart({ marker })} min={0} max={100} suffix="%" />
                  </Field>
                  <Field label="Etiqueta">
                    <TextInput value={state.chart.markerLabel} onChange={(markerLabel) => setChart({ markerLabel })} />
                  </Field>
                  <Field label="Detalle">
                    <TextInput value={state.chart.markerSub} onChange={(markerSub) => setChart({ markerSub })} />
                  </Field>
                </>
              )}
            </div>
          </>
        )}

        {state.template === 'statement' && (
          <Field label="Remate / sentencia" hint="barra naranja">
            <TextArea value={state.kicker} onChange={(kicker) => update({ kicker })} rows={3} />
          </Field>
        )}
      </Section>

      <Section index="05" title="Argumento">
        <Field label="Párrafo descriptivo" hint={`${state.body.length} car.`}>
          <TextArea value={state.body} onChange={(body) => update({ body })} rows={4} />
        </Field>
      </Section>

      <Section index="06" title="Fuente científica">
        <Field label="Cita principal" hint="autor, año · revista">
          <TextInput value={state.citeMain} onChange={(citeMain) => update({ citeMain })} uppercase placeholder="DAMAS Y COL., 2016 · EUROPEAN JOURNAL OF APPLIED PHYSIOLOGY" />
        </Field>
        <Field label="Descripción del estudio">
          <TextInput value={state.citeSub} onChange={(citeSub) => update({ citeSub })} />
        </Field>
      </Section>

      <div className="px-5 py-6">
        <button
          type="button"
          onClick={() => {
            if (confirm('¿Restablecer todos los campos a los valores iniciales?')) onReset()
          }}
          className="w-full rounded-lg border border-line py-2.5 font-mono text-[11px] tracking-[0.14em] text-steel uppercase transition hover:border-fire/60 hover:text-fire"
        >
          Restablecer todo
        </button>
      </div>
    </div>
  )
}
