import { expect, test } from '@playwright/test'
import { openApp } from './helpers'

/** Sin API Key: el generador arma variantes locales al instante (plantillas + Biblioteca de Papers). */
test('modo sin API: variante local instantánea con la Biblioteca de Papers', async ({ page }) => {
  await openApp(page, {
    'jp-tactical-canvas:panel-tab': { tab: 'ai' },
    'jp-tactical-canvas:ai-mode': { mode: 'carousel', discipline: 'sports', sector: 'free', inputMode: 'concept', goal: 'science', tone: 'viral' },
    'jp-tactical-canvas:papers': { exclusive: false, papers: [{ id: 'a', title: 'Mechanisms of muscle hypertrophy', authors: 'Schoenfeld BJ', year: 2010, journal: 'J Strength Cond Res', finding: 'La tensión mecánica es el estímulo central.' }] },
  })
  await page.getByLabel('Concepto').fill('hipertrofia y tensión mecánica')
  const local = page.getByRole('button', { name: /VARIANTE LOCAL · SIN API/ })
  await local.click()
  await expect(page.getByRole('status')).toContainText('VARIANTE LOCAL 1/3 · SIN API · 0 TOKENS · 5 PLACAS')
  const deck = () => page.evaluate(() => JSON.parse(localStorage.getItem('jp-tactical-canvas:v3') ?? 'null'))
  await expect.poll(async () => (await deck())?.slides.length).toBe(5)
  const first = await deck()
  expect(first.slides.some((s: { citeMain: string }) => s.citeMain === 'SCHOENFELD, 2010 · J STRENGTH COND RES')).toBe(true)
  expect(first.slides.at(-1).template).toBe('bookmark')

  await local.click()
  await expect(page.getByRole('status')).toContainText('VARIANTE LOCAL 2/3')
  await expect.poll(async () => (await deck())?.slides[0].headlineA).not.toBe(first.slides[0].headlineA)
})
