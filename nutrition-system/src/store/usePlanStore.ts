'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { BODY_FAT_BANDS, EMPTY_SKINFOLDS, hydrationDefaults, jp7BodyFat, PHASE_PRESETS } from '@/lib/bioenergetics';
import { MAX_OIL_PER_MEAL_G, migrateModel } from '@/lib/ai';
import { balancePlan } from '@/lib/balance';
import { aisGroupA } from '@/lib/evidence';
import { equivalentGrams, FOOD_BY_ID, freeEquivalents, macrosFor, registerCustomFoods, round1, round2, type FoodRef } from '@/lib/foods';
import { itemFromFood, seedPlan, uid } from '@/lib/seed';
import type {
  AiSettings,
  AthletePlan,
  DayMode,
  FoodItem,
  Macros,
  Meal,
  Periodization,
  Phase,
  Profile,
  SkinfoldSite,
  Supplement,
} from '@/lib/types';

export type BuilderTab = 'intake' | 'profile' | 'periodization' | 'meals';
export type DeployTab = 'preview' | 'export' | 'story';

interface PlanState {
  plan: AthletePlan;
  /** Base local de atletas (snapshots). El activo vive en `plan` y pisa su entrada al listar. */
  roster: Record<string, AthletePlan>;
  ai: AiSettings;
  builderTab: BuilderTab;
  deployTab: DeployTab;
  previewMode: DayMode;
  intakeNotes: string;
  /** Alimentos / marcas creados por el coach (persistidos en localStorage). */
  customFoods: FoodRef[];

  addCustomFood: (food: Omit<FoodRef, 'id' | 'custom'>) => string;
  removeCustomFood: (id: string) => void;

  setBuilderTab: (t: BuilderTab) => void;
  setDeployTab: (t: DeployTab) => void;
  setPreviewMode: (m: DayMode) => void;
  setIntakeNotes: (s: string) => void;
  setAi: (a: Partial<AiSettings>) => void;

  setProfile: (p: Partial<Profile>) => void;
  selectBodyFatBand: (bandId: string) => void;
  setSkinfold: (site: SkinfoldSite, mm: number) => void;
  setMeasuredFfm: (kg: number) => void;
  applyPhasePreset: (phase: Phase) => void;
  setMacro: (day: DayMode, key: keyof Macros, value: number) => void;
  setPeriodization: (p: Partial<Periodization>) => void;
  setCoachNote: (s: string) => void;

  addMeal: (day: Meal['day']) => void;
  updateMeal: (id: string, patch: Partial<Omit<Meal, 'id' | 'items'>>) => void;
  removeMeal: (id: string) => void;
  duplicateMeal: (id: string) => void;
  addFood: (mealId: string, foodId: string, grams?: number) => void;
  setItemGrams: (mealId: string, itemId: string, grams: number) => void;
  swapItem: (mealId: string, itemId: string, foodId: string) => void;
  removeItem: (mealId: string, itemId: string) => void;
  /** Escala carbos y grasas para que cada día cierre al 100 % ± 3 % de sus metas. */
  balanceMeals: () => void;

  toggleSupplement: (id: string) => void;
  updateSupplement: (id: string, patch: Partial<Supplement>) => void;

  loadPlan: (plan: AthletePlan) => void;
  resetDemo: () => void;

  setPlanMeta: (patch: Partial<Pick<AthletePlan, 'publicUrl' | 'hydration'>>) => void;
  /** Inyecta alimentos (p. ej. del escáner de platos) en una comida existente o en una nueva. */
  injectItems: (target: { mealId: string } | { newMeal: { name: string; day: 'on' | 'off'; time: string } }, items: FoodItem[]) => void;

  newAthlete: () => void;
  /** Importa un perfil desde un backup JSON como atleta nuevo y activo. Devuelve el nombre o null si el archivo no es válido. */
  importAthlete: (raw: unknown) => string | null;
  switchAthlete: (id: string) => void;
  deleteAthlete: (id: string) => void;
}

/** Lista de atletas de la base local con el activo actualizado. */
export function listAthletes(s: Pick<PlanState, 'plan' | 'roster'>) {
  return Object.values({ ...s.roster, [s.plan.id]: s.plan }).sort((a, b) => b.updatedAt - a.updatedAt);
}

const touch = (plan: AthletePlan): AthletePlan => ({ ...plan, updatedAt: Date.now() });

function mapMeal(plan: AthletePlan, mealId: string, fn: (m: Meal) => Meal): AthletePlan {
  return touch({ ...plan, meals: plan.meals.map((m) => (m.id === mealId ? fn(m) : m)) });
}

/** Gramos equivalentes al reemplazar: por grupo si el origen está en la base, por macro principal si es libre. */
function swapGrams(item: FoodItem, toId: string) {
  if (item.foodId && FOOD_BY_ID[item.foodId]) return equivalentGrams(item.foodId, item.grams, toId);
  return freeEquivalents(item, 99).find((e) => e.food.id === toId)?.grams ?? item.grams;
}

function rescaleItem(item: FoodItem, grams: number): FoodItem {
  if (item.foodId && FOOD_BY_ID[item.foodId]) return { ...item, grams, ...macrosFor(item.foodId, grams)! };
  // Alimento libre (provisto por la IA): escala proporcional.
  const k = item.grams > 0 ? grams / item.grams : 0;
  return {
    ...item,
    grams,
    p: round1(item.p * k),
    c: round1(item.c * k),
    f: round1(item.f * k),
    leucine: round2(item.leucine * k),
  };
}

export const usePlanStore = create<PlanState>()(
  persist(
    (set, get) => ({
      plan: seedPlan(),
      roster: {},
      ai: { provider: 'claude', model: 'claude-opus-5', apiKey: '' },
      builderTab: 'profile',
      deployTab: 'preview',
      previewMode: 'on',
      intakeNotes: '',
      customFoods: [],

      addCustomFood: (food) => {
        const id = `custom-${uid()}`;
        const customFoods = [...get().customFoods, { ...food, id, custom: true }];
        registerCustomFoods(customFoods);
        set({ customFoods });
        return id;
      },
      removeCustomFood: (id) => {
        const customFoods = get().customFoods.filter((f) => f.id !== id);
        registerCustomFoods(customFoods);
        set({ customFoods });
      },

      setBuilderTab: (builderTab) => set({ builderTab }),
      setDeployTab: (deployTab) => set({ deployTab }),
      setPreviewMode: (previewMode) => set({ previewMode }),
      setIntakeNotes: (intakeNotes) => set({ intakeNotes }),
      setAi: (a) => set((s) => ({ ai: { ...s.ai, ...a } })),

      setProfile: (p) =>
        set((s) => {
          const profile = { ...s.plan.profile, ...p };
          if (p.sex && p.sex !== s.plan.profile.sex && profile.precisionMode === 'quick' && profile.bodyFatBand) {
            const band = BODY_FAT_BANDS[p.sex].find((b) => b.id === profile.bodyFatBand);
            if (band) profile.bodyFatPct = band.pct;
          }
          let supplements = s.plan.supplements;
          if (p.weightKg && p.weightKg !== s.plan.profile.weightKg) {
            const fresh = Object.fromEntries(aisGroupA(p.weightKg).map((x) => [x.id, x]));
            supplements = supplements.map((x) => (fresh[x.id] ? { ...x, dose: fresh[x.id].dose } : x));
          }
          // Si la hidratación seguía en los valores por defecto, se recalcula con el nuevo peso / duración.
          const prevDef = hydrationDefaults(s.plan.profile.weightKg, s.plan.profile.sessionMinutes);
          const hydration =
            s.plan.hydration.onMl === prevDef.onMl && s.plan.hydration.offMl === prevDef.offMl
              ? hydrationDefaults(profile.weightKg, profile.sessionMinutes)
              : s.plan.hydration;
          return { plan: touch({ ...s.plan, profile, supplements, hydration }) };
        }),

      selectBodyFatBand: (bandId) =>
        set((s) => {
          const band = BODY_FAT_BANDS[s.plan.profile.sex].find((b) => b.id === bandId);
          if (!band) return {};
          return { plan: touch({ ...s.plan, profile: { ...s.plan.profile, bodyFatBand: band.id, bodyFatPct: band.pct } }) };
        }),

      setSkinfold: (site, mm) =>
        set((s) => {
          const pr = s.plan.profile;
          const skinfolds = { ...pr.skinfolds, [site]: Math.max(0, mm) };
          const pct = jp7BodyFat(pr.sex, pr.age, skinfolds);
          return {
            plan: touch({ ...s.plan, profile: { ...pr, skinfolds, ...(pct !== null && !pr.measuredFfmKg ? { bodyFatPct: pct } : {}) } }),
          };
        }),

      setMeasuredFfm: (kg) =>
        set((s) => {
          const pr = s.plan.profile;
          const measuredFfmKg = Math.max(0, Math.min(kg, pr.weightKg));
          const bodyFatPct = measuredFfmKg > 0 ? Math.round((1 - measuredFfmKg / pr.weightKg) * 1000) / 10 : pr.bodyFatPct;
          return { plan: touch({ ...s.plan, profile: { ...pr, measuredFfmKg, bodyFatPct } }) };
        }),

      applyPhasePreset: (phase) =>
        set((s) => ({
          plan: touch({
            ...s.plan,
            profile: { ...s.plan.profile, phase },
            periodization: {
              ...s.plan.periodization,
              on: { ...PHASE_PRESETS[phase].on },
              off: { ...PHASE_PRESETS[phase].off },
            },
          }),
        })),

      setMacro: (day, key, value) =>
        set((s) => ({
          plan: touch({
            ...s.plan,
            periodization: {
              ...s.plan.periodization,
              [day]: { ...s.plan.periodization[day], [key]: value },
            },
          }),
        })),

      setPeriodization: (p) =>
        set((s) => ({ plan: touch({ ...s.plan, periodization: { ...s.plan.periodization, ...p } }) })),

      setCoachNote: (coachNote) => set((s) => ({ plan: touch({ ...s.plan, coachNote }) })),

      addMeal: (day) =>
        set((s) => ({
          plan: touch({
            ...s.plan,
            meals: [
              ...s.plan.meals,
              { id: uid(), name: 'Nuevo bloque', time: '10:00', day, role: 'snack', items: [itemFromFood('yogur', 200)] },
            ],
          }),
        })),

      updateMeal: (id, patch) => set((s) => ({ plan: mapMeal(s.plan, id, (m) => ({ ...m, ...patch })) })),

      removeMeal: (id) =>
        set((s) => ({ plan: touch({ ...s.plan, meals: s.plan.meals.filter((m) => m.id !== id) }) })),

      duplicateMeal: (id) =>
        set((s) => {
          const src = s.plan.meals.find((m) => m.id === id);
          if (!src) return {};
          const copy: Meal = {
            ...src,
            id: uid(),
            day: src.day === 'on' ? 'off' : src.day === 'off' ? 'on' : 'both',
            items: src.items.map((i) => ({ ...i, id: uid() })),
          };
          return { plan: touch({ ...s.plan, meals: [...s.plan.meals, copy] }) };
        }),

      addFood: (mealId, foodId, grams = 100) =>
        set((s) => ({ plan: mapMeal(s.plan, mealId, (m) => ({ ...m, items: [...m.items, itemFromFood(foodId, grams)] })) })),

      setItemGrams: (mealId, itemId, grams) =>
        set((s) => ({
          plan: mapMeal(s.plan, mealId, (m) => ({
            ...m,
            items: m.items.map((i) => (i.id === itemId ? rescaleItem(i, Math.max(0, grams)) : i)),
          })),
        })),

      swapItem: (mealId, itemId, foodId) =>
        set((s) => ({
          plan: mapMeal(s.plan, mealId, (m) => ({
            ...m,
            items: m.items.map((i) =>
              i.id === itemId ? { ...itemFromFood(foodId, swapGrams(i, foodId)), id: i.id } : i,
            ),
          })),
        })),

      balanceMeals: () => set((s) => ({ plan: balancePlan(s.plan).plan })),

      removeItem: (mealId, itemId) =>
        set((s) => ({
          plan: mapMeal(s.plan, mealId, (m) => ({ ...m, items: m.items.filter((i) => i.id !== itemId) })),
        })),

      toggleSupplement: (id) =>
        set((s) => ({
          plan: touch({
            ...s.plan,
            supplements: s.plan.supplements.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x)),
          }),
        })),

      updateSupplement: (id, patch) =>
        set((s) => ({
          plan: touch({
            ...s.plan,
            supplements: s.plan.supplements.map((x) => (x.id === id ? { ...x, ...patch } : x)),
          }),
        })),

      loadPlan: (plan) => set({ plan: touch(plan) }),
      resetDemo: () => set((s) => ({ plan: { ...seedPlan(), id: s.plan.id } })),

      setPlanMeta: (patch) => set((s) => ({ plan: touch({ ...s.plan, ...patch }) })),

      injectItems: (target, items) =>
        set((s) => {
          const fresh = items.map((i) => ({ ...i, id: uid() }));
          if ('mealId' in target) return { plan: mapMeal(s.plan, target.mealId, (m) => ({ ...m, items: [...m.items, ...fresh] })) };
          const meal: Meal = { id: uid(), name: target.newMeal.name, time: target.newMeal.time, day: target.newMeal.day, role: 'lunch', items: fresh };
          return { plan: touch({ ...s.plan, meals: [...s.plan.meals, meal] }) };
        }),

      importAthlete: (raw) => {
        const data = (raw ?? {}) as { plan?: unknown; customFoods?: FoodRef[] };
        const imported = sanitizePlan(data.plan ?? raw);
        if (!imported) return null;
        const s = get();
        const taken = imported.id === s.plan.id || !!s.roster[imported.id];
        const plan: AthletePlan = {
          ...imported,
          id: taken ? uid() : imported.id,
          profile: { ...imported.profile, name: taken ? `${imported.profile.name} (copia)` : imported.profile.name },
          updatedAt: Date.now(),
        };
        // Marcas propias que el perfil usa y este navegador todavía no tiene.
        const known = new Set(s.customFoods.map((f) => f.id));
        const extra = (Array.isArray(data.customFoods) ? data.customFoods : []).filter((f) => f && typeof f.id === 'string' && !known.has(f.id));
        const customFoods = [...s.customFoods, ...extra];
        registerCustomFoods(customFoods);
        set({ plan, roster: { ...s.roster, [s.plan.id]: s.plan }, customFoods });
        return plan.profile.name;
      },

      newAthlete: () =>
        set((s) => {
          const fresh = seedPlan();
          fresh.profile = { ...fresh.profile, name: `Atleta ${listAthletes(s).length + 1}` };
          return { roster: { ...s.roster, [s.plan.id]: s.plan }, plan: fresh, builderTab: 'intake' };
        }),

      switchAthlete: (id) =>
        set((s) => {
          if (id === s.plan.id || !s.roster[id]) return {};
          const roster = { ...s.roster, [s.plan.id]: s.plan };
          const plan = roster[id];
          delete roster[id];
          return { roster, plan };
        }),

      deleteAthlete: (id) =>
        set((s) => {
          if (id !== s.plan.id) {
            const roster = { ...s.roster };
            delete roster[id];
            return { roster };
          }
          // Borrar el activo: pasa al siguiente guardado o arranca un demo nuevo.
          const [next, ...rest] = Object.values(s.roster).sort((a, b) => b.updatedAt - a.updatedAt);
          if (!next) return { plan: seedPlan(), roster: {} };
          return { plan: next, roster: Object.fromEntries(rest.map((p) => [p.id, p])) };
        }),
    }),
    {
      name: 'coachjp-hps-builder',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Hidratación defensiva: un plan guardado incompleto o de otra versión nunca rompe el Builder ni el simulador.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<PlanState>;
        const merged = { ...current, ...saved } as PlanState;
        // Las marcas propias se registran antes de sanear los planes que las referencian.
        merged.customFoods = Array.isArray(saved.customFoods) ? saved.customFoods.filter((f) => f && typeof f.id === 'string' && typeof f.name === 'string') : [];
        registerCustomFoods(merged.customFoods);
        merged.plan = sanitizePlan(saved.plan) ?? current.plan;
        merged.roster = Object.fromEntries(
          Object.values(saved.roster ?? {})
            .map((p) => sanitizePlan(p))
            .filter((p): p is AthletePlan => !!p && p.id !== merged.plan.id)
            .map((p) => [p.id, p]),
        );
        merged.ai = { ...current.ai, ...(saved.ai ?? {}) };
        // Un modelo de Gemini retirado que quedó guardado se reemplaza por el default vigente al hidratar.
        merged.ai.model = migrateModel(merged.ai.provider, merged.ai.model);
        return merged;
      },
      partialize: (s) => ({
        plan: s.plan,
        roster: s.roster,
        ai: s.ai,
        builderTab: s.builderTab,
        deployTab: s.deployTab,
        previewMode: s.previewMode,
        intakeNotes: s.intakeNotes,
        customFoods: s.customFoods,
      }),
    },
  ),
);

/**
 * Corrige planes generados antes del tope de aceite: una porción de aceite > 2 cdas (ej. 150 g) en una comida
 * es un error de la IA y dispara las grasas; se lleva a 1 cda realista (15 g).
 */
function capCookingOil(m: Meal): Meal {
  if (!m.items.some((i) => i.foodId === 'oliva' && i.grams > 2 * MAX_OIL_PER_MEAL_G)) return m;
  return { ...m, items: m.items.map((i) => (i.foodId === 'oliva' && i.grams > 2 * MAX_OIL_PER_MEAL_G ? rescaleItem(i, MAX_OIL_PER_MEAL_G) : i)) };
}

/** Valida la forma mínima del plan persistido y completa los campos agregados en versiones nuevas. */
function sanitizePlan(raw: unknown): AthletePlan | null {
  const p = raw as AthletePlan | undefined;
  if (!p || typeof p !== 'object') return null;
  const pr = p.profile;
  const okNum = (n: unknown) => typeof n === 'number' && Number.isFinite(n);
  if (!pr || !okNum(pr.weightKg) || !okNum(pr.bodyFatPct) || !p.periodization?.on || !p.periodization?.off) return null;
  if (!Array.isArray(p.meals) || !Array.isArray(p.supplements)) return null;
  const seed = seedPlan();
  return {
    ...seed,
    ...p,
    id: typeof p.id === 'string' && p.id ? p.id : uid(),
    publicUrl: typeof p.publicUrl === 'string' ? p.publicUrl : '',
    hydration: p.hydration?.onMl > 0 && p.hydration?.offMl > 0 ? p.hydration : hydrationDefaults(pr.weightKg, pr.sessionMinutes ?? 75),
    profile: {
      ...seed.profile,
      ...pr,
      precisionMode: pr.precisionMode ?? 'isak',
      bodyFatBand: pr.bodyFatBand ?? null,
      skinfolds: { ...EMPTY_SKINFOLDS, ...(pr.skinfolds ?? {}) },
      measuredFfmKg: okNum(pr.measuredFfmKg) ? pr.measuredFfmKg : 0,
      trainingTime: /^\d{2}:\d{2}$/.test(pr.trainingTime ?? '') ? pr.trainingTime : '18:00',
      sessionMinutes: okNum(pr.sessionMinutes) ? pr.sessionMinutes : 75,
    },
    periodization: { ...seed.periodization, ...p.periodization },
    meals: p.meals.filter((m) => m && Array.isArray(m.items)).map(capCookingOil),
  };
}
