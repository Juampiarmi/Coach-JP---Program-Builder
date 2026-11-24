/* =========================================================
   PLANTILLAS BASE COACH JP · cierres metabólicos y cardio (perfil Hyrox / CrossFit / HIIT)
   Cada uno es un bloque libre (fila.fin del motor): { tag, t, i: { min, l }, a: { min, l }, obj, tips }.
   Los cierres NO son genéricos: usan estaciones y transiciones de competición (SkiErg, Sled Push / Pull, Wall Balls, Assault Bike, Remo, Burpee Broad Jump, Farmer Carry)
   en formatos reales (EMOM, AMRAP, For Time, intervalos 40:20) y están ALINEADOS AL DÍA: el cierre trabaja lo que el día no trabajó, para complementar sin interferir.
     · día de EMPUJE  -> piernas, tracción y cardio (remo, bici, arrastre): nada de press, flexiones ni slam
     · día de TRACCIÓN -> piernas y empuje ligero (trineo, wall balls, bici): nada de remo, SkiErg ni arrastre ni agarre
     · día de PIERNA  -> tren superior y core (SkiErg, arrastre de trineo, slam): ni trineo de empuje, ni escaladora ni zancadas
     · día de GLÚTEO  -> intervalos de tracción y cardio sin cadera cargada (SkiErg, bici sostenible, arrastre)
     · día de TORSO   -> piernas y cardio de competición (trineo de empuje, burpee broad jump, bici)
   Reglas de escritura (el importador las necesita para no convertirlos en series de fuerza):
     · las líneas no llevan "NxM" (se escribe "5 rondas", "20 m", "30 s");
     · los tips empiezan con una etiqueta en mayúsculas y nunca con un número.
   Se editan desde el Banco de Rutinas > Previsualizar > Editar plantilla (o acá, para cambiar el original del sistema).
   ========================================================= */
(function(){
  'use strict';
  var PB = window.__jpPB; if(!PB) return;
  var FIN = {};

  /* ---------- día de EMPUJE (Push / hombro y pecho): piernas, tracción y cardio, sin empuje ---------- */
  FIN.push = { tag: 'FINISHER', t: 'Cierre metabólico EMOM · Remo, bici y arrastre',
    i: { min: 12, l: ['EMOM 12 minutos: en cada minuto hacés UNA estación y descansás lo que sobre; la secuencia de tres minutos se repite cuatro veces.',
                      '- Minuto 1: Remo ergómetro x 250 m a ritmo de carrera',
                      '- Minuto 2: Assault bike x 12 calorías',
                      '- Minuto 3: Arrastre de trineo (sled pull) x 20 m con una carga que te permita caminar firme'] },
    a: { min: 12, l: ['EMOM 12 minutos: en cada minuto hacés UNA estación y descansás lo que sobre; la secuencia de tres minutos se repite cuatro veces.',
                      '- Minuto 1: Remo ergómetro x 300 m a ritmo de carrera',
                      '- Minuto 2: Assault bike x 15 calorías',
                      '- Minuto 3: Arrastre de trineo (sled pull) x 25 m con una carga exigente'] },
    obj: 'Cerrás el día de empuje con piernas, espalda y cardio de competición: el remo, la bici y el arrastre suben las pulsaciones sin tocar pecho, hombros ni tríceps, que ya hicieron el trabajo y necesitan recuperar para el próximo empuje.',
    tips: ['POR QUÉ ESTÁ ACÁ: hoy se empujó con el torso. Este cierre trabaja lo que hoy quedó en reposo (piernas y tracción) y entrena el cambio rápido de estación típico de una carrera Hyrox.',
           'INTERFERENCIA: acá no hay press, flexiones ni slam ball a propósito: el pecho, los hombros y los tríceps no se vuelven a cargar.',
           'FORMATO: el EMOM te marca el ritmo. Si terminás la estación en 40 segundos, descansás 20; si la última vuelta te lleva el minuto entero, bajá la carga del arrastre.',
           'TRANSICIÓN: cambiá de estación caminando rápido, sin correr: los segundos de pausa son parte del entrenamiento.',
           'REMO: empujá primero con las piernas, después abrí el torso y al final tirá con los brazos.',
           'ALTERNATIVA: sin remo, SkiErg x 200 m; sin trineo, remo con resistencia alta x 15 s; sin bici, remo x 250 m.',
           'SENSACIÓN OBJETIVO: respiración agitada, piernas calientes y los hombros frescos. Si terminás destruido, la carga fue demasiada.'] };

  /* ---------- día de TRACCIÓN (Pull / espalda y bíceps): piernas y empuje ligero, sin remo, SkiErg ni agarre ---------- */
  FIN.pull = { tag: 'FINISHER', t: 'Cierre metabólico For Time · Trineo, wall balls y bici',
    i: { min: 10, l: ['3 rondas por tiempo (For Time): las tres estaciones en orden, con 10 segundos de transición entre ellas y 90 segundos de descanso al cerrar cada ronda.',
                      '- Sled push / Trineo x 20 m con una carga que te permita caminar firme',
                      '- Wall balls x 15 repeticiones (6 kg a 3 m)',
                      '- Assault bike x 12 calorías'] },
    a: { min: 12, l: ['4 rondas por tiempo (For Time): las tres estaciones en orden, con 10 segundos de transición entre ellas y 75 segundos de descanso al cerrar cada ronda.',
                      '- Sled push / Trineo x 25 m con una carga exigente',
                      '- Wall balls x 20 repeticiones (9 kg a 3 m)',
                      '- Assault bike x 15 calorías'] },
    obj: 'Cerrás el día de tracción con piernas y cardio de competición: el trineo de empuje, los wall balls y la bici elevan el gasto de toda la sesión sin pedirle nada más a la espalda, los dorsales ni el agarre, que ya trabajaron.',
    tips: ['POR QUÉ ESTÁ ACÁ: hoy se tiró con la espalda y el bíceps. Este cierre usa piernas y empuje liviano y es un recorte de lo que vas a repetir en una carrera Hyrox.',
           'INTERFERENCIA: no hay remo, SkiErg ni arrastre ni transporte a propósito: la espalda y el agarre llegan recuperados al próximo día de tracción.',
           'FORMATO: anotá el tiempo total. La próxima semana el objetivo es repetirlo con la misma carga y bajar unos segundos.',
           'TRINEO: torso inclinado, brazos estirados y pasos cortos y rápidos empujando el piso.',
           'WALL BALLS: sentadilla completa y lanzamiento al blanco en un solo movimiento; la pelota sube con las piernas, no con los hombros.',
           'ALTERNATIVA: sin trineo, zancadas caminando con mancuernas x 20 m; sin wall balls, thrusters livianos x 12; sin bici, escaladora x 40 s.',
           'SENSACIÓN OBJETIVO: piernas llenas, respiración al límite pero controlada y la espalda fresca.'] };

  /* ---------- día de PIERNA (cuádriceps / pierna completa): tren superior y core, sin trineo de empuje ni escaladora ---------- */
  FIN.pierna = { tag: 'FINISHER', t: 'Cierre metabólico AMRAP · SkiErg, arrastre y slam ball',
    i: { min: 8, l: ['AMRAP 8 minutos: las tres estaciones en orden, sin pausa entre ellas; cada vuelta completa suma una ronda y anotás cuántas hiciste.',
                     '- SkiErg x 200 m a ritmo fuerte',
                     '- Arrastre de trineo (sled pull) x 15 m con una carga que te permita caminar firme',
                     '- Slam ball (balón medicinal) x 10 repeticiones'] },
    a: { min: 10, l: ['AMRAP 10 minutos: las tres estaciones en orden, sin pausa entre ellas; cada vuelta completa suma una ronda y anotás cuántas hiciste.',
                      '- SkiErg x 250 m a ritmo fuerte',
                      '- Arrastre de trineo (sled pull) x 20 m con una carga exigente',
                      '- Slam ball (balón medicinal) x 12 repeticiones a máxima intensidad'] },
    obj: 'Cerrás el día de pierna con tren superior y core de competición: el SkiErg, el arrastre y los slams suben las pulsaciones sin volver a cargar cuádriceps ni glúteo, que ya hicieron el trabajo pesado y necesitan recuperar.',
    tips: ['POR QUÉ ESTÁ ACÁ: las piernas ya hicieron lo duro. Este cierre suma gasto energético y capacidad aeróbica con la espalda, los brazos y el tronco, sin competir con la recuperación de la pierna.',
           'INTERFERENCIA: acá no hay trineo de empuje, escaladora, zancadas ni saltos a propósito. Si caminás raro mañana, el cierre sobraba.',
           'FORMATO: el AMRAP no es una carrera: buscá el mismo ritmo en todas las vueltas y anotá cuántas rondas completas lograste.',
           'SKIERG: arrancá la tracción con las caderas, seguí con los dorsales y terminá con los brazos; el ritmo es parejo, no a golpes.',
           'ARRASTRE: tirá con la espalda y las caderas, no con los brazos; los brazos son la última palanca.',
           'SLAM BALL: balón por encima de la cabeza con las costillas abajo y lanzamiento al piso con todo el tronco.',
           'ALTERNATIVA: sin SkiErg, remo ergómetro x 200 m con poca pierna; sin trineo, remo con mancuerna x 10 por lado.',
           'SENSACIÓN OBJETIVO: espalda y brazos calientes, respiración agitada y las piernas descansando.'] };

  /* ---------- día de GLÚTEO / cadena posterior: intervalos de tracción y cardio sostenible, sin cadera cargada ---------- */
  FIN.glute = { tag: 'FINISHER', t: 'Cierre metabólico · Intervalos 40:20 de SkiErg, bici y arrastre',
    i: { min: 10, l: ['HIIT por intervalos: 3 rondas de tres estaciones, 40 segundos de trabajo y 20 de transición entre una estación y la siguiente; 90 segundos de descanso al cerrar cada ronda.',
                      '- SkiErg x 40 s a ritmo fuerte',
                      '- Assault bike x 40 s a un ritmo que puedas sostener las tres rondas',
                      '- Arrastre de trineo (sled pull) x 40 s con una carga moderada'] },
    a: { min: 12, l: ['HIIT por intervalos: 4 rondas de tres estaciones, 40 segundos de trabajo y 20 de transición entre una estación y la siguiente; 75 segundos de descanso al cerrar cada ronda.',
                      '- SkiErg x 40 s al máximo sostenible',
                      '- Assault bike x 40 s a un ritmo que puedas sostener las cuatro rondas',
                      '- Arrastre de trineo (sled pull) x 40 s con una carga exigente'] },
    obj: 'Cerrás el día de glúteo y cadena posterior con intervalos de competición que casi no cargan la cadera: el SkiErg y el arrastre trabajan espalda, brazos y core mientras la bici mantiene las pulsaciones, y el glúteo recupera para la próxima sesión.',
    tips: ['POR QUÉ ESTÁ ACÁ: hoy el glúteo y los isquios ya hicieron el trabajo pesado, con hip thrust, rumano y unilaterales. Acá se suma capacidad aeróbica y gasto sin repetir lo mismo.',
           'INTERFERENCIA: no hay trineo de empuje, escaladora, zancadas ni burpees a propósito: son todas estaciones de cadera y rodilla que ya se cansaron.',
           'FORMATO: 40 segundos de trabajo y 20 de transición. Si en la última ronda perdés más de 10 metros en el SkiErg, bajá un punto el esfuerzo en la primera.',
           'BICICLETA: fuerte pero sostenible. Tenés que poder decir una palabra, no una frase; empujá más con los brazos que con las piernas.',
           'ARRASTRE: tirá con la espalda y el core, con las caderas quietas y el torso firme.',
           'ALTERNATIVA: sin SkiErg, remo ergómetro x 40 s con poca pierna; sin trineo, remo con banda x 40 s; sin bici, caminata inclinada rápida x 40 s.',
           'SENSACIÓN OBJETIVO: pulsaciones altas, espalda y brazos calientes y el glúteo descansando.'] };

  /* ---------- segundo día de GLÚTEO de la semana: mismo criterio, otro formato (EMOM) para no repetir el cierre ---------- */
  FIN.gluteB = { tag: 'FINISHER', t: 'Cierre metabólico EMOM · SkiErg, arrastre y bici',
    i: { min: 10, l: ['EMOM 10 minutos: en cada minuto hacés UNA estación y descansás lo que sobre; la secuencia de tres minutos se repite hasta cerrar los diez.',
                      '- Minuto 1: SkiErg x 12 calorías a ritmo fuerte',
                      '- Minuto 2: Arrastre de trineo (sled pull) x 15 m con una carga moderada',
                      '- Minuto 3: Assault bike x 10 calorías a un ritmo sostenible'] },
    a: { min: 12, l: ['EMOM 12 minutos: en cada minuto hacés UNA estación y descansás lo que sobre; la secuencia de tres minutos se repite cuatro veces.',
                      '- Minuto 1: SkiErg x 15 calorías a ritmo fuerte',
                      '- Minuto 2: Arrastre de trineo (sled pull) x 20 m con una carga exigente',
                      '- Minuto 3: Assault bike x 12 calorías a un ritmo sostenible'] },
    obj: 'Cerrás este día de glúteo con otro formato de competición (EMOM): el SkiErg, el arrastre y la bici suben las pulsaciones con espalda, brazos y core y casi sin cadera cargada, así el glúteo recupera para la próxima sesión.',
    tips: ['POR QUÉ ESTÁ ACÁ: hoy el glúteo ya trabajó con volumen. Este cierre suma capacidad aeróbica y gasto sin repetir cadera ni rodilla, y cambia el formato respecto del cierre del otro día de glúteo de la semana (intervalos 40:20).',
           'INTERFERENCIA: no hay trineo de empuje, escaladora, zancadas ni burpees a propósito: son estaciones de cadera y rodilla que ya se cansaron.',
           'FORMATO: el EMOM te marca el ritmo. Si una estación te lleva el minuto entero, bajá la carga o las calorías.',
           'TRANSICIÓN: cambiá de estación caminando rápido, sin correr: los segundos de pausa son parte del entrenamiento.',
           'BICICLETA: fuerte pero sostenible; empujá más con los brazos que con las piernas.',
           'ALTERNATIVA: sin SkiErg, remo ergómetro con poca pierna; sin trineo, remo con banda x 30 s; sin bici, caminata inclinada rápida x 40 s.',
           'SENSACIÓN OBJETIVO: pulsaciones altas, espalda y brazos calientes y el glúteo descansando.'] };

  /* ---------- día de TORSO (empuje + tracción): piernas y cardio de competición ---------- */
  FIN.torso = { tag: 'FINISHER', t: 'Cierre metabólico For Time · Trineo, burpee broad jump y bici',
    i: { min: 10, l: ['3 rondas por tiempo (For Time): las tres estaciones en orden, con 10 segundos de transición entre ellas y 90 segundos de descanso al cerrar cada ronda.',
                      '- Sled push / Trineo x 20 m con una carga que te permita caminar firme',
                      '- Burpee broad jump x 8 repeticiones a ritmo de carrera',
                      '- Assault bike x 10 calorías'] },
    a: { min: 12, l: ['4 rondas por tiempo (For Time): las tres estaciones en orden, con 10 segundos de transición entre ellas y 75 segundos de descanso al cerrar cada ronda.',
                      '- Sled push / Trineo x 25 m con una carga exigente',
                      '- Burpee broad jump x 10 repeticiones a ritmo de carrera',
                      '- Assault bike x 12 calorías'] },
    obj: 'Cerrás el día de torso con piernas y cardio de competición: el trineo de empuje, el burpee broad jump y la bici elevan el gasto de toda la sesión sin sumar trabajo de pecho, hombros ni espalda, que ya cumplieron su volumen del día.',
    tips: ['POR QUÉ ESTÁ ACÁ: hoy se entrenó el torso completo. Este cierre usa las piernas y el sistema cardiovascular y es una versión corta de lo que se repite en una carrera Hyrox.',
           'INTERFERENCIA: no hay remo, SkiErg ni press a propósito: el torso llega recuperado al próximo día de pierna o de torso.',
           'FORMATO: anotá el tiempo total. La próxima semana el objetivo es repetirlo con la misma carga y bajar unos segundos.',
           'BURPEE BROAD JUMP: pecho al piso, salto largo hacia adelante y de pie de nuevo. Es un movimiento de competición: la técnica pesa más que la velocidad.',
           'TRINEO: torso inclinado, brazos estirados y pasos cortos y rápidos empujando el piso.',
           'ALTERNATIVA: sin trineo, farmer carry x 30 m; sin burpee broad jump, burpees sin salto x 8; sin bici, escaladora x 30 s.',
           'SENSACIÓN OBJETIVO: piernas llenas, respiración agitada y el torso fresco.'] };

  /* ---------- cuerpo completo: mini simulación de carrera ---------- */
  FIN.full = { tag: 'FINISHER', t: 'Cierre metabólico For Time · Mini simulación Hyrox',
    i: { min: 10, l: ['2 rondas por tiempo (For Time): las cinco estaciones en orden, con 10 segundos de transición entre ellas y 2 minutos de descanso al cerrar la primera ronda.',
                      '- SkiErg x 200 m a ritmo de carrera',
                      '- Sled push / Trineo x 15 m con una carga que te permita caminar firme',
                      '- Burpee broad jump x 6 repeticiones',
                      '- Remo ergómetro x 200 m a ritmo de carrera',
                      '- Wall balls x 12 repeticiones (6 kg a 3 m)'] },
    a: { min: 12, l: ['2 rondas por tiempo (For Time): las cinco estaciones en orden, con 10 segundos de transición entre ellas y 90 segundos de descanso al cerrar la primera ronda.',
                      '- SkiErg x 250 m a ritmo de carrera',
                      '- Sled push / Trineo x 20 m con una carga exigente',
                      '- Burpee broad jump x 8 repeticiones',
                      '- Remo ergómetro x 250 m a ritmo de carrera',
                      '- Wall balls x 15 repeticiones (9 kg a 3 m)'] },
    obj: 'Una mini simulación del orden de una carrera Hyrox (SkiErg, trineo, burpee broad jump, remo y wall balls): entrenás el cambio de estación y el ritmo bajo fatiga con volumen contenido, ideal para un día de cuerpo completo.',
    tips: ['POR QUÉ ESTÁ ACÁ: en un esquema de cuerpo completo cada patrón ya se entrenó con carga; este cierre suma capacidad de trabajo con las estaciones típicas de competición.',
           'FORMATO: anotá el tiempo total de las dos rondas. Si la segunda es más de un 15% más lenta que la primera, arrancaste demasiado fuerte.',
           'TRANSICIÓN: 10 segundos para cambiar de estación, caminando; es parte del entrenamiento.',
           'RITMO: parejo de la primera a la última estación. Es un cierre, no una competencia.',
           'ALTERNATIVA: sin SkiErg, remo x 200 m; sin trineo, farmer carry x 30 m; sin burpee broad jump, burpees sin salto.',
           'SENSACIÓN OBJETIVO: respiración agitada, cuerpo caliente y la técnica intacta hasta la última estación.'] };

  /* ---------- transporte y wall balls: densidad con bajo impacto articular ---------- */
  FIN.carry = { tag: 'FINISHER', t: 'Cierre metabólico AMRAP · Transporte y wall balls',
    i: { min: 8, l: ['AMRAP 8 minutos: las tres estaciones en orden, sin pausa entre ellas; cada vuelta completa suma una ronda.',
                     '- Farmer carry x 30 m con una carga que te permita caminar firme',
                     '- Wall balls x 10 repeticiones (6 kg a 3 m)',
                     '- Assault bike x 8 calorías'] },
    a: { min: 10, l: ['AMRAP 10 minutos: las tres estaciones en orden, sin pausa entre ellas; cada vuelta completa suma una ronda.',
                      '- Farmer carry x 40 m con una carga exigente',
                      '- Wall balls x 12 repeticiones (9 kg a 3 m)',
                      '- Assault bike x 10 calorías'] },
    obj: 'Densidad metabólica con estaciones de competición de bajo impacto articular: el transporte mantiene el tono del tronco y el agarre, los wall balls elevan la frecuencia cardíaca y la bici sostiene las pulsaciones sin golpear las articulaciones.',
    tips: ['POR QUÉ ESTÁ ACÁ: es un cierre corto y seco. Suma volumen de trabajo y gasto calórico sin sumarle estrés a las articulaciones.',
           'FORMATO: anotá las rondas completas. La próxima semana el objetivo es sumar una vuelta o repetirlas con más carga.',
           'FARMER CARRY: pasos cortos, hombros atrás y costillas abajo.',
           'WALL BALLS: sentadilla completa y lanzamiento al blanco en un solo movimiento.',
           'SENSACIÓN OBJETIVO: antebrazos llenos, pulsaciones altas y técnica limpia hasta el último metro.'] };

  FIN.zona2 = { tag: 'CARDIO', t: 'Cardio · Zona 2 de recuperación',
    i: { min: 20, l: ['20 min Caminata inclinada (Zona 2)'] },
    a: { min: 25, l: ['25 min Caminata inclinada (Zona 2)'] },
    obj: 'Trabajo aeróbico a baja intensidad: mejora la capacidad de recuperar entre series y entre sesiones y acelera el retorno a la calma después de un día exigente, sin interferir con la hipertrofia.',
    tips: ['POR QUÉ ESTÁ ACÁ: es el día más corto de fuerza de la semana, así que cabe un bloque de base aeróbica que mejora tu recuperación general.',
           'RITMO: tenés que poder hablar frases completas. Si no podés, estás yendo demasiado fuerte para zona 2.',
           'ALTERNATIVA: bicicleta o elíptica a ritmo conversacional por el mismo tiempo.',
           'SENSACIÓN OBJETIVO: entrar en calor sin sentir cansancio y terminar con ganas de seguir.'] };

  /* compatibilidad: el nombre viejo de los días de pierna */
  FIN.sledBike = FIN.pierna;

  PB.FIN = FIN;
})();
