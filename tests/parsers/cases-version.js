/* ============================================================
   CASOS · Versión de la sesión en Sports (ESTÁNDAR · 60 MIN / EXTENDIDA · 90 MIN), notas del ejercicio compactas y plan de cargas por semana
   El adaptador alumnoVersion (runner.html) usa la app del alumno compilada (420 px) y, para los valores por defecto del Banco, el Builder real (plantilla del sistema armada con construirDias).
   Nada se guarda: cada caso devuelve el estado de la app como estaba.
   ============================================================ */
window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([

  { id: 'version.01', area: 'Versión · selector', fn: 'alumnoVersion', input: { caso: 'selector' },
    expect: { dosBotones: true, textoEstandar: true, textoExtendida: true, sinCore: true, activoExtendida: true, activoNaranja: true, visible: true, cambiaAEstandar: true, pastillasDelHeader: true, vuelveAExtendida: true }, modo: 'subset',
    nota: 'En la vista del día de Sports hay un selector claro con «ESTÁNDAR · 60 MIN» y «EXTENDIDA · 90 MIN» (sin la palabra «Core», que se confunde con zona media): el activo va en naranja, tocar uno cambia la versión y el mismo interruptor del Perfil queda con los mismos nombres' },
  { id: 'version.02', area: 'Versión · bloques', fn: 'alumnoVersion', input: { caso: 'filtra' },
    expect: { extendidaTodos: true, estandarSoloPrincipales: true, complementarios: true, hintLista: true, hintSinComplementarios: true, hintExtendida: true }, modo: 'subset',
    nota: 'ESTÁNDAR muestra solo los bloques principales; EXTENDIDA suma los complementarios (los marcados «solo extendida» por el coach). Los bloques que cuentan para «día completo» y para el resumen son los de la versión activa, y el texto de ayuda nombra lo que queda para la extendida (o avisa que las dos son iguales)' },
  { id: 'version.03', area: 'Versión · registros', fn: 'alumnoVersion', input: { caso: 'preserva' },
    expect: { extendidaMuestraTodo: true, estandarOcultaComplementario: true, resumenCuentaSoloVisibles: true, registrosIntactos: true, volvePorCompleto: true, ocultoNoSeBorra: true }, modo: 'subset',
    nota: 'Cambiar de versión no toca nada de lo registrado: las cargas y los bloques tildados del bloque complementario siguen exactos al ocultarlo y al volver a la extendida; el resumen de la sesión cuenta solo los bloques visibles' },
  { id: 'version.05', area: 'Versión · duración estimada', fn: 'alumnoVersion', input: { caso: 'estimada' },
    expect: { aclaraEstimada: true, debajoDeLaExplicacion: true, discreta: true, enIngles: true, builderAclara: true }, modo: 'subset',
    nota: 'Debajo del selector ESTÁNDAR · 60 MIN / EXTENDIDA · 90 MIN, una línea discreta aclara que los tiempos son estimados y varían según la energía, la recuperación, el nivel y el ritmo del día (también en inglés); el chip de duración del Builder dice «≈» y lo mismo' },
  { id: 'version.04', area: 'Versión · Banco', fn: 'alumnoVersion', input: { caso: 'bancoVersion' },
    expect: { warmupNo: true, complementariosSi: true, intervalosSonPrincipales: true, bancoCoreExtendida: true, bancoCierreExtendida: true, hyroxIntervalosEstandar: true, bancoPrincipalesEstandar: true }, modo: 'subset',
    nota: 'El Banco de Rutinas arma las sesiones con la versión ya configurada según categoría y demanda: entrada en calor, fuerza, hipertrofia y accesorios de volumen van en la estándar; core, finisher, cardio y cierre metabólico quedan para la extendida (en Hyrox los intervalos de umbral, el transporte y las estaciones son trabajo principal y van en la estándar; solo el core y el cierre quedan para la extendida); el coach lo cambia bloque por bloque con la visibilidad' },
  { id: 'notas.01', area: 'Tarjeta · notas', fn: 'alumnoVersion', input: { caso: 'notas' },
    expect: { unSoloDesplegable: true, unaSeccionPorEstacion: true, estrategiaPrimero: true, todoAdentro: true, nadaEnLaTarjeta: true, registrarSigueEnLaTarjeta: true, idempotente: true, cajasNoVuelven: true }, modo: 'subset',
    nota: 'v27: Coaching tips, Objetivo fisiológico y Tempo de cada ejercicio (también de cada estación de un biset) van dentro del único desplegable «Pautas técnicas & tips del bloque», después de la estrategia del bloque, en una sección por ejercicio; la tarjeta queda con «Registrar carga» como cierre; el agrupador es idempotente y las cajas no se vuelven a crear en la tarjeta' },
  { id: 'plan.01', area: 'Carga sugerida · plan por semana', fn: 'alumnoVersion', input: { caso: 'plan' },
    expect: { sinRegistroNoInventa: true, cuatroSemanas: true, s1Real: true, s2Sugerida: true, s3Pico: true, s4Descarga: true, rirPorSemana: true, semanaActual: true, rirHolgadoSubeMas: true, rirNormalIgual: true, rirCeroMantiene: true, tarjetaLoDibuja: true }, modo: 'subset',
    nota: 'Con el peso real que el alumno ya cargó (80 kg × 7 en la Semana 1) el plan de cargas muestra cada semana: S1 lo hecho, S2 82,5 kg, S3 (pico) un escalón más y S4 (descarga) 67,5 kg, con el RIR objetivo de cada semana; sin registro no se inventa nada. La sugerencia además se ajusta al esfuerzo marcado: tope del rango con 3 o más reservas sube un escalón más, RIR 0 mantiene la carga' }
]);
