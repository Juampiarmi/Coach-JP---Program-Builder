# Coach JP · High Performance System — Nutrition Command Builder

Plataforma operativa de **bioenergética aplicada y prescripción de macronutrientes asistida por IA** de
[@coachjp.training](https://instagram.com/coachjp.training). El resultado final es una **PWA personalizada
(single-file `index.html`)** instalable en el celular de cada atleta vía GitHub Pages.

Stack: Next.js 15 (App Router, export estático) · TypeScript · Tailwind CSS · Zustand · lucide-react ·
`@anthropic-ai/sdk`.

## Uso sin servidor local: GitHub Pages

El Command Builder se publica solo en GitHub Pages; Coach JP lo abre desde cualquier celular o notebook:

```
https://<usuario>.github.io/<repo>/nutrition/
```

1. **Settings → Pages → Build and deployment → Source: GitHub Actions** (una sola vez).
2. Cada push a `main` corre `.github/workflows/pages.yml`: compila `nutrition-system/` (`npm run build` → `out/`)
   y publica el sitio completo — la app de entrenamiento existente sigue en la raíz y el Builder de nutrición
   en `/nutrition/`. También se puede disparar a mano desde la pestaña **Actions**.

`next.config.mjs` usa `output: 'export'` y un `basePath` adaptativo:

| Contexto | basePath |
|---|---|
| `NEXT_PUBLIC_BASE_PATH` definido | ese valor |
| GitHub Actions | `/<repo>/nutrition` (o `/nutrition` en un repo `<usuario>.github.io`) |
| Local (`npm run dev`, `npx serve out`) | vacío |

## Instalar el Command Builder como app (PWA)

El Builder trae `manifest.webmanifest` (standalone, `#0B0F17`), iconos propios de Nutrition y un Service Worker
(`public/sw.js`) que cachea el app shell para abrir sin señal. Se registra sólo en el build estático.

- **iPhone / iPad:** Safari → Compartir → «Agregar a inicio».
- **Android:** Chrome → menú ⋮ → «Instalar app».
- **Desktop:** Chrome / Edge → ícono de instalar en la barra de direcciones → «Instalar Coach JP Nutrition Builder».

El botón **INSTALAR APP** del header dispara el prompt nativo cuando el navegador lo ofrece; si no (iOS), abre la
guía paso a paso. La PWA exportada del atleta trae lo mismo: manifest embebido (data URI), iconos PNG embebidos,
`sw.js` opcional para modo offline y su propio botón **INSTALAR APP** con guía iPhone / Android.

## Identidad y design system

- **Isotipo Nutrition** (distinto del rayo de Training): hexágono táctico `#0B0F17` con borde cian `#38BDF8`,
  nodos moleculares y llama metabólica naranja `#F97316`. Paths en `src/lib/brand.ts`; PNG en `public/icons/`.
- **Tokens** (`tailwind.config.ts` + `globals.css`): base `#0B0F17 → #0E1420`, superficies `#131B2A`, bordes
  `rgba(255,255,255,.08)`, CTA naranja `#F97316` (hover `#FF5E1E`), datos/evidencia cian `#38BDF8`, alerta
  `#EF4444`, títulos `#FFFFFF`, lectura `#94A3B8`, micro-etiquetas `#64748B`, grid de fondo al 3,5 %.
- **Tipografía:** Inter para UI y titulares; JetBrains Mono con `tabular-nums` para cifras y corchetes.
- **Inputs numéricos:** sin spinners; se escriben y borran libremente (coma o punto) y recalculan en vivo.

## Desarrollo local (opcional)

```bash
cd nutrition-system
npm install
npm run dev        # http://localhost:3000
npm run build      # export estático en ./out
```

Viene precargado un **atleta de prueba** (Hyrox · 82 kg · Recomposición Agresiva), así que todo funciona desde
el minuto cero sin API key. El botón **DEMO** lo restaura.

## Arquitectura

| Panel | Módulo | Qué hace |
|---|---|---|
| Izquierdo | **IA Prompt Engine** | API key (Claude / Gemini / OpenAI) guardada sólo en `localStorage`, notas brutas del atleta y **COMPILAR PLAN CON IA**: la respuesta JSON rellena todas las pestañas. |
| Izquierdo | **01 · Perfil biológico** | **Modo estimación rápida** (peso, altura y tarjetas visuales de grasa corporal, actividad y tipo de sesión) o **modo precisión ISAK** (7 pliegues Jackson-Pollock + Siri, FFM medida, fórmula de BMR y ajuste fino). TDEE ON/OFF y **EA = (kcal − gasto) / FFM** con alerta RED-S. |
| Izquierdo | **02 · Matriz ON/OFF** | Sliders g/kg con rango de evidencia marcado, balance semanal y proyección kg/sem, **Refeed 48/72 h** y **Diet Break 7-14 d**. |
| Izquierdo | **03 · Ingestas & leucina** | Filas legibles: **alimento, porción sugerida (con medida casera) y equivalencias** en un clic; macros/leucina detrás de «Ver detalle técnico». Sensor de proteína (leucina ≥ 2,7 g) y suplementos AIS Grupo A con «Cuánto / Cuándo». |
| Derecho | **Simulador** | Celular con notch que renderiza *exactamente* el `index.html` exportado (iframe sandbox + `postMessage`), sincronizado al instante con el Builder. Si algo falla muestra una tarjeta de error con el mensaje, nunca una pantalla negra. |
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
├── pwa/                 runtime vanilla JS + CSS de la app del atleta como strings TS (embebidos inline;
│                        sin loaders de bundler, así dev y build generan exactamente el mismo HTML)
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
