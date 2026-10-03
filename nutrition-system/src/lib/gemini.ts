import type { AiSettings } from './types';

/**
 * Cadena de respaldo de Gemini ante saturación (HTTP 503 "high demand").
 * Sólo modelos vigentes: la familia 2.5 y 1.5 ya devuelven "no longer available" / 404.
 */
export const GEMINI_FALLBACKS = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview'];

/** Espera antes de reintentar el modelo principal. */
export const GEMINI_RETRY_DELAY_MS = 1500;

export const HIGH_DEMAND_NOTICE = '[ REINTENTANDO POR ALTA DEMANDA GLOBAL (SWITCH A MODELO BACKUP)... ]';

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
 * Los errores de autenticación, cuota o de request se propagan de inmediato (cambiar de modelo no los arregla).
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
          onNotice?.({ kind: 'retry', model, from: model, message: `${HIGH_DEMAND_NOTICE} · reintento de ${model} en ${GEMINI_RETRY_DELAY_MS / 1000} s` });
          await sleep(GEMINI_RETRY_DELAY_MS);
          continue;
        }
        if (next) onNotice?.({ kind: 'switch', model: next, from: model, message: `${HIGH_DEMAND_NOTICE} · ${model} → ${next}` });
        break;
      }
      if (isModelUnavailable(res.status, message)) {
        if (next) onNotice?.({ kind: 'switch', model: next, from: model, message: `[ ${model} NO DISPONIBLE · SWITCH A MODELO BACKUP ] · ${model} → ${next}` });
        break;
      }
      throw new GeminiError(message, res.status);
    }
  }
  throw new GeminiError(`Todos los modelos de Gemini están saturados o no disponibles. Reintentá en unos minutos. Último error → ${lastError}`, 503);
}
