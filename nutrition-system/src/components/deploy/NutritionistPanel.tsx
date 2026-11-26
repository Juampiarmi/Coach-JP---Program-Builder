'use client';

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { DEFAULT_NUTRITIONIST, nutriCredit, storySignature } from '@/lib/brand';
import { usePlanStore } from '@/store/usePlanStore';
import { inputCls, Label, Panel } from '../hud/primitives';

/** Firma profesional: nutricionista responsable que aparece en la app del alumno y en la storycard. */
export function NutritionistPanel() {
  const plan = usePlanStore((s) => s.plan);
  const setNutritionist = usePlanStore((s) => s.setNutritionist);
  const others = usePlanStore((s) => Object.keys(s.roster).filter((id) => id !== s.plan.id).length);
  const n = plan.nutritionist ?? DEFAULT_NUTRITIONIST;
  const [msg, setMsg] = useState('');
  const set = (patch: Partial<typeof n>) => { setNutritionist({ ...n, ...patch }); setMsg(''); };
  return (
    <Panel title="FIRMA PROFESIONAL · NUTRICIONISTA RESPONSABLE" tone="steel" right={<ShieldCheck className="h-4 w-4 text-cyan-hud/80" />}>
      <div data-nutri-panel>
        <div className="grid gap-2 sm:grid-cols-3">
          <div>
            <Label>Nombre</Label>
            <input className={inputCls} value={n.name} onChange={(e) => set({ name: e.target.value })} placeholder="Lic. Nombre Apellido" data-nutri-name />
          </div>
          <div>
            <Label>Especialidad</Label>
            <input className={inputCls} value={n.specialty} onChange={(e) => set({ specialty: e.target.value })} placeholder="Nutrición Deportiva" />
          </div>
          <div>
            <Label>Matrícula (opcional)</Label>
            <input className={inputCls} value={n.license} onChange={(e) => set({ license: e.target.value })} placeholder="M.N. 0000" />
          </div>
        </div>
        <label className="mt-2 flex items-center gap-2 text-[13px] text-steel">
          <input type="checkbox" checked={n.show} onChange={(e) => set({ show: e.target.checked })} /> Mostrar la firma en la app del alumno y en la storycard
        </label>
        {n.show && n.name.trim() && (
          <div className="mt-2 space-y-0.5 rounded-lg border border-line bg-carbon/60 p-2 text-[12px]">
            <div className="text-[#94C5DE]/80">Cabecera: Planificación Nutricional · {n.name.trim()}</div>
            <div className="text-mute">Pie: {nutriCredit(n)}</div>
            <div className="font-mono text-[11px] tracking-wider text-steel">Storycard: {storySignature(n)}</div>
          </div>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {others > 0 && (
            <button type="button" className="rounded-md border border-line px-2.5 py-1 text-[12px] text-steel hover:text-ink" onClick={() => { setNutritionist(n, true); setMsg(`✓ Aplicada a tus ${others + 1} alumnos (se ve al volver a publicar).`); }}>
              Usar esta firma en todos mis alumnos
            </button>
          )}
          {msg && <span className="text-[12px] text-[#34D399]">{msg}</span>}
        </div>
      </div>
    </Panel>
  );
}
