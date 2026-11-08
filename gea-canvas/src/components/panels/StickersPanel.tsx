'use client';
import { useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { ACCENTS, type AccentKey } from '@/brand/tokens';
import { KINDS, PHRASES, PILLARS, kindSpec } from '@/data/library';
import { TEMPLATES } from '@/data/templates';
import type { PillarKey, StickerKind, StickerProps } from '@/lib/types';
import { FORMATS } from '@/lib/types';
import { useCurrent, usePage, useStudio } from '@/store/studio';
import { uid } from '@/lib/id';
import { StickerThumb } from '../StickerThumb';
import { Section } from '../ui';

export function StickersPanel({ ready }: { ready: boolean }) {
  const addLayer = useStudio((s) => s.addLayer);
  const updateProps = useStudio((s) => s.updateProps);
  const mutatePage = useStudio((s) => s.mutatePage);
  const select = useStudio((s) => s.select);
  const selectedId = useStudio((s) => s.selectedId);
  const project = useCurrent();
  const page = usePage();
  const selected = page.layers.find((l) => l.id === selectedId);
  const [accent, setAccent] = useState<AccentKey>('pink');
  const [kindFilter, setKindFilter] = useState<StickerKind | 'all'>('all');
  const [pillar, setPillar] = useState<PillarKey | 'all'>('all');

  const add = (kind: StickerKind, override?: Partial<StickerProps>) => {
    const spec = kindSpec(kind);
    addLayer({ kind, ...spec.defaults, accent, ...override } as StickerProps);
  };

  const phrases = PHRASES.filter(
    (p) => (kindFilter === 'all' || p.kinds.includes(kindFilter)) && (pillar === 'all' || p.pillar === pillar),
  );

  const applyPhrase = (p: (typeof PHRASES)[number]) => {
    // si hay un sticker seleccionado que admite la frase, la reemplaza; si no, crea uno nuevo
    if (selected && selected.props.kind !== 'logo') {
      updateProps(selected.id, { text: p.text, ...(p.sub ? { sub: p.sub } : {}), ...(p.meta ? { meta: p.meta } : {}) });
      return;
    }
    const kind = kindFilter !== 'all' ? kindFilter : p.kinds[0];
    add(kind, { text: p.text, ...(p.sub ? { sub: p.sub } : {}), ...(p.meta ? { meta: p.meta } : {}) });
  };

  const applyTemplate = (t: (typeof TEMPLATES)[number]) => {
    const fw = FORMATS[project.format].w;
    const H = FORMATS[project.format].h;
    const ids: string[] = [];
    mutatePage((pg) => {
      for (const it of t.items) {
        const spec = kindSpec(it.kind);
        const id = uid('ly_');
        ids.push(id);
        pg.layers.push({
          id,
          props: { kind: it.kind, ...spec.defaults, accent, ...it.props } as StickerProps,
          x: it.side === 'right' ? pg.span * fw - (it.inset ?? 0) : it.side === 'left' ? it.inset ?? 0 : it.fx * fw * pg.span,
          y: it.fy * H,
          scale: it.scale ?? spec.scale ?? 1,
          rotation: it.rotation ?? spec.rotation ?? 0,
          opacity: 1,
        });
      }
    });
    select(ids[ids.length - 1] ?? null);
  };

  return (
    <div>
      <Section title="Acento neón">
        <div className="flex gap-2">
          {(Object.keys(ACCENTS) as AccentKey[]).map((k) => (
            <button
              key={k}
              title={ACCENTS[k].name}
              onClick={() => {
                setAccent(k);
                if (selected) updateProps(selected.id, { accent: k });
              }}
              className={`h-8 w-8 rounded-full ring-2 transition ${accent === k ? 'ring-white' : 'ring-white/10 hover:ring-white/40'}`}
              style={{ background: ACCENTS[k].hex, boxShadow: `0 0 14px ${ACCENTS[k].glow}` }}
            />
          ))}
        </div>
      </Section>

      <Section title="Formatos de overlay">
        <div className="grid grid-cols-3 gap-2">
          {KINDS.map((k) => (
            <button
              key={k.kind}
              onClick={() => add(k.kind)}
              title={k.hint}
              className="group relative flex flex-col items-center rounded-xl bg-black/30 p-1.5 ring-1 ring-white/10 transition hover:bg-white/[0.06] hover:ring-neon/50"
            >
              <StickerThumb props={{ kind: k.kind, ...k.defaults, accent } as StickerProps} size={84} ready={ready} />
              <span className="mt-1 text-[10px] font-semibold leading-tight text-white/75">{k.name}</span>
              <Plus className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-white/0 transition group-hover:text-neon" />
            </button>
          ))}
        </div>
      </Section>

      <Section title="Composiciones rápidas">
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATES.filter((t) => t.formats.includes(project.format)).map((t) => (
            <button
              key={t.id}
              onClick={() => applyTemplate(t)}
              className="rounded-xl bg-black/30 p-3 text-left ring-1 ring-white/10 transition hover:ring-neon/50"
            >
              <Sparkles className="mb-1 h-3.5 w-3.5 text-neon" />
              <div className="text-xs font-semibold text-white">{t.name}</div>
              <div className="mt-0.5 text-[10px] leading-snug text-white/50">{t.desc}</div>
            </button>
          ))}
        </div>
      </Section>

      <Section
        title="Biblioteca de frases"
        right={<span className="text-[10px] text-white/40">{selected ? 'Reemplaza el texto del sticker' : 'Crea un sticker'}</span>}
      >
        <div className="mb-2 flex flex-wrap gap-1">
          <Chip on={kindFilter === 'all'} onClick={() => setKindFilter('all')}>
            Todas
          </Chip>
          {KINDS.filter((k) => k.kind !== 'logo').map((k) => (
            <Chip key={k.kind} on={kindFilter === k.kind} onClick={() => setKindFilter(k.kind)}>
              {k.name}
            </Chip>
          ))}
        </div>
        <div className="mb-3 flex flex-wrap gap-1">
          <Chip on={pillar === 'all'} onClick={() => setPillar('all')}>
            Todos los pilares
          </Chip>
          {(Object.keys(PILLARS) as PillarKey[]).map((p) => (
            <Chip key={p} on={pillar === p} onClick={() => setPillar(p)}>
              {PILLARS[p].short}
            </Chip>
          ))}
        </div>
        <ul className="space-y-1.5">
          {phrases.map((p) => (
            <li key={p.text}>
              <button
                onClick={() => applyPhrase(p)}
                className="w-full rounded-lg bg-white/[0.03] px-3 py-2 text-left text-[13px] leading-snug text-white/85 ring-1 ring-white/5 transition hover:bg-neon/10 hover:ring-neon/40"
              >
                “{p.text}”
                <span className="mt-0.5 block text-[10px] uppercase tracking-wider text-white/35">
                  {p.kinds.map((k) => kindSpec(k).name).join(' · ')} — {PILLARS[p.pillar].short}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${
        on ? 'bg-white text-ink' : 'bg-white/[0.05] text-white/60 hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}
