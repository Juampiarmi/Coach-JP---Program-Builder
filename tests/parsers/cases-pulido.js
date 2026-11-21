/* ============================================================
   CASOS · Pulido fino de la app del alumno: esquinas y bordes, marca del header, pautas alineadas, Perfil & Ajustes, Guía de entrenamiento y datos reales de la Story Card
   El adaptador alumnoPulido (runner.html) usa la app del alumno compilada (ancho 420 px), inserta piezas de muestra con la misma estructura que la real y las mide con getComputedStyle.
   Los casos de la Story Card cargan series de prueba en el estado de la app, comparan lo que la tarjeta recibe contra la suma hecha a mano y devuelven el estado como estaba.
   ============================================================ */
window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([

  { id: 'pulido.01', area: 'Pulido · esquinas', fn: 'alumnoPulido', input: { caso: 'esquinas' },
    expect: { sinDesenfoqueAnidado: true, bloqueRedondo: true, tarjetaRedonda: true, barraDorada: true, sinBordeGruesoIzq: true, radiosHermanos: true, activacionRecortada: true }, modo: 'subset',
    nota: 'Esquinas nítidas: sin desenfoque de fondo anidado en el bloque y su tablero, la barra dorada de la tarjeta del ejercicio es una pieza recortada por la esquina (no un borde izquierdo grueso que se afina), las cajas hermanas comparten borde y radio, y «Activación» queda recortada por la tarjeta redondeada' },
  { id: 'pulido.02', area: 'Pulido · marca', fn: 'alumnoPulido', input: { caso: 'marca' },
    expect: { jpMasGrande: true, jpPesado: true, jpNaranja: true, coachBlanco: true, coachNoPierdePeso: true }, modo: 'subset',
    nota: 'En el header «JP» es más grande que «COACH» (1,6 veces), en peso 900 y naranja de la marca; «COACH» sigue en blanco' },
  { id: 'pulido.03', area: 'Pulido · pautas', fn: 'alumnoPulido', input: { caso: 'pautas' },
    expect: { izquierda: true, derecha: true, mismoAncho: true }, modo: 'subset',
    nota: '«Pautas técnicas & tips del bloque» queda alineada con las filas desplegables de adentro de la tarjeta (Registrar carga, Coaching tips, Objetivo, Tempo): mismo borde izquierdo, derecho y ancho' },
  { id: 'pulido.04', area: 'Pulido · ajustes', fn: 'alumnoPulido', input: { caso: 'ajustes' },
    expect: { activoNaranja: true, inactivoApagado: true, apagadoGris: true, semanaActivaResaltada: true, tarjetaProgramaConAire: true }, modo: 'subset',
    nota: 'En Perfil & Ajustes el elegido de cada selector (KG/LBS, ON/OFF, AUTO/ES/EN, A/A+/A++) es un relleno naranja con texto blanco y el no elegido queda apagado; el «OFF» elegido se ve gris azulado (no se lee como encendido); la semana activa del programa va resaltada y la tarjeta tiene aire' },
  { id: 'pulido.05', area: 'Pulido · voz y pausa', fn: 'alumnoPulido', input: { caso: 'voz' },
    expect: { juntos: true, unaTarjeta: true, filasSinTarjeta: true, guiaEs: true, guiaEn: true, pausarAnchoCompleto: true, margenInferior: true }, modo: 'subset',
    nota: 'Los controles de la voz (activar, idioma, probar) viven en una sola tarjeta con una guía corta en español e inglés, «Pausar sesión» ocupa el ancho de su fila y el scroll del panel deja margen para que el bloque «Coach» del final no quede cortado' },
  { id: 'pulido.06', area: 'Pulido · guía', fn: 'alumnoPulido', input: { caso: 'guiaTexto' },
    expect: { n: 5, primera: 'Push / Pull / Pierna completa.', decimalesEnteros: true, vacio: 0, tituloEnNegrita: true, sinTitulo: true, contenedorEsDiv: true }, modo: 'subset',
    nota: 'La explicación técnica del mesociclo se parte en oraciones (sin cortar decimales como «2,5%» ni los paréntesis), una oración con «Título: detalle» lleva el título en negrita y el contenedor ya no es un <p> (llevaba una lista adentro)' },
  { id: 'pulido.07', area: 'Pulido · semanas', fn: 'alumnoPulido', input: { caso: 'semanas' },
    expect: { badgeEnLaPrimeraLinea: true, descripcionAnchoCompleto: true, cargaNaranja: true, picoRelleno: true, descargaCyan: true, distintasDeCarga: true, semanasReales: true }, modo: 'subset',
    nota: 'Cada tarjeta de semana lleva título y badge de RPE/RIR en la primera línea y la descripción a todo el ancho debajo (el badge ya no parte el texto); la semana de pico es naranja relleno y la de descarga es cyan, distinta de las de carga (y la app genera esas clases desde las semanas reales del plan)' },
  { id: 'pulido.08', area: 'Pulido · pestañas', fn: 'alumnoPulido', input: { caso: 'pestanas' },
    expect: { tresIconosDeLinea: true, mismoTamano: true, sinEmoji: true, activaNaranja: true, inactivaAzul: true, barraAzulNoche: true, barraAlBordeDeArriba: true, barraAnchoCompleto: true }, modo: 'subset',
    nota: 'Las pestañas Técnica / Glosario / Zonas FC llevan íconos de línea del mismo tamaño y trazo (sin emojis de colores), la activa va en naranja, y la barra es azul noche (no negra), llega al borde de arriba y a los costados del modal' },
  { id: 'pulido.09', area: 'Story Card · datos', fn: 'alumnoPulido', input: { caso: 'storyDatos' },
    expect: { tonelaje: 1920, series: 4, reps: 28, sinTiempoInventado: true, tiempoMedido: true, mismoTonelaje: true, latidoSoloConAccion: true, latidoVencido: true, sesionSinHacer: true, sesionHecha: true, rpeSoloDelDia: true,
      prDeHoy: true, prViejoNoCuenta: true, prDeOtroDiaNoCuenta: true, sinHacerSinKilos: true, kilosRegistrados: true }, modo: 'subset',
    nota: 'La Story Card muestra lo registrado: tonelaje (kg × reps de las series tildadas, no las sin tildar), series y repeticiones exactos; el tiempo solo si está medido (primera y última serie) y vacío si no (antes mostraba «2 h 00 m» inventadas); abrir la app sin entrenar no suma tiempo; «sesión N de M» no cuenta dos veces el día concluido; el RPE ignora bloques de un plan viejo; en CrossFit el PR es solo de hoy y de un ejercicio del día y el volumen prescripto no se cuenta si el bloque no se hizo' }
]);
