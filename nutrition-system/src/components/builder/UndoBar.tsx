'use client';

import { useEffect, useState } from 'react';
import { Redo2, Undo2 } from 'lucide-react';
import { redo, startUndo, undo, useUndoStore } from '@/store/undo';

/** Botones Deshacer / Rehacer + atajos Ctrl/⌘+Z, Ctrl/⌘+Shift+Z y Ctrl+Y (fuera de campos de texto). */
export function UndoBar() {
  const past = useUndoStore((s) => s.past);
  const future = useUndoStore((s) => s.future);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    startUndo();
  }, []);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(''), 2600);
    return () => clearTimeout(t);
  }, [msg]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const el = e.target as HTMLElement | null;
      // En inputs y textareas manda el deshacer nativo del navegador.
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault();
        const l = undo();
        setMsg(l ? `↶ Deshecho: ${l}` : 'No hay nada para deshacer');
      } else if ((k === 'z' && e.shiftKey) || k === 'y') {
        e.preventDefault();
        const l = redo();
        setMsg(l ? `↷ Rehecho: ${l}` : 'No hay nada para rehacer');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const last = past[past.length - 1];
  const next = future[future.length - 1];
  const btn =
    'flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-2 text-[11.5px] font-semibold text-steel transition enabled:hover:border-cyan-hud/50 enabled:hover:text-ink disabled:opacity-35';
  return (
    <div className="relative flex flex-none items-center gap-1">
      <button className={btn} disabled={!last} title={last ? `Deshacer: ${last.label} (Ctrl+Z)` : 'Nada para deshacer'} onClick={() => setMsg(`↶ Deshecho: ${undo()}`)} aria-label="Deshacer">
        <Undo2 className="h-3.5 w-3.5" /> Deshacer{past.length ? <span className="font-mono text-[10px] text-mute">{past.length}</span> : null}
      </button>
      <button className={btn} disabled={!next} title={next ? `Rehacer: ${next.label} (Ctrl+Shift+Z)` : 'Nada para rehacer'} onClick={() => setMsg(`↷ Rehecho: ${redo()}`)} aria-label="Rehacer">
        <Redo2 className="h-3.5 w-3.5" />
      </button>
      {msg && (
        <div role="status" className="absolute right-0 top-full z-40 mt-2 whitespace-nowrap rounded-lg border border-cyan-hud/40 bg-carbon px-3 py-2 text-[12px] text-ink shadow-xl">
          {msg}
        </div>
      )}
    </div>
  );
}
