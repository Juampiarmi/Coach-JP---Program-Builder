import { BRAND, FONT_BODY, FONT_BRAND, FONT_MONO } from '../../../lib/brand'
import { useAccent } from '../../../lib/accent'
import type { CanvasPalette } from '../../../lib/theme'
import type { CanvasState } from '../../../types'

interface Props {
  state: CanvasState
  palette: CanvasPalette
  contentWidth: number
  scale: number
}

const CASE_ORANGE = '#F97316'

/**
 * Plantilla 20 · Caso de Atleta / ficha de rendimiento, en 3 bloques tácticos:
 * badge «[ ATLETA // NOMBRE · DISCIPLINA ]», columna 1 «DIAGNÓSTICO / LIMITANTE INICIAL» y columna 2
 * «PROTOCOLO APLICADO & RESULTADO», con el resultado medido destacado en naranja.
 * En Historias 9:16 las columnas se apilan.
 */
export function CaseTemplate({ state, palette, contentWidth, scale: s }: Props) {
  const A = useAccent()
  const orange = A.swap ? BRAND.cyan : CASE_ORANGE
  const stack = state.aspect === 'story'
  const gap = 22 * s
  const colW = stack ? contentWidth : (contentWidth - gap) / 2
  const athlete = (state.caseAthlete ?? '').trim()
  const discipline = (state.caseDiscipline ?? '').trim()
  const result = (state.caseResult ?? '').trim()
  const label = (text: string, color: string) => (
    <p style={{ margin: 0, fontFamily: FONT_MONO, fontWeight: 600, fontSize: 19 * s, letterSpacing: '0.16em', textTransform: 'uppercase', color }}>
      [ {text} ]
    </p>
  )
  const col = (head: string, headColor: string, children: React.ReactNode, accent: boolean) => (
    <div
      style={{
        width: colW,
        boxSizing: 'border-box',
        background: 'rgba(13,17,23,0.82)',
        border: `${Math.max(1.5, 2 * s)}px solid ${accent ? orange : palette.line}`,
        borderTop: `${Math.max(4, 6 * s)}px solid ${accent ? orange : '#64748B'}`,
        borderRadius: 12 * s,
        padding: `${22 * s}px ${24 * s}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: 16 * s,
      }}
    >
      {label(head, headColor)}
      {children}
    </div>
  )
  return (
    <div data-part="case" style={{ width: contentWidth, display: 'flex', flexDirection: 'column', gap: 26 * s, textShadow: 'none' }}>
      {(athlete || discipline) && (
        <div
          data-part="case-badge"
          style={{
            alignSelf: 'flex-start',
            fontFamily: FONT_MONO,
            fontWeight: 600,
            fontSize: 24 * s,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: palette.ink,
            border: `${Math.max(1.5, 2 * s)}px solid ${orange}`,
            borderRadius: 6 * s,
            padding: `${10 * s}px ${18 * s}px`,
          }}
        >
          <span style={{ color: orange }}>[</span> ATLETA <span style={{ color: orange }}>//</span> {athlete}
          {athlete && discipline ? ' · ' : ''}
          {discipline} <span style={{ color: orange }}>]</span>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: stack ? 'column' : 'row', gap, alignItems: 'stretch' }}>
        {col(
          'Diagnóstico / limitante inicial',
          '#94A3B8',
          <p data-part="case-limit" style={{ margin: 0, fontFamily: FONT_BODY, fontWeight: 500, fontSize: 28 * s, lineHeight: 1.38, color: palette.ink }}>
            {state.caseLimit}
          </p>,
          false,
        )}
        {col(
          'Protocolo aplicado & resultado',
          orange,
          <>
            <p data-part="case-protocol" style={{ margin: 0, fontFamily: FONT_BODY, fontWeight: 500, fontSize: 28 * s, lineHeight: 1.38, color: palette.ink }}>
              {state.caseProtocol}
            </p>
            {result && (
              <div data-part="case-result" style={{ marginTop: 'auto', borderLeft: `${Math.max(3, 5 * s)}px solid ${orange}`, paddingLeft: 16 * s }}>
                <p style={{ margin: `0 0 ${6 * s}px`, fontFamily: FONT_MONO, fontWeight: 600, fontSize: 17 * s, letterSpacing: '0.16em', color: orange }}>RESULTADO</p>
                <p style={{ margin: 0, fontFamily: FONT_BRAND, fontWeight: 700, fontSize: 30 * s, lineHeight: 1.2, color: palette.ink, textTransform: 'uppercase' }}>{result}</p>
              </div>
            )}
          </>,
          true,
        )}
      </div>
    </div>
  )
}
