'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Image as ImageIcon } from 'lucide-react';
import { slugify } from '@/lib/exportHtml';
import { drawStoryCard, ensureFonts } from '@/lib/storyCard';
import { usePlanStore } from '@/store/usePlanStore';
import { HudButton, Panel } from '../hud/primitives';

export function StoryTab() {
  const plan = usePlanStore((s) => s.plan);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    ensureFonts().then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (canvas.current) drawStoryCard(canvas.current, plan);
  }, [plan, ready]);

  const save = () => {
    if (!canvas.current) return;
    const a = document.createElement('a');
    a.href = canvas.current.toDataURL('image/png');
    a.download = `coachjp-story-${slugify(plan.profile.name)}.png`;
    a.click();
  };

  return (
    <Panel title="STORY CARD 9:16 · 1080×1920" tone="gold" right={<ImageIcon className="h-4 w-4 text-gold" />}>
      <div className="flex flex-col items-center gap-4">
        <canvas ref={canvas} className="w-full max-w-[340px] rounded-xl border border-line2 shadow-hud" style={{ aspectRatio: '9 / 16' }} />
        <HudButton tone="gold" onClick={save} className="w-full max-w-[340px]">
          <Download className="h-4 w-4" /> Descargar PNG para Instagram
        </HudButton>
        <p className="text-center font-mono text-[9.5px] tracking-[0.08em] text-steel">DIRECTIVA NUTRICIONAL · TONELAJE CALÓRICO ON/OFF · SELLO @COACHJP.TRAINING</p>
      </div>
    </Panel>
  );
}
