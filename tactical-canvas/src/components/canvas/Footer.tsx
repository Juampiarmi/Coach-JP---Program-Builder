import { BRAND, FONT_BODY, FONT_MONO } from '../../lib/brand'
import { ShieldLogo } from '../ShieldLogo'

interface Props {
  citeMain: string
  citeSub: string
  scale: number
}

/** Cita bibliográfica + firma de marca. */
export function Footer({ citeMain, citeSub, scale }: Props) {
  const main = citeMain.trim()
  const sub = citeSub.trim()
  return (
    <footer style={{ marginTop: 'auto', paddingTop: 44 * scale, flexShrink: 0 }}>
      <div style={{ height: 2, background: BRAND.border }} />
      {(main || sub) && (
        <div style={{ marginTop: 30 * scale, fontFamily: FONT_MONO, textTransform: 'uppercase' }}>
          {main && (
            <p style={{ margin: 0, fontSize: 21 * scale, letterSpacing: '0.06em', color: BRAND.gray, lineHeight: 1.35 }}>
              [ {main} ]
            </p>
          )}
          {sub && (
            <p
              style={{
                margin: `${8 * scale}px 0 0`,
                fontSize: 17 * scale,
                letterSpacing: '0.06em',
                color: BRAND.gray,
                opacity: 0.62,
                lineHeight: 1.35,
              }}
            >
              {sub}
            </p>
          )}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 * scale, marginTop: 30 * scale }}>
        <ShieldLogo size={62 * scale} />
        <div>
          <p
            style={{
              margin: 0,
              fontFamily: FONT_BODY,
              fontWeight: 800,
              fontSize: 30 * scale,
              letterSpacing: '-0.01em',
              color: BRAND.white,
              lineHeight: 1.1,
            }}
          >
            COACH <span style={{ color: BRAND.orange }}>JP</span>
          </p>
          <p style={{ margin: `${6 * scale}px 0 0`, fontFamily: FONT_MONO, fontSize: 19 * scale, color: BRAND.gray }}>
            @coachjp.training
          </p>
        </div>
      </div>
    </footer>
  )
}
