/** Motor de copys: arma piezas completas (objetivo, dirección visual, hook + cuerpo + CTA, hashtags). */
import type { CopyPiece, FormatKey, PillarKey, ToneKey } from '@/lib/types';
import { BASE_TAGS, CTAS, HOOKS, OBJECTIVES, OCCASIONS, PILLAR_TAGS, type OccasionId } from './bank';

export interface CopyRequest {
  pillar: PillarKey;
  tone: ToneKey;
  format: FormatKey | 'carousel';
  objectiveId?: string;
  occasion?: OccasionId;
  seed?: number;
}

/** PRNG determinístico (mulberry32): misma semilla → misma pieza; "Regenerar" cambia la semilla. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(r: () => number, arr: readonly T[]) => arr[Math.floor(r() * arr.length)];

function shuffle<T>(r: () => number, arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const objectivesFor = (p: PillarKey) => OBJECTIVES.filter((o) => o.pillar === p);

export function generateCopy(req: CopyRequest): CopyPiece {
  const r = rng(req.seed ?? Date.now());
  const pool = objectivesFor(req.pillar);
  const obj = pool.find((o) => o.id === req.objectiveId) ?? pick(r, pool);
  const vf = req.format === 'carousel' ? 'carousel' : req.format === 'reel' ? 'reel' : req.format === 'story' ? 'story' : 'feed';
  const occ = OCCASIONS.find((o) => o.id === req.occasion);
  const occLine = occ && 'line' in occ ? occ.line : null;

  const hook = occLine && r() > 0.35 ? occLine : pick(r, HOOKS[req.pillar][req.tone]);
  const body = pick(r, obj.bodies);
  const cta = pick(r, CTAS[req.tone]);

  const n = 5 + Math.floor(r() * 4); // 5..8
  const specific = shuffle(r, [...obj.tags, ...PILLAR_TAGS[req.pillar], ...(occ && 'tag' in occ ? [occ.tag] : [])]);
  const base = shuffle(r, BASE_TAGS.slice(2));
  const tags = Array.from(new Set(['#HotelGEA', '#GEASuites', ...specific, ...base])).slice(0, n);

  return {
    objective: obj.name,
    visual: pick(r, obj.visual[vf]),
    hook,
    body,
    cta,
    hashtags: tags,
    pillar: req.pillar,
    tone: req.tone,
    format: req.format,
  };
}

/** Caption listo para pegar en Instagram. */
export const captionText = (c: CopyPiece) => `${c.hook}\n\n${c.body}\n\n${c.cta}\n\n${c.hashtags.join(' ')}`;

/** Grilla semanal: una pieza por día rotando pilares y formatos. */
export function weeklyGrid(tone: ToneKey, seed = Date.now()) {
  const plan: { day: string; pillar: PillarKey; format: FormatKey | 'carousel' }[] = [
    { day: 'Lunes', pillar: 'claridad', format: 'story' },
    { day: 'Martes', pillar: 'complicidad', format: 'reel' },
    { day: 'Miércoles', pillar: 'experiencia', format: 'carousel' },
    { day: 'Jueves', pillar: 'calidad', format: 'feed45' },
    { day: 'Viernes', pillar: 'complicidad', format: 'story' },
    { day: 'Sábado', pillar: 'experiencia', format: 'reel' },
    { day: 'Domingo', pillar: 'calidad', format: 'story' },
  ];
  return plan.map((p, i) => ({ ...p, piece: generateCopy({ pillar: p.pillar, tone, format: p.format, seed: seed + i * 977 }) }));
}
