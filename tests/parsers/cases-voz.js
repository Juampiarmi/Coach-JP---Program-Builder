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
    expect: { cuenta: 'n3,n2,n1', ya: 'go', mitad: 'halfway', finSinFraseEsSilencio: true, sinTonos: true }, modo: 'subset',
    nota: 'Con la voz activa, 3-2-1 dice «tres, dos, uno», el arranque «¡Ya!» y la mitad «Mitad», sin ningún pitido; un fin de timer sin frase asignada queda en silencio (la voz reemplaza al pitido, no se suman)' },
  { id: 'voz.03', area: 'Voz del timer · transiciones', fn: 'alumnoVoz', input: { caso: 'pistas' },
    expect: { descanso: 'rest', trabajo: 'work', siguiente: 'next_round', ultima: 'last_round', fin: 'finish', preparacionCalla: true, finDeDescanso: 'work', sinTonoEncimaDelYa: true }, modo: 'subset',
    nota: 'La pista que anuncia el timer elige la frase: descanso, a trabajar, siguiente ronda, última ronda y «Stop, buen trabajo»; el fin del descanso entre series dice la frase de «a trabajar»; durante la preparación el toque de inicio calla (la cuenta tiene su voz) y un fin pegado al «¡Ya!» no suma pitido' },
  { id: 'voz.04', area: 'Voz del timer · mute y respaldo', fn: 'alumnoVoz', input: { caso: 'respaldo' },
    expect: { muteGeneral: false, cargandoCalla: true, paqueteFalloCaeAlTono: false, sinContexto: true }, modo: 'subset',
    nota: 'El mute general silencia la voz; mientras el paquete se está cargando el aviso queda en silencio (sin pitido); solo si el paquete falló del todo (o no hay Web Audio) el timer cae a los tonos de siempre para no quedar mudo' },
  { id: 'voz.05', area: 'Voz del timer · idioma', fn: 'alumnoVoz', input: { caso: 'idioma' },
    expect: { defectoEn: true, autoEs: 'es', autoEn: 'en', fuerzaEs: 'es', fuerzaEn: 'en', habla: 'en:n3', restaura: true }, modo: 'subset',
    nota: 'La voz arranca en INGLÉS por defecto (aunque la app esté en español); en Ajustes se puede forzar español o inglés, o seguir el idioma de la app (AUTO), y se reproducen los clips de ese idioma' },
  { id: 'voz.06', area: 'Voz del timer · controles', fn: 'alumnoVoz', input: { caso: 'controles' },
    expect: { filaAjustes: true, chipTimer: true, sinBotonAudio: true, chipSilencio: true, chipLevantaSilencio: true, activa: true, chipOn: true, idiomaVisible: true, apaga: true, chipOff: true, idiomaOculto: true }, modo: 'subset',
    nota: 'Ajustes tiene la fila «Voz del timer» (ON/OFF, idioma y Probar) y el timer de WOD un único chip VOZ (el botón AUDIO duplicado se quitó): los dos activan y apagan lo mismo, se repintan y guardan la preferencia; con el sonido silenciado en Ajustes el chip lo muestra y un toque lo levanta' },
  { id: 'voz.07', area: 'Voz del timer · PWA offline', fn: 'alumnoVoz', input: { caso: 'sw' },
    expect: { cacheVoz: true, noSeBorra: true, cacheFirst: true, precache: true, versionSube: true }, modo: 'subset',
    nota: 'El service worker guarda los clips en su propia caché (coachjp-voz-v1) que no se borra al subir de versión, los sirve cache-first, acepta el precache que manda la app y su versión subió' },
  { id: 'voz.08', area: 'Voz del timer · paquete de audio', fn: 'alumnoVoz', input: { caso: 'paquete' }, expect: [],
    nota: 'Cada frase de tools/voz/frases.json tiene su mp3 en español e inglés (listado en voz/manifest.json) y el archivo se puede descargar' },
  { id: 'voz.09', area: 'Voz del timer · textos', fn: 'alumnoVoz', input: { caso: 'textos' }, expect: [],
    nota: 'Los rótulos de los controles viven en el diccionario (app.voz.*) y están en español e inglés con los mismos marcadores' },
  { id: 'voz.10', area: 'Voz del timer · paquete incrustado', fn: 'alumnoVoz', input: { caso: 'incrustado' }, expect: [],
    nota: 'La app lleva los clips adentro (JP_VOZ_PACK, base64): cada frase de tools/voz/frases.json está en español e inglés, decodifica a un mp3 real del tamaño que dice voz/manifest.json y no depende de ninguna ruta (la app exportada se abre desde un blob:, un archivo o cualquier hosting)' },
  { id: 'voz.11', area: 'Voz del timer · app autónoma', fn: 'alumnoVoz', input: { caso: 'autonoma' }, expect: { sinRed: true, decodificaTodos: true, bytesMp3: true, cargando: true }, modo: 'subset',
    nota: 'Reproduce el fallo reportado (app abierta desde un blob:, donde una ruta relativa voz/ no existe): al cargar la voz se decodifican todos los clips del paquete incrustado sin hacer ninguna petición de red' },
  { id: 'voz.13', area: 'Voz del timer · HUD minimizado', fn: 'alumnoVoz', input: { caso: 'minimizado' }, expect: { sinVelo: true, sinDesenfoque: true, dejaPasarToques: true, barraPorEncima: true, barraVisible: true }, modo: 'subset',
    nota: 'Al minimizar el HUD Timer (botón junto a la X) la app queda a la vista: sin velo azul ni desenfoque encima y con la barra mini por encima. La piel azul noche dejaba un velo del 90% sobre TODA la app y tapaba la barra mini' },
  { id: 'voz.12', area: 'Voz del timer · HUD', fn: 'alumnoVoz', input: { caso: 'hud' }, expect: { controlesDebajoDelTitulo: true, sinSolapes: true, dentroDelAncho: true }, modo: 'subset',
    nota: 'En el HUD Timer el título queda arriba y VOZ, minimizar y cerrar van en su propia fila, sin solaparse entre sí ni con el título y sin salirse del ancho (también en 360 px)' }
]);
