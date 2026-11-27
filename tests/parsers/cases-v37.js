/* ============================================================
   CASOS · v37: cada tip de las pautas desplegable por separado (texto completo), SEM / DÍA con más jerarquía y repeticiones centradas.
   Adaptador v30 (runner.html), casos nuevos: tipsPlegables y semDiaReps.
   ============================================================ */
window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([

  { id: 'v37.tips.01', area: 'Pautas · tips plegables', fn: 'v30', input: { caso: 'tipsPlegables' },
    expect: { unoPorTip: true, plegadosDeEntrada: true, rotuloALaVista: true, idempotente: true, planIntacto: true, seAbreCompleto: true, losDemasSiguenPlegados: true, cadaUnoPorSeparado: true, seVuelveAPlegar: true, margenAbajo: true }, modo: 'subset',
    nota: 'En «Pautas técnicas & tips del bloque» y en las notas del ejercicio cada tip (NOTA DEL DÍA, SERIES DE APROXIMACIÓN, POR QUÉ ESTA CANTIDAD DE SERIES, CUIDADO, TEMPO...) arranca plegado mostrando solo su rótulo; al tocarlo se abre ese solo, con el texto completo (sin «…», sin tope de alto) y margen abajo para el botón flotante. El texto guardado del bloque no cambia' },
  { id: 'v37.hdr.01', area: 'Header · SEM / DÍA y reps', fn: 'v30', input: { caso: 'semDiaReps' },
    expect: { semMasGrande: true, diaMasGrande: true, mismaLinea: true, mismoContorno: true, repsCentradasRectas: true, repsCentradasEstaciones: true }, modo: 'subset',
    nota: 'SEM y DÍA con letra más grande y firme (SEM ≥ 15,5 px, DÍA ≥ 14 px, peso 800) sin cambiar su contorno de 40 px ni su margen izquierdo (el del escudo). Las repeticiones quedan centradas: «4 SERIES × 5-7 REPS» en series rectas y «12-15 REPS» en cada estación del triset' }
]);
