export type Sex = 'M' | 'F';
export type Discipline = 'bodybuilding' | 'hybrid';
export type Phase = 'recomp' | 'maintenance' | 'surplus';
export type BmrFormula = 'katch' | 'mifflin';
export type PrecisionMode = 'quick' | 'isak';
/** Pliegues ISAK usados por Jackson-Pollock 7 (mm). */
export type SkinfoldSite = 'triceps' | 'subscapular' | 'chest' | 'midaxillary' | 'suprailiac' | 'abdominal' | 'thigh';
export type Skinfolds = Record<SkinfoldSite, number>;
export type DayMode = 'on' | 'off';
export type MealDay = 'on' | 'off' | 'both';
export type MealRole = 'breakfast' | 'lunch' | 'peri' | 'post' | 'snack' | 'dinner';

export interface Macros {
  p: number;
  c: number;
  f: number;
}

export interface Profile {
  name: string;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  bodyFatPct: number;
  /** Rápida: % graso por banda visual + gasto inferido. ISAK: pliegues / FFM medidos. */
  precisionMode: PrecisionMode;
  /** Banda visual elegida en modo rápido (id de BODY_FAT_BANDS). */
  bodyFatBand: string | null;
  skinfolds: Skinfolds;
  /** FFM medida (DEXA / bioimpedancia) en kg. 0 = derivar del % graso. */
  measuredFfmKg: number;
  discipline: Discipline;
  phase: Phase;
  bmrFormula: BmrFormula;
  /** Multiplicador NEAT sin ejercicio estructurado (1.2 sedentario → 1.6 muy activo). */
  activityFactor: number;
  /** Gasto energético neto de la sesión de entrenamiento (kcal) en día ON. */
  sessionKcal: number;
  trainingDaysPerWeek: number;
  /** Hora de inicio de la sesión (HH:MM) para el dial peri-entreno de 24 h. */
  trainingTime: string;
  /** Días de la semana con sesión (0 = domingo … 6 = sábado). Define el ON / OFF automático de la app. */
  trainingWeekdays?: number[];
  sessionMinutes: number;
  notes: string;
}

export interface Periodization {
  /** Macros en g/kg de peso corporal. */
  on: Macros;
  off: Macros;
  refeed: { enabled: boolean; hours: 48 | 72; carbsGkg: number };
  dietBreak: { enabled: boolean; days: number };
}

export interface FoodItem {
  id: string;
  /** Referencia a la base local (habilita Smart Swaps). Vacío = alimento libre de la IA. */
  foodId?: string;
  food: string;
  grams: number;
  p: number;
  c: number;
  f: number;
  leucine: number;
  /** Macro que define la equivalencia de un alimento libre (lo declara la IA o se infiere). */
  macroPrincipal?: 'protein' | 'carbs' | 'fat';
}

/** Opción culinaria de una comida: plato real con su desglose de ingredientes y técnica. */
export interface MealOption {
  /** Nombre del plato (ej. "Bife de cuadril a la plancha con arroz primavera y ensalada verde"). */
  title: string;
  items: FoodItem[];
  /** Técnica de cocción rápida y condimentos sugeridos. */
  technique?: string;
  /** Preparación paso a paso en lenguaje simple (vacío = se arma sola desde los ingredientes). */
  steps?: string[];
}

/** Máximo de opciones culinarias por comida (Opción 1 + 4 alternativas). */
export const MAX_OPTIONS = 5;

export interface Meal {
  id: string;
  name: string;
  time: string;
  day: MealDay;
  role: MealRole;
  /** Opción 1 · sugerida: los items son su desglose de ingredientes. */
  items: FoodItem[];
  title?: string;
  technique?: string;
  steps?: string[];
  /** Opciones 2 a 5 · alternativas equivalentes en macros. */
  alts?: MealOption[];
}

export interface Supplement {
  id: string;
  name: string;
  dose: string;
  timing: string;
  evidence: string;
  doi: string;
  enabled: boolean;
}

export type MealSlot = 'breakfast' | 'lunch' | 'peri' | 'post' | 'dinner';
export type Budget = 'low' | 'mid' | 'high';
export type CookingLevel = 'quick' | 'batch' | 'gourmet';
export type Fasting = 'none' | '16-8' | '14-10' | 'circadian';
export type AnxietyZone = 'morning' | 'afternoon' | 'night';
export type SeasonPhase = 'pre' | 'comp' | 'peak' | 'rest';

/** Anamnesis Pro & Lifestyle: perfil 360° del atleta que se inyecta en el Prompt Engine. */
export interface Anamnesis {
  wakeTime: string;
  bedTime: string;
  /** true = horarios de comida derivados de la franja de entreno; false = horarios cargados por el coach. */
  mealTimesAuto: boolean;
  mealTimes: Record<MealSlot, string>;
  /** Ingestas desactivadas (ej. no come Pre-WOD): sus kcal y macros se redistribuyen en las restantes. */
  disabledSlots: MealSlot[];
  fasting: Fasting;
  /** Franja crítica de ansiedad: ahí se ubican los snacks tácticos. */
  anxiety: AnxietyZone;
  conditions: string[];
  allergies: string[];
  favorites: string;
  aversions: string;
  snacks: string[];
  budget: Budget;
  cooking: CookingLevel;
  /** Deportes (ids del catálogo o nombres personalizados). */
  sports: string[];
  /** Objetivo nutricional deportivo (id). */
  goal: string;
  season: SeasonPhase;
  /**
   * Canasta de alimentos permitidos: ids de la Food & Brand DB tildados para este atleta.
   * null = sin canasta (la IA usa todo lo habilitado).
   */
  basket: string[] | null;
}

export interface AthletePlan {
  version: 1;
  /** Id estable del atleta en la base local (roster). */
  id: string;
  /** URL pública de su PWA (GitHub Pages) para compartir por WhatsApp. */
  publicUrl: string;
  /** Metas de hidratación diarias en ml. */
  hydration: { onMl: number; offMl: number };
  profile: Profile;
  periodization: Periodization;
  meals: Meal[];
  supplements: Supplement[];
  coachNote: string;
  /** Anamnesis Pro (lifestyle, cronobiología, clínica y gastronomía). */
  anamnesis?: Anamnesis;
  updatedAt: number;
}

export type AiProvider = 'claude' | 'gemini' | 'openai';

export interface AiSettings {
  provider: AiProvider;
  model: string;
  apiKey: string;
}
