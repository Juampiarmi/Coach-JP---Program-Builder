'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { buildAthleteHtml, buildPayload } from '@/lib/exportHtml';
import type { DayMode } from '@/lib/types';
import { usePlanStore } from '@/store/usePlanStore';
import { HudButton, Segmented } from '../hud/primitives';

type Status = { kind: 'loading' } | { kind: 'ready' } | { kind: 'error'; message: string };

export function PhonePreview() {
  const plan = usePlanStore((s) => s.plan);
  const mode = usePlanStore((s) => s.previewMode);
  const setMode = usePlanStore((s) => s.setPreviewMode);
  const frame = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);

  // El documento se genera al montar (o al recargar); los cambios posteriores viajan por postMessage
  // para no perder el scroll ni el estado de la PWA. Si la generación falla, se muestra el error.
  const srcDoc = useMemo(() => {
    try {
      const s = usePlanStore.getState();
      return buildAthleteHtml(s.plan, { preview: true, mode: s.previewMode });
    } catch (e) {
      return errorDoc(e instanceof Error ? e.message : String(e));
    }
  }, [reloadKey]);

  const push = useCallback(() => {
    const w = frame.current?.contentWindow;
    if (!w) return;
    try {
      const { plan: p, previewMode: m } = usePlanStore.getState();
      w.postMessage({ type: 'coachjp:payload', payload: buildPayload(p, { preview: true, mode: m }) }, '*');
    } catch (e) {
      setStatus({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  // Sincronización instantánea Builder → celular (comidas, macros, modo ON/OFF).
  useEffect(() => {
    push();
  }, [plan, mode, push]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      const d = e.data ?? {};
      if (d.type === 'coachjp:ready') setStatus((s) => (s.kind === 'ready' ? s : { kind: 'ready' }));
      else if (d.type === 'coachjp:error') setStatus({ kind: 'error', message: String(d.message ?? 'Error desconocido') });
      else if (d.type === 'coachjp:mode') setMode(d.mode as DayMode);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [setMode]);

  // Si la PWA no confirma el render en 4 s, se avisa en lugar de dejar la pantalla vacía.
  useEffect(() => {
    if (status.kind !== 'loading') return;
    const id = setTimeout(
      () => setStatus((s) => (s.kind === 'loading' ? { kind: 'error', message: 'La PWA no respondió al renderizar (timeout 4 s).' } : s)),
      4000,
    );
    return () => clearTimeout(id);
  }, [status.kind, reloadKey]);

  const reload = () => {
    setStatus({ kind: 'loading' });
    setReloadKey((k) => k + 1);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-full max-w-[300px]">
        <Segmented
          value={mode}
          onChange={setMode}
          tone="cyan"
          size="sm"
          options={[
            { value: 'on', label: 'Modo día ON' },
            { value: 'off', label: 'Modo día OFF' },
          ]}
        />
      </div>
      <div className="relative rounded-[46px] border border-line bg-gradient-to-b from-[#1A2333] to-[#0E1420] p-[10px] shadow-[0_0_0_1px_#05080D,0_40px_80px_-40px_rgba(5,8,13,.9),inset_0_0_0_1px_rgba(255,255,255,.05)]">
        <span className="absolute -left-[3px] top-28 h-10 w-[3px] rounded-l bg-white/10" />
        <span className="absolute -left-[3px] top-44 h-16 w-[3px] rounded-l bg-white/10" />
        <span className="absolute -right-[3px] top-36 h-20 w-[3px] rounded-r bg-white/10" />
        <div className="relative h-[680px] w-[330px] overflow-hidden rounded-[37px] bg-carbon">
          <div className="pointer-events-none absolute left-1/2 top-2.5 z-20 flex h-[28px] w-[108px] -translate-x-1/2 items-center justify-end rounded-full bg-[#05080D] pr-3">
            <span className="h-2 w-2 rounded-full bg-[#0c1a24] ring-1 ring-cyan-hud/30" />
          </div>
          <iframe
            key={reloadKey}
            ref={frame}
            title="PWA del atleta"
            srcDoc={srcDoc}
            onLoad={push}
            sandbox="allow-scripts allow-popups"
            className="h-full w-full border-0 bg-carbon pt-8"
          />
          {status.kind === 'loading' && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-carbon">
              <div className="flex flex-col items-center gap-3 font-mono text-[10px] tracking-[0.2em] text-steel">
                <Loader2 className="h-5 w-5 animate-spin text-cyan-hud/70" /> RENDERIZANDO PWA
              </div>
            </div>
          )}
          {status.kind === 'error' && (
            <div className="absolute inset-0 z-10 flex items-center bg-carbon/95 p-5">
              <div className="w-full rounded-xl border border-fire/40 bg-panel p-4">
                <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-fire">
                  <AlertTriangle className="h-3.5 w-3.5" /> [ ERROR DE RENDER ]
                </div>
                <p className="mt-2 text-sm text-ink">El simulador no pudo renderizar la PWA del atleta.</p>
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[10.5px] text-steel">{status.message}</pre>
                <HudButton tone="steel" variant="ghost" onClick={reload} className="mt-3 w-full">
                  <RefreshCw className="h-3.5 w-3.5" /> Reintentar
                </HudButton>
              </div>
            </div>
          )}
          <div className="pointer-events-none absolute bottom-2 left-1/2 z-20 h-1 w-28 -translate-x-1/2 rounded-full bg-white/40" />
        </div>
      </div>
      <p className="max-w-[330px] text-center font-mono text-[9.5px] leading-4 tracking-[0.08em] text-mute">
        RENDER EXACTO DEL INDEX.HTML EXPORTADO · SE ACTUALIZA AL INSTANTE CON CADA CAMBIO
      </p>
    </div>
  );
}

function errorDoc(message: string) {
  const esc = message.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<!doctype html><html><body style="margin:0;background:#0B0F17;color:#FFFFFF;font-family:system-ui;padding:48px 18px"><div style="border:1px solid rgba(249,115,22,.45);border-radius:14px;background:#131B2A;padding:16px"><div style="font:600 10px ui-monospace,monospace;letter-spacing:.2em;color:#F97316">[ ERROR GENERANDO EL HTML ]</div><pre style="white-space:pre-wrap;font:11px ui-monospace,monospace;color:#94A3B8;margin-top:8px">${esc}</pre></div><script>parent.postMessage({type:'coachjp:error',message:${JSON.stringify(message).replace(/</g, '\\u003c')}},'*')</script></body></html>`;
}
