import { EMPTY_SKINFOLDS, hydrationDefaults, PHASE_PRESETS } from './bioenergetics';
import { aisGroupA } from './evidence';
import { FOOD_BY_ID, macrosFor } from './foods';
import type { AthletePlan, FoodItem, Meal, MealDay, MealRole } from './types';

export const uid = () => Math.random().toString(36).slice(2, 10);

export function itemFromFood(foodId: string, grams: number): FoodItem {
  const ref = FOOD_BY_ID[foodId];
  const m = macrosFor(foodId, grams)!;
  return { id: uid(), foodId, food: ref.name, grams, ...m };
}

function meal(name: string, time: string, day: MealDay, role: MealRole, items: [string, number][]): Meal {
  return { id: uid(), name, time, day, role, items: items.map(([id, g]) => itemFromFood(id, g)) };
}

/** Atleta de demostración: Hyrox · 82 kg · Déficit de Recomposición. */
export function seedPlan(): AthletePlan {
  const weightKg = 82;
  return {
    version: 1,
    id: uid(),
    publicUrl: '',
    hydration: hydrationDefaults(weightKg, 75),
    profile: {
      name: 'Atleta Hyrox',
      sex: 'M',
      age: 29,
      heightCm: 178,
      weightKg,
      bodyFatPct: 15,
      precisionMode: 'quick',
      bodyFatBand: 'athletic',
      skinfolds: { ...EMPTY_SKINFOLDS },
      measuredFfmKg: 0,
      discipline: 'hybrid',
      phase: 'recomp',
      bmrFormula: 'katch',
      activityFactor: 1.45,
      sessionKcal: 600,
      trainingDaysPerWeek: 5,
      trainingTime: '18:00',
      sessionMinutes: 75,
      notes:
        'Hyrox Pro. Entrena 18:00 h (5x/sem). Oficina 9-17 h. Rechaza hígado y pescados grasos. Sin intolerancias. Presupuesto medio.',
    },
    periodization: {
      on: { ...PHASE_PRESETS.recomp.on },
      off: { ...PHASE_PRESETS.recomp.off },
      refeed: { enabled: false, hours: 48, carbsGkg: 8 },
      dietBreak: { enabled: false, days: 10 },
    },
    meals: [
      meal('Desayuno', '07:30', 'both', 'breakfast', [
        ['avena', 60],
        ['whey', 35],
        ['claras', 99],
        ['frutillas', 150],
      ]),
      meal('Almuerzo', '12:30', 'on', 'lunch', [
        ['pollo', 150],
        ['arroz', 300],
        ['vegetales', 200],
        ['oliva', 8],
      ]),
      meal('Peri-entreno', '17:30', 'on', 'peri', [
        ['galletas-arroz', 36],
        ['miel', 25],
        ['banana', 120],
        ['isotonica', 500],
      ]),
      meal('Post-inmediato', '19:30', 'on', 'post', [
        ['whey', 30],
        ['pan', 90],
      ]),
      meal('Cena', '21:30', 'on', 'dinner', [
        ['cuadril', 150],
        ['batata', 300],
        ['vegetales', 200],
        ['palta', 60],
        ['oliva', 5],
      ]),
      meal('Almuerzo', '13:00', 'off', 'lunch', [
        ['pollo', 160],
        ['yamani', 100],
        ['vegetales', 250],
        ['oliva', 13],
      ]),
      meal('Merienda', '17:00', 'off', 'snack', [
        ['yogur', 200],
        ['ricota', 100],
        ['nueces', 30],
        ['manzana', 180],
      ]),
      meal('Cena', '21:00', 'off', 'dinner', [
        ['merluza', 200],
        ['papa', 110],
        ['vegetales', 250],
        ['palta', 100],
        ['oliva', 10],
      ]),
    ],
    supplements: aisGroupA(weightKg),
    coachNote:
      'Recomposición agresiva con periodización ON/OFF. Carbos concentrados alrededor de la sesión; grasas hormonales en días OFF. Proteína constante a 2,3 g/kg con bolos ≥2,7 g de leucina.',
    updatedAt: Date.now(),
  };
}
