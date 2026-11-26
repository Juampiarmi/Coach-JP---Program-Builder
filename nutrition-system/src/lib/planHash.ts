import type { AthletePlan } from './types';

/**
 * Huella del contenido que viaja en la PWA del atleta (perfil, metas, comidas, suplementos, nota, hidratación y
 * anamnesis). Excluye metadatos que no cambian lo que ve el atleta (updatedAt, link público).
 * FNV-1a de 32 bits: rápida y estable para detectar "plan editado después de la última exportación".
 */
export function planFingerprint(plan: AthletePlan): string {
  const { profile, periodization, meals, supplements, coachNote, hydration, anamnesis, nutritionist } = plan;
  const txt = JSON.stringify({ profile, periodization, meals, supplements, coachNote, hydration, anamnesis, nutritionist });
  let h = 0x811c9dc5;
  for (let i = 0; i < txt.length; i++) {
    h ^= txt.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36) + ':' + txt.length.toString(36);
}

/** "hace 3 min", "hace 2 h", "hace 4 días". */
export function timeAgo(at: number, now = Date.now()) {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 60) return 'hace instantes';
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} día${d > 1 ? 's' : ''}`;
}
