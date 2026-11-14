/* ============================================================
   CASOS · app del alumno (la que se exporta)
   El runner compila un alumno de prueba con el compile() real, abre el documento resultante en un iframe y llama a sus funciones globales (adaptador "alumno").
   Cada función tiene que ser pública (window.jp...) para entrar acá: a medida que se modularice el código del alumno (src/alumno/js/) se van sumando casos.
   ============================================================ */
window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([

  { id: 'stu.dec.01', area: 'App del alumno · carga de kilos', fn: 'alumno', input: { fn: 'jpLimpiarDecimal', args: ['80,5kg'] }, expect: '80.5', nota: 'La coma del teclado se vuelve punto y se descarta el texto' },
  { id: 'stu.dec.02', area: 'App del alumno · carga de kilos', fn: 'alumno', input: { fn: 'jpLimpiarDecimal', args: ['1.2.3'] }, expect: '1.23', nota: 'Un solo separador decimal' },
  { id: 'stu.dec.03', area: 'App del alumno · carga de kilos', fn: 'alumno', input: { fn: 'jpLimpiarDecimal', args: [null] }, expect: '', nota: 'null no rompe' },
  { id: 'stu.dec.04', area: 'App del alumno · carga de kilos', fn: 'alumno', input: { fn: 'jpLimpiarDecimal', args: ['abc'] }, expect: '' },
  { id: 'stu.eq.01', area: 'App del alumno · equipo', fn: 'alumno', input: { fn: 'jpClasificarEquipo', args: ['Banda elástica'] }, expect: 'banda', nota: 'Los ejercicios con banda no piden kilos' },
  { id: 'stu.kg.01', area: 'App del alumno · cargas del CrossFit', fn: 'alumno', input: { fn: 'jpCfResolverKgLinea', args: ['Deadlift @ 100 kg'] }, expect: { kg: 100 }, modo: 'subset', nota: 'Una carga fija en la línea del WOD' },
  { id: 'stu.kg.02', area: 'App del alumno · cargas del CrossFit', fn: 'alumno', input: { fn: 'jpCfResolverKgLinea', args: ['Back squat @ 80% 1RM'] }, expect: { kg: null, benchmark: 'Back Squat' }, modo: 'subset', nota: 'Un porcentaje se resuelve contra el 1RM del alumno (benchmark), no es un kilo fijo' },

  /* el alumno recibe el MISMO parser de dosis que usa el Builder (compile() lo inyecta): no pueden divergir */
  { id: 'stu.paridad.01', area: 'App del alumno · paridad con el Builder', fn: 'alumnoParidad',
    input: ['4x8 | Tempo 3010 | RIR 2 Rest 2:00', '2x8 + 2x6 + 2x4 | Tempo 3010 | RIR 1', '4x10-8-6-6 rpe 8', '1x3 (Aclimatación) + 1x6 (Top Set) + 2x8 (Back-off) | RIR 1', '3x12 sin descanso', '4 Series: 12 reps | Tempo 2011 | RIR 1 Rest 90s'],
    expect: [], nota: 'jpDosisCanon del documento del alumno == jpDosisCanon del Builder para las dosis típicas del sistema' }
]);
