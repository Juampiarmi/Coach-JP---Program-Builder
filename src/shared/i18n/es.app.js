/* Diccionario base (español rioplatense) · textos fijos de la app del alumno. Primer lote: los rótulos de la tarjeta del bloque.
   Para migrar otro texto: reemplazar el string del código por jpT('app.<zona>.<nombre>'), agregar la clave acá (es) y en en.app.js. */
JP_I18N.add('es', {
  'app.card.tag': 'BIOMECÁNICA APLICADA',
  'app.card.tips': 'PAUTAS TÉCNICAS & TIPS DEL BLOQUE',
  'app.card.tips.lb': 'ESTRATEGIA BIOMECÁNICA & TIPS',
  'app.card.obj.t': 'OBJETIVO FISIOLÓGICO',
  'app.card.obj.s': 'Qué trabajás y por qué',
  'app.card.tempo.t': 'TEMPO (CADENCIA)',
  /* notas del ejercicio agrupadas, versión de la sesión y plan de cargas */
  'app.notas.tips': 'Tips', 'app.notas.obj': 'Objetivo', 'app.notas.tempo': 'Tempo',
  'app.ver.t': 'Versión de la sesión', 'app.ver.std': 'ESTÁNDAR', 'app.ver.ext': 'EXTENDIDA', 'app.ver.m60': '60 MIN', 'app.ver.m90': '90 MIN',
  'app.ver.h.std': 'Solo los bloques principales de la sesión. Lo complementario ({n}) queda para la versión extendida.',
  'app.ver.h.ext': 'Sesión completa: suma {n} complementario(s) a los bloques principales.',
  'app.ver.h.igual': 'Esta sesión no tiene bloques complementarios: las dos versiones son iguales.',
  'app.plan.t': 'PLAN DE CARGAS · según tu historial', 'app.plan.hecho': '✓ hecho', 'app.plan.desc': 'DESCARGA', 'app.plan.pico': 'PICO',
  /* voz del timer (088-voz-del-timer.js) */
  /* avisos del sistema con el teléfono bloqueado y aviso de pantalla encendida */
  'app.notif.work': '💪 ¡A trabajar! · Ronda {r}/{n}',
  'app.notif.work.simple': '💪 ¡A trabajar!',
  'app.notif.minuto': '⏱️ Minuto {r}/{n}',
  'app.notif.rest': '😮‍💨 Descanso · Ronda {r}/{n}',
  'app.notif.done': '🏁 ¡Listo! Terminaste, buen trabajo.',
  'app.aviso.iphone.t': 'Mantené la pantalla encendida',
  'app.aviso.iphone.b': 'En iPhone, si bloqueás el teléfono o cambiás de app, el timer y la voz se pausan hasta que vuelvas. Dejá la pantalla encendida mientras entrenás: la app evita que se apague sola.',
  'app.aviso.pantalla.t': 'Mantené la pantalla encendida',
  'app.aviso.pantalla.b': 'Tu navegador no puede evitar que el teléfono se bloquee solo: poné el bloqueo automático en "nunca" mientras entrenás para que el reloj no se detenga.',
  'app.voz.lb': 'Voz del timer',
  'app.voz.idioma': 'Idioma de la voz',
  'app.voz.auto': 'AUTO',
  'app.voz.probar': 'Probar',
  'app.voz.sinpaquete': 'Sin paquete de voz',
  'app.voz.ejemplo': '3 - 2 - 1 - ¡Ya!',
  'app.voz.guia': 'El timer te habla: cuenta 3 - 2 - 1, «Go» al empezar, «Rest» al descansar y «Stop» al terminar. Tocá «Probar» para escuchar un ejemplo.',
  'app.voz.chip.on': 'VOZ: ON',
  'app.voz.chip.off': 'VOZ: OFF',
  'app.voz.chip.mute': 'SIN SONIDO',
  'app.voz.chip.t.mute': 'El sonido está silenciado: tocá para activarlo',
  'app.voz.chip.t.on': 'Apagar la voz del timer',
  'app.voz.chip.t.off': 'Activar la voz del timer'
});
