import { computeTelemetry, isMpsMeal, LEUCINE_THRESHOLD, mealTotals, PHASE_LABEL } from './bioenergetics';
import { BRAND, drawShield } from './brand';
import { CITES } from './evidence';
import { DISCIPLINE_LABEL } from './exportHtml';
import type { AthletePlan } from './types';

export const STORY_W = 1080;
export const STORY_H = 1920;

const C = BRAND.colors;
const DISPLAY = '"Chakra Petch", Inter, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';
const SANS = 'Inter, system-ui, sans-serif';

export async function ensureFonts() {
  if (typeof document === 'undefined' || !document.fonts) return;
  await Promise.all(
    ['700 100px "Chakra Petch"', '500 40px "JetBrains Mono"', '700 40px "JetBrains Mono"', '400 40px Inter', '600 40px Inter'].map((f) =>
      document.fonts.load(f).catch(() => null),
    ),
  );
}

function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  // letterSpacing nativo cuando existe; si no, se dibuja carácter por carácter.
  const anyCtx = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  if ('letterSpacing' in anyCtx) {
    anyCtx.letterSpacing = `${spacing}px`;
    ctx.fillText(text, x, y);
    anyCtx.letterSpacing = '0px';
    return;
  }
  let cx = x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

const n0 = (n: number) => Math.round(n).toLocaleString('es-AR');
const n1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString('es-AR');

export function drawStoryCard(canvas: HTMLCanvasElement, plan: AthletePlan) {
  canvas.width = STORY_W;
  canvas.height = STORY_H;
  const ctx = canvas.getContext('2d')!;
  const t = computeTelemetry(plan);
  const pr = plan.profile;
  const X = 96;

  // Fondo: carbón + retícula + halo cian
  ctx.fillStyle = C.carbon;
  ctx.fillRect(0, 0, STORY_W, STORY_H);
  ctx.strokeStyle = 'rgba(255,255,255,.028)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= STORY_W; i += 54) {
    ctx.beginPath();
    ctx.moveTo(i + 0.5, 0);
    ctx.lineTo(i + 0.5, STORY_H);
    ctx.stroke();
  }
  for (let j = 0; j <= STORY_H; j += 54) {
    ctx.beginPath();
    ctx.moveTo(0, j + 0.5);
    ctx.lineTo(STORY_W, j + 0.5);
    ctx.stroke();
  }
  const halo = ctx.createRadialGradient(STORY_W * 0.8, 0, 0, STORY_W * 0.8, 0, 1100);
  halo.addColorStop(0, 'rgba(0,229,255,.16)');
  halo.addColorStop(1, 'rgba(0,229,255,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, STORY_W, STORY_H);
  const halo2 = ctx.createRadialGradient(0, STORY_H, 0, 0, STORY_H, 900);
  halo2.addColorStop(0, 'rgba(255,107,0,.12)');
  halo2.addColorStop(1, 'rgba(255,107,0,0)');
  ctx.fillStyle = halo2;
  ctx.fillRect(0, 0, STORY_W, STORY_H);

  // Esquinas HUD
  ctx.strokeStyle = C.cyan;
  ctx.lineWidth = 3;
  const corner = (x: number, y: number, dx: number, dy: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y + dy * 48);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * 48, y);
    ctx.stroke();
  };
  corner(40, 40, 1, 1);
  corner(STORY_W - 40, 40, -1, 1);
  corner(40, STORY_H - 40, 1, -1);
  corner(STORY_W - 40, STORY_H - 40, -1, -1);

  ctx.textBaseline = 'alphabetic';

  // Etiqueta
  ctx.fillStyle = C.cyan;
  ctx.font = `500 30px ${MONO}`;
  spaced(ctx, `[ BIOENERGÉTICA · ${DISCIPLINE_LABEL[pr.discipline]} ]`, X, 210, 5);

  // Titular
  ctx.font = `700 92px ${DISPLAY}`;
  ctx.fillStyle = '#E5E7EB';
  const name = pr.name.toUpperCase();
  const nameLines = wrap(ctx, name, STORY_W - X * 2).slice(0, 2);
  let y = 320;
  for (const l of nameLines) {
    ctx.fillText(l, X, y);
    y += 96;
  }
  ctx.fillStyle = C.fire;
  ctx.fillText(PHASE_LABEL[pr.phase].toUpperCase().split(' ')[0] + '.', X, y);
  y += 60;

  // Cifra principal: kcal ON
  y += 250;
  ctx.fillStyle = C.fire;
  ctx.font = `700 300px ${DISPLAY}`;
  ctx.shadowColor = 'rgba(255,107,0,.35)';
  ctx.shadowBlur = 40;
  ctx.fillText(n0(t.kcalOn), X - 8, y);
  ctx.shadowBlur = 0;
  y += 64;
  ctx.fillStyle = C.steel;
  ctx.font = `700 30px ${MONO}`;
  spaced(ctx, 'KCAL · DÍA ON · ALTA DEMANDA GLUCOLÍTICA', X, y, 3);

  // Día OFF
  y += 150;
  ctx.fillStyle = C.gold;
  ctx.font = `700 140px ${DISPLAY}`;
  ctx.fillText(n0(t.kcalOff), X - 4, y);
  const offW = ctx.measureText(n0(t.kcalOff)).width;
  ctx.fillStyle = C.steel;
  ctx.font = `700 28px ${MONO}`;
  spaced(ctx, 'KCAL · DÍA OFF', X + offW + 28, y - 20, 3);

  // Placas de macros ON
  y += 70;
  const boxW = (STORY_W - X * 2 - 40) / 3;
  const macros: [string, number, number, string][] = [
    ['PROTEÍNA', t.gramsOn.p, plan.periodization.on.p, C.cyan],
    ['CARBOS ON', t.gramsOn.c, plan.periodization.on.c, C.gold],
    ['GRASAS ON', t.gramsOn.f, plan.periodization.on.f, C.fire],
  ];
  macros.forEach(([label, g, gkg, color], i) => {
    const bx = X + i * (boxW + 20);
    ctx.fillStyle = C.panel;
    ctx.strokeStyle = '#263342';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bx, y, boxW, 200, 18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillRect(bx, y + 18, 5, 164);
    ctx.fillStyle = C.steel;
    ctx.font = `700 22px ${MONO}`;
    spaced(ctx, label, bx + 30, y + 52, 2);
    ctx.fillStyle = C.ink;
    ctx.font = `700 76px ${DISPLAY}`;
    ctx.fillText(`${g}`, bx + 28, y + 136);
    const gw = ctx.measureText(`${g}`).width;
    ctx.font = `500 28px ${MONO}`;
    ctx.fillStyle = C.steel;
    ctx.fillText('g', bx + 36 + gw, y + 136);
    ctx.fillStyle = color;
    ctx.font = `500 24px ${MONO}`;
    ctx.fillText(`${n1(gkg)} g/kg`, bx + 30, y + 176);
  });
  y += 280;

  // Sensor de leucina
  const mps = plan.meals.filter(isMpsMeal);
  const ok = mps.filter((m) => mealTotals(m).leucine >= LEUCINE_THRESHOLD).length;
  ctx.fillStyle = ok === mps.length ? C.cyan : C.fire;
  ctx.beginPath();
  ctx.arc(X + 10, y - 10, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `700 28px ${MONO}`;
  spaced(ctx, `≥${n1(LEUCINE_THRESHOLD)} G LEUCINA · ${ok}/${mps.length} BOLOS mTOR/MPS OK`, X + 38, y, 2);

  // Directiva
  y += 90;
  ctx.fillStyle = '#E5E7EB';
  ctx.font = `400 38px ${SANS}`;
  const allNote = wrap(ctx, plan.coachNote, STORY_W - X * 2);
  const noteLines = allNote.slice(0, 4);
  if (allNote.length > 4) noteLines[3] = noteLines[3].replace(/[\s,;.]*\S*$/, '') + '…';
  for (const l of noteLines) {
    ctx.fillText(l, X, y);
    y += 54;
  }

  // Cita
  y += 30;
  ctx.fillStyle = C.steel;
  ctx.font = `500 26px ${MONO}`;
  spaced(ctx, `[ ${CITES.morton.label} ]`, X, y, 3);

  // Firma
  const fy = STORY_H - 230;
  drawShield(ctx, X, fy, 120);
  ctx.font = `700 46px ${DISPLAY}`;
  ctx.fillStyle = '#E5E7EB';
  ctx.fillText('COACH', X + 132, fy + 58);
  const cw = ctx.measureText('COACH ').width;
  ctx.fillStyle = C.fire;
  ctx.fillText('JP', X + 132 + cw, fy + 58);
  ctx.fillStyle = C.steel;
  ctx.font = `500 30px ${MONO}`;
  ctx.fillText(BRAND.handle, X + 132, fy + 102);
  ctx.textAlign = 'right';
  ctx.font = `500 22px ${MONO}`;
  spaced(ctx, 'HIGH PERFORMANCE SYSTEM', STORY_W - X, fy + 102, 3);
  ctx.textAlign = 'left';
}
