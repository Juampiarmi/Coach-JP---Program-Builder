# JP Tactical Canvas

PWA para generar placas de Instagram con la identidad Coach JP, sin Canva.
Stack: React 19 + TypeScript + Tailwind CSS v4 + Vite + `html-to-image` + `vite-plugin-pwa`.

## Uso

```bash
cd tactical-canvas
npm install
npm run dev      # http://localhost:5173
npm run build    # genera ../canvas (listo para GitHub Pages)
```

El build sale en la carpeta `canvas/` de la raíz del repo, así que con GitHub Pages
queda en `https://usuario.github.io/repo/canvas/`. Se puede instalar como app y
funciona sin conexión.

## Qué hace

- **4 plantillas**: Métrica Gigante, Comparativa A/B, Gráfico/Telemetría (dispersión o
  curvas, con zona óptima, umbral y marcador vertical) y Sentencia de Texto.
- **Formatos**: 4:5 Feed (1080×1350) y 9:16 Story (1080×1920, con márgenes seguros para
  la UI de Instagram).
- **Exportación**: PNG con `pixelRatio: 3`, o sea 3240×4050 (feed) o 3240×5760 (story).
  En iOS el ratio se ajusta solo para no pasarse del límite de canvas de Safari. En el
  celular también aparece un botón **Compartir** que manda el archivo directo a
  Instagram o WhatsApp.
- **Auto-ajuste**: si el contenido no entra entre el header y el footer, lo achica
  para que nada quede pisado.
- **Titular**: la parte 1 va en blanco y la parte 2 en naranja. `*palabra*` invierte el
  color de esa palabra.
- **Fuentes empaquetadas localmente** (`@fontsource`), así la exportación siempre
  incrusta las fuentes correctas, incluso sin conexión.
- Guarda solo en `localStorage`.

## Estructura

```
src/
├── App.tsx                     layout (sidebar en desktop / panel plegable en móvil)
├── defaults.ts                 estado inicial, ejemplos por plantilla, presets de gráfico
├── types.ts
├── lib/
│   ├── brand.ts                paleta, fuentes, formatos, presets de tags
│   ├── chart.ts                parseo de series, normalización, curvas suaves
│   └── exporter.ts             html-to-image 3x, descarga, Web Share
├── hooks/                      usePersistentState, useFitScale, useMediaQuery
└── components/
    ├── canvas/                 la placa (1080 px de ancho nativo)
    │   ├── TacticalCanvas.tsx  header + plantilla + footer + auto-ajuste
    │   ├── templates/          Metric · Compare · Chart · Statement
    │   └── charts/             TelemetryChart (SVG puro)
    ├── controls/               formulario y primitivas
    ├── ExportButtons.tsx
    └── Preview.tsx             escala la placa con transform para que entre en pantalla
```
