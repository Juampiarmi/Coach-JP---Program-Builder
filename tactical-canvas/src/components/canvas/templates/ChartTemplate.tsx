import type { CanvasState } from '../../../types'
import { TelemetryChart } from '../charts/TelemetryChart'
import { Paragraph } from '../Paragraph'

interface Props {
  state: CanvasState
  contentWidth: number
  fontFamily: string
  scale: number
}

export function ChartTemplate({ state, contentWidth, fontFamily, scale }: Props) {
  const isStory = state.aspect === 'story'
  const base = state.chart.mode === 'gauge' ? 0 : isStory ? 420 : 300
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <TelemetryChart chart={state.chart} width={contentWidth} height={Math.round(base * scale)} fontFamily={fontFamily} scale={scale} />
      <div style={{ marginTop: 44 * scale }}>
        <Paragraph text={state.body} scale={scale} />
      </div>
    </div>
  )
}
