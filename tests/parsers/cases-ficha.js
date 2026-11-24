/* ============================================================
   CASOS · Body Maintenance (cierres de movilidad de 5-10 min), lectura del día con sugerencias de glúteo y ficha rápida del alumno/a
   El adaptador fichaPlan (runner.html) usa el Builder real: CoachMantenimiento, CoachLecturaDia y CoachFichaRapida. Los casos que
   necesitan un plan arman un alumno de prueba con una plantilla del Banco (construirDias) que vive solo durante el caso; nada se guarda.
   ============================================================ */
window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([

  { id: 'bm.01', area: 'Body Maintenance · banco', fn: 'fichaPlan', input: { caso: 'banco' },
    expect: { cantidad: true, sectoresPedidos: true, extras: true, entre5y10: true, conDosis: true, conObjetivo: true, nombres: true }, modo: 'subset',
    nota: 'Banco de cierres de movilidad / stretching: cadera, hombros, amplitud escapular, dorsiflexión de tobillos, isquios y cadena posterior, lower y upper body completos, más torácica, front rack, press por encima de la cabeza, espalda baja y descarga general; cada rutina dura entre 5 y 10 minutos, tiene objetivo y dosis por movimiento' },
  { id: 'bm.02', area: 'Body Maintenance · cierre del día', fn: 'fichaPlan', input: { caso: 'insertar' },
    expect: { noTocaBloques: true, encabezado: true, nota: true, sinDuplicar: true, dosRutinas: true, quitaUna: true, vuelveAlOriginal: true, reemplaza: true }, modo: 'subset',
    nota: 'Se inserta en el Cool-Down del día (no crea bloques ni toca el entrenamiento): encabezado numerado «Body Maintenance · … (opcional)», la rutina no se duplica, se pueden sumar varias, quitar una deja el cool-down como estaba y «reemplazar» lo deja solo con la rutina' },
  { id: 'bm.03', area: 'Body Maintenance · sugerencia', fn: 'fichaPlan', input: { caso: 'sugerir' },
    expect: { piernaCadera: true, torsoHombros: true, olimpicoFrontRack: true }, modo: 'subset',
    nota: 'La sugerencia sigue a los grupos que trabajó el día: un día de pierna propone cadera / tren inferior / tobillos, uno de torso hombros / escápulas / tren superior y un día con front squat o cargada, movilidad de front rack' },
  { id: 'bm.04', area: 'Body Maintenance · app del alumno', fn: 'fichaPlan', input: { caso: 'cooldownApp' },
    expect: { tarjeta: true, encabezadoComoFase: true, items: true, nota: true }, modo: 'subset',
    nota: 'En la app del alumno la rutina sale en la tarjeta «Cool-Down y Recuperación» con su encabezado como fase, un ítem por movimiento y el objetivo de la rutina abajo' },
  { id: 'lectura.01', area: 'Lectura del día · glúteo', fn: 'fichaPlan', input: { caso: 'lecturaMujer' },
    expect: { reconoceAbduccion: true, prioridadAlta: true, esInferior: true, sugiereEstacion: true, nuncaElPrincipal: true, aplica: true, sumaUnaEstacion: true, sinCrucesDeEstacion: true, sinDosPoleas: true, tituloSigue: true, pautasDeLaEstacion: true, semanaDentroDelMaximo: true, principalIntacto: true }, modo: 'subset',
    nota: 'Alumna con hipertrofia, día de pierna: la abducción caminando con banda cuenta como glúteo medio (con el nombre viejo, entre paréntesis, no se reconocía); en el día de pierna que no tiene glúteo medio el glúteo es prioridad alta, la lectura propone una estación concreta de glúteo (medio o mayor) y al aplicarla entra como A2/A3 de un bloque compatible (nunca el básico, sin cruces ni dos poleas), el título y las pautas acompañan y la semana no pasa el máximo' },
  { id: 'lectura.02', area: 'Lectura del día · glúteo', fn: 'fichaPlan', input: { caso: 'lecturaVaron' },
    expect: { prioridadBase: true, sinAgregarGluteo: true, conLectura: true }, modo: 'subset',
    nota: 'Alumno varón con objetivo de fuerza: el glúteo queda en volumen de base y la lectura no le agrega estaciones de glúteo (igual informa la distribución del día)' },
  { id: 'lectura.03', area: 'Lectura del día · volumen', fn: 'fichaPlan', input: { caso: 'lecturaExceso' },
    expect: { pasaElMaximo: true, pideBajar: true, sinSumarMas: true, noEsElBasico: true, bajaUna: true }, modo: 'subset',
    nota: 'Con el glúteo por encima del máximo semanal la lectura pide bajar una serie (en un accesorio, nunca en el básico), no propone sumar nada y la acción baja exactamente una serie' },
  { id: 'ficha.01', area: 'Ficha rápida · edición', fn: 'fichaPlan', input: { caso: 'fichaCambio' },
    expect: { genero: true, objetivoMulti: true, objetivoQuita: true, restriccionEtiqueta: true, restriccionSeQuita: true, nivel: true, pideAlinear: true }, modo: 'subset',
    nota: 'La ficha rápida cambia género, nivel, objetivos (varios), énfasis y restricciones sobre los mismos campos de siempre (las restricciones como etiqueta «Molestia en …»), y después de un cambio ofrece alinear objetivos y tips' },
  { id: 'ficha.02', area: 'Ficha rápida · alinear', fn: 'fichaPlan', input: { caso: 'alinear' },
    expect: { alineaBloques: true, objetivoReadaptacion: true, lineaFicha: true, cuidaRodilla: true, respetaManual: true, calentamientoIntacto: true, reemplazaSinDuplicar: true, sinRodillaYa: true, forzarIncluyeManual: true }, modo: 'subset',
    nota: 'Alinear con el motor local suma UNA oración al objetivo (manda el objetivo más específico: readaptación) y UNA línea «TU FICHA» a los tips (con el cuidado de la rodilla en los ejercicios que la comprometen) sin tocar el resto del texto ni el calentamiento; respeta lo escrito a mano; al cambiar la ficha reemplaza lo suyo sin duplicar; con el tilde incluye los textos propios' },
  { id: 'ficha.03', area: 'Ficha rápida · IA', fn: 'iaMotor', input: {},
    expect: { fichaIAsoloAutomaticos: true, fichaIAunAviso: true, fichaIAdetiene: true }, modo: 'subset',
    nota: '«Regenerar este día con IA» reescribe objetivo y tips de los bloques del día sin texto propio (el editado a mano queda), da un solo aviso al final y se detiene con ⏹ sin seguir pidiendo bloques' },
  { id: 'bank.bb.04', area: 'Banco · plantillas revisadas (las 12 de Bodybuilding)', fn: 'revisadas', input: {},
    expect: [],
    nota: 'Las 12 plantillas de Bodybuilding (3, 4 y 5 días; masculino y femenino; intermedio y élite) y Recomposición 5 días mujer avanzada: volumen semanal dentro de los rangos del panel (core incluido), sin fatiga axial doble, sin dos poleas ni cruces de estación, el core es un ejercicio que no se repite 3 días, entrada en calor de 4 ejercicios y 7 minutos, sesiones de 90 minutos o menos, sin paréntesis dobles, los bisets quedan como los escribió la plantilla, la búlgara fuera del core y el Día 1 de recomposición con 21 series de tren inferior o menos (antes 26)' },
  { id: 'vista.biset.01', area: 'Vista · biset en naranja', fn: 'bisetNaranja', input: {},
    expect: { recuadro: true, pastilla: true, lineaGuia: true, letras: true, textosLegibles: true, transicion: true, sinAmbar: true }, modo: 'subset',
    nota: 'El biset / triset de la app del alumno usa el naranja de la marca (#EE5A12) en el recuadro, la pastilla, la línea guía y las letras A1/A2 (con texto azul noche encima), y un naranja claro (#FF8A4C) en los textos sobre el fondo oscuro (conector «sin pausa» y transición); nada queda en ámbar' },
  { id: 'lib.v10.01', area: 'Biblioteca · nombres sin paréntesis', fn: 'renombres', input: {},
    expect: { sinParentesis: true, aliasViejo: true, etiquetaLimpia: true, version: true }, modo: 'subset',
    nota: 'Los 8 ejercicios que tenían paréntesis en el nombre se renombran (curl inclinado con mancuernas, abducción caminando con banda, etc.); el nombre viejo queda como alias y la etiqueta del Banco ya no muestra dos paréntesis seguidos' }
]);
