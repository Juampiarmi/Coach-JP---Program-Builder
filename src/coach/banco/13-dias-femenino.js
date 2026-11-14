/* =========================================================
   PLANTILLAS BASE COACH JP · sesiones femeninas (Bodybuilding)
   Misma estructura que 12-dias-masculino.js: entrada en calor · F principal · H compuestos · A aislamientos · B/T cierre · C core · M finisher (o K cardio).
   ========================================================= */
(function(){
  'use strict';
  var PB = window.__jpPB; if(!PB) return;
  var R = PB.R, D = PB.D, FIN = PB.FIN;

  D.F_GLU_A = { short: 'GLÚTEO A', label: 'Cadera y Glúteo', title: 'Cadera y Glúteo · Hip Thrust Pesado', wu: 'glute', chips: ['🍑 Glúteo', '🎯 Hip thrust pesado', '🔥 Cierre metabólico'],
    foco: 'Día madre de glúteo: el hip thrust con pausa de 1 segundo arriba es el ejercicio de carga de la semana, el peso muerto rumano estira isquios y glúteo y la sentadilla búlgara corrige diferencias entre piernas. La abducción y la patada cierran con congestión para el glúteo medio. La pausa arriba es innegociable: sin ella el ejercicio se vuelve un rebote lumbar. Es una sesión pesada y larga: cargá con ganas.',
    filas: [
      R('F', 'Hip thrust con barra', '4x6-8|2|150', '5x6-8|1|180', { n: 'Espalda alta apoyada, mentón al pecho y pausa de un segundo arriba con el glúteo apretado y las costillas abajo. Es el ejercicio donde más se nota si progresaste: anotá los kilos.' }),
      R('H', 'Peso muerto rumano', '3x8-10|2|120', '4x6-8|1|150'),
      R('H', 'Bulgarian split squat', '3x8-10|1|90', '4x8-10|0-1|90', { n: 'Arrancá siempre por la pierna más débil. Torso levemente inclinado hacia adelante para cargar más el glúteo y menos el cuádriceps.' }),
      R('A', 'Patada de glúteo en polea', '3x12-15|1|60', '4x12-15|0|45|drop'),
      R('A', 'Curl femoral tumbado', '3x10-12|1|75', '4x10-12|0|60'),
      R('A', 'Abducción de cadera en máquina', '3x15-20|1|45', '4x15-20|0|45|drop'),
      R('B', ['Abducción con banda (monster walk)', 'Puente de glúteo con banda'], '3x12 por lado/15|1|45', null, { soloI: true, n: 'Cierre de glúteo medio: la abducción con banda empuja las rodillas hacia afuera y el puente con banda termina de congestionar. Sin pausa entre las dos.' }),
      R('T', ['Abducción con banda (monster walk)', 'Patada de glúteo con banda', 'Puente de glúteo con banda'], null, '3x12 por lado/12 por lado/20|0|45|drop', { soloA: true, n: 'Triset de glúteo: tres estaciones seguidas con la banda y la máquina. La congestión es el objetivo: si el glúteo no arde, faltó intención.' }),
      R('C', ['Dead bug', 'Plancha lateral'], '3x8 por lado/30s|1|45', '3x10 por lado/40s|0|45'),
      R('M', null, null, null, { fin: FIN.glute })
    ] };

  D.F_QUAD = { short: 'PIERNA', label: 'Cuádriceps', title: 'Cuádriceps · Rodilla Dominante', wu: 'legs', chips: ['🦵 Pierna', '🎯 Sentadilla + prensa', '🔥 Cierre metabólico'],
    foco: 'Día de rodilla dominante: sentadilla como ancla, prensa y hack squat para el volumen de cuádriceps y glúteo en rangos profundos, y aislamientos de cuádriceps, isquio, gemelo y aductores. Pies a la altura media de la plataforma para repartir el trabajo entre cuádriceps y glúteo. Es la sesión con más volumen de pierna de la semana: llegá con hidratos comidos y con ganas.',
    filas: [
      R('F', 'Sentadilla con barra', '4x6-8|2|150', '5x5-7|1|210', { n: 'Profundidad pareja en todas las series y los talones clavados en el piso. La sentadilla es el ejercicio que más sistema nervioso consume: por eso va primera.' }),
      R('H', 'Prensa 45°', '4x10-12|1|120', '4x10-12|0-1|120'),
      R('H', 'Hack squat', '3x8-12|1|120', '4x8-10|0-1|120'),
      R('A', 'Extensión de cuádriceps', '3x12-15|1|60', '4x12-15|0|60|drop'),
      R('A', 'Curl femoral sentado', '3x10-12|1|75', '4x10-12|0|75|drop'),
      R('A', 'Elevación de gemelos de pie', '4x10-15|1|60', '5x10-15|0|60'),
      R('A', 'Aducción en máquina', '3x12-15|1|60', '4x15|0|45'),
      R('B', ['Step up al cajón', 'Elevación de talones a una pierna'], '3x10 por lado/12|1|60', '4x10 por lado/12|0|60', { n: 'Cierre de pierna y gemelo: el step up trabaja cuádriceps y glúteo y el talón a una pierna completa la pantorrilla, sin pausa entre las dos.' }),
      R('C', ['Dead bug', 'Plancha lateral'], '3x8 por lado/30s|1|45', '3x10 por lado/40s|0|45'),
      R('M', null, null, null, { fin: FIN.sledBike })
    ] };

  D.F_GLU_B = { short: 'GLÚTEO B', label: 'Glúteo y Armonía', title: 'Glúteo y Armonía · Volumen, Espalda y Brazos', wu: 'glute', chips: ['🍑 Glúteo', '🎯 Volumen + espalda + brazos', '🔥 Cierre metabólico'],
    foco: 'Segunda sesión de glúteo de la semana, pensada para volumen: unilaterales, abducción y patadas con tensión constante, una tracción vertical y un deltoide lateral que le dan una segunda exposición semanal a la espalda y al hombro, y un biset de brazos para el equilibrio estético. Acá no se busca la carga máxima sino la conexión con el glúteo en cada repetición. Es el día del bombeo.',
    filas: [
      R('F', 'Hip thrust a una pierna', '3x10 por lado|1|90', '4x8-10 por lado|0-1|90', { n: 'Una pierna por vez, pelvis cuadrada y pausa arriba. Arrancá por la pierna más débil y que la otra copie el mismo número de repeticiones.' }),
      R('H', 'Step up al cajón', '3x10 por lado|1|90', '3x10 por lado|0-1|90'),
      R('H', 'Jalón al pecho con agarre estrecho', '3x10-12|1|90', '4x10-12|0-1|90'),
      R('A', 'Abducción sentado en máquina', '4x15-20|1|45', '4x15-20|0|45|drop'),
      R('A', 'Patada de glúteo en máquina', '3x12-15|1|60', '3x12-15|0|45|drop'),
      R('A', 'Elevaciones laterales con mancuernas', '3x12-15|1|45', '4x15-20|0|45'),
      R('B', ['Curl martillo', 'Patada de tríceps con mancuerna'], '3x10-12/12-15|1|75', '3x10-12/12-15|0|75|drop'),
      R('C', ['Elevación de piernas colgado', 'Plancha lateral'], '3x8/30s|1|45', '3x10/40s|0|45'),
      R('M', null, null, null, { fin: FIN.glute })
    ] };

  D.F_GLU_SH = { short: 'GLÚTEO + HOMBRO', label: 'Glúteo y Hombros', title: 'Glúteo y Hombros · Frecuencia y Estética', wu: 'glute', chips: ['🍑 Glúteo', '🎯 Hombros', '🔥 Cierre metabólico'],
    foco: 'Tercera exposición semanal del glúteo con hip thrust en rango medio y un unilateral, más un bloque de hombros (press, laterales y posteriores) para sumar anchura y proporción. Los hombros llegan frescos porque el trabajo de pierna es de baja demanda sistémica. Sesión de volumen y estética: buscá la conexión con cada músculo.',
    filas: [
      R('F', 'Hip thrust con barra', '3x8-10|2|120', '4x6-8|1|150', { n: 'Rango medio y pausa arriba. Esta tercera exposición semanal del glúteo se hace con carga seria pero sin llegar al límite: tenés que llegar fresca a los hombros.' }),
      R('H', 'Zancada inversa', '3x10 por lado|1|90', '3x10 por lado|0-1|90'),
      R('H', 'Press de hombros sentado', '3x8-12|1|90', '4x8-10|0-1|90'),
      R('A', 'Patada de glúteo en polea', '3x12-15|1|60', '3x12-15|0|45|drop'),
      R('A', 'Elevaciones laterales en polea baja', '4x12-15|1|45', '4x15-20|0|45|drop'),
      R('A', 'Pájaro / Elevaciones posteriores inclinado', '3x15|1|45', '4x15-20|0|45|drop'),
      R('B', ['Abducción con banda (monster walk)', 'Puente de glúteo con banda'], '3x12 por lado/15|1|45', '3x12 por lado/20|0|45|drop'),
      R('C', ['Dead bug', 'Plancha lateral'], '3x8 por lado/30s|1|45', '3x10 por lado/40s|0|45'),
      R('M', null, null, null, { fin: FIN.glute })
    ] };

  D.F_UP = { short: 'TORSO', label: 'Torso y Core', title: 'Torso y Core · Espalda, Pecho y Hombros', wu: 'upper', chips: ['💪 Torso', '🎯 Espalda + pecho + hombro', '🔥 Cierre metabólico'],
    foco: 'Sesión de torso integral: espalda con tracción vertical y horizontal, pecho en dos ángulos (press inclinado y cruce de cables), un press de hombro y un biset de deltoide lateral y posterior para la postura y la proporción. Un biset de brazos y el core cierran el día. Priorizá la espalda: es el contrapeso del trabajo de pierna y lo que más cambia la silueta.',
    filas: [
      R('F', 'Jalón al pecho con agarre ancho', '4x8-12|1|120', '4x6-8|1|150', { ea: 'Dominadas lastradas', n: 'Pecho hacia la barra y escápulas hacia abajo antes de tirar. Los codos van a las costillas. Es el ejercicio principal del día: cargalo en serio.' }),
      R('H', 'Press inclinado con mancuernas', '4x8-12|1|120', '4x8-10|1|120'),
      R('H', 'Remo apoyado en banco inclinado', '4x10-12|1|90', '4x10-12|0-1|90'),
      R('H', 'Press de hombros sentado', '3x10-12|1|90', '3x10-12|0-1|90'),
      R('A', 'Cruce de cables en polea alta', '3x12-15|1|60', '4x12-15|0|60'),
      R('B', ['Elevaciones laterales con mancuernas', 'Pájaro / Elevaciones posteriores inclinado'], '4x12-15/15|1|45', null, { soloI: true }),
      R('T', ['Elevaciones laterales con mancuernas', 'Pájaro / Elevaciones posteriores inclinado', 'Elevaciones W con mancuernas'], null, '4x15-20/15-20/12-15|0|45|drop', { soloA: true }),
      R('B', ['Curl martillo', 'Patada de tríceps con mancuerna'], '3x10-12/12-15|1|75', '3x10-12/12-15|0|75|drop'),
      R('C', ['Dead bug', 'Plancha lateral'], '3x8 por lado/30s|1|45', '3x10 por lado/40s|0|45'),
      R('M', null, null, null, { fin: FIN.push })
    ] };

  D.F_PUSH = { short: 'PUSH', label: 'Hombro y Pecho', title: 'Push · Hombro, Pecho y Tríceps', wu: 'push', chips: ['💪 Empuje', '🎯 Hombro + pecho', '🔥 Cierre metabólico'],
    foco: 'Día de empuje con el hombro como prioridad: press militar como ancla, press inclinado para el pecho superior y aislamientos de deltoide lateral y tríceps. Es una sesión corta y densa que no compite con las de pierna, pero igual se entrena con todo: la estética del hombro se construye con volumen y frecuencia.',
    filas: [
      R('F', 'Press militar sentado', '4x6-8|2|150', '5x5-6|1|180', { n: 'Glúteos y abdomen apretados, costillas abajo y la barra sube en línea recta. Si arqueás la espalda baja para ayudarte, bajá la carga.' }),
      R('H', 'Press inclinado con mancuernas', '3x8-12|1|120', '4x8-10|0-1|120'),
      R('H', 'Press plano con mancuernas', '3x8-12|1|90', '3x8-10|0-1|90'),
      R('A', 'Cruce de cables en polea alta', '3x12-15|1|60', '4x12-15|0|60|drop'),
      R('A', 'Elevaciones laterales en polea baja', '4x12-15|1|45', '4x15-20|0|45|drop'),
      R('B', ['Press francés con mancuernas plano', 'Patada de tríceps con mancuerna'], '3x10-12/12-15|1|75', '3x10-12/12-15|0|75|drop'),
      R('C', ['Rueda abdominal', 'Plancha lateral'], '3x8/30s|1|45', '3x10/40s|0|45'),
      R('M', null, null, null, { fin: FIN.push })
    ] };

  D.F_PULL = { short: 'PULL', label: 'Espalda y Bíceps', title: 'Pull · Espalda, Deltoide Posterior y Bíceps', wu: 'pull', chips: ['💪 Tracción', '🎯 Dorsal + postura', '🔥 Cierre metabólico'],
    foco: 'Día de tracción: remo pesado, tracción vertical y horizontal para el dorsal, y trabajo de deltoide posterior y face pull para la postura. El bíceps entra al final con un biset sin pausa. Tirá con los codos y apretá las escápulas medio segundo en cada repetición: es lo que separa una espalda trabajada de una espalda "mirada".',
    filas: [
      R('F', 'Remo con barra inclinado', '4x6-8|2|150', '5x5-7|1|180', { n: 'Torso firme a 45 grados, abdomen duro y la barra sube al ombligo. Si el torso se levanta para ayudar, bajá el peso.' }),
      R('H', 'Jalón al pecho con agarre ancho', '3x8-12|1|120', '4x6-8|1|150', { ea: 'Dominadas lastradas' }),
      R('H', 'Remo en polea baja agarre en V', '3x10-12|1|90', '4x10-12|0-1|90'),
      R('A', 'Pájaro / Elevaciones posteriores inclinado', '3x15|1|45', '4x15-20|0|45|drop'),
      R('A', 'Face Pull con cuerda', '3x15|1|45', '4x15-20|0|45'),
      R('B', ['Curl de bíceps con mancuernas', 'Curl martillo'], '3x10-12/10-12|1|75', '3x10-12/10-12|0|75|drop'),
      R('C', ['Dead bug', 'Plancha lateral'], '3x8 por lado/30s|1|45', '3x10 por lado/40s|0|45'),
      R('M', null, null, null, { fin: FIN.pull })
    ] };

  D.F_PIE = { short: 'PIERNA', label: 'Pierna Completa', title: 'Pierna Completa · Glúteo Medio y Cuádriceps', wu: 'legs', chips: ['🦵 Pierna', '🎯 Armonía de pierna', '🔥 Cierre metabólico'],
    foco: 'Sesión de pierna completa: sentadilla como ancla, peso muerto rumano para la cadena posterior y zancadas para el trabajo unilateral. Cuádriceps, isquios y gemelo cierran con aislamiento, y un biset de abductores y aductores termina de armar la pierna. Pierna armónica: ningún grupo se descuida.',
    filas: [
      R('F', 'Sentadilla con barra', '4x6-8|2|150', '5x5-7|1|210'),
      R('H', 'Peso muerto rumano', '3x8-10|2|120', '4x6-8|1|150'),
      R('H', 'Zancadas caminando', '3x10 por lado|1|90', '4x10 por lado|0-1|90'),
      R('A', 'Extensión de cuádriceps', '3x12-15|1|60', '4x12-15|0|60|drop'),
      R('A', 'Curl femoral tumbado', '3x10-12|1|75', '3x10-12|0|60'),
      R('A', 'Elevación de gemelos de pie', '4x10-15|1|60', '4x10-15|0|60'),
      R('B', ['Abducción de cadera en máquina', 'Aducción en máquina'], '3x15/15|1|45', '4x15-20/15|0|45|drop'),
      R('C', ['Dead bug', 'Plancha lateral'], '3x8 por lado/30s|1|45', '3x10 por lado/40s|0|45'),
      R('M', null, null, null, { fin: FIN.sledBike })
    ] };

  /* ---------- split femenino de 3 días: Pierna A / Push, Pull y Brazos / Pierna B ---------- */
  D.F_PA = { short: 'PIERNA A', label: 'Pierna A', title: 'Pierna A · Glúteos y Cuádriceps + Core', wu: 'legs', chips: ['🦵 Pierna A', '🎯 Glúteo + cuádriceps', '🔥 Cierre metabólico'],
    foco: 'Pierna A con énfasis estricto en glúteos y cuádriceps: la sentadilla marca la carga del día, la prensa y el hack squat suman volumen de rodilla dominante en rangos profundos, y el hip thrust con pausa arriba y la sentadilla búlgara llevan el glúteo a trabajar estirado y contraído. Extensión de cuádriceps y patada cierran con tensión constante, el biset de glúteo medio termina de congestionar, y el core termina la sesión. Es una sesión larga y pesada: llegá con hidratos comidos y buscá la conexión con el glúteo en cada repetición.',
    filas: [
      R('F', 'Sentadilla con barra', '4x6-8|2|150', '5x5-7|1|210', { n: 'Profundidad pareja en todas las series y los talones clavados en el piso. Pies a la altura de los hombros y rodillas siguiendo la línea de los pies: la sentadilla va primera porque es la que más sistema nervioso consume.' }),
      R('H', 'Prensa 45°', '4x10-12|1|120', '4x10-12|0-1|120', { n: 'Pies a media altura y apenas abiertos para repartir el trabajo entre cuádriceps y glúteo. Bajá hasta donde la pelvis no se despegue del respaldo: ese es tu rango útil.' }),
      R('H', 'Hip thrust con barra', '4x8-10|1|120', '5x8-10|0-1|120', { n: 'Espalda alta apoyada, mentón al pecho y pausa de un segundo arriba con el glúteo apretado. Es el ejercicio donde más se nota si progresaste: anotá los kilos.' }),
      R('H', 'Bulgarian split squat', '3x8-10|1|90', '4x8-10|0-1|90', { n: 'Arrancá siempre por la pierna más débil y repetí con la otra el mismo número de repeticiones. Torso levemente inclinado hacia adelante para cargar más el glúteo.' }),
      R('A', 'Extensión de cuádriceps', '3x12-15|1|60', '4x12-15|0|60|drop'),
      R('A', 'Patada de glúteo en polea', '3x12-15|1|60', '4x12-15|0|45|drop'),
      R('B', ['Abducción con banda (monster walk)', 'Puente de glúteo con banda'], '3x12 por lado/15|1|45', null, { soloI: true, n: 'Cierre de glúteo medio: la abducción con banda empuja las rodillas hacia afuera y el puente con banda termina de congestionar. Sin pausa entre las dos.' }),
      R('T', ['Abducción con banda (monster walk)', 'Patada de glúteo con banda', 'Puente de glúteo con banda'], null, '3x12 por lado/12 por lado/20|0|45|drop', { soloA: true, n: 'Triset de glúteo: tres estaciones seguidas con banda. La congestión es el objetivo: si el glúteo no arde, faltó intención.' }),
      R('C', ['Dead bug', 'Plancha lateral'], '3x8 por lado/30s|1|45', '3x10 por lado/40s|0|45'),
      R('M', null, null, null, { fin: FIN.glute })
    ] };

  D.F_PPB = { short: 'PUSH PULL + BRAZOS', label: 'Push, Pull y Brazos', title: 'Push, Pull y Brazos · Torso Completo', wu: 'upper', chips: ['💪 Torso', '🎯 Empuje + tracción + brazos', '🔥 Cierre metabólico'],
    foco: 'Sesión de torso completo y equilibrado: una tracción vertical abre el día, seguida de un press inclinado, un remo y un press de hombro para cubrir empuje y tracción en partes iguales. El cruce de cables trabaja el pecho estirado, el deltoide lateral y posterior redondean el hombro y el cierre de brazos (bíceps y tríceps) termina de armar la silueta. Priorizá la espalda: es el contrapeso del trabajo de pierna y lo que más cambia la postura. Controlá la bajada de cada repetición y no regales rango.',
    filas: [
      R('F', 'Jalón al pecho con agarre ancho', '4x8-12|1|120', '4x6-8|1|150', { ea: 'Dominadas lastradas', n: 'Pecho hacia la barra y escápulas hacia abajo antes de tirar. Los codos van hacia las costillas. Es el ejercicio principal del día: cargalo en serio.' }),
      R('H', 'Press inclinado con mancuernas', '4x8-12|1|120', '4x8-10|1|120'),
      R('H', 'Remo apoyado en banco inclinado', '4x10-12|1|90', '4x10-12|0-1|90'),
      R('H', 'Press de hombros sentado', '3x10-12|1|90', '3x10-12|0-1|90'),
      R('A', 'Cruce de cables en polea alta', '3x12-15|1|60', '4x12-15|0|60|drop'),
      R('B', ['Elevaciones laterales con mancuernas', 'Pájaro / Elevaciones posteriores inclinado'], '4x12-15/15|1|45', null, { soloI: true, n: 'Cierre de hombros: lateral y posterior seguidos, con cargas livianas y rango completo, para que el deltoide quede redondo desde todos los ángulos.' }),
      R('T', ['Elevaciones laterales con mancuernas', 'Pájaro / Elevaciones posteriores inclinado', 'Elevaciones W con mancuernas'], null, '4x15-20/15-20/12-15|0|45|drop', { soloA: true, n: 'Triset de hombros: lateral, posterior y W seguidos sin pausa. Acá manda la congestión, no la carga.' }),
      R('B', ['Curl de bíceps con mancuernas', 'Press francés con mancuernas plano'], '3x10-12/10-12|1|75', '4x10-12/10-12|0|75|drop', { n: 'Biset de brazos: bíceps y tríceps antagonistas sin pausa. Mientras uno trabaja el otro se recupera, así que podés cargar fuerte.' }),
      R('C', ['Dead bug', 'Plancha lateral'], '3x8 por lado/30s|1|45', '3x10 por lado/40s|0|45'),
      R('M', null, null, null, { fin: FIN.push })
    ] };

  D.F_PB = { short: 'PIERNA B', label: 'Pierna B', title: 'Pierna B · Glúteos e Isquiotibiales + Refuerzo de Torso', wu: 'glute', chips: ['🦵 Pierna B', '🎯 Glúteo + isquios', '💪 Refuerzo de torso'],
    foco: 'Pierna B con énfasis estricto en glúteos e isquiotibiales: el peso muerto rumano abre el día con la cadena posterior estirada, el hip thrust y la zancada inversa cargan el glúteo en dos longitudes distintas y el curl femoral y la abducción cierran con tensión constante. Al final entra un refuerzo de torso (tracción vertical y hombros) que te da una segunda exposición semanal a espalda y deltoides sin sumar fatiga de pierna. Cuidá la espalda neutra en cada repetición del rumano: es mejor una repetición menos que una espalda redondeada.',
    filas: [
      R('F', 'Peso muerto rumano', '4x6-8|2|150', '5x5-7|1|180', { n: 'La cadera se va hacia atrás, las rodillas apenas flexionadas y la barra pegada a las piernas. Bajá hasta sentir el estiramiento de los isquios sin perder la espalda neutra: ahí termina el rango útil.' }),
      R('H', 'Hip thrust con barra', '4x8-10|1|120', '5x8-10|0-1|120', { n: 'Pausa de un segundo arriba, costillas abajo y mentón al pecho. En esta sesión trabajás con la cadena posterior ya activada por el rumano: ajustá la carga si el glúteo llega cansado.' }),
      R('H', 'Zancada inversa', '3x10 por lado|1|90', '4x10 por lado|0-1|90', { n: 'Paso largo y torso levemente inclinado hacia adelante para cargar el glúteo. Empujá con el talón de la pierna que queda adelante.' }),
      R('A', 'Curl femoral sentado', '3x10-12|1|75', '4x10-12|0|75|drop'),
      R('A', 'Abducción sentado en máquina', '4x15-20|1|45', '4x15-20|0|45|drop'),
      R('H', 'Jalón al pecho con agarre estrecho', '3x10-12|1|90', '4x10-12|0-1|90', { n: 'Refuerzo de torso: no es el día para buscar el máximo sino estímulo de calidad con poca fatiga. Codos a las costillas y pausa de medio segundo abajo.' }),
      R('B', ['Elevaciones laterales con mancuernas', 'Pájaro / Elevaciones posteriores inclinado'], '3x12-15/15|1|45', null, { soloI: true, n: 'Cierre de hombros: lateral y posterior seguidos, livianos y con rango completo.' }),
      R('T', ['Elevaciones laterales con mancuernas', 'Pájaro / Elevaciones posteriores inclinado', 'Elevaciones W con mancuernas'], null, '4x15-20/15-20/12-15|0|45|drop', { soloA: true, n: 'Triset de hombros: tres estaciones sin pausa para redondear el deltoide. La congestión es el objetivo.' }),
      R('C', ['Elevación de piernas colgado', 'Plancha lateral'], '3x8/30s|1|45', '3x10/40s|0|45'),
      R('M', null, null, null, { fin: FIN.glute })
    ] };

  PB.ESTR.push(
    { g: 'f', f: 3, est: 'Pierna A · Push, Pull y Brazos · Pierna B', dias: ['F_PA', 'F_PPB', 'F_PB'], res: 'Split de tres días con prioridad en tren inferior: Pierna A (glúteos y cuádriceps + core), Push, Pull y Brazos (torso completo y equilibrado) y Pierna B (glúteos e isquiotibiales + refuerzo de torso). Glúteo y pierna dos veces por semana, con la sesión de torso en el medio para recuperar. Todas con entrada en calor específica, un básico pesado, compuestos de hipertrofia, cierre de congestión, core y finisher metabólico.' },
    { g: 'f', f: 4, est: 'Glúteo · Torso · Pierna · Glúteo y Hombros', dias: ['F_GLU_A', 'F_UP', 'F_QUAD', 'F_GLU_SH'], res: 'Glúteo en frecuencia 2 (con una tercera exposición a baja demanda), torso integral y una sesión de rodilla dominante: la mayor parte del volumen va a tren inferior sin descuidar el desarrollo general.' },
    { g: 'f', f: 5, est: 'Glúteo · Push · Pierna · Pull · Glúteo y Armonía', dias: ['F_GLU_A', 'F_PUSH', 'F_QUAD', 'F_PULL', 'F_GLU_B'], res: 'Glúteo y pierna en frecuencia 2-3 con Push y Pull dedicados: cadera pesada, empuje (hombro y pecho), cuádriceps e isquios, tracción y una segunda sesión de glúteo con brazos. Cinco sesiones completas: se entrena fuerte y se descansa en serio.' }
  );
})();
