import type { CanvasPalette } from '../../../lib/theme'
import { useAccent } from '../../../lib/accent'
import { DIAGRAM_ACCENT_HEX } from '../../../lib/theme'
import { resolveDiagramData } from '../../../lib/diagramPillar'
import type { CanvasState } from '../../../types'
import { CirclesDiagram } from '../diagrams/CirclesDiagram'
import { CurveDiagram } from '../diagrams/CurveDiagram'
import { DominoDiagram } from '../diagrams/DominoDiagram'
import { RadarDiagram } from '../diagrams/RadarDiagram'
import { FunnelDiagram } from '../diagrams/FunnelDiagram'
import { VersusDiagram } from '../diagrams/VersusDiagram'
import { Paragraph } from '../Paragraph'

interface Props {
  state: CanvasState
  palette: CanvasPalette
  contentWidth: number
  scale: number
}

/** Plantilla 06 · Diagrama visual / conceptual (estilo mental models). */
export function DiagramTemplate({ state, palette, contentWidth, scale }: Props) {
  const A = useAccent()
  const isStory = state.aspect === 'story'
  const baseH = { radar: isStory ? 860 : 700, circles: isStory ? 520 : 420, domino: isStory ? 620 : 470, curve: isStory ? 660 : 480, funnel: isStory ? 760 : 560, versus: 0 }[
    state.diagramKind
  ]
  // Sólo datos de la placa (IA o editados); si nunca se cargaron, los del pilar del tema.
  const data = resolveDiagramData(state)
  const style = {
    width: contentWidth,
    height: Math.round(baseH * scale),
    ink: palette.ink,
    muted: palette.muted,
    line: palette.line,
    accent: A.hex(DIAGRAM_ACCENT_HEX[state.diagramAccent]),
    bg: palette.bg,
    scale,
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {state.diagramKind === 'radar' && (
        <RadarDiagram {...style} axes={data.radar.axes} values={data.radar.values} compare={data.radar.compare} labelA={data.radar.labelA} labelB={data.radar.labelB} />
      )}
      {state.diagramKind === 'circles' && <CirclesDiagram {...style} divisions={data.circles.divisions} captions={data.circles.captions} />}
      {state.diagramKind === 'domino' && <DominoDiagram {...style} count={data.domino.count} start={data.domino.start} end={data.domino.end} labels={data.domino.labels ?? ''} />}
      {state.diagramKind === 'funnel' && data.funnel && <FunnelDiagram {...style} levels={data.funnel.levels} />}
      {state.diagramKind === 'versus' && data.versus && <VersusDiagram {...style} {...data.versus} />}
      {state.diagramKind === 'curve' && <CurveDiagram {...style} expected={data.trajectory.noise} real={data.trajectory.clarity} goal={data.trajectory.goal} />}
      {state.body.trim() && (
        <div style={{ marginTop: 40 * scale }}>
          <Paragraph text={state.body} scale={scale} color={palette.muted} />
        </div>
      )}
    </div>
  )
}
