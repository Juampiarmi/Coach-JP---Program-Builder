import { COACH_JP_LOGO } from './coachJpLogo';
import { NUTRIRCE_LOGO } from './nutrirceLogo';
import { computeTelemetry, fmt0, fmt1, isMpsMeal, LEUCINE_THRESHOLD, mealTotals, PHASE_LABEL } from './bioenergetics';
import { BRAND, drawNutritionIcon, drawNutrirceIcon, NC, ncLogoSrc, nutriOf, shortSpecialty, storySignature } from './brand';
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
const FOOTER_H = 290;
const BOTTOM_SAFE = 150;
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
  // Logo oficial de NutrirCe listo antes de exportar el PNG (data URL: sin CORS ni canvas «tainted»).
  await Promise.all(
    [NUTRIRCE_LOGO, COACH_JP_LOGO].map(
      (src) =>
        new Promise<void>((ok) => {
          if (logoImage(src)) return ok();
          const i = LOGOS.get(src)!;
          i.addEventListener('load', () => ok(), { once: true });
          i.addEventListener('error', () => ok(), { once: true });
        }),
    ),
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

/** Encabezado 50/50: [ NUTRIRCE & COACH JP ] con el mismo tamaño y peso para las dos marcas. */
function cobrandBadge(ctx: Ctx, x: number, y: number, size = 26) {
  ctx.font = `700 ${size}px ${CHAKRA}`;
  const segs: [string, string][] = [['[ ', C.cyan], ['NUTRIR', NC.green], ['CE', NC.orange], ['  &  ', 'rgba(203,213,225,.6)'], ['COACH ', '#FFFFFF'], ['JP', C.fire], [' ]', C.cyan]];
  const w = segs.reduce((a, [t]) => a + width(ctx, t, 5), 0) + 44;
  const h = size + 26;
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, 'rgba(56,189,248,.35)');
  g.addColorStop(1, 'rgba(34,197,94,.35)');
  ctx.fillStyle = 'rgba(56,189,248,.07)';
  ctx.strokeStyle = g;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
  ctx.textBaseline = 'middle';
  let cx = x + 22;
  for (const [t, col] of segs) {
    ctx.fillStyle = col;
    text(ctx, t, cx, y + h / 2 + 1, 5);
    cx += width(ctx, t, 5);
  }
  ctx.textBaseline = 'alphabetic';
}

/** Logo oficial subido (data URL): se carga una vez y avisa para redibujar la story. */
const LOGOS = new Map<string, HTMLImageElement>();
function logoImage(src: string): HTMLImageElement | null {
  let img = LOGOS.get(src);
  if (!img) {
    img = new Image();
    img.onload = () => window.dispatchEvent(new Event('cjp-story-redraw'));
    img.src = src;
    LOGOS.set(src, img);
  }
  return img.complete && img.naturalWidth ? img : null;
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
  const nutri = nutriOf(plan);
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
      if (nutri) cobrandBadge(ctx, PAD_X, y);
      else badge(ctx, '[ BIOENERGETICS & PERFORMANCE ]', PAD_X, y, C.cyan);
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
  if (nutri) {
    // Bloque de firma 50/50: [NutrirCe] & [Coach JP] con el mismo tamaño y peso, y la firma de la nutricionista.
    const sepY = footerTop + 50;
    const grad = ctx.createLinearGradient(PAD_X, 0, STORY_W - PAD_X, 0);
    grad.addColorStop(0, 'rgba(56,189,248,.45)');
    grad.addColorStop(0.5, 'rgba(34,197,94,.45)');
    grad.addColorStop(1, 'rgba(249,115,22,.45)');
    ctx.fillStyle = grad;
    ctx.fillRect(PAD_X, sepY, CONTENT_W, 2);
    const IS = 104;
    const iy = sepY + 22;
    const half = (CONTENT_W - 60) / 2;
    let fs = 50;
    ctx.font = `700 ${fs}px ${CHAKRA}`;
    while (fs > 32 && IS + 20 + Math.max(width(ctx, 'COACH JP', 3), width(ctx, 'NUTRIRCE', 3)) > half) ctx.font = `700 ${--fs}px ${CHAKRA}`;
    const subOf = (t: string, max: number) => {
      let ss = 18;
      ctx.font = `500 ${ss}px ${MONO}`;
      while (ss > 12 && width(ctx, t, 2) > max) ctx.font = `500 ${--ss}px ${MONO}`;
    };
    // Orden: [NutrirCe] & [Coach JP]. Derecha: escudo oficial de Coach JP (PNG) con la misma altura que el logo de NutrirCe.
    const cL = STORY_W / 2 + 30;
    const LH = IS * 1.1;
    const cj = logoImage(COACH_JP_LOGO);
    if (cj) {
      const cwI = (LH * cj.naturalWidth) / cj.naturalHeight;
      ctx.drawImage(cj, cL + IS / 2 - cwI / 2, iy + IS / 2 - LH / 2, cwI, LH);
    } else {
      const icon = document.createElement('canvas');
      icon.width = icon.height = IS * 2;
      drawNutritionIcon(icon.getContext('2d')!, IS * 2, false);
      ctx.drawImage(icon, cL - 4, iy, IS, IS);
    }
    const ax = cL + IS + 20;
    ctx.font = `700 ${fs}px ${CHAKRA}`;
    ctx.fillStyle = '#FFFFFF';
    text(ctx, 'COACH ', ax, iy + 66, 3);
    ctx.fillStyle = C.fire;
    text(ctx, 'JP', ax + width(ctx, 'COACH ', 3), iy + 66, 3);
    subOf('HIGH PERFORMANCE SYSTEM', half - IS - 20);
    ctx.fillStyle = C.steel;
    text(ctx, 'HIGH PERFORMANCE SYSTEM', ax, iy + 100, 2);
    // Centro: &.
    ctx.font = `400 ${fs}px ${CHAKRA}`;
    ctx.fillStyle = 'rgba(203,213,225,.6)';
    ctx.textAlign = 'center';
    text(ctx, '&', STORY_W / 2, iy + 66);
    ctx.textAlign = 'left';
    // Izquierda: NutrirCe (logo oficial si el coach lo subió).
    const bx = PAD_X;
    const img = logoImage(ncLogoSrc(nutri));
    if (img) {
      // Logo oficial apilado: ocupa el mismo ancho que el bloque de Coach JP, centrado en la fila (sin texto extra).
      const k = Math.min((half - 10) / img.naturalWidth, (IS * 1.38) / img.naturalHeight);
      const lw = img.naturalWidth * k;
      const lh = img.naturalHeight * k;
      ctx.drawImage(img, bx + (half - lw) / 2, iy + IS / 2 - lh / 2, lw, lh);
    } else {
      drawNutrirceIcon(ctx, bx, iy, IS);
      const tx = bx + IS + 20;
      ctx.font = `700 ${fs}px ${CHAKRA}`;
      ctx.fillStyle = NC.green;
      text(ctx, 'NUTRIR', tx, iy + 66, 3);
      ctx.fillStyle = NC.orange;
      text(ctx, 'CE', tx + width(ctx, 'NUTRIR', 3), iy + 66, 3);
      const spec = nutri.specialty.trim() ? shortSpecialty(nutri.specialty).toUpperCase() : 'NUTRICIÓN';
      subOf(spec, half - IS - 20);
      ctx.fillStyle = C.steel;
      text(ctx, spec, tx, iy + 100, 2);
    }
    // Firma de la nutricionista, centrada.
    const sig = storySignature(nutri);
    let ss = 26;
    ctx.font = `600 ${ss}px ${CHAKRA}`;
    while (ss > 16 && width(ctx, sig, 2) > CONTENT_W) ctx.font = `600 ${--ss}px ${CHAKRA}`;
    ctx.fillStyle = '#CBD5E1';
    ctx.textAlign = 'center';
    text(ctx, sig, STORY_W / 2, footerTop + 232, 2);
    ctx.font = `500 20px ${MONO}`;
    ctx.fillStyle = C.mute;
    text(ctx, BRAND.handle, STORY_W / 2, footerTop + 272, 2);
    ctx.textAlign = 'left';
    return;
  }
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
  ctx.fillStyle = '#FFFFFF';
  text(ctx, 'COACH ', tx, logoY + 62, 3);
  ctx.fillStyle = C.fire;
  text(ctx, 'JP', tx + width(ctx, 'COACH ', 3), logoY + 62, 3);
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
