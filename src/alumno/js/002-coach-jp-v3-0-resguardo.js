/* COACH JP v3.0 · resguardo de arranque: la interfaz nunca queda bloqueada */
(function(){
  var D = document.documentElement;
  /* arranque sin parpadeo: la interfaz queda en opacity 0 (y el splash visible) hasta que los módulos terminan de montar;
     techo duro de 1.1s para que nunca quede oculta */
  D.classList.add('jp-hold');
  window.__jpHold = true;
  window.__jpSoltarHold = function(){
    if(!window.__jpHold) return;
    window.__jpHold = false;
    D.classList.add('jp-reveal');
    D.classList.remove('jp-hold');
    setTimeout(function(){ D.classList.remove('jp-reveal'); }, 400);
  };
  setTimeout(window.__jpSoltarHold, 1100);
  /* preferencia de tamaño de texto: se aplica antes del primer pintado */
  try{ var _fz = localStorage.getItem('coachjp_fz'); if(_fz) D.setAttribute('data-fz', _fz); }catch(e){}
  function liberar(){
    if(window.__jpHold){ setTimeout(liberar, 60); return; }
    try{
      D.classList.remove('jp-cargando');
      D.style.visibility = 'visible';
      var s = document.getElementById('jpSplash');
      if(s){ s.classList.add('off'); if(s.parentNode) setTimeout(function(){ try{ s.parentNode.removeChild(s); }catch(e){} }, 300); }
      document.body && (document.body.style.visibility = 'visible');
    }catch(e){}
  }
  window.__jpLiberarUI = liberar;
  /* techo duro de 1.2s. Se reintenta: en un documento grande el temporizador
     puede dispararse antes de que el splash exista, y un disparo único fallaría. */
  (function reintentar(){
    var t0 = Date.now();
    (function tick(){
      var pasado = Date.now() - t0;
      var s = document.getElementById('jpSplash');
      if(pasado >= 1200 && (s || document.body)){ liberar(); if(!s || s.classList.contains('off')) return; }
      if(pasado < 15000) setTimeout(tick, 150);
    })();
  })();
  window.addEventListener('error', function(){ setTimeout(liberar, 40); });
  window.addEventListener('unhandledrejection', function(){ setTimeout(liberar, 40); });
})();
