/* =========================================================
   PLANTILLAS BASE COACH JP · sesiones femeninas (Bodybuilding) · CONSTRUCTOR DE GLÚTEOS
   Misma estructura que 12-dias-masculino.js: entrada en calor · F principal · H compuestos · A aislamientos · B/T cierre · C core · M finisher (o K cardio).
   Metodología del tren inferior:
     · hipertrofia por estiramiento: el glúteo se carga en su longitud más larga (peso muerto rumano con déficit, sentadilla búlgara con el torso inclinado) y se pausa ahí
     · máxima tensión en el acortamiento: hip thrust pesado con pausa de 2 segundos arriba y patada en polea con vector de fuerza cruzado
     · estabilidad externa máxima y poca fatiga axial: hack squat, prensa, hip thrust y polea antes que la sentadilla con barra; unilaterales con apoyo
     · volumen inteligente: de 3 a 5 series efectivas por ejercicio principal (nunca más de 8) y 2 a 3 exposiciones de glúteo por semana; el RIR lo pone el nivel (intermedio: RIR 1-2 en los básicos y
       RIR 1 en los aislamientos; élite, en 15-elite.js: RIR 0-1), así que los focos de estas sesiones no prometen un RIR distinto
   Tempo exacto por fila con tp: ['bajada, pausa abajo, subida, pausa arriba']. Sin movimientos de nivel avanzado poco aplicables (dominadas lastradas, rueda abdominal, elevaciones colgado).
   ========================================================= */
(function(){
  'use strict';
  var PB = window.__jpPB; if(!PB) return;
  var R = PB.R, D = PB.D, FIN = PB.FIN;

  D.F_GLU_A = { short: 'GLÚTEO A', label: 'Cadera y Glúteo', title: 'Cadera y Glúteo · Hip Thrust Pesado', wu: 'glute', chips: ['🍑 Glúteo', '🎯 Hip thrust pesado + estiramiento', '🔥 Cierre metabólico'],
    foco: 'Día madre del Constructor de Glúteos: el hip thrust pesado con pausa de 2 segundos arriba es el ejercicio de carga de la semana (máxima tensión con el glúteo acortado). Después, el peso muerto rumano con déficit lleva glúteo e isquios a su posición más estirada junto a un curl femoral con pelota suiza, la sentadilla búlgara con el torso inclinado carga el glúteo estirado de a una pierna junto a la patada en polea cruzada (el mismo músculo en las dos longitudes) y un biset corto de puente a una pierna con abducción caminando con banda cierra el glúteo medio. Todo con apoyo estable y poca fatiga axial: se trabaja cerca del fallo técnico y se descansa lo necesario para repetir la calidad.',
    filas: [
      R('F', 'Hip thrust con barra', '4x6-8|1|150', null, { tp: ['2012'], n: 'Espalda alta apoyada, mentón al pecho, pies bajo las rodillas y pausa de 2 segundos arriba con el glúteo apretado y las costillas abajo. Es el ejercicio donde más se nota si progresaste: anotá los kilos y no regales la pausa.' }),
      R('B', ['Peso muerto rumano con déficit', 'Curl femoral con pelota suiza'], '3x8-10/10-12|1|90', null, { tp: ['3210', '3011'], n: 'Parada sobre un disco de 3 a 5 cm, cadera hacia atrás y pausa de 2 segundos abajo en el estiramiento máximo; el rango termina donde la espalda pierde su forma. El curl con pelota suiza se hace en el piso, al lado: cadera arriba y bajada lenta.' }),
      R('B', ['Sentadilla búlgara con torso inclinado', 'Patada de glúteo en polea cruzada'], '3x8-10/12-15|1|75', null, { tp: ['3110', '3011'], n: 'Búlgara con el torso inclinado unos 30° y pausa de 1 segundo abajo (la pierna débil primero) y patada en la polea cruzando el cuerpo, con 1 segundo apretando arriba: el glúteo estirado y acortado en el mismo biset.' }),
      R('B', ['Puente de glúteo a una pierna', 'Abducción caminando con banda'], '2x10/12 por lado|1|45', null, { n: 'Cierre de glúteo: el puente a una pierna activa el glúteo mayor con la pelvis estable y la abducción caminando con banda termina de congestionar el glúteo medio. Sin pausa entre las dos.' }),
      R('C', 'Dead bug', '2x8|1|45'),
      R('M', null, null, null, { fin: FIN.glute })
    ] };

  D.F_QUAD = { short: 'PIERNA', label: 'Cuádriceps', title: 'Cuádriceps · Rodilla Dominante', wu: 'legs', chips: ['🦵 Pierna', '🎯 Hack squat + prensa', '🔥 Cierre metabólico'],
    foco: 'Día de rodilla dominante con máxima estabilidad: el hack squat es el ancla (torso apoyado, cero fatiga lumbar), la prensa con los pies altos va junto al gemelo a una pierna y la sentadilla búlgara con el torso erguido (acá el cuádriceps hace el trabajo) junto al gemelo de pie. Los isquios ya trabajan en los días de glúteo con el rumano y el curl, así que este día concentra el volumen de cuádriceps y pantorrilla. Llegá con hidratos comidos y con ganas.',
    filas: [
      R('F', 'Hack squat', '4x6-8|1|150', null, { tp: ['3110'], n: 'Espalda apoyada, pies a la altura media de la plataforma y bajada de 3 segundos hasta una flexión profunda. La máquina te da estabilidad externa: usala para cargar fuerte sin pagar con la espalda baja.' }),
      R('B', ['Prensa 45°', 'Elevación de talones a una pierna'], '3x10-12/12-15|1|90', null, { tp: ['3110', '2211'], n: 'Pies altos y apenas abiertos en la prensa: bajá hasta donde la pelvis no se despegue del respaldo. El gemelo a una pierna va sobre un escalón al lado de la máquina, con pausa de 1 segundo abajo.' }),
      R('B', ['Bulgarian split squat', 'Elevación de gemelos de pie'], '3x8-10/10-15|1|75', null, { tp: ['3110', '2211'], n: 'Búlgara con el torso erguido para cargar el cuádriceps, la pierna débil primero; el gemelo de pie con pausa abajo, en el estiramiento.' }),
      R('C', 'Hollow body', '2x30s|1|45'),
      R('M', null, null, null, { fin: FIN.pierna })
    ] };

  D.F_GLU_B = { short: 'GLÚTEO B', label: 'Glúteo y Armonía', title: 'Glúteo y Armonía · Volumen, Hombro y Brazos', wu: 'glute', chips: ['🍑 Glúteo', '🎯 Volumen + hombro + brazos', '🔥 Cierre metabólico'],
    foco: 'Segunda sesión de glúteo de la semana, pensada para volumen con tensión limpia: el hip thrust a una pierna con pausa es el ancla, el peso muerto rumano con déficit liviano va junto a la patada con mancuerna (glúteo estirado y acortado), la abducción en máquina junto a las elevaciones laterales (glúteo medio y hombro en la misma zona de la sala) y un biset corto de brazos con curl en banco inclinado y extensión sobre la cabeza. Acá no se busca la carga máxima sino la conexión con el glúteo en cada repetición. Es el día del bombeo.',
    filas: [
      R('F', 'Hip thrust a una pierna', '3x10|1|90', null, { tp: ['2012'], n: 'Una pierna por vez, pelvis cuadrada y pausa de 2 segundos arriba. Arrancá por la pierna más débil y que la otra copie el mismo número de repeticiones.' }),
      R('B', ['Peso muerto rumano con déficit', 'Patada de glúteo en cuadrupedia con mancuerna'], '3x10-12/12-15|1|90', null, { tp: ['3210', ''], n: 'Con mancuernas y sobre un disco de 3 a 5 cm: bajá lento hasta el estiramiento máximo y pausa de 2 segundos abajo. La patada, con la mancuerna en el hueco de la rodilla, va en el piso al lado. Carga moderada, rango largo.' }),
      R('B', ['Abducción sentado en máquina', 'Elevaciones laterales con mancuernas'], '3x15-20/12-15|1|60', null, { n: 'Glúteo medio en la máquina y deltoide lateral con mancuernas livianas al lado: dos músculos que dan la forma de la silueta, sin pausa entre los dos.' }),
      R('B', ['Curl de bíceps en banco inclinado con mancuernas', 'Extensión tríceps tras nuca a 2 manos'], '2x10-12/10-12|1|75', null, { n: 'Dosis corta de brazos con los dos músculos estirados: el curl con el codo detrás del torso y la extensión con el codo arriba de la cabeza.' }),
      R('C', 'Plancha lateral', '2x30s|1|45'),
      R('M', null, null, null, { fin: FIN.gluteB })
    ] };

  D.F_GLU_SH = { short: 'GLÚTEO + HOMBRO', label: 'Glúteo y Hombros', title: 'Glúteo y Hombros · Frecuencia y Estética', wu: 'glute', chips: ['🍑 Glúteo', '🎯 Hombros', '🔥 Cierre metabólico'],
    foco: 'Tercera exposición semanal del glúteo con hip thrust en rango medio y pausa, una búlgara liviana con el torso inclinado y patadas cruzadas, más un bloque de hombros (press, laterales y posteriores) para sumar anchura y proporción. Los hombros llegan frescos porque el trabajo de pierna es de baja demanda sistémica. Sesión de volumen y estética: buscá la conexión con cada músculo.',
    filas: [
      R('F', 'Hip thrust con barra', '3x8-10|1|120', '4x6-8|0-1|150', { tp: ['2012'], n: 'Rango medio y pausa de 2 segundos arriba. Esta tercera exposición semanal del glúteo se hace con carga seria pero sin llegar al límite: tenés que llegar fresca a los hombros.' }),
      R('H', 'Sentadilla búlgara con torso inclinado', '3x10 por lado|1|90', '3x10 por lado|0-1|90', { tp: ['3110'] }),
      R('H', 'Press de hombros sentado', '3x8-12|1|90', '4x8-10|0-1|90'),
      R('A', 'Patada de glúteo en polea cruzada', '3x12-15 por lado|1|60', '3x12-15 por lado|0|45|drop', { tp: ['3011'] }),
      R('A', 'Elevaciones laterales en polea baja', '4x12-15|1|45', '4x15-20|0|45|drop'),
      R('A', 'Pájaro / Elevaciones posteriores inclinado', '3x15|1|45', '4x15-20|0|45|drop'),
      R('B', ['Abducción caminando con banda', 'Puente de glúteo a una pierna'], '2x12 por lado/10 por lado|1|45', '3x12 por lado/12 por lado|0|45|drop'),
      R('C', ['Bird dog', 'Plancha frontal'], '3x8 por lado/30s|1|45', '3x10 por lado/40s|0|45'),
      R('M', null, null, null, { fin: FIN.glute })
    ] };

  D.F_UP = { short: 'TORSO', label: 'Torso y Core', title: 'Torso y Core · Espalda, Pecho y Hombros', wu: 'upper', chips: ['💪 Torso', '🎯 Espalda + pecho + hombro', '🔥 Cierre metabólico'],
    foco: 'Sesión de torso integral: espalda con tracción vertical y horizontal, pecho en dos ángulos (press inclinado y cruce de cables), un press de hombro y un biset de deltoide lateral y posterior para la postura y la proporción. Un biset de brazos y el core cierran el día. Priorizá la espalda: es el contrapeso del trabajo de pierna y lo que más cambia la silueta.',
    filas: [
      R('F', 'Jalón al pecho con agarre ancho', '4x8-12|1|120', '4x6-8|1|150', { n: 'Pecho hacia la barra y escápulas hacia abajo antes de tirar. Los codos van a las costillas. Es el ejercicio principal del día: cargalo en serio.' }),
      R('H', 'Press inclinado con mancuernas', '3x8-12|1|120', '4x8-10|1|120'),
      R('H', 'Remo apoyado en banco inclinado', '4x10-12|1|90', '4x10-12|0-1|90'),
      R('H', 'Press de hombros sentado', '3x10-12|1|90', '3x10-12|0-1|90'),
      R('A', 'Cruce de cables en polea alta', '3x12-15|1|60', '4x12-15|0|60'),
      R('B', ['Elevaciones laterales con mancuernas', 'Pájaro / Elevaciones posteriores inclinado'], '4x12-15/15|1|45', null, { soloI: true }),
      R('T', ['Elevaciones laterales con mancuernas', 'Pájaro / Elevaciones posteriores inclinado', 'Elevaciones W con mancuernas'], null, '4x15-20/15-20/12-15|0|45|drop', { soloA: true }),
      R('B', ['Curl de bíceps en banco inclinado con mancuernas', 'Extensión tríceps tras nuca a 2 manos'], '4x10-12/10-12|1|75', '3x10-12/10-12|0|75|drop'),
      R('C', ['Dead bug', 'Hollow body'], '3x8 por lado/30s|1|45', '3x10 por lado/40s|0|45'),
      R('M', null, null, null, { fin: FIN.torso })
    ] };

  D.F_PUSH = { short: 'PUSH', label: 'Hombro y Pecho', title: 'Push · Hombro, Pecho y Tríceps', wu: 'push', chips: ['💪 Empuje', '🎯 Hombro + pecho', '🔥 Cierre metabólico'],
    foco: 'Día de empuje con el hombro como prioridad: el press militar sentado es el ancla y después vienen dos bisets en estaciones vecinas: el press inclinado con mancuernas junto a la elevación lateral en polea (pecho superior y deltoide lateral) y la extensión de tríceps sobre la cabeza junto a la patada de tríceps. Es una sesión corta y densa que no compite con las de pierna: la estética del hombro se construye con volumen y frecuencia.',
    filas: [
      R('F', 'Press militar sentado', '4x6-8|2|150', null, { n: 'Glúteos y abdomen apretados, costillas abajo y la barra sube en línea recta. Si arqueás la espalda baja para ayudarte, bajá la carga.' }),
      R('B', ['Press inclinado con mancuernas', 'Elevaciones laterales en polea baja'], '3x8-12/12-15|1|90', null, { tp: ['3110', ''], n: 'Banco a 30° para el pecho superior y la polea al lado para el deltoide lateral, de a un brazo: la polea mantiene la tensión desde abajo. Mientras uno trabaja, el otro descansa.' }),
      R('B', ['Extensión tríceps tras nuca a 2 manos', 'Patada de tríceps con mancuerna'], '3x10-12/12-15|1|75', null, { n: 'Cierre de tríceps: la extensión sobre la cabeza trabaja la porción larga estirada y la patada termina de congestionar con el codo fijo. Sin pausa entre las dos.' }),
      R('C', 'Pallof press', '2x10|1|45'),
      R('M', null, null, null, { fin: FIN.push })
    ] };

  D.F_PULL = { short: 'PULL', label: 'Espalda y Bíceps', title: 'Pull · Espalda, Deltoide Posterior y Bíceps', wu: 'pull', chips: ['💪 Tracción', '🎯 Dorsal + postura', '🔥 Cierre metabólico'],
    foco: 'Día de tracción: el remo con barra es el ancla y después vienen tres bisets de estación compartida: el jalón al pecho con el pájaro (dorsal y deltoide posterior), el remo en polea baja con el curl en banco inclinado (espalda media y bíceps estirado) y el face pull con el curl martillo (postura y braquial). Tirá con los codos y apretá las escápulas medio segundo en cada repetición: es lo que separa una espalda trabajada de una espalda "mirada".',
    filas: [
      R('F', 'Remo con barra inclinado', '4x6-8|2|150', null, { n: 'Torso firme a 45 grados, abdomen duro y la barra sube al ombligo. Si el torso se levanta para ayudar, bajá el peso.' }),
      R('B', ['Jalón al pecho con agarre ancho', 'Pájaro / Elevaciones posteriores inclinado'], '3x8-12/15|1|90', null, { n: 'Pecho hacia la barra y escápulas abajo antes de tirar; el pájaro con mancuernas livianas va al lado del jalón.' }),
      R('B', ['Remo en polea baja agarre en V', 'Curl de bíceps en banco inclinado con mancuernas'], '3x10-12/10-12|1|75', null, { n: 'Espalda y bíceps seguidos: el remo lleva los codos a la cadera y el curl en banco inclinado deja el brazo detrás del torso, con el bíceps estirado.' }),
      R('B', ['Face Pull con cuerda', 'Curl martillo'], '3x15/10-12|1|60', null, { n: 'Postura y brazo: face pull con codos altos y escápulas juntas, y martillo para el braquial. Cargas livianas y rango completo.' }),
      R('C', 'Crunch abdominal', '2x12-15|1|45'),
      R('M', null, null, null, { fin: FIN.pull })
    ] };

  D.F_PIE = { short: 'PIERNA', label: 'Pierna Completa', title: 'Pierna Completa · Glúteo Medio y Cuádriceps', wu: 'legs', chips: ['🦵 Pierna', '🎯 Armonía de pierna', '🔥 Cierre metabólico'],
    foco: 'Sesión de pierna completa con estabilidad externa: hack squat como ancla, peso muerto rumano con déficit para la cadena posterior estirada y sentadilla búlgara con el torso inclinado para el trabajo unilateral. Cuádriceps, isquios y gemelo cierran con aislamiento, y un biset de abductores y aductores termina de armar la pierna. Pierna armónica: ningún grupo se descuida.',
    filas: [
      R('F', 'Hack squat', '4x6-8|1|150', '5x5-7|0-1|180', { tp: ['3110'] }),
      R('H', 'Peso muerto rumano con déficit', '3x8-10|1|120', '4x6-8|0-1|150', { tp: ['3210'] }),
      R('H', 'Sentadilla búlgara con torso inclinado', '3x8-10 por lado|1|90', '4x8-10 por lado|0-1|90', { tp: ['3110'] }),
      R('A', 'Extensión de cuádriceps', '3x12-15|1|60', '4x12-15|0|60|drop'),
      R('A', 'Curl femoral acostado', '3x10-12|1|75', '3x10-12|0|60'),
      R('A', 'Elevación de gemelos de pie', '4x10-15|1|60', '4x10-15|0|60'),
      R('B', ['Abducción de cadera en máquina', 'Aducción en máquina'], '3x15/15|1|45', '4x15-20/15|0|45|drop'),
      R('C', ['Hollow body', 'Bird dog'], '3x30s/8 por lado|1|45', '3x40s/10 por lado|0|45'),
      R('M', null, null, null, { fin: FIN.pierna })
    ] };

  /* ---------- split femenino de 3 días: Pierna A / Push, Pull y Brazos / Pierna B ---------- */
  D.F_PA = { short: 'PIERNA A', label: 'Pierna A', title: 'Pierna A · Glúteos y Cuádriceps + Core', wu: 'legs', chips: ['🦵 Pierna A', '🎯 Glúteo + cuádriceps', '🔥 Cierre metabólico'],
    foco: 'Pierna A del Constructor de Glúteos, con énfasis estricto en glúteos y cuádriceps: el hip thrust pesado con pausa de 2 segundos arriba marca la carga del día (glúteo acortado, máxima tensión), el hack squat suma volumen de rodilla dominante con el torso apoyado y sin fatiga axial, la sentadilla búlgara con el torso inclinado lleva el glúteo a trabajar estirado y la patada en polea cruzada cierra con tensión constante. El biset de glúteo medio termina de congestionar y el core cierra la sesión. Cada ejercicio principal va de 3 a 5 series efectivas cerca del fallo técnico, sin llegar al fallo: llegá con hidratos comidos y buscá la conexión con el glúteo en cada repetición.',
    filas: [
      R('F', 'Hip thrust con barra', '4x6-8|1|150', '5x6-8|0-1|180', { tp: ['2012'], n: 'Espalda alta apoyada, mentón al pecho, pies bajo las rodillas y pausa de 2 segundos arriba con el glúteo apretado y las costillas abajo. Es el ejercicio donde más se nota si progresaste: anotá los kilos y no regales la pausa.' }),
      R('H', 'Hack squat', '4x8-10|1|120', '4x8-10|0-1|120', { tp: ['3110'], n: 'Espalda apoyada, pies a media altura y apenas abiertos para repartir el trabajo entre cuádriceps y glúteo. Bajada de 3 segundos hasta donde la pelvis no se despegue del respaldo: ese es tu rango útil.' }),
      R('H', 'Sentadilla búlgara con torso inclinado', '3x8-10 por lado|1|90', '4x8-10 por lado|0-1|90', { tp: ['3110'], n: 'Arrancá siempre por la pierna más débil y repetí con la otra el mismo número de repeticiones. Torso inclinado unos 30° y pausa de 1 segundo abajo con el glúteo estirado.' }),
      R('A', 'Extensión de cuádriceps', '3x12-15|1|60', '4x12-15|0|60|drop'),
      R('A', 'Patada de glúteo en polea cruzada', '3x12-15 por lado|1|60', '4x12-15 por lado|0|45|drop', { tp: ['3011'] }),
      R('B', ['Abducción caminando con banda', 'Puente de glúteo a una pierna'], '2x12 por lado/10 por lado|1|45', '3x12 por lado/12 por lado|0|45|drop', { n: 'Cierre de glúteo medio: la abducción con banda empuja las rodillas hacia afuera y el puente a una pierna termina de congestionar con la pelvis estable. Sin pausa entre las dos.' }),
      R('C', ['Dead bug', 'Plancha lateral'], '3x8 por lado/30s|1|45', '3x10 por lado/40s|0|45'),
      R('M', null, null, null, { fin: FIN.glute })
    ] };

  D.F_PPB = { short: 'PUSH PULL + BRAZOS', label: 'Push, Pull y Brazos', title: 'Push, Pull y Brazos · Torso Completo', wu: 'upper', chips: ['💪 Torso', '🎯 Empuje + tracción + brazos', '🔥 Cierre metabólico'],
    foco: 'Sesión de torso completo y equilibrado: una tracción vertical abre el día, seguida de un press inclinado, un remo y un press de hombro para cubrir empuje y tracción en partes iguales. El cruce de cables trabaja el pecho estirado, el deltoide lateral y posterior redondean el hombro y el cierre de brazos (bíceps y tríceps) termina de armar la silueta. Priorizá la espalda: es el contrapeso del trabajo de pierna y lo que más cambia la postura. Controlá la bajada de cada repetición y no regales rango.',
    filas: [
      R('F', 'Jalón al pecho con agarre ancho', '4x8-12|1|120', '4x6-8|1|150', { n: 'Pecho hacia la barra y escápulas hacia abajo antes de tirar. Los codos van hacia las costillas. Es el ejercicio principal del día: cargalo en serio.' }),
      R('H', 'Press inclinado con mancuernas', '3x8-12|1|120', '4x8-10|1|120'),
      R('H', 'Remo apoyado en banco inclinado', '4x10-12|1|90', '4x10-12|0-1|90'),
      R('H', 'Press de hombros sentado', '3x10-12|1|90', '3x10-12|0-1|90'),
      R('A', 'Cruce de cables en polea alta', '3x12-15|1|60', '4x12-15|0|60|drop'),
      R('B', ['Elevaciones laterales con mancuernas', 'Pájaro / Elevaciones posteriores inclinado'], '4x12-15/15|1|45', null, { soloI: true, n: 'Cierre de hombros: lateral y posterior seguidos, con cargas livianas y rango completo, para que el deltoide quede redondo desde todos los ángulos.' }),
      R('T', ['Elevaciones laterales con mancuernas', 'Pájaro / Elevaciones posteriores inclinado', 'Elevaciones W con mancuernas'], null, '4x15-20/15-20/12-15|0|45|drop', { soloA: true, n: 'Triset de hombros: lateral, posterior y W seguidos sin pausa. Acá manda la congestión, no la carga.' }),
      R('B', ['Curl de bíceps en banco inclinado con mancuernas', 'Extensión tríceps tras nuca a 2 manos'], '4x10-12/10-12|1|75', '4x10-12/10-12|0|75|drop', { n: 'Biset de brazos: bíceps y tríceps antagonistas sin pausa. Mientras uno trabaja el otro se recupera, así que podés cargar fuerte.' }),
      R('C', ['Hollow body', 'Dead bug'], '3x30s/8 por lado|1|45', '3x40s/10 por lado|0|45'),
      R('M', null, null, null, { fin: FIN.torso })
    ] };

  D.F_PB = { short: 'PIERNA B', label: 'Pierna B', title: 'Pierna B · Glúteos e Isquiotibiales + Refuerzo de Torso', wu: 'glute', chips: ['🦵 Pierna B', '🎯 Glúteo + isquios', '💪 Refuerzo de torso'],
    foco: 'Pierna B del Constructor de Glúteos, con énfasis estricto en glúteos e isquiotibiales: el peso muerto rumano con déficit abre el día con la cadena posterior en su máximo estiramiento, el hip thrust con pausa y la sentadilla búlgara con el torso inclinado cargan el glúteo en dos longitudes distintas y el curl femoral y la patada en polea cruzada cierran con tensión constante. Al final entra un refuerzo de torso (tracción vertical y hombros) que te da una segunda exposición semanal a espalda y deltoides sin sumar fatiga de pierna. Cuidá la espalda neutra en cada repetición del rumano: es mejor una repetición menos que una espalda redondeada.',
    filas: [
      R('F', 'Peso muerto rumano con déficit', '4x6-8|1|150', '5x6-8|0-1|180', { tp: ['3210'], n: 'Parada sobre un disco de 3 a 5 cm: la cadera se va hacia atrás, las rodillas apenas flexionadas y la barra pegada a las piernas. Bajá hasta sentir el estiramiento máximo de glúteo e isquios, pausa de 2 segundos y subí sin perder la espalda neutra: ahí termina el rango útil.' }),
      R('H', 'Hip thrust con barra', '4x8-10|1|120', '5x8-10|0-1|120', { tp: ['2012'], n: 'Pausa de 2 segundos arriba, costillas abajo y mentón al pecho. En esta sesión trabajás con la cadena posterior ya activada por el rumano: ajustá la carga si el glúteo llega cansado.' }),
      R('H', 'Sentadilla búlgara con torso inclinado', '3x8-10 por lado|1|90', '4x8-10 por lado|0-1|90', { tp: ['3110'], n: 'Torso inclinado unos 30° para cargar el glúteo estirado y pausa de 1 segundo abajo. Arrancá por la pierna más débil.' }),
      R('A', 'Curl femoral acostado', '3x10-12|1|75', '4x10-12|0|75|drop'),
      R('A', 'Patada de glúteo en polea cruzada', '3x12-15 por lado|1|60', '4x12-15 por lado|0|45|drop', { tp: ['3011'] }),
      R('A', 'Elevación de gemelos de pie', '4x10-15|1|60', '5x10-15|0|60'),
      R('H', 'Jalón al pecho con agarre estrecho', '3x10-12|1|90', '4x10-12|0-1|90', { n: 'Refuerzo de torso: no es el día para buscar el máximo sino estímulo de calidad con poca fatiga. Codos a las costillas y pausa de medio segundo abajo.' }),
      R('B', ['Elevaciones laterales con mancuernas', 'Pájaro / Elevaciones posteriores inclinado'], '3x12-15/15|1|45', null, { soloI: true, n: 'Cierre de hombros: lateral y posterior seguidos, livianos y con rango completo.' }),
      R('T', ['Elevaciones laterales con mancuernas', 'Pájaro / Elevaciones posteriores inclinado', 'Elevaciones W con mancuernas'], null, '4x15-20/15-20/12-15|0|45|drop', { soloA: true, n: 'Triset de hombros: tres estaciones sin pausa para redondear el deltoide. La congestión es el objetivo.' }),
      R('C', ['Elevación de piernas en banco', 'Plancha frontal'], '3x10/30s|1|45', '3x12/40s|0|45'),
      R('M', null, null, null, { fin: FIN.gluteB })
    ] };

  PB.ESTR.push(
    { g: 'f', f: 3, est: 'Pierna A · Push, Pull y Brazos · Pierna B', dias: ['F_PA', 'F_PPB', 'F_PB'], res: 'Split de tres días con prioridad en tren inferior (Constructor de Glúteos): Pierna A (glúteos y cuádriceps + core), Push, Pull y Brazos (torso completo y equilibrado) y Pierna B (glúteos e isquiotibiales + refuerzo de torso). Glúteo y pierna dos veces por semana, con la sesión de torso en el medio para recuperar. Hipertrofia por estiramiento (peso muerto rumano con déficit, búlgara con el torso inclinado), hip thrust pesado con pausa y patada en polea cruzada, con apoyos estables y poca fatiga axial. Todas con entrada en calor específica, un básico pesado, compuestos de hipertrofia, cierre de congestión, core y finisher metabólico. Volumen semanal en series efectivas (intermedio): glúteo 24 (es el grupo con más volumen), cuádriceps 7, isquiotibiales 7, gemelo 4 y, en el torso, espalda 11, hombro lateral 7, pecho 6 y bíceps y tríceps 4 cada uno.' },
    { g: 'f', f: 4, est: 'Glúteo · Torso · Pierna · Glúteo y Hombros', dias: ['F_GLU_A', 'F_UP', 'F_QUAD', 'F_GLU_SH'], res: 'Glúteo en frecuencia 2 (con una tercera exposición a baja demanda), torso integral y una sesión de rodilla dominante con máquinas estables: la mayor parte del volumen va a tren inferior sin descuidar el desarrollo general. Volumen semanal en series efectivas (intermedio): glúteo 27 (con la tercera exposición a baja demanda), cuádriceps 10, isquiotibiales 6, gemelo 6, espalda 8, hombro lateral 8, pecho 6 y bíceps y tríceps 4 cada uno.' },
    { g: 'f', f: 5, est: 'Glúteo · Push · Pierna · Pull · Glúteo y Armonía', dias: ['F_GLU_A', 'F_PUSH', 'F_QUAD', 'F_PULL', 'F_GLU_B'], res: 'Glúteo y pierna en frecuencia 2-3 con Push y Pull dedicados: cadera pesada, empuje (hombro y pecho), cuádriceps y gemelo, tracción y una segunda sesión de glúteo con hombro y brazos. Cinco sesiones completas con bisets en estaciones vecinas y un ejercicio de core por día que va rotando: se entrena fuerte y se descansa en serio. Volumen semanal en series efectivas (intermedio): glúteo 23 (el grupo con más volumen), cuádriceps 10, isquiotibiales 9, gemelo 6, espalda 10, hombro lateral 6, hombro posterior 6, pecho 3, bíceps y tríceps 8 cada uno y core 10.' }
  );
})();
