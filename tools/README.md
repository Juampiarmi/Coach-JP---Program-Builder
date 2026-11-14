# tools/ · modularización de index.html

`index.html` (6,5 MB, ~87.000 líneas) ahora se **ensambla** desde `src/`. El archivo publicado sigue siendo uno solo y es **byte por byte idéntico** al de antes: GitHub Pages, el service worker y el modo "abrir el archivo" no cambian.

## Estructura

```
src/
  index.src.html            app del coach (Builder) — todo lo que rodea a TEMPLATE_HTML
  alumno/
    index.html              app del alumno: el contenido del template literal TEMPLATE_HTML, con un @@include por bloque
    css/NNN-*.css           cada <style> de la app del alumno
    js/NNN-*.js             cada <script> de la app del alumno
tools/
  build.js                  src/ → index.html
  split.js                  index.html → src/ (se usó una vez; sirve para re-partir)
```

El orden de los bloques es el orden de los `@@include` en `src/alumno/index.html` (el número del nombre solo acompaña ese orden). **El orden importa**: la cascada de CSS y la inicialización de JS dependen de él.

## Flujo de trabajo

```bash
# editar archivos en src/ ...
node tools/build.js           # regenera index.html
node tools/build.js --check   # falla si index.html no coincide con src/ (no escribe nada)
```

Después, probar y commitear **`src/` e `index.html` juntos**.

> **No editar `index.html` a mano**: el próximo build lo pisa. Si alguien lo hizo, `node tools/split.js` vuelve a partirlo (y `--check` confirma que quedó igual).

## Directivas

`@@include ruta@@` (ruta relativa a `src/`). En una línea propia consume también el salto de línea; en medio de una línea reemplaza solo la directiva. El contenido se copia sin escapar.

## Importante: los archivos del alumno todavía no son JS/CSS "puros"

La app del alumno vive dentro del template literal `TEMPLATE_HTML`, así que sus archivos conservan el escape del literal: barras invertidas dobles (`\\d`, `\\n`), `<\/script>` y los marcadores `{{...}}` que reemplaza `compile()`. Por eso un editor puede marcar falsos errores de sintaxis en `src/alumno/js/*.js`.

El siguiente paso es des-escapar esos archivos (que sean JS real, testeable y linteable) y que `build.js` aplique el escape del literal al incluirlos. La verificación de ese paso no es "byte idéntico" sino "el `TEMPLATE_HTML` evaluado es idéntico".
