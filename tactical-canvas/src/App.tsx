import { useCallback, useRef, useState } from 'react'
import { BrandBar } from './components/BrandBar'
import { ControlPanel } from './components/controls/ControlPanel'
import { Segmented } from './components/controls/primitives'
import { ExportButtons } from './components/ExportButtons'
import { Preview } from './components/Preview'
import { DEFAULT_STATE } from './defaults'
import { useMediaQuery } from './hooks/useMediaQuery'
import { usePersistentState } from './hooks/usePersistentState'
import type { AspectId, CanvasState } from './types'

const STORAGE_KEY = 'jp-tactical-canvas:v1'

export default function App() {
  const [state, setState] = usePersistentState<CanvasState>(STORAGE_KEY, DEFAULT_STATE)
  const canvasRef = useRef<HTMLDivElement>(null)
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const update = useCallback((patch: Partial<CanvasState>) => setState((s) => ({ ...s, ...patch })), [setState])
  const reset = useCallback(() => setState(DEFAULT_STATE), [setState])

  const aspectToggle = (
    <Segmented<AspectId>
      value={state.aspect}
      onChange={(aspect) => update({ aspect })}
      options={[
        { value: 'feed', label: isDesktop ? '4:5 FEED' : '4:5' },
        { value: 'story', label: isDesktop ? '9:16 STORY' : '9:16' },
      ]}
      size="sm"
    />
  )

  if (isDesktop) {
    return (
      <div className="flex h-dvh overflow-hidden">
        <aside className="flex w-[420px] shrink-0 flex-col border-r border-line bg-surface/40">
          <div className="border-b border-line px-5 py-4">
            <BrandBar />
          </div>
          <div className="tc-scroll flex-1 overflow-y-auto">
            <ControlPanel state={state} update={update} onReset={reset} />
          </div>
        </aside>
        <main className="tc-grid-bg flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-line bg-carbon/80 px-6 py-3 backdrop-blur">
            <p className="font-mono text-[11px] tracking-[0.2em] text-steel">
              [ LIVE CANVAS · <span className="text-cyan">EXPORT 3X</span> ]
            </p>
            <div className="w-64">{aspectToggle}</div>
          </div>
          <div className="min-h-0 flex-1 p-6">
            <Preview state={state} canvasRef={canvasRef} gutter={16} />
          </div>
          <div className="mx-auto w-full max-w-xl px-6 pb-6">
            <ExportButtons target={canvasRef} state={state} />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden pt-[env(safe-area-inset-top)]">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <BrandBar />
        <div className="w-32 shrink-0">{aspectToggle}</div>
      </header>

      <main className="tc-grid-bg min-h-0 flex-1 px-4 pt-3 pb-6">
        <Preview state={state} canvasRef={canvasRef} gutter={4} />
      </main>

      <section
        className={`flex shrink-0 flex-col border-t border-line bg-carbon transition-[height] duration-300 ease-out ${
          drawerOpen ? 'h-[58dvh]' : 'h-auto'
        }`}
      >
        <button
          type="button"
          onClick={() => setDrawerOpen((o) => !o)}
          aria-expanded={drawerOpen}
          className="flex items-center justify-between px-4 py-3 font-mono text-[11px] font-semibold tracking-[0.18em] text-cyan"
        >
          <span>[ {drawerOpen ? 'CERRAR PANEL' : 'EDITAR PLACA'} ]</span>
          <svg
            viewBox="0 0 24 24"
            className={`size-4 transition-transform ${drawerOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="m6 15 6-6 6 6" />
          </svg>
        </button>
        {drawerOpen && (
          <div className="tc-scroll min-h-0 flex-1 overflow-y-auto border-t border-line">
            <ControlPanel state={state} update={update} onReset={reset} />
          </div>
        )}
        <div className="border-t border-line px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <ExportButtons target={canvasRef} state={state} compact />
        </div>
      </section>
    </div>
  )
}
