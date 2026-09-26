/** Isotipo Coach JP: escudo táctico oro con rayo negro (viewBox 0 0 100 120). */
export const SHIELD_OUTER =
  'M50 3 L91 16 Q95 17.5 95 22 L95 57 C95 86 75 105 50 117 C25 105 5 86 5 57 L5 22 Q5 17.5 9 16 Z';
export const SHIELD_INNER =
  'M50 12 L85 23 L85 57 C85 80 69 96 50 106 C31 96 15 80 15 57 L15 23 Z';
export const SHIELD_BOLT = 'M57 25 L31 66 L47 66 L41 97 L70 51 L53 51 L61 25 Z';

export const BRAND = {
  handle: '@coachjp.training',
  name: 'COACH JP',
  system: 'HIGH PERFORMANCE SYSTEM',
  colors: {
    carbon: '#0B0E14',
    panel: '#121820',
    line: '#1F2937',
    cyan: '#00E5FF',
    fire: '#FF6B00',
    gold: '#FFD600',
    ink: '#F9FAFB',
    steel: '#8A99AD',
  },
};

export function shieldSvg(size = 48) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${Math.round(size * 1.2)}" viewBox="0 0 100 120"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE45C"/><stop offset="1" stop-color="#F2C200"/></linearGradient></defs><path d="${SHIELD_OUTER}" fill="url(#g)" stroke="#FFF3A6" stroke-opacity=".55" stroke-width="1.5"/><path d="${SHIELD_INNER}" fill="none" stroke="#7A6500" stroke-opacity=".55" stroke-width="2.5"/><path d="${SHIELD_BOLT}" fill="#0B0B0B"/></svg>`;
}

/** Dibuja el escudo sobre un canvas (icono PWA, Story Card). */
export function drawShield(ctx: CanvasRenderingContext2D, x: number, y: number, height: number, glow = true) {
  const s = height / 120;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const grad = ctx.createLinearGradient(0, 0, 0, 120);
  grad.addColorStop(0, '#FFE45C');
  grad.addColorStop(1, '#F2C200');
  if (glow) {
    ctx.shadowColor = 'rgba(255,214,0,.45)';
    ctx.shadowBlur = 30 / s;
  }
  ctx.fillStyle = grad;
  ctx.fill(new Path2D(SHIELD_OUTER));
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(122,101,0,.55)';
  ctx.lineWidth = 2.5;
  ctx.stroke(new Path2D(SHIELD_INNER));
  ctx.fillStyle = '#0B0B0B';
  ctx.fill(new Path2D(SHIELD_BOLT));
  ctx.restore();
}

/** Icono PNG cuadrado para manifest / apple-touch-icon. */
export function renderIconPng(size: number, maskable = false): string {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0B0E14';
  if (maskable) ctx.fillRect(0, 0, size, size);
  else {
    const r = size * 0.22;
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, r);
    ctx.fill();
  }
  const h = size * (maskable ? 0.56 : 0.72);
  drawShield(ctx, (size - h / 1.2) / 2, (size - h) / 2, h, false);
  return c.toDataURL('image/png');
}
