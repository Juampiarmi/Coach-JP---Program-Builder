'use client';

import { useState } from 'react';
import { Check, ClipboardCopy, Download, FileCode2, FolderGit2, MessageCircle, Rocket, WifiOff } from 'lucide-react';
import { renderIconPng } from '@/lib/brand';
import { buildAthleteHtml, buildServiceWorker, slugify, type ExportIcons } from '@/lib/exportHtml';
import { usePlanStore } from '@/store/usePlanStore';
import { suggestedUrl, whatsappSummary } from '@/lib/share';
import { BalanceBanner } from '../builder/BalanceBanner';
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
    <Panel title="COMPARTIR CON EL ATLETA" right={<MessageCircle className="h-4 w-4 text-cyan-hud" />}>
      <label className="block">
        <Label>Link público de su app (GitHub Pages)</Label>
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

export function ExportTab() {
  const plan = usePlanStore((s) => s.plan);
  const [copied, setCopied] = useState(false);
  const [lastSize, setLastSize] = useState<number | null>(null);
  const slug = slugify(plan.profile.name);
  const repo = `atleta-${slug}`;

  const generate = () => {
    const html = buildAthleteHtml(plan, { preview: false, mode: 'on', icons: icons() });
    setLastSize(new Blob([html]).size);
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
      <Panel title="EXPORTAR INDEX.HTML // PWA DEPLOY" tone="fire" right={<FileCode2 className="h-4 w-4 text-fire" />}>
        <p className="mb-4 text-sm text-steel">
          Genera una PWA 100% autocontenida en un único archivo: diseño táctico, runtime vanilla JS, datos de <b className="text-ink">{plan.profile.name}</b> embebidos en JSON,
          manifest inline (data URI + blob con URLs absolutas), iconos PNG embebidos y registro de Service Worker.
        </p>
        <div className="mb-3">
          <BalanceBanner context="export" />
        </div>
        <div className="grid gap-2">
          <HudButton onClick={copy} className="py-4 text-[12px]">
            {copied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
            {copied ? 'CÓDIGO COPIADO AL PORTAPAPELES' : 'GENERAR Y COPIAR CÓDIGO INDEX.HTML'}
          </HudButton>
          <div className="grid grid-cols-2 gap-2">
            <HudButton tone="cyan" variant="ghost" onClick={() => download('index.html', generate(), 'text/html;charset=utf-8')}>
              <Download className="h-4 w-4" /> Descargar index.html
            </HudButton>
            <HudButton tone="steel" variant="ghost" onClick={() => download('sw.js', buildServiceWorker(slug), 'text/javascript;charset=utf-8')}>
              <WifiOff className="h-4 w-4" /> Descargar sw.js
            </HudButton>
          </div>
        </div>
        {lastSize !== null && (
          <div className="mt-3 font-mono text-[10.5px] tracking-[0.1em] text-cyan-hud">
            ✓ INDEX.HTML COMPILADO · {(lastSize / 1024).toFixed(1).replace('.', ',')} KB · SIN DEPENDENCIAS EXTERNAS OBLIGATORIAS
          </div>
        )}
        <p className="mt-3 font-mono text-[9.5px] leading-4 text-steel/80">
          sw.js es opcional: habilita modo offline total. Sin él, la app se instala igual (Chrome/Android y Safari/iOS) y las fuentes caen a system-ui si no hay señal.
        </p>
      </Panel>

      <WhatsAppPanel />

      <Panel title="DEPLOY EN 60 SEGUNDOS" right={<Rocket className="h-4 w-4 text-cyan-hud" />}>
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

      <Panel title="CHECKLIST DE INSTALACIÓN" tone="steel">
        <Tag tone="steel" className="mb-2">
          IOS · SAFARI
        </Tag>
        <p className="text-[13px] text-steel">Metas apple-mobile-web-app + apple-touch-icon embebido → pantalla completa sin barra del navegador.</p>
        <Tag tone="steel" className="mb-2 mt-3">
          ANDROID · CHROME
        </Tag>
        <p className="text-[13px] text-steel">Manifest con iconos 192/512 + maskable → botón «Instalar app» nativo dentro de la PWA.</p>
      </Panel>
    </div>
  );
}
