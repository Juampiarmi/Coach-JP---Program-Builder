import { expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

/** APIs públicas del verificador de papers */
export const PAPER_APIS = /api\.crossref\.org|eutils\.ncbi\.nlm\.nih\.gov/

/** App limpia en modo canvas, con el estado inicial que se le pase (localStorage). */
export async function openApp(page: Page, storage: Record<string, unknown> = {}) {
  // Crossref / PubMed nunca se consultan de verdad en los tests: por defecto «sin servicio» (el
  // verificador queda en error y no suma alertas); cada spec puede registrar sus respuestas.
  await page.route(PAPER_APIS, (r) => r.fulfill({ status: 503, body: '{}' }))
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
  // ⬇ Exportar es un menú en la barra superior: se abre y se elige el PNG 4K de la placa activa.
  await page.getByRole('button', { name: 'Exportar' }).click()
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /DESCARGAR PLACA TÁCTICA/ }).click()])
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

const DAY_ID: Record<string, string> = { LUN: 'lun', MAR: 'mar', 'MIÉ': 'mie', JUE: 'jue', VIE: 'vie', 'SÁB': 'sab', DOM: 'dom' }

/** Modo Crear: abre «+ CREAR», elige el día en el Plan Semanal y carga el set listo (el drawer se cierra solo). */
export async function loadDay(page: Page, day: string) {
  await page.getByRole('button', { name: '+ CREAR', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: 'Crear · Plan semanal e IA' })
  await drawer.getByRole('tab', { name: /PLAN SEMANAL/ }).click()
  await drawer.getByRole('button', { name: day, exact: true }).click()
  await drawer.getByRole('button', { name: /CARGAR SET LISTO/ }).click()
  await expect(drawer).toBeHidden()
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('jp-tactical-canvas:v3') ?? 'null')?.packDay)).toBe(DAY_ID[day])
}

/** Remix 9:16: vive en la pestaña 03 · Carrusel & Caption. */
export async function remix(page: Page) {
  const tab = page.getByRole('tab', { name: /CARRUSEL & CAPTION/ })
  if ((await tab.getAttribute('aria-selected')) !== 'true') await tab.click()
  await page.getByRole('button', { name: /REMIX 9:16/ }).click()
}
