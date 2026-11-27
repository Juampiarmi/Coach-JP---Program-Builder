# Tests · parsers, Banco de Rutinas y app del alumno

Tabla de casos + runner que prueban **el código real de `index.html`** (se carga en un iframe), sin copias ni mocks. No guarda estado: solo llama funciones y audita los datos que arma la app.

**Aislamiento (v27):** el iframe abre `index.html?jpSandbox=1`. Con ese parámetro la app usa un almacenamiento EN MEMORIA que arranca como copia de lo guardado (sin credenciales de nube ni de Telegram) y no registra service worker, no sube a la nube ni descarga archivos. Las pruebas ven los datos reales del navegador pero nunca los modifican (antes, los alumnos de prueba podían quedar guardados en el localStorage real con el volcado de seguridad al cambiar de pestaña). `datos.01` lo verifica.

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
| `cases-persistencia.js` | Datos reales a salvo: aislamiento de pruebas, fusión segura con la nube y con otras pestañas (borrados, sellos de tiempo, videos), biblioteca oficial y orden A–Z de alumnos |
| `cases-v28.js` | Bisets con registro al final y marcado por título, casilleros neutros hasta completarlos, video junto al nombre, Pizarra del Coach con la misma fuente que el alumno y plan() que completa sin pisar |
| `cases-v30.js` | Tablero de series · hoja rápida (fichas, hoja inferior, rondas del biset / triset) y Story Card en HD |
| `cases-v31.js` | Refinamiento de la vista del alumno: RIR explicado, biset limpio, fichas en 4 columnas, header, botón flotante y cierre |
| `cases-v32.js` | Series × reps protagonistas, RIR en las pautas del bloque y sin referencias a otras semanas |
| `cases-v33.js` | Fichas «Serie N» y pautas cortas |
| `cases-v34.js` | Limpieza «menos es más»: sin agregar serie, descanso claro, unilateral como chip, cierre sin emojis |
| `cases-v35.js` | Vista para principiantes: panel extra plegado y simple, tempo a las pautas |
| `cases-v36.js` | RPE en lugar de RIR y registro de cargas plegado |
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

- `bank.bb.04` (adaptador `revisadas`): las 12 plantillas de Bodybuilding (3, 4 y 5 días, masculino y femenino, intermedio y élite) y Recomposición 5 días mujer avanzada. Exige volumen semanal dentro de los rangos del panel (core incluido), cero alertas (fatiga axial, poleas, estaciones, RIR), core de un solo ejercicio que no se repite 3 días, entrada en calor de 4 ejercicios y 7 minutos, sesiones de 90 minutos o menos, sin paréntesis dobles, bisets sin reacomodos de logística, la búlgara fuera del core y el Día 1 de recomposición con 21 series de tren inferior o menos (antes 26).
- `vista.biset.01` (adaptador `bisetNaranja`): en la app del alumno el biset usa el naranja de la marca (#EE5A12) en recuadro, pastilla, línea guía y letras A1/A2, y #FF8A4C en los textos sobre fondo oscuro; nada en ámbar.
- `lib.v10.01` (adaptador `renombres`): los 8 ejercicios con paréntesis en el nombre se renombran y el nombre viejo queda como alias.
- Reglas que cambiaron: la entrada en calor de Bodybuilding tiene 4 ejercicios (antes 5 o más), el piso por sesión es de 16 series en intermedio y 24 en élite (el volumen se controla por semana, ver `bank.bb.04`), `bank.rec.01` pide activación de 8 a 12 minutos que cambia de máquina y un solo cierre al fallo por semana, y `lectura.01` prueba la sugerencia en el día de pierna que de verdad no tiene glúteo medio.
- `box.01` (adaptador `boxFem`): plantilla «Box · Glúteo, Piernas y Core + Olímpico · Femenino · 5 días · Desarrollo-Intermedio» (`src/coach/banco/22-box-femenino.js`, `window.CoachBox`). Exige que esté en el Banco, cero máquinas y cero poleas, olímpico en series rectas en los días 1, 3 y 5 justo después de una entrada en calor propia, core distinto al cierre de cada día, glúteo como grupo con más volumen, sin alertas, sesiones de 45 a 90 minutos, pautas propias del olímpico (rol `O` del motor) y la descripción con las cifras medidas.
- `vista.biset.01` ahora dibuja un biset REAL con `jpPizarraSports` (A1 sin tempo, A2 unilateral) y exige: transición como elemento `.jp-sb-trans` con pastilla de borde sólido que nombra la estación siguiente, celda «RITMO · CONTROL» cuando hay RIR pero no tempo (sin tempo ni RIR no se inventa la fila, ver `est.dos.02`) y el unilateral como badge propio con ⇄ en la fila `.jp-db-uni`.
- `cp.dup.06` (adaptador `copiaPlan`, caso `personal`): copiar un plan a otro alumno lo copia completo y limpio; los kilos calculados con los 1RM del origen no viajan (se recalculan con las marcas del destino) y la línea «TU FICHA» del origen se quita (`jpLimpiarPersonalClonado`).

## Persistencia blindada, orden A–Z y tarjeta limpia (`cases-persistencia.js`, v27)

- `datos.01-06` (adaptador `persistencia`): aislamiento de pruebas; fusión con la nube que respeta los borrados (`S.borrados`, un alumno borrado no vuelve y uno borrado en otro equipo se va), gana la edición más reciente por registro (`_ts`, sellado al guardar por huella de contenido), los planes locales más nuevos no se pisan y los videos nunca se pierden; datos sin sello (de antes) se deciden por el guardado completo más reciente; otra pestaña fusiona registro por registro (también los planes); un ejercicio oficial borrado no vuelve con una versión nueva de la biblioteca.
- `orden.01`: un solo orden A–Z (`jpCmpAth`: español, sin distinguir mayúsculas ni tildes, desempate estable) en memoria (`S.athletes`), en la grilla de alumnos y en el selector del Builder.
- Cambiaron con la tarjeta limpia: `vista.biset.01` exige que sin tempo pautado NO aparezca «RITMO · CONTROL» (`sinRitmoInventado`); `notas.01`, `notas.02` y `pau.cajas.01` exigen que Coaching, Objetivo y Tempo de cada ejercicio vayan dentro de «Pautas técnicas & tips del bloque» (una sección por ejercicio con su número y nombre) y que la tarjeta termine en «Registrar carga», sin la fila de pastillas.

## v28: bisets, casilleros, videos, Pizarra del Coach y planes guardados (`cases-v28.js`)

- `v28.bis.01-02` (adaptador `v28`): el registro de carga de un biset / triset va al final del recuadro (`.jp-sb-biset-reg`), con las tarjetas en orden y su letra; un bloque titulado «Biset» sin letras A1/A2 se dibuja como biset y conserva sus claves de registro (`e<idx>`).
- `v28.cas.01`: el casillero ✓ de la serie es neutro vacío y #EE5A12 completo (`.jp-qc-ok` y `.set-check`).
- `v28.vid.01`: el video va arriba a la derecha, junto al nombre; los bisets heredados (`.bs-wrap`) usan la misma estética naranja.
- `v29.vid.02` (v29): la miniatura del video (`.jp-ux-vth`) queda dentro de su botón (≤ 72×48 px) y no se superpone a la barra de dosis, la meta ni «Registrar carga», en la tarjeta simple y en cada estación del biset; el botón es `position:relative` + `contain:paint`, así que aunque otra regla lo deje `static` la miniatura sigue recortada. El disparador de los bisets heredados (`.video-link`) también queda anclado.
- `v28.pz.01`: la Pizarra del Coach se arma con `buildProgramConfig()` sobre una copia del plan (misma semana proyectada que el alumno, sin bloques que no viajan, plan intacto).
- `v28.plan.01`: `plan()` completa campos sin pisar el mesociclo, el estado ni agregar días vacíos a un plan guardado.

## v30: tablero de series · hoja rápida y Story Card en HD (`cases-v30.js`)

- `v30.tb.01` (adaptador `v30`): una ficha por serie (`.jp-tb-t`), la que sigue con borde cian, las pendientes con «Sug. …» tenue (cursiva, 34 %); las filas de siempre (`.jp-qc-r`, mismas claves) quedan ocultas en la tarjeta y la pastilla pasa a RIR · plan · + serie.
- `v30.tb.02`: la hoja rápida (`#jpTbSheet`) abre al tocar una ficha, no registra sin peso, marca cada valor «sugerido» → «ajustado», guarda con la MISMA clave de la serie (`getLoad`), deja la ficha naranja, la siguiente hereda la carga y un segundo registro la desmarca.
- `v30.tb.03`: triset con una fila ancha por ronda (`.jp-tb-rt`: estaciones, EN CURSO / PENDIENTE / ✓ HECHA y resumen); la hoja muestra las tres estaciones y registra las tres series de la ronda.
- `v30.hd.01`: Story Card a 2160×3840 (escala 2×, suavizado high), espera de fuentes (`jpStoryFuentes`) y foto grande reducida en pasos a la mitad (`__storyFotoCache`).

## v31: refinamiento visual y de usabilidad (`cases-v31.js`, adaptador `v30`)

- `v31.rir.01`: `jpRirTexto` («te guardás 1 rep», «al fallo» para RIR 0) y la aclaración dentro de la celda de RIR de la tarjeta; `jpDosisHtml` no cambia.
- `v31.bis.01`: cada estación con su dosis propia (sin «3 RONDAS ×»), un solo «sin pausa», rondas con el valor de cada estación y la cantidad de estaciones, «Más del registro» plegado.
- `v31.tb.01`: fichas en 4 columnas con etiquetas cortas y sin la referencia de otra semana.
- `v31.hd.01`: el botón del día sin el emoji de calendario y el subtítulo del header con el nivel del alumno.
- `v31.fab.01`: el botón flotante se corre si taparía una ronda / ficha / cierre y vuelve solo; margen inferior ≥ 100 px.
- `v31.cierre.01`: cierre de la sesión en la paleta de la Revisión 4 (Finalizar naranja, Story Card cian, resumen con barra).

Nota v30/v31: los casos que registran series borran sus claves de prueba (`tv30*`) antes y después: el progreso de la app del alumno de prueba persiste entre recargas.

## v32: lectura en el gimnasio (`cases-v32.js`, adaptador `v30`)

- `v32.num.01`: series × reps ≥ 32 px (≥ 30 px en estaciones del biset); el RIR sale de la tarjeta y queda en las pautas del bloque (`.jp-pauta-rir`), uno por ejercicio / estación.
- `v32.sem.01`: ni la hoja rápida, ni la pastilla, ni la pista de carga muestran referencias a otras semanas.
- Actualizados: `v31.rir.01` (el RIR se verifica en las pautas), `v31.bis.01` y `v30.tb.03` (rondas sin «A1 + A2 · N estaciones»).

## v33 / v34: pautas cortas y limpieza (`cases-v33.js`, `cases-v34.js`, adaptador `v30`)

- `v33.pau.01`: al mostrar las pautas quedan NOTA DEL DÍA, aproximación y la última indicación clave, a una frase; fuera POR QUÉ ESTÁ ACÁ y SET-UP; el texto guardado no cambia.
- `v34.lim.01`: sin «+ AGREGAR SERIE», ficha activa liviana («Serie 1»), botón INICIAR DESCANSO claro (≥ 44 px, ícono vectorial), UNILATERAL como chip y cierre sin emojis de sistema.
- `v35.pri.01`: el panel «Cómo te fue · reps que te sobraron» no aparece hasta la primera serie, arranca plegado y solo trae el RIR; el tempo sale de la tarjeta y su caja sigue en las pautas; fichas pendientes sin borde punteado.
- `v36.rpe.01`: RPE = 10 − RIR en lo que ve el alumno (encabezado, pautas, «Cómo te fue» con botones 10 · 9 · 8 · ≤7 que guardan el mismo valor); el registro de cargas arranca plegado detrás de «Registrar cargas» (también las rondas del biset). Los casos que prueban las fichas las abren primero (`abrirRegistro` dentro de `dibujar`).
