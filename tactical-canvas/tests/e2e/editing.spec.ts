import { expect, test } from '@playwright/test'
import { openApp } from './helpers'

const deck = (page: import('@playwright/test').Page) => page.evaluate(() => JSON.parse(localStorage.getItem('jp-tactical-canvas:v3') ?? 'null'))
const library = (page: import('@playwright/test').Page) => page.evaluate(() => JSON.parse(localStorage.getItem('jp-tactical-canvas:projects') ?? '{"projects":[]}').projects)

test.beforeEach(async ({ page }) => {
  page.on('dialog', (d) => d.accept())
  await openApp(page, { 'jp-tactical-canvas:panel-tab': { tab: 'text' } })
})

test('deshacer / rehacer', async ({ page }) => {
  const field = page.locator('aside textarea').first()
  const before = await field.inputValue()
  await field.fill('PRUEBA DE DESHACER')
  await page.waitForTimeout(900)
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(field).toHaveValue(before)
  await page.getByRole('button', { name: 'Rehacer' }).click()
  await expect(field).toHaveValue('PRUEBA DE DESHACER')
})

test('biblioteca: guardar, autoguardar, borrador automático y persistencia', async ({ page }) => {
  const field = page.locator('aside textarea').first()
  await field.fill('RUGBY: CONTACTO REPETIDO')
  await page.getByRole('button', { name: /SIN GUARDAR/ }).first().click()
  await page.getByPlaceholder(/Nombre del proyecto/).fill('Rugby pretemporada')
  await page.getByRole('button', { name: 'GUARDAR', exact: true }).click()
  await page.keyboard.press('Escape')
  await field.fill('RUGBY: 80 CONTACTOS')
  await expect.poll(async () => (await library(page))[0]?.deck.slides[0].headlineA).toBe('RUGBY: 80 CONTACTOS')

  // set nuevo + trabajo suelto → al abrir el proyecto, el trabajo suelto queda como borrador
  await page.getByRole('button', { name: /PROYECTOS/ }).first().click()
  await page.getByRole('button', { name: /SET NUEVO/ }).click()
  await field.fill('IDEA SUELTA')
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: /PROYECTOS/ }).first().click()
  await page.locator('li[data-project="Rugby pretemporada"]').getByRole('button', { name: 'ABRIR', exact: true }).click()
  await expect.poll(async () => (await deck(page)).slides[0].headlineA).toBe('RUGBY: 80 CONTACTOS')
  await expect.poll(async () => (await library(page)).map((p: { draft?: boolean; name: string }) => (p.draft ? 'draft' : p.name)).sort()).toEqual(['Rugby pretemporada', 'draft'])

  await page.reload()
  await expect.poll(async () => (await library(page)).length).toBe(2)
})
