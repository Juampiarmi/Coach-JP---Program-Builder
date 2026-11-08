'use client';
import { useEffect, useRef } from 'react';
import { ArrowDown, ArrowUp, Copy, GalleryHorizontal, Plus, Trash2 } from 'lucide-react';
import { useMedia } from '@/hooks/useMedia';
import { renderScene } from '@/lib/canvas/render';
import { FORMATS, type FormatKey, type Page } from '@/lib/types';
import { useCurrent, usePage, useStudio } from '@/store/studio';
import { Btn, Section } from '../ui';

function PageThumb({ page, format, ready }: { page: Page; format: FormatKey; ready: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const media = useMedia(page.background);
  const fw = FORMATS[format].w;
  const W = fw * page.span;
  const H = FORMATS[format].h;
  const tw = 70 * page.span;
  const th = Math.round((H / fw) * 70);
  useEffect(() => {
    const c = ref.current;
    if (!c || !ready) return;
    const full = document.createElement('canvas');
    full.width = W;
    full.height = H;
    renderScene(full.getContext('2d')!, page, { format, media });
    c.width = tw * 2;
    c.height = th * 2;
    c.getContext('2d')!.drawImage(full, 0, 0, c.width, c.height);
  }, [page, format, media, ready, W, H, tw, th]);
  return <canvas ref={ref} style={{ width: tw, height: th }} className="rounded ring-1 ring-white/10" />;
}

export function PagesPanel({ ready }: { ready: boolean }) {
  const project = useCurrent();
  const page = usePage();
  const pageIndex = useStudio((s) => s.pageIndex);
  const goPage = useStudio((s) => s.goPage);
  const addPage = useStudio((s) => s.addPage);
  const duplicatePage = useStudio((s) => s.duplicatePage);
  const removePage = useStudio((s) => s.removePage);
  const movePage = useStudio((s) => s.movePage);
  const setSpan = useStudio((s) => s.setSpan);
  const isFeed = project.format === 'feed45' || project.format === 'feed11';
  const totalSlides = project.pages.reduce((a, p) => a + p.span, 0);

  return (
    <div>
      <Section title={isFeed ? 'Carrusel' : 'Secuencia de stories'} right={<span className="text-[10px] text-white/40">{totalSlides} / 20 slides</span>}>
        <ol className="space-y-2">
          {project.pages.map((pg, i) => (
            <li
              key={pg.id}
              onClick={() => goPage(i)}
              className={`flex cursor-pointer items-center gap-3 rounded-xl p-2 ring-1 transition ${
                i === pageIndex ? 'bg-neon/10 ring-neon/60' : 'bg-black/20 ring-white/10 hover:ring-white/30'
              }`}
            >
              <span className="w-5 text-center font-tech text-[10px] text-white/50">{String(i + 1).padStart(2, '0')}</span>
              <div className="min-w-0 flex-1 overflow-x-auto">
                <PageThumb page={pg} format={project.format} ready={ready} />
              </div>
              <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                <IconBtn title="Subir" onClick={() => movePage(i, -1)} disabled={i === 0}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn title="Bajar" onClick={() => movePage(i, 1)} disabled={i === project.pages.length - 1}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </IconBtn>
              </div>
              <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                <IconBtn title="Duplicar" onClick={() => duplicatePage(i)}>
                  <Copy className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn title="Eliminar" onClick={() => removePage(i)} disabled={project.pages.length <= 1}>
                  <Trash2 className="h-3.5 w-3.5" />
                </IconBtn>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Btn onClick={() => addPage(1)} disabled={totalSlides >= 20}>
            <Plus className="h-4 w-4" /> {isFeed ? 'Slide suelto' : 'Nueva story'}
          </Btn>
          {isFeed && (
            <Btn onClick={() => addPage(3)} disabled={totalSlides + 3 > 20}>
              <GalleryHorizontal className="h-4 w-4" /> Panorámica ×3
            </Btn>
          )}
        </div>
      </Section>

      {isFeed && (
        <Section title="Carrusel continuo (seamless)">
          <p className="mb-3 text-[11px] leading-snug text-white/55">
            La página actual se convierte en una tira panorámica de varios slides. Ubicá stickers sobre las costuras (línea cian) para que crucen de un slide al otro: al exportar se corta en piezas de 1080 px exactas.
          </p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setSpan(n)}
                disabled={totalSlides - page.span + n > 20}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold ring-1 transition disabled:opacity-30 ${
                  page.span === n ? 'bg-white text-ink ring-white' : 'bg-white/[0.04] text-white/70 ring-white/10 hover:ring-white/30'
                }`}
              >
                {n === 1 ? 'Simple' : `×${n}`}
              </button>
            ))}
          </div>
        </Section>
      )}

      <Section title="Zonas seguras">
        <ul className="space-y-1.5 text-[11px] leading-snug text-white/55">
          <li>
            <b className="text-white/80">Story:</b> 250 px arriba (perfil y barra) y 340 px abajo (responder) quedan tapados.
          </li>
          <li>
            <b className="text-white/80">Reel:</b> 420 px abajo (usuario, caption, audio) y la columna derecha de botones.
          </li>
          <li>
            <b className="text-white/80">Feed 4:5:</b> la grilla del perfil (3:4) recorta 34 px por lado.
          </li>
        </ul>
      </Section>
    </div>
  );
}

function IconBtn({ children, onClick, title, disabled }: { children: React.ReactNode; onClick: () => void; title: string; disabled?: boolean }) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="grid h-6 w-6 place-items-center rounded-md bg-white/[0.05] text-white/70 hover:bg-white/15 disabled:opacity-25"
    >
      {children}
    </button>
  );
}
