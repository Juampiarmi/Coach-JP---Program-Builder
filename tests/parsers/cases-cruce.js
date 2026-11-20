/* ============================================================
   CASOS · cambio de alumno en el Builder (estado cruzado entre Fuerza / Hipertrofia y CrossFit)
   Errores que cubren: (1) el selector superior de alumno heredaba el día y la semana del alumno anterior; (2) la respuesta de una IA pedida para un alumno
   (warm-up / cool-down) se escribía en el Día 1 del alumno que quedaba en pantalla al terminar; (3) estructuras de días nulas o rotas colapsaban el dibujo.
   Se usan las funciones reales con dos alumnos de prueba en memoria: no se guarda nada.
   ============================================================ */
window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([

  { id: 'cru.cambio.01', area: 'Builder · cambio de alumno', fn: 'cruceCF', input: { caso: 'cambio' },
    expect: { dia: 0, semana: 0, activo: true, aIntacto: true, bIntacto: true, referencias: 0, epocaCambio: true, vigenteViejo: false, vigenteNuevo: true }, modo: 'subset',
    nota: 'De una alumna de hipertrofia (en su Día 3) a una de CrossFit: la nueva arranca en su Día 1 / Semana 1, ninguno de los dos planes cambia, no comparten referencias y los procesos pedidos para la anterior dejan de ser vigentes' },
  { id: 'cru.cambio.02', area: 'Builder · cambio de alumno', fn: 'cruceCF', input: { caso: 'vuelta' }, expect: { diaDeA: 2, aIntacto: true, bIntacto: true }, modo: 'subset',
    nota: 'Cada alumno recuerda el día en que estaba: al volver, la alumna de hipertrofia vuelve a su Día 3' },
  { id: 'cru.cambio.03', area: 'Builder · cambio de alumno', fn: 'cruceCF', input: { caso: 'confirmaSaliente' }, expect: { s1EnB: 0, aIntacto: true }, modo: 'subset',
    nota: 'Un cambio sin confirmar del alumno de CrossFit saliente (bloque borrado) se guarda en su propia semana antes de soltarlo' },
  { id: 'cru.estr.01', area: 'Builder · estructura de días', fn: 'cruceCF', input: { caso: 'estructuraNula' }, expect: { diasNull: true, diasVacio: true, diaNulo: true, sinBloques: true }, modo: 'subset',
    nota: 'Un plan sin lista de días, con días vacíos o nulos, o sin lista de bloques se completa con días estándar vacíos: nunca queda una estructura nula' },
  { id: 'cru.dibujo.01', area: 'Builder · estructura de días', fn: 'cruceCF', input: { caso: 'dibujo' }, expect: { diaNulo: true, sinBloques: true, semanasRotas: true, indices: true }, modo: 'subset',
    nota: 'El Builder dibuja sin romperse ante días nulos, bloques ausentes, semanas rotas y un día o semana heredados fuera de rango' }
]);
