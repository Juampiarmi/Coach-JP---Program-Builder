import Anthropic from '@anthropic-ai/sdk';
import { extractJson } from './ai';
import { fmt0, kcalOf, LEUCINE_THRESHOLD } from './bioenergetics';
import { FOOD_BY_ID, macrosFor, matchFood, round1, round2 } from './foods';
import { uid } from './seed';
import type { AiSettings, FoodItem } from './types';

/** Prompt del analista visual: desglose por ingrediente con la canasta argentina. */
export const SCAN_PROMPT = `Actúas como el analista visual de bioenergética de Coach JP (@coachjp.training).
Recibís la foto de un plato. Identificá cada ingrediente visible y estimá su peso en gramos (peso cocido para carnes,
arroz, fideos, papa, batata) usando alimentos habituales de Argentina (ej: pechuga de pollo, cuadril, nalga, milanesa,
arroz blanco, fideos, papa, batata, huevo, ensalada mixta, palta, aceite de oliva, pan, queso, yogur).
Usá referencias de tamaño (plato ~26 cm, cubiertos) para estimar porciones. Si algo no se ve con claridad, decilo en "tips".
Devolvé OBLIGATORIAMENTE sólo un JSON válido, sin texto extra ni bloques de código:
{ "dishName": string, "items": [{ "food": string, "grams": number, "p": number, "c": number, "f": number }],
  "score": number (0-100, "Puntuación Nutricional Táctica": densidad proteica, calidad de carbohidratos,
  presencia de vegetales, perfil de grasas y nivel de ultraprocesado), "scoreReason": string (1 frase),
  "tips": [string] (máx. 3 ajustes concretos para el atleta) }`;

export interface ScanJson {
  dishName?: string;
  items?: { food?: string; grams?: number; p?: number; c?: number; f?: number }[];
  score?: number;
  scoreReason?: string;
  tips?: string[];
}

export interface ScanResult {
  dishName: string;
  items: FoodItem[];
  totals: { p: number; c: number; f: number; leucine: number; kcal: number };
  aiScore: number | null;
  localScore: number;
  scoreReason: string;
  tips: string[];
}

/** Reduce la foto a ≤1024 px JPEG (menos tokens, subida rápida desde el celular). */
export async function imageToBase64(file: File, maxSide = 1024): Promise<{ data: string; mediaType: 'image/jpeg'; preview: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('No se pudo leer la imagen.'));
      i.src = url;
    });
    const k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    const preview = c.toDataURL('image/jpeg', 0.82);
    return { data: preview.split(',')[1], mediaType: 'image/jpeg', preview };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function visionClaude(ai: AiSettings, data: string, mediaType: 'image/jpeg'): Promise<string> {
  const client = new Anthropic({ apiKey: ai.apiKey, dangerouslyAllowBrowser: true });
  const params = {
    model: ai.model,
    max_tokens: 16000,
    system: SCAN_PROMPT,
    messages: [
      {
        role: 'user' as const,
        content: [
          { type: 'image' as const, source: { type: 'base64' as const, media_type: mediaType, data } },
          { type: 'text' as const, text: 'Analizá este plato y devolvé el JSON.' },
        ],
      },
    ],
  };
  const stream =
    ai.model === 'claude-opus-5'
      ? client.beta.messages.stream({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
      : client.beta.messages.stream(params);
  const message = await stream.finalMessage();
  if (message.stop_reason === 'refusal') throw new Error('El modelo rechazó analizar la imagen.');
  if (message.stop_reason === 'max_tokens') throw new Error('La respuesta se cortó por longitud. Probá de nuevo.');
  return message.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
}

async function visionGemini(ai: AiSettings, data: string, mediaType: string): Promise<string> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(ai.model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': ai.apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SCAN_PROMPT }] },
      contents: [{ role: 'user', parts: [{ inline_data: { mime_type: mediaType, data } }, { text: 'Analizá este plato y devolvé el JSON.' }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message || `Gemini respondió ${res.status}`);
  return (body?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('');
}

async function visionOpenAI(ai: AiSettings, data: string, mediaType: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ai.apiKey}` },
    body: JSON.stringify({
      model: ai.model,
      response_format: { type: 'json_object' },
      temperature: 0.2,
      messages: [
        { role: 'system', content: SCAN_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analizá este plato y devolvé el JSON.' },
            { type: 'image_url', image_url: { url: `data:${mediaType};base64,${data}` } },
          ],
        },
      ],
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message || `OpenAI respondió ${res.status}`);
  return body?.choices?.[0]?.message?.content ?? '';
}

/**
 * Score táctico local (0-100), independiente de la IA: densidad proteica, leucina,
 * vegetales/fruta, perfil de grasas y proporción de alimentos reconocidos (no ultraprocesados).
 */
export function tacticalScore(items: FoodItem[]) {
  const t = items.reduce((a, i) => ({ p: a.p + i.p, c: a.c + i.c, f: a.f + i.f, l: a.l + i.leucine }), { p: 0, c: 0, f: 0, l: 0 });
  const kcal = kcalOf(t) || 1;
  const protShare = (t.p * 4) / kcal;
  const fatShare = (t.f * 9) / kcal;
  const veg = items.some((i) => i.foodId && ['veg', 'fruit'].includes(FOOD_BY_ID[i.foodId]?.group));
  const known = items.length ? items.filter((i) => i.foodId).length / items.length : 0;
  const score =
    Math.min(1, protShare / 0.3) * 30 +
    Math.min(1, t.l / LEUCINE_THRESHOLD) * 20 +
    (veg ? 15 : 0) +
    (fatShare <= 0.35 ? 15 : Math.max(0, 15 - (fatShare - 0.35) * 60)) +
    known * 20;
  return Math.round(Math.max(0, Math.min(100, score)));
}

export async function scanMeal(ai: AiSettings, data: string, mediaType: 'image/jpeg'): Promise<ScanResult> {
  if (!ai.apiKey.trim()) throw new Error('Cargá una API key en IA Prompt Engine para escanear platos.');
  const raw =
    ai.provider === 'claude' ? await visionClaude(ai, data, mediaType) : ai.provider === 'gemini' ? await visionGemini(ai, data, mediaType) : await visionOpenAI(ai, data, mediaType);
  const json = extractJson(raw) as unknown as ScanJson;
  return scanFromJson(json);
}

/** Convierte la respuesta del modelo en ítems del Builder (macros de la base local cuando el alimento se reconoce). */
export function scanFromJson(json: ScanJson): ScanResult {
  const items: FoodItem[] = (json.items ?? [])
    .filter((i) => i.food && Number(i.grams) > 0)
    .map((i) => {
      const grams = Math.round(Number(i.grams));
      const ref = matchFood(i.food!);
      if (ref) return { id: uid(), foodId: ref.id, food: ref.name, grams, ...macrosFor(ref.id, grams)! };
      const p = round1(Number(i.p) || 0);
      // Sin referencia local: leucina estimada como ~8 % de la proteína.
      return { id: uid(), food: i.food!, grams, p, c: round1(Number(i.c) || 0), f: round1(Number(i.f) || 0), leucine: round2(p * 0.08) };
    });
  if (!items.length) throw new Error('No se identificaron alimentos en la foto. Probá con una toma cenital y buena luz.');
  const sum = items.reduce((a, i) => ({ p: a.p + i.p, c: a.c + i.c, f: a.f + i.f, leucine: a.leucine + i.leucine }), { p: 0, c: 0, f: 0, leucine: 0 });
  const aiScore = typeof json.score === 'number' && json.score >= 0 && json.score <= 100 ? Math.round(json.score) : null;
  return {
    dishName: json.dishName?.trim() || 'Plato escaneado',
    items,
    totals: { ...sum, kcal: kcalOf(sum) },
    aiScore,
    localScore: tacticalScore(items),
    scoreReason: json.scoreReason?.trim() || `${fmt0(kcalOf(sum))} kcal · ${fmt0(sum.p)} g de proteína`,
    tips: (json.tips ?? []).filter(Boolean).slice(0, 3),
  };
}
