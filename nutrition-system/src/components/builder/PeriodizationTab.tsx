'use client';

import { BatteryCharging, Flame, Moon, PauseCircle } from 'lucide-react';
import { computeTelemetry, fmt0, fmt1, RANGES, signed } from '@/lib/bioenergetics';
import { CITES } from '@/lib/evidence';
import type { DayMode, Macros } from '@/lib/types';
import { usePlanStore } from '@/store/usePlanStore';
import { Cite, cx, Label, Panel, Readout, Segmented, Slider, Toggle } from '../hud/primitives';

/** Mensajes de alerta cuando un macro sale del rango de evidencia (low = por debajo). */
const ALERTS: Record<DayMode, Record<keyof Macros, (low: boolean) => string>> = {
  on: {
    p: (low) => (low ? 'PROTEÍNA BAJA: RIESGO DE PERDER MASA MAGRA' : 'PROTEÍNA ALTA: SIN BENEFICIO EXTRA, RESTA CARBOS'),
    c: (low) => (low ? 'CARBOS BAJOS PARA ALTA INTENSIDAD: GLUCÓGENO INSUFICIENTE' : 'CARBOS MUY ALTOS: REVISÁ EL BALANCE'),
    f: (low) => (low ? 'GRASAS < 0,6 g/kg: RIESGO HORMONAL' : 'GRASAS ALTAS: QUITAN ESPACIO A LOS CARBOS'),
  },
  off: {
    p: (low) => (low ? 'PROTEÍNA BAJA: RIESGO DE PERDER MASA MAGRA' : 'PROTEÍNA ALTA: SIN BENEFICIO EXTRA'),
    c: (low) => (low ? 'CARBOS MUY BAJOS: PUEDE AFECTAR SUEÑO Y RECUPERACIÓN' : 'CARBOS ALTOS PARA UN DÍA DE DESCANSO'),
    f: (low) => (low ? 'GRASAS < 0,9 g/kg: SOPORTE HORMONAL INSUFICIENTE' : 'GRASAS MUY ALTAS: REVISÁ EL BALANCE'),
  },
};

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
  const sliders: { key: keyof Macros; label: string; min: number; max: number; step: number }[] = [
    { key: 'p', label: 'Proteína', min: 1.4, max: 3.0, step: 0.05 },
    { key: 'c', label: 'Carbohidratos', min: 0.5, max: 9, step: 0.1 },
    { key: 'f', label: 'Grasas', min: 0.4, max: 1.6, step: 0.05 },
  ];
  const pct = (kcal / tdee - 1) * 100;

  return (
    <Panel
      title={isOn ? 'DÍA ON · ALTA DEMANDA GLUCOLÍTICA' : 'DÍA OFF · DESCANSO / GRASAS HORMONALES'}
      right={isOn ? <Flame className="h-4 w-4 text-fire" /> : <Moon className="h-4 w-4 text-cyan-hud" />}
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="tnum font-mono text-5xl font-bold leading-none text-ink">{fmt0(kcal)}</div>
          <div className="mt-1.5 font-mono text-[10px] tracking-[0.16em] text-mute">KCAL OBJETIVO</div>
        </div>
        <div className="text-right">
          <div className={cx('tnum font-mono text-xl font-bold', delta < -0.25 * tdee ? 'text-fire' : 'text-ink')}>
            {signed(delta)} <span className="text-[10px] font-normal text-mute">kcal</span>
          </div>
          <div className="tnum font-mono text-[10px] text-steel">
            {pct >= 0 ? '+' : ''}
            {fmt1(pct)}% vs TDEE {fmt0(tdee)}
          </div>
        </div>
      </div>
      <div className="mt-5 space-y-5">
        {sliders.map((s) => (
          <div key={s.key}>
            <Slider
              label={s.label}
              value={gkg[s.key]}
              min={s.min}
              max={s.max}
              step={s.step}
              suffix="g/kg"
              range={r[s.key]}
              alert={ALERTS[day][s.key]}
              onChange={(v) => setMacro(day, s.key, Math.round(v * 100) / 100)}
            />
            <div className="tnum mt-0.5 text-right font-mono text-[11px] text-steel">
              <span className="text-ink">{grams[s.key]} g</span> · {fmt0(grams[s.key] * (s.key === 'f' ? 9 : 4))} kcal
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
      <Panel title="02 · CÓMO FUNCIONA LA MATRIZ ON/OFF">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-line bg-carbon p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Flame className="h-4 w-4 text-fire" /> Día ON · entrenamiento
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-steel">
              Prioridad en <b className="font-semibold text-ink">carbohidratos alrededor del entrenamiento</b> para recargar glucógeno y sostener la alta intensidad.
              Grasas bajas para dejarles espacio.
            </p>
          </div>
          <div className="rounded-lg border border-line bg-carbon p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Moon className="h-4 w-4 text-cyan-hud" /> Día OFF · descanso
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-steel">
              Menos carbohidratos para el <b className="font-semibold text-ink">control glucémico</b>, más <b className="font-semibold text-ink">grasas saludables</b> para el
              soporte hormonal y la <b className="font-semibold text-ink">proteína constante</b> para seguir construyendo músculo.
            </p>
          </div>
        </div>
        <p className="mt-3 font-mono text-[10px] tracking-[0.06em] text-mute">
          Arrastrá el slider o escribí el valor en g/kg. Cian = rango óptimo · Naranja = zona de riesgo.
        </p>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <DayColumn day="on" />
        <DayColumn day="off" />
      </div>

      <Panel title="BALANCE SEMANAL · PROYECCIÓN">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Readout label="Ingesta media" value={fmt0(t.kcalWeekly)} unit="kcal/d" />
          <Readout label="TDEE medio" value={fmt0(t.tdeeWeekly)} unit="kcal/d" />
          <Readout label="Balance" value={`${t.deltaWeeklyPct >= 0 ? '+' : ''}${fmt1(t.deltaWeeklyPct)}`} unit="%" tone={t.deltaWeeklyPct < -25 ? 'fire' : 'cyan'} />
          <Readout
            label="Proyección"
            value={`${t.weeklyKgProjection >= 0 ? '+' : ''}${fmt1(t.weeklyKgProjection)}`}
            unit="kg/sem"
            tone={Math.abs(t.weeklyKgProjection) > plan.profile.weightKg * 0.01 ? 'fire' : 'cyan'}
            sub={`${fmt1((Math.abs(t.weeklyKgProjection) / plan.profile.weightKg) * 100)}% del peso corporal`}
          />
        </div>
        <div className="mt-3 flex flex-col gap-1">
          <Cite c={CITES.carbs} />
          <Cite c={CITES.morton} />
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="REFEED" tone="fire" right={<BatteryCharging className="h-4 w-4 text-fire" />}>
          <p className="mb-4 text-[13px] leading-relaxed text-steel">
            Carga estratégica de carbohidratos (48 a 72 hs) para resensibilizar leptina y rellenar glucógeno sin acumular grasa.
          </p>
          <Toggle tone="fire" checked={refeed.enabled} onChange={(enabled) => setPeriodization({ refeed: { ...refeed, enabled } })} label="Programar refeed" />
          <div className={cx('mt-4 space-y-4 transition', !refeed.enabled && 'pointer-events-none opacity-40')}>
            <div>
              <Label>Duración</Label>
              <Segmented
                value={String(refeed.hours) as '48' | '72'}
                onChange={(h) => setPeriodization({ refeed: { ...refeed, hours: h === '48' ? 48 : 72 } })}
                tone="fire"
                size="sm"
                options={[
                  { value: '48', label: '48 h' },
                  { value: '72', label: '72 h' },
                ]}
              />
            </div>
            <Slider label="Carbohidratos del refeed" value={refeed.carbsGkg} min={5} max={12} step={0.5} suffix="g/kg" onChange={(carbsGkg) => setPeriodization({ refeed: { ...refeed, carbsGkg } })} />
            {t.refeedGrams && (
              <div className="tnum font-mono text-[11px] text-ink">
                {fmt0(t.refeedKcal!)} kcal/día · P{t.refeedGrams.p} C{t.refeedGrams.c} F{t.refeedGrams.f}
              </div>
            )}
          </div>
        </Panel>

        <Panel title="DIET BREAK" tone="fire" right={<PauseCircle className="h-4 w-4 text-fire" />}>
          <p className="mb-4 text-[13px] leading-relaxed text-steel">
            Pausa en mantenimiento (7 a 14 días) para prevenir la ralentización metabólica tras un déficit prolongado (estudio MATADOR).
          </p>
          <Toggle tone="fire" checked={dietBreak.enabled} onChange={(enabled) => setPeriodization({ dietBreak: { ...dietBreak, enabled } })} label="Programar diet break" />
          <div className={cx('mt-4 space-y-3 transition', !dietBreak.enabled && 'pointer-events-none opacity-40')}>
            <Slider label="Duración" value={dietBreak.days} min={7} max={14} step={1} suffix="días" onChange={(days) => setPeriodization({ dietBreak: { ...dietBreak, days: Math.round(days) } })} />
            <div className="tnum font-mono text-[11px] text-ink">Mantenimiento ≈ {fmt0(t.tdeeWeekly)} kcal/día · proteína constante</div>
          </div>
          <div className="mt-3">
            <Cite c={CITES.matador} />
          </div>
        </Panel>
      </div>
    </div>
  );
}
