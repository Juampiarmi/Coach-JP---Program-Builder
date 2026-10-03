import type { AiSettings } from './types';

/**
 * Cadena de respaldo de Gemini (Free Tier) ante saturación (503 "high demand") o cuota (429).
 * Se recorre a continuación del modelo activo, sin repetirlo.
 */
export const GEMINI_FALLBACKS = ['gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-flash'];

/** Espera antes de reintentar el modelo principal. */
export const GEMINI_RETRY_DELAY_MS = 1500;

/** Mensaje de la terminal al conmutar de modelo. */
export const switchNotice = (model: string) => `[ ! ] CAMBIANDO A MODELO DE RESPALDO (${model})...`;

export interface GeminiNotice {
  kind: 'retry' | 'switch';
  /** Modelo que se va a intentar a continuación. */
  model: string;
  /** Modelo que falló. */
  from: string;
  message: string;
}

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}

/** 503 / UNAVAILABLE / "high demand" / "overloaded": saturación transitoria del lado de Google. */
export function isHighDemand(status: number, message: string) {
  return status === 503 || /UNAVAILABLE|high demand|overloaded|try again later/i.test(message);
}

/** 429 / RESOURCE_EXHAUSTED / "quota exceeded": la cuota es por modelo, otro modelo puede responder. */
export function isQuotaExceeded(status: number, message: string) {
  return status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(message);
}

/** El modelo no existe o ya no está habilitado para esta clave: se salta al siguiente sin reintentar. */
export function isModelUnavailable(status: number, message: string) {
  return status === 404 || /no longer available|is not found|not supported for generateContent/i.test(message);
}

export interface GeminiResult {
  text: string;
  model: string;
  /** true si respondió un modelo distinto al configurado. */
  usedFallback: boolean;
}

interface Deps {
  fetchFn?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * generateContent resiliente: modelo activo → 1 reintento a los 1,5 s si hay 503 → modelos de respaldo.
 * 429 de cuota y modelos retirados (404) conmutan directo al siguiente. Autenticación y errores de
 * request se propagan de inmediato (cambiar de modelo no los arregla).
 */
export async function geminiGenerate(ai: AiSettings, body: unknown, onNotice?: (n: GeminiNotice) => void, deps: Deps = {}): Promise<GeminiResult> {
  const fetchFn = deps.fetchFn ?? fetch;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const chain = [ai.model, ...GEMINI_FALLBACKS.filter((m) => m !== ai.model)];
  let lastError = '';

  for (let i = 0; i < chain.length; i++) {
    const model = chain[i];
    const attempts = i === 0 ? 2 : 1;
    for (let a = 0; a < attempts; a++) {
      const res = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': ai.apiKey },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const text = (data?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('');
        if (!text) throw new GeminiError(`${model} no devolvió contenido (${data?.candidates?.[0]?.finishReason ?? 'sin candidatos'}).`, 200);
        return { text, model, usedFallback: model !== ai.model };
      }
      const message: string = data?.error?.message || `Gemini respondió ${res.status}`;
      lastError = `${model}: ${message}`;
      const next = chain[i + 1];
      if (isHighDemand(res.status, message)) {
        if (a < attempts - 1) {
          onNotice?.({ kind: 'retry', model, from: model, message: `[ ! ] ALTA DEMANDA EN ${model} · REINTENTANDO EN ${GEMINI_RETRY_DELAY_MS / 1000} s...` });
          await sleep(GEMINI_RETRY_DELAY_MS);
          continue;
        }
        if (next) onNotice?.({ kind: 'switch', model: next, from: model, message: `${switchNotice(next)} · ${model} saturado (503)` });
        break;
      }
      if (isQuotaExceeded(res.status, message)) {
        if (next) onNotice?.({ kind: 'switch', model: next, from: model, message: `${switchNotice(next)} · ${model} sin cuota (429)` });
        break;
      }
      if (isModelUnavailable(res.status, message)) {
        if (next) onNotice?.({ kind: 'switch', model: next, from: model, message: `${switchNotice(next)} · ${model} no disponible (404)` });
        break;
      }
      throw new GeminiError(message, res.status);
    }
  }
  throw new GeminiError(`Todos los modelos de Gemini están saturados, sin cuota o no disponibles. Reintentá en unos minutos. Último error → ${lastError}`, 503);
}
