import Anthropic from '@anthropic-ai/sdk';
import { geminiGenerate, type GeminiNotice, type GeminiResult } from './gemini';
import { aisGroupA } from './evidence';
import { macrosFor, matchFood, round1, round2 } from './foods';
import { uid } from './seed';
import type { AiProvider, AiSettings, AthletePlan, FoodItem, Meal, MealDay, MealRole, Phase, Supplement } from './types';

export const SYSTEM_PROMPT =
  'Actúas como el motor de IA de bioenergética de Coach JP (@coachjp.training). Tu tono es táctico, basado en evidencia (ISSN, Morton 2018). Recibes notas del atleta y devuelves OBLIGATORIAMENTE un JSON válido con la siguiente estructura: { athleteName, sportType, bmr, tdee, targetKcalOn, targetKcalOff, macrosOn: {p, c, f}, macrosOff: {p, c, f}, meals: [{ name, time, items: [{food, grams, p, c, f, leucine}], leucineTotal, mpsAchieved: boolean }], supplements: [{name, dose, timing, evidenceDOI}] }. Usar alimentos habituales de Argentina y asegurar umbral de leucina >= 2.7g por comida principal.';

/** Extensión del contrato: campos opcionales que el Builder usa para rellenar todas las pestañas. */
export const SYSTEM_PROMPT_EXTENSION = `
REGLAS DE CÁLCULO Y FORMATO (obligatorias):
- BMR por Katch-McArdle (370 + 21,6 × masa libre de grasa) cuando haya % graso; si no, Mifflin-St Jeor.
- Periodización ON/OFF: DÍA ON carbos 4-7 g/kg, proteína 2,0-2,4 g/kg, grasas 0,6-0,8 g/kg. DÍA OFF carbos bajos, proteína constante, grasas 0,9-1,2 g/kg.
- macrosOn / macrosOff en GRAMOS totales diarios. Gramos de alimentos en peso neto (cocido para carnes, arroz, fideos, papa, batata).
- Cada item de "meals" lleva p, c, f y leucine en gramos para la porción indicada, más "macroPrincipal": "protein" | "carbs" | "fat" (el macro que define su equivalencia).
- Grasas de cocción y condimento (aceite de oliva, girasol, manteca): porción REALISTA de 10-15 g (1 cda) por comida, NUNCA más de 15 g por comida. Para cubrir grasas usá palta, frutos secos, huevo o pasta de maní, no más aceite.
- Cereales / carbos rápidos argentinos válidos: avena, avena instantánea, tutucas de maíz (30-60 g), copos de maíz sin azúcar, galletas o tostadas de arroz, pan integral.
- Agregá a cada meal: "day": "ON" | "OFF" | "AMBOS" y "role": "breakfast" | "lunch" | "peri" | "post" | "snack" | "dinner". La suma de las comidas de cada día DEBE cerrar el 100 % (±3 %) de sus metas: kcal (targetKcalOn / targetKcalOff), proteínas, carbohidratos y grasas de macrosOn / macrosOff. Antes de responder, sumá p/c/f de todos los items de cada día y, si falta o sobra, ajustá las porciones de carbohidratos (arroz, papa, batata, avena, fideos) y de grasas (palta, frutos secos, huevo; aceite máx. 15 g por comida) hasta cerrar la brecha.
- Agregá el objeto opcional "profile": { sex: "M"|"F", age, heightCm, weightKg, bodyFatPct, phase: "recomp"|"maintenance"|"surplus", trainingDaysPerWeek, sessionKcal, activityFactor } con lo que se desprenda de las notas.
- Agregá "coachNote": una directiva táctica breve (máx. 2 frases) para el atleta.
- Suplementos: sólo AIS Grupo A (creatina 0,04 g/kg, cafeína 3-6 mg/kg, beta-alanina, bicarbonato, nitrato) con DOI real.
- Respondé SOLO con el objeto JSON, sin texto antes ni después y sin bloques de código.`;

/** Porción máxima de aceite por comida (1 cda ≈ 13-15 g). */
export const MAX_OIL_PER_MEAL_G = 15;

export const MODEL_OPTIONS: Record<AiProvider, { id: string; label: string }[]> = {
  claude: [
    { id: 'claude-opus-5', label: 'Claude Opus 5' },
    { id: 'claude-sonnet-5', label: 'Claude Sonnet 5' },
    { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
  ],
  gemini: [
    // Sólo generación Gemini 3. El primero es el default; ante 503 / 429 el conector conmuta solo
    // a la cadena de respaldo (ver GEMINI_FALLBACKS en gemini.ts).
    { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite · Rápido / Estable' },
    { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash · Alta Capacidad' },
    { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite' },
  ],
  openai: [
    { id: 'gpt-4.1', label: 'GPT-4.1' },
    { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
  ],
};

export interface AiMacros {
  p: number;
  c: number;
  f: number;
}

export interface AiPlanJson {
  athleteName?: string;
  sportType?: string;
  bmr?: number;
  tdee?: number;
  targetKcalOn?: number;
  targetKcalOff?: number;
  macrosOn?: AiMacros;
  macrosOff?: AiMacros;
  meals?: {
    name?: string;
    time?: string;
    day?: string;
    role?: string;
    items?: { food?: string; grams?: number; p?: number; c?: number; f?: number; leucine?: number; macroPrincipal?: string }[];
    leucineTotal?: number;
    mpsAchieved?: boolean;
  }[];
  supplements?: { name?: string; dose?: string; timing?: string; evidenceDOI?: string }[];
  profile?: Partial<{
    sex: string;
    age: number;
    heightCm: number;
    weightKg: number;
    bodyFatPct: number;
    phase: string;
    trainingDaysPerWeek: number;
    sessionKcal: number;
    activityFactor: number;
  }>;
  coachNote?: string;
}

async function callClaude(ai: AiSettings, user: string): Promise<string> {
  // La key vive sólo en este navegador: la llamada va directo a la API de Anthropic.
  const client = new Anthropic({ apiKey: ai.apiKey, dangerouslyAllowBrowser: true });
  const params = {
    model: ai.model,
    max_tokens: 32000,
    system: `${SYSTEM_PROMPT}\n${SYSTEM_PROMPT_EXTENSION}`,
    messages: [{ role: 'user' as const, content: user }],
  };
  const stream =
    ai.model === 'claude-opus-5'
      ? client.beta.messages.stream({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
      : client.beta.messages.stream(params);
  const message = await stream.finalMessage();
  if (message.stop_reason === 'refusal') {
    throw new Error('El modelo rechazó la solicitud. Revisá las notas del atleta e intentá de nuevo.');
  }
  if (message.stop_reason === 'max_tokens') {
    throw new Error('La respuesta se cortó por longitud. Reducí las notas o probá con otro modelo.');
  }
  return message.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
}

async function callGemini(ai: AiSettings, user: string, onNotice?: (n: GeminiNotice) => void): Promise<GeminiResult> {
  return geminiGenerate(
    ai,
    {
      systemInstruction: { parts: [{ text: `${SYSTEM_PROMPT}\n${SYSTEM_PROMPT_EXTENSION}` }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
    },
    onNotice,
  );
}

async function callOpenAI(ai: AiSettings, user: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ai.apiKey}` },
    body: JSON.stringify({
      model: ai.model,
      response_format: { type: 'json_object' },
      temperature: 0.3,
      messages: [
        { role: 'system', content: `${SYSTEM_PROMPT}\n${SYSTEM_PROMPT_EXTENSION}` },
        { role: 'user', content: user },
      ],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `OpenAI respondió ${res.status}`);
  return data?.choices?.[0]?.message?.content ?? '';
}

export function extractJson(text: string): AiPlanJson {
  const cleaned = text.replace(/```(?:json)?/gi, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('La IA no devolvió un JSON reconocible.');
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    throw new Error('El JSON devuelto por la IA está malformado. Reintentá la compilación.');
  }
}

/** Compila el plan. `onNotice` informa reintentos / cambios de modelo (Gemini 503) a la terminal. */
export async function compileWithAi(ai: AiSettings, notes: string, onNotice?: (n: GeminiNotice) => void): Promise<AiPlanJson & { _model?: string }> {
  if (!ai.apiKey.trim()) throw new Error('Cargá una API key para compilar con IA.');
  if (!notes.trim()) throw new Error('Volcá las notas del atleta antes de compilar.');
  const user = `NOTAS BRUTAS DEL ATLETA:\n${notes.trim()}`;
  if (ai.provider === 'gemini') {
    const r = await callGemini(ai, user, onNotice);
    return { ...extractJson(r.text), _model: r.model };
  }
  const raw = ai.provider === 'claude' ? await callClaude(ai, user) : await callOpenAI(ai, user);
  return { ...extractJson(raw), _model: ai.model };
}

const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fallback);

function inferRole(name: string, explicit?: string): MealRole {
  const roles: MealRole[] = ['breakfast', 'lunch', 'peri', 'post', 'snack', 'dinner'];
  if (explicit && roles.includes(explicit as MealRole)) return explicit as MealRole;
  const n = name.toLowerCase();
  if (/desayuno/.test(n)) return 'breakfast';
  if (/almuerzo/.test(n)) return 'lunch';
  if (/post/.test(n)) return 'post';
  if (/peri|pre|intra/.test(n)) return 'peri';
  if (/cena/.test(n)) return 'dinner';
  return 'snack';
}

function inferDay(day: string | undefined, role: MealRole): MealDay {
  const d = (day ?? '').toUpperCase();
  if (d === 'ON') return 'on';
  if (d === 'OFF') return 'off';
  if (d) return 'both';
  return role === 'peri' || role === 'post' ? 'on' : 'both';
}

/** Convierte la respuesta de la IA en el plan del Builder (todas las pestañas). */
export function planFromAi(json: AiPlanJson, base: AthletePlan): AthletePlan {
  const pr = json.profile ?? {};
  const weightKg = num(pr.weightKg, base.profile.weightKg);
  const phases: Phase[] = ['recomp', 'maintenance', 'surplus'];
  const toGkg = (m: AiMacros | undefined, fb: AiMacros) => ({
    p: round2(num(m?.p, fb.p * weightKg) / weightKg),
    c: round2(num(m?.c, fb.c * weightKg) / weightKg),
    f: round2(num(m?.f, fb.f * weightKg) / weightKg),
  });

  const meals: Meal[] = (json.meals ?? []).map((m) => {
    const name = m.name?.trim() || 'Bloque';
    const role = inferRole(name, m.role);
    const items: FoodItem[] = (m.items ?? [])
      .filter((i) => i.food && num(i.grams, 0) > 0)
      .map((i) => {
        let grams = Math.round(num(i.grams, 100));
        const ref = matchFood(i.food!);
        // Aceite de cocción / condimento: tope realista de 15 g (1 cda) por comida, aunque la IA proponga más.
        if (ref?.id === 'oliva' && grams > MAX_OIL_PER_MEAL_G) grams = MAX_OIL_PER_MEAL_G;
        if (ref) return { id: uid(), foodId: ref.id, food: ref.name, grams, ...macrosFor(ref.id, grams)! };
        const mp = i.macroPrincipal;
        return {
          id: uid(),
          food: i.food!,
          grams,
          p: round1(num(i.p, 0)),
          c: round1(num(i.c, 0)),
          f: round1(num(i.f, 0)),
          leucine: round2(num(i.leucine, 0)),
          ...(mp === 'protein' || mp === 'carbs' || mp === 'fat' ? { macroPrincipal: mp } : {}),
        };
      });
    return { id: uid(), name, time: /^\d{1,2}:\d{2}$/.test(m.time ?? '') ? m.time!.padStart(5, '0') : '12:00', day: inferDay(m.day, role), role, items };
  });

  const known = Object.fromEntries(aisGroupA(weightKg).map((s) => [s.id, s]));
  const supplements: Supplement[] = (json.supplements ?? []).map((s) => {
    const n = (s.name ?? '').toLowerCase();
    const id = /creat/.test(n)
      ? 'creatina'
      : /cafe/.test(n)
        ? 'cafeina'
        : /beta/.test(n)
          ? 'beta-alanina'
          : /bicarb/.test(n)
            ? 'bicarbonato'
            : /nitra|remolacha/.test(n)
              ? 'nitrato'
              : uid();
    const ref = known[id];
    return {
      id,
      name: s.name || ref?.name || 'Suplemento',
      dose: s.dose || ref?.dose || '',
      timing: s.timing || ref?.timing || '',
      evidence: ref?.evidence ?? 'EVIDENCIA CITADA POR IA',
      doi: (s.evidenceDOI || ref?.doi || '').replace(/^https?:\/\/(dx\.)?doi\.org\//, ''),
      enabled: true,
    };
  });

  return {
    ...base,
    profile: {
      ...base.profile,
      name: json.athleteName?.trim() || base.profile.name,
      discipline: /cross|hyrox|h[ií]brid|funcional|wod/i.test(json.sportType ?? '') ? 'hybrid' : json.sportType ? 'bodybuilding' : base.profile.discipline,
      sex: pr.sex === 'F' ? 'F' : pr.sex === 'M' ? 'M' : base.profile.sex,
      age: num(pr.age, base.profile.age),
      heightCm: num(pr.heightCm, base.profile.heightCm),
      weightKg,
      bodyFatPct: num(pr.bodyFatPct, base.profile.bodyFatPct),
      phase: phases.includes(pr.phase as Phase) ? (pr.phase as Phase) : base.profile.phase,
      trainingDaysPerWeek: Math.min(7, num(pr.trainingDaysPerWeek, base.profile.trainingDaysPerWeek)),
      sessionKcal: num(pr.sessionKcal, base.profile.sessionKcal),
      activityFactor: num(pr.activityFactor, base.profile.activityFactor),
    },
    periodization: {
      ...base.periodization,
      on: toGkg(json.macrosOn, base.periodization.on),
      off: toGkg(json.macrosOff, base.periodization.off),
    },
    meals: meals.length ? meals : base.meals,
    supplements: supplements.length ? supplements : aisGroupA(weightKg),
    coachNote: json.coachNote?.trim() || base.coachNote,
  };
}

// ---------- PRUEBA DE CONEXIÓN ----------

export type PingResult =
  | { ok: true; latencyMs: number; model: string }
  | { ok: false; kind: 'auth' | 'quota' | 'model' | 'network' | 'other'; message: string };

function classify(status: number, message: string): PingResult {
  if (status === 401 || status === 403 || /api[_ ]?key|invalid.*key|unauthori[sz]ed/i.test(message)) return { ok: false, kind: 'auth', message };
  if (status === 429 || /quota|rate/i.test(message)) return { ok: false, kind: 'quota', message };
  if (status === 404) return { ok: false, kind: 'model', message };
  return { ok: false, kind: 'other', message };
}

/**
 * Ping mínimo sin consumir tokens: consulta la ficha del modelo seleccionado.
 * Valida la API key, el acceso al modelo y mide la latencia ida y vuelta.
 */
export async function pingProvider(ai: AiSettings): Promise<PingResult> {
  if (!ai.apiKey.trim()) return { ok: false, kind: 'auth', message: 'Falta la API key.' };
  const t0 = performance.now();
  const done = (): PingResult => ({ ok: true, latencyMs: Math.round(performance.now() - t0), model: ai.model });
  try {
    if (ai.provider === 'claude') {
      const client = new Anthropic({ apiKey: ai.apiKey, dangerouslyAllowBrowser: true, maxRetries: 0, timeout: 15000 });
      try {
        await client.models.retrieve(ai.model);
        return done();
      } catch (e) {
        if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return { ok: false, kind: 'auth', message: e.message };
        if (e instanceof Anthropic.RateLimitError) return { ok: false, kind: 'quota', message: e.message };
        if (e instanceof Anthropic.NotFoundError) return { ok: false, kind: 'model', message: e.message };
        if (e instanceof Anthropic.APIConnectionError) return { ok: false, kind: 'network', message: e.message };
        if (e instanceof Anthropic.APIError) return classify(e.status ?? 0, e.message);
        throw e;
      }
    }
    const res =
      ai.provider === 'gemini'
        ? await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(ai.model)}?key=${encodeURIComponent(ai.apiKey)}`)
        : await fetch(`https://api.openai.com/v1/models/${encodeURIComponent(ai.model)}`, { headers: { Authorization: `Bearer ${ai.apiKey}` } });
    if (res.ok) return done();
    const body = await res.json().catch(() => ({}));
    return classify(res.status, body?.error?.message || `HTTP ${res.status}`);
  } catch (e) {
    return { ok: false, kind: 'network', message: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Migra la configuración guardada en localStorage: un modelo de Gemini que ya no está en la lista
 * vigente (Google lo retiró → "is no longer available") pasa al default actual.
 */
export function migrateModel(provider: AiProvider, model: string): string {
  if (provider === 'gemini' && !MODEL_OPTIONS.gemini.some((m) => m.id === model)) return MODEL_OPTIONS.gemini[0].id;
  return model;
}
