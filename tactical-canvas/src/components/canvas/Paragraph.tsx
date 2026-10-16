import { BRAND, FONT_BODY } from '../../lib/brand'

export function Paragraph({ text, scale, size = 31, color = BRAND.gray, leading = 1.42 }: { text: string; scale: number; size?: number; color?: string; leading?: number }) {
  if (!text.trim()) return null
  return (
    <p
      style={{
        margin: 0,
        fontFamily: FONT_BODY,
        fontSize: size * scale,
        lineHeight: leading,
        color,
        whiteSpace: 'pre-line',
        textWrap: 'pretty',
      }}
    >
      {text.trim()}
    </p>
  )
}
