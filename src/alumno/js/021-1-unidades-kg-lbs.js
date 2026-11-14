(function(){
  'use strict';
  var CFG = (typeof PROGRAM_CONFIG !== 'undefined' && PROGRAM_CONFIG) || {};
  var KUNI = (typeof STORAGE_KEY !== 'undefined' ? STORAGE_KEY : 'coachjp') + '_unidad';

  /* =========================================================
     1 · UNIDADES KG / LBS
  ========================================================= */
  var unidad = 'kg';
  try{ unidad = localStorage.getItem(KUNI) || 'kg'; }catch(e){}
  function conv(kg){
    var v = parseFloat(kg) || 0;
    return unidad === 'lb' ? Math.round(v * 2.2046226 * 2) / 2 : Math.round(v * 2) / 2;
  }
  /* los discos necesitan el valor exacto: 1.25 kg no se redondea a 1.5 */
  function convFino(kg){
    var v = parseFloat(kg) || 0;
    return unidad === 'lb' ? Math.round(v * 2.2046226 * 100) / 100 : Math.round(v * 100) / 100;
  }
  function uni(){ return unidad === 'lb' ? 'lbs' : 'kg'; }
  function fmt(kg){ return conv(kg) + ' ' + uni(); }
  function fmtFino(kg){ return convFino(kg) + ' ' + uni(); }
  window.CoachUnidad = { actual: function(){ return unidad; }, conv: conv, fmt: fmt, fino: fmtFino, sufijo: uni,
                         fijar: function(u){ unidad = (u === 'lb' ? 'lb' : 'kg');
                           try{ localStorage.setItem(KUNI, unidad); }catch(e){}
                           pintarUnidad(); repintar(); } };
  function switchUnidades(){
    if(document.getElementById('uniSwitch')) return;
    var host = document.querySelector('.hd-actions') || document.querySelector('.masthead');
    if(!host) return;
    var w = document.createElement('div');
    w.className = 'uni-switch'; w.id = 'uniSwitch';
    w.innerHTML = '<button type="button" data-u="kg">KG</button><button type="button" data-u="lb">LBS</button>';
    w.addEventListener('click', function(e){
      var b = e.target.closest('[data-u]'); if(!b) return;
      window.CoachUnidad.fijar(b.dataset.u);
      try{ if(navigator.vibrate) navigator.vibrate(15); }catch(x){}
    });
    host.appendChild(w);
    pintarUnidad();
  }
  function pintarUnidad(){
    document.querySelectorAll('#uniSwitch [data-u]').forEach(function(b){
      b.classList.toggle('on', b.dataset.u === unidad);
    });
    var u = document.getElementById('tmUni');
    if(u) u.textContent = uni();
  }

  /* =========================================================
     2 · SUGERENCIA DE CARGA CRUZANDO %1RM CON EL PR
  ========================================================= */
  function nombreBloque(bl){
    var ex = bl.querySelector('.ex-name');
    if(ex && ex.childNodes[0]) return (ex.childNodes[0].textContent || '').trim();
    var t = bl.querySelector('.block-label, .block-title, h4');
    return t ? t.textContent.trim() : '';
  }
  function pctDe(bl){
    var txt = '';
    bl.querySelectorAll('.ex-detail, .block-subtitle, .load-suggest, .ex-name, .wb-line').forEach(function(e){
      txt += ' ' + (e.textContent || '');
    });
    var m = txt.match(/(\d{2,3})\s*%/);
    if(!m) return 0;
    var p = parseInt(m[1], 10);
    return (p >= 30 && p <= 110) ? p : 0;
  }
  function rmDe(nombre){
    if(window.CoachPRHub && window.CoachPRHub.mejor1RM){
      var v = window.CoachPRHub.mejor1RM(nombre);
      if(v > 0) return v;
    }
    /* si el hub todavía no tiene nada, se usa el 1RM que cargó el coach */
    var prs = window.JP_PRS || {}, best = 0;
    var n = String(nombre || '').toLowerCase();
    if(!n) return 0;
    Object.keys(prs).forEach(function(k){
      var kk = String(k).toLowerCase();
      if(kk.length < 3) return;
      if(n.indexOf(kk) >= 0 || kk.indexOf(n) >= 0) best = Math.max(best, parseFloat(prs[k]) || 0);
    });
    return best;
  }
  function sugerencias(){
    document.querySelectorAll('.block').forEach(function(bl){
      var vieja = bl.querySelector('.rm-sug:not(.pre-sug)');
      /* si la carga de la semana ya se precomputó con la marca del alumno,
         esa manda: no se agrega una segunda caja con otro número */
      if(bl.querySelector('.pre-sug')){ if(vieja) vieja.remove(); return; }
      if(!bl.querySelector('.set-row')){ if(vieja) vieja.remove(); return; }
      var pct = pctDe(bl);
      var nom = nombreBloque(bl);
      var rm = pct ? rmDe(nom) : 0;
      if(!pct || !(rm > 0)){ if(vieja) vieja.remove(); return; }
      var kg = Math.round(rm * pct / 100 * 2) / 2;
      var html = '<span class="ic">🎯</span><div><b>Sugerido: <code class="ls-num">' + fmt(kg) + '</code> [' + pct + '% de 1RM]</b>' +
        '<span>Tu récord registrado es ' + fmt(rm) + ' — el sistema lo cruza con el porcentaje programado.</span></div>';
      if(vieja){ if(vieja.innerHTML !== html) vieja.innerHTML = html; return; }
      var box = document.createElement('div');
      box.className = 'rm-sug'; box.innerHTML = html;
      var ancla = bl.querySelector('.set-tracker') || bl.querySelector('.jp-tools');
      if(ancla && ancla.parentNode) ancla.parentNode.insertBefore(box, ancla);
      else bl.appendChild(box);
    });
  }
  window.CoachSugerencia = sugerencias;

  /* =========================================================
     3 · MENÚ DE HERRAMIENTAS (ícono + modal)
  ========================================================= */
  /* UX/UI integral (13/09), parte 3: se retira el Asistente de Discos --
     tmTab arranca directo en 'rampa' (aproximación) y ya no hay forma de
     pisarlo a 'discos' (el tab que lo hacía se quitó del HTML de abajo).
     window.CoachDiscos y la rama tmTab==='discos' de tmPintar() quedan
     intactas sin uso: si el coach algún día pide reactivarlo, el cálculo
     ya está probado y ahí. */
  var tmTab = 'rampa', tmBloque = null;
  function pesoObjetivo(bl){
    var kg = 0;
    if(bl){
      bl.querySelectorAll('.set-kg').forEach(function(i){ var v = parseFloat(i.value); if(v > kg) kg = v; });
      if(!kg){
        var s = bl.querySelector('.rm-sug b');
        if(s){ var m = s.textContent.replace(',', '.').match(/([\d.]+)/); if(m) kg = parseFloat(m[1]); }
      }
      if(!kg){
        var ls = bl.querySelector('.load-suggest');
        if(ls){ var m2 = ls.textContent.replace(',', '.').match(/([\d.]+)\s*kg/i); if(m2) kg = parseFloat(m2[1]); }
      }
    }
    return kg;
  }
  function tmPintar(){
    var out = document.getElementById('tmOut'); if(!out) return;
    var campo = parseFloat((document.getElementById('tmKg') || {}).value);
    var kg = campo > 0 ? (unidad === 'lb' ? campo / 2.2046226 : campo) : 0;
    if(!(kg > 0)){
      out.innerHTML = '<b>Falta el peso</b><div>Escribí el peso objetivo de la serie y el cálculo aparece acá.</div>';
      return;
    }
    if(tmTab === 'discos'){
      var d = (window.CoachDiscos || function(){ return { ok:false }; })(kg, 20);
      if(!d.ok){
        out.innerHTML = '<b>Barra sola</b><div>' + fmtFino(kg) + ' es menos que la barra olímpica de ' + fmt(20) +
          '. Usá barra corta, mancuernas o discos chicos.</div>';
      } else {
        out.innerHTML = '<b>' + fmtFino(kg) + ' = barra ' + fmt(20) + ' + ' + fmtFino(d.porLado) + ' por lado</b>' +
          (window.CoachDiscoBar ? window.CoachDiscoBar(d) : '') +
          '<div class="pl">' + d.lista.map(function(x){ return '<span>' + x.n + ' × ' + fmtFino(x.d) + '</span>'; }).join('') + '</div>' +
          (d.sobra > 0 ? '<div style="margin-top:7px;color:#E8965E">Sobran ' + fmtFino(d.sobra) +
            ' por lado que no se arman con discos estándar: redondeá a ' + fmtFino(kg - d.sobra * 2) + '.</div>' : '');
      }
    } else {
      var r = (window.CoachRampa || function(){ return []; })(kg);
      out.innerHTML = '<b>Aproximación hasta ' + fmt(kg) + '</b>' +
        '<div class="ramp">' + r.map(function(x){
          return '<div><span>' + x.pct + '% · ' + x.reps + ' reps</span><b>' + fmt(x.kg) + '</b></div>';
        }).join('') + '</div>' +
        '<div style="margin-top:7px;color:#A0A8B4">Descansá 60-90 s entre aproximaciones. No cuentan como series efectivas.</div>';
    }
  }
  function abrirTM(bl){
    tmBloque = bl || null;
    var w = document.getElementById('tmWrap'); if(!w) return;
    var kg = pesoObjetivo(bl);
    var inp = document.getElementById('tmKg');
    /* si el bloque todavía no tiene peso, se respeta el último que escribió el alumno */
    if(inp && kg > 0) inp.value = conv(kg);
    pintarUnidad();
    tmPintar();
    w.classList.add('on');
    try{ if(navigator.vibrate) navigator.vibrate(15); }catch(e){}
  }
  function cerrarTM(){ var w = document.getElementById('tmWrap'); if(w) w.classList.remove('on'); }
  function montarTM(){
    var w = document.getElementById('tmWrap'); if(!w || w.dataset.listo) return;
    w.dataset.listo = '1';
    w.addEventListener('click', function(e){ if(e.target === w) cerrarTM(); });
    document.getElementById('tmX').addEventListener('click', cerrarTM);
    document.getElementById('tmKg').addEventListener('input', tmPintar);
    /* UX/UI integral (13/09): las pestañas .tm-tabs se quitaron del HTML
       (era el selector discos/rampa) -- tmTab queda fijo en 'rampa', así
       que ya no hace falta cablear el click de las pestañas. */
  }
  window.CoachHerramientas = { abrir: abrirTM, cerrar: cerrarTM, pintar: tmPintar };

  /* el par de botones de texto se reemplaza por un ícono discreto */
  function iconizar(){
    document.querySelectorAll('.jp-tools').forEach(function(box){
      if(box.dataset.icono) return;
      box.dataset.icono = '1';
      var bl = box.closest('.block');
      box.innerHTML = '';
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'tool-ic'; b.title = 'Calculadoras: discos y series de aproximación';
      b.innerHTML = '🧮';
      b.addEventListener('click', function(){ abrirTM(bl); });
      box.appendChild(b);
      var salida = bl ? bl.querySelector('.jp-out') : null;
      if(salida) salida.remove();
    });
  }

  /* =========================================================
     4 · CROSSFIT: SIN VIDEOS EN EL WOD + GLOSARIO FINAL
  ========================================================= */
  function esComplex(bl){
    var t = (bl.textContent || '');
    return /complex/i.test(t) || (/weightlifting|halterofilia/i.test(t) && /\+/.test((bl.querySelector('.ex-name') || {}).textContent || ''));
  }
  function esWodBloque(bl){
    /* FIX (estrategia de videos en CrossFit/Hyrox): Accessory/Cooldown
       vincula video por ejercicio igual que Sports & Bodybuilding -- no
       se agrupa en el glosario final como el resto de las fases de la
       Pizarra (Warm-up/Skill/WOD/Hyrox Stations), donde sí se suprime.
       .jp-cfboard también carga la clase .wod-board (identidad visual
       compartida), así que sin esta excepción el chequeo de abajo
       (bl.querySelector('.wod-board')) le vaciaba el video recién
       auto-matcheado en compile() -- limpiar() lo movía al glosario. */
    if(bl.querySelector('.jp-cfboard.jp-cf-fase-accessory')) return false;
    /* directiva maestra ("Reparación y compilación universal de videos
       por bloque") -- BUG REAL encontrado en la auditoría: .jp-sb-board
       (la Pizarra NATIVA de Sports & Bodybuilding) también carga la
       clase compartida .wod-board (identidad visual, igual que
       .jp-cfboard) -- el chequeo genérico de abajo (bl.querySelector
       ('.wod-board')) la confundía con un WOD de CrossFit SIEMPRE, sin
       importar la disciplina del plan ni si el bloque era Warm-up o
       trabajo principal: limpiar() le sacaba el ícono .video-link recién
       pintado por videoLinkHtml() a TODO bloque de Pizarra Sports,
       mandándolo a un glosario final que ni siquiera se muestra en modo
       Sports. Mismo patrón de excepción que ya existía para
       .jp-cfboard.jp-cf-fase-accessory, ahora también para .jp-sb-board:
       nunca es un WOD, sin importar qué más contenga el bloque. */
    if(bl.querySelector('.jp-sb-board')) return false;
    /* en la vista CrossFit todos los videos se agrupan en el glosario final */
    if(document.body.classList.contains('cf-modo')) return true;
    if(bl.classList.contains('cat-metcon')) return true;
    if(bl.querySelector('.wod-board')) return true;
    var t = (bl.querySelector('.block-label') || {}).textContent + ' ' + ((bl.querySelector('.block-title') || {}).textContent || '');
    return /met.?con|\bwod\b|amrap|emom|for time|tabata|chipper/i.test(t || '');
  }
  var LEXICO = [];
  function limpiar(bl){
    /* los videos molestan dentro del WOD y del complex: se guardan para el glosario */
    bl.querySelectorAll('.video-link').forEach(function(a){
      /* directiva ("Sanitización del detector de videos") -- cuando el
         video vive junto a un span dedicado de NOMBRE (estructura real
         de la Pizarra Sports: .jp-sb-ex-nombre/.jp-sb-subex-nombre/
         .jp-sb-plain-nombre), se usa SÓLO ese texto. El fallback viejo
         (closest .ex-row/.wb-line/.ex-name, o directo a parentElement)
         se comía TODO el contenedor -- en .jp-sb-subex-head eso incluye
         la letra de estación pegada sin separador (bug real:
         "AElevación de piernas colgado"). */
      var nombreEl = a.parentElement ? a.parentElement.querySelector('.jp-sb-ex-nombre, .jp-sb-subex-nombre, .jp-sb-plain-nombre') : null;
      var fila = nombreEl || a.closest('.ex-row, .wb-line, .ex-name') || a.parentElement;
      var nombre = (fila ? fila.textContent : '').replace(/\s+/g, ' ').trim();
      nombre = nombre.split(' — ')[0].replace(/^\d+\s*/, '').trim();
      if(nombre) LEXICO.push({ nombre: nombre, html: a.outerHTML });
      a.remove();
    });
  }
  function complexes(){
    document.querySelectorAll('.block').forEach(function(bl){
      if(!esComplex(bl) || bl.classList.contains('jp-complex')) return;
      bl.classList.add('jp-complex');
      limpiar(bl);
      var tag = document.createElement('div');
      tag.className = 'cx-tag';
      tag.innerHTML = '⛓️ Complex: sin soltar la barra';
      var body = bl.querySelector('.block-body') || bl;
      body.insertBefore(tag, body.firstChild);
    });
  }
  function wodSinVideo(){
    document.querySelectorAll('.block').forEach(function(bl){
      if(!esWodBloque(bl)) return;
      /* directiva crítica -- ya no se "limpia" (saca de la fila y manda al
         glosario del pie de sesión) el video de un bloque de Pizarra de
         CrossFit (.jp-cfboard, CUALQUIER fase, no sólo Accessory desde
         este fix). El auto-match de compile()/jpCfFila() ahora resuelve
         el video en cualquier fase -- si esta limpieza siguiera corriendo
         acá, le sacaría a la fila exactamente el botón que ese fix
         acaba de agregar, apenas unos milisegundos después de pintarlo
         (bug real reportado: el botón aparecía y desaparecía solo). Se
         sigue limpiando en todo lo demás que esWodBloque() ya cubría
         (complex, metcon clásico de musculación fuera de la Pizarra). */
      if(!bl.querySelector('.jp-cfboard')) limpiar(bl);
      /* color del formato en la pizarra */
      var board = bl.querySelector('.wod-board');
      if(board && !board.dataset.tipo){
        var fmtEl = board.querySelector('.wb-fmt');
        var t = (fmtEl ? fmtEl.textContent : '') + ' ' + board.textContent;
        var k = /amrap/i.test(t) ? 'amrap' : /emom|e\d+m?om|every/i.test(t) ? 'emom'
              : /tabata/i.test(t) ? 'tabata' : /for time|rft|chipper|ladder|rounds? for time/i.test(t) ? 'fortime' : '';
        if(k){
          board.dataset.tipo = k;
          board.classList.add('b-' + k);
          if(fmtEl) fmtEl.classList.add('f-' + k);
          var h = board.querySelector('.wb-h');
          if(h && !h.querySelector('.wb-tipo')){
            var lb = { amrap:'🟢 AMRAP', emom:'🔵 EMOM', tabata:'🟡 TABATA', fortime:'🔴 FOR TIME' }[k];
            var s = document.createElement('span');
            s.className = 'wb-tipo'; s.textContent = lb;
            h.appendChild(s);
          }
        }
      }
    });
  }
  function glosario(){
    var main = document.getElementById('mainContent'); if(!main) return;
    var viejo = document.getElementById('glosarioSesion');
    /* directiva maestra ("Limpieza de interfaz"): el "Glosario Técnico de la
       Sesión" del pie se retira en TODAS las disciplinas y días -- los videos
       ya viven dentro de las pautas de cada bloque (jpCfClips / chipsVideoSB). */
    if(viejo) viejo.remove();
    return;
    /* directiva ("Eliminación definitiva del Glosario en Sports"): los
       videos ya viven de forma nativa dentro del acordeón de cada
       bloque (ver recolectarVideosSB()/chipsVideoSB(), directiva
       "Videos Enraizados en Cada Bloque") -- la caja del pie de sesión
       queda obsoleta en Sports y se retira del todo. CrossFit nunca
       tuvo ese acordeón por-bloque, así que sigue dependiendo 100% del
       glosario final: cero cambio para esa disciplina. */
    if(window.COACH_DISCIPLINA === 'sports'){ if(viejo) viejo.remove(); return; }
    var hayCF = !!document.querySelector('.wod-board, .block.cat-metcon, .jp-complex');
    if(!hayCF || !LEXICO.length){ if(viejo) viejo.remove(); return; }
    var vistos = {}, lista = [];
    var filtro = window.CoachGlosarioFiltro || null;
    LEXICO.forEach(function(x){
      /* sólo nombres limpios de ejercicios: nada de reps, %, kg, rondas ni indicaciones */
      var nombre = filtro ? filtro.limpio(x.nombre) : x.nombre;
      if(filtro && !filtro.valido(nombre)) return;
      var k = nombre.toLowerCase();
      if(k.length < 3 || vistos[k]) return;
      vistos[k] = 1;
      var html = x.html;
      if(filtro){
        html = html.replace(/search_query=[^"&]*/,
          'search_query=' + encodeURIComponent(nombre + ' técnica ejercicio'));
      }
      lista.push({ nombre: nombre, html: html });
    });
    if(!lista.length){ if(viejo) viejo.remove(); return; }
    var html = '<div class="gl-h"><span style="font-size:1.4rem">📚</span>' +
      '<h3>Glosario Técnico de la Sesión</h3>' +
      '<span class="gl-n">' + lista.length + ' movimientos</span></div>' +
      '<div class="gl-grid">' + lista.map(function(x){
        return '<div class="gl-card"><span class="nm">' + x.nombre + '</span>' + x.html + '</div>';
      }).join('') + '</div>';
    if(viejo){ if(viejo.innerHTML !== html) viejo.innerHTML = html; return; }
    var box = document.createElement('div');
    box.className = 'glosario'; box.id = 'glosarioSesion';
    box.innerHTML = html;
    var resumen = main.querySelector('.summary-card');
    if(resumen && resumen.parentNode) resumen.parentNode.insertBefore(box, resumen);
    else main.appendChild(box);
  }

  /* =========================================================
     5 · NIVEL DE ESCALADO ANTES DEL SCORE
  ========================================================= */
  var RX = [
    { k:'scaled', lb:'Development' },
    { k:'adv',    lb:'Advanced' },
    { k:'rx',     lb:'RX' },
    { k:'elite',  lb:'Elite' }
  ];
  function escalado(){
    return;     /* sin selector de nivel en la vista del atleta: la categoria la asigna el coach */
    document.querySelectorAll('.wod-board').forEach(function(board){
      if(board.querySelector('.rx-bar')) return;
      var score = board.querySelector('.wod-score'); if(!score) return;
      var inp = score.querySelector('.wod-score-in');
      var skey = inp ? inp.dataset.skey : board.dataset.wodb;
      state.nivel = state.nivel || {};
      var bar = document.createElement('div');
      bar.className = 'rx-bar';
      bar.innerHTML = '<span class="lb">Nivel de hoy</span>' +
        RX.map(function(n){
          return '<button type="button" class="rx-chip ' + n.k + (state.nivel[skey] === n.k ? ' on' : '') +
                 '" data-rx="' + n.k + '">' + n.lb + '</button>';
        }).join('') + '<div class="rx-nota" style="display:none"></div>';
      score.parentNode.insertBefore(bar, score);
      var nota = bar.querySelector('.rx-nota');
      var pintaNota = function(k){
        var sc = (board.__scaling || {});
        var t = sc[k] || '';
        nota.style.display = t ? '' : 'none';
        nota.textContent = t;
      };
      pintaNota(state.nivel[skey]);
      bar.addEventListener('click', function(e){
        var b = e.target.closest('[data-rx]'); if(!b) return;
        state.nivel[skey] = b.dataset.rx;
        bar.querySelectorAll('.rx-chip').forEach(function(x){ x.classList.toggle('on', x === b); });
        pintaNota(b.dataset.rx);
        try{ if(navigator.vibrate) navigator.vibrate(15); }catch(x){}
        saveProgress();
      });
    });
  }
  /* las notas de escalado que escribió el coach viajan en el bloque */
  function cargarScaling(){
    if(!CFG.days) return;
    var mapa = {};
    CFG.days.forEach(function(d){
      (d.blocks || []).forEach(function(b){ if(b.scaling) mapa[b.id] = b.scaling; });
    });
    document.querySelectorAll('.wod-board[data-wodb]').forEach(function(bd){
      bd.__scaling = mapa[bd.dataset.wodb] || {};
    });
  }

  /* =========================================================
     6 · FEEDBACK DEL ATLETA AL CERRAR
  ========================================================= */
  function feedback(){
    if(window.COACH_DISCIPLINA === 'sports') return;     /* Sports: una sola caja de notas (scNotes) */
    var card = document.querySelector('.summary-card'); if(!card) return;
    if(card.querySelector('.fb-box')) return;
    var day = (typeof DAYS !== 'undefined' ? DAYS : []).find(function(x){ return x.id === state.currentDay; }) || {};
    var key = state.currentWeek + '|' + state.currentDay + '|__feedback';
    state.feedback = state.feedback || {};
    var box = document.createElement('div');
    box.className = 'fb-box';
    box.innerHTML = '<label>💬 Comentario sobre la sesión (RPE o sensaciones)</label>' +
      '<div class="fb-row"><input id="fbIn" maxlength="160" placeholder="Ej: RPE 8, piernas cansadas pero técnica firme" value="' +
        String(state.feedback[key] || '').replace(/"/g, '&quot;') + '"><button type="button" id="fbSend">Enviar</button></div>' +
      '<div class="fb-ok" id="fbOk"></div>';
    var acts = card.querySelector('.sc-actions');
    if(acts && acts.parentNode) acts.parentNode.insertBefore(box, acts);
    else card.appendChild(box);
    document.getElementById('fbSend').addEventListener('click', function(){
      var v = (document.getElementById('fbIn').value || '').trim();
      if(!v) return;
      state.feedback[key] = v;
      saveProgress();
      if(window.CoachOutbox && window.CoachOutbox.encolar){
        window.CoachOutbox.encolar({ tipo:'feedback', ex:(day.short || 'Sesión') + ' · ' + (day.label || ''),
                                     nota: v, semana: state.currentWeek + 1 });
      }
      document.getElementById('fbOk').textContent = '✅ Enviado a Coach JP — queda en tu ficha';
      try{ if(navigator.vibrate) navigator.vibrate([30]); }catch(e){}
    });
  }

  /* =========================================================
     7 · MONTAJE
  ========================================================= */
  function repintar(){
    try{
      cargarScaling(); wodSinVideo(); complexes(); glosario();
      /* iconizar() queda deshabilitado: capsulas() (más abajo) es la que
         monta las herramientas de serie sobre .jp-tools, sin el ícono
         combinado de "Asistente de Discos" (directiva de rediseño). */
      /* escalado() (panel "Nivel de hoy" RX/Advanced/Scaled/Intro) se retira
         de la Pizarra Táctica: la prescripción ya aclara RX/Scaled en el
         texto de cada línea, y el panel quedaba como ruido residual al pie
         del bloque (directiva de refactor del parser de Pizarra). */
      sugerencias(); feedback(); pintarUnidad();
    }catch(e){}
  }
  window.CoachMetodologia = { repintar: repintar, glosario: glosario, sugerencias: sugerencias };

  function mount(){
    montarTM(); switchUnidades();
    LEXICO = [];
    repintar();
    var main = document.getElementById('mainContent') || document.body;
    var pendiente = false, propio = false;
    var repintarSuave = function(){
      if(pendiente || propio) return;
      pendiente = true;
      setTimeout(function(){
        pendiente = false; propio = true;
        try{ repintar(); }catch(e){}
        setTimeout(function(){ propio = false; }, 120);
      }, 90);
    };
    window.CoachRepaintBus.register(repintarSuave, main);
    if(typeof window.renderMain === 'function'){
      var _rm = window.renderMain;
      window.renderMain = function(){
        LEXICO = [];
        var r = _rm.apply(this, arguments);
        setTimeout(repintar, 60);
        setTimeout(repintar, 260);
        return r;
      };
    }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(mount, 90); });
  else setTimeout(mount, 90);
})();
