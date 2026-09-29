import type { CanvasPalette } from '../../../lib/theme'
import { DIAGRAM_ACCENT_HEX } from '../../../lib/theme'
import type { CanvasState } from '../../../types'
import { CirclesDiagram } from '../diagrams/CirclesDiagram'
import { CurveDiagram } from '../diagrams/CurveDiagram'
import { DominoDiagram } from '../diagrams/DominoDiagram'
import { RadarDiagram } from '../diagrams/RadarDiagram'
import { Paragraph } from '../Paragraph'

interface Props {
  state: CanvasState
  palette: CanvasPalette
  contentWidth: number
  scale: number
}

/** Plantilla 06 · Diagrama visual / conceptual (estilo mental models). */
export function DiagramTemplate({ state, palette, contentWidth, scale }: Props) {
  const isStory = state.aspect === 'story'
  const baseH = { radar: isStory ? 700 : 560, circles: isStory ? 460 : 360, domino: isStory ? 620 : 470, curve: isStory ? 660 : 480 }[
    state.diagramKind
  ]
  const style = {
    width: contentWidth,
    height: Math.round(baseH * scale),
    ink: palette.ink,
    muted: palette.muted,
    line: palette.line,
    accent: DIAGRAM_ACCENT_HEX[state.diagramAccent],
    bg: palette.bg,
    scale,
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {state.diagramKind === 'radar' && (
        <RadarDiagram {...style} axes={state.radarAxes} values={state.radarValues} compare={state.radarCompare} labelA={state.radarLabelA} labelB={state.radarLabelB} />
      )}
      {state.diagramKind === 'circles' && <CirclesDiagram {...style} divisions={state.circleDivisions} captions={state.circleCaptions} />}
      {state.diagramKind === 'domino' && <DominoDiagram {...style} count={state.dominoCount} start={state.dominoStart} end={state.dominoEnd} />}
      {state.diagramKind === 'curve' && <CurveDiagram {...style} expected={state.curveExpected} real={state.curveReal} goal={state.curveGoal} />}
      {state.body.trim() && (
        <div style={{ marginTop: 40 * scale }}>
          <Paragraph text={state.body} scale={scale} color={palette.muted} />
        </div>
      )}
    </div>
  )
}
