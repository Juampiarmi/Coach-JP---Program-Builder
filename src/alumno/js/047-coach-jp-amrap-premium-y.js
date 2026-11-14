/* =========================================================
   COACH JP · AMRAP premium y musculación interactiva
========================================================= */
(function(){
  function bloqueDe(id){
    var d = (typeof getCurrentDay === 'function') ? getCurrentDay() : null;
    if(!d || !id) return null;
    var todos = (d.blocks || []).concat(d.finisher ? [d.finisher] : [], d.hyrox ? [d.hyrox] : []);
    return todos.filter(function(b){ return b.id === id; })[0] || null;
  }

  /* ---------------------------------------------------------
     1 · AMRAP · HYROX · CARDIO CON TRATAMIENTO VOLT
  --------------------------------------------------------- */
  function esVolt(b, bl){
    var t = ((b && b.title) || '') + ' ' + ((b && b.subtitle) || '') + ' ' +
            ((b && b.boardFmt) || '') + ' ' + ((b && b.protocol) || '');
    var cuerpo = (bl.querySelector('.cf-body, .wb-body') || {}).textContent || '';
    if(b && b.isHyrox) return true;
    if(b && b.category === 'cardio') return true;
    return /\bamrap\b/i.test(t + ' ' + cuerpo) || /\bengine\b|zona 2/i.test(t);
  }
  function volt(){
    document.querySelectorAll('.block').forEach(function(bl){
      var board = bl.querySelector('.cf-board') || bl.querySelector('.wod-board');
      if(!board) return;
      var b = bloqueDe(bl.dataset.blockId);
      var on = esVolt(b, bl);
      if(board.classList.contains('board-volt') !== on) board.classList.toggle('board-volt', on);
      if(!on) return;
      /* numeración de dos dígitos en amarillo neón */
      var n = 0;
      board.querySelectorAll('.cf-line, .wb-line').forEach(function(l){
        if(l.classList.contains('dup') || l.classList.contains('head')) return;
        n++;
        var num = l.querySelector('span.n');
        var txt = n < 10 ? '0' + n : String(n);
        if(!num){
          num = document.createElement('span');
          num.className = 'n';
          l.insertBefore(num, l.firstChild);
        }
        if(num.textContent !== txt) num.textContent = txt;
      });
    });
  }

  /* ---------------------------------------------------------
     2 · MUSCULACIÓN: SERIES, HERRAMIENTAS Y VIDEO SIEMPRE VIVOS
  --------------------------------------------------------- */
  function interactivo(){
    if(document.body.classList.contains('cf-modo')) return;
    document.querySelectorAll('.block').forEach(function(bl){
      var b = bloqueDe(bl.dataset.blockId);
      if(!b || !(b.isBlock || b.isSuperset || b.isFinisher)) return;
      /* un bloque de trabajo nunca queda como tarjeta de lectura */
      if(bl.classList.contains('wu-card')){
        bl.classList.remove('wu-card');
        var lista = bl.querySelector('.wu-list');
        if(lista) lista.remove();
        bl.querySelectorAll('.ex-row, .wu-phase').forEach(function(x){ x.style.display = ''; });
        var brd = bl.querySelector('.cf-board, .wod-board');
        if(brd){ brd.style.background = ''; brd.style.border = ''; brd.style.display = ''; }
        if(typeof renderMain === 'function' && !bl.querySelector('.set-row')) setTimeout(renderMain, 30);
      }
      /* las cápsulas de herramientas quedan encima de las series */
      var box = bl.querySelector('.jp-tools, .cap-bar');
      var tracker = bl.querySelector('.set-tracker');
      if(box && tracker && tracker.parentNode && box.nextElementSibling !== tracker){
        tracker.parentNode.insertBefore(box, tracker);
      }
    });
  }

  function repintar(){ try{ volt(); interactivo(); }catch(e){} }
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
        setTimeout(function(){ propio = false; }, 210);
      }, 200);
    }, main);
    if(typeof window.renderMain === 'function'){
      var _rm = window.renderMain;
      window.renderMain = function(){
        var r = _rm.apply(this, arguments);
        setTimeout(repintar, 260);
        setTimeout(repintar, 720);
        return r;
      };
    }
    window.CoachPremium = { volt: volt, interactivo: interactivo, repintar: repintar };
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(mount, 460); });
  else setTimeout(mount, 460);
})();
