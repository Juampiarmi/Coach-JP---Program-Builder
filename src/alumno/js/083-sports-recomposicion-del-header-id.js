/* =========================================================
   SPORTS · recomposición del header (ID bar, Mission Control, Briefing)
========================================================= */
(function(){
  'use strict';
  var ES_SPORTS = window.COACH_DISCIPLINA === 'sports';
  var $ = function(s, r){ return (r || document).querySelector(s); };
  var obs = null, pend = 0;

  function idBar(){
    var top = $('.hdc-top'); if(!top) return;
    var q = $('.jp-prs-quickbtn');
    if(q){
      if(q.parentNode !== top){ top.insertBefore(q, $('#hdcFzBtn') || null); q.classList.add('jp-hist-btn'); }
      q.style.display = '';
      if(ES_SPORTS && q.innerHTML.indexOf('HISTORIAL') < 0) q.innerHTML = '&#128200; HISTORIAL';
      else if(!ES_SPORTS && q.innerHTML.indexOf('PRs') < 0) q.innerHTML = '&#127942; PRs / 1RM';
    }
    var inf = $('#hdcInfoBtn');
    if(ES_SPORTS && inf && inf.getAttribute('data-jp') !== '1'){ inf.setAttribute('data-jp', '1'); inf.innerHTML = '<span aria-hidden="true">&#128450;&#65039;</span>'; inf.setAttribute('aria-label', 'Perfil e info'); }
    [].forEach.call(document.querySelectorAll('.hdc-pay-chip .jp-status-pill'), function(p){
      if(/ACTIVO/i.test(p.textContent) && p.textContent.indexOf('●') < 0) p.textContent = '● ACTIVO';
    });
  }
  function semana(){
    var row = $('.hdc-days-row'); if(!row) return;
    var pills = [].slice.call(document.querySelectorAll('#weekSelector .week-pill'));
    if(!pills.length) return;
    var act = pills.filter(function(p){ return p.classList.contains('active'); })[0] || pills[0];
    var btn = $('#jpWkBtn'), pop = $('#jpWkPop');
    if(!btn){
      btn = document.createElement('button'); btn.type = 'button'; btn.id = 'jpWkBtn'; btn.className = 'jp-wk-btn';
      row.insertBefore(btn, row.firstChild);
      pop = document.createElement('div'); pop.id = 'jpWkPop'; pop.className = 'jp-wk-pop'; row.appendChild(pop);
      btn.addEventListener('click', function(e){ e.stopPropagation(); pop.classList.toggle('on'); });
      document.addEventListener('click', function(){ pop.classList.remove('on'); });
      pop.addEventListener('click', function(e){
        var o = e.target.closest('[data-wk]'); if(!o) return;
        pop.classList.remove('on');
        var ps = document.querySelectorAll('#weekSelector .week-pill'), p = ps[+o.getAttribute('data-wk')];
        if(p && !p.classList.contains('active')) p.click();
      });
    }
    var etqSem = function(t){ var m = /(\d+)/.exec(t || ''); return m ? 'SEMANA ' + m[1] : String(t || '').trim(); };      /* v38: SEMANA completo (antes SEM) */
    var lbl = etqSem((act.textContent || '').trim());
    var h = '<b>' + lbl + '</b><i>&#9662;</i>';
    if(btn.__h !== h){ btn.__h = h; btn.innerHTML = h; }
    var hp = pills.map(function(p, i){
      var meta = (typeof WEEKS_META !== 'undefined' && WEEKS_META[i]) || {};
      return '<button type="button" data-wk="' + i + '" class="' + (p === act ? 'on' : '') + '"><b>' + etqSem((p.textContent || '').trim()) + '</b><small>' + String(meta.phase || '').replace(/</g, '&lt;') + '</small></button>';
    }).join('');
    if(pop.__h !== hp){ pop.__h = hp; pop.innerHTML = hp; }
  }
  /* Selector de día: reemplaza la barra horizontal de pastillas (se cortaba y costaba deslizarla en pantallas chicas) por un botón con el día activo
     y un menú vertical, con el mismo estilo que el selector de semana (SEM). Las pastillas .day-tab siguen en el DOM (ocultas) para que el resto
     de los módulos las lean; elegir un día hace click sobre su pastilla, así corre exactamente la misma lógica de siempre. */
  function diaMenu(){
    var row = $('.hdc-days-row'); if(!row || typeof DAYS === 'undefined' || !DAYS || !DAYS.length) return;
    var btn = $('#jpDayBtn'), pop = $('#jpDayPop');
    var cerrar = function(){ var p = $('#jpDayPop'), b = $('#jpDayBtn'); if(p) p.classList.remove('on'); if(b) b.setAttribute('aria-expanded', 'false'); };
    if(!btn){
      btn = document.createElement('button'); btn.type = 'button'; btn.id = 'jpDayBtn'; btn.className = 'jp-wk-btn jp-day-btn';
      btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
      var wk = $('#jpWkBtn');
      row.insertBefore(btn, wk ? wk.nextSibling : row.firstChild);
      pop = document.createElement('div'); pop.id = 'jpDayPop'; pop.className = 'jp-wk-pop jp-day-pop'; pop.setAttribute('role', 'listbox'); row.appendChild(pop);
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        var w = $('#jpWkPop'); if(w) w.classList.remove('on');
        var on = pop.classList.toggle('on'); btn.setAttribute('aria-expanded', on ? 'true' : 'false');
      });
      if(wk) wk.addEventListener('click', cerrar);
      document.addEventListener('click', cerrar);
      pop.addEventListener('click', function(e){
        var o = e.target.closest('[data-dia]'); if(!o) return;
        e.stopPropagation(); cerrar();
        var t = document.querySelector('.hdc-days-wrap .day-tab[data-day="' + o.getAttribute('data-dia') + '"]');
        if(t && !t.classList.contains('active')) t.click();
        try{ window.scrollTo({ top: 0, behavior: 'smooth' }); }catch(e2){}
      });
      document.body.classList.add('jp-day-menu');
    }
    var idx = 0;
    DAYS.forEach(function(d, i){ if(d.id === state.currentDay) idx = i; });
    var etq = function(d, i){
      var n = 'D\u00cdA ' + (i + 1), l = String(d.label || '').split(' \u00b7 ').join(' - ').trim().toUpperCase();
      return (l && l !== n) ? n + ': ' + l : n;
    };
    /* v31: sin el emoji de calendario (en iPhone se dibuja con un número de fecha que no es la del día): SEM y DÍA quedan parejos */
    var h = '<b>' + escHtmlSafe(etq(DAYS[idx], idx)) + '</b><i>&#9662;</i>';
    if(btn.__h !== h){ btn.__h = h; btn.innerHTML = h; }
    var hp = DAYS.map(function(d, i){
      var hecho = false; try{ hecho = isDayDone(state.currentWeek, d.id); }catch(e){}
      var l = String(d.label || '').split(' \u00b7 ').join(' - ').trim().toUpperCase();
      return '<button type="button" role="option" data-dia="' + escHtmlSafe(d.id) + '" class="' + (i === idx ? 'on' : '') + '" aria-selected="' + (i === idx ? 'true' : 'false') + '"><b>D\u00cdA ' + (i + 1) + '</b><span class="jp-dp-t">' +
        escHtmlSafe(l) + '</span><small>' + (hecho ? '&#10003; HECHO' : (d.optional ? 'OPCIONAL' : '')) + '</small></button>';
    }).join('');
    if(pop.__h !== hp){ pop.__h = hp; pop.innerHTML = hp; }
  }
  function dias(){
    var cambio = false;
    [].forEach.call(document.querySelectorAll('.hdc-days-wrap .day-tab .tab-name'), function(n){
      var m = /(\d+)/.exec(n.textContent || '');
      if(m && n.textContent !== 'D\u00cdA ' + m[1]){ n.textContent = 'D\u00cdA ' + m[1]; cambio = true; }
    });
    var act = $('.hdc-days-wrap .day-tab.active'), wrap = $('.hdc-days-wrap .week-tabs');
    if(act && wrap && wrap.getAttribute('data-act') !== act.getAttribute('data-day')){
      wrap.setAttribute('data-act', act.getAttribute('data-day'));
      try{ wrap.scrollLeft = Math.max(0, act.offsetLeft - (wrap.clientWidth - act.offsetWidth) / 2); }catch(e){}
    }
  }
  function brief(){
    var dh = $('.day-view .day-header'); if(!dh) return;
    var nB = document.querySelectorAll('.day-view .blocks-stack > .block').length;
    var kgN = 0; try{ kgN = calcularTonelajeSesion(); }catch(eT){}          /* total real calculado, no el texto del HUD (que puede estar a mitad de la animación) */
    var kg = kgN.toLocaleString('es-AR');
    var rir = 'RIR OBJ';
    try{ var m = /RIR\s*([0-9][0-9–-]*)/i.exec((WEEKS_META[state.currentWeek] || {}).rpe || ''); if(m) rir = 'RIR ' + m[1]; }catch(e){}
    /* las 3 métricas están siempre: grilla simétrica de 3 columnas (sin series registradas el tonelaje es 0, nunca un guion ni NaN) */
    var pildora = function(v, l, x){ return '<span><b>' + v + '</b><small>' + l + '</small>' + (x ? '<em class="jp-rir-hint">' + x + '</em>' : '') + '</span>'; };
    /* v36: el alumno ve RPE (esfuerzo del 1 al 10) en lugar de RIR; si la semana ya pauta RPE se muestra tal cual */
    var rpe = '';
    try{
      if(rir !== 'RIR OBJ' && typeof window.jpRpeDeRir === 'function') rpe = window.jpRpeDeRir(rir.replace('RIR ', ''));
      if(!rpe){ var mR = /RPE\s*([0-9][0-9.,–-]*)/i.exec((WEEKS_META[state.currentWeek] || {}).rpe || ''); if(mR) rpe = mR[1]; }
    }catch(eR){}
    var h = pildora(kg, 'KG TONELAJE') + pildora(nB, nB === 1 ? 'BLOQUE' : 'BLOQUES') + pildora(rpe ? escHtmlSafe(rpe) : '&mdash;', 'RPE OBJETIVO', rpe ? 'esfuerzo del 1 al 10' : '');
    var hud = $('.jp-brief-hud', dh);
    if(!hud){ hud = document.createElement('div'); hud.className = 'jp-brief-hud'; dh.appendChild(hud); }
    if(hud.__h !== h){ hud.__h = h; hud.innerHTML = h; }
    var txt = (($('.day-view .rdy-foco-text') || {}).textContent || '').trim();
    var b = $('.jp-brief-dir', dh);
    if(txt && !b){
      b = document.createElement('button'); b.type = 'button'; b.className = 'jp-brief-dir';
      b.innerHTML = '&#128065;&#65039; VER DIRECTIVA T&Aacute;CTICA';
      b.addEventListener('click', abrirDirectiva);
      dh.appendChild(b);
    } else if(!txt && b){ b.remove(); }
  }
  function abrirDirectiva(){
    var tit = (($('.day-view .rdy-foco-title') || {}).textContent || 'Foco técnico del día').trim();
    var txt = (($('.day-view .rdy-foco-text') || {}).textContent || '').trim();
    var m = $('#jpDirModal');
    if(!m){
      m = document.createElement('div'); m.id = 'jpDirModal'; m.className = 'jp-dir-modal';
      m.innerHTML = '<div class="jp-dir-box"><h4>&#127919; DIRECTIVA T&Aacute;CTICA</h4><h3></h3><p></p><button type="button">Cerrar</button></div>';
      document.body.appendChild(m);
      m.addEventListener('click', function(e){ if(e.target === m || e.target.tagName === 'BUTTON') m.classList.remove('on'); });
    }
    m.querySelector('h3').textContent = tit;
    m.querySelector('p').textContent = txt;
    m.classList.add('on');
  }
  /* Stealth Pro: los emojis a color rompen la paleta; se envuelven en .jp-emo para teñirlos en un solo tono (ver CSS) */
  var RX_EMO_SB = /(?:\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDC00-\uDFFF]|[\u26A1\u23F1\u23F0\u26A0\u2795\u2728\u2B50\u2757\u23F3])\uFE0F?/g;
  function emojis(){
    if(!ES_SPORTS || document.body.classList.contains('cf-disc')) return;
    var raices = document.querySelectorAll('.day-view, .hd-compact'), pend2 = [];
    for(var r = 0; r < raices.length; r++){
      var tw = document.createTreeWalker(raices[r], NodeFilter.SHOW_TEXT, null), n;
      while((n = tw.nextNode())){
        var p = n.parentNode; if(!p || /^(?:SCRIPT|STYLE|TEXTAREA|INPUT)$/.test(p.nodeName) || (p.classList && p.classList.contains('jp-emo'))) continue;
        RX_EMO_SB.lastIndex = 0;
        if(RX_EMO_SB.test(n.nodeValue)) pend2.push(n);
      }
    }
    pend2.forEach(function(n){
      var txt = n.nodeValue, fr = document.createDocumentFragment(), ult = 0, m;
      RX_EMO_SB.lastIndex = 0;
      while((m = RX_EMO_SB.exec(txt))){
        if(m.index > ult) fr.appendChild(document.createTextNode(txt.slice(ult, m.index)));
        var sp = document.createElement('span'); sp.className = 'jp-emo'; sp.textContent = m[0]; fr.appendChild(sp);
        ult = m.index + m[0].length;
      }
      if(ult < txt.length) fr.appendChild(document.createTextNode(txt.slice(ult)));
      n.parentNode.replaceChild(fr, n);
    });
  }
  function aplicar(){
    pend = 0;
    if(obs) obs.disconnect();
    try{ idBar(); semana(); diaMenu(); dias(); if(ES_SPORTS) brief(); }catch(e){}
    try{ emojis(); }catch(e){}
    try{ if(window.__jpSoltarHold) window.__jpSoltarHold(); }catch(e){}
    if(obs) obs.observe(document.body, { childList:true, subtree:true, characterData:true });
  }
  function programar(){ if(pend) return; pend = setTimeout(aplicar, 90); }
  function montar(){
    document.body.classList.add(ES_SPORTS ? 'jp-mission' : 'jp-hdr-cf');
    obs = new MutationObserver(programar);
    document.addEventListener('jp:tonelaje', programar);        /* el tonelaje cambió (serie agregada, corregida o tildada): la píldora superior se repinta */
    aplicar();
    [300, 900, 2000].forEach(function(ms){ setTimeout(aplicar, ms); });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(montar, 400); });
  else setTimeout(montar, 400);
})();
