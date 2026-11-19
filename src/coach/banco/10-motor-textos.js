/* =========================================================
   PLANTILLAS BASE COACH JP · ESTÁNDAR 2026
   Matriz completa: 2 niveles (Desarrollo-Intermedio · Avanzado / Élite) x 2 géneros x 3 frecuencias (3 / 4 / 5 días).
   Cada sesión se escribe como texto de "Redacción libre" (el mismo formato que produce el generador de IA) y pasa por el importador del Builder:
   así los bloques son idénticos a los de cualquier sesión actual (video vinculado solo, dosis en líneas, tempo en tips, RIR, descansos).
   Los kilos salen de los 1RM de la ficha del alumno/a al asignar; la ondulación S2-S4 se proyecta sola.
   ========================================================= */
(function(){
  'use strict';
  function nzz(s){ return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }

  /* ---------- base de conocimiento por patrón: objetivo + set-up + cue + cuidado + tempo ---------- */
  var KB = {
    press_h:  { o: 'Cargás pectoral, deltoide anterior y tríceps con la carga más alta de la semana: tu cuerpo recluta las fibras grandes y fuertes, que son las que más crecen.', s: 'Escápulas juntas y hacia abajo, pies firmes en el piso y la barra sobre la línea del pecho.', c: 'Bajá controlado hasta rozar el pecho y empujá como si te alejaras del banco.', x: 'No rebotes ni despegues la cadera del banco; si el hombro molesta, cerrá un poco el agarre.', t: '3010' },
    press_inc:{ o: 'Trabajás la porción superior del pecho y el deltoide anterior con el brazo en un ángulo que estira bien el músculo bajo carga.', s: 'Banco a 30°, mancuernas a la altura del pecho y escápulas apoyadas.', c: 'Empujá hacia arriba y un poco hacia adentro, sin chocar las mancuernas.', x: 'No subas el banco más de 30-35°: el hombro toma el trabajo y el pecho se apaga.', t: '3110' },
    aper:     { o: 'Llevás el pectoral a posición estirada, donde recibe más tensión mecánica con poca carga y poco estrés articular.', s: 'Pecho afuera, escápulas fijas y codos apenas flexionados durante todo el recorrido.', c: 'Abrí hasta sentir el estiramiento del pecho y cerrá como si abrazaras un tronco.', x: 'No bajes los codos por detrás del torso: el hombro queda expuesto.', t: '3011' },
    fondos:   { o: 'Sumás tensión al pecho bajo y al tríceps con tu propio peso (y lastre si hace falta), un clásico para el volumen de empuje.', s: 'Hombros lejos de las orejas, torso levemente inclinado hacia adelante y piernas cruzadas.', c: 'Bajá hasta que el hombro quede a la altura del codo y empujá el cuerpo hacia arriba.', x: 'No bajes más del rango cómodo del hombro; si hay molestia, pasá a una máquina.', t: '3010' },
    pullover: { o: 'Estirás el pecho y el dorsal con el brazo por encima de la cabeza, un perfil de resistencia que casi ningún otro ejercicio da.', s: 'Brazos casi rectos, costillas abajo y abdomen firme.', c: 'Llevá los brazos hacia atrás en arco y volvé apretando el pecho y el dorsal.', x: 'No arquees la espalda baja al estirar: el rango termina donde la lumbar se despega.', t: '3011' },
    press_v:  { o: 'Desarrollás los tres deltoides y el tríceps con carga alta y el tronco estable: ahí se construyen hombros fuertes y anchos.', s: 'Glúteos y abdomen contraídos, costillas abajo y muñecas justo encima de los codos.', c: 'Empujá la barra en línea recta y terminá con la cabeza "pasando" por delante de ella.', x: 'No arquees la espalda baja para ayudarte; si pasa, bajá la carga.', t: '2011' },
    lateral:  { o: 'Aislás la porción lateral del deltoides, la que ensancha el contorno del hombro.', s: 'Torso levemente inclinado, codos apenas flexionados y hombros lejos de las orejas.', c: 'Subí los codos (no las manos) hasta la altura del hombro y bajá lento.', x: 'No balancees el torso ni encojas los hombros: si lo hacés, la carga es demasiada.', t: '2011' },
    delt_post:{ o: 'Trabajás el deltoide posterior y la espalda alta, clave para hombros 3D y una postura sana.', s: 'Torso paralelo al piso o pecho apoyado, codos altos y apenas flexionados.', c: 'Abrí los brazos hacia afuera y atrás, apretando las escápulas al final.', x: 'No tires con el trapecio ni con impulso de cadera.', t: '2011' },
    trap:     { o: 'Cargás el trapecio superior, el que da volumen entre el cuello y el hombro.', s: 'Brazos relajados al costado y pecho arriba.', c: 'Subí los hombros hacia las orejas y sostené 1-2 segundos arriba.', x: 'No rotes los hombros hacia atrás ni cuelgues la cabeza.', t: '1012' },
    tracc_v:  { o: 'Cargás el dorsal ancho en vertical, el músculo que da el ancho a la espalda.', s: 'Pecho hacia la barra, escápulas hacia abajo antes de tirar y agarre apenas más ancho que los hombros.', c: 'Llevá los codos hacia las costillas y sentí cómo se cierra el dorsal.', x: 'No te cuelgues de los brazos ni te inclines hacia atrás para terminar la repetición.', t: '2011' },
    remo:     { o: 'Trabajás dorsal, romboides y espalda alta en horizontal: es lo que da grosor y densidad a la espalda.', s: 'Torso firme (45° o apoyado), rodillas flexionadas y abdomen duro.', c: 'Tirá los codos hacia atrás y apretá las escápulas medio segundo arriba.', x: 'No uses impulso de cadera ni redondees la espalda baja.', t: '2011' },
    lumbar:   { o: 'Fortalecés la cadena posterior y los erectores, la base que sostiene todos los levantamientos pesados.', s: 'Cadera apoyada en el aparato y cuerpo alineado de la cabeza a los talones.', c: 'Subí hasta alinear el tronco, sin pasarte de ahí, y bajá controlado.', x: 'No hiperextiendas la zona lumbar arriba: el rango termina con el cuerpo recto.', t: '2012' },
    rdl:      { o: 'Cargás isquiotibiales y glúteo en posición estirada: el rango largo es lo que más hipertrofia genera en la cadena posterior.', s: 'Cadera atrás, rodillas apenas flexionadas, barra pegada a las piernas y espalda neutra.', c: 'Empujá la cadera hacia atrás como cerrando una puerta con la cola y subí apretando el glúteo.', x: 'No redondees la espalda baja: el rango termina donde la columna pierde su forma.', t: '3110' },
    pmuerto:  { o: 'Entrenás cadena posterior, espalda y agarre con carga máxima: el ejercicio de fuerza más completo del programa.', s: 'Barra sobre el medio del pie, espalda neutra, dorsales activos y pecho arriba.', c: 'Empujá el piso con las piernas antes de mover la barra y terminá con el glúteo, sin hiperextender.', x: 'No tires desde la espalda baja ni dejes que la barra se separe del cuerpo.', t: '2010' },
    hip:      { o: 'Cargás el glúteo mayor en extensión de cadera con pausa arriba: el ejercicio que más lo activa.', s: 'Espalda alta apoyada en el banco, pies al ancho de cadera y mentón hacia el pecho.', c: 'Empujá con los talones y sostené la pausa arriba apretando el glúteo, con las costillas abajo.', x: 'No arquees la lumbar para ganar altura: el glúteo termina con la cadera alineada.', t: '2011' },
    glute_iso:{ o: 'Aislás el glúteo con tensión constante, ideal para sumar volumen sin cargar la espalda baja.', s: 'Cadera cuadrada, abdomen firme y el apoyo estable.', c: 'Extendé la cadera apretando el glúteo y sostené 1 segundo arriba.', x: 'No rotes la pelvis ni arquees la espalda baja para subir más la pierna.', t: '2011' },
    abduccion:{ o: 'Trabajás glúteo medio y menor, que dan la forma lateral de la cadera y estabilizan la pelvis.', s: 'Torso levemente inclinado hacia adelante y espalda apoyada si la máquina lo permite.', c: 'Abrí las piernas empujando con las rodillas y volvé lento sin soltar la tensión.', x: 'No rebotes con la pila de pesas ni uses el torso para impulsarte.', t: '2011' },
    aduccion: { o: 'Fortalecés los aductores de la cara interna del muslo, un grupo que suele quedar sin trabajar.', s: 'Espalda apoyada y piernas al ancho cómodo de la máquina.', c: 'Cerrá las piernas controlado y abrí en 3 segundos sintiendo el estiramiento.', x: 'No abras más de lo que tu cadera tolera sin dolor.', t: '3011' },
    sentadilla:{ o: 'Entrenás cuádriceps, glúteo y todo el tronco con carga alta: el patrón de pierna que más estimula al cuerpo entero.', s: 'Barra firme en la espalda alta, pies al ancho de hombros y pecho arriba.', c: 'Bajá hasta la profundidad de tu mejor técnica y subí empujando el piso con todo el pie.', x: 'No dejes que las rodillas colapsen hacia adentro ni redondees la zona lumbar al fondo.', t: '3010' },
    prensa:   { o: 'Cargás cuádriceps y glúteo con mucho volumen y poca exigencia del tronco, ideal después del básico pesado.', s: 'Espalda y cadera pegadas al respaldo y pies al ancho de hombros.', c: 'Bajá hasta donde la cadera no se despegue y empujá el piso con todo el pie.', x: 'No bloquees las rodillas arriba ni dejes que la cadera se levante al fondo.', t: '3110' },
    hack:     { o: 'Llevás el cuádriceps a un rango profundo con el torso apoyado y muy poca fatiga lumbar.', s: 'Espalda apoyada, pies a la altura media de la plataforma y rodillas alineadas con los pies.', c: 'Bajá controlado hasta una flexión profunda y subí empujando con el medio pie.', x: 'No despegues los talones ni rebotes abajo.', t: '3110' },
    unilat:   { o: 'Trabajás cada pierna por separado: corregís diferencias de fuerza y sumás glúteo y cuádriceps en rango profundo.', s: 'Torso firme, paso largo y pie de apoyo bien plantado.', c: 'Bajá en vertical hasta que la rodilla casi roce el piso y subí empujando con el talón.', x: 'No dejes que la rodilla se meta hacia adentro ni te apoyes en la pierna de atrás.', t: '2110' },
    curl_fem: { o: 'Aislás los isquiotibiales en flexión de rodilla, la función que los ejercicios de cadera no cubren.', s: 'Cadera pegada al apoyo y rodillas alineadas con el eje de la máquina.', c: 'Flexioná sin despegar la cadera y bajá lento (3 segundos) hasta casi extender.', x: 'No levantes la cadera para ayudarte ni rebotes al final.', t: '3110' },
    ext_cuad: { o: 'Aislás el cuádriceps, sobre todo el recto femoral, con tensión constante y muy poco estrés articular.', s: 'Espalda apoyada, rodillas alineadas con el eje y el rodillo sobre los tobillos.', c: 'Extendé apretando el cuádriceps 1 segundo arriba y bajá en 3 segundos.', x: 'No lances la pierna con impulso ni bloquees la rodilla de golpe.', t: '3011' },
    gemelo:   { o: 'Cargás el gemelo, un músculo de fibras lentas que responde a rangos completos y pausas en el estiramiento.', s: 'Puntas de pie en el borde, rodillas casi extendidas y tronco firme.', c: 'Bajá hasta estirar bien el talón, pausa de 1-2 segundos abajo y subí al máximo.', x: 'No rebotes ni acortes el rango: el estiramiento abajo es el estímulo.', t: '2211' },
    curl:     { o: 'Aislás el bíceps y el braquial con el codo fijo: tensión limpia sobre el músculo.', s: 'Codos pegados al costado, hombros atrás y torso quieto.', c: 'Subí sin mover los codos y bajá en 3 segundos sintiendo el estiramiento.', x: 'No balancees el torso: si lo hacés, la carga es demasiado alta.', t: '3011' },
    triceps:  { o: 'Trabajás las tres cabezas del tríceps, que son dos tercios del volumen del brazo; con el brazo arriba de la cabeza se estira la porción larga.', s: 'Codos fijos y apuntando al frente, muñecas neutras y torso estable.', c: 'Extendé hasta bloquear sin sacudir y bajá en 2-3 segundos hasta estirar.', x: 'No abras los codos hacia afuera ni uses el torso para empujar.', t: '2011' },
    core_ant: { o: 'Entrenás el tronco para resistir el movimiento (antiextensión, antirrotación): la base que protege la columna bajo carga.', s: 'Abdomen contraído, costillas abajo y pelvis neutra.', c: 'Mantené el tronco quieto mientras se mueven brazos o piernas y respirá sin soltar la tensión.', x: 'Terminá la serie cuando la lumbar se despega o el torso rota, no cuando "arde".', t: '3011' },
    core_flex:{ o: 'Trabajás los abdominales con flexión de tronco o de cadera bajo control, en rangos que cuidan la columna.', s: 'Pelvis hacia atrás (retroversión) y abdomen contraído antes de empezar.', c: 'Llevá el esternón hacia la pelvis y subí las piernas sin balanceo.', x: 'No uses impulso ni dejes que la lumbar se arquee en la bajada.', t: '3011' },
    rdl_def:  { o: 'Cargás glúteo mayor e isquiotibiales en la posición más estirada del recorrido: el déficit alarga el rango y concentra la tensión justo donde más hipertrofia por estiramiento se genera, con la bisagra de cadera (y no la espalda) haciendo el trabajo.', s: 'Parada sobre un disco o un escalón bajo de 3 a 5 cm, barra o mancuernas pegadas a las piernas, rodillas apenas flexionadas y espalda neutra.', c: 'Llevá la cadera hacia atrás como cerrando una puerta con la cola, bajá hasta sentir el estiramiento máximo de glúteo e isquios, pausa corta abajo y subí empujando el piso con la cadera.', x: 'El rango termina donde la columna pierde su forma: no redondees la espalda baja ni bajes "con la espalda" para ganar profundidad.', t: '3210' },
    bulg_incl:{ o: 'Cargás el glúteo mayor en su posición más estirada: con el torso inclinado hacia adelante la carga se acerca a la cadera y la tensión pasa del cuádriceps al glúteo, de a una pierna y con poca fatiga axial.', s: 'Pie de atrás apoyado en un banco, paso largo, torso inclinado unos 30° con la mirada hacia el piso y las mancuernas a los costados del cuerpo.', c: 'Bajá en 3 segundos hasta estirar el glúteo de la pierna de adelante, pausa de 1 segundo abajo y subí empujando con el talón.', x: 'No dejes que la rodilla colapse hacia adentro ni cargues el peso en el pie de atrás: la pierna de adelante hace todo el trabajo.', t: '3110' },
    patada_cruz:{ o: 'Aislás el glúteo mayor con un vector de fuerza cruzado: la polea cruza el cuerpo y alinea la resistencia con la dirección de las fibras, con tensión constante, cero carga sobre la columna y el glúteo estirado al volver.', s: 'Tobillera en la pierna que trabaja, polea baja, apoyo firme con las dos manos y torso levemente inclinado hacia adelante.', c: 'Llevá la pierna hacia atrás y apenas hacia afuera apretando el glúteo, sostené 1 segundo y volvé lento cruzando la línea media para estirarlo.', x: 'No arquees la espalda baja ni gires la pelvis para subir más la pierna: el rango termina donde se mueve la cadera.', t: '3011' },
    puente_uni:{ o: 'Trabajás el glúteo mayor de a una pierna, con la pelvis estable y sin carga sobre la columna: alta activación y corrección de las diferencias entre un lado y el otro.', s: 'Espalda alta apoyada, pie de trabajo cerca de la cola, la otra pierna extendida y la pelvis nivelada.', c: 'Empujá con el talón hasta alinear costillas, cadera y rodilla, sostené 2 segundos apretando el glúteo y bajá lento.', x: 'No dejes que caiga el lado libre de la pelvis ni arquees la lumbar para subir más.', t: '3012' },
    hiper45:  { o: 'Cargás glúteo mayor e isquiotibiales con la cadera en bisagra y el torso apoyado: tensión alta con el glúteo estirado y casi ninguna carga sobre la columna.', s: 'Almohadillas por debajo de las crestas de la cadera, tobillos fijos y el cuerpo alineado de la cabeza a los talones.', c: 'Bajá el torso con la espalda neutra hasta sentir el estiramiento y subí empujando con el glúteo hasta alinear el cuerpo, sin pasarte.', x: 'No hiperextiendas la zona lumbar arriba: el rango termina con el cuerpo recto y el glúteo apretado.', t: '3110' },
    gen:      { o: 'Estimulás el grupo muscular objetivo con técnica controlada y rango completo.', s: 'Posición estable, postura neutra y el músculo objetivo activado antes de empezar.', c: 'Controlá la bajada y buscá la contracción máxima en cada repetición.', x: 'No sacrifiques el rango ni la técnica por mover más carga.', t: '2011' }
  };
  /* ejercicio -> patrón del KB (el primero que coincide) */
  var RX_KB = [
    [/cruce de cables deltoides|pec deck inverso/, 'delt_post'],
    [/hiperextensiones en banco a 45/, 'hiper45'],
    [/sentadilla en multipower/, 'hack'],
    [/peso muerto rumano con deficit|rumano con deficit/, 'rdl_def'],
    [/bulgara con torso inclinado/, 'bulg_incl'],
    [/patada de gluteo en polea cruzada/, 'patada_cruz'],
    [/puente de gluteo a una pierna|puente de gluteo unilateral/, 'puente_uni'],
    [/press de banca|press banca|bench press|press plano con mancuernas|press de pecho en maquina|press de pecho convergente|floor press/, 'press_h'],
    [/press inclinado|inclinado con barra|press de pecho inclinado/, 'press_inc'],
    [/aperturas|cruce de cables|pec deck|contractor de pecho/, 'aper'],
    [/fondos en paralelas|fondos de triceps/, 'fondos'],
    [/pull-?over/, 'pullover'],
    [/press militar|press de hombros|press arnold|push press|strict press/, 'press_v'],
    [/elevaciones laterales|elevacion lateral/, 'lateral'],
    [/pajaro|elevaciones posteriores|cruce de cables deltoides|face pull|deltoide posterior/, 'delt_post'],
    [/encogimientos/, 'trap'],
    [/dominadas|jalon|pull-up/, 'tracc_v'],
    [/remo/, 'remo'],
    [/hiperextension|superman|buenos dias/, 'lumbar'],
    [/peso muerto rumano|rumano/, 'rdl'],
    [/peso muerto/, 'pmuerto'],
    [/hip thrust|puente de gluteo/, 'hip'],
    [/patada de gluteo|extension de cadera|pull-through/, 'glute_iso'],
    [/abduccion|monster walk/, 'abduccion'],
    [/aduccion|copenhagen/, 'aduccion'],
    [/hack squat/, 'hack'],
    [/sentadilla con barra|sentadilla frontal|back squat|front squat/, 'sentadilla'],
    [/prensa/, 'prensa'],
    [/bulgarian|bulgara|zancada|step up|split squat|sentadilla goblet|sentadilla sumo/, 'unilat'],
    [/curl femoral|nordico/, 'curl_fem'],
    [/extension de cuadriceps/, 'ext_cuad'],
    [/gemelos|talones/, 'gemelo'],
    [/triceps|press frances|press de banca agarre cerrado|patada de triceps/, 'triceps'],
    [/curl/, 'curl'],
    [/rueda abdominal|plancha|pallof|dead bug|bird dog|hollow|woodchopper|copenhagen/, 'core_ant'],
    [/elevacion de piernas|crunch|v-ups|bicicleta abdominal/, 'core_flex']
  ];
  /* tempo de una fila: el que fija la plantilla (fila.tp = ['3210', ...], uno por ejercicio) o el del patrón */
  function tempoFila(fila, k, e){ var t = fila && fila.tp && fila.tp[k]; return t ? String(t) : kbDe(e).t; }
  function kbDe(nombre){
    var n = nzz(nombre);
    for(var i = 0; i < RX_KB.length; i++){ if(RX_KB[i][0].test(n)) return KB[RX_KB[i][1]]; }
    return KB.gen;
  }
  var TEC = {
    drop: { lb: 'Drop-set', tip: 'TÉCNICA · DROP-SET: en la última serie, al llegar al fallo técnico bajá 20-25% la carga y seguí sin descanso hasta un nuevo fallo.' },
    myo:  { lb: 'Myo-reps', tip: 'TÉCNICA · MYO-REPS: una serie de activación a 1-2 repeticiones del fallo; después 3-4 mini-series de 4-5 repeticiones con 15 segundos de pausa y respiraciones profundas.' },
    rp:   { lb: 'Rest-pause', tip: 'TÉCNICA · REST-PAUSE: serie hasta el fallo técnico, descansá 15-20 segundos y sacá 2-4 repeticiones más; repetí una vez.' }
  };
  function tempoTxt(t){
    var d = String(t).split('');
    var f = function(x, a, b, c){ return x === '0' ? c : (x === 'X' ? b : x + ' s ' + a); };
    return f(d[0], 'bajada', 'bajada explosiva', 'bajada libre') + ', ' + f(d[1], 'pausa abajo', 'pausa abajo', 'sin pausa abajo') + ', ' + f(d[2], 'subida', 'subida explosiva', 'subida libre') + ', ' + f(d[3], 'pausa arriba', 'pausa arriba', 'sin pausa arriba');
  }

  /* ---------- resolución de ejercicios de la biblioteca ("Nombre ES (Name EN)": se vincula el video solo) ---------- */
  function exLib(nombre){
    var n = nzz(nombre);
    var lista = (typeof S !== 'undefined' && S.exercises) ? S.exercises : [];
    for(var i = 0; i < lista.length; i++){ if(lista[i].es && nzz(lista[i].es) === n) return lista[i]; }
    for(var j = 0; j < lista.length; j++){ if(lista[j].en && nzz(lista[j].en) === n) return lista[j]; }
    return null;
  }
  function etiquetaEj(nombre){
    var e = exLib(nombre);
    if(!e) return nombre;
    return e.es + ((e.en && nzz(e.en) !== nzz(e.es)) ? ' (' + e.en + ')' : '');
  }

  /* ---------- una fila de sesión: rol, ejercicio(s), dosis intermedio / avanzado ---------- */
  /* dosis: "SxR|RIR|Rest|tec"; en bisets/trisets "SxR1/R2|RIR1/RIR2|Rest|tec"; roles F fuerza · H hipertrofia · A aislamiento · B biset · T triset · C core · M cierre metabólico */
  function R(rol, ej, i, a, o){ var r = { rol: rol, ej: ej, i: i, a: a }; if(o){ for(var k in o) r[k] = o[k]; } return r; }
  function partesDosis(s){
    var p = String(s || '').split('|'), m = /^(\d+)\s*x\s*(.+)$/i.exec((p[0] || '').trim()) || [];
    return { sets: parseInt(m[1], 10) || 3, reps: String(m[2] || '10').split('/').map(function(x){ return x.trim(); }), rir: String(p[1] == null ? '1' : p[1]).split('/').map(function(x){ return x.trim(); }), rest: parseInt(p[2], 10) || 90, tec: (p[3] || '').trim() };
  }
  function nombreCorto(n){ return String(n).replace(/\s*\(.*\)\s*$/, ''); }
  function minBloque(sets, estaciones, rest){ return Math.max(4, Math.round(sets * (estaciones * 45 + rest) / 60 + 2)); }
  var TAG = { F: 'FUERZA', H: 'HIPERTROFIA', B: 'HIPERTROFIA', T: 'HIPERTROFIA', A: 'ACCESORIO', M: 'FINISHER', K: 'CARDIO', C: 'CORE' };
  var PREF = { F: 'Fuerza principal', H: 'Hipertrofia', A: 'Accesorios', M: 'Finisher', K: 'Cardio', C: 'Core' };

  /* ---------- notas por rol: por qué está en la sesión, cómo se progresa y qué se tiene que sentir ----------
     cada rol trae [intermedio, avanzado]. Las líneas empiezan con una etiqueta en mayúsculas (el importador las toma como pautas del bloque). */
  var N_ROL = {
    F: {
      pq: ['Es el ejercicio que ordena toda la sesión: va primero porque necesita tu sistema nervioso fresco y es donde más peso movés. Si acá sumás carga con técnica limpia, todo lo que viene después rinde más.',
           'Es el ejercicio que define el día: va primero, con el sistema nervioso fresco y la carga más alta de la sesión. Acá se gana la fuerza que después se convierte en volumen de calidad en el resto de los bloques.'],
      pr: ['Doble progresión: mantené la carga hasta completar todas las series en el techo del rango con el RIR pedido, y recién ahí sumá 2,5 kg (1 o 2 kg si es tren superior). Si una serie se te rompe, la carga no era esa: bajá un escalón y volvé a empujar.',
           'Top set y back-off: la primera serie efectiva es la más pesada del día. Cuando el top set sale limpio dos semanas seguidas, sumá carga. Las series siguientes bajan entre 5 y 8% y se hacen con la misma velocidad de barra.'],
      se: ['Pesado y firme. Cada repetición con la técnica de la primera y, al terminar la serie, sabés que te quedaban una o dos más. Si salís cansado sin haber sentido ese control, algo se desordenó.',
           'Pesado y afilado. La barra se mueve lenta pero decidida y no negociás ni el rango ni la pausa. Terminás sabiendo que había una repetición más, y no la regalás.']
    },
    H: {
      pq: ['Acá se construye el volumen: rangos medios de repeticiones con carga seria para acumular tensión mecánica sin llegar a la fatiga que arruina el resto de la sesión.',
           'Es el bloque donde se acumula el volumen duro de la sesión: carga alta en rangos de 8 a 12, series cerca del fallo técnico y descansos que te dejan rendir de verdad en cada serie.'],
      pr: ['Subí repeticiones primero y carga después: cuando completás el techo del rango en todas las series con el RIR pedido, sumá carga y volvé al piso del rango.',
           'Doble progresión estricta: techo del rango en todas las series con RIR 0 o 1 y, recién ahí, más carga. Anotá todo: lo que no se registra no se progresa.'],
      se: ['Quemazón profunda en el músculo que estás trabajando, no en las articulaciones. La última repetición de cada serie tiene que costar de verdad.',
           'Tensión alta y ardor desde la segunda serie. Las últimas repeticiones son lentas pero propias: si hay que ayudarse con el cuerpo, esa repetición no cuenta.']
    },
    A: {
      pq: ['Aislamiento con tensión constante: termina de agotar el músculo que los compuestos dejaron a medias, con muy poco desgaste en las articulaciones.',
           'Aislamiento para llevar el músculo al límite sin fatiga sistémica: acá se refina la forma y se suma volumen efectivo que los compuestos ya no pueden dar.'],
      pr: ['Rango completo, bajada lenta y progresión por repeticiones. Cuando llegás al techo con RIR 1 en todas las series, subí un escalón de peso.',
           'Misma regla de techo de repeticiones. Si el bloque trae técnica de intensidad, va solo en la última serie y nunca antes.'],
      se: ['Bombeo y ardor localizados. Es el bloque donde se busca conectar con el músculo: sentilo trabajar en cada repetición.',
           'Congestión fuerte y ardor sostenido. Si la última serie no te obliga a frenar y respirar, faltó intención.']
    },
    B: {
      pq: ['Dos ejercicios sin pausa entre sí para sumar volumen y congestión en pocos minutos: es el cierre que deja el grupo muscular realmente cargado.',
           'Biset de cierre: duplicás el trabajo por minuto y llevás el grupo a una congestión que un ejercicio suelto no da.'],
      pr: ['Misma regla en las dos estaciones: techo del rango con el RIR pedido y, después, más carga. El descanso va recién al terminar la ronda.',
           'Misma regla en las dos estaciones. La última serie puede cerrar con técnica de intensidad si el bloque la indica.'],
      se: ['Congestión fuerte y respiración agitada, pero con técnica prolija. Si una estación se desarma, bajá la carga: la calidad manda.',
           'Congestión al límite y pulsaciones altas. La técnica no se negocia: si una estación se rompe, bajás carga y seguís.']
    },
    T: {
      pq: ['Tres ejercicios encadenados sin pausa: máxima congestión y volumen en el menor tiempo posible, justo al final, cuando ya no queda nada que cuidar.',
           'Triset de cierre: tres estaciones seguidas para llevar el grupo muscular a la máxima congestión. Es el bloque que más se siente y el que menos tiempo ocupa.'],
      pr: ['Misma regla en las tres estaciones: techo del rango con el RIR pedido y después más carga. El descanso va recién al cerrar la ronda de tres.',
           'Misma regla en las tres estaciones. Si una se rompe antes de terminar la serie, bajás carga en esa estación y no en las otras.'],
      se: ['Bombeo fuerte, respiración agitada y la sensación de que el músculo está lleno. Cuidá la técnica aunque estés cansado.',
           'Congestión máxima y pulsaciones altas. Terminás el bloque con el músculo lleno y la técnica intacta.']
    },
    C: {
      pq: ['El core no es "abdominales de relleno": es lo que te permite transmitir fuerza y proteger la columna bajo los kilos de la sesión. Por eso se entrena con la misma seriedad que el resto.',
           'Core con carga y control: el tronco es el eslabón que limita los básicos pesados. Se trabaja con palancas largas y tensión real, no con repeticiones al aire.'],
      pr: ['Sumá segundos o repeticiones primero; cuando salgan limpias, sumá palanca (rueda más extendida, brazos más largos) o carga.',
           'Progresá con más palanca o más carga antes que con más repeticiones. La técnica estricta de cada serie es lo que cuenta.'],
      se: ['Tensión profunda en el abdomen, respiración controlada y la zona lumbar quieta. Si se carga la espalda baja, cortá la serie.',
           'Abdomen duro como una tabla durante toda la serie. Si la lumbar se despega o el torso gira, la serie terminó ahí.']
    }
  };
  function notasRol(rol, av){
    var N = N_ROL[rol]; if(!N) return { pre: [], pos: [] };
    var k = av ? 1 : 0;
    return { pre: ['POR QUÉ ESTÁ ACÁ: ' + N.pq[k]], pos: ['PROGRESIÓN: ' + N.pr[k], 'SENSACIÓN OBJETIVO: ' + N.se[k]] };
  }
  function porNivel(x, av){ return Array.isArray(x) ? (av && x[1] != null ? x[1] : x[0]) : x; }

  /* bloque libre (finisher metabólico o cardio): el coach escribe las líneas tal cual; se usa para lo que no es series x repeticiones.
     fila.fin = { tag, t, i: { min, l: [líneas] }, a: { min, l } (opcional), obj: texto | [i, a], tips: [texto | [i, a]] }
     Las líneas no llevan "NxM" (el importador las convertiría en una dosis de fuerza) y los tips no empiezan con número. */
  function textoEspecial(n, fila, niv){
    var pro = niv === 'pro', av = niv === 'avanzado' || pro, f = fila.fin, v = (pro && f.p) ? f.p : ((av && f.a) ? f.a : f.i);
    var L = ['[BLOQUE ' + n + '] [' + (f.tag || TAG[fila.rol]) + '] ' + f.t + ' (' + v.min + ' MIN)'];
    v.l.forEach(function(l){ L.push(l); });
    L.push('[OBJETIVO FISIOLÓGICO]'); L.push(porNivel(f.obj, av));
    L.push('[COACHING TIPS & ESTRATEGIA]');
    (f.tips || []).forEach(function(t){ L.push(porNivel(t, av)); });
    return { txt: L.join('\n'), sets: 0, grupos: [], mins: v.min };
  }

  /* texto de un bloque; devuelve { txt, sets, grupos:[{ej,sets}] } */
  function textoBloque(n, fila, niv, esPrimeroFuerza){
    if(fila.fin) return textoEspecial(n, fila, niv);
    var pro = niv === 'pro', av = niv === 'avanzado' || pro, d = partesDosis(pro && fila.p ? fila.p : (av ? (fila.a || fila.i) : fila.i));
    var ejs = [].concat(av && fila.ea ? fila.ea : fila.ej);
    var multi = ejs.length > 1, nombresCortos = ejs.map(nombreCorto);
    var titulo = (fila.rol === 'B' ? 'Hipertrofia – Biset ' : (fila.rol === 'T' ? 'Hipertrofia – Triset ' : (fila.rol === 'C' ? 'Core – ' : (PREF[fila.rol] || 'Hipertrofia') + ' – '))) + nombresCortos.join(' + ');
    var mins = minBloque(d.sets, ejs.length, d.rest);
    var L = ['[BLOQUE ' + n + '] [' + TAG[fila.rol] + '] ' + titulo + ' (' + mins + ' MIN)'];
    var tecTxt = d.tec && TEC[d.tec] ? ' | ' + TEC[d.tec].lb : '';
    ejs.forEach(function(e, k){
      var reps = d.reps[k] != null ? d.reps[k] : d.reps[d.reps.length - 1], rir = d.rir[k] != null ? d.rir[k] : d.rir[d.rir.length - 1];
      var dosis = d.sets + 'x' + reps + ' | Tempo ' + tempoFila(fila, k, e) + ' | RIR ' + rir + (k === ejs.length - 1 ? tecTxt : '');
      L.push((multi ? 'A' + (k + 1) + '. ' : '') + etiquetaEj(e));
      L.push(dosis);
    });
    L.push('Rest ' + d.rest + 's');
    var kb0 = kbDe(ejs[0]), objetivo = kb0.o, nr = notasRol(fila.rol, av);
    if(multi){
      var kb1 = kbDe(ejs[1]);
      objetivo = (fila.rol === 'C' ? 'Trabajás el tronco con ' + ejs.length + ' ejercicios que cubren funciones distintas: ' : 'Encadenás ' + ejs.length + ' ejercicios sin pausa para sumar volumen en menos tiempo: ') + kb0.o.charAt(0).toLowerCase() + kb0.o.slice(1) + ' ' + kb1.o;
      if(ejs.length > 2){ objetivo += ' ' + kbDe(ejs[2]).o; }
    }
    if(av && d.tec && TEC[d.tec]) objetivo += ' La técnica de intensidad (' + TEC[d.tec].lb + ') suma estímulo sin sumar series.';
    L.push('[OBJETIVO FISIOLÓGICO]'); L.push(objetivo);
    L.push('[COACHING TIPS & ESTRATEGIA]');
    nr.pre.forEach(function(x){ L.push(x); });
    if(fila.n) [].concat(fila.n).forEach(function(x){ L.push('NOTA DEL DÍA: ' + porNivel(x, av)); });
    if(!multi){
      L.push('SET-UP: ' + kb0.s); L.push('CUE EFICIENTE: ' + kb0.c); L.push('CUIDADO / ERROR COMÚN: ' + kb0.x);
      var tp0 = tempoFila(fila, 0, ejs[0]); L.push('TEMPO: Tempo ' + tp0 + ' (' + tempoTxt(tp0) + ')');
      if(esPrimeroFuerza) L.push('RAMP-UP: 2 o 3 series de aproximación antes de las efectivas (ej: 50% x 8, 70% x 5, 85% x 2). No cuentan como volumen.');
      if(fila.rol === 'F' && av) L.push('TOP SET + BACK-OFF: la primera serie efectiva es el top set a RIR 1; en las siguientes bajá 5-8% la carga y mantené RIR 0-1.');
    } else {
      ejs.forEach(function(e, k){
        var kb = kbDe(e), id = 'A' + (k + 1);
        L.push(id + ' · SET-UP: ' + kb.s);
        L.push(id + ' · CUE EFICIENTE: Tempo ' + tempoFila(fila, k, e) + ' — ' + kb.c);
        L.push(id + ' · CUIDADO / ERROR COMÚN: ' + kb.x);
      });
      L.push('TRANSICIÓN: pasá de una estación a la otra sin descanso; el descanso de ' + d.rest + 's va recién al terminar cada ronda.');
    }
    if(av && d.tec && TEC[d.tec]) L.push(TEC[d.tec].tip);
    nr.pos.forEach(function(x){ L.push(x); });
    var grupos = ejs.map(function(e){ var x = exLib(e); return { ej: e, grupo: x ? x.grupo : '', patron: x ? x.patron : '', sets: d.sets }; });
    return { txt: L.join('\n'), sets: d.sets * ejs.length, grupos: grupos, mins: mins };
  }

  /* ---------- entrada en calor específica por tipo de día: movilidad + activación + potenciación (10 min) ---------- */
  var WU = {
    push: { obj: 'Subís la temperatura de pecho, hombros y tríceps y despertás el manguito rotador y las escápulas, que son los que sostienen el hombro bajo carga. Cuando llegás al primer press con el hombro "centrado", la técnica sale sola y el riesgo baja.',
      items: ['Rotación torácica en cuadrupedia x 8 por lado', 'Retracciones escapulares colgado x 10', 'Apertura de banda x 15', 'Rotación externa manguito rotador x 15 por lado', 'Face Pull con cuerda x 15', 'Flexiones de brazos x 10 con pausa de 1 segundo abajo'],
      tips: ['MOVILIDAD (primeros 3 minutos): rotación torácica y retracciones escapulares, lentas y completas. Tenés que sentir que la espalda alta se abre.',
             'ACTIVACIÓN (siguientes 4 minutos): apertura de banda, rotación externa y face pull con tensión suave y constante. No es para cansarte: es para encender lo que protege el hombro.',
             'POTENCIACIÓN (últimos 3 minutos): flexiones controladas y, enseguida, las series de aproximación del primer ejercicio. Cuando la barra se siente liviana y rápida, estás listo.'] },
    pull: { obj: 'Preparás la espalda alta, el manguito y la zona lumbar para tirar pesado: activás los estabilizadores de la escápula y la cadena posterior para que el dorsal trabaje y no los brazos ni la espalda baja.',
      items: ['Rotación torácica en cuadrupedia x 8 por lado', 'Retracciones escapulares colgado x 10', 'Apertura de banda x 15', 'Face Pull con cuerda x 15', 'Extensión lumbar tipo Superman x 10 con pausa de 2 segundos arriba', 'Remo invertido / Australian Pull-up x 8'],
      tips: ['MOVILIDAD (primeros 3 minutos): rotación torácica y retracciones escapulares para soltar la espalda alta antes de tirar.',
             'ACTIVACIÓN (siguientes 4 minutos): apertura de banda, face pull y superman. Buscá sentir las escápulas y los erectores "prendidos", sin fatiga.',
             'POTENCIACIÓN (últimos 3 minutos): remos invertidos livianos y las series de aproximación del primer ejercicio. Los codos tienen que ir hacia atrás y no las manos.'] },
    upper: { obj: 'Dejás el torso listo para empujar y tirar con carga: movilidad de la columna dorsal, manguito rotador y escápulas activos, y el patrón de empuje caliente antes del primer básico.',
      items: ['Rotación torácica en cuadrupedia x 8 por lado', 'Apertura de banda x 15', 'Rotación externa manguito rotador x 12 por lado', 'Face Pull con cuerda x 15', 'Retracciones escapulares colgado x 10', 'Flexiones de brazos x 8'],
      tips: ['MOVILIDAD (primeros 3 minutos): rotación torácica y apertura de banda, lentas, sin apuro.',
             'ACTIVACIÓN (siguientes 4 minutos): rotación externa, face pull y retracciones. Tensión suave: es para activar, no para entrenar.',
             'POTENCIACIÓN (últimos 3 minutos): flexiones controladas y las series de aproximación del primer ejercicio, subiendo el peso de a poco.'] },
    legs: { obj: 'Subís la temperatura de caderas, rodillas y tobillos y activás glúteo medio, glúteo mayor y core, que son los que mantienen las rodillas alineadas y la columna firme cuando la barra está pesada.',
      items: ['Cambio de cadera 90/90 x 6 por lado', 'Puente de glúteo con banda x 15', 'Abducción con banda (monster walk) x 12 por lado', 'Sentadilla goblet x 10 con pausa de 2 segundos abajo', 'Dead bug x 8 por lado', 'Zancada inversa x 6 por lado'],
      tips: ['MOVILIDAD (primeros 3 minutos): cambio de cadera 90/90 y sentadilla goblet con pausa. Buscá profundidad sin que se despegue el talón.',
             'ACTIVACIÓN (siguientes 4 minutos): puente de glúteo, monster walk y dead bug. El glúteo tiene que "prender" antes de la primera serie pesada.',
             'POTENCIACIÓN (últimos 3 minutos): zancadas inversas controladas y, enseguida, las series de aproximación de la sentadilla o del primer ejercicio de pierna.'] },
    glute: { obj: 'Despertás el glúteo mayor y medio y la cadena posterior antes de cargar: si el glúteo no está activo, la espalda baja y los isquios hacen el trabajo y el hip thrust deja de ser un ejercicio de glúteo.',
      items: ['Cambio de cadera 90/90 x 6 por lado', 'Puente de glúteo con banda x 15', 'Patada de glúteo con banda x 12 por lado', 'Abducción con banda (monster walk) x 12 por lado', 'Peso muerto rumano a una pierna x 8 por lado', 'Bird dog x 8 por lado'],
      tips: ['MOVILIDAD (primeros 3 minutos): cambio de cadera 90/90 para soltar la cadera antes de cargarla.',
             'ACTIVACIÓN (siguientes 4 minutos): puente, patada y monster walk con la banda. Tenés que sentir el glúteo trabajando, no la espalda baja ni el cuádriceps.',
             'POTENCIACIÓN (últimos 3 minutos): peso muerto rumano a una pierna y bird dog para estabilizar la pelvis, y luego las series de aproximación del primer ejercicio.'] },
    run: { obj: 'Subís la temperatura y las pulsaciones de forma progresiva y activás glúteo medio, glúteo mayor y core antes de correr y cargar: las caderas y los tobillos sueltos y el glúteo despierto hacen que cada zancada sea más eficiente y menos lesiva.',
      items: ['Cambio de cadera 90/90 x 6 por lado', 'Puente de glúteo con banda x 15', 'Abducción con banda (monster walk) x 12 por lado', 'Zancada inversa x 8 por lado', 'Dead bug x 8 por lado', 'Carrera suave x 6 min con 4 aceleraciones de 15 s al final'],
      tips: ['MOVILIDAD (primeros 3 minutos): cambio de cadera 90/90 y zancadas inversas lentas. Soltá la cadera y el tobillo antes de correr.',
             'ACTIVACIÓN (siguientes 3 minutos): puente, monster walk y dead bug. El glúteo tiene que prender antes de la primera zancada, o la espalda baja y los isquios hacen el trabajo.',
             'RAMPA DE CARRERA (últimos 4 minutos): trote suave y cuatro aceleraciones cortas de 15 segundos, progresivas. Llegás al primer intervalo ya caliente y con la respiración controlada.'] },
    full: { obj: 'Preparás el cuerpo entero para una sesión de varios patrones: caderas móviles, columna torácica suelta, glúteos y manguito activos y el core encendido para sostener cualquier ejercicio que venga.',
      items: ['Cambio de cadera 90/90 x 5 por lado', 'Rotación torácica en cuadrupedia x 8 por lado', 'Puente de glúteo con banda x 12', 'Sentadilla goblet x 10', 'Retracciones escapulares colgado x 10', 'Rotación externa manguito rotador x 12 por lado', 'Dead bug x 8 por lado'],
      tips: ['MOVILIDAD (primeros 3 minutos): cadera 90/90 y rotación torácica, lentas y completas.',
             'ACTIVACIÓN (siguientes 4 minutos): puente de glúteo, retracciones, rotación externa y dead bug. Activar sin cansar.',
             'POTENCIACIÓN (últimos 3 minutos): sentadilla goblet con pausa y las series de aproximación del primer ejercicio de la sesión.'] }
  };
  function textoWarmup(n, tipo, etiqueta){
    var W = WU[tipo], L = ['[BLOQUE ' + n + '] [WARM-UP] Entrada en calor · ' + etiqueta + ' (10 MIN)'];
    W.items.forEach(function(x){ var m = /^(.*?)\s+x\s+(.+)$/.exec(x); L.push('- ' + (m ? etiquetaEj(m[1]) + ' x ' + m[2] : x)); });
    L.push('[OBJETIVO FISIOLÓGICO]'); L.push(W.obj);
    L.push('[COACHING TIPS & ESTRATEGIA]');
    W.tips.forEach(function(x){ L.push(x); });
    L.push('SET-UP: hacé 2 rondas fluidas, sin fatigarte: el objetivo es entrar en calor, no entrenar. Tenés que arrancar la primera serie pesada con ganas, no cansado.');
    L.push('CUIDADO / ERROR COMÚN: si una articulación molesta, regresioná el ejercicio o salteálo y avisale a tu coach. No se entrena sobre una molestia.');
    return L.join('\n');
  }

  /* registros que llenan los archivos de días (src/coach/banco/1x-*.js) y arma 20-armado.js */
  var D = {}, ESTR = [];

  window.__jpPB = { tempoTxt: tempoTxt, KB: KB, kbDe: kbDe, R: R, textoBloque: textoBloque, textoWarmup: textoWarmup, exLib: exLib, etiquetaEj: etiquetaEj, partesDosis: partesDosis, TEC: TEC, nzz: nzz, D: D, ESTR: ESTR, WU: WU, N_ROL: N_ROL,
    minBloque: minBloque, nombreCorto: nombreCorto, PREF: PREF, TAG: TAG, tempoFila: tempoFila };
})();
