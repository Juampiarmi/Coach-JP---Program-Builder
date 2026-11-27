/* ============================================================
   CASOS · v32: lectura en el gimnasio — series × reps protagonistas, RIR en las pautas del bloque y sin referencias a otras semanas.
   Adaptador v30 (runner.html), casos nuevos: numeros, sinSemanas (y rir / rondas actualizados en v30 / v31).
   ============================================================ */
window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([

  { id: 'v32.num.01', area: 'Tarjeta · series × reps', fn: 'v30', input: { caso: 'numeros' },
    expect: { seriesYRepsGrandes: true, estacionGrande: true, rirFueraDeLaEstacion: true, rirEnLasPautas: true }, modo: 'subset',
    nota: 'Los números de series × reps son protagonistas (≥ 32 px en series rectas, ≥ 30 px en cada estación del biset). El RIR sale de la tarjeta y de las estaciones y queda en «Pautas técnicas & tips del bloque», uno por ejercicio / estación' },
  { id: 'v32.sem.01', area: 'Tarjeta · solo la sesión de hoy', fn: 'v30', input: { caso: 'sinSemanas' },
    expect: { hojaSoloHoy: true, pastillaSoloHoy: true, pistaSinSemana: true }, modo: 'subset',
    nota: 'Ni la hoja rápida, ni la pastilla «Más del registro», ni la pista de carga muestran referencias a otras semanas («Semana 1: 80 kg × 7»): solo el objetivo de la sesión actual' }
]);
