/** IA · configuración: proveedores, modelos, tipos del generador y etiquetas de la interfaz. */
import { type GeminiModel } from '../geminiModels'
import type { QuoteIntent } from '../quoteIntent'

export type AiProvider = 'openai' | 'anthropic' | 'gemini'
export type Discipline = 'general' | 'sports' | 'crossfit'
export type GenMode = 'auto' | 'single' | 'stories' | 'carousel'

export interface AiSettings {
  provider: AiProvider
  keys: Record<AiProvider, string>
  models: Record<AiProvider, string>
  /** Modelos de Gemini detectados con ListModels para la key guardada */
  geminiModels?: GeminiModel[]
  geminiCheckedAt?: number
}

export const MODEL_OPTIONS: Record<AiProvider, { id: string; label: string }[]> = {
  openai: [
    { id: 'gpt-4o-mini', label: 'GPT-4o mini · rápido y barato' },
    { id: 'gpt-4o', label: 'GPT-4o · más calidad' },
  ],
  anthropic: [
    { id: 'claude-sonnet-5', label: 'Claude Sonnet 5 · equilibrio' },
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 · rápido' },
    { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 · máxima calidad' },
  ],
  gemini: [
    { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash · recomendado' },
  ],
}

/** Modelo de Gemini por defecto hasta detectar los habilitados para la key (ListModels). */
export const GEMINI_DEFAULT_MODEL = 'gemini-3.8-flash'
export const PROVIDER_LABEL: Record<AiProvider, string> = { openai: 'OpenAI', anthropic: 'Anthropic', gemini: 'Gemini' }
export const KEY_PLACEHOLDER: Record<AiProvider, string> = { openai: 'sk-...', anthropic: 'sk-ant-...', gemini: 'AIzaSy...' }

export const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: 'openai',
  keys: { openai: '', anthropic: '', gemini: '' },
  models: { openai: 'gpt-4o-mini', anthropic: 'claude-sonnet-5', gemini: GEMINI_DEFAULT_MODEL },
}

export const MODE_LABEL: Record<GenMode, string> = {
  auto: 'Auto / IA decide',
  single: '1 Placa',
  stories: 'Historias (3)',
  carousel: 'Carrusel (4-5)',
}

export const DISCIPLINE_LABEL: Record<Exclude<Discipline, 'general'>, string> = {
  sports: 'SPORTS & BODYBUILDING',
  crossfit: 'CROSSFIT & HYROX',
}

// ---------------------------------------------------------------------------
// Director editorial: tipo de entrada, objetivo y formato automático.

/** Concepto rápido (keywords) o brief libre (instrucciones completas). */
export type InputMode = 'concept' | 'brief'
export type EditorialGoal = 'auto' | 'sales' | 'science' | 'mindset'
export type ResolvedGoal = Exclude<EditorialGoal, 'auto'>

export interface EditorialOptions {
  inputMode: InputMode
  goal: EditorialGoal
  /** Tono / enfoque estratégico (por defecto viral) */
  tone?: EditorialTone
  /** Pilar del calendario de contenido (LUN ciencia · MIÉ rutina · VIE mindset): fija plantilla y formato */
  pillar?: 'science' | 'workout' | 'mindset'
  /** Cita célebre detectada (figura icónica nombrada) o forzada con [ ❝ CITA CÉLEBRE ]: plantilla 14 obligatoria */
  quote?: QuoteIntent | null
}

/** Tono editorial: viral / contrarian (por defecto) o académico / paper. */
export type EditorialTone = 'viral' | 'academic'

export const TONE_LABEL: Record<EditorialTone, string> = {
  viral: '⚡ Viral / Contrarian',
  academic: '🔬 Académico / Paper',
}


export const GOAL_LABEL: Record<EditorialGoal, string> = {
  auto: 'Auto / Detectar',
  sales: 'Venta / Servicios',
  science: 'Ciencia / Técnico',
  mindset: 'Mindset / Táctico',
}

export type StatusFn = (message: string | null) => void

export type ModelChangeFn = (model: string, detected: GeminiModel[]) => void