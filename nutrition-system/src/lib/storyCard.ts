import { computeTelemetry, fmt0, fmt1, isMpsMeal, LEUCINE_THRESHOLD, mealTotals, PHASE_LABEL } from './bioenergetics';
import { BRAND, drawNutritionIcon } from './brand';
import { CITES } from './evidence';
import { DISCIPLINE_LABEL } from './exportHtml';
import type { AthletePlan } from './types';

export const STORY_W = 1080;
export const STORY_H = 1920;

const C = BRAND.colors;
// 'Chakra Petch' para cifras, titulares y badges; JetBrains Mono tabular para gramos; Inter para la nota.
const CHAKRA = '"Chakra Petch", sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';
const SANS = 'Inter, system-ui, sans-serif';

const PAD_X = 90;
const CONTENT_W = STORY_W - PAD_X * 2;
const TOP = 130;
/** Altura reservada al footer (cita + separador + fila del logo), anclado al borde inferior. */
const FOOTER_H = 220;
const BOTTOM_SAFE = 84;
/** Separación mínima entre bloques; si no entra, la nota se reduce de 3 a 2 líneas. */
const MIN_GAP = 48;

/**
 * Garantiza que las fuentes estén en memoria antes de dibujar: sin esto, el canvas usa la fuente
 * genérica del sistema. Las fuentes se sirven desde el mismo origen (@fontsource).
 */
export async function ensureFonts() {
  if (typeof document === 'undefined' || !document.fonts) return;
  await document.fonts.ready;
  await Promise.all(
    [
      "700 48px 'Chakra Petch'",
      "500 48px 'Chakra Petch'",
      "700 48px 'JetBrains Mono'",
      "500 48px 'JetBrains Mono'",
      '400 48px Inter',
      '600 48px Inter',
    ].map((f) => document.fonts.load(f).catch(() => [])),
  );
  await document.fonts.ready;
}

type Ctx = CanvasRenderingContext2D & { letterSpacing?: string };

function setSpacing(ctx: Ctx, px: number) {
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`;
}

function text(ctx: Ctx, s: string, x: number, y: number, spacing = 0) {
  setSpacing(ctx, spacing);
  ctx.fillText(s, x, y);
  setSpacing(ctx, 0);
}

function width(ctx: Ctx, s: string, spacing = 0) {
  setSpacing(ctx, spacing);
  const w = ctx.measureText(s).width;
  setSpacing(ctx, 0);
  return w;
}

function wrap(ctx: CanvasRenderingContext2D, s: string, maxW: number) {
  const words = s.split(/\s+/).filter(Boolean);
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

/** Recorta a `max` líneas con elipsis (equivalente a line-clamp). */
function clamp(ctx: CanvasRenderingContext2D, lines: string[], max: number, maxW: number) {
  if (lines.length <= max) return lines;
  const out = lines.slice(0, max);
  let last = out[max - 1];
  while (last.length && ctx.measureText(`${last}…`).width > maxW) last = last.replace(/\s*\S+$/, '');
  out[max - 1] = `${last.replace(/[\s,;.:]+$/, '')}…`;
  return out;
}

function badge(ctx: Ctx, label: string, x: number, y: number, color: string, size = 26) {
  ctx.font = `700 ${size}px ${CHAKRA}`;
  const w = width(ctx, label, 5) + 44;
  const h = size + 26;
  ctx.fillStyle = color === C.fire ? 'rgba(249,115,22,.1)' : 'rgba(56,189,248,.1)';
  ctx.strokeStyle = color === C.fire ? 'rgba(249,115,22,.4)' : 'rgba(56,189,248,.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  text(ctx, label, x + 22, y + h / 2 + 1, 5);
  ctx.textBaseline = 'alphabetic';
  return { w, h };
}

/** Bloque vertical medido: el layout reparte el espacio sobrante entre bloques (justify-between). */
interface Block {
  height: number;
  draw: (y: number) => void;
}

function drawBackground(ctx: Ctx) {
  const bg = ctx.createLinearGradient(0, 0, 0, STORY_H);
  bg.addColorStop(0, C.carbon);
  bg.addColorStop(1, C.carbon2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, STORY_W, STORY_H);

  // Rejilla táctica al 4 %.
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= STORY_W; x += 54) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, STORY_H);
    ctx.stroke();
  }
  for (let y = 0; y <= STORY_H; y += 54) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(STORY_W, y + 0.5);
    ctx.stroke();
  }

  // Halos muy sutiles: cian arriba, naranja abajo.
  const h1 = ctx.createRadialGradient(STORY_W * 0.85, 0, 0, STORY_W * 0.85, 0, 900);
  h1.addColorStop(0, 'rgba(56,189,248,.10)');
  h1.addColorStop(1, 'rgba(56,189,248,0)');
  ctx.fillStyle = h1;
  ctx.fillRect(0, 0, STORY_W, STORY_H);
  const h2 = ctx.createRadialGradient(0, STORY_H * 0.62, 0, 0, STORY_H * 0.62, 800);
  h2.addColorStop(0, 'rgba(249,115,22,.08)');
  h2.addColorStop(1, 'rgba(249,115,22,0)');
  ctx.fillStyle = h2;
  ctx.fillRect(0, 0, STORY_W, STORY_H);

  // Esquinas HUD.
  ctx.strokeStyle = C.cyan;
  ctx.lineWidth = 3;
  const corner = (x: number, y: number, dx: number, dy: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y + dy * 56);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * 56, y);
    ctx.stroke();
  };
  corner(44, 44, 1, 1);
  corner(STORY_W - 44, 44, -1, 1);
  corner(44, STORY_H - 44, 1, -1);
  corner(STORY_W - 44, STORY_H - 44, -1, -1);
  // Marcas de calibración en los laterales.
  ctx.strokeStyle = 'rgba(56,189,248,.35)';
  ctx.lineWidth = 2;
  for (const y of [STORY_H * 0.33, STORY_H * 0.5, STORY_H * 0.67]) {
    ctx.beginPath();
    ctx.moveTo(44, y);
    ctx.lineTo(64, y);
    ctx.moveTo(STORY_W - 44, y);
    ctx.lineTo(STORY_W - 64, y);
    ctx.stroke();
  }
}

/** Métricas del último layout dibujado (usadas para verificar que no haya solapes). */
export let lastLayout = { contentBottom: 0, footerTop: 0, spacing: 0 };

export function drawStoryCard(canvas: HTMLCanvasElement, plan: AthletePlan) {
  canvas.width = STORY_W;
  canvas.height = STORY_H;
  const ctx = canvas.getContext('2d')! as Ctx;
  const t = computeTelemetry(plan);
  const pr = plan.profile;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  drawBackground(ctx);

  // ---------- a) Header ----------
  ctx.font = `700 100px ${CHAKRA}`;
  let nameSize = 112;
  const name = pr.name.toUpperCase();
  let nameLines: string[] = [];
  // Auto-ajuste: máximo 2 líneas dentro del ancho útil.
  for (; nameSize >= 64; nameSize -= 4) {
    ctx.font = `700 ${nameSize}px ${CHAKRA}`;
    nameLines = wrap(ctx, name, CONTENT_W);
    if (nameLines.length <= 2 && nameLines.every((l) => ctx.measureText(l).width <= CONTENT_W)) break;
  }
  nameLines = nameLines.slice(0, 2);
  const nameLH = Math.round(nameSize * 1.02);
  const header: Block = {
    height: 78 + 30 + nameLines.length * nameLH + 20 + 44 + 18 + 26,
    draw: (y) => {
      badge(ctx, '[ BIOENERGETICS & PERFORMANCE ]', PAD_X, y, C.cyan);
      const nameTop = y + 78 + 30;
      ctx.font = `700 ${nameSize}px ${CHAKRA}`;
      ctx.fillStyle = C.ink;
      nameLines.forEach((l, i) => text(ctx, l, PAD_X - 4, nameTop + nameSize * 0.8 + i * nameLH, 1));
      const cy = nameTop + nameLines.length * nameLH + 20 + 36;
      ctx.font = `700 44px ${CHAKRA}`;
      ctx.fillStyle = C.fire;
      text(ctx, PHASE_LABEL[pr.phase].toUpperCase(), PAD_X, cy, 3);
      // Disciplina en su propia línea: nunca se sale del ancho útil.
      ctx.font = `500 24px ${MONO}`;
      ctx.fillStyle = C.mute;
      text(ctx, `[ ${DISCIPLINE_LABEL[pr.discipline]} ]`, PAD_X, cy + 18 + 30, 3);
    },
  };

  // ---------- b) Núcleo: kcal ON / OFF ----------
  const kcalOn = fmt0(t.kcalOn);
  const kcalOff = fmt0(t.kcalOff);
  const core: Block = {
    height: 440,
    draw: (y) => {
      ctx.font = `700 236px ${CHAKRA}`;
      ctx.fillStyle = C.fire;
      ctx.shadowColor = 'rgba(249,115,22,.35)';
      ctx.shadowBlur = 40;
      text(ctx, kcalOn, PAD_X - 10, y + 196);
      ctx.shadowBlur = 0;
      ctx.font = `700 30px ${MONO}`;
      ctx.fillStyle = C.steel;
      text(ctx, 'KCAL · DÍA ON · ENTRENO', PAD_X, y + 252, 4);

      const y2 = y + 252 + 40 + 128;
      ctx.font = `700 140px ${CHAKRA}`;
      ctx.fillStyle = C.cyan;
      ctx.shadowColor = 'rgba(56,189,248,.3)';
      ctx.shadowBlur = 30;
      text(ctx, kcalOff, PAD_X - 6, y2);
      ctx.shadowBlur = 0;
      const ow = width(ctx, kcalOff);
      ctx.font = `700 28px ${MONO}`;
      ctx.fillStyle = C.steel;
      text(ctx, 'KCAL · DÍA OFF', PAD_X + ow + 30, y2 - 58, 4);
      ctx.font = `500 24px ${MONO}`;
      ctx.fillStyle = C.mute;
      text(ctx, 'DESCANSO · GRASAS HORMONALES', PAD_X + ow + 30, y2 - 18, 2);
    },
  };

  // ---------- c) Macros ----------
  const gap = 24;
  const cardW = (CONTENT_W - gap * 2) / 3;
  const cardH = 230;
  const macros: [string, number, number, number, string][] = [
    ['PROTEÍNA', t.gramsOn.p, t.gramsOff.p, plan.periodization.on.p, C.cyan],
    ['CARBOS', t.gramsOn.c, t.gramsOff.c, plan.periodization.on.c, C.fire],
    ['GRASAS', t.gramsOn.f, t.gramsOff.f, plan.periodization.on.f, '#FDBA74'],
  ];
  const macroBlock: Block = {
    height: cardH,
    draw: (y) => {
      macros.forEach(([label, on, off, gkg, color], i) => {
        const x = PAD_X + i * (cardW + gap);
        ctx.fillStyle = C.panel;
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, cardW, cardH, 20);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.fillRect(x, y + 24, 5, cardH - 48);

        ctx.font = `700 24px ${CHAKRA}`;
        ctx.fillStyle = C.steel;
        text(ctx, label, x + 32, y + 56, 4);
        ctx.font = `700 84px ${MONO}`;
        ctx.fillStyle = C.ink;
        const v = String(on);
        text(ctx, v, x + 28, y + 142);
        const vw = width(ctx, v);
        ctx.font = `500 30px ${MONO}`;
        ctx.fillStyle = C.mute;
        text(ctx, 'g', x + 36 + vw, y + 142);
        ctx.font = `500 23px ${MONO}`;
        ctx.fillStyle = color;
        text(ctx, `${fmt1(gkg)} g/kg · ON`, x + 32, y + 182);
        ctx.fillStyle = C.mute;
        text(ctx, `OFF ${off} g`, x + 32, y + 212);
      });
    },
  };

  // ---------- d) Notas ----------
  const mps = plan.meals.filter(isMpsMeal);
  const okLeu = mps.filter((m) => mealTotals(m).leucine >= LEUCINE_THRESHOLD).length;
  const allOk = mps.length > 0 && okLeu === mps.length;
  ctx.font = `400 34px ${SANS}`;
  const noteAll = wrap(ctx, plan.coachNote || '', CONTENT_W);
  const noteLH = 48;
  const fixedH = header.height + core.height + macroBlock.height + 74 + 26;
  const avail = STORY_H - BOTTOM_SAFE - FOOTER_H - 40 - TOP;
  // line-clamp adaptativo: 3 líneas si caben con el gap mínimo, si no 2.
  const maxLines = fixedH + 3 * noteLH + 3 * MIN_GAP <= avail ? 3 : 2;
  const noteLines = clamp(ctx, noteAll, maxLines, CONTENT_W);
  const notes: Block = {
    height: 74 + 26 + noteLines.length * noteLH,
    draw: (y) => {
      const b = badge(ctx, allOk ? '[ MPS / mTOR OK ]' : `[ MPS / mTOR · ${okLeu}/${mps.length} ]`, PAD_X, y, allOk ? C.cyan : C.fire, 24);
      ctx.font = `500 23px ${MONO}`;
      ctx.fillStyle = C.mute;
      text(ctx, `≥${fmt1(LEUCINE_THRESHOLD)} g LEUCINA · ${okLeu}/${mps.length} COMIDAS`, PAD_X + b.w + 24, y + b.h / 2 + 8, 1);
      ctx.font = `400 34px ${SANS}`;
      ctx.fillStyle = '#E5E7EB';
      let cy = y + 74 + 26 + 34;
      for (const l of noteLines) {
        ctx.fillText(l, PAD_X, cy);
        cy += noteLH;
      }
    },
  };

  // ---------- Distribución vertical (justify-between) ----------
  const blocks = [header, core, macroBlock, notes];
  const areaTop = TOP;
  const areaBottom = STORY_H - BOTTOM_SAFE - FOOTER_H - 40;
  const used = blocks.reduce((a, b) => a + b.height, 0);
  const spacing = (areaBottom - areaTop - used) / (blocks.length - 1);
  let y = areaTop;
  for (const b of blocks) {
    b.draw(y);
    y += b.height + spacing;
  }
  // Fin real del contenido (para verificar que nunca invada el footer).
  lastLayout = { contentBottom: y - spacing, footerTop: STORY_H - BOTTOM_SAFE - FOOTER_H, spacing };

  // ---------- e) Footer táctico aislado ----------
  const footerTop = STORY_H - BOTTOM_SAFE - FOOTER_H;
  // Fila 1: cita bibliográfica (pequeña, #64748B).
  ctx.font = `500 22px ${MONO}`;
  ctx.fillStyle = C.mute;
  text(ctx, `[ ${CITES.morton.label} ]`, PAD_X, footerTop + 26, 2);
  // Separador.
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD_X, footerTop + 52);
  ctx.lineTo(STORY_W - PAD_X, footerTop + 52);
  ctx.stroke();
  // Fila 2: logo Nutrition + firma, con su propio espacio.
  const logoSize = 124;
  const logoY = footerTop + 52 + 36;
  const icon = document.createElement('canvas');
  icon.width = icon.height = logoSize * 2;
  drawNutritionIcon(icon.getContext('2d')!, logoSize * 2, false);
  ctx.drawImage(icon, PAD_X - 6, logoY, logoSize, logoSize);
  const tx = PAD_X + logoSize + 26;
  ctx.font = `700 54px ${CHAKRA}`;
  ctx.fillStyle = C.ink;
  text(ctx, 'COACH JP', tx, logoY + 62, 3);
  ctx.font = `500 30px ${MONO}`;
  ctx.fillStyle = C.steel;
  text(ctx, BRAND.handle, tx, logoY + 108);
  ctx.textAlign = 'right';
  ctx.font = `700 20px ${CHAKRA}`;
  ctx.fillStyle = C.cyan;
  text(ctx, '[ BIOENERGETICS & NUTRITION ]', STORY_W - PAD_X, logoY + 62, 3);
  ctx.font = `500 20px ${MONO}`;
  ctx.fillStyle = C.mute;
  text(ctx, 'HIGH PERFORMANCE SYSTEM', STORY_W - PAD_X, logoY + 108, 3);
  ctx.textAlign = 'left';
}
