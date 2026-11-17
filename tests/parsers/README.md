# Tests · parsers, Banco de Rutinas y app del alumno

Tabla de casos + runner que prueban **el código real de `index.html`** (se carga en un iframe), sin copias ni mocks. No guarda estado: solo llama funciones y audita los datos que arma la app.

| Archivo | Qué cubre |
|---|---|
| `cases.js` | Parsers del Builder: auto-formato de musculación, WOD / CrossFit, detección de formato, dosis canónica, importador |
| `cases-banco.js` | Banco de Rutinas: estructura y notas de las 12 plantillas Bodybuilding y las 18 Hyrox, ejercicios en la biblioteca, logística de salón, bloques libres (finisher / cardio) |
| `cases-alumno.js` | App del alumno: compila un alumno de prueba con el `compile()` real, lo abre en un iframe y llama a sus funciones públicas; paridad del parser de dosis con el Builder |
| `cases-ia.js` | Generadores de IA del Builder (CrossFit): prevalidación (sin clave, proveedores en pausa, un clic a la vez), botones de tips y de objetivo de la semana con el motor de IA simulado (sin red), resumen semanal y lectura del objetivo en la app del alumno |
| `cases-progresion.js` | Carga sugerida de la semana siguiente (doble progresión con RIR, borradores, referencia por nombre, descarga) con la app del alumno compilada, y sanidad del editor del Builder (ID de día válido, estructura del plan, altas y bajas de días) |
| `cases-estilos.js` | Showroom (4 estilos, fijar el estilo, vista de comparación) y tarjeta de ejercicio de la app del alumno (barra de dosis en tres filas, estilo aplicado al body) |
| `cases-copia.js` | Copia entre alumnos en CrossFit: plan completo (modalidad, 4 semanas, deshacer), semana y día, con alumnos de prueba en memoria |
| `runner.html` | Los adaptadores y la pantalla |

## Correr

Servir la raíz del repo por http (con `file://` el navegador bloquea el iframe) y abrir el runner:

```bash
npx http-server . -p 8765
```

`http://localhost:8765/tests/parsers/runner.html` → resumen arriba (ok / fallan / gaps), filtro "solo fallas y gaps", y botón **Copiar reporte** (markdown con esperado vs actual).
Desde consola: `window.__jpTests` (conteos y fallas). Tarda unos segundos: espera a que la app hidrate las plantillas del sistema y a que arranque la app del alumno.

Por fuera del navegador (sin servidor):

```bash
node tools/build.js --check      # index.html == lo que producen los archivos de src/
node tools/check-alumno.js       # sintaxis de cada JS del alumno + TEMPLATE_HTML coherente
```

## Cómo leer los estados

| Estado | Significado |
|---|---|
| OK | La conducta esperada se cumple hoy |
| FALLA | Regresión: algo que andaba dejó de andar |
| GAP | Conducta esperada que **hoy no se cumple** (bug o decisión pendiente, marcado con `gap: true`). No rompe la corrida |
| YA PASA | Un caso `gap` que se arregló: sacarle el `gap: true` |

## Agregar un caso

Una entrada nueva en el archivo que corresponda con `id`, `area`, `fn`, `input`, `expect` (y `modo` si hace falta). Cada bug real que aparezca se agrega primero como caso, después se arregla.

## Auditoría del Banco (`cases-banco.js`)

Cada día de cada plantilla tiene que cumplir: entrada en calor primero (5+ ejercicios), ejercicio principal de fuerza, 2+ bloques de hipertrofia (1+ en Hyrox), biset o triset, core, cardio o finisher; objetivo fisiológico y 3+ pautas por bloque; foco de 200+ caracteres; volumen mínimo; y ningún biset reemplazado ni separado por la logística de salón (todos los ejercicios de un grupo en la misma estación). Si se agrega o cambia una sesión en `src/coach/banco/`, esta auditoría dice qué falta.

## Fuera de alcance por ahora

- Parsers de CrossFit del alumno que todavía no son públicos (`jpCfFila` y los formatos del HUD): se vuelven testeables al sacarlos de los bloques autoejecutables (siguiente paso de la modularización).
- Funciones atadas al estado `S` / DOM: copiar/duplicar día (`ejecutarCopiaDia`), `jpActivarAlumno`, el orquestador `autoFormatBlock` y el nivel con IA.
