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
  /* ---------- UN SOLO BÁSICO RECTO, TODO LO DEMÁS EN BISETS (2026-11) ----------
     · el primer ejercicio de fuerza del día (rol F; si no hay, el primer compuesto pesado) queda en series rectas con su descanso completo;
     · TODOS los demás ejercicios sueltos (otros básicos, hipertrofia y accesorios) se juntan en bisets prácticos: antagonistas o del mismo sector
       (pecho + espalda, bíceps + tríceps, cuádriceps + isquios, glúteo + gemelo) y, si no, músculo grande + músculo chico (jalón + curl martillo, prensa + gemelo);
     · nunca dos básicos pesados juntos ni dos compuestos de pierna de hipertrofia (salvo que no quede otra pareja), nunca dos guiados y siempre la regla anti-colisión (estacionOk);
     · cada estación conserva SUS series ("4/3x8/12"): el volumen semanal por grupo es exactamente el de las filas del día;
     · descanso de la ronda: el del básico pesado si hay uno (hasta 180 s); si no, el promedio (60-120 s);
     · el que queda impar entra como tercera estación de un biset compatible (triset); el core y los bisets que ya trae el día no se tocan. */
  var GRANDE = { 'Pecho': 1, 'Espalda': 1, 'Cuádriceps': 1, 'Isquios': 1, 'Glúteo': 1 };
  var INF = { 'Glúteo': 1, 'Cuádriceps': 1, 'Isquios': 1 };
  function afinidadAmplia(g1, g2){
    var x = afinidad(g1, g2); if(x) return x;
    if(!g1 || !g2 || g1 === 'Core' || g2 === 'Core') return 0;
    if(!!GRANDE[g1] !== !!GRANDE[g2]) return 2;      /* músculo grande + músculo chico */
    return 1;
  }
  /* versión portátil (mancuernas / banda / peso corporal) del accesorio, del mismo grupo y compatible con la pareja (JP_PORTATIL, ver logística de sala) */
  function portatil(c, contra, usados){
    if(c.pes || c.f.n || typeof jpPortatilDe !== 'function') return null;
    var ops = jpPortatilDe(c.nuevoNombre || c.n);
    for(var i = 0; i < ops.length; i++){
      var nm = ops[i];
      if(usados[nm] || !PB.exLib(nm) || grupoDe(nm) !== c.g || !estacionOk(contra.nuevoNombre || contra.n, nm)) continue;
      return { c: c, a: nm };
    }
    return null;
  }
  function agruparHipertrofia(filas, av, genero){
    var cand = [], usados = {}, principal = -1;
    filas.forEach(function(f){ [].concat(f.ej, f.ea || []).forEach(function(n){ if(n) usados[n] = 1; }); });
    filas.forEach(function(f, ix){
      if(f.fin || f.ej == null) return;
      if(f.rol === 'F' && principal < 0){ principal = ix; return; }      /* el básico del día: series rectas */
      if(f.rol !== 'H' && f.rol !== 'A' && f.rol !== 'F') return;
      var nombres = nombreDe(f, av), dosis = av ? f.a : f.i;
      if(nombres.length !== 1 || !dosis) return;
      var d = PB.partesDosis(dosis), g = grupoDe(nombres[0]);
      if(g === 'Core') return;
      cand.push({ ix: ix, f: f, d: d, n: nombres[0], g: g, pes: f.rol === 'F' || esBasicoPesado(f, d), usado: false });
    });
    /* sin rol F: el primer compuesto pesado hace de básico del día */
    if(principal < 0){ var p0 = cand.filter(function(c){ return c.pes; })[0]; if(p0) cand.splice(cand.indexOf(p0), 1); }
    var grupos = [];
    [0, 1].forEach(function(pasada){
      cand.forEach(function(x, k){
        if(x.usado) return;
        var mejor = null, mejorPts = 0, mejorCambio = null;
        for(var j = k + 1; j < cand.length; j++){
          var y = cand[j]; if(y.usado) continue;
          if(x.pes && y.pes) continue;
          if(pasada === 0 && INF[x.g] && INF[y.g] && x.f.rol !== 'A' && y.f.rol !== 'A') continue;      /* rumano + búlgara saturan: solo si no queda otra */
          var pts = afinidadAmplia(x.g, y.g); if(!pts) continue;
          var cambio = null;
          if(!estacionOk(x.n, y.n)){
            cambio = portatil(y, x, usados) || portatil(x, y, usados);
            if(!cambio){ var vy = variante(y, x, usados, genero), vx = vy ? null : variante(x, y, usados, genero); if(vy) cambio = { c: y, a: vy }; else if(vx) cambio = { c: x, a: vx }; else continue; }
          }
          pts = pts * 10 - (j - k) - (cambio ? 4 : 0);
          if(pts > mejorPts){ mejorPts = pts; mejor = y; mejorCambio = cambio; }
        }
        if(!mejor) return;
        x.usado = mejor.usado = true;
        if(mejorCambio){ usados[mejorCambio.a] = 1; mejorCambio.c.nuevoNombre = mejorCambio.a; }
        grupos.push(mejor.pes && !x.pes ? [mejor, x] : [x, mejor]);      /* el básico pesado va primero (A1) */
      });
    });
    /* impares: tercera estación de un biset compatible y sin básico pesado */
    cand.filter(function(c){ return !c.usado && !c.pes; }).forEach(function(z){
      var entra = function(gr, nm){ return gr.every(function(c){ return estacionOk(c.nuevoNombre || c.n, nm); }) && gr.filter(function(c){ var t0 = ''; try{ t0 = PB.EST.infoEj(c.nuevoNombre || c.n).t; }catch(e){} return t0 === 'M' || t0 === 'P'; }).length + (function(){ var t1 = ''; try{ t1 = PB.EST.infoEj(nm).t; }catch(e){} return (t1 === 'M' || t1 === 'P') ? 1 : 0; })() < 2; };
      var alts = (typeof jpPortatilDe === 'function' && !z.f.n) ? jpPortatilDe(z.n).filter(function(nm){ return PB.exLib(nm) && grupoDe(nm) === z.g && !usados[nm]; }) : [];
      var altPara = function(gr){ for(var i = 0; i < alts.length; i++) if(entra(gr, alts[i])) return alts[i]; return ''; };
      var ok = grupos.filter(function(gr){ return gr.length === 2 && !gr.some(function(c){ return c.pes; }) && gr.some(function(c){ return afinidadAmplia(c.g, z.g); }) && (entra(gr, z.n) || altPara(gr)); })
        .sort(function(p, q){ return Math.abs(p[0].ix - z.ix) - Math.abs(q[0].ix - z.ix); })[0];
      if(ok){ if(!entra(ok, z.n)){ var al = altPara(ok); z.nuevoNombre = al; usados[al] = 1; } ok.push(z); z.usado = true; }
    });
    /* un básico pesado que quedó sin pareja liviana encabeza (A1) un biset liviano compatible: triset con el descanso del básico */
    cand.filter(function(c){ return !c.usado && c.pes; }).forEach(function(z){
      var ok = grupos.filter(function(gr){ return gr.length === 2 && !gr.some(function(c){ return c.pes; }) && gr.every(function(c){ return estacionOk(c.nuevoNombre || c.n, z.n); }) && gr.some(function(c){ return afinidadAmplia(c.g, z.g); }); })
        .sort(function(p, q){ return Math.abs(p[0].ix - z.ix) - Math.abs(q[0].ix - z.ix); })[0];
      if(ok){ ok.unshift(z); z.usado = true; }
    });
    if(!grupos.length) return filas;
    var porIx = {}, quitar = {};
    grupos.forEach(function(gr){
      var pes = gr.some(function(c){ return c.pes; });
      function dosisGrupo(lv){
        var ds = gr.map(function(c){ return PB.partesDosis(lv === 'a' ? (c.f.a || c.f.i) : c.f.i); });
        var sl = ds.map(function(d){ return d.sets; }), mismas = sl.every(function(s){ return s === sl[0]; });
        var rs = ds.map(function(d){ return d.rest; }), rest = pes ? Math.min(180, Math.max.apply(null, rs)) : Math.max(60, Math.min(120, Math.round(rs.reduce(function(s, r){ return s + r; }, 0) / rs.length / 15) * 15));
        var t = ''; ds.forEach(function(d){ if(d.tec) t = d.tec; });
        return (mismas ? sl[0] : sl.join('/')) + 'x' + ds.map(function(d){ return d.reps[0]; }).join('/') + '|' + ds.map(function(d){ return d.rir[0]; }).join('/') + '|' + rest + (t ? '|' + t : '');
      }
      var o = { n: [].concat.apply([], gr.map(function(c){ return [].concat(c.f.n || []); })) };
      if(!o.n.length) delete o.n;
      if(gr.some(function(c){ return c.f.tp; })) o.tp = gr.map(function(c){ return (c.f.tp && c.f.tp[0]) || undefined; });
      var ej = gr.map(function(c){ return c.nuevoNombre || [].concat(c.f.ej)[0]; });
      if(gr.some(function(c){ return c.f.ea; })) o.ea = gr.map(function(c){ return c.nuevoNombre || [].concat(c.f.ea || c.f.ej)[0]; });
      var par = PB.R(gr.length >= 3 ? 'T' : 'B', ej, dosisGrupo('i'), dosisGrupo('a'), o);
      par.agrupada = true;
      var primero = Math.min.apply(null, gr.map(function(c){ return c.ix; }));
      porIx[primero] = par; gr.forEach(function(c){ if(c.ix !== primero) quitar[c.ix] = true; });
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
    try{ if(typeof jpSanearLogisticaDias === 'function') jpSanearLogisticaDias(dias, { id: tpl.id, sinBisets: true }); }catch(eSn){ console.warn('saneo logística', eSn); }
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
