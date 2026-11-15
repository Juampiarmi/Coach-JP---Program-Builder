import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { openApp } from './helpers'

const KEY = 'jp-tactical-canvas'
const store = (page: Page, key: string) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), `${KEY}:${key}`)

/** Imagen de prueba (PNG generado en el navegador): color liso con un texto. */
async function pngFile(page: Page, color: string, name: string) {
  const b64 = await page.evaluate((c) => {
    const cv = document.createElement('canvas')
    cv.width = 400
    cv.height = 500
    const ctx = cv.getContext('2d')!
    ctx.fillStyle = c
    ctx.fillRect(0, 0, 400, 500)
    return cv.toDataURL('image/png').split(',')[1]
  }, color)
  return { name, mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') }
}

const deckOf = (slides: Record<string, unknown>[], discipline = 'sports') => ({ slides, active: 0, discipline })
const saved = (name: string, slides: Record<string, unknown>[], metrics?: [number, number, number]) => ({
  id: name,
  name,
  deck: deckOf(slides),
  createdAt: 1,
  updatedAt: 2,
  ...(metrics ? { metrics: { saves: metrics[0], shares: metrics[1], reach: metrics[2], loggedAt: 1 } } : {}),
})

test('métricas por proyecto: carga rápida, ranking y Hook Score con historial', async ({ page }) => {
  const carousel = [{ template: 'metric', headlineA: 'EL RIR', headlineB: 'MANDA' }, { template: 'statement' }]
  await openApp(page, {
    [`${KEY}:panel-tab`]: { tab: 'text' },
    [`${KEY}:projects`]: { projects: [saved('Volumen', carousel, [200, 50, 2500]), saved('Cita', [{ template: 'quote', quoteText: 'Sé uno' }], [10, 10, 1000]), saved('Rugby', carousel)] },
  })
  // Con 2 posts medidos el Hook Score todavía no usa historial.
  await expect(page.getByText(/Cargá Guardados, Compartidos y Alcance en 1 proyecto publicado más/)).toBeVisible()

  await page.getByRole('button', { name: /PROYECTOS/ }).first().click()
  const card = page.locator('li[data-project="Rugby"]')
  await card.getByRole('button', { name: '📊 CARGAR MÉTRICAS' }).click()
  await card.getByLabel('Guardados').fill('90')
  await card.getByLabel('Compartidos').fill('30')
  await card.getByLabel('Alcance').fill('2k')
  await expect(card.getByTestId('metrics-form')).toContainText('= 6 % guardados + compartidos')
  await card.getByRole('button', { name: 'GUARDAR', exact: true }).click()
  await expect(card.getByRole('button', { name: /📊 6 % · 90 G · 30 C · 2,0k alc\./ })).toBeVisible()

  const perf = page.getByTestId('performance')
  await expect(perf).toContainText('3 POSTS MEDIDOS · PROMEDIO 6 %')
  await perf.getByRole('button').first().click()
  await expect(perf).toContainText('★ Carrusel')
  await expect(perf).toContainText('EL RIR MANDA')
  await expect.poll(async () => (await store(page, 'projects')).projects.find((p: { name: string }) => p.name === 'Rugby').metrics).toMatchObject({ saves: 90, shares: 30, reach: 2000 })
  await page.keyboard.press('Escape')

  // La portada actual se compara con el historial (3 posts medidos).
  await expect(page.getByTestId('hook-history')).toContainText('TU HISTORIAL (3 POSTS · PROMEDIO 6 %)')
})

test('banco de fotos: subir con etiquetas, usar en la placa, Plan Semanal y respaldo .json', async ({ page }) => {
  page.on('dialog', (d) => d.accept())
  await openApp(page, { [`${KEY}:panel-tab`]: { tab: 'style' } })
  await page.getByRole('button', { name: /Banco de fotos reales/ }).click()
  const bank = page.getByTestId('photo-bank')
  await bank.getByRole('button', { name: 'MTB', exact: true }).click()
  await bank.getByRole('button', { name: 'Fuerza', exact: true }).click()
  await expect(bank.getByRole('button', { name: 'MTB', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(bank.getByRole('button', { name: 'Fuerza', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await bank.getByLabel('Subir fotos al banco').setInputFiles([await pngFile(page, '#3a5f2a', 'mtb.png')])
  await expect(bank).toContainText('✓ 1 foto agregada al banco.')
  await expect(bank.getByRole('button', { name: 'MTB · 1' })).toBeVisible()
  await expect.poll(async () => (await store(page, 'photo-bank'))?.photos.length).toBe(1)
  const photoId = (await store(page, 'photo-bank')).photos[0].id as string

  await bank.locator(`li[data-photo="${photoId}"] button[title^="Usar"]`).click()
  await expect.poll(async () => (await store(page, 'v3'))?.slides[0].bgImageId).toBe(photoId)

  // Plan Semanal: el día de ciclistas (Rønnestad) usa la foto de MTB en lugar del fondo del pack.
  const bar = page.getByRole('group', { name: 'Plan semanal' }).first()
  await bar.getByRole('button', { name: 'MIÉ', exact: true }).click()
  await expect(bar.getByRole('button', { name: 'MIÉ', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(async () => (await store(page, 'v3'))?.slides.filter((s: { template: string }) => s.template !== 'athletic').every((s: { bgImageId: string }) => s.bgImageId === photoId)).toBe(true)
  // El día de mindset (sin disciplina en el tema) no fuerza ninguna foto.
  await bar.getByRole('button', { name: 'JUE', exact: true }).click()
  await expect(bar.getByRole('button', { name: 'JUE', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(async () => (await store(page, 'v3'))?.slides.some((s: { bgImageId: string }) => s.bgImageId === photoId)).toBe(false)

  // Respaldo: viaja el banco con su imagen.
  await page.getByRole('button', { name: /PROYECTOS/ }).first().click()
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /EXPORTAR RESPALDO/ }).click()])
  const backup = JSON.parse(readFileSync((await dl.path())!, 'utf8'))
  expect(backup.version).toBe(2)
  expect(backup.photoBank).toMatchObject([{ id: photoId, disciplines: ['mtb'], kind: 'atleta' }])
  expect(backup.images[photoId]).toMatch(/^data:image\//)
})

test('vista feed 3×3: portada nueva arriba a la izquierda, capturas y lectura de contraste', async ({ page }) => {
  await openApp(page)
  await page.getByRole('button', { name: /VISTA FEED 3×3/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Vista previa en grilla de Instagram' })
  await expect(dialog.getByTestId('feed-cover')).toBeVisible()
  await expect(dialog.getByTestId('grid-verdict')).toContainText('Subí capturas de tus últimos posts')

  const shots = await Promise.all(['#f2efe8', '#efe9df', '#e9e4da', '#f5f1ea'].map((c, i) => pngFile(page, c, `post${i}.png`)))
  await dialog.getByLabel('Subir capturas de los últimos posts').setInputFiles(shots)
  await expect(dialog.locator('[data-feed-post="shot"]')).toHaveCount(4)
  // La portada (carbón) entre posts claros: se despega pero rompe la paleta del feed.
  await expect(dialog.getByTestId('grid-verdict')).toContainText('se despega de sus vecinos')
  await expect(dialog.getByTestId('grid-verdict')).toContainText('Rompe la paleta del feed')

  // El orden de la grilla: portada en la celda 1 y luego las capturas.
  const first = await dialog.getByTestId('feed-grid').locator('> div').first().getAttribute('data-testid')
  expect(first).toBe('feed-cover')

  await dialog.getByRole('button', { name: /GRILLA 1:1/ }).click()
  const box = await dialog.getByTestId('feed-cover').boundingBox()
  expect(Math.round(box!.width)).toBe(Math.round(box!.height))
  await expect.poll(async () => (await store(page, 'feed-grid')).crop).toBe('1:1')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})
