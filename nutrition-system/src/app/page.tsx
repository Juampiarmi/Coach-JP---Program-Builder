'use client';

import { useEffect, useState } from 'react';
import { Brain, Users, Library, Crosshair, Database, Dna, Globe2, Download, Image as ImageIcon, RotateCcw, Smartphone, Utensils } from 'lucide-react';
import { AthleteSheet } from '@/components/builder/AthleteSheet';
import { QuickAssignButton } from '@/components/builder/QuickAssign';
import { FoodBrandDatabase } from '@/components/builder/FoodBrandDatabase';
import { NutrirCeLogo } from '@/components/hud/NutrirCe';
import { nutriOf } from '@/lib/brand';
import { GlobalBank } from '@/components/builder/GlobalBank';
import { IntakeTab } from '@/components/builder/IntakeTab';
import { TemplateBank } from '@/components/builder/TemplateBank';
// Registra la Food & Brand DB en el motor de alimentos apenas carga el Builder.
import '@/store/useFoodDbStore';
import { MealsTab } from '@/components/builder/MealsTab';
import { ExportTab } from '@/components/deploy/ExportTab';
import { PhonePreview } from '@/components/deploy/PhonePreview';
import { StoryTab } from '@/components/deploy/StoryTab';
import { BlockHeader, BLOCKS, cx, NutritionMark, type Block } from '@/components/hud/primitives';
import { InstallButton } from '@/components/pwa/InstallButton';
import { AthleteSwitcher } from '@/components/builder/AthleteSwitcher';
import { ProfileBackup } from '@/components/builder/ProfileBackup';
import { computeTelemetry, eaStatus, fmt0, fmt1, isMpsMeal, LEUCINE_THRESHOLD, mealTotals, PHASE_LABEL } from '@/lib/bioenergetics';
import { usePlanStore, type BuilderTab, type DeployTab } from '@/store/usePlanStore';
import { useExportFreshness } from '@/components/deploy/ExportFreshness';
import { UndoBar } from '@/components/builder/UndoBar';
import { CloudAccount, ConflictBanner } from '@/components/cloud/CloudAccount';
import { StepFlow } from '@/components/cloud/StepFlow';
import { CoachBoard } from '@/components/cloud/CoachBoard';
import { cloudConfigured } from '@/lib/cloud/config';

const BUILDER_TABS: { id: BuilderTab; label: string; icon: typeof Brain; block: Block }[] = [
  ...(cloudConfigured ? [{ id: 'athletes' as BuilderTab, label: 'Mis atletas', icon: Users, block: 'publicacion' as Block }] : []),
  { id: 'profile', label: 'Alumno · perfil, horarios y macros', icon: Dna, block: 'perfil' },
  { id: 'intake', label: 'Asistente IA', icon: Brain, block: 'perfil' },
  { id: 'meals', label: 'Comidas', icon: Utensils, block: 'estructura' },
  { id: 'library', label: '📚 Planes listos', icon: Library, block: 'estructura' },
  { id: 'global', label: '🌐 Banco Global', icon: Globe2, block: 'opciones' },
  { id: 'fooddb', label: 'Alimentos y marcas', icon: Database, block: 'opciones' },
];

/** Leyenda de los 5 bloques del Builder: cada uno abre su primera pestaña (Publicación, el panel de la derecha). */
function BlockLegend() {
  const tab = usePlanStore((s) => s.builderTab);
  const setBuilderTab = usePlanStore((s) => s.setBuilderTab);
  const active = BUILDER_TABS.find((t) => t.id === tab)?.block;
  const first: Partial<Record<Block, BuilderTab>> = { perfil: 'profile', macros: 'profile', estructura: 'meals', opciones: 'meals' };
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Bloques del Builder">
      {(Object.keys(BLOCKS) as Block[]).map((k) => {
        const b = BLOCKS[k];
        const on = active === k || (k === 'opciones' && tab === 'meals');
        return (
          <button
            key={k}
            type="button"
            title={b.hint}
            onClick={() => (first[k] ? setBuilderTab(first[k]!) : document.querySelector('aside')?.scrollIntoView({ behavior: 'smooth' }))}
            className={cx('flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.12em] transition', on ? 'border-white/20 bg-white/[0.04]' : 'border-line opacity-70 hover:opacity-100')}
            style={{ color: b.color }}
          >
            <span className="grid h-4 w-4 place-items-center rounded-sm text-[9px] text-carbon" style={{ background: b.color }}>
              {b.n}
            </span>
            {b.label}
          </button>
        );
      })}
    </div>
  );
}

const DEPLOY_TABS: { id: DeployTab; label: string; icon: typeof Brain }[] = [
  { id: 'preview', label: 'Vista del alumno', icon: Smartphone },
  { id: 'export', label: 'Publicar', icon: Download },
  { id: 'story', label: 'Instagram', icon: ImageIcon },
];

/** Explicación de cada dato de la barra de estado (al pasar el mouse). */
const STATUS_TIP: Record<string, string> = {
  ATLETA: 'Atleta que estás editando. Cambialo desde el selector de atletas arriba a la derecha.',
  FASE: 'Objetivo actual del plan (recomposición, mantenimiento o superávit).',
  'DÍA DE ENTRENO': 'Calorías totales de un día con entrenamiento.',
  'DÍA DE DESCANSO': 'Calorías totales de un día sin entrenamiento.',
  'ENERGÍA DISPONIBLE': 'Lo que le queda al cuerpo después de entrenar, por kg de masa magra (entreno / descanso). Por debajo de 30 hay riesgo para la salud hormonal; 30-45 es seguro para recomponer; más de 45 es óptimo.',
  'PROTEÍNA POR COMIDA': 'Si desayuno, almuerzo y cena llegan a la proteína que estimula el músculo (~2,5 g de leucina por comida).',
};

const EA_TEXT = { optimal: 'text-[#22C55E]', reduced: 'text-cyan-hud', low: 'text-danger' } as const;

function StatusBar() {
  const plan = usePlanStore((s) => s.plan);
  const t = computeTelemetry(plan);
  const mps = plan.meals.filter(isMpsMeal);
  const low = mps.filter((m) => mealTotals(m).leucine < LEUCINE_THRESHOLD).length;
  const items: [string, string, string][] = [
    ['ATLETA', plan.profile.name.toUpperCase(), 'text-ink'],
    ['FASE', PHASE_LABEL[plan.profile.phase].toUpperCase(), 'text-fire'],
    ['DÍA DE ENTRENO', `${fmt0(t.kcalOn)} KCAL`, 'text-ink'],
    ['DÍA DE DESCANSO', `${fmt0(t.kcalOff)} KCAL`, 'text-ink'],
    ['ENERGÍA DISPONIBLE', `${fmt1(t.eaOn)} / ${fmt1(t.eaOff)}`, EA_TEXT[eaStatus(Math.min(t.eaOn, t.eaOff))]],
    ['PROTEÍNA POR COMIDA', low ? `${low} COMIDA${low > 1 ? 'S' : ''} CORTA${low > 1 ? 'S' : ''}` : 'BIEN EN TODAS', low ? 'text-fire' : 'text-cyan-hud'],
  ];
  return (
    <div className="scroll-thin flex gap-5 overflow-x-auto border-t border-line bg-panel2 px-4 py-2 sm:px-6">
      {items.map(([k, v, c]) => (
        <div key={k} title={STATUS_TIP[k]} className="flex flex-none cursor-help items-baseline gap-2 font-mono text-[10px] tracking-[0.14em]">
          <span className="text-mute">{k}</span>
          <span className={cx('font-bold', c)}>{v}</span>
        </div>
      ))}
    </div>
  );
}

/** Cabecera del Builder: Coach JP × NutrirCe en igualdad de jerarquía (50/50). */
function CoBrandHeader() {
  const plan = usePlanStore((st) => st.plan);
  const n = nutriOf(plan);
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1" data-builder-cobrand>
      <span className="flex items-center gap-2">
        <NutritionMark size={34} />
        <span className="text-[17px] font-bold leading-none tracking-[0.04em] text-ink">COACH JP</span>
      </span>
      {n && (
        <>
          <span className="text-[15px] text-steel/60">×</span>
          <NutrirCeLogo size={46} logo={n.logo} />
        </>
      )}
      <div className="basis-full font-mono text-[10px] tracking-[0.14em] text-mute">{n ? `ENTRENAMIENTO & NUTRICIÓN · ${n.name.toUpperCase()} · ` : '@coachjp.training · '}ARMADOR DE PLANES</div>
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
  const activeId = usePlanStore((s) => s.plan.id);
  const stale = useExportFreshness().state === 'stale';

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
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <CoBrandHeader />
          <div className="ml-auto flex items-center gap-2">
            <CloudAccount />
            <ProfileBackup />
            <AthleteSwitcher />
            <InstallButton />
            <button
              onClick={() => confirm('¿Cargar el atleta de ejemplo? Reemplaza el plan que estás viendo.') && resetDemo()}
              title="Carga un atleta de ejemplo para probar el Builder (reemplaza el plan que estás viendo)"
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
          <div className="mb-3 font-mono text-[10px] tracking-[0.24em] text-mute">ARMÁ EL PLAN</div>
          <ConflictBanner />
          <StepFlow />
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <BlockLegend />
            <QuickAssignButton />
          </div>
          <div className="mb-4 flex items-start gap-2">
          <nav className="scroll-thin flex min-w-0 flex-1 gap-1 overflow-x-auto rounded-xl border border-line bg-panel p-1">
            {BUILDER_TABS.map(({ id, label, icon: Icon, block }) => (
              <button
                key={id}
                onClick={() => setBuilderTab(id)}
                title={`Bloque ${BLOCKS[block].n} · ${BLOCKS[block].label}`}
                className={cx(
                  'flex flex-none items-center gap-2 rounded-lg px-3.5 py-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] transition',
                  builderTab === id
                    ? 'bg-cyan-hud/[0.08] text-ink ring-1 ring-inset ring-cyan-hud/60'
                    : 'text-mute hover:bg-white/[0.03] hover:text-steel',
                )}
              >
                <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: BLOCKS[block].color }} />
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </nav>
          <UndoBar />
          </div>
{/* key = atleta activo: al cambiar de atleta cada solapa se remonta sin estado local del anterior. */}
          <div key={activeId}>
          {builderTab !== 'meals' && <BlockHeader block={BUILDER_TABS.find((t) => t.id === builderTab)?.block ?? 'perfil'} />}
          {builderTab === 'athletes' && <CoachBoard />}

          {builderTab === 'intake' && <IntakeTab />}
          {builderTab === 'profile' && <AthleteSheet />}

          {builderTab === 'meals' && <MealsTab />}
          {builderTab === 'global' && <GlobalBank />}
          {builderTab === 'fooddb' && <FoodBrandDatabase />}
          {builderTab === 'library' && <TemplateBank />}
          </div>
        </section>

        <aside className="min-w-0 lg:sticky lg:top-[112px] lg:max-h-[calc(100vh-128px)] lg:self-start lg:overflow-y-auto scroll-thin">
          <BlockHeader block="publicacion" />
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
                {id === 'export' && stale && <span className="h-2 w-2 rounded-full bg-fire shadow-[0_0_8px_rgba(249,115,22,.9)]" title="Tenés cambios sin publicar" />}
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
        COACH JP HIGH PERFORMANCE SYSTEM × NUTRIRCE · BIOENERGÉTICA APLICADA · [ ISSN · MORTON ET AL., 2018 · BR J SPORTS MED ]
      </footer>
    </div>
  );
}
