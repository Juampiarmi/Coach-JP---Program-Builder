// Genera los íconos PWA a partir del isotipo vectorizado (src/brand/logo.ts) con el Chromium de Playwright.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const src = readFileSync(new URL('../src/brand/logo.ts', import.meta.url), 'utf8');
const all = [...src.matchAll(/^\s+'(M [^']+)'/gm)].map((m) => m[1]);
const stroke = Number(src.match(/LOGO_STROKE = ([\d.]+)/)[1]);
const strokes = all.slice(0, 2).map((d) => `<path d="${d}" fill="none" stroke="#fff" stroke-width="${stroke}"/>`).join('');
const fills = all.slice(2).map((d) => `<path d="${d}" fill="#fff"/>`).join('');
const glyph = (w) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="10 46 212 70" width="${w}">${strokes}${fills}</svg>`;

// favicon vectorial: placa carbón + isotipo + filete neón
const fav = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#212121"/><rect x="2" y="2" width="60" height="60" rx="12" fill="none" stroke="#FF2E88" stroke-width="2"/><svg x="7" y="23" width="50" height="17" viewBox="10 46 212 70">${strokes}${fills}</svg></svg>`;
writeFileSync(new URL('../public/icons/favicon.svg', import.meta.url), fav);

const page = (size, maskable) => `<html><body style="margin:0"><div style="width:${size}px;height:${size}px;display:grid;place-items:center;background:${maskable ? '#212121' : 'radial-gradient(circle at 50% 40%,#2c2c2c,#212121 70%)'};${maskable ? '' : `border-radius:${size * 0.22}px;box-shadow:inset 0 0 0 ${Math.max(2, size * 0.012)}px rgba(255,46,136,.85), inset 0 0 ${size * 0.08}px rgba(255,46,136,.45)`}">
<div style="filter:drop-shadow(0 0 ${size * 0.02}px rgba(255,46,136,.6))">${glyph(Math.round(size * (maskable ? 0.58 : 0.7)))}</div></div></body></html>`;

const b = await chromium.launch();
const p = await b.newPage();
for (const [name, size, mask] of [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-512-maskable.png', 512, true],
  ['apple-touch-icon.png', 180, true],
]) {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(page(size, mask));
  await p.screenshot({ path: new URL(`../public/icons/${name}`, import.meta.url).pathname, omitBackground: !mask });
}
await b.close();
console.log('íconos listos');
