# Tests de parsers · Coach JP

Tabla de casos (`cases.js`) + runner (`runner.html`) que prueban **el código real de `index.html`** (se carga en un iframe), sin copias ni mocks.
No modifica la app ni guarda estado: solo llama funciones puras (`jpAutoFormat.procesarTexto`, `formatearWod`, `jpDosisCanon`, `parsearImportacion`, `detectarFormatoCF`, `impCampoCoachDeTag`, `impSegundosDeTexto`).

## Correr

Servir la raíz del repo por http (con `file://` el navegador bloquea el iframe) y abrir el runner:

```bash
npx http-server . -p 8765
```

`http://localhost:8765/tests/parsers/runner.html` → resumen arriba (ok / fallan / gaps), filtro "solo fallas y gaps", y botón **Copiar reporte** (markdown con esperado vs actual).
Desde consola: `window.__jpTests` (conteos y fallas).

## Cómo leer los estados

| Estado | Significado |
|---|---|
| OK | La conducta esperada se cumple hoy |
| FALLA | Regresión: algo que andaba dejó de andar |
| GAP | Conducta esperada que **hoy no se cumple** (bug o decisión pendiente, marcado con `gap: true`). No rompe la corrida |
| YA PASA | Un caso `gap` que se arregló: sacarle el `gap: true` |

## Agregar un caso

Una entrada nueva en `cases.js` con `id`, `area`, `fn`, `input`, `expect` (y `modo` si hace falta). Cada bug real que aparezca se agrega primero como caso, después se arregla.

## Fuera de alcance por ahora

- Parsers que viven **dentro de `TEMPLATE_HTML`** (app del alumno: `jpCfFila`, formatos Ladder / Partners / Hybrid / Time Cap en el HUD, cronómetros). Se vuelven testeables al modularizar.
- Funciones atadas al estado `S` / DOM: copiar/duplicar día (`ejecutarCopiaDia`), `jpActivarAlumno`, orquestador `autoFormatBlock` y el nivel 2 con IA.
