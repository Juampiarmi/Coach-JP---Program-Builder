import { expect, test } from '@playwright/test'
import { doctorScore, openApp, PAPER_APIS } from './helpers'

/** Crossref simulado: sólo existe el paper de Hall 2012 en The Lancet. */
const HALL = {
  DOI: '10.1016/S0140-6736(11)60812-X',
  title: ['Quantification of the effect of energy imbalance on bodyweight'],
  author: [{ family: 'Hall', sequence: 'first' }, { family: 'Sacks' }],
  'container-title': ['The Lancet'],
  issued: { 'date-parts': [[2011, 8]] },
  'published-print': { 'date-parts': [[2011, 8]] },
}

test.beforeEach(async ({ page }) => {
  await openApp(page, { 'jp-tactical-canvas:panel-tab': { tab: 'text' } })
  await page.route(PAPER_APIS, (r) => {
    const url = r.request().url()
    const hall = /query\.author=hall/i.test(url)
    if (url.includes('crossref')) return r.fulfill({ json: { message: { items: hall ? [HALL] : [] } } })
    if (url.includes('esearch')) return r.fulfill({ json: { esearchresult: { idlist: [] } } })
    return r.fulfill({ json: { result: { uids: [] } } })
  })
  await page.reload()
  await page.getByRole('button', { name: /Fuente científica/ }).click()
})

/** El Doctor vive en la pestaña Exportar: se mira ahí y se vuelve a Texto. */
async function doctorSays(page: import('@playwright/test').Page, rx: RegExp, count: number) {
  await page.getByRole('tab', { name: /EXPORTAR/ }).click()
  await expect(page.getByText(rx)).toHaveCount(count)
  await page.getByRole('tab', { name: /TEXTO/ }).click()
  if (!(await citeInput(page).isVisible())) await page.getByRole('button', { name: /Fuente científica/ }).click()
}

const citeInput = (page: import('@playwright/test').Page) => page.getByPlaceholder('AUTOR Y COL., AÑO · REVISTA')

test('cita verificada, inconsistente y no encontrada (badge + Doctor)', async ({ page }) => {
  // La cita de ejemplo dice 2012: Crossref tiene el paper en 2011 → inconsistencia con corrección.
  await expect(page.locator('[data-paper-status="mismatch"]')).toContainText('el año publicado es 2011, no 2012')
  await doctorSays(page, /CITA SIN VERIFICAR en la placa 1: datos inconsistentes/, 1)
  const base = await doctorScore(page)
  await page.locator('[data-paper-status="mismatch"]').getByRole('button', { name: /CORREGIR A/ }).click()
  await expect(citeInput(page)).toHaveValue('HALL Y COL., 2011 · THE LANCET')
  await expect(page.locator('[data-paper-status="verified"]')).toContainText('✓ PAPER VERIFICADO')
  await doctorSays(page, /CITA SIN VERIFICAR/, 0)
  const verifiedScore = await doctorScore(page)
  expect(verifiedScore).toBe(base + 7)

  await citeInput(page).fill('PEREZ Y COL., 2021 · J STRENGTH COND RES')
  await expect(page.locator('[data-paper-status="notfound"]')).toContainText('⚠ CITA SIN VERIFICAR')
  await doctorSays(page, /⚠ CITA SIN VERIFICAR en la placa 1$/, 1)
  expect(await doctorScore(page)).toBe(verifiedScore - 7)

  // Una fuente que no es un paper (sin año) no se verifica.
  await citeInput(page).fill('MARCO AURELIO · MEDITACIONES')
  await expect(page.locator('[data-paper-status]')).toHaveCount(0)
})

test('biblioteca de papers propios: carga manual, uso en la placa y modo exclusivo', async ({ page }) => {
  await page.getByRole('button', { name: /Biblioteca de papers propios/ }).click()
  const lib = page.getByTestId('paper-library')
  await lib.getByRole('button', { name: '+ CARGAR A MANO' }).click()
  await lib.getByPlaceholder('Título del paper').fill('The mechanisms of muscle hypertrophy')
  await lib.getByPlaceholder(/^Autores/).fill('Schoenfeld BJ')
  await lib.getByPlaceholder('Año').fill('2010')
  await lib.getByPlaceholder(/^Revista/).fill('J Strength Cond Res')
  await lib.getByPlaceholder('Hallazgo en 1 línea').fill('La tensión mecánica es el estímulo central.')
  await lib.getByRole('button', { name: 'GUARDAR PAPER' }).click()
  await lib.getByRole('button', { name: 'USAR EN ESTA PLACA' }).click()
  await expect(citeInput(page)).toHaveValue('SCHOENFELD, 2010 · J STRENGTH COND RES')
  await expect(lib.getByRole('button', { name: '✓ EN ESTA PLACA' })).toBeVisible()

  await lib.getByRole('switch', { name: /La IA cita sólo de mi biblioteca/ }).click()
  await expect(lib).toContainText('citan sólo estos 1 papers')
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('jp-tactical-canvas:papers') ?? '{}')))
    .toMatchObject({ exclusive: true, papers: [{ authors: 'Schoenfeld BJ', year: 2010 }] })

  await lib.getByRole('button', { name: '+ PAPERS DEL PLAN SEMANAL' }).click()
  await expect(lib.locator('li')).toHaveCount(7)
})
