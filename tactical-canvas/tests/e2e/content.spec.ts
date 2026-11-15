import { expect, test } from '@playwright/test'
import { canvas, doctorScore, isClipped, openApp } from './helpers'

const BACKUP = 'content/coachjp_respaldo_4_carruseles.json'
const NAMES = [
  'Suplementación con Evidencia (Tier A)',
  'Hipertrofia: Tensión Mecánica vs Fatiga Basura',
  'Recomposición Corporal Real (Sin Humo)',
  'Alto Rendimiento: Fuerza Aplicada a Deportes (MTB / Hyrox / CrossFit)',
]

/**
 * Los 4 carruseles de @coachjp.training viajan en el respaldo del repo: se importan por la UI (con su
 * Biblioteca de Papers) y cada uno tiene que dar 100 en el Doctor, sin texto cortado, en 4:5 y 9:16.
 */
test('respaldo de contenido: 4 carruseles con 100 en el Doctor en feed e historias', async ({ page }) => {
  test.setTimeout(240_000)
  await openApp(page, { 'jp-tactical-canvas:panel-tab': { tab: 'export' } })
  await page.getByRole('button', { name: /PROYECTOS/ }).first().click()
  await page.locator('input[type=file][accept*="json"]').setInputFiles(BACKUP)
  await expect(page.getByText('✓ 4 proyectos importados.')).toBeVisible()
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('jp-tactical-canvas:papers') ?? '{"papers":[]}').papers.map((p: { year: number }) => p.year))).toEqual([2018, 2023, 2020, 2014])
  await page.keyboard.press('Escape')

  for (const name of NAMES) {
    await page.getByRole('button', { name: /PROYECTOS/ }).first().click()
    await page.locator(`li[data-project="${name}"]`).getByRole('button', { name: 'ABRIR', exact: true }).click()
    await expect(page.getByRole('tab', { name: 'PLACA 5', exact: true })).toBeVisible()
    for (const aspect of ['feed', 'story'] as const) {
      if (aspect === 'story') await page.getByRole('button', { name: /REMIX 9:16/ }).click()
      for (let i = 1; i <= 5; i++) {
        await page.getByRole('tab', { name: `PLACA ${i}`, exact: true }).click()
        await page.waitForTimeout(300)
        expect(await isClipped(page), `${name} ${aspect} placa ${i}: texto cortado`).toBe(false)
        if (aspect === 'story') expect(await canvas(page).evaluate((el) => el.getBoundingClientRect().height / el.getBoundingClientRect().width)).toBeCloseTo(16 / 9, 1)
      }
      expect(await doctorScore(page), `${name} ${aspect}: doctor`).toBe(100)
    }
    await page.getByRole('button', { name: 'Deshacer' }).click()
  }
})
