/* ============================================================
   CASOS · v33: fichas «Serie 1 … Serie 4» y pautas cortas («menos es más»).
   Adaptador v30 (runner.html), caso nuevo: pautasCortas (las etiquetas Serie N se verifican en v30.tb.01 y v31.tb.01).
   ============================================================ */
window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([

  { id: 'v33.pau.01', area: 'Pautas · solo lo esencial', fn: 'v30', input: { caso: 'pautasCortas' },
    expect: { conservaNotaDelDia: true, conservaAproximacion: true, nadaSeSaca: true, nadaSeRecorta: true, planIntacto: true, corto: true }, modo: 'subset',
    nota: 'Actualizado en v37: las pautas ya no se recortan ni se sacan (cada tip va plegado detrás de su rótulo, ver v37.tips.01). NOTA DEL DÍA, SERIES DE APROXIMACIÓN, POR QUÉ ESTÁ ACÁ, SET-UP, CLAVE y CUIDADO se conservan con su texto completo, sin «…». jpCorto sigue disponible. El texto guardado del bloque no cambia' }
]);
