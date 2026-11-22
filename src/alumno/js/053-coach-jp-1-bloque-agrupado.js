/* =========================================================
   COACH JP · 1 · BLOQUE AGRUPADO COMO UNIDAD DE LECTURA
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
  function letra(i){ return String.fromCharCode(65 + i); }

  function agrupado(b, bl){
    if(document.body.classList.contains('cf-modo')) return false;
    if(!b) return false;
    if(b.isSuperset || b.grouped) return true;
    return !!(b.coreBlock && bl.querySelectorAll('.set-tracker').length > 1);
  }
  function intensidad(){
    try{
      var wm = WEEKS_META[state.currentWeek] || {};
      return wm.rpe || '';
    }catch(e){ return ''; }
  }
  /* Regla estricta del Tempo (bisets/rondas): un tempo "vacio" no debe
     mostrar la palabra Tempo ni el separador -- solo las reps. Cubre
     null/undefined, string vacio, guion suelto, cero literal y el
     string literal 'undefined' (por si algun dato viejo quedo asi). */
  function tempoValido(t){
    if(t == null) return false;
    var s = String(t).trim();
    if(s === '' || s === '-' || s === '0' || s === 'undefined') return false;
    return true;
  }
  /* directiva de pulido (parser de unidades): si el campo de reps ya trae
     una unidad de distancia/tiempo pegada a un número ("20 metros", "30
     seg", "400m", "1 min"), no hay que sumarle "REPS" atrás -- eso es lo
     que generaba "20 metros REPS". Sólo cuenta cuando el número precede
     directamente al token de unidad (evita falsos positivos con "12 reps"
     o "10-12", que no traen ninguna unidad pegada). */
  function esUnidadNoRep(s){
    if(s == null) return false;
    return /\d\s*(metros?|minutos?|min|segundos?|seg|km|m|s)\b/i.test(String(s));
  }

  /* Catalogo de tecnicas de intensidad (mismo set que el modulo de
     prescripcion mas arriba en el archivo -- se repite acá porque cada
     modulo de este export es un IIFE independiente, sin helpers
     compartidos, siguiendo el mismo criterio que esc()/letra() de acá
     abajo). Campo opcional y aditivo (ex.metodologia por estacion del
     biset/triset): sin valor no se agrega nada. */
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

  /* 09/09 -- blindaje "un solo bucle de rondas": si por cualquier motivo
     (una excepción a mitad de conversión, un repintado que llegó fuera de
     orden, etc.) sobrevive algo del render viejo -- .ex-row / .set-tracker
     sueltos, o más de un .bs-wrap -- en un bloque que YA tiene su acordeón
     armado, se descarta acá. Nunca deben convivir las dos representaciones
     de las rondas en el mismo bloque. */
  function limpiarResiduos(bl){
    [].slice.call(bl.querySelectorAll('.block-body > .ex-row, .block-body > .set-tracker')).forEach(function(n){ n.remove(); });
    [].slice.call(bl.querySelectorAll('.bs-wrap')).forEach(function(w, i){ if(i > 0) w.remove(); });
  }
  function unificar(){
    document.querySelectorAll('.block').forEach(function(bl){
      try{
      var b = bloqueDe(bl.dataset.blockId);
      if(!agrupado(b, bl)){ bl.classList.remove('bs-uni'); return; }
      /* ya convertido: sólo se refresca el estado de las rondas (más el
         blindaje de residuos de arriba) */
      if(bl.querySelector('.bs-wrap')){ limpiarResiduos(bl); estado(bl); return; }
      var trackers = [].slice.call(bl.querySelectorAll('.set-tracker'));
      var filas = [].slice.call(bl.querySelectorAll('.ex-row'));
      if(trackers.length < 2) return;

      var lista = (b.exercises || []).map(function(x, i){
        var row = filas[i];
        var nombre = row ? (row.querySelector('.ex-name') || {}) : {};
        return { name: x.name || (nombre.textContent || '').trim(),
                 nameEn: x.nameEn || '',
                 /* formato tactico oficial (2026-09): "10-12 REPS" o, con
                    tempo real, "10-12 REPS · TEMPO 2011" -- mayusculas,
                    sin el emoji de objetivo que tenia antes (el pedido de
                    branding fue "capsula limpia", no un icono). */
                 det: x.reps ? (x.reps + (esUnidadNoRep(x.reps) ? '' : ' REPS') + (tempoValido(x.tempo) ? ' · TEMPO ' + x.tempo : '')) : '',
                 tecnica: tecnicaBadgeTexto(x.metodologia),
                 row: row, tracker: trackers[i],
                 /* la lista se congela antes de mover nada: si no, los índices se corren */
                 filas: trackers[i] ? [].slice.call(trackers[i].querySelectorAll('.set-row')) : [] };
      });
      if(lista.length < 2) return;

      var rondas = Math.max.apply(null, lista.map(function(x){ return x.filas.length; }));
      if(!(rondas > 0)) return;
      var cuerpo = bl.querySelector('.block-body');
      if(!cuerpo) return;

      var wrap = document.createElement('div');
      wrap.className = 'bs-wrap';

      /* 4 · contenedor compacto de los ejercicios del bloque */
      var caja = document.createElement('div');
      caja.className = 'bs-ex';
      lista.forEach(function(x, i){
        var e = document.createElement('div');
        e.className = 'bs-e';
        /* 09/09 -- "Ref previa: 80 kg × 10" también en el roster del biset:
           el .ex-row original (donde vive el mismo chip, ver renderBlockInner)
           se descarta más abajo al convertir a acordeón, así que sin esto
           el dato de referencia desaparecía justo en el layout donde más
           bisets/trisets hay. Mismo helper (refPreviaHtml), misma fuente. */
        e.innerHTML = '<span class="bs-l">' + letra(i) + '</span>' +
          '<span class="bs-n">' + esc(x.name) + '</span>' +
          (x.det ? '<span class="bs-d">' + esc(x.det) + '</span>' : '') +
          (x.tecnica ? '<span class="jp-tecnica-badge">' + esc(x.tecnica) + '</span>' : '') +
          (typeof refPreviaHtml === 'function' ? refPreviaHtml(state.currentWeek || 0, state.currentDay, bl.dataset.blockId || '', i, x.filas.length) : '');
        /* el botón de video viaja con su nombre, sin duplicarse */
        var vl = x.row ? x.row.querySelector('.video-link') : null;
        if(vl) e.querySelector('.bs-n').appendChild(vl);
        caja.appendChild(e);
      });
      wrap.appendChild(caja);

      /* 5 · rondas conjuntas: cada ronda trae las dos o tres estaciones seguidas */
      for(var r = 0; r < rondas; r++){
        var caj = document.createElement('div');
        caj.className = 'bs-r';
        caj.dataset.ronda = String(r + 1);
        /* 05/09 — acordeón activo inteligente: sólo la ronda en curso viaja
           expandida; el resto se pliega a una barra de una línea (RONDA N ·
           [estado] ▾) hasta que le toca su turno o el alumno la toca para
           revisarla (ver estado() y el listener de .bs-rh más abajo).
           09/09 -- "Ronda N" pasa a vivir en su propio span (.bs-rtitle,
           white-space:nowrap) en una fila propia (.bs-rh-top) junto con el
           estado/chevron; "N estaciones sin pausa" baja a una segunda línea
           propia y atenuada. En 390px, "Ronda N" como texto suelto dentro
           del flex-row se quebraba en dos líneas ("RONDA" / "1") y el "1"
           terminaba pegado a la línea de "estaciones sin pausa" -- se leía
           como "1 2 estaciones sin pausa". Ver CSS de .bs-rh más abajo. */
        caj.innerHTML = '<div class="bs-rh"><div class="bs-rh-top">' +
          '<span class="bs-rtitle">Ronda ' + (r + 1) + '</span>' +
          '<span class="bs-rst"></span><span class="bs-chev"></span></div>' +
          '<span class="bs-rn">' + lista.length + ' estaciones sin pausa</span></div>';
        lista.forEach(function(x, i){
          var row = x.filas ? x.filas[r] : null;
          if(!row) return;
          var f = document.createElement('div');
          f.className = 'bs-fila';
          /* pulido (directiva "trisets/unidades/háptica"): el roster de
             arriba (.bs-ex) sigue siendo la fuente única del nombre/video/
             prescripción completos, pero pedirle al alumno que scrollee
             hasta ahí en medio de una ronda para recordar qué estación
             está haciendo (B, C...) resultó peor que la redundancia mínima
             que se había evitado en 08/09 -- se reincorpora un mini-nombre
             chico (.bs-fila-nm, sólo texto, sin video ni prescripción) en
             la cabecera de cada fila de ronda. Nombre distinto de .bs-nm
             a propósito: videosEnEstaciones() (más abajo, módulo aparte)
             sigue buscando esa clase vieja para no reinyectar el botón de
             video acá, que ya vive una sola vez en el roster. */
          f.innerHTML = '<div class="bs-fila-head"><span class="bs-l">' + letra(i) + '</span>' +
            '<span class="bs-fila-nm">' + esc(x.name) + '</span></div>';
          f.appendChild(row);                       /* se mueve la fila real: conserva su data-set-key */
          caj.appendChild(f);
        });
        var cerrar = document.createElement('button');
        cerrar.type = 'button';
        cerrar.className = 'bs-cerrar';
        cerrar.dataset.bsRonda = String(r + 1);
        cerrar.textContent = '✓ Cerrar ronda ' + (r + 1);
        caj.appendChild(cerrar);
        wrap.appendChild(caj);
        /* hidratación desde estado guardado: si la ronda ya venía completa
           (checks tildados de una sesión previa), se marca bs-lista ACÁ,
           antes del primer estado(bl) de abajo -- si no, ese primer
           estado() la vería pasar de "no lista" a "lista" como si se
           acabara de cerrar recién ahora y dispararía el reloj de
           descanso apenas se abre la app. */
        var checksHidratados = [].slice.call(caj.querySelectorAll('.set-check'));
        if(checksHidratados.length && checksHidratados.every(function(c){ return c.checked; })){
          caj.classList.add('bs-lista');
        }
      }

      /* las filas viejas y los trackers vacíos ya no hacen falta */
      lista.forEach(function(x){
        if(x.row && x.row.parentNode) x.row.remove();
        if(x.tracker && x.tracker.parentNode && !x.tracker.querySelector('.set-row')) x.tracker.remove();
        if(x.tracker && x.tracker.parentNode && !x.tracker.children.length) x.tracker.remove();
      });

      /* 3 · resumen de intensidad sugerida */
      var rpe = intensidad();
      if(rpe && !bl.querySelector('.bs-rpe')){
        var caj2 = document.createElement('div');
        caj2.className = 'bs-rpe';
        caj2.innerHTML = '<b>Sugerido</b><span>' + esc(rpe) + '</span>';
        wrap.insertBefore(caj2, wrap.firstChild);
      }

      var ancla = bl.querySelector('.blk-tag');
      if(ancla && ancla.nextSibling) cuerpo.insertBefore(wrap, ancla.nextSibling);
      else cuerpo.insertBefore(wrap, cuerpo.firstElementChild);
      bl.classList.add('bs-uni');
      estado(bl);
      }catch(e){ /* un bloque roto no debe tumbar la conversión del resto */ }
    });
  }

  /* ronda activa, ronda cerrada y texto del botón */
  function estado(bl){
    var pend = null;
    var cajas = [].slice.call(bl.querySelectorAll('.bs-r'));
    cajas.forEach(function(caj){
      var checks = [].slice.call(caj.querySelectorAll('.set-check'));
      var lista = checks.length > 0 && checks.every(function(c){ return c.checked; });
      var eraLista = caj.classList.contains('bs-lista');
      caj.classList.toggle('bs-lista', lista);
      caj.classList.remove('bs-activa');
      if(!lista && !pend) pend = caj;
      var btn = caj.querySelector('.bs-cerrar');
      if(btn){
        var t = lista ? '✓ Ronda ' + caj.dataset.ronda + ' completa'
                      : '✓ Cerrar ronda ' + caj.dataset.ronda;
        if(btn.textContent !== t) btn.textContent = t;
      }
      /* acordeón activo inteligente: al completarse recién ahora (por los
         checks o por "Cerrar ronda"), se limpia cualquier apertura manual
         para que la ronda colapse sola y ceda el lugar a la siguiente.
         AUDITORÍA DE CHECKBOXES (directiva 12): esto se hacía en el mismo
         tick del tilde que completaba la ronda, así que la fila entera
         (incluido el checkbox recién marcado) se ocultaba de inmediato por
         el display:none de la fila colapsada (ver regla CSS .bs-r:not(.bs-abierta) .bs-fila)
         -- el alumno ni llegaba a ver el check en verde y, si se arrepentía,
         el checkbox "desaparecía" en vez de permitir destildarlo, lo que
         se percibía como un checkbox roto. Se da un respiro de 900ms para
         que el tilde final quede visible antes de plegar la ronda sola; si
         en ese ínterin el alumno la destilda, el colapso se cancela solo
         (se vuelve a chequear bs-lista antes de aplicar). */
      if(lista && !eraLista){
        caj.dataset.bsAbierta = '1';
        /* FASE 2.3 -- este es el ÚNICO punto donde una ronda pasa de
           "no lista" a "lista" (ya sea tildando cada estación a mano o
           usando el botón "Cerrar Ronda"), así que es acá donde vive el
           disparador del reloj de descanso -- no en el listener de
           .bs-cerrar (ver más abajo), que de otro modo nunca se ejecuta
           si el alumno tilda la última estación a mano en vez de tocar
           el botón. */
        if(typeof window.jpArrancarDescansoRonda === 'function'){
          window.jpArrancarDescansoRonda(bl, caj);
        }
        setTimeout(function(){
          if(caj.classList.contains('bs-lista')) delete caj.dataset.bsAbierta;
          var blRef = caj.closest('.block');
          if(blRef) estado(blRef);
        }, 900);
      }
    });
    if(pend) pend.classList.add('bs-activa');
    cajas.forEach(function(caj){
      var activa = caj.classList.contains('bs-activa');
      var abierta = activa || caj.dataset.bsAbierta === '1';
      caj.classList.toggle('bs-abierta', abierta);
      var st = caj.querySelector('.bs-rst');
      if(st){
        var t2 = activa ? '[En curso]' : (caj.classList.contains('bs-lista') ? '[Completa]' : '[Pendiente]');
        if(st.textContent !== t2) st.textContent = t2;
      }
      var chev = caj.querySelector('.bs-chev');
      if(chev){ var c2 = abierta ? '▾' : '▸'; if(chev.textContent !== c2) chev.textContent = c2; }
    });
  }
  /* tocar el encabezado de una ronda plegada la abre para revisarla (peek);
     la ronda activa queda siempre expandida y no se puede plegar a mano */
  document.addEventListener('click', function(e){
    var head = e.target.closest('.bs-r .bs-rh');
    if(!head) return;
    var caj = head.closest('.bs-r');
    if(!caj || caj.classList.contains('bs-activa')) return;
    caj.dataset.bsAbierta = caj.classList.contains('bs-abierta') ? '0' : '1';
    var bl = caj.closest('.block');
    if(bl) estado(bl);
  });

  /* cerrar la ronda tilda las estaciones que falten: el descanso arranca una sola vez
     FASE 2.3 -- este botón es ahora el ÚNICO disparador del reloj de
     descanso entre rondas (ver jpArrancarDescansoRonda(), módulo del
     reloj): el listener de .set-check individual ya no lo dispara solo,
     ni siquiera al tildar la última estación a mano. */
  document.addEventListener('click', function(e){
    var btn = e.target.closest('.bs-cerrar');
    if(!btn) return;
    var caj = btn.closest('.bs-r');
    var bl = btn.closest('.block');
    if(!caj) return;
    var checks = [].slice.call(caj.querySelectorAll('.set-check'));
    var faltan = checks.filter(function(c){ return !c.checked; });
    if(!faltan.length){
      window.__jpRondaCerrando = true;
      checks.forEach(function(c){ c.checked = false; c.dispatchEvent(new Event('change', { bubbles:true })); });
      window.__jpRondaCerrando = false;
      setTimeout(function(){ estado(bl); }, 60);
      return;
    }
    /* pulido háptico: pulso de éxito único al cerrar la ronda -- las
       marcas individuales que dispara este mismo cierre quedan en
       silencio (window.__jpRondaCerrando, ver listener de .set-check
       más arriba en el archivo) para no sumar varios buzz cortos
       encima del pulso de éxito. */
    try{ if(navigator.vibrate) navigator.vibrate([30, 50, 60]); }catch(err){}
    window.__jpRondaCerrando = true;
    /* las intermedias se marcan en silencio -- el reloj YA NO sale de acá */
    faltan.forEach(function(c, i){
      c.checked = true;
      c.dispatchEvent(new Event('change', { bubbles:true }));
    });
    window.__jpRondaCerrando = false;
    /* el reloj de descanso ya no se dispara acá -- lo dispara estado()
       apenas detecta la transición real a "ronda completa" (ver más
       arriba, bloque "lista && !eraLista"), sea que la ronda se haya
       completado con este botón o tildando cada estación a mano. */
    setTimeout(function(){ estado(bl); }, 80);
  });
  document.addEventListener('change', function(e){
    if(!e.target.closest('.bs-r .set-check')) return;
    var bl = e.target.closest('.block');
    setTimeout(function(){ if(bl) estado(bl); }, 50);
  });

  /* =========================================================
     2 · ORDEN AL PIE: OBJETIVO → COACH NOTE → NOTAS DEL ALUMNO
  ========================================================= */
  function orden(){
    document.querySelectorAll('.block .block-body').forEach(function(cuerpo){
      var obj = cuerpo.querySelector(':scope > .block-insights');
      var notas = cuerpo.querySelector(':scope > .block-notes');
      var coach = [].slice.call(cuerpo.querySelectorAll(':scope > .coach-note'));
      if(!obj && !coach.length && !notas) return;
      if(obj && cuerpo.lastElementChild !== obj) cuerpo.appendChild(obj);
      coach.forEach(function(c){ cuerpo.appendChild(c); });
      if(notas) cuerpo.appendChild(notas);
    });
  }

  function repintar(){
    try{ unificar(); orden(); }catch(e){}
    /* este módulo corre último: se reordena la entrada en calor para que no
       quede a medio limpiar por el repintado de los bloques agrupados */
    try{ if(window.CoachWarmUp && window.CoachWarmUp.repintar) window.CoachWarmUp.repintar(); }catch(e){}
    /* y se vuelve a pasar la depuración fina: nada de píldoras con un punto solo */
    try{ if(window.CoachDescanso && window.CoachDescanso.limpiarWarmUp) window.CoachDescanso.limpiarWarmUp(); }catch(e){}
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
        setTimeout(function(){ propio = false; }, 200);
      }, 190);
    }, main);
    if(typeof window.renderMain === 'function'){
      var _rm = window.renderMain;
      window.renderMain = function(){
        var r = _rm.apply(this, arguments);
        /* 09/09 -- se convierte YA, en el mismo tick: así la pantalla nunca
           llega a pintar el bloque en su formato viejo (todas las rondas
           desplegadas) antes de que el acordeón lo reemplace. Los dos
           setTimeout de abajo se mantienen porque otros módulos siguen
           tocando el DOM un instante después de renderMain() (decorar,
           warm-up, etc.) y esta es la red de seguridad para eso. */
        try{ repintar(); }catch(e){}
        setTimeout(repintar, 340);
        setTimeout(repintar, 880);
        return r;
      };
    }
    window.CoachBloqueUni = { repintar: repintar, unificar: unificar, orden: orden, estado: estado };
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(mount, 600); });
  else setTimeout(mount, 600);
})();

/* =========================================================
   COACH JP · 3 · CUSTOM TIMER: FULLSCREEN LED + RULETA TÁCTIL
========================================================= */
(function(){
  var T = function(){ return window.CoachWodTimer || null; };
  function vib(p){ try{ if(navigator.vibrate) navigator.vibrate(p); }catch(e){} }
  function mmss(s){
    s = Math.max(0, Math.round(s));
    var m = Math.floor(s / 60), r = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
  }

  /* ---------------------------------------------------------
     A · STEPPERS RÁPIDOS + RULETA VERTICAL
  --------------------------------------------------------- */
  var PASOS = [
    { lb:'-10s', v:-10 }, { lb:'+10s', v:10 }, { lb:'+30s', v:30 }, { lb:'+1m', v:60 }
  ];
  function campoActivo(){
    var cfg = document.getElementById('cwtCfg');
    if(!cfg) return null;
    /* directiva ("Refactor integral del Timer Táctico") -- los campos ya
       no viven todos dentro de un <label data-f="...">: las pantallas
       específicas por modalidad (AMRAP/FOR TIME centrales, fila EMOM,
       fila TABATA) los agrupan en contenedores [data-modocfg="..."]. Se
       busca el ancestro que sea CUALQUIERA de los dos (label clásico,
       ej. Preparación, o el contenedor nuevo por modo) sin cambiar la
       lista de prioridad de campos de siempre. */
    var visible = [].slice.call(cfg.querySelectorAll('label, [data-modocfg]')).filter(function(l){
      return !l.classList.contains('hide') && getComputedStyle(l).display !== 'none';
    });
    var pref = ['cwtWork', 'cwtInt', 'cwtTotal', 'cwtRest', 'cwtCap'];
    for(var i = 0; i < pref.length; i++){
      var el = document.getElementById(pref[i]);
      if(!el) continue;
      var host = el.closest('label, [data-modocfg]');
      if(host && visible.indexOf(host) >= 0) return el;
    }
    return null;
  }
  /* campos que aceptan y muestran min:seg cuando pasan del minuto */
  var MMSS = { cwtInt:1, cwtWork:1, cwtRest:1 };
  function aMmss(seg){
    var m = Math.floor(seg / 60), s = seg % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  function leerSeg(el){
    if(!el) return 0;
    if(MMSS[el.id]){
      var p = String(el.value || '').split(':');
      return p.length > 1 ? (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0) : (parseInt(p[0], 10) || 0);
    }
    if(el.id === 'cwtTotal' || el.id === 'cwtCap') return (parseInt(el.value, 10) || 0) * 60;
    return parseInt(el.value, 10) || 0;
  }
  function escribirSeg(el, seg){
    if(!el) return;
    seg = Math.max(el.id === 'cwtRest' || el.id === 'cwtCap' ? 0 : 5, Math.min(3600, seg));
    if(el.id === 'cwtInt'){
      el.value = aMmss(seg);
    } else if(el.id === 'cwtWork' || el.id === 'cwtRest'){
      /* menos de un minuto: segundos pelados. Del minuto en adelante: 1:01 */
      el.value = seg >= 60 ? aMmss(seg) : String(seg);
    } else if(el.id === 'cwtTotal' || el.id === 'cwtCap'){
      el.value = Math.max(el.id === 'cwtCap' ? 0 : 1, Math.round(seg / 60));
    } else {
      el.value = seg;
    }
    el.dispatchEvent(new Event('input', { bubbles:true }));
  }
  /* si el coach escribe 90 a mano, al salir del campo se normaliza a 1:30 */
  function normalizarMmss(){
    ['cwtWork', 'cwtRest'].forEach(function(id){
      var el = document.getElementById(id);
      if(!el || el.__jpMmss) return;
      el.__jpMmss = 1;
      el.addEventListener('change', function(){
        var seg = leerSeg(el);
        var min = (id === 'cwtRest') ? 0 : 1;
        seg = Math.max(min, Math.min(3600, seg));
        el.value = seg >= 60 ? aMmss(seg) : String(seg);
      });
    });
  }
  function steppers(){
    var cfg = document.getElementById('cwtCfg');
    if(!cfg || document.getElementById('cwtSteps')) return;
    var box = document.createElement('div');
    box.className = 'cwt-steps'; box.id = 'cwtSteps';
    /* directiva ("Refactor total del Cronómetro de Box") -- se saca el
       botón 🎡 Ruleta del ajuste rápido: los pasos numéricos (-10s/+10s/
       +30s/+1m) ya cubren el mismo caso de uso de forma más directa,
       sin un selector de rueda superpuesto. ruleta()/rollo() quedan sin
       invocar (no se borran: otro módulo externo podría referenciarlas,
       mismo criterio de bajo riesgo que ya usa el archivo con código
       legado sin uso, ver buildRoundTimer()). */
    box.innerHTML = '<span class="cwt-sl" id="cwtStepLb">Ajuste rápido</span>' +
      PASOS.map(function(p){ return '<button type="button" data-cwtstep="' + p.v + '">' + p.lb + '</button>'; }).join('');
    cfg.parentNode.insertBefore(box, cfg.nextSibling);
    box.addEventListener('click', function(e){
      var s = e.target.closest('[data-cwtstep]');
      if(s){
        var el = campoActivo();
        if(!el) return;
        escribirSeg(el, leerSeg(el) + parseInt(s.dataset.cwtstep, 10));
        vib([16]);
        etiqueta();
        return;
      }
    });
    etiqueta();
  }
  /* directiva ("Refactor integral del Timer Táctico") -- helper de sólo
     lectura para el nombre visible del campo activo: antes asumía que
     TODO campo vivía dentro de un <label> (.closest('label') sobre un
     campo sin ese ancestro, ej. cwtTotal en la pantalla AMRAP nueva,
     tiraba TypeError al llamar .querySelector sobre null). Cubre los
     4 contenedores reales de hoy sin tocar campoActivo() ni el motor. */
  function nombreCampo(el){
    if(!el) return '';
    var labelHost = el.closest('label');
    if(labelHost){ var sp = labelHost.querySelector('span'); return sp ? sp.textContent : ''; }
    var field = el.closest('.cwt-tabata-field');
    if(field){ var sp2 = field.querySelector('span'); return sp2 ? sp2.textContent : ''; }
    var central = el.closest('.cwt-central-cfg');
    if(central){ var lb2 = central.querySelector('.cwt-central-lb'); return lb2 ? lb2.textContent : ''; }
    if(el.id === 'cwtInt') return 'Intervalo';
    return '';
  }
  function etiqueta(){
    var lb = document.getElementById('cwtStepLb');
    var el = campoActivo();
    if(!lb) return;
    var nom = nombreCampo(el);
    var t = 'Ajuste rápido' + (nom ? ' · ' + nom.replace(/\s*\(.*\)/, '') : '') +
            (el ? ' · ' + mmss(leerSeg(el)) : '');
    if(lb.textContent !== t) lb.textContent = t;
  }

  /* ruleta vertical: minutos y segundos del campo activo */
  function ruleta(){
    var cfg = document.getElementById('cwtCfg');
    if(!cfg) return;
    var vieja = document.getElementById('cwtWheels');
    if(vieja){ vieja.remove(); return; }
    var el = campoActivo();
    if(!el) return;
    var seg = leerSeg(el);
    var box = document.createElement('div');
    box.className = 'cwt-wheels'; box.id = 'cwtWheels';
    box.innerHTML =
      rollo('min', 'Minutos', 0, 60, 1, Math.floor(seg / 60)) +
      rollo('seg', 'Segundos', 0, 55, 5, Math.round((seg % 60) / 5) * 5);
    cfg.parentNode.insertBefore(box, document.getElementById('cwtSteps').nextSibling);
    box.addEventListener('click', function(e){
      var i = e.target.closest('[data-v]');
      if(!i) return;
      var rol = i.closest('.cwt-roll');
      rol.querySelectorAll('i').forEach(function(x){ x.classList.toggle('on', x === i); });
      i.scrollIntoView({ block:'center', behavior:'smooth' });
      vib([14]);
      aplicarRuleta();
    });
    [].slice.call(box.querySelectorAll('.cwt-roll')).forEach(function(rol){
      var on = rol.querySelector('i.on');
      if(on) rol.scrollTop = on.offsetTop - rol.clientHeight / 2 + on.clientHeight / 2;
    });
  }
  function rollo(k, lb, min, max, paso, val){
    var op = '';
    for(var v = min; v <= max; v += paso)
      op += '<i data-v="' + v + '"' + (v === val ? ' class="on"' : '') + '>' +
            (v < 10 ? '0' : '') + v + '</i>';
    return '<div class="cwt-wh" data-k="' + k + '"><span>' + lb + '</span><div class="cwt-roll">' + op + '</div></div>';
  }
  function aplicarRuleta(){
    var box = document.getElementById('cwtWheels');
    var el = campoActivo();
    if(!box || !el) return;
    var v = {};
    box.querySelectorAll('.cwt-wh').forEach(function(w){
      var on = w.querySelector('i.on');
      v[w.dataset.k] = on ? parseInt(on.dataset.v, 10) : 0;
    });
    escribirSeg(el, (v.min || 0) * 60 + (v.seg || 0));
    etiqueta();
  }

  /* ---------------------------------------------------------
     B · PANTALLA COMPLETA LED
  --------------------------------------------------------- */
  function armarFull(){
    if(document.getElementById('cwtFull')) return;
    var f = document.createElement('div');
    f.className = 'cwt-full'; f.id = 'cwtFull';
    f.innerHTML =
      '<button type="button" class="cf-x" id="cfX" title="Salir de pantalla completa">✕</button>' +
      '<svg class="cf-shield" viewBox="0 0 64 74" aria-hidden="true">' +
        '<defs><linearGradient id="cfOro" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FFE98A"/><stop offset="40%" stop-color="#F5C518"/><stop offset="75%" stop-color="#E6B800"/><stop offset="100%" stop-color="#C99A0B"/></linearGradient></defs>' +
        '<path d="M32 2 L60 12 V36 C60 54 47 66 32 72 C17 66 4 54 4 36 V12 Z" fill="none" stroke="rgba(245,158,11,.15)" stroke-width="1.5" vector-effect="non-scaling-stroke"/>' +
        '<path d="M36 18 L21 40 H30 L27 58 L43 34 H33 Z" fill="none" stroke="rgba(245,158,11,.15)" stroke-width="1.5" vector-effect="non-scaling-stroke"/>' +
      '</svg>' +
      '<div class="cf-phase" id="cfPhase">Listo para arrancar</div>' +
      '<div class="cf-time" id="cfTime">00:00</div>' +
      '<div class="cf-round" id="cfRound">RONDA 1 / 8</div>' +
      '<div class="cf-bar"><i id="cfBar"></i></div>' +
      '<div class="cf-acts">' +
        '<button type="button" class="cf-go" id="cfGo">▶ Empezar</button>' +
        '<button type="button" id="cfReset">↺ Reiniciar</button>' +
      '</div>' +
      '<div class="cf-sign"><b>COACH <em>JP</em></b><span>HIGH PERFORMANCE COACHING</span></div>';
    document.body.appendChild(f);
    document.getElementById('cfX').addEventListener('click', salir);
    document.getElementById('cfGo').addEventListener('click', function(){
      var b = document.getElementById('cwtGo'); if(b) b.click();
      vib([18]);
    });
    document.getElementById('cfReset').addEventListener('click', function(){
      var b = document.getElementById('cwtReset'); if(b) b.click();
      vib([18]);
    });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && f.classList.contains('on')) salir();
    });
  }
  function boton(){
    var acts = document.getElementById('cwtActs');
    if(!acts || document.getElementById('cwtFs')) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'cwt-fs'; b.id = 'cwtFs';
    b.innerHTML = '⛶ Pantalla Completa';
    b.title = 'Modo gimnasio: dígitos gigantes visibles a 10 metros';
    b.addEventListener('click', entrar);
    acts.parentNode.insertBefore(b, acts.nextSibling);
  }
  var espejoT = null;
  function arrancarEspejo(){ if(!espejoT) espejoT = setInterval(espejo, 220); }
  function pararEspejo(){ if(espejoT){ clearInterval(espejoT); espejoT = null; } }
  window.__cwtEspejoActivo = function(){ return espejoT !== null; };
  function entrar(){
    armarFull();
    var f = document.getElementById('cwtFull');
    if(!f) return;
    f.classList.add('on');
    document.body.classList.add('cwt-fs-on');
    try{ if(document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function(){}); }catch(e){}
    vib([20]);
    espejo();
    if(window.__cwtOnPintar) window.__cwtOnPintar();
  }
  function salir(){
    pararEspejo();
    var f = document.getElementById('cwtFull');
    if(f) f.classList.remove('on');
    document.body.classList.remove('cwt-fs-on');
    try{ if(document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function(){}); }catch(e){}
  }
  window.CoachTimerFull = { entrar: entrar, salir: salir,
                            abierto: function(){ var f = document.getElementById('cwtFull'); return !!(f && f.classList.contains('on')); } };

  /* el display grande refleja el motor original, sin duplicar lógica */
  function espejo(){
    var f = document.getElementById('cwtFull');
    if(!f || !f.classList.contains('on')) return;
    var t = document.getElementById('cwtTime'), p = document.getElementById('cwtPhase');
    var r = document.getElementById('cwtRound'), b = document.getElementById('cwtBar');
    var ft = document.getElementById('cfTime'), fp = document.getElementById('cfPhase');
    var fr = document.getElementById('cfRound'), fb = document.getElementById('cfBar');
    if(t && ft && ft.textContent !== t.textContent) ft.textContent = t.textContent;
    if(t && ft) ft.classList.toggle('alerta', t.classList.contains('alerta'));
    if(t && ft){
      var w = !!(t.parentNode && t.parentNode.classList.contains('cwt-warn')) ||
              !!(t.closest('.cwt-body') && t.closest('.cwt-body').classList.contains('cwt-warn'));
      var full = ft.closest('.cwt-full');
      if(full) full.classList.toggle('warn', w);
    }
    if(p && fp){
      var txt = (p.textContent || '').replace(/^[^A-Za-zÁÉÍÓÚÑ0-9]+/, '').trim();
      if(fp.textContent !== txt) fp.textContent = txt;
      fp.className = 'cf-phase' + (p.classList.contains('rest') ? ' rest' : '') +
                     (p.classList.contains('work') ? ' work' : '') +
                     (p.classList.contains('warn') ? ' warn' : '');
      /* el estado de la fase (preparación / trabajo / descanso / quieto) viaja en data-fase y el color sale del CSS (092-pantalla-completa-azul.css): trabajo = naranja, descanso =
         cyan, preparación = amarillo del escudo; se mantiene aunque entren los últimos 10 s (antes el aviso los volvía a todos ámbar y no se distinguía el descanso). */
      var estadoFase = /PREPARACI/i.test(p.textContent || '') ? 'prep' : (p.classList.contains('rest') ? 'rest' : (p.classList.contains('work') ? 'work' : 'idle'));
      var fullEl = document.getElementById('cwtFull'); if(fullEl && fullEl.dataset.fase !== estadoFase) fullEl.dataset.fase = estadoFase;
      fp.style.removeProperty('color');
    }
    if(r && fr){
      var e = T() ? T().estado() : null;
      var txt2 = (e && (e.modo === 'tabata' || e.modo === 'emom'))
        ? 'RONDA ' + e.ronda + ' / ' + e.rondas
        : (r.textContent || '').toUpperCase().replace(/\s+/g, ' ').trim();
      if(fr.textContent !== txt2) fr.textContent = txt2;
    }
    if(b && fb && fb.style.width !== b.style.width) fb.style.width = b.style.width;
    if(b && fb && b.parentNode && fb.parentNode){
      var cls = 'cf-bar' + (b.parentNode.classList.contains('work') ? ' work' : '') +
                (b.parentNode.classList.contains('rest') ? ' rest' : '') +
                (b.parentNode.classList.contains('warn') ? ' warn' : '');
      if(fb.parentNode.className !== cls) fb.parentNode.className = cls;
      fb.style.removeProperty('background');    /* el color de la barra sale del CSS según la fase (data-fase) */
    }
    var go = document.getElementById('cwtGo'), fg = document.getElementById('cfGo');
    if(go && fg && fg.textContent !== go.textContent) fg.textContent = go.textContent;
  }

  function repintar(){ try{ steppers(); normalizarMmss(); boton(); etiqueta(); espejo(); }catch(e){} }
  function mount(){
    repintar();
    [500, 1400, 2600].forEach(function(ms){ setTimeout(repintar, ms); });
    /* directiva ("Optimización energética del timer") -- ya NO hay un
       setInterval(espejo, 220) permanente corriendo desde el arranque de
       la app (despertaba el hilo principal 4-5 veces por segundo aunque
       el timer estuviera cerrado). Ahora el lazo vive sólo mientras la
       pantalla completa está abierta Y el cronómetro está corriendo (ver
       arrancarEspejo()/pararEspejo() y el gancho __cwtOnPintar que el
       motor llama desde pintar()): cerrado, en pausa o terminado, no
       queda ningún intervalo activo. */
    window.__cwtOnPintar = function(){
      var f = document.getElementById('cwtFull');
      if(!f || !f.classList.contains('on')){ pararEspejo(); return; }
      espejo();
      var e = T() ? T().estado() : null;
      if(e && e.corriendo) arrancarEspejo(); else pararEspejo();
    };
    var cfg = document.getElementById('cwtCfg');
    if(cfg) cfg.addEventListener('input', etiqueta);
    document.addEventListener('click', function(e){
      if(e.target.closest('.cwt-mode')) setTimeout(function(){
        var w = document.getElementById('cwtWheels'); if(w) w.remove();
        etiqueta();
      }, 60);
    });
    window.CoachTimerUI = { repintar: repintar, ruleta: ruleta, paso: function(v){
      var el = campoActivo(); if(el){ escribirSeg(el, leerSeg(el) + v); etiqueta(); } } };
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(mount, 640); });
  else setTimeout(mount, 640);
})();
