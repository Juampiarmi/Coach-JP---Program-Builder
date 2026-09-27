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

- **5 plantillas**: Métrica Gigante, Comparativa A/B, Gráfico/Telemetría, Sentencia de Texto y
  Manifiesto / Cita Táctica (frase gigante con barra naranja o comillas militares, firma
  opcional y sin cita académica).
- **Generador con IA (BYOK)**: con tu propia API Key de OpenAI (gpt-4o / gpt-4o-mini),
  Anthropic (Claude) o Google Gemini (2.5 Flash por defecto, 2.5 Flash-Lite o 3.8 Flash; si Google está saturado espera 1,5 s, reintenta y, si sigue saturado, pasa solo a Flash-Lite), guardada sólo en tu navegador. Escribís el tema, podés
  marcar un enfoque (`SPORTS & BODYBUILDING` prioriza biomecánica e hipertrofia;
  `CROSSFIT & HYROX` prioriza bioenergética y pacing), elegís Auto, 1 placa, Historias (3) o
  Carrusel (4-5) y la IA completa todos los campos y además escribe el caption de Instagram
  (botón `[ COPIAR CAPTION ]`, que también se puede ver y editar).
- **Secuencias**: se navegan con `[ PLACA 1 | PLACA 2 | … ]`. `[ DESCARGAR TODAS (.ZIP) ]`
  baja las láminas numeradas junto con `caption.txt` en un solo archivo; el botón `N PNG`
  las baja por separado (en el celular, las comparte todas de una vez). El prompt y la validación de la respuesta están en
  `src/lib/ai.ts`.
- **Gráfico simplificado**: se define con mínimo, máximo, unidad, etiqueta y zona óptima en
  texto (`70-90`). Tres modos: curva (pico en zona, sube o cae), barras (etiquetas y valores
  separados por coma) y medidor de umbral (valor actual y umbral).
- **Foto de fondo**: se reduce a 2400 px y se guarda en el navegador. Tiene una capa
  táctica de oscurecimiento ajustable del 30 al 90 % (75 % por defecto), gradiente de
  contraste oscuro arriba y abajo, tratamiento táctico B/N y la opción de placa sólida flotante
  con efecto de vidrio esmerilado. El encuadre se ajusta con zoom (100–160 %) y
  desplazamiento vertical y horizontal (±50 %), con botón para centrar.
- **Legibilidad**: todo el texto del canvas lleva una sombra definida para no fundirse
  con fotos ruidosas.
- **Layout**: alineación vertical del cuerpo (auto, arriba, centro o abajo, siempre dentro
  de la zona segura) y separación entre el titular y el bloque de la plantilla.
- **Formatos**: 4:5 Feed (1080×1350) y 9:16 Story (1080×1920). En Story todo queda dentro
  de la zona segura central de 1080×1420, con 250 px libres arriba y abajo; la vista previa
  muestra esas franjas como guía.
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
│   ├── ai.ts                   prompt de sistema, llamadas a OpenAI/Anthropic, validación del JSON
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
