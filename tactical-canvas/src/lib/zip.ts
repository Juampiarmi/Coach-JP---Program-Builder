import JSZip from 'jszip'

/** Empaqueta las placas numeradas en un .zip (sin recomprimir: los PNG ya están comprimidos). */
export async function zipFiles(files: { blob: Blob; name: string }[], extras: { name: string; text: string }[] = []) {
  const zip = new JSZip()
  for (const f of files) zip.file(f.name, f.blob)
  for (const e of extras) zip.file(e.name, e.text)
  return zip.generateAsync({ type: 'blob', compression: 'STORE' })
}
