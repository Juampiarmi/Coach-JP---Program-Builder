'use client';
import { useMemo, useState } from 'react';
import { CalendarRange, Check, ClipboardCopy, Dices, FileArchive, Loader2, PenLine, Save, Settings, Sparkles, Type, Wand2 } from 'lucide-react';
import { PILLARS } from '@/data/library';
import { generateCopyAI } from '@/lib/ai/copyAI';
import { aiReady, useAi } from '@/lib/ai/settings';
import { download, thumbnail } from '@/lib/canvas/export';
import { loadMediaElement } from '@/lib/media';
import { OCCASIONS, TONES, type OccasionId } from '@/lib/copy/bank';
import { captionText, generateCopy, objectivesFor } from '@/lib/copy/engine';
import { uid } from '@/lib/id';
import type { CopyPiece, FormatKey, PillarKey, Project, ToneKey } from "@/lib/types";
import { DAYS, WEEK_SLOTS, addDays, buildWeekProject, nextMonday, weekZip } from '@/lib/week';
import { useCurrent, useStudio, type WeekPlan } from '@/store/studio';
import { SettingsModal } from '../SettingsModal';
import { Btn, Field, Section, Segmented, inputCls } from '../ui';

type Fmt = FormatKey | 'carousel';
type Engine = 'banco' | 'ia';
const FMTS: { value: Fmt; label: string }[] = [
  { value: 'story', label: 'Story' },
  { value: 'reel', label: 'Reel' },
  { value: 'feed45', label: 'Feed' },
  { value: 'carousel', label: 'Carrusel' },
];
const fmtLabel = (f: Fmt) => (f === 'feed45' || f === 'feed11' ? 'Feed' : f === 'carousel' ? 'Carrusel' : f === 'reel' ? 'Reel' : 'Story');

export function CopyPanel() {
  const project = useCurrent();
  const setCopy = useStudio((s) => s.setCopy);
  const addLayer = useStudio((s) => s.addLayer);
  const week = useStudio((s) => s.week);
  const setWeek = useStudio((s) => s.setWeek);
  const projects = useStudio((s) => s.projects);
  const ai = useAi();
  const ready = aiReady(ai);

  const [pillar, setPillar] = useState<PillarKey>(project.pillar ?? 'experiencia');
  const [tone, setTone] = useState<ToneKey>('sugerente');
  const [format, setFormat] = useState<Fmt>(project.format === 'feed11' ? 'feed45' : project.format);
  const [objectiveId, setObjectiveId] = useState<string>('auto');
  const [occasion, setOccasion] = useState<OccasionId>('none');
  const [engine, setEngine] = useState<Engine>(ready && ai.enabled ? 'ia' : 'banco');
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [piece, setPiece] = useState<CopyPiece | null>(project.copy ?? null);
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);
  const [weekStart, setWeekStart] = useState(() => week?.start ?? nextMonday());

  const objectives = useMemo(() => objectivesFor(pillar), [pillar]);
  const useIA = engine === 'ia' && ready;

  const bankPiece = (s: number, p = pillar, f: Fmt = format, obj = objectiveId) =>
    generateCopy({ pillar: p, tone, format: f, objectiveId: obj === 'auto' ? undefined : obj, occasion, seed: s });

  const generate = async () => {
    const s = Math.floor(Math.random() * 1e9);
    setSeed(s);
    setNotice(null);
    if (!useIA) return setPiece(bankPiece(s));
    setBusy('piece');
    try {
      setPiece(await generateCopyAI({ pillar, tone, format, objectiveId: objectiveId === 'auto' ? undefined : objectiveId, occasion }));
    } catch (e) {
      setPiece(bankPiece(s));
      setNotice(`${(e as Error).message} Usé el banco de copys de GEA.`);
    } finally {
      setBusy(null);
    }
  };

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const t = document.createElement('textarea');
      t.value = text;
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      t.remove();
    }
    setCopied(label);
    setTimeout(() => setCopied(null), 1400);
  };

  const edit = (k: keyof CopyPiece, v: string) => piece && setPiece({ ...piece, [k]: k === 'hashtags' ? v.split(/\s+/).filter(Boolean) : v });

  /* ───────── planificador semanal ───────── */
  const buildWeek = async () => {
    setNotice(null);
    const base = Date.now();
    const items: WeekPlan['items'] = [];
    let failed = 0;
    for (const [i, slot] of WEEK_SLOTS.entries()) {
      setBusy(`week:${i + 1}`);
      // banco: prueba otras semillas hasta no repetir gancho ni cuerpo en la semana
      let p: CopyPiece = generateCopy({ pillar: slot.pillar, tone, format: slot.format, seed: base + i * 977 });
      for (let t = 1; t < 24 && items.some((x) => x.piece.hook === p.hook || x.piece.body === p.body); t++)
        p = generateCopy({ pillar: slot.pillar, tone, format: slot.format, seed: base + i * 977 + t * 7919 });
      if (useIA) {
        try {
          p = await generateCopyAI({ pillar: slot.pillar, tone, format: slot.format, avoid: items.map((x) => x.piece.hook) });
        } catch (e) {
          failed++;
          if (failed === 1) setNotice(`${(e as Error).message} Los días que fallaron usan el banco de copys.`);
        }
      }
      items.push({ day: DAYS[i], date: addDays(weekStart, i), pillar: slot.pillar, format: slot.format, piece: p });
    }
    setWeek({ id: uid('wk_'), start: weekStart, tone, source: useIA ? 'ia' : 'banco', items });
    setBusy(null);
  };

  const existing = (w: WeekPlan) => w.items.filter((it) => it.projectId && projects.some((p) => p.id === it.projectId)).length;

  /** Crea en la biblioteca los proyectos que todavía no existen (o los recrea todos si force). */
  const createPieces = (w: WeekPlan, force = false) => {
    const st = useStudio.getState();
    const made: Project[] = [];
    const items = w.items.map((it, i) => {
      if (!force && it.projectId && st.projects.some((p) => p.id === it.projectId)) return it;
      const p = buildWeekProject(it, i, st.assets);
      made.push(p);
      return { ...it, projectId: p.id };
    });
    if (made.length) {
      st.addProjects(made);
      // miniaturas para la biblioteca, en segundo plano
      (async () => {
        for (const p of made) {
          const thumb = thumbnail(p.pages[0], p.format, await loadMediaElement(p.pages[0].background));
          useStudio.setState((s) => ({ projects: s.projects.map((x) => (x.id === p.id ? { ...x, thumb } : x)) }));
        }
      })().catch(() => undefined);
    }
    const next = { ...w, items };
    setWeek(next);
    return next;
  };

  const downloadZip = async () => {
    if (!week) return;
    const w = createPieces(week);
    setBusy('zip:0');
    try {
      const { blob, name } = await weekZip(w, useStudio.getState().projects, (d, t) => setBusy(`zip:${d}/${t}`));
      download(blob, name);
    } catch (e) {
      setNotice(`No se pudo armar el ZIP: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const engineToggle = (
    <Segmented
      value={useIA ? 'ia' : 'banco'}
      onChange={(v: Engine) => (v === 'ia' && !ready ? setSettings(true) : setEngine(v))}
      options={[
        { value: 'banco', label: 'Banco GEA', title: 'Copys curados con la voz de la marca, sin conexión' },
        { value: 'ia', label: ready ? 'IA · Gemini' : 'IA (configurar)', title: 'Copys en vivo con tu API key' },
      ]}
    />
  );

  return (
    <div>
      <Section title="Pilar de contenido">
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(PILLARS) as PillarKey[]).map((p) => (
            <button
              key={p}
              onClick={() => {
                setPillar(p);
                setObjectiveId('auto');
              }}
              className={`rounded-xl p-2.5 text-left ring-1 transition ${pillar === p ? 'bg-neon/15 ring-neon/70' : 'bg-black/30 ring-white/10 hover:ring-white/30'}`}
            >
              <div className="text-xs font-semibold text-white">{PILLARS[p].name}</div>
              <div className="mt-0.5 text-[10px] leading-snug text-white/50">{PILLARS[p].desc}</div>
            </button>
          ))}
        </div>
      </Section>

      <Section
        title="Brief"
        right={
          <button onClick={() => setSettings(true)} className="flex items-center gap-1 text-[10px] text-white/45 hover:text-white" title="Configurar IA">
            <Settings className="h-3 w-3" /> IA
          </button>
        }
      >
        <div className="space-y-3">
          <Field label="Motor de copys">{engineToggle}</Field>
          <Field label="Tono">
            <Segmented value={tone} onChange={setTone} options={(Object.keys(TONES) as ToneKey[]).map((t) => ({ value: t, label: TONES[t].name, title: TONES[t].desc }))} />
          </Field>
          <Field label="Formato">
            <Segmented value={format} onChange={setFormat} options={FMTS} />
          </Field>
          <Field label="Objetivo del post">
            <select className={inputCls} value={objectiveId} onChange={(e) => setObjectiveId(e.target.value)}>
              <option value="auto">Sorprendeme (según el pilar)</option>
              {objectives.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ocasión / guiño de calendario">
            <select className={inputCls} value={occasion} onChange={(e) => setOccasion(e.target.value as OccasionId)}>
              {OCCASIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex gap-2">
            <Btn variant="primary" className="flex-1" onClick={generate} disabled={!!busy}>
              {busy === 'piece' ? <Loader2 className="h-4 w-4 animate-spin" /> : useIA ? <Sparkles className="h-4 w-4" /> : <PenLine className="h-4 w-4" />}
              {busy === 'piece' ? 'Escribiendo…' : useIA ? 'Generar con IA' : 'Generar pieza'}
            </Btn>
            <Btn onClick={generate} title="Otra variante" disabled={!piece || !!busy}>
              <Dices className="h-4 w-4" />
            </Btn>
          </div>
          {notice && <p className="rounded-lg bg-amber-400/10 p-2.5 text-[11px] leading-snug text-amber-100 ring-1 ring-amber-300/30">{notice}</p>}
        </div>
      </Section>

      {piece && (
        <Section title="Pieza generada" right={<span className="font-tech text-[9px] text-white/30">#{seed.toString(36)}</span>}>
          <div className="space-y-3">
            <Block label="1 · Objetivo" value={piece.objective} onChange={(v) => edit('objective', v)} rows={1} />
            <Block label="2 · Dirección visual / video" value={piece.visual} onChange={(v) => edit('visual', v)} rows={4} />
            <Block label="3a · Gancho (hook)" value={piece.hook} onChange={(v) => edit('hook', v)} rows={2} accent />
            <Block label="3b · Cuerpo" value={piece.body} onChange={(v) => edit('body', v)} rows={4} />
            <Block label="3c · CTA" value={piece.cta} onChange={(v) => edit('cta', v)} rows={2} />
            <Block label="4 · Hashtags" value={piece.hashtags.join(' ')} onChange={(v) => edit('hashtags', v)} rows={2} />
            <div className="grid grid-cols-2 gap-2">
              <Btn onClick={() => copy('caption', captionText(piece))}>
                {copied === 'caption' ? <Check className="h-4 w-4 text-neon" /> : <ClipboardCopy className="h-4 w-4" />} Copiar caption
              </Btn>
              <Btn onClick={() => setCopy(piece)}>
                <Save className="h-4 w-4" /> Guardar en pieza
              </Btn>
              <Btn className="col-span-2" variant="outline" onClick={() => addLayer({ kind: 'text', text: piece.hook, accent: PILLARS[piece.pillar].accent, style: 'neon', font: 'body' })}>
                <Type className="h-4 w-4" /> Llevar el gancho al canvas
              </Btn>
            </div>
          </div>
        </Section>
      )}

      <Section title="Planificador semanal" right={week && <span className="text-[10px] text-white/40">{week.source === 'ia' ? 'IA' : 'Banco'} · {TONES[week.tone].name}</span>}>
        <p className="mb-2 text-[11px] leading-snug text-white/50">
          7 piezas rotando pilares y formatos, en el tono elegido. Después se arman solas en el canvas (con fondos de la Galería GEA) y se descargan en un ZIP.
        </p>
        <div className="flex gap-2">
          <input type="date" className={`${inputCls} !w-40`} value={weekStart} onChange={(e) => setWeekStart(e.target.value || nextMonday())} aria-label="Lunes de la semana" />
          <Btn className="flex-1" onClick={buildWeek} disabled={!!busy}>
            {busy?.startsWith('week') ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarRange className="h-4 w-4" />}
            {busy?.startsWith('week') ? `${busy.split(':')[1]}/7…` : week ? 'Rearmar semana' : 'Armar semana'}
          </Btn>
        </div>
        {week && (
          <>
            <ol className="mt-3 space-y-2">
              {week.items.map((d, i) => {
                const p = projects.find((x) => x.id === d.projectId);
                return (
                  <li key={d.day} className="rounded-lg bg-white/[0.03] p-2.5 ring-1 ring-white/5">
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-white/45">
                      <span className="font-semibold text-white/80">
                        {d.day} {new Date(`${d.date}T12:00:00`).getDate()}
                      </span>
                      <span>
                        {PILLARS[d.pillar].short} · {fmtLabel(d.format)}
                      </span>
                    </div>
                    <div className="mt-1 text-[12px] font-semibold text-white">{(p?.copy ?? d.piece).hook}</div>
                    <div className="text-[11px] text-white/55">{d.piece.objective}</div>
                    <div className="mt-1.5 flex gap-3">
                      <button className="text-[10px] text-neon hover:underline" onClick={() => setPiece(p?.copy ?? d.piece)}>
                        Ver copy
                      </button>
                      <button className="text-[10px] text-white/50 hover:underline" onClick={() => copy(d.day, captionText(p?.copy ?? d.piece))}>
                        {copied === d.day ? 'Copiado ✓' : 'Copiar caption'}
                      </button>
                      {p && (
                        <button className="text-[10px] text-white/50 hover:underline" onClick={() => useStudio.getState().openProject(p.id)}>
                          Abrir pieza {String(i + 1).padStart(2, '0')}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Btn onClick={() => createPieces(week, existing(week) === 7 && confirm('¿Volver a armar las 7 piezas desde cero? Las ediciones hechas en el canvas se reemplazan por piezas nuevas.'))} disabled={!!busy}>
                <Wand2 className="h-4 w-4" /> {existing(week) ? `Piezas (${existing(week)}/7)` : 'Crear las 7 piezas'}
              </Btn>
              <Btn variant="primary" onClick={downloadZip} disabled={!!busy}>
                {busy?.startsWith('zip') ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileArchive className="h-4 w-4" />}
                {busy?.startsWith('zip') ? busy.split(':')[1] : 'ZIP de la semana'}
              </Btn>
            </div>
            <p className="mt-2 text-[10px] leading-snug text-white/40">
              El ZIP trae un PNG por slide (1080×1920 Stories/Reels, 1080×1350 Feed y carruseles), el caption de cada día en .txt y un plan.csv con fecha y hora sugerida. Si editás una pieza en el canvas, el ZIP usa la versión editada.
            </p>
          </>
        )}
      </Section>
      {settings && <SettingsModal onClose={() => setSettings(false)} />}
    </div>
  );
}

function Block({ label, value, onChange, rows, accent }: { label: string; value: string; onChange: (v: string) => void; rows: number; accent?: boolean }) {
  return (
    <label className="block">
      <span className={`mb-1 block text-[10px] font-semibold uppercase tracking-wider ${accent ? 'text-neon' : 'text-white/45'}`}>{label}</span>
      <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} resize-y text-[13px] leading-snug`} />
    </label>
  );
}
