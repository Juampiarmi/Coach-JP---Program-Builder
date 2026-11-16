/* ============================================================
   CASOS · generadores de IA del Builder (CrossFit): prevalidación, objetivo de la semana y su lectura en la app del alumno
   El runner simula el motor de IA (CoachAI) y las funciones que guardan o dibujan: no hay red, no se guarda nada y no se toca ningún plan real.
   ============================================================ */
window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([

  { id: 'ia.pre.01', area: 'IA · prevalidación', fn: 'iaCF', input: { caso: 'sinClave' }, expect: { ok: false, avisoClave: true, cfgAbierto: true }, modo: 'subset',
    nota: 'Sin clave: avisa el motivo exacto y abre la configuración, sin armar prompt ni llamar a la API' },
  { id: 'ia.pre.02', area: 'IA · prevalidación', fn: 'iaCF', input: { caso: 'pausa' }, expect: { ok: false, avisoPausa: true }, modo: 'subset',
    nota: 'Proveedores en pausa por límite temporal: avisa cuánto esperar y no dispara la petición' },
  { id: 'ia.pre.03', area: 'IA · prevalidación', fn: 'iaCF', input: { caso: 'listo' }, expect: { ok: true, sinAvisos: true }, modo: 'subset',
    nota: 'Con clave y sin pausa: pasa sin avisos' },
  { id: 'ia.pre.04', area: 'IA · prevalidación', fn: 'iaCF', input: { caso: 'ocupado' }, expect: [false, true, false],
    nota: 'Un solo clic a la vez por botón: el segundo clic rebota y, al liberar, vuelve a andar' },
  { id: 'ia.txt.01', area: 'IA · lectura de la respuesta', fn: 'iaCF', input: { caso: 'textoIA' }, expect: ['', 'a\nb', 'uno\ndos', 'hola'],
    nota: 'Los campos que la IA devuelve como texto, lista u objeto se unen en texto (antes una lista rompía el guardado)' },
  { id: 'ia.hdl.01', area: 'IA · tips de CrossFit', fn: 'iaCF', input: { caso: 'handlerTips' }, expect: { llamadas: 0, avisoClave: true, botonLibre: true, sinFalsoError: true }, modo: 'subset',
    nota: 'El botón "Auto-generar Tips & Pacing con IA" sin clave: no llama a la API, no tira falso error de API, avisa la causa y el botón queda libre' },
  { id: 'ia.sem.01', area: 'IA · objetivo de la semana', fn: 'iaCF', input: { caso: 'handlerObjetivo' }, expect: { llamadas: 0, avisoClave: true, botonLibre: true, sinFalsoError: true }, modo: 'subset',
    nota: 'El botón "Generar Objetivo de la Semana con IA" sin clave: mismo comportamiento seguro' },
  { id: 'ia.sem.03', area: 'IA · objetivo de la semana', fn: 'iaCF', input: { caso: 'handlerObjetivoSB' }, expect: { llamadas: 0, avisoClave: true, botonLibre: true, sinFalsoError: true }, modo: 'subset',
    nota: 'En Bodybuilding el botón "Generar Objetivo de la Semana con IA" sin clave también avisa sin llamar a la API ni dejar el botón colgado' },
  { id: 'ia.hdl.02', area: 'IA · tips de Bodybuilding', fn: 'iaCF', input: { caso: 'handlerTipsSB' }, expect: { llamadas: 0, avisoClave: true, botonLibre: true, sinFalsoError: true }, modo: 'subset',
    nota: 'El generador de tips de Bodybuilding sin clave: no llama a la API, no tira falso error y deja el botón libre' },
  { id: 'ia.hdl.03', area: 'IA · ficha del día', fn: 'iaCF', input: { caso: 'handlerFichaSB' }, expect: { llamadas: 0, avisoClave: true, botonLibre: true, sinFalsoError: true }, modo: 'subset',
    nota: 'El generador de la ficha del día sin clave: mismo comportamiento seguro' },
  { id: 'ia.sem.02', area: 'IA · objetivo de la semana', fn: 'iaCF', input: { caso: 'resumen' },
    expect: { bloques: 2, dias: 1, tieneSquat: true, tieneFran: true, sinWarmup: true, sinVacio: true }, modo: 'subset',
    nota: 'La IA lee los levantamientos y WODs de la semana; la entrada en calor y los bloques vacíos quedan afuera' },
  { id: 'stu.obj.01', area: 'App del alumno · objetivo de la semana', fn: 'alumnoObjetivo', input: 'Potencia y capacidad aeróbica.\nCerrá fuerte.',
    expect: ['🎯 Objetivo de la semana', 'Potencia y capacidad aeróbica.<br>Cerrá fuerte.'], modo: 'contiene',
    nota: 'El alumno lee el objetivo de la semana arriba en la información de la semana (los saltos de línea se respetan)' },
  { id: 'stu.obj.02', area: 'App del alumno · objetivo de la semana', fn: 'alumnoObjetivo', input: 'Semana <script>alert(1)</script> pesada',
    expect: ['<script', 'alert(1)</'], modo: 'noContiene',
    nota: 'El objetivo se muestra como texto: nada de lo que escriba el coach se interpreta como HTML' },
  { id: 'stu.obj.03', area: 'App del alumno · objetivo de la semana', fn: 'alumnoObjetivo', input: '',
    expect: ['Objetivo de la semana'], modo: 'noContiene',
    nota: 'Sin objetivo cargado no aparece el rótulo' }
]);
