'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { brandFoodsToRefs, sanitizeBrandFood, seedFoodDb, type BrandFood } from '@/lib/foodBrandDb';
import { registerFoodSource } from '@/lib/foods';

interface FoodDbState {
  items: BrandFood[];
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
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<FoodDbState>;
        const items = Array.isArray(saved.items) ? saved.items.map(sanitizeBrandFood).filter((x): x is BrandFood => !!x) : current.items;
        return { ...current, ...sync(items) };
      },
    },
  ),
);

// Primer registro (antes de hidratar) con el seed, para que el selector de comidas ya tenga las marcas.
registerFoodSource('db', brandFoodsToRefs(useFoodDbStore.getState().items));
