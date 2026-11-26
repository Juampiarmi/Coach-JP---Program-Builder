// Prueba automática del Banco de Planes Maestros: 24 planes (8 perfiles × 3 variantes) × 6 pesos de referencia
// × 4 horarios de entreno × día de entreno y de descanso. Falla si algún ingrediente (opción 1 o alternativas)
// supera su tope duro de la Tabla Única de Topes, si una toma supera el volumen sólido cómodo para el sexo, si la
// proteína de una mujer sale de 1,6-2,3 g/kg, si el día no cierra a ±5 % de las calorías, si una comida tiene
// menos de 4 opciones, si la variante no se respeta (gluten en Sin TACC, carne en vegetariano) o si la agenda no es
// la argentina: la cena es siempre la última comida (21:00-22:30), no hay «antes de dormir», ninguna comida cae
// durante el entreno y entre dos tomas hay al menos 1 h 30. Uso: npm run test:unit
import { BANK_PLAN_IDS, BANK_VARIANTS, buildBankPlan, GLUTEN_FOODS, mealCount, MEAT_FOODS, planLabel, REF_WEIGHTS, sexOf, trainingOf, type BankSelection } from './planBank';
import { timeToMinutes } from './schedule';

/** Entreno a la mañana temprano, al mediodía, a la tarde y a la noche. */
const TRAININGS = [{ trainingTime: '07:00', sessionMinutes: 60 }, { trainingTime: '12:00', sessionMinutes: 75 }, { trainingTime: '18:00', sessionMinutes: 60 }, { trainingTime: '20:00', sessionMinutes: 90 }];
import { netCarbs } from './foods';
import { FOOD_ALLERGENS } from './allergens';
let ketoMax = 0;
let lowMax = 0;
import { MAIN_MEAT_FLOOR, MAIN_MEATS, mealVolumeCap, portionCap, solidGrams } from './portionCaps';

const fails: string[] = [];
let checks = 0;
let worst = 0;
let worstP = 0;
let worstPTag = '';
let extras = 0;
let desserts = 0;
const short: string[] = [];
const counts = new Map<string, number>();
for (const plan of BANK_PLAN_IDS) {
  for (const { id: variant } of BANK_VARIANTS) {
    const sel: BankSelection = { plan, variant };
    const sex = sexOf(plan);
    for (const w of REF_WEIGHTS[sex]) for (const trn of TRAININGS) {
      const tr = trainingOf(trn);
      const bp = buildBankPlan(sel, w, tr);
      for (const day of ['on', 'off'] as const) {
        const tag = `${planLabel(sel)} · ${w} kg · entrena ${trn.trainingTime} · ${day === 'on' ? 'entreno' : 'descanso'}`;
        const meals = bp.meals.filter((m) => m.day === day);
        // Agenda argentina.
        const ts = meals.map((m) => timeToMinutes(m.time));
        const dinner = meals.findIndex((m) => m.role === 'dinner');
        const key = `${sex}${bp.tier}-${day}`;
        counts.set(key, Math.max(counts.get(key) ?? 0, meals.length));
        if (dinner !== meals.length - 1) fails.push(`${tag}: la cena no es la última comida (${meals.map((m) => `${m.time} ${m.name}`).join(' · ')})`);
        if (ts[dinner] < 21 * 60 || ts[dinner] > 22 * 60 + 30) fails.push(`${tag}: cena a las ${meals[dinner].time}`);
        meals.forEach((m, i) => {
          if (/dormir/i.test(m.name)) fails.push(`${tag}: comida «${m.name}»`);
          if (i && ts[i] - ts[i - 1] < 90) fails.push(`${tag}: ${meals[i - 1].time} ${meals[i - 1].name} y ${m.time} ${m.name} quedan a menos de 1 h 30`);
          if (day === 'on' && ts[i] > tr.start - 30 && ts[i] < tr.end + 15) fails.push(`${tag}: ${m.time} ${m.name} cae durante el entreno`);
        });
        if (meals[dinner]?.title?.includes('+ postre:')) desserts++;
        const T = bp.target[day];
        const kcal = meals.reduce((a, m) => a + m.items.reduce((s, i) => s + i.p * 4 + i.c * 4 + i.f * 9, 0), 0);
        const p = meals.reduce((a, m) => a + m.items.reduce((s, i) => s + i.p, 0), 0);
        const dev = kcal / T.kcal - 1;
        worst = Math.max(worst, Math.abs(dev));
        if (Math.abs(p / T.p - 1) > worstP) {
          worstP = Math.abs(p / T.p - 1);
          worstPTag = `${tag} (${(p / w).toFixed(2)} g/kg)`;
        }
        const base = mealCount(sex, bp.tier === 'B', day, tr);
        if (meals.length > base) extras += meals.length - base;
        if (meals.length < base) short.push(`${tag}: ${meals.length} comidas de ${base}`);
        checks++;
        // Mujer: proteína en su rango fisiológico 1,6-2,3 g/kg, también en las más livianas con el bife de ≥ 120 g.
        const pMax = 2.3;
        if (sex === 'F' && (p / w < 1.6 || p / w > pMax)) fails.push(`${tag}: proteína ${(p / w).toFixed(2)} g/kg (rango 1,6-${pMax})`);
        // Protocolos: carbos NETOS del día (keto ≤ 50 g; low carb ≤ 100 g + 5 % de tolerancia) y proteína moderada en keto.
        const net = netCarbs(meals.flatMap((m) => m.items));
        if (variant === 'keto') { ketoMax = Math.max(ketoMax, net); if (net > 50) fails.push(`${tag}: ${net.toFixed(0)} g de carbos netos (keto ≤ 50 g)`); if (p / w > 2.3) fails.push(`${tag}: proteína keto ${(p / w).toFixed(2)} g/kg (moderada ≤ 2,3)`); }
        if (variant === 'lowcarb') { lowMax = Math.max(lowMax, net); if (net > 105) fails.push(`${tag}: ${net.toFixed(0)} g de carbos netos (low carb ≤ 100 g)`); }
        if (Math.abs(dev) > 0.05) fails.push(`${tag}: el día cierra en ${Math.round(kcal)} kcal vs ${Math.round(T.kcal)} (${(dev * 100).toFixed(1)} %)`);
        for (const m of meals) {
          const opts = [{ title: m.title ?? '', items: m.items }, ...(m.alts ?? [])];
          if (opts.length < 4) fails.push(`${tag} · ${m.name}: sólo ${opts.length} opciones`);
          for (const o of opts) {
            // Volumen sólido cómodo por toma (MEAL_VOLUME, distinto para mujer y hombre).
            const vol = solidGrams(o.items);
            if (vol > mealVolumeCap(sex, m.role) + 5) fails.push(`${tag} · ${m.name} · ${o.title}: ${vol} g sólidos (tope ${mealVolumeCap(sex, m.role)} g)`);
            for (const it of o.items) {
              checks++;
              const cap = portionCap(it.foodId, { sex, role: m.role, veg: variant === 'veg', diet: variant === 'keto' || variant === 'lowcarb' ? variant : undefined }).max;
              if (it.grams > cap) fails.push(`${tag} · ${m.name} · ${o.title}: ${it.food} ${it.grams} g supera el tope de ${cap} g`);
              // Piso visible de carne en almuerzo y cena; unidades enteras; mujer sin leche fluida.
              if (it.foodId && MAIN_MEATS.has(it.foodId) && (m.role === 'lunch' || m.role === 'dinner') && it.grams < MAIN_MEAT_FLOOR[sex]) fails.push(`${tag} · ${m.name} · ${o.title}: ${it.food} ${it.grams} g (piso ${MAIN_MEAT_FLOOR[sex]} g)`);
              if (it.foodId === 'huevo' && it.grams % 60) fails.push(`${tag} · ${o.title}: huevo ${it.grams} g no es una unidad entera`);
              if ((it.foodId === 'barra-proteica' && it.grams !== 46) || (it.foodId === 'alfajor-proteico' && it.grams !== 50)) fails.push(`${tag} · ${o.title}: ${it.food} ${it.grams} g (siempre 1 unidad)`);
              if (sex === 'F' && (it.foodId === 'leche' || it.foodId === 'leche-deslactosada') && it.grams > 100) fails.push(`${tag} · ${o.title}: ${it.grams} ml de leche fluida en un plan de mujer`);
              if (variant === 'stacc' && it.foodId && GLUTEN_FOODS.has(it.foodId)) fails.push(`${tag} · ${o.title}: ${it.food} tiene gluten`);
              if (variant === 'veg' && it.foodId && MEAT_FOODS.has(it.foodId)) fails.push(`${tag} · ${o.title}: ${it.food} no es vegetariano`);
              if ((variant === 'keto' || variant === 'lowcarb') && it.foodId && (FOOD_ALLERGENS[it.foodId] ?? []).includes(variant)) fails.push(`${tag} · ${o.title}: ${it.food} no respeta el protocolo ${variant}`);
            }
            const eggs = o.items.reduce((a, i) => a + (i.foodId === 'huevo' ? i.grams / 60 : i.foodId === 'claras' ? i.grams / 33 : 0), 0);
            if (eggs > 8.01) fails.push(`${tag} · ${o.title}: ${eggs} huevos + claras (máximo 8)`);
          }
        }
      }
    }
  }
}
// Volumen muy alto (fuera de los pesos de referencia): las calorías extra van como postre dentro de la cena.
{
  const bp = buildBankPlan({ plan: 'M-ren', variant: 'std' }, 115, trainingOf({ trainingTime: '18:00', sessionMinutes: 60 }));
  const on = bp.meals.filter((m) => m.day === 'on');
  const last = on[on.length - 1];
  checks++;
  if (last.role !== 'dinner' || !last.title?.includes('+ postre:')) fails.push(`115 kg: se esperaba la cena con postre como última comida (${on.map((m) => `${m.time} ${m.name}`).join(' · ')})`);
  if (/fruta de postre/.test(last.title ?? '')) fails.push('115 kg: la cena tiene dos postres');
  for (const o of [{ items: last.items }, ...(last.alts ?? [])]) for (const it of o.items) if (it.grams > portionCap(it.foodId, { sex: 'M', role: 'dinner' }).max) fails.push(`115 kg · cena: ${it.food} ${it.grams} g supera el tope`);
}
console.log(`Banco de planes: ${checks} verificaciones · peor cierre de calorías ${(worst * 100).toFixed(1)} % · peor desvío de proteína ${(worstP * 100).toFixed(1)} % · ${extras} colaciones extra · ${desserts} cenas con postre`);
if (short.length) console.log(`Días con una colación menos (no entra en la agenda): ${short.length}\n  ${short.slice(0, 6).join('\n  ')}`);
console.log(`Peor proteína: ${worstPTag}`);
console.log(`Protocolos: carbos netos máximos del día · Keto ${ketoMax.toFixed(0)} g · Low Carb ${lowMax.toFixed(0)} g`);
console.log(`Comidas por día (máximo): ${[...counts].sort().map(([k, v]) => `${k} ${v}`).join(' · ')}`);
if (fails.length) {
  console.error(fails.slice(0, Number(process.env.SHOW ?? 40)).join('\n'));
  console.error(`\n✗ ${fails.length} problemas en el banco de planes`);
  process.exit(1);
}
console.log('✓ 40 planes (8 perfiles × 5 variantes: estándar, sin TACC, vegetariano, low carb y keto) × 6 pesos × 4 horarios de entreno × entreno / descanso: ningún ingrediente supera su tope, todos los días cierran a ±5 % y la cena cierra el día');
