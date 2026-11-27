/* ============================================================
   CASOS · Builder HUD (Fases 0, 1 y 2): test de humo del Builder en sandbox (iframe 1440 × 900, ?jpSandbox=1).
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
    nota: 'Paneles secundarios (configuración, contexto, generador IA, volumen, lectura del día, warm-up, objetivo de la semana, ficha del día) arrancan plegados con su resumen; se abren con un toque, siguen abiertos al redibujar y el selector de alumno queda siempre a la vista' },
  { id: 'bld.07', area: 'Builder · Fase 2 (productividad)', fn: 'builderHud', input: { caso: 'mesa' },
    expect: { existe: true, fija: true, alumnoEnLaBarra: true, cuatroSemanas: true, cuatroDias: true, acciones: true, guardado: true, unaLinea: true, sinScroll: true }, modo: 'subset',
    nota: 'Mesa de trabajo: barra fija arriba (una sola línea a 1440 px) con el alumno, S1–S4 con su RPE, los días, la duración, el guardado, Vista alumno, Copiar, Herramientas y ?. El primer bloque del día aparece sin scroll (≤ 900 px; antes 2948)' },
  { id: 'bld.08', area: 'Builder · Fase 2 (productividad)', fn: 'builderHud', input: { caso: 'unSoloControl' },
    expect: { herramientasPlegadas: true, herramientasSeAbren: true, copiarSoloEnLaBarra: true, menuCopiar: true, abreCopiaDia: true, semana: true, altSemana: true, dia: true }, modo: 'subset',
    nota: 'Un solo control para cada cosa: plantillas, configuración, IA, título con su riel y barra del mesociclo viven en «Herramientas» (plegado); copiar día / semana / plan en el menú «Copiar…» (abre el mismo modal de siempre); semanas (también Alt+1…4) y días se eligen en la barra' },
  { id: 'bld.09', area: 'Builder · Fase 2 (productividad)', fn: 'builderHud', input: { caso: 'dosis' },
    expect: { chips: true, series: true, rir: true, guardando: true, descanso: true, vuelve: true }, modo: 'subset',
    nota: 'Chips de dosis bajo el texto del bloque: series, RIR (con su RPE) y descanso con − / +; escriben el mismo texto («5x5-7 | Tempo 3010 | RIR 1-2», «Rest 195s») y guardan por el camino de siempre (la barra muestra «Guardando…»). Ida y vuelta: el plan queda idéntico' },
  { id: 'bld.10', area: 'Builder · Fase 2 (productividad)', fn: 'builderHud', input: { caso: 'tips' },
    expect: { vista: true, paleta: true, inserta: true }, modo: 'subset',
    nota: 'Tips del bloque: paleta de rótulos (NOTA DEL DÍA, APROXIMACIÓN, POR QUÉ ESTA CANTIDAD DE SERIES, SET-UP, CLAVE, CUIDADO, TRANSICIÓN) que inserta «RÓTULO: » en un renglón nuevo, y la vista plegada tal como la ve el alumno, con aviso de renglones sin rótulo' },
  { id: 'bld.11', area: 'Builder · Fase 2 (productividad)', fn: 'builderHud', input: { caso: 'bisets' },
    expect: { unir: true, separar: true, deshacer: true }, modo: 'subset',
    nota: 'Biset / triset en un toque: «Unir con el bloque siguiente» junta dos bloques en D1 / D2 (letra según la posición) y «Separar estaciones» los devuelve tal cual; ambos se pueden deshacer (CoachUndo)' },
  { id: 'bld.12', area: 'Builder · Fase 2 (productividad)', fn: 'builderHud', input: { caso: 'atajos' },
    expect: { hoja: true, cierra: true, baja: true, conservaFoco: true, sube: true, vistaAbre: true, vistaCierra: true, planIntacto: true }, modo: 'subset',
    nota: 'Atajos a la vista: «?» abre la hoja (Esc la cierra); Alt+↓ / Alt+↑ mueven el bloque con el foco y el foco lo sigue. «Vista alumno» abre y cierra la vista dividida. Después de toda la pasada de la Fase 2 el plan queda idéntico' }
]);
