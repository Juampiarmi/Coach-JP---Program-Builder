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
          resumen: est + '. ' + res + ' ' + n.res, meso: n.meso, suf: n.suf, dias: av ? e.diasA : e.dias };
        out.push(t);
      });
    });
    return out;
  }
  var LISTA = armarLista();

  /* ---------- texto de una sesión (formato Redacción libre) y bloques reales ---------- */
  function filasDe(tpl, i){
    var D0 = D[tpl.dias[i]], av = tpl.niv === 'avanzado';
    return D0.filas.filter(function(r){ return !(r.soloA && !av) && !(r.soloI && av); });
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
