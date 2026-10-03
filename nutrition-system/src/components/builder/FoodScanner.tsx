'use client';

import { useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, ScanLine, Syringe, X } from 'lucide-react';
import { fmt0, fmt1 } from '@/lib/bioenergetics';
import { imageToBase64, scanMeal, tacticalScore, type ScanResult } from '@/lib/scanner';
import { usePlanStore } from '@/store/usePlanStore';
import { Badge, cx, HudButton, Panel } from '../hud/primitives';

/** Semi-arco de puntuación 0-100 (cian ≥70, naranja 40-69, rojo <40). */
function ScoreArc({ score, label }: { score: number; label: string }) {
  const r = 42;
  const len = Math.PI * r;
  const color = score >= 70 ? '#38BDF8' : score >= 40 ? '#F97316' : '#EF4444';
  return (
    <div className="relative h-[70px] w-[110px]">
      <svg viewBox="0 0 110 62" className="h-full w-full">
        <path d="M13 55 A42 42 0 0 1 97 55" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="7" strokeLinecap="round" />
        <path d="M13 55 A42 42 0 0 1 97 55" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - score / 100)} />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <div className="tnum font-mono text-2xl font-bold leading-none text-ink">{score}</div>
        <div className="font-mono text-[8.5px] tracking-[0.14em] text-mute">{label}</div>
      </div>
    </div>
  );
}

export function FoodScanner() {
  const ai = usePlanStore((s) => s.ai);
  const meals = usePlanStore((s) => s.plan.meals);
  const injectItems = usePlanStore((s) => s.injectItems);
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [target, setTarget] = useState('new-on');
  const [injected, setInjected] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setResult(null);
    setInjected(null);
    setBusy(true);
    try {
      const img = await imageToBase64(file);
      setPreview(img.preview);
      setNotice(null);
      setResult(await scanMeal(ai, img.data, img.mediaType, (n) => setNotice(n.message)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const removeItem = (id: string) =>
    setResult((r) => {
      if (!r) return r;
      const items = r.items.filter((i) => i.id !== id);
      const sum = items.reduce((a, i) => ({ p: a.p + i.p, c: a.c + i.c, f: a.f + i.f, leucine: a.leucine + i.leucine }), { p: 0, c: 0, f: 0, leucine: 0 });
      return { ...r, items, totals: { ...sum, kcal: sum.p * 4 + sum.c * 4 + sum.f * 9 }, localScore: tacticalScore(items) };
    });

  function inject() {
    if (!result?.items.length) return;
    const time = new Date().toTimeString().slice(0, 5);
    if (target === 'new-on' || target === 'new-off') {
      injectItems({ newMeal: { name: result.dishName, day: target === 'new-on' ? 'on' : 'off', time } }, result.items);
      setInjected(`Nueva comida «${result.dishName}» creada en el día ${target === 'new-on' ? 'ON' : 'OFF'}.`);
    } else {
      const m = meals.find((x) => x.id === target);
      injectItems({ mealId: target }, result.items);
      setInjected(`${result.items.length} alimentos agregados a «${m?.name ?? 'comida'}».`);
    }
  }

  const score = result ? (result.aiScore ?? result.localScore) : 0;

  return (
    <Panel title="ESCANEAR PLATO CON IA / SUBIR FOTO" right={<ScanLine className="h-4 w-4 text-cyan-hud" />}>
      <p className="mb-3 text-[13px] leading-relaxed text-steel">
        Sacale una foto al plato o subila desde la galería. El modelo multimodal configurado ({ai.provider === 'claude' ? 'Claude Vision' : ai.provider === 'gemini' ? 'Gemini' : 'OpenAI'} ·{' '}
        <span className="font-mono text-[11px]">{ai.model}</span>) lo desglosa por ingrediente con la canasta argentina.
      </p>
      <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      <input ref={gallery} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      <div className="flex flex-wrap gap-2">
        <HudButton onClick={() => camera.current?.click()} disabled={busy}>
          <Camera className="h-4 w-4" /> [ Escanear plato ]
        </HudButton>
        <HudButton tone="cyan" onClick={() => gallery.current?.click()} disabled={busy}>
          <ImagePlus className="h-4 w-4" /> [ Subir foto ]
        </HudButton>
      </div>

      {(preview || busy) && (
        <div className="mt-4 grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
          <div className={cx('relative aspect-square overflow-hidden rounded-lg border border-line bg-carbon', busy && 'scanline')}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {preview && <img src={preview} alt="Plato a analizar" className="h-full w-full object-cover" />}
            {busy && (
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-carbon/80 py-1.5 font-mono text-[10px] tracking-[0.14em] text-cyan-hud">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> ANALIZANDO
              </div>
            )}
          </div>

          {result && (
            <div className="min-w-0 rounded-lg border border-line bg-carbon p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono text-[9.5px] tracking-[0.18em] text-cyan-hud">[ DESGLOSE DEL PLATO ]</div>
                  <div className="mt-0.5 truncate text-base font-semibold text-ink">{result.dishName}</div>
                  <p className="mt-1 text-xs text-steel">{result.scoreReason}</p>
                </div>
                <ScoreArc score={score} label={result.aiScore !== null ? 'SCORE TÁCTICO IA' : 'SCORE MOTOR'} />
              </div>
              <div className="mt-1 text-right font-mono text-[9.5px] text-mute">verificación motor local: {result.localScore}/100</div>

              <ul className="mt-2 divide-y divide-line">
                {result.items.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 py-1.5 text-sm">
                    <span className="tnum w-14 font-mono text-ink">{fmt0(i.grams)} g</span>
                    <span className="min-w-0 flex-1 truncate text-ink">{i.food}</span>
                    {!i.foodId && <Badge tone="steel">IA</Badge>}
                    <span className="tnum hidden font-mono text-[10.5px] text-steel sm:inline">
                      P{fmt1(i.p)} C{fmt1(i.c)} F{fmt1(i.f)}
                    </span>
                    <button onClick={() => removeItem(i.id)} className="p-1 text-mute hover:text-fire" aria-label={`Quitar ${i.food}`}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="tnum mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-2 font-mono text-[11px]">
                <span className="text-ink">{fmt0(result.totals.kcal)} kcal</span>
                <span className="text-steel">P {fmt0(result.totals.p)} g</span>
                <span className="text-steel">C {fmt0(result.totals.c)} g</span>
                <span className="text-steel">F {fmt0(result.totals.f)} g</span>
                <span className={result.totals.leucine >= 2.7 ? 'text-cyan-hud' : 'text-fire'}>LEU {fmt1(result.totals.leucine)} g</span>
              </div>
              {result.tips.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-steel">
                  {result.tips.map((t) => (
                    <li key={t}>▸ {t}</li>
                  ))}
                </ul>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-line bg-panel px-2.5 py-2 text-xs text-ink outline-none focus:border-cyan-hud/60"
                >
                  <option value="new-on">+ Nueva comida · Día ON</option>
                  <option value="new-off">+ Nueva comida · Día OFF</option>
                  {meals.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.time} · {m.name} ({m.day === 'both' ? 'ON + OFF' : m.day.toUpperCase()})
                    </option>
                  ))}
                </select>
                <HudButton onClick={inject} disabled={!result.items.length}>
                  <Syringe className="h-4 w-4" /> [ Inyectar en el plan ]
                </HudButton>
              </div>
              {injected && <div className="mt-2 font-mono text-[10.5px] text-cyan-hud">✓ {injected}</div>}
            </div>
          )}
        </div>
      )}
      {notice && busy && <div className="mt-3 animate-pulse rounded-lg border border-cyan-hud/30 bg-cyan-hud/10 p-3 font-mono text-[11px] text-cyan-hud">{notice}</div>}
      {error && <div className="mt-3 rounded-lg border border-danger/40 bg-danger/10 p-3 font-mono text-[11px] text-danger">⚠ {error}</div>}
    </Panel>
  );
}
