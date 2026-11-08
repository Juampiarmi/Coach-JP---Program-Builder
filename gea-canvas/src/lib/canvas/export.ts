/** Exportación: PNG de alta resolución por slide, sticker recortado con alfa y video (MediaRecorder). */
import type { FormatKey, Layer, Page } from '@/lib/types';
import { FORMATS } from '@/lib/types';
import { renderScene, type MediaEl } from './render';
import { PAD, renderSticker } from './stickers';

export function download(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

const toBlob = (c: HTMLCanvasElement, type = 'image/png', q?: number) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob falló'))), type, q));

export const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'gea';

/** Renderiza la página completa a resolución nativa (1080 × alto × span). */
export function renderPageCanvas(page: Page, format: FormatKey, media?: MediaEl | null) {
  const { w, h } = FORMATS[format];
  const c = document.createElement('canvas');
  c.width = w * page.span;
  c.height = h;
  renderScene(c.getContext('2d')!, page, { format, media });
  return c;
}

/** Devuelve un PNG por slide (un carrusel continuo de span 3 → 3 archivos de 1080 de ancho). */
export async function exportPage(page: Page, format: FormatKey, media: MediaEl | null | undefined, base: string, startIndex = 1) {
  const full = renderPageCanvas(page, format, media);
  const { w, h } = FORMATS[format];
  const files: { blob: Blob; name: string }[] = [];
  for (let s = 0; s < page.span; s++) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d')!.drawImage(full, s * w, 0, w, h, 0, 0, w, h);
    const n = String(startIndex + s).padStart(2, '0');
    files.push({ blob: await toBlob(c), name: `${base}-${n}-${w}x${h}.png` });
  }
  return files;
}

/** PNG transparente del sticker, recortado a su contenido + glow. */
export async function exportSticker(l: Layer, k = 3) {
  const r = renderSticker(l.props, k);
  const pad = PAD * 0.6;
  const c = document.createElement('canvas');
  c.width = Math.ceil((r.w + pad * 2) * k);
  c.height = Math.ceil((r.h + pad * 2) * k);
  const off = (PAD - pad) * k;
  c.getContext('2d')!.drawImage(r.canvas, off, off, c.width, c.height, 0, 0, c.width, c.height);
  return toBlob(c);
}

export function thumbnail(page: Page, format: FormatKey, media?: MediaEl | null) {
  const full = renderPageCanvas(page, format, media);
  const tw = 216 * page.span;
  const th = Math.round((FORMATS[format].h / FORMATS[format].w) * 216);
  const c = document.createElement('canvas');
  c.width = Math.min(tw, 216 * 3);
  c.height = Math.round((th * c.width) / tw);
  c.getContext('2d')!.drawImage(full, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.7);
}

export function videoMime() {
  const cands = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  return typeof MediaRecorder !== 'undefined' ? cands.find((m) => MediaRecorder.isTypeSupported(m)) ?? null : null;
}

/**
 * Graba el video de fondo con los overlays encima (1080×1920 / 1080×1350) a 30 fps.
 * Usa MediaRecorder: MP4 en Safari/Chrome recientes, WebM en el resto.
 */
export async function exportVideo(
  page: Page,
  format: FormatKey,
  video: HTMLVideoElement,
  onProgress?: (p: number) => void,
  maxSeconds = 60,
): Promise<{ blob: Blob; ext: string }> {
  const mime = videoMime();
  if (!mime) throw new Error('Este navegador no puede grabar video desde el canvas.');
  const { w, h } = FORMATS[format];
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const single = { ...page, span: 1 };
  const stream = c.captureStream(30);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<void>((res) => (rec.onstop = () => res()));
  const dur = Math.min(maxSeconds, video.duration || maxSeconds);
  const wasLoop = video.loop;
  video.loop = false;
  video.currentTime = 0;
  await video.play().catch(() => undefined);
  rec.start(250);
  await new Promise<void>((res) => {
    const tick = () => {
      renderScene(ctx, single, { format, media: video });
      onProgress?.(Math.min(1, video.currentTime / dur));
      if (video.ended || video.currentTime >= dur) return res();
      requestAnimationFrame(tick);
    };
    tick();
  });
  rec.stop();
  await done;
  video.loop = wasLoop;
  video.play().catch(() => undefined);
  return { blob: new Blob(chunks, { type: mime.split(';')[0] }), ext: mime.includes('mp4') ? 'mp4' : 'webm' };
}
