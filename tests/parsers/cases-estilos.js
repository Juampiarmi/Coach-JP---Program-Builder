/* ============================================================
   CASOS · Showroom y estilos de tarjeta de ejercicio (fondo azul noche)
   El Showroom del Builder y la app del alumno comparten la estructura de la tarjeta: fila 1 volumen (grande), fila 2 descanso (debajo) y fila 3 técnica (tempo · RIR).
   El estilo (1 Clean Tech · 2 High-Performance · 3 Pulse · 4 Compacto de élite) se aplica con data-jp-estilo.
   ============================================================ */
window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([

  { id: 'est.sr.01', area: 'Showroom · estilos', fn: 'showroom', input: { caso: 'estilos' }, expect: { cantidad: 4, numeros: '1,2,3,4' }, modo: 'subset',
    nota: 'El Showroom ofrece exactamente 4 estilos' },
  { id: 'est.sr.02', area: 'Showroom · estilos', fn: 'showroom', input: { caso: 'pantalla' },
    expect: { stages: 4, estilos: '1,2,3,4', ordenOk: true, tieneVolumen: true, tieneTempoYRir: true, tipsDesplegables: true, botonesFijar: 4 }, modo: 'subset',
    nota: 'La vista compara los 4 estilos con la misma tarjeta: volumen grande, descanso debajo, tempo y RIR, coaching tips desplegables y un botón para fijar cada uno' },
  { id: 'est.sr.03', area: 'Showroom · estilos', fn: 'showroom', input: { caso: 'fijar' }, expect: { fijado: 3, enVistas: true, showroomLimpio: true, bodySinAtributo: true }, modo: 'subset',
    nota: 'Fijar un estilo lo guarda, lo aplica a las vistas del Builder y deja limpio el Showroom (así las muestras no heredan el estilo fijado)' },
  { id: 'est.sr.04', area: 'Showroom · vista real', fn: 'showroom', input: { caso: 'real' }, expect: { hayHtml: true, azulNoche: true, conEstilo: true, sinResiduo: true, sello: true, contenedorReal: true }, modo: 'subset',
    nota: 'El Showroom arma la app del alumno real (fondo azul noche, estilos conmutables) con un alumno de muestra que no deja rastro, y muestra el sello de versión nuevo' },
  { id: 'est.marca.01', area: 'Marca · encabezado', fn: 'showroom', input: { caso: 'marca' },
    expect: { coachBlanco: true, jpNaranja: true, textoCoachJP: true, escudoDorado: true, rayoNegro: true, sinInsigniaDuplicada: true, sinGradiente: true }, modo: 'subset',
    nota: 'El encabezado del Builder sigue el logotipo oficial: escudo dorado con rayo negro, COACH en blanco puro, JP en el naranja de la marca, sin degradado ni insignia repetida' },
  { id: 'est.rest.01', area: 'Showroom · cronómetro de descanso', fn: 'showroom', input: { caso: 'timer' }, expect: { botonClicable: true, abre: true, tiempo: true, cierra: true }, modo: 'subset',
    nota: 'En el Showroom el botón DESCANSO de la tarjeta de muestra es clicable y abre el cronómetro emergente (cuenta desde 3:00) que se cierra con la X' },
  { id: 'est.rest.02', area: 'App del alumno · cronómetro de descanso', fn: 'alumnoEstilo', input: { caso: 'descanso', seg: 120 }, expect: { abre: true, corre: true, total: 120, etiqueta: true }, modo: 'subset',
    nota: 'Al tocar el botón DESCANSO de una tarjeta, el reloj flotante de descanso salta de inmediato, corre y lleva el nombre del ejercicio' },
  { id: 'est.stu.01', area: 'App del alumno · estilos', fn: 'alumnoEstilo', input: { caso: 'aplicar', valores: [1, 2, 3, 4, 9, 0, 'x'] }, expect: ['1:1', '2:2', '3:3', '4:4', '2:2', '2:2', '2:2'],
    nota: 'jpEstiloTarjeta acepta 1 a 4; cualquier otro valor cae en el estilo 2 (el de la marca)' },
  { id: 'est.stu.02', area: 'App del alumno · estilos', fn: 'alumnoEstilo', input: { caso: 'config' }, expect: { valido: true, coincide: true }, modo: 'subset',
    nota: 'El estilo que fijó el coach (PROGRAM_CONFIG.estiloTarjeta, por defecto el 2) es de 1 a 4 y es el que la app del alumno aplica al body' },
  { id: 'est.dos.01', area: 'App del alumno · tarjeta', fn: 'alumnoEstilo', input: { caso: 'dosis', args: [4, '5-7', 'reps', '3010', '2', 180, '', null, false, '', false] },
    expect: { vol: '4 SERIES × 5-7 REPS', tempo: 'TEMPO 3010', rir: 'RIR 2', filas: 3, orden: true }, modo: 'subset',
    nota: 'La barra de dosis va en tres filas: volumen (4 SERIES × 5-7 REPS), descanso debajo, y tempo + RIR en la línea técnica' },
  { id: 'est.dos.02', area: 'App del alumno · tarjeta', fn: 'alumnoEstilo', input: { caso: 'dosis', args: [3, '30', 'seg', '', '', 0, '', null, true, '', false] },
    expect: { vol: '3 SERIES × 30 SEG', tempo: null, rir: null, filas: 2 }, modo: 'subset',
    nota: 'Sin tempo ni RIR no se inventa la fila técnica; una estación intermedia de biset muestra "sin descanso" debajo del volumen' }
]);
