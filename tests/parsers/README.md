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
| `cases-copia-plan.js` | Copiar el plan de un alumno a otro con "Duplicar planificación / Clonar plan de otro atleta" (mismo núcleo que "Copiar plan completo"): sin recortar días, 4 semanas de CrossFit, ids propios, ids dañados, ejercicios vetados y deshacer |
| `cases-cruce.js` | Cambio de alumno en el Builder: estado cruzado entre modalidades, día y semana propios de cada alumno, procesos asíncronos de un alumno que no caen en otro, estructuras de días nulas o rotas |
| `cases-elite.js` | Bodybuilding avanzado / élite integrado al Builder: criterios de las 6 plantillas (3, 4 y 5 días · hombres y mujeres), editor estructurado del Banco (swap, series / RIR / descanso, agregar y quitar ejercicios), alertas automáticas, volumen semanal por grupo, asignación al alumno y barra de control del Builder |
| `cases-pedagogia.js` | Bodybuilding 3, 4 y 5 días (hombres y mujeres, intermedio y avanzado): series de aproximación, por qué esa cantidad de series, objetivo de carga y criterios de selección de ejercicios (brazos estirados, remo apoyado, deltoide lateral en frecuencia 2, sin curl femoral sentado para ellas, core variado) |
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

## Dosis por lado, vocabulario, biblioteca e i18n (`cases-i18n.js`)

Adaptador `i18nBib` (runner.html). 12 casos: la dosis de todo ejercicio unilateral dice «por lado» sin inflar el volumen (`uni.*`); el vocabulario es rioplatense, sin «tumbado» ni «espinillas», y los nombres viejos siguen resolviendo por alias (`voc.*`); la biblioteca no tiene nombres repetidos, cubre cada zona y todo el catálogo élite existe y ofrece 3+ swaps, también para alumnas (`lib.*`); el runtime `JP_I18N`/`jpT`, los diccionarios en inglés, las pautas en inglés y los nombres de video siempre en español (`i18n.*`). Un texto nuevo se agrega primero al diccionario (ver `src/shared/i18n/LEEME.md`).

## Voz del timer (`cases-voz.js`)

Adaptador `alumnoVoz` (runner.html): corre la app del alumno con un `AudioContext` simulado (sin sonido ni red) y cuenta qué frase se reproduce y si suena el tono de siempre. 18 casos: voz apagada por defecto, frases del 3-2-1 / arranque / mitad, pistas de transición (descanso, a trabajar, siguiente y última ronda, stop), mute general y respaldo a tonos, idioma, controles (Ajustes y chip del timer), service worker (caché propia `coachjp-voz-v1`), paquete de audio (`voz/manifest.json` + mp3 de cada frase de `tools/voz/frases.json`), paquete incrustado en la app (la voz carga sin red, también desde un `blob:`), layout del HUD Timer, secuencia de voz del timer con reloj simulado (cuenta 3-2-1 + «Go» / «Rest» / «Last round» / «Stop» sin solapes, AMRAP, teléfono bloqueado), pantalla completa con el diseño del HUD y textos `app.voz.*`. Con la voz activa nunca suena el pitido. Para regenerar o verificar el audio: `node tools/voz/generar.js [--check]` (ver `tools/voz/LEEME.md`).

## Fuera de alcance por ahora

- Parsers de CrossFit del alumno que todavía no son públicos (`jpCfFila` y los formatos del HUD): se vuelven testeables al sacarlos de los bloques autoejecutables (siguiente paso de la modularización).
- Funciones atadas al estado `S` / DOM: copiar/duplicar día (`ejecutarCopiaDia`), `jpActivarAlumno`, el orquestador `autoFormatBlock` y el nivel con IA.
