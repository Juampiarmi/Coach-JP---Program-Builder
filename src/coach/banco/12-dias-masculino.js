/* =========================================================
   PLANTILLAS BASE COACH JP · sesiones masculinas (Bodybuilding)
   Cada sesión tiene SIEMPRE esta estructura (mismos roles que el motor 10-motor-textos.js):
     entrada en calor (10 min) · F ejercicio principal de fuerza · H compuestos de hipertrofia · A aislamientos · B / T biset o triset de cierre · C core · M finisher metabólico (o K cardio).
   Dosis de cada fila: "SxR|RIR|Rest|tec" (en bisets/trisets "SxR1/R2|RIR|Rest|tec"). i = intermedio, a = avanzado. soloI / soloA: la fila existe solo en ese nivel.
   ========================================================= */
(function(){
  'use strict';
  var PB = window.__jpPB; if(!PB) return;
  var R = PB.R, D = PB.D, FIN = PB.FIN;

  D.M_PUSH = { short: 'PUSH', label: 'Push', title: 'Push · Pecho, Hombros y Tríceps', wu: 'push', chips: ['💪 Empuje', '🎯 Pecho + hombro + tríceps', '🔥 Cierre metabólico'],
    foco: 'Día de empuje con el press de banca como ancla: carga alta, técnica estricta y descanso completo. Después vienen tres bisets en estaciones vecinas: el press inclinado con mancuernas junto a la elevación lateral en polea (pecho superior y deltoide lateral), el press de hombros sentado junto a la extensión de tríceps sobre la cabeza (la porción larga estirada) y un cierre corto de aperturas en banco inclinado con patada de tríceps. Empujá cada serie efectiva cerca del fallo técnico, sin llegar al fallo y sin regalar rango por mover más peso.',
    filas: [
      R('F', 'Press de banca plano con barra', '4x5-7|2|180', null, { n: 'Barra al pecho una fracción de segundo, sin rebote. Es el marcador de fuerza de empuje de tu semana: anotá los kilos y superá lo de la semana anterior aunque sea por una repetición.' }),
      R('B', ['Press inclinado con mancuernas', 'Elevaciones laterales en polea baja'], '3x8-10/12-15|1|90', null, { tp: ['3110', ''], n: 'Banco a 30° para el pecho superior y, en la polea de al lado, la elevación lateral de a un brazo: la polea mantiene la tensión desde abajo, donde la mancuerna no la da. Mientras uno trabaja, el otro descansa.' }),
      R('B', ['Press de hombros sentado', 'Extensión tríceps tras nuca a 2 manos'], '3x8-10/10-12|1|90', null, { n: 'Hombro y tríceps con mancuernas en el mismo banco: el press con la espalda apoyada y la extensión con el codo arriba de la cabeza, que estira la porción larga del tríceps.' }),
      R('B', ['Aperturas en banco inclinado', 'Patada de tríceps con mancuerna'], '2x12-15/12-15|1|60', null, { n: 'Cierre de congestión: aperturas con el pecho estirado abajo y patada con el codo fijo. Cargas livianas y rango completo.' }),
      R('C', 'Rueda abdominal', '2x8-10|1|45'),
      R('M', null, null, null, { fin: FIN.push })
    ] };

  D.M_PULL = { short: 'PULL', label: 'Pull', title: 'Pull · Espalda, Deltoide Posterior y Bíceps', wu: 'pull', chips: ['💪 Tracción', '🎯 Dorsal + espalda alta + bíceps', '🔥 Cierre metabólico'],
    foco: 'Día de tracción con el remo con el pecho apoyado como ancla: la espalda alta trabaja pesado sin que la zona lumbar limite. Después vienen el jalón al pecho junto al pájaro (ancho de espalda y deltoide posterior), el remo en polea baja junto al pull-over con mancuerna (el dorsal estirado con el brazo por encima de la cabeza) y un biset de bíceps con curl en banco inclinado y curl martillo. Tirá con los codos, no con las manos, y controlá la bajada de cada repetición: es en la bajada donde la espalda crece.',
    filas: [
      R('F', 'Remo Pecho Apoyado en banco inclinado', '4x6-8|2|150', null, { n: 'Pecho pegado al banco, codos hacia atrás y escápulas juntas medio segundo arriba. El apoyo te saca la espalda baja de la ecuación: toda la carga la lleva la espalda alta, y por eso podés empujar fuerte sin pagar fatiga de más.' }),
      R('B', ['Jalón al pecho con agarre ancho', 'Pájaro / Elevaciones posteriores inclinado'], '3/4x8-10/15|1|90', null, { n: 'Pecho hacia la barra y escápulas abajo antes de tirar; el pájaro con mancuernas livianas se hace al lado del jalón. En la ronda que sobra hacés solo el pájaro.' }),
      R('B', ['Remo en polea baja agarre en V', 'Pull-over con mancuerna'], '3/2x10-12/12-15|1|75', null, { tp: ['', '3011'], n: 'Remo horizontal y pull-over con mancuerna acostado en un banco: el pull-over lleva el dorsal a su posición más estirada con el brazo por encima de la cabeza.' }),
      R('B', ['Curl de bíceps en banco inclinado con mancuernas', 'Curl martillo'], '3x10-12/10-12|1|75', null, { n: 'Cierre de bíceps: el banco inclinado deja el brazo detrás del torso y trabaja el bíceps estirado, y el martillo busca el braquial. Sin pausa entre las dos.' }),
      R('C', 'Elevación de piernas colgado', '2x8-12|1|45'),
      R('M', null, null, null, { fin: FIN.pull })
    ] };

  D.M_LEGS = { short: 'PIERNA', label: 'Pierna Completa', title: 'Pierna Completa · Cuádriceps, Femorales, Gemelos y Core', wu: 'legs', chips: ['🦵 Pierna', '🎯 Sentadilla + cadena posterior', '🔥 Cierre metabólico'],
    foco: 'Día de pierna completa: la sentadilla con barra marca la carga de la semana y es el único patrón axial pesado del día. Después vienen la prensa junto al peso muerto rumano con mancuernas (bisagra sin carga sobre la columna, para no sumar fatiga axial), el curl femoral junto al gemelo a una pierna y un cierre de extensión de cuádriceps con elevaciones laterales, la segunda dosis semanal del deltoide lateral. El Pallof press cierra el core. Es el día más duro de la semana: dormí bien, comé antes de entrenar y respetá la profundidad asignada, porque la serie que no la alcanza no cuenta como efectiva.',
    filas: [
      R('F', 'Sentadilla con barra', '4x5-7|2|180', null, { n: 'La sentadilla marca el ritmo de toda la pierna y es el único ejercicio axial pesado del día. Profundidad pareja en todas las series y los talones clavados: si el talón se levanta, el rango se acortó.' }),
      R('B', ['Prensa 45°', 'Peso muerto rumano con mancuernas'], '3x10-12/10-12|1|120', null, { tp: ['3110', '3011'], n: 'Cuádriceps en la prensa y bisagra con mancuernas al lado: el rumano con mancuernas carga los isquios estirados sin cargar la columna, así la sentadilla sigue siendo el único ejercicio axial pesado del día.' }),
      R('B', ['Curl femoral acostado', 'Elevación de talones a una pierna'], '3/4x10-12/12-15|1|75', null, { tp: ['3110', '2211'], n: 'Isquios en flexión de rodilla y gemelo a una pierna sobre un escalón al lado de la máquina, con pausa de 1 segundo abajo, en el estiramiento. En la ronda que sobra hacés solo el gemelo.' }),
      R('B', ['Extensión de cuádriceps', 'Elevaciones laterales con mancuernas'], '2/3x12-15/12-15|1|60', null, { n: 'Cierre de cuádriceps con tensión constante y la segunda exposición semanal del deltoide lateral, que responde mejor a la frecuencia que al volumen concentrado en un solo día.' }),
      R('C', 'Pallof press', '2x10|1|45'),
      R('M', null, null, null, { fin: FIN.pierna })
    ] };

  D.M_UP_A = { short: 'TORSO A', label: 'Torso A', title: 'Torso A · Fuerza de Empuje y Tracción', wu: 'upper', chips: ['💪 Torso', '🎯 Fuerza', '🔥 Cierre metabólico'],
    foco: 'Sesión de fuerza de torso con doble ancla: el press de banca abre el día con el sistema nervioso fresco y el remo con el pecho apoyado va pesado junto a la elevación lateral con mancuernas, que se hace en la pausa del remo. Después, el press de hombros sentado junto al jalón al pecho (empuje y tracción verticales) y un biset de brazos con los dos músculos estirados: curl en banco inclinado y extensión de tríceps sobre la cabeza. Las series pesadas llevan descansos largos: es lo que te permite sostener la carga de la primera a la última serie.',
    filas: [
      R('F', 'Press de banca plano con barra', '4x5-7|2|180', null, { n: 'Barra al pecho una fracción de segundo, sin rebote y con las escápulas fijas en el banco. Anotá los kilos: es tu marcador de fuerza de empuje.' }),
      R('B', ['Remo Pecho Apoyado en banco inclinado', 'Elevaciones laterales con mancuernas'], '4/3x6-8/12-15|2/1|150', null, { n: 'Pecho apoyado y torso fijo: acá el dorsal manda y la espalda baja descansa. Las laterales son livianas y van en la pausa del remo, sin apurarlo. En la ronda que sobra hacés solo el remo.' }),
      R('B', ['Press de hombros sentado', 'Jalón al pecho con agarre ancho'], '3x6-8/8-10|2/1|120', null, { n: 'Empuje y tracción verticales: press con la espalda apoyada y jalón con el pecho hacia la barra. Mientras uno trabaja, el otro descansa.' }),
      R('B', ['Curl de bíceps en banco inclinado con mancuernas', 'Extensión tríceps tras nuca a 2 manos'], '3x8-10/10-12|1|75', null, { n: 'Biset de brazos con los dos músculos estirados: el curl con el codo detrás del torso y la extensión con el codo arriba de la cabeza. Antagonistas sin pausa.' }),
      R('C', 'Rueda abdominal', '2x8-10|1|45'),
      R('M', null, null, null, { fin: FIN.torso })
    ] };

  D.M_LO_A = { short: 'PIERNA A', label: 'Pierna A', title: 'Pierna A · Fuerza de Sentadilla', wu: 'legs', chips: ['🦵 Pierna', '🎯 Fuerza', '🔥 Cierre metabólico'],
    foco: 'Sesión de fuerza de pierna: la sentadilla con barra es el único patrón axial pesado del día. La cadena posterior entra con el peso muerto rumano con mancuernas (bisagra sin carga sobre la columna) junto al gemelo sentado, y la sentadilla búlgara corrige diferencias entre piernas junto al curl femoral sentado. El Pallof press cierra el core. La sentadilla va con tempo controlado y sin rebote abajo: la fuerza que construís acá es la que después sostiene el volumen del segundo día de pierna.',
    filas: [
      R('F', 'Sentadilla con barra', '4x5-7|2|180', null, { n: 'Único ejercicio axial pesado del día: profundidad pareja en todas las series y los talones clavados.' }),
      R('B', ['Peso muerto rumano con mancuernas', 'Elevación de talones sentado con mancuerna'], '3/4x8-10/12-15|2/1|120', null, { tp: ['3110', '2211'], n: 'Bisagra con mancuernas: cadera atrás y pausa corta abajo, sin cargar la columna como el rumano con barra. El gemelo sentado, con la mancuerna sobre la rodilla, va en el mismo banco. En la ronda que sobra hacés solo el gemelo.' }),
      R('B', ['Bulgarian split squat', 'Curl femoral sentado'], '3/2x8-10/10-12|1|90', null, { tp: ['3110', ''], n: 'Arrancá la búlgara por la pierna más débil y repetí con la otra el mismo número de repeticiones; el curl sentado va en la máquina de al lado.' }),
      R('C', 'Pallof press', '2x10|1|45'),
      R('M', null, null, null, { fin: FIN.pierna })
    ] };

  D.M_UP_B = { short: 'TORSO B', label: 'Torso B', title: 'Torso B · Hipertrofia de Pecho, Espalda y Hombros', wu: 'upper', chips: ['💪 Torso', '🎯 Hipertrofia', '🔥 Cierre metabólico'],
    foco: 'Sesión de volumen de torso: el press inclinado con mancuernas es el ancla y después vienen el remo apoyado junto a las aperturas en banco inclinado (espalda media y pecho estirado), el jalón con agarre estrecho junto al curl martillo, la elevación lateral en polea junto al pájaro (deltoide lateral y posterior) y un cierre de tríceps con la extensión en polea alta y flexiones diamante. Acá se busca la sensación muscular: controlá la bajada, no regales rango y metele intención a cada repetición.',
    filas: [
      R('F', 'Press inclinado con mancuernas', '4x6-8|2|150', null, { tp: ['3110'], n: 'Aunque sea el día de hipertrofia, el primer ejercicio se entrena como un básico: carga alta, repeticiones controladas y el pecho estirado abajo.' }),
      R('B', ['Remo apoyado en banco inclinado', 'Aperturas en banco inclinado'], '3/2x8-12/12-15|1|90', null, { n: 'Remo con el pecho apoyado en el banco y, en el mismo banco, aperturas con el pecho estirado abajo. En la ronda que sobra hacés solo el remo.' }),
      R('B', ['Jalón al pecho con agarre estrecho', 'Curl martillo'], '3x10-12/10-12|1|75', null, { n: 'Espalda y brazo: jalón con los codos hacia las costillas y martillo con las mancuernas al lado de la máquina.' }),
      R('B', ['Elevaciones laterales en polea baja', 'Pájaro / Elevaciones posteriores inclinado'], '4x12-15/15|1|60', null, { n: 'Lateral en polea de a un brazo (la cifra es por lado) y pájaro con mancuernas livianas al lado: el deltoide queda redondo desde todos los ángulos.' }),
      R('B', ['Extensión tríceps polea alta con cuerda', 'Flexiones diamante'], '3x12-15/8-12|1|60', null, { n: 'Cierre de tríceps: la extensión en polea alta con apertura de la cuerda al final y las flexiones diamante para terminar de vaciarlo. Si no salen, apoyá las rodillas.' }),
      R('C', 'Crunch abdominal', '2x12-15|1|45'),
      R('M', null, null, null, { fin: FIN.torso })
    ] };

  D.M_UP_C = { short: 'TORSO C', label: 'Torso C', title: 'Torso C · Refuerzo de Hombro y Brazos', wu: 'upper', chips: ['💪 Torso', '🎯 Refuerzo', '🫀 Cardio zona 2'],
    foco: 'Sesión corta de refuerzo para llegar a frecuencia 2 por grupo sin duplicar el volumen del push y el pull: el press de hombros sentado es el ancla, después un biset de press plano y remo a una mano con mancuernas en el mismo banco, el deltoide lateral y el posterior seguidos y un cierre de brazos con curl martillo y extensión de tríceps en polea alta. Acá no se busca el máximo sino estímulo con poca fatiga, para llegar fresco a la pierna de mañana: por eso cerrás con cardio suave en Zona 2 en lugar de un finisher fuerte.',
    filas: [
      R('F', 'Press de hombros sentado', '3x8-10|2|120', null, { n: 'Es el ejercicio principal de una sesión corta: pesado pero fresco, sin llegar al límite. Espalda apoyada y la mancuerna baja hasta la altura de la oreja.' }),
      R('B', ['Press plano con mancuernas', 'Remo unilateral a una mano'], '2x8-10/10-12|1|90', null, { n: 'Empuje y tracción con mancuernas en el mismo banco: una dosis de refuerzo para pecho y espalda, sin buscar el máximo.' }),
      R('B', ['Elevaciones laterales con mancuernas', 'Pájaro / Elevaciones posteriores inclinado'], '3x12-15/15|1|60', null, { n: 'Lateral y posterior seguidos, con mancuernas livianas, para que el deltoide quede redondo desde todos los ángulos.' }),
      R('B', ['Curl martillo', 'Extensión tríceps polea alta con cuerda'], '3x10-12/12-15|1|60', null, { n: 'Brazos en antagonistas: el martillo trabaja el braquial y la extensión en polea alta termina el tríceps. Mientras uno trabaja, el otro descansa.' }),
      R('C', 'Plancha lateral', '2x30s|1|45'),
      R('K', null, null, null, { fin: FIN.zona2 })
    ] };

  D.M_LO_B = { short: 'PIERNA B', label: 'Pierna B', title: 'Pierna B · Cadena Posterior y Volumen', wu: 'legs', chips: ['🦵 Pierna', '🎯 Cadena posterior', '🔥 Cierre metabólico'],
    foco: 'Sesión de cadena posterior y volumen: el peso muerto con trap bar abre el día con una bisagra pesada y segura (la barra hexagonal no carga la columna como el rumano con barra), el hip thrust con pausa va junto al gemelo a una pierna y el hack squat junto al puente de glúteo a una pierna suma cuádriceps con el torso apoyado. Es el complemento del día de sentadilla: acá se acumula volumen con menos fatiga lumbar.',
    filas: [
      R('F', 'Peso muerto con trap bar', '4x5-6|2|180', null, { n: 'Empujá el piso con las piernas antes de mover la barra y terminá con el glúteo, sin hiperextender la espalda. Si la barra se separa del cuerpo, bajá el peso.' }),
      R('B', ['Hip thrust con barra', 'Elevación de talones a una pierna'], '3x8-10/12-15|1|90', null, { tp: ['2012', '2211'], n: 'Pausa de 2 segundos arriba en el hip thrust; el gemelo a una pierna va sobre un escalón al lado del banco, con pausa abajo.' }),
      R('B', ['Hack squat', 'Puente de glúteo a una pierna'], '3/2x8-12/12|1|90', null, { tp: ['3110', ''], n: 'Cuádriceps con el torso apoyado en el hack y puente a una pierna en el piso, al lado de la máquina. En la ronda que sobra hacés solo el hack.' }),
      R('C', 'Elevación de piernas colgado', '2x8-12|1|45'),
      R('M', null, null, null, { fin: FIN.pierna })
    ] };

  D.M_LO_C = { short: 'PIERNA B', label: 'Pierna B', title: 'Pierna B · Bisagra, Glúteo y Gemelo', wu: 'legs', chips: ['🦵 Pierna', '🎯 Trap bar + hip thrust', '🔥 Cierre metabólico'],
    foco: 'Segunda pierna de la semana y complemento del día de sentadilla: el peso muerto con trap bar abre con una bisagra pesada y segura (la barra hexagonal deja el peso al costado del cuerpo y no carga la columna como el rumano con barra), el hip thrust con pausa va junto al gemelo sentado con mancuerna y el hack squat junto al puente de glúteo a una pierna suma cuádriceps con el torso apoyado. Volumen contenido: isquios y cuádriceps ya recibieron su dosis grande en la primera pierna.',
    filas: [
      R('F', 'Peso muerto con trap bar', '4x5-6|2|180', null, { n: 'Empujá el piso con las piernas antes de mover la barra y terminá con el glúteo, sin hiperextender la espalda. Si la barra se separa del cuerpo, bajá el peso.' }),
      R('B', ['Hip thrust con barra', 'Elevación de talones sentado con mancuerna'], '3x8-10/12-15|1|90', null, { tp: ['2012', '2211'], n: 'Pausa de 2 segundos arriba en el hip thrust con el glúteo apretado; el gemelo sentado, con la mancuerna sobre la rodilla, se hace en el mismo banco.' }),
      R('B', ['Hack squat', 'Puente de glúteo a una pierna'], '3/2x10-12/12|1|90', null, { tp: ['3110', ''], n: 'Cuádriceps con el torso apoyado en el hack y puente a una pierna en el piso, al lado de la máquina. En la ronda que sobra hacés solo el hack.' }),
      R('C', 'Crunch en polea alta', '2x12-15|1|45'),
      R('M', null, null, null, { fin: FIN.pierna })
    ] };

  /* ---------- matriz masculina: frecuencia -> sesiones ---------- */
  PB.ESTR.push(
    { g: 'm', f: 3, est: 'Push / Pull / Pierna completa', dias: ['M_PUSH', 'M_PULL', 'M_LEGS'], res: 'Split analítico de tres días: Push (pecho, hombros y tríceps), Pull (espalda, deltoide posterior y bíceps) y Pierna completa (cuádriceps, femorales, gemelos y core). Cada grupo se entrena una vez por semana con volumen alto y cerca del fallo técnico, sin llegar al fallo: RIR 1-2 en los básicos y RIR 1 en los aislamientos. Todas las sesiones llevan entrada en calor específica de 7 minutos, un básico pesado en series rectas, bisets de hipertrofia en estaciones vecinas, un ejercicio de core que cambia cada día y finisher metabólico, con una sola exposición axial pesada por día. Volumen semanal en series efectivas: pecho 9, espalda 12, cuádriceps 9, isquiotibiales 6, hombro lateral 6, hombro posterior 4, bíceps 6, tríceps 5, gemelo 4 y core 6.' },
    { g: 'm', f: 4, est: 'Torso / Pierna x2', dias: ['M_UP_A', 'M_LO_A', 'M_UP_B', 'M_LO_B'], res: 'Torso / Pierna dos veces por semana: dos sesiones de fuerza (torso A y pierna A) y dos de hipertrofia (torso B y pierna B), con cada grupo en frecuencia 2 y una sola exposición axial pesada por día (la sentadilla con barra en la pierna A; la pierna B abre con trap bar). Todas las sesiones llevan bisets en estaciones vecinas, un ejercicio de core que cambia cada día y finisher metabólico. Volumen semanal en series efectivas: pecho 10, espalda 13, cuádriceps 10, isquiotibiales 9, hombro lateral 7, hombro posterior 4, bíceps 6, tríceps 9, gemelo 7, glúteo 5 y core 8.' },
    { g: 'm', f: 5, est: 'Push / Pull / Legs + Torso / Pierna', dias: ['M_PUSH', 'M_PULL', 'M_LEGS', 'M_UP_C', 'M_LO_C'], res: 'Push / Pull / Legs más dos sesiones de refuerzo (torso y una segunda pierna de bisagra y glúteo) para llegar a frecuencia 2 por grupo sin pasarse de volumen: las sesiones de refuerzo son cortas y el volumen semanal de cada grupo queda dentro de su rango. Core de un ejercicio por día que va rotando y una sola exposición axial pesada por día. Volumen semanal en series efectivas: pecho 11, espalda 14, cuádriceps 12, isquiotibiales 10, hombro lateral 9, hombro posterior 7, bíceps 9, tríceps 8, gemelo 7, glúteo 5 y core 10.' }
  );
})();
