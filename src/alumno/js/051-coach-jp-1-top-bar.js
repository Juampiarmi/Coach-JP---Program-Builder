/* =========================================================
   COACH JP · 1 · TOP BAR MINIMALISTA (QUICK TOOLS DRAWER)
   Quedan a la vista los accesos de sesión activa; la consulta
   y la documentación se agrupan en un drawer ahumado.
========================================================= */
(function(){
  /* Modo Completo/Rápido, %1RM, Custom Timer y Guía quedan siempre a la vista
     (Fila 1 y Fila 2 fijas de la consola de accesos rápidos) — ver directiva
     de reordenamiento de cabecera. Solo lo verdaderamente secundario cae al drawer. */
  /* lo que NUNCA se guarda: unidades y pausa/completar (el timer vive fijo en Fila 2) */
  var ESENCIALES = ['uniSwitch', 'sesPause'];
  /* lo que vive en el drawer, en orden y por grupo */
  var GRUPOS = [
    { h:'Cálculo y marcas', ids:['prHubBtn'] },
    { h:'Documentación',    ids:['btnManualTop'] },
    /* directiva de accesibilidad (2026-09, seguimiento) -- "jpFzSwitch" se
       saca de este grupo: la directiva pide el selector Aa DIRECTAMENTE
       visible/accesible, no escondido un nivel más adentro de "🧰
       Herramientas". Se monta aparte, directo en el drawer de Perfil/Info
       (ver #hdpFzSlot y SYSTEM v3.1 más abajo). Este drawer de Quick Tools
       sigue con el resto (Marcas, Manual, Cambiar vista). */
    { h:'Sesión y vista',   ids:['btnVistaTop'] }
  ];
  var ETIQUETA = {
    prHubBtn:'🏆 Mis Marcas y récords', btnManualTop:'📘 Manual de Uso',
    btnVistaTop:'🔁 Cambiar vista de la rutina'
  };

  /* directiva de accesibilidad (2026-09, seguimiento) -- "el botón sólo
     aparece como ícono comprimido que no abre nada": host()/hostUtil()
     apuntaban a ".hd-actions"/"#hdRowUtil", ambos dentro del <header
     class="masthead hd-top"> LEGADO que el propio archivo deja con
     display:none (ver comentario "contenido legado... oculto" más arriba)
     desde el rediseño de cabecera compacta (#hdCompact/.hdc-top). El botón
     "🧰 Herramientas" y TODO lo que agrupa (Marcas, Manual, Cambiar vista)
     se armaban ahí igual, sin tirar error -- visibles en el DOM, invisibles
     e inclicables en pantalla. Nuevo host: #hdpQtSlot, una fila fija del
     drawer de Perfil/Info (que sí es visible/interactivo siempre). */
  function host(){ return document.getElementById('hdpQtSlot'); }
  function hostUtil(){ return host(); }
  function armar(){
    var h = host();
    if(!h) return null;
    var util = hostUtil();
    var qt = document.getElementById('jpQT');
    if(!qt){
      qt = document.createElement('div');
      qt.className = 'jp-qt'; qt.id = 'jpQT';
      qt.innerHTML =
        '<button type="button" class="qt-btn" id="jpQTBtn" title="Herramientas de consulta">' +
          '🧰 Herramientas <span class="qt-badge" id="jpQTn">0</span><span class="car">▾</span>' +
        '</button>' +
        '<div class="qt-panel" id="jpQTPanel"></div>';
      util.appendChild(qt);
      qt.querySelector('#jpQTBtn').addEventListener('click', function(e){
        e.stopPropagation();
        qt.classList.toggle('on');
        try{ if(navigator.vibrate) navigator.vibrate(14); }catch(x){}
      });
      document.addEventListener('click', function(e){
        if(!e.target.closest('#jpQT')) qt.classList.remove('on');
      });
      document.addEventListener('keydown', function(e){
        if(e.key === 'Escape') qt.classList.remove('on');
      });
      /* al elegir una herramienta el drawer se cierra solo */
      qt.querySelector('#jpQTPanel').addEventListener('click', function(e){
        if(e.target.closest('button, .nav-pill')) setTimeout(function(){ qt.classList.remove('on'); }, 40);
      });
    }
    if(qt.parentNode !== util) util.appendChild(qt);
    return qt;
  }

  function slot(panel, g, i){
    var id = 'qtG' + i;
    var s = panel.querySelector('#' + id);
    if(!s){
      var t = document.createElement('div');
      t.className = 'qt-h'; t.textContent = g.h;
      s = document.createElement('div');
      s.className = 'qt-slot'; s.id = id;
      if(i){ var sep = document.createElement('div'); sep.className = 'qt-sep'; panel.appendChild(sep); }
      panel.appendChild(t); panel.appendChild(s);
    }
    return s;
  }

  function reorganizar(){
    var h = host();
    if(!h) return;
    var qt = armar();
    if(!qt) return;
    var panel = qt.querySelector('#jpQTPanel');
    var n = 0;
    GRUPOS.forEach(function(g, i){
      var s = slot(panel, g, i);
      g.ids.forEach(function(id){
        var el = document.getElementById(id);
        if(!el) return;
        if(el.parentNode !== s) s.appendChild(el);     /* se mueve el nodo: los listeners viajan con él */
        if(ETIQUETA[id] && el.dataset.qt !== '1'){
          el.dataset.qt = '1';
          el.innerHTML = ETIQUETA[id];
        }
        n++;
      });
    });
    var badge = qt.querySelector('#jpQTn');
    if(badge && badge.textContent !== String(n)) badge.textContent = String(n);
    var util = hostUtil();
    /* el drawer siempre cierra la fila de utilidades, a la derecha de lo esencial */
    if(util.lastElementChild !== qt) util.appendChild(qt);
    /* los esenciales (unidades, pausa) se quedan en la Fila de utilidades, visibles y en orden */
    ESENCIALES.forEach(function(id){
      var el = document.getElementById(id);
      if(el && el.parentNode !== util) util.insertBefore(el, qt);
    });
  }

  function repintar(){ try{ reorganizar(); }catch(e){} }
  function mount(){
    repintar();
    [400, 1100, 2200, 3400].forEach(function(ms){ setTimeout(repintar, ms); });
    var h = host();
    if(h){
      var pend = false;
      new MutationObserver(function(){
        if(pend) return;
        pend = true;
        setTimeout(function(){ pend = false; repintar(); }, 220);
      }).observe(h, { childList:true });
    }
    window.CoachTopBar = { repintar: repintar, abrir: function(){
      var q = document.getElementById('jpQT'); if(q) q.classList.add('on'); } };
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(mount, 380); });
  else setTimeout(mount, 380);
})();

/* =========================================================
   COACH JP · 2 · COACHING TIP POR EJERCICIO
   El análisis integral del bloque baja un tip propio a cada
   movimiento del biset, triset, circuito o complex.
========================================================= */
(function(){
  function bloqueDe(id){
    var d = (typeof getCurrentDay === 'function') ? getCurrentDay() : null;
    if(!d || !id) return null;
    var todos = (d.blocks || []).concat(d.finisher ? [d.finisher] : [], d.hyrox ? [d.hyrox] : []);
    return todos.filter(function(b){ return b.id === id; })[0] || null;
  }
  function esc(s){
    return String(s == null ? '' : s)
      .replace(/[\\u{1F000}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{FE0F}]/gu, '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\\s{2,}/g, ' ').trim();
  }
  function tips(){
    /* v3.0 · los coaching tips ya no se inyectan sueltos: viven en el
       acordéon metodológico único al pie del bloque */
    if(true) return;
    document.querySelectorAll('.block').forEach(function(bl){
      var b = bloqueDe(bl.dataset.blockId);
      if(!b) return;
      var lista = (b.isSuperset || b.isFinisher) ? (b.exercises || [])
                : (b.isBlock && b.exTip) ? [{ name: b.exerciseName, tip: b.exTip }] : [];
      if(!lista.length) return;
      /* en el bloque unificado la fila del ejercicio es su entrada del contenedor compacto */
      var filas = [].slice.call(bl.querySelectorAll('.bs-ex .bs-e'));
      if(!filas.length) filas = [].slice.call(bl.querySelectorAll('.ex-row'));
      bl.querySelectorAll('.ex-tip').forEach(function(c){
        var i = parseInt(c.dataset.tipI, 10);
        if(isNaN(i) || i >= lista.length) c.remove();
      });
      lista.forEach(function(x, i){
        if(!x || !x.tip) return;
        var row = filas[i];
        if(!row) return;
        var html = '<b>Coaching tip</b>' + esc(x.tip);
        /* una sola caja por ejercicio: se reutiliza aunque otro módulo reordene la tarjeta */
        var caja = bl.querySelector('.ex-tip[data-tip-i="' + i + '"]');
        if(!caja){
          caja = document.createElement('div');
          caja.className = 'ex-tip';
          caja.dataset.tipI = i;
        }
        if(caja.previousElementSibling !== row) row.parentNode.insertBefore(caja, row.nextSibling);
        if(caja.innerHTML !== html) caja.innerHTML = html;
      });
    });
  }
  function repintar(){ try{ tips(); }catch(e){} }
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
        setTimeout(function(){ propio = false; }, 190);
      }, 180);
    }, main);
    if(typeof window.renderMain === 'function'){
      var _rm = window.renderMain;
      window.renderMain = function(){
        var r = _rm.apply(this, arguments);
        setTimeout(repintar, 320);
        setTimeout(repintar, 820);
        return r;
      };
    }
    window.CoachTipsEj = { repintar: repintar };
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(mount, 560); });
  else setTimeout(mount, 560);
})();
