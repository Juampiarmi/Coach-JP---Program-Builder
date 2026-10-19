'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Database, Download, Pencil, Plus, RotateCcw, Save, Search, Trash2, Upload, X } from 'lucide-react';
import { fmt0 } from '@/lib/bioenergetics';
import { BRAND_CATEGORIES, BRAND_CATEGORY_LABEL, portionLabel, type BrandCategory, type BrandFood } from '@/lib/foodBrandDb';
import { useFoodDbStore } from '@/store/useFoodDbStore';
import { cx, HudButton, inputCls, Label, NumInput, Panel, Toggle } from '../hud/primitives';

const empty = (): BrandFood => ({
  id: `db-${Date.now().toString(36)}`,
  nombre: '',
  marca: '',
  categoria: 'dairy',
  porcion_base: { cantidad: 1, unidad: 'porción', gramos: 100 },
  macros_por_porcion: { kcal: 0, p: 0, c: 0, f: 0, leucina: 0 },
  es_marca_local: true,
  disponible_para_ia: true,
});

function Num({ label, unit, value, onChange }: { label: string; unit: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block min-w-0">
      <Label>{label}</Label>
      <div className="relative">
        <NumInput value={value} min={0} max={5000} onChange={onChange} ariaLabel={label} className="pr-10" />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-mute">{unit}</span>
      </div>
    </label>
  );
}

/** Modal de alta / edición con la tabla nutricional por porción base. */
function FoodModal({ initial, onClose }: { initial: BrandFood; onClose: () => void }) {
  const upsert = useFoodDbStore((s) => s.upsert);
  const [d, setD] = useState<BrandFood>(initial);
  const m = d.macros_por_porcion;
  const atwater = m.p * 4 + m.c * 4 + m.f * 9;
  const setM = (patch: Partial<BrandFood['macros_por_porcion']>) => setD((x) => ({ ...x, macros_por_porcion: { ...x.macros_por_porcion, ...patch } }));
  const setP = (patch: Partial<BrandFood['porcion_base']>) => setD((x) => ({ ...x, porcion_base: { ...x.porcion_base, ...patch } }));
  const valid = d.nombre.trim().length >= 2 && d.porcion_base.gramos > 0;

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Alimento o marca"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-cyan-hud/25 bg-panel p-5 shadow-cyan sm:rounded-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="font-mono text-[10px] font-bold tracking-[0.18em] text-cyan-hud">[ + AGREGAR NUEVA MARCA / ALIMENTO ]</div>
          <button onClick={onClose} className="rounded-md p-1 text-steel hover:text-ink" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <Label>Nombre</Label>
            <input autoFocus value={d.nombre} onChange={(e) => setD({ ...d, nombre: e.target.value })} placeholder="Yogur Griego Descremado Pro" className={inputCls} />
          </label>
          <label className="block">
            <Label>Marca</Label>
            <input value={d.marca} onChange={(e) => setD({ ...d, marca: e.target.value })} placeholder="La Serenísima / Milkaut / Ilolay" className={inputCls} />
          </label>
        </div>
        <div className="mt-3">
          <Label>Categoría</Label>
          <div className="flex flex-wrap gap-1.5">
            {BRAND_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setD({ ...d, categoria: c })}
                className={cx(
                  'rounded-md border px-2.5 py-1.5 font-mono text-[10.5px] transition',
                  d.categoria === c ? 'border-fire bg-fire/15 text-fire' : 'border-line text-steel hover:text-ink',
                )}
              >
                {BRAND_CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Num label="Cantidad" unit="" value={d.porcion_base.cantidad} onChange={(cantidad) => setP({ cantidad })} />
          <label className="block">
            <Label>Unidad</Label>
            <input value={d.porcion_base.unidad} onChange={(e) => setP({ unidad: e.target.value })} placeholder="pote / cda / g" className={inputCls} />
          </label>
          <Num label="Peso porción" unit="g" value={d.porcion_base.gramos} onChange={(gramos) => setP({ gramos })} />
        </div>
        <div className="mt-3">
          <Label>Macros por porción ({portionLabel(d)})</Label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Num label="Kcal" unit="kcal" value={m.kcal} onChange={(kcal) => setM({ kcal })} />
            <Num label="Proteínas" unit="g" value={m.p} onChange={(p) => setM({ p })} />
            <Num label="Carbos" unit="g" value={m.c} onChange={(c) => setM({ c })} />
            <Num label="Grasas" unit="g" value={m.f} onChange={(f) => setM({ f })} />
            <Num label="Leucina" unit="g" value={m.leucina} onChange={(leucina) => setM({ leucina })} />
          </div>
          <p className="tnum mt-2 font-mono text-[10px] text-mute">
            Atwater 4/4/9: {fmt0(atwater)} kcal
            {m.kcal > 0 && atwater > 0 && Math.abs(m.kcal / atwater - 1) > 0.15 && <span className="text-fire"> · difiere &gt;15 % de la etiqueta</span>}
            {m.p > 0 && !m.leucina && <span> · leucina sugerida ≈ {(m.p * 0.09).toFixed(1)} g</span>}
          </p>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Toggle checked={d.es_marca_local} onChange={(v) => setD({ ...d, es_marca_local: v })} tone="cyan" label={<span className="text-xs text-steel">Marca local (entra al selector de comidas)</span>} />
          <Toggle checked={d.disponible_para_ia} onChange={(v) => setD({ ...d, disponible_para_ia: v })} tone="cyan" label={<span className="text-xs text-steel">Disponible para la IA</span>} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <HudButton tone="steel" variant="ghost" onClick={onClose}>
            Cancelar
          </HudButton>
          <HudButton
            disabled={!valid}
            onClick={() => {
              upsert({ ...d, nombre: d.nombre.trim(), marca: d.marca.trim() });
              onClose();
            }}
          >
            <Save className="h-4 w-4" /> [ Guardar ]
          </HudButton>
        </div>
      </div>
    </div>
  );
}

/** Food & Brand DB: catálogo de alimentos y marcas locales que usa la IA y el selector de comidas. */
export function FoodBrandDatabase() {
  const items = useFoodDbStore((s) => s.items);
  const toggleAi = useFoodDbStore((s) => s.toggleAi);
  const remove = useFoodDbStore((s) => s.remove);
  const importJson = useFoodDbStore((s) => s.importJson);
  const resetSeed = useFoodDbStore((s) => s.resetSeed);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<BrandCategory | 'all'>('all');
  const [editing, setEditing] = useState<BrandFood | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  const list = useMemo(
    () => items.filter((b) => (cat === 'all' || b.categoria === cat) && (!q.trim() || norm(`${b.nombre} ${b.marca}`).includes(norm(q.trim())))),
    [items, q, cat],
  );
  const active = items.filter((b) => b.disponible_para_ia).length;

  function exportJson() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ format: 'coachjp-food-db', version: 1, exportedAt: new Date().toISOString(), items }, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `food-brand-db-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function onImport(f: File | undefined) {
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      const replace = confirm('¿Reemplazar toda la base por el archivo? (Cancelar = sumar / actualizar por id)');
      const n = importJson(data, replace ? 'replace' : 'merge');
      alert(n ? `${n} alimentos importados.` : 'El archivo no contiene alimentos válidos.');
    } catch {
      alert('JSON inválido.');
    } finally {
      if (file.current) file.current.value = '';
    }
  }

  return (
    <div className="space-y-3">
      <Panel title="04 · FOOD & BRAND DB · MARCAS LOCALES" right={<Database className="h-4 w-4 text-cyan-hud" />}>
        <p className="text-sm text-steel">
          Catálogo real de productos y marcas argentinas. Los habilitados para IA (<b className="text-ink">{active}</b> de {items.length}) se inyectan en el Prompt Engine; las marcas locales
          además aparecen en el selector de comidas y en los SWAP de la app del atleta. Valores de referencia: verificá siempre con la etiqueta.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <HudButton onClick={() => setEditing(empty())}>
            <Plus className="h-4 w-4" /> [ + AGREGAR NUEVA MARCA / ALIMENTO ]
          </HudButton>
          <HudButton tone="cyan" variant="ghost" onClick={exportJson}>
            <Download className="h-4 w-4" /> [ 📤 EXPORTAR FOOD DB JSON ]
          </HudButton>
          <HudButton tone="cyan" variant="ghost" onClick={() => file.current?.click()}>
            <Upload className="h-4 w-4" /> [ 📥 IMPORTAR FOOD DB ]
          </HudButton>
          <HudButton tone="steel" variant="ghost" onClick={() => confirm('¿Restaurar el catálogo argentino de ejemplo? Se pierden los cambios.') && resetSeed()}>
            <RotateCcw className="h-4 w-4" /> Seed
          </HudButton>
          <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onImport(e.target.files?.[0])} />
        </div>
      </Panel>

      <div className="rounded-xl border border-line bg-panel p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o marca…" className={cx(inputCls, 'pl-9')} />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(['all', ...BRAND_CATEGORIES] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={cx(
                'rounded-md border px-2 py-1 font-mono text-[10px] transition',
                cat === c ? 'border-cyan-hud bg-cyan-hud/10 text-cyan-hud' : 'border-line text-steel hover:text-ink',
              )}
            >
              {c === 'all' ? `Todas (${items.length})` : `${BRAND_CATEGORY_LABEL[c]} (${items.filter((b) => b.categoria === c).length})`}
            </button>
          ))}
        </div>

        <div className="mt-3 divide-y divide-line">
          {list.map((b) => {
            const m = b.macros_por_porcion;
            return (
              <div key={b.id} className={cx('flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5', !b.disponible_para_ia && 'opacity-55')}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[14px] font-medium text-ink">{b.nombre}</span>
                    {b.marca && b.marca !== 'Genérico' && <span className="text-xs text-steel">· {b.marca}</span>}
                    {b.es_marca_local && <span className="rounded border border-fire/30 bg-fire/10 px-1 font-mono text-[8.5px] font-bold text-fire">LOCAL</span>}
                  </div>
                  <div className="tnum font-mono text-[10.5px] text-mute">
                    {BRAND_CATEGORY_LABEL[b.categoria]} · {portionLabel(b)} · {fmt0(m.kcal)} kcal · P {m.p} · C {m.c} · G {m.f}
                    {m.leucina ? ` · Leu ${m.leucina}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleAi(b.id)}
                  aria-pressed={b.disponible_para_ia}
                  title="Disponible para la IA"
                  className={cx(
                    'rounded-md border px-2 py-1 font-mono text-[9.5px] font-bold tracking-[0.08em]',
                    b.disponible_para_ia ? 'border-cyan-hud/50 bg-cyan-hud/10 text-cyan-hud' : 'border-line text-mute',
                  )}
                >
                  IA {b.disponible_para_ia ? 'ON' : 'OFF'}
                </button>
                <button type="button" onClick={() => setEditing(b)} aria-label={`Editar ${b.nombre}`} className="rounded-md p-1.5 text-steel hover:text-cyan-hud">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => confirm(`¿Eliminar «${b.nombre}» de la base?`) && remove(b.id)}
                  aria-label={`Eliminar ${b.nombre}`}
                  className="rounded-md p-1.5 text-steel hover:text-fire"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
          {!list.length && <div className="py-6 text-center text-sm text-mute">Sin resultados para el filtro.</div>}
        </div>
      </div>
      {editing && <FoodModal initial={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
