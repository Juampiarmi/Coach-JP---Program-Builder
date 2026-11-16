/* =========================================================
   PLANTILLAS BASE COACH JP · cierres metabólicos y cardio
   Cada uno es un bloque libre (fila.fin del motor): { tag, t, i: { min, l }, a: { min, l }, obj, tips }.
   Reglas de escritura (el importador las necesita para no convertirlos en series de fuerza):
     · las líneas no llevan "NxM" (se escribe "5 rondas", "20 m", "30 s");
     · los tips empiezan con una etiqueta en mayúsculas y nunca con un número.
   Se editan desde el Banco de Rutinas > Previsualizar > Editar plantilla (o acá, para cambiar el original del sistema).
   ========================================================= */
(function(){
  'use strict';
  var PB = window.__jpPB; if(!PB) return;
  var FIN = {};

  FIN.sledBike = { tag: 'FINISHER', t: 'Cierre metabólico · Trineo y bicicleta',
    i: { min: 8, l: ['5 rondas: pasás de una estación a la otra sin pausa y descansás 90 segundos al cerrar cada ronda.',
                     '- Sled push / Trineo x 20 m con una carga que te permita caminar firme',
                     '- Bicicleta / Assault bike x 30 s a ritmo fuerte'] },
    a: { min: 10, l: ['6 rondas: pasás de una estación a la otra sin pausa y descansás 75 segundos al cerrar cada ronda.',
                      '- Sled push / Trineo x 25 m con una carga exigente',
                      '- Bicicleta / Assault bike x 30 s al máximo que puedas sostener las seis rondas'] },
    obj: 'Subís las pulsaciones y el gasto energético de toda la sesión sin sumar daño muscular: el trineo y la bicicleta no tienen fase excéntrica, así que recuperás rápido y llegás bien al próximo entrenamiento.',
    tips: ['POR QUÉ ESTÁ ACÁ: cerrar con trabajo metabólico mejora tu capacidad de recuperar entre series y suma gasto calórico sin comerle recuperación al tren inferior. Va al final para no restarle fuerza a nada de lo anterior.',
           'RITMO: todas las rondas tienen que parecerse. Si la última es mucho más lenta que la primera, arrancaste demasiado fuerte.',
           'TRINEO: torso inclinado, brazos estirados y pasos cortos y rápidos empujando el piso. No es fuerza máxima: es una carrera de piernas con carga.',
           'BICICLETA: fuerte pero sostenible. Tenés que poder decir una palabra, no una frase.',
           'ALTERNATIVA: sin trineo, farmer carry x 30 m o escaladora; sin bicicleta, remo ergómetro x 250 m.',
           'SENSACIÓN OBJETIVO: piernas llenas, respiración agitada y la cabeza clara. Si te mareás o perdés la técnica, cortá y descansá: el objetivo es terminar mejor de lo que empezaste.'] };

  FIN.push = { tag: 'FINISHER', t: 'Cierre metabólico · Bombeo de torso',
    i: { min: 6, l: ['4 rondas: las tres estaciones sin pausa y 60 segundos de descanso al cerrar cada ronda.',
                     '- Flexiones de brazos x 12 a 15 repeticiones',
                     '- Face Pull con cuerda x 15 repeticiones',
                     '- Slam ball (balón medicinal) x 10 repeticiones'] },
    a: { min: 8, l: ['5 rondas: las tres estaciones sin pausa y 60 segundos de descanso al cerrar cada ronda.',
                     '- Flexiones con manos elevadas / declinadas x 15 repeticiones',
                     '- Face Pull con cuerda x 20 repeticiones',
                     '- Slam ball (balón medicinal) x 12 repeticiones a máxima intensidad'] },
    obj: 'Cerrás el torso con bombeo y trabajo cardiovascular sin cargas pesadas: la congestión sostenida mejora el riego del músculo y el gasto de la sesión sin exigirle nada a los tendones.',
    tips: ['POR QUÉ ESTÁ ACÁ: es el cierre que deja el pecho, los hombros y la espalda alta llenos y las pulsaciones arriba. Se hace con técnica prolija: acá no se busca el récord, se busca el bombeo.',
           'RITMO: las flexiones salen limpias desde la primera ronda; si en la tercera se te cae la cadera, apoyá las rodillas y seguí.',
           'FACE PULL: tirá hacia la cara con los codos altos y apretá las escápulas un instante. Es lo que cuida tus hombros del trabajo de empuje.',
           'SLAM BALL: levantá el balón por encima de la cabeza con las costillas abajo y lanzalo al piso con todo el cuerpo, desde la cadera y no solo con los brazos.',
           'ALTERNATIVA: sin balón, remo ergómetro x 20 s a ritmo fuerte o SkiErg x 20 s.',
           'SENSACIÓN OBJETIVO: hombros y pecho encendidos, brazos llenos y respiración agitada, sin dolor articular.'] };

  FIN.pull = { tag: 'FINISHER', t: 'Cierre metabólico · Remo y agarre',
    i: { min: 8, l: ['4 rondas: las tres estaciones sin pausa y 75 segundos de descanso al cerrar cada ronda.',
                     '- Remo ergómetro x 250 m a ritmo fuerte',
                     '- Farmer carry x 30 m',
                     '- SkiErg x 20 s a ritmo fuerte'] },
    a: { min: 10, l: ['5 rondas: las tres estaciones sin pausa y 60 segundos de descanso al cerrar cada ronda.',
                      '- Remo ergómetro x 300 m a ritmo fuerte',
                      '- Farmer carry x 40 m con carga exigente',
                      '- SkiErg x 30 s a ritmo fuerte'] },
    obj: 'Sumás trabajo cardiovascular y de agarre al final de la sesión de tracción: el remo y el transporte mantienen la espalda y el antebrazo trabajando mientras las pulsaciones suben, sin cargar la zona lumbar con peso pesado.',
    tips: ['POR QUÉ ESTÁ ACÁ: el agarre y la espalda alta son lo que más se cansa en una sesión de tracción, y este bloque los exprime de otra manera y suma gasto calórico sin machacar nada.',
           'REMO: empujá primero con las piernas, después abrí el torso y al final tirá con los brazos. Si tirás con los brazos desde el principio, te quedás sin nafta.',
           'FARMER CARRY: hombros atrás, pasos cortos y el abdomen duro. Si el tronco se inclina, bajá la carga.',
           'SKIERG: arrancá la tracción con las caderas, seguí con los dorsales y terminá con los brazos; el ritmo es parejo, no a golpes.',
           'ALTERNATIVA: sin remo ergómetro, bicicleta x 40 s fuerte; sin SkiErg, remo ergómetro x 20 s; sin farmer carry, transporte de maleta x 30 m por lado.',
           'SENSACIÓN OBJETIVO: antebrazos y espalda ardiendo, piernas respondiendo y la respiración al límite pero controlada.'] };

  FIN.full = { tag: 'FINISHER', t: 'Cierre metabólico · Circuito de cuerpo completo',
    i: { min: 8, l: ['4 rondas: las tres estaciones sin pausa y 75 segundos de descanso al cerrar cada ronda.',
                     '- Farmer carry x 30 m',
                     '- Bicicleta / Assault bike x 30 s a ritmo fuerte',
                     '- Flexiones de brazos x 10 a 12 repeticiones'] },
    a: { min: 10, l: ['5 rondas: las tres estaciones sin pausa y 60 segundos de descanso al cerrar cada ronda.',
                      '- Farmer carry x 40 m con carga exigente',
                      '- Bicicleta / Assault bike x 30 s al máximo sostenible',
                      '- Flexiones con manos elevadas / declinadas x 12 a 15 repeticiones'] },
    obj: 'Un cierre que mezcla transporte, cardio y empuje para subir el gasto energético del día completo sin agregar fatiga muscular localizada: llegás a la próxima sesión de cuerpo completo con las piernas y el tronco recuperados.',
    tips: ['POR QUÉ ESTÁ ACÁ: en un esquema de cuerpo completo cada patrón se entrena tres veces por semana; este circuito suma trabajo aeróbico y de agarre sin competir con los básicos del día.',
           'RITMO: parejo de la primera a la última ronda. Es un cierre, no una competencia.',
           'FARMER CARRY: el tronco quieto y los hombros atrás; el agarre trabaja gratis acá.',
           'ALTERNATIVA: sin bicicleta, remo ergómetro x 250 m o escaladora x 30 s.',
           'SENSACIÓN OBJETIVO: respiración agitada, cuerpo caliente y una sensación de haber hecho todo bien. Si terminás destruido, la carga fue demasiada.'] };

  FIN.glute = { tag: 'FINISHER', t: 'Cierre metabólico · Escaladora y trineo',
    i: { min: 8, l: ['4 rondas: pasás de una estación a la otra sin pausa y descansás 75 segundos al cerrar cada ronda.',
                     '- Escaladora x 45 s a ritmo fuerte',
                     '- Sled push / Trineo x 20 m con una carga que te permita caminar firme'] },
    a: { min: 10, l: ['5 rondas: pasás de una estación a la otra sin pausa y descansás 60 segundos al cerrar cada ronda.',
                      '- Escaladora x 60 s a ritmo fuerte',
                      '- Sled push / Trineo x 25 m con una carga exigente'] },
    obj: 'Cerrás el día de pierna y glúteo con trabajo cardiovascular de bajo impacto: la escaladora y el trineo mantienen el glúteo y el cuádriceps activos mientras suben las pulsaciones, sin sumar daño muscular que te complique el día siguiente.',
    tips: ['POR QUÉ ESTÁ ACÁ: el glúteo y la pierna ya hicieron el trabajo duro. Acá se suma gasto energético y capacidad aeróbica sin restarle recuperación a la próxima sesión.',
           'ESCALADORA: pasos completos, apoyando todo el pie y sin colgarte de las manos. El glúteo es el que empuja.',
           'TRINEO: torso inclinado, brazos estirados y pasos cortos y rápidos.',
           'ALTERNATIVA: sin escaladora, bicicleta x 45 s fuerte; sin trineo, farmer carry x 30 m.',
           'SENSACIÓN OBJETIVO: piernas calientes y llenas, respiración agitada y ganas de seguir entrenando mañana.'] };

  FIN.carry = { tag: 'FINISHER', t: 'Cierre metabólico · Transporte y slam ball',
    i: { min: 6, l: ['4 rondas: las dos estaciones sin pausa y 75 segundos de descanso al cerrar cada ronda.',
                     '- Farmer carry x 40 m',
                     '- Slam ball (balón medicinal) x 12 repeticiones'] },
    a: { min: 8, l: ['5 rondas: las dos estaciones sin pausa y 60 segundos de descanso al cerrar cada ronda.',
                     '- Farmer carry x 40 m con carga exigente',
                     '- Slam ball (balón medicinal) x 15 repeticiones'] },
    obj: 'Densidad metabólica con ejercicios de bajo impacto articular: el transporte mantiene el tono del tronco y el agarre mientras los slams con balón elevan la frecuencia cardíaca con poco impacto articular.',
    tips: ['POR QUÉ ESTÁ ACÁ: es un cierre corto y seco. Suma volumen de trabajo y gasto calórico sin sumarle estrés a las articulaciones.',
           'FARMER CARRY: pasos cortos, hombros atrás y costillas abajo.',
           'SLAM BALL: balón por encima de la cabeza y lanzamiento al piso con todo el cuerpo, a ritmo parejo y sin frenar en la mitad.',
           'SENSACIÓN OBJETIVO: antebrazos llenos, pulsaciones altas y técnica limpia hasta el último metro.'] };

  FIN.zona2 = { tag: 'CARDIO', t: 'Cardio · Zona 2 de recuperación',
    i: { min: 20, l: ['20 min Caminata inclinada (Zona 2)'] },
    a: { min: 25, l: ['25 min Caminata inclinada (Zona 2)'] },
    obj: 'Trabajo aeróbico a baja intensidad: mejora la capacidad de recuperar entre series y entre sesiones y acelera el retorno a la calma después de un día exigente, sin interferir con la hipertrofia.',
    tips: ['POR QUÉ ESTÁ ACÁ: es el día más corto de fuerza de la semana, así que cabe un bloque de base aeróbica que mejora tu recuperación general.',
           'RITMO: tenés que poder hablar frases completas. Si no podés, estás yendo demasiado fuerte para zona 2.',
           'ALTERNATIVA: bicicleta o elíptica a ritmo conversacional por el mismo tiempo.',
           'SENSACIÓN OBJETIVO: entrar en calor sin sentir cansancio y terminar con ganas de seguir.'] };

  PB.FIN = FIN;
})();
