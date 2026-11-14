/* ===== TACTICAL HUD · comportamiento común de la app del alumno ===== */
(function(){
  'use strict';
  var bar = null, tick = false;
  function infoDia(){
    var dv = document.querySelector('.day-view.active'); if(!dv) return null;
    var pre = (dv.querySelector('.jp-session-pretag') || {}).textContent || '';
    var m = pre.match(/D[IÍ]A\s*(\d+)/i);
    var t = ((dv.querySelector('.day-title') || {}).textContent || '').trim();
    return { d: m ? 'D' + m[1] : '', t: t };
  }
  function construir(){
    if(bar) return;
    bar = document.createElement('div'); bar.id = 'jpMiniBar';
    bar.innerHTML = '<span class="jmb-d"></span><span class="jmb-sep">|</span><span class="jmb-t"></span>' +
      '<button type="button" class="jmb-timer" aria-label="Abrir timer">⏱ TIMER</button>';
    document.body.appendChild(bar);
    bar.addEventListener('click', function(e){
      if(e.target.closest('.jmb-timer')){ var b = document.getElementById('hddTimer'); if(b) b.click(); return; }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  function actualizar(){
    construir();
    var i = infoDia();
    if(i){
      var jd = bar.querySelector('.jmb-d'), jt = bar.querySelector('.jmb-t'), vd = i.d || 'D•', vt = i.t || 'Sesión';
      if(jd.textContent !== vd) jd.textContent = vd;
      if(jt.textContent !== vt) jt.textContent = vt;
    }
    document.body.classList.toggle('jp-scrolled', (window.scrollY || document.documentElement.scrollTop) > 150);
    ajustarDosis();
  }
  /* la barra de prescripcion siempre entra en UNA linea: si no cabe, baja el cuerpo de letra hasta 8px */
  function ajustarDosis(){
    var bs = document.querySelectorAll('.jp-dose-bar');
    for(var i = 0; i < bs.length; i++){
      var b = bs[i]; if(!b.clientWidth) continue;
      var sig = b.clientWidth + '|' + b.textContent.length;
      if(b.__fit === sig) continue;
      b.style.fontSize = '';
      var fs = parseFloat(getComputedStyle(b).fontSize) || 11, n = 0;
      while(b.scrollWidth > b.clientWidth + 1 && fs > 8 && n < 14){ fs -= 0.4; b.style.fontSize = fs + 'px'; n++; }
      b.__fit = sig;
    }
  }
  document.addEventListener('toggle', function(){ setTimeout(ajustarDosis, 30); }, true);
  window.addEventListener('scroll', function(){
    if(tick) return; tick = true;
    requestAnimationFrame(function(){ tick = false; actualizar(); });
  }, { passive: true });
  var pend = 0;
  function programar(){ if(pend) return; pend = setTimeout(function(){ pend = 0; actualizar(); }, 250); }
  function montar(){
    actualizar();
    var mc = document.getElementById('mainContent');
    if(mc) new MutationObserver(programar).observe(mc, { childList: true, subtree: true });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();

  /* [ VER TECNICA ] sin video vinculado: abre la busqueda de la tecnica */
  document.addEventListener('click', function(e){
    var b = e.target.closest && e.target.closest('.jp-ver-busca'); if(!b) return;
    e.preventDefault(); e.stopPropagation();
    window.open('https://www.youtube.com/results?search_query=' + encodeURIComponent(b.getAttribute('data-vsearch') + ' t\u00e9cnica ejercicio'), '_blank', 'noopener');
  }, true);
  /* Story: etiquetas de los dos botones que quedan */
  function etiquetasStory(){
    var dl = document.querySelector('#storyDl .sa-tx'), ft = document.querySelector('#storyFotoBtn .sa-tx');
    if(dl && dl.textContent === 'DESCARGAR HISTORIA'){
      dl.textContent = 'COMPARTIR EN INSTAGRAM';
      var sv = dl.parentNode && dl.parentNode.querySelector('svg');
      if(sv) sv.innerHTML = '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>';
    }
    if(ft && ft.textContent === 'Subir foto') ft.textContent = 'AGREGAR FOTO';
  }
  etiquetasStory(); setTimeout(etiquetasStory, 400);
  /* inputs de carga: coma o punto decimal ("2,5" -> "2.5"), solo números */
  function limpiarDecimal(v){
    v = String(v == null ? '' : v).replace(/,/g, '.').replace(/[^0-9.]/g, '');
    var i = v.indexOf('.');
    if(i >= 0) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, '');
    return v;
  }
  window.jpLimpiarDecimal = limpiarDecimal;
  document.addEventListener('input', function(e){
    var el = e.target;
    if(!el || !el.classList || !el.classList.contains('jp-input-native')) return;
    var nv = limpiarDecimal(el.value);
    if(nv !== el.value) el.value = nv;
  }, true);
  /* la carga del Set 1 se propaga (en tenue) a los sets siguientes que aún estén vacíos */
  document.addEventListener('input', function(e){
    var el = e.target;
    if(!el || !el.classList || !el.classList.contains('jp-val-primary')) return;
    var row = el.closest('.jp-set-row-native'); if(!row || !el.value) return;
    var sib = row.nextElementSibling;
    while(sib && sib.classList && sib.classList.contains('jp-set-row-native')){
      var k = sib.querySelector('.jp-val-primary');
      if(k && !k.value) k.placeholder = el.value;
      sib = sib.nextElementSibling;
    }
    /* en un biset por rondas, los mismos sets del mismo ejercicio están en las rondas siguientes */
    var sub = row.closest('.jp-ronda-sub'), card = sub && sub.closest('.jp-ronda-card');
    if(sub && card){
      var pos = Array.prototype.indexOf.call(card.querySelectorAll('.jp-ronda-sub'), sub);
      var next = card.nextElementSibling;
      while(next && next.classList.contains('jp-ronda-card')){
        var s2 = next.querySelectorAll('.jp-ronda-sub')[pos];
        var k2 = s2 && s2.querySelector('.jp-val-primary');
        if(k2 && !k2.value) k2.placeholder = el.value;
        next = next.nextElementSibling;
      }
    }
  });
})();



/* ===== TACTICAL HUD · CrossFit / Hyrox: switch de alternativas, Activación colapsada, score interactivo y registro por ronda ===== */
(function(){
  'use strict';
  if(window.COACH_DISCIPLINA === 'sports') return;
  var KALT = 'coachjp_cf_alt_v1', KRND = 'coachjp_cf_rounds_v1';
  function leer(k){ try{ return JSON.parse(localStorage.getItem(k) || '{}') || {}; }catch(e){ return {}; } }
  function guardar(k, o){ try{ localStorage.setItem(k, JSON.stringify(o)); }catch(e){} }
  function esc(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* 1 · "— O BIEN —": switch segmentado [ 🚴 BIKE | 🚣 ROW ]: el texto completo vive en los botones, las filas originales quedan ocultas */
  function iconoAlt(t){
    return /bike|assault|echo|air\s*bike|bici/i.test(t) ? '\ud83d\udeb4' : (/\brow\b|remo|ski/i.test(t) ? '\ud83d\udea3' : (/run|corr|trote|carrera/i.test(t) ? '\ud83c\udfc3' : (/swim|nado/i.test(t) ? '\ud83c\udfca' : '\u21c4')));
  }
  /* "Assault Bike x 5:00 @ easy pace" -> "BIKE 5:00"; "Row x 5:00 @ easy pace" -> "ROW 5:00" */
  function compactoAlt(t){
    var tiempo = (t.match(/\d+:\d{2}/) || t.match(/\d+\s*(?:min|cal|km|mts?|m)\b/i) || [''])[0].replace(/\s+/g, ' ');
    var nom = /assault|echo|air\s*bike|bike|bici/i.test(t) ? 'BIKE' : (/\brow(?:er|ing)?\b|remo/i.test(t) ? 'ROW' : (/ski/i.test(t) ? 'SKI' : (/\brun\b|corr|trote/i.test(t) ? 'RUN' : '')));
    return nom ? (nom + (tiempo ? ' ' + tiempo : '')) : t;
  }
  function alternativas(){
    var ors = document.querySelectorAll('.jp-cfboard .jp-cf-or:not([data-jp])');
    for(var i = 0; i < ors.length; i++){
      (function(or){
        var a = or.previousElementSibling, b = or.nextElementSibling;
        or.setAttribute('data-jp', '1');
        if(!a || !b || !a.classList.contains('jp-cf-row') || !b.classList.contains('jp-cf-row')) return;
        var board = or.closest('.jp-cfboard');
        var etq = function(r){
          var rn = r.querySelector('.jp-cf-rn'), rv = r.querySelector('.jp-cf-rv');
          var t = ((rn ? rn.textContent : r.textContent) + ' ' + (rv ? rv.textContent : '')).replace(/\[\s*MIN\s*\d+\s*\]/i, '').replace(/\s+/g, ' ').trim();
          return t;
        };
        var ta = compactoAlt(etq(a)), tb = compactoAlt(etq(b));
        var key = ((typeof state !== 'undefined' && state && state.currentWeek) || 0) + '|' + (board && board.getAttribute('data-wodb') || '') + '#' + ta;
        var box = document.createElement('div');
        box.className = 'jp-cf-alt'; box.setAttribute('data-sel', leer(KALT)[key] || 'a');
        box.innerHTML = '<div class="jp-cf-altsw" role="group" aria-label="Alternativa"><button type="button" data-alt="a">' + iconoAlt(ta) + ' ' + esc(ta) + '</button><span class="jp-cf-altor">|</span><button type="button" data-alt="b">' + iconoAlt(tb) + ' ' + esc(tb) + '</button></div>';
        a.parentNode.insertBefore(box, a);
        a.classList.add('jp-cf-alt-a'); b.classList.add('jp-cf-alt-b');
        box.appendChild(a); box.appendChild(b); or.remove();
        box.addEventListener('click', function(e){
          var t = e.target.closest('[data-alt]'); if(!t) return;
          var v = t.getAttribute('data-alt'); box.setAttribute('data-sel', v);
          var o = leer(KALT); o[key] = v; guardar(KALT, o);
        });
      })(ors[i]);
    }
  }

  /* 2 · Activación (warm-up) colapsada en un acordeón de una línea */
  function warmCF(){
    var bds = document.querySelectorAll('.block.cat-warmup .block-body > .jp-cfboard');
    for(var i = 0; i < bds.length; i++){
      var bd = bds[i];
      var n = bd.querySelectorAll('.jp-cf-rows .jp-cf-row').length;
      var det = document.createElement('details'); det.className = 'jp-warm-acc';
      det.innerHTML = '<summary><span class="jp-warm-lb">\ud83d\udd25 ACTIVACI\u00d3N' + (n ? ' \u00b7 ' + n + ' EJERCICIOS' : '') + '</span><span class="jp-warm-chev">\u25bc</span></summary>';
      bd.parentNode.insertBefore(det, bd); det.appendChild(bd);
    }
  }

  /* 3 · SCORE: FOR TIME (completado MM:SS o CAPPED + reps), AMRAP (rondas + reps), EMOM (rondas completadas + kg) y toggle [ RX ] / [ SCALED ];
         marca [ ▲ NUEVO SCORE ] si supera el mejor registro previo de ese mismo WOD */
  var RX_NIVEL = /\s*\[(DEVELOPMENT|ADVANCED|RX|ELITE|SCALED)\]\s*$/i;
  function valScore(sc, tipo){
    var t = String(sc || '').replace(RX_NIVEL, '').trim(), m;
    if(tipo === 'tiempo'){
      if((m = t.match(/^CAP\s*\+\s*(\d+)/i))) return -1e6 + parseInt(m[1], 10);
      if((m = t.match(/^(\d+)\s*:\s*(\d+)/))) return -(parseInt(m[1], 10) * 60 + parseInt(m[2], 10));
      return null;
    }
    if(tipo === 'rondas' && (m = t.match(/^(\d+)\s*\+\s*(\d+)/))) return parseInt(m[1], 10) * 1000 + parseInt(m[2], 10);
    return null;
  }
  function mejorPrevio(skey, tipo){
    var bid = String(skey).split('|')[2], mejor = null;
    Object.keys(state.scores || {}).forEach(function(k){
      if(k === skey || String(k).split('|')[2] !== bid) return;
      var v = valScore(state.scores[k], tipo); if(v != null && (mejor == null || v > mejor)) mejor = v;
    });
    return mejor;
  }
  function score(){
    var boxes = document.querySelectorAll('.jp-cfboard .wod-score:not([data-jp])');
    for(var i = 0; i < boxes.length; i++){
      (function(box){
        var inp = box.querySelector('.wod-score-in'); if(!inp) return;
        box.setAttribute('data-jp', '1');
        var board = box.closest('.jp-cfboard');
        var ph = inp.placeholder || '', val = inp.value || '';
        var mN = val.match(RX_NIVEL), nivel = mN ? mN[1].toUpperCase() : '';
        var nivelAtl = String((typeof PROGRAM_CONFIG !== 'undefined' && PROGRAM_CONFIG.cfNivel) || '').toUpperCase();
        nivel = nivelAtl;     /* la categoria la define el coach en el Builder: no hay selector en la vista del atleta */
        var base = val.replace(RX_NIVEL, '');
        var tipo = /tiempo/i.test(ph) ? 'tiempo' : (/rondas/i.test(ph) ? 'rondas' : 'libre');
        var esEmom = !!board && /\bEMOM\b|\bEVERY\b/i.test((board.querySelector('.jp-cf-fmtbadge') || board).textContent || '');
        if(tipo === 'rondas' && esEmom) tipo = 'emom';
        var capped = /^CAP\s*\+/i.test(base);
        var ui = document.createElement('div'); ui.className = 'jp-sc-ui';
        var campos = '';
        if(tipo === 'tiempo') campos = '<span class="jp-sc-fin"><button type="button" data-fin="ok">COMPLETADO</button><button type="button" data-fin="cap">CAPPED</button></span><span class="jp-sc-seg"><input class="jp-sc-a" inputmode="numeric" maxlength="3" placeholder="MM" aria-label="Minutos"><b class="jp-sc-sep">:</b><input class="jp-sc-b" inputmode="numeric" maxlength="3" placeholder="SS" aria-label="Segundos"></span>';
        else if(tipo === 'rondas') campos = '<span class="jp-sc-seg"><input class="jp-sc-a" inputmode="numeric" maxlength="3" placeholder="RONDAS" aria-label="Rondas"><b>+</b><input class="jp-sc-b" inputmode="numeric" maxlength="3" placeholder="REPS" aria-label="Repeticiones adicionales"></span>';
        else if(tipo === 'emom') campos = '<span class="jp-sc-seg"><input class="jp-sc-a" inputmode="numeric" maxlength="3" placeholder="RONDAS OK" aria-label="Rondas completadas"><b>·</b><input class="jp-sc-b" inputmode="decimal" maxlength="5" placeholder="KG" aria-label="Peso alcanzado"></span>';
        else campos = '<input class="jp-sc-free" type="text" placeholder="Ej: 42 reps">';
        ui.innerHTML = campos + '' + (nivelAtl ? '<span class="jp-sc-cat" title="Categor\u00eda">' + nivelAtl + '</span>' : '') + '<span class="jp-sc-pr" hidden>▲ NUEVO SCORE</span>';
        inp.parentNode.insertBefore(ui, inp.nextSibling);
        inp.style.display = 'none';
        var A = ui.querySelector('.jp-sc-a'), B = ui.querySelector('.jp-sc-b'), F = ui.querySelector('.jp-sc-free'), PR = ui.querySelector('.jp-sc-pr');
        function modoCap(){
          if(tipo !== 'tiempo') return;
          ui.classList.toggle('es-cap', capped);
          var bs = ui.querySelectorAll('[data-fin]'); for(var k = 0; k < bs.length; k++) bs[k].classList.toggle('on', bs[k].getAttribute('data-fin') === (capped ? 'cap' : 'ok'));
          if(B) B.placeholder = capped ? 'REPS HECHAS' : 'SS';
        }
        if(A){
          var pm;
          if(tipo === 'tiempo'){
            if(capped){ pm = base.match(/^CAP\s*\+\s*(\d+)/i); if(pm) B.value = pm[1]; }
            else { pm = base.match(/^(\d+)\s*:\s*(\d+)/); if(pm){ A.value = pm[1]; B.value = pm[2]; } }
          } else if(tipo === 'emom'){
            pm = base.match(/^(\d+)\s*rondas?(?:\s*·\s*([\d.,]+)\s*kg)?/i); if(pm){ A.value = pm[1]; B.value = pm[2] || ''; }
          } else { pm = base.match(/^(\d+)\s*\+\s*(\d+)/); if(pm){ A.value = pm[1]; B.value = pm[2]; } }
        }
        if(F) F.value = base;
        function marcar(){ var bs = ui.querySelectorAll('[data-rx]'); for(var k = 0; k < bs.length; k++) bs[k].classList.toggle('on', bs[k].getAttribute('data-rx') === nivel); }
        function pintarPR(sTxt){
          var skey = inp.dataset.skey, v = valScore(sTxt, tipo), prev = (v == null) ? null : mejorPrevio(skey, tipo);
          var es = (v != null && prev != null && v > prev);
          state.scorePR = state.scorePR || {};
          if(es) state.scorePR[skey] = 1; else delete state.scorePR[skey];
          if(PR) PR.hidden = !es;
        }
        function componer(){
          var sTxt = '';
          if(A){
            var a = (A.value || '').replace(/\D/g, ''), b = (B.value || '').replace(tipo === 'emom' ? /[^\d.,]/g : /\D/g, '');
            if(tipo === 'tiempo' && capped){ if(b) sTxt = 'CAP+' + b; }
            else if(a || b){
              if(tipo === 'tiempo') sTxt = (a || '0') + ':' + ((b.length === 1 ? '0' + b : b) || '00');
              else if(tipo === 'emom') sTxt = (a || '0') + ' rondas' + (b ? ' · ' + b + ' kg' : '');
              else sTxt = (a || '0') + '+' + (b || '0');
            }
          } else if(F){ sTxt = (F.value || '').replace(RX_NIVEL, '').trim(); }
          inp.value = sTxt ? sTxt + (nivel ? ' [' + nivel + ']' : '') : '';
          pintarPR(sTxt);
          inp.dispatchEvent(new Event('input', { bubbles: true }));
        }
        ui.addEventListener('input', function(e){ if(e.target.matches('.jp-sc-a, .jp-sc-b, .jp-sc-free')) componer(); });
        ui.addEventListener('click', function(e){
          var fb = e.target.closest('[data-fin]');
          if(fb){ capped = fb.getAttribute('data-fin') === 'cap'; if(capped && A) A.value = ''; modoCap(); componer(); return; }
          var t = e.target.closest('[data-rx]'); if(!t) return;
          var v = t.getAttribute('data-rx'); nivel = (nivel === v) ? '' : v; marcar(); componer();
        });
        marcar(); modoCap(); pintarPR(base);
        box._jpFree = F; box._jpSet = function(sTxt, esCap){ capped = !!esCap; modoCap(); if(A){ if(esCap){ A.value = ''; B.value = sTxt; } else { var q = String(sTxt).split(':'); A.value = q[0] || ''; B.value = q[1] || ''; } } componer(); };
      })(boxes[i]);
    }
  }
  /* al finalizar un FOR TIME desde el HUD Timer, el tiempo (o el CAP) pasa solo al score del WOD que se inició */
  document.addEventListener('jp-wod-fin', function(e){
    try{
      var det = (e && e.detail) || {}, act = window.__jpWodActivo;
      if(!act || det.modo !== 'fortime') return;
      var board = document.querySelector('.jp-cfboard[data-wodb="' + act.id + '"]'); if(!board) return;
      var box = board.querySelector('.wod-score'); if(!box || !box._jpSet) return;
      var cap = /cap/i.test(det.motivo);
      var mm = Math.floor(det.seg / 60), ss = det.seg % 60;
      if(cap) box._jpSet('', true); else box._jpSet(mm + ':' + ('0' + ss).slice(-2), false);
      box.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }catch(err){ console.warn('fin wod', err); }
  });
  /* 4 · EMOM por acumulación: registro opcional por ronda con total automático */
  function emomRondas(){
    var bds = document.querySelectorAll('.jp-cfboard:not([data-jp-emom])');
    for(var i = 0; i < bds.length; i++){
      (function(bd){
        bd.setAttribute('data-jp-emom', '1');
        var txt = bd.textContent || '';
        if(!/\bEMOM\b/i.test(txt)) return;
        var sc = bd.querySelector('.wod-score'); if(!sc) return;
        var m = txt.match(/\bEMOM\s*(\d+)\s*min/i);
        var mins = m ? parseInt(m[1], 10) : 0, mn = 0;
        var mc = bd.querySelectorAll('.jp-cf-min');
        for(var j = 0; j < mc.length; j++){ var v = parseInt((mc[j].textContent.match(/\d+/) || [0])[0], 10); if(v > mn) mn = v; }
        var rondas = (mins && mn) ? Math.max(1, Math.floor(mins / mn)) : mins;
        if(!rondas || rondas > 24) return;
        var key = ((typeof state !== 'undefined' && state && state.currentWeek) || 0) + '|' + (bd.getAttribute('data-wodb') || '');
        var guardado = leer(KRND)[key] || [];
        var ins = '';
        for(var r = 1; r <= rondas; r++) ins += '<label class="jp-er-c"><span>R' + r + '</span><input type="text" inputmode="decimal" data-r="' + (r - 1) + '" value="' + esc(guardado[r - 1] || '') + '" placeholder="\u2014"></label>';
        var det = document.createElement('details'); det.className = 'jp-er';
        det.innerHTML = '<summary>[ REGISTRO POR RONDA ] <b class="jp-er-total">TOTAL 0</b></summary><div class="jp-er-grid">' + ins + '</div>';
        sc.parentNode.insertBefore(det, sc);
        function total(){
          var t = 0, vals = [];
          det.querySelectorAll('input[data-r]').forEach(function(x){
            var n = parseFloat(String(x.value).replace(',', '.')) || 0; t += n; vals.push(x.value);
          });
          t = Math.round(t * 100) / 100;
          det.querySelector('.jp-er-total').textContent = 'TOTAL ' + t;
          var o = leer(KRND); o[key] = vals; guardar(KRND, o);
          return t;
        }
        total();
        det.addEventListener('input', function(e){
          if(!e.target.matches('input[data-r]')) return;
          e.target.value = e.target.value.replace(/,/g, '.').replace(/[^0-9.]/g, '');
          var t = total();
          var F = sc._jpFree, inp = sc.querySelector('.wod-score-in');
          if(F){ F.value = t ? String(t) : ''; F.dispatchEvent(new Event('input', { bubbles: true })); }
          else if(inp){ inp.value = t ? String(t) : ''; inp.dispatchEvent(new Event('input', { bubbles: true })); }
        });
      })(bds[i]);
    }
  }

  /* intervalos con carga (deficit lunges, carries...): campo de peso y de rondas completadas */
  var KCAR = 'coachjp_cf_carga_v1';
  function cargaIntervalos(){
    var bds = document.querySelectorAll('.jp-cfboard:not([data-jp-ic])');
    for(var i = 0; i < bds.length; i++){
      (function(bd){
        bd.setAttribute('data-jp-ic', '1');
        var txt = bd.textContent || '';
        if(!(bd.querySelector('.jp-cf-interval, .jp-cf-cell') || /\b(?:every|emom|intervalos?)\b/i.test(txt))) return;
        var pesado = !!bd.querySelector('.jp-cf-load, .jp-cf-pct, .jp-cf-refload') || /@\s*\d+(?:[.,]\d+)?\s*(?:kg|lbs?)\b|\b\d+\s*(?:kg|lbs?)\b/i.test(txt) || /\b(?:deadlift|clean|snatch|thruster|lunges?|carry|carries|barbell|kettlebell|dumbbell|sled)\b/i.test(txt);
        if(!pesado) return;      /* WOD sin barras pesadas: solo [ SCORE ] */
        var key = ((typeof state !== 'undefined' && state && state.currentWeek) || 0) + '|' + (bd.getAttribute('data-wodb') || '');
        var g = leer(KCAR)[key] || {};
        var det = document.createElement('details'); det.className = 'jp-icr';
        det.innerHTML = '<summary>[ CARGA / RONDAS ]<span>opcional</span></summary><div class="jp-ic-grid">' +
          '<label>CARGA UTILIZADA<input type="text" data-k="kg" value="' + esc(g.kg || '') + '" placeholder="\u2014"></label>' +
          '<label>RONDAS COMPLETADAS<input type="text" inputmode="numeric" data-k="rondas" value="' + esc(g.rondas || '') + '" placeholder="\u2014"></label></div>';
        var ref = bd.querySelector('.jp-er') || bd.querySelector('.wod-score') || null;
        if(ref) ref.parentNode.insertBefore(det, ref); else bd.appendChild(det);
        det.addEventListener('input', function(e){
          var t = e.target; if(!t.matches('input[data-k]')) return;
          if(t.getAttribute('data-k') !== 'kg') t.value = t.value.replace(/,/g, '.').replace(/[^0-9.]/g, '');
          var o = leer(KCAR), v = o[key] || {}; v[t.getAttribute('data-k')] = t.value; o[key] = v; guardar(KCAR, o);
        });
      })(bds[i]);
    }
  }
  var tick = 0;
  function pasada(){
    tick = 0;
    try{ alternativas(); warmCF(); score(); emomRondas(); cargaIntervalos(); }catch(e){ console.warn('cf hud', e); }
  }
  function programar(){ if(!tick) tick = setTimeout(pasada, 120); }
  function montar(){
    pasada();
    var mc = document.getElementById('mainContent');
    if(mc) new MutationObserver(programar).observe(mc, { childList: true, subtree: true });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(montar, 200); }); else setTimeout(montar, 200);
})();



/* ===== TACTICAL HUD · bloque completado (auto-colapso), reporte de sesión por WhatsApp y Myo-Reps ===== */
(function(){
  'use strict';
  var reabiertos = {};
  function claveRe(id){ return ((typeof state !== 'undefined' && state && state.currentWeek) || 0) + '|' + id; }
  function q(s, r){ return (r || document).querySelector(s); }
  function nJP(v){ return (typeof numJP === 'function') ? numJP(v) : (parseFloat(String(v == null ? '' : v).replace(',', '.')) || 0); }
  function fJP(n){ return (typeof fmtJP === 'function') ? fmtJP(n) : String(Math.round(n * 100) / 100); }
  function leerLS(k){ try{ return JSON.parse(localStorage.getItem(k) || '{}') || {}; }catch(e){ return {}; } }

  /* ---------- 1 · check de bloque completo ---------- */
  function tituloBloque(bl){
    var t = q('.jp-sb-title, .jp-cf-title', bl), s = t ? t.textContent.trim() : '';
    if(!s){ var l = q('.block-label', bl); s = l ? l.textContent.trim() : 'Bloque'; }
    return s;
  }
  function armarBloques(){
    var bls = document.querySelectorAll('#mainContent .blocks-stack > .block');
    for(var i = 0; i < bls.length; i++){
      var bl = bls[i], board = q('.jp-sb-board, .jp-cfboard', bl), cb = q('.block-done-cb', bl);
      if(!board || !cb) continue;
      var id = bl.getAttribute('data-block-id') || '';
      var line = null;
      for(var c = 0; c < bl.children.length; c++){ if(bl.children[c].classList.contains('jp-done-line')){ line = bl.children[c]; break; } }
      if(!line){
        line = document.createElement('div'); line.className = 'jp-done-line'; line.setAttribute('role', 'button'); line.setAttribute('tabindex', '0');
        bl.insertBefore(line, bl.firstChild);
      }
      var txt = tituloBloque(bl);
      if(line.getAttribute('data-t') !== txt){
        line.setAttribute('data-t', txt);
        line.innerHTML = '<span class="jp-dl-ck">\u2713</span><span class="jp-dl-t"></span><span class="jp-dl-re">Reabrir</span>';
        line.querySelector('.jp-dl-t').textContent = txt;
      }
      var sports = true;      /* Sports y CrossFit: cabecera solo con etiqueta + chevron, boton de cierre al pie */
      var btn = q('.jp-done-btn', bl);
      if(!btn){
        btn = document.createElement('button'); btn.type = 'button';
        btn.className = 'jp-done-btn' + (sports ? ' jp-done-foot' : '');
        btn.textContent = board.classList.contains('jp-cfboard') ? 'COMPLETAR WOD / BLOQUE' : 'COMPLETAR BLOQUE';
        var sum = q('.jp-warm-acc > summary', bl);
        if(sports){
          /* Sports: la cabecera lleva solo etiqueta + chevron; el boton va al final del bloque */
          board.appendChild(btn);
          var tagS = q('.jp-sb-tag, .jp-cf-tag', board);
          if(tagS && !sum && !q('.jp-chev', tagS)){
            tagS.classList.add('jp-tag-row');
            var tlbS = document.createElement('span'); tlbS.className = 'jp-tag-lb';
            while(tagS.firstChild) tlbS.appendChild(tagS.firstChild);
            tagS.appendChild(tlbS);
            var chvS = document.createElement('span'); chvS.className = 'jp-chev'; chvS.textContent = '\u25b2';
            tagS.appendChild(chvS);
          }
        } else if(sum){ sum.insertBefore(btn, q('.jp-warm-chev', sum)); }
        else {
          var tag = q('.jp-sb-tag, .jp-cf-tag', board);
          if(tag){
            tag.classList.add('jp-tag-row');
            var tlb = document.createElement('span'); tlb.className = 'jp-tag-lb';
            while(tag.firstChild) tlb.appendChild(tag.firstChild);
            tag.appendChild(tlb);
            var act = document.createElement('span'); act.className = 'jp-tag-act'; act.appendChild(btn);
            var chv = document.createElement('span'); chv.className = 'jp-chev'; chv.textContent = '\u25b2'; act.appendChild(chv);
            tag.appendChild(act);
          } else board.insertBefore(btn, board.firstChild);
        }
      }
      if(sports && board.lastElementChild !== btn) board.appendChild(btn);
      btn.classList.toggle('on', !!cb.checked);
      /* escrituras idempotentes: reescribir el mismo valor igual genera un registro de mutacion, y este modulo se vuelve a disparar con esos registros (bucle infinito) */
      var apv = cb.checked ? 'true' : 'false';
      if(btn.getAttribute('aria-pressed') !== apv) btn.setAttribute('aria-pressed', apv);
      var chv2 = q('.jp-chev', bl), chT = bl.classList.contains('jp-fold') ? '\u25bc' : '\u25b2';
      if(chv2 && chv2.textContent !== chT) chv2.textContent = chT;
      if(cb.checked){
        bl.classList.add('block-done');
        if(!reabiertos[claveRe(id)]) bl.classList.add('collapsed');
      }
    }
  }
  document.addEventListener('click', function(e){
    var btn = e.target.closest && e.target.closest('.jp-done-btn');
    if(btn){
      e.preventDefault(); e.stopPropagation();
      var bl = btn.closest('.block'), cb = bl && q('.block-done-cb', bl); if(!cb) return;
      var id = bl.getAttribute('data-block-id') || '';
      if(!cb.checked){
        cb.click(); delete reabiertos[claveRe(id)];
        bl.classList.add('block-done', 'collapsed');
        try{ if('vibrate' in navigator) navigator.vibrate(20); }catch(err){}
      } else {
        cb.click(); bl.classList.remove('block-done', 'collapsed');
      }
      armarBloques();
      if(btn.classList.contains('jp-done-foot') && cb.checked){
        /* abre el bloque siguiente y lleva la vista hacia él */
        var sig = bl.nextElementSibling;
        while(sig && !(sig.classList && sig.classList.contains('block'))) sig = sig.nextElementSibling;
        if(sig){
          var idS = sig.getAttribute('data-block-id') || '';
          if(sig.classList.contains('collapsed')){ reabiertos[claveRe(idS)] = 1; sig.classList.remove('collapsed'); }
          sig.classList.remove('jp-fold');
          var waS = sig.querySelector('.jp-warm-acc'); if(waS) waS.open = true;
        }
        var meta = sig || bl;
        setTimeout(function(){ try{ window.scrollTo({ top: Math.max(0, meta.getBoundingClientRect().top + window.scrollY - 120), behavior: 'smooth' }); }catch(err){} }, 120);
      }
      return;
    }
    var cab = e.target.closest && e.target.closest('.jp-tag-row, .jp-sb-title, .jp-cf-title');
    if(cab && !e.target.closest('.jp-done-btn') && !cab.closest('.jp-warm-acc')){
      var bf = cab.closest('.block');
      if(bf && !bf.classList.contains('collapsed')){
        bf.classList.toggle('jp-fold');
        var cv = q('.jp-chev', bf); if(cv) cv.textContent = bf.classList.contains('jp-fold') ? '\u25bc' : '\u25b2';
      }
      return;
    }
    var line = e.target.closest && e.target.closest('.jp-done-line');
    if(line){
      var b2 = line.closest('.block'); if(!b2) return;
      reabiertos[claveRe(b2.getAttribute('data-block-id') || '')] = 1;
      b2.classList.remove('collapsed');
    }
  }, true);
  document.addEventListener('keydown', function(e){
    if((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('jp-done-line')){ e.preventDefault(); e.target.click(); }
  });
  /* la serie activa de cada ejercicio (la primera sin tildar) lleva borde iluminado */
  function marcarActivas(){
    var rows = document.querySelectorAll('#mainContent .jp-set-row-native'), grupos = {}, ks = [];
    for(var i = 0; i < rows.length; i++){
      var g = (rows[i].getAttribute('data-set-key') || '').replace(/\|[^|]*$/, '');
      if(!grupos[g]){ grupos[g] = []; ks.push(g); }
      grupos[g].push(rows[i]);
    }
    /* solo se toca la clase de las filas que realmente cambian de estado (antes se quitaba y volvia a poner en todas, en cada pasada) */
    ks.forEach(function(g){
      var act = grupos[g].filter(function(x){ return !x.classList.contains('completed'); })[0];
      grupos[g].forEach(function(x){ var debe = (x === act); if(x.classList.contains('jp-set-activa') !== debe) x.classList.toggle('jp-set-activa', debe); });
    });
  }
  /* al tildar una serie el foco pasa al primer input de la serie siguiente sin completar */
  function enfocarSiguiente(btn){
    var row = btn.closest('.jp-set-row-native'); if(!row || !row.classList.contains('completed')) return;
    var rows = [].slice.call(document.querySelectorAll('#mainContent .jp-set-row-native'));
    var sig = null;
    for(var k = rows.indexOf(row) + 1; k < rows.length; k++){ if(!rows[k].classList.contains('completed')){ sig = rows[k]; break; } }
    if(!sig) return;
    var inp = sig.querySelector('.jp-val-primary');
    if(!inp || inp.offsetParent === null) inp = sig.querySelector('.jp-val-secondary');
    if(inp){
      try{ inp.focus({ preventScroll: true }); }catch(err){ inp.focus(); }
      try{ sig.scrollIntoView({ block: 'center', behavior: 'smooth' }); }catch(err){}
    }
  }
  document.addEventListener('click', function(e){
    var ck = e.target.closest && e.target.closest('.jp-btn-check-native');
    if(!ck) return;
    setTimeout(marcarActivas, 60);
    setTimeout(function(){ enfocarSiguiente(ck); }, 90);
  }, true);

  /* duracion proyectada de la sesion: series x (tiempo bajo tension + descanso prescripto) */
  window.jpMinutosPrescriptos = function(){
    var day = (typeof getCurrentDay === 'function') ? getCurrentDay() : null; if(!day) return 0;
    if(window.COACH_DISCIPLINA !== 'sports'){
      /* CrossFit: calentamiento ~8 min, fuerza = series x (trabajo + descanso), WODs por su duracion / cap */
      var totCF = 0;
      (day.blocks || []).forEach(function(block){
        var lin = (typeof itemsDeSemana === 'function') ? (itemsDeSemana(block, state.currentWeek) || []) : (block.items || []);
        var txtCF = lin.join(' '), cat = block.category;
        if(cat === 'warmup'){ totCF += 8; return; }
        if(cat === 'strength' || cat === 'accessory'){
          var exs = (typeof window.jpCfListaEjercicios === 'function') ? window.jpCfListaEjercicios(lin) : [];
          var rm = txtCF.match(/rest\s*(\d+):(\d{2})/i), rs2 = txtCF.match(/rest\s*(\d+)\s*s/i);
          var restS = rm ? (parseInt(rm[1], 10) * 60 + parseInt(rm[2], 10)) : (rs2 ? parseInt(rs2[1], 10) : 90);
          exs.forEach(function(ex){ totCF += ex.sets * (0.75 + restS / 60); });
          return;
        }
        var mm = txtCF.match(/(?:amrap|emom|cap)\s*(\d{1,2})\s*(?:min|')?/i) || txtCF.match(/(\d{1,2})\s*min/i);
        totCF += (mm ? parseInt(mm[1], 10) : 12) + 3;
      });
      return totCF > 0 ? Math.round(totCF + 5) : 0;
    }
    var tut = function(reps){ var n = parseInt(String(reps), 10) || 10; return Math.min(90, Math.max(30, n * 4)) / 60; };
    var tot = 0;
    (day.blocks || []).forEach(function(block){
      var lineas = (typeof itemsDeSemana === 'function') ? itemsDeSemana(block, state.currentWeek) : (block.items || []);
      if(!lineas.length || typeof window.parsearPizarraSB !== 'function') return;
      var entries; try{ entries = window.parsearPizarraSB(lineas, { titulo: block.title }); }catch(err){ return; }
      entries.forEach(function(en){
        if(en.tipo === 'simple' && en.sets){ tot += en.sets * (tut(en.reps) + (en.restSeconds || 90) / 60); }
        else if(en.tipo === 'biserie' && en.subs && en.subs.length){
          var w = 0; en.subs.forEach(function(sb){ w += tut(sb.reps); });
          tot += (en.rondas || 3) * (w + (en.restSeconds || 90) / 60);
        } else if(!en.sets){ tot += 1; }
      });
    });
    return tot > 0 ? Math.round(tot + 5) : 0;
  };
  /* tiempo de la story: diferencia real entre la primera y la ultima marca de la sesion; si no es creible, la proyeccion prescripta */
  /* TIEMPO NETO DE LA SESION (reporte de WhatsApp, resumen del dia y story): suma solo los tramos entre acciones registradas
     (un hueco de mas de 30 min es una pausa y no cuenta), toma unicamente la ultima tanda de entrenamiento (un hueco de 2 h o mas
     separa sesiones) y NUNCA supera lo programado del dia: tope = tiempo estimado por los bloques + 50 % de margen, entre 60 y 120 min.
     Antes se restaba el primer toque del dia al momento de cerrar (inicio fijo, sin reinicio), asi que una sesion tocada a la manana
     y cerrada a la noche reportaba 231 min. Devuelve { min, estimado, tope }; estimado = true cuando no hay registro creible y se usa lo programado. */
  window.jpTiempoSesion = function(){
    var proy = 0; try{ proy = window.jpMinutosPrescriptos(); }catch(err){}
    var tope = proy > 0 ? Math.min(120, Math.max(60, Math.round(proy * 1.5))) : 90;
    var m = ((state.session && state.session.marcasTiempo) || []).slice().sort(function(a, b){ return a - b; }), real = 0;
    if(m.length > 1){
      var desde = 0, j;
      for(j = 1; j < m.length; j++){ if(m[j] - m[j - 1] >= 2 * 3600000) desde = j; }
      for(j = desde + 1; j < m.length; j++){ var d = m[j] - m[j - 1]; if(d > 0 && d <= 30 * 60000) real += d; }
      real = Math.round(real / 60000);
    }
    if(real >= 5 && (!proy || real >= proy * 0.5)) return { min: Math.min(real, tope), estimado: false, tope: tope };
    return { min: proy > 0 ? Math.min(proy, tope) : 0, estimado: true, tope: tope };
  };
  window.jpMinutosSesion = function(activos){
    var t = window.jpTiempoSesion();
    if(t.min > 0) return t.min;
    return Math.min(Math.max(0, activos || 0), t.tope);
  };
  /* cierre del dia con bloques pendientes: confirmacion antes de marcarlo */
  function mostrarConfirmDia(hechos, total, ok){
    var viejo = document.getElementById('jpConfirmDia'); if(viejo) viejo.remove();
    var m = document.createElement('div'); m.id = 'jpConfirmDia';
    m.innerHTML = '<div class="jp-cd-box"><h4>Quedan bloques pendientes</h4><p></p><div class="jp-cd-acts"><button type="button" data-cd="no">Seguir entrenando</button><button type="button" data-cd="si">Marcar igual</button></div></div>';
    m.querySelector('p').textContent = 'Completaste ' + hechos + ' de ' + total + ' bloques. ¿Querés marcar el día como finalizado de todas formas?';
    document.body.appendChild(m);
    m.addEventListener('click', function(e){
      var b = e.target.closest('[data-cd]');
      if(!b && e.target !== m) return;
      m.remove();
      if(b && b.getAttribute('data-cd') === 'si') ok();
    });
  }
  document.addEventListener('click', function(e){
    var b = e.target.closest && e.target.closest('#dayCompleteBtn'); if(!b) return;
    if(window.__jpForzarDia){ window.__jpForzarDia = false; return; }
    if(b.classList.contains('done')) return;
    var bls = [].slice.call(document.querySelectorAll('#mainContent .blocks-stack > .block'));
    var pend = bls.filter(function(x){ var c = x.querySelector('.block-done-cb'); return c && !c.checked; }).length;
    if(!pend) return;
    e.preventDefault(); e.stopImmediatePropagation();
    mostrarConfirmDia(bls.length - pend, bls.length, function(){ window.__jpForzarDia = true; b.click(); });
  }, true);
  var tickB = 0;
  function progB(){ if(!tickB) tickB = setTimeout(function(){ tickB = 0; try{ armarBloques(); marcarActivas(); }catch(e){ console.warn('bloques', e); } }, 150); }
  function montarB(){
    armarBloques();
    var mc = document.getElementById('mainContent');
    if(mc) new MutationObserver(progB).observe(mc, { childList: true, subtree: true });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(montarB, 250); }); else setTimeout(montarB, 250);

  /* ---------- 2 · Myo-Reps: mini-sets y "+ Agregar" pasan a esmeralda al tocarlos ---------- */
  document.addEventListener('click', function(e){
    var mi = e.target.closest && e.target.closest('.jp-myo-mini');
    if(mi){
      /* botón nativo: un toque marca el mini-set con las reps objetivo, otro toque lo desmarca (misma clave 'mN' de state.loads) */
      var hecho = mi.classList.contains('hecho');
      var objetivo = String(mi.getAttribute('data-micro-target') || '').replace(/\D/g, '');
      var nuevo = hecho ? '' : objetivo;
      mi.classList.toggle('hecho', !hecho);
      mi.setAttribute('aria-pressed', hecho ? 'false' : 'true');
      mi.textContent = '+' + (objetivo || '');
      if(mi.dataset.microKey){ try{ setLoadField(mi.dataset.microKey, 'reps', nuevo); }catch(err){} }
      return;
    }
    var ad = e.target.closest && e.target.closest('.jp-myo-add');
    if(ad) ad.classList.add('on');
  });

  /* ---------- 3 · reporte completo de la sesión ---------- */
  var LINEA = '━━━━━━━━━━━━━━━━━━━━';
  var usadas = {};      /* claves de state.loads ya volcadas al reporte (el barrido generico no las repite) */
  function setsDe(week, dayId, blockId, exIdx, n){
    var arr = [], tope = Math.max(parseInt(n, 10) || 0, 12);
    for(var i = 1; i <= tope; i++){
      var key = getLoadKey(week, dayId, blockId, exIdx, i), ld = getLoad(key);
      if(ld && (nJP(ld.kg) > 0 || nJP(ld.reps) > 0)){ arr.push({ i: i, kg: nJP(ld.kg), reps: nJP(ld.reps) }); usadas[key] = 1; }
    }
    return arr;
  }
  function lineaSet(s, pref, top, un){
    return '  - ' + (pref || '') + 'Serie ' + s.i + ': ' + (s.kg > 0 ? fJP(s.kg) + ' kg' : '') + (s.kg > 0 && s.reps > 0 ? ' × ' : '') + (s.reps > 0 ? fJP(s.reps) + ' ' + (un || 'reps') : '') + (top ? ' [Top Set]' : '');
  }
  /* ---- Sports: nombre una sola vez, sin prefijo de estacion ni "x" huerfana, series iguales agrupadas con └─ ---- */
  function limpiarNombreRep(n){
    var t = String(n || '');
    t = t.replace(/\s*\([^)]*\)\s*$/, '');
    t = t.replace(/^\s*[A-Za-z]\d{1,2}[.):\-]\s*/, '');
    t = t.replace(/(?:\s+[xX]|\s*[×*])\s*$/, '');
    return t.replace(/\s{2,}/g, ' ').trim();
  }
  function setTxtSB(s, un){ return (s.kg > 0 ? fJP(s.kg) + ' kg' : '') + (s.kg > 0 && s.reps > 0 ? ' × ' : '') + (s.reps > 0 ? fJP(s.reps) + ' ' + (un || 'reps') : ''); }
  function agruparSB(arr, un, etq){
    var out = [], kgs = arr.map(function(s){ return s.kg; }), mx = Math.max.apply(null, kgs.concat([0])), mn = Math.min.apply(null, kgs.concat([mx])), i = 0;
    while(i < arr.length){
      var s = arr[i], j = i;
      while(j + 1 < arr.length && arr[j + 1].kg === s.kg && arr[j + 1].reps === s.reps) j++;
      var n = j - i + 1;
      out.push('└─ ' + setTxtSB(s, un) + (n > 1 ? ' (' + n + ' ' + etq + ')' : '') + ((arr.length > 1 && mx > mn && s.kg === mx && n === 1) ? ' · Top Set' : ''));
      i = j + 1;
    }
    return out;
  }
  function bloqueSportsLimpio(block, week, day){
    var out = [], lineas = (typeof itemsDeSemana === 'function') ? itemsDeSemana(block, week) : (block.items || []);
    if(!lineas.length || typeof window.parsearPizarraSB !== 'function') return out;
    var entries; try{ entries = window.parsearPizarraSB(lineas, { titulo: block.title }); }catch(e){ return out; }
    entries.forEach(function(en, idx){
      if(en.tipo === 'simple' && en.sets){
        var arr = setsDe(week, day.id, block.id, 'e' + idx, en.sets), myo = myoLinea(week, day.id, block.id, 'e' + idx);
        if(arr.length || myo){
          out.push('*' + limpiarNombreRep(en.titulo) + '*');
          agruparSB(arr, en.unidad, 'series').forEach(function(l){ out.push(l); });
          if(myo) out.push(myo.replace(/^\s*-\s*/, '└─ '));
        }
      } else if(en.tipo === 'biserie' && en.subs && en.subs.length){
        var porSub = en.subs.map(function(){ return []; }), rondas = Math.max(en.rondas || 3, 12), hay = false;
        for(var r = 1; r <= rondas; r++){
          en.subs.forEach(function(sub, si){
            var kB = getLoadKey(week, day.id, block.id, 'b' + idx + 's' + si, r), ld = getLoad(kB);
            if(ld && (nJP(ld.kg) > 0 || nJP(ld.reps) > 0)){ usadas[kB] = 1; hay = true; porSub[si].push({ i: r, kg: nJP(ld.kg), reps: nJP(ld.reps) }); }
          });
        }
        var myos = en.subs.map(function(sub, si){ return myoLinea(week, day.id, block.id, 'b' + idx + 's' + si, 'A' + (si + 1) + ' '); });
        if(hay || myos.some(Boolean)){
          var L0 = en.letra || 'A', nSub = en.subs.length, tipo = nSub === 2 ? 'BISET' : (nSub === 3 ? 'TRISET' : 'SUPERSERIE');
          out.push('*' + tipo + '* · ' + en.subs.map(function(sub, si){ return L0 + (si + 1) + ' ' + limpiarNombreRep(sub.nombre); }).join(' + '));
          en.subs.forEach(function(sub, si){
            agruparSB(porSub[si], sub.unidad, 'rondas').forEach(function(l){ out.push(l.replace('└─ ', '└─ ' + L0 + (si + 1) + ' · ')); });
            if(myos[si]) out.push(myos[si].replace(/^\s*-\s*/, '└─ '));
          });
        }
      }
    });
    return out;
  }
  function lineasSets(arr, un){
    var kgs = arr.map(function(s){ return s.kg; }), mx = Math.max.apply(null, kgs.concat([0])), mn = Math.min.apply(null, kgs);
    var top = (arr.length > 1 && mx > mn) ? kgs.indexOf(mx) : -1;
    return arr.map(function(s, ix){ return lineaSet(s, '', ix === top, un); });
  }
  function myoLinea(week, dayId, blockId, exIdx, pref){
    var m = [];
    for(var k = 1; k <= 5; k++){ var r = nJP(getLoad(getLoadKey(week, dayId, blockId, exIdx, 'm' + k)).reps); if(r > 0) m.push(fJP(r)); }
    return m.length ? '  - ' + (pref || '') + 'Myo-reps: ' + m.join(' + ') + ' (' + m.length + ' mini-sets)' : '';
  }
  function bloqueSports(block, week, day){
    var out = [], lineas = (typeof itemsDeSemana === 'function') ? itemsDeSemana(block, week) : (block.items || []);
    if(!lineas.length || typeof window.parsearPizarraSB !== 'function') return out;
    var entries; try{ entries = window.parsearPizarraSB(lineas, { titulo: block.title }); }catch(e){ return out; }
    entries.forEach(function(en, idx){
      if(en.tipo === 'simple' && en.sets){
        var arr = setsDe(week, day.id, block.id, 'e' + idx, en.sets), myo = myoLinea(week, day.id, block.id, 'e' + idx);
        if(arr.length || myo){ out.push('• ' + en.titulo + ':'); lineasSets(arr, en.unidad).forEach(function(l){ out.push(l); }); if(myo) out.push(myo); }
      } else if(en.tipo === 'biserie' && en.subs && en.subs.length){
        var l2 = [], rondas = Math.max(en.rondas || 3, 12);
        for(var r = 1; r <= rondas; r++){
          en.subs.forEach(function(sub, si){
            var kB = getLoadKey(week, day.id, block.id, 'b' + idx + 's' + si, r), ld = getLoad(kB);
            if(ld && (nJP(ld.kg) > 0 || nJP(ld.reps) > 0)){
              usadas[kB] = 1;
              l2.push('  - R' + r + ' · A' + (si + 1) + ' ' + sub.nombre + ': ' + (nJP(ld.kg) > 0 ? fJP(nJP(ld.kg)) + ' kg' : '') + (nJP(ld.kg) > 0 && nJP(ld.reps) > 0 ? ' × ' : '') + (nJP(ld.reps) > 0 ? fJP(nJP(ld.reps)) + ' reps' : ''));
            }
          });
        }
        en.subs.forEach(function(sub, si){ var my = myoLinea(week, day.id, block.id, 'b' + idx + 's' + si, 'A' + (si + 1) + ' '); if(my) l2.push(my); });
        if(l2.length){
          out.push('• Biset ' + en.subs.map(function(s, i){ return 'A' + (i + 1) + ' ' + s.nombre; }).join(' + ') + ':');
          l2.forEach(function(l){ out.push(l); });
        }
      }
    });
    return out;
  }
  function bloqueCF(block, week, day){
    var out = [], cat = block.category, skey = week + '|' + day.id + '|' + block.id;
    var lineas = (typeof itemsDeSemana === 'function') ? itemsDeSemana(block, week) : (block.items || []);
    var titulo = (block.title && !/^\s*bloque\s*\d*\s*$/i.test(block.title)) ? block.title : (cat === 'strength' ? 'Fuerza / Skill' : (cat === 'accessory' ? 'Accesorios' : 'WOD / Metcon'));
    if(cat === 'strength' || cat === 'accessory'){
      var exs = (typeof window.jpCfListaEjercicios === 'function') ? window.jpCfListaEjercicios(lineas) : [];
      var l2 = [];
      exs.forEach(function(ex, k){
        var arr = setsDe(week, day.id, block.id, 'cf' + k, 10); if(!arr.length) return;
        if(exs.length > 1) l2.push('  - ' + ex.nombre + ':');
        lineasSets(arr, ex.unidad).forEach(function(l){ l2.push(exs.length > 1 ? '  ' + l : l); });
      });
      if(l2.length){ out.push('• ' + titulo + ':'); l2.forEach(function(l){ out.push(l); }); }
    } else if(cat === 'metcon' || cat === 'cardio' || cat === 'endurance'){
      var txt = (lineas || []).join(' '), mod = /\bemom\b/i.test(txt) ? 'EMOM' : (/\bamrap\b/i.test(txt) ? 'AMRAP' : (/for\s*time|\bRFT\b/i.test(txt) ? 'FOR TIME' : (/tabata/i.test(txt) ? 'TABATA' : '')));
      var score = String((state.scores && state.scores[skey]) || '').trim();
      var rondas = (leerLS('coachjp_cf_rounds_v1')[week + '|' + block.id] || []).filter(function(x){ return nJP(x) > 0; });
      var carga = leerLS('coachjp_cf_carga_v1')[week + '|' + block.id] || {};
      var l3 = [];
      if(score || rondas.length || nJP(carga.kg) > 0 || nJP(carga.rondas) > 0){
        var nivelM = score.match(/\[(DEVELOPMENT|ADVANCED|RX|ELITE|SCALED)\]\s*$/i), nivelT = nivelM ? ({ DEVELOPMENT: 'Development', ADVANCED: 'Advanced', RX: 'RX', ELITE: 'Elite', SCALED: 'Scaled' }[nivelM[1].toUpperCase()] || '') : '';
        var sc = score.replace(/\s*\[(?:DEVELOPMENT|ADVANCED|RX|ELITE|SCALED)\]\s*$/i, '').trim();
        var capM = txt.match(/(?:time\s*cap|cap)\s*[:\-]?\s*(\d{1,2})(?::(\d{2}))?/i), cap = capM ? (capM[1] + ':' + (capM[2] || '00')) : '';
        var cargaTxt = nJP(carga.kg) > 0 ? ' | Carga: ' + fJP(nJP(carga.kg)) + ' kg' : '';
        if(mod === 'FOR TIME'){
          if(sc) l3.push('  ⏱ Tiempo final: ' + sc + (cap ? ' [Cap ' + cap + ']' : '') + (nivelT ? ' | ' + nivelT : ''));
        } else if(mod === 'AMRAP'){
          var ra = sc.match(/(\d+)\s*\+\s*(\d+)/);
          if(sc) l3.push('  🔄 Score: ' + (ra ? ra[1] + ' Rondas + ' + ra[2] + ' Reps' : sc) + cargaTxt + (nivelT ? ' | ' + nivelT : ''));
          else if(cargaTxt) l3.push('  🔄 Score: —' + cargaTxt);
        } else if(mod === 'EMOM'){
          var totM = txt.match(/emom\s*(\d{1,2})/i) || txt.match(/(?:x|por)\s*(\d{1,2})\s*(?:sets?|rondas?|min)?/i);
          l3.push('  ⏱ Intervalos completados: ' + rondas.length + (totM ? '/' + totM[1] : '') + (nivelT ? ' | ' + nivelT : ''));
          if(sc) l3.push('  - Score: ' + sc);
        } else {
          if(mod) l3.push('  - Modalidad: ' + mod);
          if(sc) l3.push('  - Score: ' + sc + (nivelT ? ' | ' + nivelT : ''));
        }
        if(rondas.length) l3.push('  - Registro por ronda: ' + rondas.map(function(x, i){ return 'R' + (i + 1) + ' ' + fJP(nJP(x)); }).join(' · '));
        if(nJP(carga.kg) > 0 && mod !== 'AMRAP') l3.push('  - Carga: ' + fJP(nJP(carga.kg)) + ' kg');
        if(nJP(carga.rondas) > 0) l3.push('  - Rondas completadas: ' + fJP(nJP(carga.rondas)));
        out.push('• ' + (cat === 'metcon' ? 'WOD / METCON' : titulo) + (block.title && cat === 'metcon' ? ' · ' + block.title : '') + ':');
        l3.forEach(function(l){ out.push(l); });
      }
    }
    return out;
  }
  /* todo set con valores de este bloque que el parser de la pizarra no cubrio (bloques estructurados, ejercicios que no matchearon) */
  function bloqueGenerico(block, week, day){
    var pref = week + '|' + day.id + '|' + block.id + '|', porEj = {}, orden = [];
    Object.keys(state.loads || {}).forEach(function(k){
      if(k.indexOf(pref) !== 0 || usadas[k]) return;
      var p = k.slice(pref.length).split('|'), ex = p[0], idx = p[1];
      if(/^m\d/.test(String(idx))) return;      /* mini-sets de Myo-Reps: los cubre myoLinea */
      var ld = state.loads[k] || {};
      if(!(nJP(ld.kg) > 0 || nJP(ld.reps) > 0)) return;
      if(!porEj[ex]){ porEj[ex] = { nombre: ld.__ex || '', sets: [] }; orden.push(ex); }
      if(!porEj[ex].nombre && ld.__ex) porEj[ex].nombre = ld.__ex;
      porEj[ex].sets.push({ i: parseInt(idx, 10) || porEj[ex].sets.length + 1, kg: nJP(ld.kg), reps: nJP(ld.reps) });
      usadas[k] = 1;
    });
    var out = [];
    orden.forEach(function(ex){
      var g = porEj[ex]; g.sets.sort(function(a, b){ return a.i - b.i; });
      if(window.COACH_DISCIPLINA === 'sports'){
        out.push('*' + limpiarNombreRep(g.nombre || block.exerciseName || block.title || 'Ejercicio') + '*');
        agruparSB(g.sets, '', 'series').forEach(function(l){ out.push(l); });
      } else {
        out.push('• ' + (g.nombre || block.exerciseName || block.title || 'Ejercicio') + ':');
        lineasSets(g.sets).forEach(function(l){ out.push(l); });
      }
    });
    return out;
  }
  /* tiempo registrado; sin cronometro, la duracion estimada (real creible, o proyectada de la prescripcion, o de las series cargadas) */
  function fmtMinRep(m){ return m < 60 ? m + ' min' : Math.floor(m / 60) + 'h ' + ('0' + (m % 60)).slice(-2) + 'm'; }
  function duracion(){
    var tN = null; try{ tN = window.jpTiempoSesion ? window.jpTiempoSesion() : null; }catch(e){}
    var tope = tN ? tN.tope : 90;
    if(window.COACH_DISCIPLINA === 'sports' && typeof window.CoachDuracionSesion === 'function'){
      var dd = window.CoachDuracionSesion();
      if(dd && dd.min > 0) return (dd.estimada ? '~' : '') + fmtMinRep(Math.min(dd.min, tope));
    }
    /* nunca el tiempo de pared desde el primer toque: tiempo neto entre acciones, acotado a lo programado del dia */
    if(tN && tN.min > 0) return (tN.estimado ? '~' : '') + fmtMinRep(tN.min);
    return '~' + Math.min(tope, Math.max(20, Object.keys(usadas).length * 3)) + ' min';
  }
  function reporteTexto(){
    var day = (typeof getCurrentDay === 'function') ? getCurrentDay() : null; if(!day) return '';
    var week = state.currentWeek, esSports = window.COACH_DISCIPLINA === 'sports';
    var tituloDia = day.title || day.label || '';
    if(!tituloDia){ var dt = q('.day-view.active .day-title'); tituloDia = dt ? dt.textContent.trim() : ''; }
    usadas = {};
    var L = ['⚡ REPORTE DE SESIÓN // COACH JP',
      '👤 Atleta: ' + ((typeof PROGRAM_CONFIG !== 'undefined' && PROGRAM_CONFIG.athleteName) || ''),
      '📅 ' + (day.short || 'Día') + (tituloDia ? ' - ' + tituloDia : ''),
      LINEA, '🏋️ REGISTRO DE TRABAJO EFECTIVO:'];
    if(esSports){
      var rs = { vol: 0, series: 0 };
      try{ if(window.CoachTV && typeof window.CoachTV.resumen === 'function') rs = window.CoachTV.resumen(week, day) || rs; }catch(e){}
      var sem = (typeof WEEKS_META !== 'undefined' && WEEKS_META[week] && WEEKS_META[week].short) ? ' · ' + WEEKS_META[week].short : '';
      L = ['⚡ REPORTE DE SESIÓN // COACH JP',
        '👤 ' + ((typeof PROGRAM_CONFIG !== 'undefined' && PROGRAM_CONFIG.athleteName) || ''),
        '📅 ' + (day.short || 'Día') + sem + (tituloDia ? ' — ' + tituloDia : ''),
        LINEA, '📊 MÉTRICAS CLAVE',
        '• Tonelaje total: ' + Math.round(Number(rs.vol) || 0).toLocaleString('es-AR') + ' kg',
        '• Series totales: ' + (parseInt(rs.series, 10) || 0),
        '• Tiempo real: ' + duracion(),
        LINEA, '🏋️ REGISTRO DE TRABAJO'];
    }
    var n0 = L.length;
    (day.blocks || []).forEach(function(block){
      var ls = [];
      if(Array.isArray(block.items)){
        ls = esSports ? (block.sportsPizarra ? bloqueSportsLimpio(block, week, day) : []) : bloqueCF(block, week, day);
      }
      ls = ls.concat(bloqueGenerico(block, week, day));
      ls.forEach(function(l){ L.push(l); });
    });
    if(L.length === n0) L.push('(Sin series con carga registrada)');
    L.push(LINEA);
    /* notas: la general del dia + las de cada bloque / ejercicio */
    var notas = [], gen = ((state.notes && state.notes[week + '|' + day.id + '|__sesion']) || '').trim();
    var vivo = document.getElementById('scNotes'); if(vivo && vivo.value.trim()) gen = vivo.value.trim();
    if(gen) notas.push(gen);
    var prefN = week + '|' + day.id + '|';
    Object.keys(state.notes || {}).forEach(function(k){
      if(k.indexOf(prefN) !== 0) return;
      var resto = k.slice(prefN.length); if(resto === '__sesion') return;
      var v = String(state.notes[k] || '').trim(); if(!v) return;
      var bid = resto.split('|')[0], bl = (day.blocks || []).filter(function(x){ return x.id === bid; })[0];
      notas.push((bl && (bl.title || bl.exerciseName) ? (bl.title || bl.exerciseName) + ': ' : '') + v);
    });
    if(notas.length) L.push('📝 Feedback / Notas: "' + notas.join(' | ').replace(/\s*\n\s*/g, ' ') + '"');
    if(!esSports) L.push('⏱ Tiempo total de sesión: ' + duracion());
    try{
      var rpeSes = (typeof checkoutRpeLeer === 'function') ? checkoutRpeLeer()[week + '|' + day.id + '|__sesion'] : null;
      L.push('🎯 RPE de la sesión: ' + (rpeSes ? rpeSes + '/10' : 'sin informar'));
    }catch(eRpe){}
    return L.join('\n');
  }
  window.jpReporteSesionTexto = reporteTexto;
  window.jpEnviarReporteSesion = function(){
    var txt = reporteTexto(); if(!txt) return;
    var tel = String(window.COACH_WHATSAPP_PHONE || (typeof PROGRAM_CONFIG !== 'undefined' && PROGRAM_CONFIG.coachPhone) || '').replace(/\D/g, '');
    try{ if('vibrate' in navigator) navigator.vibrate(20); }catch(e){}
    window.open('https://wa.me/' + tel + '?text=' + encodeURIComponent(txt), '_blank', 'noopener');
  };
  window.CoachReporteSesionWA = window.jpEnviarReporteSesion;
})();

