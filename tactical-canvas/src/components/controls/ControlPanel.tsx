import { useRef, useState } from 'react'
import { CHART_PRESETS, DEFAULT_STATE, SAMPLES } from '../../defaults'
import { detectQuoteIntent } from '../../lib/quoteIntent'
import { DEFAULT_AUTHOR, HEADLINE_FONTS, MANIFESTO_TAGS, TAG_PRESETS } from '../../lib/brand'
import { loadBackground } from '../../lib/image'
import type { Accent, BgStyle, RepeatDirection, TypePreset, CanvasState, ContentAlign, DiagramData, DiagramAccent, DiagramKind, RepeatAccent, RepeatMode, ThemeId, ChartConfig, ChartMode, CompareCard, CurveShape, HeadlineFont, ManifestoStyle, StickerKind, TemplateId } from '../../types'
import { DIAGRAM_ACCENT_HEX, DIAGRAM_ACCENT_LABEL, PAPER_TEMPLATES, REPEAT_ACCENT_LABEL, THEME_LABEL } from '../../lib/theme'
import { RadarEditor } from './RadarEditor'
import { CHART_BY_DISCIPLINE, isCadenceSample } from '../../lib/chartPillar'
import type { Discipline } from '../../lib/ai'
import { diagramDefaults, inferPillar, resolveDiagramData, slideText } from '../../lib/diagramPillar'
import { STRUCT_TEMPLATES, structDefaults } from '../../lib/structPillar'
import { StructEditor } from './StructEditor'
import { BookmarkEditor } from './BookmarkEditor'
import { OpusEditor } from './OpusEditor'
import { AthleticEditor } from './AthleticEditor'
import { WorkoutEditor } from './WorkoutEditor'
import { FixEditor } from './FixEditor'
import { SeamlessControls } from './SeamlessControls'
import { STICKER_OPTIONS, STICKER_SPEC } from '../../lib/remix'
import { QuoteEditor } from './QuoteEditor'
import { CitationSuggester, HookGenerator, HookScorer } from './AiAssist'
import { TYPE_PRESETS } from '../../lib/typography'
import { AccentPicker, Field, NumberInput, Range, Section, Segmented, TextArea, TextInput, Toggle } from './primitives'

const isStruct = (t: TemplateId) => (STRUCT_TEMPLATES as readonly string[]).includes(t)

const BG_STYLE_LABEL: Record<BgStyle, string> = {
  photo: 'B/N ATLETA',
  concrete: 'CEMENTO',
  blueprint: 'GRILLA',
  radial: 'LUZ RADIAL',
}

export const TEMPLATES: { id: TemplateId; n: string; label: string }[] = [
  { id: 'metric', n: '01', label: 'Métrica' },
  { id: 'compare', n: '02', label: 'A/B' },
  { id: 'chart', n: '03', label: 'Gráfico' },
  { id: 'statement', n: '04', label: 'Sentencia' },
  { id: 'manifesto', n: '05', label: 'Manifiesto' },
  { id: 'diagram', n: '06', label: 'Diagrama' },
  { id: 'repeat', n: '07', label: 'Repetición' },
  { id: 'matrix', n: '08', label: 'Matriz 2x2' },
  { id: 'pipeline', n: '09', label: 'Pipeline' },
  { id: 'pyramid', n: '10', label: 'Pirámide' },
  { id: 'checklist', n: '11', label: 'Checklist' },
  { id: 'bookmark', n: '12', label: 'Guardado' },
  { id: 'opus', n: '13', label: 'Mindset / Opus' },
  { id: 'quote', n: '14', label: 'Cita célebre' },
  { id: 'athletic', n: '15', label: 'Opus Athletic' },
  { id: 'essay', n: '16', label: 'Manifiesto texto' },
  { id: 'workout', n: '17', label: 'Sesión / Rutina' },
  { id: 'fix', n: '18', label: 'Error vs Corrección' },
]

const DIAGRAM_KINDS: { value: DiagramKind; label: string }[] = [
  { value: 'radar', label: 'RADAR' },
  { value: 'circles', label: 'CÍRCULOS' },
  { value: 'domino', label: 'DOMINÓ' },
  { value: 'curve', label: 'TRAYECTORIA' },
  { value: 'funnel', label: 'EMBUDO' },
  { value: 'versus', label: 'VS BINARIO' },
]

const REPEAT_MODE_HINT: Record<RepeatMode, string> = {
  diagonal: 'Diagonal escalonada · una palabra encendida por renglón',
  echo: 'Eco con jerarquía · central grande en acento',
  kinetic: 'Kinetic brutalist · 1-2 palabras + contornos finos',
  justified: 'Bloque justificado · póster tipográfico',
}

const ALIGN_LABEL: Record<ContentAlign, string> = { auto: 'AUTO', top: 'ARRIBA', center: 'CENTRO', bottom: 'ABAJO' }

/** Presets de métricas reales de fuerza para el gráfico (sólo completan el rango y la zona). */
const TRAINING_PRESETS: { label: string; chart: Partial<ChartConfig> }[] = [
  { label: 'SERIES / SEMANA', chart: { min: 0, max: 30, unit: 'series', zone: '10-18', zoneLabel: 'VENTANA HIPERTROFIA' } },
  { label: 'RIR / INTENSIDAD', chart: { min: 0, max: 5, unit: 'RIR', zone: '1-2', zoneLabel: 'ESTÍMULO EFECTIVO' } },
  { label: 'RPE ESFUERZO', chart: { min: 5, max: 10, unit: 'RPE', zone: '7-9', zoneLabel: 'ZONA DE ADAPTACIÓN' } },
]

/** Citas frecuentes de fisiología y fuerza: un toque completa autor/año y descripción. */
const CITATION_LIBRARY = [
  { label: 'SCHOENFELD', main: 'SCHOENFELD Y COL., 2019 · J STRENGTH COND RES', sub: 'Respuesta a la dosis de volumen en hipertrofia muscular' },
  { label: 'MEEUSEN', main: 'MEEUSEN Y COL., 2013 · MED SCI SPORTS EXERC', sub: 'Consenso sobre diagnóstico y prevención del sobreentrenamiento' },
  { label: 'MORTON', main: 'MORTON Y COL., 2018 · BR J SPORTS MED', sub: 'Ingesta proteica y respuesta anabólica en entrenamiento de fuerza' },
  { label: 'HELMS', main: 'HELMS Y COL., 2014 · J INT SOC SPORTS NUTR', sub: 'Recomendaciones basadas en evidencia para atletas de fuerza' },
]

const CARD_ACCENTS: Accent[] = ['cyan', 'orange', 'gold', 'gray', 'white']

interface Props {
  state: CanvasState
  update: (patch: Partial<CanvasState>) => void
  onReset: () => void
  bgImage: string | null
  setBgImage: (img: string | null) => void
  bgPersisted: boolean
  /** Pilar activo al momento del clic (chip del generador IA o el de la última generación) */
  getDiscipline: () => Discipline
  /** Posición de la placa activa en la secuencia (0 = portada) */
  slideIndex: number
  /** Tema de la secuencia para las herramientas de IA */
  topic: string
  /** Viñetas extraídas automáticamente del carrusel para la placa de guardado */
  bookmarkAuto: string[]
  /** Copia tipografía, viñeta y acentos de esta placa a todas las del set */
  onCopyStyle?: () => void
  /** Guarda una imagen extra (Error vs Corrección) y devuelve su id */
  addImage?: (dataUrl: string) => string
  resolveImage?: (id: string | null | undefined) => string | null
  slideCount?: number
}

/**
 * Pasar a mano a 14 · Cita táctica: si la placa todavía tiene la cita de ejemplo, su propio titular
 * pasa a ser la frase (remate = el naranja del titular) y el autor se toma del texto si nombra a una
 * figura icónica. Una cita ya cargada se respeta tal cual.
 */
function seedQuote(state: CanvasState): Partial<CanvasState> {
  const own = `${state.headlineA} ${state.headlineB}`.replace(/\*/g, '').replace(/\s+/g, ' ').trim()
  const isSample = state.quoteText === DEFAULT_STATE.quoteText || !(state.quoteText ?? '').trim()
  if (!isSample || !own || own === `${DEFAULT_STATE.headlineA} ${DEFAULT_STATE.headlineB}`) return {}
  const author = detectQuoteIntent(`${own} ${state.body} ${state.tag}`)?.author ?? ''
  return { quoteText: own, quoteEmphasis: state.headlineB.replace(/\*/g, '').trim(), quoteAuthor: author, quoteRole: '', quoteSource: '' }
}

export function ControlPanel({ state, update, onReset, bgImage, setBgImage, bgPersisted, getDiscipline, slideIndex, topic, bookmarkAuto, onCopyStyle, slideCount = 1, addImage, resolveImage }: Props) {
  const ai = { state, update, topic, discipline: getDiscipline() }
  const setChart = (patch: Partial<ChartConfig>) => update({ chart: { ...state.chart, ...patch } })
  const setCard = (key: 'cardA' | 'cardB', patch: Partial<CompareCard>) => update({ [key]: { ...state[key], ...patch } })
  // Diagrama: lo que se ve es lo que se edita (datos de la placa o, si no hay, los del pilar del tema).
  const diagram = resolveDiagramData(state)
  const setDiagram = <K extends keyof DiagramData>(kind: K, patch: Partial<DiagramData[K]>) =>
    update({ diagramData: { ...diagram, [kind]: { ...diagram[kind], ...patch } } })
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
                onClick={() => {
                  const discipline = getDiscipline()
                  // Al pasar a Gráfico, si todavía tiene la cadencia de ejemplo, se adapta al pilar activo.
                  update(
                    t.id === 'chart' && isCadenceSample(state.chart)
                      ? { template: t.id, chart: { ...state.chart, ...CHART_BY_DISCIPLINE[discipline] } }
                      : t.id === 'diagram' && !state.diagramData
                        ? // Al pasar a Diagrama sin datos propios, se cargan los del pilar activo y el tema de la placa.
                          { template: t.id, diagramData: diagramDefaults(inferPillar(discipline, ...slideText(state))) }
                        : isStruct(t.id) && !state.structData
                          ? { template: t.id, structData: structDefaults(inferPillar(discipline, ...slideText(state))) }
                          : t.id === 'quote'
                            ? { template: t.id, ...seedQuote(state) }
                            : { template: t.id },
                  )
                }}
                aria-pressed={on}
                className={`rounded-md px-1 py-1.5 text-center transition ${on ? 'bg-cyan text-carbon' : 'text-steel hover:bg-white/5 hover:text-white'}`}
              >
                <span className="block font-mono text-[9px] tracking-[0.18em] opacity-70">{t.n}</span>
                <span className="block truncate text-[11px] leading-tight font-semibold">{t.label}</span>
              </button>
            )
          })}
        </div>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() =>
              update(
                state.template === 'chart' && getDiscipline() === 'crossfit'
                  ? { ...SAMPLES.chart, chart: { ...state.chart, ...CHART_BY_DISCIPLINE.crossfit } }
                  : state.template === 'diagram'
                    ? { ...SAMPLES.diagram, diagramData: diagramDefaults(inferPillar(getDiscipline(), ...slideText({ ...state, ...SAMPLES.diagram }))) }
                    : isStruct(state.template)
                      ? { ...SAMPLES[state.template], structData: structDefaults(inferPillar(getDiscipline(), ...slideText({ ...state, ...SAMPLES[state.template] }))) }
                      : SAMPLES[state.template],
              )
            }
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
          {(state.template === 'manifesto' ? MANIFESTO_TAGS : TAG_PRESETS).map((p) => (
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
        {state.template === 'repeat' ? (
          <p className="font-mono text-[10px] leading-relaxed text-steel/70">
            En Repetición la frase de la matriz reemplaza al titular y al párrafo: se edita en la sección 02.
          </p>
        ) : state.template === 'quote' ? (
          <QuoteEditor state={state} update={update} discipline={getDiscipline()} topic={topic ?? ''} />
        ) : (
        <>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Titular · blanco">
            <TextArea value={state.headlineA} onChange={(headlineA) => update({ headlineA })} rows={2} />
          </Field>
          <div>
            <div className="mb-1 flex items-baseline justify-between gap-1">
              <span className="truncate font-mono text-[10px] tracking-[0.12em] whitespace-nowrap text-steel uppercase">Remate · naranja</span>
              <button
                type="button"
                onClick={() => update({ headlineA: state.headlineB, headlineB: state.headlineA })}
                title="Intercambia el texto del titular (blanco) y del remate (naranja)"
                className="shrink-0 rounded border border-line bg-surface px-1 py-px font-mono text-[9px] tracking-wider whitespace-nowrap text-steel transition hover:border-cyan/50 hover:text-cyan"
              >
                ⇄ INVERTIR
              </button>
            </div>
            <TextArea value={state.headlineB} onChange={(headlineB) => update({ headlineB })} rows={2} />
          </div>
        </div>
        <p className="-mt-1 font-mono text-[9px] tracking-wider text-steel/60">↵ Enter = salto de línea forzado · *palabra* invierte color</p>
        <Toggle label="↵ Remate en renglón nuevo" checked={state.remateNewLine !== false} onChange={(remateNewLine) => update({ remateNewLine })} />
        {state.remateNewLine !== false && (
          <Field label="Separación titular → remate" hint={(state.remateGap ?? 0) === 0 ? 'interlineado' : undefined}>
            <Range value={state.remateGap ?? 0} onChange={(remateGap) => update({ remateGap })} min={0} max={60} step={2} suffix="%" />
          </Field>
        )}
        {slideIndex === 0 && <HookScorer {...ai} />}
        {slideIndex === 0 && <HookGenerator {...ai} />}
        </>
        )}
        <Field label="Preset tipográfico" plain>
          <div className="grid grid-cols-3 gap-1.5">
            {TYPE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                title={p.hint}
                onClick={() => update({ typePreset: state.typePreset === p.id ? 'none' : (p.id as TypePreset) })}
                aria-pressed={state.typePreset === p.id}
                className={`rounded-md border px-1 py-1.5 font-mono text-[9px] font-semibold tracking-wider whitespace-nowrap transition ${
                  state.typePreset === p.id ? 'border-cyan/70 bg-cyan/15 text-cyan' : 'border-line text-steel hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </Field>
        <button
          type="button"
          onClick={() => update({ accentSwap: !state.accentSwap })}
          aria-pressed={Boolean(state.accentSwap)}
          title="Alterna naranja ⇄ cian en toda la placa"
          className={`flex w-full items-center justify-center gap-2 rounded-md border py-1.5 font-mono text-[10px] font-semibold tracking-[0.12em] transition ${
            state.accentSwap ? 'border-cyan/70 bg-cyan/10 text-cyan' : 'border-fire/60 bg-fire/10 text-fire'
          }`}
        >
          <span className="size-3 rounded-sm" style={{ background: state.accentSwap ? '#38BDF8' : '#EA580C' }} />
          [ ⚡ SWAP ACCENT · {state.accentSwap ? 'CIAN' : 'NARANJA'} ]
        </button>
        {state.template === 'repeat' || state.template === 'quote' || state.template === 'essay' || state.template === 'workout' || state.template === 'fix' ? null : state.template === 'manifesto' ? (
          <p className="font-mono text-[10px] text-steel/70">*palabra* invierte el color dentro de la frase.</p>
        ) : (
          <Field label={state.template === 'diagram' ? 'Párrafo (opcional)' : 'Párrafo'} hint={<span>*palabra* invierte color · {state.body.length} car.</span>}>
            <TextArea value={state.body} onChange={(body) => update({ body })} rows={3} />
          </Field>
        )}
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
            <div className="flex gap-1.5">
              {TRAINING_PRESETS.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setChart(t.chart)}
                  className="flex-1 rounded-md border border-fire/40 bg-fire/5 px-1.5 py-1 font-mono text-[9px] font-semibold tracking-wider whitespace-nowrap text-fire transition hover:bg-fire/15"
                >
                  [ {t.label} ]
                </button>
              ))}
            </div>
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
                    { value: 'plateau', label: '▔ MESETA' },
                    { value: 'returns', label: '⌒ RETORNO' },
                  ]}
                  size="sm"
                />
              </Field>
            )}
            {chart.mode === 'curve' && (
              <>
                <Toggle
                  label="Curva comparativa (doble trazo)"
                  checked={Boolean(chart.compare)}
                  onChange={(compare) =>
                    setChart(
                      compare && !chart.mainLabel
                        ? { compare, shape: 'plateau', compareShape: 'fall', mainLabel: 'Atleta de fuerza · estímulo continuo', compareLabel: 'Población sedentaria · sin estímulo' }
                        : { compare },
                    )
                  }
                />
                {chart.compare && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Trazo principal · cian">
                        <TextInput value={chart.mainLabel ?? ''} onChange={(mainLabel) => setChart({ mainLabel })} />
                      </Field>
                      <Field label="Trazo contraste · rojo">
                        <TextInput value={chart.compareLabel ?? ''} onChange={(compareLabel) => setChart({ compareLabel })} />
                      </Field>
                    </div>
                    <Field label="Forma del contraste" plain>
                      <Segmented<CurveShape>
                        value={chart.compareShape ?? 'fall'}
                        onChange={(compareShape) => setChart({ compareShape })}
                        options={[
                          { value: 'fall', label: '↘ CAE' },
                          { value: 'bell', label: '∩ PICO' },
                          { value: 'rise', label: '↗ SUBE' },
                          { value: 'plateau', label: '▔ MESETA' },
                        ]}
                        size="sm"
                      />
                    </Field>
                  </>
                )}
              </>
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

        {state.template === 'diagram' && (
          <>
            <Segmented<DiagramKind> value={state.diagramKind} onChange={(diagramKind) => update({ diagramKind })} options={DIAGRAM_KINDS} size="sm" />
            <Field label="Color de acento" plain>
              <div className="flex gap-1.5">
                {(Object.keys(DIAGRAM_ACCENT_HEX) as DiagramAccent[]).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => update({ diagramAccent: a })}
                    aria-pressed={state.diagramAccent === a}
                    className={`flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10px] tracking-wider uppercase transition ${
                      state.diagramAccent === a ? 'border-white/60 bg-white/10 text-white' : 'border-line text-steel hover:text-white'
                    }`}
                  >
                    <span className="size-3 rounded-sm" style={{ background: DIAGRAM_ACCENT_HEX[a] }} />
                    {DIAGRAM_ACCENT_LABEL[a]}
                  </button>
                ))}
              </div>
            </Field>
            {state.diagramKind === 'radar' && (
              <>
                <RadarEditor radar={diagram.radar} onChange={(p) => setDiagram('radar', p)} />
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Leyenda">
                    <TextInput value={diagram.radar.labelA} onChange={(labelA) => setDiagram('radar', { labelA })} />
                  </Field>
                  {diagram.radar.compare.trim() && (
                    <Field label="Leyenda comparación">
                      <TextInput value={diagram.radar.labelB} onChange={(labelB) => setDiagram('radar', { labelB })} />
                    </Field>
                  )}
                </div>
              </>
            )}
            {state.diagramKind === 'circles' && (
              <>
                <Field label="Divisiones por círculo" hint="el último se repite con 1 parte destacada">
                  <TextInput value={diagram.circles.divisions} onChange={(divisions) => setDiagram('circles', { divisions })} placeholder="1, 3, 12" />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  {[0, 1, 2, 3].map((i) => {
                    const caps = diagram.circles.captions.split('\n')
                    return (
                      <Field key={i} label={`Círculo ${i + 1}${i === 3 ? ' · destacado' : ''}`}>
                        <TextInput
                          value={caps[i] ?? ''}
                          onChange={(v) => {
                            const next = [0, 1, 2, 3].map((j) => (j === i ? v : (caps[j] ?? '')))
                            setDiagram('circles', { captions: next.join('\n') })
                          }}
                        />
                      </Field>
                    )
                  })}
                </div>
              </>
            )}
            {state.diagramKind === 'domino' && (
              <>
                <Field label="Cantidad de fichas">
                  <Range value={diagram.domino.count} onChange={(count) => setDiagram('domino', { count })} min={4} max={9} />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Inicio">
                    <TextInput value={diagram.domino.start} onChange={(start) => setDiagram('domino', { start })} />
                  </Field>
                  <Field label="Final">
                    <TextInput value={diagram.domino.end} onChange={(end) => setDiagram('domino', { end })} />
                  </Field>
                </div>
                <Field label="Rótulo por ficha" hint="uno por línea · opcional">
                  <TextArea value={diagram.domino.labels ?? ''} onChange={(labels) => setDiagram('domino', { labels })} rows={3} />
                </Field>
              </>
            )}
            {state.diagramKind === 'funnel' && diagram.funnel && (
              <Field label="Niveles del embudo" hint="3 o 4 · uno por línea, de lo general a lo seleccionado">
                <TextArea value={diagram.funnel.levels} onChange={(levels) => setDiagram('funnel', { levels })} rows={4} />
              </Field>
            )}
            {state.diagramKind === 'versus' && diagram.versus && (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Columna izquierda · ✗">
                  <TextInput value={diagram.versus.leftTitle} onChange={(leftTitle) => setDiagram('versus', { leftTitle })} uppercase placeholder="MITO" />
                </Field>
                <Field label="Columna derecha · ✓">
                  <TextInput value={diagram.versus.rightTitle} onChange={(rightTitle) => setDiagram('versus', { rightTitle })} uppercase placeholder="REALIDAD" />
                </Field>
                <Field label="Ítems ✗" hint="uno por línea">
                  <TextArea value={diagram.versus.left} onChange={(left) => setDiagram('versus', { left })} rows={4} />
                </Field>
                <Field label="Ítems ✓" hint="uno por línea">
                  <TextArea value={diagram.versus.right} onChange={(right) => setDiagram('versus', { right })} rows={4} />
                </Field>
              </div>
            )}
            {state.diagramKind === 'curve' && (
              <div className="grid grid-cols-3 gap-2">
                <Field label="Tramo caótico · ruido">
                  <TextInput value={diagram.trajectory.noise} onChange={(noise) => setDiagram('trajectory', { noise })} />
                </Field>
                <Field label="Tramo limpio · claridad">
                  <TextInput value={diagram.trajectory.clarity} onChange={(clarity) => setDiagram('trajectory', { clarity })} />
                </Field>
                <Field label="Meta (bandera)">
                  <TextInput value={diagram.trajectory.goal} onChange={(goal) => setDiagram('trajectory', { goal })} />
                </Field>
              </div>
            )}
          </>
        )}

        {isStruct(state.template) && <StructEditor state={state} update={update} />}

        {state.template === 'opus' && <OpusEditor state={state} update={update} />}
        {state.template === 'athletic' && <AthleticEditor state={state} update={update} />}
        {state.template === 'workout' && <WorkoutEditor state={state} update={update} />}
        {state.template === 'fix' && <FixEditor state={state} update={update} addImage={addImage} resolveImage={resolveImage} />}
        {state.template === 'essay' && (
          <Field label="Párrafos" hint="línea en blanco = párrafo nuevo · MAYÚSCULAS = remate en Chakra">
            <TextArea value={(state.essayParas ?? []).join('\n\n')} onChange={(v) => update({ essayParas: v.split(/\n[ \t]*\n/) })} rows={9} />
          </Field>
        )}
        {state.template === 'bookmark' && <BookmarkEditor state={state} update={update} auto={bookmarkAuto} />}

        {state.template === 'repeat' && (
          <>
            <Segmented<RepeatMode>
              value={state.repeatMode}
              onChange={(repeatMode) => update({ repeatMode })}
              options={[
                { value: 'diagonal', label: 'DIAGONAL' },
                { value: 'echo', label: 'ECO' },
                { value: 'kinetic', label: 'KINETIC' },
                { value: 'justified', label: 'BLOQUE' },
              ]}
              size="sm"
            />
            <p className="-mt-1 font-mono text-[10px] tracking-[0.12em] text-steel/70 uppercase">{REPEAT_MODE_HINT[state.repeatMode]}</p>
            <Field
              label={
                state.repeatMode === 'diagonal' || state.repeatMode === 'justified'
                  ? 'Frase'
                  : state.repeatMode === 'kinetic'
                    ? 'Palabra o frase corta (1-2 palabras)'
                    : 'Frase (ideal 1-2 palabras clave)'
              }
              hint={state.repeatMode !== 'diagonal' ? undefined : `${state.repeatPhrase.trim().split(/\s+/).filter(Boolean).length} palabras = renglones`}
            >
              <TextArea value={state.repeatPhrase} onChange={(repeatPhrase) => update({ repeatPhrase })} rows={3} />
            </Field>
            {state.repeatMode === 'diagonal' && (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Orientación" plain>
                  <Segmented<RepeatDirection>
                    value={state.repeatDirection ?? 'down'}
                    onChange={(repeatDirection) => update({ repeatDirection })}
                    options={[
                      { value: 'up', label: '↗ ASCENDENTE' },
                      { value: 'down', label: '↘ DESCENDENTE' },
                    ]}
                    size="sm"
                  />
                </Field>
                <Field label="Giro del bloque">
                  <Range value={state.repeatTilt ?? 0} onChange={(repeatTilt) => update({ repeatTilt })} min={-30} max={30} step={1} suffix="°" />
                </Field>
              </div>
            )}
            {state.repeatMode === 'kinetic' && (
              <Toggle label="Desplazamiento escalonado (−10 % / 0 / +10 %)" checked={state.repeatStagger !== false} onChange={(repeatStagger) => update({ repeatStagger })} />
            )}
            {state.repeatMode === 'echo' && (
              <>
                <Field label="Palabra clave en acento" hint="de la frase central · opcional">
                  <TextInput value={state.repeatKeyword ?? ''} onChange={(repeatKeyword) => update({ repeatKeyword })} uppercase placeholder="EJ: CONTRA" />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Repeticiones">
                    <Range value={state.repeatCount} onChange={(repeatCount) => update({ repeatCount })} min={3} max={9} step={2} />
                  </Field>
                  <Field label="Frase central">
                    <Range value={state.repeatCenterScale} onChange={(repeatCenterScale) => update({ repeatCenterScale })} min={100} max={180} step={5} suffix="%" />
                  </Field>
                </div>
                <Toggle label="Banda oscura detrás de la central" checked={state.repeatBand} onChange={(repeatBand) => update({ repeatBand })} />
              </>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Field label="Escala del texto">
                <Range value={state.repeatScale} onChange={(repeatScale) => update({ repeatScale })} min={40} max={100} step={5} suffix="%" />
              </Field>
              <Field label="Interlineado" hint={state.repeatLeading === 100 ? 'auto' : undefined}>
                <Range value={state.repeatLeading} onChange={(repeatLeading) => update({ repeatLeading })} min={60} max={140} step={5} suffix="%" />
              </Field>
            </div>
            <Field label={state.repeatMode === 'diagonal' ? 'Color de la diagonal' : 'Color de la frase encendida'} plain>
              <Segmented<RepeatAccent>
                value={state.repeatAccent}
                onChange={(repeatAccent) => update({ repeatAccent })}
                options={(Object.keys(REPEAT_ACCENT_LABEL) as RepeatAccent[]).map((a) => ({ value: a, label: REPEAT_ACCENT_LABEL[a].toUpperCase() }))}
                size="sm"
              />
            </Field>
          </>
        )}

        {state.template === 'manifesto' && (
          <>
            <Field label="Subtítulo / autor" hint="opcional">
              <div className="flex gap-2">
                <TextInput value={state.manifestoAuthor} onChange={(manifestoAuthor) => update({ manifestoAuthor })} uppercase placeholder="Vacío = sin firma" />
                {state.manifestoAuthor !== DEFAULT_AUTHOR && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      update({ manifestoAuthor: DEFAULT_AUTHOR })
                    }}
                    className="shrink-0 rounded-md border border-line px-2 font-mono text-[9px] text-steel hover:text-cyan"
                  >
                    DEFAULT
                  </button>
                )}
              </div>
            </Field>
            <Field label="Estilo" plain>
              <Segmented<ManifestoStyle>
                value={state.manifestoStyle}
                onChange={(manifestoStyle) => update({ manifestoStyle })}
                options={[
                  { value: 'bar', label: '▌ BARRA NARANJA' },
                  { value: 'quotes', label: '« COMILLAS »' },
                ]}
                size="sm"
              />
            </Field>
          </>
        )}

        {state.template === 'statement' && (
          <Field label="Remate / sentencia" hint="barra naranja">
            <TextArea value={state.kicker} onChange={(kicker) => update({ kicker })} rows={2} />
          </Field>
        )}
      </Section>

      <Section
        index="03"
        title="Fondo"
        summary={(state.bgStyle ?? 'photo') !== 'photo' ? BG_STYLE_LABEL[state.bgStyle] : bgImage ? `Foto · capa ${state.bgOverlay}%` : 'Carbón sólido'}
        defaultOpen={Boolean(bgImage) || (state.bgStyle ?? 'photo') !== 'photo'}
      >
        {state.template !== 'athletic' && (
          <Field label="Tipo de fondo" plain>
            <Segmented<BgStyle>
              value={state.bgStyle ?? 'photo'}
              // B/N Atleta: la foto pasa a blanco y negro de alto contraste con velo oscuro.
              onChange={(bgStyle) => update(bgStyle === 'photo' ? { bgStyle, bgMono: true } : { bgStyle })}
              options={(Object.keys(BG_STYLE_LABEL) as BgStyle[]).map((value) => ({ value, label: BG_STYLE_LABEL[value] }))}
              size="sm"
            />
          </Field>
        )}
        {state.template !== 'athletic' && (state.bgStyle ?? 'photo') !== 'photo' && (
          <p className="-mt-1 font-mono text-[9px] leading-relaxed text-steel/60">
            Fondo táctico sin foto. La imagen subida se conserva y vuelve al elegir B/N ATLETA.
          </p>
        )}
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
        {bgImage && (state.bgStyle ?? 'photo') === 'photo' && (
          <>
            <Field label="Opacidad de capa táctica">
              <Range value={state.bgOverlay} onChange={(bgOverlay) => update({ bgOverlay })} min={30} max={90} suffix="%" />
            </Field>
            <Toggle label="[ Tratamiento táctico B/N ]" checked={state.bgMono} onChange={(bgMono) => update({ bgMono })} />
            <Toggle label="Gradiente de contraste" checked={state.bgGradient} onChange={(bgGradient) => update({ bgGradient })} />
            <Field label="🌑 Gradiente inferior / viñeta">
              <Range value={state.bgVignette ?? 0} onChange={(bgVignette) => update({ bgVignette })} min={0} max={100} step={5} suffix="%" />
            </Field>
            <Toggle label="Placa sólida flotante" checked={state.floatingPlate} onChange={(floatingPlate) => update({ floatingPlate })} />
            <div className="space-y-2 rounded-lg border border-line bg-surface-2/60 p-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-[0.12em] text-steel uppercase">Encuadre de la foto</span>
                <button
                  type="button"
                  onClick={() => update({ bgZoom: 100, bgX: 0, bgY: 0 })}
                  disabled={state.bgZoom === 100 && state.bgX === 0 && state.bgY === 0}
                  className="rounded border border-line px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-steel transition hover:border-cyan/50 hover:text-cyan disabled:opacity-40"
                >
                  ⌖ CENTRAR / RESET FONDO
                </button>
              </div>
              <Field label="Zoom / escala">
                <Range value={state.bgZoom} onChange={(bgZoom) => update({ bgZoom })} min={100} max={160} suffix="%" />
              </Field>
              <Field label="Posición vertical (Y)" hint="+ baja la foto">
                <Range value={state.bgY} onChange={(bgY) => update({ bgY })} min={-50} max={50} suffix="%" />
              </Field>
              <Field label="Posición horizontal (X)" hint="+ la corre a la derecha">
                <Range value={state.bgX} onChange={(bgX) => update({ bgX })} min={-50} max={50} suffix="%" />
              </Field>
              {state.bgZoom === 100 && (
                <p className="font-mono text-[9px] leading-relaxed text-steel/60">
                  Con zoom 100 % sólo se puede desplazar sobre el lado que sobra de la foto. Subí el zoom para ganar recorrido.
                </p>
              )}
            </div>
            {!bgPersisted && (
              <p className="font-mono text-[10px] text-gold/80">La foto es muy pesada para guardarse: se usa en esta sesión.</p>
            )}
          </>
        )}
      </Section>

      <Section index="05" title="Carrusel continuo" summary={[state.seamlessThread && 'Hilo', state.panoramaImageId && 'Panorámica'].filter(Boolean).join(' · ') || 'Placas sueltas'} defaultOpen={Boolean(state.seamlessThread || state.panoramaImageId)}>
        <SeamlessControls state={state} update={update} addImage={addImage} resolveImage={resolveImage} slideCount={slideCount} />
      </Section>

      <Section index="06" title="Historias 9:16" summary={state.aspect === 'story' ? `Sticker: ${STICKER_OPTIONS.find((o) => o.value === (state.storySticker ?? 'none'))?.label}` : 'Feed 4:5'} defaultOpen={state.aspect === 'story'}>
        <p className="font-mono text-[10px] leading-relaxed tracking-[0.06em] text-steel/80">
          {state.aspect === 'story'
            ? 'Zona reservada para el sticker de esta historia: el texto se reacomoda por encima y la zona queda marcada para pegarlo en Instagram.'
            : 'Con [ ⇅ REMIX 9:16 ] el carrusel entero pasa a historias con stickers asignados solos. [ ⬇ FEED + HISTORIAS ] exporta los dos formatos en un ZIP.'}
        </p>
        <Field label="Sticker de esta placa" plain>
          <Segmented<StickerKind> value={state.storySticker ?? 'none'} onChange={(storySticker) => update({ storySticker })} options={STICKER_OPTIONS} size="sm" />
        </Field>
        {(state.storySticker ?? 'none') !== 'none' && (
          <p className="font-mono text-[9px] leading-relaxed text-steel/60">▸ {STICKER_SPEC[state.storySticker as Exclude<StickerKind, 'none'>].hint}</p>
        )}
      </Section>

      {state.template !== 'manifesto' && state.template !== 'repeat' && (
        <Section index="04" title="Fuente científica" summary={state.citeMain} defaultOpen={false}>
          <div className="tc-scroll -mt-1 flex gap-1.5 overflow-x-auto pb-1">
            {CITATION_LIBRARY.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => update({ citeMain: c.main, citeSub: c.sub })}
                title={`${c.main} — ${c.sub}`}
                className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] tracking-wider whitespace-nowrap transition ${
                  state.citeMain === c.main ? 'border-cyan/60 bg-cyan/10 text-cyan' : 'border-line text-steel hover:text-white'
                }`}
              >
                [ {c.label} ]
              </button>
            ))}
          </div>
          <TextInput value={state.citeMain} onChange={(citeMain) => update({ citeMain })} uppercase placeholder="AUTOR Y COL., AÑO · REVISTA" />
          <TextInput value={state.citeSub} onChange={(citeSub) => update({ citeSub })} placeholder="Descripción del estudio" />
          <CitationSuggester {...ai} />
        </Section>
      )}

      <Section
        index="05"
        title="Estilo · Layout"
        summary={`${THEME_LABEL[state.theme]} · ${HEADLINE_FONTS[state.headlineFont].label} · ${state.headlineScale}% · ${ALIGN_LABEL[state.contentAlign]}`}
        defaultOpen={false}
      >
        <Field label="Tema" plain>
          <Segmented<ThemeId>
            value={state.theme}
            onChange={(theme) => update({ theme })}
            options={(Object.keys(THEME_LABEL) as ThemeId[]).map((t) => ({ value: t, label: `[ ${THEME_LABEL[t]} ]` }))}
            size="sm"
          />
        </Field>
        {state.theme === 'paper' && !PAPER_TEMPLATES.includes(state.template) && (
          <p className="font-mono text-[10px] leading-relaxed text-gold/80">
            Minimal Paper se aplica a 06 · Diagrama y 07 · Repetición. Las plantillas 01–05 se mantienen en Táctico Dark.
          </p>
        )}
        <Field label="Alineación vertical del cuerpo" plain>
          <Segmented<ContentAlign>
            value={state.contentAlign}
            onChange={(contentAlign) => update({ contentAlign })}
            options={(['auto', 'top', 'center', 'bottom'] as ContentAlign[]).map((a) => ({ value: a, label: `[ ${ALIGN_LABEL[a]} ]` }))}
            size="sm"
          />
        </Field>
        <Field label="Separación titular ↔ bloque" hint={state.contentGap === 100 ? 'base' : undefined}>
          <Range value={state.contentGap} onChange={(contentGap) => update({ contentGap })} min={30} max={250} step={5} suffix="%" />
        </Field>
        <Segmented<HeadlineFont>
          value={state.headlineFont}
          onChange={(headlineFont) => update({ headlineFont, typePreset: 'none' })}
          options={(Object.keys(HEADLINE_FONTS) as HeadlineFont[]).map((k) => ({ value: k, label: HEADLINE_FONTS[k].label }))}
          size="sm"
        />
        <Field label="Escala del titular">
          <Range value={state.headlineScale} onChange={(headlineScale) => update({ headlineScale })} min={60} max={140} step={2} suffix="%" />
        </Field>
        {state.nudge && Object.keys(state.nudge).length > 0 && (
          <button type="button" onClick={() => update({ nudge: undefined })} className="w-full rounded-md border border-line py-1.5 font-mono text-[10px] tracking-[0.12em] text-steel transition hover:border-cyan/50 hover:text-cyan">
            [ ⟲ RESTABLECER AJUSTES DEL LIENZO ]
          </button>
        )}
        {onCopyStyle && slideCount > 1 && (
          <button
            type="button"
            onClick={onCopyStyle}
            title="Replica tipografía, viñeta y paleta de acentos de esta placa en todas las del set"
            className="w-full rounded-md border border-cyan/50 bg-cyan/5 py-2 font-mono text-[10px] font-semibold tracking-[0.12em] text-cyan transition hover:bg-cyan/10"
          >
            [ 📋 COPIAR ESTILO A TODAS LAS PLACAS ]
          </button>
        )}
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
    case 'manifesto':
      return s.manifestoAuthor || 'Sin firma'
    case 'diagram':
      return `${s.diagramKind.toUpperCase()} · ${THEME_LABEL[s.theme]}`
    case 'repeat':
      return s.repeatPhrase
    case 'matrix':
    case 'pipeline':
    case 'pyramid':
    case 'checklist':
      return `${s.headlineA} ${s.headlineB}`.trim() || 'Estructura táctica'
    case 'bookmark':
      return s.bookmarkData ? `${s.bookmarkData.points.length} viñetas` : 'Viñetas automáticas del carrusel'
    case 'opus':
      return `${(s.opusBlocks ?? []).filter((b) => b.text.trim()).length} bloques numerados`
    case 'quote':
      return s.quoteAuthor ? `— ${s.quoteAuthor}` : 'Cita sin autor'
    case 'fix':
      return `✗ ${s.fixWrongLabel} · ✓ ${s.fixRightLabel}`
    case 'workout':
      return `${(s.workoutRows ?? []).filter((r) => r.name.trim()).length} ejercicios`
    case 'essay':
      return `${(s.essayParas ?? []).filter((p) => p.trim()).length} párrafos`
    case 'athletic':
      return `Nr. ${s.athleticNr || '—'} · ${(s.athleticRows ?? []).length} filas · ${s.athleticMode === 'table' ? 'tabla' : 'lista'}`
  }
}
