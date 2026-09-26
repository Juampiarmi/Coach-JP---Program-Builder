import { useRef, useState } from 'react'
import { CHART_PRESETS, SAMPLES } from '../../defaults'
import { HEADLINE_FONTS, TAG_PRESETS } from '../../lib/brand'
import { loadBackground } from '../../lib/image'
import type { Accent, CanvasState, ChartConfig, ChartMode, CompareCard, CurveShape, HeadlineFont, TemplateId } from '../../types'
import { AccentPicker, Field, NumberInput, Range, Section, Segmented, TextArea, TextInput, Toggle } from './primitives'

export const TEMPLATES: { id: TemplateId; n: string; label: string }[] = [
  { id: 'metric', n: '01', label: 'Métrica' },
  { id: 'compare', n: '02', label: 'A/B' },
  { id: 'chart', n: '03', label: 'Gráfico' },
  { id: 'statement', n: '04', label: 'Sentencia' },
]

const CARD_ACCENTS: Accent[] = ['cyan', 'orange', 'gold', 'gray', 'white']

interface Props {
  state: CanvasState
  update: (patch: Partial<CanvasState>) => void
  onReset: () => void
  bgImage: string | null
  setBgImage: (img: string | null) => void
  bgPersisted: boolean
}

export function ControlPanel({ state, update, onReset, bgImage, setBgImage, bgPersisted }: Props) {
  const setChart = (patch: Partial<ChartConfig>) => update({ chart: { ...state.chart, ...patch } })
  const setCard = (key: 'cardA' | 'cardB', patch: Partial<CompareCard>) => update({ [key]: { ...state[key], ...patch } })
  const fileRef = useRef<HTMLInputElement>(null)
  const [loadingImg, setLoadingImg] = useState(false)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setLoadingImg(true)
    try {
      setBgImage(await loadBackground(file))
    } catch (err) {
      console.error(err)
      alert('No se pudo leer la imagen.')
    } finally {
      setLoadingImg(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const chart = state.chart
  const templateLabel = TEMPLATES.find((t) => t.id === state.template)!.label

  return (
    <div>
      {/* Plantilla: pestañas compactas siempre visibles */}
      <div className="border-b border-line px-4 py-3">
        <div className="grid grid-cols-4 gap-1 rounded-lg border border-line bg-surface-2 p-0.5">
          {TEMPLATES.map((t) => {
            const on = state.template === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => update({ template: t.id })}
                aria-pressed={on}
                className={`rounded-md px-1 py-1.5 text-center transition ${on ? 'bg-cyan text-carbon' : 'text-steel hover:bg-white/5 hover:text-white'}`}
              >
                <span className="block font-mono text-[9px] tracking-[0.18em] opacity-70">{t.n}</span>
                <span className="block text-[12px] leading-tight font-semibold">{t.label}</span>
              </button>
            )
          })}
        </div>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => update(SAMPLES[state.template])}
            className="flex-1 rounded-md border border-dashed border-line py-1.5 font-mono text-[10px] tracking-[0.12em] text-steel uppercase transition hover:border-cyan/50 hover:text-cyan"
          >
            Cargar ejemplo
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm('¿Restablecer todos los campos a los valores iniciales?')) onReset()
            }}
            className="rounded-md border border-line px-3 py-1.5 font-mono text-[10px] tracking-[0.12em] text-steel uppercase transition hover:border-fire/60 hover:text-fire"
          >
            Reset
          </button>
        </div>
      </div>

      <Section index="01" title="Texto" summary={`${state.headlineA} ${state.headlineB}`}>
        <Field label="Tag superior">
          <TextInput value={state.tag} onChange={(tag) => update({ tag })} uppercase placeholder="DISCIPLINA · CATEGORÍA" />
        </Field>
        <div className="-mt-1 flex gap-1.5 overflow-x-auto pb-1 tc-scroll">
          {TAG_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => update({ tag: p })}
              className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] tracking-wider whitespace-nowrap transition ${
                state.tag === p ? 'border-cyan/60 bg-cyan/10 text-cyan' : 'border-line text-steel hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Titular · blanco">
            <TextArea value={state.headlineA} onChange={(headlineA) => update({ headlineA })} rows={2} />
          </Field>
          <Field label="Remate · naranja">
            <TextArea value={state.headlineB} onChange={(headlineB) => update({ headlineB })} rows={2} />
          </Field>
        </div>
        <Field label="Párrafo" hint={<span>*palabra* invierte color · {state.body.length} car.</span>}>
          <TextArea value={state.body} onChange={(body) => update({ body })} rows={3} />
        </Field>
      </Section>

      <Section index="02" title={templateLabel} summary={summaryFor(state)}>
        {state.template === 'metric' && (
          <>
            <div className="grid grid-cols-[1fr_2fr] gap-2">
              <Field label="Métrica">
                <TextInput value={state.metricValue} onChange={(metricValue) => update({ metricValue })} placeholder="+14%" />
              </Field>
              <Field label="Subtítulo">
                <TextInput value={state.metricLabel} onChange={(metricLabel) => update({ metricLabel })} uppercase />
              </Field>
            </div>
            <AccentPicker value={state.metricAccent} onChange={(metricAccent) => update({ metricAccent })} options={['orange', 'cyan', 'gold']} />
          </>
        )}

        {state.template === 'compare' && (
          <>
            {(['cardA', 'cardB'] as const).map((key, i) => (
              <div key={key} className="space-y-2 rounded-lg border border-line bg-surface-2/60 p-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <Field label={`Tarjeta ${i === 0 ? 'A' : 'B'} · etiqueta`}>
                    <TextInput value={state[key].label} onChange={(label) => setCard(key, { label })} uppercase />
                  </Field>
                  <Field label="Valor">
                    <TextInput value={state[key].value} onChange={(value) => setCard(key, { value })} />
                  </Field>
                </div>
                <TextInput value={state[key].caption} onChange={(caption) => setCard(key, { caption })} placeholder="Descripción" />
                <AccentPicker value={state[key].accent} onChange={(accent) => setCard(key, { accent })} options={CARD_ACCENTS} />
              </div>
            ))}
            <Field label="Veredicto · oro">
              <TextInput value={state.verdict} onChange={(verdict) => update({ verdict })} uppercase />
            </Field>
          </>
        )}

        {state.template === 'chart' && (
          <>
            <div className="flex gap-1.5 overflow-x-auto pb-1 tc-scroll">
              {CHART_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setChart(p.chart)}
                  className="shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-[9px] tracking-wider whitespace-nowrap text-steel transition hover:border-cyan/50 hover:text-cyan"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Segmented<ChartMode>
              value={chart.mode}
              onChange={(mode) => setChart({ mode })}
              options={[
                { value: 'curve', label: 'CURVA' },
                { value: 'bars', label: 'BARRAS' },
                { value: 'gauge', label: 'MEDIDOR' },
              ]}
              size="sm"
            />
            <Field label="Etiqueta de la curva">
              <TextInput value={chart.title} onChange={(title) => setChart({ title })} uppercase placeholder="CADENCIA VS. FUERZA" />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Mínimo">
                <NumberInput value={chart.min} onChange={(min) => setChart({ min })} />
              </Field>
              <Field label="Máximo">
                <NumberInput value={chart.max} onChange={(max) => setChart({ max })} />
              </Field>
              <Field label="Unidad">
                <TextInput value={chart.unit} onChange={(unit) => setChart({ unit })} placeholder="rpm" />
              </Field>
            </div>
            <div className="grid grid-cols-[1fr_2fr] gap-2">
              <Field label="Zona óptima">
                <TextInput value={chart.zone} onChange={(zone) => setChart({ zone })} placeholder="70-90" />
              </Field>
              <Field label="Leyenda de zona">
                <TextInput value={chart.zoneLabel} onChange={(zoneLabel) => setChart({ zoneLabel })} />
              </Field>
            </div>

            {chart.mode === 'curve' && (
              <Field label="Forma" plain>
                <Segmented<CurveShape>
                  value={chart.shape}
                  onChange={(shape) => setChart({ shape })}
                  options={[
                    { value: 'bell', label: '∩ PICO EN ZONA' },
                    { value: 'rise', label: '↗ SUBE' },
                    { value: 'fall', label: '↘ CAE' },
                  ]}
                  size="sm"
                />
              </Field>
            )}
            {chart.mode === 'bars' && (
              <>
                <Field label="Etiquetas" hint="separadas por coma">
                  <TextInput value={chart.barLabels} onChange={(barLabels) => setChart({ barLabels })} placeholder="60, 70, 80, 90" />
                </Field>
                <Field label="Valores" hint="en cian las que caen en la zona">
                  <TextInput value={chart.barValues} onChange={(barValues) => setChart({ barValues })} placeholder="62, 80, 88, 71" />
                </Field>
              </>
            )}
            {chart.mode === 'gauge' && (
              <div className="grid grid-cols-3 gap-2">
                <Field label="Valor actual">
                  <NumberInput value={chart.gaugeValue} onChange={(gaugeValue) => setChart({ gaugeValue })} />
                </Field>
                <Field label="Umbral">
                  <NumberInput value={chart.gaugeThreshold} onChange={(gaugeThreshold) => setChart({ gaugeThreshold })} />
                </Field>
                <Field label="Rótulo">
                  <TextInput value={chart.gaugeLabel} onChange={(gaugeLabel) => setChart({ gaugeLabel })} />
                </Field>
              </div>
            )}
          </>
        )}

        {state.template === 'statement' && (
          <Field label="Remate / sentencia" hint="barra naranja">
            <TextArea value={state.kicker} onChange={(kicker) => update({ kicker })} rows={2} />
          </Field>
        )}
      </Section>

      <Section index="03" title="Fondo" summary={bgImage ? `Foto · capa ${state.bgOverlay}%` : 'Carbón sólido'} defaultOpen={Boolean(bgImage)}>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={loadingImg}
            className="flex flex-1 items-center gap-2.5 rounded-md border border-dashed border-cyan/40 bg-cyan/5 px-2.5 py-2 text-left font-mono text-[11px] tracking-[0.1em] text-cyan transition hover:bg-cyan/10 disabled:opacity-60"
          >
            {bgImage ? (
              <img src={bgImage} alt="" className="size-8 shrink-0 rounded object-cover ring-1 ring-line" />
            ) : (
              <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="m3 16 5-5 4 4 3-3 6 6M15 9h.01" />
              </svg>
            )}
            {loadingImg ? 'PROCESANDO…' : bgImage ? '[ CAMBIAR IMAGEN ]' : '[ SUBIR IMAGEN DE FONDO ]'}
          </button>
          {bgImage && (
            <button
              type="button"
              onClick={() => setBgImage(null)}
              className="rounded-md border border-line px-3 font-mono text-[10px] tracking-wider text-steel uppercase transition hover:border-fire/60 hover:text-fire"
            >
              Quitar
            </button>
          )}
        </div>
        {bgImage && (
          <>
            <Field label="Opacidad de capa táctica">
              <Range value={state.bgOverlay} onChange={(bgOverlay) => update({ bgOverlay })} min={30} max={90} suffix="%" />
            </Field>
            <Toggle label="Placa sólida flotante" checked={state.floatingPlate} onChange={(floatingPlate) => update({ floatingPlate })} />
            {!bgPersisted && (
              <p className="font-mono text-[10px] text-gold/80">La foto es muy pesada para guardarse: se usa en esta sesión.</p>
            )}
          </>
        )}
      </Section>

      <Section index="04" title="Fuente científica" summary={state.citeMain} defaultOpen={false}>
        <TextInput value={state.citeMain} onChange={(citeMain) => update({ citeMain })} uppercase placeholder="AUTOR Y COL., AÑO · REVISTA" />
        <TextInput value={state.citeSub} onChange={(citeSub) => update({ citeSub })} placeholder="Descripción del estudio" />
      </Section>

      <Section
        index="05"
        title="Estilo"
        summary={`${HEADLINE_FONTS[state.headlineFont].label} · ${state.headlineScale}%`}
        defaultOpen={false}
      >
        <Segmented<HeadlineFont>
          value={state.headlineFont}
          onChange={(headlineFont) => update({ headlineFont })}
          options={(Object.keys(HEADLINE_FONTS) as HeadlineFont[]).map((k) => ({ value: k, label: HEADLINE_FONTS[k].label }))}
          size="sm"
        />
        <Field label="Escala del titular">
          <Range value={state.headlineScale} onChange={(headlineScale) => update({ headlineScale })} min={60} max={140} step={2} suffix="%" />
        </Field>
      </Section>
    </div>
  )
}

function summaryFor(s: CanvasState) {
  switch (s.template) {
    case 'metric':
      return `${s.metricValue} · ${s.metricLabel}`
    case 'compare':
      return `${s.cardA.value} vs ${s.cardB.value}`
    case 'chart':
      return `${s.chart.mode.toUpperCase()} · ${s.chart.min}–${s.chart.max} ${s.chart.unit} · zona ${s.chart.zone}`
    case 'statement':
      return s.kicker
  }
}
