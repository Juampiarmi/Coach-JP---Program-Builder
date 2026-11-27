/* ============================================================
   CASOS · v33: fichas «Serie 1 … Serie 4» y pautas cortas («menos es más»).
   Adaptador v30 (runner.html), caso nuevo: pautasCortas (las etiquetas Serie N se verifican en v30.tb.01 y v31.tb.01).
   ============================================================ */
window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([

  { id: 'v33.pau.01', area: 'Pautas · solo lo esencial', fn: 'v30', input: { caso: 'pautasCortas' },
    expect: { sinPorQue: true, sinSetUp: true, conservaNotaDelDia: true, conservaAproximacion: true, soloLaUltimaClave: true, nadaLargo: true, planIntacto: true, corto: true }, modo: 'subset',
    nota: 'Al mostrar las pautas del bloque y las notas del ejercicio se deja solo lo esencial: fuera POR QUÉ ESTÁ ACÁ y SET-UP; quedan NOTA DEL DÍA, SERIES DE APROXIMACIÓN y la última indicación clave (CUIDADO), cada una cortada a su primera frase (≤ 110 caracteres). El texto guardado del bloque no cambia' }
]);
