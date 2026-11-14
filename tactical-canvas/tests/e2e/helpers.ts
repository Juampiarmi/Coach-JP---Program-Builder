import { expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

/** App limpia en modo canvas, con el estado inicial que se le pase (localStorage). */
export async function openApp(page: Page, storage: Record<string, unknown> = {}) {
  await page.goto('/')
  await page.evaluate((s) => {
    localStorage.clear()
    localStorage.setItem('jp-tactical-canvas:mode', JSON.stringify({ mode: 'canvas' }))
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v))
  }, storage)
  await page.reload()
  await expect(canvas(page)).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
}

/** La placa en resolución nativa (1080 px de ancho). */
export const canvas = (page: Page) => page.locator('div[style*="width: 1080px"]').first()

/** ¿El bloque central se desborda de su caja? (texto cortado) */
export const isClipped = (page: Page) =>
  canvas(page).evaluate((el) => {
    const main = el.querySelector('main')
    const c = main?.firstElementChild
    return Boolean(main && c && c.scrollHeight > main.clientHeight + 2)
  })

/** Exporta la placa con el botón real (PNG 4x) y la devuelve reducida a su tamaño nativo. */
export async function exportedPng(page: Page): Promise<Buffer> {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /DESCARGAR PLACA TÁCTICA/ }).first().click()])
  const b64 = readFileSync((await dl.path())!).toString('base64')
  const small = await page.evaluate(async (src) => {
    const img = new Image()
    img.src = `data:image/png;base64,${src}`
    await img.decode()
    const c = document.createElement('canvas')
    c.width = Math.round(img.width / 4)
    c.height = Math.round(img.height / 4)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/png').split(',')[1]
  }, b64)
  return Buffer.from(small, 'base64')
}

/** Puntaje que muestra el chip del Doctor de retención. */
export const doctorScore = async (page: Page) => Number((await page.locator('button[title^="Doctor"]').innerText()).replace(/\D+/g, ''))
