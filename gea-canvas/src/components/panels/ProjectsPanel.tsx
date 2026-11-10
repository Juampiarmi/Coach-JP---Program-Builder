'use client';
import { useRef } from 'react';
import { CalendarClock, Copy, Download, FolderOpen, Plus, Trash2, Upload } from 'lucide-react';
import { PILLARS } from '@/data/library';
import { download } from '@/lib/canvas/export';
import { dataUrlToMedia, mediaToDataUrl } from '@/lib/media';
import { FORMATS, type FormatKey, type Project } from '@/lib/types';
import { useStudio, type Asset } from '@/store/studio';
import { Btn, Section, inputCls } from '../ui';

const STATUS: Record<Project['status'], string> = {
  borrador: 'bg-white/10 text-white/70',
  listo: 'bg-amber-400/20 text-amber-200',
  publicado: 'bg-emerald-400/20 text-emerald-200',
};

export function ProjectsPanel() {
  const projects = useStudio((s) => s.projects);
  const assets = useStudio((s) => s.assets);
  const addAsset = useStudio((s) => s.addAsset);
  const currentId = useStudio((s) => s.currentId);
  const createProject = useStudio((s) => s.createProject);
  const openProject = useStudio((s) => s.openProject);
  const duplicateProject = useStudio((s) => s.duplicateProject);
  const deleteProject = useStudio((s) => s.deleteProject);
  const importProject = useStudio((s) => s.importProject);
  const mutate = useStudio((s) => s.mutate);
  const fileRef = useRef<HTMLInputElement>(null);

  const scheduled = [...projects].filter((p) => p.scheduledAt).sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!));
  const current = projects.find((p) => p.id === currentId);

  /** Respaldo JSON con las fotos/videos embebidos, para pasar a otro dispositivo. */
  const backup = async () => {
    const media: Record<string, string> = {};
    const ids = [...projects.flatMap((p) => p.pages.map((pg) => pg.background.mediaId)), ...assets.map((a) => a.mediaId)];
    for (const id of ids)
      if (id && !media[id]) {
        const d = await mediaToDataUrl(id);
        if (d) media[id] = d;
      }
    const blob = new Blob([JSON.stringify({ app: 'gea-canvas', v: 2, projects, assets, media })], { type: 'application/json' });
    download(blob, `gea-canvas-respaldo-${new Date().toISOString().slice(0, 10)}.json`);
  };

  const restore = async (file?: File) => {
    if (!file) return;
    const data = JSON.parse(await file.text());
    if (data.app !== 'gea-canvas') return alert('El archivo no es un respaldo de GEA Canvas.');
    for (const [id, url] of Object.entries<string>(data.media ?? {})) await dataUrlToMedia(id, url);
    for (const p of (data.projects as Project[]).reverse()) importProject(p);
    const have = new Set(useStudio.getState().assets.map((a) => a.mediaId));
    for (const a of (data.assets ?? []) as Asset[]) if (!have.has(a.mediaId)) addAsset(a);
  };

  return (
    <div>
      <Section title="Nueva pieza">
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(FORMATS) as FormatKey[]).map((f) => (
            <Btn key={f} onClick={() => createProject(f)}>
              <Plus className="h-3.5 w-3.5" /> {FORMATS[f].short}
            </Btn>
          ))}
        </div>
      </Section>

      {current && (
        <Section title="Programación de esta pieza">
          <div className="space-y-2">
            <input className={inputCls} value={current.name} onChange={(e) => mutate((p) => (p.name = e.target.value), { history: false })} />
            <input
              type="datetime-local"
              className={inputCls}
              value={current.scheduledAt ?? ''}
              onChange={(e) => mutate((p) => (p.scheduledAt = e.target.value || undefined), { history: false })}
            />
            <div className="flex gap-1">
              {(Object.keys(STATUS) as Project['status'][]).map((s) => (
                <button
                  key={s}
                  onClick={() => mutate((p) => (p.status = s), { history: false })}
                  className={`flex-1 rounded-md py-1.5 text-[11px] font-semibold capitalize ring-1 ${
                    current.status === s ? 'bg-white text-ink ring-white' : 'text-white/60 ring-white/10'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </Section>
      )}

      {scheduled.length > 0 && (
        <Section title="Calendario de publicación">
          <ol className="space-y-1.5">
            {scheduled.map((p) => {
              const d = new Date(p.scheduledAt!);
              return (
                <li key={p.id}>
                  <button onClick={() => openProject(p.id)} className="flex w-full items-center gap-3 rounded-lg bg-white/[0.03] p-2 text-left ring-1 ring-white/5 hover:ring-white/25">
                    <div className="w-12 text-center">
                      <div className="font-display text-sm font-bold text-neon">{d.getDate()}</div>
                      <div className="text-[9px] uppercase text-white/50">{d.toLocaleDateString('es-AR', { month: 'short', weekday: 'short' })}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold text-white">{p.name}</div>
                      <div className="text-[10px] text-white/45">
                        {d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} · {FORMATS[p.format].short}
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold capitalize ${STATUS[p.status]}`}>{p.status}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </Section>
      )}

      <Section title={`Biblioteca (${projects.length})`}>
        <ul className="space-y-2">
          {projects.map((p) => (
            <li
              key={p.id}
              className={`flex items-center gap-3 rounded-xl p-2 ring-1 ${p.id === currentId ? 'bg-neon/10 ring-neon/60' : 'bg-black/20 ring-white/10'}`}
            >
              <button onClick={() => openProject(p.id)} className="h-16 w-12 shrink-0 overflow-hidden rounded bg-ink ring-1 ring-white/10">
                {p.thumb ? <img src={p.thumb} alt="" className="h-full w-full object-cover" /> : <FolderOpen className="m-auto h-4 w-4 text-white/30" />}
              </button>
              <button onClick={() => openProject(p.id)} className="min-w-0 flex-1 text-left">
                <div className="truncate text-xs font-semibold text-white">{p.name}</div>
                <div className="text-[10px] text-white/45">
                  {FORMATS[p.format].short} · {p.pages.reduce((a, pg) => a + pg.span, 0)} slide(s)
                  {p.pillar ? ` · ${PILLARS[p.pillar].short}` : ''}
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-[10px] text-white/35">
                  {p.scheduledAt && <CalendarClock className="h-3 w-3" />}
                  {new Date(p.updatedAt).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </button>
              <div className="flex flex-col gap-1">
                <button title="Duplicar" onClick={() => duplicateProject(p.id)} className="grid h-6 w-6 place-items-center rounded bg-white/5 text-white/60 hover:bg-white/15">
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  title="Eliminar"
                  onClick={() => confirm(`¿Eliminar “${p.name}”?`) && deleteProject(p.id)}
                  className="grid h-6 w-6 place-items-center rounded bg-white/5 text-red-300/80 hover:bg-red-500/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Respaldo">
        <div className="grid grid-cols-2 gap-2">
          <Btn onClick={backup}>
            <Download className="h-4 w-4" /> Exportar JSON
          </Btn>
          <Btn onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> Importar
          </Btn>
        </div>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => restore(e.target.files?.[0])} />
        <p className="mt-2 text-[10px] leading-snug text-white/40">
          Los proyectos se guardan solos en este dispositivo. El respaldo incluye fotos, videos y la Galería GEA para llevarlos a otro equipo (las API keys no se incluyen).
        </p>
      </Section>
    </div>
  );
}
