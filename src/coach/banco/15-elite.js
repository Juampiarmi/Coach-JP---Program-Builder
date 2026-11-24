/* =========================================================
   PLANTILLAS BASE COACH JP · BODYBUILDING AVANZADO / ÉLITE (3, 4 y 5 días · hombres y mujeres)
   Las 6 plantillas de nivel avanzado usan sesiones propias (E_*): se registran acá y 20-armado.js las toma en lugar de las compartidas con el nivel intermedio (ESTR.diasA).
   Criterios de diseño:
     · hipertrofia por estiramiento: se prioriza tensión en posición elongada (rumano con déficit, búlgara inclinada, curl inclinado, extensión sobre la cabeza, pull-over, cruce desde abajo, gemelo con pausa)
     · máxima estabilidad externa: pecho apoyado en los remos, press de hombro sentado, hack / prensa antes que la sentadilla con barra, hip thrust con banco
     · control de la fatiga axial y sistémica: como máximo 1 patrón axial pesado por día (sentadilla con barra, rumano con barra, remo con barra)
     · RIR 0-1 en toda serie efectiva; técnica de intensidad (drop-set) solo en el último aislamiento
     · nunca dos ejercicios guiados (máquina o polea) seguidos dentro del mismo biset / triset, y bisets de una misma estación (ver jpEstacion)
     · mujeres: glúteo prioritario (hip thrust con pausa, rumano con déficit, búlgara inclinada, patada cruzada en polea), piernas sólidas, brazos esculpidos y abdomen tallado, sin la plancha lateral repetida en todos los días
     · hombres: espalda ancha, hombros prominentes (lateral y posterior con frecuencia 2-3), brazos densos con trabajo elongado y piernas completas con poca fatiga axial
   Este archivo también publica PB.ELITE: catálogo (tipo guiado / grupo muscular / axial), familias de swaps y rangos de volumen semanal que usa el editor del Builder (21-estructura.js).
   ========================================================= */
(function(){
  'use strict';
  var PB = window.__jpPB; if(!PB) return;
  var R = PB.R, D = PB.D, FIN = PB.FIN;
  function E(rol, ej, dosis, o){ return R(rol, ej, dosis, dosis, o); }

  /* ---------- catálogo: nombre en la biblioteca -> { t: L libre · M máquina guiada · P polea, g: grupo muscular, ax: 1 = patrón axial pesado, h: rol de un bloque nuevo (H compuesto · A aislamiento) } ---------- */
  var CAT = {};
  function c(g, t, lista, ax, h){ lista.forEach(function(n){ CAT[n] = { t: t, g: g, ax: ax ? 1 : 0, h: h || 'A' }; }); }
  /* pecho */
  c('Pecho', 'L', ['Press de banca plano con barra', 'Press plano con mancuernas', 'Press inclinado con mancuernas', 'Press de banca inclinado con barra', 'Aperturas en banco inclinado', 'Fondos en paralelas'], 0, 'H');
  c('Pecho', 'M', ['Press de pecho convergente en máquina', 'Pec Deck / Contractor de pecho'], 0, 'H');
  c('Pecho', 'P', ['Cruce de cables en polea baja', 'Cruce de cables en polea alta', 'Press de pecho inclinado en polea']);
  /* hombros */
  c('Hombro anterior', 'L', ['Press de hombros sentado', 'Press militar sentado', 'Press Arnold sentado', 'Press de hombros agarre neutro con mancuernas'], 0, 'H');
  c('Hombro anterior', 'M', ['Press de hombros en máquina'], 0, 'H');
  c('Hombro lateral', 'L', ['Elevaciones laterales con mancuernas', 'Elevaciones laterales inclinado en banco']);
  c('Hombro lateral', 'P', ['Elevaciones laterales en polea baja', 'Elevación lateral inclinada polea baja', 'Elevaciones laterales cruzadas en polea']);
  c('Hombro posterior', 'L', ['Pájaro / Elevaciones posteriores inclinado']);
  c('Hombro posterior', 'M', ['Contractor de pecho / Pec Deck inverso']);
  c('Hombro posterior', 'P', ['Cruce de cables deltoides posterior', 'Face Pull con cuerda']);
  /* espalda */
  c('Espalda', 'L', ['Remo Pecho Apoyado en banco inclinado', 'Remo unilateral a una mano', 'Remo apoyado en banco inclinado', 'Dominadas lastradas', 'Pull-over con mancuerna', 'Encogimientos de hombros con mancuernas', 'Encogimientos sentados con mancuernas'], 0, 'H');
  c('Espalda', 'L', ['Remo con barra inclinado', 'Remo Pendlay'], 1, 'H');
  c('Espalda', 'M', ['Remo en máquina con barra T', 'Remo horizontal en máquina', 'Dominadas asistidas en máquina'], 0, 'H');
  c('Espalda', 'P', ['Jalón al pecho con agarre ancho', 'Jalón al pecho con agarre estrecho', 'Jalón al pecho agarre supinado', 'Remo en polea baja agarre en V', 'Remo sentado con agarre estrecho', 'Pull-over en polea alta brazos extendidos', 'Encogimientos en polea baja'], 0, 'H');
  /* brazos */
  c('Tríceps', 'L', ['Extensión tríceps tras nuca a 2 manos', 'Press francés en banco plano', 'Press francés con mancuernas plano', 'Patada de tríceps con mancuerna', 'Fondos de tríceps con peso', 'Flexiones diamante']);
  c('Tríceps', 'P', ['Extensión tríceps tras nuca con cuerda', 'Extensión tríceps polea alta barra recta', 'Extensión tríceps polea alta con cuerda']);
  c('Bíceps', 'L', ['Curl de bíceps en banco inclinado con mancuernas', 'Curl Araña con mancuernas', 'Curl martillo', 'Curl de bíceps con barra Z', 'Curl predicador / Banco Scott barra Z', 'Curl de bíceps con mancuernas']);
  c('Bíceps', 'P', ['Curl de bíceps tras la espalda', 'Curl de bíceps polea baja barra corta', 'Curl martillo con cuerda polea baja']);
  /* piernas */
  c('Cuádriceps', 'M', ['Hack squat', 'Prensa 45°', 'Sentadilla en multipower', 'Prensa horizontal', 'Extensión de cuádriceps', 'Extensión de cuádriceps a una pierna'], 0, 'H');
  c('Cuádriceps', 'L', ['Sentadilla con barra'], 1, 'H');
  c('Cuádriceps', 'L', ['Bulgarian split squat', 'Zancadas caminando', 'Step up al cajón', 'Zancada inversa', 'Zancada lateral', 'Split squat estático', 'Sentadilla sissy'], 0, 'H');
  c('Isquios', 'L', ['Peso muerto rumano', 'Peso muerto rumano con déficit'], 1, 'H');
  c('Isquios', 'L', ['Peso muerto rumano con mancuernas', 'Curl nórdico'], 0, 'H');
  c('Isquios', 'M', ['Curl femoral sentado', 'Curl femoral acostado', 'Curl femoral a una pierna acostado']);
  c('Glúteo', 'L', ['Hip thrust con barra', 'Hip thrust a una pierna', 'Puente de glúteo a una pierna', 'Puente de glúteo con banda', 'Patada de glúteo con banda', 'Sentadilla búlgara con torso inclinado', 'Hiperextensiones en banco a 45°', 'Abducción caminando con banda'], 0, 'H');
  c('Glúteo', 'M', ['Hip thrust en máquina', 'Patada de glúteo en máquina', 'Abducción sentado en máquina', 'Abducción de cadera en máquina']);
  c('Glúteo', 'P', ['Patada de glúteo en polea cruzada', 'Pull-through con cuerda en polea', 'Extensión de cadera en polea de pie']);
  c('Gemelos', 'M', ['Elevación de gemelos de pie', 'Elevación de talones sentado', 'Elevación de talones en prensa']);
  c('Gemelos', 'L', ['Elevación de talones a una pierna']);
  /* core */
  c('Core', 'L', ['Rueda abdominal', 'Elevación de piernas colgado', 'Elevación de piernas en banco', 'Crunch abdominal', 'Plancha lateral', 'Plancha frontal', 'Dead bug', 'Hollow body']);
  c('Core', 'P', ['Crunch en polea alta', 'Pallof press', 'Woodchopper en polea']);

  /* ampliación v8 de la biblioteca */
  c('Glúteo', 'L', ['Hip thrust con mancuerna', 'Puente de glúteo con barra', 'Patada de glúteo en cuadrupedia con mancuerna', 'Abducción de cadera acostada con banda', 'Puente de rana', 'Zancada con paso largo para glúteo'], 0, 'H');
  c('Glúteo', 'M', ['Hip thrust en multipower', 'Hiperextensión inversa'], 0, 'H');
  c('Glúteo', 'P', ['Abducción de cadera en polea baja']);
  c('Isquios', 'M', ['Peso muerto rumano en multipower'], 0, 'H');
  c('Isquios', 'P', ['Curl femoral de pie en polea']);
  c('Isquios', 'L', ['Curl femoral con pelota suiza']);
  c('Cuádriceps', 'M', ['Sentadilla péndulo', 'Sentadilla con cinturón'], 0, 'H');
  c('Cuádriceps', 'L', ['Sentadilla frontal con mancuernas', 'Zancada inversa con déficit'], 0, 'H');
  c('Gemelos', 'M', ['Elevación de talones en multipower', 'Elevación de talones en burro']);
  c('Gemelos', 'L', ['Elevación de talones sentado con mancuerna', 'Elevación de puntas de pie para tibial']);
  c('Core', 'L', ['Crunch inverso', 'Rueda abdominal de rodillas', 'Plancha con elevación de pierna', 'Hollow rock', 'Plancha lateral con elevación de cadera']);
  c('Core', 'M', ['Crunch en máquina']);
  c('Core', 'P', ['Pallof press de rodillas', 'Leñador en polea baja a alta']);
  c('Bíceps', 'M', ['Curl de bíceps en máquina']);
  c('Bíceps', 'L', ['Curl martillo en banco inclinado']);
  c('Tríceps', 'M', ['Extensión de tríceps en máquina']);
  c('Tríceps', 'P', ['Extensión de tríceps acostado con soga en polea baja']);
  c('Hombro lateral', 'M', ['Elevaciones laterales en máquina']);
  c('Hombro anterior', 'M', ['Press de hombros en multipower'], 0, 'H');
  c('Hombro anterior', 'L', ['Press de hombros a una mano con mancuerna'], 0, 'H');
  c('Hombro posterior', 'L', ['Pájaro con pecho apoyado en banco inclinado']);
  c('Espalda', 'L', ['Remo Seal con mancuernas'], 0, 'H');
  c('Espalda', 'P', ['Jalón al pecho agarre neutro', 'Remo en polea baja con apoyo de pecho'], 0, 'H');
  c('Espalda', 'M', ['Pullover en máquina']);
  c('Pecho', 'M', ['Press de pecho inclinado en máquina', 'Press de pecho declinado en máquina', 'Press inclinado en multipower'], 0, 'H');
  c('Pecho', 'L', ['Flexiones con pausa']);

  /* ---------- familias de swaps: cualquier miembro puede reemplazar a otro de su familia ---------- */
  var FAM = [
    /* v8: familias de los ejercicios nuevos (se suman a las de abajo: las alternativas de un ejercicio son la unión de todas sus familias) */
    ['Hip thrust con barra', 'Hip thrust con mancuerna', 'Hip thrust en multipower', 'Puente de glúteo con barra', 'Puente de rana'],
    ['Patada de glúteo en polea cruzada', 'Patada de glúteo en cuadrupedia con mancuerna'],
    ['Abducción caminando con banda', 'Abducción de cadera en polea baja', 'Abducción de cadera acostada con banda'],
    ['Peso muerto rumano', 'Peso muerto rumano en multipower', 'Hiperextensión inversa'],
    ['Curl femoral acostado', 'Curl femoral de pie en polea', 'Curl femoral con pelota suiza'],
    ['Hack squat', 'Sentadilla péndulo', 'Sentadilla con cinturón'],
    ['Bulgarian split squat', 'Zancada inversa con déficit', 'Zancada con paso largo para glúteo'],
    ['Elevación de gemelos de pie', 'Elevación de talones en multipower', 'Elevación de talones en burro', 'Elevación de talones sentado con mancuerna'],
    ['Crunch abdominal', 'Crunch inverso', 'Crunch en máquina'],
    ['Rueda abdominal', 'Rueda abdominal de rodillas'],
    ['Pallof press', 'Pallof press de rodillas', 'Woodchopper en polea', 'Leñador en polea baja a alta'],
    ['Plancha lateral', 'Plancha lateral con elevación de cadera', 'Plancha con elevación de pierna', 'Hollow rock'],
    ['Curl de bíceps con barra Z', 'Curl de bíceps en máquina'],
    ['Curl martillo', 'Curl martillo en banco inclinado'],
    ['Extensión tríceps tras nuca a 2 manos', 'Extensión de tríceps en máquina', 'Extensión de tríceps acostado con soga en polea baja'],
    ['Elevaciones laterales en polea baja', 'Elevaciones laterales en máquina'],
    ['Press de hombros sentado', 'Press de hombros en multipower', 'Press de hombros a una mano con mancuerna'],
    ['Pájaro / Elevaciones posteriores inclinado', 'Pájaro con pecho apoyado en banco inclinado'],
    ['Remo Pecho Apoyado en banco inclinado', 'Remo Seal con mancuernas', 'Remo en polea baja con apoyo de pecho'],
    ['Jalón al pecho con agarre ancho', 'Jalón al pecho agarre neutro'],
    ['Pull-over en polea alta brazos extendidos', 'Pullover en máquina'],
    ['Press inclinado con mancuernas', 'Press de pecho inclinado en máquina', 'Press inclinado en multipower'],
    ['Press de banca plano con barra', 'Press de pecho declinado en máquina'],
    ['Flexiones diamante', 'Flexiones con pausa'],
    ['Press de banca plano con barra', 'Press plano con mancuernas', 'Press de pecho convergente en máquina'],
    ['Press inclinado con mancuernas', 'Press de banca inclinado con barra', 'Press de pecho inclinado en polea', 'Press de pecho convergente en máquina'],
    ['Cruce de cables en polea baja', 'Cruce de cables en polea alta', 'Aperturas en banco inclinado', 'Pec Deck / Contractor de pecho'],
    ['Press de hombros sentado', 'Press de hombros en máquina', 'Press militar sentado', 'Press Arnold sentado', 'Press de hombros agarre neutro con mancuernas'],
    ['Elevaciones laterales en polea baja', 'Elevaciones laterales con mancuernas', 'Elevaciones laterales inclinado en banco', 'Elevación lateral inclinada polea baja', 'Elevaciones laterales cruzadas en polea'],
    ['Pájaro / Elevaciones posteriores inclinado', 'Contractor de pecho / Pec Deck inverso', 'Cruce de cables deltoides posterior', 'Face Pull con cuerda'],
    ['Remo Pecho Apoyado en banco inclinado', 'Remo en máquina con barra T', 'Remo horizontal en máquina', 'Remo unilateral a una mano', 'Remo Pendlay'],
    ['Jalón al pecho con agarre ancho', 'Jalón al pecho con agarre estrecho', 'Jalón al pecho agarre supinado', 'Dominadas lastradas', 'Dominadas asistidas en máquina'],
    ['Remo en polea baja agarre en V', 'Remo sentado con agarre estrecho', 'Remo unilateral a una mano', 'Remo horizontal en máquina'],
    ['Pull-over en polea alta brazos extendidos', 'Pull-over con mancuerna'],
    ['Encogimientos de hombros con mancuernas', 'Encogimientos sentados con mancuernas', 'Encogimientos en polea baja'],
    ['Extensión tríceps tras nuca a 2 manos', 'Extensión tríceps tras nuca con cuerda', 'Press francés en banco plano', 'Extensión tríceps polea alta barra recta', 'Patada de tríceps con mancuerna', 'Fondos de tríceps con peso', 'Flexiones diamante'],
    ['Curl de bíceps en banco inclinado con mancuernas', 'Curl Araña con mancuernas', 'Curl de bíceps tras la espalda', 'Curl predicador / Banco Scott barra Z', 'Curl de bíceps con barra Z', 'Curl martillo', 'Curl de bíceps polea baja barra corta'],
    ['Hack squat', 'Prensa 45°', 'Sentadilla en multipower', 'Prensa horizontal', 'Sentadilla con barra'],
    ['Bulgarian split squat', 'Sentadilla búlgara con torso inclinado', 'Zancadas caminando', 'Step up al cajón', 'Zancada inversa', 'Split squat estático'],
    ['Extensión de cuádriceps', 'Extensión de cuádriceps a una pierna', 'Sentadilla sissy'],
    ['Peso muerto rumano', 'Peso muerto rumano con mancuernas', 'Peso muerto rumano con déficit', 'Hiperextensiones en banco a 45°', 'Curl nórdico', 'Pull-through con cuerda en polea'],
    ['Curl femoral sentado', 'Curl femoral acostado', 'Curl femoral a una pierna acostado', 'Curl nórdico'],
    ['Hip thrust con barra', 'Hip thrust en máquina', 'Hip thrust a una pierna', 'Puente de glúteo a una pierna'],
    ['Patada de glúteo en polea cruzada', 'Patada de glúteo en máquina', 'Pull-through con cuerda en polea', 'Extensión de cadera en polea de pie', 'Patada de glúteo con banda'],
    ['Abducción caminando con banda', 'Abducción sentado en máquina', 'Abducción de cadera en máquina', 'Puente de glúteo con banda'],
    ['Elevación de gemelos de pie', 'Elevación de talones sentado', 'Elevación de talones en prensa', 'Elevación de talones a una pierna'],
    ['Elevación de piernas en banco', 'Elevación de piernas colgado', 'Crunch en polea alta', 'Crunch abdominal'],
    ['Rueda abdominal', 'Pallof press', 'Plancha lateral', 'Plancha frontal', 'Dead bug', 'Hollow body', 'Woodchopper en polea']
  ];

  /* rangos orientativos de series efectivas por semana y grupo muscular (avanzado / élite) */
  var RANGOS = {
    M: { 'Pecho': [10, 16], 'Espalda': [14, 22], 'Hombro lateral': [10, 20], 'Hombro posterior': [6, 14], 'Hombro anterior': [0, 8], 'Bíceps': [8, 14], 'Tríceps': [8, 14], 'Cuádriceps': [10, 20], 'Isquios': [8, 14], 'Glúteo': [0, 9], 'Gemelos': [6, 14], 'Core': [6, 15] },
    F: { 'Pecho': [3, 9], 'Espalda': [10, 16], 'Hombro lateral': [8, 14], 'Hombro posterior': [4, 12], 'Hombro anterior': [0, 8], 'Bíceps': [6, 12], 'Tríceps': [6, 12], 'Cuádriceps': [8, 14], 'Isquios': [8, 14], 'Glúteo': [20, 36], 'Gemelos': [6, 12], 'Core': [6, 15] }
  };
  /* movimientos que no se ofrecen a la base de alumnas como opción por defecto (poco aplicables o que no hay en todos los gimnasios, como el curl femoral sentado): se siguen pudiendo elegir a mano */
  /* planes de 3 días: con una sola exposición semanal por grupo y 3 sesiones largas, el piso de los grupos secundarios baja un poco para que cada sesión siga siendo recuperable */
  var RANGOS3 = {
    M: { 'Hombro lateral': [8, 20], 'Bíceps': [6, 14], 'Tríceps': [6, 14], 'Isquios': [6, 14], 'Gemelos': [5, 14], 'Cuádriceps': [9, 20] },
    F: { 'Bíceps': [5, 12], 'Tríceps': [5, 12], 'Gemelos': [5, 12] }
  };
  var NO_FEM = ['Dominadas lastradas', 'Rueda abdominal', 'Elevación de piernas colgado', 'Curl femoral sentado'];

  /* tempo propio de las variantes de hip thrust (pausa de 2 segundos arriba): se conserva al cambiar de variante */
  var TP = { 'Hip thrust con barra': '2012', 'Hip thrust en máquina': '2012', 'Hip thrust a una pierna': '2012' };

  PB.ELITE = { CAT: CAT, FAM: FAM, RANGOS: RANGOS, RANGOS3: RANGOS3, NO_FEM: NO_FEM, TP: TP, VER: 1 };

  /* =========================================================
     HOMBRES
     ========================================================= */
  D.E_M_PUSH = { short: 'PUSH', label: 'Push', title: 'Push · Pecho, Hombros y Tríceps', wu: 'push', chips: ['💪 Empuje', '🎯 Pecho + hombro lateral + tríceps elongado', '🔥 Cierre metabólico'],
    foco: 'Día de empuje de élite: el press de banca marca la carga de la semana. Después vienen el press inclinado con mancuernas junto al face pull (pecho superior y deltoide posterior para equilibrar el hombro), el press de hombros sentado junto a la elevación lateral en polea (volumen alto de deltoide lateral) y un triset de cierre con el cruce de poleas desde abajo (pecho estirado), la extensión de tríceps sobre la cabeza (porción larga elongada) y flexiones diamante para terminar de vaciar el tríceps. Todo con apoyo estable y una sola exposición axial pesada. Cada serie efectiva se empuja a RIR 0-1: acá se gana el pecho y se dibuja el hombro.',
    filas: [
      E('F', 'Press de banca plano con barra', '4x5-7|1|180', { n: 'Barra al pecho una fracción de segundo, sin rebote y con las escápulas fijas en el banco. Es el marcador de fuerza de empuje de tu semana: anotá los kilos y superá lo de la semana anterior aunque sea por una repetición.' }),
      E('B', ['Press inclinado con mancuernas', 'Face Pull con cuerda'], '3x8-10/15-20|0-1/0|90', { tp: ['3110', ''], n: 'Bajá hasta sentir el pecho estirado y subí sin chocar las mancuernas (banco a 30°: más alto y el hombro roba el trabajo). El face pull en la polea de al lado equilibra el hombro por detrás: codos altos y escápulas juntas al final.' }),
      E('B', ['Press de hombros sentado', 'Elevaciones laterales en polea baja'], '3/5x8-10/12-20|1/0-1|75', { n: 'Press con la espalda apoyada y, en la polea, la elevación lateral de a un brazo (la cifra es por lado): la polea mantiene la tensión desde abajo, donde la mancuerna no la da. En las dos rondas que sobran hacés solo las laterales.' }),
      E('T', ['Cruce de cables en polea baja', 'Extensión tríceps tras nuca a 2 manos', 'Flexiones diamante'], '3x12-15/10-12/10-15|0|75|drop', { tp: ['3011', '3110', ''], n: 'Triset de cierre: el cruce desde abajo estira el pecho, la extensión sobre la cabeza trabaja la porción larga del tríceps y las flexiones diamante lo terminan de vaciar. Sin pausa entre las tres.' }),
      E('C', 'Rueda abdominal', '3x8-12|1|45'),
      R('M', null, null, null, { fin: FIN.push })
    ] };

  D.E_M_PULL = { short: 'PULL', label: 'Pull', title: 'Pull · Espalda, Deltoide Posterior y Bíceps', wu: 'pull', chips: ['💪 Tracción', '🎯 Espalda ancha y densa + bíceps elongado', '🔥 Cierre metabólico'],
    foco: 'Día de tracción de élite: el remo con el pecho apoyado es el ancla (la espalda trabaja pesado sin que la zona lumbar limite antes). Después vienen el jalón al pecho junto al pájaro (ancho de espalda y deltoide posterior), el remo en polea baja junto al pull-over con mancuerna (el dorsal estirado con el brazo por encima de la cabeza), el face pull junto a los encogimientos (posterior de hombro y trapecio) y el curl en banco inclinado junto al curl martillo, con el bíceps en su posición más larga. Tirá con los codos y controlá cada bajada: es en la bajada donde la espalda crece.',
    filas: [
      E('F', 'Remo Pecho Apoyado en banco inclinado', '4x6-8|1|150', { n: 'Pecho pegado al banco, codos hacia atrás y escápulas juntas medio segundo arriba. El apoyo te saca la espalda baja de la ecuación: toda la carga la lleva la espalda alta.' }),
      E('B', ['Jalón al pecho con agarre ancho', 'Pájaro / Elevaciones posteriores inclinado'], '4/3x8-10/15-20|0-1/0|90', { n: 'Pecho hacia la barra y escápulas abajo antes de tirar; el pájaro con mancuernas livianas va al lado del jalón. En la ronda que sobra hacés solo el jalón.' }),
      E('B', ['Remo en polea baja agarre en V', 'Pull-over con mancuerna'], '3x10-12/12-15|0-1/0|75', { tp: ['', '3011'], n: 'Remo horizontal y pull-over con mancuerna acostado en un banco: el pull-over lleva el dorsal a su posición más estirada. Bajá en 3 segundos.' }),
      E('B', ['Face Pull con cuerda', 'Encogimientos de hombros con mancuernas'], '3x15-20/12-15|0|60|drop', { n: 'Posterior de hombro y trapecio seguidos: face pull con codos altos y encogimientos con pausa de 1 segundo arriba. Sin pausa entre los dos.' }),
      E('B', ['Curl de bíceps en banco inclinado con mancuernas', 'Curl martillo'], '3x10-12/10-12|0|75|drop', { tp: ['3110', '2011'], n: 'El banco inclinado deja el brazo detrás del torso: el bíceps trabaja estirado. Bajá en 3 segundos y no rebotes abajo; el martillo termina con el braquial.' }),
      E('C', 'Elevación de piernas colgado', '3x8-12|1|45'),
      R('M', null, null, null, { fin: FIN.pull })
    ] };

  D.E_M_LEG3 = { short: 'PIERNA', label: 'Pierna Completa', title: 'Pierna Completa · Más Laterales y Brazos', wu: 'legs', chips: ['🦵 Pierna', '🎯 Hack + cadena posterior + laterales', '🔥 Cierre metabólico'],
    foco: 'Día de pierna completa pensado para frecuencia 3: el hack squat es el ancla (cuádriceps cargado a fondo y sin fatiga lumbar). Después vienen el peso muerto rumano —el único patrón axial pesado del día— con elevaciones laterales livianas en la pausa, la sentadilla búlgara junto al curl femoral sentado, la extensión de cuádriceps junto al gemelo sentado y un biset corto de brazos con la misma barra Z: curl de bíceps y press francés acostado en el banco plano. Como el split es de tres días, este día suma la segunda exposición semanal del deltoide lateral y una dosis de brazos. Llegá comido y descansado.',
    filas: [
      E('F', 'Hack squat', '4x6-8|1|180', { tp: ['3110'], n: 'Espalda apoyada, pies a media altura y bajada de 3 segundos hasta una flexión profunda. La máquina te da estabilidad externa: cargá fuerte sin pagar con la espalda baja.' }),
      E('B', ['Peso muerto rumano', 'Elevaciones laterales con mancuernas'], '3x6-8/15-20|1/0|150', { tp: ['3210', ''], n: 'Único patrón axial pesado del día: cadera atrás, barra pegada a las piernas y pausa corta abajo en el estiramiento. Las laterales son livianas y van en la pausa del rumano, sin apurarlo.' }),
      E('B', ['Bulgarian split squat', 'Curl femoral sentado'], '3x8-10/10-12|1/0|90', { tp: ['3110', ''], n: 'La pierna débil primero en la búlgara; el curl sentado deja el isquio más estirado que acostado. Bajá en 3 segundos.' }),
      E('B', ['Extensión de cuádriceps', 'Elevación de talones sentado con mancuerna'], '3/5x12-15/12-20|0|60|drop', { tp: ['', '2211'], n: 'Extensión con tensión constante y gemelo sentado con la mancuerna sobre la rodilla, al lado de la máquina y con pausa abajo. En las dos rondas que sobran hacés solo el gemelo.' }),
      E('B', ['Curl de bíceps con barra Z', 'Press francés en banco plano'], '2x8-10/8-10|0|60', { n: 'Biset de brazos con la misma barra Z: curl de bíceps de pie y press francés acostado en el banco plano, antagonistas y sin pausa entre uno y otro.' }),
      E('C', 'Crunch en polea alta', '2x12-15|1|45'),
      R('M', null, null, null, { fin: FIN.pierna })
    ] };

  D.E_M_TA = { short: 'TORSO A', label: 'Torso A', title: 'Torso A · Fuerza de Empuje y Tracción', wu: 'upper', chips: ['💪 Torso', '🎯 Fuerza de empuje y tracción', '🔥 Cierre metabólico'],
    foco: 'Sesión de fuerza de torso con doble ancla: el press de banca y el remo con el pecho apoyado abren el día con el sistema nervioso fresco, seguidos de un press de hombro sentado y una tracción vertical. El deltoide lateral y el posterior tienen su bloque y el biset de brazos con la misma barra Z cierra la sesión. Las series pesadas llevan descansos largos: es lo que te deja sostener la carga de la primera a la última serie.',
    filas: [
      E('F', 'Press de banca plano con barra', '4x5-7|1|180'),
      E('F', 'Remo Pecho Apoyado en banco inclinado', '4x6-8|1|150', { n: 'Pecho apoyado y torso fijo: acá el dorsal manda y la espalda baja descansa.' }),
      E('H', 'Press de hombros sentado', '3x6-8|1|120'),
      E('H', 'Jalón al pecho con agarre ancho', '3x8-10|0-1|90'),
      E('A', 'Elevaciones laterales en polea baja', '4x12-20|0-1|45'),
      E('A', 'Face Pull con cuerda', '3x15-20|0|45'),
      E('B', ['Curl de bíceps con barra Z', 'Press francés en banco plano'], '4x8-10/10-12|0|75|drop', { n: 'Biset de brazos con la misma barra Z: bíceps y tríceps antagonistas, sin pausa entre las dos estaciones.' }),
      E('C', 'Pallof press', '3x10 por lado|1|45'),
      R('M', null, null, null, { fin: FIN.torso })
    ] };

  D.E_M_LA = { short: 'PIERNA A', label: 'Pierna A', title: 'Pierna A · Cuádriceps y Gemelos', wu: 'legs', chips: ['🦵 Pierna', '🎯 Cuádriceps + gemelos', '🔥 Cierre metabólico'],
    foco: 'Sesión de rodilla dominante: el hack squat es el ancla y después vienen la sentadilla búlgara junto al curl femoral sentado, la prensa junto a elevaciones laterales livianas (la tercera exposición semanal del deltoide lateral) y la extensión de cuádriceps junto al gemelo a una pierna. Máxima estabilidad externa y casi nada de fatiga axial. Respetá la profundidad asignada: la serie que no la alcanza no cuenta como efectiva.',
    filas: [
      E('F', 'Hack squat', '4x6-8|1|180', { tp: ['3110'] }),
      E('B', ['Bulgarian split squat', 'Curl femoral sentado'], '3x8-10/10-12|1/0|90', { tp: ['3110', ''], n: 'Arrancá siempre por la pierna más débil y repetí con la otra el mismo número de repeticiones. El curl sentado deja el isquio estirado: bajá en 3 segundos.' }),
      E('B', ['Prensa 45°', 'Elevaciones laterales con mancuernas'], '3x10-12/15-20|0-1/0|90', { tp: ['3110', ''], n: 'Prensa con rango completo y, mientras las piernas descansan, laterales livianas al lado de la máquina.' }),
      E('B', ['Extensión de cuádriceps', 'Elevación de talones a una pierna'], '3/5x12-15/12-15|0|60|drop', { tp: ['', '2211'], n: 'Extensión con tensión constante y gemelo a una pierna sobre un escalón, con pausa abajo. En las dos rondas que sobran hacés solo el gemelo.' }),
      E('C', 'Crunch en polea alta', '3x12-15|1|45'),
      R('M', null, null, null, { fin: FIN.pierna })
    ] };

  D.E_M_TB = { short: 'TORSO B', label: 'Torso B', title: 'Torso B · Hipertrofia por Estiramiento', wu: 'upper', chips: ['💪 Torso', '🎯 Hipertrofia por estiramiento', '🔥 Cierre metabólico'],
    foco: 'Sesión de volumen de torso con la mirada puesta en el estiramiento: el press inclinado con mancuernas, el cruce de poleas desde abajo y el pull-over llevan pecho y dorsal a su posición más larga, mientras el deltoide lateral y el posterior suman volumen alto con cargas livianas. El biset de brazos usa curl inclinado y extensión sobre la cabeza, los dos con el músculo elongado. Acá se busca la sensación muscular: controlá la bajada, no regales rango y metele intención a cada repetición.',
    filas: [
      E('F', 'Press inclinado con mancuernas', '4x8-10|0-1|120', { tp: ['3110'], n: 'Aunque sea el día de hipertrofia, el primer ejercicio se entrena como un básico: carga alta, bajada controlada y el pecho estirado abajo. Acá se gana el tamaño.' }),
      E('H', 'Jalón al pecho con agarre estrecho', '4x10-12|0-1|90'),
      E('H', 'Cruce de cables en polea baja', '3x12-15|0|60', { tp: ['3011'] }),
      E('A', 'Pull-over en polea alta brazos extendidos', '3x12-15|0|60', { tp: ['3011'] }),
      E('A', 'Elevaciones laterales con mancuernas', '4x15-20|0|45'),
      E('A', 'Pájaro / Elevaciones posteriores inclinado', '4x15-20|0|45|drop'),
      E('B', ['Curl de bíceps en banco inclinado con mancuernas', 'Extensión tríceps tras nuca a 2 manos'], '4x10-12/10-12|0|75|drop', { tp: ['3110', '3110'], n: 'Los dos ejercicios con el brazo en posición elongada: el curl con el codo detrás del torso y la extensión con el codo arriba de la cabeza. Es el biset que más agranda el brazo.' }),
      E('C', 'Crunch abdominal', '3x12-15|1|45'),
      R('M', null, null, null, { fin: FIN.torso })
    ] };

  D.E_M_LB = { short: 'PIERNA B', label: 'Pierna B', title: 'Pierna B · Cadena Posterior y Volumen', wu: 'legs', chips: ['🦵 Pierna', '🎯 Cadena posterior', '🔥 Cierre metabólico'],
    foco: 'Sesión de cadena posterior: el peso muerto rumano es el único patrón axial pesado del día y abre con el sistema nervioso fresco. Después vienen la prensa junto al puente de glúteo a una pierna, el hip thrust con pausa junto al gemelo sentado con mancuerna y, para cerrar, el gemelo a una pierna junto al curl femoral acostado con drop-set. Es el complemento de la sesión de rodilla dominante: acá se acumula volumen de isquios y glúteo con la menor fatiga lumbar posible.',
    filas: [
      E('F', 'Peso muerto rumano', '4x6-8|1|150', { tp: ['3210'], n: 'Cadera atrás, barra pegada a las piernas y pausa de 1 a 2 segundos abajo en el estiramiento máximo. Subí empujando el piso, sin hiperextender la espalda.' }),
      E('B', ['Prensa 45°', 'Puente de glúteo a una pierna'], '3x10-12/10|0-1/0|90', { tp: ['3110', ''], n: 'Prensa con rango completo y puente a una pierna en el piso, al lado de la máquina, con pausa de 1 segundo arriba.' }),
      E('B', ['Hip thrust con barra', 'Elevación de talones sentado con mancuerna'], '3/4x8-10/12-20|0-1/0|120', { tp: ['2012', '2211'], n: 'Pausa de 2 segundos arriba en el hip thrust con el glúteo apretado y las costillas abajo; el gemelo sentado, con la mancuerna sobre la rodilla, va en el mismo banco y con pausa abajo.' }),
      E('B', ['Elevación de talones a una pierna', 'Curl femoral acostado'], '3/4x12-15/10-12|0|75|drop', { tp: ['2211', '3110'], n: 'Cierre de la sesión: gemelo a una pierna sobre un escalón al lado de la máquina y curl femoral acostado con drop-set en la última serie.' }),
      E('C', 'Dead bug', '3x8 por lado|1|45'),
      R('M', null, null, null, { fin: FIN.pierna })
    ] };

  D.E_M_HB = { short: 'HOMBROS Y BRAZOS', label: 'Hombros y Brazos', title: 'Hombros y Brazos · Estética', wu: 'upper', chips: ['💪 Torso', '🎯 Hombros + brazos', '🔥 Cierre metabólico'],
    foco: 'Día de estética para frecuencia 5: el press de hombros sentado abre con el hombro fresco, la elevación lateral en polea va junto al pájaro (deltoide lateral y posterior), las laterales con mancuernas junto a los encogimientos (más volumen lateral y trapecio) y dos bisets de brazos: curl en banco inclinado con extensión sobre la cabeza (los dos músculos estirados) y curl martillo con patada de tríceps. Cargas moderadas, rango completo y mucha intención: es la sesión que más se nota en la manga de la camiseta.',
    filas: [
      E('F', 'Press de hombros sentado', '4x8-10|1|120'),
      E('B', ['Elevaciones laterales en polea baja', 'Pájaro / Elevaciones posteriores inclinado'], '4x12-20/15-20|0-1/0|60', { n: 'Lateral en polea de a un brazo (la cifra es por lado): con la polea el deltoide no descansa abajo. El pájaro con mancuernas livianas va al lado. Codos altos y bajada de 2 segundos.' }),
      E('B', ['Elevaciones laterales con mancuernas', 'Encogimientos de hombros con mancuernas'], '3x15-20/10-15|0|60|drop', { n: 'Más volumen lateral con mancuernas livianas y el trapecio con pausa de 1 segundo arriba.' }),
      E('B', ['Curl de bíceps en banco inclinado con mancuernas', 'Extensión tríceps tras nuca a 2 manos'], '4x10-12/10-12|0|75', { tp: ['3110', '3110'], n: 'Los dos ejercicios con el brazo en posición elongada: el curl con el codo detrás del torso y la extensión con el codo arriba de la cabeza.' }),
      E('B', ['Curl martillo', 'Patada de tríceps con mancuerna'], '3x10-12/12-15|0|60|drop', { n: 'Martillo para el braquial y patada con el codo fijo para el tríceps: cierre de congestión con mancuernas livianas.' }),
      E('C', 'Pallof press', '2x10 por lado|1|45'),
      R('M', null, null, null, { fin: FIN.torso })
    ] };

  /* =========================================================
     MUJERES · Constructor de Glúteos
     ========================================================= */
  D.E_F_GL = { short: 'GLÚTEO A', label: 'Glúteo Pesado', title: 'Glúteo Pesado · Hip Thrust y Estiramiento', wu: 'glute', chips: ['🍑 Glúteo', '🎯 Hip thrust pesado + estiramiento', '🔥 Cierre metabólico'],
    foco: 'Día madre del glúteo: el hip thrust con pausa de 2 segundos arriba es la carga de la semana (máxima tensión con el glúteo acortado), el peso muerto rumano con déficit lo lleva a la posición más estirada con la bisagra de cadera haciendo el trabajo, la sentadilla búlgara con el torso inclinado lo carga estirado de a una pierna y la patada en polea cruzada cierra con tensión constante. Apoyos estables y una sola exposición axial. Cada ejercicio principal va de 3 a 5 series con RIR 0-1: se trabaja cerca del fallo técnico.',
    filas: [
      E('F', 'Hip thrust con barra', '5x6-8|1|150', { tp: ['2012'], n: 'Espalda alta apoyada, mentón al pecho, pies bajo las rodillas y pausa de 2 segundos arriba con el glúteo apretado y las costillas abajo. Es el ejercicio donde más se nota si progresaste: anotá los kilos y no regales la pausa.' }),
      E('H', 'Peso muerto rumano con déficit', '4x6-8|1|150', { tp: ['3210'], n: 'Parada sobre un disco de 3 a 5 cm, cadera hacia atrás y pausa de 2 segundos abajo en el estiramiento máximo del glúteo y los isquios. El rango termina donde la espalda pierde su forma.' }),
      E('H', 'Sentadilla búlgara con torso inclinado', '4x8-10 por lado|1|90', { tp: ['3110'], n: 'Arrancá siempre por la pierna más débil. Torso inclinado unos 30°, bajada de 3 segundos y pausa de 1 segundo abajo con el glúteo estirado: el peso lo lleva la pierna de adelante.' }),
      E('A', 'Patada de glúteo en polea cruzada', '4x12-15 por lado|0|60|drop', { tp: ['3011'], n: 'La polea cruza el cuerpo: llevá la pierna atrás y apenas hacia afuera, sostené 1 segundo apretando el glúteo y volvé lento cruzando la línea media para estirarlo.' }),
      E('A', 'Curl femoral acostado', '4x10-12|0|75'),
      E('B', ['Puente de glúteo a una pierna', 'Abducción caminando con banda'], '3x12 por lado/12 por lado|0|45|drop', { n: 'Cierre de glúteo: el puente a una pierna activa el glúteo mayor con la pelvis estable y la abducción con banda termina de congestionar el glúteo medio. Sin pausa entre las dos.' }),
      E('C', 'Crunch en polea alta', '3x12-15|1|45'),
      R('M', null, null, null, { fin: FIN.glute })
    ] };

  D.E_F_GLQ = { short: 'PIERNA A', label: 'Pierna A', title: 'Pierna A · Glúteos y Cuádriceps', wu: 'glute', chips: ['🍑 Glúteo', '🎯 Hip thrust + hack + búlgara inclinada', '🔥 Cierre metabólico'],
    foco: 'Pierna A del split de 3 días, con el glúteo como prioridad y el cuádriceps como socio: el hip thrust con pausa de 2 segundos arriba es el ancla de carga, el hack squat suma volumen de rodilla dominante con el torso apoyado y cero fatiga lumbar, la sentadilla búlgara con el torso inclinado lleva el glúteo a trabajar estirado y la patada en polea cruzada cierra con tensión constante. El biset de glúteo medio termina de congestionar y el core cierra la sesión. Todo con apoyos estables y RIR 0-1 en las series efectivas.',
    filas: [
      E('F', 'Hip thrust con barra', '5x6-8|1|150', { tp: ['2012'], n: 'Pausa de 2 segundos arriba, costillas abajo y mentón al pecho. Anotá los kilos de cada semana: es tu marcador de progreso.' }),
      E('H', 'Hack squat', '5x8-10|0-1|120', { tp: ['3110'], n: 'Espalda apoyada, pies a media altura y apenas abiertos para repartir el trabajo entre cuádriceps y glúteo. Bajada de 3 segundos hasta donde la pelvis no se despegue del respaldo.' }),
      E('H', 'Sentadilla búlgara con torso inclinado', '4x8-10 por lado|1|90', { tp: ['3110'] }),
      E('A', 'Extensión de cuádriceps', '3x12-15|0|60'),
      E('A', 'Patada de glúteo en polea cruzada', '4x12-15 por lado|0|60|drop', { tp: ['3011'] }),
      E('B', ['Puente de glúteo a una pierna', 'Abducción caminando con banda'], '3x12 por lado/12 por lado|0|45|drop'),
      E('C', 'Crunch en polea alta', '3x12-15|1|45'),
      R('M', null, null, null, { fin: FIN.glute })
    ] };

  D.E_F_TORSO = { short: 'TORSO Y BRAZOS', label: 'Push, Pull y Brazos', title: 'Push, Pull y Brazos · Torso y Brazos', wu: 'upper', chips: ['💪 Torso', '🎯 Espalda + hombros + brazos esculpidos', '🔥 Cierre metabólico'],
    foco: 'Sesión de torso completa y equilibrada: una tracción vertical abre el día, seguida de un press inclinado y dos remos con apoyo para cubrir empuje y tracción en partes iguales. El deltoide lateral y el posterior redondean el hombro, y dos bisets de brazos (curl inclinado con extensión sobre la cabeza, martillo con patada) esculpen el brazo con el músculo elongado. Priorizá la espalda: es el contrapeso del trabajo de pierna y lo que más cambia la silueta. Controlá la bajada y no regales rango.',
    filas: [
      E('F', 'Jalón al pecho con agarre ancho', '4x6-8|1|120', { n: 'Pecho hacia la barra y escápulas hacia abajo antes de tirar. Los codos van hacia las costillas. Es el ejercicio principal del día: cargalo en serio.' }),
      E('H', 'Press inclinado con mancuernas', '3x8-10|0-1|120', { tp: ['3110'] }),
      E('H', 'Remo Pecho Apoyado en banco inclinado', '4x10-12|0-1|90'),
      E('H', 'Remo en polea baja agarre en V', '3x10-12|0-1|90'),
      E('A', 'Elevaciones laterales en polea baja', '4x15-20|0|45'),
      E('A', 'Pájaro / Elevaciones posteriores inclinado', '4x15-20|0|45'),
      E('B', ['Curl de bíceps en banco inclinado con mancuernas', 'Extensión tríceps tras nuca a 2 manos'], '3x10-12/10-12|0|75', { tp: ['3110', '3110'], n: 'Los dos ejercicios con el brazo en posición elongada: es el biset que esculpe el brazo.' }),
      E('B', ['Curl martillo', 'Patada de tríceps con mancuerna'], '3x12-15/12-15|0|60|drop'),
      E('C', 'Elevación de piernas en banco', '3x10-12|1|45'),
      R('M', null, null, null, { fin: FIN.torso })
    ] };

  D.E_F_QUAD = { short: 'PIERNA', label: 'Cuádriceps', title: 'Cuádriceps · Rodilla Dominante', wu: 'legs', chips: ['🦵 Pierna', '🎯 Hack + unilateral + gemelos', '🔥 Cierre metabólico'],
    foco: 'Piernas sólidas con máxima estabilidad: el hack squat de ancla (torso apoyado, cero fatiga lumbar), la sentadilla búlgara para el trabajo unilateral y la extensión y el curl para aislar. Los gemelos reciben volumen con pausa abajo y un biset de step up y talón a una pierna cierra con pierna y pantorrilla sin pausa. Es la sesión con más trabajo de cuádriceps de la semana: llegá con hidratos comidos y ganas.',
    filas: [
      E('F', 'Hack squat', '4x6-8|1|150', { tp: ['3110'], n: 'Espalda apoyada, pies a la altura media de la plataforma y bajada de 3 segundos hasta una flexión profunda. La máquina te da estabilidad externa: usala para cargar fuerte sin pagar con la espalda baja.' }),
      E('H', 'Bulgarian split squat', '3x8-10 por lado|1|90', { tp: ['3110'] }),
      E('A', 'Extensión de cuádriceps', '3x12-15|0|60|drop'),
      E('A', 'Curl femoral acostado', '4x10-12|0|75'),
      E('A', 'Elevación de gemelos de pie', '5x10-15|0|60', { tp: ['2211'] }),
      E('B', ['Step up al cajón', 'Elevación de talones a una pierna'], '3x10 por lado/12|0|60'),
      E('C', 'Dead bug', '3x8 por lado|1|45'),
      R('M', null, null, null, { fin: FIN.pierna })
    ] };

  D.E_F_GLH = { short: 'GLÚTEO + HOMBRO', label: 'Glúteo y Hombros', title: 'Glúteo y Hombros · Frecuencia y Estética', wu: 'glute', chips: ['🍑 Glúteo', '🎯 Glúteo + hombros', '🔥 Cierre metabólico'],
    foco: 'Segunda exposición semanal del glúteo con menos carga axial: hip thrust con pausa, extensión de cadera a 45° con el torso apoyado y patada cruzada en polea, más un bloque de hombros (press sentado, laterales y posteriores) para sumar anchura y proporción. El biset de banda termina de congestionar el glúteo medio. Sesión de volumen y estética: buscá la conexión con cada músculo.',
    filas: [
      E('F', 'Hip thrust con barra', '4x6-8|1|150', { tp: ['2012'] }),
      E('H', 'Hiperextensiones en banco a 45°', '3x10-12|0-1|90', { tp: ['3110'], n: 'Almohadilla bajo las crestas de la cadera y espalda neutra. Bajá hasta sentir el glúteo estirado y subí apretando hasta alinear el cuerpo, sin hiperextender.' }),
      E('H', 'Press de hombros sentado', '3x8-10|1|120'),
      E('A', 'Patada de glúteo en polea cruzada', '3x12-15 por lado|0|60', { tp: ['3011'] }),
      E('A', 'Elevaciones laterales en polea baja', '4x15-20|0|45'),
      E('A', 'Pájaro / Elevaciones posteriores inclinado', '4x15-20|0|45|drop'),
      E('B', ['Puente de glúteo con banda', 'Patada de glúteo con banda'], '3x12/12 por lado|0|45|drop'),
      E('C', 'Hollow body', '3x30s|1|45'),
      R('M', null, null, null, { fin: FIN.gluteB })
    ] };

  D.E_F_GLIS = { short: 'PIERNA B', label: 'Pierna B', title: 'Pierna B · Glúteos e Isquiotibiales', wu: 'glute', chips: ['🍑 Glúteo', '🎯 Cadena posterior en elongación', '🔥 Cierre metabólico'],
    foco: 'Pierna B del split de 3 días, con énfasis en glúteos e isquiotibiales: el peso muerto rumano con déficit abre con la cadena posterior en su máximo estiramiento, el hip thrust con pausa y el curl femoral la cargan en dos longitudes distintas, y la patada cruzada y la abducción cierran con tensión constante. Los gemelos reciben volumen con pausa abajo y una dosis de deltoide lateral cuida la silueta. Cuidá la espalda neutra en cada repetición del rumano: es mejor una repetición menos que una espalda redondeada.',
    filas: [
      E('F', 'Peso muerto rumano con déficit', '5x6-8|1|150', { tp: ['3210'], n: 'Parada sobre un disco de 3 a 5 cm: la cadera se va hacia atrás, las rodillas apenas flexionadas y la barra pegada a las piernas. Bajá hasta el estiramiento máximo, pausa de 2 segundos y subí sin perder la espalda neutra.' }),
      E('H', 'Hip thrust con barra', '4x8-10|0-1|120', { tp: ['2012'], n: 'Pausa de 2 segundos arriba y costillas abajo. Llegás con la cadena posterior ya activada por el rumano: ajustá la carga si el glúteo llega cansado.' }),
      E('H', 'Curl femoral acostado', '4x10-12|0|75', { tp: ['3110'] }),
      E('A', 'Patada de glúteo en polea cruzada', '3x12-15 por lado|0|60', { tp: ['3011'] }),
      E('A', 'Abducción sentado en máquina', '4x15-20|0|60'),
      E('A', 'Elevación de gemelos de pie', '6x10-15|0|60', { tp: ['2211'] }),
      E('A', 'Elevaciones laterales con mancuernas', '4x15-20|0|45'),
      E('B', ['Puente de glúteo con banda', 'Abducción caminando con banda'], '3x12/12 por lado|0|45|drop'),
      E('C', 'Plancha frontal', '3x30-45s|1|45'),
      R('M', null, null, null, { fin: FIN.gluteB })
    ] };

  /* 5 días: dos días de glúteo y cuádriceps DISTINTOS de los del plan de 4 días, más Push, Pull y armonía */
  D.E_F_GL5 = { short: 'GLÚTEO A', label: 'Glúteo y Extensión', title: 'Glúteo y Extensión · Hip Thrust y Cadena Posterior', wu: 'glute', chips: ['🍑 Glúteo', '🎯 Hip thrust + extensión de cadera', '🔥 Cierre metabólico'],
    foco: 'Primer día de glúteo de los tres de la semana: el hip thrust con pausa marca la carga. Después vienen la extensión de cadera a 45° junto a la abducción caminando con banda (glúteo mayor en extensión y glúteo medio), el step up junto a la patada en polea cruzada (trabajo a una pierna y glúteo aislado con tensión constante) y un cierre de puente con banda junto al curl femoral acostado con drop-set. Todo con apoyo estable y sin patrones axiales pesados: la semana tiene otras dos exposiciones de glúteo (el día 3, cuádriceps y glúteo medio; el día 5, glúteo y armonía) y esta recupera mejor.',
    filas: [
      E('F', 'Hip thrust con barra', '4x6-8|1|150', { tp: ['2012'], n: 'Pausa de 2 segundos arriba con el glúteo apretado y las costillas abajo. Con tres días de glúteo por semana, cada sesión tiene un poco menos de series y la misma calidad.' }),
      E('B', ['Hiperextensiones en banco a 45°', 'Abducción caminando con banda'], '3x10-12/12 por lado|0-1/0|75', { tp: ['3110', ''], n: 'Almohadilla bajo las crestas de la cadera y espalda neutra: bajá hasta sentir el glúteo estirado y subí apretando, sin hiperextender. La abducción caminando con banda va al lado, para el glúteo medio.' }),
      E('B', ['Step up al cajón', 'Patada de glúteo en polea cruzada'], '3x8-10/12-15|1/0|90', { tp: ['2110', '3011'], n: 'Cajón alto (la rodilla por encima de la cadera): empujá con el talón de la pierna de arriba, no con la de abajo. La patada en la polea cruza el cuerpo: llevá la pierna atrás y apenas hacia afuera y sostené 1 segundo apretando el glúteo.' }),
      E('B', ['Puente de glúteo con banda', 'Curl femoral acostado'], '3/4x15/10-12|0|60|drop', { tp: ['', '3110'], n: 'Cierre: puente con banda para congestionar el glúteo y curl femoral acostado con drop-set en la última serie. En la ronda que sobra hacés solo el curl.' }),
      E('C', 'Dead bug', '3x8 por lado|1|45'),
      R('M', null, null, null, { fin: FIN.glute })
    ] };

  D.E_F_PUSH = { short: 'PUSH', label: 'Push', title: 'Push · Hombro, Pecho y Tríceps', wu: 'push', chips: ['💪 Empuje', '🎯 Hombro + pecho + tríceps elongado', '🔥 Cierre metabólico'],
    foco: 'Día de empuje con el hombro como prioridad: el press de hombro sentado es el ancla, el press inclinado va junto a la elevación lateral en polea (pecho superior y volumen alto de deltoide lateral), el cruce de poleas desde abajo junto al pájaro (pecho estirado y deltoide posterior) y el tríceps cierra con la extensión sobre la cabeza junto a las flexiones diamante. Sesión corta y densa que no compite con las de pierna: la estética del hombro se construye con volumen y frecuencia.',
    filas: [
      E('F', 'Press de hombros sentado', '4x6-8|1|120', { n: 'Glúteos y abdomen apretados, costillas abajo y la espalda apoyada en el respaldo. Empujá en línea recta; si arqueás la espalda baja, bajá la carga.' }),
      E('B', ['Press inclinado con mancuernas', 'Elevaciones laterales en polea baja'], '3/5x8-10/12-20|0-1|90', { tp: ['3110', ''], n: 'Banco a 30° y, en la polea de al lado, la elevación lateral de a un brazo (la cifra es por lado). En las dos rondas que sobran hacés solo las laterales.' }),
      E('B', ['Cruce de cables en polea baja', 'Pájaro / Elevaciones posteriores inclinado'], '3x12-15/15-20|0|60', { tp: ['3011', ''], n: 'Cruce desde abajo con el pecho estirado y pájaro con mancuernas livianas al lado de la polea.' }),
      E('B', ['Extensión tríceps tras nuca a 2 manos', 'Flexiones diamante'], '4x10-12/10-15|0|75|drop', { n: 'Cierre de tríceps: la extensión sobre la cabeza lo trabaja estirado (porción larga) y las flexiones diamante lo terminan de vaciar. Si no salen, apoyá las rodillas.' }),
      E('C', 'Elevación de piernas en banco', '3x12|1|45'),
      R('M', null, null, null, { fin: FIN.push })
    ] };

  D.E_F_PULL = { short: 'PULL', label: 'Pull', title: 'Pull · Espalda, Posterior y Bíceps', wu: 'pull', chips: ['💪 Tracción', '🎯 Espalda ancha y densa + bíceps', '🔥 Cierre metabólico'],
    foco: 'Día de tracción con apoyo: el remo con el pecho apoyado es el ancla, el jalón va junto al pájaro (dorsal y deltoide posterior), el remo en polea baja junto al curl en banco inclinado (espalda media y bíceps estirado, con el brazo detrás del torso) y el face pull junto al curl martillo (postura y braquial). Tirá con los codos y apretá las escápulas medio segundo: es lo que separa una espalda trabajada de una espalda "mirada".',
    filas: [
      E('F', 'Remo Pecho Apoyado en banco inclinado', '4x6-8|1|120'),
      E('B', ['Jalón al pecho con agarre ancho', 'Pájaro / Elevaciones posteriores inclinado'], '4x8-10/15-20|0-1/0|90', { n: 'Pecho hacia la barra y escápulas abajo antes de tirar; el pájaro con mancuernas livianas va al lado del jalón.' }),
      E('B', ['Remo en polea baja agarre en V', 'Curl de bíceps en banco inclinado con mancuernas'], '3x10-12/10-12|0-1/0|75', { tp: ['', '3110'], n: 'El remo lleva los codos a la cadera; en el curl inclinado el brazo queda detrás del torso y el bíceps trabaja estirado. Bajá en 3 segundos.' }),
      E('B', ['Face Pull con cuerda', 'Curl martillo'], '3x15-20/10-12|0|60|drop', { n: 'Postura y brazo: face pull con codos altos y escápulas juntas, y martillo para el braquial.' }),
      E('C', 'Crunch en polea alta', '3x12-15|1|45'),
      R('M', null, null, null, { fin: FIN.pull })
    ] };

  D.E_F_QUAD5 = { short: 'PIERNA', label: 'Cuádriceps y Glúteo Medio', title: 'Cuádriceps y Glúteo Medio · Prensa y Unilateral', wu: 'legs', chips: ['🦵 Pierna', '🎯 Prensa + búlgara + glúteo medio', '🔥 Cierre metabólico'],
    foco: 'Segunda exposición de glúteo de la semana, con el cuádriceps como protagonista: la prensa es el ancla (pies altos y apenas abiertos), la sentadilla búlgara con el torso inclinado va junto a la extensión a una pierna (glúteo estirado y cuádriceps aislado, corrigiendo diferencias entre lados), el curl femoral acostado junto a la abducción acostada con banda (isquios y glúteo medio) y la zancada lateral junto al gemelo sentado (glúteo medio, aductores y pantorrilla). Pierna armónica: ningún grupo se descuida.',
    filas: [
      E('F', 'Prensa 45°', '4x8-10|1|150', { tp: ['3110'], n: 'Pies altos y apenas abiertos: bajá hasta donde la pelvis no se despegue del respaldo, ese es tu rango útil. La máquina te deja cargar fuerte sin fatiga lumbar.' }),
      E('B', ['Sentadilla búlgara con torso inclinado', 'Extensión de cuádriceps a una pierna'], '3x8-10/12-15|1/0|90', { tp: ['3110', ''], n: 'Torso inclinado unos 30° y pausa de 1 segundo abajo con el glúteo estirado; arrancá por la pierna más débil. La extensión a una pierna va en la máquina de al lado.' }),
      E('B', ['Curl femoral acostado', 'Abducción de cadera acostada con banda'], '3x10-12/15-20|0|60', { tp: ['3110', ''], n: 'Curl con bajada de 3 segundos y abducción con banda en el piso, al lado de la máquina: de costado, pierna de arriba estirada y apenas hacia atrás.' }),
      E('B', ['Zancada lateral', 'Elevación de talones sentado'], '3/6x10/12-20|0|60', { tp: ['', '2211'], n: 'Zancada lateral con mancuerna para el glúteo medio y los aductores, de a un lado por vez, y gemelo sentado con pausa abajo. En las rondas que sobran hacés solo el gemelo.' }),
      E('C', 'Hollow body', '2x30s|1|45'),
      R('M', null, null, null, { fin: FIN.pierna })
    ] };

  D.E_F_ARM = { short: 'GLÚTEO C', label: 'Glúteo y Armonía', title: 'Glúteo y Armonía · Volumen, Espalda y Brazos', wu: 'glute', chips: ['🍑 Glúteo', '🎯 Volumen + espalda + brazos', '🔥 Cierre metabólico'],
    foco: 'Tercera sesión de glúteo de la semana, pensada para volumen con tensión limpia: el hip thrust a una pierna con pausa es el ancla, el peso muerto rumano con déficit liviano va junto a la patada con mancuerna (glúteo estirado y acortado), la abducción en máquina junto a las elevaciones laterales (glúteo medio y hombro) y el jalón con agarre estrecho junto al curl martillo, que dan la segunda exposición semanal a la espalda y al brazo. Acá no se busca la carga máxima sino la conexión con el glúteo en cada repetición.',
    filas: [
      E('F', 'Hip thrust a una pierna', '4x8-10 por lado|0-1|90', { tp: ['2012'], n: 'Una pierna por vez, pelvis cuadrada y pausa de 2 segundos arriba. Arrancá por la pierna más débil y que la otra copie el mismo número de repeticiones.' }),
      E('B', ['Peso muerto rumano con déficit', 'Patada de glúteo en cuadrupedia con mancuerna'], '3x8-10/12-15|1/0|120', { tp: ['3210', ''], n: 'Con mancuernas o barra liviana y sobre un disco de 3 a 5 cm: bajá lento hasta el estiramiento máximo y pausa de 2 segundos abajo. La patada, con la mancuerna en el hueco de la rodilla, va en el piso al lado.' }),
      E('B', ['Abducción sentado en máquina', 'Elevaciones laterales con mancuernas'], '3/4x15-20/15-20|0|60', { n: 'Glúteo medio en la máquina y deltoide lateral con mancuernas livianas al lado. En la ronda que sobra hacés solo las laterales.' }),
      E('B', ['Jalón al pecho con agarre estrecho', 'Curl martillo'], '3x10-12/12-15|0-1/0|75|drop', { n: 'Espalda y brazo: jalón con los codos hacia las costillas y pausa abajo, y martillo con drop-set en la última serie.' }),
      E('C', 'Plancha frontal', '3x30-45s|1|45'),
      R('M', null, null, null, { fin: FIN.gluteB })
    ] };

  /* ---------- matriz: el nivel avanzado toma estas sesiones (ESTR.diasA), con su propio nombre de estructura ---------- */
  function ponerElite(g, f, dias, est, res){
    PB.ESTR.forEach(function(e){ if(e.g === g && e.f === f){ e.diasA = dias; e.estA = est; e.resA = res; } });
  }
  ponerElite('m', 3, ['E_M_PUSH', 'E_M_PULL', 'E_M_LEG3'], 'Push / Pull / Pierna completa', 'Split analítico de tres días de nivel élite: Push (pecho, hombro lateral y tríceps elongado), Pull (espalda ancha y densa, deltoide posterior y bíceps elongado) y Pierna completa (hack, cadena posterior, gemelos y una segunda dosis de hombro lateral y brazos). Cada grupo se entrena una vez por semana con volumen alto, apoyos estables y una sola exposición axial pesada por día. Todas las sesiones llevan entrada en calor específica, un ancla pesada, compuestos, aislamientos, bisets de cierre, core y finisher metabólico.');
  ponerElite('m', 4, ['E_M_TA', 'E_M_LA', 'E_M_TB', 'E_M_LB'], 'Torso / Pierna x2', 'Torso / Pierna dos veces por semana de nivel élite: Torso A (fuerza de empuje y tracción) y Torso B (hipertrofia por estiramiento), Pierna A (cuádriceps y gemelos) y Pierna B (cadena posterior). Cada grupo en frecuencia 2, el hombro lateral en frecuencia 3 y una sola exposición axial pesada por día. Todas las sesiones cierran con biset, core y finisher metabólico.');
  ponerElite('m', 5, ['E_M_PUSH', 'E_M_PULL', 'E_M_LA', 'E_M_HB', 'E_M_LB'], 'Push / Pull / Pierna A / Hombros y Brazos / Pierna B', 'Cinco sesiones de élite para la estética "super jacked": Push, Pull, una pierna de cuádriceps, un día dedicado a hombros y brazos (lateral y posterior con volumen alto, brazos con trabajo elongado) y una pierna de cadena posterior. Frecuencia 2 por grupo y 3 para el deltoide lateral, con apoyos estables y poca fatiga axial.');
  ponerElite('f', 3, ['E_F_GLQ', 'E_F_TORSO', 'E_F_GLIS'], 'Pierna A · Push, Pull y Brazos · Pierna B', 'Split de tres días de nivel élite con prioridad en el glúteo (Constructor de Glúteos): Pierna A (glúteos y cuádriceps), Push, Pull y Brazos (torso completo con brazos esculpidos) y Pierna B (glúteos e isquiotibiales). Hipertrofia por estiramiento (rumano con déficit, búlgara con el torso inclinado), hip thrust con pausa y patada en polea cruzada, con apoyos estables y una sola exposición axial por día. Todas con entrada en calor específica, un ancla pesada, compuestos, aislamientos, bisets de cierre, core y finisher metabólico. Volumen semanal en series efectivas (élite): glúteo 36 (el techo del rango), cuádriceps 8, isquiotibiales 9, gemelo 6, espalda 11, hombro lateral 8 y bíceps y tríceps 6 cada uno.');
  ponerElite('f', 4, ['E_F_GL', 'E_F_TORSO', 'E_F_QUAD', 'E_F_GLH'], 'Glúteo · Torso y Brazos · Cuádriceps · Glúteo y Hombros', 'Cuatro sesiones de élite: glúteo pesado con hip thrust y estiramiento, torso con brazos esculpidos, una sesión de cuádriceps con máquinas estables y una segunda de glúteo con hombros. El glúteo en frecuencia 2 con la mayor parte del volumen en el tren inferior, sin descuidar espalda, hombros y brazos. Volumen semanal en series efectivas (élite): glúteo 35, cuádriceps 13, isquiotibiales 12, gemelo 8, espalda 11, hombro lateral 8 y bíceps y tríceps 6 cada uno.');
  ponerElite('f', 5, ['E_F_GL5', 'E_F_PUSH', 'E_F_QUAD5', 'E_F_PULL', 'E_F_ARM'], 'Glúteo · Push · Cuádriceps · Pull · Glúteo y Armonía', 'Cinco sesiones de élite con el glúteo en frecuencia 3 a baja fatiga por sesión: glúteo y extensión de cadera, Push (hombro prioritario), cuádriceps y glúteo medio con prensa y búlgara, Pull (espalda y bíceps elongado) y una última de glúteo con volumen, espalda y brazos. Ningún día repite el contenido del plan de cuatro días y cada biset junta dos estaciones vecinas. Volumen semanal en series efectivas (élite): glúteo 32, cuádriceps 13, isquiotibiales 10, gemelo 6, espalda 14, hombro lateral 9, hombro posterior 10, bíceps 9, tríceps 8 y core 14.');
})();
