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
}

export interface Meal {
  id: string;
  name: string;
  time: string;
  day: MealDay;
  role: MealRole;
  items: FoodItem[];
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
  updatedAt: number;
}

export type AiProvider = 'claude' | 'gemini' | 'openai';

export interface AiSettings {
  provider: AiProvider;
  model: string;
  apiKey: string;
}
