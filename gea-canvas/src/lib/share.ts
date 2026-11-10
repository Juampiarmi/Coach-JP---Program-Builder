import { download } from './canvas/export';

/** En celulares usa la hoja de compartir (→ "Guardar imagen" en Fotos); en escritorio descarga. */
export async function deliver(files: { blob: Blob; name: string }[]) {
  const asFiles = files.map((f) => new File([f.blob], f.name, { type: f.blob.type }));
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (mobile && nav.canShare?.({ files: asFiles })) {
    try {
      await navigator.share({ files: asFiles, title: 'Hotel GEA' });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }
  for (const f of files) {
    download(f.blob, f.name);
    await new Promise((r) => setTimeout(r, 250));
  }
}
