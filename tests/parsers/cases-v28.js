/* ============================================================
   CASOS · v28: bisets marcados siempre y con el registro al final, casilleros neutros hasta completarlos, video junto al nombre,
   Pizarra del Coach = plan del alumno y plan() que completa sin pisar lo guardado.
   Adaptador v28 (runner.html): la app del alumno real (jpPizarraSports) y el Builder real dentro del iframe aislado.
   ============================================================ */
window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([

  { id: 'v28.bis.01', area: 'Biset · registro al final', fn: 'v28', input: { caso: 'registro' },
    expect: { alFinal: true, ordenYLetra: true, titulo: true, nadaIntercalado: true, estacionesSiguen: true, triset: true }, modo: 'subset',
    nota: 'Las tarjetas «Registrar carga» de un biset / triset ya no quedan intercaladas entre A1 y A2: se juntan al final del recuadro del biset («REGISTRO DEL BISET · A1 · A2»), en orden y con su letra; en un triset, las tres' },
  { id: 'v28.bis.02', area: 'Biset · marcado por título', fn: 'v28', input: { caso: 'porTitulo' },
    expect: { esBiset: true, naranja: true, pastilla: true, mismasClavesDeRegistro: true, sinTituloNoSeAgrupa: true }, modo: 'subset',
    nota: 'Un bloque titulado «Biset · …» cuyos ejercicios vienen sin letra A1/A2 también se dibuja como biset naranja (pastilla incluida), y cada estación conserva su clave de registro de siempre (e0, e1): las cargas ya anotadas siguen apareciendo. Sin «Biset» en el título no se agrupa nada' },
  { id: 'v28.cas.01', area: 'Tarjeta · casilleros de serie', fn: 'v28', input: { caso: 'casillas' },
    expect: { vacioNeutro: true, completoNaranja: true, checkVacioNeutro: true, checkCompletoNaranja: true }, modo: 'subset',
    nota: 'El casillero ✓ de cada serie es neutro (fondo apagado, borde claro) mientras está vacío y se pinta del naranja de la marca (#EE5A12) recién al completarlo; igual el casillero de los bisets heredados (antes arrancaba en naranja y al completarse pasaba a gris, o verde)' },
  { id: 'v28.vid.01', area: 'Tarjeta · video junto al nombre', fn: 'v28', input: { caso: 'video' },
    expect: { videoArribaDerecha: true, legadoNaranja: true, legadoVideoYDosis: true }, modo: 'subset',
    nota: 'El botón de video queda arriba a la derecha, al lado del nombre del ejercicio (también en cada estación del biset). Los bisets heredados (bloque superset) usan la misma línea y letras naranjas, con el video a la derecha del nombre y la dosis debajo' },
  { id: 'v28.pz.01', area: 'Pizarra del Coach · plan real', fn: 'v28', input: { caso: 'pizarra' },
    expect: { mismaFuenteQueElAlumno: true, semana1: true, semana2ComoElAlumno: true, sinBloquesQueNoViajan: true, planIntacto: true }, modo: 'subset',
    nota: 'La Pizarra del Coach se arma con buildProgramConfig() (la misma función que compila la app del alumno) sobre una copia del plan: la semana 2 muestra la dosis proyectada que ve el alumno (antes, siempre la de la semana 1), un bloque vacío que no viaja al alumno tampoco aparece y el plan guardado no cambia' },
  { id: 'v28.plan.01', area: 'Planes guardados · recarga', fn: 'v28', input: { caso: 'planNorm' },
    expect: { mesoConservado: true, faltantesCompletados: true, estadoConservado: true, sinDiasFantasma: true }, modo: 'subset',
    nota: 'plan() completa sin pisar: un mesociclo guardado al que le falta «phase» en la Semana 1 conserva sus nombres y notas (antes se reemplazaban las 4 semanas por las de fábrica), un estado guardado no vuelve a «borrador» y un plan sin freqBase no recibe días vacíos al recargar' }
]);
