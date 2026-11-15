'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ClipboardCopy, Cloud, ExternalLink, Loader2, TriangleAlert, X } from 'lucide-react';
import { BASE_PATH, cloudBuiltIn, cloudIsTrial, clearOverride, saveOverride, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/cloud/config';
import { normalizeUrl, probeSupabase, type CheckState, type ProbeResult } from '@/lib/cloud/probe';
import { cx } from '../hud/primitives';

/** Repo de GitHub del sitio publicado (para el link directo a sus variables). */
function repoSlug() {
  if (typeof window !== 'undefined') {
    const m = /^([^.]+)\.github\.io$/i.exec(window.location.hostname);
    const seg = window.location.pathname.split('/')[1];
    if (m && seg) return `${m[1]}/${seg}`;
  }
  return process.env.NEXT_PUBLIC_REPO || 'Juampiarmi/Coach-JP---Program-Builder';
}

async function copy(text: string) {
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

function CopyBtn({ text, label }: { text: string; label: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await copy(text);
        setOk(true);
        setTimeout(() => setOk(false), 1800);
      }}
      className="flex flex-none items-center gap-1 rounded-md border border-line px-2 py-1 text-[11.5px] font-semibold text-steel hover:text-ink"
    >
      {ok ? <Check className="h-3.5 w-3.5 text-[#4ADE80]" /> : <ClipboardCopy className="h-3.5 w-3.5" />} {ok ? 'Copiado' : label}
    </button>
  );
}

const ICON: Record<CheckState, React.ReactNode> = {
  ok: <Check className="h-4 w-4 text-[#4ADE80]" />,
  warn: <TriangleAlert className="h-4 w-4 text-gold" />,
  fail: <X className="h-4 w-4 text-[#FCA5A5]" />,
};

/** Asistente "Conectar nube en 1 paso": pegar URL + clave, probar al instante y dejarla lista. */
export function CloudConnect({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState(cloudIsTrial ? SUPABASE_URL : '');
  const [key, setKey] = useState(cloudIsTrial ? SUPABASE_ANON_KEY : '');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<ProbeResult | null>(null);
  const [sqlCopied, setSqlCopied] = useState(false);
  const repo = repoSlug();
  const ref = res?.ref ?? normalizeUrl(url).ref;
  const dash = (path: string) => `https://supabase.com/dashboard/project/${ref ?? '_'}/${path}`;

  const test = async () => {
    setBusy(true);
    setRes(await probeSupabase(url, key));
    setBusy(false);
  };
  const copySql = async () => {
    const r = await fetch(`${BASE_PATH}/supabase-setup.sql`);
    await copy(await r.text());
    setSqlCopied(true);
  };

  return createPortal(

    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Conectar nube">
      <div className="flex min-h-full items-start justify-center p-4 sm:items-center sm:py-10">
      <div data-connect-card className="w-full max-w-lg rounded-2xl border border-line bg-panel p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-lg font-bold text-ink">
              <Cloud className="h-5 w-5 text-cyan-hud" /> Conectar nube en 1 paso
            </div>
            <p className="mt-1 text-[13px] text-steel">Pegá los 2 datos de tu proyecto de Supabase. Lo probamos al instante, antes de dejarlo fijo para tus alumnos.</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-mute hover:text-ink" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>

        {cloudBuiltIn ? (
          <div className="mt-4 rounded-lg border border-[#22C55E]/40 bg-[#22C55E]/10 px-3 py-2.5 text-[13px] text-[#4ADE80]">La nube ya está conectada para todos en este sitio. No hace falta hacer nada más.</div>
        ) : (
          <>
            <div className="mt-4 rounded-lg border border-line bg-white/[0.02] px-3 py-2.5 text-[12.5px] text-steel">
              ¿Todavía no tenés proyecto?{' '}
              <a href="https://supabase.com/dashboard/new" target="_blank" rel="noreferrer" className="font-semibold text-cyan-hud hover:underline">
                Crealo acá <ExternalLink className="inline h-3 w-3" />
              </a>{' '}
              (región <b className="text-ink">South America · São Paulo</b>). Los 2 datos están en{' '}
              <a href={dash('settings/api')} target="_blank" rel="noreferrer" className="font-semibold text-cyan-hud hover:underline">
                Project Settings → API <ExternalLink className="inline h-3 w-3" />
              </a>
              .
            </div>
            <form
              className="mt-3 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void test();
              }}
            >
              <label className="block">
                <span className="text-[12px] font-semibold text-steel">URL del proyecto (Project URL)</span>
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://xxxxxxxx.supabase.co" className="mt-1 w-full rounded-lg border border-line bg-carbon px-3 py-2.5 font-mono text-[13px] text-ink outline-none focus:border-cyan-hud/60" />
              </label>
              <label className="block">
                <span className="text-[12px] font-semibold text-steel">Clave pública (anon / public)</span>
                <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="eyJhbGciOi… o sb_publishable_…" className="mt-1 w-full rounded-lg border border-line bg-carbon px-3 py-2.5 font-mono text-[12px] text-ink outline-none focus:border-cyan-hud/60" />
                <span className="mt-1 block text-[11px] text-mute">Nunca pegues la clave service_role: esa es secreta.</span>
              </label>
              <button type="submit" disabled={busy || !url.trim() || key.trim().length < 20} className="flex w-full items-center justify-center gap-2 rounded-lg bg-fire py-3 text-[14px] font-bold text-white hover:bg-fire-hot disabled:opacity-50">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} {busy ? 'Probando…' : 'Probar conexión'}
              </button>
            </form>

            {res && (
              <ul className="mt-4 space-y-2 text-[13px]" aria-label="Resultado de la prueba">
                {[res.project, res.database, res.anonymous, res.signup].map((c, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-0.5 flex-none">{ICON[c.state]}</span>
                    <span className={cx(c.state === 'fail' ? 'text-[#FCA5A5]' : c.state === 'warn' ? 'text-[#FDE68A]' : 'text-steel')}>
                      {c.text}
                      {i === 1 && c.state === 'fail' && (
                        <span className="mt-1.5 flex flex-wrap gap-2">
                          <button type="button" onClick={() => void copySql()} className="rounded-md border border-cyan-hud/40 bg-cyan-hud/10 px-2.5 py-1 text-[12px] font-semibold text-cyan-hud">
                            {sqlCopied ? '✓ SQL copiado' : '1. Copiar SQL'}
                          </button>
                          <a href={dash('sql/new')} target="_blank" rel="noreferrer" className="rounded-md border border-line px-2.5 py-1 text-[12px] font-semibold text-steel hover:text-ink">
                            2. Abrir editor SQL, pegar y Run <ExternalLink className="inline h-3 w-3" />
                          </a>
                          <button type="button" onClick={() => void test()} className="px-1 text-[12px] font-semibold text-cyan-hud hover:underline">
                            3. Volver a probar
                          </button>
                        </span>
                      )}
                      {i === 2 && c.state !== 'ok' && (
                        <a href={dash('auth/providers')} target="_blank" rel="noreferrer" className="ml-1 font-semibold text-cyan-hud hover:underline">
                          Abrir <ExternalLink className="inline h-3 w-3" />
                        </a>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {res?.ready && (
              <div className="mt-4 space-y-3">
                <button
                  onClick={() => {
                    saveOverride(res.url, key.trim());
                    window.location.reload();
                  }}
                  className="w-full rounded-lg border border-[#22C55E]/50 bg-[#22C55E]/15 py-3 text-[14px] font-bold text-[#4ADE80] hover:border-[#22C55E]"
                >
                  ✓ Usar esta conexión en este navegador
                </button>
                <div className="rounded-lg border border-line p-3 text-[12.5px] text-steel">
                  <b className="text-ink">Para que la vean tus alumnos, fijala en el sitio</b> (una sola vez):
                  <ol className="mt-2 list-decimal space-y-1.5 pl-5">
                    <li>
                      Abrí{' '}
                      <a href={`https://github.com/${repo}/settings/variables/actions/new`} target="_blank" rel="noreferrer" className="font-semibold text-cyan-hud hover:underline">
                        GitHub → nueva variable <ExternalLink className="inline h-3 w-3" />
                      </a>{' '}
                      y creá estas dos:
                    </li>
                  </ol>
                  <div className="mt-2 space-y-1.5">
                    {(
                      [
                        ['SUPABASE_URL', res.url],
                        ['SUPABASE_ANON_KEY', key.trim()],
                      ] as const
                    ).map(([name, value]) => (
                      <div key={name} className="flex items-center gap-2 rounded-md bg-carbon px-2 py-1.5">
                        <code className="w-36 flex-none text-[11.5px] font-bold text-ink">{name}</code>
                        <code className="min-w-0 flex-1 truncate text-[11px] text-cyan-hud">{value}</code>
                        <CopyBtn text={name} label="Nombre" />
                        <CopyBtn text={value} label="Valor" />
                      </div>
                    ))}
                  </div>
                  <p className="mt-2">
                    Después:{' '}
                    <a href={`https://github.com/${repo}/actions/workflows/pages.yml`} target="_blank" rel="noreferrer" className="font-semibold text-cyan-hud hover:underline">
                      Actions → Run workflow <ExternalLink className="inline h-3 w-3" />
                    </a>
                    . O pedile a Claude que la deje fija en <code className="text-ink">cloud.config.json</code>.
                  </p>
                </div>
              </div>
            )}

            {cloudIsTrial && (
              <button
                onClick={() => {
                  clearOverride();
                  window.location.reload();
                }}
                className="mt-4 text-[12px] text-mute underline hover:text-steel"
              >
                Quitar la conexión de prueba de este navegador
              </button>
            )}
          </>
        )}
      </div>
      </div>
    </div>,
    document.body,
  );
}
