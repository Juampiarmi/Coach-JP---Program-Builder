'use client';

import { useEffect, useMemo, useRef } from 'react';
import { buildAthleteHtml, buildPayload } from '@/lib/exportHtml';
import type { DayMode } from '@/lib/types';
import { usePlanStore } from '@/store/usePlanStore';
import { Segmented } from '../hud/primitives';

export function PhonePreview() {
  const plan = usePlanStore((s) => s.plan);
  const mode = usePlanStore((s) => s.previewMode);
  const setMode = usePlanStore((s) => s.setPreviewMode);
  const frame = useRef<HTMLIFrameElement>(null);

  // El documento se monta una sola vez; los cambios viajan por postMessage para no perder scroll ni estado.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const srcDoc = useMemo(() => buildAthleteHtml(usePlanStore.getState().plan, { preview: true, mode }), []);

  const push = () => {
    const w = frame.current?.contentWindow;
    if (!w) return;
    const { plan: p, previewMode: m } = usePlanStore.getState();
    w.postMessage({ type: 'coachjp:payload', payload: buildPayload(p, { preview: true, mode: m }) }, '*');
  };

  useEffect(() => {
    const id = setTimeout(push, 60);
    return () => clearTimeout(id);
  }, [plan, mode]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source === frame.current?.contentWindow && e.data?.type === 'coachjp:mode') setMode(e.data.mode as DayMode);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [setMode]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-full max-w-[300px]">
        <Segmented
          value={mode}
          onChange={setMode}
          tone={mode === 'on' ? 'cyan' : 'gold'}
          size="sm"
          options={[
            { value: 'on', label: 'Modo día ON' },
            { value: 'off', label: 'Modo día OFF' },
          ]}
        />
      </div>
      <div className="relative rounded-[46px] border border-line2 bg-gradient-to-b from-[#1a2230] to-[#0d1118] p-[10px] shadow-[0_0_0_1px_#000,0_40px_80px_-30px_rgba(0,229,255,.35),inset_0_0_0_1px_rgba(255,255,255,.04)]">
        <span className="absolute -left-[3px] top-28 h-10 w-[3px] rounded-l bg-line2" />
        <span className="absolute -left-[3px] top-44 h-16 w-[3px] rounded-l bg-line2" />
        <span className="absolute -right-[3px] top-36 h-20 w-[3px] rounded-r bg-line2" />
        <div className="relative h-[680px] w-[330px] overflow-hidden rounded-[37px] bg-carbon">
          <div className="pointer-events-none absolute left-1/2 top-2.5 z-10 flex h-[28px] w-[108px] -translate-x-1/2 items-center justify-end rounded-full bg-black pr-3">
            <span className="h-2 w-2 rounded-full bg-[#0c1a24] ring-1 ring-cyan-hud/20" />
          </div>
          <iframe
            ref={frame}
            title="PWA del atleta"
            srcDoc={srcDoc}
            onLoad={push}
            sandbox="allow-scripts allow-popups"
            className="h-full w-full border-0 pt-8"
          />
          <div className="pointer-events-none absolute bottom-2 left-1/2 h-1 w-28 -translate-x-1/2 rounded-full bg-white/40" />
        </div>
      </div>
      <p className="max-w-[330px] text-center font-mono text-[9.5px] leading-4 tracking-[0.08em] text-steel">
        RENDER EXACTO DEL INDEX.HTML EXPORTADO · CHECKLIST Y SMART SWAPS INTERACTIVOS
      </p>
    </div>
  );
}
