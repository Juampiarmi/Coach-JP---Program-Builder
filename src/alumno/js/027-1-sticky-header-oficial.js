(function(){
  'use strict';
  var CFG = (typeof PROGRAM_CONFIG !== 'undefined' && PROGRAM_CONFIG) || {};

  /* =========================================================
     1 · STICKY HEADER OFICIAL
  ========================================================= */
  var ESCUDO =
    '<svg viewBox="0 0 64 74" aria-hidden="true">' +
      '<defs><linearGradient id="stkGold" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0%" stop-color="#FFE873"/><stop offset="38%" stop-color="#FFD600"/>' +
        '<stop offset="72%" stop-color="#C9A100"/><stop offset="100%" stop-color="#8A6B00"/>' +
      '</linearGradient></defs>' +
      '<path d="M32 2 L60 12 V36 C60 54 47 66 32 72 C17 66 4 54 4 36 V12 Z" fill="url(#stkGold)" ' +
        'stroke="#FFF0A8" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<path d="M32 8 L54 16 V36 C54 51 43 61 32 66 C21 61 10 51 10 36 V16 Z" fill="none" ' +
        'stroke="rgba(10,11,16,.42)" stroke-width="1.4"/>' +
      '<path d="M36 18 L21 40 H30 L27 58 L43 34 H33 Z" fill="#07080A"/>' +
    '</svg>';
  function sticky(){
    var brand = document.querySelector('.sticky-brand');
    if(!brand || brand.dataset.jp) return;
    brand.dataset.jp = '1';
    brand.innerHTML =
      '<div class="sticky-logo">' + ESCUDO + '</div>' +
      '<div class="sticky-txt">' +
        '<span class="sticky-wordmark">COACH<em>&nbsp;JP</em></span>' +
        '<span class="sticky-sub">High Performance Programming</span>' +
      '</div>';
  }

  /* =========================================================
     2 · BARRA ÚNICA DE HERRAMIENTAS
  ========================================================= */
  function barraUnica(){
    var host = document.querySelector('.hd-actions');
    if(!host) return;
    var menu = document.getElementById('jpMenu');
    if(menu) menu.remove();                       /* fuera el desplegable duplicado */
    var mk = function(id, txt, fn){
      if(document.getElementById(id)) return;
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'nav-pill'; b.id = id;
      b.innerHTML = txt;
      b.addEventListener('click', fn);
      host.appendChild(b);
    };
    mk('btnManualTop', '📖<span class="lbl"> Manual</span>', function(){
      if(window.CoachManual) window.CoachManual.abrir();
    });
    /* el toggle Musculación/CrossFit no tiene sentido en Sports: la pizarra
       WOD nunca se monta ahí, así que el botón quedaría vacío de efecto */
    if(window.COACH_DISCIPLINA !== 'sports'){
      mk('btnVistaTop', '🔁<span class="lbl"> Vista</span>', function(){
        if(window.CoachVista) window.CoachVista.alternar();
      });
    }
    /* el botón de instalar vive centrado debajo de la cabecera */
    var pw = document.querySelector('.pwa-wrap');
    var head = document.querySelector('header.masthead');
    if(pw && head && pw.previousElementSibling !== head && head.parentNode)
      head.parentNode.insertBefore(pw, head.nextSibling);
  }

  /* =========================================================
     3 · FOCUS MODE DE SERIE ACTIVA
  ========================================================= */
  function focoSeries(){
    document.querySelectorAll('.set-tracker').forEach(function(t){
      t.classList.add('foco');
      var filas = Array.prototype.slice.call(t.querySelectorAll('.set-row'));
      var activa = filas.find(function(f){ var c = f.querySelector('.set-check'); return c && !c.checked; });
      filas.forEach(function(f){ f.classList.toggle('set-activa', f === activa); });
    });
  }
  document.addEventListener('change', function(e){
    if(e.target.closest('.set-check')) setTimeout(focoSeries, 60);
  }, true);

  /* =========================================================
     4 · CARGA PRECOMPUTADA EN CADA SERIE
  ========================================================= */
  function kgSemana(block, w){
    if(!block) return 0;
    if(block.weekKg && block.weekKg[w] != null) return parseFloat(block.weekKg[w]) || 0;
    var base = parseFloat(block.baseLoad);
    if(!(base > 0)) return 0;
    var pct = (block.weekPct && block.weekPct[w] != null && block.weekPct[w] !== '')
      ? parseFloat(block.weekPct[w]) : [70, 78, 85, 60, 75, 60][w];
    if(!(pct > 0)) return 0;
    return Math.round(base * pct / 100 * 2) / 2;
  }
  function bloqueDe(id){
    var d = (typeof DAYS !== 'undefined' ? DAYS : []).find(function(x){ return x.id === state.currentDay; });
    if(!d) return null;
    return (d.blocks || []).find(function(b){ return b.id === id; }) || null;
  }
  function precargar(){
    var fmt = window.CoachUnidad ? window.CoachUnidad.fmt : function(k){ return k + ' kg'; };
    document.querySelectorAll('.block').forEach(function(bl){
      var b = bloqueDe(bl.dataset.blockId);
      var kg = kgSemana(b, state.currentWeek);
      if(!(kg > 0)) return;
      var pct = (b.weekPctCalc && b.weekPctCalc[state.currentWeek]) ||
                (b.weekPct && b.weekPct[state.currentWeek]) || [70, 78, 85, 60, 75, 60][state.currentWeek];
      bl.querySelectorAll('.set-kg').forEach(function(i){
        /* el casillero es angosto (comparte fila con reps y el check): un placeholder
           largo tipo "Sugerido: 78 kg" se corta a la mitad y se ve roto. Adentro del
           campo va solo el número — el detalle completo ya está en la caja de arriba. */
        var ph = fmt(kg);
        if(i.placeholder !== ph) i.placeholder = ph;
        i.title = pct + '% de tu 1RM registrado (' + fmt(parseFloat(b.baseLoad) || 0) + ')';
      });
      var t = bl.querySelector('.set-tracker');
      if(t){
        /* la carga de la semana es la fuente de verdad: cualquier otra caja
           con un número distinto se retira para no mostrar dos cifras */
        bl.querySelectorAll('.rm-sug:not(.pre-sug)').forEach(function(x){ x.remove(); });
        var vieja = bl.querySelector('.pre-sug');
        var html = '<span class="ic">🎯</span><div><b>Sugerido esta semana: <code class="ls-num">' + fmt(kg) + '</code>' +
          ' [' + pct + '% de 1RM]</b><span>Precomputado con tu marca registrada — sólo tildá la serie.</span></div>';
        if(vieja){ if(vieja.innerHTML !== html) vieja.innerHTML = html; }
        else {
          var box = document.createElement('div');
          box.className = 'rm-sug pre-sug'; box.innerHTML = html;
          t.parentNode.insertBefore(box, t);
        }
      }
    });
  }

  /* =========================================================
     5 · SKELETON SHIMMER
  ========================================================= */
  function skeleton(){
    var main = document.getElementById('mainContent');
    if(!main || main.querySelector('.block, .card, .info-card')) return;
    if(document.getElementById('skWrap')) return;
    var w = document.createElement('div');
    w.className = 'sk-wrap'; w.id = 'skWrap';
    w.innerHTML = Array.from({ length: 3 }).map(function(){
      return '<div class="sk-card"><div class="sk-line w40"></div><div class="sk-line w90"></div>' +
             '<div class="sk-line w70"></div><div class="sk-line w55"></div></div>';
    }).join('');
    main.appendChild(w);
  }
  function quitarSkeleton(){
    var w = document.getElementById('skWrap');
    if(w && document.querySelector('#mainContent .block, #mainContent .info-card')) w.remove();
  }
  window.CoachSkeleton = { mostrar: skeleton, quitar: quitarSkeleton };

  /* =========================================================
     6 · ODÓMETRO EN LOS NÚMEROS DEL RESUMEN
  ========================================================= */
  function odometro(el, destino, ms){
    if(!el || el.dataset.odo === String(destino)) return;
    el.dataset.odo = String(destino);
    var t0 = null, desde = 0, dur = ms || 900;
    var paso = function(t){
      if(t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      var v = Math.round(desde + (destino - desde) * e);
      el.textContent = v.toLocaleString('es-AR');
      if(p < 1) requestAnimationFrame(paso);
      else el.textContent = destino.toLocaleString('es-AR');
    };
    requestAnimationFrame(paso);
  }
  function animarResumen(){
    var card = document.querySelector('.summary-card');
    if(!card || card.dataset.odo) return;
    card.dataset.odo = '1';
    card.querySelectorAll('.sc-stat .v').forEach(function(v){
      /* directiva (resumen de sesión CrossFit): el Score del WOD es texto
         libre ("11:42", "6+12 reps") -- el odómetro lo reescribiría como
         un número sin sentido (parseInt de los dígitos, sin los separadores). */
      if(v.dataset.noOdo) return;
      var n = parseInt(String(v.textContent).replace(/[^\d]/g, ''), 10);
      if(!isNaN(n)) odometro(v, n, 900);
    });
  }

  /* =========================================================
     7 · REPORTE MENSUAL DEL MESOCICLO
  ========================================================= */
  function datosMeso(){
    var semanas = (typeof WEEKS_META !== 'undefined' ? WEEKS_META.length : 4) || 4;
    var dias = (typeof DAYS !== 'undefined' ? DAYS.length : 4) || 4;
    var total = semanas * dias, hechas = 0;
    for(var w = 0; w < semanas; w++){
      var sem = (state.completed || {})[w] || {};
      DAYS.forEach(function(d){ if(sem[d.id] && sem[d.id].__dayDone) hechas++; });
    }
    /* tonelaje acumulado de todo el mesociclo, y desglosado por semana
       (S1-S4) para la curva de tonelaje de la tarjeta Wrapped — la
       semana viaja como primer segmento de la clave de carga
       ("weekIdx|dia|bloque|ej|serie", ver getLoadKey). */
    var vol = 0, series = 0, topKg = 0, topEx = '';
    var volPorSemana = new Array(semanas).fill(0);
    Object.keys(state.loads || {}).forEach(function(k){
      var l = state.loads[k];
      var kg = parseFloat(l && l.kg), reps = parseInt(l && l.reps, 10) || 0;
      if(!(kg > 0)) return;
      if(l.done){
        vol += kg * (reps || 1); series++;
        var wIdx = parseInt(String(k).split('|')[0], 10);
        if(!isNaN(wIdx) && volPorSemana[wIdx] !== undefined) volPorSemana[wIdx] += kg * (reps || 1);
      }
      if(kg > topKg){ topKg = kg; topEx = l.__ex || ''; }
    });
    /* RPE promedio a partir del RIR declarado */
    var rir = Object.keys(state.rir || {});
    var rpe = rir.length
      ? Math.round(rir.reduce(function(a, k){ return a + (10 - Math.min(3, state.rir[k])); }, 0) / rir.length * 10) / 10
      : 0;
    /* mejora del top lift contra la marca inicial del coach */
    var mejora = 0;
    if(topEx && window.CoachPRHub){
      var base = 0, prs = CFG.prs || {};
      Object.keys(prs).forEach(function(k){
        if(String(topEx).toLowerCase().indexOf(k.toLowerCase()) >= 0 ||
           k.toLowerCase().indexOf(String(topEx).toLowerCase()) >= 0)
          base = Math.max(base, parseFloat(prs[k]) || 0);
      });
      if(base > 0 && topKg > base) mejora = Math.round((topKg - base) / base * 1000) / 10;
    }
    var fase = '';
    try{ fase = (WEEKS_META[Math.min(semanas - 1, state.currentWeek)] || {}).phase || ''; }catch(e){}
    return {
      atleta: CFG.athleteName || 'Atleta', meso: CFG.mesoName || 'Mesociclo',
      total: total, hechas: hechas, semanas: semanas,
      adherencia: total ? Math.round(hechas / total * 100) : 0,
      vol: Math.round(vol), volPorSemana: volPorSemana.map(function(v){ return Math.round(v); }),
      series: series, topKg: topKg, topEx: topEx, mejora: mejora,
      rpe: rpe, fase: fase || 'Periodización ondulada'
    };
  }
  window.CoachMesoDatos = datosMeso;

  function completoMeso(){
    var d = datosMeso();
    return d.total > 0 && d.hechas >= d.total;
  }
  /* "Al finalizar la Semana 4": dispara la tarjeta Wrapped apenas se
     completan TODOS los días de la última semana del mesociclo, sin
     exigir 100% de adherencia en las semanas previas (más realista que
     completoMeso(), que pide el mesociclo entero perfecto). */
  function semana4Completa(){
    var semanas = (typeof WEEKS_META !== 'undefined' ? WEEKS_META.length : 4) || 4;
    var wIdx = semanas - 1;
    var sem = (state.completed || {})[wIdx] || {};
    var diasHechos = 0;
    (DAYS || []).forEach(function(d){ if(sem[d.id] && sem[d.id].__dayDone) diasHechos++; });
    return (DAYS || []).length > 0 && diasHechos >= DAYS.length;
  }
  function abrirMeso(){
    var d = datosMeso();
    var w = document.getElementById('mesoWrap'); if(!w) return;
    document.getElementById('mesoSub').innerHTML =
      'Cerraste <b>' + d.meso + '</b> — ' + d.semanas + ' semanas. Este es el resumen científico de tu mesociclo.';
    var fmt = window.CoachUnidad ? window.CoachUnidad.fmt : function(k){ return k + ' kg'; };
    var heroEl = document.getElementById('mesoHero');
    if(heroEl){
      heroEl.innerHTML = '<div class="ms-hero-num">' + d.vol.toLocaleString('es-AR') + '</div><div class="ms-hero-lb">Kilos totales levantados</div>';
    }
    var maxSem = Math.max.apply(null, d.volPorSemana.concat([1]));
    var sparkEl = document.getElementById('mesoSpark');
    if(sparkEl){
      sparkEl.innerHTML = d.volPorSemana.map(function(v, i){
        var h = Math.max(6, Math.round((v / maxSem) * 100));
        var lb = (typeof WEEKS_META !== 'undefined' && WEEKS_META[i] && WEEKS_META[i].short) || ('S' + (i + 1));
        return '<div class="ms-spark-col' + (v === maxSem && v > 0 ? ' hi' : '') + '"><div class="ms-spark-bar" style="height:' + h + '%"></div><div class="ms-spark-wk">' + lb + '</div></div>';
      }).join('');
    }
    document.getElementById('mesoGrid').innerHTML =
      '<div class="ms-stat"><div class="v">' + d.adherencia + '%</div><div class="k">' + d.hechas + '/' + d.total + ' sesiones</div></div>' +
      '<div class="ms-stat"><div class="v">' + (d.topKg ? fmt(d.topKg) : '—') + '</div><div class="k">top lift del mesociclo</div></div>' +
      '<div class="ms-stat"><div class="v">' + (d.rpe ? 'RPE ' + d.rpe : '—') + '</div><div class="k">intensidad media</div></div>' +
      '<div class="ms-stat"><div class="v">' + String(d.fase).slice(0, 18) + '</div><div class="k">estructura</div></div>';
    w.classList.add('on');
    try{ if(navigator.vibrate) navigator.vibrate([60, 40, 60, 40, 120]); }catch(e){}
    try{ localStorage.setItem((typeof STORAGE_KEY !== 'undefined' ? STORAGE_KEY : 'cj') + '_meso_visto', '1'); }catch(e){}
  }
  function cerrarMeso(){ document.getElementById('mesoWrap').classList.remove('on'); }
  window.CoachMeso = { abrir: abrirMeso, cerrar: cerrarMeso, completo: completoMeso, semana4: semana4Completa };

  /* ---------- lienzo 1080x1920 del reporte ---------- */
  var W = 1080, H = 1920;
  function rr(g, x, y, w, h, r){
    g.beginPath(); g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function fit(g, txt, maxW, base, min){
    var t = base;
    g.font = '700 ' + t + 'px "Barlow Condensed", sans-serif';
    while(g.measureText(txt).width > maxW && t > (min || 26)){
      t -= 2; g.font = '700 ' + t + 'px "Barlow Condensed", sans-serif';
    }
    return t;
  }
  function escudoCanvas(g, cx, cy, alto){
    var s = alto / 74;
    g.save(); g.translate(cx - 32 * s, cy); g.scale(s, s);
    var grad = g.createLinearGradient(0, 0, 64, 74);
    grad.addColorStop(0, '#FFE873'); grad.addColorStop(.38, '#FFD600');
    grad.addColorStop(.72, '#C9A100'); grad.addColorStop(1, '#8A6B00');
    g.fillStyle = grad;
    g.beginPath(); g.moveTo(32,2); g.lineTo(60,12); g.lineTo(60,36);
    g.bezierCurveTo(60,54,47,66,32,72); g.bezierCurveTo(17,66,4,54,4,36);
    g.lineTo(4,12); g.closePath(); g.fill();
    g.strokeStyle = '#FFF0A8'; g.lineWidth = 1.6; g.stroke();
    g.fillStyle = '#07080A';
    g.beginPath(); g.moveTo(36,18); g.lineTo(21,40); g.lineTo(30,40);
    g.lineTo(27,58); g.lineTo(43,34); g.lineTo(33,34); g.closePath(); g.fill();
    g.restore();
  }
  function dibujarReporte(d){
    var c = document.getElementById('mesoCanvas'), g = c.getContext('2d');
    var fmt = window.CoachUnidad ? window.CoachUnidad.sufijo() : 'kg';
    g.clearRect(0, 0, W, H);
    /* fondo alta gama */
    g.fillStyle = '#070809'; g.fillRect(0, 0, W, H);
    var r1 = g.createRadialGradient(W / 2, 340, 60, W / 2, 340, 1100);
    r1.addColorStop(0, 'rgba(210,121,63,.22)'); r1.addColorStop(1, 'rgba(210,121,63,0)');
    g.fillStyle = r1; g.fillRect(0, 0, W, H);
    var r2 = g.createRadialGradient(120, H - 200, 40, 120, H - 200, 720);
    r2.addColorStop(0, 'rgba(124,197,232,.10)'); r2.addColorStop(1, 'rgba(124,197,232,0)');
    g.fillStyle = r2; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(210,121,63,.5)'; g.lineWidth = 4;
    rr(g, 46, 46, W - 92, H - 92, 34); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 2;
    rr(g, 64, 64, W - 128, H - 128, 26); g.stroke();

    g.textAlign = 'center'; g.textBaseline = 'middle';
    escudoCanvas(g, W / 2, 130, 190);
    g.fillStyle = '#D2793F'; g.font = '700 36px "Barlow Condensed", sans-serif';
    g.fillText('MESOCICLO COMPLETADO • REPORT COACH JP', W / 2, 392);
    fit(g, (d.atleta || '').toUpperCase(), W - 220, 76, 40);
    g.fillStyle = '#FFFFFF';
    g.fillText((d.atleta || '').toUpperCase(), W / 2, 462);
    g.fillStyle = '#A0A8B4'; g.font = '400 28px Inter, sans-serif';
    g.fillText(d.meso, W / 2, 508);

    /* ---- hero: kilos totales levantados (lenguaje visual Wrapped aprobado) ---- */
    var heroTxt = d.vol.toLocaleString('es-AR');
    var heroSize = fit(g, heroTxt, W - 200, 190, 90);
    g.font = '900 ' + heroSize + 'px "Barlow Condensed", sans-serif';
    g.fillStyle = '#FFFFFF';
    g.fillText(heroTxt, W / 2, 700);
    g.fillStyle = '#A0A8B4'; g.font = '700 26px "Barlow Condensed", sans-serif';
    g.fillText('KILOS TOTALES LEVANTADOS (' + fmt.toUpperCase() + ')', W / 2, 758);

    /* ---- tiles: asistencia + PR más alto, lado a lado ---- */
    var tY = 850, tH = 190, tGap = 20;
    var tileW = (W - 180 - tGap) / 2;
    var tile = function(x, label, val, sub, color){
      g.fillStyle = 'rgba(255,255,255,.045)'; rr(g, x, tY, tileW, tH, 22); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 2; rr(g, x, tY, tileW, tH, 22); g.stroke();
      g.fillStyle = '#A0A8B4'; g.font = '700 22px "Barlow Condensed", sans-serif';
      g.fillText(label, x + tileW / 2, tY + 40);
      fit(g, val, tileW - 30, 46, 22);
      g.fillStyle = color;
      g.fillText(val, x + tileW / 2, tY + 100);
      g.fillStyle = 'rgba(160,174,192,.85)'; g.font = '400 20px Inter, sans-serif';
      fit(g, sub, tileW - 30, 20, 14);
      g.fillText(sub, x + tileW / 2, tY + 146);
    };
    tile(90, 'ASISTENCIA', d.adherencia + '%', d.hechas + '/' + d.total + ' sesiones', '#D2793F');
    tile(90 + tileW + tGap, 'PR MÁS ALTO', d.topKg ? (d.topKg + ' ' + fmt.toUpperCase()) : '—',
         d.topKg ? String(d.topEx || 'Top lift').toUpperCase() + (d.mejora > 0 ? ' · +' + d.mejora + '%' : '') : 'Sin marcas registradas',
         '#7CC5E8');

    /* ---- curva de tonelaje semanal (spark bars S1-S4) ---- */
    var sTitleY = 1110, sY = 1132, sH = 170, sBottom = sY + sH;
    g.fillStyle = '#A0A8B4'; g.font = '700 24px "Barlow Condensed", sans-serif';
    g.fillText('CURVA DE TONELAJE SEMANAL', W / 2, sTitleY);
    var semVol = d.volPorSemana && d.volPorSemana.length ? d.volPorSemana : [0, 0, 0, 0];
    var n = semVol.length;
    var barsX0 = 130, barsX1 = W - 130, bGap = 24;
    var colW = (barsX1 - barsX0 - bGap * (n - 1)) / n;
    var maxV = Math.max.apply(null, semVol.concat([1]));
    for(var i = 0; i < n; i++){
      var v = semVol[i] || 0;
      var h = Math.max(8, Math.round((v / maxV) * sH));
      var x = barsX0 + i * (colW + bGap);
      var isMax = v === maxV && v > 0;
      g.fillStyle = isMax ? '#D2793F' : 'rgba(210,121,63,.32)';
      rr(g, x, sBottom - h, colW, h, 8); g.fill();
      g.fillStyle = isMax ? '#D2793F' : '#A0A8B4';
      g.font = '700 24px "Barlow Condensed", sans-serif';
      var wkLb = (typeof WEEKS_META !== 'undefined' && WEEKS_META[i] && WEEKS_META[i].short) || ('S' + (i + 1));
      g.fillText(wkLb, x + colW / 2, sBottom + 32);
    }

    /* ---- gestión de fatiga (caja compacta) ---- */
    var y = sBottom + 92;
    var caja = function(rot, val, color){
      g.fillStyle = 'rgba(255,255,255,.045)'; rr(g, 90, y, W - 180, 150, 24); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 2; rr(g, 90, y, W - 180, 150, 24); g.stroke();
      g.fillStyle = '#A0A8B4'; g.font = '700 26px "Barlow Condensed", sans-serif';
      g.fillText(rot, W / 2, y + 42);
      fit(g, val, W - 240, 56, 28);
      g.fillStyle = color || '#FFFFFF';
      g.fillText(val, W / 2, y + 102);
      y += 168;
    };
    caja('ESTRUCTURA · GESTIÓN DE FATIGA',
         String(d.fase).toUpperCase() + (d.rpe ? ' · RPE ' + d.rpe : ''),
         '#7CC5E8');

    /* ---- pie: escudo + wordmark Coach JP (mismo lockup del pack de historias) ---- */
    var shTop = y + 30;
    escudoCanvas(g, W / 2, shTop, 84);
    var wmY = shTop + 84 + 48;
    g.font = '800 42px "Barlow Condensed", sans-serif';
    var wCoach = g.measureText('COACH ').width, wJp = g.measureText('JP').width;
    var startX = W / 2 - (wCoach + wJp) / 2;
    g.textAlign = 'left';
    g.fillStyle = '#FFFFFF'; g.fillText('COACH ', startX, wmY);
    g.fillStyle = '#7CC5E8'; g.fillText('JP', startX + wCoach, wmY);
    g.textAlign = 'center';
    g.fillStyle = 'rgba(160,174,192,.85)'; g.font = '700 22px "Barlow Condensed", sans-serif';
    g.fillText('PERFORMANCE SYSTEM', W / 2, wmY + 42);

    /* sello de autoridad */
    g.save();
    g.globalAlpha = .5;
    g.fillStyle = '#FFFFFF'; g.font = '700 26px "Barlow Condensed", sans-serif';
    g.fillText('✦ DATA-DRIVEN PROGRAMMING • VERIFIED BY COACH JP', W / 2, H - 70);
    g.restore();
    /* franja de fondo con el sello de la marca (flourish, baja opacidad) */
    g.save();
    g.globalAlpha = .035; g.fillStyle = '#FFFFFF';
    g.font = '700 240px "Barlow Condensed", sans-serif';
    g.textAlign = 'right';
    g.fillText('JP', W - 96, H - 260);
    g.restore();
    g.textAlign = 'center';
    return c;
  }
  window.CoachMesoReporte = dibujarReporte;

  function abrirReporte(){
    var d = datosMeso();
    var w = document.getElementById('msrWrap');
    if(document.fonts && document.fonts.ready)
      document.fonts.ready.then(function(){ dibujarReporte(d); }).catch(function(){ dibujarReporte(d); });
    dibujarReporte(d);
    w.classList.add('on');
    cerrarMeso();
  }

  function montarMeso(){
    var w = document.getElementById('mesoWrap'); if(!w || w.dataset.listo) return;
    w.dataset.listo = '1';
    document.getElementById('mesoX').addEventListener('click', cerrarMeso);
    w.addEventListener('click', function(e){ if(e.target === w) cerrarMeso(); });
    document.getElementById('mesoGen').addEventListener('click', abrirReporte);
    var r = document.getElementById('msrWrap');
    document.getElementById('msrX').addEventListener('click', function(){ r.classList.remove('on'); });
    r.addEventListener('click', function(e){ if(e.target === r) r.classList.remove('on'); });
    document.getElementById('msrDl').addEventListener('click', function(){
      var c = document.getElementById('mesoCanvas'), a = document.createElement('a');
      a.download = 'coachjp-mesociclo.png'; a.href = c.toDataURL('image/png'); a.click();
      var b = this; b.textContent = '✅ Descargado';
      setTimeout(function(){ b.textContent = '⬇ Descargar'; }, 2200);
    });
    document.getElementById('msrCp').addEventListener('click', function(){
      var b = this, c = document.getElementById('mesoCanvas');
      try{
        c.toBlob(function(blob){
          if(!blob || !navigator.clipboard || !window.ClipboardItem){ b.textContent = '⚠️ Usá Descargar'; return; }
          navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
            .then(function(){ b.textContent = '✅ Copiada'; setTimeout(function(){ b.textContent = '📋 Copiar imagen'; }, 2200); })
            .catch(function(){ b.textContent = '⚠️ Usá Descargar'; });
        }, 'image/png');
      }catch(e){ b.textContent = '⚠️ Usá Descargar'; }
    });
  }
  function revisarMeso(){
    if(!completoMeso() && !semana4Completa()) return;
    var visto = null;
    try{ visto = localStorage.getItem((typeof STORAGE_KEY !== 'undefined' ? STORAGE_KEY : 'cj') + '_meso_visto'); }catch(e){}
    if(visto) return;
    setTimeout(abrirMeso, 900);
  }

  /* =========================================================
     8 · MONTAJE
  ========================================================= */
  function repintar(){
    try{ sticky(); barraUnica(); focoSeries(); precargar(); quitarSkeleton(); animarResumen(); }catch(e){}
  }
  function mount(){
    montarMeso();
    skeleton();
    repintar();
    revisarMeso();
    var main = document.getElementById('mainContent') || document.body;
    var pend = false, propio = false;
    window.CoachRepaintBus.register(function(){
      if(pend || propio) return;
      pend = true;
      setTimeout(function(){
        pend = false; propio = true;
        try{ repintar(); }catch(e){}
        setTimeout(function(){ propio = false; }, 160);
      }, 140);
    }, main);
    if(typeof window.renderMain === 'function'){
      var _rm = window.renderMain;
      window.renderMain = function(){
        var r = _rm.apply(this, arguments);
        setTimeout(repintar, 90);
        setTimeout(function(){ repintar(); revisarMeso(); }, 420);
        return r;
      };
    }
    if(typeof window.setDayDone === 'function'){
      var _sd = window.setDayDone;
      window.setDayDone = function(){
        var r = _sd.apply(this, arguments);
        setTimeout(revisarMeso, 700);
        return r;
      };
    }
    window.CoachUltra = { repintar: repintar, foco: focoSeries, precargar: precargar,
                          odometro: odometro, meso: abrirMeso, reporte: abrirReporte };
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(mount, 180); });
  else setTimeout(mount, 180);
})();
