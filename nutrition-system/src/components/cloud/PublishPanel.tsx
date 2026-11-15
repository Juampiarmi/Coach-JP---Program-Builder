'use client';

import { useEffect, useState } from 'react';
import { Check, ChevronDown, ClipboardCopy, Cloud, History, KeyRound, Link2, MessageCircle, RefreshCw, Rocket, ShieldOff, Smartphone } from 'lucide-react';
import { athleteLink } from '@/lib/cloud/config';
import { timeAgo } from '@/lib/planHash';
import { usePlanStore } from '@/store/usePlanStore';
import { useCloudStore } from '@/store/useCloudStore';
import { useExportFreshness } from '../deploy/ExportFreshness';
import { cx } from '../hud/primitives';
import { LoginDialog } from './CloudAccount';

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

/** Mensaje para el alumno con su link fijo. */
export function welcomeMessage(name: string, link: string, pin: boolean) {
  const first = name.split(' ')[0] || name;
  return [
    `¡Hola ${first}! 👋 Ya tenés tu plan de nutrición en el celular:`,
    link,
    '',
    '1. Abrilo desde el celular.',
    '2. Tocá "Agregar a inicio" (iPhone: botón Compartir · Android: menú ⋮) para tenerlo como app.',
    '3. Tildá lo que vas comiendo y anotá tu peso en ayunas.',
    pin ? '\nSi te pide un PIN, te lo paso por acá.' : '',
    'Cuando actualice tu plan, lo vas a ver solo en el mismo link. 💪',
  ]
    .filter((l) => l !== '')
    .join('\n');
}

/** Paso 3 · Publicar: un botón grande, el link fijo del alumno y sus opciones. */
export function PublishPanel() {
  const plan = usePlanStore((s) => s.plan);
  const user = useCloudStore((s) => s.user);
  const link = useCloudStore((s) => s.links[plan.id]);
  const devices = useCloudStore((s) => (link ? (s.devices[link.athleteId] ?? 0) : 0));
  const publish = useCloudStore((s) => s.publish);
  const busy = useCloudStore((s) => s.busy);
  const error = useCloudStore((s) => s.error);
  const { state, last } = useExportFreshness();
  const [login, setLogin] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const [copied, setCopied] = useState('');

  useEffect(() => setDone(null), [plan.id]);

  if (!user)
    return (
      <section className="rounded-2xl border border-cyan-hud/30 bg-cyan-hud/[0.05] p-5">
        <div className="flex items-center gap-2 text-[16px] font-bold text-ink">
          <Cloud className="h-5 w-5 text-cyan-hud" /> Publicá el plan con un link fijo
        </div>
        <p className="mt-1.5 text-[13.5px] text-steel">
          Tu alumno abre siempre el mismo link y ve cada actualización al instante. Vos ves sus registros y su peso. Sin subir archivos.
        </p>
        <button onClick={() => setLogin(true)} className="mt-4 w-full rounded-xl bg-fire py-3.5 text-[15px] font-bold text-white hover:bg-fire-hot">
          Entrar a la nube para publicar
        </button>
        {login && <LoginDialog onClose={() => setLogin(false)} />}
      </section>
    );

  const url = link ? athleteLink(link.slug, link.token) : '';
  const pretty = link ? athleteLink(link.slug) : '';
  const copy = async (what: string, text: string) => {
    await copyText(text);
    setCopied(what);
    setTimeout(() => setCopied(''), 2200);
  };

  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-fire/40 bg-gradient-to-b from-fire/[0.12] to-transparent p-5">
        <div className="text-[12px] font-semibold text-[#FDBA74]">Paso 3 · Publicar</div>
        <div className="mt-1 text-[18px] font-bold text-ink">{plan.profile.name}</div>
        <p className="mt-1 text-[13.5px] text-steel">
          {!link
            ? 'Al publicar se crea su link fijo. Mandáselo una vez: después cada cambio que publiques le llega solo.'
            : state === 'never'
              ? 'Todavía no publicaste este plan.'
              : state === 'stale'
                ? <>Tenés cambios sin publicar. Tu alumno sigue viendo la versión de {last ? timeAgo(last.at) : 'antes'}.</>
                : <>Tu alumno ya ve la última versión (publicada {last ? timeAgo(last.at) : ''}).</>}
        </p>
        <button
          onClick={async () => {
            setDone(null);
            const v = await publish();
            if (v) setDone(v);
          }}
          disabled={!!busy || (state === 'fresh' && !!link)}
          title="Sube el plan a la nube y lo deja visible en el link de tu alumno"
          className={cx(
            'mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-4 text-[16px] font-bold transition',
            state === 'fresh' && link ? 'border border-[#22C55E]/40 bg-[#22C55E]/10 text-[#4ADE80]' : 'bg-fire text-white shadow-[0_10px_30px_-12px_rgba(249,115,22,.9)] hover:bg-fire-hot',
            'disabled:cursor-default',
          )}
        >
          {state === 'fresh' && link ? <Check className="h-5 w-5" /> : <Rocket className="h-5 w-5" />}
          {busy ?? (state === 'fresh' && link ? 'Plan al día' : link ? 'Publicar cambios' : 'Publicar y crear su link')}
        </button>
        {done && (
          <div role="status" className="mt-3 rounded-xl border border-[#22C55E]/40 bg-[#22C55E]/10 px-4 py-3 text-[14px] font-semibold text-[#4ADE80]">
            ¡Plan publicado! Ya lo ve tu alumno en su link. <span className="font-normal text-steel">(versión {done})</span>
          </div>
        )}
        {error && <div className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-[12.5px] text-[#FCA5A5]">{error}</div>}
      </div>

      {link && (
        <div className="rounded-2xl border border-line bg-panel p-4">
          <div className="flex items-center gap-2 text-[14px] font-bold text-ink">
            <Link2 className="h-4 w-4 text-cyan-hud" /> Link de tu alumno
          </div>
          <div className="mt-2 break-all rounded-lg border border-line bg-carbon px-3 py-2 font-mono text-[12px] text-cyan-hud">{pretty}</div>
          <p className="mt-1.5 text-[12px] text-mute">
            El link que copiás incluye una llave de acceso: el alumno entra sin cuenta ni contraseña.{' '}
            <span className="inline-flex items-center gap-1">
              <Smartphone className="h-3 w-3" /> {devices ? `${devices} celular${devices > 1 ? 'es' : ''} vinculado${devices > 1 ? 's' : ''}` : 'Todavía no lo abrió'}
            </span>
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => void copy('link', url)} className="flex items-center justify-center gap-1.5 rounded-lg border border-cyan-hud/40 bg-cyan-hud/10 py-2.5 text-[13px] font-semibold text-cyan-hud hover:border-cyan-hud">
              {copied === 'link' ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />} {copied === 'link' ? 'Copiado' : 'Copiar link'}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(welcomeMessage(plan.profile.name, url, link.pinEnabled))}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-lg border border-[#25D366]/50 bg-[#25D366]/10 py-2.5 text-[13px] font-semibold text-[#4ADE80] hover:border-[#25D366]"
            >
              <MessageCircle className="h-4 w-4" /> Mandar por WhatsApp
            </a>
          </div>
          <LinkOptions />
          <VersionHistory />
        </div>
      )}
    </section>
  );
}

function LinkOptions() {
  const plan = usePlanStore((s) => s.plan);
  const link = useCloudStore((s) => s.links[plan.id]);
  const setPin = useCloudStore((s) => s.setPin);
  const rotateLink = useCloudStore((s) => s.rotateLink);
  const revokeDevices = useCloudStore((s) => s.revokeDevices);
  const [open, setOpen] = useState(false);
  const [pin, setPinText] = useState('');
  const [msg, setMsg] = useState('');
  if (!link) return null;
  const row = 'flex items-start gap-2.5 rounded-lg border border-line p-3';
  return (
    <div className="mt-3 border-t border-line pt-3">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-[13px] font-semibold text-steel hover:text-ink" aria-expanded={open}>
        Opciones del link y seguridad <ChevronDown className={cx('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-3 space-y-2 text-[12.5px]">
          <div className={row}>
            <KeyRound className="mt-0.5 h-4 w-4 flex-none text-gold" />
            <div className="min-w-0 flex-1">
              <b className="text-ink">PIN de 4 números (opcional)</b>
              <p className="text-mute">Si el alumno abre el link sin la llave (por ejemplo, desde otro celular), le pide este PIN.</p>
              <div className="mt-2 flex gap-1.5">
                <input
                  value={pin}
                  onChange={(e) => setPinText(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  inputMode="numeric"
                  placeholder={link.pinEnabled ? 'PIN activo · cambiar' : 'Ej. 4821'}
                  className="w-60 min-w-0 rounded-md border border-line bg-carbon px-2 py-1.5 font-mono text-[13px] text-ink outline-none focus:border-cyan-hud/50"
                />
                <button
                  disabled={pin.length !== 4}
                  onClick={async () => {
                    const err = await setPin(pin);
                    setMsg(err ?? `PIN guardado: ${pin}. Pasáselo a tu alumno por mensaje.`);
                    setPinText('');
                  }}
                  className="rounded-md border border-line px-2.5 font-semibold text-steel hover:text-ink disabled:opacity-40"
                >
                  Guardar
                </button>
                {link.pinEnabled && (
                  <button onClick={async () => setMsg((await setPin(null)) ?? 'PIN desactivado.')} className="px-1.5 text-mute hover:text-ink">
                    Quitar
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className={row}>
            <RefreshCw className="mt-0.5 h-4 w-4 flex-none text-cyan-hud" />
            <div className="min-w-0 flex-1">
              <b className="text-ink">Generar un link nuevo</b>
              <p className="text-mute">El link anterior deja de servir para vincular celulares nuevos. Los que ya lo usan siguen andando.</p>
              <button onClick={async () => confirm('¿Generar un link nuevo? Vas a tener que mandárselo de nuevo a tu alumno.') && setMsg((await rotateLink()) ?? 'Link nuevo listo: copialo y mandáselo.')} className="mt-1.5 font-semibold text-cyan-hud hover:underline">
                Generar link nuevo
              </button>
            </div>
          </div>
          <div className={row}>
            <ShieldOff className="mt-0.5 h-4 w-4 flex-none text-fire" />
            <div className="min-w-0 flex-1">
              <b className="text-ink">Cerrar sesión en todos sus celulares</b>
              <p className="text-mute">Por si perdió el celular o compartió el link. También genera un link nuevo.</p>
              <button
                onClick={async () => confirm('¿Cerrar la sesión en todos los celulares de este alumno? Vas a tener que mandarle el link nuevo.') && setMsg((await revokeDevices()) ?? 'Listo: sesiones cerradas. Mandale el link nuevo.')}
                className="mt-1.5 font-semibold text-fire hover:underline"
              >
                Cerrar sesiones
              </button>
            </div>
          </div>
          {msg && <div className="rounded-md bg-white/[0.04] px-2.5 py-2 text-steel">{msg}</div>}
        </div>
      )}
    </div>
  );
}

function VersionHistory() {
  const plan = usePlanStore((s) => s.plan);
  const versions = useCloudStore((s) => s.versions);
  const activateVersion = useCloudStore((s) => s.activateVersion);
  const pubVersion = useCloudStore((s) => {
    const l = s.links[plan.id];
    return l ? s.published[l.athleteId]?.version : undefined;
  });
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<{ version: number; at: string; note: string; active: boolean }[] | null>(null);

  useEffect(() => {
    if (open) void versions().then(setList);
  }, [open, versions, pubVersion]);

  return (
    <div className="mt-3 border-t border-line pt-3">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-[13px] font-semibold text-steel hover:text-ink" aria-expanded={open}>
        <span className="flex items-center gap-1.5">
          <History className="h-4 w-4" /> Versiones publicadas
        </span>
        <ChevronDown className={cx('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <ul className="mt-2 space-y-1 text-[12.5px]">
          {list === null && <li className="text-mute">Cargando…</li>}
          {list?.length === 0 && <li className="text-mute">Todavía no hay versiones publicadas.</li>}
          {list?.map((v) => (
            <li key={v.version} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-white/[0.03]">
              <span>
                <b className="text-ink">Versión {v.version}</b> <span className="text-mute">· {timeAgo(Date.parse(v.at))}</span>
              </span>
              {v.active ? (
                <span className="text-[11.5px] font-semibold text-[#4ADE80]">La que ve hoy</span>
              ) : (
                <button onClick={async () => confirm(`¿Volver a la versión ${v.version}? Tu alumno la va a ver en su link.`) && (await activateVersion(v.version), setList(await versions()))} className="text-[11.5px] font-semibold text-cyan-hud hover:underline">
                  Volver a esta versión
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
