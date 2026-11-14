/* =========================================================
   COACH JP v3.6 · lo que el alumno necesita mientras entrena
========================================================= */
(function(){
  'use strict';

  /* ---------------------------------------------------------
     1 · HISTORIAL DE LA SERIE
     La carga que ya levantaste vuelve a la pantalla en el
     momento exacto en que tenés que decidir la de hoy.
  --------------------------------------------------------- */
  function partirClave(k){
    var p = String(k || '').split('|');
    if(p.length < 5) return null;
    return { w: parseInt(p[0], 10), dia: p[1], bloque: p[2], ex: p[3], set: p[4] };
  }
  function previa(key){
    var c = partirClave(key);
    if(!c || isNaN(c.w)) return null;
    /* se busca la misma serie del mismo ejercicio en semanas anteriores */
    for(var w = c.w - 1; w >= 0; w--){
      var l = state.loads[w + '|' + c.dia + '|' + c.bloque + '|' + c.ex + '|' + c.set];
      if(l && l.done && (l.kg != null || l.reps != null)) return { l: l, w: w };
    }
    return null;
  }
  function cuando(ts){
    if(!ts) return '';
    var d = Math.floor((Date.now() - ts) / 86400000);
    if(d <= 0) return 'hoy';
    if(d === 1) return 'ayer';
    if(d < 21) return 'hace ' + d + ' días';
    return 'hace ' + Math.round(d / 7) + ' semanas';
  }
  function fmtN(v){
    var n = parseFloat(v);
    if(isNaN(n)) return '';
    return (Math.round(n * 10) / 10).toString().replace('.', ',');
  }
  function historial(scope){
    var root = (scope && typeof scope.querySelectorAll === 'function') ? scope : document;
    root.querySelectorAll('.set-row[data-set-key]').forEach(function(row){
      var key = row.dataset.setKey;
      var p = previa(key);
      var vieja = row.querySelector('.jp-hist');
      if(!p){ if(vieja) vieja.remove(); return; }
      var kg = fmtN(p.l.kg), rp = p.l.reps;
      if(!kg && !rp){ if(vieja) vieja.remove(); return; }
      var actual = state.loads[key] || {};
      var dif = '';
      var a = parseFloat(actual.kg), b = parseFloat(p.l.kg);
      if(!isNaN(a) && !isNaN(b) && b > 0){
        var d = Math.round((a - b) * 10) / 10;
        if(d > 0) dif = ' <span class="up">+' + fmtN(d) + ' kg</span>';
        else if(d < 0) dif = ' <span class="dn">' + fmtN(d) + ' kg</span>';
      }
      var t = cuando(p.l.ts);
      var html = 'Última sem: <b>' + (kg ? kg + ' kg' : '—') + (rp ? ' × ' + rp + ' reps' : '') + '</b>' +
                 (t ? ' · ' + t : ' · semana ' + (p.w + 1)) + dif;
      if(!vieja){
        vieja = document.createElement('span');
        vieja.className = 'jp-hist';
        row.insertBefore(vieja, row.firstChild);
      }
      if(vieja.innerHTML !== html) vieja.innerHTML = html;
    });
  }

  /* ---------------------------------------------------------
     2 · LA CARGA SUGERIDA ENTRA EN EL CAMPO
     Si el bloque declara un porcentaje y hay 1RM cargado,
     el kilaje aparece como sugerencia dentro del input.
  --------------------------------------------------------- */
  /* varios módulos calculan la misma carga: en pantalla queda una sola caja */
  function unaSolaSugerencia(){
    document.querySelectorAll('.block').forEach(function(bl){
      var cajas = [].slice.call(bl.querySelectorAll('.rm-sug, .load-suggest'));
      var conKg = cajas.filter(function(c){ return /\d\s*(kg|%)/i.test(c.textContent || ''); });
      if(conKg.length < 2) return;
      /* prioridad fija: la carga precomputada de la semana gana sobre cualquier
         rango genérico. Así el resultado no depende de quién pintó primero. */
      var mejor = conKg.filter(function(c){ return c.classList.contains('pre-sug'); })[0] ||
                  conKg.filter(function(c){ return c.classList.contains('rm-sug'); })[0] ||
                  conKg[0];
      conKg.forEach(function(c){ if(c !== mejor && c.parentNode) c.remove(); });
    });
  }
  function numDe(txt){
    var m = String(txt || '').replace(',', '.').match(/(\d+(?:\.\d+)?)\s*kg/i);
    return m ? parseFloat(m[1]) : 0;
  }
  function sugerirEnCampo(){
    document.querySelectorAll('.block').forEach(function(bl){
      var campos = [].slice.call(bl.querySelectorAll('.set-input.set-kg'));
      if(!campos.length) return;
      var caja = bl.querySelector('.rm-sug b') || bl.querySelector('.load-suggest b');
      /* la sugerencia de la semana (si otro módulo ya la calculó) manda sobre el %1RM crudo */
      var desdeCampo = 0;
      campos.forEach(function(i){ desdeCampo = desdeCampo || numDe(i.placeholder); });
      var kg = desdeCampo || numDe(caja && caja.textContent);
      if(!(kg > 0)) return;
      kg = Math.round(kg * 2) / 2;
      var txt = String(kg).replace('.', ',') + ' kg';
      campos.forEach(function(i){
        if(i.value){ i.classList.remove('jp-sug'); if(i.placeholder !== 'Kg') i.placeholder = 'Kg'; return; }
        i.classList.add('jp-sug');
        if(i.placeholder !== txt) i.placeholder = txt;
      });
      /* la caja explicativa muestra el mismo número que el campo: nunca dos cifras distintas */
      if(caja && desdeCampo){
        var actual = numDe(caja.textContent);
        if(actual && Math.abs(actual - kg) > 0.4){
          caja.textContent = caja.textContent.replace(/(\d+(?:[.,]\d+)?)\s*kg/i, String(kg).replace('.', ',') + ' kg');
        }
      }
    });
  }

  /* ---------------------------------------------------------
     2b · PROGRESIÓN SIN 1RM CARGADO
     Si el ejercicio no tiene marca/1RM registrado, no hay de dónde
     sacar un % — pero si el alumno ya cargó esa misma serie en una
     semana anterior, se sugiere la progresión sobre esa carga real
     en vez de dejar el campo en blanco sin ninguna referencia.
  --------------------------------------------------------- */
  /* el módulo "4 · CARGA PRECOMPUTADA EN CADA SERIE" vive en su propia IIFE
     (otro <script> más arriba) y no expone kgSemana/bloqueDe hacia afuera —
     se replica acá el mismo cálculo, liviano, para saber si ese módulo ya
     va a cubrir el bloque con una sugerencia por %1RM antes de pisarla. */
  function bloqueActivoLocal(blockId){
    var d = (typeof DAYS !== 'undefined' ? DAYS : []).find(function(x){ return x.id === state.currentDay; });
    if(!d) return null;
    return (d.blocks || []).find(function(b){ return b.id === blockId; }) || null;
  }
  function kgSemanaLocal(block, w){
    if(!block) return 0;
    if(block.weekKg && block.weekKg[w] != null) return parseFloat(block.weekKg[w]) || 0;
    var base = parseFloat(block.baseLoad);
    if(!(base > 0)) return 0;
    var pct = (block.weekPct && block.weekPct[w] != null && block.weekPct[w] !== '')
      ? parseFloat(block.weekPct[w]) : [70, 78, 85, 60, 75, 60][w];
    if(!(pct > 0)) return 0;
    return Math.round(base * pct / 100 * 2) / 2;
  }
  function progresionSinMarca(){
    document.querySelectorAll('.set-row[data-set-key]').forEach(function(row){
      var kgInput = row.querySelector('.set-kg');
      if(!kgInput) return;
      if(kgInput.value) return;                                   /* el alumno ya tiene su propio número */
      var blEl = row.closest('.block');
      var blk = blEl ? bloqueActivoLocal(blEl.dataset.blockId) : null;
      /* si el bloque tiene 1RM/carga base cargada, esa sugerencia manda: no se pisa */
      if(kgSemanaLocal(blk, state.currentWeek) > 0) return;
      var key = row.dataset.setKey;
      var c = partirClave(key);
      var p = previa(key);
      if(!p || p.l.kg == null || p.l.kg === '') return;
      var base = parseFloat(p.l.kg);
      if(isNaN(base) || base <= 0) return;
      var deload = false;
      try{ deload = !!(typeof WEEKS_META !== 'undefined' && c && WEEKS_META[c.w] && WEEKS_META[c.w].deload); }catch(e){}
      var sugerido = deload ? Math.round(base * 0.85 * 2) / 2 : Math.round((base + 2.5) * 2) / 2;
      var txt = String(sugerido).replace('.', ',') + ' kg';
      if(kgInput.placeholder !== txt){ kgInput.classList.add('jp-sug'); kgInput.placeholder = txt; kgInput.title = 'Progresión sobre tu última carga registrada (' + fmtN(base) + ' kg)'; }
    });
  }

  /* ---------------------------------------------------------
     3 · EL BLOQUE TERMINADO SE PLIEGA SOLO
     A medida que el alumno cierra bloques, la pantalla se
     acorta y lo que falta queda siempre arriba.
     FIX (pedido 38): "terminado" dejó de inferirse de tener todas las
     .set-check tildadas — tildar la última serie de un bloque NO debe
     plegarlo. El pliegue (display:none sobre .block-body, ver CSS
     .block.jp-hecho) ahora depende EXCLUSIVAMENTE de la casilla
     explícita del header (.block-done-cb), la misma que el alumno
     tilda a mano para marcar "bloque hecho".
  --------------------------------------------------------- */
  function datosBloque(bl){
    var filas = [].slice.call(bl.querySelectorAll('.set-row[data-set-key]'));
    var series = 0, vol = 0, reps = 0;
    filas.forEach(function(r){
      var l = state.loads[r.dataset.setKey] || {};
      if(!l.done) return;
      series++;
      var kg = parseFloat(l.kg) || 0, rp = parseInt(l.reps, 10) || 0;
      reps += rp; vol += kg * rp;
    });
    return { series: series, reps: reps, vol: Math.round(vol) };
  }
  function terminado(bl){
    var cb = bl.querySelector('.block-done-cb');
    return !!(cb && cb.checked);
  }
  function cierre(bl){
    var c = bl.querySelector('.jp-cierre');
    if(!c){
      c = document.createElement('div');
      c.className = 'jp-cierre';
      c.innerHTML = '<span class="ok">✓ Bloque completo</span><span class="dat"></span>' +
                    '<button type="button" class="re">Volver a abrir</button>';
      c.querySelector('.re').addEventListener('click', function(e){
        e.preventDefault(); e.stopPropagation();
        bl.classList.remove('jp-hecho');
        bl.dataset.jpManual = '1';               /* el alumno mandó: no se vuelve a plegar solo */
      });
      bl.appendChild(c);
    }
    var d = datosBloque(bl);
    var t = d.series ? (d.series + (d.series === 1 ? ' serie' : ' series') +
            (d.reps ? ' · ' + d.reps + ' reps' : '') +
            (d.vol ? ' · ' + d.vol.toLocaleString('es-AR') + ' kg' : '')) : '';
    var el = c.querySelector('.dat');
    if(el && el.textContent !== t) el.textContent = t;
  }
  function plegar(){
    if(document.body.classList.contains('cf-modo')) return;
    document.querySelectorAll('.block').forEach(function(bl){
      var fin = terminado(bl);
      if(!fin){
        bl.classList.remove('jp-hecho');
        delete bl.dataset.jpManual;
        var c = bl.querySelector('.jp-cierre'); if(c) c.remove();
        return;
      }
      cierre(bl);
      if(bl.dataset.jpManual) return;
      if(!bl.classList.contains('jp-hecho')) bl.classList.add('jp-hecho');
    });
  }

  /* ---------------------------------------------------------
     4 · CIERRE DE SESIÓN: DURACIÓN REAL Y COMPARACIÓN
  --------------------------------------------------------- */
  function claveSesion(){
    try{ return (state.currentWeek || 0) + '|' + state.currentDay; }catch(e){ return ''; }
  }
  function marcarActividad(){
    var k = claveSesion(); if(!k) return;
    state.session = state.session || {};
    var s = state.session[k] = state.session[k] || {};
    var ahora = Date.now();
    /* GUARDIÁN DE TIEMPO (directiva crítica, Sports & Bodybuilding): s.ini
       se fija una sola vez por día/semana y nunca se resetea -- si el
       alumno tocó este día hace varios días (una serie a medias, por
       ejemplo) y recién ahora vuelve a completarlo, s.fin - s.ini medía
       el tiempo real entre esos dos toques (ej. "288 h"), no la duración
       de ESTA sesión. Si pasaron más de 4 horas desde la última
       actividad registrada acá, se considera una sesión nueva y el
       cronómetro arranca de nuevo. CrossFit no se toca: sigue exactamente
       igual que siempre. */
    if(window.COACH_DISCIPLINA === 'sports' && s.fin && (ahora - s.fin) > 4 * 60 * 60000){
      s.ini = ahora;
    }
    if(!s.ini) s.ini = ahora;
    s.fin = ahora;
    try{ saveProgress(); }catch(e){}
  }
  function duracion(){
    if(window.COACH_DISCIPLINA === 'sports' && typeof window.CoachDuracionSesion === 'function'){
      var dd = window.CoachDuracionSesion();
      var ddMin = dd ? dd.min : 0;
      try{ if(window.jpTiempoSesion) ddMin = Math.min(ddMin, window.jpTiempoSesion().tope); }catch(eT){}
      if(dd && ddMin > 0) return (dd.estimada ? '~' : '') + (ddMin < 60 ? ddMin + ' min' : Math.floor(ddMin / 60) + ' h ' + (ddMin % 60) + ' min');
    }
    /* CrossFit: tiempo neto acotado a lo programado (el cronometro s.ini/s.fin medía de la primera a la última marca del día, con horas de por medio) */
    if(window.COACH_DISCIPLINA !== 'sports' && typeof window.jpTiempoSesion === 'function'){
      var tc = window.jpTiempoSesion();
      if(tc && tc.min > 0) return (tc.estimado ? '~' : '') + (tc.min < 60 ? tc.min + ' min' : Math.floor(tc.min / 60) + ' h ' + (tc.min % 60) + ' min');
    }
    var k = claveSesion();
    var s = (state.session || {})[k];
    if(!s || !s.ini || !s.fin) return '';
    var min = Math.max(1, Math.round((s.fin - s.ini) / 60000));
    /* guardián de tiempo, segunda barrera (Sports & Bodybuilding): por
       más que marcarActividad() ya reinicie el cronómetro tras un hueco
       de 4h+, un dato viejo guardado ANTES de este fix puede seguir
       teniendo s.ini de hace días -- se sanea acá también antes de
       mostrarlo. CrossFit sigue con el cálculo de siempre. */
    if(window.COACH_DISCIPLINA === 'sports' && min > 150){
      var dia = DAYS.find(function(d){ return d.id === state.currentDay; });
      var r = (dia && window.CoachTV && typeof window.CoachTV.resumen === 'function')
        ? window.CoachTV.resumen(state.currentWeek || 0, dia) : null;
      min = (r && r.series > 0) ? Math.min(150, Math.max(20, r.series * 3)) : 60;
    }
    if(min < 60) return min + ' min';
    return Math.floor(min / 60) + ' h ' + (min % 60) + ' min';
  }
  function volumenSemana(w){
    var dia = state.currentDay, total = 0;
    Object.keys(state.loads || {}).forEach(function(k){
      var c = partirClave(k); if(!c || c.w !== w || c.dia !== dia) return;
      var l = state.loads[k];
      if(!l || !l.done) return;
      total += (parseFloat(l.kg) || 0) * (parseInt(l.reps, 10) || 0);
    });
    return Math.round(total);
  }
  function cerrarSesion(){
    var card = document.querySelector('.summary-card');
    if(!card) return;
    var stats = card.querySelector('.sc-stats');
    if(!stats) return;
    var dur = duracion();
    if(dur){
      var d = stats.querySelector('.jp-dur');
      if(!d){
        d = document.createElement('div');
        d.className = 'sc-stat jp-dur';
        stats.appendChild(d);
      }
      var spT = window.COACH_DISCIPLINA === 'sports';
      var hd = spT ? ('<div class="v" data-no-odo="1">' + dur + '</div><div class="k">tiempo</div>')
                   : ('<div class="v">' + dur.replace(/ (min|h)/, '<span style="font-size:.55em"> $1</span>') + '</div><div class="k">de entrenamiento</div>');
      if(d.innerHTML !== hd) d.innerHTML = hd;
    }
    /* comparación con la misma sesión de la semana anterior */
    var w = state.currentWeek || 0;
    if(w > 0){
      var hoy = volumenSemana(w), antes = volumenSemana(w - 1);
      if(antes > 0 && hoy > 0){
        var pct = Math.round((hoy - antes) / antes * 100);
        var c = card.querySelector('.jp-comp');
        if(!c){
          c = document.createElement('div');
          c.className = 'jp-comp';
          c.style.cssText = 'padding:10px 14px;font-size:13px;line-height:1.55;border-top:1px solid rgba(255,255,255,.06)';
          var body = card.querySelector('.sc-body');
          if(body) card.insertBefore(c, body); else card.appendChild(c);
        }
        var signo = pct > 0 ? '+' : '';
        var col = pct > 0 ? 'var(--jp-work)' : (pct < 0 ? 'var(--jp-warn)' : 'var(--jp-titanium)');
        var ht = '<span style="color:var(--jp-titanium)">Contra la misma sesión de la semana pasada:</span> ' +
                 '<b style="color:' + col + '">' + signo + pct + '% de volumen</b> ' +
                 '<span style="color:var(--jp-dim)">(' + antes.toLocaleString('es-AR') + ' → ' +
                 hoy.toLocaleString('es-AR') + ' kg)</span>';
        if(c.innerHTML !== ht) c.innerHTML = ht;
      }
    }
  }

  /* ---------------------------------------------------------
     ORQUESTACIÓN
  --------------------------------------------------------- */
  function repintar(scope){
    try{ historial(scope); }catch(e){ console.warn('v36·hist', e); }
    try{ unaSolaSugerencia(); }catch(e){ console.warn('v36·dedup', e); }
    try{ sugerirEnCampo(); }catch(e){ console.warn('v36·sug', e); }
    try{ progresionSinMarca(); }catch(e){ console.warn('v36·progresion', e); }
    try{ plegar(); }catch(e){ console.warn('v36·plegar', e); }
    try{ cerrarSesion(); }catch(e){ console.warn('v36·cierre', e); }
  }
  document.addEventListener('change', function(e){
    if(!e.target.closest) return;
    var hit = e.target.closest('.set-check, .set-input, .block-done-cb');
    if(hit){
      marcarActividad();
      var scope = hit.closest('.block');
      setTimeout(function(){ repintar(scope); }, 90);
    }
  });
  document.addEventListener('input', function(e){
    if(e.target.closest && e.target.closest('.set-input')){ marcarActividad(); }
  });
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
        setTimeout(function(){ propio = false; }, 260);
      }, 250);
    }, main);
    if(typeof window.renderMain === 'function'){
      var _rm = window.renderMain;
      window.renderMain = function(){
        var r = _rm.apply(this, arguments);
        [500, 1300, 2600].forEach(function(ms){ setTimeout(repintar, ms); });
        return r;
      };
    }
    [800, 1900, 3400].forEach(function(ms){ setTimeout(repintar, ms); });
    window.CoachSesion = { repintar: repintar, previa: previa, duracion: duracion };
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(mount, 820); });
  else setTimeout(mount, 820);
})();
