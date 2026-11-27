/* ============================================================
   CASOS · v30: tablero de series · hoja rápida (Opción 4 del Showroom aprobada) y Story Card en HD (2160×3840).
   Adaptador v30 (runner.html): la app del alumno real (jpPizarraSports, jpTablero, CoachStory) dentro del iframe aislado (?jpSandbox=1).
   ============================================================ */
window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([

  { id: 'v30.tb.01', area: 'Tablero de series · fichas', fn: 'v30', input: { caso: 'fichas' },
    expect: { unaFichaPorSerie: true, laQueSigue: true, sugerenciaTenue: true, filasViejasOcultas: true, pastillaSecundaria: true, chakra: true }, modo: 'subset',
    nota: 'Cada ejercicio muestra una ficha por serie: la que sigue con borde cian («S1 · sigue»), las pendientes con la sugerencia tenue («Sug. …», cursiva al 34 %). Las filas de siempre siguen en la tarjeta (mismas claves) pero ocultas; la pastilla queda como acceso a RIR, plan y series extra. Todo en Chakra Petch' },
  { id: 'v30.tb.02', area: 'Tablero de series · hoja rápida', fn: 'v30', input: { caso: 'hoja' },
    expect: { abreHoja: true, botonFijoAbajo: true, sinPesoNoRegistra: true, sugeridoLuegoAjustado: true, guardaEnLaMismaClave: true, cierraHoja: true, fichaHecha: true, herencia: true, desmarca: true }, modo: 'subset',
    nota: 'Tocar una ficha abre la hoja inferior con «✓ Registrar» fijo al pie (≥ 56 px). Sin peso no registra (marca el recuadro). Cada valor pasa de «sugerido» a «ajustado» al escribirlo o con ±2,5 kg; al registrar se guarda con la MISMA clave de la serie (kg, reps, hecha), la hoja se cierra, la ficha queda naranja con 82,5×5 y la siguiente hereda «Sug. 82,5×5». Volver a tocarla y registrar la desmarca' },
  { id: 'v30.tb.03', area: 'Tablero de series · rondas del biset / triset', fn: 'v30', input: { caso: 'rondas' },
    expect: { unaFilaPorRonda: true, estaciones: true, enCurso: true, sinTablerosRepetidos: true, filaAncha: true, hojaConLasTresEstaciones: true, rondaRegistrada: true, resumen: true, siguienteEnCurso: true }, modo: 'subset',
    nota: 'En un triset cada ronda es una fila ancha (nunca columnas apretadas) con sus estaciones «D1 + D2 + D3 · 3 estaciones» y el estado EN CURSO / PENDIENTE. La hoja muestra las tres estaciones; al registrar, las tres series quedan guardadas con sus claves de siempre, la ronda pasa a «✓ HECHA» con el resumen (8×12 · 25×10 · …) y la siguiente queda EN CURSO heredando lo cargado' },
  { id: 'v30.hd.01', area: 'Story Card · HD', fn: 'v30', input: { caso: 'storyHD' },
    expect: { lienzo2160x3840: true, escala2x: true, suavizadoAlto: true, esperaFuentes: true, fotoEnPasos: true }, modo: 'subset',
    nota: 'La Story Card se pinta a 2160×3840 (lienzo lógico 1080×1920 con escala 2×) con suavizado «high»; las fuentes web se esperan antes de pintar y de exportar (promesa); una foto grande se reduce en pasos a la mitad (cada paso ≤ 16 MP, el tope de iOS) hasta quedar a menos de 2× del tamaño final, en vez de achicarla de golpe' }
]);
