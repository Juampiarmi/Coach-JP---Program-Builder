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
  /* los textos de cada patrón (objetivo, set-up, cue, cuidado) viven en el diccionario: src/shared/i18n/es.motor.js, claves motor.kb.<patrón>.<o|s|c|x>; acá solo queda el tempo */
  function T(k, p){ return (typeof window.jpT === 'function') ? window.jpT(k, p) : k; }
  var KB_TEMPO = {'press_h':'3010', 'press_inc':'3110', 'aper':'3011', 'fondos':'3010', 'pullover':'3011', 'press_v':'2011', 'lateral':'2011', 'delt_post':'2011', 'trap':'1012', 'tracc_v':'2011', 'remo':'2011', 'lumbar':'2012', 'rdl':'3110', 'pmuerto':'2010', 'hip':'2011', 'glute_iso':'2011', 'abduccion':'2011', 'aduccion':'3011', 'sentadilla':'3010', 'prensa':'3110', 'hack':'3110', 'unilat':'2110', 'curl_fem':'3110', 'ext_cuad':'3011', 'gemelo':'2211', 'curl':'3011', 'triceps':'2011', 'triceps_oh':'3011', 'curl_mart':'2011', 'core_ant':'3011', 'core_flex':'3011', 'rdl_def':'3210', 'bulg_incl':'3110', 'patada_cruz':'3011', 'puente_uni':'3012', 'hiper45':'3110', 'gen':'2011'};
  var KB = {};
  Object.keys(KB_TEMPO).forEach(function(id){
    var e = { t: KB_TEMPO[id] };
    ['o', 's', 'c', 'x'].forEach(function(f){ Object.defineProperty(e, f, { enumerable: true, get: function(){ return T('motor.kb.' + id + '.' + f); } }); });
    KB[id] = e;
  });
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
    [/(extension|extensiones) (de )?triceps.*(tras nuca|sobre la cabeza|overhead)/, 'triceps_oh'],
    [/triceps|press frances|press de banca agarre cerrado|patada de triceps|flexiones diamante|flexiones cerradas/, 'triceps'],
    [/curl martillo|curl con agarre neutro/, 'curl_mart'],
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
  /* lb es protocolo (lo leen el importador y el editor); el texto de la pauta vive en el diccionario (motor.tec.<clave>) */
  var TEC = {
    drop: { lb: 'Drop-set', get tip(){ return T('motor.tec.drop'); } },
    myo: { lb: 'Myo-reps', get tip(){ return T('motor.tec.myo'); } },
    rp: { lb: 'Rest-pause', get tip(){ return T('motor.tec.rp'); } }
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
    for(var k = 0; k < lista.length; k++){ if((lista[k].alias || []).some(function(a){ return nzz(a) === n; })) return lista[k]; }      /* nombre anterior (p. ej. «tumbado» → «acostado») */
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
    /* "4/3x8/12": cada estación de un biset conserva SUS series (el volumen semanal no cambia al agrupar); sets = la primera, setsL = una por estación */
    var p = String(s || '').split('|'), m = /^(\d+(?:\s*\/\s*\d+)*)\s*x\s*(.+)$/i.exec((p[0] || '').trim()) || [];
    var setsL = m[1] ? String(m[1]).split('/').map(function(x){ return parseInt(x, 10) || 3; }) : [3];
    return { sets: setsL[0], setsL: setsL, reps: String(m[2] || '10').split('/').map(function(x){ return x.trim(); }), rir: String(p[1] == null ? '1' : p[1]).split('/').map(function(x){ return x.trim(); }), rest: parseInt(p[2], 10) || 90, tec: (p[3] || '').trim() };
  }
  function nombreCorto(n){ return String(n).replace(/\s*\(.*\)\s*$/, ''); }
  function minBloque(sets, estaciones, rest){ return Math.max(4, Math.round(sets * (estaciones * 45 + rest) / 60 + 2)); }
  var TAG = { F: 'FUERZA', H: 'HIPERTROFIA', B: 'HIPERTROFIA', T: 'HIPERTROFIA', A: 'ACCESORIO', M: 'FINISHER', K: 'CARDIO', C: 'CORE' };
  var PREF = { F: 'Fuerza principal', H: 'Hipertrofia', A: 'Accesorios', M: 'Finisher', K: 'Cardio', C: 'Core' };

  /* ---------- notas por rol: por qué está en la sesión, cómo se progresa y qué se tiene que sentir ----------
     cada rol trae [intermedio, avanzado]. Las líneas empiezan con una etiqueta en mayúsculas (el importador las toma como pautas del bloque). */
  var N_ROL = {};
  ['F', 'H', 'A', 'B', 'T', 'C'].forEach(function(r){
    var o = {};
    ['pq', 'pr', 'se'].forEach(function(f){ Object.defineProperty(o, f, { enumerable: true, get: function(){ return [T('motor.rol.' + r + '.' + f + '.i'), T('motor.rol.' + r + '.' + f + '.a')]; } }); });
    N_ROL[r] = o;
  });
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

  /* ---------- pautas pedagógicas por bloque: series de aproximación, por qué esa cantidad de series y cómo elegir la carga ----------
     Los textos viven en el diccionario (motor.ped.* en src/shared/i18n/es.pedagogia.js y en.pedagogia.js); acá solo se calculan los números reales del bloque (series, repeticiones, RIR)
     y se arma el texto con jpT(). Sin "NxM" dentro del texto (el importador lo leería como una dosis). Los rótulos (motor.lbl.*) los reconocen las listas de exclusión del Builder. */
  /* ejercicios que se hacen de a un lado por vez: su dosis es SIEMPRE por lado (cada serie = un lado y después el otro). Una sola regla para todas las plantillas, el editor del Banco y los swaps. */
  var RX_UNILATERAL = /a una (pierna|mano|brazo)|unilateral|bulgar|bulgarian|split squat|step ?up|step ?down|pistol|zancada|plancha lateral|pallof|dead bug|bird dog|copenhagen|patada de (gluteo|triceps)|elevaci(on|ones) laterales?.*polea|woodchop|lenador|curl concentrado|curl femoral de pie|abduccion de cadera (en polea|acostada)/;
  function esUnilateral(nombre){ return RX_UNILATERAL.test(nzz(String(nombre).replace(/\s*\(.*\)\s*$/, ''))); }
  /* PROTOCOLO (no es copy): la dosis del bloque "3x10-12 por lado" la lee jpDosisCanon y el importador; no cambia con el idioma. El texto explicativo sí usa T('motor.ped.lado.sufijo'). */
  var SUFIJO_LADO = ' por lado';
  function conLado(nombre, reps){
    var r = String(reps == null ? '' : reps).trim();
    return (r && esUnilateral(nombre) && !/por\s+(lado|pierna|brazo)/i.test(r)) ? r + SUFIJO_LADO : r;
  }
  function rangoRepsTxt(reps){
    var s = String(reps == null ? '' : reps).trim(), m = /^(\d+)(?:\s*[-–]\s*(\d+))?/.exec(s);
    if(!m) return { lo: 0, hi: 0, tiempo: false, lado: false, txt: s, entre: s };
    var lado = /por\s+(lado|pierna|brazo)/i.test(s), tiempo = /^\d+(?:\s*[-–]\s*\d+)?\s*(?:s|seg|segundos)\b/i.test(s);
    var lo = parseInt(m[1], 10), hi = parseInt(m[2] || m[1], 10);
    return { lo: lo, hi: hi, tiempo: tiempo, lado: lado, txt: lo === hi ? String(lo) : T('motor.ped.rango', { lo: lo, hi: hi }), entre: lo === hi ? String(lo) : T('motor.ped.entre', { lo: lo, hi: hi }) };
  }
  function rirTexto(rir){
    var n = String(rir == null ? '' : rir).match(/\d+/g);
    if(!n) return T('motor.ped.rir.def');
    var lo = Math.min.apply(null, n.map(Number)), hi = Math.max.apply(null, n.map(Number));
    if(lo === 0 && hi === 0) return T('motor.ped.rir.r0');
    if(lo === 0 && hi === 1) return T('motor.ped.rir.r01');
    if(lo === hi) return lo === 1 ? T('motor.ped.rir.r1') : (lo === 2 ? T('motor.ped.rir.r2') : T('motor.ped.rir.rn', { n: lo }));
    return T('motor.ped.rir.rango', { lo: lo, hi: hi });
  }
  function seriesTxt(n){ return T('motor.ped.serie.efectiva', { n: n }); }
  function lineasPedagogia(fila, d, ejs, av){
    var L = [], rol = fila.rol, rr = rangoRepsTxt(conLado(ejs[0], d.reps[0])), rir = d.rir[0], multi = ejs.length > 1;
    var lib0 = exLib(ejs[0]), grupo = (lib0 && lib0.grupo) ? String(lib0.grupo).toLowerCase() : '';
    var musculo = grupo === 'piernas/glúteos' ? T('motor.ped.musculo.piernas') : (grupo ? grupo : T('motor.ped.musculo.def'));
    var dosisTxt = rr.tiempo ? T('motor.ped.dosis.tiempo', { sets: d.sets, rango: rr.txt }) : (rr.hi ? T('motor.ped.dosis.reps', { sets: d.sets, rango: rr.txt, lado: rr.lado ? T('motor.ped.lado.sufijo') : '' }) : d.sets + '');
    var efectivas = T('motor.ped.efectivas', { dosis: dosisTxt, rir: rirTexto(rir) }) + (rr.lado ? T('motor.ped.efectivas.lado', { sets: d.sets }) : '');
    var lblAprox = T('motor.lbl.aprox') + ': ';
    if(!multi && (rol === 'F' || rol === 'H')){
      L.push(lblAprox + T('motor.ped.aprox.' + rol, { efectivas: efectivas, lado: rr.lado ? T('motor.ped.aprox.lado') : '' }));
    } else if(!multi && rol === 'A'){
      L.push(lblAprox + T('motor.ped.aprox.A', { efectivas: efectivas }));
    }
    var porQue;
    if(rol === 'F' || rol === 'H' || rol === 'A' || rol === 'C') porQue = T('motor.ped.porque.' + rol, { series: seriesTxt(d.sets), musculo: musculo });
    else porQue = T('motor.ped.porque.BT', { sets: d.sets, estaciones: ejs.length === 2 ? T('motor.ped.porque.estaciones.2') : T('motor.ped.porque.estaciones.n', { n: ejs.length }) });
    L.push(T('motor.lbl.porque') + ': ' + porQue);
    var carga;
    if(rol === 'C' || rr.tiempo) carga = T('motor.ped.carga.core', { que: rr.tiempo ? T('motor.ped.carga.core.tiempo', { rango: rr.txt }) : T('motor.ped.carga.core.reps', { rango: rr.txt }), rir: rirTexto(rir) });
    else if(multi) carga = T('motor.ped.carga.multi', { rango: rr.txt, rir: rirTexto(rir) });
    else carga = T('motor.ped.carga.single', { entre: rr.entre, lado: rr.lado ? T('motor.ped.lado.sufijo') : '', rir: rirTexto(rir), sube: rr.hi + 3, lo: rr.lo, hi: rr.hi });
    L.push(T('motor.lbl.carga') + ': ' + carga.charAt(0).toUpperCase() + carga.slice(1));
    return L;
  }

  /* texto de un bloque; devuelve { txt, sets, grupos:[{ej,sets}] } */
  function textoBloque(n, fila, niv, esPrimeroFuerza){
    if(fila.fin) return textoEspecial(n, fila, niv);
    var pro = niv === 'pro', av = niv === 'avanzado' || pro, d = partesDosis(pro && fila.p ? fila.p : (av ? (fila.a || fila.i) : fila.i));
    var ejs = [].concat(av && fila.ea ? fila.ea : fila.ej);
    var multi = ejs.length > 1, nombresCortos = ejs.map(nombreCorto);
    var titulo = (fila.rol === 'B' ? 'Hipertrofia – Biset ' : (fila.rol === 'T' ? 'Hipertrofia – Triset ' : (fila.rol === 'C' ? 'Core – ' : (PREF[fila.rol] || 'Hipertrofia') + ' – '))) + nombresCortos.join(' + ');
    var setsDe = function(k){ return (d.setsL && d.setsL[k] != null) ? d.setsL[k] : d.sets; };
    var setsMax = Math.max.apply(null, ejs.map(function(e, k){ return setsDe(k); }));
    var mins = minBloque(setsMax, ejs.length + ejs.filter(esUnilateral).length, d.rest);      /* un ejercicio por lado dura el doble */
    var L = ['[BLOQUE ' + n + '] [' + TAG[fila.rol] + '] ' + titulo + ' (' + mins + ' MIN)'];
    var tecTxt = d.tec && TEC[d.tec] ? ' | ' + TEC[d.tec].lb : '';
    ejs.forEach(function(e, k){
      var reps = conLado(e, d.reps[k] != null ? d.reps[k] : d.reps[d.reps.length - 1]), rir = d.rir[k] != null ? d.rir[k] : d.rir[d.rir.length - 1];
      var dosis = setsDe(k) + 'x' + reps + ' | Tempo ' + tempoFila(fila, k, e) + ' | RIR ' + rir + (k === ejs.length - 1 ? tecTxt : '');
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
      lineasPedagogia(fila, d, ejs, av).forEach(function(x){ L.push(x); });
      if(fila.rol === 'F' && av) L.push('TOP SET + BACK-OFF: la primera serie efectiva es el top set a RIR 1; en las siguientes bajá 5-8% la carga y mantené RIR 0-1.');
    } else {
      ejs.forEach(function(e, k){
        var kb = kbDe(e), id = 'A' + (k + 1);
        L.push(id + ' · SET-UP: ' + kb.s);
        L.push(id + ' · CUE EFICIENTE: Tempo ' + tempoFila(fila, k, e) + ' — ' + kb.c);
        L.push(id + ' · CUIDADO / ERROR COMÚN: ' + kb.x);
      });
      L.push('TRANSICIÓN: pasá de una estación a la otra sin descanso; el descanso de ' + d.rest + 's va recién al terminar cada ronda.');
      var sl = ejs.map(function(e, k){ return setsDe(k); });
      if(sl.some(function(x){ return x !== sl[0]; })){
        L.push('SERIES POR ESTACIÓN: ' + ejs.map(function(e, k){ return 'A' + (k + 1) + ' ' + sl[k]; }).join(' · ') + ' series. Hacés las rondas completas mientras las estaciones tengan series y en las rondas que sobran solo la que todavía tiene, con el mismo descanso.');
      }
      lineasPedagogia(fila, d, ejs, av).forEach(function(x){ L.push(x); });
    }
    if(av && d.tec && TEC[d.tec]) L.push(TEC[d.tec].tip);
    nr.pos.forEach(function(x){ L.push(x); });
    var grupos = ejs.map(function(e, k){ var x = exLib(e); return { ej: e, grupo: x ? x.grupo : '', patron: x ? x.patron : '', sets: setsDe(k) }; });
    return { txt: L.join('\n'), sets: ejs.reduce(function(a, e, k){ return a + setsDe(k); }, 0), grupos: grupos, mins: mins };
  }

  /* ---------- entrada en calor específica por tipo de día: movilidad + activación + potenciación (10 min) ---------- */
  /* los ejercicios de cada entrada en calor (nombre de la biblioteca + cantidad) quedan acá; el objetivo y las pautas viven en el diccionario (motor.wu.<tipo>.obj / tipN) */
  /* 2026-11: las de Bodybuilding (push, pull, upper, legs, glute) pasan de 6 ejercicios y 10 minutos a 4 ejercicios y 7 minutos —uno de movilidad, dos de activación y uno de
     potenciación—: las sesiones ya son largas y las series de aproximación del primer ejercicio terminan de preparar el patrón. La de carrera (run) y la de cuerpo completo (full) no cambian. */
  var WU_ITEMS = {
    push: ['Rotación torácica en cuadrupedia x 6 por lado', 'Apertura de banda x 15', 'Rotación externa manguito rotador x 12 por lado', 'Flexiones de brazos x 8 con pausa de 1 segundo abajo'],
    pull: ['Rotación torácica en cuadrupedia x 6 por lado', 'Retracciones escapulares colgado x 10', 'Face Pull con cuerda x 15', 'Remo invertido / Australian Pull-up x 8'],
    upper: ['Rotación torácica en cuadrupedia x 6 por lado', 'Apertura de banda x 15', 'Face Pull con cuerda x 15', 'Flexiones de brazos x 8'],
    legs: ['Cambio de cadera 90/90 x 5 por lado', 'Puente de glúteo con banda x 12', 'Sentadilla goblet x 8 con pausa de 2 segundos abajo', 'Zancada inversa x 5 por lado'],
    glute: ['Cambio de cadera 90/90 x 5 por lado', 'Puente de glúteo con banda x 15', 'Abducción caminando con banda x 10 por lado', 'Peso muerto rumano a una pierna x 6 por lado'],
    run: ['Cambio de cadera 90/90 x 6 por lado', 'Puente de glúteo con banda x 15', 'Abducción caminando con banda x 12 por lado', 'Zancada inversa x 8 por lado', 'Dead bug x 8 por lado', 'Carrera suave x 6 min con 4 aceleraciones de 15 s al final'],
    full: ['Cambio de cadera 90/90 x 5 por lado', 'Rotación torácica en cuadrupedia x 8 por lado', 'Puente de glúteo con banda x 12', 'Sentadilla goblet x 10', 'Retracciones escapulares colgado x 10', 'Rotación externa manguito rotador x 12 por lado', 'Dead bug x 8 por lado']
  };
  /* minutos de cada entrada en calor (los suma la duración estimada de la sesión) */
  var WU_MIN = { push: 7, pull: 7, upper: 7, legs: 7, glute: 7, run: 10, full: 10 };
  var WU_NTIPS = {push:3,pull:3,upper:3,legs:3,glute:3,run:3,full:3};
  var WU = {};
  Object.keys(WU_ITEMS).forEach(function(k){
    var w = { items: WU_ITEMS[k] };
    Object.defineProperty(w, 'obj', { enumerable: true, get: function(){ return T('motor.wu.' + k + '.obj'); } });
    Object.defineProperty(w, 'tips', { enumerable: true, get: function(){ var o = []; for(var i = 0; i < WU_NTIPS[k]; i++) o.push(T('motor.wu.' + k + '.tip' + i)); return o; } });
    WU[k] = w;
  });
  function textoWarmup(n, tipo, etiqueta){
    var W = WU[tipo], L = ['[BLOQUE ' + n + '] [WARM-UP] Entrada en calor · ' + etiqueta + ' (' + (WU_MIN[tipo] || 10) + ' MIN)'];
    W.items.forEach(function(x){ var m = /^(.*?)\s+x\s+(.+)$/.exec(x); L.push('- ' + (m ? etiquetaEj(m[1]) + ' x ' + m[2] : x)); });
    L.push('[OBJETIVO FISIOLÓGICO]'); L.push(W.obj);
    L.push('[COACHING TIPS & ESTRATEGIA]');
    W.tips.forEach(function(x){ L.push(x); });
    L.push('SET-UP: hacé ' + ((WU_MIN[tipo] || 10) < 10 ? '1 o 2 rondas fluidas' : '2 rondas fluidas') + ', sin fatigarte: el objetivo es entrar en calor, no entrenar. Tenés que arrancar la primera serie pesada con ganas, no cansado.');
    L.push('CUIDADO / ERROR COMÚN: si una articulación molesta, regresioná el ejercicio o salteálo y avisale a tu coach. No se entrena sobre una molestia.');
    return L.join('\n');
  }

  /* registros que llenan los archivos de días (src/coach/banco/1x-*.js) y arma 20-armado.js */
  var D = {}, ESTR = [];

  window.__jpPB = { tempoTxt: tempoTxt, KB: KB, kbDe: kbDe, R: R, textoBloque: textoBloque, textoWarmup: textoWarmup, exLib: exLib, etiquetaEj: etiquetaEj, partesDosis: partesDosis, TEC: TEC, nzz: nzz, D: D, ESTR: ESTR, WU: WU, N_ROL: N_ROL,
    minBloque: minBloque, WU_MIN: WU_MIN, nombreCorto: nombreCorto, PREF: PREF, TAG: TAG, tempoFila: tempoFila, esUnilateral: esUnilateral, conLado: conLado };
})();
