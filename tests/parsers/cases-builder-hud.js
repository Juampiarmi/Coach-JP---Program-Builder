/* ============================================================
   CASOS · Builder HUD (Fase 0): test de humo del Builder en sandbox (iframe 1440 × 900, ?jpSandbox=1).
   Adaptador builderHud (runner.html): una pasada asíncrona (prepararBuilder) arma un alumno de ejemplo, entra al Builder y mide; los casos leen el resultado.
   ============================================================ */
window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([

  { id: 'bld.01', area: 'Builder · Fase 0 (humo en sandbox)', fn: 'builderHud', input: { caso: 'carga' },
    expect: { cargo: true, planIntacto: true, sinGuardar: true }, modo: 'subset',
    nota: 'El Builder carga en sandbox con un alumno de ejemplo; dibujarlo, plegar y desplegar sus paneles y volver a dibujarlo NO cambia el JSON del plan y no llama a save()' }
]);
