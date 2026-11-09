import { LOGO_PATHS, LOGO_VIEWBOX } from './logo';

export function GeaLogo({ className, color = 'currentColor' }: { className?: string; color?: string }) {
  const { x, y, w, h } = LOGO_VIEWBOX;
  return (
    <svg viewBox={`${x} ${y} ${w} ${h}`} className={className} role="img" aria-label="GEA">
      {LOGO_PATHS.map((p) => (
        <path key={p.d} d={p.d} fill={color} fillRule={p.rule} />
      ))}
    </svg>
  );
}
