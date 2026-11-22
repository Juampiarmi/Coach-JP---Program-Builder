/* =========================================================
   STORYCARD · MARCA "EDITORIAL INSTAGRAM" (solo Sports & Bodybuilding)
   Un solo diseno oficial: blanco + naranja #FF5500 + etiqueta cian sobre negro neutro, esquinas de camara,
   barra vertical naranja y anillos concentricos como en el feed. Datos reales de la sesion:
   tonelaje, series, duracion (primera a ultima serie registrada), RPE, top sets, PR y racha del mesociclo.
   Reemplaza a Cyber-Grit / PR Champion (que quedan sin uso). Respeta la foto de fondo del alumno.
========================================================= */
(function(){
  'use strict';
  var W = 1080, H = 1920, OR = '#FF5500', CY = '#38BDF8', INK = '#07080A';
  var MESES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  var CHAKRA = '"Chakra Petch", "Barlow Condensed", sans-serif';
  var MONO = '"JetBrains Mono", ui-monospace, monospace';
  var fuenteLista = false;

  function fmtNum(n){ n = Math.round(n * 10) / 10; return n.toLocaleString('es-AR'); }
  function fechaTxt(){ var f = new Date(); return ('0' + f.getDate()).slice(-2) + ' ' + MESES[f.getMonth()] + ' ' + f.getFullYear(); }
  function fuente(g, peso, px, fam){ g.font = peso + ' ' + px + 'px ' + (fam || CHAKRA); }
  /* achica la fuente hasta que el texto entre en maxW (nunca pasa de base ni baja de min) */
  function ajustar(g, txt, maxW, base, min, peso, fam){
    var px = base; fuente(g, peso, px, fam);
    while(g.measureText(txt).width > maxW && px > min){ px -= 2; fuente(g, peso, px, fam); }
    return px;
  }
  function envolver(g, txt, maxW, maxLin){
    var pal = String(txt || '').split(' '), lin = [], act = '';
    pal.forEach(function(p){
      var t = act ? act + ' ' + p : p;
      if(g.measureText(t).width <= maxW || !act){ act = t; } else { lin.push(act); act = p; }
    });
    if(act) lin.push(act);
    if(lin.length > maxLin){
      lin = lin.slice(0, maxLin);
      var u = lin[maxLin - 1];
      while(u.length > 1 && g.measureText(u + '…').width > maxW) u = u.slice(0, -1);
      lin[maxLin - 1] = u.replace(/[ ,.;:-]+$/, '') + '…';
    }
    return lin;
  }

  /* duracion REAL: de la primera a la ultima serie registrada del dia (sin botones manuales) */
  /* duracion de la sesion: de la primera a la ultima serie registrada, pero SOLO si la ventana es creible (hasta 3 h y sin huecos de
     mas de 60 min entre series). Si no (se dejo la app abierta, se cargo todo despues, no hay horas continuas) se estima a partir de las
     series efectivas: ~4,3 min por serie (15 series = 1 h 05 min), entre 20 y 150 min. Devuelve { min, estimada, series }. */
  function duracionSesion(){
    var ts = [], series = 0, bloquesHechos = {};
    try{
      var pref = state.currentWeek + '|' + state.currentDay + '|';
      Object.keys(state.loads || {}).forEach(function(k){
        if(k.indexOf(pref) !== 0) return;
        var l = state.loads[k] || {};
        if(!l.done) return;
        series++;
        bloquesHechos[k.split('|')[2]] = 1;
        var t = l.tsDone || l.ts;
        if(t > 0) ts.push(t);
      });
    }catch(e){}
    var tt = null, prog = 0, tope = 120;
    try{
      if(typeof window.jpTiempoSesion === 'function'){ tt = window.jpTiempoSesion(); if(tt && tt.tope) tope = tt.tope; }
      if(typeof window.jpMinutosPrescriptos === 'function') prog = window.jpMinutosPrescriptos() || 0;
    }catch(e2){}
    /* tiempo EFECTIVO: tramos entre series registradas (un hueco de mas de 20 min es una pausa y no cuenta) + unos minutos de arranque.
       Si todo se cargo despues de entrenar (no hay tiempos creibles) se usa lo programado de los bloques hechos. Nunca supera el tope del dia. */
    if(ts.length >= 2){
      ts.sort(function(a, b){ return a - b; });
      var neto = 0;
      for(var i = 1; i < ts.length; i++){ var gap = (ts[i] - ts[i - 1]) / 60000; if(gap > 0 && gap <= 20) neto += gap; }
      neto = Math.round(neto + 3);
      if(neto >= 8 && (!prog || neto >= prog * 0.4)) return { min: Math.min(neto, tope), estimada: false, series: series };
    }
    if(series < 1) return { min: 0, estimada: true, series: 0 };
    var est = prog > 0 ? prog : Math.round(series * 3.5);
    try{
      var diaAct = DAYS.filter(function(x){ return x.id === state.currentDay; })[0], tot = ((diaAct && diaAct.blocks) || []).length, hechos = Object.keys(bloquesHechos).length;
      if(prog > 0 && tot > 0 && hechos > 0 && hechos < tot) est = Math.round(prog * hechos / tot);
    }catch(e3){}
    return { min: Math.max(15, Math.min(est, tope)), estimada: true, series: series };
  }
  window.CoachDuracionSesion = duracionSesion;
  function minutosPrimerUltimoSet(){ var d = duracionSesion(); return d.min || null; }
  window.CoachMinutosSets = minutosPrimerUltimoSet;
  /* nombres para el resumen tactico: sin prefijo de estacion, sin (traduccion) ni "x" huerfana */
  function limpiarNombre(n){
    var t = String(n || '');
    t = t.replace(/\s*\([^)]*\)\s*$/, '');
    t = t.replace(/^\s*[A-Za-z]\d{1,2}[.):\-]\s*/, '');
    t = t.replace(/(?:\s+[xX]|\s*[×*])\s*$/, '');
    return t.replace(/\s{2,}/g, ' ').trim();
  }
  function recortar(g, txt, maxW){
    var t = String(txt);
    if(g.measureText(t).width <= maxW) return t;
    while(t.length > 1 && g.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    return t.replace(/[ ,.;:-]+$/, '') + '…';
  }

  function esquinas(g){
    var m = 64, L = 104;
    g.save(); g.strokeStyle = OR; g.lineWidth = 7; g.lineCap = 'butt';
    [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(function(c){
      g.beginPath(); g.moveTo(c[0], c[1] + c[3] * L); g.lineTo(c[0], c[1]); g.lineTo(c[0] + c[2] * L, c[1]); g.stroke();
    });
    g.restore();
  }
  function escudo(g, x, y, s){
    g.save(); g.translate(x, y); g.scale(s, s);
    g.fillStyle = OR;
    g.beginPath(); g.moveTo(32, 2); g.lineTo(60, 12); g.lineTo(60, 36);
    g.bezierCurveTo(60, 54, 47, 66, 32, 72); g.bezierCurveTo(17, 66, 4, 54, 4, 36);
    g.lineTo(4, 12); g.closePath(); g.fill();
    g.fillStyle = INK;
    g.beginPath(); g.moveTo(36, 18); g.lineTo(21, 40); g.lineTo(30, 40);
    g.lineTo(27, 58); g.lineTo(43, 34); g.lineTo(33, 34); g.closePath(); g.fill();
    g.restore();
  }
  function check(g, x, y, s, col){
    g.save(); g.strokeStyle = col; g.lineWidth = 6; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + s * .38, y + s * .38); g.lineTo(x + s, y - s * .42); g.stroke(); g.restore();
  }

  function prDeHoy(d){
    try{
      var hoy = new Date().toISOString().slice(0, 10), det = d.prDetalle || (state.session && state.session.prDetalle) || [];
      var nombres = (d.prs || []).map(function(n){ return String(n).toLowerCase(); });
      var hit = det.filter(function(p){ return p.fecha === hoy && nombres.indexOf(String(p.ex).toLowerCase()) >= 0; });
      if(hit.length) return { ex: hit[0].ex, kg: parseFloat(hit[0].kg) || 0, n: nombres.length };
      if(nombres.length) return { ex: d.prs[0], kg: 0, n: nombres.length };
    }catch(e){}
    return null;
  }

  /* resumen técnico del estímulo de la sesión por grupo muscular (a partir de las series efectivas de HOY, nunca de otras sesiones) */
  function textoEnfasis(gs){
    if(!gs || !gs.length) return 'Registrá las series de la sesión para ver cómo se repartió el estímulo entre los grupos musculares.';
    var low = function(n){ return String(n || '').toLowerCase(); };
    var top = gs[0], t = '';
    var lista = function(a){ return a.length > 1 ? a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1] : (a[0] || ''); };
    if(typeof window.jpEsTrenInferior === 'function' && window.jpEsTrenInferior(gs)){
      /* tren inferior: el encabezado lo nombra una sola vez y los renglones de arriba son solo los músculos específicos */
      var inferiores = gs.filter(function(x){ return /^(CUÁDRICEPS|ISQUIOS|GLÚTEO|GEMELOS)$/.test(x.nombre); });
      var subs = inferiores.slice(0, 4).map(function(x){ return low(x.nombre); });
      var pctInf = Math.min(100, inferiores.reduce(function(s, x){ return s + (x.pct || 0); }, 0));
      t = 'Sesión de tren inferior: ' + lista(subs) + (subs.length > 1 ? ' concentran' : ' concentra') + ' el ' + pctInf + '% de las series efectivas';
    } else if(top.pct >= 50){
      var apoyo = gs.slice(1, 3).map(function(x){ return low(x.nombre); });
      t = 'Estímulo mecánico dominante en ' + low(top.nombre) + ' (' + top.pct + '% de las series efectivas)' + (apoyo.length ? ', con trabajo complementario de ' + lista(apoyo) : '');
    } else {
      t = 'Sesión de reparto equilibrado: ' + low(top.nombre) + (gs[1] ? ' y ' + low(gs[1].nombre) : '') + ' lideran el estímulo (' + top.pct + '%' + (gs[1] ? ' y ' + gs[1].pct + '%' : '') + ' de las series)' + (gs[2] ? ', con ' + low(gs[2].nombre) + ' como complemento' : '');
    }
    return t + '.';
  }
  window.jpTextoEnfasis = textoEnfasis;
  function dibujarMarca(d){
    var c = document.getElementById('storyCanvas'); if(!c) return;
    d = d || {};
    if(typeof window.CoachStoryDatos === 'function' && d.ejDetalle == null){ try{ d = window.CoachStoryDatos(d); }catch(e){} }
    var g = c.getContext('2d');
    window.__storyLast = { tipo: 'cyber', d: d };
    g.clearRect(0, 0, W, H);
    g.textBaseline = 'alphabetic';

    /* ---------- fondo: negro neutro + anillos concentricos (o la foto del alumno con su overlay) ---------- */
    window.storyFondoFoto(g, W, H, function(){
      g.fillStyle = INK; g.fillRect(0, 0, W, H);
      var gl = g.createRadialGradient(W * .94, -80, 30, W * .94, -80, 980);
      gl.addColorStop(0, 'rgba(255,85,0,.13)'); gl.addColorStop(1, 'rgba(255,85,0,0)');
      g.fillStyle = gl; g.fillRect(0, 0, W, H);
      g.save(); g.strokeStyle = 'rgba(255,255,255,.04)'; g.lineWidth = 2;
      for(var r = 160; r <= 1300; r += 150){ g.beginPath(); g.arc(W * .84, H * .64, r, 0, Math.PI * 2); g.stroke(); }
      g.restore();
    });
    esquinas(g);

    var X = 112, XT = 156, MW = W - X * 2;

    /* ---------- encabezado: etiqueta cian, fecha, filete naranja ---------- */
    var dia = String(d.diaCorto || String(d.sesion || '').split(' · ')[0] || 'DÍA').toUpperCase();
    var tag = '[ ' + dia + (d.semanaN ? ' · SEMANA ' + d.semanaN : '') + ' ]';
    g.textAlign = 'left'; g.fillStyle = CY; fuente(g, 600, 30, MONO); g.fillText(tag, X, 300);
    g.textAlign = 'right'; g.fillStyle = 'rgba(255,255,255,.55)'; fuente(g, 500, 28, MONO); g.fillText(fechaTxt(), W - X, 300);
    g.fillStyle = OR; g.fillRect(X, 328, 128, 7);

    /* ---------- nombre: nombre en blanco, apellido en naranja, con barra vertical ---------- */
    var partes = String(d.atleta || 'ATLETA').toUpperCase().split(' ').filter(Boolean);
    var l1 = partes[0] || 'ATLETA', l2 = partes.slice(1).join(' ');
    var maxN = W - XT - X;
    var s1 = ajustar(g, l1, maxN, 108, 56, 700), s2 = l2 ? ajustar(g, l2, maxN, 108, 56, 700) : 0;
    var tamN = Math.min(s1, s2 || s1);
    g.textAlign = 'left';
    fuente(g, 700, tamN); g.fillStyle = '#FFFFFF'; g.fillText(l1, XT, 462);
    var yN = 462;
    if(l2){ fuente(g, 700, tamN); g.fillStyle = OR; yN = 462 + tamN + 4; g.fillText(l2, XT, yN); }
    var tit = String(d.tituloSesion || '').toUpperCase();
    var yTitFin = yN;
    if(tit){
      fuente(g, 600, 32); g.fillStyle = 'rgba(255,255,255,.62)';
      var lt = envolver(g, tit, maxN, 2);
      lt.forEach(function(ln, i){ g.fillText(ln, XT, yN + 58 + i * 44); });
      yTitFin = yN + 58 + (lt.length - 1) * 44;
    }
    g.fillStyle = OR; g.fillRect(X, 392, 8, yTitFin - 392 + 14);

    /* ---------- hero: tonelaje total + semana activa del ciclo ---------- */
    var vol = Math.round(parseFloat(d.vol) || 0);
    var yH = Math.max(yTitFin + 120, 790);
    g.textAlign = 'left'; g.fillStyle = 'rgba(255,255,255,.55)'; fuente(g, 600, 28, MONO); g.fillText('[ TONELAJE TOTAL MOVIDO ]', X, yH);
    if(d.semanaN){
      var sTxt = 'SEMANA ' + d.semanaN; fuente(g, 700, 30, MONO);
      var sW = g.measureText(sTxt).width + 52;
      g.fillStyle = OR; rr(g, W - X - sW, yH - 40, sW, 54, 27); g.fill();
      g.fillStyle = INK; g.textAlign = 'center'; g.fillText(sTxt, W - X - sW / 2, yH - 3); g.textAlign = 'left';
    }
    var vTxt = vol > 0 ? fmtNum(vol) : '—';
    var base = 250;
    var wKg = 0;
    do {
      fuente(g, 700, base); var wv = g.measureText(vTxt).width;
      fuente(g, 700, Math.round(base * .42)); wKg = g.measureText(' KG').width;
      if(wv + wKg <= MW || base <= 120) break;
      base -= 8;
    } while(true);
    fuente(g, 700, base); g.fillStyle = '#FFFFFF'; g.fillText(vTxt, X, yH + base * .86);
    var wVal = g.measureText(vTxt).width;
    if(vol > 0){ fuente(g, 700, Math.round(base * .42)); g.fillStyle = OR; g.fillText(' KG', X + wVal, yH + base * .86); }
    var fase = String(d.semanaNom || '').split(' (')[0].toUpperCase();
    var yS = yH + base * .86 + 62;
    if(fase){
      fuente(g, 600, 27, MONO); g.fillStyle = CY; g.fillText(recortar(g, fase, MW), X, yH + base * .86 + 54);
      yS += 40;
    }
    g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(X, yS - 30, MW, 2);

    /* ---------- fila de volumen de trabajo: series efectivas, repeticiones totales y RPE (o ejercicios) ---------- */
    var repsT = Math.round(parseFloat(d.reps) || 0);
    var tercera = (d.rpe > 0) ? { v: String(d.rpe).replace('.', ','), l: 'RPE PROMEDIO' } : { v: String((d.listaEj || []).length || '—'), l: 'EJERCICIOS' };
    var cols = [
      { v: String(parseInt(d.series, 10) || 0), l: 'SERIES EFECTIVAS' },
      { v: repsT > 0 ? fmtNum(repsT) : '—', l: 'REPS TOTALES' },
      tercera
    ];
    var cw = MW / 3;
    cols.forEach(function(k, i){
      var cx = X + cw * i + (i ? 34 : 0);
      var mw = cw - (i ? 44 : 34);
      g.textAlign = 'left'; g.fillStyle = (i === 0) ? OR : '#FFFFFF';
      var px = ajustar(g, k.v, mw, 84, 44, 700); g.fillText(k.v, cx, yS + 70);
      g.fillStyle = 'rgba(255,255,255,.5)'; fuente(g, 500, 22, MONO); g.fillText(k.l, cx, yS + 112);
      if(i){ g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(X + cw * i, yS + 8, 2, 120); }
    });
    var yR = yS + 190;
    g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(X, yR - 40, MW, 2);

    /* ---------- énfasis muscular: grupos principales trabajados (sin listado crudo de ejercicios) ---------- */
    g.textAlign = 'left'; g.fillStyle = CY; fuente(g, 600, 28, MONO); g.fillText('[ ÉNFASIS MUSCULAR ]', X, yR + 4);
    var pr = prDeHoy(d);
    if(pr){
      var ptxt = 'NUEVO PR' + (pr.kg > 0 ? ' · ' + fmtNum(pr.kg) + ' KG' : '');
      fuente(g, 700, 26, MONO);
      var pw = g.measureText(ptxt).width + 44;
      g.fillStyle = OR; rr(g, W - X - pw, yR - 30, pw, 46, 23); g.fill();
      g.fillStyle = INK; g.textAlign = 'center'; g.fillText(ptxt, W - X - pw / 2, yR + 4); g.textAlign = 'left';
    }
    var gs = (d.grupos || []).slice(0, 4), yG = yR + 56, LIM = 1700;
    var nB = Math.max(gs.length ? 1 : 0, Math.min(gs.length, Math.floor((LIM - yG - 140) / 68)));
    for(var gi = 0; gi < nB; gi++){
      var gr = gs[gi], gy = yG + gi * 68;
      g.textAlign = 'left'; g.fillStyle = (gi === 0) ? '#FFFFFF' : 'rgba(255,255,255,.82)'; fuente(g, 700, gi === 0 ? 38 : 32); g.fillText(gr.nombre, X, gy + 30);
      g.textAlign = 'right'; g.fillStyle = (gi === 0) ? OR : 'rgba(255,255,255,.6)'; fuente(g, 700, 28, MONO); g.fillText(gr.pct + '%', W - X, gy + 30);
      g.fillStyle = 'rgba(255,255,255,.1)'; rr(g, X, gy + 42, MW, 12, 6); g.fill();
      g.fillStyle = (gi === 0) ? OR : 'rgba(255,85,0,.55)'; rr(g, X, gy + 42, Math.max(14, MW * Math.min(100, gr.pct) / 100), 12, 6); g.fill();
    }
    var yTx = yG + nB * 68 + 8;
    g.textAlign = 'left'; g.fillStyle = 'rgba(255,255,255,.74)'; fuente(g, 500, 30);
    var lnE = envolver(g, textoEnfasis(gs.length ? (d.grupos || []) : []), MW, 3);
    lnE.forEach(function(ln, li){ g.fillText(ln, X, yTx + 36 + li * 42); });
    var yEnd = yTx + 36 + (lnE.length - 1) * 42 + 20;

    /* ---------- firma ---------- */
    var yP = Math.min(Math.max(yEnd + 30, 1690), H - 190);
    escudo(g, X, yP, .95);
    g.textAlign = 'left'; fuente(g, 700, 34); g.fillStyle = '#FFFFFF'; g.fillText('COACH', X + 84, yP + 30);
    var wc = g.measureText('COACH ').width; g.fillStyle = OR; g.fillText('JP', X + 84 + wc, yP + 30);
    g.fillStyle = 'rgba(255,255,255,.5)'; fuente(g, 500, 22, MONO); g.fillText('@coachjp.training', X + 84, yP + 62);
    g.textAlign = 'right'; g.fillStyle = OR; fuente(g, 600, 22, MONO); g.fillText('// SESIÓN COMPLETADA', W - X, yP + 46);

    /* las tipografias de marca se cargan de forma diferida: se repinta una vez cuando estan listas */
    if(!fuenteLista && document.fonts && document.fonts.load){
      fuenteLista = true;
      Promise.all([document.fonts.load('700 60px "Chakra Petch"'), document.fonts.load('500 24px "JetBrains Mono"')])
        .then(function(){ try{ dibujarMarca(d); }catch(e){} }).catch(function(){});
    }
    return c;
  }
  function rr(g, x, y, w, h, r){
    g.beginPath(); g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  /* ---------- CrossFit: el mismo diseno, el protagonista es el SCORE del WOD ---------- */
  function scoreHumano(sc){
    var t = String(sc || '').trim(), nivel = '', m;
    if((m = t.match(/\s*\[(DEVELOPMENT|ADVANCED|RX|ELITE|SCALED)\]\s*$/i))){ nivel = m[1].toUpperCase(); t = t.replace(/\s*\[(DEVELOPMENT|ADVANCED|RX|ELITE|SCALED)\]\s*$/i, '').trim(); }
    var hero = t, sub = '';
    if((m = t.match(/^(\d+)\s*\+\s*(\d+)$/))){ hero = m[1] + ' RONDAS'; sub = '+ ' + m[2] + ' REPS'; }
    else if((m = t.match(/^(\d+)\s*:\s*(\d{1,2})$/))){ hero = m[1] + ':' + ('0' + m[2]).slice(-2); sub = 'TIEMPO FINAL'; }
    else if((m = t.match(/^CAP\s*\+\s*(\d+)$/i))){ hero = 'CAPPED'; sub = '+ ' + m[1] + ' REPS'; }
    else if((m = t.match(/^(\d+)\s*rondas?(?:\s*·\s*([\d.,]+)\s*kg)?$/i))){ hero = m[1] + ' RONDAS'; sub = m[2] ? m[2] + ' KG' : ''; }
    return { hero: hero.toUpperCase(), sub: sub, nivel: nivel };
  }
  function dibujarMarcaCF(d){
    var c = document.getElementById('storyCanvas'); if(!c) return;
    d = d || {};
    var g = c.getContext('2d');
    window.__storyLast = { tipo: 'cf', d: d };
    g.clearRect(0, 0, W, H); g.textBaseline = 'alphabetic';
    window.storyFondoFoto(g, W, H, function(){
      g.fillStyle = INK; g.fillRect(0, 0, W, H);
      var gl = g.createRadialGradient(W * .94, -80, 30, W * .94, -80, 980);
      gl.addColorStop(0, 'rgba(255,85,0,.13)'); gl.addColorStop(1, 'rgba(255,85,0,0)');
      g.fillStyle = gl; g.fillRect(0, 0, W, H);
      g.save(); g.strokeStyle = 'rgba(255,255,255,.04)'; g.lineWidth = 2;
      for(var r = 160; r <= 1300; r += 150){ g.beginPath(); g.arc(W * .84, H * .64, r, 0, Math.PI * 2); g.stroke(); }
      g.restore();
    });
    esquinas(g);
    var X = 112, XT = 156, MW = W - X * 2, maxN = W - XT - X;

    var tag = '[ ' + String(d.diaCorto || 'DÍA').toUpperCase() + (d.semanaN ? ' · SEMANA ' + d.semanaN : '') + ' ]';
    g.textAlign = 'left'; g.fillStyle = CY; fuente(g, 600, 30, MONO); g.fillText(tag, X, 300);
    g.textAlign = 'right'; g.fillStyle = 'rgba(255,255,255,.55)'; fuente(g, 500, 28, MONO); g.fillText(fechaTxt(), W - X, 300);
    g.fillStyle = OR; g.fillRect(X, 328, 128, 7);

    var partes = String(d.atleta || 'ATLETA').toUpperCase().split(' ').filter(Boolean);
    var l1 = partes[0] || 'ATLETA', l2 = partes.slice(1).join(' ');
    var s1 = ajustar(g, l1, maxN, 108, 56, 700), s2 = l2 ? ajustar(g, l2, maxN, 108, 56, 700) : 0, tamN = Math.min(s1, s2 || s1);
    g.textAlign = 'left'; fuente(g, 700, tamN); g.fillStyle = '#FFFFFF'; g.fillText(l1, XT, 462);
    var yN = 462; if(l2){ fuente(g, 700, tamN); g.fillStyle = OR; yN = 462 + tamN + 4; g.fillText(l2, XT, yN); }
    var tit = String(d.wodTitulo || d.sesionTxt || d.tituloWod || '').toUpperCase(), yTitFin = yN;
    if(tit){
      fuente(g, 600, 32); g.fillStyle = 'rgba(255,255,255,.62)';
      var lt = envolver(g, tit, maxN, 2);
      lt.forEach(function(ln, i){ g.fillText(ln, XT, yN + 58 + i * 44); });
      yTitFin = yN + 58 + (lt.length - 1) * 44;
    }
    g.fillStyle = OR; g.fillRect(X, 392, 8, yTitFin - 392 + 14);

    /* ---------- 3 · CORE: score final grande + categoria ---------- */
    var yH = Math.max(yTitFin + 110, 780), sc = d.score ? scoreHumano(d.score) : null;
    g.textAlign = 'left'; g.fillStyle = 'rgba(255,255,255,.55)'; fuente(g, 600, 28, MONO);
    g.fillText(sc ? '[ SCORE FINAL ]' : '[ VOLUMEN DE FUERZA ]', X, yH);
    if(d.scorePR){
      var ptxt = '▲ NUEVO SCORE'; fuente(g, 700, 26, MONO); var pw = g.measureText(ptxt).width + 44;
      g.fillStyle = OR; rr(g, W - X - pw, yH - 32, pw, 46, 23); g.fill();
      g.fillStyle = INK; g.textAlign = 'center'; g.fillText(ptxt, W - X - pw / 2, yH + 2); g.textAlign = 'left';
    }
    var yy = yH + 70;
    if(d.formatoTxt){ g.fillStyle = CY; fuente(g, 700, 40); g.fillText(String(d.formatoTxt).toUpperCase(), X, yy); yy += 26; }
    var heroTxt, subTxt = '';
    if(sc){ heroTxt = sc.hero; subTxt = sc.sub; }
    else { var vol = Math.round(parseFloat(d.volumenTotal) || 0); heroTxt = vol > 0 ? fmtNum(vol) + ' KG' : (d.kgClave || '—'); }
    var hp = ajustar(g, heroTxt, MW, 170, 80, 700);
    g.fillStyle = '#FFFFFF'; g.fillText(heroTxt, X, yy + hp * .9);
    yy += hp * .9 + 20;
    if(subTxt){ g.fillStyle = OR; fuente(g, 700, 80); g.fillText(subTxt, X, yy + 66); yy += 86; }
    if(sc && sc.nivel){
      var NIV = { DEVELOPMENT: 'DEVELOPMENT', ADVANCED: 'ADVANCED', RX: 'RX', ELITE: 'ELITE', SCALED: 'SCALED' };
      var nTxt = 'CATEGORÍA  ' + (NIV[sc.nivel] || sc.nivel);
      fuente(g, 700, 32, MONO); var nw = g.measureText(nTxt).width + 60;
      g.strokeStyle = OR; g.lineWidth = 3; rr(g, X, yy + 10, nw, 58, 29); g.stroke();
      g.fillStyle = OR; g.textAlign = 'left'; g.fillText(nTxt, X + 30, yy + 49); yy += 84;
    }
    g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(X, yy + 24, MW, 2);

    /* ---------- 4/5/6 · zonas fijas desde abajo: firma, progreso de sesion y metricas (solo las que aplican) ---------- */
    var yP = 1700;
    var dia0 = DAYS.filter(function(x){ return x.id === state.currentDay; })[0], ids0 = dia0 ? dayBlockIds(dia0) : [];
    var hechos0 = dia0 ? ids0.filter(function(id){ return isBlockDone(state.currentWeek, dia0.id, id); }).length : 0, tot0 = ids0.length;
    var yBar = yP - 70;
    var met = [], vol2 = Math.round(parseFloat(d.volumenTotal) || 0), top = parseFloat(d.topLiftKg) || 0;
    if(vol2 > 0) met.push({ v: fmtNum(vol2) + ' KG', l: 'VOLUMEN FUERZA' });
    if(top > 0) met.push({ v: fmtNum(top) + ' KG', l: d.esPR ? 'TOP LIFT · PR' : 'TOP LIFT' });
    try{ var tS = (typeof window.jpTiempoSesion === 'function') ? window.jpTiempoSesion() : null; if(tS && tS.min > 0 && !tS.estimado) met.push({ v: (tS.estimado ? '~' : '') + (typeof window.CoachFmtDuracion === 'function' ? String(window.CoachFmtDuracion(tS.min)).toUpperCase() : tS.min + ' MIN'), l: tS.estimado ? 'TIEMPO ESTIMADO' : 'TIEMPO DE SESIÓN' }); }catch(eT){}
    try{ var rpeS = (typeof checkoutRpeLeer === 'function') ? checkoutRpeLeer()[state.currentWeek + '|' + state.currentDay + '|__sesion'] : null; if(rpeS) met.push({ v: rpeS + '/10', l: 'RPE DE LA SESIÓN' }); }catch(eR){}
    var yMet = yBar - 40 - (met.length ? 112 : 0);
    if(met.length){
      var cwM = MW / met.length;
      g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(X, yMet - 18, MW, 2);
      met.forEach(function(k, i){
        var cx = X + cwM * i + (i ? 30 : 0), mw = cwM - (i ? 40 : 30);
        g.textAlign = 'left'; g.fillStyle = '#FFFFFF'; ajustar(g, k.v, mw, 58, 28, 700); g.fillText(k.v, cx, yMet + 46);
        g.fillStyle = 'rgba(255,255,255,.5)'; fuente(g, 500, 22, MONO); g.fillText(k.l, cx, yMet + 84);
        if(i){ g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(X + cwM * i, yMet + 4, 2, 96); }
      });
    }
    /* movimientos del WOD en el espacio que queda entre el core y las metricas */
    var yR = yy + 70;
    var movs = String(d.estructura || '').split(' · ').filter(function(x){ return x && !/\b(AMRAP|EMOM|FOR TIME|TABATA|EVERY|CHIPPER)\b/.test(x); });
    var limite = (met.length ? yMet - 30 : yBar - 30), disp = Math.min(6, movs.length);
    var pitch = Math.max(40, Math.min(54, Math.floor((limite - (yR + 30)) / Math.max(1, disp + (movs.length > 6 ? 1 : 0)))));
    var cupo = Math.max(1, Math.min(disp, Math.floor((limite - (yR + 30)) / pitch) - (movs.length > disp ? 1 : 0)));
    var movsV = movs.slice(0, cupo), extra = movs.length - movsV.length, tamMov = Math.min(40, pitch - 12);
    g.textAlign = 'left'; g.fillStyle = CY; fuente(g, 600, 28, MONO); g.fillText('[ MOVIMIENTOS ]', X, yR);
    movsV.forEach(function(mv, i){
      var y1 = yR + 44 + i * pitch; g.fillStyle = '#FFFFFF'; ajustar(g, mv, MW - 40, tamMov, 24, 700); g.fillText(recortar(g, limpiarNombre(mv).toUpperCase() || mv, MW - 40), X, y1);
      g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(X, y1 + 14, MW, 2);
    });
    if(extra > 0){ g.fillStyle = 'rgba(255,255,255,.5)'; fuente(g, 500, 24, MONO); g.fillText('+ ' + extra + (extra === 1 ? ' MOVIMIENTO MÁS' : ' MOVIMIENTOS MÁS'), X, yR + 44 + movsV.length * pitch); }
    /* footer: barra de progreso de la sesion + marca */
    var fr = tot0 ? hechos0 / tot0 : 1;
    g.textAlign = 'left'; g.fillStyle = 'rgba(255,255,255,.55)'; fuente(g, 500, 22, MONO); g.fillText('PROGRESO DE LA SESIÓN' + (tot0 ? ' · ' + hechos0 + '/' + tot0 + ' BLOQUES' : ''), X, yBar - 14);
    g.textAlign = 'right'; g.fillStyle = OR; fuente(g, 700, 26, MONO); g.fillText(Math.round(fr * 100) + '%', W - X, yBar - 12);
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(X, yBar, MW, 10);
    g.fillStyle = OR; g.fillRect(X, yBar, Math.max(14, MW * fr), 10);
    escudo(g, X, yP, .95);
    g.textAlign = 'left'; fuente(g, 700, 34); g.fillStyle = '#FFFFFF'; g.fillText('COACH', X + 84, yP + 30);
    var wc = g.measureText('COACH ').width; g.fillStyle = OR; g.fillText('JP', X + 84 + wc, yP + 30);
    g.fillStyle = 'rgba(255,255,255,.5)'; fuente(g, 500, 22, MONO); g.fillText('@coachjp.training', X + 84, yP + 62);
    g.textAlign = 'right'; g.fillStyle = OR; fuente(g, 600, 22, MONO); g.fillText(d.scorePR ? '// NUEVO SCORE' : '// WOD COMPLETADO', W - X, yP + 46);
    if(!fuenteLista && document.fonts && document.fonts.load){
      fuenteLista = true;
      Promise.all([document.fonts.load('700 60px "Chakra Petch"'), document.fonts.load('500 24px "JetBrains Mono"')]).then(function(){ try{ dibujarMarcaCF(d); }catch(e){} }).catch(function(){});
    }
    return c;
  }
  window.CoachStoryMarcaCF = function(d){
    if(window.COACH_DISCIPLINA === 'sports') return null;
    return dibujarMarcaCF(d);
  };
  window.CoachStoryMarca = function(d){
    if(window.COACH_DISCIPLINA !== 'sports') return null;
    return dibujarMarca(d);
  };
})();
