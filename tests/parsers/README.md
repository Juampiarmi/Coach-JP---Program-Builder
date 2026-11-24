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

## Vista del entrenamiento y pantalla completa (`cases-vista.js`)

Adaptador `alumnoVista` (runner.html): inserta piezas de muestra en la app del alumno y las mide con `getComputedStyle` (alineación de márgenes, subtítulos naranja, desplegable de pautas, encabezado de cardio, deduplicado de videos, firma, menú de Perfil con temporizadores simulados y colores de la pantalla completa del timer por fase). 8 casos.

## Pulido fino y datos reales de la Story Card (`cases-pulido.js`)

Adaptador `alumnoPulido` (runner.html): inserta piezas con la misma estructura que las reales y las mide con `getComputedStyle`. 12 casos (los últimos tres: escudo del header sin recuadro, timer chico con descanso en cyan y ronda sin pastilla, sin filetes sobre las cajas del día en Sports y CrossFit; `vista.07` y `voz.18` miran además el reloj en cyan en descanso, «RONDA n / N» sin pastilla y el escudo de fondo dorado). Los primeros 9: esquinas y bordes nítidos (sin desenfoque anidado, barra de color de la tarjeta recortada por la esquina, radios hermanos), marca «COACH» y «JP» del mismo tamaño, «Pautas técnicas» alineada con las filas de adentro, selectores con el elegido en naranja (y «OFF» gris), controles de voz en una tarjeta con guía es/en, «Pausar sesión» a ancho completo y margen inferior del panel, explicación del mesociclo partida en puntos, tarjetas de semana (badge en la primera línea, pico y descarga distintos), pestañas de la Guía con íconos de línea. El caso `pulido.09` carga series de prueba en el estado de la app, compara lo que recibe la Story Card contra la suma hecha a mano (tonelaje, series, repeticiones, tiempo solo medido, latido pasivo, «sesión N de M», RPE, PR de CrossFit solo de hoy y volumen prescripto solo de bloques hechos) y devuelve el estado como estaba.

## Timer en segundo plano (`cases-segundo-plano.js`)

Adaptador `alumnoFondo` (runner.html): reloj simulado sobre la app del alumno. 6 casos: cronograma de transiciones del timer (Tabata, EMOM, AMRAP) con su hora y su texto, entrega del cronograma al service worker al pasar a segundo plano (`visibilitychange`), cola del SW (`jpPlanFases`, tope de 60 min) y su código, aviso «Mantené la pantalla encendida» en iPhone / iPad (una sola vez, nunca en escritorio) y textos `app.notif.*` / `app.aviso.*`. Los avisos del sistema con el teléfono bloqueado son mejor esfuerzo: el navegador puede dormir el service worker (más en iPhone); eso no se puede testear.

## Versión de la sesión, notas compactas y plan de cargas (`cases-version.js`)

Adaptador `alumnoVersion` (runner.html): app del alumno compilada (420 px) y, para los valores por defecto del Banco, el Builder real. 6 casos: selector «ESTÁNDAR · 60 MIN» / «EXTENDIDA · 90 MIN» en el día de Sports (textos exactos, sin «Core», activo en naranja, mismo interruptor en el Perfil), bloques visibles y «día completo» según la versión, registros intactos al cambiar de versión, valores por defecto del Banco (core, finisher, cardio y cierre metabólico = solo extendida; Hyrox: intervalos y estaciones en la estándar), notas del ejercicio en una sola fila de botones (Tips · Objetivo · Tempo, de a una por vez, idempotente) y plan de cargas semana a semana con el peso real registrado (S1 hecho, S2 sugerida, S3 pico, S4 descarga, ajuste por RIR marcado).

## Bordes únicos, firma y tips del Builder en formato Banco (`cases-tips-bordes.js`)

Mismo adaptador `alumnoVersion`. 9 casos (`tips.04`: tips con IA completos y con profundidad) (el último, `header.01`: escudo con aire y centro óptico, «ACTIVO» sobrio, nombre estilo ficha con disciplina · nivel, y «…», SEM y DÍA con el mismo contorno y márgenes): contorno único de «Pautas técnicas & tips del bloque» y «Criterio del día» (sin filete recto sobre la esquina redondeada), fila de notas del ejercicio con rótulo «NOTAS» y botón «COACHING» (sin «TIPS» suelto, sin íconos, en una línea), firma de la programación con el nombre una sola vez (también en planes guardados con el nombre repetido; el dato guardado no se toca) y un solo acento de color, y los generadores de tips del Builder (`CoachAuto.tipsBanco` / `normalizarTips` / `tipsAlCambiarEjercicio`) en el formato del Banco: SET-UP · CUE EFICIENTE · CUIDADO / ERROR COMÚN, con código de estación en bisets y respetando las notas editadas a mano.

## Planificaciones femeninas (`cases-femenino.js`)

Adaptador `bancoFemenino` (runner.html): arma las plantillas del sistema con el código real y mide las series efectivas por grupo con el mismo cálculo que el panel de volumen del Builder (`PB.EST.volumen`, que ahora cuenta las pirámides de un básico sin la serie de aclimatación). El caso `bis.01` verifica la lógica de series rectas en fuerza y bisets en hipertrofia de todo el Banco (`PB.agruparHipertrofia`). Los casos `bis.02` y `bis.03` verifican la regla anti-colisión: ningún biset, triset o circuito de TODAS las plantillas del sistema junta dos poleas ni dos máquinas / estaciones distantes (la polea va con mancuernas o peso corporal) y la regla pura (`jpEstacionCompat`, aviso del editor, saneador y armado automático). 8 casos: pirámide, Bodybuilding 3 / 4 / 5 días (intermedio y avanzado: glúteo mayor grupo y en rango, pierna sin faltantes, texto igual a lo medido), Full-Body mujer, versiones mujer de Recomposición / MTB / Hyrox y Recomposición Femenina del Banco Pro.

`bis.04` (mismo adaptador) mide en TODAS las plantillas del sistema que cada sesión deje un solo ejercicio de trabajo en serie recta (el básico del día) y el resto en bisets / trisets; `bis.01` verifica además que agrupar no cambie el volumen (cada estación conserva sus series: dosis `4/3x8/12`).

## Motor de IA, género y títulos (`cases-elite.js`)

Adaptadores `iaMotor` y `generoTitulos` (runner.html). `iaMotor` corre UNA pasada asíncrona antes de la suite (`prepararIA`) con `fetch` simulado y los casos leen el resultado: `ia.motor.01` cancelación real con AbortController y tiempo máximo por llamada, `ia.motor.02` modelo rápido para pedidos cortos (modo económico) y caché de prompts del system largo (Anthropic), `ia.motor.03` el botón de IA del Builder se detiene con un segundo toque y vuelve al instante. `genero.01` normaliza el género y lo inyecta en la ficha de todos los prompts; `titulo.01` el título de un biset de la Pizarra sigue a sus ejercicios reales sin pisar títulos propios. `ia.motor.04` streaming (SSE) en Anthropic, Gemini y OpenAI con un evento partido entre fragmentos y avance en vivo; `ia.motor.05` reproduce el cuelgue en uso real: conexión trabada sin primer byte (se corta y se reintenta una vez), silencio a mitad de la respuesta (se corta con aviso) y respuesta cortada sin cierre (un reintento, nunca texto a medias); `ia.motor.06` tips de CrossFit, objetivo de la semana y nota metodológica también se detienen con un segundo toque.

## Audio en silencio durante la suite (`cases-voz.js`)

`silenciarAudio` (runner.html) instala un AudioContext mudo en el Builder y en la app del alumno apenas cargan: los tests del timer ya no suenan por los parlantes (lo que habría sonado solo se cuenta). `voz.20` lo verifica; `voz.04` exige que con la voz activa nunca suene el pitido viejo (ni con el paquete caído) y `voz.19` que al reiniciar o cerrar un timer se corte lo que quedaba sonando o agendado. `version.05` mide la aclaración de duración estimada bajo el selector de versión.

## Body Maintenance, lectura del día y ficha rápida (`cases-ficha.js`)

Adaptador `fichaPlan` (runner.html) sobre el Builder real (`CoachMantenimiento`, `CoachLecturaDia`, `CoachFichaRapida`); los casos con plan arman un alumno de prueba con una plantilla del Banco que vive solo durante el caso. `bm.01-04`: banco de cierres de 5-10 min por sector, inserción en el Cool-Down sin tocar bloques, sugerencia según los grupos del día y tarjeta en la app del alumno. `lectura.01-03`: prioridad de glúteo según la ficha, estación sugerida que entra como A2/A3 en un bloque compatible (nunca el básico, sin cruces), varón sin agregados de glúteo y exceso semanal que pide bajar una serie. `ficha.01-02`: edición rápida y alineación local (una oración y una línea «TU FICHA» que se reemplazan sin duplicar, respetando lo escrito a mano). `ficha.03` corre en la pasada asíncrona de `iaMotor`: regenerar el día con IA solo en bloques sin texto propio, con un aviso y ⏹. `voz.01` ahora exige la voz del timer activa por defecto.

## Plantillas revisadas, biset naranja y biblioteca v10 (también en `cases-ficha.js`)

- `bank.bb.03` (adaptador `revisadas`): Bodybuilding de 3 y 5 días (masculino y femenino, intermedio y élite) y Recomposición 5 días mujer avanzada. Exige volumen semanal dentro de los rangos del panel (core incluido), cero alertas (fatiga axial, poleas, estaciones, RIR), core de un solo ejercicio que no se repite 3 días, entrada en calor de 4 ejercicios y 7 minutos, sesiones de 90 minutos o menos, sin paréntesis dobles, bisets sin reacomodos de logística, la búlgara fuera del core y el Día 1 de recomposición con 21 series de tren inferior o menos (antes 26).
- `vista.biset.01` (adaptador `bisetNaranja`): en la app del alumno el biset usa el naranja de la marca (#EE5A12) en recuadro, pastilla, línea guía y letras A1/A2, y #FF8A4C en los textos sobre fondo oscuro; nada en ámbar.
- `lib.v10.01` (adaptador `renombres`): los 8 ejercicios con paréntesis en el nombre se renombran y el nombre viejo queda como alias.
- Reglas que cambiaron: la entrada en calor de Bodybuilding tiene 4 ejercicios (antes 5 o más), el piso por sesión es de 16 series en intermedio y 24 en élite (el volumen se controla por semana), `bank.rec.01` pide activación de 8 a 12 minutos que cambia de máquina y un solo cierre al fallo por semana, y `lectura.01` prueba la sugerencia en el día de pierna que de verdad no tiene glúteo medio.
