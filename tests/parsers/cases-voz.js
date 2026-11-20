/* ============================================================
   CASOS · Voz del timer (frases pregeneradas con ElevenLabs sobre el motor de audio de la app del alumno)
   El adaptador alumnoVoz (runner.html) usa la app del alumno compilada con un AudioContext simulado (sin sonido ni red): cuenta qué frase se reproduce, si
   sonó el tono de siempre y cómo responden los controles. También lee sw.js y voz/manifest.json por XHR.
   ============================================================ */
window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([

  { id: 'voz.01', area: 'Voz del timer · apagada', fn: 'alumnoVoz', input: { caso: 'apagada' },
    expect: { defectoOff: true, noHabla: true, tonoSuena: true }, modo: 'subset',
    nota: 'Por defecto la voz está apagada: con clips cargados no se reproduce ninguna frase y el 3-2-1 suena con los tonos de siempre' },
  { id: 'voz.02', area: 'Voz del timer · frases', fn: 'alumnoVoz', input: { caso: 'frases' },
    expect: { cuenta: 'n3,n2,n1', ya: 'go', mitad: 'halfway', sinPistaCallaTono: false, sinTonos: true }, modo: 'subset',
    nota: 'Con la voz activa, 3-2-1 dice «tres, dos, uno», el arranque «¡Ya!» y la mitad «Mitad», sin tonos encima; un fin de timer sin frase asignada sigue sonando con el tono' },
  { id: 'voz.03', area: 'Voz del timer · transiciones', fn: 'alumnoVoz', input: { caso: 'pistas' },
    expect: { descanso: 'rest', trabajo: 'work', siguiente: 'next_round', ultima: 'last_round', fin: 'finish', tonoPedido: false, finDeDescanso: 'work', sinTonoEncimaDelYa: true }, modo: 'subset',
    nota: 'La pista que anuncia el timer elige la frase: descanso, a trabajar, siguiente ronda, última ronda y «Stop, buen trabajo»; el fin del descanso entre series dice «¡A trabajar!»; si el timer pide el tono (preparación) no habla y un fin pegado al «¡Ya!» no suma tono' },
  { id: 'voz.04', area: 'Voz del timer · mute y respaldo', fn: 'alumnoVoz', input: { caso: 'respaldo' },
    expect: { muteGeneral: false, sinClipCaeAlTono: false, sinContexto: false }, modo: 'subset',
    nota: 'El mute general silencia la voz; si falta el clip (sin paquete, sin red o idioma sin cargar) o no hay Web Audio, no habla y el timer queda con los tonos de siempre' },
  { id: 'voz.05', area: 'Voz del timer · idioma', fn: 'alumnoVoz', input: { caso: 'idioma' },
    expect: { autoEs: 'es', autoEn: 'en', fuerzaEs: 'es', fuerzaEn: 'en', habla: 'en:n3', restaura: true }, modo: 'subset',
    nota: 'La voz sigue el idioma de la app (AUTO) o el que se fuerza en Ajustes, y reproduce los clips de ese idioma' },
  { id: 'voz.06', area: 'Voz del timer · controles', fn: 'alumnoVoz', input: { caso: 'controles' },
    expect: { filaAjustes: true, chipTimer: true, activa: true, chipOn: true, idiomaVisible: true, apaga: true, chipOff: true, idiomaOculto: true }, modo: 'subset',
    nota: 'Ajustes tiene la fila «Voz del timer» (ON/OFF, idioma y Probar) y el timer de WOD un chip VOZ junto al mute: los dos activan y apagan lo mismo, se repintan y guardan la preferencia' },
  { id: 'voz.07', area: 'Voz del timer · PWA offline', fn: 'alumnoVoz', input: { caso: 'sw' },
    expect: { cacheVoz: true, noSeBorra: true, cacheFirst: true, precache: true, versionSube: true }, modo: 'subset',
    nota: 'El service worker guarda los clips en su propia caché (coachjp-voz-v1) que no se borra al subir de versión, los sirve cache-first, acepta el precache que manda la app y su versión subió' },
  { id: 'voz.08', area: 'Voz del timer · paquete de audio', fn: 'alumnoVoz', input: { caso: 'paquete' }, expect: [],
    nota: 'Cada frase de tools/voz/frases.json tiene su mp3 en español e inglés (listado en voz/manifest.json) y el archivo se puede descargar' },
  { id: 'voz.09', area: 'Voz del timer · textos', fn: 'alumnoVoz', input: { caso: 'textos' }, expect: [],
    nota: 'Los rótulos de los controles viven en el diccionario (app.voz.*) y están en español e inglés con los mismos marcadores' }
]);
