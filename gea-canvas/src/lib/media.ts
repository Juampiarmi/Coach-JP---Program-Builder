/** Media de fondo (fotos/videos) en IndexedDB: no entra en localStorage y sobrevive offline. */
import { del, get, set } from 'idb-keyval';
import { uid } from './id';

const KEY = (id: string) => `gea-media:${id}`;

export async function saveMedia(file: Blob): Promise<string> {
  const id = uid('m_');
  await set(KEY(id), file);
  return id;
}

export const loadMedia = (id: string) => get<Blob>(KEY(id));
export const deleteMedia = (id: string) => del(KEY(id));

const urls = new Map<string, string>();
export async function mediaUrl(id: string) {
  const hit = urls.get(id);
  if (hit) return hit;
  const blob = await loadMedia(id);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urls.set(id, url);
  return url;
}

export async function mediaToDataUrl(id: string): Promise<string | null> {
  const blob = await loadMedia(id);
  if (!blob) return null;
  return new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.readAsDataURL(blob);
  });
}

export async function dataUrlToMedia(id: string, dataUrl: string) {
  const blob = await (await fetch(dataUrl)).blob();
  await set(KEY(id), blob);
}

/** Reduce fotos enormes a ≤ 2400 px de lado (suficiente para 1080×1920 con zoom) antes de guardarlas. */
export async function normalizeImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file;
  const max = 2400;
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  if (s === 1 && file.size < 4_000_000) return file;
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob((b) => res(b ?? file), 'image/jpeg', 0.92));
}

/** Carga el elemento (img/video en su primer frame) de un fondo, para exportar páginas que no están abiertas. */
export async function loadMediaElement(bg: { kind: string; mediaId?: string }): Promise<HTMLImageElement | HTMLVideoElement | null> {
  if (!bg.mediaId || bg.kind === 'none') return null;
  const url = await mediaUrl(bg.mediaId);
  if (!url) return null;
  if (bg.kind === 'video') {
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.src = url;
    await new Promise<void>((res) => {
      v.onloadeddata = () => {
        v.currentTime = Math.min(0.1, v.duration || 0);
      };
      v.onseeked = () => res();
      v.onerror = () => res();
    });
    return v;
  }
  const img = new Image();
  img.src = url;
  await img.decode().catch(() => undefined);
  return img;
}
