import { useRef, useState } from 'react'
import { CHART_PRESETS, SAMPLES } from '../../defaults'
import { DEFAULT_AUTHOR, HEADLINE_FONTS, MANIFESTO_TAGS, TAG_PRESETS } from '../../lib/brand'
import { loadBackground } from '../../lib/image'
import type { Accent, CanvasState, ContentAlign, DiagramAccent, DiagramKind, RepeatAccent, ThemeId, ChartConfig, ChartMode, CompareCard, CurveShape, HeadlineFont, ManifestoStyle, TemplateId } from '../../types'
import { DIAGRAM_ACCENT_HEX, DIAGRAM_ACCENT_LABEL, PAPER_TEMPLATES, REPEAT_ACCENT_LABEL, THEME_LABEL } from '../../lib/theme'
import { AccentPicker, Field, NumberInput, Range, Section, Segmented, TextArea, TextInput, Toggle } from './primitives'

export const TEMPLATES: { id: TemplateId; n: string; label: string }[] = [
  { id: 'metric', n: '01', label: 'Métrica' },
  { id: 'compare', n: '02', label: 'A/B' },
  { id: 'chart', n: '03', label: 'Gráfico' },
  { id: 'statement', n: '04', label: 'Sentencia' },
  { id: 'manifesto', n: '05', label: 'Manifiesto' },
  { id: 'diagram', n: '06', label: 'Diagrama' },
  { id: 'repeat', n: '07', label: 'Repetición' },
]

const DIAGRAM_KINDS: { value: DiagramKind; label: string }[] = [
  { value: 'radar', label: 'RADAR' },
  { value: 'circles', label: 'CÍRCULOS' },
  { value: 'domino', label: 'DOMINÓ' },
  { value: 'curve', label: 'CURVA' },
]

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
                <span className="block truncate text-[11px] leading-tight font-semibold">{t.label}</span>
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
        ) : (
        <>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Titular · blanco">
            <TextArea value={state.headlineA} onChange={(headlineA) => update({ headlineA })} rows={2} />
          </Field>
          <div>
            <div className="mb-1 flex items-baseline justify-between gap-1">
              <span className="font-mono text-[10px] tracking-[0.12em] text-steel uppercase">Remate · naranja</span>
              <button
                type="button"
                onClick={() => update({ headlineA: state.headlineB, headlineB: state.headlineA })}
                title="Intercambia el texto del titular (blanco) y del remate (naranja)"
                className="rounded border border-line bg-surface px-1 py-px font-mono text-[9px] tracking-wider text-steel transition hover:border-cyan/50 hover:text-cyan"
              >
                ⇄ INVERTIR
              </button>
            </div>
            <TextArea value={state.headlineB} onChange={(headlineB) => update({ headlineB })} rows={2} />
          </div>
        </div>
        </>
        )}
        {state.template === 'repeat' ? null : state.template === 'manifesto' ? (
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
                <Field label="Ejes (3 a 8)" hint="separados por coma">
                  <TextInput value={state.radarAxes} onChange={(radarAxes) => update({ radarAxes })} />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Valores 0–100">
                    <TextInput value={state.radarValues} onChange={(radarValues) => update({ radarValues })} placeholder="45, 70, 85…" />
                  </Field>
                  <Field label="Leyenda">
                    <TextInput value={state.radarLabelA} onChange={(radarLabelA) => update({ radarLabelA })} />
                  </Field>
                  <Field label="Comparación" hint="opcional">
                    <TextInput value={state.radarCompare} onChange={(radarCompare) => update({ radarCompare })} placeholder="80, 80, 75…" />
                  </Field>
                  <Field label="Leyenda comparación">
                    <TextInput value={state.radarLabelB} onChange={(radarLabelB) => update({ radarLabelB })} />
                  </Field>
                </div>
              </>
            )}
            {state.diagramKind === 'circles' && (
              <>
                <Field label="Divisiones por círculo" hint="el último se repite con 1 parte destacada">
                  <TextInput value={state.circleDivisions} onChange={(circleDivisions) => update({ circleDivisions })} placeholder="1, 3, 12" />
                </Field>
                <Field label="Textos breves" hint="uno por línea">
                  <TextArea value={state.circleCaptions} onChange={(circleCaptions) => update({ circleCaptions })} rows={4} />
                </Field>
              </>
            )}
            {state.diagramKind === 'domino' && (
              <>
                <Field label="Cantidad de fichas">
                  <Range value={state.dominoCount} onChange={(dominoCount) => update({ dominoCount })} min={4} max={9} />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Inicio">
                    <TextInput value={state.dominoStart} onChange={(dominoStart) => update({ dominoStart })} />
                  </Field>
                  <Field label="Final">
                    <TextInput value={state.dominoEnd} onChange={(dominoEnd) => update({ dominoEnd })} />
                  </Field>
                </div>
              </>
            )}
            {state.diagramKind === 'curve' && (
              <div className="grid grid-cols-3 gap-2">
                <Field label="Recta">
                  <TextInput value={state.curveExpected} onChange={(curveExpected) => update({ curveExpected })} />
                </Field>
                <Field label="Camino real">
                  <TextInput value={state.curveReal} onChange={(curveReal) => update({ curveReal })} />
                </Field>
                <Field label="Bandera">
                  <TextInput value={state.curveGoal} onChange={(curveGoal) => update({ curveGoal })} />
                </Field>
              </div>
            )}
          </>
        )}

        {state.template === 'repeat' && (
          <>
            <Field label="Frase" hint={`${state.repeatPhrase.trim().split(/\s+/).filter(Boolean).length} palabras = renglones`}>
              <TextArea value={state.repeatPhrase} onChange={(repeatPhrase) => update({ repeatPhrase })} rows={3} />
            </Field>
            <Field label="Color de la diagonal" plain>
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
            <Toggle label="[ Tratamiento táctico B/N ]" checked={state.bgMono} onChange={(bgMono) => update({ bgMono })} />
            <Toggle label="Gradiente de contraste" checked={state.bgGradient} onChange={(bgGradient) => update({ bgGradient })} />
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
    case 'manifesto':
      return s.manifestoAuthor || 'Sin firma'
    case 'diagram':
      return `${s.diagramKind.toUpperCase()} · ${THEME_LABEL[s.theme]}`
    case 'repeat':
      return s.repeatPhrase
  }
}
