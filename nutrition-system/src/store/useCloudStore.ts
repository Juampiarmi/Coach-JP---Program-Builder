'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { cloudConfigured } from '@/lib/cloud/config';
import { humanError, supa } from '@/lib/cloud/client';
import { buildPayload, slugify } from '@/lib/exportHtml';
import { PHASE_LABEL, trainingWeekdays } from '@/lib/bioenergetics';
import { planFingerprint } from '@/lib/planHash';
import type { AthletePlan, Phase } from '@/lib/types';
import { usePlanStore } from './usePlanStore';
import { withoutUndo } from './undo';

/**
 * Nube del Builder (Supabase): sesión del coach, borrador sincronizado entre dispositivos y publicación del plan.
 * La base local sigue siendo la caché de trabajo: todo se edita acá y se sube solo (borrador) o al publicar.
 */

/** Vínculo de un plan local con su atleta en la nube (por id del plan, que viaja igual en el borrador). */
export interface CloudLink {
  athleteId: string;
  slug: string;
  /** updated_at del borrador que este dispositivo tiene como base (detecta cambios hechos en otro dispositivo). */
  draftAt: string | null;
  draftHash: string;
  token: string | null;
  pinEnabled: boolean;
}
export interface PublishedInfo {
  version: number;
  hash: string;
  at: string;
}
export type SyncState = 'local' | 'saving' | 'saved' | 'offline' | 'conflict' | 'error';

interface CloudState {
  ready: boolean;
  user: { id: string; email: string } | null;
  coachName: string;
  links: Record<string, CloudLink>;
  published: Record<string, PublishedInfo | null>;
  devices: Record<string, number>;
  sync: SyncState;
  syncMsg: string;
  savedAt: number | null;
  conflict: { planId: string; remote: AthletePlan; remoteAt: string } | null;
  busy: string | null;
  error: string;

  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; confirm: boolean }>;
  magicLink: (email: string) => Promise<string | null>;
  resetPassword: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  pull: () => Promise<void>;
  connectPlan: (plan: AthletePlan, slug?: string) => Promise<CloudLink | null>;
  uploadAll: () => Promise<number>;
  saveDraft: (force?: boolean) => Promise<void>;
  publish: (note?: string) => Promise<number | null>;
  setPin: (pin: string | null) => Promise<string | null>;
  rotateLink: () => Promise<string | null>;
  revokeDevices: () => Promise<string | null>;
  resolveConflict: (keep: 'remote' | 'local') => Promise<void>;
  inviteCoach: (email: string) => Promise<string | null>;
  versions: () => Promise<{ version: number; at: string; note: string; active: boolean }[]>;
  activateVersion: (version: number) => Promise<string | null>;
}

const GOAL: Record<Phase, string> = { recomp: 'recomp', maintenance: 'maintain', surplus: 'bulk' };

function athleteRow(plan: AthletePlan) {
  const pr = plan.profile;
  return {
    name: pr.name.trim() || 'Atleta',
    sex: pr.sex,
    base_weight_kg: pr.weightKg >= 30 && pr.weightKg <= 250 ? pr.weightKg : null,
    goal: GOAL[pr.phase] ?? null,
    phase: PHASE_LABEL[pr.phase] ?? '',
    discipline: pr.discipline,
    training_weekdays: trainingWeekdays(pr),
  };
}

const active = () => usePlanStore.getState().plan;
let timer: ReturnType<typeof setTimeout> | null = null;
let subscribed = false;

export const useCloudStore = create<CloudState>()(
  persist(
    (set, get) => {
      const fail = (e: unknown) => {
        const msg = humanError(e);
        set({ error: msg, busy: null });
        return msg;
      };

      /** Borrador pendiente del plan activo: se sube 1,5 s después del último cambio. */
      const schedule = () => {
        const plan = active();
        const link = get().links[plan.id];
        if (!link || !get().user) return set({ sync: 'local' });
        if (planFingerprint(plan) === link.draftHash) return;
        if (get().sync !== 'conflict') set({ sync: 'saving', syncMsg: '' });
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => void get().saveDraft(), 1500);
      };

      const watch = () => {
        if (subscribed) return;
        subscribed = true;
        usePlanStore.subscribe((s, prev) => {
          if (s.plan === prev.plan) return;
          if (s.plan.id !== prev.plan.id && timer) {
            // Cambio de atleta con un guardado pendiente: el saliente se sube ya.
            clearTimeout(timer);
            timer = null;
            void uploadDraft(prev.plan);
          }
          schedule();
        });
        window.addEventListener('online', () => schedule());
        setInterval(() => {
          if (get().sync === 'offline') schedule();
        }, 30000);
      };

      const uploadDraft = async (plan: AthletePlan, force = false) => {
        const link = get().links[plan.id];
        if (!link) return;
        const hash = planFingerprint(plan);
        const { data, error } = await supa().rpc('save_draft', { p_athlete: link.athleteId, p_plan: plan, p_hash: hash, p_base: link.draftAt, p_force: force });
        if (error) throw error;
        set((s) => ({ links: { ...s.links, [plan.id]: { ...link, draftAt: data as string, draftHash: hash } } }));
      };

      const merge = (planId: string, remote: AthletePlan, remoteAt: string, remoteHash: string, base: Omit<CloudLink, 'draftAt' | 'draftHash'>) => {
        const st = usePlanStore.getState();
        const local = st.plan.id === planId ? st.plan : st.roster[planId];
        const link = get().links[planId];
        const setLink = () => set((s) => ({ links: { ...s.links, [planId]: { ...base, draftAt: remoteAt, draftHash: remoteHash } } }));
        if (!local) {
          withoutUndo(() => st.receiveCloudPlan(remote));
          return setLink();
        }
        if (link?.draftAt === remoteAt) return set((s) => ({ links: { ...s.links, [planId]: { ...link, ...base } } }));
        const localChanged = !!link && planFingerprint(local) !== link.draftHash;
        if (!localChanged) {
          withoutUndo(() => st.receiveCloudPlan(remote));
          return setLink();
        }
        // Cambió acá y en otro dispositivo: decide el coach.
        set((s) => ({ conflict: { planId, remote, remoteAt }, sync: 'conflict', links: { ...s.links, [planId]: { ...link!, ...base } } }));
      };

      return {
        ready: false,
        user: null,
        coachName: '',
        links: {},
        published: {},
        devices: {},
        sync: 'local',
        syncMsg: '',
        savedAt: null,
        conflict: null,
        busy: null,
        error: '',

        init: async () => {
          if (!cloudConfigured) {
            set({ ready: true });
            return;
          }
          const sb = supa();
          sb.auth.onAuthStateChange((_ev, session) => {
            const u = session?.user;
            set({ user: u && !u.is_anonymous ? { id: u.id, email: u.email ?? '' } : null });
          });
          const { data } = await sb.auth.getSession();
          const u = data.session?.user;
          if (u && !u.is_anonymous) {
            set({ user: { id: u.id, email: u.email ?? '' } });
            try {
              const { data: coach, error } = await sb.rpc('ensure_coach', { p_name: '' });
              if (error) throw error;
              set({ coachName: (coach as { name?: string })?.name ?? '' });
              await get().pull();
            } catch (e) {
              fail(e);
            }
            watch();
          }
          set({ ready: true });
        },

        signIn: async (email, password) => {
          set({ busy: 'Entrando…', error: '' });
          const sb = supa();
          const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
          if (error) return fail(error);
          const { data: coach, error: e2 } = await sb.rpc('ensure_coach', { p_name: '' });
          if (e2) {
            await sb.auth.signOut();
            set({ user: null });
            return fail(e2);
          }
          set({ coachName: (coach as { name?: string })?.name ?? '' });
          await get().pull();
          watch();
          set({ busy: null });
          // Primera pantalla después de entrar: el panel con todos los atletas.
          usePlanStore.getState().setBuilderTab('athletes');
          return null;
        },

        signUp: async (email, password) => {
          set({ busy: 'Creando tu cuenta…', error: '' });
          const sb = supa();
          const { data, error } = await sb.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.href.split('#')[0] } });
          if (error) return { error: fail(error), confirm: false };
          if (!data.session) {
            set({ busy: null });
            return { error: null, confirm: true };
          }
          const { data: coach, error: e2 } = await sb.rpc('ensure_coach', { p_name: '' });
          if (e2) {
            await sb.auth.signOut();
            set({ user: null });
            return { error: fail(e2), confirm: false };
          }
          set({ coachName: (coach as { name?: string })?.name ?? '' });
          await get().pull();
          watch();
          set({ busy: null });
          usePlanStore.getState().setBuilderTab('athletes');
          return { error: null, confirm: false };
        },

        magicLink: async (email) => {
          set({ busy: 'Enviando…', error: '' });
          const { error } = await supa().auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false, emailRedirectTo: window.location.href.split('#')[0] } });
          if (error) return fail(error);
          set({ busy: null });
          return null;
        },

        resetPassword: async (email) => {
          set({ busy: 'Enviando…', error: '' });
          const { error } = await supa().auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.href.split('#')[0] });
          if (error) return fail(error);
          set({ busy: null });
          return null;
        },

        signOut: async () => {
          if (timer) clearTimeout(timer);
          await supa().auth.signOut();
          set({ user: null, coachName: '', sync: 'local', conflict: null, published: {}, devices: {} });
        },

        pull: async () => {
          const sb = supa();
          set({ busy: 'Trayendo tus atletas…' });
          try {
            const [ath, drafts, pubs, access, devs] = await Promise.all([
              sb.from('athletes').select('id, slug, pin_enabled, archived_at').is('archived_at', null),
              sb.from('plan_drafts').select('athlete_id, plan, hash, updated_at'),
              sb.from('published_plans').select('athlete_id, version, hash, published_at').eq('is_active', true),
              sb.from('athlete_access').select('athlete_id, token'),
              sb.from('athlete_devices').select('athlete_id').is('revoked_at', null),
            ]);
            for (const r of [ath, drafts, pubs, access, devs]) if (r.error) throw r.error;
            const tokens = Object.fromEntries((access.data ?? []).map((a) => [a.athlete_id, a.token as string]));
            const published: Record<string, PublishedInfo | null> = {};
            for (const p of pubs.data ?? []) published[p.athlete_id] = { version: p.version, hash: p.hash, at: p.published_at };
            const devices: Record<string, number> = {};
            for (const d of devs.data ?? []) devices[d.athlete_id] = (devices[d.athlete_id] ?? 0) + 1;
            const alive = new Set((ath.data ?? []).map((a) => a.id as string));
            // Vínculos a atletas borrados o archivados en la nube: vuelven a ser planes sólo locales.
            set((s) => ({ links: Object.fromEntries(Object.entries(s.links).filter(([, l]) => alive.has(l.athleteId))), published, devices }));
            const meta = Object.fromEntries((ath.data ?? []).map((a) => [a.id, a]));
            for (const d of drafts.data ?? []) {
              const a = meta[d.athlete_id];
              const plan = d.plan as AthletePlan;
              if (!a || !plan?.id) continue;
              merge(plan.id, plan, d.updated_at, d.hash, { athleteId: a.id, slug: a.slug, token: tokens[a.id] ?? null, pinEnabled: !!a.pin_enabled });
            }
            set({ busy: null, error: '', sync: get().conflict ? 'conflict' : get().links[active().id] ? 'saved' : 'local' });
            schedule();
          } catch (e) {
            fail(e);
            set({ sync: 'offline' });
          }
        },

        connectPlan: async (plan, wanted) => {
          const u = get().user;
          if (!u) return null;
          const sb = supa();
          set({ busy: 'Creando su link…', error: '' });
          try {
            let slug = slugify(wanted || plan.profile.name).slice(0, 50).replace(/-$/, '') || 'atleta';
            if (slug.length < 2) slug = `${slug}-jp`;
            for (let i = 2; ; i++) {
              const { data: free, error } = await sb.rpc('slug_available', { p_slug: slug });
              if (error) throw error;
              if (free) break;
              slug = `${slug.replace(/-\d+$/, '')}-${i}`;
              if (i > 30) throw new Error('No encontramos un link libre: probá con otro nombre.');
            }
            const { data: row, error: e1 } = await sb.from('athletes').insert({ coach_id: u.id, slug, ...athleteRow(plan) }).select('id').single();
            if (e1) throw e1;
            const { data: token, error: e2 } = await sb.rpc('rotate_athlete_token', { p_athlete: row.id });
            if (e2) throw e2;
            const link: CloudLink = { athleteId: row.id, slug, token: token as string, pinEnabled: false, draftAt: null, draftHash: '' };
            set((s) => ({ links: { ...s.links, [plan.id]: link }, published: { ...s.published, [row.id]: null } }));
            await uploadDraft(plan, true);
            set({ busy: null, sync: 'saved', savedAt: Date.now() });
            return get().links[plan.id];
          } catch (e) {
            fail(e);
            return null;
          }
        },

        uploadAll: async () => {
          const st = usePlanStore.getState();
          const plans = [st.plan, ...Object.values(st.roster)].filter((p) => !get().links[p.id]);
          let n = 0;
          for (const p of plans) if (await get().connectPlan(p)) n++;
          return n;
        },

        saveDraft: async (force = false) => {
          const plan = active();
          if (!get().links[plan.id] || !get().user) return;
          if (get().conflict && !force) return;
          if (!force && planFingerprint(plan) === get().links[plan.id].draftHash) {
            set({ sync: 'saved' });
            return;
          }
          set({ sync: 'saving' });
          try {
            await uploadDraft(plan, force);
            set({ sync: 'saved', savedAt: Date.now(), syncMsg: '' });
          } catch (e) {
            const err = e as { code?: string };
            if (err.code === '40001') {
              const link = get().links[plan.id];
              const { data } = await supa().from('plan_drafts').select('plan, updated_at').eq('athlete_id', link.athleteId).single();
              if (data) set({ conflict: { planId: plan.id, remote: data.plan as AthletePlan, remoteAt: data.updated_at }, sync: 'conflict' });
              return;
            }
            const msg = humanError(e);
            set({ sync: /Sin conexión/.test(msg) ? 'offline' : 'error', syncMsg: msg });
          }
        },

        publish: async (note = '') => {
          const plan = active();
          let link = get().links[plan.id];
          set({ error: '' });
          if (!link) {
            const created = await get().connectPlan(plan);
            if (!created) return null;
            link = created;
          }
          set({ busy: 'Publicando…' });
          try {
            if (timer) clearTimeout(timer);
            await uploadDraft(plan, true);
            const payload = { ...buildPayload(plan, { preview: false, mode: 'on' }), slug: link.slug, cloud: true };
            const hash = planFingerprint(plan);
            const sb = supa();
            const { data: v, error } = await sb.rpc('publish_plan', { p_athlete: link.athleteId, p_payload: payload, p_hash: hash, p_note: note });
            if (error) throw error;
            await sb.from('athletes').update(athleteRow(plan)).eq('id', link.athleteId);
            set((s) => ({ published: { ...s.published, [link.athleteId]: { version: v as number, hash, at: new Date().toISOString() } }, busy: null, sync: 'saved', savedAt: Date.now() }));
            return v as number;
          } catch (e) {
            fail(e);
            return null;
          }
        },

        setPin: async (pin) => {
          const link = get().links[active().id];
          if (!link) return 'Primero conectá este atleta a la nube.';
          const { error } = await supa().rpc('set_athlete_pin', { p_athlete: link.athleteId, p_pin: pin });
          if (error) return fail(error);
          set((s) => ({ links: { ...s.links, [active().id]: { ...link, pinEnabled: pin !== null } } }));
          return null;
        },

        rotateLink: async () => {
          const link = get().links[active().id];
          if (!link) return null;
          const { data, error } = await supa().rpc('rotate_athlete_token', { p_athlete: link.athleteId });
          if (error) return fail(error);
          set((s) => ({ links: { ...s.links, [active().id]: { ...link, token: data as string } } }));
          return null;
        },

        revokeDevices: async () => {
          const link = get().links[active().id];
          if (!link) return null;
          const { data, error } = await supa().rpc('revoke_athlete_devices', { p_athlete: link.athleteId, p_rotate: true });
          if (error) return fail(error);
          set((s) => ({ links: { ...s.links, [active().id]: { ...link, token: data as string } }, devices: { ...s.devices, [link.athleteId]: 0 } }));
          return null;
        },

        resolveConflict: async (keep) => {
          const c = get().conflict;
          if (!c) return;
          set({ conflict: null });
          if (keep === 'remote') {
            withoutUndo(() => usePlanStore.getState().receiveCloudPlan(c.remote));
            const link = get().links[c.planId];
            set((s) => ({ links: { ...s.links, [c.planId]: { ...link, draftAt: c.remoteAt, draftHash: planFingerprint(c.remote) } }, sync: 'saved' }));
          } else {
            await get().saveDraft(true);
          }
        },

        inviteCoach: async (email) => {
          const mail = email.trim().toLowerCase();
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return 'Revisá el email.';
          const { error } = await supa().from('coach_allowlist').upsert({ email: mail, invited_by: get().user?.id });
          return error ? fail(error) : null;
        },

        versions: async () => {
          const link = get().links[active().id];
          if (!link) return [];
          const { data } = await supa().from('published_plans').select('version, published_at, note, is_active').eq('athlete_id', link.athleteId).order('version', { ascending: false }).limit(20);
          return (data ?? []).map((r) => ({ version: r.version, at: r.published_at, note: r.note, active: r.is_active }));
        },

        activateVersion: async (version) => {
          const link = get().links[active().id];
          if (!link) return null;
          const { error } = await supa().rpc('activate_plan_version', { p_athlete: link.athleteId, p_version: version });
          if (error) return fail(error);
          await get().pull();
          return null;
        },
      };
    },
    {
      name: 'coachjp-cloud',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ links: s.links }),
    },
  ),
);
