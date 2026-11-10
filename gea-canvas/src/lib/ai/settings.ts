'use client';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type AiProvider = 'anthropic' | 'openai';

/**
 * Configuración de IA. Se guarda aparte de los proyectos (clave propia en localStorage) para que la
 * API key nunca viaje en los respaldos JSON.
 */
interface AiSettings {
  provider: AiProvider;
  anthropicKey: string;
  anthropicModel: string;
  openaiKey: string;
  openaiModel: string;
  /** Usar IA por defecto en el Módulo B cuando hay key. */
  enabled: boolean;
  set: (p: Partial<Omit<AiSettings, 'set'>>) => void;
}

export const DEFAULT_ANTHROPIC_MODEL = 'claude-opus-5-5';

export const useAi = create<AiSettings>()(
  persist(
    (set) => ({
      provider: 'anthropic',
      anthropicKey: '',
      anthropicModel: DEFAULT_ANTHROPIC_MODEL,
      openaiKey: '',
      openaiModel: '',
      enabled: true,
      set: (p) => set(p),
    }),
    { name: 'gea-canvas:ai', storage: createJSONStorage(() => localStorage) },
  ),
);

/** ¿Hay un proveedor listo para usar? */
export function aiReady(s: Pick<AiSettings, 'provider' | 'anthropicKey' | 'openaiKey' | 'openaiModel' | 'anthropicModel'>) {
  return s.provider === 'anthropic' ? !!s.anthropicKey.trim() && !!s.anthropicModel.trim() : !!s.openaiKey.trim() && !!s.openaiModel.trim();
}
