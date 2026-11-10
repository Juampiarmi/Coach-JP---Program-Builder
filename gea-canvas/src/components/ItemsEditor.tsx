'use client';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { kindSpec } from '@/data/library';
import type { InfoItem, Layer } from '@/lib/types';
import { inputCls } from './ui';

/** Editor de filas para las placas informativas (turnos / carta). */
export function ItemsEditor({ l, onProps }: { l: Layer; onProps: (p: Partial<Layer['props']>) => void }) {
  const f = kindSpec(l.props.kind).fields.items!;
  const items: InfoItem[] = l.props.items ?? kindSpec(l.props.kind).defaults.items ?? [];
  const set = (next: InfoItem[]) => onProps({ items: next });
  const patch = (i: number, p: Partial<InfoItem>) => set(items.map((it, j) => (j === i ? { ...it, ...p } : it)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    set(next);
  };
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px] text-white/60">
        <span>{f.title}</span>
        <button
          onClick={() => set([...items, { label: f.label }])}
          disabled={items.length >= f.max}
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-neon hover:bg-neon/10 disabled:opacity-30"
        >
          <Plus className="h-3 w-3" /> Agregar
        </button>
      </div>
      <ol className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="rounded-lg bg-white/[0.03] p-2 ring-1 ring-white/5">
            <div className="flex gap-1">
              <input className={`${inputCls} !py-1.5 font-semibold`} value={it.label} placeholder={f.label} onChange={(e) => patch(i, { label: e.target.value })} />
              <div className="flex shrink-0 flex-col">
                <button title="Subir" onClick={() => move(i, -1)} className="text-white/40 hover:text-white disabled:opacity-20" disabled={i === 0}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button title="Bajar" onClick={() => move(i, 1)} className="text-white/40 hover:text-white disabled:opacity-20" disabled={i === items.length - 1}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <button title="Quitar" onClick={() => set(items.filter((_, j) => j !== i))} className="shrink-0 px-1 text-red-300/70 hover:text-red-300">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-1 flex gap-1">
              <input className={`${inputCls} !py-1.5 text-xs`} value={it.detail ?? ''} placeholder={f.detail} onChange={(e) => patch(i, { detail: e.target.value })} />
              <input className={`${inputCls} !w-28 shrink-0 !py-1.5 text-xs`} value={it.price ?? ''} placeholder={f.price} onChange={(e) => patch(i, { price: e.target.value })} />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
