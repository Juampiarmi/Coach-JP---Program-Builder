// Escudo oficial de COACH JP con canal alfa (sin fondo ni halo): 1x, @2x y versión embebida para la app offline y los
// canvas (sin CORS). Fuente: brand-src/coach-jp-original.png si existe (se le quita el fondo); si no, el vector oficial
// brand-src/coach-jp-shield.svg. Uso: node brand-src/build-coach-jp-logo.mjs
import { createRequire } from 'module'; const { chromium } = createRequire(import.meta.url)('playwright');
import { fileURLToPath } from 'url'; import path from 'path'; import fs from 'fs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ORIG = path.join(HERE, 'coach-jp-original.png');
const b = await chromium.launch();
const p = await b.newPage();
const src = fs.existsSync(ORIG) ? 'data:image/png;base64,' + fs.readFileSync(ORIG).toString('base64') : 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(HERE, 'coach-jp-shield.svg')).toString('base64');
const out = await p.evaluate(async ({ src, raster }) => {
  const img = new Image(); img.src = src; await img.decode();
  // Raster: se trabaja a su tamaño; vector: se rasteriza a 1200 px de alto.
  const H0 = raster ? img.naturalHeight : 1200, W0 = Math.round(H0 * (img.naturalWidth / img.naturalHeight));
  const c = document.createElement('canvas'); c.width = W0; c.height = H0; const x = c.getContext('2d'); x.drawImage(img, 0, 0, W0, H0);
  if (raster) {
    // Fondo = color de las esquinas; alfa por distancia a ese color y color des-mezclado (sin halo).
    const id = x.getImageData(0, 0, W0, H0), d = id.data;
    const corners = [[2, 2], [W0 - 3, 2], [2, H0 - 3], [W0 - 3, H0 - 3]].map(([a, b2]) => { const i = (b2 * W0 + a) * 4; return [d[i], d[i + 1], d[i + 2]]; });
    const bg = [0, 1, 2].map((k) => corners.reduce((s, q) => s + q[k], 0) / 4);
    for (let i = 0; i < d.length; i += 4) {
      const dist = Math.hypot(d[i] - bg[0], d[i + 1] - bg[1], d[i + 2] - bg[2]);
      const a = Math.max(0, Math.min(1, (dist - 40) / 90));
      if (a <= 0.02) { d[i + 3] = 0; continue; }
      for (let k = 0; k < 3; k++) d[i + k] = Math.max(0, Math.min(255, (d[i + k] - (1 - a) * bg[k]) / a));
      d[i + 3] = Math.round(a * 255);
    }
    x.putImageData(id, 0, 0);
  }
  // Recorte al contenido + margen.
  const d = x.getImageData(0, 0, W0, H0).data; let x0 = W0, y0 = H0, x1 = 0, y1 = 0;
  for (let y = 0; y < H0; y++) for (let xx = 0; xx < W0; xx++) if (d[(y * W0 + xx) * 4 + 3] > 60) { x0 = Math.min(x0, xx); x1 = Math.max(x1, xx); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const pad = Math.round((y1 - y0) * 0.02); x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W0 - 1, x1 + pad); y1 = Math.min(H0 - 1, y1 + pad);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const mk = (h) => { const k = document.createElement('canvas'); k.height = h; k.width = Math.round((cw * h) / ch); const kx = k.getContext('2d'); kx.imageSmoothingQuality = 'high'; kx.drawImage(c, x0, y0, cw, ch, 0, 0, k.width, k.height); return k.toDataURL('image/png'); };
  return { ratio: cw / ch, x1: mk(360), x2: mk(720), embed: mk(180) };
}, { src, raster: fs.existsSync(ORIG) });
fs.mkdirSync(path.join(HERE, '../public/brand'), { recursive: true });
fs.writeFileSync(path.join(HERE, '../public/brand/coach-jp-logo.png'), Buffer.from(out.x1.split(',')[1], 'base64'));
fs.writeFileSync(path.join(HERE, '../public/brand/coach-jp-logo@2x.png'), Buffer.from(out.x2.split(',')[1], 'base64'));
fs.writeFileSync(path.join(HERE, '../src/lib/coachJpLogo.ts'), `// Escudo oficial de COACH JP (PNG con canal alfa) embebido para la app offline y las storycards (sin CORS).
// Versiones de alta resolución en public/brand/ (coach-jp-logo.png y @2x). Generado con brand-src/build-coach-jp-logo.mjs.
/** Proporción ancho / alto del escudo. */
export const COACH_JP_LOGO_RATIO = ${out.ratio.toFixed(4)};
export const COACH_JP_LOGO = '${out.embed}';
`);
console.log('ok', fs.existsSync(ORIG) ? 'desde el original' : 'desde el vector oficial', out.ratio.toFixed(3));
await b.close();
