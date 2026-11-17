# tools/ · modularización de index.html

`index.html` (6,6 MB, ~88.000 líneas) se **ensambla** desde `src/`. El archivo publicado sigue siendo uno solo: GitHub Pages, el service worker y el modo "abrir el archivo" no cambian.

## Estructura

```
src/
  index.src.html            app del coach (Builder): todo lo que rodea a TEMPLATE_HTML
  coach/banco/              plantillas del sistema del Banco de Rutinas (JS real, sin escapes)
    10-motor-textos.js      conocimiento por patrón, notas por rol, entrada en calor y generador de bloques
    11-finishers.js         finishers metabólicos y cardio (bloques libres)
    12-dias-masculino.js    sesiones Bodybuilding masculinas + matriz de frecuencias
    13-dias-femenino.js     sesiones Bodybuilding femeninas + matriz de frecuencias
    14-dias-hyrox.js        sesiones Hyrox (5 sesiones x 3 niveles x hombre/mujer)
    20-armado.js            cruza sesiones y niveles, redacta el texto y lo pasa por el importador
  shared/
    tarjeta-ejercicio.css   CSS de los 4 estilos de tarjeta de ejercicio (lo usan la app del alumno, el Builder y el Showroom); los selectores "@est(N)" los expande tools/estilos.js
  alumno/
    index.html              app del alumno: el documento que recibe el alumno, con un @@include por bloque
    css/NNN-*.css           cada <style> (CSS real)
    js/NNN-*.js             cada <script> (JS real: se puede analizar, probar y linteaar)
tools/
  build.js                  src/ → index.html
  estilos.js                expande los selectores "@est(N)" de los CSS de estilos (directiva @@estilo)
  check-alumno.js           controles de la app del alumno (sintaxis de cada JS, TEMPLATE_HTML idéntico)
  split.js                  index.html → src/ (paso 1; sirve para re-partir si alguien edita index.html a mano)
  desescapar.js             paso 2 (ya aplicado): pasó los archivos de src/alumno/ de "texto del template literal" a JS/CSS real
```

El orden de los bloques es el orden de los `@@include` en `src/alumno/index.html` (el número del nombre solo acompaña ese orden). **El orden importa**: la cascada de CSS y la inicialización de JS dependen de él.

## Flujo de trabajo

```bash
# editar archivos en src/ ...
node tools/build.js            # regenera index.html
node tools/build.js --check    # falla si index.html no coincide con src/ (no escribe nada)
node tools/check-alumno.js     # sintaxis de cada JS del alumno + TEMPLATE_HTML coherente + la sesión de audio nunca es 'playback'
```

Después, probar (`tests/parsers/runner.html`) y commitear **`src/` e `index.html` juntos**.

> **No editar `index.html` a mano**: el próximo build lo pisa. Si alguien lo hizo, `node tools/split.js` vuelve a partirlo (el resultado queda con el escape viejo: correr después `node tools/desescapar.js`).

## Directivas

- `@@include ruta@@` (ruta relativa a `src/`): copia el archivo tal cual. En una línea propia consume también el salto de línea; en medio de una línea reemplaza solo la directiva.
- `@@template ruta@@`: igual, pero el resultado completo se **escapa para un template literal** (`\` → `\\`, `` ` `` → `` \` ``, `${` → `\${`, `</script` → `<\/script`). Se usa una sola vez: `const TEMPLATE_HTML = \`@@template alumno/index.html@@\`;`

- `@@estilo ruta@@`: incluye un CSS de estilos de tarjeta con los selectores `@est(N)` expandidos (`@est(2) .x{}` → `html body:not(#_):not(#__)[data-jp-estilo="2"] .x, html body:not(#_):not(#__) [data-jp-estilo="2"] .x{}`; `@est .x{}` vale para cualquier estilo). El prefijo da la especificidad necesaria para ganarle a las capas viejas con `!important` de la app del alumno; el atributo `data-jp-estilo` vive en el `<body>` del alumno o en el contenedor de la vista previa del Showroom.

## La app del alumno ya es JS y CSS real

`TEMPLATE_HTML` es el documento que `compile()` completa con los datos de cada alumno y exporta. Antes sus archivos conservaban el escape del literal (barras dobles, `<\/script>`); ahora **no**: lo que ves en `src/alumno/js/*.js` es exactamente lo que ejecuta el navegador del alumno, y el build agrega el escape al ensamblar.

- Los marcadores `{{...}}` (los reemplaza `compile()`) siguen en el código: `check-alumno.js` los trata como `null` para analizar la sintaxis. Ejemplo: `const PROGRAM_CONFIG = {{PROGRAM_CONFIG_JSON}};`.
- No usar `${` ni backticks en los archivos nuevos del alumno sin pensar el escape: el build los escapa bien, pero conviene revisar con `check-alumno.js`.
- Equivalencia: el paso 2 se verificó comparando el `TEMPLATE_HTML` evaluado antes y después (2.795.287 caracteres, idéntico). Para volver a comprobar un cambio contra otra versión: `node tools/check-alumno.js --contra HEAD` (o un archivo `index.html`).

## Qué sigue

Los parsers del alumno (`jpCfFila`, formatos Ladder / Partners / Hybrid / Time Cap, cronómetros) viven en esos archivos como JS normal: el siguiente paso es sacarlos de los bloques `<script>` autoejecutables a módulos que se puedan cargar en `tests/parsers/runner.html` y sumarles casos. Después, partir el coach (`src/index.src.html`, todavía de ~51.000 líneas) por bloques.
