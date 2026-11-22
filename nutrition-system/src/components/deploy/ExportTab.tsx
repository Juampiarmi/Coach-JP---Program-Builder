'use client';

import { useState } from 'react';
import { Check, ClipboardCopy, Download, FileCode2, FolderGit2, MessageCircle, Rocket, WifiOff } from 'lucide-react';
import { renderIconPng } from '@/lib/brand';
import { buildAthleteHtml, buildServiceWorker, slugify, type ExportIcons } from '@/lib/exportHtml';
import { usePlanStore } from '@/store/usePlanStore';
import { suggestedUrl, whatsappSummary } from '@/lib/share';
import { BalanceBanner } from '../builder/BalanceBanner';
import { ExportFreshness } from './ExportFreshness';
import { PublishPanel } from '../cloud/PublishPanel';
import { QualityLights } from './QualityLights';
import { publishBlocked } from '@/lib/quality';
import { CloudConnect } from '../cloud/CloudConnect';
import { athleteLink, cloudConfigured } from '@/lib/cloud/config';
import { useCloudStore } from '@/store/useCloudStore';
import { planFingerprint } from '@/lib/planHash';
import { HudButton, inputCls, Label, Panel, Tag } from '../hud/primitives';

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

let iconCache: ExportIcons | null = null;
function icons(): ExportIcons {
  iconCache ??= {
    icon192: renderIconPng(192),
    icon512: renderIconPng(512),
    maskable512: renderIconPng(512, true),
    apple180: renderIconPng(180, true),
  };
  return iconCache;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

/** Resumen + link del atleta listo para pegar en WhatsApp. */
function WhatsAppPanel() {
  const plan = usePlanStore((s) => s.plan);
  const setPlanMeta = usePlanStore((s) => s.setPlanMeta);
  const [copied, setCopied] = useState(false);
  const text = whatsappSummary(plan);
  return (
    <Panel title="MANDARLE EL LINK AL ALUMNO" right={<MessageCircle className="h-4 w-4 text-cyan-hud" />}>
      <label className="block">
        <Label>Link donde subiste su app (GitHub Pages)</Label>
        <input value={plan.publicUrl} placeholder={suggestedUrl(plan)} onChange={(e) => setPlanMeta({ publicUrl: e.target.value.trim() })} className={inputCls + ' font-mono text-xs'} />
      </label>
      <pre className="scroll-thin mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-carbon p-3 font-mono text-[11px] leading-5 text-steel">{text}</pre>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <HudButton
          onClick={async () => {
            await copyText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2200);
          }}
        >
          {copied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />} {copied ? 'Copiado' : '[ Copiar para WhatsApp ]'}
        </HudButton>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-hud/40 bg-cyan-hud/10 px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-cyan-hud transition hover:border-cyan-hud"
        >
          <MessageCircle className="h-4 w-4" /> Abrir WhatsApp
        </a>
      </div>
    </Panel>
  );
}

/** Sin nube todavía: invitación a conectarla en 1 paso. */
function ConnectCard() {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-2xl border border-cyan-hud/30 bg-cyan-hud/[0.05] p-5">
      <div className="text-[16px] font-bold text-ink">Publicá con link fijo (nube)</div>
      <p className="mt-1.5 text-[13.5px] text-steel">Tu alumno abre siempre el mismo link y ve cada cambio al instante; vos ves sus registros y su peso. Se conecta en 1 paso con tu proyecto de Supabase.</p>
      <button onClick={() => setOpen(true)} className="mt-4 w-full rounded-xl bg-fire py-3.5 text-[15px] font-bold text-white hover:bg-fire-hot">
        Conectar nube en 1 paso
      </button>
      {open && <CloudConnect onClose={() => setOpen(false)} />}
    </section>
  );
}

export function ExportTab() {
  const plan = usePlanStore((s) => s.plan);
  const markExported = usePlanStore((s) => s.markExported);
  const cloudLink = useCloudStore((s) => s.links[plan.id]);
  const [copied, setCopied] = useState(false);
  const [lastSize, setLastSize] = useState<number | null>(null);
  const slug = slugify(plan.profile.name);
  const repo = `atleta-${slug}`;

  // Bloqueo duro: con un alérgeno declarado en el plan no se genera el archivo del alumno.
  const blocked = publishBlocked(plan);
  const generate = () => {
    if (blocked) throw new Error('Plan con alérgenos declarados');
    const html = buildAthleteHtml(plan, { preview: false, mode: 'on', icons: icons(), migrateTo: cloudLink?.token ? athleteLink(cloudLink.slug, cloudLink.token) : undefined });
    setLastSize(new Blob([html]).size);
    markExported(planFingerprint(plan));
    return html;
  };

  const copy = async () => {
    await copyText(generate());
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const steps = [
    { t: 'Crear repo en GitHub', d: <>Nuevo repositorio público con el nombre del atleta: <code className="text-cyan-hud">{repo}</code></> },
    { t: 'Subir el index.html', d: <>Add file → Upload files → arrastrá <code className="text-cyan-hud">index.html</code> (y opcional <code className="text-cyan-hud">sw.js</code>) → Commit.</> },
    { t: 'Activar GitHub Pages', d: <>Settings → Pages → Source: <b>Deploy from a branch</b> → Branch: <code className="text-cyan-hud">main</code> / root → Save.</> },
    { t: 'Enviar URL al atleta', d: <><code className="text-cyan-hud">https://TU-USUARIO.github.io/{repo}/</code> · iOS: Compartir → Agregar a inicio · Android: Instalar app.</> },
  ];

  return (
    <div className="space-y-4">
      <QualityLights />
      {cloudConfigured ? <PublishPanel /> : <ConnectCard />}
      <Advanced on={cloudConfigured}>
      <Panel title={cloudConfigured ? 'RESPALDO · EXPORTAR ARCHIVO HTML' : 'EXPORTAR INDEX.HTML // PWA DEPLOY'} tone={cloudConfigured ? 'steel' : 'fire'} right={<FileCode2 className="h-4 w-4 text-fire" />}>
        <p className="mb-4 text-sm text-steel">
          Genera <b className="text-ink">un único archivo</b> (index.html) con la app completa de <b className="text-ink">{plan.profile.name}</b>: plan, comidas, herramientas e ícono para instalarla.
          Lo subís a una página web (GitHub Pages) y le mandás el link.
        </p>
        {cloudConfigured && <p className="mb-3 text-[13px] text-steel">Plan B sin internet: el archivo funciona solo, pero no se actualiza ni te manda los registros del alumno. Para el día a día usá <b className="text-ink">Publicar</b>.</p>}
        {cloudLink?.token && (
          <p className="mb-3 rounded-lg border border-cyan-hud/30 bg-cyan-hud/[0.06] px-3 py-2 text-[12.5px] text-steel">
            <b className="text-ink">¿Tu alumno usaba la app en archivo?</b> Subí este index.html en su repo de siempre: al abrirlo le aparece el botón <b className="text-cyan-hud">“Pasar mi historial a mi link nuevo”</b> y se lleva comidas, agua y peso al link fijo.
          </p>
        )}
        <ExportFreshness onReexport={() => !blocked && download('index.html', generate(), 'text/html;charset=utf-8')} />
        <div className="mb-3">
          <BalanceBanner context="export" />
        </div>
        <div className="grid gap-2">
          {blocked && <p data-export-blocked className="rounded-lg border border-danger/50 bg-danger/10 px-3 py-2 text-[12.5px] font-semibold text-[#FCA5A5]">⛔ Exportar está frenado: el plan tiene alérgenos declarados. Corregilo en el semáforo de arriba.</p>}
          <HudButton onClick={copy} disabled={blocked} className="py-4 text-[12px]">
            {copied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
            {copied ? 'CÓDIGO COPIADO' : 'COPIAR EL CÓDIGO DEL ARCHIVO'}
          </HudButton>
          <div className="grid grid-cols-2 gap-2">
            <HudButton tone="cyan" variant="ghost" disabled={blocked} onClick={() => download('index.html', generate(), 'text/html;charset=utf-8')}>
              <Download className="h-4 w-4" /> Descargar index.html
            </HudButton>
            <HudButton tone="steel" variant="ghost" onClick={() => download('sw.js', buildServiceWorker(slug), 'text/javascript;charset=utf-8')}>
              <WifiOff className="h-4 w-4" /> Descargar sw.js (sin señal)
            </HudButton>
          </div>
        </div>
        {lastSize !== null && (
          <div className="mt-3 font-mono text-[10.5px] tracking-[0.1em] text-cyan-hud">
            ✓ ARCHIVO LISTO · {(lastSize / 1024).toFixed(1).replace('.', ',')} KB · FUNCIONA SOLO, SIN INSTALAR NADA MÁS
          </div>
        )}
        <p className="mt-3 font-mono text-[9.5px] leading-4 text-steel/80">
          sw.js es opcional: subilo al lado del index.html para que la app abra aunque no haya señal. Sin él se instala igual en iPhone y Android.
        </p>
      </Panel>

      <WhatsAppPanel />

      <Panel title="CÓMO SUBIR EL ARCHIVO (GITHUB PAGES)" right={<Rocket className="h-4 w-4 text-cyan-hud" />}>
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li key={s.t} className="flex gap-3">
              <span className="grid h-7 w-7 flex-none place-items-center rounded-md border border-cyan-hud/40 bg-cyan-hud/10 font-mono text-xs font-bold text-cyan-hud">{i + 1}</span>
              <div>
                <div className="font-display text-sm font-bold uppercase tracking-wide">{s.t}</div>
                <div className="text-[13px] leading-snug text-steel">{s.d}</div>
              </div>
            </li>
          ))}
        </ol>
        <a
          href="https://github.com/new"
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 font-mono text-[10.5px] tracking-[0.12em] text-steel hover:text-cyan-hud"
        >
          <FolderGit2 className="h-4 w-4" /> ABRIR GITHUB → NUEVO REPOSITORIO
        </a>
      </Panel>

      <Panel title="CÓMO INSTALA LA APP TU ALUMNO" tone="steel">
        <Tag tone="steel" className="mb-2">
          IPHONE · SAFARI
        </Tag>
        <p className="text-[13px] text-steel">Abre el link en Safari → botón Compartir → «Agregar a inicio». Queda como una app, a pantalla completa.</p>
        <Tag tone="steel" className="mb-2 mt-3">
          ANDROID · CHROME
        </Tag>
        <p className="text-[13px] text-steel">Abre el link en Chrome → toca «Instalar app» (aparece dentro de la misma app o en el menú ⋮).</p>
      </Panel>
      </Advanced>
    </div>
  );
}

/** Con la nube, la descarga manual (HTML / SW) y la guía de GitHub Pages quedan plegadas: menos ruido visual. */
function Advanced({ on, children }: { on: boolean; children: React.ReactNode }) {
  if (!on) return <>{children}</>;
  return (
    <details data-export-advanced className="group rounded-xl border border-line bg-panel/60">
      <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-semibold text-steel hover:text-ink">
        <span className="mr-1 inline-block transition-transform group-open:rotate-90">▸</span> Opciones avanzadas / Respaldo · descargar el archivo HTML, sw.js y guía de GitHub Pages
      </summary>
      <div className="space-y-4 border-t border-line p-3">{children}</div>
    </details>
  );
}
