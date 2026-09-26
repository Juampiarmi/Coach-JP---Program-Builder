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
import { cx, Shield } from '@/components/hud/primitives';
import { computeTelemetry, fmt0, isMpsMeal, LEUCINE_THRESHOLD, mealTotals, PHASE_LABEL } from '@/lib/bioenergetics';
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

function StatusBar() {
  const plan = usePlanStore((s) => s.plan);
  const t = computeTelemetry(plan);
  const mps = plan.meals.filter(isMpsMeal);
  const low = mps.filter((m) => mealTotals(m).leucine < LEUCINE_THRESHOLD).length;
  const items: [string, string, string][] = [
    ['ATLETA', plan.profile.name.toUpperCase(), 'text-ink'],
    ['FASE', PHASE_LABEL[plan.profile.phase].toUpperCase(), 'text-gold'],
    ['ON', `${fmt0(t.kcalOn)} KCAL`, 'text-cyan-hud'],
    ['OFF', `${fmt0(t.kcalOff)} KCAL`, 'text-gold'],
    ['EA ON', t.eaOn.toFixed(1).replace('.', ','), t.eaOn < 30 ? 'text-fire' : 'text-ink'],
    ['LEUCINA', low ? `${low} SUB-UMBRAL` : 'MPS OK', low ? 'text-fire' : 'text-cyan-hud'],
  ];
  return (
    <div className="scroll-thin flex gap-5 overflow-x-auto border-t border-line bg-panel2/80 px-4 py-2 sm:px-6">
      {items.map(([k, v, c]) => (
        <div key={k} className="flex flex-none items-baseline gap-2 font-mono text-[10px] tracking-[0.14em]">
          <span className="text-steel">{k}</span>
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
          <Shield size={56} />
          <span className="font-mono text-[11px] tracking-[0.3em] text-cyan-hud">[ INICIALIZANDO SISTEMA ]</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-carbon/85 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
          <Shield size={34} />
          <div className="min-w-0">
            <div className="font-display text-lg font-bold leading-none tracking-wide">
              COACH <span className="text-gold">JP</span> <span className="hidden text-steel sm:inline">· HIGH PERFORMANCE SYSTEM</span>
            </div>
            <div className="mt-1 font-mono text-[10px] tracking-[0.14em] text-steel">@coachjp.training · TACTICAL COMMAND BUILDER</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-md border border-cyan-hud/30 bg-cyan-hud/5 px-2.5 py-1.5 font-mono text-[10px] tracking-[0.14em] text-cyan-hud md:flex">
              <Crosshair className="h-3.5 w-3.5" /> SISTEMA OPERATIVO
            </span>
            <button
              onClick={() => confirm('¿Restaurar el atleta de demostración? Se reemplaza el plan actual.') && resetDemo()}
              className="flex items-center gap-1.5 rounded-md border border-line2 px-2.5 py-1.5 font-mono text-[10px] tracking-[0.12em] text-steel hover:border-fire/60 hover:text-fire"
            >
              <RotateCcw className="h-3.5 w-3.5" /> DEMO
            </button>
          </div>
        </div>
        <StatusBar />
      </header>

      <main className="grid gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_460px]">
        <section className="min-w-0">
          <div className="mb-3 font-mono text-[10px] tracking-[0.24em] text-steel">PANEL IZQUIERDO · TACTICAL COMMAND BUILDER</div>
          <nav className="scroll-thin mb-4 flex gap-1 overflow-x-auto rounded-xl border border-line bg-panel p-1">
            {BUILDER_TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setBuilderTab(id)}
                className={cx(
                  'flex flex-none items-center gap-2 rounded-lg px-3.5 py-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] transition',
                  builderTab === id ? (id === 'intake' ? 'bg-fire text-carbon shadow-fire' : 'bg-cyan-hud text-carbon shadow-[0_0_20px_-6px_rgba(0,229,255,.9)]') : 'text-steel hover:bg-panel2 hover:text-ink',
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
          <div className="mb-3 font-mono text-[10px] tracking-[0.24em] text-steel">PANEL DERECHO · SIMULADOR & MOTOR DE DEPLOY</div>
          <nav className="mb-4 grid grid-cols-3 gap-1 rounded-xl border border-line bg-panel p-1">
            {DEPLOY_TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setDeployTab(id)}
                className={cx(
                  'flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] transition',
                  deployTab === id ? 'bg-gold text-carbon shadow-gold' : 'text-steel hover:bg-panel2 hover:text-ink',
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

      <footer className="border-t border-line px-6 py-5 font-mono text-[10px] tracking-[0.12em] text-steel">
        COACH JP · HIGH PERFORMANCE SYSTEM · BIOENERGÉTICA APLICADA · [ ISSN · MORTON ET AL., 2018 · BR J SPORTS MED ]
      </footer>
    </div>
  );
}
