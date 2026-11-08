# Hotel GEA · Instagram Content Canvas

Web app / PWA para crear, previsualizar y exportar contenido de Instagram de **Hotel GEA / GEA Suites**:
Stories, Reels (portada), Feed 4:5 y 1:1, y carruseles continuos, con overlays neón dibujados en vivo,
un motor de copys con la voz de la marca y exportación PNG en alta resolución.

```bash
cd gea-canvas
npm install
npm run dev        # http://localhost:3100
npm run build      # export estático en out/ (GitHub Pages → /<repo>/gea/)
```

## Identidad tomada del logo

| Token | Valor | Uso |
|---|---|---|
| `ink` | `#212121` | fondo oficial del logo, placas sólidas |
| `paper` | `#FFFFFF` | isotipo, texto sobre neón |
| `night` | `#121212` | fondo de la app |
| `bone` | `#F3EEE8` | papel cálido (tickets, tags) |
| Rosa neón | `#FF2E88` | acento principal |
| Magenta / Cyan / Ámbar | `#E83CFF` / `#2EF2FF` / `#FFB547` | acentos secundarios y filtros |

**Isotipo**: vectorizado a mano a partir del logo en `src/brand/logo.ts` (trazo monolínea, terminaciones rectas:
G abierta con barra, Ξ con barras biseladas, A en arco con pies hacia adentro). Lo usan el SVG de la UI, el canvas y los íconos PWA, así que el logo exportado es siempre el mismo.

**Tipografías** (auto-alojadas, funcionan offline): Syncopate (display ancha, acompaña la postura horizontal del logo),
Michroma (técnica: tickets, numeración) y Manrope (lectura).

## Estructura

```
src/
├── app/                    layout (fuentes, PWA, metadata) y página única
├── brand/                  tokens de color/tipografía, isotipo vectorial (Path2D + SVG)
├── data/
│   ├── library.ts          9 formatos de overlay, 4 pilares y la biblioteca de frases
│   └── templates.ts        composiciones rápidas ubicadas dentro de las zonas seguras
├── lib/
│   ├── canvas/
│   │   ├── stickers.ts     Visual Overlay Engine: sello, ticket, cinta, tag, píldora, VIP, pestaña, isotipo, titular
│   │   ├── paint.ts        neón (tubo + glow), vidrio ahumado, papel con grano, sombras
│   │   ├── text.ts         ajuste de texto a caja, tracking manual, texto en arco
│   │   ├── render.ts       escena: fondo cover + filtros neón + capas + zonas seguras + selección
│   │   └── export.ts       PNG por slide, sticker recortado con alfa, video con MediaRecorder
│   ├── copy/
│   │   ├── bank.ts         voz de marca: objetivos, direcciones visuales, hooks por tono, CTAs, hashtags
│   │   └── engine.ts       generador de piezas (determinístico por semilla) y grilla semanal
│   ├── media.ts            fotos/videos en IndexedDB (no en localStorage)
│   └── types.ts            modelo: Project → Page (span) → Layer → StickerProps
├── store/studio.ts         Zustand + persist: proyectos, páginas, capas, deshacer/rehacer
└── components/             pizarra, inspector, barra superior y paneles
```

## Cómo funciona

- **Pizarra (Módulo A)**: el canvas trabaja a resolución nativa (1080 × alto) y se escala con CSS. Se arrastra para mover, se escala desde las esquinas, se rota con el punto rosa y en el celular se pellizca con dos dedos. Se pega a los ejes centrales y endereza la rotación cerca de 0° y 90°. Con el anclaje 3×3 el sticker va a una esquina sin pisar la UI de Instagram.
- **Stickers**: cada formato se dibuja en vectores sobre un canvas transparente a 2× (3× al descargarlo). Hay 4 estilos: neón, vidrio, papel y sólido, y 5 acentos. El mismo bitmap sirve para la vista, la exportación y la descarga del sticker recortado en PNG con canal alfa.
- **Copys (Módulo B)**: cada pieza trae objetivo, dirección visual por formato, hook + cuerpo + CTA (sin reservas / por DM) y entre 5 y 8 hashtags. Se elige pilar, tono, formato, objetivo y ocasión (21/9, 14/2, aniversario…), y todo es editable antes de copiar el caption.
- **Carrusel y stories (Módulo C)**: un proyecto tiene varias páginas. En el Feed, una página puede ocupar 2 a 5 slides (`span`) y formar una tira panorámica continua: se exporta cortada en PNG exactos de 1080 px. Las guías muestran las zonas que tapa Instagram en Story, Reel y la grilla 3:4 del perfil.
- **Filtros neón**: Magenta, Cyan noche, Warm amber y Dark mood se arman con modos de fusión de Canvas 2D (`soft-light`, `multiply`, `saturation`, `screen` y viñeta). Por eso funcionan igual en Safari/iOS, donde `ctx.filter` no siempre está disponible.
- **Biblioteca (Módulo D)**: los proyectos se guardan solos en `localStorage` y la media en IndexedDB. Cada proyecto tiene miniatura, estado (borrador / listo / publicado), fecha y hora de publicación con calendario, y respaldo JSON que incluye las fotos.
- **Exportación**: PNG 1080×1920 / 1080×1350 / 1080×1080 por slide. En el celular abre la hoja de compartir para guardarlo directo en Fotos. Si el fondo es un video, se graba con los overlays (MP4 donde el navegador lo soporta, WebM si no).

## Próximos pasos sugeridos

- Publicación programada real: requiere cuenta Business + Instagram Graph API (Content Publishing) desde un backend (Supabase Edge Function) con token de Meta.
- Sincronizar proyectos entre dispositivos con Supabase (las tablas siguen el modelo de `lib/types.ts`).
- Generación de copys con IA usando el banco de voz como *few-shot* y guardrails de tono.
