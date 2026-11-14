/* =========================================================
   COACH JP · depuración visual de la vista del alumno
========================================================= */
(function(){
  function bloqueDe(id){
    var d = (typeof getCurrentDay === 'function') ? getCurrentDay() : null;
    if(!d || !id) return null;
    var todos = (d.blocks || []).concat(d.finisher ? [d.finisher] : [], d.hyrox ? [d.hyrox] : []);
    return todos.filter(function(b){ return b.id === id; })[0] || null;
  }
  var RX_WARM = /entrada en calor|warm.?up|movilidad|activaci[óo]n|cool.?down|vuelta a la calma|estiramiento/i;
  var RX_CORE = /\\bcore\\b|abdomen|abdominal|estabilidad|anti.?rotaci[óo]n/i;

  /* ---------------------------------------------------------
     1 · SIN BADGES NI SWITCHES INTERNOS
  --------------------------------------------------------- */
  function sinMetadatos(){
    document.querySelectorAll('.cf-modo-tag, .cf-modo-sel, .vid-chips, .pz-box')
      .forEach(function(x){ x.remove(); });
  }

  /* ---------------------------------------------------------
     2 · SCORE SÓLO EN BLOQUES MEDIBLES
  --------------------------------------------------------- */
  function scores(){
    document.querySelectorAll('.block').forEach(function(bl){
      var b = bloqueDe(bl.dataset.blockId);
      var titulo = ((bl.querySelector('.block-label') || {}).textContent || '') + ' ' +
                   ((bl.querySelector('.block-subtitle') || {}).textContent || '') + ' ' +
                   ((b && b.title) || '') + ' ' + ((b && b.subtitle) || '');
      var cat = (b && b.category) || '';
      var medible = !RX_WARM.test(titulo) && cat !== 'warmup' &&
                    (cat === 'metcon' || cat === 'cardio' || cat === 'endurance' ||
                     /\\bemom\\b|\\bamrap\\b|for\\s*time|\\brft\\b|tabata|chipper|met.?con|\\bwod\\b|test|\\brm\\b|1rm/i
                       .test(titulo + ' ' + ((bl.querySelector('.cf-body, .wb-body') || {}).textContent || '')));
      bl.classList.toggle('sin-score', !medible);
      if(!medible){
        bl.querySelectorAll('.cf-score, .wod-score').forEach(function(s){ s.remove(); });
      }
    });
  }

  /* ---------------------------------------------------------
     3 · TARJETA DE CORE LIMPIA
  --------------------------------------------------------- */
  function core(){
    document.querySelectorAll('.block').forEach(function(bl){
      var b = bloqueDe(bl.dataset.blockId);
      /* misma corrección que en "CORE ESTRUCTURADO": usar la etiqueta ya
         resuelta para la semana actual, no el título estático congelado */
      var wi = (typeof state !== 'undefined' && state) ? (state.currentWeek || 0) : 0;
      var titulo = (b && ((b.weekName && b.weekName[wi]) || b.title)) || '';
      var esCore = !!(b && b.coreBlock) || RX_CORE.test(titulo);
      bl.classList.toggle('core-card', esCore);
      if(esCore){
        /* el core estructurado (individual / biset / triset / circuito) conserva
           sus filas interactivas: sólo se limpia la sugerencia de intensidad */
        var estructurado = !!(b && (b.isBlock || b.isSuperset)) || !!bl.querySelector('.set-tracker');
        var fuera = estructurado ? '.load-suggest, .pre-bar' : '.load-suggest, .pre-bar, .set-tracker';
        bl.querySelectorAll(fuera).forEach(function(x){ x.remove(); });
      }
    });
  }

  function repintar(){ try{ sinMetadatos(); scores(); core(); }catch(e){} }
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
        setTimeout(function(){ propio = false; }, 170);
      }, 150);
    }, main);
    if(typeof window.renderMain === 'function'){
      var _rm = window.renderMain;
      window.renderMain = function(){
        var r = _rm.apply(this, arguments);
        setTimeout(repintar, 140);
        setTimeout(repintar, 480);
        return r;
      };
    }
    window.CoachVistaLimpia = { repintar: repintar, scores: scores, core: core };
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(mount, 320); });
  else setTimeout(mount, 320);
})();
