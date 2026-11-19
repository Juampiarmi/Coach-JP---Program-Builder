/* ============================================================
   CASOS · Showroom y estilos de tarjeta de ejercicio (fondo azul noche)
   El Showroom del Builder y la app del alumno comparten la estructura de la tarjeta: fila 1 volumen (grande), fila 2 descanso (debajo) y fila 3 técnica (tempo · RIR).
   El estilo (1 Clean Tech · 2 High-Performance · 4 Compacto de élite; el 3 se descartó; el 4 es el estilo por defecto) se aplica con data-jp-estilo.
   ============================================================ */
window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([

  { id: 'est.sr.01', area: 'Showroom · estilos', fn: 'showroom', input: { caso: 'estilos' }, expect: { cantidad: 3, numeros: '1,2,4' }, modo: 'subset',
    nota: 'El Showroom ofrece exactamente 3 estilos: 1 Clean Tech, 2 High-Performance y 4 Compacto de élite (el 3 se descartó)' },
  { id: 'est.sr.02', area: 'Showroom · estilos', fn: 'showroom', input: { caso: 'pantalla' },
    expect: { estilos: '1,2,4', ordenOk: true, tieneVolumen: true, tieneTempoYRir: true, tipsDesplegables: true, fijarDebajo: true, unaSola: true, tabs: 3 }, modo: 'subset',
    nota: 'Cada estilo tiene su pestaña y su tarjeta de muestra completa (volumen grande, descanso debajo, tempo y RIR, coaching tips desplegables) con su botón Fijar como definitivo justo debajo, sin alumno activo' },
  { id: 'est.sr.03', area: 'Showroom · estilos', fn: 'showroom', input: { caso: 'fijar' }, expect: { fijado: 1, rechazaTres: true, enVistas: true, showroomLimpio: true, bodySinAtributo: true }, modo: 'subset',
    nota: 'Fijar un estilo lo guarda, lo aplica a las vistas del Builder y deja limpio el Showroom; el estilo 3 descartado no se acepta' },
  { id: 'est.sr.04', area: 'Showroom · independiente', fn: 'showroom', input: { caso: 'independiente' }, expect: { dibuja: true, sinIframe: true, sello: true, pestanas: 3, sinTres: true, numeros: '1,2,4' }, modo: 'subset',
    nota: 'El Showroom se dibuja limpio sin alumnos, sin plan y sin alumno activo: ya no depende de cargar nada en el Builder' },
  { id: 'est.marca.01', area: 'Marca · encabezado', fn: 'showroom', input: { caso: 'marca' },
    expect: { coachBlanco: true, jpNaranja: true, textoCoachJP: true, escudoDorado: true, rayoNegro: true, sinInsigniaDuplicada: true, sinGradiente: true }, modo: 'subset',
    nota: 'El encabezado del Builder sigue el logotipo oficial: escudo dorado con rayo negro, COACH en blanco puro, JP en el naranja de la marca, sin degradado ni insignia repetida' },
  { id: 'est.rest.01', area: 'Showroom · cronómetro de descanso', fn: 'showroom', input: { caso: 'timer' }, expect: { botonClicable: true, abre: true, tiempo: true, cierra: true }, modo: 'subset',
    nota: 'En el Showroom el botón DESCANSO de la tarjeta de muestra es clicable y abre el cronómetro emergente (cuenta desde 3:00) que se cierra con la X' },
  { id: 'est.rest.02', area: 'App del alumno · cronómetro de descanso', fn: 'alumnoEstilo', input: { caso: 'descanso', seg: 120 }, expect: { abre: true, corre: true, total: 120, etiqueta: true }, modo: 'subset',
    nota: 'Al tocar el botón DESCANSO de una tarjeta, el reloj flotante de descanso salta de inmediato, corre y lleva el nombre del ejercicio' },
  { id: 'est.def.01', area: 'Showroom · estilo de fábrica', fn: 'showroom', input: { caso: 'defecto' }, expect: { vigente: 4, tieneFijado: false, enExportacion: 4, tabActiva: 4 }, modo: 'subset',
    nota: 'Sin nada fijado, el estilo de fábrica es el 4 (Compacto de élite): lo usa el Builder, la pestaña inicial del Showroom y PROGRAM_CONFIG.estiloTarjeta de las nuevas exportaciones' },
  /* ---- tonelaje: un solo criterio ---- */
  { id: 'ton.serie.01', area: 'App del alumno · tonelaje', fn: 'alumnoTon', input: { caso: 'serie', ld: { done: true, kg: '100', reps: '8', ex: 'Sentadilla con barra' } }, expect: 800, nota: 'Una serie tildada suma kg × repeticiones' },
  { id: 'ton.serie.02', area: 'App del alumno · tonelaje', fn: 'alumnoTon', input: { caso: 'serie', ld: { done: false, kg: '100', reps: '8' } }, expect: 0, nota: 'Una serie sin tildar no suma' },
  { id: 'ton.serie.03', area: 'App del alumno · tonelaje', fn: 'alumnoTon', input: { caso: 'serie', ld: { done: true, kg: '20', reps: '12+4+3', ex: 'Curl martillo' } }, expect: 380, nota: 'Myo-Reps / Rest-Pause: se suman todos los tramos (12+4+3 = 19 repeticiones)' },
  { id: 'ton.serie.04', area: 'App del alumno · tonelaje', fn: 'alumnoTon', input: { caso: 'serie', ld: { done: true, kg: '50', reps: '8-10', ex: 'Press' } }, expect: 400, nota: 'Un rango toma el primer número (lo que se hizo de verdad lo escribe el alumno)' },
  { id: 'ton.serie.05', area: 'App del alumno · tonelaje', fn: 'alumnoTon', input: { caso: 'serie', ld: { done: true, kg: '20', reps: '10', ex: 'Sentadilla búlgara con torso inclinado', uni: 1 } }, expect: 400, nota: 'Unilateral (por pierna / por lado): la carga se movió con los dos lados, cuenta por 2' },
  { id: 'ton.serie.06', area: 'App del alumno · tonelaje', fn: 'alumnoTon', input: { caso: 'serie', ld: { done: true, kg: '24', reps: '40', ex: 'Farmer carry', u: 'm' } }, expect: 0, nota: 'Acarreos, metros y segundos no son tonelaje (kg × metros inflaría el total)' },
  { id: 'ton.dia.01', area: 'App del alumno · tonelaje', fn: 'alumnoTon',
    input: { caso: 'dia', dia: { id: 'dX', blocks: [{ id: 'b1' }] }, loads: { '0|dX|b1|0|1': { done: true, kg: '60', reps: '10', ex: 'Press' }, '0|dX|b1|0|2': { done: true, kg: '60', reps: '10', ex: 'Press' }, '0|dX|b9|0|1': { done: true, kg: '200', reps: '10', ex: 'Resto de otro plan' }, '1|dX|b1|0|1': { done: true, kg: '60', reps: '10', ex: 'Press' } } },
    expect: 1200, nota: 'El tonelaje del día cuenta solo las series de ESA semana y de los bloques que existen hoy: los restos de un plan anterior con el mismo id de día no inflan el total' },
  /* ---- pautas del bloque y recuadros de la tarjeta ---- */
  { id: 'pau.quitar.01', area: 'App del alumno · pautas', fn: 'alumnoPautas',
    input: { caso: 'quitar', nEj: 1, texto: 'POR QUÉ ESTÁ ACÁ: x\nSET-UP: a\nCUE EFICIENTE: b\nCUIDADO / ERROR COMÚN: c\nTEMPO: Tempo 3010 (3 s bajada)\nRAMP-UP: d\nPROGRESIÓN: e' },
    expect: ['POR QUÉ ESTÁ ACÁ: x', 'RAMP-UP: d', 'PROGRESIÓN: e'], nota: 'Set-up, clave (cue), cuidado y tempo ya están en la tarjeta del ejercicio: no se repiten en las pautas del bloque' },
  { id: 'pau.quitar.02', area: 'App del alumno · pautas', fn: 'alumnoPautas',
    input: { caso: 'quitar', nEj: 2, texto: 'A1 · SET-UP: a\nA2 · SET-UP: b\nSET-UP: general del biset\nTRANSICIÓN: pasá sin descanso' },
    expect: ['SET-UP: general del biset', 'TRANSICIÓN: pasá sin descanso'], nota: 'En un biset solo se quitan las líneas con letra de estación (A1 · ...), que son las que muestra cada tarjeta; las generales se conservan' },
  { id: 'pau.cajas.01', area: 'App del alumno · pautas', fn: 'alumnoPautas', input: { caso: 'cajas', tempo: '3110', objetivo: '<p>Objetivo</p>', dos: true },
    expect: { objetivoEnPrimera: 1, objetivoEnSegunda: 0, tempoEnPrimera: 1, explica: true, tempoEnSegunda: 1 }, modo: 'subset',
    nota: 'El objetivo fisiológico va una vez, al pie de la primera tarjeta, y el tempo (cadencia) al pie de cada ejercicio, explicado con el de su propia ficha' },
  /* ---- banco femenino: Constructor de Glúteos ---- */
  { id: 'bank.glu.01', area: 'Banco · Bodybuilding femenino', fn: 'bancoGluteos', input: '', expect: [],
    nota: 'Las 6 plantillas femeninas de bodybuilding: sin dominadas lastradas ni core avanzado ni sentadilla con barra; con hip thrust pesado con pausa de 2 s, peso muerto rumano con déficit, búlgara con el torso inclinado, patada en polea cruzada y trabajo unilateral de cadera' },
  { id: 'est.stu.01', area: 'App del alumno · estilos', fn: 'alumnoEstilo', input: { caso: 'aplicar', valores: [1, 2, 3, 4, 9, 0, 'x'] }, expect: ['1:1', '2:2', '4:4', '4:4', '4:4', '4:4', '4:4'],
    nota: 'jpEstiloTarjeta acepta 1, 2 y 4; cualquier otro valor (incluido el 3 descartado) cae en el estilo 4, el de fábrica' },
  { id: 'est.stu.02', area: 'App del alumno · estilos', fn: 'alumnoEstilo', input: { caso: 'config' }, expect: { valido: true, coincide: true }, modo: 'subset',
    nota: 'El estilo que fijó el coach (PROGRAM_CONFIG.estiloTarjeta, por defecto el 4) es de 1 a 4 y es el que la app del alumno aplica al body' },
  { id: 'est.dos.01', area: 'App del alumno · tarjeta', fn: 'alumnoEstilo', input: { caso: 'dosis', args: [4, '5-7', 'reps', '3010', '2', 180, '', null, false, '', false] },
    expect: { vol: '4 SERIES × 5-7 REPS', tempo: 'TEMPO 3010', rir: 'RIR 2', filas: 3, orden: true }, modo: 'subset',
    nota: 'La barra de dosis va en tres filas: volumen (4 SERIES × 5-7 REPS), descanso debajo, y tempo + RIR en la línea técnica' },
  { id: 'est.dos.02', area: 'App del alumno · tarjeta', fn: 'alumnoEstilo', input: { caso: 'dosis', args: [3, '30', 'seg', '', '', 0, '', null, true, '', false] },
    expect: { vol: '3 SERIES × 30 SEG', tempo: null, rir: null, filas: 2 }, modo: 'subset',
    nota: 'Sin tempo ni RIR no se inventa la fila técnica; una estación intermedia de biset muestra "sin descanso" debajo del volumen' },

  /* ---- Story Card: énfasis muscular sin repetir PIERNA ---- */
  { id: 'story.enf.01', area: 'Story Card · énfasis muscular', fn: 'alumnoStory', input: { caso: 'grupos', det: [{ ex: 'Sentadilla con barra', n: 4 }, { ex: 'Elevación de talones de pie', n: 3 }, { ex: 'Curl femoral tumbado', n: 3 }] }, expect: ['CUÁDRICEPS', 'GEMELOS', 'ISQUIOS'],
    nota: 'Un día de pierna lista solo los músculos específicos (cuádriceps, isquios, gemelos): ya no aparece un renglón general PIERNA encima de ellos' },
  { id: 'story.enf.02', area: 'Story Card · énfasis muscular', fn: 'alumnoStory', input: { caso: 'texto', det: [{ ex: 'Sentadilla con barra', n: 4 }, { ex: 'Elevación de talones de pie', n: 3 }, { ex: 'Curl femoral tumbado', n: 3 }] }, expect: { inferior: true, sinPierna: true }, modo: 'subset',
    nota: 'La referencia general al tren inferior queda en el texto descriptivo, sin nombrar "pierna" como un grupo más' },
  { id: 'story.enf.03', area: 'Story Card · énfasis muscular', fn: 'alumnoStory', input: { caso: 'grupos', det: [{ ex: 'Press de banca plano con barra', n: 4 }, { ex: 'Remo con barra', n: 3 }] }, expect: ['PECHO', 'ESPALDA'], nota: 'Un día de torso no cambia' },
  /* ---- piel: íconos a color y barra de activación ---- */
  { id: 'piel.ico.01', area: 'App del alumno · íconos', fn: 'alumnoPiel', input: { caso: 'emoji' }, expect: { objetivo: 'none', calendario: 'none', cierreNegro: true }, modo: 'subset',
    nota: 'Los emojis de la tarjeta (objetivo, tempo, calendario, cronómetro) se ven a color, sin filtro de escala de grises; solo el del botón ámbar de cierre sigue en negro' },
  { id: 'piel.act.01', area: 'App del alumno · activación', fn: 'alumnoPiel', input: { caso: 'activacion' }, expect: { sinBordeDoble: true, sinRelleno: true, altoMinimo: true }, modo: 'subset',
    nota: 'La barra ACTIVACIÓN no lleva un segundo borde ni el relleno inferior que la dejaba pegada y solapada con el borde del bloque siguiente' },
  { id: 'piel.cf.01', area: 'App del alumno · piel CrossFit', fn: 'alumnoPiel', input: { caso: 'crossfit' },
    expect: { tarjeta: 'rgb(19, 31, 67)', bordeMetcon: 'rgb(238, 90, 18)', bordeStrength: 'rgb(92, 225, 255)', etiqueta: 'rgb(92, 225, 255)', filas: 'rgb(15, 25, 56)', chip: 'rgb(26, 40, 80)', campo: 'rgb(11, 19, 48)', cta: 'rgb(255, 194, 75)', cierre: 'rgb(26, 40, 80)', sinMarcoDoble: true, sinNegro: true }, modo: 'subset',
    nota: 'CrossFit & Hyrox usa la misma piel azul noche que Sports: tarjeta de la pizarra, filas, chips y campos en las superficies de la paleta, el color de la fase en el borde y la etiqueta (naranja de la marca solo en el WOD), ámbar en la acción principal y ningún fondo negro neutro; el cajón que envuelve a la pizarra no dibuja un segundo marco' }
]);
