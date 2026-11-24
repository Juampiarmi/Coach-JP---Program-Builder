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
    foco: 'Segunda exposición semanal del glúteo a baja demanda, con hip thrust en rango medio y pausa como ancla. Después vienen la sentadilla búlgara con el torso inclinado junto a la patada en polea cruzada (el glúteo estirado y acortado), la abducción en máquina junto a las elevaciones laterales (glúteo medio y deltoide lateral) y el press de hombros junto al pájaro para sumar anchura y proporción. Los hombros llegan frescos porque el trabajo de pierna es de baja demanda sistémica. Sesión de volumen y estética: buscá la conexión con cada músculo.',
    filas: [
      R('F', 'Hip thrust con barra', '3x8-10|1|120', null, { tp: ['2012'], n: 'Rango medio y pausa de 2 segundos arriba. Se hace con carga seria pero sin llegar al límite: tenés que llegar fresca a los hombros.' }),
      R('B', ['Sentadilla búlgara con torso inclinado', 'Patada de glúteo en polea cruzada'], '3/2x10/12-15|1|75', null, { tp: ['3110', '3011'], n: 'Búlgara con el torso inclinado unos 30° (la pierna débil primero) y patada en la polea cruzando el cuerpo. En la ronda que sobra hacés solo la búlgara.' }),
      R('B', ['Abducción sentado en máquina', 'Elevaciones laterales con mancuernas'], '2/4x15-20/12-15|1|60', null, { n: 'Glúteo medio en la máquina y deltoide lateral con mancuernas livianas al lado. En las rondas que sobran hacés solo las laterales.' }),
      R('B', ['Press de hombros sentado', 'Pájaro / Elevaciones posteriores inclinado'], '3x8-12/15|1|75', null, { n: 'Hombro adelante y atrás con mancuernas: press con la espalda apoyada y pájaro con el torso inclinado.' }),
      R('C', 'Bird dog', '2x8|1|45'),
      R('M', null, null, null, { fin: FIN.glute })
    ] };

  D.F_UP = { short: 'TORSO', label: 'Torso y Core', title: 'Torso y Core · Espalda, Pecho y Hombros', wu: 'upper', chips: ['💪 Torso', '🎯 Espalda + pecho + hombro', '🔥 Cierre metabólico'],
    foco: 'Sesión de torso integral: el jalón al pecho es el ancla y después vienen el press inclinado junto al remo apoyado (empuje y tracción horizontales), el cruce de poleas junto al pájaro (pecho y deltoide posterior), el press de hombros junto a la elevación lateral y un biset de brazos con curl inclinado y extensión sobre la cabeza. El Pallof press cierra el core. Priorizá la espalda: es el contrapeso del trabajo de pierna y lo que más cambia la silueta.',
    filas: [
      R('F', 'Jalón al pecho con agarre ancho', '4x8-12|1|120', null, { n: 'Pecho hacia la barra y escápulas hacia abajo antes de tirar. Los codos van a las costillas. Es el ejercicio principal del día: cargalo en serio.' }),
      R('B', ['Press inclinado con mancuernas', 'Remo apoyado en banco inclinado'], '3/4x8-12/10-12|1|90', null, { tp: ['3110', ''], n: 'Empuje y tracción en el mismo banco inclinado: press con las mancuernas y, dando vuelta el cuerpo, remo con el pecho apoyado. En la ronda que sobra hacés solo el remo.' }),
      R('B', ['Cruce de cables en polea alta', 'Pájaro / Elevaciones posteriores inclinado'], '3x12-15/15|1|60', null, { tp: ['3011', ''], n: 'Cruce con el pecho estirado al abrir y pájaro con mancuernas livianas al lado de la polea.' }),
      R('B', ['Press de hombros sentado', 'Elevaciones laterales con mancuernas'], '3/4x10-12/12-15|1|75', null, { n: 'Hombro completo con las mismas mancuernas: press con la espalda apoyada y laterales livianas. En la ronda que sobra hacés solo las laterales.' }),
      R('B', ['Curl de bíceps en banco inclinado con mancuernas', 'Extensión tríceps tras nuca a 2 manos'], '4x10-12/10-12|1|75', null, { n: 'Biset de brazos con los dos músculos estirados: el curl con el codo detrás del torso y la extensión con el codo arriba de la cabeza.' }),
      R('C', 'Pallof press', '2x10|1|45'),
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
    foco: 'Pierna A del Constructor de Glúteos, con énfasis en glúteos y cuádriceps: el hip thrust pesado con pausa de 2 segundos arriba marca la carga del día (glúteo acortado, máxima tensión). Después vienen el hack squat junto al gemelo a una pierna (rodilla dominante con el torso apoyado, sin fatiga axial), la sentadilla búlgara con el torso inclinado junto a la patada en polea cruzada (el glúteo estirado y acortado) y la extensión de cuádriceps junto a la abducción caminando con banda para el glúteo medio. El dead bug cierra el core. Llegá con hidratos comidos y buscá la conexión con el glúteo en cada repetición.',
    filas: [
      R('F', 'Hip thrust con barra', '4x6-8|1|150', null, { tp: ['2012'], n: 'Espalda alta apoyada, mentón al pecho, pies bajo las rodillas y pausa de 2 segundos arriba con el glúteo apretado y las costillas abajo. Anotá los kilos y no regales la pausa.' }),
      R('B', ['Hack squat', 'Elevación de talones a una pierna'], '4/3x8-10/12-15|1|120', null, { tp: ['3110', '2211'], n: 'Espalda apoyada, pies a media altura y apenas abiertos; bajada de 3 segundos. El gemelo a una pierna va sobre un escalón al lado de la máquina. En la ronda que sobra hacés solo el hack.' }),
      R('B', ['Sentadilla búlgara con torso inclinado', 'Patada de glúteo en polea cruzada'], '3x8-10/12-15|1|75', null, { tp: ['3110', '3011'], n: 'Torso inclinado unos 30° y pausa de 1 segundo abajo (la pierna débil primero); la patada en la polea cruza el cuerpo y aprieta 1 segundo arriba.' }),
      R('B', ['Extensión de cuádriceps', 'Abducción caminando con banda'], '3/2x12-15/12 por lado|1|60', null, { n: 'Cuádriceps aislado en la máquina y glúteo medio con la banda al lado. En la ronda que sobra hacés solo la extensión.' }),
      R('C', 'Dead bug', '2x8|1|45'),
      R('M', null, null, null, { fin: FIN.glute })
    ] };

  D.F_PPB = { short: 'PUSH PULL + BRAZOS', label: 'Push, Pull y Brazos', title: 'Push, Pull y Brazos · Torso Completo', wu: 'upper', chips: ['💪 Torso', '🎯 Empuje + tracción + brazos', '🔥 Cierre metabólico'],
    foco: 'Sesión de torso completo y equilibrado: el jalón al pecho abre el día y después vienen el press inclinado junto al remo apoyado (empuje y tracción en el mismo banco), el press de hombros junto al cruce de poleas, el deltoide lateral junto al posterior y un biset de brazos con curl inclinado y extensión sobre la cabeza. El hollow body cierra el core. Priorizá la espalda: es el contrapeso del trabajo de pierna y lo que más cambia la postura.',
    filas: [
      R('F', 'Jalón al pecho con agarre ancho', '4x8-12|1|120', null, { n: 'Pecho hacia la barra y escápulas hacia abajo antes de tirar. Los codos van hacia las costillas. Es el ejercicio principal del día: cargalo en serio.' }),
      R('B', ['Press inclinado con mancuernas', 'Remo apoyado en banco inclinado'], '3x8-12/10-12|1|90', null, { tp: ['3110', ''], n: 'Empuje y tracción en el mismo banco inclinado: press con mancuernas y, dando vuelta el cuerpo, remo con el pecho apoyado.' }),
      R('B', ['Press de hombros sentado', 'Cruce de cables en polea alta'], '3/2x10-12/12-15|1|75', null, { tp: ['', '3011'], n: 'Press de hombros con mancuernas al lado de la polea y cruce con el pecho estirado al abrir. En la ronda que sobra hacés solo el press.' }),
      R('B', ['Elevaciones laterales con mancuernas', 'Pájaro / Elevaciones posteriores inclinado'], '3x12-15/15|1|60', null, { n: 'Lateral y posterior seguidos, con cargas livianas y rango completo, para que el deltoide quede redondo desde todos los ángulos.' }),
      R('B', ['Curl de bíceps en banco inclinado con mancuernas', 'Extensión tríceps tras nuca a 2 manos'], '4x10-12/10-12|1|75', null, { n: 'Biset de brazos: bíceps y tríceps antagonistas sin pausa, los dos con el músculo estirado.' }),
      R('C', 'Hollow body', '2x30s|1|45'),
      R('M', null, null, null, { fin: FIN.torso })
    ] };

  D.F_PB = { short: 'PIERNA B', label: 'Pierna B', title: 'Pierna B · Glúteos e Isquiotibiales + Refuerzo de Torso', wu: 'glute', chips: ['🦵 Pierna B', '🎯 Glúteo + isquios', '💪 Refuerzo de torso'],
    foco: 'Pierna B del Constructor de Glúteos, con énfasis en glúteos e isquiotibiales: el peso muerto rumano con déficit abre el día con la cadena posterior en su máximo estiramiento. Después vienen el hip thrust con pausa junto al puente a una pierna, el curl femoral junto al gemelo a una pierna y dos bisets de refuerzo de torso: el jalón con agarre estrecho junto a las laterales, y la patada en polea cruzada junto al pájaro. Así la espalda y el hombro tienen su segunda exposición semanal sin sumar fatiga de pierna. Cuidá la espalda neutra en cada repetición del rumano: es mejor una repetición menos que una espalda redondeada.',
    filas: [
      R('F', 'Peso muerto rumano con déficit', '4x6-8|1|150', null, { tp: ['3210'], n: 'Parada sobre un disco de 3 a 5 cm: cadera atrás, rodillas apenas flexionadas y la barra pegada a las piernas. Pausa de 2 segundos abajo y subí sin perder la espalda neutra.' }),
      R('B', ['Hip thrust con barra', 'Puente de glúteo a una pierna'], '4/2x8-10/12|1|90', null, { tp: ['2012', ''], n: 'Pausa de 2 segundos arriba en el hip thrust; el puente a una pierna va en el piso, al lado del banco. Llegás con la cadena posterior activada por el rumano: ajustá la carga si el glúteo llega cansado.' }),
      R('B', ['Curl femoral acostado', 'Elevación de talones a una pierna'], '3x10-12/12-15|1|75', null, { tp: ['3110', '2211'], n: 'Isquios en flexión de rodilla y gemelo a una pierna sobre un escalón al lado de la máquina, con pausa abajo.' }),
      R('B', ['Jalón al pecho con agarre estrecho', 'Elevaciones laterales con mancuernas'], '3x10-12/12-15|1|75', null, { n: 'Refuerzo de torso: jalón con los codos hacia las costillas y laterales livianas al lado de la máquina. Estímulo de calidad con poca fatiga.' }),
      R('B', ['Patada de glúteo en polea cruzada', 'Pájaro / Elevaciones posteriores inclinado'], '3x12-15/15|1|60', null, { tp: ['3011', ''], n: 'Patada en la polea cruzando el cuerpo y pájaro con mancuernas livianas al lado: glúteo acortado y deltoide posterior para cerrar.' }),
      R('C', 'Elevación de piernas en banco', '2x10-12|1|45'),
      R('M', null, null, null, { fin: FIN.gluteB })
    ] };

  PB.ESTR.push(
    { g: 'f', f: 3, est: 'Pierna A · Push, Pull y Brazos · Pierna B', dias: ['F_PA', 'F_PPB', 'F_PB'], res: 'Split de tres días con prioridad en tren inferior (Constructor de Glúteos): Pierna A (glúteos y cuádriceps + core), Push, Pull y Brazos (torso completo y equilibrado) y Pierna B (glúteos e isquiotibiales + refuerzo de torso). Glúteo y pierna dos veces por semana, con la sesión de torso en el medio para recuperar. Hipertrofia por estiramiento (peso muerto rumano con déficit, búlgara con el torso inclinado), hip thrust pesado con pausa y patada en polea cruzada, con apoyos estables y poca fatiga axial. Todas con entrada en calor específica, un básico pesado, compuestos de hipertrofia, cierre de congestión, core y finisher metabólico. Volumen semanal en series efectivas (intermedio): glúteo 21 (es el grupo con más volumen), cuádriceps 7, isquiotibiales 7, gemelo 6 y, en el torso, espalda 10, hombro lateral 6, hombro posterior 6, pecho 5, bíceps y tríceps 4 cada uno y core 6.' },
    { g: 'f', f: 4, est: 'Glúteo · Torso · Pierna · Glúteo y Hombros', dias: ['F_GLU_A', 'F_UP', 'F_QUAD', 'F_GLU_SH'], res: 'Glúteo en frecuencia 2 (la segunda sesión a baja demanda, junto a los hombros), torso integral y una sesión de rodilla dominante con máquinas estables: la mayor parte del volumen va a tren inferior sin descuidar el desarrollo general. Volumen semanal en series efectivas (intermedio): glúteo 24 (con la segunda exposición a baja demanda), cuádriceps 10, isquiotibiales 6, gemelo 6, espalda 8, hombro lateral 8, hombro posterior 6, pecho 6, bíceps y tríceps 4 cada uno y core 8.' },
    { g: 'f', f: 5, est: 'Glúteo · Push · Pierna · Pull · Glúteo y Armonía', dias: ['F_GLU_A', 'F_PUSH', 'F_QUAD', 'F_PULL', 'F_GLU_B'], res: 'Glúteo y pierna en frecuencia 2-3 con Push y Pull dedicados: cadera pesada, empuje (hombro y pecho), cuádriceps y gemelo, tracción y una segunda sesión de glúteo con hombro y brazos. Cinco sesiones completas con bisets en estaciones vecinas y un ejercicio de core por día que va rotando: se entrena fuerte y se descansa en serio. Volumen semanal en series efectivas (intermedio): glúteo 23 (el grupo con más volumen), cuádriceps 10, isquiotibiales 9, gemelo 6, espalda 10, hombro lateral 6, hombro posterior 6, pecho 3, bíceps y tríceps 8 cada uno y core 10.' }
  );
})();
