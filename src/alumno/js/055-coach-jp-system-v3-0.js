/* =========================================================
   COACH JP · SYSTEM v3.0 — CAPA DE ORQUESTACIÓN
   3 · delegación global de video
   2 · jerarquía del bloque + acordeón metodológico único
   4 · saneo del parser de pizarras
========================================================= */
(function(){
  'use strict';

  /* ---------------------------------------------------------
     3 · DELEGACIÓN GLOBAL DE EVENTOS DE VIDEO
     Un único listener en document: sobrevive a cualquier
     repintado y nunca recarga la página ni pierde el progreso.
  --------------------------------------------------------- */
  document.addEventListener('click', function(e){
    var a = e.target.closest ? e.target.closest('.video-link, [data-yt]') : null;
    if(!a) return;
    var id = a.dataset ? (a.dataset.yt || a.getAttribute('data-yt')) : null;
    if(!id) return;
    e.preventDefault();
    e.stopPropagation();
    try{ if(typeof openVideoPopup === 'function') openVideoPopup(id, { loop: a.hasAttribute && a.hasAttribute('data-loop') }); }catch(err){ console.warn('video', err); }
  }, true);

  function esc(s){
    return String(s == null ? '' : s)
      .replace(/[\\u{1F000}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{FE0F}]/gu, '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\\s{2,}/g,' ').trim();
  }
  function bloqueDe(id){
    var d = (typeof getCurrentDay === 'function') ? getCurrentDay() : null;
    if(!d || !id) return null;
    var todos = (d.blocks || []).concat(d.finisher ? [d.finisher] : [], d.hyrox ? [d.hyrox] : []);
    return todos.filter(function(b){ return b.id === id; })[0] || null;
  }

  /* ---------------------------------------------------------
     2.2 · CERO REDUNDANCIA EN BISET / TRISET (histórico)
     Pedido original: la lista teórica superior queda oculta y el
     botón de video viaja con el nombre de cada estación dentro de
     la ronda. 08/09: se invirtió el enfoque -- ahora el roster
     (.bs-ex) es el que queda VISIBLE arriba (única cabecera, con su
     propio video), y la ronda ya no repite ni nombre ni video
     (unificar() dejó de crear .bs-nm dentro de .bs-fila). Esta
     función queda inerte a propósito (no encuentra .bs-nm, no hace
     nada) en vez de borrarse, por si se necesita revertir. */
  function videosEnEstaciones(){
    document.querySelectorAll('.block .bs-r .bs-fila').forEach(function(f){
      var nm = f.querySelector('.bs-nm');
      if(!nm || nm.querySelector('.video-link')) return;
      var html = (typeof videoLinkHtml === 'function') ? videoLinkHtml(nm.textContent.trim()) : '';
      if(html) nm.insertAdjacentHTML('beforeend', html);
    });
  }

  /* ---------------------------------------------------------
     2.4 · ACORDEÓN METODOLÓGICO ÚNICO
     Objetivo + coaching tips de todos los ejercicios +
     alternativa, en un solo desplegable de un toque.
  --------------------------------------------------------- */
  function textoDe(el){ return el ? el.textContent.replace(/\\s+/g,' ').trim() : ''; }

  function metodologia(){
    document.querySelectorAll('.block').forEach(function(bl){
      if(document.body.classList.contains('cf-modo')) return;
      var cuerpo = bl.querySelector('.block-body');
      if(!cuerpo) return;
      /* directiva ("Unificación de tips/videos"): tercera fuente de la
         misma duplicación -- este acordeón ("Pautas Técnicas, Tips y
         Objetivo") lee los MISMOS b.objective/b.tips que ya muestra el
         acordeón propio de la Pizarra (.jp-sb-board), ver comentario
         gemelo en pintarCriterios() más arriba en el archivo. */
      if(cuerpo.querySelector('.jp-sb-board')){
        var viejaMeto = cuerpo.querySelector('.block-methodology-accordion');
        if(viejaMeto) viejaMeto.remove();
        return;
      }
      var b = bloqueDe(bl.dataset.blockId) || {};

      /* --- objetivo --- */
      var objetivo = b.objective || '';
      if(!objetivo){
        var ins = cuerpo.querySelector(':scope > .block-insights .insight-text');
        objetivo = textoDe(ins);
      }
      /* --- estrategia / coach note --- */
      var notas = [];
      var alternativa = b.altNote || '';
      [].slice.call(cuerpo.querySelectorAll(':scope > .coach-note')).forEach(function(n){
        var t = textoDe(n).replace(/^(Coach Note|Alternativa|Aviso|Atenci[oó]n)\\s*/i, '');
        if(!t) return;
        if(n.classList.contains('note-safe')){ if(!alternativa) alternativa = t; }
        else notas.push(t);
      });
      if(b.tips && notas.indexOf(b.tips) < 0) notas.unshift(String(b.tips));

      /* --- coaching tips por ejercicio --- */
      var tips = [];
      if(b.isSuperset || b.isFinisher){
        (b.exercises || []).forEach(function(x){
          if(x && x.tip) tips.push({ n: x.name || '', t: x.tip });
        });
      } else if(b.isBlock && b.exTip){
        tips.push({ n: b.exerciseName || '', t: b.exTip });
      }

      if(!objetivo && !tips.length && !notas.length && !alternativa){
        /* búsqueda en todo el subárbol (no sólo hijos directos): el
           rediseño F puede haber movido esta tarjeta dentro de su propio
           drawer de "Notas, RIR y criterio" -- igual hay que encontrarla
           para sacarla si ya no tiene nada que mostrar. */
        var vieja = cuerpo.querySelector('.block-methodology-accordion');
        if(vieja) vieja.remove();
        return;
      }

      var html =
        '<summary class="methodology-summary">[ 💡 Pautas Técnicas, Tips y Objetivo ]</summary>' +
        '<div class="m-body">' +
          (objetivo ? '<div class="m-sec"><h6>🎯 Objetivo</h6><p>' + esc(objetivo) + '</p></div>' : '') +
          (notas.length ? '<div class="m-sec"><h6>🧭 Estrategia del bloque</h6><p>' +
              notas.map(esc).join(' ') + '</p></div>' : '') +
          (tips.length ? '<div class="m-sec"><h6>💡 Coaching tips</h6><ul class="m-tips">' +
              tips.map(function(x){
                return '<li>' + (x.n ? '<b>' + esc(x.n) + '</b>' : '') + esc(x.t) + '</li>';
              }).join('') + '</ul></div>' : '') +
          (alternativa ? '<div class="m-sec alt"><h6>⇄ Alternativa</h6><p>' + esc(alternativa) + '</p></div>' : '') +
        '</div>';

      /* búsqueda en todo el subárbol: si el rediseño F ya movió esta
         tarjeta a su propio drawer, hay que reusarla ahí -- buscar sólo
         entre hijos directos la daba por inexistente y creaba una nueva
         en cada repintado, duplicándola sin fin. */
      var caja = cuerpo.querySelector('.block-methodology-accordion');
      if(!caja){
        caja = document.createElement('details');
        caja.className = 'block-methodology-accordion';
      }
      if(caja.dataset.h !== html){ caja.innerHTML = html; caja.dataset.h = html; }
      /* siempre al pie, justo antes de las notas del alumno -- mientras
         la tarjeta sea nueva (sin padre todavía) o siga siendo hija
         directa de .block-body. Una vez que el drawer de "Notas, RIR y
         criterio" la adopta (su padre pasa a ser .wf-sheet-body), ese
         drawer es el dueño de su posición: no se reposiciona más acá
         (evita un insertBefore inválido contra un nodo que ya no es
         hijo directo de cuerpo). */
      if(!caja.parentNode || caja.parentNode === cuerpo){
        var notasEl = cuerpo.querySelector(':scope > .block-notes');
        if(notasEl){ if(caja.nextElementSibling !== notasEl) cuerpo.insertBefore(caja, notasEl); }
        else if(cuerpo.lastElementChild !== caja) cuerpo.appendChild(caja);
      }

      /* lo que ya vive adentro del acordeón no se repite suelto */
      var obsoletos = cuerpo.querySelectorAll(':scope > .block-insights, :scope > .coach-note');
      [].slice.call(obsoletos).forEach(function(x){ x.remove(); });
      bl.querySelectorAll('.ex-tip').forEach(function(x){ x.remove(); });
    });
  }

  /* ---------------------------------------------------------
     2.6 · TÉCNICAS DE INTENSIDAD INTERACTIVAS
     Drop Set (cascada de descargas) / Rest-Pause & Myo-Reps (activación +
     micro-series con pausa corta) / Top Set + Back-off (sugerencia de
     kg en vivo) / Densidad ON-OFF (intervalos manuales, reutiliza el
     mismo HUD de descanso que ya usa toda la app). Lee block.metodologia
     + block.tecParam (o ex.metodologia/ex.tecParam por estación en
     biset/triset) -- campos opcionales y aditivos, sin valor asignado no
     agrega nada al DOM: planes viejos quedan exactamente igual.
  --------------------------------------------------------- */
  function parseTecParam(met, raw){
    var s = String(raw == null ? '' : raw).trim();
    if(!s) return null;
    if(met === 'dropset'){
      var arr = s.split(/[,;]/).map(function(x){ return parseFloat(String(x).trim().replace(',', '.')); })
        .filter(function(x){ return !isNaN(x) && x > 0; });
      return arr.length ? arr : null;
    }
    if(met === 'restpause' || met === 'myoreps'){
      var m = s.match(/^([\\d+]+)/);
      if(!m) return null;
      var reps = m[1].split('+').map(function(x){ return parseInt(x, 10); }).filter(function(x){ return x > 0; });
      var pm = s.match(/(\\d+)\\s*s(?:eg)?\\.?\\s*$/i);
      var pausa = pm ? parseInt(pm[1], 10) : 15;
      return reps.length ? { reps: reps, pausa: pausa } : null;
    }
    if(met === 'topset'){
      var arrb = s.split(/[,;]/).map(function(x){ return parseFloat(String(x).trim().replace(',', '.')); })
        .filter(function(x){ return !isNaN(x) && x > 0; });
      return arrb.length ? arrb : null;
    }
    if(met === 'intervalo'){
      var nums = s.match(/\\d+/g);
      if(!nums || nums.length < 3) return null;
      return { work: parseInt(nums[0], 10), rest: parseInt(nums[1], 10), sets: parseInt(nums[2], 10) };
    }
    return null;
  }
  function tecExtraHtml(met, param, keyBase){
    if(met === 'dropset'){
      if(!param || !param.length) return '';
      var chips = param.map(function(kg, i){
        var dk = keyBase + '|drop' + i;
        var done = !!(state.loads[dk] && state.loads[dk].done);
        return '<label class="tec-drop-chip' + (done ? ' done' : '') + '"><input type="checkbox" class="tec-drop-check" data-dk="' + dk + '"' + (done ? ' checked' : '') + '><span class="tec-drop-kg">' + kg + '<small>kg</small></span></label>';
      }).join('<span class="tec-drop-arrow">&#10132;</span>');
      return '<div class="tec-extra tec-dropset"><div class="tec-extra-lb">&#128293; Drop Set &mdash; bajada al fallo</div><div class="tec-drop-row">' + chips + '</div></div>';
    }
    if(met === 'restpause' || met === 'myoreps'){
      if(!param) return '';
      var lb = met === 'myoreps' ? '&#128257; Myo-Reps' : '&#9889; Rest-Pause';
      var html = '<div class="tec-extra tec-restpause"><div class="tec-extra-lb">' + lb + ' &mdash; pausas de ' + param.pausa + 's</div><div class="tec-rp-row">';
      html += param.reps.map(function(r, i){
        var rk = keyBase + '|rp' + i;
        var done = !!(state.loads[rk] && state.loads[rk].done);
        var chip = '<label class="tec-rp-chip' + (done ? ' done' : '') + '"><input type="checkbox" class="tec-rp-check" data-rk="' + rk + '"' + (done ? ' checked' : '') + '><span>' + (i === 0 ? 'Activaci&oacute;n ' : '+') + r + '</span></label>';
        var pausaBtn = (i < param.reps.length - 1) ? '<button type="button" class="tec-rp-pause" data-pausa="' + param.pausa + '" data-lb="Rest-Pause &middot; Pausa ' + param.pausa + 's">&#9201; ' + param.pausa + 's</button>' : '';
        return chip + pausaBtn;
      }).join('');
      html += '</div></div>';
      return html;
    }
    if(met === 'topset'){
      if(!param || !param.length) return '';
      var pctTxt = param.map(function(x){ return '-' + x + '%'; }).join(' &middot; ');
      return '<div class="tec-extra tec-topset" data-pct="' + param.join(',') + '"><div class="tec-extra-lb">&#127942; Top Set + Back-off (' + pctTxt + ')</div>' +
        '<div class="tec-topset-hint">Carg&aacute; el peso de la Serie 1 (Top Set) &mdash; las siguientes muestran el back-off sugerido.</div>' +
        '<div class="tec-topset-chips"></div></div>';
    }
    if(met === 'intervalo'){
      if(!param || !param.sets) return '';
      var html2 = '<div class="tec-extra tec-interval"><div class="tec-extra-lb">&#9201; Densidad &mdash; ' + param.work + 's ON / ' + param.rest + 's OFF &times; ' + param.sets + '</div><div class="tec-int-row">';
      for(var i = 1; i <= param.sets; i++){
        html2 += '<button type="button" class="tec-int-btn on" data-sec="' + param.work + '" data-lb="ON &middot; Ronda ' + i + '/' + param.sets + '">&#9654; ON ' + i + '</button>';
        if(param.rest > 0) html2 += '<button type="button" class="tec-int-btn off" data-sec="' + param.rest + '" data-lb="OFF &middot; Ronda ' + i + '/' + param.sets + '">OFF ' + i + '</button>';
      }
      html2 += '</div></div>';
      return html2;
    }
    return '';
  }
  function tecnicaExtra(){
    document.querySelectorAll('.block').forEach(function(bl){
      if(document.body.classList.contains('cf-modo')) return;
      var cuerpo = bl.querySelector('.block-body');
      if(!cuerpo) return;
      var b = bloqueDe(bl.dataset.blockId) || {};
      var trackers = cuerpo.querySelectorAll(':scope > .set-tracker');
      var contextos = [];
      if(b.isBlock){
        contextos = [{ met: b.metodologia, param: b.tecParam, exIdx: 0 }];
      } else if(b.isSuperset){
        contextos = (b.exercises || []).map(function(ex, i){ return { met: ex.metodologia, param: ex.tecParam, exIdx: i }; });
      }
      contextos.forEach(function(ctx, i){
        var tracker = trackers[i];
        if(!tracker) return;
        var existente = tracker.nextElementSibling;
        var esNuestro = existente && existente.classList && existente.classList.contains('tec-extra');
        var keyBase = (state.currentWeek || 0) + '|' + state.currentDay + '|' + bl.dataset.blockId + '|' + ctx.exIdx;
        var html = ctx.met ? tecExtraHtml(ctx.met, parseTecParam(ctx.met, ctx.param), keyBase) : '';
        if(!html){ if(esNuestro) existente.remove(); return; }
        if(esNuestro){
          if(existente.dataset.h !== html){ existente.outerHTML = html; }
        } else {
          tracker.insertAdjacentHTML('afterend', html);
        }
      });
    });
  }
  /* delegación única (no depende del repintado): checkboxes de Drop Set/
     Rest-Pause persisten en state.loads (mismo store que .set-check, con
     sufijo propio para no pisar ninguna serie real) y los botones de
     pausa/intervalo reusan el HUD de descanso ya probado en toda la app
     (window.CoachTV.rest), sin ningún motor de timer nuevo. */
  document.addEventListener('change', function(e){
    var chk = e.target.closest('.tec-drop-check, .tec-rp-check');
    if(!chk) return;
    var key = chk.dataset.dk || chk.dataset.rk;
    if(!key) return;
    state.loads[key] = state.loads[key] || {};
    state.loads[key].done = chk.checked;
    if(typeof saveProgress === 'function') saveProgress();
    var chip = chk.closest('label');
    if(chip) chip.classList.toggle('done', chk.checked);
  });
  document.addEventListener('click', function(e){
    var btn = e.target.closest('.tec-rp-pause, .tec-int-btn');
    if(!btn) return;
    var sec = parseInt(btn.dataset.pausa || btn.dataset.sec, 10);
    if(!(sec > 0)) return;
    var lb = btn.dataset.lb || 'Pausa';
    if(window.CoachTV && typeof window.CoachTV.rest === 'function') window.CoachTV.rest(sec, lb);
  });
  document.addEventListener('input', function(e){
    var top = e.target.closest('.set-kg');
    if(!top) return;
    var tracker = top.closest('.set-tracker');
    if(!tracker) return;
    var extra = tracker.nextElementSibling;
    if(!extra || !extra.classList || !extra.classList.contains('tec-topset')) return;
    var filas = [].slice.call(tracker.querySelectorAll('.set-row'));
    if(filas[0] !== top.closest('.set-row')) return; // sólo la Serie 1 (Top Set) dispara la sugerencia
    var pct = (extra.dataset.pct || '').split(',').map(Number).filter(function(x){ return !isNaN(x); });
    var chipsWrap = extra.querySelector('.tec-topset-chips');
    if(!chipsWrap) return;
    var topKg = parseFloat(top.value);
    if(!(topKg > 0)){ chipsWrap.innerHTML = ''; return; }
    chipsWrap.innerHTML = pct.map(function(p, i){
      var sug = Math.round(topKg * (1 - p / 100) * 2) / 2;
      return '<button type="button" class="tec-backoff-chip" data-i="' + i + '" data-kg="' + sug + '">Back-off ' + (i + 1) + ': <b>' + sug + ' kg</b> (-' + p + '%)</button>';
    }).join('');
  });
  document.addEventListener('click', function(e){
    var chip = e.target.closest('.tec-backoff-chip');
    if(!chip) return;
    var extra = chip.closest('.tec-topset');
    var tracker = extra && extra.previousElementSibling;
    if(!tracker || !tracker.classList.contains('set-tracker')) return;
    var i = parseInt(chip.dataset.i, 10);
    var filas = tracker.querySelectorAll('.set-row');
    var row = filas[i + 1];
    if(!row) return;
    var kgIn = row.querySelector('.set-kg');
    if(kgIn){
      kgIn.value = chip.dataset.kg;
      kgIn.dispatchEvent(new Event('input', { bubbles: true }));
      kgIn.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  /* ---------------------------------------------------------
     2.5 · NOTAS DEL ALUMNO: UNA FILA QUE CRECE AL ESCRIBIR
  --------------------------------------------------------- */
  function crecer(t){
    if(!t) return;
    t.style.height = 'auto';
    /* vacía = una sola fila; con texto crece hasta un tope legible */
    var min = parseFloat(getComputedStyle(t).minHeight) || 38;
    var h = t.value ? t.scrollHeight : 0;
    t.style.height = Math.max(min, Math.min(320, h)) + 'px';
  }
  function notas(){
    document.querySelectorAll('.block-note-input, .block-notes textarea').forEach(function(t){
      if(t.dataset.grow) { crecer(t); return; }
      t.dataset.grow = '1';
      t.setAttribute('rows', '1');
      crecer(t);
      t.addEventListener('input', function(){ crecer(t); });
      t.addEventListener('focus', function(){ crecer(t); });
    });
  }

  /* ---------------------------------------------------------
     4 · PARSER DE PIZARRAS: SIN DOBLE NUMERACIÓN NI HUÉRFANOS
  --------------------------------------------------------- */
  var RX_NUM = /^\\s*\\d{1,2}\\s*[.)\\-–·]\\s+/;
  function sanearNumeracion(){
    document.querySelectorAll('.cf-line, .wb-line').forEach(function(l){
      var span = l.querySelector('span:not(.n)');
      if(!span) return;
      /* el número lo pone la pizarra: el texto no repite el suyo */
      /* v3.3 · la app ya no numera sola: lo que el coach escribió se
         respeta tal cual, incluida su propia numeración */
      var det = l.querySelector('.det');
      if(det && det.dataset.jpNum) det.textContent = det.dataset.jpNum;
    });

  }
  function purgarHuerfanos(){
    document.querySelectorAll('.block').forEach(function(bl){
      var board = bl.querySelector('.wod-board, .cf-board');
      if(!board) return;
      if(bl.classList.contains('core-live') || bl.classList.contains('bs-uni')) return;
      /* debajo de un WOD, EMOM o intervalos no van casilleros de musculación */
      bl.querySelectorAll('.block-body > .set-tracker, .block-body > .mini-log, .block-body > .core-list')
        .forEach(function(x){
          if(board.contains(x)) return;
          if(!x.querySelector('.set-input[value]:not([value=""])')) x.remove();
        });
      bl.querySelectorAll('.block-body > .ex-row').forEach(function(r){
        if(board.contains(r)) return;
        if(!r.querySelector('.set-check')) r.remove();
      });
    });
  }

  /* ---------------------------------------------------------
     ORQUESTACIÓN
  --------------------------------------------------------- */
  function repintar(){
    try{ videosEnEstaciones(); }catch(e){ console.warn('v3·video', e); }
    try{ sanearNumeracion(); }catch(e){ console.warn('v3·pizarra', e); }
    try{ purgarHuerfanos(); }catch(e){ console.warn('v3·huerfanos', e); }
    try{ metodologia(); }catch(e){ console.warn('v3·metodologia', e); }
    try{ tecnicaExtra(); }catch(e){ console.warn('v3·tecnicaExtra', e); }
    try{ notas(); }catch(e){ console.warn('v3·notas', e); }
  }
  function mount(){
    repintar();
    var main = document.getElementById('mainContent') || document.body;
    var pend = false, propio = false;
    window.CoachRepaintBus.register(function(){
      if(pend || propio) return;
      pend = true;
      setTimeout(function(){
        pend = false; propio = true;
        try{ repintar(); }catch(e){}
        setTimeout(function(){ propio = false; }, 240);
      }, 220);
    }, main);
    if(typeof window.renderMain === 'function'){
      var _rm = window.renderMain;
      window.renderMain = function(){
        var r = _rm.apply(this, arguments);
        [420, 980, 1600].forEach(function(ms){ setTimeout(repintar, ms); });
        return r;
      };
    }
    [700, 1500, 2600].forEach(function(ms){ setTimeout(repintar, ms); });
    window.CoachV3 = { repintar: repintar, metodologia: metodologia, saneo: sanearNumeracion };
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(mount, 700); });
  else setTimeout(mount, 700);
})();
