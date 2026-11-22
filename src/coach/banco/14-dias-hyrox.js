/* =========================================================
   PLANTILLAS BASE COACH JP · sesiones Hyrox
   Misma estructura que Bodybuilding (entrada en calor · F principal · H compuestos · A aislamientos · B de cierre · C core) más los bloques propios de la carrera:
   carrera / intervalos (K) y estaciones o transporte bajo fatiga (M). Tres niveles: lv 0 Desarrollo (intermedio) · 1 Avanzado · 2 Pro; c.f = mujer.
   Cada función devuelve la sesión ya redactada como texto de "Redacción libre" (la consume el módulo de deportes del Banco).
   Las líneas de cardio no llevan "NxM" ni "N series" (el importador las convertiría en una dosis de fuerza): se escriben con palabras.
   ========================================================= */
(function(){
  'use strict';
  var PB = window.__jpPB; if(!PB) return;
  var R = PB.R;
  var NUM = ['cero', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];
  function w(n){ return NUM[n] != null ? NUM[n] : String(n); }
  function P(c, arr){ return arr[Math.min(c.lv, arr.length - 1)]; }
  function nivDe(c){ return c.lv === 0 ? 'intermedio' : (c.lv === 1 ? 'avanzado' : 'pro'); }
  function cargas(c){ return { farmer: c.f ? '16 a 24 kg en cada mano' : '24 a 32 kg en cada mano', bolsa: c.f ? '10-20 kg' : '20-30 kg', wall: c.f ? '4-6 kg' : '6-9 kg' }; }
  function Fin(tag, t, min, l, obj, tips){ return { tag: tag, t: t, i: { min: min, l: l }, obj: obj, tips: tips }; }

  var HX = {};

  /* ---------- A · Piernas pesadas + intervalos de umbral + estaciones de empuje y tracción ---------- */
  HX.A = function(c){
    var n = P(c, [4, 5, 6]), t = P(c, ['5 min', '5 min', '6 min']), pausa = P(c, ['90 segundos', '90 segundos', '75 segundos']), rr = P(c, [3, 4, 5]), esf = P(c, ['7 sobre 10', '7 a 8 sobre 10', '8 sobre 10']);
    return { titulo: 'Piernas Pesadas, Umbral y Estaciones', nombre: 'Piernas & Umbral', wu: 'run',
      foco: 'Día de calidad de piernas y carrera: arrancás con una sentadilla pesada para construir la fuerza que después empuja el trineo y sostiene las zancadas con bolsa, seguís con volumen de pierna y cerrás con intervalos de carrera al ritmo de umbral y estaciones de empuje y tracción. Es el día más duro de la semana: llegá descansado, comé antes de entrenar y no te guardes nada en la sentadilla ni en los intervalos.',
      filas: [
        R('F', 'Sentadilla con barra', '4x5-6|2|180', '5x4-5|1|210', { p: '5x3-5|1|240', n: 'La sentadilla es la base de todo lo que pasa en una carrera Hyrox: empuje de trineo, zancadas con bolsa y wall balls. Pesada y rápida, sin dejarte sin piernas para los intervalos que vienen después.' }),
        R('H', 'Zancadas caminando', '3x8 por lado|1|90', '4x8 por lado|0-1|90', { p: '4x10 por lado|0-1|90', n: 'Es el patrón de la estación de zancadas con bolsa: paso largo, torso erguido y la rodilla de atrás cerca del piso. Con mancuernas o barra, la carga más alta con la que mantengas la técnica.' }),
        (c.f ? R('A', 'Hip thrust con barra', '3x8-10|1|120', '4x8-10|0-1|120', { tp: ['2012'], n: 'Pausa de 2 segundos arriba, costillas abajo y mentón al pecho. El glúteo es el motor de la zancada con bolsa, del empuje de trineo y de la subida después de cada estación: acá se carga con peso serio y poca fatiga axial.' }) : R('A', 'Curl femoral acostado', '3x10-12|1|75', '4x10-12|0|75|drop')),
        (c.f ? R('A', 'Patada de glúteo en polea cruzada', '3x12-15 por lado|1|60', '4x12-15 por lado|0|45|drop', { tp: ['3011'] }) : null),
        R('A', 'Elevación de gemelos de pie', '4x10-15|1|60', '5x10-15|0|60'),
        R('B', ['Curl nórdico', 'Elevación de talones a una pierna'], '3x5/12|2|75', '3x6/12|1|75', { n: 'Resiliencia de isquios y pantorrilla: son las dos zonas que primero se quejan cuando suma el volumen de carrera. En el nórdico bajá lento (cinco segundos) y ayudate con las manos para subir.' }),
        R('C', ['Crunch en polea alta', 'Pallof press'], '3x12/10 por lado|1|45', '3x15/12 por lado|0|45'),
        R('K', null, null, null, { fin: Fin('CARDIO', 'Cardio · Intervalos de umbral en cinta', 6 * n,
          [w(n).charAt(0).toUpperCase() + w(n).slice(1) + ' intervalos de ' + t + ' en la cinta al ritmo de umbral (esfuerzo ' + esf + ')',
           'Trote muy suave de ' + pausa + ' entre cada intervalo',
           'Los primeros 30 segundos de cada intervalo un poco más suaves para entrar en ritmo'],
          'Los intervalos al ritmo de umbral mejoran el ritmo que podés sostener durante los ocho kilómetros de una carrera Hyrox: es la velocidad a la que el cuerpo todavía recicla lo que produce.',
          ['POR QUÉ ESTÁ ACÁ: es la sesión de calidad de carrera de la semana. Se hace después de la fuerza a propósito: en la carrera vas a correr con las piernas cargadas.',
           'RITMO: todos los intervalos tienen que parecerse. Si el último es más rápido que el primero, arrancaste muy suave; si es mucho más lento, arrancaste muy fuerte.',
           'RESPIRACIÓN: exigente pero controlada. Tenés que poder decir frases cortas, no conversar.',
           'PAUSA: trote muy suave o caminata, nunca parado. Mantené las piernas en movimiento.',
           'SENSACIÓN OBJETIVO: te cuesta, pero sentís que podrías repetirlo una vez más. Eso es el umbral.']) }),
        R('M', null, null, null, { fin: Fin('FINISHER', 'Estaciones de empuje y tracción bajo fatiga', 6 * rr,
          [w(rr).charAt(0).toUpperCase() + w(rr).slice(1) + ' rondas: sin pausa entre estaciones y 90 segundos de descanso al cerrar cada ronda',
           '- Sled push / Trineo x 25 m',
           '- Arrastre de trineo x 25 m',
           '- Ski erg x 250 m a ritmo de carrera'],
          'Simulás la fatiga acumulada de la carrera: empuje, tracción y ski erg encadenados con poca pausa entrenan la eficiencia mecánica cuando las piernas y la espalda ya están cansadas.',
          ['POR QUÉ ESTÁ ACÁ: en Hyrox las estaciones llegan siempre con cansancio encima. Acá aprendés a empujar y tirar bien cuando ya estás cansado.',
           'TRINEO: torso inclinado, brazos estirados y pasos cortos y rápidos. La carga es la que te deja a esfuerzo 8 sobre 10 en la última pasada.',
           'ARRASTRE: tirá con las piernas y la espalda, no con los brazos. Los brazos son la última palanca.',
           'SKI ERG: tirá con la cadera y la espalda; los brazos acompañan al final.',
           'SENSACIÓN OBJETIVO: piernas llenas, pulso alto y técnica limpia hasta el último metro.']) })
      ].filter(Boolean) };
  };

  /* ---------- B · Fuerza de tracción y empuje + transporte pesado ---------- */
  HX.B = function(c){
    var k = cargas(c), rr = P(c, [3, 4, 5]);
    return { titulo: 'Fuerza de Torso y Transporte', nombre: 'Fuerza & Transporte', wu: 'upper',
      foco: 'Día de fuerza: peso muerto con trap bar pesado, empuje y tracción de torso con carga seria, un biset de resistencia de fuerza y un circuito de transporte con bolsa y farmer carry. Es la sesión que sostiene las cargas de las estaciones: sin fuerza de base, el trineo y los transportes te cuestan el doble. Pesado, prolijo y sin apuro.',
      filas: [
        R('F', 'Peso muerto con trap bar', '4x5|2|180', '5x4|1|210', { p: '5x3-4|1|240', n: 'Empujá el piso con las piernas antes de mover la barra, pecho alto y barra pegada al cuerpo. Es el ejercicio que más fuerza total te da para el trineo y los transportes.' }),
        R('H', 'Press militar de pie', '3x6-8|2|120', '4x6-8|1|150', { p: '4x5-7|1|150', n: 'La fuerza de empuje vertical es la que más usás en los wall balls. Glúteos y abdomen apretados, sin arquear la espalda baja.' }),
        R('H', 'Remo con barra inclinado', '4x6-8|2|150', '4x6-8|1|150'),
        R('H', 'Jalón al pecho con agarre ancho', '3x8-10|1|90', '4x6-8|1|120', { ea: 'Dominadas lastradas' }),
        R('A', 'Elevaciones laterales con mancuernas', '3x12-15|1|60', '4x15|0|45|drop'),
        (c.f ? R('A', 'Puente de glúteo a una pierna', '3x10 por lado|1|60', '4x12 por lado|0|60', { n: 'Glúteo a una pierna y con la pelvis cuadrada: sostiene el peso muerto y el transporte sin sumar fatiga axial en un día de torso.' }) : null),
        R('B', ['Flexiones de brazos', 'Remo invertido / Australian Pull-up'], '3x12-15/10-12|2|60', '4x15-20/12-15|1|60', { n: 'Resistencia de fuerza de torso: empuje y tracción sin pausa entre las dos. Son los patrones del ski erg, el remo y las estaciones de empuje.' }),
        R('C', ['Rueda abdominal', 'Plancha lateral'], '3x8/30s|1|45', '3x10/40s|0|45'),
        R('M', null, null, null, { fin: Fin('FINISHER', 'Transporte pesado y agarre', 6 * rr,
          [w(rr).charAt(0).toUpperCase() + w(rr).slice(1) + ' rondas: sin pausa entre estaciones y 90 segundos de descanso al cerrar cada ronda',
           '- Farmer carry x 40 m con ' + k.farmer,
           '- Zancadas con bolsa de arena x 20 m con ' + k.bolsa,
           '- SkiErg x 30 s a ritmo fuerte'],
          'Agarre, estabilidad del tronco y piernas bajo carga: las estaciones de transporte y de zancadas con bolsa se limitan más por el agarre y la postura que por el cardio, así que se entrenan con el cansancio ya presente.',
          ['POR QUÉ ESTÁ ACÁ: el agarre y el tronco son lo primero que se rompe en una carrera Hyrox. Acá se entrenan con cargas reales y con cansancio.',
           'CARGA DE ENTRENAMIENTO: farmer carry con ' + k.farmer + ' y bolsa de ' + k.bolsa + '; ajustá para llegar a esfuerzo 8 sobre 10 sin romper la postura.',
           'POSTURA: costillas abajo y hombros atrás. Si el tronco se inclina, bajá la carga.',
           'ZANCADAS CON BOLSA: bolsa al hombro o al pecho, paso largo y rodilla trasera cerca del piso.',
           'SENSACIÓN OBJETIVO: antebrazos ardiendo, piernas pesadas y la respiración al límite pero controlada.']) })
      ].filter(Boolean) };
  };

  /* ---------- C · Simulación de carrera (carrera comprometida) ---------- */
  HX.C = function(c){
    var k = cargas(c), rr = P(c, [3, 4, 5]), run = P(c, ['800 m', '1000 m', '1000 m']), bbj = P(c, ['20 m', '30 m', '30 m']), pausa = P(c, ['2 minutos', '2 minutos', '90 segundos']);
    var tandas = P(c, [3, 4, 4]), reps = P(c, [15, 20, 25]);
    return { titulo: 'Simulación de Carrera', nombre: 'Simulación de carrera', wu: 'run',
      foco: 'Día de simulación parcial de la carrera: fuerza de torso para no perder el empuje, y después un circuito de carrera, trineo, burpees con salto largo y remo con la pausa corta de una competencia, más wall balls al cierre. Es el día que más se parece al día de la carrera: corrés con las piernas ya cargadas y practicás pasar de una estación a la otra sin frenar. Las piernas se guardan: hoy no hay fuerza pesada de pierna.',
      filas: [
        R('F', 'Press militar de pie', '3x6-8|2|120', '4x5-7|1|150', { p: '4x5|1|150', n: 'Hoy la fuerza es de torso a propósito: las piernas se guardan para el circuito. Pesado pero fresco, sin llegar al límite.' }),
        R('H', 'Remo unilateral a una mano', '3x10-12|1|90', '4x8-10|0-1|90'),
        R('A', 'Face Pull con cuerda', '3x15|1|45', '4x15-20|0|45|drop'),
        R('B', ['Elevaciones laterales con mancuernas', 'Pájaro / Elevaciones posteriores inclinado'], '3x12-15/15|1|45', '4x15/15-20|0|45|drop'),
        R('C', ['Dead bug', 'Plancha lateral'], '3x8 por lado/30s|1|45', '3x10 por lado/40s|0|45'),
        R('K', null, null, null, { fin: Fin('CARDIO', 'Cardio · Circuito de simulación con carrera comprometida', P(c, [30, 36, 40]),
          [w(tandas).charAt(0).toUpperCase() + w(tandas).slice(1) + ' rondas con pausa de ' + pausa + ' al cerrar cada una',
           '- Carrera en cinta x ' + run + ' a ritmo de carrera (esfuerzo 7 sobre 10)',
           '- Sled push / Trineo x 25 m',
           '- Burpee con salto largo x ' + bbj,
           '- Remo ergómetro x 500 m a ritmo de carrera'],
          'Correr con la fatiga de las estaciones es lo que más se parece a la carrera: entrenás a sostener el ritmo con las piernas cargadas y a pasar de una estación al trote sin frenar ni perder la respiración.',
          ['POR QUÉ ESTÁ ACÁ: es el ensayo general de la semana. Si hay una carrera en el calendario, este es el bloque que más te prepara.',
           'RITMO: arrancá a esfuerzo 7 desde la primera ronda. Si la última ronda es más de 5% más lenta que la primera, la anterior fue demasiado fuerte.',
           'TRANSICIÓN: bajate del trineo y ya estás corriendo. Practicá no detenerte entre estaciones.',
           'REMO: 500 m a ritmo de carrera, 28 a 30 paladas por minuto, piernas primero.',
           'BURPEE CON SALTO LARGO: pecho al piso y salto largo; ritmo parejo, sin explotar al principio.',
           'SENSACIÓN OBJETIVO: pulso alto desde la segunda ronda, piernas pesadas y la cabeza fría. Eso es una carrera.']) }),
        R('M', null, null, null, { fin: Fin('FINISHER', 'Wall balls al cierre', P(c, [8, 10, 10]),
          [w(tandas).charAt(0).toUpperCase() + w(tandas).slice(1) + ' tandas de ' + reps + ' wall balls con ' + k.wall + '; 90 segundos de pausa entre tandas',
           'Cortá cada tanda en bloques de 8 a 10 repeticiones con 5 segundos de pausa para no llegar al fallo'],
          'Estación con alto componente de sentadilla y press repetidos: entrenás la resistencia de fuerza de piernas y hombros con la fatiga del circuito ya encima, tal cual es en la carrera.',
          ['CARGA: ' + k.wall + ' según tu categoría. Bajá a sentadilla completa y lanzá siempre a la altura marcada.',
           'RITMO: tandas cortas con respiración controlada. El fallo en wall balls cuesta más tiempo que una pausa corta.',
           'SENSACIÓN OBJETIVO: hombros y piernas quemando, pulso alto y técnica estable hasta la última repetición.']) })
      ] };
  };

  /* ---------- D · Base aeróbica + fuerza de torso ---------- */
  HX.D = function(c){
    var min = P(c, [35, 45, 50]), rr = P(c, [4, 5, 6]);
    return { titulo: 'Base Aeróbica y Fuerza de Torso', nombre: 'Base aeróbica & Torso', wu: 'upper',
      foco: 'Día de volumen aeróbico a baja intensidad (zona 2) con fuerza de torso y técnica de remo y ski erg. Es la sesión que construye la capacidad de recuperar entre esfuerzos: la base aeróbica es lo que te deja repetir kilómetros y estaciones sin caerte. No es un día para competir contigo: el ritmo es conversacional y el aporte está en la constancia.',
      filas: [
        R('F', 'Press de banca plano con barra', '4x5-6|2|180', '5x4-6|1|210', { p: '5x3-5|1|210', n: 'Fuerza de empuje para el trineo y los wall balls. Pesado y controlado: la sesión sigue después con carrera suave, así que no se llega al límite.' }),
        R('H', 'Press inclinado con mancuernas', '3x8-10|1|120', '4x8-10|0-1|120'),
        R('H', 'Jalón al pecho con agarre estrecho', '3x8-12|1|90', '4x6-8|1|120', { ea: 'Dominadas lastradas' }),
        R('A', 'Elevaciones laterales en polea baja', '3x12-15|1|45', '4x15-20|0|45|drop'),
        R('B', ['Curl martillo', 'Patada de tríceps con mancuerna'], '3x10-12/12-15|1|60', '3x10-12/12-15|0|60|drop'),
        R('C', ['Elevación de piernas colgado', 'Plancha lateral'], '3x8/30s|1|45', '3x10/40s|0|45'),
        R('K', null, null, null, { fin: Fin('CARDIO', 'Cardio · Zona 2 de carrera', min,
          [min + ' min Carrera suave'],
          'Trabajo aeróbico a baja intensidad: aumenta la densidad de mitocondrias y la capacidad de usar grasa como combustible con poco costo de recuperación. Es la base sobre la que se apoyan los días de calidad.',
          ['POR QUÉ ESTÁ ACÁ: sin una base aeróbica amplia, los intervalos y las simulaciones te rompen. Acá se construye la base.',
           'INTENSIDAD: tenés que poder hablar frases completas. Si no podés, bajá el ritmo: el objetivo es la constancia, no la velocidad.',
           'ALTERNATIVA: bicicleta o elíptica a ritmo conversacional por el mismo tiempo si tus tobillos o rodillas piden descanso.',
           'SENSACIÓN OBJETIVO: terminar con ganas de seguir y con las piernas livianas.']) }),
        R('M', null, null, null, { fin: Fin('FINISHER', 'Técnica de remo y ski erg', 6 * rr,
          [w(rr).charAt(0).toUpperCase() + w(rr).slice(1) + ' rondas: sin pausa entre las dos estaciones y 75 segundos de descanso al cerrar cada ronda',
           '- Remo ergómetro x 500 m a ritmo cómodo',
           '- Ski erg x 250 m a ritmo cómodo'],
          'La técnica eficiente en los ergómetros ahorra energía en la carrera. Practicarla a intensidad moderada consolida el patrón sin sumar fatiga a la sesión de fuerza.',
          ['POR QUÉ ESTÁ ACÁ: en la carrera el remo y el ski erg llegan con el cuerpo cansado. Una técnica limpia te ahorra tiempo y energía.',
           'REMO: piernas, espalda y brazos, en ese orden; cadencia de 24 a 26 paladas por minuto.',
           'SKI ERG: tirá con la cadera y la espalda; los brazos acompañan al final.',
           'SENSACIÓN OBJETIVO: fluido y económico. Si tenés que forzar, estás yendo demasiado rápido.']) })
      ] };
  };

  /* ---------- E · Durabilidad: fuerza-resistencia bajo fatiga acumulada ---------- */
  HX.E = function(c){
    var k = cargas(c), rr = P(c, [3, 4, 5]), reps = P(c, [15, 20, 25]);
    return { titulo: 'Durabilidad: Fuerza-resistencia Bajo Fatiga', nombre: 'Durabilidad', wu: 'run',
      foco: 'Día de durabilidad: fuerza de cadena posterior y unilateral para sostener las piernas, y después dos circuitos de estaciones con pausa corta (wall balls, zancadas con bolsa y burpees; luego transporte, trineo y ski erg). Entrena a mantener la calidad técnica cuando la fatiga ya es alta. En la carrera nadie se cae por falta de ganas: se cae por técnica que se rompe. Acá se practica no romperla.',
      filas: [
        R('F', 'Peso muerto rumano', '4x6-8|2|150', '4x5-6|1|180', { p: '5x4-6|1|180', n: 'Cadera atrás, espalda neutra y barra pegada al muslo. Es la cadena posterior la que te sostiene en los kilómetros finales: cargala en serio.' }),
        R('H', 'Bulgarian split squat', '3x8-10|1|90', '4x8-10|0-1|90', { n: 'Unilateral: arrancá por la pierna más débil. El paso largo y el torso levemente inclinado cargan el glúteo, que es lo que más empuja el trineo.' }),
        R('H', 'Hip thrust con barra', '3x8-10|1|120', '4x8-10|0-1|120'),
        R('A', 'Extensión de cuádriceps', '3x12-15|1|60', '4x12-15|0|60|drop'),
        R('B', ['Abducción con banda (monster walk)', 'Puente de glúteo a una pierna'], '3x12 por lado/10 por lado|1|45', '4x15 por lado/10 por lado|0|45'),
        R('C', ['Hollow body', 'Bird dog'], '3x20s/8 por lado|1|45', '3x30s/10 por lado|0|45'),
        R('K', null, null, null, { fin: Fin('CARDIO', 'Tríset A · Wall balls, bolsa y burpees', 8 * rr,
          [w(rr).charAt(0).toUpperCase() + w(rr).slice(1) + ' rondas: sin pausa entre estaciones y 2 minutos de descanso al cerrar cada ronda',
           '- Wall balls x ' + reps + ' repeticiones con ' + k.wall,
           '- Zancadas con bolsa de arena x 20 m con ' + k.bolsa,
           '- Burpees x 10 repeticiones'],
          'Estaciones de piernas y hombros encadenadas con poca pausa: la durabilidad, o sea mantener el rendimiento cuando la fatiga crece, se entrena acumulando fatiga con calidad.',
          ['POR QUÉ ESTÁ ACÁ: es la primera mitad del trabajo de estaciones bajo fatiga. Se entrena la técnica con las piernas y los hombros ya cargados.',
           'CARGA: wall balls con ' + k.wall + ' y bolsa de ' + k.bolsa + '. Ajustá para llegar al final de las rondas sin romper la técnica.',
           'ZANCADAS CON BOLSA: paso largo, torso erguido y rodilla trasera cerca del piso.',
           'GESTIÓN DE LA FATIGA: si la técnica se rompe, cortá la serie. En la semana de descarga reducí las rondas a la mitad.',
           'SENSACIÓN OBJETIVO: piernas y hombros quemando, respiración alta y la técnica intacta.']) }),
        R('M', null, null, null, { fin: Fin('FINISHER', 'Tríset B · Transporte, trineo y ski erg', 8 * rr,
          [w(rr).charAt(0).toUpperCase() + w(rr).slice(1) + ' rondas: sin pausa entre estaciones y 2 minutos de descanso al cerrar cada ronda',
           '- Farmer carry x 40 m con ' + k.farmer,
           '- Arrastre de trineo x 25 m',
           '- Ski erg x 250 m a ritmo de carrera'],
          'Agarre, tracción y ski erg encadenados: la espalda y el agarre ya están cansados justo cuando la carrera real exige sostener la postura.',
          ['POR QUÉ ESTÁ ACÁ: es la segunda mitad del trabajo bajo fatiga: transporte, tracción y ski erg, con el agarre ya trabajado.',
           'FARMER CARRY: con ' + k.farmer + ', hombros atrás y costillas abajo.',
           'ARRASTRE: tirá con las piernas y la espalda.',
           'SENSACIÓN OBJETIVO: antebrazos y espalda ardiendo, pulso alto y técnica limpia en cada estación.']) })
      ] };
  };

  /* texto de la sesión en el formato de Redacción libre del importador (n = número de día) */
  function texto(def, c, n){
    var niv = nivDe(c), av = niv !== 'intermedio';
    var T = ['=== DÍA ' + n + ': ' + def.titulo + ' ===', '[NOMBRE DEL DÍA] ' + def.nombre, '[FOCO DEL COACH] ' + def.foco];
    T.push(PB.textoWarmup(1, def.wu, def.nombre));
    var k = 2, primero = true;
    def.filas.filter(function(r){ return !(r.soloA && !av) && !(r.soloI && av); }).forEach(function(r){
      var b = PB.textoBloque(k, r, niv, primero && r.rol === 'F');
      if(r.rol === 'F') primero = false;
      T.push(b.txt); k++;
    });
    return T.join('\n');
  }
  /* sesión lista para el módulo de deportes: { titulo, nombre, foco, texto(n) } */
  /* mujeres: el glúteo entra con series directas en los días de pierna y de torso (en la carrera es el motor de zancadas, trineo y subida) */
  var FOCO_F = {
    A: 'Mujeres: el hip thrust y la patada de glúteo en polea reemplazan al curl femoral (los isquios quedan cubiertos por el curl nórdico), para sumar glúteo directo sin acumular fatiga de pierna antes de los intervalos.',
    B: 'Mujeres: un puente de glúteo a una pierna suma glúteo directo en el día de torso, sin fatiga axial extra.'
  };
  PB.hyroxSesion = function(clave, c){
    var def = HX[clave](c);
    if(c && c.f && FOCO_F[clave]) def.foco += ' ' + FOCO_F[clave];
    return { titulo: def.titulo, nombre: def.nombre, foco: def.foco, texto: function(n){ return texto(def, c, n); }, def: def };
  };
  PB.hyroxClaves = Object.keys(HX);
})();
