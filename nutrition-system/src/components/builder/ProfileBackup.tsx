'use client';

import { useRef } from 'react';
import { FolderOpen, MessageCircle, Save } from 'lucide-react';
import { slugify } from '@/lib/exportHtml';
import { whatsappSummary } from '@/lib/share';
import { usePlanStore } from '@/store/usePlanStore';

const btn =
  'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[10px] font-bold tracking-[0.1em] transition whitespace-nowrap';

/** Backup de perfiles en disco (JSON) + envío directo del link de la PWA por WhatsApp. */
export function ProfileBackup() {
  const plan = usePlanStore((s) => s.plan);
  const customFoods = usePlanStore((s) => s.customFoods);
  const importAthlete = usePlanStore((s) => s.importAthlete);
  const setPlanMeta = usePlanStore((s) => s.setPlanMeta);
  const file = useRef<HTMLInputElement>(null);

  function exportJson() {
    const used = new Set(plan.meals.flatMap((m) => m.items.map((i) => i.foodId)));
    const data = {
      format: 'coachjp-athlete',
      version: 1,
      exportedAt: new Date().toISOString(),
      plan,
      customFoods: customFoods.filter((f) => used.has(f.id)),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `atleta-${slugify(plan.profile.name)}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importJson(f: File | undefined) {
    if (!f) return;
    try {
      const name = importAthlete(JSON.parse(await f.text()));
      alert(name ? `Perfil importado: ${name}. Quedó activo y el atleta anterior sigue en la base local.` : 'El archivo no es un perfil válido de Coach JP.');
    } catch {
      alert('No se pudo leer el archivo (JSON inválido).');
    } finally {
      if (file.current) file.current.value = '';
    }
  }

  function shareWhatsapp() {
    let url = plan.publicUrl.trim();
    if (!url) {
      url = (prompt('Pegá el link publicado de la PWA del atleta (GitHub Pages):', '') ?? '').trim();
      if (!url) return;
      setPlanMeta({ publicUrl: url });
    }
    const text = whatsappSummary({ ...plan, publicUrl: url });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  }

  return (
    <div className="flex items-center gap-1.5">
      <button onClick={exportJson} title="Descargar el perfil completo (plan, comidas, suplementos y marcas propias)" className={`${btn} border-line text-steel hover:border-cyan-hud/50 hover:text-cyan-hud`}>
        <Save className="h-3.5 w-3.5" /> <span className="hidden md:inline">[ EXPORTAR PERFIL JSON ]</span>
      </button>
      <button onClick={() => file.current?.click()} title="Recuperar o duplicar un atleta desde un backup JSON" className={`${btn} border-line text-steel hover:border-cyan-hud/50 hover:text-cyan-hud`}>
        <FolderOpen className="h-3.5 w-3.5" /> <span className="hidden md:inline">[ IMPORTAR PERFIL ]</span>
      </button>
      <button onClick={shareWhatsapp} title="Enviar el link de la PWA con mensaje de bienvenida" className={`${btn} border-[#25D366]/40 bg-[#25D366]/10 text-[#4ADE80] hover:border-[#25D366]`}>
        <MessageCircle className="h-3.5 w-3.5" /> <span className="hidden lg:inline">[ COMPARTIR POR WHATSAPP ]</span>
      </button>
      <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={(e) => importJson(e.target.files?.[0])} />
    </div>
  );
}
