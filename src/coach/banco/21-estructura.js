/* =========================================================
   EDITOR ESTRUCTURADO DEL BANCO · swaps, series / RIR / descanso, agregar y quitar ejercicios, alertas automáticas y volumen semanal
   Trabaja sobre los bloques REALES de una plantilla (lista de pizarra: título, items "Nombre / NxM | Tempo | RIR / Rest", objetivo y pautas) y los reescribe con el mismo
   formato del motor (10-motor-textos.js): lo que se edita acá se ve igual en la previsualización, en el Builder y en la app del alumno.
   Parte pura (sin DOM): parsearBloque · lineas · aplicarModelo · cambiarEjercicio · quitarEjercicio · agregarBloque · alternativas · alertasDia · alertasPlan · volumen.
   Parte de pantalla: htmlBloque · htmlAlertasDia · htmlAgregar · htmlPanel y los eventos delegados (la vista previa del Banco los conecta con CoachBaseJP.*).
   ========================================================= */
(function(){
  'use strict';
  var PB = window.__jpPB; if(!PB || !PB.ELITE) return;
  var EL = PB.ELITE, CAT = EL.CAT, FAM = EL.FAM, RANGOS = EL.RANGOS, NO_FEM = EL.NO_FEM;
  var nz = PB.nzz;
  var TECLB = { drop: 'Drop-set', myo: 'Myo-reps', rp: 'Rest-pause' };
  var ES = function(s){ return (typeof esc === 'function') ? esc(s == null ? '' : s) : String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  /* ---------- ejercicio: nombre de la biblioteca, grupo muscular, tipo (libre / máquina / polea) y si es un patrón axial pesado ---------- */
  function sinEN(t){ return String(t || '').replace(/^A\d+\.\s*/, '').replace(/^-\s*/, '').trim(); }
  function resolver(txt){
    var t = sinEN(txt), lib = PB.exLib(t);
    if(!lib){ var corto = t.replace(/\s*\([^()]*\)\s*$/, '').trim(); lib = PB.exLib(corto); if(lib) t = corto; else if(!lib) t = corto || t; }
    return { nombre: lib ? lib.es : t, lib: lib };
  }
  var RXG = [
    ['Core', /plancha|rueda abdominal|dead bug|pallof|crunch|elevacion de piernas|elevacion de rodillas|hollow|woodchop|bird dog|russian|v-ups|toes to bar|bicicleta abdominal|sit-up/],
    ['Gemelos', /gemelo|talones/],
    ['Tríceps', /triceps|press frances|press jm|patada de triceps|fondos entre bancos|flexiones diamante|flexiones cerradas|agarre cerrado/],
    ['Bíceps', /curl(?! femoral| nordico)|biceps/],
    ['Hombro posterior', /pajaro|posterior|face pull|pec deck inverso|rotacion externa|elevaciones w|elevaciones y/],
    ['Hombro lateral', /elevaciones laterales|elevacion lateral/],
    ['Hombro anterior', /press militar|press de hombros|press arnold|push press|elevaciones frontales|remo al menton|landmine|pike/],
    ['Glúteo', /hip thrust|puente de gluteo|patada de gluteo|pull-?through|extension de cadera|abduccion|monster walk|torso inclinado|hiperextension/],
    ['Isquios', /curl femoral|nordico|rumano|buenos dias|peso muerto|good morning/],
    ['Cuádriceps', /sentadilla|prensa|hack|extension de cuadriceps|zancada|step ?up|split squat|bulgar|sissy|goblet|aduccion/],
    ['Espalda', /remo|jalon|dominada|pull-?up|pull-?over|encogimientos|superman|dorsal|australian|barra t/],
    ['Pecho', /press|aperturas|cruce de|pec deck|contractor de pecho|fondos|flexiones|floor press|svend/]
  ];
  var RX_AXIAL = /sentadilla con barra|sentadilla frontal|sentadilla zercher|peso muerto|rumano|buenos dias|remo con barra|remo pendlay|remo yates|press militar de pie|push press/;
  var RX_NO_AXIAL = /mancuerna|multipower|maquina|hack|a una pierna|kettlebell|trap bar/;
  var GRUPO_LIB = { 'Pectoral': 'Pecho', 'Espalda': 'Espalda', 'Hombros': 'Hombro lateral', 'Brazos': 'Bíceps', 'Core': 'Core', 'Piernas/Glúteos': 'Cuádriceps' };
  function infoDe(nombre, lib){
    var c = CAT[nombre]; if(c) return c;
    var n = nz(nombre), g = '';
    for(var i = 0; i < RXG.length; i++){ if(RXG[i][1].test(n)){ g = RXG[i][0]; break; } }
    if(!g && lib) g = GRUPO_LIB[lib.grupo] || '';
    var eq = lib ? String(lib.equipo || '') : '';
    var t = (eq === 'Máquina' || eq === 'Multipower') ? 'M' : (eq === 'Polea' ? 'P' : 'L');
    return { t: t, g: g, ax: (RX_AXIAL.test(n) && !RX_NO_AXIAL.test(n)) ? 1 : 0, h: 'A' };
  }
  function infoEj(txt){ var r = resolver(txt); var i = infoDe(r.nombre, r.lib); return { nombre: r.nombre, lib: r.lib, t: i.t, g: i.g, ax: i.ax, h: i.h }; }

  /* ---------- bloque -> modelo ---------- */
  function esBloqueTrabajo(b){
    return !!(b && b.tipo === 'list' && b.sportsPizarra && b.modalidad !== 'calentamiento' && b.modalidad !== 'metcon' && b.category !== 'warmup' && !/^(metcon|cardio|endurance)$/.test(b.category || ''));
  }
  function rolDe(b){
    var t = String(b.titulo || '');
    if(/^Fuerza principal/i.test(t)) return 'F'; if(/^Accesorios/i.test(t)) return 'A'; if(/^Core\b/i.test(t)) return 'C';
    if(/Triset/i.test(t)) return 'T'; if(/Biset/i.test(t)) return 'B'; return 'H';
  }
  function nombreDeTitulo(b){
    return String(b.titulo || '').replace(/\s*\(\d+\s*MIN\)\s*$/i, '').replace(/^(Fuerza principal|Hipertrofia|Accesorios|Core)\s*[–-]\s*/i, '').replace(/^(Biset|Triset)\s+/i, '').trim();
  }
  function parsearDosis(l){
    var p = String(l).split('|').map(function(x){ return x.trim(); }), m = /^(\d+)\s*x\s*(.+)$/i.exec(p[0] || '');
    if(!m) return null;
    var o = { sets: parseInt(m[1], 10), reps: m[2].trim(), tempo: '', rir: '', tec: '', extra: [] };
    p.slice(1).forEach(function(x){
      var t = /^Tempo\s*([0-9Xx]{4})$/i.exec(x), r = /^RIR\s*(.+)$/i.exec(x), k = null;
      if(t) o.tempo = t[1];
      else if(r) o.rir = r[1].trim();
      else { Object.keys(TECLB).forEach(function(kk){ if(TECLB[kk].toLowerCase() === x.toLowerCase()) k = kk; }); if(k) o.tec = k; else if(x) o.extra.push(x); }
    });
    return o;
  }
  function parsearBloque(b){
    if(!esBloqueTrabajo(b)) return null;
    var ex = [], cur = null, rest = null, multi = false, complejo = false;
    (b.items || []).forEach(function(l){
      var s = String(l).trim(); if(!s) return;
      var mA = /^A(\d+)\.\s*(.+)$/.exec(s), mR = /^(?:rest|descanso)\s*(\d+)\s*s/i.exec(s);
      if(mA){ cur = { etiqueta: mA[2].trim(), dosis: null }; ex.push(cur); multi = true; return; }
      if(mR){ rest = parseInt(mR[1], 10); return; }
      var d = parsearDosis(s);
      if(d){
        if(!cur){ cur = { etiqueta: nombreDeTitulo(b), dosis: null }; ex.push(cur); }
        if(cur.dosis) complejo = true; else cur.dosis = d;
        return;
      }
      if(ex.length && !ex[ex.length - 1].dosis && !multi){ ex[ex.length - 1].etiqueta = s; return; }
      cur = { etiqueta: s, dosis: null }; ex.push(cur);
    });
    if(!ex.length || ex.some(function(e){ return !e.dosis; })) return null;
    var m = { b: b, rol: rolDe(b), multi: multi, complejo: complejo, rest: rest == null ? (parseInt(b.restSeconds, 10) || 60) : rest, ex: [] };
    ex.forEach(function(e){
      var r = resolver(e.etiqueta), i = infoDe(r.nombre, r.lib);
      m.ex.push({ etiqueta: e.etiqueta, nombre: r.nombre, lib: r.lib, t: i.t, g: i.g, ax: i.ax, sets: e.dosis.sets, reps: e.dosis.reps, tempo: e.dosis.tempo, rir: e.dosis.rir, tec: e.dosis.tec, extra: e.dosis.extra });
    });
    return m;
  }
  function rirMin(r){ var n = String(r == null ? '' : r).match(/\d+/g); if(!n) return null; return Math.min.apply(null, n.map(Number)); }

  /* ---------- modelo -> bloque ---------- */
  function lineas(m){
    var L = [];
    m.ex.forEach(function(e, k){
      L.push((m.multi ? 'A' + (k + 1) + '. ' : '') + e.etiqueta);
      L.push(e.sets + 'x' + e.reps + (e.tempo ? ' | Tempo ' + e.tempo : '') + (e.rir !== '' ? ' | RIR ' + e.rir : '') + (e.tec ? ' | ' + TECLB[e.tec] : '') + (e.extra && e.extra.length ? ' | ' + e.extra.join(' | ') : ''));
    });
    L.push('Rest ' + m.rest + 's');
    return L;
  }
  function minutosDe(m){ return PB.minBloque(m.ex[0].sets, m.ex.length, m.rest); }
  /* series / RIR / descanso / técnica: solo cambian las líneas y los minutos del título; objetivo y pautas quedan como estaban */
  function aplicarModelo(m){
    var b = m.b;
    b.items = lineas(m); b.restSeconds = m.rest;
    var mins = '(' + minutosDe(m) + ' MIN)';
    b.titulo = /\(\d+\s*MIN\)/i.test(b.titulo || '') ? String(b.titulo).replace(/\(\d+\s*MIN\)/i, mins) : (String(b.titulo || '') + ' ' + mins).trim();
    if(b.weekItems) delete b.weekItems;
    return b;
  }
  /* cambio de ejercicios: se regenera el bloque completo con el motor (título, objetivo, set-up, cue, cuidado y tempo del ejercicio nuevo) y se conserva el id */
  function esAvanzado(niv){ return /avanz|compet|elite|élite|alto/i.test(String(niv || '')); }
  function rolPara(m){ if(m.ex.length >= 3) return m.rol === 'C' ? 'C' : 'T'; if(m.ex.length === 2) return m.rol === 'C' ? 'C' : 'B'; return (m.rol === 'B' || m.rol === 'T') ? 'A' : m.rol; }
  function regenerar(m, niv, primeroFuerza){
    var b = m.b, av = esAvanzado(niv), rol = rolPara(m), sets = m.ex[0].sets;
    var tec = ''; m.ex.forEach(function(e){ if(e.tec) tec = e.tec; });
    var dosis = sets + 'x' + m.ex.map(function(e){ return e.reps; }).join('/') + '|' + m.ex.map(function(e){ return e.rir === '' ? '1' : e.rir; }).join('/') + '|' + m.rest + (tec ? '|' + tec : '');
    var fila = { rol: rol, ej: m.ex.map(function(e){ return e.nombre; }), i: dosis, a: dosis, tp: m.ex.map(function(e){ return e.tempo || ''; }) };
    var t = PB.textoBloque(1, fila, av ? 'avanzado' : 'intermedio', !!primeroFuerza && rol === 'F');
    var r = parsearImportacion('=== DÍA 1: x ===\n' + t.txt, true), nb = r.dias[0] && r.dias[0].bloques[0];
    if(!nb) return null;
    var nuevo = crearBloqueImportado(nb, false);
    Object.keys(nuevo).forEach(function(k){ if(k !== 'id') b[k] = nuevo[k]; });
    if(b.weekItems) delete b.weekItems;
    return b;
  }
  function primeroFuerzaDe(dia, b){
    var i = (dia.bloques || []).filter(function(x){ return x && x.tipo === 'list' && x.modalidad === 'fuerza'; })[0];
    return i === b;
  }
  function cambiarEjercicio(dia, b, idx, nuevo, niv){
    var m = parsearBloque(b); if(!m || !m.ex[idx]) return null;
    var r = resolver(nuevo);
    m.ex[idx].nombre = r.nombre; m.ex[idx].etiqueta = PB.etiquetaEj(r.nombre); m.ex[idx].tempo = (EL.TP && EL.TP[r.nombre]) || '';
    return regenerar(m, niv, primeroFuerzaDe(dia, b));
  }
  /* quita un ejercicio: si quedan dos o más sigue como biset / triset; si queda uno, el bloque pasa a ser un ejercicio suelto. Devuelve 'bloque' si era el único (el llamador borra el bloque) */
  function quitarEjercicio(dia, b, idx, niv){
    var m = parsearBloque(b); if(!m || !m.ex[idx]) return null;
    if(m.ex.length <= 1) return 'bloque';
    m.ex.splice(idx, 1); m.multi = m.ex.length > 1;
    if(m.ex.length === 1 && m.rol === 'C') m.rol = 'C';
    return regenerar(m, niv, primeroFuerzaDe(dia, b));
  }
  /* ejercicio nuevo = bloque nuevo con dosis por defecto del rol, antes del core / finisher del día */
  function agregarBloque(dia, nombre, niv){
    var r = resolver(nombre), i = infoDe(r.nombre, r.lib), av = esAvanzado(niv);
    var rol = i.g === 'Core' ? 'C' : (i.h || 'A');
    var dosis = rol === 'H' ? '3x8-10|' + (av ? '0-1' : '1-2') + '|90' : (rol === 'C' ? '3x12-15|1|45' : '3x12-15|' + (av ? '0' : '1') + '|60');
    var fila = { rol: rol, ej: [r.nombre], i: dosis, a: dosis, tp: [(EL.TP && EL.TP[r.nombre]) || ''] };
    var t = PB.textoBloque(1, fila, av ? 'avanzado' : 'intermedio', false);
    var p = parsearImportacion('=== DÍA 1: x ===\n' + t.txt, true), nb = p.dias[0] && p.dias[0].bloques[0];
    if(!nb) return null;
    var bloque = crearBloqueImportado(nb, false), bl = dia.bloques = dia.bloques || [], pos = bl.length;
    for(var k = 0; k < bl.length; k++){ var x = bl[k]; if(x && (x.modalidad === 'core' || x.modalidad === 'metcon' || /^(metcon|cardio|endurance)$/.test(x.category || ''))){ pos = k; break; } }
    bl.splice(pos, 0, bloque);
    return { bloque: bloque, pos: pos };
  }

  /* ---------- alternativas (swaps) ---------- */
  function alternativas(nombre, genero){
    var out = [], vistos = {}; vistos[nombre] = 1;
    var fem = String(genero || '').toLowerCase() === 'f';
    FAM.forEach(function(f){ if(f.indexOf(nombre) >= 0) f.forEach(function(n){ if(!vistos[n]){ vistos[n] = 1; if(!(fem && NO_FEM.indexOf(n) >= 0)) out.push(n); } }); });
    /* familias cortas (2-3 variantes casi equivalentes): se completan hasta 3 opciones con ejercicios del catálogo para el MISMO músculo, primero los del mismo patrón de movimiento */
    if(out.length < 3 && CAT[nombre]){
      var mi = CAT[nombre].g, pat = (PB.exLib(nombre) || {}).patron;
      [true, false].forEach(function(mismoPatron){
        Object.keys(CAT).forEach(function(n){
          if(out.length >= 4 || vistos[n] || CAT[n].g !== mi) return;
          if(fem && NO_FEM.indexOf(n) >= 0) return;
          if(mismoPatron && ((PB.exLib(n) || {}).patron !== pat)) return;
          vistos[n] = 1; out.push(n);
        });
      });
    }
    if(out.length < 2){
      var lib = PB.exLib(nombre);
      var lista = (typeof S !== 'undefined' && S.exercises) ? S.exercises : [];
      if(lib) lista.forEach(function(e){
        if(out.length >= 12 || vistos[e.es] || e.grupo !== lib.grupo || e.patron !== lib.patron || /^(Full Body|Multiarticular)/.test(e.grupo || '')) return;
        if(fem && NO_FEM.indexOf(e.es) >= 0) return;
        vistos[e.es] = 1; out.push(e.es);
      });
    }
    return out;
  }
  /* todos los ejercicios agregables, por grupo muscular (catálogo élite) */
  function catalogoAgregable(genero){
    var fem = String(genero || '').toLowerCase() === 'f', g = {};
    Object.keys(CAT).forEach(function(n){ if(fem && NO_FEM.indexOf(n) >= 0) return; (g[CAT[n].g] = g[CAT[n].g] || []).push(n); });
    return g;
  }

  /* ---------- alertas automáticas ---------- */
  function estacionDe(e){ try{ return (e.lib && typeof jpEstacion === 'function') ? jpEstacion(e.lib) : ''; }catch(x){ return ''; } }
  function alertasDia(d, ctx){
    ctx = ctx || {};
    var out = [], ax = [], elite = esAvanzado(ctx.niv);
    (d.bloques || []).forEach(function(b, bi){
      var m = parsearBloque(b); if(!m) return;
      m.ex.forEach(function(e){
        if(e.ax) ax.push(e.nombre);
        var r = rirMin(e.rir);
        if(elite && r != null && r >= 2 && m.rol !== 'C') out.push({ k: 'rir', bi: bi, msg: 'RIR ' + e.rir + ' en «' + e.nombre + '»: en el nivel élite toda serie efectiva va a RIR 0-1.' });
      });
      for(var k = 0; k < m.ex.length - 1; k++){
        var a = m.ex[k], c = m.ex[k + 1];
        if(a.t !== 'L' && c.t !== 'L') out.push({ k: 'guiados', bi: bi, msg: 'Dos ejercicios guiados seguidos en el mismo bloque: «' + a.nombre + '» + «' + c.nombre + '». Cambiá uno por un ejercicio libre.' });
        var ea = estacionDe(a), ec = estacionDe(c);
        if(ea && ec && typeof jpEstacionCompat === 'function' && !jpEstacionCompat(ea, ec)) out.push({ k: 'estacion', bi: bi, msg: '«' + a.nombre + '» y «' + c.nombre + '» se hacen en estaciones distintas (' + jpEstacionLb(ea, a.lib) + ' y ' + jpEstacionLb(ec, c.lib) + '): el biset obliga a cruzar el gimnasio.' });
      }
    });
    if(ax.length >= 2) out.push({ k: 'axial', bi: -1, msg: 'Fatiga axial: ' + ax.length + ' patrones axiales pesados el mismo día (' + ax.join(', ') + '). Dejá uno solo.' });
    return out;
  }
  /* el mismo ejercicio de core en casi todos los días no progresa: se avisa a partir de 3 días */
  function alertasPlan(dias){
    var cuenta = {}, out = [], n = 0;
    (dias || []).forEach(function(d){
      var vistos = {}; n++;
      (d.bloques || []).forEach(function(b){ var m = parsearBloque(b); if(m) m.ex.forEach(function(e){ if(e.g === 'Core' && !vistos[e.nombre]){ vistos[e.nombre] = 1; cuenta[e.nombre] = (cuenta[e.nombre] || 0) + 1; } }); });
    });
    Object.keys(cuenta).forEach(function(k){ if(cuenta[k] >= 3) out.push({ k: 'core', msg: '«' + k + '» está en ' + cuenta[k] + ' de ' + n + ' días: variá el core para que el abdomen progrese.' }); });
    return out;
  }

  /* ---------- volumen semanal por grupo muscular ---------- */
  function volumen(dias, genero, niv){
    var tot = {}, k = String(genero || '').toLowerCase() === 'f' ? 'F' : 'M', R = RANGOS[k], esc = esAvanzado(niv) ? 1 : 0.7;
    var r3 = ((dias || []).length <= 3 && EL.RANGOS3) ? EL.RANGOS3[k] : null;      /* plan de 3 días: pisos ajustados en los grupos secundarios */
    if(r3){ R = Object.assign({}, R, r3); }
    (dias || []).forEach(function(d){ (d.bloques || []).forEach(function(b){ var m = parsearBloque(b); if(m) m.ex.forEach(function(e){ if(e.g) tot[e.g] = (tot[e.g] || 0) + (e.sets || 0); }); }); });
    return Object.keys(R).map(function(g){
      var lo = Math.round(R[g][0] * esc), hi = Math.round(R[g][1] * esc), v = tot[g] || 0;
      return { g: g, v: v, lo: lo, hi: hi, est: v < lo ? 'lo' : (v > hi ? 'hi' : 'ok') };
    });
  }

  /* =========================================================
     PANTALLA
     ========================================================= */
  function aplica(r){ return !!(r && (r.disc === 'hiper' || (r.meta && r.meta.mesoDisc === 'hiper') || r.std === 'jp26')); }
  function ctxDe(r){ return { niv: r && (r.niv || (r.meta && r.meta.mesoNivel)) || '', genero: (r && (r.genero || '')) || '' }; }
  var TIPO_LB = { L: 'Libre', M: 'Máquina guiada', P: 'Polea' };

  function htmlBloque(b, di, bi, ctx){
    var m = parsearBloque(b); if(!m || m.complejo) return '';
    var h = '<div class="est-bl" data-estb="' + di + ':' + bi + '"><div class="est-hd"><span></span><span>Ejercicio (cambialo con el desplegable)</span><span>Series × reps</span><span>RIR</span><span></span></div>';
    m.ex.forEach(function(e, k){
      var alts = alternativas(e.nombre, ctx.genero), ops = '<option value="' + ES(e.nombre) + '" selected>' + ES(PB.etiquetaEj(e.nombre)) + '</option>';
      alts.forEach(function(n){ ops += '<option value="' + ES(n) + '">' + ES(PB.etiquetaEj(n)) + '</option>'; });
      h += '<div class="est-r"><span class="est-n">' + (m.multi ? 'A' + (k + 1) : (bi + 1)) + '</span>' +
        '<div class="est-nm"><select class="pv-ei est-sel" data-est="swap" data-i="' + k + '" aria-label="Ejercicio">' + ops + '</select>' +
        '<span class="est-tags"><i class="est-t t' + e.t + '" title="' + TIPO_LB[e.t] + '">' + e.t + '</i>' + (e.ax ? '<i class="est-t tX" title="Patrón axial pesado">AXIAL</i>' : '') + '<small>' + ES(e.g) + '</small></span></div>' +
        '<input class="pv-ei est-in" data-est="sr" data-i="' + k + '" value="' + ES(e.sets + 'x' + e.reps) + '" aria-label="Series por repeticiones" placeholder="Series x reps">' +
        '<input class="pv-ei est-in" data-est="rir" data-i="' + k + '" value="' + ES(e.rir) + '" aria-label="RIR" placeholder="RIR">' +
        '<button type="button" class="btn xs ghost est-x" data-est="quitar" data-i="' + k + '" title="' + (m.ex.length > 1 ? 'Quitar este ejercicio del bloque' : 'Quitar el bloque') + '">✕</button></div>';
    });
    var tec = ''; m.ex.forEach(function(e){ if(e.tec) tec = e.tec; });
    h += '<div class="est-ft"><label>Descanso (s)<input class="pv-ei est-in" data-est="rest" value="' + m.rest + '" inputmode="numeric"></label>' +
      '<label>Técnica de intensidad<select class="pv-ei est-in" data-est="tec">' + [['', 'Ninguna']].concat(Object.keys(TECLB).map(function(k){ return [k, TECLB[k]]; })).map(function(o){ return '<option value="' + o[0] + '"' + (o[0] === tec ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' +
      (m.multi ? '<small class="est-nota">En un biset / triset las series son iguales en todas las estaciones.</small>' : '') + '</div></div>';
    return h;
  }
  function htmlAlertasDia(d, di, ctx, pref){
    var al = alertasDia(d, ctx);
    return '<div class="est-al" id="' + (pref || 'estAl') + di + '">' + (al.length ? al.map(function(a){ return '<div class="est-warn">⚠ ' + ES(a.msg) + '</div>'; }).join('') : '<div class="est-ok">✓ Sin alertas: nada de guiados seguidos en un bloque, un solo patrón axial como máximo y RIR 0-1.</div>') + '</div>';
  }
  function htmlAgregar(di, ctx){
    var g = catalogoAgregable(ctx.genero), ops = '<option value="">➕ Agregar un ejercicio al día…</option>';
    Object.keys(g).forEach(function(k){ ops += '<optgroup label="' + ES(k) + '">' + g[k].map(function(n){ return '<option value="' + ES(n) + '">' + ES(PB.etiquetaEj(n)) + '</option>'; }).join('') + '</optgroup>'; });
    return '<div class="est-add"><select class="pv-ei" data-est="agregar" data-d="' + di + '" aria-label="Agregar un ejercicio">' + ops + '</select></div>';
  }
  function htmlPanel(r, id){
    if(!aplica(r)) return '';
    var ctx = ctxDe(r), vol = volumen(r.dias, ctx.genero || 'm', ctx.niv), ap = alertasPlan(r.dias), max = 30;
    var h = '<div class="est-pn" id="' + (id || 'estPanel') + '"><div class="est-pt">📊 Volumen semanal · series efectivas por grupo <small>(' + (esAvanzado(ctx.niv) ? 'rangos de élite' : 'rangos orientativos para el nivel') + ' · ' + (String(ctx.genero).toLowerCase() === 'f' ? 'mujeres' : 'hombres') + ')</small></div><div class="est-vg">';
    vol.forEach(function(x){
      h += '<div class="est-v"><span class="est-vn">' + ES(x.g) + '</span><div class="est-bar"><i style="left:' + Math.min(100, x.lo / max * 100) + '%;width:' + Math.max(1, (x.hi - x.lo) / max * 100) + '%"></i><u class="' + x.est + '" style="width:' + Math.min(100, x.v / max * 100) + '%"></u></div><span class="est-vv ' + x.est + '">' + x.v + ' <small>(' + x.lo + '-' + x.hi + ')</small></span></div>';
    });
    h += '</div><div class="est-leg">Verde = dentro del rango · ámbar = por debajo · rojo = por encima. Se recalcula con cada cambio.</div>' +
      ap.map(function(a){ return '<div class="est-warn">⚠ ' + ES(a.msg) + '</div>'; }).join('') + '</div>';
    return h;
  }

  /* ---------- eventos (delegados): los conecta la vista previa del Banco con CoachBaseJP.estado ---------- */
  var CB = function(){ return window.CoachBaseJP || {}; };
  function ubicar(el){
    var box = el.closest('[data-estb]'); if(!box) return null;
    var p = box.getAttribute('data-estb').split(':').map(Number), r = CB().actual && CB().actual(); if(!r) return null;
    var d = (r.dias || [])[p[0]], b = d && (d.bloques || [])[p[1]]; if(!b) return null;
    return { r: r, d: d, b: b, di: p[0], bi: p[1], box: box };
  }
  function sincronizarCampos(u){
    /* el texto avanzado y el título que están en pantalla se actualizan para que «volcar campos» no pise el cambio */
    var host = u.box.closest('.pv-ed'); if(!host) return;
    var it = host.querySelector('[data-pvf="items"]'), ti = host.querySelector('[data-pvf="titulo"]');
    if(it) it.value = (u.b.items || []).join('\n'); if(ti) ti.value = u.b.titulo || '';
  }
  function repintar(){
    var r = CB().actual && CB().actual(); if(!r) return;
    var ctx = ctxDe(r), pn = document.getElementById('estPanel'); if(pn){ pn.outerHTML = htmlPanel(r); }
    (r.dias || []).forEach(function(d, di){ var el = document.getElementById('estAl' + di); if(el) el.outerHTML = htmlAlertasDia(d, di, ctx); });
  }
  function avisar(t, tipo){ try{ if(typeof toast === 'function') toast(t, tipo); }catch(e){} }
  function alCambiar(e){
    var t = e.target, tipo = t && t.getAttribute && t.getAttribute('data-est'); if(!tipo) return;
    var C = CB(); if(!C.actual || !C.editando || !C.editando()) return;
    if(tipo === 'agregar'){
      if(!t.value) return;
      var r0 = C.actual(), d0 = (r0.dias || [])[parseInt(t.getAttribute('data-d'), 10)]; if(!d0) return;
      C.volcar(); var res = agregarBloque(d0, t.value, ctxDe(r0).niv);
      if(!res) avisar('No se pudo agregar el ejercicio', 'warn'); else { C.refrescar(); avisar('➕ Ejercicio agregado antes del core: ajustá series, RIR y descanso.'); }
      return;
    }
    var u = ubicar(t); if(!u) return;
    var m = parsearBloque(u.b); if(!m) return;
    var k = parseInt(t.getAttribute('data-i'), 10), niv = ctxDe(u.r).niv;
    if(tipo === 'swap'){
      C.volcar();
      if(cambiarEjercicio(u.d, u.b, k, t.value, niv)){ C.refrescar(); avisar('🔄 Ejercicio cambiado: se actualizaron el objetivo, las pautas y el tempo.'); }
      return;
    }
    if(tipo === 'sr'){
      var mm = /^\s*(\d+)\s*[x×]\s*(.+?)\s*$/i.exec(t.value);
      if(!mm){ avisar('Escribí las series y las repeticiones así: 4x8-10', 'warn'); t.value = m.ex[k].sets + 'x' + m.ex[k].reps; return; }
      var sets = parseInt(mm[1], 10);
      m.ex[k].reps = mm[2];
      if(m.multi){ m.ex.forEach(function(x){ x.sets = sets; }); u.box.querySelectorAll('[data-est="sr"]').forEach(function(inp, j){ if(j !== k) inp.value = sets + 'x' + m.ex[j].reps; }); }
      else m.ex[k].sets = sets;
      t.value = m.ex[k].sets + 'x' + m.ex[k].reps;
    } else if(tipo === 'rir'){ m.ex[k].rir = t.value.trim(); }
    else if(tipo === 'rest'){ var rs = parseInt(t.value, 10); if(!(rs >= 0)){ t.value = m.rest; return; } m.rest = rs; t.value = rs; }
    else if(tipo === 'tec'){ m.ex.forEach(function(x, j){ x.tec = (j === m.ex.length - 1) ? t.value : ''; }); }
    else return;
    aplicarModelo(m); sincronizarCampos(u); repintar();
  }
  function alClick(e){
    var t = e.target.closest && e.target.closest('[data-est="quitar"]'); if(!t) return;
    var C = CB(); if(!C.actual || !C.editando || !C.editando()) return;
    var u = ubicar(t); if(!u) return;
    var k = parseInt(t.getAttribute('data-i'), 10), niv = ctxDe(u.r).niv;
    C.volcar();
    var res = quitarEjercicio(u.d, u.b, k, niv);
    if(res === 'bloque'){
      if(!confirm('Es el único ejercicio del bloque: ¿quitar el bloque de la plantilla?')) return;
      u.d.bloques.splice(u.bi, 1); C.refrescar(); return;
    }
    if(res){ C.refrescar(); avisar('✕ Ejercicio quitado del bloque'); }
  }
  document.addEventListener('change', alCambiar);
  document.addEventListener('click', alClick);

  /* ---------- Builder: control de volumen y alertas del plan del alumno activo (plan de hipertrofia de nivel avanzado) ---------- */
  function pintarBuilder(){
    var bar = document.getElementById('estCtlBar');
    try{
      var v = document.getElementById('v-builder'), tabs = document.getElementById('dayTabs');
      var p = (typeof plan === 'function' && typeof S !== 'undefined' && S.activeId) ? plan(S.activeId) : null;
      if(!v || !tabs || !p || !(p.dias || []).length || (typeof esPlanCFActivo === 'function' && esPlanCFActivo(p)) || !(p.meta && p.meta.mesoDisc === 'hiper')){ if(bar) bar.remove(); return; }
      var ath = (S.athletes || []).filter(function(a){ return a.id === S.activeId; })[0] || {};
      var niv = (p.meta && p.meta.mesoNivel) || ath.nivel || '';
      if(!esAvanzado(niv)){ if(bar) bar.remove(); return; }
      var ctx = { niv: niv, genero: /^f/i.test(String(ath.genero || '')) ? 'f' : 'm' };
      var di = Math.max(0, Math.min((p.dias.length - 1), parseInt(S.ui && S.ui.day, 10) || 0)), d = p.dias[di];
      var pseudo = { dias: p.dias, genero: ctx.genero, niv: ctx.niv, disc: 'hiper' };
      var inner = htmlAlertasDia(d, di, ctx, 'estAlB') + htmlPanel(pseudo, 'estPanelB');
      var n = alertasDia(d, ctx).length + alertasPlan(p.dias).length;
      if(!bar){ bar = document.createElement('details'); bar.id = 'estCtlBar'; bar.className = 'card est-ctl'; bar.style.cssText = 'margin:0 0 14px;padding:10px 14px'; tabs.parentNode.insertBefore(bar, tabs); }
      var abierto = bar.open;
      bar.innerHTML = '<summary style="cursor:pointer;font-weight:800;font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:#E5C378">📊 Control del plan · volumen semanal y alertas del ' + ES(d.short || ('día ' + (di + 1))) + ' <span style="font-weight:700;color:' + (n ? '#FF8A8A' : '#5BF0B5') + '">' + (n ? '· ' + n + ' alerta' + (n > 1 ? 's' : '') : '· sin alertas') + '</span></summary><div style="margin-top:10px">' + inner + '</div>';
      bar.open = abierto;
    }catch(e){ if(bar) bar.remove(); }
  }
  ['renderBuilder', 'renderDay', 'go'].forEach(function(fn){
    var f = window[fn]; if(typeof f !== 'function' || f.__jpest) return;
    var w = function(){ var r = f.apply(this, arguments); setTimeout(pintarBuilder, 160); return r; }; w.__jpest = 1; window[fn] = w;
  });
  document.addEventListener('input', function(e){ if(e.target && e.target.matches && e.target.matches('textarea[data-bf="items"]')){ clearTimeout(pintarBuilder.t); pintarBuilder.t = setTimeout(pintarBuilder, 900); } });
  setTimeout(pintarBuilder, 1700);

  /* ---------- estilos ---------- */
  var css = '.est-bl{margin:0 0 10px;padding:10px;border-radius:12px;border:1px solid var(--line-2);background:rgba(0,0,0,.22)}' +
    '.est-hd,.est-r{display:grid;grid-template-columns:30px minmax(0,1fr) 108px 66px 34px;gap:6px;align-items:center}' +
    '.est-hd{font-size:9.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);padding:0 0 4px}' +
    '.est-r{padding:5px 0;border-top:1px solid rgba(255,255,255,.05)}.est-r:first-of-type{border-top:0}' +
    '.est-n{font-family:ui-monospace,Menlo,monospace;font-size:11px;color:#E5C378;text-align:center}' +
    '.est-nm{min-width:0}.est-bl .pv-ei{margin-top:0!important;padding:7px 8px!important;font-size:12.5px!important}' +
    '.est-tags{display:flex;gap:5px;align-items:center;margin-top:3px;flex-wrap:wrap}.est-tags small{font-size:10.5px;color:var(--muted)}' +
    '.est-t{font-style:normal;font-size:9.5px;font-weight:800;letter-spacing:.06em;border-radius:5px;padding:1px 6px}' +
    '.est-t.tL{background:rgba(91,240,181,.15);color:#5BF0B5}.est-t.tM{background:rgba(255,194,75,.16);color:#FFC24B}.est-t.tP{background:rgba(92,225,255,.16);color:#5CE1FF}.est-t.tX{background:rgba(255,107,107,.16);color:#FF8A8A}' +
    '.est-ft{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;margin-top:8px}.est-ft label{display:grid;gap:3px;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}' +
    '.est-ft input{width:96px}.est-ft select{min-width:150px}.est-nota{font-size:11px;color:var(--muted);align-self:center}' +
    '.est-warn{margin:6px 0;padding:7px 11px;border-radius:9px;font-size:12px;line-height:1.5;color:#FFC9C9;background:rgba(255,107,107,.1);border:1px solid rgba(255,107,107,.5)}' +
    '.est-ok{margin:6px 0;padding:7px 11px;border-radius:9px;font-size:12px;line-height:1.5;color:#BDF7DE;background:rgba(91,240,181,.08);border:1px solid rgba(91,240,181,.4)}' +
    '.est-add{margin:8px 0 0}.est-add select{width:100%;box-sizing:border-box;padding:9px 11px;border-radius:10px;border:1px dashed rgba(229,195,120,.55);background:rgba(229,195,120,.06);color:var(--txt);font:700 12.5px system-ui}' +
    '.est-pn{margin:0 0 14px;padding:12px 14px;border-radius:14px;border:1px solid var(--line);background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,0))}' +
    '.est-pt{font-size:12px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#E5C378;margin:0 0 8px}.est-pt small{font-weight:600;color:var(--muted);text-transform:none;letter-spacing:0}' +
    '.est-vg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2px 18px}' +
    '.est-v{display:grid;grid-template-columns:104px 1fr 62px;gap:8px;align-items:center;margin:4px 0;font-size:12px}' +
    '.est-bar{height:10px;border-radius:5px;background:rgba(255,255,255,.07);position:relative;overflow:hidden}.est-bar i{position:absolute;top:0;bottom:0;background:rgba(92,225,255,.22)}' +
    '.est-bar u{position:absolute;top:0;bottom:0;left:0;border-radius:5px;background:#5BF0B5;text-decoration:none}.est-bar u.lo{background:#FFC24B}.est-bar u.hi{background:#FF6B6B}' +
    '.est-vv small{color:var(--muted)}.est-vv.lo{color:#FFC24B}.est-vv.hi{color:#FF8A8A}.est-leg{font-size:11px;color:var(--muted);margin-top:6px}' +
    '@media(max-width:700px){.est-hd{display:none}.est-r{grid-template-columns:minmax(0,1fr) minmax(0,1fr) 38px;gap:6px}.est-n{grid-column:1/-1;text-align:left}.est-nm{grid-column:1/-1}.est-ft input,.est-ft select{width:100%;min-width:0}.est-ft label{flex:1 1 130px}.est-vg{grid-template-columns:1fr}.est-v{grid-template-columns:92px 1fr 58px}}';
  try{ var st = document.createElement('style'); st.id = 'estEstilos'; st.textContent = css; document.head.appendChild(st); }catch(e){}

  PB.EST = { parsearBloque: parsearBloque, parsearDosis: parsearDosis, lineas: lineas, aplicarModelo: aplicarModelo, cambiarEjercicio: cambiarEjercicio, quitarEjercicio: quitarEjercicio, agregarBloque: agregarBloque,
    alternativas: alternativas, catalogoAgregable: catalogoAgregable, alertasDia: alertasDia, alertasPlan: alertasPlan, volumen: volumen, infoEj: infoEj, resolver: resolver, rirMin: rirMin, esAvanzado: esAvanzado,
    aplica: aplica, ctxDe: ctxDe, htmlBloque: htmlBloque, htmlAlertasDia: htmlAlertasDia, htmlAgregar: htmlAgregar, htmlPanel: htmlPanel, repintar: repintar, pintarBuilder: pintarBuilder };
})();
