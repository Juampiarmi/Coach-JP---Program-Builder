/* ============================================================
   CASOS · copia entre alumnos en CrossFit: plan completo, semana y día
   Se prueban las funciones reales (ejecutarCopiaPlan, deshacerCopiaPlan, ejecutarCopiaSemana, ejecutarCopiaDia) con alumnos de prueba en memoria: no se guarda nada.
   Errores que cubren: el plan copiado a un alumno de Fuerza dejaba al destino en la modalidad equivocada (se perdían 3 de las 4 semanas) y la copia leía un puntero de semana
   desactualizado (un bloque borrado volvía a aparecer).
   ============================================================ */
window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([

  { id: 'cp.plan.01', area: 'Copia · plan completo', fn: 'copiaCF', input: { caso: 'planCF', destCF: false },
    expect: { ok: true, esCF: true, disc: 'crossfit', semanas: '1/1/1/0 | 0/1/0/0 | 0/0/0/0', punteroEnS1: true, sinBloqueBorrado: true, problemas: [], objetivoS2: 'Objetivo S2', idsNuevos: true, origenIntacto: true, nombrePropio: true }, modo: 'subset',
    nota: 'CrossFit → alumno de Fuerza: el destino pasa a CrossFit con sus 4 semanas independientes, sin el bloque que el coach había borrado, con ids nuevos, estructura sana, el origen intacto y la identidad del destino respetada' },
  { id: 'cp.plan.02', area: 'Copia · plan completo', fn: 'copiaCF', input: { caso: 'planUndo', destCF: false }, expect: { cambio: true, deshecho: true, vuelveIgual: true, sinMasUndo: true }, modo: 'subset',
    nota: 'La copia del plan completo se puede deshacer: el destino vuelve a sus días, semanas y modalidad de antes' },
  { id: 'cp.plan.03', area: 'Copia · plan completo', fn: 'copiaCF', input: { caso: 'planSports', destCF: false }, expect: { ok: true, esCF: false, sinSemanasIndependientes: true, bloques: 1, problemas: [] }, modo: 'subset',
    nota: 'Fuerza → alumno de CrossFit: el destino pasa a Fuerza y no arrastra semanas independientes' },
  { id: 'cp.sem.01', area: 'Copia · semana', fn: 'copiaCF', input: { caso: 'semana', destCF: false },
    expect: { ok: true, diasCreados: 1, s3: 'Squat S2+Fran S2 | Dia2 S2 | ', otrasSemanasIntactas: true, objetivo: 'Objetivo S2', fase: 'Pico', problemas: [], idDiaNuevoUnico: true }, modo: 'subset',
    nota: 'Copiar la Semana 2 a la Semana 3 de otro alumno: llegan los bloques de todos los días, el objetivo y la fase; se crea el día que faltaba con ID libre y las otras 3 semanas del destino no se tocan' },
  { id: 'cp.sem.02', area: 'Copia · semana', fn: 'copiaCF', input: { caso: 'semanaMismo', destCF: false }, expect: { ok: true, s4: 'Squat S2+Fran S2 | Dia2 S2 | ', objetivoS4: true, s2Intacta: true, semanaActiva: 3 }, modo: 'subset',
    nota: 'Copiar una semana a otra del mismo alumno (sin las notas): la semana de origen queda intacta y el Builder navega a la semana destino' },
  { id: 'cp.sem.03', area: 'Copia · semana', fn: 'copiaCF', input: { caso: 'semanaRechazos', destCF: false }, expect: { misma: false, destinoNoCF: false, origenVacio: false, semanaInvalida: false, nadaCambio: true }, modo: 'subset',
    nota: 'Se rechaza copiar una semana sobre sí misma, a un alumno que no es de CrossFit, desde una semana vacía o con una semana inválida, y en esos casos no cambia nada' },
  { id: 'cp.dia.01', area: 'Copia · día', fn: 'copiaCF', input: { caso: 'dia', destCF: false }, expect: { ok: true, s1: 'Squat S2+Fran S2', conservaId: true, conservaRotulo: true, problemas: [] }, modo: 'subset',
    nota: 'Copiar un día (de la Semana 2 del origen a la Semana 1 de otro alumno): el día destino conserva su ID y su rótulo y la estructura queda sana' }
]);
