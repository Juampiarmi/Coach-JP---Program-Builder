// Limpia el logo oficial de NutrirCe: quita el fondo verde y el círculo oscuro del recorte, deja verde / naranja de marca
// con canal alfa (sin halo) y exporta 1x, @2x y la versión embebida. Uso: node brand-src/clean-nutrirce-logo.mjs
import { createRequire } from 'module'; const { chromium } = createRequire(import.meta.url)('playwright');
import { fileURLToPath } from 'url'; import path from 'path';
const HERE = path.dirname(fileURLToPath(import.meta.url));
import fs from 'fs';
const b = await chromium.launch(); const p = await b.newPage();
const data = 'data:image/png;base64,' + fs.readFileSync(path.join(HERE, 'nutrirce-original.png')).toString('base64');
const out = await p.evaluate(async (data) => {
  const img = new Image(); img.src = data; await img.decode();
  const W = img.width, H = img.height;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const id = x.getImageData(0, 0, W, H), d = id.data;
  const BG = [178, 229, 126], FG = [[106, 155, 60], [206, 104, 50], [224, 138, 72]];
  // 1) Máscara del círculo oscuro (neutro y oscuro), dilatada 4 px.
  const dark = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) { const r = d[i * 4], g = d[i * 4 + 1], bl = d[i * 4 + 2]; const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl); if (mx < 150 && mx - mn < 40 && !(g > r + 25 && g > bl + 25)) dark[i] = 1; }
  const kill = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) if (dark[y * W + xx]) for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const yy = y + dy, x2 = xx + dx; if (yy >= 0 && yy < H && x2 >= 0 && x2 < W) kill[yy * W + x2] = 1; }
  // 2) Alfa por proyección sobre el color de marca más cercano (verde u naranja); color final = color de marca puro.
  const o = x.createImageData(W, H), od = o.data;
  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (let i = 0; i < W * H; i++) {
    if (kill[i]) continue;
    const pv = [d[i * 4] - BG[0], d[i * 4 + 1] - BG[1], d[i * 4 + 2] - BG[2]];
    let best = null;
    for (const f of FG) {
      const v = [f[0] - BG[0], f[1] - BG[1], f[2] - BG[2]], vv = v[0] ** 2 + v[1] ** 2 + v[2] ** 2;
      const a = (pv[0] * v[0] + pv[1] * v[1] + pv[2] * v[2]) / vv;
      const res = Math.hypot(pv[0] - a * v[0], pv[1] - a * v[1], pv[2] - a * v[2]);
      if (!best || res < best.res) best = { a, res, f };
    }
    let a = Math.max(0, Math.min(1, (best.a - 0.12) / 0.76));
    if (best.res > 60) a = 0;
    if (a < 0.04) continue;
    od[i * 4] = best.f[0]; od[i * 4 + 1] = best.f[1]; od[i * 4 + 2] = best.f[2]; od[i * 4 + 3] = Math.round(a * 255);
    const xx = i % W, y = (i / W) | 0;
    if (a > 0.3) { minX = Math.min(minX, xx); maxX = Math.max(maxX, xx); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  }
  // Limpieza de motas sueltas (píxeles aislados).
  for (let y = 1; y < H - 1; y++) for (let xx = 1; xx < W - 1; xx++) { const i = y * W + xx; if (!od[i * 4 + 3]) continue; let n = 0; for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]) if (od[((y + dy) * W + xx + dx) * 4 + 3] > 40) n++; if (n < 2) od[i * 4 + 3] = 0; }
  x.clearRect(0, 0, W, H); x.putImageData(o, 0, 0);
  const pad = 6; minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad); maxX = Math.min(W - 1, maxX + pad); maxY = Math.min(H - 1, maxY + pad);
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  const mk = (scale) => { const k = document.createElement('canvas'); k.width = Math.round(cw * scale); k.height = Math.round(ch * scale); const kx = k.getContext('2d'); kx.imageSmoothingEnabled = true; kx.imageSmoothingQuality = 'high'; kx.drawImage(c, minX, minY, cw, ch, 0, 0, k.width, k.height); return k.toDataURL('image/png'); };
  const embedH = 180;
  return { box: [minX, minY, cw, ch], x1: mk(1), x2: mk(2), embed: mk(embedH / ch) };
}, data);
for (const [k, f] of [['x1', '../public/brand/nutrirce-logo.png'], ['x2', '../public/brand/nutrirce-logo@2x.png'], ['embed', 'nutrirce-logo-embed.png']]) fs.writeFileSync(path.join(HERE, f), Buffer.from(out[k].split(',')[1], 'base64'));
console.log(out.box);
await b.close();
