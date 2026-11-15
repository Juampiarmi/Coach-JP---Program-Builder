'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Cloud, CloudOff, Loader2, LogOut, Mail, TriangleAlert, Upload, UserPlus, X } from 'lucide-react';
import { cloudConfigured } from '@/lib/cloud/config';
import { listAthletes, usePlanStore } from '@/store/usePlanStore';
import { useCloudStore, type SyncState } from '@/store/useCloudStore';
import { cx } from '../hud/primitives';

/** Estado del guardado en lenguaje humano. */
export const SYNC_TEXT: Record<SyncState, { label: string; tip: string; tone: string }> = {
  local: { label: 'Sólo en esta compu', tip: 'Este atleta todavía no está en la nube. Publicalo para crear su link fijo.', tone: 'text-mute' },
  saving: { label: 'Guardando…', tip: 'Subiendo tus últimos cambios a la nube.', tone: 'text-cyan-hud' },
  saved: { label: 'Guardado en la nube', tip: 'Tus cambios están a salvo y los ves también desde el celular.', tone: 'text-[#22C55E]' },
  offline: { label: 'Sin señal · guardado en esta compu', tip: 'Se sube solo cuando vuelva la conexión.', tone: 'text-gold' },
  conflict: { label: 'Cambios en otro dispositivo', tip: 'Elegí qué versión del plan querés conservar (cartel arriba).', tone: 'text-fire' },
  error: { label: 'No se pudo guardar', tip: 'Tus cambios siguen en esta compu. Volvé a intentar en un rato.', tone: 'text-danger' },
};

/** Botón de la nube en el encabezado: entrar, estado del guardado y menú de la cuenta. */
export function CloudAccount() {
  const ready = useCloudStore((s) => s.ready);
  const user = useCloudStore((s) => s.user);
  const sync = useCloudStore((s) => s.sync);
  const init = useCloudStore((s) => s.init);
  const [login, setLogin] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    void init();
  }, [init]);

  if (!cloudConfigured)
    return (
      <span
        className="hidden items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[11px] text-mute md:flex"
        title="La nube todavía no está configurada: el Builder trabaja en esta compu y entregás el plan exportando el archivo. Ver supabase/README.md."
      >
        <CloudOff className="h-3.5 w-3.5" /> Modo local
      </span>
    );

  if (!ready) return <Loader2 className="h-4 w-4 animate-spin text-mute" aria-label="Conectando" />;

  if (!user)
    return (
      <>
        <button
          onClick={() => setLogin(true)}
          className="flex items-center gap-1.5 rounded-md border border-cyan-hud/40 bg-cyan-hud/10 px-2.5 py-1.5 text-[12px] font-semibold text-cyan-hud hover:border-cyan-hud"
          title="Entrá para guardar tus atletas en la nube y publicar planes con link fijo"
        >
          <Cloud className="h-3.5 w-3.5" /> Entrar a la nube
        </button>
        {login && <LoginDialog onClose={() => setLogin(false)} />}
      </>
    );

  const st = SYNC_TEXT[sync];
  return (
    <div className="relative">
      <button onClick={() => setMenu((v) => !v)} title={st.tip} className="flex items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 py-1.5 text-[12px] hover:border-white/20">
        {sync === 'saving' ? <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-hud" /> : sync === 'saved' ? <Check className="h-3.5 w-3.5 text-[#22C55E]" /> : sync === 'local' ? <Cloud className="h-3.5 w-3.5 text-mute" /> : <TriangleAlert className={cx('h-3.5 w-3.5', st.tone)} />}
        <span className={cx('hidden font-semibold sm:inline', st.tone)}>{st.label}</span>
        <ChevronDown className="h-3.5 w-3.5 text-mute" />
      </button>
      {menu && <AccountMenu onClose={() => setMenu(false)} />}
    </div>
  );
}

function AccountMenu({ onClose }: { onClose: () => void }) {
  const user = useCloudStore((s) => s.user);
  const links = useCloudStore((s) => s.links);
  const uploadAll = useCloudStore((s) => s.uploadAll);
  const inviteCoach = useCloudStore((s) => s.inviteCoach);
  const signOut = useCloudStore((s) => s.signOut);
  const busy = useCloudStore((s) => s.busy);
  const plan = usePlanStore((s) => s.plan);
  const roster = usePlanStore((s) => s.roster);
  const box = useRef<HTMLDivElement>(null);
  const [msg, setMsg] = useState('');
  const [invite, setInvite] = useState('');
  const localOnly = listAthletes({ plan, roster }).filter((a) => !links[a.id]).length;

  useEffect(() => {
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && onClose();
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [onClose]);

  return (
    <div ref={box} className="absolute right-0 top-full z-40 mt-2 w-80 rounded-xl border border-line bg-panel p-3 text-[13px] shadow-[0_20px_50px_-20px_rgba(5,8,13,.9)]">
      <div className="text-[11px] text-mute">Sesión iniciada como</div>
      <div className="truncate font-semibold text-ink">{user?.email}</div>
      {localOnly > 0 && (
        <button
          disabled={!!busy}
          onClick={async () => {
            const n = await uploadAll();
            setMsg(n ? `Listo: ${n} atleta${n > 1 ? 's' : ''} subido${n > 1 ? 's' : ''} a la nube.` : 'No se pudo subir. Revisá la conexión.');
          }}
          className="mt-3 flex w-full items-center gap-2 rounded-lg border border-cyan-hud/40 bg-cyan-hud/10 px-3 py-2.5 text-left font-semibold text-cyan-hud hover:border-cyan-hud disabled:opacity-50"
          title="Crea en la nube a los atletas que hoy sólo están en esta compu, cada uno con su link fijo"
        >
          <Upload className="h-4 w-4 flex-none" /> Subir mis {localOnly} atleta{localOnly > 1 ? 's' : ''} de esta compu
        </button>
      )}
      <div className="mt-3 border-t border-line pt-3">
        <div className="mb-1.5 flex items-center gap-1.5 text-[11.5px] text-mute">
          <UserPlus className="h-3.5 w-3.5" /> Invitar a otro coach (equipo)
        </div>
        <div className="flex gap-1.5">
          <input value={invite} onChange={(e) => setInvite(e.target.value)} placeholder="email@ejemplo.com" className="min-w-0 flex-1 rounded-md border border-line bg-carbon px-2 py-1.5 text-[12.5px] text-ink outline-none focus:border-cyan-hud/50" />
          <button
            onClick={async () => {
              const err = await inviteCoach(invite);
              setMsg(err ?? `Listo: ${invite.trim()} ya puede crear su cuenta de coach.`);
              if (!err) setInvite('');
            }}
            className="rounded-md border border-line px-2.5 text-[12px] font-semibold text-steel hover:text-ink"
          >
            Invitar
          </button>
        </div>
        <p className="mt-1 text-[11px] text-mute">Cada coach ve sólo a sus propios atletas.</p>
      </div>
      {(msg || busy) && <div className="mt-2 rounded-md bg-white/[0.04] px-2.5 py-2 text-[12px] text-steel">{busy ?? msg}</div>}
      <button onClick={() => void signOut().then(onClose)} className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-steel hover:bg-white/[0.04] hover:text-ink">
        <LogOut className="h-4 w-4" /> Cerrar sesión
      </button>
    </div>
  );
}

export function LoginDialog({ onClose }: { onClose: () => void }) {
  const signIn = useCloudStore((s) => s.signIn);
  const magicLink = useCloudStore((s) => s.magicLink);
  const resetPassword = useCloudStore((s) => s.resetPassword);
  const busy = useCloudStore((s) => s.busy);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async () => {
    if (!email.trim() || !pw) return setMsg({ ok: false, text: 'Completá tu email y tu contraseña.' });
    const err = await signIn(email, pw);
    if (err) setMsg({ ok: false, text: err });
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Entrar a la nube">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-panel p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-bold text-ink">Entrar a la nube</div>
            <p className="mt-1 text-[13px] text-steel">Guardá tus atletas en la nube y publicá cada plan con un link fijo para tu alumno.</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-mute hover:text-ink" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label className="block">
            <span className="text-[12px] font-semibold text-steel">Email</span>
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-carbon px-3 py-2.5 text-[14px] text-ink outline-none focus:border-cyan-hud/60" />
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold text-steel">Contraseña</span>
            <input type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-carbon px-3 py-2.5 text-[14px] text-ink outline-none focus:border-cyan-hud/60" />
          </label>
          <button type="submit" disabled={!!busy} className="w-full rounded-lg bg-fire py-3 text-[14px] font-bold text-white hover:bg-fire-hot disabled:opacity-60">
            {busy ?? 'Entrar'}
          </button>
        </form>
        <div className="mt-3 flex flex-wrap justify-between gap-2 text-[12.5px]">
          <button
            className="flex items-center gap-1 font-semibold text-cyan-hud hover:underline"
            onClick={async () => {
              if (!email.trim()) return setMsg({ ok: false, text: 'Escribí tu email y te mandamos el link.' });
              const err = await magicLink(email);
              setMsg(err ? { ok: false, text: err } : { ok: true, text: 'Listo: revisá tu email y tocá el link para entrar sin contraseña.' });
            }}
          >
            <Mail className="h-3.5 w-3.5" /> Mandarme un link mágico
          </button>
          <button
            className="text-mute hover:text-steel"
            onClick={async () => {
              if (!email.trim()) return setMsg({ ok: false, text: 'Escribí tu email para recuperar la contraseña.' });
              const err = await resetPassword(email);
              setMsg(err ? { ok: false, text: err } : { ok: true, text: 'Te mandamos un email para crear una contraseña nueva.' });
            }}
          >
            Olvidé mi contraseña
          </button>
        </div>
        {msg && <div className={cx('mt-3 rounded-lg px-3 py-2 text-[12.5px]', msg.ok ? 'bg-[#22C55E]/10 text-[#4ADE80]' : 'bg-danger/10 text-[#FCA5A5]')}>{msg.text}</div>}
      </div>
    </div>
  );
}

/** Cartel cuando el mismo plan se editó en dos dispositivos. */
export function ConflictBanner() {
  const conflict = useCloudStore((s) => s.conflict);
  const resolve = useCloudStore((s) => s.resolveConflict);
  const plan = usePlanStore((s) => s.plan);
  if (!conflict) return null;
  const name = conflict.planId === plan.id ? plan.profile.name : conflict.remote.profile?.name;
  return (
    <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-fire/60 bg-fire/[0.1] px-4 py-3 text-[13px] text-ink">
      <TriangleAlert className="h-5 w-5 flex-none text-fire" />
      <span className="min-w-0 flex-1">
        <b>El plan de {name} se editó en otro dispositivo.</b> ¿Qué versión querés conservar?
      </span>
      <button onClick={() => void resolve('remote')} className="rounded-lg border border-cyan-hud/50 bg-cyan-hud/10 px-3 py-2 font-semibold text-cyan-hud hover:border-cyan-hud">
        Usar la de la nube
      </button>
      <button onClick={() => void resolve('local')} className="rounded-lg bg-fire px-3 py-2 font-semibold text-white hover:bg-fire-hot">
        Quedarme con la de esta compu
      </button>
    </div>
  );
}
