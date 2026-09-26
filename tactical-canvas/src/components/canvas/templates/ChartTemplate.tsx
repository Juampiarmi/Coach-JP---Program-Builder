import type { CanvasState } from '../../../types'
import { TelemetryChart } from '../charts/TelemetryChart'
import { Paragraph } from '../Paragraph'

interface Props {
  state: CanvasState
  contentWidth: number
  scale: number
}

export function ChartTemplate({ state, contentWidth, scale }: Props) {
  const isStory = state.aspect === 'story'
  const chartHeight = Math.round((isStory ? 560 : state.chart.showMarker ? 300 : 330) * scale)
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <TelemetryChart chart={state.chart} width={contentWidth} height={chartHeight} scale={scale} />
      <div style={{ marginTop: 44 * scale }}>
        <Paragraph text={state.body} scale={scale} />
      </div>
    </div>
  )
}
