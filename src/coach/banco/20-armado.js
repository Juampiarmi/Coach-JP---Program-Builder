/* =========================================================
   PLANTILLAS BASE COACH JP · matriz, armado y asignación
   Las sesiones viven en 12-dias-masculino.js y 13-dias-femenino.js (PB.D) y la matriz género x frecuencia en PB.ESTR.
   Acá se cruzan con los niveles, se escribe cada sesión como texto de "Redacción libre" y se pasa por el importador.
   ========================================================= */
(function(){
  'use strict';
  var PB = window.__jpPB; if(!PB) return;
  var D = PB.D, ESTR = PB.ESTR;

  var NIVELES = [
    { k: 'intermedio', lb: 'Desarrollo-Intermedio',
      res: 'Trabajás a RIR 1-2 en los básicos y RIR 1 en los aislamientos, con progresión de carga: S1 base, S2 y S3 con más kilos y S4 descarga. Sesiones completas de 75 a 90 minutos: entrada en calor, básico pesado, volumen, cierre y finisher.',
      suf: ' Trabajás a RIR 1-2 en los básicos y RIR 1 en los aislamientos: subí la carga solo cuando completes todas las series en el techo del rango de repeticiones.',
      meso: 'Mesociclo de 4 semanas: S1 a S3 siempre a RIR 1-2 (nunca al fallo) con sobrecarga progresiva de kilos (S1 base, S2 +2,5%, S3 +5%) y S4 descarga activa (una serie menos, RIR 3-4). Los ejercicios se repiten las 4 semanas: progresan la carga y las repeticiones.' },
    { k: 'avanzado', lb: 'Avanzado / Élite',
      res: 'Volumen de élite con todas las series efectivas a RIR 0-1, básicos con descansos largos, trisets de cierre y técnicas de intensidad (drop-set) solo en los aislamientos. Sesiones de 85 a 100 minutos.',
      suf: ' Nivel avanzado / élite: todas las series efectivas van a RIR 0-1 (las de aproximación no cuentan), con técnica de intensidad solo en aislamientos y descansos largos en los básicos para sostener la carga.',
      meso: 'Mesociclo de 4 semanas para atleta avanzado: S1 a S3 a RIR 0-1 con sobrecarga progresiva de kilos (+2,5 a 5%) y técnica de intensidad en los aislamientos; S4 descarga activa (una serie menos por ejercicio, RIR 3-4).' }
  ];
  var GEN = { m: 'Masculino', f: 'Femenino' };

  function armarLista(){
    var out = [];
    ESTR.forEach(function(e){
      NIVELES.forEach(function(n){
        /* el nivel avanzado / élite puede traer sesiones propias (15-elite.js: ESTR.diasA / estA / resA); el intermedio usa siempre las compartidas */
        var av = n.k === 'avanzado' && e.diasA, est = av && e.estA ? e.estA : e.est, res = av && e.resA ? e.resA : e.res;
        var t = { id: 'jp26_' + e.g + e.f + '_' + (n.k === 'avanzado' ? 'a' : 'i'), g: e.g, gen: GEN[e.g], f: e.f, niv: n.k, nivLb: n.lb, est: est,
          nombre: 'Bodybuilding · ' + GEN[e.g] + ' · ' + e.f + ' días · ' + n.lb,
          resumen: est + '. ' + res + ' ' + n.res + ' Lógica de cada sesión: los básicos de fuerza van en series rectas con descanso completo; la hipertrofia y los accesorios se agrupan en bisets por grupo muscular (pecho con espalda, hombro con tríceps, espalda con bíceps, glúteo con cuádriceps o isquios) siempre en la misma estación o con mancuernas, sin juntar dos máquinas ni dos poleas.', meso: n.meso, suf: n.suf, dias: av ? e.diasA : e.dias };
        out.push(t);
      });
    });
    return out;
  }
  var LISTA = armarLista();

  /* ---------- hipertrofia y accesorios en bisets ----------
     Lógica del Banco: los básicos de fuerza (rol F y los compuestos pesados: hasta 8 repeticiones con 120 s de descanso o más, o 150 s o más) van en SERIES RECTAS con descanso completo;
     el trabajo de hipertrofia y los accesorios (roles H y A) se agrupa en BISETS lógicos por día y grupo muscular: pecho con espalda, hombro con tríceps, espalda con bíceps,
     cuádriceps con isquios, glúteo con cuádriceps o isquios, gemelo con cualquier grupo de pierna. Reglas que no se rompen:
       · mismo número de series en las dos estaciones (se toma la mayor y no se emparejan filas que difieran en más de una serie, así el volumen por grupo casi no cambia);
       · nada de dos máquinas o poleas seguidas (estación compatible según jpEstacionCompat, la misma regla que la logística de sala);
       · los bisets que ya trae el día (cierres de brazos, hombro, glúteo, pierna y gemelo) y el core no se tocan; lo que queda impar queda en serie recta;
       · descanso de la ronda = promedio de las dos estaciones (entre 60 y 120 s); la técnica de intensidad (drop-set) queda en la segunda estación. */
  var AFIN = { 'Pecho|Espalda': 3, 'Espalda|Bíceps': 3, 'Hombro lateral|Tríceps': 3, 'Hombro anterior|Tríceps': 3, 'Hombro posterior|Bíceps': 2, 'Pecho|Tríceps': 2, 'Pecho|Hombro lateral': 2, 'Espalda|Hombro lateral': 1,
    'Espalda|Hombro posterior': 2, 'Cuádriceps|Isquios': 3, 'Glúteo|Cuádriceps': 3, 'Glúteo|Isquios': 3, 'Gemelos|Cuádriceps': 2, 'Gemelos|Isquios': 2, 'Gemelos|Glúteo': 2, 'Hombro lateral|Hombro posterior': 2, 'Bíceps|Tríceps': 3, 'Hombro anterior|Hombro lateral': 2 };
  function afinidad(g1, g2){ return AFIN[g1 + '|' + g2] || AFIN[g2 + '|' + g1] || 0; }
  function nombreDe(fila, av){ return [].concat(av && fila.ea ? fila.ea : fila.ej); }
  function grupoDe(nombre){ try{ return (PB.EST && PB.EST.infoEj) ? (PB.EST.infoEj(nombre).g || '') : ''; }catch(e){ return ''; } }
  function estacionOk(n1, n2){
    try{
      /* dos ejercicios guiados (máquina o polea) seguidos chocan: el biset obliga a ocupar dos estaciones de máquina; siempre al menos uno libre (mancuerna, barra, banda) */
      var t1 = PB.EST.infoEj(n1).t, t2 = PB.EST.infoEj(n2).t;
      if((t1 === 'M' || t1 === 'P') && (t2 === 'M' || t2 === 'P')) return false;
      if(typeof jpEstacion !== 'function' || typeof jpEstacionCompat !== 'function') return true;
      var e1 = PB.exLib(n1), e2 = PB.exLib(n2); if(!e1 || !e2) return true;
      return !!jpEstacionCompat(jpEstacion(e1), jpEstacion(e2));
    }catch(e){ return true; }
  }
  /* estación fija: polea o máquina (no se mueve de lugar); se combina solo con material portátil y sin tocar el volumen del grupo */
  function esFija(n){
    try{
      if(typeof jpEstacion !== 'function') return false;
      var e = PB.exLib(n); if(!e) return false;
      var k = jpEstacion(e); return (typeof jpEsPolea === 'function' && jpEsPolea(k)) || String(k).indexOf('maq:') === 0;
    }catch(x){ return false; }
  }
  function esBasicoPesado(fila, d){
    var mx = Math.max.apply(null, (d.reps.join(' ').match(/\d+/g) || ['12']).map(Number));
    return (mx <= 8 && d.rest >= 120) || d.rest >= 150;
  }
  /* una variante del MISMO grupo muscular (familias curadas del editor: PB.EST.alternativas) cuya estación sea compatible con la pareja; solo se cambia una fila sin nota ni tempo propios */
  function variante(c, contra, usados, genero){
    if(c.f.n || c.f.tp || c.f.ea || !PB.EST || !PB.EST.alternativas) return null;
    var alts = PB.EST.alternativas(c.n, genero) || [];
    for(var i = 0; i < alts.length; i++){
      var nm = alts[i];
      if(usados[nm] || grupoDe(nm) !== c.g || !estacionOk(nm, contra.n)) continue;
      return nm;
    }
    return null;
  }
  function agruparHipertrofia(filas, av, genero){
    var cand = [], usados = {};
    filas.forEach(function(f){ [].concat(f.ej, f.ea || []).forEach(function(n){ if(n) usados[n] = 1; }); });
    filas.forEach(function(f, ix){
      if((f.rol !== 'H' && f.rol !== 'A') || f.fin || (f.ej == null)) return;
      var nombres = nombreDe(f, av), dosis = av ? f.a : f.i;
      if(nombres.length !== 1 || !dosis) return;
      var d = PB.partesDosis(dosis);
      if(esBasicoPesado(f, d) || /\bpor lado\b/i.test(String(d.reps[0])) && f.rol === 'H' && d.rest >= 120) return;
      cand.push({ ix: ix, f: f, d: d, n: nombres[0], g: grupoDe(nombres[0]), usado: false });
    });
    var pares = [];
    cand.forEach(function(x, k){
      if(x.usado) return;
      var mejor = null, mejorPts = 0, mejorCambio = null;
      for(var j = k + 1; j < cand.length && j <= k + 6; j++){
        var y = cand[j]; if(y.usado) continue;
        var pts = afinidad(x.g, y.g); if(!pts || Math.abs(x.d.sets - y.d.sets) > 1) continue;
        /* dos compuestos pesados de pierna seguidos (rumano + búlgara, prensa + sentadilla) saturan: en pierna al menos una de las dos estaciones es un accesorio (rol A) */
        var inf = { 'Glúteo': 1, 'Cuádriceps': 1, 'Isquios': 1 };
        if(inf[x.g] && inf[y.g] && x.f.rol === 'H' && y.f.rol === 'H') continue;
        var cambio = null;
        if(!estacionOk(x.n, y.n)){
          /* estaciones que chocan: se prueba cambiar una de las dos por una variante del mismo grupo que comparta estación con la otra (mancuernas con mancuernas, torre con torre) */
          var vy = variante(y, x, usados, genero), vx = vy ? null : variante(x, y, usados, genero);
          if(vy) cambio = { c: y, a: vy }; else if(vx) cambio = { c: x, a: vx }; else continue;
          pts -= 0.5;
        }
        /* una serie de diferencia solo si no se infla un grupo que ya está en su techo (pecho y cuádriceps): ahí las dos estaciones deben tener las mismas series.
           Los pares con una polea o una máquina (regla anti-colisión: máquina fija + material portátil) exigen las mismas series: el volumen semanal del grupo no se mueve */
        var menor = x.d.sets < y.d.sets ? x : (y.d.sets < x.d.sets ? y : null);
        if(menor && (menor.g === 'Pecho' || menor.g === 'Cuádriceps')) continue;
        if(menor && (esFija(x.n) || esFija(y.n))) continue;
        pts = pts * 10 - Math.abs(x.d.sets - y.d.sets) * 3 - (j - k) - (cambio ? 8 : 0);
        if(pts > mejorPts){ mejorPts = pts; mejor = y; mejorCambio = cambio; }
      }
      if(mejor){
        x.usado = mejor.usado = true;
        if(mejorCambio){ usados[mejorCambio.a] = 1; mejorCambio.c.nuevoNombre = mejorCambio.a; }
        pares.push([x, mejor]);
      }
    });
    if(!pares.length) return filas;
    var porIx = {}, quitar = {};
    pares.forEach(function(p){
      var x = p[0], y = p[1], a1 = x.f, a2 = y.f;
      var sets = Math.max(x.d.sets, y.d.sets), rest = Math.max(60, Math.min(120, Math.round((x.d.rest + y.d.rest) / 2 / 15) * 15)), tec = y.d.tec || x.d.tec;
      function dosisPar(lv){
        var d1 = PB.partesDosis(lv === 'a' ? a1.a : a1.i), d2 = PB.partesDosis(lv === 'a' ? a2.a : a2.i), t = d2.tec || d1.tec;
        return sets + 'x' + d1.reps[0] + '/' + d2.reps[0] + '|' + d1.rir[0] + '/' + d2.rir[0] + '|' + rest + (t ? '|' + t : '');
      }
      var o = { n: [].concat(a1.n || [], a2.n || []) };
      if(!o.n.length) delete o.n;
      if(a1.tp || a2.tp) o.tp = [(a1.tp && a1.tp[0]) || undefined, (a2.tp && a2.tp[0]) || undefined];
      var ej = [x.nuevoNombre || [].concat(a1.ej)[0], y.nuevoNombre || [].concat(a2.ej)[0]];
      if(a1.ea || a2.ea) o.ea = [].concat(a1.ea || a1.ej).concat(a2.ea || a2.ej);
      var par = PB.R('B', ej, dosisPar('i'), dosisPar('a'), o);
      par.agrupada = true;
      porIx[x.ix] = par; quitar[y.ix] = true;
    });
    var out = [];
    filas.forEach(function(f, ix){ if(quitar[ix]) return; out.push(porIx[ix] || f); });
    return out;
  }
  PB.agruparHipertrofia = agruparHipertrofia;

  /* ---------- texto de una sesión (formato Redacción libre) y bloques reales ---------- */
  function filasDe(tpl, i){
    var D0 = D[tpl.dias[i]], av = tpl.niv === 'avanzado';
    return agruparHipertrofia(D0.filas.filter(function(r){ return !(r.soloA && !av) && !(r.soloI && av); }), av, tpl.g);
  }
  function textoSesion(tpl, i){
    var D0 = D[tpl.dias[i]], av = tpl.niv === 'avanzado';
    var T = ['=== DÍA ' + (i + 1) + ': ' + D0.title + ' ===', '[NOMBRE DEL DÍA] ' + D0.title, '[FOCO DEL COACH] ' + D0.foco + tpl.suf];
    T.push(PB.textoWarmup(1, D0.wu, D0.label));
    var n = 2, primero = true, sets = 0, mins = 10;
    filasDe(tpl, i).forEach(function(r){
      var b = PB.textoBloque(n, r, tpl.niv, primero && r.rol === 'F');
      if(r.rol === 'F') primero = false;
      T.push(b.txt); n++; sets += b.sets; mins += b.mins;
    });
    return { txt: T.join('\n'), sets: sets, mins: mins };
  }
  function construirDias(tpl){
    var dias = tpl.dias.map(function(id, i){
      var D0 = D[id], s = textoSesion(tpl, i);
      var r = parsearImportacion(s.txt, true), dia = r.dias[0];
      var d = newDay(i);
      d.id = 'dia' + (i + 1); d.short = 'DÍA ' + (i + 1); d.label = D0.label; d.title = D0.title;
      d.metaChips = D0.chips.concat(['🎚️ ' + tpl.nivLb, '⏱ ~' + (Math.round(s.mins / 5) * 5) + ' min']);
      d.focusTitle = 'Foco Técnico del Día'; d.focusText = dia.foco || (D0.foco + tpl.suf);
      d.bloques = dia.bloques.map(function(b){ return crearBloqueImportado(b, false); });
      return d;
    });
    try{ if(typeof jpSanearLogisticaDias === 'function') jpSanearLogisticaDias(dias, { id: tpl.id }); }catch(eSn){ console.warn('saneo logística', eSn); }
    return dias;
  }
  function metaDe(tpl){
    return { mesoDisc: 'hiper', mesoNivel: tpl.niv, mesoName: tpl.nombre, mesoObjetivo: 'Bodybuilding & Musculación — ' + tpl.gen + ' · ' + tpl.f + ' días · ' + tpl.nivLb, mesoTexto: tpl.resumen + ' ' + tpl.meso };
  }
  /* auditoría: series efectivas por grupo y por semana, RIR, minutos y bisets */
  function auditar(tpl){
    var porGrupo = {}, rirs = { cero: 0, total: 0 }, dias = [], av = tpl.niv === 'avanzado';
    tpl.dias.forEach(function(id, i){
      var s = textoSesion(tpl, i), sets = 0, nb = 0;
      filasDe(tpl, i).forEach(function(r){
        nb++;
        if(r.fin) return;      /* finisher / cardio: sin series de fuerza */
        var b = PB.textoBloque(2, r, tpl.niv, false); sets += b.sets;
        b.grupos.forEach(function(g){ var k = g.grupo + (g.grupo === 'Piernas/Glúteos' ? ' · ' + g.patron : ''); porGrupo[k] = (porGrupo[k] || 0) + g.sets; });
        var d = PB.partesDosis(av ? (r.a || r.i) : r.i);
        [].concat(av && r.ea ? r.ea : r.ej).forEach(function(e, k){ var rr = (d.rir[k] != null ? d.rir[k] : d.rir[d.rir.length - 1]); rirs.total += d.sets; if(parseInt(rr, 10) <= 1) rirs.cero += d.sets; });
      });
      dias.push({ dia: i + 1, titulo: D[id].title, series: sets, minutos: s.mins, bloques: nb });
    });
    return { porGrupo: porGrupo, rirCeroUno: rirs.total ? Math.round(rirs.cero / rirs.total * 100) : 0, dias: dias };
  }

  window.__jpPB.D = D; window.__jpPB.LISTA = LISTA; window.__jpPB.textoSesion = textoSesion; window.__jpPB.construirDias = construirDias;
  window.__jpPB.metaDe = metaDe; window.__jpPB.auditar = auditar; window.__jpPB.NIVELES = NIVELES; window.__jpPB.GEN = GEN;
})();
