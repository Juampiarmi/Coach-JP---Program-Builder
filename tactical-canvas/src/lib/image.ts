/**
 * Lee una imagen y la reduce a un JPEG liviano. 2400 px en el lado mayor alcanza para
 * cubrir la placa exportada (3240 px) con buena nitidez y entra en localStorage.
 */
/** ¿La imagen tiene píxeles transparentes? (muestreo en grilla, barato aun en fotos grandes) */
function hasAlpha(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const data = ctx.getImageData(0, 0, w, h).data
  const step = Math.max(1, Math.floor((w * h) / 40000)) * 4
  for (let i = 3; i < data.length; i += step) if (data[i] < 250) return true
  return false
}

export async function loadBackground(file: File, maxSide = 2400, quality = 0.86): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    const k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * k)
    canvas.height = Math.round(img.naturalHeight * k)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas no disponible')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    // PNG / WebP pueden traer transparencia (recorte del atleta): se conserva el canal alfa.
    if (/image\/(png|webp)/.test(file.type) && hasAlpha(ctx, canvas.width, canvas.height)) return canvas.toDataURL('image/png')
    return canvas.toDataURL('image/jpeg', quality)
  } finally {
    URL.revokeObjectURL(url)
  }
}
