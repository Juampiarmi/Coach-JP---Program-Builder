/* ============================================================
   CASOS · Persistencia blindada y orden A–Z de alumnos (v27)
   El adaptador persistencia (runner.html) usa el Builder real dentro del iframe aislado (?jpSandbox=1): cada caso arma su estado de prueba
   y al terminar repone el de la app. Nada llega al almacenamiento real del navegador.
   ============================================================ */
window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([

  { id: 'datos.01', area: 'Datos · aislamiento de pruebas', fn: 'persistencia', input: { caso: 'aislado' },
    expect: { sandbox: true, noLlegaAlReal: true, escribeEnMemoria: true, realIntacto: true, sinNube: true }, modo: 'subset',
    nota: 'El runner carga el Builder con ?jpSandbox=1: la app usa un almacenamiento en memoria (copia de lo guardado, sin credenciales de nube). Un guardado con un alumno de prueba queda en esa memoria y el localStorage real del navegador no cambia; la nube no se activa' },
  { id: 'datos.02', area: 'Datos · fusión con la nube', fn: 'persistencia', input: { caso: 'fusion' },
    expect: { borradoNoVuelve: true, borradoEnOtroEquipoSeVa: true, localMasNuevoGana: true, remotoMasNuevoGana: true, nuevoSeSuma: true, planLocalNoSePisa: true, videoNoSePierde: true, videoSeCompleta: true, ordenAZ: true, borradosUnidos: true, cuenta: true }, modo: 'subset',
    nota: 'Fusionar con la nube: un alumno borrado acá no vuelve (ni su plan); uno borrado en el otro equipo se va; en lo que existe en los dos gana la edición más reciente (cuotas e historial de pagos locales no se pisan con una versión vieja, una edición remota más nueva sí entra); un plan local más nuevo no se reemplaza; los videos nunca se pierden y los que faltan se completan; la lista queda A–Z' },
  { id: 'datos.03', area: 'Datos · fusión con datos sin sello', fn: 'persistencia', input: { caso: 'legado' },
    expect: { remotaViejaNoPisa: true, remotaNuevaGana: true }, modo: 'subset',
    nota: 'Datos de antes de este cambio (sin sello de tiempo por registro): decide el guardado completo más reciente. Una versión de la nube más vieja que el último guardado local no pisa nada (solo completa campos que faltan); una más nueva sí entra' },
  { id: 'datos.04', area: 'Datos · sellos de tiempo', fn: 'persistencia', input: { caso: 'sellos' },
    expect: { sinCambioNoSella: true, cambioSella: true, elSelloNoEsUnCambio: true }, modo: 'subset',
    nota: 'Cada alumno, ejercicio y plan recibe _ts solo cuando su contenido cambió desde el último guardado (huella sin el propio sello): leer o volver a guardar sin cambios no lo marca como editado' },
  { id: 'datos.05', area: 'Datos · otra pestaña', fn: 'persistencia', input: { caso: 'pestana' },
    expect: { bibliotecaVaciaIgnorada: true, borradoEnLaOtraSeVa: true, loCreadoAcaSeQueda: true, loNuevoLlega: true, planesDeLaOtraLlegan: true }, modo: 'subset',
    nota: 'Otra pestaña del mismo navegador guarda: una biblioteca vacía sin borrados no vacía esta pestaña; un alumno borrado allá se va acá, uno nuevo de allá llega, y el que esta pestaña creó y todavía no guardó se conserva. Los planes de la otra pestaña ahora también llegan (antes una pestaña vieja pisaba los planes de la nueva)' },
  { id: 'datos.06', area: 'Datos · biblioteca oficial', fn: 'persistencia', input: { caso: 'biblioteca' },
    expect: { oficialBorradoNoVuelve: true, sinBorradoSeIncorpora: true }, modo: 'subset',
    nota: 'Una versión nueva de la biblioteca oficial (LIB_VERSION) suma los ejercicios que faltan, pero no vuelve a sumar un oficial que el coach borró a propósito' },
  { id: 'orden.01', area: 'Alumnos · orden A–Z', fn: 'persistencia', input: { caso: 'orden' },
    expect: { comparador: true, memoria: true, grilla: true, selector: true }, modo: 'subset',
    nota: 'Un solo orden A–Z para todos los listados: nombre y apellido en español sin distinguir mayúsculas ni tildes (álvaro = Alvaro, la ñ después de la n), con desempate estable; la lista en memoria, la grilla de alumnos y el selector del Builder salen iguales' }
]);
