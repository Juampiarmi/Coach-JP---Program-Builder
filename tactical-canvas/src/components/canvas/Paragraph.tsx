import { BRAND, FONT_BODY } from '../../lib/brand'

export function Paragraph({ text, scale, size = 31 }: { text: string; scale: number; size?: number }) {
  if (!text.trim()) return null
  return (
    <p
      style={{
        margin: 0,
        fontFamily: FONT_BODY,
        fontSize: size * scale,
        lineHeight: 1.42,
        color: BRAND.gray,
        whiteSpace: 'pre-line',
        textWrap: 'pretty',
      }}
    >
      {text.trim()}
    </p>
  )
}
