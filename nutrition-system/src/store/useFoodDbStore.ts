'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { brandFoodsToRefs, dishTitleCase, modernizeName, sanitizeBrandFood, SEED_VERSION, seedFoodDb, type BrandFood } from '@/lib/foodBrandDb';
import { registerFoodSource } from '@/lib/foods';

interface FoodDbState {
  items: BrandFood[];
  /** Versión del catálogo pre-cargado ya incorporada (migraciones aditivas). */
  seedVersion: number;
  upsert: (item: BrandFood) => void;
  remove: (id: string) => void;
  toggleAi: (id: string) => void;
  /** Importa un JSON exportado (o un array suelto). merge = suma / actualiza por id; replace = reemplaza todo. */
  importJson: (raw: unknown, mode: 'merge' | 'replace') => number;
  resetSeed: () => void;
}

const sync = (items: BrandFood[]) => {
  registerFoodSource('db', brandFoodsToRefs(items));
  return { items };
};

/** Food & Brand DB del coach: persistida en localStorage, compartida por todos los atletas. */
export const useFoodDbStore = create<FoodDbState>()(
  persist(
    (set, get) => ({
      items: seedFoodDb(),
      seedVersion: SEED_VERSION,
      upsert: (item) => {
        const items = get().items.some((x) => x.id === item.id) ? get().items.map((x) => (x.id === item.id ? item : x)) : [...get().items, item];
        set(sync(items));
      },
      remove: (id) => set(sync(get().items.filter((x) => x.id !== id))),
      toggleAi: (id) => set(sync(get().items.map((x) => (x.id === id ? { ...x, disponible_para_ia: !x.disponible_para_ia } : x)))),
      importJson: (raw, mode) => {
        const data = raw as { items?: unknown } | unknown[];
        const list = (Array.isArray(data) ? data : Array.isArray((data as { items?: unknown })?.items) ? ((data as { items: unknown[] }).items) : [])
          .map(sanitizeBrandFood)
          .filter((x): x is BrandFood => !!x);
        if (!list.length) return 0;
        if (mode === 'replace') set(sync(list));
        else {
          const byId = new Map(get().items.map((x) => [x.id, x]));
          list.forEach((x) => byId.set(x.id, x));
          set(sync([...byId.values()]));
        }
        return list.length;
      },
      resetSeed: () => set(sync(seedFoodDb())),
    }),
    {
      name: 'coachjp-food-db',
      version: 3,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items, seedVersion: s.seedVersion }),
      // La DB guardada del coach recibe los ítems nuevos del catálogo (platos, quiosco…) sin perder sus ediciones.
      migrate: (persisted) => persisted as FoodDbState,
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<FoodDbState>;
        let items = Array.isArray(saved.items) ? saved.items.map(sanitizeBrandFood).filter((x): x is BrandFood => !!x) : current.items;
        if (Array.isArray(saved.items) && (saved.seedVersion ?? 1) < SEED_VERSION) {
          const have = new Set(items.map((x) => x.id));
          const seed = seedFoodDb();
          const byId = new Map(seed.map((x) => [x.id, x]));
          // Completa también los campos nuevos (preparación, lactosa) de los ítems del seed original.
          const same = (a: BrandFood, b: BrandFood) => ['kcal', 'p', 'c', 'f'].every((k) => a.macros_por_porcion[k as 'p'] === b.macros_por_porcion[k as 'p']);
          items = items.map((x) => {
            const seedItem = byId.get(x.id);
            if (!seedItem) return x;
            // Ítems del seed sin editar por el coach: reciben el detalle / técnica nuevos; los editados sólo completan campos.
            // Mismo plato aunque venga con el nombre anterior (renombres profesionales / Title Case).
            const untouched = same(x, seedItem) && dishTitleCase(modernizeName(x.nombre)) === seedItem.nombre;
            return untouched
              ? { ...seedItem, disponible_para_ia: x.disponible_para_ia }
              : { ...seedItem, ...x, prep_min: x.prep_min || seedItem.prep_min, lactosa: x.lactosa ?? seedItem.lactosa, tecnica: x.tecnica ?? seedItem.tecnica, pasos: x.pasos ?? seedItem.pasos, nombre: modernizeName(x.nombre) };
          });
          items = [...items, ...seed.filter((x) => !have.has(x.id))];
        }
        return { ...current, ...sync(items), seedVersion: SEED_VERSION };
      },
    },
  ),
);

// Primer registro (antes de hidratar) con el seed, para que el selector de comidas ya tenga las marcas.
registerFoodSource('db', brandFoodsToRefs(useFoodDbStore.getState().items));
