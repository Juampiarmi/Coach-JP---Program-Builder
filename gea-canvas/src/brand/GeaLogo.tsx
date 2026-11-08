import { LOGO_FILLS, LOGO_STROKE, LOGO_STROKES, LOGO_VIEWBOX } from './logo';

export function GeaLogo({ className, color = 'currentColor' }: { className?: string; color?: string }) {
  const { x, y, w, h } = LOGO_VIEWBOX;
  return (
    <svg viewBox={`${x} ${y} ${w} ${h}`} className={className} role="img" aria-label="GEA">
      {LOGO_STROKES.map((d) => (
        <path key={d} d={d} fill="none" stroke={color} strokeWidth={LOGO_STROKE} />
      ))}
      {LOGO_FILLS.map((d) => (
        <path key={d} d={d} fill={color} />
      ))}
    </svg>
  );
}
