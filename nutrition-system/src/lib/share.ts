import { computeTelemetry, fmt0, PHASE_LABEL } from './bioenergetics';
import { BRAND } from './brand';
import { slugify } from './exportHtml';
import type { AthletePlan } from './types';

const liters = (ml: number) => (ml / 1000).toLocaleString('es-AR', { maximumFractionDigits: 2 });

/** URL sugerida en GitHub Pages cuando el coach todavía no cargó el link real. */
export function suggestedUrl(plan: AthletePlan) {
  return `https://TU-USUARIO.github.io/atleta-${slugify(plan.profile.name)}/`;
}

/** Resumen del plan con formato WhatsApp (*negrita*, _cursiva_) + link de la PWA del atleta. */
export function whatsappSummary(plan: AthletePlan) {
  const t = computeTelemetry(plan);
  const pr = plan.profile;
  const sups = plan.supplements.filter((s) => s.enabled);
  const url = plan.publicUrl.trim() || suggestedUrl(plan);
  const first = pr.name.trim().split(/\s+/)[0] || 'atleta';
  const lines = [
    `*COACH JP · BIOENERGETICS & NUTRITION* 🔥`,
    '',
    `¡Hola *${first}*! Bienvenido/a al sistema de alto rendimiento. Ya tenés tu plan nutricional personalizado listo:`,
    '',
    `Atleta: *${pr.name}* · Fase: ${PHASE_LABEL[pr.phase]}`,
    '',
    `*DÍA ON (entreno ${pr.trainingTime} h)*: ${fmt0(t.kcalOn)} kcal`,
    `Proteína ${t.gramsOn.p} g · Carbos ${t.gramsOn.c} g · Grasas ${t.gramsOn.f} g`,
    `*DÍA OFF (descanso)*: ${fmt0(t.kcalOff)} kcal`,
    `Proteína ${t.gramsOff.p} g · Carbos ${t.gramsOff.c} g · Grasas ${t.gramsOff.f} g`,
    '',
    `💧 Hidratación: ${liters(plan.hydration.onMl)} L día ON · ${liters(plan.hydration.offMl)} L día OFF`,
    ...(sups.length ? [`💊 Suplementos: ${sups.map((s) => `${s.name} (${s.dose})`).join(' · ')}`] : []),
    ...(plan.coachNote ? ['', `📌 ${plan.coachNote}`] : []),
    '',
    `📲 *Tu app con el plan completo:* ${url}`,
    `Instalala → iPhone: Safari › Compartir › «Agregar a inicio» · Android: Chrome › ⋮ › «Instalar app»`,
    '',
    `_${BRAND.handle}_`,
  ];
  return lines.join('\n');
}
