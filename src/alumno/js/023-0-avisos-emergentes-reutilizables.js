(function(){
  'use strict';
  var CFG = (typeof PROGRAM_CONFIG !== 'undefined' && PROGRAM_CONFIG) || {};

  /* =========================================================
     0 · AVISOS EMERGENTES REUTILIZABLES
  ========================================================= */
  var tOut = null;
  function aviso(tipo, icono, titulo, texto, ms){
    var t = document.getElementById('jpToast'); if(!t) return;
    t.className = 'jp-toast on ' + (tipo || '');
    t.querySelector('.ic').textContent = icono || 'ℹ️';
    t.querySelector('.tl').textContent = titulo || '';
    t.querySelector('.tx').innerHTML = texto || '';
    clearTimeout(tOut);
    if(ms !== 0) tOut = setTimeout(cerrarAviso, ms || 9000);
  }
  function cerrarAviso(){
    var t = document.getElementById('jpToast');
    if(t) t.classList.remove('on');
  }
  window.CoachAviso = { mostrar: aviso, cerrar: cerrarAviso };

  /* =========================================================
     1 · DISCIPLINA DEL DÍA
  ========================================================= */
  var RX_CF = /met.?con|\bwod\b|amrap|emom|for\s*time|tabata|chipper|crossfit|complex|snatch|clean\s*(&|and|y)?\s*jerk|thruster|muscle.?up|box jump|wall ball|double under|toes.?to.?bar|kettlebell swing|burpee/i;
  function textoDelDia(){
    var d = (typeof DAYS !== 'undefined' ? DAYS : []).find(function(x){ return x.id === state.currentDay; });
    if(!d) return '';
    var t = (CFG.mesoName || '') + ' ' + (d.title || '') + ' ' + (d.label || '') + ' ' + (d.summary || '');
    (d.blocks || []).forEach(function(b){
      t += ' ' + (b.title || '') + ' ' + (b.subtitle || '') + ' ' + (b.category || '') +
           ' ' + ((b.items || []).join(' ')) + ' ' + ((b.movements || []).join(' ')) +
           ' ' + (b.exerciseName || '');
    });
    return t;
  }
  /* el alumno (o el coach) puede forzar la vista si un día mixto lo pide */
  var KVISTA = (typeof STORAGE_KEY !== 'undefined' ? STORAGE_KEY : 'coachjp') + '_vista';
  var forzada = null;
  try{ forzada = localStorage.getItem(KVISTA) || null; }catch(e){}
  /* trabajo medible = bloques con series, carga y tilde (ancla, biset, triset) */
  function bloquesMedibles(d){
    if(!d) return 0;
    return (d.blocks || []).filter(function(b){
      return b && (b.isBlock || b.isSuperset);
    }).length;
  }
  function esCrossFit(){
    /* Checkpoint 5 (poda real): esta heurística por texto/categoría era la
       única vía que quedaba por la que una pizarra CrossFit podía montarse
       en la rama Sports sin pasar por el gate de disciplina de pizarra()
       (línea ~6321) -- ej. una nota de coach que dijera "AMRAP" o un bloque
       con category:'metcon'. Se cierra acá, en el único punto de decisión
       real del que dependen modoDisciplina()/pizarraTexto()/CoachVista. */
    if(window.COACH_DISCIPLINA === 'sports') return false;
    if(forzada === 'crossfit') return true;
    if(forzada === 'musculacion') return false;
    var d = (typeof DAYS !== 'undefined' ? DAYS : []).find(function(x){ return x.id === state.currentDay; });
    if(!d) return false;
    /* un finisher metabólico no convierte una sesión de sala en pizarra:
       si hay trabajo medible con series, el día se registra, no se lee */
    if(bloquesMedibles(d) > 0) return false;
    if((d.blocks || []).some(function(b){ return b.category === 'metcon'; })) return true;
    return RX_CF.test(textoDelDia());
  }
  window.CoachMedibles = bloquesMedibles;
  window.CoachDisciplina = function(){ return esCrossFit() ? 'crossfit' : 'musculacion'; };
  window.CoachVista = {
    actual: function(){ return esCrossFit() ? 'crossfit' : 'musculacion'; },
    forzada: function(){ return forzada; },
    fijar: function(v){
      forzada = (v === 'crossfit' || v === 'musculacion') ? v : null;
      try{ forzada ? localStorage.setItem(KVISTA, forzada) : localStorage.removeItem(KVISTA); }catch(e){}
      if(!esCrossFit()){
        document.body.classList.remove('cf-modo');
        var f = document.getElementById('cfFlag'); if(f) f.remove();
        document.querySelectorAll('.cf-board').forEach(function(b){ b.remove(); });
      }
      if(typeof renderMain === 'function') renderMain();
      setTimeout(function(){ try{ modoDisciplina(); }catch(e){} }, 60);
      return forzada;
    },
    alternar: function(){
      return window.CoachVista.fijar(esCrossFit() ? 'musculacion' : 'crossfit');
    }
  };

  /* =========================================================
     2 · PIZARRA DE TEXTO PARA CROSSFIT
  ========================================================= */
  function fmtDe(txt){
    var t = String(txt || '');
    if(/\bamrap\b/i.test(t))  return { k:'amrap',   lb:'🟢 AMRAP' };
    if(/\bemom\b|\be\d+m?om\b|every\s*\d/i.test(t)) return { k:'emom', lb:'🔵 EMOM' };
    if(/\btabata\b/i.test(t)) return { k:'tabata',  lb:'🟡 TABATA' };
    if(/for\s*time|\brft\b|rounds?\s*for\s*time|chipper|\bladders?\b/i.test(t)) return { k:'fortime', lb:'🔴 FOR TIME' };
    return null;
  }
  function lineasDe(bl){
    var out = [];
    /* se recorre en el orden real del bloque: los títulos de fase quedan como cabeceras */
    bl.querySelectorAll('.ex-row, .wu-phase').forEach(function(r){
      if(r.classList.contains('wu-phase')){
        var t = r.textContent.replace(/\s+/g, ' ').trim();
        if(t) out.push({ nombre: t, det: '', head: true });
        return;
      }
      var n = r.querySelector('.ex-name');
      var d = r.querySelector('.ex-detail');
      var nombre = n ? (n.childNodes[0] ? n.childNodes[0].textContent : n.textContent) : r.textContent;
      out.push({ nombre: String(nombre || '').replace(/\s+/g, ' ').trim(),
                 det: d ? d.textContent.replace(/\s+/g, ' ').trim() : '' });
    });
    bl.querySelectorAll('.wb-line').forEach(function(l){
      var txt = l.textContent.replace(/\s+/g, ' ').trim().replace(/^\d+\s/, '');
      if(txt) out.push({ nombre: txt, det: '', head: l.classList.contains('head') });
    });
    return out.filter(function(x){ return x.nombre; });
  }
  function escTxt(s){ var d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML; }

  document.addEventListener('input', function(e){
    var i = e.target.closest('[data-cfk]'); if(!i) return;
    state.scores = state.scores || {};
    state.scores[i.dataset.cfk] = i.value;
    saveProgress();
    var ok = document.querySelector('[data-cfok="' + i.dataset.cfk + '"]');
    if(ok) ok.textContent = i.value ? '✓ guardado' : '';
  });

  function modoDisciplina(){
    var cf = esCrossFit();
    document.body.classList.toggle('cf-modo', cf);
    if(!cf) return;
    /* directiva ("Eliminación de chip residual") -- el badge de sesión
       CrossFit (#cfFlag, insertado como primer hijo
       de #mainContent) quedaba como texto residual encima de la Pizarra
       Táctica moderna (.jp-cfboard/pizarraSports()): el bloque debe pasar
       directo de la fila S1-S4 al acordeón de Briefing del Coach, sin
       ningún cartel intermedio. Se retira sólo la inserción del badge --
       el resto de modoDisciplina() (cf-modo en <body> + fallback de
       pizarraTexto() para bloques legado sin .wod-board) sigue intacto. */
    var f0 = document.getElementById('cfFlag'); if(f0) f0.remove();
    document.querySelectorAll('.block').forEach(function(bl){
      if(bl.querySelector('.wod-board')) return;   /* el MetCon ya tiene su pizarra */
      pizarraTexto(bl);
    });
  }

  /* =========================================================
     3 · MENÚ SUPERIOR FIJO
  ========================================================= */
  function clickSeguro(sel){
    var el = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if(el){ el.click(); return true; }
    return false;
  }
  /* el desplegable se retiró: todas las herramientas viven en la barra superior.
     Se conserva accion() porque los botones directos la reutilizan. */
  function menu(){
    if(true) return;
    var host = document.querySelector('.hd-actions') || document.querySelector('.masthead');
    if(!host) return;
    var m = document.createElement('div');
    m.className = 'jp-menu'; m.id = 'jpMenu';
    m.innerHTML =
      '<button type="button" class="mb" id="jpMenuBtn">🧰 Herramientas <span class="car">▾</span></button>' +
      '<div class="mlist">' +
        '<div class="mh">Cálculo y carga</div>' +
        '<button type="button" data-m="rm"><i>📊</i>%1RM · Calculadora</button>' +
        '<button type="button" data-m="marcas"><i>🏆</i>Mis Marcas y récords</button>' +
        '<button type="button" data-m="discos"><i>🔥</i>Serie de Aproximación</button>' +
        '<div class="sep"></div>' +
        '<div class="mh">Entrenamiento</div>' +
        '<button type="button" data-m="timer"><i>⏱️</i>Custom WOD Timer</button>' +

        '<button type="button" data-m="pausa"><i>⏸</i>Pausar sesión</button>' +
        '<div class="sep"></div>' +
        '<div class="mh">Ayuda</div>' +
        '<button type="button" data-m="vista"><i>🔁</i>Cambiar vista de la rutina</button>' +
        '<button type="button" data-m="manual"><i>📖</i>Manual de uso</button>' +
        '<button type="button" data-m="guia"><i>❓</i>Guía metodológica</button>' +
      '</div>';
    host.appendChild(m);
    var btn = m.querySelector('#jpMenuBtn');
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      m.classList.toggle('on');
      try{ if(navigator.vibrate) navigator.vibrate(15); }catch(x){}
    });
    document.addEventListener('click', function(e){
      if(!e.target.closest('#jpMenu')) m.classList.remove('on');
    });
    m.querySelector('.mlist').addEventListener('click', function(e){
      var b = e.target.closest('[data-m]'); if(!b) return;
      m.classList.remove('on');
      accion(b.dataset.m);
    });
  }
  function accion(k){
    if(k === 'rm')      return clickSeguro('#calcBtn');
    if(k === 'marcas')  return clickSeguro('#prHubBtn');
    if(k === 'discos')  return window.CoachHerramientas && window.CoachHerramientas.abrir(bloqueVisible());
    if(k === 'timer')   return window.CoachWodTimer && window.CoachWodTimer.abrir();
    if(k === 'pausa')   return window.CoachPausa && window.CoachPausa.alternar();
    if(k === 'guia')    return clickSeguro('#guideBtn');
    if(k === 'manual')  return abrirManual();
    if(k === 'vista'){
      var v = window.CoachVista.alternar();
      aviso('ok', '🔁', 'Vista cambiada',
        v === 'crossfit'
          ? 'Estás viendo la sesión en <b>formato pizarra de CrossFit</b>: texto limpio, cabeceras por color y glosario de videos al final.'
          : 'Estás viendo la sesión en <b>modo interactivo de musculación</b>: series, cargas, RIR y temporizadores.', 7000);
      return true;
    }

  }
  function bloqueVisible(){
    var bls = Array.prototype.slice.call(document.querySelectorAll('.block'));
    var mejor = null, top = 1e9;
    bls.forEach(function(b){
      var r = b.getBoundingClientRect();
      if(r.bottom < 0 || r.top > window.innerHeight) return;
      if(Math.abs(r.top) < top){ top = Math.abs(r.top); mejor = b; }
    });
    return mejor || bls[0] || null;
  }
  function nombreDe(bl){
    if(!bl) return 'Sesión';
    var ex = bl.querySelector('.ex-name, .cf-t');
    if(ex && ex.childNodes[0]) return (ex.childNodes[0].textContent || '').trim();
    var t = bl.querySelector('.block-label');
    return t ? t.textContent.trim() : 'Sesión';
  }

  /* =========================================================
     4 · CERO DOLOR CON EXPLICACIÓN CLARA
  ========================================================= */
  function reportarDolor(bl){
    var b = bl || bloqueVisible();
    var ex = nombreDe(b);
    if(window.CoachOutbox && window.CoachOutbox.encolar)

    try{ if(navigator.vibrate) navigator.vibrate([100, 50, 100]); }catch(e){}
    aviso('dolor', '🩹', 'Reporte enviado',
      '<b>Reporte de molestia enviado al Coach.</b> El sistema registrará la incidencia para adaptar tu próximo entrenamiento.' +
      '<br><br>Movimiento reportado: <b>' + escTxt(ex) + '</b>. Mientras tanto bajá la carga, acortá el rango y no fuerces el movimiento.', 11000);
    if(b){
      var nota = b.querySelector('.pain-note');
      if(nota){ nota.style.display = ''; nota.textContent = 'Reporte enviado a Coach JP — te va a llegar un reemplazo para este movimiento.'; }
      var pb = b.querySelector('.pain-btn');
      if(pb) pb.classList.add('on');
    }
    return true;
  }
  window.CoachCeroDolor = reportarDolor;

  /* el botón de cada bloque usa el mismo aviso */
  document.addEventListener('click', function(e){
    var p = e.target.closest('.pain-btn');
    if(!p) return;
    setTimeout(function(){
      var bl = p.closest('.block');
      if(p.classList.contains('on'))
        aviso('dolor', '🩹', 'Reporte enviado',
          '<b>Reporte de molestia enviado al Coach.</b> El sistema registrará la incidencia para adaptar tu próximo entrenamiento.', 10000);
    }, 30);
  }, true);

  /* =========================================================
     5 · AVISO DE GESTIÓN DE FATIGA (RIR 0)
  ========================================================= */
  document.addEventListener('click', function(e){
    var r = e.target.closest('[data-rir]');
    if(!r || r.dataset.rir !== '0') return;
    setTimeout(function(){
      aviso('fatiga', '🔋', 'Sugerencia de gestión de fatiga',
        'Llegar al fallo seguido acumula fatiga sin sumar estímulo. <b>Mantené la carga o descontá un 5% si perdés técnica.</b>' +
        '<br><br>Si el RIR 0 se repite en varios bloques, Coach JP recibe el aviso y ajusta el volumen de la semana.', 10000);
    }, 40);
  }, true);

  /* =========================================================
     6 · BLOQUE COMPLETADO Y PASO AUTOMÁTICO
     FIX (pedido 38, bug reportado: "cada vez que tilda una serie, el
     bloque se cierra y la vista salta abruptamente abajo de todo"):
     ANTES, tildar la ÚLTIMA serie de un bloque disparaba en cascada: (a)
     setBlockDone() + tildar sola la casilla de "bloque hecho" del
     header — lo que a su vez hacía que OTROS dos módulos independientes
     (el acordeón de la línea ~18395 y "el bloque terminado se pliega
     solo" de la línea ~16260) trataran el bloque como "completo" y le
     agregaran display:none a su cuerpo — y (b) un scrollIntoView()
     explícito hacia el bloque siguiente, el salto brusco reportado.
     AHORA: tildar series solo deja feedback cosmético (brillo + insignia
     "✅ Bloque completado" + vibración + el cartelito "vamos a…"),
     nunca marca el bloque como oficialmente terminado ni mueve el
     scroll. Marcar el bloque como terminado de verdad — lo único que
     ahora puede colapsarlo (ver los dos módulos de más abajo, también
     corregidos en este mismo pedido) — vuelve a ser EXCLUSIVAMENTE la
     casilla del header (.block-done-cb), tildada a mano por el
     alumno. */
  function marcarCompleto(bl){
    if(!bl || bl.classList.contains('jp-done')) return false;
    bl.classList.add('jp-done');
    if(!bl.querySelector('.done-badge')){
      var b = document.createElement('div');
      b.className = 'done-badge';
      b.innerHTML = '✅ Bloque completado';
      var body = bl.querySelector('.block-body') || bl;
      body.insertBefore(b, body.firstChild);
    }
    try{ if(navigator.vibrate) navigator.vibrate([30, 40, 60]); }catch(e){}
    return true;
  }
  function siguienteBloque(bl){
    var bls = Array.prototype.slice.call(document.querySelectorAll('.block'));
    var i = bls.indexOf(bl);
    for(var j = i + 1; j < bls.length; j++){
      if(!bls[j].classList.contains('jp-done')) return bls[j];
    }
    return null;
  }
  function avanzar(bl){
    /* solo el cartel "vamos a…" — SIN scrollIntoView: mover la pantalla
       sola mientras el alumno sigue tildando series es exactamente el
       salto brusco que reportó el coach. La navegación entre bloques
       queda en manos del alumno. */
    var sig = siguienteBloque(bl);
    var hint = document.getElementById('nextHint');
    if(!hint) return;
    if(!sig){
      hint.querySelector('.tx').textContent = '¡Última serie! Sesión completa'; hint.classList.add('on');
      setTimeout(function(){ hint.classList.remove('on'); }, 3200);
      return;
    }
    hint.querySelector('.tx').textContent = 'Bloque completado — vamos a ' + nombreDe(sig).slice(0, 28);
    hint.classList.add('on');
    setTimeout(function(){ hint.classList.remove('on'); }, 3400);
  }
  function revisarBloque(bl){
    if(!bl) return;
    var checks = bl.querySelectorAll('.set-check');
    if(!checks.length) return;
    var todas = Array.prototype.every.call(checks, function(c){ return c.checked; });
    if(!todas){ bl.classList.remove('jp-done');
      var b = bl.querySelector('.done-badge'); if(b) b.remove(); return; }
    if(marcarCompleto(bl)) avanzar(bl);
  }
  document.addEventListener('change', function(e){
    var c = e.target.closest('.set-check'); if(!c) return;
    setTimeout(function(){ revisarBloque(c.closest('.block')); }, 120);
  }, true);

  /* =========================================================
     6b · EL SCROLL NO SE MUEVE SOLO AL TILDAR UNA SERIE
     FIX (pedido 38, bug reportado: "la vista hace un scroll brusco y se
     va abajo de todo la pantalla" al tildar un checkbox). Causa: varios
     módulos independientes de este archivo reaccionan al mismo evento
     change de .set-check/.block-done-cb reconstruyendo porciones del DOM
     (el más notorio: el armado de rondas de bisets/trisets, que remueve
     y vuelve a insertar filas enteras en cada repintado). Ese vaivén de
     nodos, sumado al "scroll anchoring" nativo del navegador, terminaba
     recalculando el scroll del alumno lejos de donde estaba parado. En
     vez de perseguir cada módulo que reordena DOM, se fija la posición
     de scroll en el instante exacto del tilde y se la vuelve a imponer
     cuadro a cuadro (requestAnimationFrame) mientras dura el repintado.
     Se cancela de inmediato si el alumno mueve el dedo o la rueda a
     propósito, para nunca pelear contra un scroll real del usuario.

     REFUERZO (pedido 39, el bug seguia pasando en el archivo exportado
     abierto en un navegador real, aunque en pruebas automatizadas con
     eventos sinteticos ya no aparecia). Causa raiz encontrada: algunos
     navegadores mueven el scroll de forma nativa para acercar el
     elemento tocado a la pantalla ANTES de que dispare el evento change
     (por ejemplo al enfocar un checkbox parcialmente tapado por el
     encabezado o por el menu inferior fijos). Ese primer salto nativo
     ocurria antes de que este modulo llegara a fijar la posicion, asi
     que quedaba sin corregir. Ahora la posicion se captura apenas
     empieza el toque (pointerdown, mousedown, touchstart o focus sobre
     la serie), no recien en el change, y el evento change solo extiende
     la ventana de proteccion por si el repintado en cascada tarda mas
     que el gesto de tocar en si. */
  (function(){
    var lock = null, raf = null, limite = 0, touchXY = null;
    function cancelar(){
      if(raf) cancelAnimationFrame(raf);
      raf = null; lock = null; touchXY = null;
      document.removeEventListener('wheel', cancelar, true);
      document.removeEventListener('touchmove', alTocarMover, true);
    }
    function alTocarMover(e){
      // Solo cancela si el dedo realmente se desplazo a proposito (scroll
      // intencional); el micro-temblor normal de un toque sobre la casilla
      // no debe deshacer la proteccion.
      if(!touchXY || !e.touches || !e.touches[0]){ cancelar(); return; }
      var dx = Math.abs(e.touches[0].clientX - touchXY.x);
      var dy = Math.abs(e.touches[0].clientY - touchXY.y);
      if(dx > 10 || dy > 10) cancelar();
    }
    function paso(){
      if(!lock) return;
      if(performance.now() > limite){ cancelar(); return; }
      if(Math.abs(window.scrollY - lock.y) > 2 || Math.abs(window.scrollX - lock.x) > 2){
        window.scrollTo(lock.x, lock.y);
      }
      raf = requestAnimationFrame(paso);
    }
    function esSerie(t){
      if(!t || !t.closest) return false;
      return !!(t.closest('.set-check') || (t.classList && t.classList.contains('block-done-cb')));
    }
    function armar(e, ventanaMs){
      if(!esSerie(e.target)) return;
      if(!lock){
        lock = { x: window.scrollX, y: window.scrollY };
        document.addEventListener('wheel', cancelar, { capture:true, passive:true, once:true });
      }
      limite = Math.max(limite, performance.now() + ventanaMs);
      if(!raf) raf = requestAnimationFrame(paso);
    }
    document.addEventListener('pointerdown', function(e){ armar(e, 260); }, true);
    document.addEventListener('mousedown', function(e){ armar(e, 260); }, true);
    document.addEventListener('focus', function(e){ armar(e, 260); }, true);
    document.addEventListener('touchstart', function(e){
      if(!esSerie(e.target)) return;
      touchXY = (e.touches && e.touches[0]) ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
      armar(e, 260);
      document.addEventListener('touchmove', alTocarMover, { capture:true, passive:true });
    }, true);
    document.addEventListener('change', function(e){ armar(e, 260); }, true);
  })();

  /* =========================================================
     7 · MANUAL DE USO
  ========================================================= */
  function abrirManual(){
    var w = document.getElementById('manWrap'); if(!w) return;
    w.classList.add('on');
    try{ if(navigator.vibrate) navigator.vibrate(15); }catch(e){}
    try{
      localStorage.setItem('coachjp_manual_visto', '1');
      localStorage.setItem('has_seen_onboarding', 'true');
    }catch(e){}
  }
  function cerrarManual(){ var w = document.getElementById('manWrap'); if(w) w.classList.remove('on'); }
  window.CoachManual = { abrir: abrirManual, cerrar: cerrarManual };

  /* =========================================================
     8 · DECIMALES EN TODOS LOS CAMPOS DE CARGA
     12vo pedido (26/08) — este módulo ya venía asegurando step/inputmode,
     pero eso NO alcanza: type="number" sigue rechazando la coma como
     separador decimal (el spec de HTML solo reconoce el punto), así que un
     alumno que escribe "87,5" seguía sin poder tipearla. Ahora convierte el
     campo a type="text" (una sola vez, con dataset.pesoFix como guarda de
     idempotencia — este módulo se re-corre en cada repintado vía
     CoachRepaintBus) y le cablea el mismo saneador que usan los campos
     .set-kg (sanearPeso/sanearReps, definidos más arriba junto a
     renderSetRows). El resto de los listeners propios de cada campo
     (.ph-edit, #tmKg, #phKg — cada uno con su propia lógica en otro
     módulo) siguen intactos: acá solo se limpia el .value ANTES de que
     esos otros lean, no se reemplaza su comportamiento.
  ========================================================= */
  function decimales(){
    document.querySelectorAll('.set-kg, .ph-edit, #tmKg, #phKg, #calcWeight, .cf-score-in, input[type="number"]').forEach(function(i){
      if(i.classList.contains('set-reps') || i.classList.contains('ph-rp') || i.id === 'calcReps') return;
      var ph = (i.placeholder || '').toLowerCase();
      var esPeso = i.classList.contains('set-kg') || i.classList.contains('ph-edit') ||
                   i.id === 'tmKg' || i.id === 'phKg' || i.id === 'calcWeight' || /kg|lbs|peso|carga/.test(ph);
      if(!esPeso) return;
      if(i.dataset.pesoFix) return;
      i.dataset.pesoFix = '1';
      if(i.type === 'number') i.type = 'text';
      if(!i.getAttribute('inputmode')) i.setAttribute('inputmode', 'decimal');
      if(typeof sanearPeso === 'function' && i.value) i.value = sanearPeso(i.value);
      i.addEventListener('input', function(){
        if(typeof sanearPeso !== 'function') return;
        var limpio = sanearPeso(i.value);
        if(limpio !== i.value) i.value = limpio;
      });
    });
    /* mismo trato para los campos de reps que NO son .set-reps (ese ya se
       sanea en su propio wireBlockInteractions) — hoy solo #phRp/.ph-rp. */
    document.querySelectorAll('#phRp, .ph-rp, #calcReps').forEach(function(i){
      if(i.dataset.repsFix) return;
      i.dataset.repsFix = '1';
      if(i.type === 'number') i.type = 'text';
      if(!i.getAttribute('inputmode')) i.setAttribute('inputmode', 'numeric');
      if(typeof sanearReps === 'function' && i.value) i.value = sanearReps(i.value);
      i.addEventListener('input', function(){
        if(typeof sanearReps !== 'function') return;
        var limpio = sanearReps(i.value);
        if(limpio !== i.value) i.value = limpio;
      });
    });
  }

  /* =========================================================
     9 · MONTAJE
  ========================================================= */
  function repintar(){
    try{ modoDisciplina(); decimales(); menu(); }catch(e){}
  }
  function mount(){
    menu();
    var manOkBtn = document.getElementById('manOk');
    if(manOkBtn && typeof generoTxt === 'function'){
      manOkBtn.textContent = generoTxt('Listo, a entrenar', 'Lista, a entrenar');
    }
    document.getElementById('manX').addEventListener('click', cerrarManual);
    document.getElementById('manOk').addEventListener('click', cerrarManual);
    document.getElementById('manWrap').addEventListener('click', function(e){
      if(e.target.id === 'manWrap') cerrarManual();
    });
    var t = document.getElementById('jpToast');
    if(t) t.addEventListener('click', function(e){
      if(!e.target.closest('[data-cerrar]')) return;
      /* Entendido: el aviso de bienvenida no se muestra nunca más */
      if(t.dataset.jpOnb === '1'){
        try{
          localStorage.setItem('has_seen_onboarding', 'true');
          localStorage.setItem('coachjp_manual_visto', '1');
        }catch(err){}
        t.dataset.jpOnb = '';
      }
      cerrarAviso();
    });
    repintar();
    var main = document.getElementById('mainContent') || document.body;
    var pend = false, propio = false;
    window.CoachRepaintBus.register(function(){
      if(pend || propio) return;
      pend = true;
      setTimeout(function(){
        pend = false; propio = true;
        try{ repintar(); }catch(e){}
        setTimeout(function(){ propio = false; }, 140);
      }, 110);
    }, main);
    if(typeof window.renderMain === 'function'){
      var _rm = window.renderMain;
      window.renderMain = function(){
        var r = _rm.apply(this, arguments);
        setTimeout(repintar, 80);
        setTimeout(repintar, 320);
        return r;
      };
    }
    /* la primera vez, y SOLO la primera vez, el manual se ofrece solo.
       Se marca al tocar Entendido, al abrir el manual o al cerrar el aviso. */
    var visto = null;
    try{
      visto = localStorage.getItem('has_seen_onboarding') || localStorage.getItem('coachjp_manual_visto');
    }catch(e){ visto = '1'; }
    /* directiva ("Refactor final"): el cartel de bienvenida con "Entendido" se retira (el Manual sigue en Herramientas) */
    if(false && !visto) setTimeout(function(){
      var tt = document.getElementById('jpToast');
      if(tt) tt.dataset.jpOnb = '1';
      aviso('ok', '📖', (typeof generoTxt === 'function' ? generoTxt('¡Bienvenido!', '¡Bienvenida!') : 'Primera vez por acá'),
        'Tenés el <b>Manual de Uso</b> en el menú 🧰 Herramientas: te explica en 5 pasos cómo cargar tus marcas, usar el timer, reportar molestias y compartir tu Story Card.', 0);
      /* si se cierra solo por inactividad, tampoco vuelve a aparecer */
      setTimeout(function(){
        try{ localStorage.setItem('has_seen_onboarding', 'true'); }catch(err){}
      }, 15000);
    }, 2200);
    window.CoachUX = { modo: modoDisciplina, aviso: aviso, manual: abrirManual,
                       dolor: reportarDolor, avanzar: revisarBloque, repintar: repintar };
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(mount, 120); });
  else setTimeout(mount, 120);
})();
