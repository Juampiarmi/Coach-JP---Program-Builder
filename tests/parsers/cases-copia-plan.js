/* ============================================================
   CASOS · copiar el plan de un alumno a otro (Builder): "Copiar plan completo" y "Duplicar planificación / Clonar plan de otro atleta"
   El adaptador copiaPlan (runner.html) arma dos alumnos de prueba en memoria y maneja la pantalla real del modal Duplicar; no se guarda nada.
   Errores que cubren: la copia vieja (Duplicar / Clonar plan de otro atleta) recortaba el plan a la frecuencia del destino, dejaba al destino en la modalidad equivocada (se perdían
   3 de las 4 semanas de CrossFit), reutilizaba ids de bloque entre semanas y no revisaba los ejercicios vetados de los bloques de pizarra; un plan de origen con ids dañados
   (bloques repetidos, nulos o sin id, días con ids inválidos) hacía que la copia se rechazara entera.
   ============================================================ */
window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([

  { id: 'cp.dup.01', area: 'Copia · Duplicar planificación', fn: 'copiaPlan', input: { caso: 'dupCF' },
    expect: { copiado: true, disc: 'crossfit', dias: 6, freqBase: 3, semanasDia6: 'WOD d6 s1 / WOD d6 s2 / WOD d6 s3 / WOD d6 s4', punteroEnS1: true, idsCompartidos: 0, referencias: 0, problemas: [], origenIntacto: true, nombrePropio: true }, modo: 'subset',
    nota: 'CrossFit de 6 días → alumno de Fuerza de 3 días: llegan los 6 días (no se recorta a la frecuencia), las 4 semanas independientes y la modalidad; ids de bloque nuevos, sin referencias compartidas, origen intacto e identidad del destino respetada' },
  { id: 'cp.dup.02', area: 'Copia · Duplicar planificación', fn: 'copiaPlan', input: { caso: 'dupSports' },
    expect: { copiado: true, dias: 5, bloques: true, disc: 'hiper', titulosDestino: true, titulosOrigen: true, items: true, idsPropios: true, referencias: 0, problemas: [] }, modo: 'subset',
    nota: 'Bodybuilding de 5 días → alumno de 3 días: no se recorta, todos los bloques y dosis llegan iguales con ids propios; sin «fichas» el destino conserva sus títulos en los días que ya tenía y los días nuevos traen los del origen' },
  { id: 'cp.dup.03', area: 'Copia · Duplicar planificación', fn: 'copiaPlan', input: { caso: 'idsRotos' },
    expect: { ok: true, reparados: true, bloquesDia1: 3, idsDia: true, problemas: [], referencias: 0 }, modo: 'subset',
    nota: 'Un plan de origen con bloques de id repetido o sin id, elementos nulos y días con ids inválidos o repetidos se repara y se copia (antes se rechazaba entero con «estructura inválida»)' },
  { id: 'cp.dup.04', area: 'Copia · Duplicar planificación', fn: 'copiaPlan', input: { caso: 'vetados' },
    expect: { reemplazo: true, sinVetado: true, mismosBloques: true, origenIntacto: true, soloAviso: true, problemas: [] }, modo: 'subset',
    nota: 'Ejercicio vetado para el destino en un bloque de pizarra: con «reemplazar» se cambia por una variante segura (el bloque se regenera) sin perder bloques; sin eso solo se avisa; el origen no cambia' },
  { id: 'cp.dup.05', area: 'Copia · Duplicar planificación', fn: 'copiaPlan', input: { caso: 'deshacer' }, expect: { cambio: true, vuelve: true, botonSeVa: true }, modo: 'subset',
    nota: 'La copia hecha con Duplicar planificación se puede deshacer: el destino vuelve a sus días, su base de frecuencia y su modalidad de antes' }
]);
