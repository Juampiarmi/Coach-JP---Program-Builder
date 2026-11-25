/* =========================================================
   COACH JP · vista del alumno v2
========================================================= */
(function(){
  function bloqueDe(id){
    var d = (typeof getCurrentDay === 'function') ? getCurrentDay() : null;
    if(!d || !id) return null;
    var todos = (d.blocks || []).concat(d.finisher ? [d.finisher] : [], d.hyrox ? [d.hyrox] : []);
    return todos.filter(function(b){ return b.id === id; })[0] || null;
  }
  function esc(s){
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  /* mismo parser de unidades que unificar(): si la prescripción ya trae
     distancia/tiempo pegado a un número ("20 metros", "30 seg"), no se le
     suma "REPS" atrás. */
  function esUnidadNoRep(s){
    if(s == null) return false;
    return /\d\s*(metros?|minutos?|min|segundos?|seg|km|m|s)\b/i.test(String(s));
  }
  var RX_WARM = /entrada en calor|warm.?up|movilidad|activaci[óo]n|cool.?down|estiramiento/i;
  var RX_CORE = /\bcore\b|abdomen|abdominal|estabilidad|anti.?rotaci[óo]n/i;

  /* Catalogo de tecnicas de intensidad (Drop Set, Rest-Pause, Isometria,
     Myo-Reps, Serie al Fallo). Campo opcional y aditivo (block.metodologia
     dentro de un bloque simple 'isBlock' -- ver mas abajo, prescripcion()).
     Sin valor asignado no se renderiza nada: planes viejos quedan igual. */
  var TECNICAS_BADGE = {
    dropset: '🔥 DROP SET',
    restpause: '⚡ REST-PAUSE',
    isometria: '⏸️ ISOMETRÍA',
    myoreps: '🔁 MYO-REPS',
    fallo: '🎯 AL FALLO',
    topset: '🏆 TOP SET + BACK-OFF',
    intervalo: '⏱ DENSIDAD ON/OFF'
  };
  function tecnicaBadgeTexto(key){
    var t = TECNICAS_BADGE[key];
    return t ? ('[ ' + t + ' ]') : '';
  }

  /* ---------------------------------------------------------
     1 · PRESCRIPCIÓN COMO BADGE PRIORITARIO
  --------------------------------------------------------- */
  function prescripcion(){
    document.querySelectorAll('.block').forEach(function(bl){
      var b = bloqueDe(bl.dataset.blockId);
      var filas = bl.querySelectorAll('.ex-row');
      filas.forEach(function(row, fi){
      var det = row.querySelector('.ex-detail');
      if(!det) return;
      var crudo = (det.textContent || '').replace(/\s+/g, ' ').trim();
      if(!crudo) return;
      var partes = [];
      /* series efectivas y de aproximación */
      var ap = crudo.match(/(\d+)\s*aprox/i);
      if(ap) partes.push({ t: ap[1] + ' series de aproximación', alt: true });
      var ef = crudo.match(/(\d+)\s*Ef\.?/i) || crudo.match(/(\d+)\s*series/i);
      if(ef) partes.push({ t: ef[1] + ' series efectivas' });
      /* repeticiones */
      var reps = crudo.replace(/.*?(?:Ef\.?|series)\s*/i, '').match(/(\d+\s*(?:-|a|–)\s*\d+|\d+)\s*(?:reps?)?/i);
      var rondas = crudo.match(/(\d+)\s*rondas?/i);
      if(rondas) partes.push({ t: rondas[1] + ' rondas totales' });
      if(reps && !/^\s*$/.test(reps[1]) && !rondas) partes.push({ t: reps[1].replace(/\s/g, '') + ' reps' });
      /* tempo y descanso */
      var tempo = crudo.match(/tempo\s*([0-9Xx]{3,4})/i);
      if(tempo) partes.push({ t: 'Tempo ' + tempo[1].toUpperCase() });
      var desc = crudo.match(/descanso\s*(\d+)\s*s/i);
      if(desc) partes.push({ t: 'Descanso ' + desc[1] + 's', alt: true });
      var fallo = /fallo/i.test(crudo);
      if(fallo) partes.push({ t: 'Última serie al fallo técnico', alt: true });
      if(!partes.length) partes.push({ t: crudo });

      var html = partes.map(function(p, i){
        return (i ? '<span class="rx-sep">·</span>' : '') +
               '<span' + (p.alt ? ' class="rx-alt"' : '') + '>' + esc(p.t) + '</span>';
      }).join('');
      var badge = row.querySelector('.rx-badge');
      if(!badge){
        badge = document.createElement('div');
        badge.className = 'rx-badge';
        row.appendChild(badge);
      }
      if(badge.innerHTML !== html) badge.innerHTML = html;
      /* técnica de intensidad: solo aplica a bloques ancla simples
         (b.isBlock) -- los bisets/trisets (b.isSuperset) se reconstruyen
         aparte en CoachV3/unificar(), que trae su propio badge por
         ejercicio, así que acá no hay nada que hacer para esos. */
      var mKey = (b && b.isBlock) ? b.metodologia : '';
      var tTxt = tecnicaBadgeTexto(mKey);
      var tBadge = row.querySelector('.jp-tecnica-badge');
      if(tTxt){
        if(!tBadge){ tBadge = document.createElement('span'); tBadge.className = 'jp-tecnica-badge'; badge.parentNode.insertBefore(tBadge, badge.nextSibling); }
        if(tBadge.textContent !== tTxt) tBadge.textContent = tTxt;
      } else if(tBadge){ tBadge.remove(); }
      /* la caja de herramientas siempre después del badge */
      var tools = row.parentNode ? row.parentNode.querySelector('.jp-tools') : null;
      if(tools && tools.previousElementSibling !== row && row.nextElementSibling !== tools){
        row.parentNode.insertBefore(tools, row.nextSibling);
      }
      });
    });
  }

  /* ---------------------------------------------------------
     2 · TAG DE ESTRUCTURA ESTANDARIZADO + VOLUMEN CONSOLIDADO
  --------------------------------------------------------- */
  var CORE_LB = { single:'EJERCICIO INDIVIDUAL', biset:'BISET', triset:'TRISET', circuito:'CIRCUITO' };
  function estructura(b, bl){
    var wi = (typeof state !== 'undefined' && state) ? (state.currentWeek || 0) : 0;
    /* el core declara su estructura una sola vez: modo, rondas y estaciones */
    if(b && b.coreBlock && (b.isSuperset || b.isBlock)){
      var cn = b.isSuperset ? ((b.exercises || []).length) : 1;
      var cm = b.coreMode || (cn >= 4 ? 'circuito' : cn === 3 ? 'triset' : cn === 2 ? 'biset' : 'single');
      var cr = parseInt(b.efSets, 10) || 3;
      return { kind:'Core', main:'<b>' + (CORE_LB[cm] || 'CIRCUITO') + '</b> · ' + cr + ' RONDA' +
                 (cr === 1 ? '' : 'S') + ' · ' + cn + ' EJERCICIO' + (cn === 1 ? '' : 'S'),
               vol: cr + ' rondas · ' + cn + ' ejercicios' };
    }
    if(b && b.isSuperset){
      var r = (b.efSets || 3);
      var n = (b.exercises || []).length;
      var tipo = n >= 4 ? 'CIRCUITO DINÁMICO' : n === 3 ? 'TRISET DINÁMICO' : 'BISET DINÁMICO';
      /* banner táctico: el alumno lee el protocolo completo del bloque de una sola vez */
      return { kind:'⚡ Protocolo',
               main:'<b>' + tipo + '</b> &bull; ' + r + ' RONDAS CONJUNTAS &bull; SIN PAUSA ENTRE EJERCICIOS',
               vol: r + ' rondas · ' + n + ' ejercicios' };
    }
    if(b && b.isBlock){
      var ef = (b.weekSets && b.weekSets[wi]) || b.efSets || 0;
      var reps = (b.weekReps && b.weekReps[wi]) || b.reps || '';
      var repsEsUnidad = esUnidadNoRep(reps);
      return { kind:'Trabajo principal', main:'<b>' + ef + ' SERIES EFECTIVAS</b>' + (reps ? ' · ' + reps + (repsEsUnidad ? '' : ' REPS') : ''),
               vol: ef + ' series' + (reps ? ' × ' + reps + (repsEsUnidad ? '' : ' reps') : '') };
    }
    if(b && b.isFinisher){
      var n = (b.exercises || []).length;
      return { kind:'Finisher', main:'<b>BLOQUE DE CIERRE</b> · ' + n + ' EJERCICIOS', vol: n + ' ejercicios' };
    }
    if(b && b.isHyrox){
      return { kind:'Engine', main:'<b>TRABAJO CONTINUO</b>', vol:'Bloque de motor' };
    }
    if(b && b.sportsPizarra && typeof window.parsearPizarraSB === 'function' && b.category !== 'warmup' && b.modalidad !== 'calentamiento' && !RX_WARM.test(((b.weekName && b.weekName[wi]) || b.title || '') + ' ' + (b.subtitle || ''))){
      try{
        var enB = window.parsearPizarraSB(itemsDeSemana(b, wi).filter(function(l){ return l != null && String(l).trim(); }), { titulo: b.title });
        if(typeof window.jpAgruparBisetPorTitulo === 'function') enB = window.jpAgruparBisetPorTitulo(enB, b.title);
        var grupos = enB.filter(function(x){ return x && x.tipo === 'biserie' && (x.subs || []).length >= 2; }), sueltos = enB.filter(function(x){ return x && x.tipo === 'simple'; });
        if(grupos.length && !sueltos.length){
          var g0 = grupos[0], nS = g0.subs.length, rB = g0.rondas || 3, lbB = nS === 2 ? 'BISET' : (nS === 3 ? 'TRISET' : 'SUPERSERIE');
          return { kind:'⚡ ' + (nS === 2 ? 'Biset' : (nS === 3 ? 'Triset' : 'Superserie')), main:'<b>' + lbB + '</b> &bull; ' + rB + ' RONDA' + (rB === 1 ? '' : 'S') + ' &bull; ' + nS + ' EJERCICIOS SIN PAUSA', vol: rB + ' rondas · ' + nS + ' ejercicios' };
        }
        /* bloque de fuerza de la Pizarra con ejercicios sueltos: se cuentan EJERCICIOS reales (antes «Circuito · N ESTACIONES» contaba también las líneas de dosis) */
        var nEj = sueltos.length + grupos.reduce(function(t, g){ return t + g.subs.length; }, 0);
        if(nEj && b.category === 'strength' && !b.coreBlock && !/core|abdomen|estabilidad/i.test(String((b.weekName && b.weekName[wi]) || b.title || '')))
          return { kind:'Trabajo principal', main:'<b>' + nEj + (nEj === 1 ? ' EJERCICIO' : ' EJERCICIOS') + '</b>' + (grupos.length ? ' &bull; ' + grupos.length + (grupos.length === 1 ? ' BISET' : ' BISETS') : ''), vol: nEj + (nEj === 1 ? ' ejercicio' : ' ejercicios') };
      }catch(eB){}
    }
    if(b){
      var items = itemsDeSemana(b, wi);
      var mov = items.filter(function(x){ return !/^\s*(-|\d+\s*sets?:|rest|descanso)/i.test(x); }).length;
      /* etiqueta ya resuelta para la semana actual (no el título estático
         congelado en la semana 1) -- misma corrección que en esCore() */
      var etiquetaWi = (b.weekName && b.weekName[wi]) || b.title || '';
      if(RX_WARM.test(etiquetaWi + ' ' + (b.subtitle || ''))) return null;
      if(b.coreBlock || /core|abdomen|estabilidad/i.test(etiquetaWi))
        return { kind:'Circuito', main:'<b>CORE Y ESTABILIDAD</b> · ' + mov + ' ESTACIONES', vol: mov + ' estaciones' };
      return { kind:'Circuito', main:'<b>' + mov + ' ESTACIONES</b>', vol: mov + ' estaciones' };
    }
    return null;
  }
  function tags(){
    document.querySelectorAll('.block').forEach(function(bl){
      if(document.body.classList.contains('cf-modo')) return;
      var b = bloqueDe(bl.dataset.blockId);
      var e = estructura(b, bl);
      var viejo = bl.querySelector('.blk-tag');
      var sh = bl.querySelector('.superset-header');
      if(!e){ if(viejo) viejo.remove(); return; }
      if(sh){ sh.remove(); }                    /* la cápsula vieja se unifica en el tag estándar */
      var html = '<span class="bt-kind">' + esc(e.kind) + '</span>' +
                 '<span class="bt-dot">&#9679;</span>' +
                 '<span class="bt-main">' + e.main + '</span>' +
                 (e.meta ? '<span class="bt-meta">' + esc(e.meta) + '</span>' : '');
      if(viejo){ if(viejo.innerHTML !== html) viejo.innerHTML = html; }
      else{
        var caja = document.createElement('div');
        caja.className = 'blk-tag';
        caja.innerHTML = html;
        var cuerpo = bl.querySelector('.block-body');
        if(cuerpo) cuerpo.insertBefore(caja, cuerpo.firstElementChild);
      }
      /* nada de píldoras duplicadas: el banner ya declara series y repeticiones */
      bl.querySelectorAll('.blk-vol').forEach(function(v){ v.remove(); });
    });
  }

  /* ---------------------------------------------------------
     3 · JERARQUÍA DEL BLOQUE DE CROSSFIT
  --------------------------------------------------------- */
  function crossfit(){
    document.querySelectorAll('.block').forEach(function(bl){
      var b = bloqueDe(bl.dataset.blockId);
      if(!b) return;
      var board = bl.querySelector('.cf-board') || bl.querySelector('.wod-board');
      if(!board) return;
      var head = board.querySelector('.cf-h') || board.querySelector('.wb-h');
      /* identificador y tipo del bloque */
      if(head && (b.blockId || b.blockType)){
        var id = head.querySelector('.cf-idtype');
        var html = (b.blockId ? '<span class="cf-id">' + esc(b.blockId) + '</span>' : '') +
                   (b.blockType ? '<span class="cf-type">' + esc(b.blockType) + '</span>' : '');
        if(!id){
          id = document.createElement('div');
          id.className = 'cf-idtype';
          head.insertBefore(id, head.firstChild);
        }
        if(id.innerHTML !== html) id.innerHTML = html;
      }
      /* protocolo destacado arriba de la pizarra */
      var cuerpo = board.querySelector('.cf-body') || board.querySelector('.wb-body');
      if(b.protocol && cuerpo){
        var pr = board.querySelector('.cf-proto');
        if(!pr){
          pr = document.createElement('div');
          pr.className = 'cf-proto';
          cuerpo.parentNode.insertBefore(pr, cuerpo);
        }
        if(pr.textContent !== b.protocol) pr.textContent = b.protocol;
      }
      /* escalados RX / ADVANCED / SCALED */
      var sc = b.scaling || {};
      if(sc.rx || sc.adv || sc.scaled || sc.elite){
        var lv = board.querySelector('.cf-levels');
        var h = (sc.scaled ? '<span class="lv sc"><b>Development</b>' + esc(sc.scaled) + '</span>' : '') +
                (sc.adv ? '<span class="lv adv"><b>Advanced</b>' + esc(sc.adv) + '</span>' : '') +
                (sc.rx ? '<span class="lv rx"><b>RX</b>' + esc(sc.rx) + '</span>' : '') +
                (sc.elite ? '<span class="lv elite"><b>Elite</b>' + esc(sc.elite) + '</span>' : '');
        if(!lv){
          lv = document.createElement('div');
          lv.className = 'cf-levels';
          var ref = board.querySelector('.cf-score, .wod-score');
          if(ref) board.insertBefore(lv, ref); else board.appendChild(lv);
        }
        if(lv.innerHTML !== h) lv.innerHTML = h;
      }
      /* notas de escalado dentro del cierre técnico */
      var c = b.cierre;
      if(c && c.escalado){
        var cierre = bl.querySelector('.cf-cierre');
        if(cierre && !cierre.querySelector('.cc-s.esc')){
          var s = document.createElement('div');
          s.className = 'cc-s esc';
          s.innerHTML = '<h5>Notas de escalado</h5><p>' + esc(c.escalado) + '</p>';
          cierre.appendChild(s);
        }
      }
      /* numeración correlativa: nunca arranca en 0 ni saltea */
      var n = 0;
      /* en las pizarras volt la numeración es de dos dígitos: 01 · 02 · 03 */
      var volt = board.classList.contains('board-volt');
      board.querySelectorAll('.wb-line, .cf-line').forEach(function(l){
        var num = l.querySelector('span.n');
        if(l.classList.contains('head')){ if(num) num.remove(); return; }
        n++;
        if(!num){
          num = document.createElement('span');
          num.className = 'n';
          l.insertBefore(num, l.firstChild);
        }
        var t = volt ? (n < 10 ? '0' + n : String(n)) : String(n);
        if(num.textContent !== t) num.textContent = t;
      });
    });
  }

  /* ---------------------------------------------------------
     4 · REGISTRO COMPACTO EN CIRCUITOS Y CORE
  --------------------------------------------------------- */
  function claveLog(bl, i){
    return (state.currentWeek || 0) + '|' + state.currentDay + '|' + (bl.dataset.blockId || '') + '|' + i;
  }
  /* 10/09 -- circuito por tiempo/rondas (AMRAP/EMOM/For Time/"N rondas"):
     acá NO tiene sentido un casillero "Hecho | Reps o kg" por cada
     renglón del circuito (ej. "10 cal bike" + "10 cal remo" son las DOS
     mitades de UNA sola ronda, no dos series independientes) -- se
     registra una sola fila con un contador de rondas completadas para
     todo el bloque. */
  var RX_CIRCUITO_RONDAS = /\bamrap\b|\be[23]?mom\b|\bfor\s*time\b|\bft\b|\brondas?\b|\brounds?\b/i;
  function esCircuitoRondas(b){
    var texto = (b.title || '') + ' ' + (b.subtitle || '') + ' ' + (b.items || []).join(' ');
    return RX_CIRCUITO_RONDAS.test(texto);
  }
  function registro(){
    if(document.body.classList.contains('cf-modo')) return;
    document.querySelectorAll('.block').forEach(function(bl){
      var b = bloqueDe(bl.dataset.blockId);
      if(!b || b.isBlock || b.isSuperset || b.isFinisher) return;
      var wiReg = (typeof state !== 'undefined' && state) ? (state.currentWeek || 0) : 0;
      /* el subtítulo estático sólo suma al test si esta semana no rotó
         (mismo criterio que esCore()): si rotó, el subtítulo describe otra
         semana y no debe hacer que este bloque pierda sus mini-logs */
      var baseReg = b.title || '';
      var etiquetaWiReg = (b.weekName && b.weekName[wiReg]) || baseReg;
      var rotadoReg = etiquetaWiReg !== baseReg;
      var titulo = etiquetaWiReg + (rotadoReg ? '' : ' ' + (b.subtitle || ''));
      if(RX_WARM.test(titulo)) return;                 /* la entrada en calor no se registra */
      /* el core se registra con sus filas de serie: nada de checkboxes genéricos en bucle */
      if(b.coreBlock || RX_CORE.test(titulo)) return;
      if(bl.querySelector('.set-tracker')) return;
      state.logs = state.logs || {};

      /* directiva maestra ("Erradicación del contador de rondas en
         Sports") -- se retira por completo el widget [-] RONDA X DE N [+]
         [✓ COMPLETAR] de TODA la vista de Sports (registro() sólo corre
         acá, nunca en CrossFit -- ver el guard cf-modo al inicio de la
         función). En Sports el progreso se mide exclusivamente por la
         completitud de cada serie individual, nunca por un contador de
         rondas aparte. esCircuitoRondas()/claveLog() quedan intactas (sin
         invocarse acá) por si algo más las necesita más adelante. */
      if(esCircuitoRondas(b)){
        return;
      }

      bl.querySelectorAll('.ex-row').forEach(function(row, i){
        if(row.querySelector('.mini-log')) return;
        var k = claveLog(bl, i);
        var v = state.logs[k] || { ok:false, txt:'' };
        var caja = document.createElement('div');
        caja.className = 'mini-log';
        caja.innerHTML = '<label><input type="checkbox" data-lg="' + k + '"' + (v.ok ? ' checked' : '') + '> Hecho</label>' +
          '<input type="text" data-lgt="' + k + '" placeholder="Reps o kg" value="' + String(v.txt).replace(/"/g, '&quot;') + '">';
        row.parentNode.insertBefore(caja, row.nextSibling);
        if(v.ok) row.classList.add('log-done');
      });
    });
  }
  document.addEventListener('click', function(e){
    var incBtn = e.target.closest('[data-cr-inc]');
    var decBtn = e.target.closest('[data-cr-dec]');
    var completarBtn = e.target.closest('[data-cr-completar]');
    if(!incBtn && !decBtn && !completarBtn) return;
    var caja = (incBtn || decBtn || completarBtn).closest('.circuit-rounds');
    var input = caja ? caja.querySelector('.cr-val') : null;
    if(!input) return;
    var n = parseInt(input.value, 10) || 0;
    if(completarBtn){
      var totalRondas = parseInt(caja.dataset.crTotal, 10) || 0;
      n = totalRondas ? totalRondas : n + 1;
      try{ jpAudioTactical.soundTimerEnd(); jpAudioTactical.vibrateTimerEnd(); }catch(x){}
    } else {
      n = incBtn ? (n + 1) : Math.max(0, n - 1);
      try{ if(navigator.vibrate) navigator.vibrate(15); }catch(x){}
    }
    input.value = String(n);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  document.addEventListener('change', function(e){
    var c = e.target.closest('[data-lg]');
    if(!c) return;
    state.logs = state.logs || {};
    var k = c.dataset.lg;
    state.logs[k] = state.logs[k] || { ok:false, txt:'' };
    state.logs[k].ok = c.checked;
    var caja = c.closest('.mini-log');
    var row = caja ? caja.previousElementSibling : null;
    if(row) row.classList.toggle('log-done', c.checked);
    try{ saveProgress(); }catch(x){}
  });
  document.addEventListener('input', function(e){
    var t = e.target.closest('[data-lgt]');
    if(!t) return;
    state.logs = state.logs || {};
    var k = t.dataset.lgt;
    state.logs[k] = state.logs[k] || { ok:false, txt:'' };
    state.logs[k].txt = t.value;
    try{ saveProgress(); }catch(x){}
  });
  /* el registro viaja con el resto del progreso */
  if(typeof _spFlush === 'function'){
    var _flushExtraLogs = _spFlush;
    _spFlush = function(){
      var r = _flushExtraLogs.apply(this, arguments);
      try{
        var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        raw.logs = state.logs || {};
        localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
      }catch(e){}
      return r;
    };
    try{
      var raw0 = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      state.logs = raw0.logs || {};
    }catch(e){}
  }

  function repintar(){ try{ prescripcion(); tags(); crossfit(); registro(); }catch(e){} }
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
        setTimeout(function(){ propio = false; }, 180);
      }, 160);
    }, main);
    if(typeof window.renderMain === 'function'){
      var _rm = window.renderMain;
      window.renderMain = function(){
        var r = _rm.apply(this, arguments);
        setTimeout(repintar, 160);
        setTimeout(repintar, 520);
        return r;
      };
    }
    window.CoachVistaV2 = { repintar: repintar, prescripcion: prescripcion, tags: tags, crossfit: crossfit };
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(mount, 340); });
  else setTimeout(mount, 340);
})();
