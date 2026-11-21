/* ============================================================
   CASOS · Vista del entrenamiento en el celular: alineación, subtítulos, desplegable de pautas, encabezado de cardio, videos sin repetir, firma, menú y pantalla completa del timer
   El adaptador alumnoVista (runner.html) usa la app del alumno compilada (ancho 420 px) con piezas de muestra insertadas en el documento y las mide con getComputedStyle.
   ============================================================ */
window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([

  { id: 'vista.01', area: 'Vista · márgenes', fn: 'alumnoVista', input: { caso: 'margenes' },
    expect: { encabezadoSinRelleno: true, filaDiasConMargen: true, bloquesIgualQueEncabezado: true }, modo: 'subset',
    nota: 'Las cajas con borde y el encabezado del día (título, tarjetas, directiva) comparten el mismo margen lateral y la fila de semana / día ya no toca los bordes de la pantalla (antes el encabezado tenía 4 px de más y las cajas parecían sobresalir)' },
  { id: 'vista.02', area: 'Vista · subtítulos', fn: 'alumnoVista', input: { caso: 'subtitulos' },
    expect: { dia: 'rgb(238, 90, 18)', etiquetaBloque: 'rgb(238, 90, 18)', minutos: true, activacion: 'rgb(238, 90, 18)' }, modo: 'subset',
    nota: 'Los subtítulos y rótulos de sección y de bloque ([ DÍA 1 · SEMANA 1 ], [ BIOMECÁNICA APLICADA · … ], ACTIVACIÓN) van en el naranja de la marca' },
  { id: 'vista.03', area: 'Vista · pautas', fn: 'alumnoVista', input: { caso: 'pautas' },
    expect: { chevron: true, borde: true, puntero: true, giraAlAbrir: true, respuestaAlTocar: true }, modo: 'subset',
    nota: '«Pautas técnicas & tips del bloque» se ve como un desplegable: caja con borde, chevron dorado discreto que gira al abrir y respuesta visual al pasar o tocar' },
  { id: 'vista.04', area: 'Vista · cardio', fn: 'alumnoVista', input: { caso: 'encabezadoCardio' },
    expect: { enColumna: true, sinCorchetes: true, titulo: true, subtituloNaranja: true, barraEscudo: true, sinPastilla: true }, modo: 'subset',
    nota: '«EMOM 12 MIN» y «3 INTERVALOS» se ven como el encabezado del bloque (título grande y subtítulo naranja con la barra amarilla del escudo), no como dos botoncitos' },
  { id: 'vista.05', area: 'Vista · videos', fn: 'alumnoVista', input: { caso: 'videos' },
    expect: { repetidoOculto: true, nuevoVisible: true, duplicadoEnListaOculto: true, tituloVisible: true, todoRepetidoOculta: true }, modo: 'subset',
    nota: 'Un video que ya está en línea dentro del bloque no se repite en «Videos técnicos del bloque», un mismo video no aparece dos veces en la lista y, si no queda ninguno, desaparece también el título' },
  { id: 'vista.06', area: 'Vista · firma', fn: 'alumnoVista', input: { caso: 'firma' },
    expect: { bordeEscudo: true, tarjeta: true, nombreBlanco: true, rolSinCyanPleno: true, acentos: true }, modo: 'subset',
    nota: 'La firma de la programación es una tarjeta con borde amarillo del escudo, nombre en blanco con acento naranja, cargo en azul tenue con acento cyan y la versión discreta (se fueron el cargo en cyan pleno y el gris suelto)' },
  { id: 'vista.07', area: 'Timer · pantalla completa', fn: 'alumnoVista', input: { caso: 'pantallaCompletaFases' },
    expect: { sinMarco: true, prep: 'rgb(245, 197, 24)', trabajo: 'rgb(255, 106, 31)', descanso: 'rgb(0, 229, 255)', barraTrabajo: true, barraDescanso: true, distintos: true, relojNaranja: true, relojDescansoCyan: true, rondaSinPastilla: true, escudoOro: true, sinNeon: true, firmaAbajo: true, firmaGrande: true }, modo: 'subset',
    nota: 'La pantalla completa del timer NO lleva marco ni recuadro amarillo estático (el borde solo se enciende de forma rítmica en el 3-2-1), los números del reloj van en naranja sin neón en todas las fases, la fase se distingue por el rótulo, la barra y la pastilla (trabajo naranja, descanso cyan, preparación amarillo, también en los últimos 10 s) y la firma COACH JP queda abajo, más grande. Actualización: el descanso va en cyan también en el reloj (no solo en el rótulo), «RONDA n / N» es texto sin pastilla y el contorno del escudo de fondo es dorado' },
  { id: 'vista.08', area: 'Menú del header', fn: 'alumnoVista', input: { caso: 'menuPerfil' },
    expect: { menuTiene: true, aunNoAbre: true, abreDespues: true, noSeCierra: true }, modo: 'subset',
    nota: '«Perfil, credencial y archivos» abre el panel de Perfil: el clic de afuera del panel lo cerraba en el acto (parecía un botón muerto); ahora se abre en el turno siguiente y se queda abierto' }
]);
