'use client';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', hint: 'Rápido y económico. Recomendado para el día a día.' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', hint: 'Más elaborado, más lento y más caro por pieza.' },
] as const;

export type GeminiModel = (typeof GEMINI_MODELS)[number]['id'];
export const DEFAULT_GEMINI_MODEL: GeminiModel = 'gemini-2.5-flash';

/**
 * Configuración de IA (Google Gemini). Se guarda aparte de los proyectos, con clave propia en
 * localStorage, para que la API key nunca viaje en los respaldos JSON.
 */
interface AiSettings {
  geminiKey: string;
  geminiModel: GeminiModel;
  /** Usar IA por defecto en el Módulo B cuando hay key. */
  enabled: boolean;
  set: (p: Partial<Omit<AiSettings, 'set'>>) => void;
}

const STORAGE = 'gea-canvas:ai-gemini';

// La versión anterior guardaba keys de Anthropic/OpenAI en "gea-canvas:ai": se borran para no dejarlas olvidadas.
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('gea-canvas:ai');
  } catch {
    /* almacenamiento bloqueado */
  }
}

export const useAi = create<AiSettings>()(
  persist(
    (set) => ({
      geminiKey: '',
      geminiModel: DEFAULT_GEMINI_MODEL,
      enabled: true,
      set: (p) => set(p),
    }),
    {
      name: STORAGE,
      storage: createJSONStorage(() => localStorage),
      // si quedó guardado un modelo que ya no está en la lista, vuelve al de por defecto
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AiSettings>;
        const model = GEMINI_MODELS.some((m) => m.id === p.geminiModel) ? p.geminiModel! : DEFAULT_GEMINI_MODEL;
        return { ...current, ...p, geminiModel: model };
      },
    },
  ),
);

/** ¿Hay una key cargada? */
export const aiReady = (s: Pick<AiSettings, 'geminiKey'>) => s.geminiKey.trim().length > 0;
