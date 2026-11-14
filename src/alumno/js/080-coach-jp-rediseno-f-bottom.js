/* =========================================================
   COACH JP · REDISEÑO F — BOTTOM-SHEET DE METODOLOGÍA
   Junta RIR de hoy, Criterio del Coach, Pautas Técnicas y Notas del
   bloque detrás de una sola píldora por bloque. Mueve (no clona) los
   nodos reales que ya arman otros módulos -- sus listeners viajan con
   ellos, cero datos nuevos, cero función reescrita. Corre tarde y a
   reintentos porque esos módulos se montan en sus propios timeouts;
   cada pasada barre lo que haya aparecido como hijo directo de
   .block-body y lo mete en el drawer (ya exista o recién se cree),
   así agarra piezas que lleguen después de la primera pasada. -------- */
(function(){
  'use strict';
  var CANDIDATOS = ['.rir-bar', '.jp-criterio', '.block-methodology-accordion', '.block-notes'];
  function armar(bl){
    var cuerpo = bl.querySelector(':scope > .block-body');
    if(!cuerpo) return;
    var nodos = [];
    CANDIDATOS.forEach(function(sel){
      var el = cuerpo.querySelector(':scope > ' + sel);
      if(el) nodos.push(el);
    });
    if(!nodos.length) return;
    var drawer = bl.querySelector(':scope > .block-body > .wf-sheet-drawer');
    if(!drawer){
      drawer = document.createElement('div');
      drawer.className = 'wf-sheet-drawer';
      drawer.innerHTML =
        '<button type="button" class="wf-sheet-trigger">' +
          '<span>☰ Notas, RIR y criterio del coach</span><span class="wf-chev">▾</span>' +
        '</button>' +
        '<div class="wf-sheet-body"></div>';
      cuerpo.appendChild(drawer);
      drawer.querySelector('.wf-sheet-trigger').addEventListener('click', function(e){
        e.stopPropagation();
        drawer.classList.toggle('on');
      });
    }
    var body = drawer.querySelector('.wf-sheet-body');
    nodos.forEach(function(n){ body.appendChild(n); });
  }
  function repintar(){
    document.querySelectorAll('.block').forEach(function(bl){
      try{ armar(bl); }catch(e){}
    });
  }
  function mount(){
    repintar();
    var main = document.getElementById('mainContent') || document.body;
    if(window.CoachRepaintBus && typeof window.CoachRepaintBus.register === 'function'){
      window.CoachRepaintBus.register(function(){ setTimeout(repintar, 320); }, main);
    }
    [500, 1100, 1900, 3000, 4500].forEach(function(ms){ setTimeout(repintar, ms); });
    if(typeof window.renderMain === 'function'){
      var _rm = window.renderMain;
      window.renderMain = function(){
        var r = _rm.apply(this, arguments);
        [400, 1000, 1800, 3200].forEach(function(ms){ setTimeout(repintar, ms); });
        return r;
      };
    }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
