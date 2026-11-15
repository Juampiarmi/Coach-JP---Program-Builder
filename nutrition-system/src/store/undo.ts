'use client';

import { create } from 'zustand';
import type { AthletePlan } from '@/lib/types';
import { usePlanStore } from './usePlanStore';

/**
 * Historial de deshacer / rehacer del plan activo (sólo en memoria, no se persiste).
 * Escucha cada cambio de `plan` en el store: las ediciones seguidas (tipear gramos, mover un slider) dentro de
 * COALESCE_MS se agrupan en un solo paso; los cambios estructurales (cargar plan semilla, completar opciones,
 * rebalancear, borrar comidas) siempre abren un paso propio. Cambiar de atleta vacía el historial.
 */
const LIMIT = 40;
const COALESCE_MS = 900;

interface Entry {
  plan: AthletePlan;
  label: string;
}
interface UndoState {
  past: Entry[];
  future: Entry[];
}

export const useUndoStore = create<UndoState>(() => ({ past: [], future: [] }));

const altCount = (p: AthletePlan) => p.meals.reduce((a, m) => a + (m.alts?.length ?? 0), 0);
const itemCount = (p: AthletePlan) => p.meals.reduce((a, m) => a + m.items.length, 0);

/** Descripción corta del cambio entre dos versiones del plan ("Borrar comida", "Opciones alternativas"…). */
export function describeChange(prev: AthletePlan, next: AthletePlan): string {
  if (prev.meals.length > next.meals.length) return 'Borrar comida';
  if (prev.meals.length < next.meals.length) return next.meals.length - prev.meals.length > 1 ? 'Cargar plan' : 'Agregar comida';
  const ids = (p: AthletePlan) => p.meals.map((m) => m.id).join(',');
  if (ids(prev) !== ids(next)) return 'Cargar plan';
  if (altCount(prev) !== altCount(next)) return 'Opciones alternativas';
  if (itemCount(prev) !== itemCount(next)) return 'Alimentos de una comida';
  if (JSON.stringify(prev.meals) !== JSON.stringify(next.meals)) return 'Edición de comidas';
  if (JSON.stringify(prev.profile) !== JSON.stringify(next.profile)) return 'Perfil del atleta';
  if (JSON.stringify(prev.periodization) !== JSON.stringify(next.periodization)) return 'Metas de macros';
  if (JSON.stringify(prev.supplements) !== JSON.stringify(next.supplements)) return 'Suplementos';
  return 'Cambio en el plan';
}

const structural = (a: AthletePlan, b: AthletePlan) =>
  a.meals.length !== b.meals.length || altCount(a) !== altCount(b) || itemCount(a) !== itemCount(b) || a.meals.map((m) => m.id).join() !== b.meals.map((m) => m.id).join();

let restoring = false;
let lastAt = 0;
let started = false;

/** Arranca la escucha (una vez, después de hidratar el store persistido). */
export function startUndo() {
  if (started || typeof window === 'undefined') return;
  started = true;
  usePlanStore.subscribe((state, prevState) => {
    const next = state.plan, prev = prevState.plan;
    if (next === prev || restoring) return;
    if (next.id !== prev.id) {
      useUndoStore.setState({ past: [], future: [] });
      return;
    }
    const now = Date.now();
    const { past } = useUndoStore.getState();
    const merge = past.length > 0 && now - lastAt < COALESCE_MS && !structural(prev, next);
    lastAt = now;
    if (merge) {
      useUndoStore.setState({ future: [] });
      return;
    }
    useUndoStore.setState({ past: [...past, { plan: prev, label: describeChange(prev, next) }].slice(-LIMIT), future: [] });
  });
}

function apply(plan: AthletePlan) {
  restoring = true;
  try {
    usePlanStore.setState({ plan });
  } finally {
    restoring = false;
    lastAt = 0;
  }
}

/** Deshace el último paso. Devuelve su descripción (o null si no hay nada). */
export function undo(): string | null {
  const { past, future } = useUndoStore.getState();
  const last = past[past.length - 1];
  if (!last) return null;
  const cur = usePlanStore.getState().plan;
  useUndoStore.setState({ past: past.slice(0, -1), future: [...future, { plan: cur, label: last.label }] });
  apply(last.plan);
  return last.label;
}

export function redo(): string | null {
  const { past, future } = useUndoStore.getState();
  const nxt = future[future.length - 1];
  if (!nxt) return null;
  const cur = usePlanStore.getState().plan;
  useUndoStore.setState({ future: future.slice(0, -1), past: [...past, { plan: cur, label: nxt.label }] });
  apply(nxt.plan);
  return nxt.label;
}
