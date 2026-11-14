import { expect, test } from '@playwright/test'
import { exportedPng, isClipped, openApp } from './helpers'

/** Regresión visual de las plantillas base 01–05 sobre el PNG real exportado. */
for (const template of ['metric', 'compare', 'chart', 'statement', 'manifesto']) {
  test(`plantilla ${template}: PNG exportado idéntico`, async ({ page }) => {
    await openApp(page, { 'jp-tactical-canvas:v3': { slides: [{ template }], active: 0, caption: '' } })
    expect(await isClipped(page)).toBe(false)
    expect(await exportedPng(page)).toMatchSnapshot(`${template}.png`, { maxDiffPixelRatio: 0.002 })
  })
}
