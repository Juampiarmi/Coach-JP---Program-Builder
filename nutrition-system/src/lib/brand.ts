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

// ---------- ISOTIPO NUTRITION · "PRISMA BIOENERGÉTICO" (distinto del rayo de Training) ----------
// Hexágono #0B0F17 con doble filete cian (80 % exterior / 30 % interior), llama geométrica facetada
// naranja y monograma "JP" integrado en la base. viewBox 0 0 100 100.
export const HEX_OUTER = 'M50 4 L89.8 27 L89.8 73 L50 96 L10.2 73 L10.2 27 Z';
export const HEX_INNER = 'M50 10.5 L84.2 30.25 L84.2 69.75 L50 89.5 L15.8 69.75 L15.8 30.25 Z';

/** Facetas de la llama alrededor del núcleo (50,54): de claro (luz arriba) a oscuro (base). */
const FC: [number, number] = [50, 54];
const RIM: [number, number][] = [
  [50, 17], [60.5, 33], [66.5, 47.5], [64.5, 62], [57, 72.5], [43, 72.5], [35.5, 62], [33.5, 49.5], [40, 39.5], [44, 46], [46, 31],
];
const FACET_FILLS = ['#FB923C', '#F97316', '#EA580C', '#C2410C', '#9A3412', '#C2410C', '#EA580C', '#F97316', '#FB923C', '#FDBA74', '#FDBA74'];
export const FLAME_FACETS: { pts: [number, number][]; fill: string }[] = RIM.map((a, i) => ({
  pts: [a, RIM[(i + 1) % RIM.length], FC],
  fill: FACET_FILLS[i],
}));
/** Núcleo metabólico (rombo de alta temperatura). */
export const FLAME_CORE: [number, number][] = [[50, 43], [54.5, 54], [50, 63], [45.5, 54]];

const pts = (p: [number, number][]) => p.map(([x, y]) => `${x},${y}`).join(' ');

export function nutritionSvg(size = 40, idSuffix = 'n') {
  const facets = FLAME_FACETS.map((f) => `<polygon points="${pts(f.pts)}" fill="${f.fill}" stroke="${f.fill}" stroke-width=".4" stroke-linejoin="round"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100" data-id="${idSuffix}"><path d="${HEX_OUTER}" fill="#0B0F17" stroke="#38BDF8" stroke-opacity=".8" stroke-width="2.6" stroke-linejoin="round"/><path d="${HEX_INNER}" fill="none" stroke="#38BDF8" stroke-opacity=".3" stroke-width="1.4" stroke-linejoin="round"/>${facets}<polygon points="${pts(FLAME_CORE)}" fill="#FFEDD5" fill-opacity=".92"/><text x="50" y="71" text-anchor="middle" font-family="JetBrains Mono,ui-monospace,monospace" font-weight="800" font-size="6.4" letter-spacing=".6" fill="#0B0F17" fill-opacity=".72">JP</text></svg>`;
}

/** Dibuja el isotipo Nutrition en un canvas cuadrado (iconos PWA embebidos en el index.html del atleta). */
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
  ctx.strokeStyle = 'rgba(56,189,248,.8)';
  ctx.lineWidth = 2.6;
  ctx.stroke(new Path2D(HEX_OUTER));
  ctx.strokeStyle = 'rgba(56,189,248,.3)';
  ctx.lineWidth = 1.4;
  ctx.stroke(new Path2D(HEX_INNER));
  const poly = (p: [number, number][]) => {
    ctx.beginPath();
    p.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };
  ctx.lineWidth = 0.4;
  for (const f of FLAME_FACETS) {
    poly(f.pts);
    ctx.fillStyle = ctx.strokeStyle = f.fill;
    ctx.fill();
    ctx.stroke();
  }
  poly(FLAME_CORE);
  ctx.fillStyle = 'rgba(255,237,213,.92)';
  ctx.fill();
  ctx.fillStyle = 'rgba(11,15,23,.72)';
  ctx.font = '800 6.4px "JetBrains Mono", ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('JP', 50, 71);
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
