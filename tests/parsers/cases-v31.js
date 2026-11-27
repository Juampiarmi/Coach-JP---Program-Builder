/* ============================================================
   CASOS · v31: refinamiento visual y de usabilidad de la vista del alumno (Revisión 4 en la app real).
   Adaptador v30 (runner.html), casos nuevos: rir, bisetLimpio, fichas4, header, fab, cierre.
   ============================================================ */
window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([

  { id: 'v31.rir.01', area: 'Tarjeta · RIR explicado', fn: 'v30', input: { caso: 'rir' },
    expect: { uno: true, rango: true, fallo: true, ceroUno: true, conPrefijo: true, invalido: true, enLaTarjeta: true, dosisIntacta: true }, modo: 'subset',
    nota: 'El RIR conserva el dato técnico (RIR 1-2) y suma una aclaración corta para el alumno («te guardás 1–2 reps», «al fallo» para RIR 0) (v32: en «Pautas técnicas & tips del bloque», fuera de la tarjeta); la barra de dosis que arma jpDosisHtml no cambia' },
  { id: 'v31.bis.01', area: 'Biset · estaciones y rondas', fn: 'v30', input: { caso: 'bisetLimpio' },
    expect: { dosisPropia: true, unSoloSinPausa: true, valorPorEstacion: true, cantidadExplicita: true, masPlegado: true }, modo: 'subset',
    nota: 'Cada estación muestra su propia prescripción (8-10 REPS) sin repetir «3 RONDAS ×»; el «sin pausa» es un solo conector (la celda «SIN DESCANSO» de cada estación ya no se repite); cada ronda muestra el valor de cada estación con su letra (A1 26×10 · A2 …) sin etiquetas repetidas (v32: la cantidad solo si la ronda tiene menos estaciones); los «Más del registro» de las estaciones van plegados en un solo desplegable' },
  { id: 'v31.tb.01', area: 'Tablero de series · 4 columnas', fn: 'v30', input: { caso: 'fichas4' },
    expect: { cuatroColumnas: true, etiquetasCortas: true, soloHoy: true }, modo: 'subset',
    nota: 'Las fichas S1–S4 van en 4 columnas con etiquetas cortas («S2 · SUG.», el valor tenue) sin repetir el rango de reps ni «registrada»; la pastilla ya no muestra la referencia de otra semana: solo el contexto de hoy' },
  { id: 'v31.hd.01', area: 'Header · selector y contexto', fn: 'v30', input: { caso: 'header' },
    expect: { sinCalendario: true, nivelEnElSubtitulo: true, rirExplicadoEnMetricas: true }, modo: 'subset',
    nota: 'El botón del día ya no trae el emoji de calendario (en iPhone se dibuja con un número de fecha que no es la del día); el subtítulo del header suma el nivel del alumno (Bodybuilding · Intermedio) aunque el plan no lo traiga; la métrica RIR OBJETIVO aclara «reps en recámara»' },
  { id: 'v31.fab.01', area: 'Cierre · botón flotante', fn: 'v30', input: { caso: 'fab' },
    expect: { hayBoton: true, seCorreSiTapa: true, vuelveSolo: true, margenAbajo: true }, modo: 'subset',
    nota: 'Si el botón flotante quedaría encima de una ronda, una ficha, «Generar Story Card» o «Finalizar día», se corre hacia afuera y vuelve solo; el contenido del día termina con margen suficiente (≥ 100 px) para quedar por encima del botón' },
  { id: 'v31.cierre.01', area: 'Cierre · Revisión 4', fn: 'v30', input: { caso: 'cierre' },
    expect: { finalizarNaranja: true, storyCianSobrio: true, resumenConBarra: true, chakra: true }, modo: 'subset',
    nota: 'El cierre de la sesión toma la paleta de la Revisión 4: «Finalizar día y enviar reporte» en el naranja de la marca, «Generar Story Card» con contorno cian sobrio, el resumen con barra lateral cian, todo en Chakra Petch' }
]);
