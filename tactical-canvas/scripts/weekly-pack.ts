/**
 * Genera /public/assets/weekly_pack/ a partir de src/lib/weeklyPack.ts (única fuente de verdad):
 * una carpeta por día con referencia.md (paper, prompt, estructura y caption), un fondo táctico SVG
 * 1080×1350 listo para subir como foto de fondo y la carpeta fotos/ para las imágenes propias.
 *
 *   npm run weekly-pack
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { WEEKLY_PACK, type WeeklyDay } from '../src/lib/weeklyPack'

const ROOT = join(import.meta.dirname, '..', 'public', 'assets', 'weekly_pack')

/** Fondo táctico: carbón con grilla blueprint, anillos concéntricos y el código del día en marca de agua. */
function background(d: WeeklyDay, i: number) {
  const W = 1080
  const H = 1350
  const grid: string[] = []
  for (let x = 0; x <= W; x += 54) grid.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#1E2638" stroke-width="${x % 270 === 0 ? 1.6 : 0.7}"/>`)
  for (let y = 0; y <= H; y += 54) grid.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#1E2638" stroke-width="${y % 270 === 0 ? 1.6 : 0.7}"/>`)
  const cx = i % 2 ? 860 : 220
  const cy = 1040
  const rings = [140, 230, 330, 450, 590].map((r, k) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#F97316" stroke-opacity="${0.22 - k * 0.035}" stroke-width="${k === 1 ? 3 : 1.4}" ${k === 3 ? 'stroke-dasharray="6 10"' : ''}/>`)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="${cx / W}" cy="${cy / H}" r="0.75">
      <stop offset="0" stop-color="#1A2230"/>
      <stop offset="1" stop-color="#0B0E14"/>
    </radialGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0B0E14" stop-opacity="0.85"/>
      <stop offset="0.45" stop-color="#0B0E14" stop-opacity="0.2"/>
      <stop offset="1" stop-color="#0B0E14" stop-opacity="0.7"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <g>${grid.join('')}</g>
  <g>${rings.join('')}</g>
  <line x1="${cx - 640}" y1="${cy}" x2="${cx + 640}" y2="${cy}" stroke="#38BDF8" stroke-opacity="0.18" stroke-width="1.2"/>
  <line x1="${cx}" y1="${cy - 640}" x2="${cx}" y2="${cy + 640}" stroke="#38BDF8" stroke-opacity="0.18" stroke-width="1.2"/>
  <text x="${i % 2 ? 60 : W - 60}" y="${H - 70}" text-anchor="${i % 2 ? 'start' : 'end'}" font-family="IBM Plex Mono, monospace" font-weight="700" font-size="260" fill="#FFFFFF" fill-opacity="0.04" letter-spacing="10">${d.day}</text>
  <rect width="${W}" height="${H}" fill="url(#fade)"/>
</svg>
`
}

function reference(d: WeeklyDay) {
  return `# ${d.day} · ${d.pillar}

**Tema:** ${d.theme}
**Estructura:** ${d.structure} (${d.format === 'single' ? '1 placa' : 'carrusel continuo'})
**Objetivo / tono IA:** ${d.goal} · ${d.tone}

## Paper de respaldo

- **Cita en placa:** ${d.ref.cite}
- **Título:** ${d.ref.title}
- **Hallazgo (redacción conservadora):** ${d.ref.finding}

> Abrí el paper (PubMed / Google Scholar) y confirmá año, revista y hallazgo antes de publicar.

## Prompt del día (Generador IA · modo brief)

${d.prompt}

## Caption precargado

${d.caption}

## Fotos

Guardá en \`fotos/\` las imágenes propias para este día (atleta, gimnasio, técnica). El fondo
\`fondo-tactico.svg\` se puede subir tal cual desde «03 · Fondo» de la app.
`
}

mkdirSync(ROOT, { recursive: true })
WEEKLY_PACK.forEach((d, i) => {
  const dir = join(ROOT, d.folder)
  mkdirSync(join(dir, 'fotos'), { recursive: true })
  writeFileSync(join(dir, 'referencia.md'), reference(d))
  writeFileSync(join(dir, 'fondo-tactico.svg'), background(d, i))
  if (!existsSync(join(dir, 'fotos', '.gitkeep'))) writeFileSync(join(dir, 'fotos', '.gitkeep'), '')
})
writeFileSync(
  join(ROOT, 'manifest.json'),
  JSON.stringify(
    WEEKLY_PACK.map((d) => ({ day: d.day, folder: d.folder, pillar: d.pillar, theme: d.theme, format: d.format, structure: d.structure, reference: d.ref })),
    null,
    2,
  ) + '\n',
)
writeFileSync(
  join(ROOT, 'README.md'),
  `# Weekly pack · Coach JP

Plan semanal de contenido (papers & trends). La fuente de verdad es \`src/lib/weeklyPack.ts\`:
esta carpeta se regenera con \`npm run weekly-pack\`.

| Día | Pilar | Tema | Paper |
| --- | --- | --- | --- |
${WEEKLY_PACK.map((d) => `| ${d.day} | ${d.pillar} | ${d.theme} | ${d.ref.cite} |`).join('\n')}

Cada carpeta trae:
- \`referencia.md\`: paper, hallazgo, prompt del día y caption.
- \`fondo-tactico.svg\`: fondo 1080×1350 para subir como foto de fondo.
- \`fotos/\`: tus imágenes para ese día.

En la app: Generador IA → «▦ Plan semanal» → elegí el día → [ CARGAR SET LISTO ] o [ GENERAR CON IA ].
`,
)
console.log(`weekly_pack: ${WEEKLY_PACK.length} días en ${ROOT}`)
