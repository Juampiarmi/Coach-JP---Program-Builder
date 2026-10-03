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
    carbon: '#0B0F17',
    carbon2: '#0E1420',
    panel: '#131B2A',
    line: 'rgba(255,255,255,0.08)',
    cyan: '#38BDF8',
    fire: '#F97316',
    fireHot: '#FF5E1E',
    gold: '#FFD600',
    ink: '#FFFFFF',
    steel: '#94A3B8',
    mute: '#64748B',
    danger: '#EF4444',
  },
};

// ---------- ISOTIPO NUTRITION (distinto del rayo de Training) ----------
// Hexágono táctico #0B0F17 con borde de precisión cian y llama metabólica naranja. viewBox 0 0 100 100.
export const HEX_OUTER = 'M50 4 L89.8 27 L89.8 73 L50 96 L10.2 73 L10.2 27 Z';
export const HEX_INNER = 'M50 12 L82.9 31 L82.9 69 L50 88 L17.1 69 L17.1 31 Z';
export const FLAME_OUTER =
  'M50 22 C54 32 65 39 65 53 C65 65 58 74 50 76 C42 74 35 65 35 54 C35 46 39.5 41 43 36 C43.5 42 45.5 46 48.5 47.5 C47 39 46.5 30 50 22 Z';
export const FLAME_CORE = 'M50.5 49 C55 54 57.5 58 57.5 63 C57.5 68 54.5 71 50.5 71 C46.5 71 43.5 68 43.5 63.5 C43.5 59 47 55.5 50.5 49 Z';
/** Nodos moleculares en los vértices del hexágono interior. */
export const HEX_NODES: [number, number][] = [
  [50, 12],
  [82.9, 31],
  [82.9, 69],
  [50, 88],
  [17.1, 69],
  [17.1, 31],
];

export function nutritionSvg(size = 40, idSuffix = 'n') {
  const nodes = HEX_NODES.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.1" fill="#38BDF8"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100"><defs><linearGradient id="fl-${idSuffix}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF5E1E"/><stop offset="1" stop-color="#F97316"/></linearGradient></defs><path d="${HEX_OUTER}" fill="#0B0F17" stroke="#38BDF8" stroke-width="3" stroke-linejoin="round"/><path d="${HEX_INNER}" fill="none" stroke="#38BDF8" stroke-opacity=".28" stroke-width="1.2"/>${nodes}<path d="${FLAME_OUTER}" fill="url(#fl-${idSuffix})"/><path d="${FLAME_CORE}" fill="#FDBA74"/></svg>`;
}

/** Dibuja el isotipo Nutrition en un canvas cuadrado (iconos PWA). */
export function drawNutritionIcon(ctx: CanvasRenderingContext2D, size: number, maskable: boolean) {
  ctx.clearRect(0, 0, size, size);
  if (maskable) {
    ctx.fillStyle = '#0B0F17';
    ctx.fillRect(0, 0, size, size);
  }
  // Maskable: el hexágono entra en la zona segura (círculo del 80 %).
  const scale = (size / 100) * (maskable ? 0.74 : 1);
  const off = (size - 100 * scale) / 2;
  ctx.save();
  ctx.translate(off, off);
  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';
  ctx.fillStyle = '#0B0F17';
  ctx.fill(new Path2D(HEX_OUTER));
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 3;
  ctx.stroke(new Path2D(HEX_OUTER));
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 1.2;
  ctx.stroke(new Path2D(HEX_INNER));
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#38BDF8';
  for (const [x, y] of HEX_NODES) {
    ctx.beginPath();
    ctx.arc(x, y, 2.1, 0, Math.PI * 2);
    ctx.fill();
  }
  const g = ctx.createLinearGradient(0, 22, 0, 76);
  g.addColorStop(0, '#FF5E1E');
  g.addColorStop(1, '#F97316');
  ctx.fillStyle = g;
  ctx.fill(new Path2D(FLAME_OUTER));
  ctx.fillStyle = '#FDBA74';
  ctx.fill(new Path2D(FLAME_CORE));
  ctx.restore();
}

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

/** Icono PNG cuadrado (isotipo Nutrition) para manifest / apple-touch-icon. */
export function renderIconPng(size: number, maskable = false): string {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  drawNutritionIcon(c.getContext('2d')!, size, maskable);
  return c.toDataURL('image/png');
}
