import { parseTrainingWindow } from './anamnesis';
import { ALLERGIES, ANXIETY_LABEL, BUDGET_LABEL, CONDITIONS, COOKING_LABEL, FASTING_LABEL, FASTING_WINDOW_H, sanitizeAnamnesis, SLOT_LABEL, SLOTS, sleepHours } from './anamnesisPro';
import { DISCIPLINE_LABEL } from './exportHtml';
import { PHASE_LABEL } from './bioenergetics';
import { trainingWeekdays } from './bioenergetics';
import { foodDbPromptBlock, type BrandFood } from './foodBrandDb';
import { fmtHm, mealSchedule } from './schedule';
import type { AnxietyZone, AthletePlan, MealSlot } from './types';

const ANXIETY_RANGE: Record<AnxietyZone, string> = { morning: '09:00-12:00', afternoon: '17:00-19:00', night: '21:00-23:00' };

/** Horarios activos (sin las ingestas desactivadas) en orden cronológico. */
export function activeSlots(plan: AthletePlan) {
  const an = sanitizeAnamnesis(plan.anamnesis);
  const sch = mealSchedule(plan.profile, an);
  return { an, sch, slots: SLOTS.filter((k) => !an.disabledSlots.includes(k)).sort((a, b) => sch.slots[a] - sch.slots[b]) };
}

/**
 * Ficha técnica estructurada redactada desde la Anamnesis Pro para la caja de notas del Prompt Engine
 * (botón «Sincronizar y compilar»). Lleva «Nombre:» explícito y la franja «entreno HH:MM a HH:MM hs»
 * para que el parser de anamnesis nunca herede datos de otro atleta.
 */
export function anamnesisToNotes(plan: AthletePlan, foodDb: BrandFood[]) {
  const pr = plan.profile;
  const { an, sch, slots } = activeSlots(plan);
  const days = trainingWeekdays(pr).map((d) => WD[d]).join(', ') || '—';
  const conditions = an.conditions.filter((c) => c !== 'none');
  const brands = foodDb.filter((b) => b.disponible_para_ia && b.es_marca_local);
  const off = an.disabledSlots.map((k) => SLOT_LABEL[k]);
  return [
    `FICHA TÉCNICA · ANAMNESIS PRO`,
    `Nombre: ${pr.name}`,
    `- ${pr.sex === 'F' ? 'Mujer' : 'Hombre'} · ${pr.age} años · ${pr.heightCm} cm · ${pr.weightKg} kg · ${pr.bodyFatPct} % graso · fase ${PHASE_LABEL[pr.phase]}`,
    `- Disciplina: ${DISCIPLINE_LABEL[pr.discipline]} · ${pr.trainingDaysPerWeek} días ON (${days}) · entreno de ${fmtHm(sch.start)} a ${fmtHm(sch.end)} hs (${sch.end - sch.start} min)`,
    `- Despierta ${an.wakeTime} · se acuesta ${an.bedTime}`,
    `- Comidas del día ON: ${slots.map((k) => `${SLOT_LABEL[k]} ${fmtHm(sch.slots[k])}`).join(' · ')}${off.length ? ` · DESACTIVADAS: ${off.join(', ')}` : ''}`,
    `- Ayuno: ${FASTING_LABEL[an.fasting]} · zona crítica de ansiedad: ${ANXIETY_LABEL[an.anxiety]}`,
    `- Patologías: ${conditions.length ? label(CONDITIONS, conditions).join(', ') : 'ninguna'} · Alergias / intolerancias: ${an.allergies.length ? label(ALLERGIES, an.allergies).join(', ') : 'ninguna'}`,
    `- Favoritos: ${an.favorites.trim() || '—'}`,
    `- Aversiones: ${an.aversions.trim() || '—'}`,
    `- Snacks tácticos: ${an.snacks.join(', ') || '—'}`,
    `- Presupuesto ${BUDGET_LABEL[an.budget]} · cocina ${COOKING_LABEL[an.cooking]}`,
    `- Marcas locales disponibles: ${brands.length ? brands.map((b) => (b.marca ? `${b.nombre} (${b.marca})` : b.nombre)).slice(0, 12).join(', ') : '—'}${brands.length > 12 ? '…' : ''}`,
  ].join('\n');
}

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
  const enabled = SLOTS.filter((k) => !an.disabledSlots.includes(k)).sort((a, b) => s[a] - s[b]);
  const name: Record<MealSlot, string> = { breakfast: 'Desayuno', lunch: 'Almuerzo', peri: 'Pre-WOD / Merienda', post: 'Post-WOD inmediato', dinner: 'Cena principal' };
  const days = trainingWeekdays(pr).map((d) => WD[d]).join(', ') || '—';
  const conditions = an.conditions.filter((c) => c !== 'none');
  const lines: string[] = [];

  lines.push('ANAMNESIS PRO & LIFESTYLE (datos estructurados del coach, tienen prioridad sobre suposiciones):');
  lines.push(`- Cronobiología: despierta ${an.wakeTime} · se acuesta ${an.bedTime} (≈ ${sleepHours(an.bedTime, an.wakeTime).toFixed(1).replace('.', ',')} h de sueño).`);
  lines.push(`- Entrenamiento: ${fmtHm(sch.start)} a ${fmtHm(sch.end)} (${sch.end - sch.start} min) · días ON: ${days}. profile.trainingTime = "${fmtHm(sch.start)}", profile.sessionMinutes = ${sch.end - sch.start}.`);
  lines.push(
    `- HORARIOS OBLIGATORIOS DEL DÍA ON (orden cronológico inquebrantable): ${enabled.map((k) => `${name[k]} ${fmtHm(s[k])}`).join(' · ')}. Ninguna comida antes de despertar ni después de acostarse.`,
  );
  if (an.disabledSlots.length)
    lines.push(
      `- INGESTAS DESACTIVADAS: ${an.disabledSlots.map((k) => name[k]).join(', ')} → NO generes esas comidas. Redistribuí sus kcal y macros en las ${enabled.length} comidas restantes: el total diario de kcal, proteínas, carbos y grasas NO cambia.`,
    );
  const winH = FASTING_WINDOW_H[an.fasting];
  if (winH && enabled.length) {
    const first = s[enabled[0]];
    const last = s[enabled[enabled.length - 1]];
    const span = (last - first) / 60;
    lines.push(
      `- AYUNO ${FASTING_LABEL[an.fasting]}: ventana de alimentación de ${winH} h. Primera ingesta ${fmtHm(first)}, última ${fmtHm(last)} (≈ ${span.toFixed(1).replace('.', ',')} h)${span > winH ? `; comprimí la ventana a ${fmtHm(last - winH * 60)}-${fmtHm(last)}` : ''}. Fuera de la ventana sólo agua, café o mate sin azúcar.`,
    );
  } else if (an.fasting === 'circadian')
    lines.push('- ALIMENTACIÓN CIRCADIANA: primera ingesta dentro de la hora de despertar, cena ≥ 3 h antes de acostarse y carbos concentrados en la primera mitad del día (salvo Pre / Post-WOD).');
  if (an.snacks.length)
    lines.push(`- ZONA CRÍTICA DE ANSIEDAD: ${ANXIETY_LABEL[an.anxiety]} (${ANXIETY_RANGE[an.anxiety]}). Ubicá ahí los snacks tácticos como colación planificada dentro de las kcal del día.`);
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
