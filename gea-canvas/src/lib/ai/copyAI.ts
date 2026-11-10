/**
 * Copys en vivo con Google Gemini (opcional). Se llama directo desde el navegador con la API key
 * del usuario: la app es un export estático sin backend, así que la key queda solo en este dispositivo.
 * SDK oficial @google/genai (se carga recién al generar) con salida estructurada por JSON Schema.
 */
import type { CopyPiece, FormatKey, PillarKey, ToneKey } from '@/lib/types';
import { PILLARS } from '@/data/library';
import { CTAS, HOOKS, OBJECTIVES, OCCASIONS, TONES, type OccasionId } from '@/lib/copy/bank';
import { useAi } from './settings';

export interface AiCopyRequest {
  pillar: PillarKey;
  tone: ToneKey;
  format: FormatKey | 'carousel';
  objectiveId?: string;
  occasion?: OccasionId;
  /** Ganchos ya usados (para no repetir en la grilla semanal). */
  avoid?: string[];
}

/**
 * Los 4 campos del post, exactos: objetivo, idea visual, copy (gancho + cuerpo + CTA) y hashtags.
 * Gemini valida la respuesta contra este esquema (subset de JSON Schema que admite responseJsonSchema).
 */
const SCHEMA = {
  type: 'object',
  properties: {
    objetivo: { type: 'string', description: 'Objetivo del post en una frase corta (ej. "Posicionar el pernocte").' },
    ideaVisual: {
      type: 'string',
      description: 'Dirección visual o de video: toma, luz, ritmo y encuadre, en 2 o 3 oraciones. Sin rostros identificables.',
    },
    copy: {
      type: 'object',
      properties: {
        gancho: { type: 'string', description: 'Gancho inicial, máximo 12 palabras.' },
        cuerpo: { type: 'string', description: 'Cuerpo persuasivo, 2 o 3 oraciones cortas.' },
        cta: { type: 'string', description: 'Llamado a la acción directo: sin reservas previas, consultas por DM.' },
      },
      required: ['gancho', 'cuerpo', 'cta'],
      propertyOrdering: ['gancho', 'cuerpo', 'cta'],
    },
    hashtags: {
      type: 'array',
      items: { type: 'string', description: 'Hashtag que empieza con #, sin espacios.' },
      minItems: 5,
      maxItems: 8,
    },
  },
  required: ['objetivo', 'ideaVisual', 'copy', 'hashtags'],
  propertyOrdering: ['objetivo', 'ideaVisual', 'copy', 'hashtags'],
};

interface Out {
  objetivo: string;
  ideaVisual: string;
  copy: { gancho: string; cuerpo: string; cta: string };
  hashtags: string[];
}

const FORMAT_NAME: Record<AiCopyRequest['format'], string> = {
  story: 'Story (9:16, 1080×1920)',
  reel: 'Reel (video vertical 9:16)',
  feed45: 'Post de feed 4:5',
  feed11: 'Post de feed 1:1',
  carousel: 'Carrusel de feed 4:5 (3 slides)',
};

/** Instrucción de sistema: marca, voz, reglas y ejemplos del banco de copys. */
function systemInstruction() {
  const example = (pillar: PillarKey) => {
    const o = OBJECTIVES.find((x) => x.pillar === pillar)!;
    return `- Pilar ${PILLARS[pillar].name} · objetivo "${o.name}"\n  Gancho: ${HOOKS[pillar].sugerente[0]}\n  Cuerpo: ${o.bodies[0]}\n  CTA: ${CTAS.complice[0]}`;
  };
  return `Sos el copywriter de Hotel GEA (GEA Suites), un hotel alojamiento / albergue transitorio de alta gama para parejas en San Miguel de Tucumán, Argentina. Escribís piezas para su Instagram.

LA MARCA
- Abierto las 24 horas, los 365 días. Turnos estándar, turnos extendidos y pernoctes. No se reserva: se llega y se atiende; las consultas van por mensaje directo (DM).
- Propuesta: privacidad absoluta (cochera e ingreso discretos), higiene impecable, diseño de vanguardia con iluminación neón, confort premium (jacuzzi, amenities), carta de tragos y snackería rápida de calidad servida a la habitación.
- Público: parejas adultas que buscan romper la rutina, intimidad, confort y discreción total.

VOZ
- Sofisticada, sugerente, moderna, discreta y cómplice. Insinúa, nunca describe. El lector completa la imagen.
- Español rioplatense con voseo (vos, llegás, elegí). Frases cortas que se leen bien en el celular.
- Prohibido: lenguaje vulgar o explícito, referencias sexuales directas, clichés anticuados ("nidito de amor", "pasión desenfrenada", "noche de lujuria"), doble sentido burdo, signos de exclamación en serie, más de un emoji por pieza.
- No inventes precios, promociones, horarios ni servicios que no estén en esta descripción o en el pedido.
- La idea visual nunca muestra rostros identificables, patentes ni datos de clientes, y deja libres las zonas que tapa la interfaz de Instagram (arriba y abajo en Stories y Reels, columna derecha en Reels).

PILARES DE CONTENIDO
${(Object.keys(PILLARS) as PillarKey[]).map((p) => `- ${PILLARS[p].name}: ${PILLARS[p].desc}`).join('\n')}

HASHTAGS
- Entre 5 y 8. Siempre #HotelGEA y #GEASuites. Sumá locales (#Tucumán, #SanMiguelDeTucumán, #TucumánDeNoche) y temáticos discretos. Nada explícito.

EJEMPLOS DEL TONO (referencia, no los copies)
${example('experiencia')}
${example('calidad')}`;
}

function userPrompt(r: AiCopyRequest) {
  const obj = OBJECTIVES.find((o) => o.id === r.objectiveId);
  const occ = OCCASIONS.find((o) => o.id === r.occasion);
  return [
    `Armá una pieza para ${FORMAT_NAME[r.format]}.`,
    `Pilar: ${PILLARS[r.pillar].name} (${PILLARS[r.pillar].desc})`,
    `Tono: ${TONES[r.tone].name} — ${TONES[r.tone].desc}`,
    obj ? `Objetivo: ${obj.name}.` : 'Objetivo: elegilo vos dentro del pilar.',
    occ && occ.id !== 'none' ? `Ocasión / guiño de calendario: ${occ.name}.` : '',
    r.avoid?.length ? `No repitas estos ganchos ya usados esta semana: ${r.avoid.map((h) => `"${h}"`).join('; ')}.` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Valida y lleva la respuesta al modelo interno de la app (CopyPiece). */
function toPiece(o: Out, r: AiCopyRequest): CopyPiece {
  const c = o?.copy;
  if (!o?.objetivo || !o.ideaVisual || !c?.gancho || !c.cuerpo || !c.cta) throw new Error('Gemini devolvió una pieza incompleta. Probá de nuevo.');
  let tags = (o.hashtags ?? []).map((t) => '#' + String(t).replace(/^#+/, '').replace(/\s+/g, '')).filter((t) => t.length > 1);
  for (const must of ['#GEASuites', '#HotelGEA']) if (!tags.some((t) => t.toLowerCase() === must.toLowerCase())) tags.unshift(must);
  tags = [...new Set(tags)].slice(0, 8);
  for (const extra of ['#Tucumán', '#TucumánDeNoche', '#SanMiguelDeTucumán']) if (tags.length < 5 && !tags.includes(extra)) tags.push(extra);
  return {
    objective: o.objetivo.trim(),
    visual: o.ideaVisual.trim(),
    hook: c.gancho.trim(),
    body: c.cuerpo.trim(),
    cta: c.cta.trim(),
    hashtags: tags,
    pillar: r.pillar,
    tone: r.tone,
    format: r.format,
  };
}

async function client(apiKey: string) {
  const { GoogleGenAI } = await import('@google/genai');
  return new GoogleGenAI({ apiKey });
}

/** Traduce los errores de la API de Gemini a un mensaje listo para mostrar. */
async function friendly(e: unknown, model: string): Promise<Error> {
  const { ApiError } = await import('@google/genai');
  if (e instanceof ApiError) {
    const msg = e.message ?? '';
    if (e.status === 400 && /api key|API_KEY/i.test(msg)) return new Error('La API key de Google Gemini no es válida.');
    if (e.status === 401 || e.status === 403) return new Error('La API key no tiene permiso para usar la API de Gemini (revisá que la API esté habilitada en el proyecto de Google Cloud).');
    if (e.status === 404) return new Error(`El modelo "${model}" no está disponible para esta key.`);
    if (e.status === 429) return new Error('Se alcanzó la cuota o el límite de uso de Gemini. Esperá un minuto o revisá la facturación del proyecto.');
    if (e.status >= 500) return new Error('La API de Gemini no responde en este momento. Probá de nuevo en unos minutos.');
    return new Error(`Error de la API de Gemini (${e.status}): ${msg.slice(0, 160)}`);
  }
  if (e instanceof TypeError) return new Error('No hay conexión con la API de Gemini.');
  return e instanceof Error ? e : new Error(String(e));
}

/** Genera una pieza con Gemini. Lanza Error con un mensaje listo para mostrar. */
export async function generateCopyAI(r: AiCopyRequest): Promise<CopyPiece> {
  const { geminiKey, geminiModel } = useAi.getState();
  const ai = await client(geminiKey.trim());
  try {
    const res = await ai.models.generateContent({
      model: geminiModel,
      contents: userPrompt(r),
      config: {
        systemInstruction: systemInstruction(),
        responseMimeType: 'application/json',
        responseJsonSchema: SCHEMA,
        temperature: 0.9,
      },
    });
    if (res.promptFeedback?.blockReason) throw new Error('Gemini bloqueó el pedido por sus filtros de seguridad. Probá con otro objetivo o tono.');
    const finish = res.candidates?.[0]?.finishReason;
    if (finish === 'SAFETY' || finish === 'PROHIBITED_CONTENT' || finish === 'BLOCKLIST') throw new Error('Gemini no quiso escribir esta pieza por sus filtros de seguridad. Probá con otro objetivo o tono.');
    if (finish === 'MAX_TOKENS') throw new Error('La respuesta de Gemini se cortó antes de terminar. Probá de nuevo.');
    const text = res.text;
    if (!text) throw new Error('Gemini no devolvió contenido.');
    let parsed: Out;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('Gemini no devolvió el formato esperado.');
    }
    return toPiece(parsed, r);
  } catch (e) {
    throw await friendly(e, geminiModel);
  }
}

/**
 * Ping a la API de Gemini con la key ingresada: consulta la ficha del modelo elegido (no genera texto,
 * no consume tokens). Confirma a la vez que la key es válida y que el modelo está disponible.
 */
export async function pingGemini(apiKey: string, model: string) {
  const ai = await client(apiKey.trim());
  try {
    const m = await ai.models.get({ model });
    return m.displayName ?? model;
  } catch (e) {
    throw await friendly(e, model);
  }
}
