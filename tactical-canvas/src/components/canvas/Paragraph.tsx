import { BRAND, FONT_BODY } from '../../lib/brand'

export function Paragraph({ text, scale, size = 31, color = BRAND.gray }: { text: string; scale: number; size?: number; color?: string }) {
  if (!text.trim()) return null
  return (
    <p
      style={{
        margin: 0,
        fontFamily: FONT_BODY,
        fontSize: size * scale,
        lineHeight: 1.42,
        color,
        whiteSpace: 'pre-line',
        textWrap: 'pretty',
      }}
    >
      {text.trim()}
    </p>
  )
}
