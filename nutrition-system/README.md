# Coach JP · High Performance System — Nutrition Command Builder

Plataforma operativa de **bioenergética aplicada y prescripción de macronutrientes asistida por IA** de
[@coachjp.training](https://instagram.com/coachjp.training). El resultado final es una **PWA personalizada
(single-file `index.html`)** instalable en el celular de cada atleta vía GitHub Pages.

Stack: Next.js 15 (App Router, export estático) · TypeScript · Tailwind CSS · Zustand · lucide-react ·
`@anthropic-ai/sdk`.

## Arranque

```bash
cd nutrition-system
npm install
npm run dev        # http://localhost:3000
npm run build      # export estático en ./out (deployable en GitHub Pages)
```

Para publicar el Builder en GitHub Pages bajo `https://usuario.github.io/repo/nutrition/`, compilar con
`NEXT_PUBLIC_BASE_PATH=/repo/nutrition npm run build` y subir `out/`.

Viene precargado un **atleta de prueba** (Hyrox · 82 kg · 15 % graso · Recomposición Agresiva), así que todo
funciona desde el minuto cero sin API key. El botón **DEMO** lo restaura.

## Arquitectura

| Panel | Módulo | Qué hace |
|---|---|---|
| Izquierdo | **IA Prompt Engine** | API key (Claude / Gemini / OpenAI) guardada sólo en `localStorage`, notas brutas del atleta y **COMPILAR PLAN CON IA**: la respuesta JSON rellena todas las pestañas. |
| Izquierdo | **01 · Perfil biológico** | Sexo, peso, % graso, talla, edad, disciplina, fase. BMR Katch-McArdle / Mifflin-St Jeor, TDEE ON/OFF, **EA = (kcal − gasto) / FFM** con alerta RED-S. |
| Izquierdo | **02 · Matriz ON/OFF** | Sliders g/kg con rango de evidencia marcado, balance semanal y proyección kg/sem, **Refeed 48/72 h** y **Diet Break 7-14 d**. |
| Izquierdo | **03 · Ingestas & leucina** | Bloques horarios por día, base de alimentos argentinos con Smart Swaps, **sensor de leucina ≥ 2,7 g** (naranja si falla) y suplementación **AIS Grupo A** con DOI. |
| Derecho | **Simulador** | Celular con notch que renderiza *exactamente* el `index.html` exportado (iframe sandbox + `postMessage`), con switch ON/OFF, checklist y swaps. |
| Derecho | **PWA Deploy** | Generar y copiar / descargar `index.html` (+ `sw.js` opcional para offline total) y guía de deploy en 60 s. |
| Derecho | **Story 9:16** | Placa 1080×1920 PNG para Instagram con kcal ON/OFF, macros, leucina y sello. |

```
src/
├── app/                 layout + página split-screen
├── components/
│   ├── builder/         IntakeTab · ProfileTab · PeriodizationTab · MealsTab
│   ├── deploy/          PhonePreview · ExportTab · StoryTab
│   └── hud/             primitivas HUD (paneles, sliders, segmentados, citas)
├── lib/
│   ├── bioenergetics.ts BMR, TDEE, EA, macros, totales, umbral de leucina
│   ├── foods.ts         base de alimentos argentinos + grupos de equivalencia
│   ├── evidence.ts      bitácora de citas + protocolo AIS Grupo A escalado al peso
│   ├── ai.ts            system prompt, llamadas a proveedores, mapeo JSON → plan
│   ├── exportHtml.ts    generador del index.html autocontenido y del sw.js
│   ├── storyCard.ts     render canvas 1080×1920
│   └── seed.ts          atleta de demostración
├── pwa/                 runtime vanilla JS + CSS de la app del atleta (embebidos inline)
└── store/               Zustand con persistencia en localStorage
```

## La PWA exportada

- Un único archivo (~240 KB): CSS y JS inline, datos del atleta en `<script type="application/json">`.
- Manifest inline como data URI (con iconos PNG embebidos) y, en runtime, reemplazo por un manifest blob con
  `start_url`/`scope` absolutos para que Chrome/Android ofrezca **Instalar**.
- Metas `apple-mobile-web-app-*` + `apple-touch-icon` para **Agregar a inicio** en Safari/iOS.
- Registra `sw.js` si está al lado (offline total); sin él la app funciona igual.
- Estado del atleta (modo ON/OFF, checklist diario, swaps) en `localStorage` de su teléfono.
- Las fuentes vienen de Google Fonts; sin señal caen a `system-ui`.

## Seguridad de la API key

La key se guarda en `localStorage` del navegador del coach y las llamadas van directo del navegador al
proveedor. **Nunca** se incluye en el `index.html` del atleta. Usá una key con límite de gasto y el botón de
papelera para olvidarla en equipos compartidos.
