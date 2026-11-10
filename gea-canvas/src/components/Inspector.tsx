'use client';
import {
  ArrowDownToLine,
  ArrowUpToLine,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Eye,
  EyeOff,
  Lock,
  Trash2,
  Unlock,
} from 'lucide-react';
import { ACCENTS, type AccentKey } from '@/brand/tokens';
import { kindSpec } from '@/data/library';
import { download, exportSticker, slug } from '@/lib/canvas/export';
import { layerBox, safeZones } from '@/lib/canvas/render';
import { findConflicts, fitIntoSafe } from '@/lib/canvas/safe';
import { FORMATS, type Layer, type StickerStyle, type TextFont } from '@/lib/types';
import { useCurrent, usePage, useStudio } from '@/store/studio';
import { Btn, Field, Section, Segmented, Slider, inputCls } from './ui';
import { ItemsEditor } from './ItemsEditor';

const STYLE_LABEL: Record<StickerStyle, string> = { neon: 'Neón', glass: 'Vidrio', paper: 'Papel', solid: 'Sólido' };

export function Inspector() {
  const project = useCurrent();
  const page = usePage();
  const selectedId = useStudio((s) => s.selectedId);
  const select = useStudio((s) => s.select);
  const updateLayer = useStudio((s) => s.updateLayer);
  const updateProps = useStudio((s) => s.updateProps);
  const removeLayer = useStudio((s) => s.removeLayer);
  const duplicateLayer = useStudio((s) => s.duplicateLayer);
  const moveLayer = useStudio((s) => s.moveLayer);
  const checkpoint = useStudio((s) => s.checkpoint);
  const l = page.layers.find((x) => x.id === selectedId);
  const conflict = l ? findConflicts(page, project.format).get(l.id) : undefined;

  const anchor = (ax: -1 | 0 | 1, ay: -1 | 0 | 1) => {
    if (!l) return;
    const fw = FORMATS[project.format].w;
    const H = FORMATS[project.format].h;
    const { w, h } = layerBox(l);
    const a = (l.rotation * Math.PI) / 180;
    const bw = Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a));
    const bh = Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a));
    const zones = safeZones(project.format);
    const top = Math.max(0, ...zones.filter((z) => z.y === 0 && z.w === fw).map((z) => z.h));
    const bottom = Math.max(0, ...zones.filter((z) => z.y + z.h === H && z.w === fw).map((z) => z.h));
    const m = 56;
    const slide = Math.max(0, Math.min(page.span - 1, Math.floor(l.x / fw)));
    const x0 = slide * fw;
    const x = ax === -1 ? x0 + m + bw / 2 : ax === 1 ? x0 + fw - m - bw / 2 : x0 + fw / 2;
    const y = ay === -1 ? top + m * 0.6 + bh / 2 : ay === 1 ? H - bottom - m * 0.6 - bh / 2 : H / 2;
    updateLayer(l.id, { x, y });
  };

  return (
    <div>
      {l && conflict && (
        <div className="m-4 mb-0 rounded-xl bg-red-500/10 p-3 text-[12px] leading-snug text-red-100 ring-1 ring-red-400/40">
          <b>Queda tapado por Instagram:</b> {conflict.join(', ')}.
          <button
            onClick={() => updateLayer(l.id, fitIntoSafe(l, project.format, page.span))}
            className="mt-2 block w-full rounded-lg bg-red-500/25 py-1.5 font-semibold text-white hover:bg-red-500/40"
          >
            Mover a la zona segura
          </button>
        </div>
      )}
      {l ? (
        <LayerEditor
          l={l}
          onAnchor={anchor}
          onProps={(p) => updateProps(l.id, p)}
          onLayer={(p, h) => updateLayer(l.id, p, { history: h })}
          checkpoint={checkpoint}
          actions={{
            dup: () => duplicateLayer(l.id),
            del: () => removeLayer(l.id),
            up: () => moveLayer(l.id, 1),
            down: () => moveLayer(l.id, -1),
            top: () => moveLayer(l.id, 'top'),
            bottom: () => moveLayer(l.id, 'bottom'),
          }}
        />
      ) : (
        <Section title="Inspector">
          <p className="text-[12px] leading-relaxed text-white/50">
            Tocá un sticker en la pizarra para editarlo. Arrastrá para mover, usá las esquinas para escalar y el punto rosa para rotar. En el celular, pellizcá con dos dedos.
          </p>
          <ul className="mt-3 space-y-1 text-[11px] text-white/40">
            <li>
              <kbd className="font-tech text-white/70">Supr</kbd> borrar · <kbd className="font-tech text-white/70">Ctrl D</kbd> duplicar
            </li>
            <li>
              <kbd className="font-tech text-white/70">Flechas</kbd> mover (Shift ×10) · <kbd className="font-tech text-white/70">Ctrl Z</kbd> deshacer
            </li>
          </ul>
        </Section>
      )}

      <Section title={`Capas (${page.layers.length})`}>
        {page.layers.length === 0 && <p className="text-[11px] text-white/40">Todavía no hay stickers en esta página.</p>}
        <ol className="space-y-1">
          {[...page.layers].reverse().map((x) => (
            <li key={x.id}>
              <div
                onClick={() => select(x.id)}
                className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] ring-1 ${
                  x.id === selectedId ? 'bg-neon/10 ring-neon/50' : 'ring-white/5 hover:bg-white/5'
                }`}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: ACCENTS[x.props.accent].hex }} />
                <span className="w-20 shrink-0 text-[10px] uppercase tracking-wider text-white/45">{kindSpec(x.props.kind).name}</span>
                <span className={`truncate ${x.hidden ? 'text-white/30 line-through' : 'text-white/80'}`}>{x.props.text || x.props.sub || 'GEA'}</span>
                <span className="ml-auto flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button title={x.hidden ? 'Mostrar' : 'Ocultar'} onClick={() => updateLayer(x.id, { hidden: !x.hidden })} className="text-white/40 hover:text-white">
                    {x.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button title={x.locked ? 'Desbloquear' : 'Bloquear'} onClick={() => updateLayer(x.id, { locked: !x.locked })} className="text-white/40 hover:text-white">
                    {x.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                  </button>
                </span>
              </div>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}

function LayerEditor({
  l,
  onProps,
  onLayer,
  onAnchor,
  checkpoint,
  actions,
}: {
  l: Layer;
  onProps: (p: Partial<Layer['props']>) => void;
  onLayer: (p: Partial<Layer>, history?: boolean) => void;
  onAnchor: (ax: -1 | 0 | 1, ay: -1 | 0 | 1) => void;
  checkpoint: () => void;
  actions: Record<'dup' | 'del' | 'up' | 'down' | 'top' | 'bottom', () => void>;
}) {
  const spec = kindSpec(l.props.kind);
  const p = l.props;
  return (
    <>
      <Section
        title={spec.name}
        right={
          <div className="flex gap-1">
            <Btn className="!px-2 !py-1" title="Duplicar" onClick={actions.dup}>
              <Copy className="h-3.5 w-3.5" />
            </Btn>
            <Btn className="!px-2 !py-1" variant="danger" title="Eliminar" onClick={actions.del}>
              <Trash2 className="h-3.5 w-3.5" />
            </Btn>
          </div>
        }
      >
        <div className="space-y-3">
          {p.kind !== 'logo' && (
            <Field label="Frase">
              <textarea rows={3} className={`${inputCls} resize-y`} value={p.text} onChange={(e) => onProps({ text: e.target.value })} />
            </Field>
          )}
          {spec.fields.sub !== undefined && (
            <Field label={spec.fields.sub}>
              <input className={inputCls} value={p.sub ?? ''} onChange={(e) => onProps({ sub: e.target.value })} />
            </Field>
          )}
          {spec.fields.meta !== undefined && (
            <Field label={spec.fields.meta}>
              <input className={inputCls} value={p.meta ?? ''} onChange={(e) => onProps({ meta: e.target.value })} />
            </Field>
          )}
          {spec.fields.items && <ItemsEditor l={l} onProps={onProps} />}
          <Field label="Estilo">
            <Segmented value={p.style} onChange={(style) => onProps({ style })} options={spec.styles.map((s) => ({ value: s, label: STYLE_LABEL[s] }))} />
          </Field>
          {p.kind === 'text' && (
            <Field label="Tipografía">
              <Segmented
                value={p.font ?? 'body'}
                onChange={(font: TextFont) => onProps({ font })}
                options={[
                  { value: 'body', label: 'Manrope' },
                  { value: 'display', label: 'Syncopate' },
                  { value: 'tech', label: 'Michroma' },
                ]}
              />
            </Field>
          )}
          {p.kind === 'tab' && (
            <Field label="Borde">
              <Segmented
                value={p.side ?? 'right'}
                onChange={(side) => onProps({ side })}
                options={[
                  { value: 'left', label: 'Izquierdo' },
                  { value: 'right', label: 'Derecho' },
                ]}
              />
            </Field>
          )}
          <Field label="Acento">
            <div className="flex gap-2">
              {(Object.keys(ACCENTS) as AccentKey[]).map((k) => (
                <button
                  key={k}
                  title={ACCENTS[k].name}
                  onClick={() => onProps({ accent: k })}
                  className={`h-7 w-7 rounded-full ring-2 ${p.accent === k ? 'ring-white' : 'ring-white/10'}`}
                  style={{ background: ACCENTS[k].hex }}
                />
              ))}
            </div>
          </Field>
        </div>
      </Section>

      <Section title="Transformación">
        <div className="space-y-3">
          <Slider label="Escala" value={l.scale} min={0.15} max={3} onStart={checkpoint} onChange={(scale) => onLayer({ scale }, false)} format={(v) => `${Math.round(v * 100)}%`} />
          <Slider label="Rotación" value={l.rotation} min={-180} max={180} step={0.5} onStart={checkpoint} onChange={(rotation) => onLayer({ rotation }, false)} format={(v) => `${v.toFixed(1)}°`} />
          <Slider label="Opacidad" value={l.opacity} min={0.1} max={1} onStart={checkpoint} onChange={(opacity) => onLayer({ opacity }, false)} format={(v) => `${Math.round(v * 100)}%`} />
          <div className="flex items-start gap-3">
            <div>
              <div className="mb-1 text-[11px] text-white/60">Anclar (zona segura)</div>
              <div className="grid grid-cols-3 gap-1">
                {([-1, 0, 1] as const).flatMap((ay) =>
                  ([-1, 0, 1] as const).map((ax) => (
                    <button
                      key={`${ax}${ay}`}
                      onClick={() => onAnchor(ax, ay)}
                      className="grid h-7 w-7 place-items-center rounded-md bg-white/[0.05] ring-1 ring-white/10 hover:bg-neon/20 hover:ring-neon/50"
                      title="Anclar"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
                    </button>
                  )),
                )}
              </div>
            </div>
            <div className="flex-1">
              <div className="mb-1 text-[11px] text-white/60">Orden</div>
              <div className="grid grid-cols-2 gap-1">
                <Btn className="!px-2 !py-1.5" onClick={actions.top} title="Al frente">
                  <ArrowUpToLine className="h-3.5 w-3.5" />
                </Btn>
                <Btn className="!px-2 !py-1.5" onClick={actions.up} title="Subir">
                  <ChevronUp className="h-3.5 w-3.5" />
                </Btn>
                <Btn className="!px-2 !py-1.5" onClick={actions.bottom} title="Al fondo">
                  <ArrowDownToLine className="h-3.5 w-3.5" />
                </Btn>
                <Btn className="!px-2 !py-1.5" onClick={actions.down} title="Bajar">
                  <ChevronDown className="h-3.5 w-3.5" />
                </Btn>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Btn onClick={() => onLayer({ rotation: 0 })}>Enderezar</Btn>
            <Btn onClick={() => onLayer({ scale: 1 })}>Escala 100%</Btn>
          </div>
        </div>
      </Section>

      <Section title="Sticker recortado">
        <Btn
          variant="outline"
          className="w-full"
          onClick={async () => download(await exportSticker(l), `gea-${l.props.kind}-${slug(l.props.text || l.props.sub || 'logo')}.png`)}
        >
          <Download className="h-4 w-4" /> Descargar PNG transparente
        </Btn>
        <p className="mt-2 text-[10px] leading-snug text-white/40">Alta resolución (3×) con canal alfa, listo para usar como sticker en Stories o en otra app.</p>
      </Section>
    </>
  );
}
