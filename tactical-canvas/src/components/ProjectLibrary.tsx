import { useEffect, useRef, useState } from 'react'
import { relativeTime, suggestName, type Project, type SavedDeck } from '../lib/projects'
import { engagementRate, parseMetrics, summarize, type Bucket, type PostMetrics } from '../lib/performance'

interface Actions {
  saveAs: (name: string) => void
  open: (id: string) => void
  newSet: () => void
  duplicate: (id: string) => void
  rename: (id: string, name: string) => void
  remove: (id: string) => void
  exportAll: () => Promise<void>
  importFile: (file: File) => Promise<number>
  setMetrics: (id: string, metrics: PostMetrics | null) => void
}

interface Props {
  projects: Project[]
  currentId: string | null
  /** Set en pantalla (para sugerir el nombre al guardar) */
  current: SavedDeck
  /** Si el set actual ya está guardado (proyecto o día del plan), no se ofrece «guardar como» destacado */
  currentSaved: boolean
  initialMode: 'browse' | 'save'
  actions: Actions
  /** El navegador se quedó sin espacio al guardar la biblioteca */
  storageFull: boolean
  /** Fotos del banco (viajan en el respaldo aunque no haya proyectos) */
  photoCount?: number
  onClose: () => void
}

const TEMPLATE_ICON: Record<string, string> = { quote: '❝', athletic: '▤', workout: '▦', fix: '✓✗', myth: '✘', service: '◆', case: '◎', essay: '¶', opus: '00', bookmark: '▮' }

/** Biblioteca de proyectos guardados: grilla con miniatura, búsqueda y acciones por proyecto. */
export function ProjectLibrary({ projects, currentId, current, currentSaved, initialMode, actions, storageFull, photoCount = 0, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(initialMode === 'save')
  const [name, setName] = useState(suggestName(current))
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null)
  const [note, setNote] = useState('')
  const [metricsFor, setMetricsFor] = useState<string | null>(null)
  const [insights, setInsights] = useState(false)
  const summary = summarize(projects)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const q = query.trim().toLowerCase()
  const list = projects
    .filter((p) => !q || p.name.toLowerCase().includes(q) || p.deck.slides.some((s) => `${s.headlineA} ${s.headlineB} ${s.tag}`.toLowerCase().includes(q)))
    .sort((a, b) => Number(Boolean(b.draft)) - Number(Boolean(a.draft)) || b.updatedAt - a.updatedAt)
  const sizeKB = Math.round(JSON.stringify(projects).length / 1024)

  const save = () => {
    actions.saveAs(name)
    setSaving(false)
    setNote(`✓ Guardado como «${name.trim() || suggestName(current)}». Desde ahora cada cambio se guarda solo.`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Biblioteca de proyectos"
        className="flex max-h-[88dvh] w-full max-w-3xl flex-col rounded-2xl border border-line bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="font-mono text-[12px] font-semibold tracking-[0.18em] text-cyan">[ 📁 BIBLIOTECA DE PROYECTOS ]</h2>
            <p className="mt-0.5 font-mono text-[9px] tracking-wider text-steel/70">
              {projects.filter((p) => !p.draft).length} proyectos · {sizeKB} KB · el proyecto abierto se guarda solo
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-md border border-line px-2.5 py-1 font-mono text-[11px] text-steel hover:text-white">
            ✕
          </button>
        </div>

        <div className="space-y-2 border-b border-line px-5 py-3">
          {storageFull && (
            <p className="rounded-md border border-fire/60 bg-fire/10 px-3 py-2 font-mono text-[10px] leading-relaxed text-fire">
              ⚠ El navegador se quedó sin espacio y los últimos cambios de la biblioteca no se guardaron. Exportá un respaldo y borrá proyectos que no uses.
            </p>
          )}
          {saving ? (
            <div className="flex gap-2">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') save()
                  if (e.key === 'Escape') {
                    e.stopPropagation()
                    setSaving(false)
                  }
                }}
                placeholder="Nombre del proyecto (ej: Rugby pretemporada)"
                className="tc-input min-w-0 flex-1 text-[13px]"
              />
              <button type="button" onClick={save} className="shrink-0 rounded-lg bg-fire px-3 font-mono text-[10px] font-bold tracking-[0.1em] text-carbon">
                GUARDAR
              </button>
              <button type="button" onClick={() => setSaving(false)} className="shrink-0 rounded-lg border border-line px-3 font-mono text-[10px] text-steel">
                CANCELAR
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar proyecto o titular…" className="tc-input min-w-[180px] flex-1 text-[13px]" />
              <button
                type="button"
                onClick={() => {
                  setName(suggestName(current))
                  setSaving(true)
                }}
                className={`shrink-0 rounded-lg px-3 py-2 font-mono text-[10px] font-semibold tracking-[0.1em] ${currentSaved ? 'border border-line text-steel hover:text-white' : 'bg-fire font-bold text-carbon'}`}
              >
                💾 {currentSaved ? 'GUARDAR COPIA COMO…' : 'GUARDAR SET ACTUAL'}
              </button>
              <button type="button" onClick={actions.newSet} className="shrink-0 rounded-lg border border-line px-3 py-2 font-mono text-[10px] tracking-[0.1em] text-steel hover:text-white">
                + SET NUEVO
              </button>
            </div>
          )}
          {note && <p className={`font-mono text-[10px] ${note.startsWith('✓') ? 'text-cyan' : 'text-fire'}`}>{note}</p>}
          {summary.posts > 0 && (
            <div className="rounded-lg border border-line bg-surface-2/50" data-testid="performance">
              <button type="button" onClick={() => setInsights((v) => !v)} aria-expanded={insights} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left">
                <span className="font-mono text-[10px] font-semibold tracking-[0.12em] text-cyan">
                  📊 QUÉ RINDE MEJOR · {summary.posts} {summary.posts === 1 ? 'POST MEDIDO' : 'POSTS MEDIDOS'} · PROMEDIO {summary.avgRate} %
                </span>
                <span className="font-mono text-[10px] text-steel">{insights ? '▲' : '▼'}</span>
              </button>
              {insights && (
                <div className="grid gap-3 border-t border-line px-3 py-2.5 sm:grid-cols-3">
                  <Ranking title="Formato" rows={summary.byFormat} best={summary.avgRate} />
                  <Ranking title="Portada" rows={summary.byCover} best={summary.avgRate} />
                  <Ranking title="Pilar" rows={summary.byPillar} best={summary.avgRate} />
                  <div className="sm:col-span-3">
                    <p className="font-mono text-[9px] tracking-[0.12em] text-steel uppercase">Mejores portadas</p>
                    {summary.top.map((m) => (
                      <p key={m.project.id} className="truncate text-[11px] text-white/90">
                        <b className="text-cyan">{m.rate} %</b> · {m.features.hook}
                      </p>
                    ))}
                    <p className="mt-1 font-mono text-[9px] leading-relaxed text-steel/60">Tasa = (guardados + compartidos) / alcance × 100. Con 3+ posts medidos, el Hook Score usa este historial.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="tc-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {list.length === 0 ? (
            <p className="py-10 text-center font-mono text-[11px] leading-relaxed text-steel/70">
              {projects.length ? 'Ningún proyecto coincide con la búsqueda.' : 'Todavía no guardaste proyectos. Armá un set y tocá «💾 GUARDAR SET ACTUAL»: queda acá y cada cambio se guarda solo.'}
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {list.map((p) => {
                const isCurrent = p.id === currentId
                const first = p.deck.slides[0]
                return (
                  <li key={p.id} data-project={p.name} className={`flex flex-col overflow-hidden rounded-xl border ${isCurrent ? 'border-cyan/70' : p.draft ? 'border-gold/50' : 'border-line'} bg-surface-2/60`}>
                    <button type="button" onClick={() => actions.open(p.id)} title={`Abrir «${p.name}»`} className="group relative block aspect-[4/5] w-full overflow-hidden bg-carbon">
                      {p.thumb ? (
                        <img src={p.thumb} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
                      ) : (
                        <span className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center">
                          <span className="font-mono text-[22px] text-fire/80">{TEMPLATE_ICON[first?.template ?? ''] ?? '▣'}</span>
                          <span className="line-clamp-3 text-[11px] leading-snug font-semibold text-white/80">{`${first?.headlineA ?? ''} ${first?.headlineB ?? ''}`.replace(/\*/g, '')}</span>
                        </span>
                      )}
                      {isCurrent && <span className="absolute top-1.5 left-1.5 rounded bg-cyan px-1.5 font-mono text-[8px] font-bold tracking-wider text-carbon">ABIERTO</span>}
                      {p.draft && <span className="absolute top-1.5 left-1.5 rounded bg-gold px-1.5 font-mono text-[8px] font-bold tracking-wider text-carbon">BORRADOR AUTO</span>}
                    </button>
                    <div className="flex flex-1 flex-col gap-1.5 p-2.5">
                      {renaming?.id === p.id ? (
                        <input
                          autoFocus
                          value={renaming.name}
                          onChange={(e) => setRenaming({ id: p.id, name: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              actions.rename(p.id, renaming.name)
                              setRenaming(null)
                            }
                            if (e.key === 'Escape') {
                              e.stopPropagation()
                              setRenaming(null)
                            }
                          }}
                          onBlur={() => {
                            actions.rename(p.id, renaming.name)
                            setRenaming(null)
                          }}
                          className="tc-input py-1 text-[12px]"
                        />
                      ) : (
                        <p className="truncate text-[12px] font-semibold text-white" title={p.name}>
                          {p.name}
                        </p>
                      )}
                      <p className="font-mono text-[9px] tracking-wide text-steel/70">
                        {p.deck.slides.length} {p.deck.slides.length === 1 ? 'placa' : 'placas'} · {relativeTime(p.updatedAt)}
                      </p>
                      {!p.draft &&
                        (metricsFor === p.id ? (
                          <MetricsForm
                            initial={p.metrics}
                            onSave={(m) => {
                              actions.setMetrics(p.id, m)
                              setMetricsFor(null)
                              setNote(m ? `✓ Métricas de «${p.name}»: ${engagementRate(m)} % de guardados + compartidos.` : `✓ Métricas de «${p.name}» borradas.`)
                            }}
                            onCancel={() => setMetricsFor(null)}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setMetricsFor(p.id)}
                            className={`rounded border px-1.5 py-1 text-left font-mono text-[9px] tracking-wider ${p.metrics ? 'border-cyan/40 text-cyan' : 'border-dashed border-line text-steel hover:text-white'}`}
                            title="Guardados, compartidos y alcance de Instagram"
                          >
                            {p.metrics ? `📊 ${engagementRate(p.metrics)} % · ${p.metrics.saves} G · ${p.metrics.shares} C · ${fmtReach(p.metrics.reach)} alc.` : '📊 CARGAR MÉTRICAS'}
                          </button>
                        ))}
                      <div className="mt-auto flex flex-wrap gap-1">
                        <button type="button" onClick={() => actions.open(p.id)} className="rounded border border-cyan/50 px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wider text-cyan hover:bg-cyan/10">
                          ABRIR
                        </button>
                        <button type="button" onClick={() => setRenaming({ id: p.id, name: p.draft ? suggestName(p.deck) : p.name })} className="rounded border border-line px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-steel hover:text-white" title={p.draft ? 'Ponerle nombre lo guarda como proyecto' : 'Renombrar'}>
                          {p.draft ? 'GUARDAR' : 'RENOMBRAR'}
                        </button>
                        <button type="button" onClick={() => actions.duplicate(p.id)} className="rounded border border-line px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-steel hover:text-white">
                          DUPLICAR
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`¿Borrar «${p.name}»? No se puede deshacer (exportá un respaldo antes si lo necesitás).`)) actions.remove(p.id)
                          }}
                          aria-label={`Borrar ${p.name}`}
                          className="rounded border border-line px-1.5 py-0.5 font-mono text-[9px] text-steel hover:border-fire/60 hover:text-fire"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3">
          <p className="font-mono text-[9px] leading-relaxed text-steel/60">Los proyectos viven en este navegador. El respaldo .json incluye las fotos, las métricas y el banco de fotos.</p>
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (!f) return
                try {
                  const n = await actions.importFile(f)
                  setNote(`✓ ${n} ${n === 1 ? 'proyecto importado' : 'proyectos importados'}.`)
                } catch (err) {
                  setNote(err instanceof Error ? err.message : 'No se pudo importar el respaldo.')
                }
              }}
            />
            <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg border border-line px-3 py-1.5 font-mono text-[10px] tracking-[0.1em] text-steel hover:text-white">
              ⬆ IMPORTAR
            </button>
            <button
              type="button"
              disabled={!projects.length && !photoCount}
              onClick={async () => {
                await actions.exportAll()
                setNote('✓ Respaldo descargado (proyectos, métricas y banco de fotos).')
              }}
              className="rounded-lg border border-cyan/50 px-3 py-1.5 font-mono text-[10px] tracking-[0.1em] text-cyan hover:bg-cyan/10 disabled:opacity-40"
            >
              ⬇ EXPORTAR RESPALDO
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const fmtReach = (n: number) => (n >= 10000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')}k` : String(n))

/** Ranking de una dimensión (formato, portada o pilar) contra el promedio. */
function Ranking({ title, rows, best }: { title: string; rows: Bucket[]; best: number }) {
  return (
    <div>
      <p className="font-mono text-[9px] tracking-[0.12em] text-steel uppercase">{title}</p>
      {rows.slice(0, 4).map((r, i) => (
        <p key={r.key} className="flex justify-between gap-2 text-[11px]">
          <span className={`truncate ${i === 0 ? 'font-semibold text-white' : 'text-white/75'}`}>
            {i === 0 && rows.length > 1 ? '★ ' : ''}
            {r.label}
          </span>
          <span className={`shrink-0 font-mono ${r.rate >= best ? 'text-cyan' : 'text-steel'}`}>
            {r.rate} % · {r.posts}
          </span>
        </p>
      ))}
    </div>
  )
}

/** Carga rápida de las 3 métricas de Instagram (acepta «3,2k» en el alcance). */
function MetricsForm({ initial, onSave, onCancel }: { initial?: PostMetrics; onSave: (m: PostMetrics | null) => void; onCancel: () => void }) {
  const [raw, setRaw] = useState({ saves: initial ? String(initial.saves) : '', shares: initial ? String(initial.shares) : '', reach: initial ? String(initial.reach) : '' })
  const parsed = parseMetrics(raw)
  const field = (k: keyof typeof raw, label: string) => (
    <label className="block min-w-0">
      <span className="font-mono text-[8px] tracking-wider text-steel uppercase">{label}</span>
      <input
        inputMode="numeric"
        value={raw[k]}
        aria-label={label}
        onChange={(e) => setRaw((r) => ({ ...r, [k]: e.target.value }))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && parsed) onSave(parsed)
          if (e.key === 'Escape') {
            e.stopPropagation()
            onCancel()
          }
        }}
        className="tc-input px-1.5 py-1 text-[12px] tabular-nums"
      />
    </label>
  )
  return (
    <div className="space-y-1.5 rounded border border-cyan/40 p-1.5" data-testid="metrics-form">
      <div className="grid grid-cols-3 gap-1">
        {field('saves', 'Guardados')}
        {field('shares', 'Compartidos')}
        {field('reach', 'Alcance')}
      </div>
      <p className="font-mono text-[9px] text-steel">{parsed ? `= ${engagementRate(parsed)} % guardados + compartidos` : 'Alcance > 0 (acepta 3,2k)'}</p>
      <div className="flex gap-1">
        <button type="button" disabled={!parsed} onClick={() => parsed && onSave(parsed)} className="rounded bg-cyan px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider text-carbon disabled:opacity-40">
          GUARDAR
        </button>
        <button type="button" onClick={onCancel} className="rounded border border-line px-2 py-0.5 font-mono text-[9px] text-steel">
          CANCELAR
        </button>
        {initial && (
          <button type="button" onClick={() => onSave(null)} className="ml-auto rounded border border-line px-2 py-0.5 font-mono text-[9px] text-steel hover:text-fire">
            BORRAR
          </button>
        )}
      </div>
    </div>
  )
}
