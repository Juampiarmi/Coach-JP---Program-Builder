import { expect, test } from '@playwright/test'
import { canvas, openApp } from './helpers'

/** Estudio limpio: barra superior en una fila, 3 pestañas, formulario contextual y click-to-focus. */
test('estudio: una sola fila de herramientas, 3 pestañas y guías agrupadas', async ({ page }) => {
  await openApp(page)
  await expect(page.getByRole('tablist', { name: 'Módulos del panel' }).getByRole('tab')).toHaveText([/CONTENIDO/, /DISEÑO & FOTO/, /CARRUSEL & CAPTION/])
  // El generador ya no ocupa el panel: vive en «+ CREAR».
  await expect(page.getByText('[ 00 · GENERADOR IA ]')).toBeHidden()
  // Barra superior: todo en una fila (misma altura de centro para formato, guías, doctor y exportar).
  const ys = await Promise.all(
    [page.getByRole('button', { name: /PROYECTOS/ }).first(), page.getByRole('button', { name: '4:5 FEED' }), page.getByRole('button', { name: 'Guías' }), page.locator('button[title^="Doctor"]'), page.getByRole('button', { name: 'Exportar' })].map(async (l) => {
      const b = (await l.boundingBox())!
      return Math.round(b.y + b.height / 2)
    }),
  )
  expect(Math.max(...ys) - Math.min(...ys)).toBeLessThanOrEqual(4)
  // Guías agrupadas en un menú con interruptores.
  await page.getByRole('button', { name: 'Guías' }).click()
  await page.getByRole('menuitemcheckbox', { name: /CONTADOR 01\/05/ }).click()
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('jp-tactical-canvas:v3') ?? 'null')?.slides[0].slideCounter)).toBe(true)
})

test('formulario contextual: sólo los campos de la plantilla y aviso de texto heredado', async ({ page }) => {
  await openApp(page, {
    'jp-tactical-canvas:v3': { slides: [{ template: 'bookmark', body: '', dataChips: [] }], active: 0 },
  })
  // Guardado: titular, viñetas y CTA; sin bajada ni cajas de datos.
  await expect(page.getByLabel('Titular · blanco')).toBeVisible()
  await expect(page.getByLabel(/^Bajada/)).toHaveCount(0)
  await expect(page.getByLabel(/^Datos clave/)).toHaveCount(0)
  await expect(page.getByLabel('Llamado a la acción')).toBeVisible()

  // Sentencia con remate de barra: aviso claro y QUITAR.
  await openApp(page, { 'jp-tactical-canvas:v3': { slides: [{ template: 'statement', kicker: 'EL MÉTODO NO SE NEGOCIA.' }], active: 0 } })
  await expect(page.getByTestId('kicker-active')).toContainText('suma 5 palabras al Doctor')
  await page.getByTestId('kicker-active').getByRole('button', { name: 'QUITAR' }).click()
  await expect(page.getByTestId('kicker-active')).toHaveCount(0)

  // Checklist con cajas heredadas que se ven en la placa: aparecen con aviso para quitarlas.
  await openApp(page, { 'jp-tactical-canvas:v3': { slides: [{ template: 'checklist', dataChips: ['RIR 1-2'] }], active: 0 } })
  await expect(page.getByLabel(/^Datos clave · heredados/)).toHaveValue('RIR 1-2')
  await page.getByText('Estas cajas vienen de otra plantilla').locator('..').getByRole('button', { name: 'QUITAR' }).click()
  await expect(page.getByLabel(/^Datos clave/)).toHaveCount(0)
})

test('click-to-focus: titular, fuente y fondo abren su campo', async ({ page }) => {
  await openApp(page, { 'jp-tactical-canvas:panel-tab': { tab: 'export' } })
  const focused = () => page.evaluate(() => document.activeElement?.getAttribute('data-field'))
  const titular = (await page.locator('[data-part="titular"]').first().boundingBox())!
  await page.mouse.click(titular.x + 10, titular.y + titular.height / 2)
  await expect.poll(focused).toBe('headlineA')
  await expect(page.getByRole('tab', { name: /CONTENIDO/ })).toHaveAttribute('aria-selected', 'true')

  const cite = (await page.locator('[data-part="cite"]').first().boundingBox())!
  await page.mouse.click(cite.x + 10, cite.y + cite.height / 2)
  await expect.poll(focused).toBe('cite')

  const box = (await canvas(page).boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.97)
  await expect.poll(focused).toBe('bg')
  await expect(page.getByRole('tab', { name: /DISEÑO & FOTO/ })).toHaveAttribute('aria-selected', 'true')
})
