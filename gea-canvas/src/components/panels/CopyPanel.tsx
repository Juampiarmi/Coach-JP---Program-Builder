'use client';
import { useMemo, useState } from 'react';
import { Check, ClipboardCopy, Dices, PenLine, Save, Type, CalendarRange } from 'lucide-react';
import { PILLARS } from '@/data/library';
import { OCCASIONS, TONES, type OccasionId } from '@/lib/copy/bank';
import { captionText, generateCopy, objectivesFor, weeklyGrid } from '@/lib/copy/engine';
import type { CopyPiece, FormatKey, PillarKey, ToneKey } from '@/lib/types';
import { useCurrent, useStudio } from '@/store/studio';
import { Btn, Field, Section, Segmented, inputCls } from '../ui';

type Fmt = FormatKey | 'carousel';
const FMTS: { value: Fmt; label: string }[] = [
  { value: 'story', label: 'Story' },
  { value: 'reel', label: 'Reel' },
  { value: 'feed45', label: 'Feed' },
  { value: 'carousel', label: 'Carrusel' },
];

export function CopyPanel() {
  const project = useCurrent();
  const setCopy = useStudio((s) => s.setCopy);
  const addLayer = useStudio((s) => s.addLayer);
  const [pillar, setPillar] = useState<PillarKey>(project.pillar ?? 'experiencia');
  const [tone, setTone] = useState<ToneKey>('sugerente');
  const [format, setFormat] = useState<Fmt>(project.format === 'feed11' ? 'feed45' : project.format);
  const [objectiveId, setObjectiveId] = useState<string>('auto');
  const [occasion, setOccasion] = useState<OccasionId>('none');
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [piece, setPiece] = useState<CopyPiece | null>(project.copy ?? null);
  const [copied, setCopied] = useState<string | null>(null);
  const [week, setWeek] = useState<ReturnType<typeof weeklyGrid> | null>(null);

  const objectives = useMemo(() => objectivesFor(pillar), [pillar]);

  const generate = (s = Math.floor(Math.random() * 1e9)) => {
    setSeed(s);
    setPiece(
      generateCopy({ pillar, tone, format, objectiveId: objectiveId === 'auto' ? undefined : objectiveId, occasion, seed: s }),
    );
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
              className={`rounded-xl p-2.5 text-left ring-1 transition ${
                pillar === p ? 'bg-neon/15 ring-neon/70' : 'bg-black/30 ring-white/10 hover:ring-white/30'
              }`}
            >
              <div className="text-xs font-semibold text-white">{PILLARS[p].name}</div>
              <div className="mt-0.5 text-[10px] leading-snug text-white/50">{PILLARS[p].desc}</div>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Brief">
        <div className="space-y-3">
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
            <Btn variant="primary" className="flex-1" onClick={() => generate()}>
              <PenLine className="h-4 w-4" /> Generar pieza
            </Btn>
            <Btn onClick={() => generate()} title="Otra variante" disabled={!piece}>
              <Dices className="h-4 w-4" />
            </Btn>
          </div>
        </div>
      </Section>

      {piece && (
        <Section
          title="Pieza generada"
          right={<span className="font-tech text-[9px] text-white/30">#{seed.toString(36)}</span>}
        >
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
              <Btn
                className="col-span-2"
                variant="outline"
                onClick={() => addLayer({ kind: 'text', text: piece.hook, accent: PILLARS[piece.pillar].accent, style: 'neon', font: 'body' })}
              >
                <Type className="h-4 w-4" /> Llevar el gancho al canvas
              </Btn>
            </div>
          </div>
        </Section>
      )}

      <Section title="Grilla semanal">
        <p className="mb-2 text-[11px] leading-snug text-white/50">7 piezas rotando pilares y formatos, en el tono elegido.</p>
        <Btn className="w-full" onClick={() => setWeek(weeklyGrid(tone))}>
          <CalendarRange className="h-4 w-4" /> Armar semana
        </Btn>
        {week && (
          <ol className="mt-3 space-y-2">
            {week.map((d) => (
              <li key={d.day} className="rounded-lg bg-white/[0.03] p-2.5 ring-1 ring-white/5">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-white/45">
                  <span className="font-semibold text-white/80">{d.day}</span>
                  <span>
                    {PILLARS[d.pillar].short} · {d.format === 'feed45' ? 'Feed' : d.format === 'carousel' ? 'Carrusel' : d.format === 'reel' ? 'Reel' : 'Story'}
                  </span>
                </div>
                <div className="mt-1 text-[12px] font-semibold text-white">{d.piece.hook}</div>
                <div className="text-[11px] text-white/55">{d.piece.objective}</div>
                <div className="mt-1.5 flex gap-1.5">
                  <button className="text-[10px] text-neon hover:underline" onClick={() => setPiece(d.piece)}>
                    Abrir
                  </button>
                  <button className="text-[10px] text-white/50 hover:underline" onClick={() => copy(d.day, captionText(d.piece))}>
                    {copied === d.day ? 'Copiado ✓' : 'Copiar caption'}
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Section>
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
