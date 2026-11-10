/** Primitivas de pintura: rutas, neón, vidrio, papel. Todas trabajan en unidades lógicas (ctx ya escalado por k). */

export function rr(x: number, y: number, w: number, h: number, r: number | [number, number, number, number]) {
  const [tl, tr, br, bl] = Array.isArray(r) ? r : [r, r, r, r];
  const p = new Path2D();
  p.moveTo(x + tl, y);
  p.lineTo(x + w - tr, y);
  p.arcTo(x + w, y, x + w, y + tr, tr);
  p.lineTo(x + w, y + h - br);
  p.arcTo(x + w, y + h, x + w - br, y + h, br);
  p.lineTo(x + bl, y + h);
  p.arcTo(x, y + h, x, y + h - bl, bl);
  p.lineTo(x, y + tl);
  p.arcTo(x, y, x + tl, y, tl);
  p.closePath();
  return p;
}

export function hexToRgb(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgba(hex: string, a: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** Mezcla un color con blanco (t=0 color, t=1 blanco). */
export function tint(hex: string, t: number) {
  const { r, g, b } = hexToRgb(hex);
  const m = (c: number) => Math.round(c + (255 - c) * t);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}

/** Tubo de neón: tres pasadas de brillo + núcleo claro. */
export function neonStroke(ctx: CanvasRenderingContext2D, path: Path2D, color: string, width: number, k: number, power = 1) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  for (const blur of [42, 22, 9]) {
    ctx.shadowBlur = blur * k * power;
    ctx.lineWidth = width;
    ctx.stroke(path);
  }
  ctx.shadowBlur = 0;
  ctx.strokeStyle = tint(color, 0.72);
  ctx.lineWidth = Math.max(1, width * 0.42);
  ctx.stroke(path);
  ctx.restore();
}

/** Texto (o cualquier relleno) con brillo neón. draw() debe hacer los fillText. */
export function neonGlow(ctx: CanvasRenderingContext2D, color: string, k: number, draw: () => void, power = 1, core = 0.82) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  for (const blur of [34, 14]) {
    ctx.shadowBlur = blur * k * power;
    draw();
  }
  ctx.shadowBlur = 4 * k;
  ctx.fillStyle = tint(color, core);
  draw();
  ctx.restore();
}

/** Vidrio ahumado: base translúcida, reflejo diagonal y canto claro. */
export function glass(ctx: CanvasRenderingContext2D, path: Path2D, x: number, y: number, w: number, h: number, accent?: string) {
  ctx.save();
  ctx.fillStyle = 'rgba(16,16,18,0.52)';
  ctx.fill(path);
  const g = ctx.createLinearGradient(x, y, x + w * 0.7, y + h);
  g.addColorStop(0, 'rgba(255,255,255,0.20)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.05)');
  g.addColorStop(1, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = g;
  ctx.fill(path);
  if (accent) {
    const a = ctx.createRadialGradient(x + w, y + h, 0, x + w, y + h, Math.max(w, h) * 0.9);
    a.addColorStop(0, rgba(accent, 0.28));
    a.addColorStop(1, rgba(accent, 0));
    ctx.fillStyle = a;
    ctx.fill(path);
  }
  ctx.lineWidth = 2;
  const s = ctx.createLinearGradient(x, y, x + w, y + h);
  s.addColorStop(0, 'rgba(255,255,255,0.55)');
  s.addColorStop(0.5, 'rgba(255,255,255,0.14)');
  s.addColorStop(1, accent ? rgba(accent, 0.6) : 'rgba(255,255,255,0.3)');
  ctx.strokeStyle = s;
  ctx.stroke(path);
  ctx.restore();
}

/** Sombra suave de objeto impreso (papel / sólido) para que despegue de la foto. */
export function dropShadow(ctx: CanvasRenderingContext2D, k: number, draw: () => void, alpha = 0.45) {
  ctx.save();
  ctx.shadowColor = `rgba(0,0,0,${alpha})`;
  ctx.shadowBlur = 28 * k;
  ctx.shadowOffsetY = 10 * k;
  draw();
  ctx.restore();
}

/** Grano de papel sutil, determinístico. */
export function grain(ctx: CanvasRenderingContext2D, path: Path2D, x: number, y: number, w: number, h: number, alpha = 0.05) {
  ctx.save();
  ctx.clip(path);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  const n = Math.floor((w * h) / 90);
  for (let i = 0; i < n; i++) ctx.fillRect(x + rnd() * w, y + rnd() * h, 1.2, 1.2);
  ctx.restore();
}

/** Texto blanco legible sobre neón: halo del acento + letra nítida encima (sin empastar). */
export function softGlow(ctx: CanvasRenderingContext2D, accent: string, k: number, draw: () => void) {
  ctx.save();
  ctx.shadowColor = rgba(accent, 0.75);
  ctx.shadowBlur = 16 * k;
  ctx.fillStyle = '#FFFFFF';
  draw();
  ctx.restore();
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  draw();
  ctx.restore();
}
