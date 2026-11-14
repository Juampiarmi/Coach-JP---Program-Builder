import { expect, test } from '@playwright/test'
import { canvas, doctorScore, isClipped, openApp } from './helpers'

const DAYS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']

/** Auditoría del plan semanal: los 7 sets sin texto cortado y con 100 en el doctor, en 4:5 y 9:16. */
test('plan semanal: 7 días listos en feed e historias', async ({ page }) => {
  await openApp(page)
  const bar = page.getByRole('group', { name: 'Plan semanal' }).first()
  for (const day of DAYS) {
    await bar.getByRole('button', { name: day, exact: true }).click()
    // El set del día se arma de forma asíncrona (fondo del pack): se espera a que el botón quede activo.
    await expect(bar.getByRole('button', { name: day, exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('tab', { name: 'PLACA 2', exact: true })).toBeVisible()
    const n = await page.getByRole('tab', { name: /^PLACA/ }).count()
    expect(n, `${day}: placas`).toBeGreaterThan(1)
    for (const aspect of ['feed', 'story'] as const) {
      if (aspect === 'story') await page.getByRole('button', { name: /REMIX 9:16/ }).click()
      for (let i = 1; i <= n; i++) {
        await page.getByRole('tab', { name: `PLACA ${i}`, exact: true }).click()
        await page.waitForTimeout(350)
        expect(await isClipped(page), `${day} ${aspect} placa ${i}: texto cortado`).toBe(false)
        if (aspect === 'story') expect(await canvas(page).evaluate((el) => el.getBoundingClientRect().height / el.getBoundingClientRect().width)).toBeCloseTo(16 / 9, 1)
      }
      expect(await doctorScore(page), `${day} ${aspect}: doctor`).toBe(100)
    }
    await page.getByRole('button', { name: '4:5 FEED' }).click()
  }
})
