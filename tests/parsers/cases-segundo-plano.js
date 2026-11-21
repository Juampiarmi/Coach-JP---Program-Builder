/* ============================================================
   CASOS · Timer con el teléfono bloqueado o en segundo plano: avisos del sistema por fase y aviso de pantalla encendida en iPhone
   El adaptador alumnoFondo (runner.html) usa la app del alumno compilada con un reloj simulado. El service worker se prueba por su función pura (jpPlanFases) y por su código.
   Límite que el sistema impone (no se puede testear ni saltear): con la pantalla bloqueada el navegador puede suspender la página y dormir el service worker; los avisos son «mejor esfuerzo».
   ============================================================ */
window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([

  { id: 'fondo.01', area: 'Timer · avisos por fase', fn: 'alumnoFondo', input: { caso: 'cronogramaTabata' },
    expect: { tipos: 'work,rest,work,rest,work,rest,done', offsets: '10,15,18,23,26,31,34', primero: '💪 ¡A trabajar! · Ronda 1/3', descanso: '😮‍💨 Descanso · Ronda 1/3', ultimo: '🏁 ¡Listo! Terminaste, buen trabajo.' }, modo: 'subset',
    nota: 'El cronograma de un Tabata de 3 rondas (preparación de 10 s, 5 s de trabajo y 3 de descanso) lista TODAS las transiciones que vienen, con su hora exacta y su texto (trabajo con la ronda, descanso y fin)' },
  { id: 'fondo.02', area: 'Timer · avisos por fase', fn: 'alumnoFondo', input: { caso: 'cronogramaOtros' },
    expect: { emom: 'work@10,work@70,work@130,done@190', emomTexto: '⏱️ Minuto 2/3', amrap: 'work@10,done@70', quieto: 0 }, modo: 'subset',
    nota: 'EMOM (un aviso por minuto, «Minuto 2/3») y AMRAP (arranque y fin) arman su cronograma; con el timer detenido no hay nada que avisar' },
  { id: 'fondo.03', area: 'Timer · avisos por fase', fn: 'alumnoFondo', input: { caso: 'envio' },
    expect: { alOcultar: 7, titulo: 'Coach JP', ordenado: true, alVolver: 0, sinTimer: 0 }, modo: 'subset',
    nota: 'Al pasar a segundo plano o bloquear la pantalla (visibilitychange) la app le entrega al service worker el cronograma completo; con la app visible o con el timer detenido no manda nada' },
  { id: 'fondo.04', area: 'Timer · avisos por fase', fn: 'alumnoFondo', input: { caso: 'swPlan' }, expect: [],
    nota: 'La cola del service worker (jpPlanFases) descarta lo inválido, lo ya vencido y lo que pasa del tope, y ordena por hora; el tope subió de 10 a 60 minutos y el SW atiende la orden «programar-fases» con la misma etiqueta que el aviso final' },
  { id: 'fondo.05', area: 'Aviso · iPhone', fn: 'alumnoFondo', input: { caso: 'iphone' },
    expect: { detecta: true, muestra: true, porEncimaDelHeader: true, titulo: 'Mantené la pantalla encendida', habla: true, unaVez: true, ipadMac: true, escritorioNo: true }, modo: 'subset',
    nota: 'Al correr un cronómetro en iPhone (o iPad, incluso el que se presenta como Mac) aparece UNA sola vez «Mantené la pantalla encendida», con la aclaración de que el timer y la voz se pausan si se bloquea o se cambia de app; en un navegador de escritorio con Wake Lock no aparece' },
  { id: 'fondo.06', area: 'Aviso · iPhone', fn: 'alumnoFondo', input: { caso: 'textos' }, expect: [],
    nota: 'Los textos de las notificaciones por fase y del aviso de pantalla encendida viven en el diccionario (es / en) con los mismos marcadores' }
]);
