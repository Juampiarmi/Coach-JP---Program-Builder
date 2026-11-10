/**
 * Copys en vivo con IA (opcional). Llama directo desde el navegador con la API key del usuario:
 * la app es un export estático sin backend, así que la key queda solo en este dispositivo.
 * Claude: SDK oficial @anthropic-ai/sdk (cargado bajo demanda) con salida estructurada JSON.
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
  /** Hooks ya usados (para no repetir en la grilla semanal). */
  avoid?: string[];
}

const SCHEMA = {
  type: 'object',
  properties: {
    objective: { type: 'string', description: 'Objetivo del post en una frase corta (ej. "Posicionar el pernocte").' },
    visual: { type: 'string', description: 'Dirección visual / de video: toma, luz, ritmo, encuadre. 2 a 3 oraciones.' },
    hook: { type: 'string', description: 'Gancho inicial, máximo 12 palabras.' },
    body: { type: 'string', description: 'Cuerpo persuasivo, 2 a 3 oraciones cortas.' },
    cta: { type: 'string', description: 'Llamado a la acción directo: sin reservas previas, consultas por DM.' },
    hashtags: { type: 'array', items: { type: 'string' }, description: 'Entre 5 y 8 hashtags, cada uno empieza con #.' },
  },
  required: ['objective', 'visual', 'hook', 'body', 'cta', 'hashtags'],
  additionalProperties: false,
} as const;

const FORMAT_NAME: Record<AiCopyRequest['format'], string> = {
  story: 'Story (9:16, 1080×1920)',
  reel: 'Reel (video vertical 9:16)',
  feed45: 'Post de feed 4:5',
  feed11: 'Post de feed 1:1',
  carousel: 'Carrusel de feed 4:5 (3 slides)',
};

/** Prompt de sistema estable (sirve de prefijo cacheable): marca, voz, reglas y ejemplos del banco. */
function systemPrompt() {
  const example = (pillar: PillarKey) => {
    const o = OBJECTIVES.find((x) => x.pillar === pillar)!;
    return `- Pilar ${PILLARS[pillar].name} · objetivo "${o.name}"\n  Hook: ${HOOKS[pillar].sugerente[0]}\n  Cuerpo: ${o.bodies[0]}\n  CTA: ${CTAS.complice[0]}`;
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
- La dirección visual nunca muestra rostros identificables, patentes ni datos de clientes. Respeta las zonas que tapa la interfaz de Instagram (arriba y abajo en Stories y Reels, columna derecha en Reels).

PILARES DE CONTENIDO
${(Object.keys(PILLARS) as PillarKey[]).map((p) => `- ${PILLARS[p].name}: ${PILLARS[p].desc}`).join('\n')}

HASHTAGS
- Entre 5 y 8. Siempre #HotelGEA y #GEASuites. Sumá locales (#Tucumán, #SanMiguelDeTucumán, #TucumánDeNoche) y temáticos discretos. Nada explícito.

EJEMPLOS DEL TONO (referencia, no los copies)
${example('experiencia')}
${example('calidad')}

Respondé solo con el objeto JSON pedido.`;
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

type Out = { objective: string; visual: string; hook: string; body: string; cta: string; hashtags: string[] };

function normalize(o: Out, r: AiCopyRequest): CopyPiece {
  let tags = (o.hashtags ?? [])
    .map((t) => '#' + t.replace(/^#+/, '').replace(/\s+/g, ''))
    .filter((t) => t.length > 1);
  for (const must of ['#GEASuites', '#HotelGEA']) if (!tags.some((t) => t.toLowerCase() === must.toLowerCase())) tags.unshift(must);
  tags = [...new Set(tags)].slice(0, 8);
  for (const extra of ['#Tucumán', '#TucumánDeNoche', '#SanMiguelDeTucumán']) if (tags.length < 5 && !tags.includes(extra)) tags.push(extra);
  return { objective: o.objective, visual: o.visual, hook: o.hook, body: o.body, cta: o.cta, hashtags: tags, pillar: r.pillar, tone: r.tone, format: r.format };
}

/** Modelos que aceptan el fallback del lado del servidor ante una negativa (beta server-side-fallback). */
const FALLBACK_MODELS = ['claude-fable-5-2', 'claude-fable-5-1', 'claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5'];

async function viaClaude(r: AiCopyRequest, apiKey: string, model: string): Promise<CopyPiece> {
  const [{ default: Anthropic }, { jsonSchemaOutputFormat }] = await Promise.all([
    import('@anthropic-ai/sdk'),
    import('@anthropic-ai/sdk/helpers/json-schema'),
  ]);
  // Llamada directa desde el navegador: la app no tiene servidor y la key es del propio usuario.
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 2 });
  const withFallback = FALLBACK_MODELS.includes(model);
  try {
    const res = await client.beta.messages.parse({
      model,
      max_tokens: 16000,
      system: [{ type: 'text', text: systemPrompt(), cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userPrompt(r) }],
      output_config: { effort: 'medium', format: jsonSchemaOutputFormat(SCHEMA) },
      ...(withFallback ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
    });
    if (res.stop_reason === 'refusal') throw new Error('El modelo no quiso escribir esta pieza. Probá con otro objetivo o tono.');
    if (res.stop_reason === 'max_tokens') throw new Error('La respuesta se cortó antes de terminar. Probá de nuevo.');
    if (!res.parsed_output) throw new Error('La IA no devolvió el formato esperado.');
    return normalize(res.parsed_output as Out, r);
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new Error('La API key de Anthropic no es válida.');
    if (e instanceof Anthropic.PermissionDeniedError) throw new Error('La API key no tiene permiso para usar este modelo.');
    if (e instanceof Anthropic.NotFoundError) throw new Error(`El modelo "${model}" no existe o no está disponible para tu cuenta.`);
    if (e instanceof Anthropic.RateLimitError) throw new Error('Se alcanzó el límite de uso de la API. Esperá un minuto.');
    if (e instanceof Anthropic.APIConnectionError) throw new Error('No hay conexión con la API de Anthropic.');
    if (e instanceof Anthropic.APIError) throw new Error(`Error de la API de Anthropic (${e.status ?? '?'}): ${e.message}`);
    throw e;
  }
}

async function viaOpenAI(r: AiCopyRequest, apiKey: string, model: string): Promise<CopyPiece> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt() },
        { role: 'user', content: userPrompt(r) },
      ],
      response_format: { type: 'json_schema', json_schema: { name: 'gea_copy', strict: true, schema: SCHEMA } },
    }),
  }).catch(() => {
    throw new Error('No hay conexión con la API de OpenAI.');
  });
  if (res.status === 401) throw new Error('La API key de OpenAI no es válida.');
  if (res.status === 429) throw new Error('Se alcanzó el límite de uso de la API de OpenAI.');
  if (!res.ok) throw new Error(`Error de la API de OpenAI (${res.status}).`);
  const data = await res.json();
  const msg = data?.choices?.[0]?.message;
  if (msg?.refusal) throw new Error('El modelo no quiso escribir esta pieza.');
  return normalize(JSON.parse(msg?.content ?? '{}') as Out, r);
}

/** Genera una pieza con el proveedor configurado. Lanza Error con un mensaje listo para mostrar. */
export function generateCopyAI(r: AiCopyRequest): Promise<CopyPiece> {
  const s = useAi.getState();
  if (s.provider === 'anthropic') return viaClaude(r, s.anthropicKey.trim(), s.anthropicModel.trim() || 'claude-opus-5-5');
  return viaOpenAI(r, s.openaiKey.trim(), s.openaiModel.trim());
}

/** Prueba rápida de conexión desde Configuración. */
export async function testAI() {
  const p = await generateCopyAI({ pillar: 'claridad', tone: 'directo', format: 'story' });
  return p.hook;
}
