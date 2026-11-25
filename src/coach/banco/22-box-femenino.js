/* =========================================================
   PLANTILLA DEL BANCO · BOX FEMENINO · GLÚTEO, PIERNAS Y CORE + OLÍMPICO · 5 DÍAS · DESARROLLO-INTERMEDIO
   Entorno: gimnasio de CrossFit / box (cajones, barras y discos, mancuernas, kettlebells, bandas y rig con barra y anillas).
   Restricción estricta de equipo: CERO máquinas guiadas y CERO poleas (ni prensa, hack, extensiones o curls en máquina, poleas ni máquinas de abducción).
   Estructura: lunes, miércoles y viernes llevan una entrada en calor propia del olímpico (cadera, espalda alta, hombros y sentadilla) y abren con levantamiento olímpico (rol O, series rectas) justo después de la entrada en calor; después,
   un básico en series rectas cuando corresponde, bisets armados con el material del box en una misma zona (barra + cajón, rig + piso, mancuernas + banda)
   y el cierre de core, con un ejercicio distinto cada día. Foco: glúteo (el grupo con más volumen), piernas y core, con una espalda tonificada
   (postura, espalda alta y media y dorsal) en volumen controlado.
   Se arma con el mismo motor que las plantillas de Bodybuilding (10-motor-textos.js + 20-armado.js: objetivo, pautas, tempo, RIR y pedagogía por bloque)
   y, como el resto de las del sistema, sus días no se guardan en el navegador: se regeneran desde este código (bandera sbSys).
   ========================================================= */
(function(){
  'use strict';
  var PB = window.__jpPB; if(!PB || !PB.construirDias) return;
  var R = PB.R, D = PB.D;
  var VER = 1, ID = 'bk_box_f5_i', NOMBRE = 'Box · Glúteo, Piernas y Core + Olímpico · Femenino · 5 días · Desarrollo-Intermedio';

  D.BX_1 = { short: 'LUN', label: 'Olímpico + Cuádriceps y Glúteo', title: 'Lunes · Hang Power Clean, Sentadilla Frontal y Glúteo', wu: 'olim', chips: ['🥇 Olímpico · Hang Power Clean', '🍑 Glúteo + cuádriceps', '🧱 Core'],
    foco: 'Primer día olímpico de la semana: el hang power clean abre la sesión justo después de la entrada en calor, con el sistema nervioso fresco, para entrenar potencia de cadera. Después, la sentadilla frontal es el único patrón axial pesado del día y el trabajo de glúteo y pierna va en dos bisets armados en la misma zona: hip thrust con la espalda en un cajón junto a la abducción caminando con banda, y zancada inversa con mancuernas junto al gemelo a una pierna. El hollow body cierra el core.',
    filas: [
      R('O', 'Hang Power Clean', '5x3|3|120', null, { n: 'Técnica antes que kilos: barra pegada al cuerpo, extensión explosiva de cadera y recepción en el rack con los codos altos.' }),
      R('F', 'Sentadilla frontal', '4x5-7|2|150', null, { n: 'Único patrón axial pesado del día: codos altos, torso erguido y bajada controlada. La barra apoyada adelante obliga al core a trabajar en cada repetición.' }),
      R('B', ['Hip thrust con barra', 'Abducción caminando con banda'], '3x8-10/12 por lado|1|90', null, { tp: ['2012', ''], n: 'Hip thrust con la espalda alta apoyada en un cajón firme y pausa de 2 segundos arriba; la abducción caminando con banda va al lado, para el glúteo medio.' }),
      R('B', ['Zancada inversa', 'Elevación de talones a una pierna'], '3x8-10/12-15|1|75', null, { tp: ['2110', '2211'], n: 'Zancada hacia atrás con mancuernas, arrancando por la pierna más débil; el gemelo a una pierna sobre un disco o el borde de un cajón, con pausa abajo.' }),
      R('C', 'Hollow body', '2x30s|1|45')
    ] };

  D.BX_2 = { short: 'MAR', label: 'Bisagra, Glúteo y Espalda', title: 'Martes · Peso Muerto Rumano, Glúteo y Espalda', wu: 'glute', chips: ['🍑 Glúteo', '🔗 Bisagra e isquios', '💪 Espalda tonificada'],
    foco: 'Día de bisagra y glúteo con la espalda como complemento: el peso muerto rumano es el básico (y el único patrón axial pesado) y después vienen dos bisets que juntan glúteo y tracción en la misma estación: hip thrust a una pierna con la espalda en un cajón junto al remo invertido en el rig, y sentadilla búlgara con el torso inclinado junto al remo a una mano con mancuerna, usando el mismo cajón. El dead bug cierra el core.',
    filas: [
      R('F', 'Peso muerto rumano', '4x6-8|2|150', null, { tp: ['3110'], n: 'Cadera atrás, barra pegada a las piernas y bajada de 3 segundos hasta donde la espalda se mantiene neutra: ahí termina el rango.' }),
      R('B', ['Hip thrust a una pierna', 'Remo invertido / Australian Pull-up'], '3x10/8-12|1|75', null, { tp: ['2012', ''], n: 'Glúteo de a una pierna con la espalda en un cajón y remo invertido en las anillas o la barra del rig: cuanto más horizontal el cuerpo, más difícil.' }),
      R('B', ['Sentadilla búlgara con torso inclinado', 'Remo unilateral a una mano'], '3x8-10/10-12|1|90', null, { tp: ['3110', ''], n: 'Búlgara con el pie de atrás en un cajón bajo y el torso inclinado unos 30° para cargar el glúteo; el remo con una mancuerna, apoyando la mano libre en el mismo cajón.' }),
      R('C', 'Dead bug', '2x8|1|45')
    ] };

  D.BX_3 = { short: 'MIÉ', label: 'Olímpico + Unilateral y Espalda', title: 'Miércoles · Hang Power Snatch, Step Up y Dominadas', wu: 'olim', chips: ['🥇 Olímpico · Hang Power Snatch', '🦵 Unilateral', '💪 Dorsal'],
    foco: 'Segundo día olímpico: el hang power snatch abre la sesión con peso liviano y foco en la técnica y la estabilidad por encima de la cabeza. Después, el step up al cajón junto al gemelo a una pierna (en el mismo cajón) y las dominadas supinas en el rig junto a la abducción acostada con banda, en el piso al lado. La Copenhagen plank cierra el core con trabajo de aductores y oblicuos.',
    filas: [
      R('O', 'Hang Power Snatch', '5x3|3|120', null, { n: 'Peso liviano y técnica: agarre ancho, barra pegada al cuerpo y recepción con los brazos bloqueados y el abdomen firme. Si la barra se va hacia adelante, bajá el peso.' }),
      R('B', ['Step up al cajón', 'Elevación de talones a una pierna'], '3x8-10/12-15|1|75', null, { tp: ['2110', '2211'], n: 'Cajón a la altura de la rodilla: empujá con el talón de la pierna de arriba, sin impulsarte con la de abajo. El gemelo, en el borde del mismo cajón.' }),
      R('B', ['Dominadas supinas', 'Abducción de cadera acostada con banda'], '3x5-8/15-20|1|90', null, { n: 'Dominadas con el pecho hacia la barra; si todavía no salen 5 limpias, usá una banda de asistencia colgada del rig. La abducción con banda va en el piso, al lado.' }),
      R('C', 'Copenhagen plank', '2x20s|1|45')
    ] };

  D.BX_4 = { short: 'JUE', label: 'Glúteo Pesado y Core', title: 'Jueves · Hip Thrust Pesado, Isquios y Postura', wu: 'glute', chips: ['🍑 Hip thrust pesado', '🔗 Isquios', '🧱 Core y postura'],
    foco: 'Día de glúteo pesado sin olímpico: el hip thrust con la espalda en un cajón es el ejercicio de glúteo más pesado de la semana. Después, el curl nórdico (los talones trabados en la barra baja del rig) junto a la abducción caminando con banda, y un biset de postura con el pájaro y las elevaciones laterales con mancuernas, para una espalda alta y unos hombros firmes. La plancha lateral cierra el core.',
    filas: [
      R('F', 'Hip thrust con barra', '4x6-8|1|150', null, { tp: ['2012'], n: 'Espalda alta en un cajón firme, mentón al pecho, pies bajo las rodillas y pausa de 2 segundos arriba. Anotá los kilos: es tu marcador de progreso de glúteo.' }),
      R('B', ['Curl nórdico', 'Abducción caminando con banda'], '3/2x4-6/12 por lado|1|90', null, { n: 'Nórdico con los talones trabados en la barra baja del rig o sostenidos por una compañera: bajá lo más lento que puedas y ayudate con las manos para subir. En la ronda que sobra hacés solo el nórdico.' }),
      R('B', ['Pájaro / Elevaciones posteriores inclinado', 'Elevaciones laterales con mancuernas'], '3x15/12-15|1|60', null, { n: 'Postura y hombro: el pájaro con el torso inclinado lleva las escápulas atrás y las laterales dan forma al hombro. Cargas livianas y rango completo.' }),
      R('C', 'Plancha lateral', '3x30s|1|45')
    ] };

  D.BX_5 = { short: 'VIE', label: 'Olímpico + Cadena Posterior', title: 'Viernes · Clean & Jerk, Bisagra a una Pierna y Postura', wu: 'olim', chips: ['🥇 Olímpico · Clean & Jerk', '🔗 Cadena posterior', '🧱 Core'],
    foco: 'Tercer día olímpico: el clean & jerk abre la sesión con series cortas de 2 repeticiones (cargada desde el piso y envión con impulso de piernas). Después, el peso muerto rumano a una pierna con kettlebell junto al remo invertido en el rig, y un cierre de glúteo y postura con el puente con banda junto al pájaro. El transporte de maleta cierra el core con trabajo anti-inclinación.',
    filas: [
      R('O', 'Clean & Jerk', '6x2|3|120', null, { n: 'Cargada desde el piso y envión con impulso de piernas: cada repetición rápida y limpia. Calentá los hombros con la barra sola antes de la primera serie.' }),
      R('B', ['Peso muerto rumano a una pierna', 'Remo invertido / Australian Pull-up'], '3/2x8-10/8-12|1|75', null, { n: 'Bisagra de a una pierna con una kettlebell en la mano contraria y remo invertido en el rig. En la ronda que sobra hacés solo el rumano.' }),
      R('B', ['Puente de glúteo con banda', 'Pájaro / Elevaciones posteriores inclinado'], '3x15/15|1|60', null, { n: 'Cierre de glúteo y postura: puente con la banda arriba de las rodillas y pájaro con mancuernas livianas. Sin pausa entre los dos.' }),
      R('C', 'Transporte de maleta', '2x20 m por lado|1|60')
    ] };

  var NIV = (PB.NIVELES || [])[0] || {};
  var TPL = { id: ID, g: 'f', f: 5, niv: 'intermedio', nivLb: NIV.lb || 'Desarrollo-Intermedio', suf: NIV.suf || '', dias: ['BX_1', 'BX_2', 'BX_3', 'BX_4', 'BX_5'] };
  /* material del box: todo libre (barra, mancuernas, kettlebell, banda, peso corporal, cajón o rig); ni máquinas ni poleas */
  var PROHIBIDO = /^(Máquina|Multipower|Polea)$/;

  function armarDias(){ return PB.construirDias(TPL); }
  function ficha(dias){
    return {
      id: ID, ic: '🏋️‍♀️', tipo: 'base', sbSys: true, sbSysVer: VER, boxSys: true,
      nombre: NOMBRE, disc: 'hiper', niv: 'intermedio', genero: 'f', freq: 5, tab: 'bb', carpeta: 'base',
      notas: 'Cinco días para una alumna de nivel intermedio que entrena en un box (cajones, barras y discos, mancuernas, kettlebells, bandas y rig con barra y anillas), sin máquinas guiadas ni poleas. Lunes, miércoles y viernes abren con levantamiento olímpico justo después de la entrada en calor (hang power clean, hang power snatch y clean & jerk, en series rectas cortas); martes y jueves son de bisagra y glúteo pesado. Después vienen los bisets de musculación, armados con el material del box en una misma zona, y cada día cierra con un ejercicio de core distinto. Foco en glúteo, piernas y core, con una espalda tonificada en volumen controlado. Volumen semanal en series efectivas: glúteo 24 (el grupo con más volumen), cuádriceps 10, isquiotibiales 10, gemelo 6, espalda 11, hombro posterior 6, hombro lateral 3 y core 11; los brazos y el pecho trabajan solo de forma indirecta. RIR 1-2 en los básicos y RIR 3 en el olímpico (la técnica manda).',
      creado: 'Plantilla del sistema', usos: 0, dias: dias, meso: (typeof defaultWeeks === 'function' ? defaultWeeks() : []),
      meta: { mesoDisc: 'hiper', mesoNivel: 'intermedio', mesoName: NOMBRE, mesoObjetivo: 'Glúteo, piernas y core con levantamiento olímpico · box sin máquinas · 5 días',
              mesoTexto: 'Mesociclo de 4 semanas: S1 base, S2 y S3 con más kilos manteniendo el RIR (en el olímpico solo si todas las repeticiones salen rápidas y limpias) y S4 descarga activa (una serie menos y RIR 3-4).' }
    };
  }
  function hidratar(){
    var n = 0;
    (Array.isArray(S.banco) ? S.banco : []).forEach(function(r){
      if(!r || !r.boxSys || r.id !== ID || (r.dias && r.dias.length)) return;
      try{ r.dias = armarDias(); n++; }catch(e){ console.warn('box hidratar', e); }
    });
    return n;
  }
  function sembrar(forzar){
    if(typeof S === 'undefined' || !S) return 0;
    if(!Array.isArray(S.banco)) S.banco = [];
    S.ui = S.ui || {};
    var ya = S.banco.filter(function(x){ return x.id === ID; })[0], n = 0;
    if(ya){
      if(!ya.editada && (ya.sbSysVer || 0) < VER){ var u = ficha(armarDias()); u.usos = ya.usos || 0; Object.assign(ya, u); n++; }
    } else if((S.ui.boxSeed || 0) < VER || forzar){
      S.banco.unshift(ficha(armarDias())); n++;
    }
    S.ui.boxSeed = VER;
    if(n){ try{ save(); }catch(e){} }
    return n;
  }
  /* control de la plantilla: nombres contra la biblioteca, material permitido, olímpico después de la entrada en calor y core al cierre */
  function validar(){
    var out = { dias: 0, sinResolver: [], prohibidos: [], olimpico: [], core: [] }, dias = armarDias(), EST = PB.EST;
    out.dias = dias.length;
    dias.forEach(function(d, di){
      (d.bloques || []).forEach(function(b){
        var m = EST && EST.parsearBloque(b); if(!m) return;
        m.ex.forEach(function(e){
          if(!e.lib) out.sinResolver.push('D' + (di + 1) + ': ' + e.nombre);
          else if(PROHIBIDO.test(String(e.lib.equipo || '')) || e.t !== 'L') out.prohibidos.push('D' + (di + 1) + ': ' + e.nombre + ' (' + e.lib.equipo + ')');
        });
      });
      if(/^Olímpico/.test((d.bloques[1] || {}).titulo || '')) out.olimpico.push(di + 1);
      if(((d.bloques[d.bloques.length - 1] || {}).modalidad) === 'core') out.core.push(di + 1);
    });
    return out;
  }
  function arranque(){
    try{ hidratar(); sembrar(false); }catch(e){ console.warn('banco box', e); }
    try{ if(typeof renderBanco === 'function' && S.ui && S.ui.view === 'banco') renderBanco(); }catch(e){}
  }
  window.CoachBox = { sembrar: sembrar, hidratar: hidratar, armarDias: armarDias, validar: validar, tpl: TPL, id: ID, nombre: NOMBRE, version: VER };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(arranque, 600); });
  else setTimeout(arranque, 600);
})();
