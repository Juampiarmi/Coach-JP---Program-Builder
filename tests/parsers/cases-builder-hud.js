/* ============================================================
   CASOS · Builder HUD (Fase 0 y Fase 1): test de humo del Builder en sandbox (iframe 1440 × 900, ?jpSandbox=1).
   Adaptador builderHud (runner.html): una pasada asíncrona (prepararBuilder) arma un alumno de ejemplo, entra al Builder y mide; los casos leen el resultado.
   Línea de base medida con la versión anterior a la Fase 1 (mismo alumno de ejemplo y misma medición, 1440 × 900): primer bloque a 2948 px, 65 botones a la vista,
   23 rótulos con emoji, 7 botones naranjas llenos. Con la Fase 1: 1724 px, 37 botones, 0 emojis, 1 naranja lleno (AGREGAR BLOQUE).
   ============================================================ */
window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([

  { id: 'bld.01', area: 'Builder · Fase 0 (humo en sandbox)', fn: 'builderHud', input: { caso: 'carga' },
    expect: { cargo: true, planIntacto: true, sinGuardar: true }, modo: 'subset',
    nota: 'El Builder carga en sandbox con un alumno de ejemplo; dibujarlo, plegar y desplegar sus paneles y volver a dibujarlo NO cambia el JSON del plan y no llama a save()' },
  { id: 'bld.02', area: 'Builder · Fase 1 (claridad visual)', fn: 'builderHud', input: { caso: 'medidas' },
    expect: { primerBloqueCerca: true, menosBotones: true }, modo: 'subset',
    nota: 'Medidas de claridad: el primer bloque del día queda a no más del 65 % de la altura de antes (2948 px) y hay al menos 15 botones menos a la vista (antes 65)' },
  { id: 'bld.03', area: 'Builder · Fase 1 (claridad visual)', fn: 'builderHud', input: { caso: 'emojis' },
    expect: { sinEmojis: true }, modo: 'subset',
    nota: 'Sin emojis de sistema en botones, títulos, rótulos ni pastillas del Builder: íconos de línea (y puntos de color para los estados)' },
  { id: 'bld.04', area: 'Builder · Fase 1 (claridad visual)', fn: 'builderHud', input: { caso: 'naranja' },
    expect: { soloAgregarBloque: true, abiertoSoloPrincipales: true }, modo: 'subset',
    nota: 'Un solo naranja principal por zona: con los paneles plegados la única acción naranja llena es AGREGAR BLOQUE; abiertos, solo se suma GENERAR PLAN COMPLETO del generador. Las acciones de IA y de apoyo van en contorno' },
  { id: 'bld.05', area: 'Builder · Fase 1 (claridad visual)', fn: 'builderHud', input: { caso: 'bloque' },
    expect: { recta: true, biset: true, triset: true, accionesAlPasar: true }, modo: 'subset',
    nota: 'Bloque plegado limpio: título + resumen («Biset · 3×8-10 / 3×12-20 · 90 s · RIR 1 (RPE 9)»; si las estaciones difieren, el rango: «RIR 0-1 (RPE 9-10)»); los controles de acción aparecen al pasar el mouse o al enfocar el bloque' },
  { id: 'bld.06', area: 'Builder · Fase 1 (claridad visual)', fn: 'builderHud', input: { caso: 'paneles' },
    expect: { todosPlegados: true, seAbren: true, recuerdaAlRedibujar: true, alumnoALaVista: true }, modo: 'subset',
    nota: 'Paneles secundarios (configuración, contexto, generador IA, volumen, lectura del día, warm-up, objetivo de la semana, ficha del día) arrancan plegados con su resumen; se abren con un toque, siguen abiertos al redibujar y el selector de alumno queda siempre a la vista' }
]);
