/* =========================================================
   LECTURA DEL DÍA · sugerencias de volumen y ejercicios sobre la distribución por grupo muscular (Builder, Sports)
   ---------------------------------------------------------
   El panel «📈 Volumen semanal de series efectivas» ya mostraba CUÁNTO se trabaja cada grupo en el día y en la semana. Esta capa lo
   interpreta frente a la ficha del alumno/a (género, objetivo, énfasis, nivel, restricciones) y propone acciones CONCRETAS, con foco
   en los glúteos:
     · más series en una estación de glúteo que ya está en el día;
     · una estación complementaria (glúteo mayor o glúteo medio) sumada como A2 / A3 de un bloque que ya existe;
     · trabajo de repeticiones altas cuando todo el glúteo del día es pesado;
     · bajar una serie cuando el volumen semanal pasa el rango.
   Reglas del sistema que cada acción respeta:
     · la serie recta principal (el básico del día) NUNCA se toca ni se convierte en biset;
     · una estación nueva solo entra en un bloque compatible por logística (jpEstacionCompat: nunca dos poleas, nunca dos máquinas,
       máquina o polea solo con material portátil) y como máximo hasta un triset;
     · el volumen sube solo si la semana sigue dentro del rango de la meta (nunca se pasa del máximo);
     · los ejercicios vetados o con antecedente directo en la ficha no se proponen.
   API: window.CoachLecturaDia = { analizar(ath, p, di), aplicar(accion), prioridadGluteo(ath) }
   ========================================================= */
(function(){
  'use strict';
  function nz(s){ return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }
  function esc(t){ return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  var MAYOR = ['Hip thrust con mancuerna', 'Puente de glúteo con banda', 'Patada de glúteo en cuadrupedia con mancuerna', 'Patada de glúteo con banda', 'Puente de glúteo a una pierna', 'Hip thrust en máquina', 'Puente de rana'];
  var MEDIO = ['Abducción de cadera acostada con banda', 'Abducción caminando con banda', 'Abducción de cadera en máquina', 'Zancada lateral'];
  var INFERIOR = ['Cuádriceps', 'Glúteo / Isquios', 'Glúteo medio', 'Isquios', 'Piernas', 'Gemelos'];
  var SUPERIOR = ['Pectoral', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Brazos', 'Salud de hombro', 'Antebrazo'];
  var RANGOS = { 'Pectoral': [12, 22], 'Espalda': [12, 22], 'Glúteo / Isquios': [12, 22], 'Cuádriceps': [12, 22], 'Piernas': [12, 22], 'Hombros': [8, 16], 'Bíceps': [8, 16], 'Tríceps': [8, 16], 'Brazos': [8, 16], 'Gemelos': [8, 16], 'Isquios': [8, 16], 'Glúteo medio': [8, 16] };

  /* grupo del panel de volumen para un ejercicio (mismo criterio que volGroup del Builder) */
  function grupo(ex){
    if(!ex) return '';
    var n = nz(ex.es);
    if(ex.grupo === 'Piernas/Glúteos'){
      if(ex.patron === 'Cadera dominante') return 'Glúteo / Isquios';
      if(ex.patron === 'Abducción / Aducción') return 'Glúteo medio';
      if(ex.patron === 'Rodilla dominante') return 'Cuádriceps';
      if(/gemelo|talones|soleo/.test(n)) return 'Gemelos';
      if(/femoral|isquio|nordico/.test(n)) return 'Isquios';
      return 'Piernas';
    }
    if(ex.grupo === 'Brazos') return ex.patron === 'Bíceps' ? 'Bíceps' : (ex.patron === 'Tríceps' ? 'Tríceps' : 'Brazos');
    return ex.grupo;
  }
  function esGluteo(ex){ var g = grupo(ex); return g === 'Glúteo / Isquios' || g === 'Glúteo medio'; }
  function exDe(nombre){ try{ return (typeof jpExDeNombre === 'function') ? jpExDeNombre(nombre) : null; }catch(e){ return null; } }
  function nombreCompleto(ex){ return ex.es + (ex.en ? ' (' + ex.en + ')' : ''); }
  function repsMax(r){ var m = String(r || '').match(/\d+/g); return m ? Math.max.apply(null, m.map(Number)) : 0; }

  /* estaciones de un bloque de Pizarra con la línea de su dosis: [{codigo, nombre, ex, sets, reps, iNombre, iDosis}] */
  var RX_EST = /^([A-F])(\d{1,2})[.):]\s*(.+)$/i, RX_DOS = /^(\d+)\s*x\s*([^|]+?)\s*(?:\|.*)?$/i;
  function estaciones(b){
    var out = [], cur = null, prevNombre = '', prevI = -1, iRest = -1;
    (b.items || []).forEach(function(l, i){
      var t = String(l || '').trim(); if(!t) return;
      var mE = RX_EST.exec(t);
      if(mE){
        var nom = mE[3].replace(/\s*\|.*$/, '').trim();
        cur = { codigo: mE[1].toUpperCase() + mE[2], nombre: nom, iNombre: i, iDosis: -1, sets: 0, reps: '' };
        var mi = /\|\s*(\d+)\s*x\s*([^|]+)/.exec(mE[3]);
        if(mi){ cur.iDosis = i; cur.sets = parseInt(mi[1], 10); cur.reps = mi[2].trim(); cur.enLinea = true; }
        out.push(cur); return;
      }
      var mD = RX_DOS.exec(t);
      if(mD){
        if(!cur){ cur = { codigo: '', nombre: prevNombre, iNombre: prevI, iDosis: -1 }; out.push(cur); }
        if(cur.iDosis < 0){ cur.iDosis = i; cur.sets = parseInt(mD[1], 10); cur.reps = mD[2].trim(); }
        return;
      }
      if(/^(rest|descanso)\b/i.test(t)){ iRest = i; return; }
      if(!cur && !/^[-•]/.test(t)){ prevNombre = t; prevI = i; }
    });
    out.forEach(function(e){ e.ex = exDe(e.nombre); });
    out.iRest = iRest;
    return out;
  }
  function esCalentamiento(b){ return b.category === 'warmup' || b.modalidad === 'calentamiento'; }
  function esTrabajo(b){ return b && b.tipo === 'list' && b.sportsPizarra && !esCalentamiento(b) && !/^(metcon|cardio|endurance)$/.test(b.category || '') && b.modalidad !== 'metcon' && b.modalidad !== 'core' && b.modalidad !== 'movilidad'; }
  /* el básico del día: el bloque de fuerza principal (o, si no está rotulado, el primer bloque de trabajo con un solo ejercicio) */
  function principal(d){
    var bs = (d.bloques || []).filter(esTrabajo);
    var f = bs.filter(function(b){ return b.modalidad === 'fuerza' || /^fuerza principal/i.test(b.titulo || ''); })[0];
    if(f) return f;
    return bs.filter(function(b){ return estaciones(b).length === 1; })[0] || null;
  }

  /* prioridad del glúteo según la ficha */
  function prioridadGluteo(ath){
    ath = ath || {};
    var f = ath.ficha || {}, obj = [].concat(f.objetivo || []).map(nz), enf = [].concat(f.enfasis || []).map(nz), foco = nz(ath.foco), g = nz(ath.genero).charAt(0);
    var estetico = !obj.length || obj.some(function(o){ return /hipertrofia|recomposicion/.test(o); });
    if(enf.indexOf('gluteo') >= 0 || /glute|gluteo/.test(foco)) return { nivel: 'alta', motivo: 'énfasis en glúteo de la ficha' };
    if(g === 'f' && estetico) return { nivel: 'alta', motivo: 'alumna mujer · ' + (obj.length ? obj.join(', ') : 'objetivo estético') };
    if(g === 'f') return { nivel: 'media', motivo: 'alumna mujer · ' + obj.join(', ') };
    if(obj.some(function(o){ return /hipertrofia|recomposicion/.test(o); })) return { nivel: 'media', motivo: obj.join(', ') };
    return { nivel: 'base', motivo: obj.length ? obj.join(', ') : 'sin objetivo estético' };
  }
  var META_SEMANA = { alta: [16, 26], media: [12, 22], base: [10, 20] }, META_DIA = { alta: 9, media: 6, base: 3 };

  function vetado(ath, ex){
    try{ return (typeof checkExercise === 'function') && checkExercise(ath, ex).some(function(a){ return a.level === 'danger'; }); }catch(e){ return false; }
  }
  function conRiesgo(ath, ex){
    try{ return (typeof checkExercise === 'function') && checkExercise(ath, ex).some(function(a){ return a.level === 'warn'; }); }catch(e){ return false; }
  }
  /* mejor bloque donde sumar una estación de la lista: no es el principal, tiene 1 o 2 estaciones resueltas y la estación nueva es compatible con todas */
  function destino(ath, d, lista, prin, usados, preferirInferior){
    var enDia = {}; (d.bloques || []).forEach(function(b){ if(b.tipo === 'list') estaciones(b).forEach(function(e){ if(e.ex) enDia[e.ex.id] = 1; }); });
    var cands = lista.map(exDe).filter(function(ex){ return ex && !enDia[ex.id] && !vetado(ath, ex) && !conRiesgo(ath, ex); });
    var bloques = (d.bloques || []).filter(function(b){ return esTrabajo(b) && b !== prin && usados.indexOf(b) < 0; }).map(function(b){ return { b: b, est: estaciones(b) }; })
      .filter(function(x){ return x.est.length >= 1 && x.est.length <= 2 && x.est.every(function(e){ return e.ex && e.iDosis >= 0 && !e.enLinea; }); });
    var puntaje = function(x){ var inf = x.est.filter(function(e){ return INFERIOR.indexOf(grupo(e.ex)) >= 0; }).length; return (preferirInferior ? inf * 10 : 0) + (x.est.length === 1 ? 3 : 0); };
    bloques.sort(function(a, c){ return puntaje(c) - puntaje(a); });
    for(var i = 0; i < bloques.length; i++){
      var keys = bloques[i].est.map(function(e){ return jpEstacion(e.ex); });
      for(var j = 0; j < cands.length; j++){
        var k = jpEstacion(cands[j]);
        if(keys.every(function(kk){ return jpEstacionCompat(kk, k); })) return { b: bloques[i].b, est: bloques[i].est, ex: cands[j] };
      }
    }
    return null;
  }

  function analizar(ath, p, di){
    var out = { prioridad: prioridadGluteo(ath), sugerencias: [], dia: {}, semana: {} };
    var d = p && p.dias && p.dias[di]; if(!d) return out;
    var v = { total: {}, porDia: [] };
    try{ v = window.jpCalcVolumen(p); }catch(e){}
    var dia = v.porDia[di] || {}, tot = v.total || {}, g = function(o, k){ return o[k] || 0; };
    out.dia = dia; out.semana = tot;
    var pr = out.prioridad.nivel, meta = META_SEMANA[pr], inferior = INFERIOR.reduce(function(s, k){ return s + g(dia, k); }, 0), superior = SUPERIOR.reduce(function(s, k){ return s + g(dia, k); }, 0);
    var gDia = g(dia, 'Glúteo / Isquios') + g(dia, 'Glúteo medio'), gMedio = g(dia, 'Glúteo medio'), gSem = g(tot, 'Glúteo / Isquios') + g(tot, 'Glúteo medio');
    out.esInferior = inferior >= 6 && inferior >= superior; out.gluteoDia = gDia; out.gluteoMedioDia = gMedio; out.gluteoSemana = gSem; out.meta = meta;
    var prin = principal(d), usados = [], S_ = out.sugerencias, inicial = /inicial/.test(nz(ath && ath.nivel));
    var dosisMayor = inicial ? '2x12-15 | Tempo 2011 | RIR 2' : '3x12-15 | Tempo 2011 | RIR 1', dosisMedio = inicial ? '2x15-20 | Tempo 2011 | RIR 2' : '3x15-20 | Tempo 2011 | RIR 1';
    var sumaEstacion = function(lista, dosis, sets, nivel, porque, preferirInf){
      if(gSem + sets > meta[1]) return false;
      var dst = destino(ath, d, lista, prin, usados, preferirInf); if(!dst) return false;
      usados.push(dst.b);
      var conQue = dst.est.map(function(e){ return e.ex.es; }).join(' + ');
      S_.push({ nivel: nivel, txt: porque + ': sumá ' + dst.ex.es + ' (' + dosis.split(' | ')[0] + ') como ' + (dst.est.length === 1 ? 'A2 del bloque «' + conQue + '» (queda en biset)' : 'A3 del biset «' + conQue + '» (queda en triset)') + '.',
        accion: { tipo: 'estacion', bid: dst.b.id, exId: dst.ex.id, dosis: dosis } });
      gSem += sets;
      return true;
    };
    /* 1) día de tren inferior con el glúteo como prioridad */
    if(out.esInferior && pr !== 'base'){
      if(!gMedio) sumaEstacion(MEDIO, dosisMedio, inicial ? 2 : 3, 'alta', 'Falta glúteo medio hoy (estabilidad de cadera y forma lateral del glúteo)', true);
      if(gDia + (S_.length ? 3 : 0) < META_DIA[pr]){
        /* primero, más series en lo que ya está (fuera del básico) */
        var est = []; (d.bloques || []).forEach(function(b){ if(esTrabajo(b) && b !== prin) estaciones(b).forEach(function(e){ if(e.ex && esGluteo(e.ex) && e.iDosis >= 0 && e.sets && e.sets < (pr === 'alta' ? 5 : 4)) est.push({ b: b, e: e }); }); });
        if(est.length && gSem + 1 <= meta[1]){
          var x = est[0];
          S_.push({ nivel: 'media', txt: 'El glúteo suma ' + gDia + ' series hoy (meta del día ≈ ' + META_DIA[pr] + '): pasá ' + x.e.ex.es + ' de ' + x.e.sets + ' a ' + (x.e.sets + 1) + ' series.', accion: { tipo: 'serie', bid: x.b.id, iDosis: x.e.iDosis, delta: 1 } });
          gSem += 1;
        }
        if(gDia + 1 + (S_.length > 1 ? 3 : 0) < META_DIA[pr]) sumaEstacion(MAYOR, dosisMayor, inicial ? 2 : 3, 'alta', 'Al día le falta volumen directo de glúteo mayor', true);
      }
      /* todo el glúteo del día es pesado (≤ 8 repeticiones): repeticiones altas como complemento */
      var gEst = []; (d.bloques || []).forEach(function(b){ if(esTrabajo(b)) estaciones(b).forEach(function(e){ if(e.ex && esGluteo(e.ex)) gEst.push(e); }); });
      if(gEst.length && gEst.every(function(e){ return repsMax(e.reps) && repsMax(e.reps) <= 8; }) && !S_.some(function(s){ return s.accion && s.accion.tipo === 'estacion'; })){
        if(!sumaEstacion(MAYOR, inicial ? '2x15-20 | Tempo 2011 | RIR 2' : '3x15-20 | Tempo 2011 | RIR 1', inicial ? 2 : 3, 'media', 'Todo el glúteo de hoy es pesado (8 repeticiones o menos): sumá trabajo metabólico de 15-20 repeticiones', true))
          S_.push({ nivel: 'media', txt: 'Todo el glúteo de hoy es pesado (8 repeticiones o menos): el próximo bloque de glúteo puede ir a 12-20 repeticiones para sumar estrés metabólico.' });
      }
    }
    /* 2) día de torso con el glúteo como prioridad alta y la semana corta de glúteo: un complemento portátil al cierre */
    if(!out.esInferior && pr === 'alta' && superior && gSem < meta[0]){
      sumaEstacion(MEDIO.concat(MAYOR), dosisMedio, inicial ? 2 : 3, 'media', 'La semana queda corta de glúteo (' + gSem + ' de ' + meta[0] + '-' + meta[1] + ' series) y hoy es día de torso', false);
    }
    /* 3) glúteo por encima del rango semanal: una serie menos fuera del básico */
    if(gSem > meta[1]){
      var ult = null; (d.bloques || []).forEach(function(b){ if(esTrabajo(b) && b !== prin) estaciones(b).forEach(function(e){ if(e.ex && esGluteo(e.ex) && e.iDosis >= 0 && e.sets > 2) ult = { b: b, e: e }; }); });
      S_.push(ult ? { nivel: 'alta', txt: 'El glúteo suma ' + gSem + ' series en la semana (máximo sugerido ' + meta[1] + '): bajá ' + ult.e.ex.es + ' de ' + ult.e.sets + ' a ' + (ult.e.sets - 1) + ' series para recuperar mejor.', accion: { tipo: 'serie', bid: ult.b.id, iDosis: ult.e.iDosis, delta: -1 } }
                  : { nivel: 'alta', txt: 'El glúteo suma ' + gSem + ' series en la semana (máximo sugerido ' + meta[1] + '): conviene bajar una serie en algún accesorio de glúteo.' });
    }
    /* 4) otros grupos del día fuera de su rango semanal (lectura; el ajuste fino queda en manos del coach) */
    Object.keys(dia).sort(function(a, b){ return dia[b] - dia[a]; }).slice(0, 3).forEach(function(k){
      if(k === 'Glúteo / Isquios' || k === 'Glúteo medio' || !RANGOS[k] || S_.length >= 4) return;
      var n = g(tot, k), r = RANGOS[k];
      if(n > r[1] + 2) S_.push({ nivel: 'media', txt: k + ': ' + n + ' series en la semana, arriba del rango ' + r[0] + '-' + r[1] + '. Si la recuperación se resiente, bajá una serie en el accesorio de ' + k.toLowerCase() + ' de hoy.' });
      else if(n < r[0] && pr !== 'alta') S_.push({ nivel: 'info', txt: k + ': ' + n + ' series en la semana, debajo del rango ' + r[0] + '-' + r[1] + '. Hay margen para una serie más en el accesorio de ' + k.toLowerCase() + '.' });
    });
    if(!S_.length) S_.push({ nivel: 'ok', txt: 'La distribución del día está alineada con el objetivo de la ficha: no hace falta ajustar volumen ni ejercicios.' });
    return out;
  }

  /* ---------- aplicar una acción (siempre deshacible con Ctrl+Z) ---------- */
  function aplicar(a, ath){
    if(!a) return false;
    var b = (typeof findBlock === 'function') ? findBlock(a.bid) : null; if(!b || !Array.isArray(b.items)) return false;
    var items = b.items.slice(), prev = b.items.slice();
    if(a.tipo === 'serie'){
      var l = String(items[a.iDosis] || ''), m = /^(\s*)(\d+)(\s*x)/i.exec(l); if(!m) return false;
      var n = Math.max(1, Math.min(6, parseInt(m[2], 10) + (a.delta || 0)));
      items[a.iDosis] = m[1] + n + l.slice(m[1].length + m[2].length);
    } else if(a.tipo === 'estacion'){
      var ex = (S.exercises || []).filter(function(e){ return e.id === a.exId; })[0]; if(!ex) return false;
      var est = estaciones(b); if(!est.length || est.length > 2) return false;
      /* reglas: nunca en el bloque principal, nunca cruzando estaciones */
      var d0 = (typeof curDay === 'function') ? curDay() : null;
      if(d0 && principal(d0) === b) return false;
      var k = jpEstacion(ex); if(!est.every(function(e){ return e.ex && jpEstacionCompat(jpEstacion(e.ex), k); })) return false;
      if(est.length === 1 && !est[0].codigo){ items[est[0].iNombre] = 'A1. ' + String(items[est[0].iNombre]).trim(); est[0].codigo = 'A1'; }
      var num = est.reduce(function(mx, e){ var q = parseInt(String(e.codigo).slice(1), 10) || 0; return Math.max(mx, q); }, 0) + 1, letra = (est[0].codigo || 'A').charAt(0);
      var nuevas = [letra + num + '. ' + nombreCompleto(ex), a.dosis], pos = est.iRest >= 0 ? est.iRest : items.length;
      items.splice.apply(items, [pos, 0].concat(nuevas));
      /* pautas de la estación nueva, en el mismo formato del Banco (se suman a las que ya estaban) */
      try{ if(window.CoachAuto && CoachAuto.tipsBanco){ var tl = CoachAuto.tipsBanco(ex, { ath: ath || null, codigo: letra + num }); if(tl.length) b.tips = (String(b.tips || '').trim() ? String(b.tips).trim() + '\n' : '') + tl.join('\n'); } }catch(eT){}
      /* título: si era el nombre del ejercicio suelto o un "Biset X + Y" automático, acompaña a las estaciones nuevas */
      try{
        var T = jpNucleoTitulo(b.titulo), nombres = est.map(function(e){ return e.ex.es; });
        var eraAuto = !T.nucleo || nz(T.nucleo) === nz(nombres.join(' + ')) || nz(T.nucleo) === nz(nombres[0]) || nz(T.nucleo) === nz((nombres.length === 2 ? 'Biset ' : 'Triset ') + nombres.join(' + '));
        if(eraAuto) b.titulo = T.pre + (nombres.length + 1 === 2 ? 'Biset ' : 'Triset ') + nombres.concat([ex.es]).join(' + ') + T.suf;
      }catch(eTi){}
    } else return false;
    if(window.CoachUndo && typeof CoachUndo.vigilar === 'function'){ try{ CoachUndo.vigilar('Sugerencia del día'); }catch(eU){} }
    b.items = items;
    try{ if(typeof jpSyncTituloPizarra === 'function' && a.tipo === 'estacion') jpSyncTituloPizarra(b, prev); }catch(eS){}
    return true;
  }

  /* ---------- UI: tarjeta debajo del panel de volumen ---------- */
  function css(){
    if(document.getElementById('ldCss')) return;
    var st = document.createElement('style'); st.id = 'ldCss';
    st.textContent =
      '#jpLecturaDia .ld-card{margin:0 0 14px;padding:12px 14px;border:1px solid var(--line-2,#2a2f3a);border-radius:12px;background:rgba(255,255,255,.02)}' +
      '#jpLecturaDia .ld-h{display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-weight:800;font-size:13px}' +
      '#jpLecturaDia .ld-pill{font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;border:1px solid rgba(255,85,0,.45);color:#FFB38A;background:rgba(255,85,0,.08)}' +
      '#jpLecturaDia .ld-pill.media{border-color:rgba(0,229,255,.4);color:#7DF0FF;background:rgba(0,229,255,.06)}#jpLecturaDia .ld-pill.base{border-color:var(--line-2,#2a2f3a);color:var(--muted,#8b94a3);background:transparent}' +
      '#jpLecturaDia .ld-met{margin:6px 0 8px;font-size:12px;color:var(--txt-2,#c3c9d3)}#jpLecturaDia .ld-met b{color:#fff}' +
      '#jpLecturaDia ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}' +
      '#jpLecturaDia li{display:flex;align-items:flex-start;gap:8px;font-size:12.5px;line-height:1.45;padding:7px 9px;border-radius:9px;background:rgba(255,255,255,.025);border-left:3px solid var(--line-2,#2a2f3a)}' +
      '#jpLecturaDia li.alta{border-left-color:#FF5500}#jpLecturaDia li.media{border-left-color:#00B8D4}#jpLecturaDia li.ok{border-left-color:#34D399}' +
      '#jpLecturaDia li span{flex:1}#jpLecturaDia li .btn{flex:0 0 auto}' +
      '#jpLecturaDia .ld-hint{margin-top:8px;font-size:11px;color:var(--muted,#8b94a3);line-height:1.45}';
    document.head.appendChild(st);
  }
  var ultimo = null;
  function pintar(){
    var vol = document.getElementById('volCard'); if(!vol || !vol.parentNode) return;
    var cont = document.getElementById('jpLecturaDia');
    if(!cont){ cont = document.createElement('div'); cont.id = 'jpLecturaDia'; vol.parentNode.insertBefore(cont, vol.nextSibling); }
    var ath = (typeof active === 'function') ? active() : null, p = ath ? plan(ath.id) : null;
    if(!ath || !p || (p.meta && p.meta.mesoDisc === 'crossfit') || !vol.innerHTML){ cont.innerHTML = ''; ultimo = null; return; }
    css();
    var di = Math.min((S.ui && S.ui.day) || 0, p.dias.length - 1), r = analizar(ath, p, di), pr = r.prioridad;
    ultimo = r;
    var lb = { alta: 'Glúteo: prioridad alta', media: 'Glúteo: prioridad media', base: 'Glúteo: volumen de base' }[pr.nivel];
    cont.innerHTML = '<div class="ld-card"><div class="ld-h">🧭 Lectura del día · ' + esc((p.dias[di] || {}).short || ('Día ' + (di + 1))) +
      '<span class="ld-pill ' + pr.nivel + '" title="' + esc(pr.motivo) + '">' + lb + ' · ' + esc(pr.motivo) + '</span></div>' +
      '<div class="ld-met">Glúteo hoy: <b>' + r.gluteoDia + '</b> series' + (r.gluteoMedioDia ? ' (glúteo medio ' + r.gluteoMedioDia + ')' : '') + ' · semana: <b>' + r.gluteoSemana + '</b> de una meta de ' + r.meta[0] + '-' + r.meta[1] + '</div>' +
      '<ul>' + r.sugerencias.map(function(s, i){ return '<li class="' + s.nivel + '"><span>' + esc(s.txt) + '</span>' + (s.accion ? '<button type="button" class="btn xs gold" data-ldap="' + i + '">Aplicar</button>' : '') + '</li>'; }).join('') + '</ul>' +
      '<div class="ld-hint">Las acciones nunca tocan la serie recta principal, suman estaciones solo en bloques compatibles (sin dos poleas ni dos máquinas) y no pasan el máximo semanal. Se deshacen con Ctrl+Z.</div></div>';
  }
  document.addEventListener('click', function(e){
    var t = e.target && e.target.closest && e.target.closest('[data-ldap]'); if(!t || !ultimo) return;
    var s = ultimo.sugerencias[parseInt(t.getAttribute('data-ldap'), 10)]; if(!s || !s.accion) return;
    if(aplicar(s.accion, active())){ try{ save(); }catch(eS){} renderBuilder(); toast('✔ Sugerencia aplicada: ' + s.txt.split(':')[0]); }
    else toast('No se pudo aplicar: el bloque cambió desde la lectura. Revisá el día y volvé a intentar.', 'warn');
  });
  var _rb = window.renderBuilder;
  if(typeof _rb === 'function'){
    window.renderBuilder = function(){ var r = _rb.apply(this, arguments); try{ pintar(); }catch(e){ console.warn('lectura del día', e); } return r; };
  }
  window.CoachLecturaDia = { analizar: analizar, aplicar: aplicar, prioridadGluteo: prioridadGluteo, estaciones: estaciones, principal: principal };
})();
