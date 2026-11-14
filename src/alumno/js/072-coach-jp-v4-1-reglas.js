/* =========================================================
   COACH JP · v4.1 · REGLAS DE CROSSFIT EN LA APP
   · El bloque marcado sinVideo no renderiza botones de video
   · Excepción manual: la línea con link cargado por el coach
   · Sin porcentajes de mesociclo cuando la disciplina es CrossFit
========================================================= */
(function(){
  var CF = !!(typeof PROGRAM_CONFIG !== 'undefined' && PROGRAM_CONFIG.modoSemanal);

  /* 1 · bandera por bloque alrededor del render */
  if(typeof window.renderBlock === 'function' && !window.renderBlock.__jpcf){
    var _rb = window.renderBlock;
    var w = function(b){
      window.__jpSinVideo = !!(b && b.sinVideo);
      var r;
      try{ r = _rb.apply(this, arguments); }
      finally{ window.__jpSinVideo = false; }
      return r;
    };
    w.__jpcf = 1;
    window.renderBlock = w;
  }

  /* 2 · excepción manual: play sólo en las líneas con link propio */
  function playHtml(id){
    /* mismo trigger con thumbnail que videoLinkHtml() (ver ~línea 3965) —
       dos generadores porque este es el caso especial de video pegado a
       mano en una línea de pizarra CrossFit, misma anatomía de botón. */
    return ' <a class="video-link jp-play has-thumb" href="javascript:void(0)" data-yt="' + id + '" ' +
      'style="background-image:url(https://img.youtube.com/vi/' + id + '/mqdefault.jpg)" ' +
      'title="Video cargado por el coach" aria-label="Ver el video de esta línea">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.2v13.6L19 12z"/></svg></a>';
  }
  function manuales(){
    var d = null;
    try{ d = (typeof getCurrentDay === 'function') ? getCurrentDay() : null; }catch(e){}
    if(!d) return;
    (d.blocks || []).forEach(function(b){
      if(!b.itemVideos) return;
      var bl = document.querySelector('.block[data-block-id="' + b.id + '"]');
      if(!bl || bl.dataset.jpMan === '1') return;
      /* se busca por TEXTO, no por índice: la pizarra agrega líneas de
         encabezado y el índice del ítem no coincide con el del DOM */
      var filas = bl.querySelectorAll('.ex-row .ex-name, .wb-line, .cf-line, .ex-name, li');
      var norm = function(t){ return String(t || '').toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\\s+/g, ' ').trim(); };
      var puesto = 0;
      Object.keys(b.itemVideos).forEach(function(ix){
        var txt = norm((b.items || [])[parseInt(ix, 10)] || '');
        if(!txt) return;
        for(var i = 0; i < filas.length; i++){
          var f = filas[i];
          if(f.querySelector && f.querySelector('.video-link')) continue;
          if(norm(f.textContent).indexOf(txt) >= 0){
            f.insertAdjacentHTML('beforeend', playHtml(b.itemVideos[ix]));
            puesto++;
            break;
          }
        }
      });
      if(puesto) bl.dataset.jpMan = '1';
    });
  }

  /* 3 · en CrossFit la semana no se lee como % de un mesociclo */
  function limpiarPorcentajes(){
    if(!CF) return;
    var nodos = document.querySelectorAll('.week-pill-pct, .hero-pct, .week-pct');
    for(var i = 0; i < nodos.length; i++) nodos[i].style.display = 'none';
  }

  function repintar(){ try{ manuales(); limpiarPorcentajes(); }catch(e){} }
  function mount(){
    repintar();
    if(typeof window.renderMain === 'function' && !window.renderMain.__jpcf41){
      var _rm = window.renderMain;
      var w2 = function(){ var r = _rm.apply(this, arguments); setTimeout(repintar, 110); return r; };
      w2.__jpcf41 = 1;
      window.renderMain = w2;
    }
    [900, 2200, 3800].forEach(function(ms){ setTimeout(repintar, ms); });
    window.CoachCF = { esCrossFit: function(){ return CF; }, repintar: repintar };
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(mount, 500); });
  else setTimeout(mount, 500);
})();
