'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { BODY_FAT_BANDS, EMPTY_SKINFOLDS, jp7BodyFat, PHASE_PRESETS } from '@/lib/bioenergetics';
import { aisGroupA } from '@/lib/evidence';
import { equivalentGrams, FOOD_BY_ID, macrosFor, round1, round2 } from '@/lib/foods';
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
  ai: AiSettings;
  builderTab: BuilderTab;
  deployTab: DeployTab;
  previewMode: DayMode;
  intakeNotes: string;

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

  toggleSupplement: (id: string) => void;
  updateSupplement: (id: string, patch: Partial<Supplement>) => void;

  loadPlan: (plan: AthletePlan) => void;
  resetDemo: () => void;
}

const touch = (plan: AthletePlan): AthletePlan => ({ ...plan, updatedAt: Date.now() });

function mapMeal(plan: AthletePlan, mealId: string, fn: (m: Meal) => Meal): AthletePlan {
  return touch({ ...plan, meals: plan.meals.map((m) => (m.id === mealId ? fn(m) : m)) });
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
    (set) => ({
      plan: seedPlan(),
      ai: { provider: 'claude', model: 'claude-opus-5', apiKey: '' },
      builderTab: 'profile',
      deployTab: 'preview',
      previewMode: 'on',
      intakeNotes: '',

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
          return { plan: touch({ ...s.plan, profile, supplements }) };
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
              i.id === itemId ? { ...itemFromFood(foodId, i.foodId ? equivalentGrams(i.foodId, i.grams, foodId) : i.grams), id: i.id } : i,
            ),
          })),
        })),

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
      resetDemo: () => set({ plan: seedPlan() }),
    }),
    {
      name: 'coachjp-hps-builder',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Hidratación defensiva: un plan guardado incompleto o de otra versión nunca rompe el Builder ni el simulador.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<PlanState>;
        const merged = { ...current, ...saved } as PlanState;
        merged.plan = sanitizePlan(saved.plan) ?? current.plan;
        merged.ai = { ...current.ai, ...(saved.ai ?? {}) };
        return merged;
      },
      partialize: (s) => ({
        plan: s.plan,
        ai: s.ai,
        builderTab: s.builderTab,
        deployTab: s.deployTab,
        previewMode: s.previewMode,
        intakeNotes: s.intakeNotes,
      }),
    },
  ),
);

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
    profile: {
      ...seed.profile,
      ...pr,
      precisionMode: pr.precisionMode ?? 'isak',
      bodyFatBand: pr.bodyFatBand ?? null,
      skinfolds: { ...EMPTY_SKINFOLDS, ...(pr.skinfolds ?? {}) },
      measuredFfmKg: okNum(pr.measuredFfmKg) ? pr.measuredFfmKg : 0,
    },
    periodization: { ...seed.periodization, ...p.periodization },
    meals: p.meals.filter((m) => m && Array.isArray(m.items)),
  };
}
