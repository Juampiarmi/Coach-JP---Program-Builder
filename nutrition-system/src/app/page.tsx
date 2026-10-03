'use client';

import { useEffect, useState } from 'react';
import { Brain, Crosshair, Dna, Download, Image as ImageIcon, RotateCcw, Smartphone, SlidersHorizontal, Utensils } from 'lucide-react';
import { IntakeTab } from '@/components/builder/IntakeTab';
import { MealsTab } from '@/components/builder/MealsTab';
import { PeriodizationTab } from '@/components/builder/PeriodizationTab';
import { ProfileTab } from '@/components/builder/ProfileTab';
import { ExportTab } from '@/components/deploy/ExportTab';
import { PhonePreview } from '@/components/deploy/PhonePreview';
import { StoryTab } from '@/components/deploy/StoryTab';
import { cx, NutritionMark } from '@/components/hud/primitives';
import { InstallButton } from '@/components/pwa/InstallButton';
import { AthleteSwitcher } from '@/components/builder/AthleteSwitcher';
import { computeTelemetry, eaStatus, fmt0, fmt1, isMpsMeal, LEUCINE_THRESHOLD, mealTotals, PHASE_LABEL } from '@/lib/bioenergetics';
import { usePlanStore, type BuilderTab, type DeployTab } from '@/store/usePlanStore';

const BUILDER_TABS: { id: BuilderTab; label: string; icon: typeof Brain }[] = [
  { id: 'intake', label: 'IA Prompt Engine', icon: Brain },
  { id: 'profile', label: '01 · Perfil biológico', icon: Dna },
  { id: 'periodization', label: '02 · Matriz ON/OFF', icon: SlidersHorizontal },
  { id: 'meals', label: '03 · Ingestas & leucina', icon: Utensils },
];

const DEPLOY_TABS: { id: DeployTab; label: string; icon: typeof Brain }[] = [
  { id: 'preview', label: 'Simulador', icon: Smartphone },
  { id: 'export', label: 'PWA Deploy', icon: Download },
  { id: 'story', label: 'Story 9:16', icon: ImageIcon },
];

const EA_TEXT = { optimal: 'text-cyan-hud', reduced: 'text-fire', low: 'text-danger' } as const;

function StatusBar() {
  const plan = usePlanStore((s) => s.plan);
  const t = computeTelemetry(plan);
  const mps = plan.meals.filter(isMpsMeal);
  const low = mps.filter((m) => mealTotals(m).leucine < LEUCINE_THRESHOLD).length;
  const items: [string, string, string][] = [
    ['ATLETA', plan.profile.name.toUpperCase(), 'text-ink'],
    ['FASE', PHASE_LABEL[plan.profile.phase].toUpperCase(), 'text-fire'],
    ['ON', `${fmt0(t.kcalOn)} KCAL`, 'text-ink'],
    ['OFF', `${fmt0(t.kcalOff)} KCAL`, 'text-ink'],
    ['EA ON', fmt1(t.eaOn), EA_TEXT[eaStatus(t.eaOn)]],
    ['EA OFF', fmt1(t.eaOff), EA_TEXT[eaStatus(t.eaOff)]],
    ['LEUCINA', low ? `${low} SUB-UMBRAL` : 'mTOR OK', low ? 'text-fire' : 'text-cyan-hud'],
  ];
  return (
    <div className="scroll-thin flex gap-5 overflow-x-auto border-t border-line bg-panel2 px-4 py-2 sm:px-6">
      {items.map(([k, v, c]) => (
        <div key={k} className="flex flex-none items-baseline gap-2 font-mono text-[10px] tracking-[0.14em]">
          <span className="text-mute">{k}</span>
          <span className={cx('font-bold', c)}>{v}</span>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [hydrated, setHydrated] = useState(false);
  const builderTab = usePlanStore((s) => s.builderTab);
  const setBuilderTab = usePlanStore((s) => s.setBuilderTab);
  const deployTab = usePlanStore((s) => s.deployTab);
  const setDeployTab = usePlanStore((s) => s.setDeployTab);
  const resetDemo = usePlanStore((s) => s.resetDemo);

  useEffect(() => setHydrated(true), []);

  if (!hydrated) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="flex flex-col items-center gap-4">
          <NutritionMark size={56} />
          <span className="font-mono text-[11px] tracking-[0.3em] text-cyan-hud">[ INICIALIZANDO SISTEMA ]</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-carbon/90 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
          <NutritionMark size={36} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[17px] font-bold leading-none tracking-[0.04em] text-ink">COACH JP</span>
              <span className="rounded border border-cyan-hud/20 bg-cyan-hud/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-cyan-hud">
                [ Bioenergetics &amp; Nutrition ]
              </span>
            </div>
            <div className="mt-1.5 font-mono text-[10px] tracking-[0.14em] text-mute">@coachjp.training · COMMAND BUILDER</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-md border border-cyan-hud/20 bg-cyan-hud/10 px-2.5 py-1.5 font-mono text-[10px] tracking-[0.14em] text-cyan-hud xl:flex">
              <Crosshair className="h-3.5 w-3.5" /> SISTEMA OPERATIVO
            </span>
            <AthleteSwitcher />
            <InstallButton />
            <button
              onClick={() => confirm('¿Restaurar el atleta de demostración? Se reemplaza el plan actual.') && resetDemo()}
              className="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 font-mono text-[10px] tracking-[0.12em] text-mute hover:border-white/20 hover:text-ink"
            >
              <RotateCcw className="h-3.5 w-3.5" /> DEMO
            </button>
          </div>
        </div>
        <StatusBar />
      </header>

      <main className="grid gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_460px]">
        <section className="min-w-0">
          <div className="mb-3 font-mono text-[10px] tracking-[0.24em] text-mute">PANEL IZQUIERDO · TACTICAL COMMAND BUILDER</div>
          <nav className="scroll-thin mb-4 flex gap-1 overflow-x-auto rounded-xl border border-line bg-panel p-1">
            {BUILDER_TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setBuilderTab(id)}
                className={cx(
                  'flex flex-none items-center gap-2 rounded-lg px-3.5 py-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] transition',
                  builderTab === id
                    ? 'bg-cyan-hud/[0.08] text-ink ring-1 ring-inset ring-cyan-hud/60'
                    : 'text-mute hover:bg-white/[0.03] hover:text-steel',
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </nav>
          {builderTab === 'intake' && <IntakeTab />}
          {builderTab === 'profile' && <ProfileTab />}
          {builderTab === 'periodization' && <PeriodizationTab />}
          {builderTab === 'meals' && <MealsTab />}
        </section>

        <aside className="min-w-0 lg:sticky lg:top-[112px] lg:max-h-[calc(100vh-128px)] lg:self-start lg:overflow-y-auto scroll-thin">
          <div className="mb-3 font-mono text-[10px] tracking-[0.24em] text-mute">PANEL DERECHO · SIMULADOR & MOTOR DE DEPLOY</div>
          <nav className="mb-4 grid grid-cols-3 gap-1 rounded-xl border border-line bg-panel p-1">
            {DEPLOY_TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setDeployTab(id)}
                className={cx(
                  'flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] transition',
                  deployTab === id ? 'bg-fire/[0.08] text-fire ring-1 ring-inset ring-fire/60' : 'text-mute hover:bg-white/[0.03] hover:text-steel',
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </nav>
          <div className={cx(deployTab !== 'preview' && 'hidden')}>
            <PhonePreview />
          </div>
          {deployTab === 'export' && <ExportTab />}
          {deployTab === 'story' && <StoryTab />}
        </aside>
      </main>

      <footer className="border-t border-line px-6 py-5 font-mono text-[10px] tracking-[0.12em] text-mute">
        COACH JP NUTRITION · HIGH PERFORMANCE SYSTEM · BIOENERGÉTICA APLICADA · [ ISSN · MORTON ET AL., 2018 · BR J SPORTS MED ]
      </footer>
    </div>
  );
}
