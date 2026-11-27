'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { BODY_FAT_BANDS, EMPTY_SKINFOLDS, hydrationDefaults, jp7BodyFat, PHASE_PRESETS, trainingWeekdays } from '@/lib/bioenergetics';
import { MAX_OIL_PER_MEAL_G, migrateModel } from '@/lib/ai';
import { balancePlan } from '@/lib/balance';
import { consolidateItems, consolidateMeal, retimeMeals } from '@/lib/schedule';
import { baseKey, compensateSwap, fitAltsToMain, normalizeMealOptions, refreshSteps, suggestAlternatives, withAlternatives } from '@/lib/menuOptions';
import { sanitizeAnamnesis } from '@/lib/anamnesisPro';
import { fixedFromAnamnesis } from '@/lib/agenda';
import { swapBase } from '@/lib/baseSwap';
import { setCoachPhone as setCoachContact } from '@/lib/coachContact';
import { QUICK_SWAPS, quickSwapItems } from '@/lib/quickSwaps';
import { CROSS_TARGETS, crossSwapItems } from '@/lib/crossSwaps';
import { mirrorForPartner } from '@/lib/couple';
import { previewAssign, previewTriple, type AssignPreview, type BankSource } from '@/lib/bankAssign';
import { useFoodDbStore } from '@/store/useFoodDbStore';
import { setPartnerResolver } from '@/lib/exportHtml';
import { acceptForPlan, allergenConflicts, allergiesOf, fixPlanAllergens, planIsMeatFree, protocolOf, type DietProtocol } from '@/lib/allergens';
import { setDefaultCapDiet, setDefaultCapSex } from '@/lib/portionCaps';
import { equivalentOptions } from '@/lib/planBuild';
import { applyBankPlan, BANK_GOALS, goalOf, type BankGoal, type BankSelection } from '@/lib/planBank';
import { precalc, sessionKcalFor, sportOf } from '@/lib/precalc';
import { adaptPlan, templateFromPlan, type PlanSource, type PlanTemplate } from '@/lib/planAdapt';
import { friendlyMealName, modernizeName, uniqueMealNames } from '@/lib/foodBrandDb';
import { aisGroupA } from '@/lib/evidence';
import { cloudConfigured } from '@/lib/cloud/config';
import { equivalentGrams, FOOD_BY_ID, freeEquivalents, macrosFor, registerCustomFoods, round1, round2, type FoodRef } from '@/lib/foods';
import { itemFromFood, seedPlan, uid } from '@/lib/seed';
import type {
  Anamnesis,
  AiSettings,
  AthletePlan,
  DayMode,
  FoodItem,
  Macros,
  Meal,
  MealOption,
  Periodization,
  Phase,
  Profile,
  SkinfoldSite,
  Sport,
  Supplement,
} from '@/lib/types';
import { MAX_OPTIONS, type Nutritionist } from '@/lib/types';
import { DEFAULT_NUTRITIONIST, safeLogo } from '@/lib/brand';

export type BuilderTab = 'athletes' | 'anamnesis' | 'intake' | 'profile' | 'periodization' | 'meals' | 'global' | 'fooddb' | 'library';
export type DeployTab = 'preview' | 'export' | 'story';

interface PlanState {
  plan: AthletePlan;
  /** Base local de atletas (snapshots). El activo vive en `plan` y pisa su entrada al listar. */
  roster: Record<string, AthletePlan>;
  /** Plantillas propias del coach (planes guardados desde Comidas para reutilizar con otros atletas). */
  templates: PlanTemplate[];
  /** WhatsApp del coach (los check-ins de los alumnos llegan acá). */
  coachPhone: string;
  setCoachPhone: (p: string) => void;
  ai: AiSettings;
  builderTab: BuilderTab;
  deployTab: DeployTab;
  previewMode: DayMode;
  intakeNotes: string;
  /** Notas del Prompt Engine por atleta: al cambiar de atleta nunca quedan las del anterior. */
  notesByAthlete: Record<string, string>;
  /** Alimentos / marcas creados por el coach (persistidos en localStorage). */
  customFoods: FoodRef[];
  /** Última exportación de la PWA por atleta: cuándo y con qué huella de contenido (indicador "plan desactualizado"). */
  exports: Record<string, { at: number; hash: string }>;
  markExported: (hash: string) => void;

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
  /** Deporte principal: fija la disciplina y el gasto de la sesión según el peso y la duración. */
  setSport: (sport: Sport) => void;
  /** Objetivo del banco (definición, recomposición, hipertrofia, rendimiento): fase + objetivo de la anamnesis. */
  setObjective: (goal: BankGoal) => void;
  /** Usa los macros g/kg del plan sugerido por el precálculo (entreno y descanso). */
  applyPrecalcMacros: () => void;
  /** Protocolo nutricional (Keto / Low Carb / estándar): restricciones, macros del protocolo y comidas corregidas. */
  setProtocol: (p: DietProtocol | null) => void;
  /** Arma el plan completo (entreno + descanso) desde el Banco Global para el perfil del alumno: 3 opciones por comida. */
  buildFromBank: () => void;
  /** Un plato del banco como Opción 1 + 2 variantes equivalentes (isocalóricas / isoproteicas) auto-escaladas. */
  assignTriple: (mealId: string, src: BankSource) => boolean;
  /** Reemplaza la Opción `slot + 1` (0 = Opción 1) por un plato del Banco Global escalado (y a la pareja). */
  replaceOption: (mealId: string, slot: number, src: BankSource) => boolean;
  /** Reemplazo cruzado por macro de un ingrediente de la Opción `slot + 1` (0 = Opción 1). */
  crossSwap: (mealId: string, slot: number, itemId: string, targetId: string) => boolean;
  /** Guarda el plan del atleta activo como plantilla propia. */
  saveTemplate: (name: string) => void;
  deleteTemplate: (id: string) => void;
  /** Aplica un plan ajeno (plantilla u otro alumno) adaptado al atleta activo: porciones, topes, horarios y macros. */
  applyAdapted: (src: PlanSource) => void;
  /** Sustituye en todo el plan los ingredientes con alérgenos declarados. Devuelve cuántas opciones corrigió y cuántos conflictos quedan. */
  fixAllergens: () => { fixed: number; left: number };
  /** Ajuste del panel: nuevos macros g/kg de entreno y descanso; las comidas se reescalan solas (cierre de macros). */
  adjustMacros: (gkg: { on: Macros; off: Macros }) => void;
  /** Cambia la base (proteína o carbo) de una comida en todas sus opciones. */
  swapMealBase: (mealId: string, fromId: string, toId: string) => void;
  setMacro: (day: DayMode, key: keyof Macros, value: number) => void;
  setPeriodization: (p: Partial<Periodization>) => void;
  setCoachNote: (s: string) => void;
  /** Firma profesional (nutricionista); `all` la aplica a todos los alumnos. */
  setNutritionist: (n: Nutritionist, all?: boolean) => void;

  addMeal: (day: Meal['day']) => void;
  updateMeal: (id: string, patch: Partial<Omit<Meal, 'id' | 'items'>>) => void;
  removeMeal: (id: string) => void;
  duplicateMeal: (id: string) => void;
  addFood: (mealId: string, foodId: string, grams?: number) => void;
  setItemGrams: (mealId: string, itemId: string, grams: number) => void;
  swapItem: (mealId: string, itemId: string, foodId: string) => void;
  /** Recetario Coach JP: el plato como opción 1 (replace) o como alternativa (alt), escalado a esa comida. */
  applyCatalogDish: (mealId: string, dishId: string, mode: 'replace' | 'alt') => boolean;
  /** Banco Global: alimento, plato del recetario o plato del coach a una comida, auto-escalado (y a la pareja). */
  assignFromBank: (mealId: string, src: BankSource, mode: 'replace' | 'alt') => boolean;
  /** Reemplazo rápido 1 a 1 (tarjeta de macros): mismo aporte del macro principal, unidades enteras y topes. */
  quickSwap: (mealId: string, itemId: string, swapId: string) => void;
  /** Título / técnica / pasos de la Opción 1 o lista de alternativas. */
  setMealOption: (mealId: string, patch: Partial<Pick<Meal, 'title' | 'technique' | 'steps' | 'alts'>>) => void;
  /** Genera / cambia la alternativa `slot` (0 = Opción 2 … 3 = Opción 5). `cycle` recorre el ranking. Devuelve cuántas hay. */
  generateAlt: (mealId: string, slot: number, cycle?: number) => number;
  setAlt: (mealId: string, slot: number, patch: Partial<MealOption> | null) => void;
  /** Completa hasta 5 opciones por comida (overwrite = rehace las alternativas). */
  generateAllAlts: (overwrite?: boolean) => void;
  setAltItemGrams: (mealId: string, slot: number, itemId: string, grams: number) => void;
  removeAltItem: (mealId: string, slot: number, itemId: string) => void;
  removeItem: (mealId: string, itemId: string) => void;
  /** Escala carbos y grasas para que cada día cierre al 100 % ± 3 % de sus metas. */
  balanceMeals: () => void;
  /** Reasigna las horas de las comidas a partir de la franja real de entreno (06:30 · 12:30 · pre · post · cena). */
  retimeMeals: () => void;
  /** Horarios + exclusiones de la Anamnesis Pro aplicados a las comidas, con cierre de macros redistribuido. */
  applyAnamnesisToMeals: () => number;
  /** Biblioteca de planes master: clona el plan semilla adaptado al peso y target del atleta activo. */
  /** Banco de planes maestros: aplica el plan elegido adaptado al peso del alumno. */
  applyTemplate: (sel: BankSelection) => void;
  /** Anamnesis Pro & Lifestyle del atleta activo (se guarda dentro del plan → localStorage y backup JSON). */
  setAnamnesis: (patch: Partial<Anamnesis>) => void;

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
  /** Cambio atómico de atleta: plan saneado, notas propias y estado de vista reseteado (simulador incluido). */
  selectAthlete: (id: string) => void;
  deleteAthlete: (id: string) => void;
  /** Modo Parejas: vincula al alumno activo con otro de la base (su menú pasa a ser el del activo, con sus gramos). */
  linkPartner: (id: string | null) => void;
  /** Modo Parejas: crea a la Persona B (sexo opuesto) con el menú del activo y la vincula. */
  createPartner: () => void;
  /** Modo Parejas: pasa el menú del activo a su pareja (cada uno con sus gramos). */
  pushMenuToPartner: () => void;
  /** Modo Parejas: recalcula los gramos del activo con el menú de su pareja. */
  pullMenuFromPartner: () => void;
  /** Recibe un plan desde la nube (otro dispositivo del coach): reemplaza el activo o la entrada de la base local. */
  receiveCloudPlan: (raw: unknown) => string | null;
}

/**
 * Activación atómica de un atleta: plan saneado, notas guardadas del saliente y cargadas del entrante,
 * vista del simulador en DÍA ON. Ningún dato del atleta anterior sobrevive en el estado global.
 */
function activate(s: Pick<PlanState, 'plan' | 'intakeNotes' | 'notesByAthlete'>, plan: AthletePlan, roster: Record<string, AthletePlan>) {
  const clean = sanitizePlan(plan) ?? plan;
  const notesByAthlete = { ...s.notesByAthlete, [s.plan.id]: s.intakeNotes };
  delete roster[clean.id];
  return { plan: clean, roster, notesByAthlete, intakeNotes: notesByAthlete[clean.id] ?? '', previewMode: 'on' as DayMode };
}

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
/** Ajusta el cronograma semanal a `n` días conservando los elegidos (quita desde el final de la semana, suma lo que falta). */
function resizeWeekdays(days: number[], n: number) {
  const target = Math.max(0, Math.min(7, n));
  let out = WEEK_ORDER.filter((d) => days.includes(d));
  while (out.length > target) out = out.slice(0, -1);
  const fill = [...trainingWeekdays({ trainingDaysPerWeek: target, trainingWeekdays: undefined }), ...WEEK_ORDER];
  for (const d of fill) if (out.length < target && !out.includes(d)) out.push(d);
  return out.sort();
}

/** Lista de atletas de la base local con el activo actualizado. */
export function listAthletes(s: Pick<PlanState, 'plan' | 'roster'>) {
  return Object.values({ ...s.roster, [s.plan.id]: s.plan }).sort((a, b) => b.updatedAt - a.updatedAt);
}

const touch = (plan: AthletePlan): AthletePlan => ({ ...plan, updatedAt: Date.now() });

/** Guarda el plan; si este alumno define el menú del Modo Parejas, la pareja recibe el cambio con sus gramos. */
function commitWithPartner(set: (p: Partial<PlanState>) => void, s: PlanState, next: AthletePlan) {
  const partner = next.partnerId ? s.roster[next.partnerId] : undefined;
  if (partner && partner.partnerId === next.id && !next.partnerSyncAt) set({ plan: touch(next), roster: { ...s.roster, [partner.id]: mirrorForPartner(partner, touch(next)) } });
  else set({ plan: touch(next) });
}

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
      templates: [],
      coachPhone: '',
      setCoachPhone: (p) => {
        setCoachContact(p);
        set({ coachPhone: p });
      },
      ai: { provider: 'claude', model: 'claude-opus-5', apiKey: '' },
      builderTab: 'profile',
      deployTab: 'preview',
      previewMode: 'on',
      intakeNotes: '',
      notesByAthlete: {},
      customFoods: [],
      exports: {},

      markExported: (hash) => set((s) => ({ exports: { ...s.exports, [s.plan.id]: { at: Date.now(), hash } } })),

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

      // Anamnesis y Macros viven ahora dentro de la vista única del alumno.
      setBuilderTab: (builderTab) => set({ builderTab: builderTab === 'anamnesis' || builderTab === 'periodization' ? 'profile' : builderTab }),
      setDeployTab: (deployTab) => set({ deployTab }),
      setPreviewMode: (previewMode) => set({ previewMode }),
      setIntakeNotes: (intakeNotes) => set((s) => ({ intakeNotes, notesByAthlete: { ...s.notesByAthlete, [s.plan.id]: intakeNotes } })),
      setAi: (a) => set((s) => ({ ai: { ...s.ai, ...a } })),

      setProfile: (p) =>
        set((s) => {
          const profile = { ...s.plan.profile, ...p };
          // «Días de entreno por semana» ↔ chips LUN-DOM: al cambiar el número se suman / quitan días del cronograma.
          if (p.trainingDaysPerWeek !== undefined && p.trainingWeekdays === undefined) {
            profile.trainingWeekdays = resizeWeekdays(trainingWeekdays(s.plan.profile), Math.round(p.trainingDaysPerWeek));
          }
          if (p.sex && p.sex !== s.plan.profile.sex && profile.precisionMode === 'quick' && profile.bodyFatBand) {
            const band = BODY_FAT_BANDS[p.sex].find((b) => b.id === profile.bodyFatBand);
            if (band) profile.bodyFatPct = band.pct;
          }
          // Con deporte elegido, el gasto de la sesión sigue al peso y a la duración (precálculo en vivo).
          const sp = sportOf(profile.sport);
          if (sp && p.sessionKcal === undefined && (p.weightKg !== undefined || p.sessionMinutes !== undefined)) profile.sessionKcal = sessionKcalFor(sp, profile.weightKg, profile.sessionMinutes);
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

      setSport: (sport) =>
        set((s) => {
          const def = sportOf(sport)!;
          const pr = s.plan.profile;
          return { plan: touch({ ...s.plan, profile: { ...pr, sport, discipline: def.discipline, sessionKcal: sessionKcalFor(def, pr.weightKg, pr.sessionMinutes) } }) };
        }),
      setObjective: (goal) =>
        set((s) => {
          const g = BANK_GOALS.find((x) => x.id === goal)!;
          return { plan: touch({ ...s.plan, profile: { ...s.plan.profile, phase: g.phase }, anamnesis: { ...sanitizeAnamnesis(s.plan.anamnesis), goal: g.anamnesisGoal } }) };
        }),
      applyPrecalcMacros: () =>
        set((s) => {
          const pc = precalc(s.plan);
          return { plan: touch({ ...s.plan, profile: { ...s.plan.profile, phase: pc.goal.phase }, periodization: { ...s.plan.periodization, on: pc.gkg.on, off: pc.gkg.off } }) };
        }),
      setProtocol: (proto) => {
        const s = get();
        const an = sanitizeAnamnesis(s.plan.anamnesis);
        const allergies = [...an.allergies.filter((a) => a !== 'keto' && a !== 'lowcarb'), ...(proto ? [proto] : [])];
        const base = { ...s.plan, anamnesis: { ...an, allergies } };
        const pc = precalc(base);
        // Macros del protocolo (mismas calorías del objetivo) y las comidas actuales sin lo que el protocolo excluye.
        const withMacros = { ...base, periodization: { ...base.periodization, on: pc.gkg.on, off: pc.gkg.off } };
        set({ plan: touch(fixPlanAllergens(withMacros, planIsMeatFree(withMacros)).plan) });
      },
      buildFromBank: () => {
        get().applyTemplate(precalc(get().plan).sel);
        // Flujo rápido: Opción 1 + las 2 variantes más parecidas en calorías y proteína (equivalentes de verdad).
        const s = get();
        set({ plan: touch(equivalentOptions(s.plan, 2)) });
      },
      assignTriple: (mealId, src) => {
        const s = get();
        const meal = s.plan.meals.find((m) => m.id === mealId);
        if (!meal) return false;
        const opts = previewTriple(src, meal, s.plan, useFoodDbStore.getState().items);
        if (!opts.length) return false;
        const fresh = (o: AssignPreview) => ({ title: o.title, items: o.items.map((i) => ({ ...i, id: uid() })), steps: o.steps, yieldInfo: o.yieldInfo });
        const [main, ...alts] = opts.map(fresh);
        const next = mapMeal(s.plan, mealId, (m) => ({ ...m, items: main.items, title: main.title, steps: main.steps, yieldInfo: main.yieldInfo, technique: undefined, alts }));
        const partner = next.partnerId ? s.roster[next.partnerId] : undefined;
        if (partner && partner.partnerId === next.id && !next.partnerSyncAt) set({ plan: touch(next), roster: { ...s.roster, [partner.id]: mirrorForPartner(partner, touch(next)) } });
        else set({ plan: touch(next) });
        return true;
      },
      replaceOption: (mealId, slot, src) => {
        const s = get();
        const meal = s.plan.meals.find((m) => m.id === mealId);
        if (!meal) return false;
        const items = slot === 0 ? meal.items : meal.alts?.[slot - 1]?.items;
        if (!items) return false;
        const o = previewAssign(src, { ...meal, items }, s.plan, useFoodDbStore.getState().items);
        if (!o) return false;
        const fresh = { title: o.title, items: o.items.map((i) => ({ ...i, id: uid() })), steps: o.steps, yieldInfo: o.yieldInfo };
        const next = mapMeal(s.plan, mealId, (m) =>
          slot === 0
            ? fitAltsToMain({ ...m, items: fresh.items, title: fresh.title, steps: fresh.steps, yieldInfo: fresh.yieldInfo, technique: undefined })
            : { ...m, alts: (m.alts ?? []).map((a, k) => (k === slot - 1 ? fresh : a)) },
        );
        commitWithPartner(set, s, next);
        return true;
      },
      crossSwap: (mealId, slot, itemId, targetId) => {
        const s = get();
        const meal = s.plan.meals.find((m) => m.id === mealId);
        const target = Object.values(CROSS_TARGETS).flat().find((t) => t.id === targetId);
        if (!meal || !target) return false;
        const list = slot === 0 ? meal.items : meal.alts?.[slot - 1]?.items;
        const before = list?.find((i) => i.id === itemId);
        if (!list || !before) return false;
        const repl = crossSwapItems(before, target, { sex: s.plan.profile.sex, role: meal.role, diet: protocolOf(allergiesOf(s.plan)) ?? undefined, veg: allergiesOf(s.plan).includes('veg'), accept: acceptForPlan(s.plan) });
        if (!repl) return false;
        // Todas las partes nuevas cuentan para compensar la grasa / carbos con el resto de la comida.
        const extra = repl.slice(1).reduce((a, i) => ({ f: a.f + i.f, c: a.c + i.c }), { f: 0, c: 0 });
        const merged: FoodItem[] = [];
        for (const it of list.flatMap((i) => (i.id === itemId ? repl : [i]))) {
          const dup = merged.find((x) => x.foodId && x.foodId === it.foodId);
          if (dup) Object.assign(dup, itemFromFood(dup.foodId!, dup.grams + it.grams), { id: dup.id });
          else merged.push({ ...it });
        }
        const items = compensateSwap(merged, itemId, { ...before, f: before.f - extra.f, c: before.c - extra.c }).items;
        const next = mapMeal(s.plan, mealId, (m) =>
          slot === 0 ? fitAltsToMain({ ...m, items }) : { ...m, alts: (m.alts ?? []).map((a, k) => (k === slot - 1 ? { ...a, items, steps: refreshSteps(a, items) } : a)) },
        );
        commitWithPartner(set, s, next);
        return true;
      },
      saveTemplate: (name) => set((s) => ({ templates: [templateFromPlan(s.plan, name), ...s.templates] })),
      fixAllergens: () => {
        const s = get();
        const r = fixPlanAllergens(s.plan, planIsMeatFree(s.plan));
        if (r.fixed) set({ plan: touch(r.plan) });
        return { fixed: r.fixed, left: allergenConflicts(r.plan).length };
      },
      adjustMacros: (gkg) =>
        set((s) => ({ plan: balancePlan(touch({ ...s.plan, periodization: { ...s.plan.periodization, on: { ...gkg.on }, off: { ...gkg.off } } })).plan })),
      swapMealBase: (mealId, fromId, toId) =>
        set((s) => ({ plan: mapMeal(s.plan, mealId, (m) => fitAltsToMain(swapBase(m, fromId, toId, s.plan.profile.sex))) })),
      deleteTemplate: (id) => set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),
      // Copia / plantilla: además de reescalar, se sustituyen los alérgenos que el alumno tiene declarados.
      applyAdapted: (src) => set((s) => ({ plan: touch(fixPlanAllergens(adaptPlan(s.plan, src)).plan), builderTab: 'meals' })),
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
      setNutritionist: (n, all) =>
        set((s) => {
          const nutritionist = sanitizeNutritionist(n);
          const plan = touch({ ...s.plan, nutritionist });
          if (!all) return { plan };
          const roster = Object.fromEntries(Object.entries(s.roster).map(([id, p]) => [id, id === plan.id ? plan : touch({ ...p, nutritionist })]));
          return { plan, roster };
        }),

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
        set((s) => ({ plan: mapMeal(s.plan, mealId, (m) => ({ ...m, items: consolidateItems([...m.items, itemFromFood(foodId, grams)]) })) })),

      setItemGrams: (mealId, itemId, grams) =>
        set((s) => ({
          plan: mapMeal(s.plan, mealId, (m) => ({
            ...m,
            items: m.items.map((i) => (i.id === itemId ? rescaleItem(i, Math.max(0, grams)) : i)),
          })),
        })),

      // Swap matrix: el alimento nuevo iguala el macro ancla y la comida compensa grasa / carbos para no descuadrarse.
      swapItem: (mealId, itemId, foodId) =>
        set((s) => ({
          plan: mapMeal(s.plan, mealId, (m) => {
            const before = m.items.find((i) => i.id === itemId);
            if (!before) return m;
            const items = m.items.map((i) => (i.id === itemId ? { ...itemFromFood(foodId, swapGrams(i, foodId)), id: i.id } : i));
            return fitAltsToMain({ ...m, items: compensateSwap(items, itemId, before).items });
          }),
        })),

      applyCatalogDish: (mealId, dishId, mode) => get().assignFromBank(mealId, { kind: 'catalog', id: dishId }, mode),
      assignFromBank: (mealId, src, mode) => {
        const s = get();
        const meal = s.plan.meals.find((m) => m.id === mealId);
        const opt = meal ? previewAssign(src, meal, s.plan, useFoodDbStore.getState().items) : null;
        if (!meal || !opt) return false;
        const fresh = opt.items.map((i) => ({ ...i, id: uid() }));
        const next = mapMeal(s.plan, mealId, (m) => {
          if (mode === 'replace') return fitAltsToMain({ ...m, items: fresh, title: opt.title, steps: opt.steps, yieldInfo: opt.yieldInfo, technique: undefined });
          const alts = [...(m.alts ?? [])];
          const alt = { title: opt.title, items: fresh, steps: opt.steps, yieldInfo: opt.yieldInfo };
          if (alts.length >= 4) alts[3] = alt;
          else alts.push(alt);
          return { ...m, alts };
        });
        // Modo Parejas: si este alumno define el menú, la pareja recibe el mismo plato con sus gramos.
        const partner = next.partnerId ? s.roster[next.partnerId] : undefined;
        if (partner && partner.partnerId === next.id && !next.partnerSyncAt) {
          const lead = touch(next);
          set({ plan: lead, roster: { ...s.roster, [partner.id]: mirrorForPartner(partner, lead) } });
        } else set({ plan: next });
        return true;
      },
      quickSwap: (mealId, itemId, swapId) =>
        set((s) => {
          const sw = QUICK_SWAPS.flatMap((g) => g.items).find((x) => x.id === swapId);
          if (!sw) return {};
          return {
            plan: mapMeal(s.plan, mealId, (m) => {
              const before = m.items.find((i) => i.id === itemId);
              if (!before) return m;
              const next = quickSwapItems(before, sw, { sex: s.plan.profile.sex, role: m.role });
              // Si el reemplazo trae un ingrediente que la comida ya tenía (yogur + claras), se suman en un solo ítem.
              const items = m.items.flatMap((i) => (i.id === itemId ? next : [i]));
              const merged: typeof items = [];
              for (const it of items) {
                const dup = merged.find((x) => x.foodId && x.foodId === it.foodId);
                if (dup) Object.assign(dup, itemFromFood(dup.foodId!, dup.grams + it.grams), { id: dup.id });
                else merged.push({ ...it });
              }
              return fitAltsToMain({ ...m, items: merged });
            }),
          };
        }),
      setMealOption: (mealId, patch) => set((s) => ({ plan: mapMeal(s.plan, mealId, (m) => ({ ...m, ...patch })) })),
      generateAlt: (mealId, slot, cycle = 0) => {
        const s = get();
        const meal = s.plan.meals.find((m) => m.id === mealId);
        if (!meal) return 0;
        const basket = s.plan.anamnesis?.basket;
        const others = (meal.alts ?? []).filter((_, k) => k !== slot);
        // Nunca repite la base (plato / proteína) de la Opción 1 ni de las otras alternativas de la misma comida.
        const opts = suggestAlternatives(meal, basket ? new Set(basket) : null, 12, others.map((a) => baseKey(a.items)), acceptForPlan(s.plan)).filter(
          (o) => !others.some((a) => a.title === o.title || baseKey(a.items) === baseKey(o.items)),
        );
        if (!opts.length) return 0;
        const pick = opts[cycle % opts.length];
        set({
          plan: mapMeal(s.plan, mealId, (m) => {
            const alts = [...(m.alts ?? [])];
            alts[Math.min(slot, alts.length)] = pick;
            return { ...m, alts: alts.slice(0, MAX_OPTIONS - 1) };
          }),
        });
        return opts.length;
      },
      setAlt: (mealId, slot, patch) =>
        set((s) => ({
          plan: mapMeal(s.plan, mealId, (m) => {
            const alts = (m.alts ?? []).map((a, k) => (k === slot && patch ? { ...a, ...patch } : a)).filter((_, k) => patch || k !== slot);
            return { ...m, alts: alts.length ? alts : undefined };
          }),
        })),
      generateAllAlts: (overwrite = false) => set((s) => ({ plan: touch(withAlternatives(s.plan, overwrite, undefined, acceptForPlan(s.plan))) })),
      setAltItemGrams: (mealId, slot, itemId, grams) =>
        set((s) => ({
          plan: mapMeal(s.plan, mealId, (m) => ({
            ...m,
            alts: m.alts?.map((a, k) => {
              if (k !== slot) return a;
              const items = a.items.map((i) => (i.id === itemId ? rescaleItem(i, Math.max(0, grams)) : i));
              return { ...a, items, steps: refreshSteps(a, items) };
            }),
          })),
        })),
      removeAltItem: (mealId, slot, itemId) =>
        set((s) => ({
          plan: mapMeal(s.plan, mealId, (m) => ({
            ...m,
            alts: m.alts?.map((a, k) => {
              if (k !== slot) return a;
              const items = a.items.filter((i) => i.id !== itemId);
              return { ...a, items, steps: refreshSteps(a, items) };
            }),
          })),
        })),

      balanceMeals: () => set((s) => ({ plan: balancePlan(s.plan).plan })),
      retimeMeals: () => set((s) => ({ plan: touch({ ...s.plan, meals: retimeMeals(s.plan.meals, s.plan.profile, s.plan.anamnesis) }) })),
      applyTemplate: (sel) => {
        const s = get();
        const goal = goalOf(sel.plan);
        const an = sanitizeAnamnesis(s.plan.anamnesis);
        // El objetivo y la condición Sin TACC quedan en la anamnesis (la IA y la app del alumno los respetan).
        const anamnesis = {
          ...an,
          goal: goal.anamnesisGoal,
          // Keto / Low Carb quedan como protocolo del alumno (filtros de la app, Mi heladera y Comer afuera).
          allergies:
            sel.variant === 'stacc'
              ? [...new Set([...an.allergies, 'gluten'])]
              : sel.variant === 'keto' || sel.variant === 'lowcarb'
                ? [...an.allergies.filter((a) => a !== 'keto' && a !== 'lowcarb'), sel.variant]
                : an.allergies,
          disabledSlots: [],
        };
        const base = { ...s.plan, anamnesis };
        // Horarios: agenda argentina según el entreno del alumno; si el coach fijó desayuno / almuerzo / cena, esos.
        const next = applyBankPlan(base, sel, fixedFromAnamnesis(anamnesis));
        set({ plan: touch(next), builderTab: 'meals' });
      },
      applyAnamnesisToMeals: () => {
        const s = get();
        const disabled = new Set<string>(s.plan.anamnesis?.disabledSlots ?? []);
        const kept = s.plan.meals.filter((m) => m.day === 'off' || !disabled.has(m.role));
        const removed = s.plan.meals.length - kept.length;
        const timed = retimeMeals(kept, s.plan.profile, s.plan.anamnesis);
        set({ plan: balancePlan(touch({ ...s.plan, meals: timed })).plan });
        return removed;
      },
      setAnamnesis: (patch) => set((s) => ({ plan: touch({ ...s.plan, anamnesis: { ...sanitizeAnamnesis(s.plan.anamnesis), ...patch } }) })),

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
          if ('mealId' in target) return { plan: mapMeal(s.plan, target.mealId, (m) => ({ ...m, items: consolidateItems([...m.items, ...fresh]) })) };
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
        set({ ...activate(s, plan, { ...s.roster, [s.plan.id]: s.plan }), customFoods });
        return plan.profile.name;
      },

      newAthlete: () =>
        set((s) => {
          const fresh = seedPlan();
          fresh.profile = { ...fresh.profile, name: `Atleta ${listAthletes(s).length + 1}` };
          return { ...activate(s, fresh, { ...s.roster, [s.plan.id]: s.plan }), builderTab: 'profile' };
        }),

      selectAthlete: (id) =>
        set((s) => {
          if (id === s.plan.id || !s.roster[id]) return {};
          const roster = { ...s.roster, [s.plan.id]: s.plan };
          const plan = roster[id];
          delete roster[id];
          return activate(s, plan, roster);
        }),
      switchAthlete: (id) => get().selectAthlete(id),

      receiveCloudPlan: (raw) => {
        const plan = sanitizePlan(raw);
        if (!plan) return null;
        set((s) => (plan.id === s.plan.id ? { plan } : { roster: { ...s.roster, [plan.id]: plan } }));
        return plan.id;
      },

      linkPartner: (id) =>
        set((s) => {
          const roster = { ...s.roster };
          const prev = s.plan.partnerId && roster[s.plan.partnerId];
          if (prev) roster[prev.id] = { ...prev, partnerId: undefined, partnerSyncAt: undefined };
          if (!id || !roster[id]) return { plan: touch({ ...s.plan, partnerId: undefined, partnerSyncAt: undefined }), roster };
          const other = roster[id];
          if (other.partnerId && other.partnerId !== s.plan.id && roster[other.partnerId]) roster[other.partnerId] = { ...roster[other.partnerId], partnerId: undefined, partnerSyncAt: undefined };
          const plan = touch({ ...s.plan, partnerId: id, partnerSyncAt: undefined });
          roster[id] = mirrorForPartner(other, plan);
          return { plan, roster };
        }),
      createPartner: () =>
        set((s) => {
          const fresh = seedPlan();
          const sex = s.plan.profile.sex === 'F' ? 'M' : 'F';
          const first = s.plan.profile.name.split(' ')[0] || 'Atleta';
          fresh.profile = {
            ...fresh.profile,
            ...s.plan.profile,
            name: `Pareja de ${first}`,
            sex,
            weightKg: sex === 'F' ? 60 : 78,
            heightCm: sex === 'F' ? 163 : 176,
            bodyFatPct: sex === 'F' ? 26 : 16,
            bodyFatBand: null,
          };
          fresh.periodization = { ...s.plan.periodization };
          fresh.anamnesis = { ...sanitizeAnamnesis(s.plan.anamnesis), allergies: [] };
          const plan = touch({ ...s.plan, partnerId: fresh.id, partnerSyncAt: undefined });
          return { plan, roster: { ...s.roster, [fresh.id]: mirrorForPartner({ ...fresh, partnerId: plan.id }, plan) } };
        }),
      pushMenuToPartner: () =>
        set((s) => {
          const other = s.plan.partnerId ? s.roster[s.plan.partnerId] : undefined;
          if (!other) return {};
          const plan = touch({ ...s.plan, partnerSyncAt: undefined });
          return { plan, roster: { ...s.roster, [other.id]: mirrorForPartner(other, plan) } };
        }),
      pullMenuFromPartner: () =>
        set((s) => {
          const other = s.plan.partnerId ? s.roster[s.plan.partnerId] : undefined;
          if (!other) return {};
          return { plan: mirrorForPartner(s.plan, other), roster: { ...s.roster, [other.id]: { ...other, partnerSyncAt: undefined } } };
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
          const notesByAthlete = { ...s.notesByAthlete };
          delete notesByAthlete[id];
          const base = { ...s, notesByAthlete, intakeNotes: '' };
          if (!next) return { ...activate(base, seedPlan(), {}), notesByAthlete };
          return { ...activate(base, next, Object.fromEntries(rest.map((p) => [p.id, p]))), notesByAthlete: { ...notesByAthlete } };
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
        merged.coachPhone = typeof saved.coachPhone === 'string' ? saved.coachPhone : '';
        setCoachContact(merged.coachPhone);
        merged.templates = Array.isArray(saved.templates)
          ? saved.templates.filter((t) => t && typeof t.id === 'string' && Array.isArray(t.meals) && t.periodization?.on && t.periodization?.off && t.weightKg > 0)
          : [];
        merged.exports = saved.exports && typeof saved.exports === 'object' ? saved.exports : {};
        // El panel de atletas sólo existe con la nube configurada.
        if (merged.builderTab === 'athletes' && !cloudConfigured) merged.builderTab = 'profile';
        if (merged.builderTab === 'anamnesis' || merged.builderTab === 'periodization') merged.builderTab = 'profile';
        // Migración: las notas globales de versiones anteriores pasan a ser del atleta activo.
        merged.notesByAthlete = { ...(saved.notesByAthlete ?? {}) };
        if (!(merged.plan.id in merged.notesByAthlete) && typeof saved.intakeNotes === 'string') merged.notesByAthlete[merged.plan.id] = saved.intakeNotes;
        merged.intakeNotes = merged.notesByAthlete[merged.plan.id] ?? '';
        // Un modelo de Gemini retirado que quedó guardado se reemplaza por el default vigente al hidratar.
        merged.ai.model = migrateModel(merged.ai.provider, merged.ai.model);
        return merged;
      },
      partialize: (s) => ({
        plan: s.plan,
        roster: s.roster,
        templates: s.templates,
        coachPhone: s.coachPhone,
        ai: s.ai,
        builderTab: s.builderTab,
        deployTab: s.deployTab,
        previewMode: s.previewMode,
        intakeNotes: s.intakeNotes,
        notesByAthlete: s.notesByAthlete,
        customFoods: s.customFoods,
        exports: s.exports,
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

/** Nombres profesionales: platos y comidas guardados con el nombre de una versión anterior (sin jerga). */
function modernizeMealNames(m: Meal): Meal {
  const fix = (items: FoodItem[]) => items.map((i) => ({ ...i, food: modernizeName(i.food) }));
  return {
    ...m,
    name: friendlyMealName(m.name),
    title: m.title && modernizeName(m.title),
    items: fix(m.items),
    alts: m.alts?.map((a) => ({ ...a, title: modernizeName(a.title), items: fix(a.items) })),
  };
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
    // Ingredientes repetidos en una comida (ej. palta 70 g + 45 g) se fusionan al cargar.
    meals: uniqueMealNames(p.meals.filter((m) => m && Array.isArray(m.items)).map(capCookingOil).map(consolidateMeal).map(normalizeMealOptions).map(modernizeMealNames)),
    anamnesis: sanitizeAnamnesis(p.anamnesis),
    nutritionist: sanitizeNutritionist(p.nutritionist),
  };
}

function sanitizeNutritionist(n: unknown): Nutritionist {
  const x = (n && typeof n === 'object' ? n : DEFAULT_NUTRITIONIST) as Partial<Nutritionist>;
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
  return { name: str(x.name, 80), specialty: str(x.specialty, 120), license: str(x.license, 40), show: x.show !== false, logo: safeLogo(x.logo) };
}

// Modo Parejas: la exportación encuentra el plan de la pareja en la base local (lista de compras combinada).
setPartnerResolver((id) => {
  const s = usePlanStore.getState();
  return id === s.plan.id ? s.plan : s.roster[id];
});

// Modo Parejas automático: sin «recalcular mis gramos» a mano.
//  · Persona B (espejo): si cambian su peso, objetivo, macros o restricciones, sus porciones se recalculan solas con el
//    menú del líder.
//  · Líder: si edita el menú (platos, opciones, gramos), la pareja recibe el cambio con sus propios gramos.
// Se agrupa con una pausa corta para no recalcular en cada tecla.
let coupleTimer: ReturnType<typeof setTimeout> | null = null;
usePlanStore.subscribe((s, prev) => {
  if (s.plan.id !== prev.plan.id || s.plan === prev.plan) return;
  const p = s.plan;
  const q = prev.plan;
  const partner = p.partnerId ? s.roster[p.partnerId] : undefined;
  if (!partner || partner.partnerId !== p.id) return;
  const mirror = !!p.partnerSyncAt;
  const dataChanged = p.profile !== q.profile || p.periodization !== q.periodization || allergiesOf(p).join() !== allergiesOf(q).join();
  const menuChanged = p.meals !== q.meals;
  if (!(mirror ? dataChanged : menuChanged)) return;
  if (coupleTimer) clearTimeout(coupleTimer);
  coupleTimer = setTimeout(() => {
    coupleTimer = null;
    const st = usePlanStore.getState();
    const other = st.plan.partnerId ? st.roster[st.plan.partnerId] : undefined;
    if (!other || other.partnerId !== st.plan.id) return;
    if (st.plan.partnerSyncAt) usePlanStore.setState({ plan: mirrorForPartner(st.plan, other) });
    else usePlanStore.setState({ roster: { ...st.roster, [other.id]: mirrorForPartner(other, st.plan) } });
  }, 400);
});

/** Las `n` alternativas más equivalentes a la Opción 1 (desvío de calorías + proteína). */
export function closestAlts(m: Meal, n: number): MealOption[] {
  const tot = (items: Meal['items']) => items.reduce((a, i) => ({ p: a.p + i.p, k: a.k + i.p * 4 + i.c * 4 + i.f * 9 }), { p: 0, k: 0 });
  const t = tot(m.items);
  const score = (o: MealOption) => {
    const u = tot(o.items);
    return Math.abs(u.k / Math.max(1, t.k) - 1) + Math.abs(u.p - t.p) / Math.max(10, t.p);
  };
  return [...(m.alts ?? [])].sort((a, b) => score(a) - score(b)).slice(0, n);
}

// Topes por protocolo (Keto / Low Carb): los reescalados del Builder usan los del alumno activo.
const syncCapDiet = (p: AthletePlan) => {
  setDefaultCapDiet(protocolOf(allergiesOf(p)));
  setDefaultCapSex(p.profile.sex);
};
syncCapDiet(usePlanStore.getState().plan);
usePlanStore.subscribe((s, prev) => {
  if (s.plan.anamnesis !== prev.plan.anamnesis || s.plan.id !== prev.plan.id || s.plan.profile.sex !== prev.plan.profile.sex) syncCapDiet(s.plan);
});
