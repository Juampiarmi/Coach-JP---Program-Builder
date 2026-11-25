/* ============================================================
   CASOS · Bordes únicos, notas del ejercicio sin botón suelto, firma sin nombre repetido y generadores de tips del Builder en el formato del Banco de Rutinas
   Mismo adaptador que cases-version.js (alumnoVersion en runner.html): app del alumno compilada (420 px) para lo visual y el Builder real para los generadores y la compilación.
   ============================================================ */
window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([

  { id: 'bordes.01', area: 'Bordes · contorno único', fn: 'alumnoVersion', input: { caso: 'bordes' },
    expect: { sinFileteRecto: true, contornoSoloDelBoton: true, criterioUnaEsquina: true, criterioContornoPropio: true }, modo: 'subset',
    nota: '«Pautas técnicas & tips del bloque» ya no lleva un filete recto por encima del botón (lo dibujaba el <details> de afuera y chocaba con la esquina redondeada): el contorno es solo el del botón (radio 12). «Criterio del día»: la caja y su botón comparten una sola esquina recortada' },
  { id: 'notas.02', area: 'Tarjeta · notas', fn: 'alumnoVersion', input: { caso: 'notasEtiqueta' },
    expect: { sinFilaDeNotas: true, tarjetaTerminaEnRegistrar: true, pautasAntesDelCierre: true, seccionConNombre: true, rotulos: true, contenidoVisible: true }, modo: 'subset',
    nota: 'v27: la tarjeta del ejercicio termina en «Registrar carga», sin la fila de pastillas NOTAS · COACHING · OBJETIVO · TEMPO. Sus notas pasan a «Pautas técnicas & tips del bloque» (aunque el bloque no traiga pautas, se crea el desplegable antes de «Completar bloque»), en una sección con el número y el nombre del ejercicio y los rótulos COACHING · OBJETIVO · TEMPO 2011, con el contenido a la vista' },
  { id: 'firma.01', area: 'Firma · una sola vez', fn: 'alumnoVersion', input: { caso: 'footerUnNombre' },
    expect: { nombreUnaVez: true, arribaConElNombre: true, segundaSinNombre: true, conservaFirma: true, datoGuardadoIntacto: true }, modo: 'subset',
    nota: 'En el cierre de la programación el nombre del atleta figura UNA sola vez (arriba: «COACH JP — Programación generada para …»); la segunda línea queda «Mesociclo de 4 semanas · Planificación personalizada», también en planes ya guardados con el nombre repetido (se quita al compilar, el dato guardado no se toca); la firma del coach y el build se conservan' },
  { id: 'firma.02', area: 'Firma · jerarquía', fn: 'alumnoVersion', input: { caso: 'firmaFooter' },
    expect: { nombreUnaSolaVez: true, sinDivisoresDeColor: true, espaciadoParejo: true }, modo: 'subset',
    nota: 'La firma de la app del alumno no repite el nombre, no suma rayitas de color de adorno (un solo acento: el naranja de «COACH JP») y mantiene un ritmo vertical parejo entre la información, la firma del coach y el build' },
  { id: 'tips.01', area: 'Builder · tips', fn: 'alumnoVersion', input: { caso: 'tipsBanco' },
    expect: { tresLineas: true, rotulosDelBanco: true, textoDelBanco: true, concisas: true, sinEmojis: true, bisetConEstacion: true, notaCompletaIgual: true, bibliotecaLocal: true, respetaNotaEnFormatoBanco: true }, modo: 'subset',
    nota: 'Los generadores de tips del Builder (cambiar o agregar un ejercicio, generar semana, importar, Coach Note de la biblioteca) escriben igual que el Banco de Rutinas: tres puntos cortos SET-UP · CUE EFICIENTE · CUIDADO / ERROR COMÚN con los textos de la misma base de conocimiento, sin emojis de advertencia ni relleno; dentro de un biset cada estación lleva su código («A2 · …») y su tempo; una Coach Note ya escrita en ese formato se respeta' },
  { id: 'tips.02', area: 'Builder · tips', fn: 'alumnoVersion', input: { caso: 'normaliza' },
    expect: { rotulosEstandar: true, otrasLineasIntactas: true, bisetConserva: true, recortaPorOracion: true }, modo: 'subset',
    nota: 'Los tips que devuelve la IA (o que se escriben a mano) con rótulos sueltos (CLAVE, CUIDADO, EJECUCIÓN…) se llevan a los rótulos del Banco (CUE EFICIENTE, CUIDADO / ERROR COMÚN), conservando el código de estación del biset y las líneas de transición, y, si un punto es muy largo, se recorta por oración completa (nunca a mitad de frase ni con puntos suspensivos)' },
  { id: 'tips.03', area: 'Builder · tips', fn: 'alumnoVersion', input: { caso: 'cambioEj' },
    expect: { vacioSeEscribe: true, automaticaSeReescribe: true, manualSeRespeta: true, mismoFormatoQueElBanco: true }, modo: 'subset',
    nota: 'Al cambiar el ejercicio de un bloque las pautas se reescriben en el formato del Banco si estaban vacías o eran las automáticas del ejercicio anterior (antes quedaban las del ejercicio viejo); si el coach las había editado a mano se respetan' },
  { id: 'header.01', area: 'Header · atleta', fn: 'alumnoVersion', input: { caso: 'headerAtleta' },
    expect: { escudoConAire: true, centroOpticoConElTexto: true, sinRecuadro: true, marcaProporcionada: true, activoSobrio: true, nombreDeFicha: true, contextoSutil: true, controlesMismoContorno: true, margenesParejos: true, numerosTabulares: true }, modo: 'subset',
    nota: 'Header del atleta: el escudo dorado sin recuadro tiene aire a los costados y su centro óptico coincide con el bloque de texto; «COACH» y «JP» del mismo tamaño con un acento naranja limpio y sin resplandor; «ACTIVO» discreto (sin cápsula, borde ni rayo); el nombre en mayúsculas y firme, estilo ficha, con una línea sutil de disciplina · nivel; y el botón «…», SEM y DÍA con el mismo radio, borde y altura, con los mismos márgenes laterales que el escudo y números tabulares' },
  { id: 'tips.04', area: 'Builder · tips con IA', fn: 'alumnoVersion', input: { caso: 'tipsIA' },
    expect: { detectaCorte: true, completaTodo: true, conservaLoQueVinoBien: true, sinFragmentoColgado: true, unaSolaEstacionSuelta: true, bisetDosEstaciones: true, completoNoSeToca: true, demandaConNumeros: true, demandaBiset: true, reglasDeProfundidad: true, recorteSinPuntosSuspensivos: true, masEspacioQueAntes: true }, modo: 'subset',
    nota: 'Los tips con IA nunca quedan cortados: una salida truncada a mitad de línea («A1 · CUIDADO /») se detecta, se conserva lo que vino bien y se completa con la base del Banco hasta tener los tres apartados (SET-UP, CUE EFICIENTE, CUIDADO / ERROR COMÚN) por estación, todos con oraciones completas; el prompt recibe la demanda real del bloque (series, repeticiones, RIR, tempo, descanso) y reglas de profundidad (25 a 45 palabras por punto); el límite de espacio sube (antes 320 / 560 tokens) y hay un reintento; nada se recorta con puntos suspensivos' }
]);
