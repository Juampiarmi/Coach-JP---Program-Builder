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
    foco: 'Día de empuje con el press de banca como ancla: carga alta, técnica estricta y el pecho trabajado en tres ángulos y longitudes (plano, inclinado y estirado en polea). El hombro y el tríceps llegan precalentados por el press, así que el deltoide lateral y la cabeza larga del tríceps cierran con aislamiento y un bloque final de congestión. Es una sesión larga y exigente: empujá cada serie efectiva cerca del fallo técnico sin regalar el rango por mover más peso.',
    filas: [
      R('F', 'Press de banca plano con barra', '4x5-7|2|180', '5x4-6|1|210', { n: 'Barra al pecho una fracción de segundo, sin rebote. Es el marcador de fuerza de empuje de tu semana: anotá los kilos y superá lo de la semana anterior aunque sea por una repetición.' }),
      R('H', 'Press inclinado con mancuernas', '4x8-10|1|120', '4x8-10|0-1|120'),
      R('H', 'Press militar sentado', '3x8-10|1|120', '4x6-8|1|150'),
      R('A', 'Aperturas en banco inclinado con poleas', '3x12-15|1|75', '4x12-15|0|60|drop'),
      R('A', 'Elevaciones laterales en polea baja', '4x12-15|1|60', '5x15-20|0|45'),
      R('B', ['Extensión tríceps tras nuca a 2 manos', 'Patada de tríceps con mancuerna'], '3x10-12/12-15|1|75', null, { soloI: true, n: 'Cierre de tríceps: la primera estación trabaja la cabeza larga estirada y la segunda busca la congestión. Sin pausa entre las dos.' }),
      R('T', ['Press francés con mancuernas plano', 'Patada de tríceps con mancuerna', 'Flexiones diamante'], null, '4x10-12/12-15/10-15|0|75|drop', { soloA: true, n: 'Triset de tríceps: tres estaciones seguidas, sin pausa. Las flexiones diamante son para terminar de vaciar el músculo: si no salen, apoyá las rodillas.' }),
      R('C', ['Rueda abdominal', 'Plancha lateral'], '3x8/30s|1|45', '3x10/40s|0|45'),
      R('M', null, null, null, { fin: FIN.push })
    ] };

  D.M_PULL = { short: 'PULL', label: 'Pull', title: 'Pull · Espalda, Deltoide Posterior y Bíceps', wu: 'pull', chips: ['💪 Tracción', '🎯 Dorsal + espalda alta + bíceps', '🔥 Cierre metabólico'],
    foco: 'Día de tracción con un remo pesado como ancla y el dorsal trabajado en vertical y horizontal. El deltoide posterior y el pull-over en polea (con el músculo estirado) refinan el ancho y la densidad de la espalda, y el bíceps cierra con un biset sin pausa. Tirá con los codos, no con las manos, y controlá la bajada de cada repetición: es en la bajada donde la espalda crece.',
    filas: [
      R('F', 'Remo Pecho Apoyado en banco inclinado', '4x6-8|2|150', '5x5-7|1|180', { n: 'Pecho pegado al banco, codos hacia atrás y escápulas juntas medio segundo arriba. El apoyo te saca la espalda baja de la ecuación: toda la carga la lleva la espalda alta, y por eso podés empujar fuerte sin pagar fatiga de más.' }),
      R('H', 'Jalón al pecho con agarre ancho', '4x8-10|1|120', '4x6-8|1|150', { ea: 'Dominadas lastradas' }),
      R('H', 'Remo en polea baja agarre en V', '3x10-12|1|90', '4x10-12|0-1|90'),
      R('A', 'Pull-over en polea alta brazos extendidos', '3x12-15|1|60', '4x12-15|0|60|drop'),
      R('A', 'Pájaro / Elevaciones posteriores inclinado', '4x15|1|45', '4x15-20|0|45|drop'),
      R('B', ['Curl de bíceps en banco inclinado (Mancuernas)', 'Curl martillo'], '3x10-12/10-12|1|75', null, { soloI: true, n: 'Cierre de bíceps: el banco inclinado deja el brazo detrás del torso y trabaja el bíceps estirado, y el martillo busca el braquial. Sin pausa entre las dos.' }),
      R('T', ['Curl de bíceps con barra Z', 'Curl martillo', 'Curl con agarre inverso'], null, '3x8-10/10-12/12-15|0|75|drop', { soloA: true, n: 'Triset de brazos: bíceps, braquial y antebrazo seguidos. Es el bloque que más se siente en la manga de la camiseta.' }),
      R('C', ['Elevación de piernas colgado', 'Plancha lateral'], '3x8/30s|1|45', '3x10/40s|0|45'),
      R('M', null, null, null, { fin: FIN.pull })
    ] };

  D.M_LEGS = { short: 'PIERNA', label: 'Pierna Completa', title: 'Pierna Completa · Cuádriceps, Femorales, Glúteos y Core', wu: 'legs', chips: ['🦵 Pierna', '🎯 Sentadilla + cadena posterior', '🔥 Cierre metabólico'],
    foco: 'Día de pierna completa: la sentadilla marca la carga de la semana, la prensa suma volumen de cuádriceps sin fatiga lumbar, el peso muerto rumano carga los femorales estirados y la cadena posterior ya queda cubierta sin sumar un tercer ejercicio pesado de cadera. Curl femoral, extensión y gemelo con pausa aíslan con tensión constante, y el core termina el día. Es el día más duro de la semana y el que más recuperación pide: dormí bien y comé antes de entrenar. Respetá la profundidad asignada: la serie que no la alcanza no cuenta como efectiva.',
    filas: [
      R('F', 'Sentadilla con barra', '4x5-7|2|180', '5x4-6|1|240', { n: 'La sentadilla marca el ritmo de toda la pierna. Profundidad pareja en todas las series y los talones clavados: si el talón se levanta, el rango se acortó.' }),
      R('H', 'Prensa 45°', '4x10-12|1|120', '4x10-12|0-1|120'),
      R('H', 'Peso muerto rumano', '3x8-10|2|150', '4x6-8|1|180'),
      R('A', 'Curl femoral tumbado', '3x10-12|1|75', '4x10-12|0|75|drop'),
      R('A', 'Extensión de cuádriceps', '3x12-15|1|60', '4x12-15|0|60|drop'),
      R('A', 'Elevación de gemelos de pie', '4x8-12|1|60', '5x8-12|0|60', { tp: ['2211'], n: 'Pausa de 1 a 2 segundos abajo, en el estiramiento: ahí está el estímulo del gemelo.' }),
      R('A', 'Elevaciones laterales con mancuernas', '3x12-15|1|45', '4x15|0|45|drop', { n: 'Segunda exposición semanal del deltoide lateral: es el músculo que más ensancha el hombro y responde mejor a la frecuencia que al volumen concentrado en un solo día.' }),
      R('B', ['Zancada inversa', 'Elevación de talones a una pierna'], '3x10 por lado/12|1|60', '4x10 por lado/12|0|60', { n: 'Cierre de pierna y gemelo: la zancada inversa descarga el cuádriceps y el glúteo y el talón a una pierna trabaja el gemelo sin pausa. Pausa de un segundo abajo, en el estiramiento: ahí está el estímulo.' }),
      R('C', ['Crunch en polea alta', 'Pallof press'], '3x12/10 por lado|1|45', '3x15/12 por lado|0|45'),
      R('M', null, null, null, { fin: FIN.pierna })
    ] };

  D.M_UP_A = { short: 'TORSO A', label: 'Torso A', title: 'Torso A · Fuerza de Empuje y Tracción', wu: 'upper', chips: ['💪 Torso', '🎯 Fuerza', '🔥 Cierre metabólico'],
    foco: 'Sesión de fuerza de torso: dos básicos pesados (press de banca y remo) abren el día cuando el sistema nervioso está fresco, seguidos de un press de hombro y una tracción vertical. Los deltoides y el biset de brazos cierran con volumen controlado. Las series pesadas llevan descansos largos: es lo que te permite sostener la carga de la primera a la última serie.',
    filas: [
      R('F', 'Press de banca plano con barra', '4x5-7|2|180', '5x4-6|1|210'),
      R('F', 'Remo Pecho Apoyado en banco inclinado', '4x6-8|2|150', '4x6-8|1|150', { n: 'Pecho apoyado y torso fijo: acá el dorsal manda y la espalda baja descansa.' }),
      R('H', 'Press militar de pie', '3x6-8|2|150', '3x6-8|1|150'),
      R('H', 'Jalón al pecho con agarre ancho', '3x8-12|1|90', '4x6-8|1|120', { ea: 'Dominadas lastradas' }),
      R('A', 'Elevaciones laterales con mancuernas', '3x12-15|1|60', '4x15|0|45|drop'),
      R('B', ['Curl de bíceps en banco inclinado (Mancuernas)', 'Extensión tríceps tras nuca a 2 manos'], '3x8-10/10-12|1|75', '3x8-10/10-12|0|75|drop', { n: 'Biset de brazos con los dos músculos estirados: el curl con el codo detrás del torso y la extensión con el codo arriba de la cabeza. Antagonistas sin pausa: mientras uno trabaja el otro se recupera.' }),
      R('C', ['Rueda abdominal', 'Plancha lateral'], '3x8/30s|1|45', '3x10/40s|0|45'),
      R('M', null, null, null, { fin: FIN.torso })
    ] };

  D.M_LO_A = { short: 'PIERNA A', label: 'Pierna A', title: 'Pierna A · Fuerza de Sentadilla', wu: 'legs', chips: ['🦵 Pierna', '🎯 Fuerza', '🔥 Cierre metabólico'],
    foco: 'Sesión de fuerza de pierna: sentadilla pesada, peso muerto rumano para la cadena posterior y un unilateral que corrige diferencias entre piernas. Isquio, gemelo, core y un cierre metabólico completan el día. La sentadilla va con tempo controlado y sin rebote abajo: la fuerza que construís acá es la que después sostiene el volumen del segundo día de pierna.',
    filas: [
      R('F', 'Sentadilla con barra', '4x5-7|2|180', '5x4-6|1|240'),
      R('H', 'Peso muerto rumano', '3x6-8|2|150', '4x6-8|1|180'),
      R('H', 'Bulgarian split squat', '3x8-10|1|90', '4x8-10|0-1|90', { n: 'Unilateral: arrancá siempre por la pierna más débil y repetí con la otra el mismo número de repeticiones. Si una pierna llega menos, esa es la que manda.' }),
      R('A', 'Curl femoral sentado', '3x10-12|1|75', '4x10-12|0|75|drop'),
      R('A', 'Elevación de gemelos de pie', '4x8-12|1|60', '5x8-12|0|60'),
      R('B', ['Step up al cajón', 'Elevación de talones a una pierna'], '3x10 por lado/12|1|60', '4x10 por lado/12|0|60'),
      R('C', ['Crunch en polea alta', 'Pallof press'], '3x12/10 por lado|1|45', '3x15/12 por lado|0|45'),
      R('M', null, null, null, { fin: FIN.pierna })
    ] };

  D.M_UP_B = { short: 'TORSO B', label: 'Torso B', title: 'Torso B · Hipertrofia de Pecho, Espalda y Hombros', wu: 'upper', chips: ['💪 Torso', '🎯 Hipertrofia', '🔥 Cierre metabólico'],
    foco: 'Sesión de volumen de torso: cuatro compuestos en rangos medios (8 a 12) buscan tensión mecánica y estiramiento, y los aislamientos cierran con superseries no competitivas para hombros y brazos. Acá se busca la sensación muscular: controlá la bajada, no regales rango y metele intención a cada repetición. Es el día del bombeo.',
    filas: [
      R('F', 'Press inclinado con mancuernas', '4x6-8|2|150', '4x6-8|1|150', { n: 'Aunque sea el día de hipertrofia, el primer ejercicio se entrena como un básico: carga alta, repeticiones controladas y el pecho estirado abajo. Acá se gana el tamaño.' }),
      R('H', 'Remo apoyado en banco inclinado', '4x8-10|1|120', '4x8-12|0-1|120'),
      R('H', 'Press de hombros sentado', '3x10-12|1|90', '4x10-12|0-1|90'),
      R('H', 'Jalón al pecho con agarre ancho', '3x10-12|1|90', '4x10-12|0-1|90'),
      R('A', 'Cruce de cables en polea alta', '4x12-15|1|60', '4x12-15|0|45|drop'),
      R('B', ['Elevaciones laterales con mancuernas', 'Pájaro / Elevaciones posteriores inclinado'], '3x12-15/15|1|60', null, { soloI: true, n: 'Cierre de hombros: lateral y posterior seguidos para que el deltoide quede redondo desde todos los ángulos.' }),
      R('T', ['Elevaciones laterales con mancuernas', 'Pájaro / Elevaciones posteriores inclinado', 'Elevaciones frontales con mancuernas'], null, '4x15/15-20/12-15|0|60|drop', { soloA: true, n: 'Triset de hombros: lateral, posterior y face pull sin pausa. Cargas livianas y rango completo: acá manda la congestión.' }),
      R('B', ['Curl de bíceps en banco inclinado (Mancuernas)', 'Extensión tríceps tras nuca a 2 manos'], '3x10-12/10-12|1|75', '4x10-12/10-12|0|75|drop'),
      R('C', ['Crunch abdominal', 'Plancha frontal'], '3x12/40s|1|45', '3x15/50s|0|45'),
      R('M', null, null, null, { fin: FIN.torso })
    ] };

  D.M_UP_C = { short: 'TORSO C', label: 'Torso C', title: 'Torso C · Refuerzo de Hombro y Brazos', wu: 'upper', chips: ['💪 Torso', '🎯 Refuerzo', '🫀 Cardio zona 2'],
    foco: 'Sesión más corta de refuerzo de torso para llegar a frecuencia 2 por grupo sin duplicar el volumen del push y el pull: un empuje y una tracción de rango medio, hombros en tres planos y un cierre de brazos. Acá no se busca el máximo sino estímulo con poca fatiga, para llegar fresco a la sesión de pierna. Por eso, en vez de un finisher fuerte, cerrás con cardio suave que te ayuda a recuperar.',
    filas: [
      R('F', 'Press plano con mancuernas', '3x6-8|2|120', '4x6-8|1|120', { n: 'Es el ejercicio principal de una sesión corta: pesado pero fresco, sin llegar al límite. Te tiene que quedar energía para los hombros y para la pierna de mañana.' }),
      R('H', 'Remo unilateral a una mano', '3x8-12|1|90', '4x8-10|0-1|90'),
      R('A', 'Elevaciones laterales con mancuernas', '4x12-15|1|60', '5x15-20|0|45|drop'),
      R('A', 'Pájaro / Elevaciones posteriores inclinado', '3x15|1|45', '4x15-20|0|45|drop'),
      R('B', ['Curl martillo', 'Extensión tríceps tras nuca a 2 manos'], '3x10-12/10-12|1|75', null, { soloI: true }),
      R('T', ['Curl martillo', 'Press francés en banco inclinado', 'Flexiones cerradas para tríceps'], null, '3x10-12/10-12/10-15|0|75|drop', { soloA: true }),
      R('C', ['Elevación de piernas colgado', 'Plancha lateral'], '3x8/30s|1|45', '3x10/40s|0|45'),
      R('K', null, null, null, { fin: FIN.zona2 })
    ] };

  D.M_LO_B = { short: 'PIERNA B', label: 'Pierna B', title: 'Pierna B · Cadena Posterior y Volumen', wu: 'legs', chips: ['🦵 Pierna', '🎯 Cadena posterior', '🔥 Cierre metabólico'],
    foco: 'Sesión de cadena posterior y volumen: un peso muerto con trap bar abre el día con una bisagra segura, el hack squat y el hip thrust suman cuádriceps y glúteo en rangos largos, y los aislamientos cierran isquios, cuádriceps y sóleo. Pausa de 1 segundo arriba en el hip thrust. Es el complemento del día de sentadilla: acá se acumula volumen con menos fatiga lumbar.',
    filas: [
      R('F', 'Peso muerto con trap bar', '4x5-6|2|180', '5x4-6|1|210', { n: 'Empujá el piso con las piernas antes de mover la barra y terminá con el glúteo, sin hiperextender la espalda. Si la barra se separa del cuerpo, bajá el peso.' }),
      R('H', 'Hack squat', '3x8-12|1|120', '4x8-10|0-1|120'),
      R('H', 'Hip thrust con barra', '3x8-10|1|120', '4x8-10|0-1|120'),
      R('A', 'Curl femoral tumbado', '3x10-12|1|75', '4x10-12|0|75|drop'),
      R('A', 'Extensión de cuádriceps', '3x12-15|1|60', '4x12-15|0|60|drop'),
      R('A', 'Elevación de talones sentado', '3x12-15|1|60', '4x12-20|0|60'),
      R('B', ['Zancada inversa', 'Puente de glúteo a una pierna'], '3x10 por lado/10 por lado|1|60', '3x10 por lado/12 por lado|0|60'),
      R('C', ['Rueda abdominal', 'Plancha lateral'], '3x8/30s|1|45', '3x10/40s|0|45'),
      R('M', null, null, null, { fin: FIN.pierna })
    ] };

  /* ---------- matriz masculina: frecuencia -> sesiones ---------- */
  PB.ESTR.push(
    { g: 'm', f: 3, est: 'Push / Pull / Pierna completa', dias: ['M_PUSH', 'M_PULL', 'M_LEGS'], res: 'Split analítico de tres días: Push (pecho, hombros y tríceps), Pull (espalda, deltoide posterior y bíceps) y Pierna completa (cuádriceps, femorales, glúteos y core). Cada grupo se entrena una vez por semana con volumen alto y se llega al fallo técnico en cada serie efectiva. Todas las sesiones llevan entrada en calor específica, un básico pesado, compuestos de hipertrofia, aislamientos, cierre en biset o triset, core y finisher metabólico.' },
    { g: 'm', f: 4, est: 'Torso / Pierna x2', dias: ['M_UP_A', 'M_LO_A', 'M_UP_B', 'M_LO_B'], res: 'Torso / Pierna dos veces por semana: dos sesiones de fuerza (torso A y pierna A) y dos de hipertrofia (torso B y pierna B), con cada grupo en frecuencia 2. Todas las sesiones cierran con biset o triset, core y finisher metabólico.' },
    { g: 'm', f: 5, est: 'Push / Pull / Legs + Torso / Pierna', dias: ['M_PUSH', 'M_PULL', 'M_LEGS', 'M_UP_C', 'M_LO_B'], res: 'Push / Pull / Legs con volumen completo, más dos sesiones de refuerzo (torso y pierna) para llegar a frecuencia 2 por grupo. Cinco sesiones largas y exigentes: se come, se duerme y se entrena en serio.' }
  );
})();
