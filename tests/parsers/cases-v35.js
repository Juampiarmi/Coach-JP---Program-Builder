/* ============================================================
   CASOS · v35: vista para principiantes («menos es más»).
   Adaptador v30 (runner.html), caso nuevo: principiante.
   ============================================================ */
window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([

  { id: 'v35.pri.01', area: 'Tarjeta · principiantes', fn: 'v30', input: { caso: 'principiante' },
    expect: { panelOcultoSinSeries: true, tempoFueraDeLaTarjeta: true, fichaPendienteLimpia: true, apareceTrasLaPrimeraSerie: true, soloPreguntaRir: true, sinAgregarSerie: true }, modo: 'subset',
    nota: 'Debajo de la dosis solo quedan el descanso y las fichas: el panel extra («Cómo te fue · reps que te sobraron») no aparece hasta registrar la primera serie y arranca plegado; adentro solo está la pregunta del RIR (sin pauta, sin sugerencia de peso ni plan); el tempo sale de la tarjeta y queda en las pautas; las fichas pendientes van sin borde punteado; no hay «+ AGREGAR SERIE» ni «+ serie»' }
]);
