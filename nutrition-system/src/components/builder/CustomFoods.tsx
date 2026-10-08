'use client';

import { useEffect, useState } from 'react';
import { PackagePlus, Save, Trash2, X } from 'lucide-react';
import { fmt0, fmt1 } from '@/lib/bioenergetics';
import { GROUP_LABEL, kcalPer100, round1, round2, type SwapGroup } from '@/lib/foods';
import { usePlanStore } from '@/store/usePlanStore';
import { cx, HudButton, inputCls, Label, NumInput, Segmented } from '../hud/primitives';

const TYPES: { value: SwapGroup; label: string }[] = [
  { value: 'lean-protein', label: 'Proteína magra' },
  { value: 'cereal', label: 'Almidón / Cereal' },
  { value: 'fruit', label: 'Fruta' },
  { value: 'fat', label: 'Grasa' },
  { value: 'dairy-protein', label: 'Lácteo' },
  { value: 'protein-snack', label: 'Snack proteico' },
];

// Leucina estimada por gramo de proteína según la matriz (lácteos ≈ 10 %, carnes ≈ 8 %, vegetales ≈ 7 %).
const LEU_RATIO: Partial<Record<SwapGroup, number>> = { 'dairy-protein': 0.1, 'lean-protein': 0.08 };

interface Draft {
  name: string;
  brand: string;
  group: SwapGroup;
  basis: '100' | 'portion';
  portion: number;
  kcal: number;
  p: number;
  c: number;
  f: number;
  leucine: number;
}

const EMPTY: Draft = { name: '', brand: '', group: 'dairy-protein', basis: '100', portion: 30, kcal: 0, p: 0, c: 0, f: 0, leucine: 0 };

function Field({ label, unit, value, onChange }: { label: string; unit: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block min-w-0">
      <Label>{label}</Label>
      <div className="relative">
        <NumInput value={value} min={0} max={1000} onChange={onChange} ariaLabel={label} className="pr-10" />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-mute">{unit}</span>
      </div>
    </label>
  );
}

/** Modal táctico para registrar un alimento o producto de marca. Se guarda en localStorage (store persistido). */
function CustomFoodModal({ onClose }: { onClose: () => void }) {
  const addCustomFood = usePlanStore((s) => s.addCustomFood);
  const [d, setD] = useState<Draft>(EMPTY);
  // Kcal y leucina se autocompletan desde los macros hasta que el coach los edite a mano.
  const [kcalTouched, setKcalTouched] = useState(false);
  const [leuTouched, setLeuTouched] = useState(false);
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));

  const atwater = kcalPer100(d);
  const kcal = kcalTouched ? d.kcal : round1(atwater);
  const leucine = leuTouched ? d.leucine : round2(d.p * (LEU_RATIO[d.group] ?? 0.07));
  const kcalGap = kcal > 0 && atwater > 0 ? Math.abs(kcal / atwater - 1) * 100 : 0;
  const valid = d.name.trim().length >= 2 && atwater > 0 && (d.basis === '100' || d.portion > 0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function save() {
    if (!valid) return;
    // Todo se normaliza a 100 g (contrato de la base); la porción queda como medida casera.
    const k = d.basis === 'portion' ? 100 / d.portion : 1;
    const brand = d.brand.trim();
    addCustomFood({
      name: brand ? `${d.name.trim()} · ${brand}` : d.name.trim(),
      brand: brand || undefined,
      group: d.group,
      unit: d.basis === 'portion' ? { label: 'porción', grams: d.portion } : undefined,
      p: round1(d.p * k),
      c: round1(d.c * k),
      f: round1(d.f * k),
      leucine: round2(leucine * k),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Crear alimento o marca"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-cyan-hud/25 bg-panel p-5 shadow-cyan sm:rounded-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] font-bold tracking-[0.18em] text-cyan-hud">[ + CREAR ALIMENTO / MARCA ]</div>
            <p className="mt-1 text-xs text-steel">Queda guardado en este navegador y disponible al instante en el selector de alimentos y en los Smart Swaps.</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-steel hover:text-ink" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <Label>Producto</Label>
            <input autoFocus value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="Yogur Proteico" className={inputCls} />
          </label>
          <label className="block">
            <Label>Marca</Label>
            <input value={d.brand} onChange={(e) => set({ brand: e.target.value })} placeholder="La Serenísima Pro" className={inputCls} />
          </label>
        </div>

        <div className="mt-4">
          <Label>Tipo</Label>
          <div className="flex flex-wrap gap-1.5">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => set({ group: t.value })}
                className={cx(
                  'rounded-md border px-2.5 py-1.5 font-mono text-[10.5px] tracking-[0.06em] transition',
                  d.group === t.value ? 'border-fire bg-fire/15 text-fire' : 'border-line text-steel hover:border-line2 hover:text-ink',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="w-60">
            <Label>Valores cargados</Label>
            <Segmented
              value={d.basis}
              onChange={(basis) => set({ basis })}
              size="sm"
              options={[
                { value: '100', label: 'Por 100 g' },
                { value: 'portion', label: 'Por porción' },
              ]}
            />
          </div>
          {d.basis === 'portion' && (
            <div className="w-28">
              <Field label="Porción" unit="g" value={d.portion} onChange={(portion) => set({ portion })} />
            </div>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field
            label="Kcal"
            unit="kcal"
            value={kcal}
            onChange={(v) => {
              setKcalTouched(true);
              set({ kcal: v });
            }}
          />
          <Field label="Proteínas" unit="g" value={d.p} onChange={(p) => set({ p })} />
          <Field label="Carbohidratos" unit="g" value={d.c} onChange={(c) => set({ c })} />
          <Field label="Grasas" unit="g" value={d.f} onChange={(f) => set({ f })} />
          <Field
            label="Leucina est."
            unit="g"
            value={leucine}
            onChange={(v) => {
              setLeuTouched(true);
              set({ leucine: v });
            }}
          />
        </div>

        <div className="tnum mt-3 rounded-lg border border-line bg-carbon px-3 py-2 font-mono text-[10.5px] text-steel">
          Atwater (4/4/9): <span className="text-ink">{fmt0(atwater)} kcal</span>
          {kcalGap > 15 && <span className="ml-2 text-fire">· Δ {fmt0(kcalGap)} % vs kcal de etiqueta: revisá los macros</span>}
          {!leuTouched && d.p > 0 && <span className="ml-2">· leucina estimada {fmt1(leucine)} g</span>}
          <div className="mt-0.5 text-mute">El motor usa los macros (no las kcal de etiqueta) para sumar y para las equivalencias.</div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <HudButton tone="steel" variant="ghost" onClick={onClose}>
            Cancelar
          </HudButton>
          <HudButton onClick={save} disabled={!valid}>
            <Save className="h-4 w-4" /> [ Guardar alimento ]
          </HudButton>
        </div>
      </div>
    </div>
  );
}

/** Botón táctico + listado de marcas propias del coach. */
export function CustomFoodsBar() {
  const customFoods = usePlanStore((s) => s.customFoods);
  const removeCustomFood = usePlanStore((s) => s.removeCustomFood);
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3 border-t border-line pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-md border border-fire/50 bg-fire/10 px-2.5 py-1.5 font-mono text-[10.5px] font-bold tracking-[0.1em] text-fire transition hover:border-fire hover:bg-fire/20"
        >
          <PackagePlus className="h-3.5 w-3.5" /> [ + CREAR ALIMENTO / MARCA ]
        </button>
        {customFoods.map((f) => (
          <span key={f.id} className="inline-flex items-center gap-1.5 rounded-md border border-line2 bg-panel2 py-1 pl-2 pr-1 text-[11.5px] text-steel">
            <span className="text-ink">{f.name}</span>
            <span className="font-mono text-[9.5px] text-mute">{GROUP_LABEL[f.group].split(' / ')[0]}</span>
            <button
              type="button"
              onClick={() => confirm(`¿Eliminar «${f.name}» de tus alimentos? Las comidas que ya lo usan conservan sus macros.`) && removeCustomFood(f.id)}
              className="rounded p-0.5 text-mute hover:text-fire"
              aria-label={`Eliminar ${f.name}`}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      {open && <CustomFoodModal onClose={() => setOpen(false)} />}
    </div>
  );
}
