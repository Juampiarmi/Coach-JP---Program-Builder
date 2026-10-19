import { parseTrainingWindow } from './anamnesis';
import { ALLERGIES, BUDGET_LABEL, CONDITIONS, COOKING_LABEL, sanitizeAnamnesis, sleepHours } from './anamnesisPro';
import { trainingWeekdays } from './bioenergetics';
import { foodDbPromptBlock, type BrandFood } from './foodBrandDb';
import { fmtHm, mealSchedule } from './schedule';
import type { AthletePlan } from './types';

const WD = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const label = (list: readonly { id: string; label: string }[], ids: string[]) => ids.map((id) => list.find((x) => x.id === id)?.label ?? id);

/** Reglas clínicas condicionales (sólo las que aplican al atleta). */
const CLINICAL_RULES: Record<string, string> = {
  reflux:
    'REFLUJO / ACIDEZ LATE-NIGHT: la cena NO lleva cítricos, tomate, picantes, café / mate, chocolate ni frituras; grasa de la cena ≤ 15 g y porciones moderadas; cenar ≥ 2,5-3 h antes de acostarse.',
  insulin:
    'RESISTENCIA A LA INSULINA: fuera de la ventana peri-entreno priorizá almidones complejos de bajo índice glucémico (avena, batata, arroz yamaní, legumbres si las tolera) siempre combinados con proteína y fibra; azúcares simples / carbos rápidos sólo en Pre-WOD y Post-WOD.',
  hypothyroid: 'HIPOTIROIDISMO: evitar ayunos prolongados; incluir pescado y huevo (yodo / selenio); crucíferas siempre cocidas; separar la medicación del desayuno (≥ 30-60 min).',
  ibs: 'INTESTINO IRRITABLE / FODMAP: bajo FODMAP — sin ajo, cebolla, legumbres, manzana ni exceso de trigo; lácteos deslactosados; preferí arroz, papa, avena, banana firme, frutillas y carnes magras.',
  hypertension: 'HIPERTENSIÓN: sodio < 2.000 mg/día — sin fiambres, embutidos, quesos duros, snacks salados ni caldos en cubo; priorizá potasio (banana, papa, verduras de hoja).',
};
const ALLERGY_RULES: Record<string, string> = {
  lactose: 'LACTOSA: sólo lácteos deslactosados o whey isolate; nada de leche común, ricota ni quesos frescos con lactosa.',
  gluten: 'GLUTEN / CELÍACO: todo sin TACC (arroz, papa, batata, maíz, avena certificada sin TACC); prohibido pan, fideos, galletitas, rebozados y harinas de trigo.',
  nuts: 'FRUTOS SECOS: excluidos por completo, incluida la pasta de maní.',
  shellfish: 'MARISCOS: excluidos por completo.',
  legumes: 'LEGUMBRES: sin lentejas, garbanzos, porotos, arvejas ni soja (ni maní).',
};
const BUDGET_RULE = {
  low: 'Presupuesto BAJO: cortes y proteínas económicas (pollo, huevos, merluza, carne picada magra, cerdo), arroz, papa, avena y fruta de estación; evitá productos premium.',
  mid: 'Presupuesto MEDIO: combinación de genéricos y marcas locales del catálogo.',
  high: 'Presupuesto ALTO: libre uso de productos premium y marcas proteicas del catálogo.',
};
const COOKING_RULE = {
  quick: 'Cocina RÁPIDA (≤ 10 min): platos de armado simple (plancha, salteados, microondas, yogur / huevo / atún).',
  batch: 'BATCH COOKING: preparaciones que se cocinan en tanda y se porcionan (pollo al horno, arroz, carne picada, verduras asadas, tartas).',
  gourmet: 'Nivel GOURMET: podés proponer preparaciones más elaboradas manteniendo los macros.',
};

/**
 * Contexto extendido que viaja a la IA junto con las notas: Anamnesis Pro con precisión cronobiológica,
 * restricciones clínicas, perfil gastronómico y el catálogo activo de la Food & Brand DB.
 */
export function buildPromptContext(plan: AthletePlan, foodDb: BrandFood[], notes = '') {
  const an = sanitizeAnamnesis(plan.anamnesis);
  const pr = plan.profile;
  // Franja explícita en las notas manda; si no, la del perfil / anamnesis.
  const w = parseTrainingWindow(notes);
  const training = w ? { trainingTime: w.time, sessionMinutes: w.minutes ?? pr.sessionMinutes } : pr;
  const sch = mealSchedule(training, w ? { ...an, mealTimesAuto: true } : an);
  const s = sch.slots;
  const days = trainingWeekdays(pr).map((d) => WD[d]).join(', ') || '—';
  const conditions = an.conditions.filter((c) => c !== 'none');
  const lines: string[] = [];

  lines.push('ANAMNESIS PRO & LIFESTYLE (datos estructurados del coach, tienen prioridad sobre suposiciones):');
  lines.push(`- Cronobiología: despierta ${an.wakeTime} · se acuesta ${an.bedTime} (≈ ${sleepHours(an.bedTime, an.wakeTime).toFixed(1).replace('.', ',')} h de sueño).`);
  lines.push(`- Entrenamiento: ${fmtHm(sch.start)} a ${fmtHm(sch.end)} (${sch.end - sch.start} min) · días ON: ${days}. profile.trainingTime = "${fmtHm(sch.start)}", profile.sessionMinutes = ${sch.end - sch.start}.`);
  lines.push(
    `- HORARIOS OBLIGATORIOS DEL DÍA ON (orden cronológico inquebrantable): Desayuno ${fmtHm(s.breakfast)} · Almuerzo ${fmtHm(s.lunch)} · Pre-WOD / Merienda ${fmtHm(s.peri)} · Post-WOD inmediato ${fmtHm(s.post)} · Cena principal ${fmtHm(s.dinner)}. Ninguna comida antes de despertar ni después de acostarse.`,
  );
  lines.push(`- Patologías / condiciones: ${conditions.length ? label(CONDITIONS, conditions).join(', ') : 'ninguna'}.`);
  lines.push(`- Alergias / intolerancias: ${an.allergies.length ? `${label(ALLERGIES, an.allergies).join(', ')} → EXCLUIR por completo` : 'ninguna'}.`);
  if (an.favorites.trim()) lines.push(`- Alimentos de preferencia (usalos cuando encajen en los macros): ${an.favorites.trim()}.`);
  if (an.aversions.trim()) lines.push(`- Aversiones / rechazos (NO usar nunca): ${an.aversions.trim()}.`);
  if (an.snacks.length) lines.push(`- Snacks tácticos permitidos para control de ansiedad (colaciones): ${an.snacks.join(', ')}.`);
  lines.push(`- Presupuesto: ${BUDGET_LABEL[an.budget]} · Nivel de cocina: ${COOKING_LABEL[an.cooking]}.`);

  const rules = [
    ...conditions.map((c) => CLINICAL_RULES[c]).filter(Boolean),
    ...an.allergies.map((a) => ALLERGY_RULES[a]).filter(Boolean),
    BUDGET_RULE[an.budget],
    COOKING_RULE[an.cooking],
    'Reglas culinarias vigentes: nada de tutucas / cereales con queso untable; palta ≤ 70 g por comida; nunca dos comidas pesadas de carne a menos de 3 h; un mismo alimento no se repite dentro de una comida.',
  ];
  lines.push('', 'REGLAS DE SEGURIDAD NUTRICIONAL PARA ESTE ATLETA (obligatorias):', ...rules.map((r) => `- ${r}`));

  const db = foodDbPromptBlock(foodDb);
  if (db) lines.push('', db);
  return `\n\n${lines.join('\n')}`;
}
