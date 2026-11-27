/* ============================================================
   CASOS · v34: limpieza «menos es más» de la vista del alumno.
   Adaptador v30 (runner.html), caso nuevo: limpieza.
   ============================================================ */
window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([

  { id: 'v34.lim.01', area: 'Tarjeta · limpieza', fn: 'v30', input: { caso: 'limpieza' },
    expect: { sinAgregarSerie: true, fichaActivaLiviana: true, descansoClaro: true, unilateralChip: true, cierreSinEmojis: true }, modo: 'subset',
    nota: 'Sin «+ AGREGAR SERIE»; la ficha activa solo dice «Serie 1» (el borde cian marca que sigue); el descanso es un botón claro «INICIAR DESCANSO · 75s» con ícono vectorial, alto táctil (≥ 44 px) y borde definido; UNILATERAL · POR LADO es un chip chico al lado, no otro botón; el cierre (Finalizar, Story Card, Criterio del día) no usa emojis de sistema' }
]);
