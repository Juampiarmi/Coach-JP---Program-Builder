/* ============================================================
   CASOS · v36: RPE en lugar de RIR (solo lo que ve el alumno) y registro de cargas plegado.
   Adaptador v30 (runner.html), caso nuevo: rpePlegado.
   ============================================================ */
window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([

  { id: 'v36.rpe.01', area: 'Tarjeta · RPE y registro plegado', fn: 'v30', input: { caso: 'rpePlegado' },
    expect: { conversion: true, plegadoDeEntrada: true, seriesYDescansoALaVista: true, rpeEnLasPautas: true, seAbre: true, sigueAbiertoYCuenta: true, panelEnRpe: true, bisetPlegado: true, bisetSeAbre: true }, modo: 'subset',
    nota: 'El alumno ve RPE (esfuerzo del 1 al 10) en lugar de RIR: RPE = 10 − RIR (RIR 1-2 → RPE 8-9, RIR 3+ → ≤7), en las pautas y en «Cómo te fue» (botones 10 · 9 · 8 · ≤7 que guardan el mismo valor de siempre). El registro de cargas arranca plegado: a la vista quedan series × reps y el descanso; «Registrar cargas · 0/4 series» abre las fichas y queda abierto al registrar (1/4). En el biset las rondas se pliegan igual (0/3 rondas)' }
]);
