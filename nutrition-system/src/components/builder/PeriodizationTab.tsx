'use client';

import { BatteryCharging, Flame, Moon, PauseCircle } from 'lucide-react';
import { computeTelemetry, fmt0, fmt1, RANGES, signed } from '@/lib/bioenergetics';
import { CITES } from '@/lib/evidence';
import type { DayMode, Macros } from '@/lib/types';
import { usePlanStore } from '@/store/usePlanStore';
import { Cite, cx, Label, Panel, Readout, Segmented, Slider, Toggle } from '../hud/primitives';

function DayColumn({ day }: { day: DayMode }) {
  const plan = usePlanStore((s) => s.plan);
  const setMacro = usePlanStore((s) => s.setMacro);
  const t = computeTelemetry(plan);
  const gkg = plan.periodization[day];
  const grams = day === 'on' ? t.gramsOn : t.gramsOff;
  const kcal = day === 'on' ? t.kcalOn : t.kcalOff;
  const delta = day === 'on' ? t.deltaOn : t.deltaOff;
  const tdee = day === 'on' ? t.tdeeOn : t.tdeeOff;
  const r = RANGES[day];
  const isOn = day === 'on';
  const sliders: { key: keyof Macros; label: string; min: number; max: number; step: number; tone: 'cyan' | 'gold' | 'fire' }[] = [
    { key: 'p', label: 'Proteína', min: 1.4, max: 3.0, step: 0.05, tone: 'cyan' },
    { key: 'c', label: 'Carbohidratos', min: 0.5, max: 9, step: 0.1, tone: 'gold' },
    { key: 'f', label: 'Grasas', min: 0.4, max: 1.6, step: 0.05, tone: 'fire' },
  ];
  const pct = (kcal / tdee - 1) * 100;

  return (
    <Panel
      title={isOn ? 'DÍA ON · ALTA DEMANDA GLUCOLÍTICA' : 'DÍA OFF · DESCANSO / GRASAS HORMONALES'}
      tone={isOn ? 'cyan' : 'gold'}
      right={isOn ? <Flame className="h-4 w-4 text-fire" /> : <Moon className="h-4 w-4 text-gold" />}
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className={cx('font-display text-5xl font-bold leading-none', isOn ? 'text-cyan-hud' : 'text-gold')}>{fmt0(kcal)}</div>
          <div className="mt-1 font-mono text-[10px] tracking-[0.16em] text-steel">KCAL OBJETIVO</div>
        </div>
        <div className="text-right">
          <div className={cx('font-display text-xl font-bold', delta < -0.25 * tdee ? 'text-fire' : delta < 0 ? 'text-ink' : 'text-gold')}>
            {signed(delta)} <span className="font-mono text-[10px] text-steel">kcal</span>
          </div>
          <div className="font-mono text-[10px] text-steel">
            {pct >= 0 ? '+' : ''}
            {fmt1(pct)}% vs TDEE {fmt0(tdee)}
          </div>
        </div>
      </div>
      <div className="mt-5 space-y-5">
        {sliders.map((s) => (
          <div key={s.key}>
            <Slider label={s.label} value={gkg[s.key]} min={s.min} max={s.max} step={s.step} tone={s.tone} suffix="g/kg" range={r[s.key]} onChange={(v) => setMacro(day, s.key, v)} />
            <div className="mt-0.5 text-right font-mono text-[11px] text-ink">
              {grams[s.key]} g · {fmt0(grams[s.key] * (s.key === 'f' ? 9 : 4))} kcal
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function PeriodizationTab() {
  const plan = usePlanStore((s) => s.plan);
  const setPeriodization = usePlanStore((s) => s.setPeriodization);
  const t = computeTelemetry(plan);
  const { refeed, dietBreak } = plan.periodization;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <DayColumn day="on" />
        <DayColumn day="off" />
      </div>

      <Panel title="BALANCE SEMANAL · PROYECCIÓN">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Readout label="Ingesta media" value={fmt0(t.kcalWeekly)} unit="kcal/d" />
          <Readout label="TDEE medio" value={fmt0(t.tdeeWeekly)} unit="kcal/d" />
          <Readout label="Balance" value={`${t.deltaWeeklyPct >= 0 ? '+' : ''}${fmt1(t.deltaWeeklyPct)}`} unit="%" tone={t.deltaWeeklyPct < -25 ? 'fire' : t.deltaWeeklyPct < 0 ? 'cyan' : 'gold'} />
          <Readout label="Proyección" value={`${t.weeklyKgProjection >= 0 ? '+' : ''}${fmt1(t.weeklyKgProjection)}`} unit="kg/sem" tone={Math.abs(t.weeklyKgProjection) > plan.profile.weightKg * 0.01 ? 'fire' : 'ink'} sub={`${fmt1((Math.abs(t.weeklyKgProjection) / plan.profile.weightKg) * 100)}% del peso corporal`} />
        </div>
        <div className="mt-3 flex flex-col gap-1">
          <Cite c={CITES.carbs} />
          <Cite c={CITES.morton} />
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="PROGRAMAR REFEED" tone="gold" right={<BatteryCharging className="h-4 w-4 text-gold" />}>
          <Toggle checked={refeed.enabled} onChange={(enabled) => setPeriodization({ refeed: { ...refeed, enabled } })} label="Activar refeed de glucógeno / leptina" />
          <div className={cx('mt-4 space-y-4 transition', !refeed.enabled && 'pointer-events-none opacity-40')}>
            <div>
              <Label>Duración</Label>
              <Segmented
                value={String(refeed.hours) as '48' | '72'}
                onChange={(h) => setPeriodization({ refeed: { ...refeed, hours: h === '48' ? 48 : 72 } })}
                tone="gold"
                size="sm"
                options={[
                  { value: '48', label: '48 h' },
                  { value: '72', label: '72 h' },
                ]}
              />
            </div>
            <Slider label="Carbohidratos del refeed" value={refeed.carbsGkg} min={5} max={12} step={0.5} tone="gold" suffix="g/kg" onChange={(carbsGkg) => setPeriodization({ refeed: { ...refeed, carbsGkg } })} />
            {t.refeedGrams && (
              <div className="font-mono text-[11px] text-ink">
                {fmt0(t.refeedKcal!)} kcal/día · P{t.refeedGrams.p} C{t.refeedGrams.c} F{t.refeedGrams.f}
              </div>
            )}
          </div>
        </Panel>

        <Panel title="DIET BREAK" tone="gold" right={<PauseCircle className="h-4 w-4 text-gold" />}>
          <Toggle checked={dietBreak.enabled} onChange={(enabled) => setPeriodization({ dietBreak: { ...dietBreak, enabled } })} label="Activar pausa en mantenimiento" />
          <div className={cx('mt-4 space-y-3 transition', !dietBreak.enabled && 'pointer-events-none opacity-40')}>
            <Slider label="Duración" value={dietBreak.days} min={7} max={14} step={1} tone="gold" suffix="días" onChange={(days) => setPeriodization({ dietBreak: { ...dietBreak, days } })} />
            <div className="font-mono text-[11px] text-ink">Mantenimiento ≈ {fmt0(t.tdeeWeekly)} kcal/día · proteína constante</div>
          </div>
          <div className="mt-3">
            <Cite c={CITES.matador} />
          </div>
        </Panel>
      </div>
    </div>
  );
}
