'use client';

import { useRef, useState } from 'react';
import { ImageUp, ShieldCheck, Trash2 } from 'lucide-react';
import { cobrandHeader, DEFAULT_NUTRITIONIST, nutriCredit, safeLogo, storySignature } from '@/lib/brand';
import { usePlanStore } from '@/store/usePlanStore';
import { inputCls, Label, NutritionMark, Panel } from '../hud/primitives';
import { NutrirCeLogo } from '../hud/NutrirCe';

/** Imagen subida → data URL liviana (máx. 360 px de alto en PNG; SVG tal cual si es chico). */
async function toLogo(file: File): Promise<string | undefined> {
  const read = (f: Blob) => new Promise<string>((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = ko; r.readAsDataURL(f); });
  if (file.type === 'image/svg+xml') return file.size <= 150_000 ? safeLogo(await read(file)) : undefined;
  const url = await read(file);
  const img = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url; });
  const k = Math.min(1, 360 / img.naturalHeight, 1200 / img.naturalWidth);
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * k);
  c.height = Math.round(img.naturalHeight * k);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return safeLogo(c.toDataURL('image/png'));
}

/** Firma profesional y co-branding 50/50 Coach JP × NutrirCe (app del alumno, storycard y Builder). */
export function NutritionistPanel() {
  const plan = usePlanStore((s) => s.plan);
  const setNutritionist = usePlanStore((s) => s.setNutritionist);
  const others = usePlanStore((s) => Object.keys(s.roster).filter((id) => id !== s.plan.id).length);
  const n = { ...DEFAULT_NUTRITIONIST, ...(plan.nutritionist ?? {}) };
  const [msg, setMsg] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<typeof n>) => { setNutritionist({ ...n, ...patch }); setMsg(''); };
  const upload = async (f?: File) => {
    if (!f) return;
    const logo = await toLogo(f).catch(() => undefined);
    if (!logo) return setMsg('No pude usar esa imagen (PNG, JPG, WEBP o SVG de hasta 150 KB).');
    set({ logo });
    setMsg('✓ Logo de NutrirCe actualizado.');
  };
  return (
    <Panel title="FIRMA PROFESIONAL · CO-BRANDING COACH JP × NUTRIRCE" tone="steel" right={<ShieldCheck className="h-4 w-4 text-cyan-hud/80" />}>
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
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Label>Logo de NutrirCe</Label>
          <button type="button" onClick={() => file.current?.click()} className="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-[12px] text-steel hover:text-ink" data-nutri-logo-upload>
            <ImageUp className="h-3.5 w-3.5" /> {n.logo ? 'Reemplazar logo oficial' : 'Subir logo oficial'}
          </button>
          {n.logo && (
            <button type="button" onClick={() => set({ logo: undefined })} className="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[12px] text-mute hover:text-ink">
              <Trash2 className="h-3.5 w-3.5" /> Volver al isotipo
            </button>
          )}
          <input ref={file} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ''; }} data-nutri-logo-file />
          <span className="text-[11.5px] text-mute">{n.logo ? 'Se usa tu archivo en la app, la storycard y el Builder.' : 'Por defecto: isotipo de mano + tenedor con «Nutrir» verde y «Ce» naranja.'}</span>
        </div>
        <label className="mt-2 flex items-center gap-2 text-[13px] text-steel">
          <input type="checkbox" checked={n.show} onChange={(e) => set({ show: e.target.checked })} /> Mostrar el co-branding NutrirCe y la firma en la app del alumno y en la storycard
        </label>
        {n.show && n.name.trim() && (
          <div className="mt-2 space-y-1.5 rounded-lg border border-line bg-carbon/60 p-2.5 text-[12px]" data-nutri-preview>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5">
                <NutritionMark size={26} />
                <b className="text-[14px] tracking-[0.04em] text-ink">COACH JP</b>
              </span>
              <span className="text-steel/60">×</span>
              <NutrirCeLogo size={26} text={14} logo={n.logo} />
            </div>
            <div className="text-[#94C5DE]/80">Cabecera: {cobrandHeader(n)}</div>
            <div className="text-mute">Pie: {nutriCredit(n)}</div>
            <div className="font-mono text-[11px] tracking-wider text-steel">Storycard: COACH JP × NUTRIRCE · {storySignature(n)}</div>
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
