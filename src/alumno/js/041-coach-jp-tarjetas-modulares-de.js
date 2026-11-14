/* =========================================================
   COACH JP · tarjetas modulares de CrossFit
========================================================= */
(function(){
  function bloqueDe(id){
    var d = (typeof getCurrentDay === 'function') ? getCurrentDay() : null;
    if(!d || !id) return null;
    var todos = (d.blocks || []).concat(d.finisher ? [d.finisher] : [], d.hyrox ? [d.hyrox] : []);
    return todos.filter(function(b){ return b.id === id; })[0] || null;
  }
  /* disciplina del bloque -> color temático */
  function disciplina(b, bl){
    /* el tipo declarado por el parser manda sobre cualquier heurística */
    var tipo = (b && b.blockType) || '';
    if(tipo){
      if(/warm/i.test(tipo)) return 'disc-warm';
      if(/accessor|midline/i.test(tipo)) return 'disc-acc';
      if(/gymnastic|skill/i.test(tipo)) return 'disc-gym';
      if(/weightlifting|fuerza/i.test(tipo)) return 'disc-oly';
      if(/metcon|interval|engine/i.test(tipo)) return 'disc-met';
    }
    var fmt = (b && b.boardFmt) || '';
    if(/WARM/i.test(fmt)) return 'disc-warm';
    if(/ACCESORIOS/i.test(fmt)) return 'disc-acc';
    if(/GIMN/i.test(fmt)) return 'disc-gym';
    if(/WEIGHTLIFTING/i.test(fmt)) return 'disc-oly';
    if(/METCON|ENGINE|AMRAP|EMOM|FOR TIME|TABATA/i.test(fmt)) return 'disc-met';
    /* después manda la categoría real del bloque */
    var cat = (b && b.category) || '';
    var t = ((b && b.title) || '') + ' ' + ((b && b.subtitle) || '');
    if(cat === 'warmup' || /warm.?up|entrada en calor|movilidad/i.test(t)) return 'disc-warm';
    /* "2º Turno / Endurance & Running" (directiva): se clasifica como
       disc-met sólo a efectos de este módulo legado -- así conserva su
       campo de Score/Registro -- el borde/tag coral propios de la fase
       vienen de la regla .jp-cf-fase-endurance (más específica, gana por
       encima de este sistema viejo, ver nota más abajo en el archivo). */
    if(cat === 'endurance') return 'disc-met';
    if(cat === 'metcon' || bl.querySelector('.wod-board')) return 'disc-met';
    if(cat === 'accessory' || /accessor|midline|accesorio|core|abdomen/i.test(t)) return 'disc-acc';
    if(/gymnastic|skill|gimn/i.test(t)) return 'disc-gym';
    if(/weightlifting|fuerza principal|oly|halterofilia|snatch|clean|jerk|squat|deadlift|press/i.test(t)) return 'disc-oly';
    var cuerpo = (bl.querySelector('.cf-body, .wb-body') || {}).textContent || '';
    if(/amrap|emom|for\s*time|tabata|chipper|met.?con/i.test(t + ' ' + cuerpo)) return 'disc-met';
    return 'disc-oly';
  }
  function tarjetas(){
    document.querySelectorAll('.block').forEach(function(bl){
      var b = bloqueDe(bl.dataset.blockId);
      if(!bl.querySelector('.cf-board, .wod-board')) return;
      var cls = disciplina(b, bl);
      ['disc-oly','disc-met','disc-gym','disc-acc','disc-warm'].forEach(function(c){
        if(c !== cls) bl.classList.remove(c);
      });
      if(!bl.classList.contains(cls)) bl.classList.add(cls);
      /* el score y los niveles sólo viven en el metcon */
      if(cls !== 'disc-met'){
        bl.querySelectorAll('.cf-score, .wod-score, .cf-levels').forEach(function(x){ x.remove(); });
      }
    });
  }

  /* ---------------------------------------------------------
     ACCORDIONS DE COACHING
  --------------------------------------------------------- */
  function accordions(){
    document.querySelectorAll('.cf-cierre .cc-s').forEach(function(s){
      if(s.dataset.acc) return;
      s.dataset.acc = '1';
      var h = s.querySelector('h5');
      if(!h) return;
      h.setAttribute('role', 'button');
      h.setAttribute('tabindex', '0');
      h.addEventListener('click', function(){ s.classList.toggle('open'); });
      h.addEventListener('keydown', function(ev){
        if(ev.key === 'Enter' || ev.key === ' '){ ev.preventDefault(); s.classList.toggle('open'); }
      });
    });
  }

  function repintar(){ try{ tarjetas(); accordions(); }catch(e){} }
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
      }, 170);
    }, main);
    if(typeof window.renderMain === 'function'){
      var _rm = window.renderMain;
      window.renderMain = function(){
        var r = _rm.apply(this, arguments);
        setTimeout(repintar, 180);
        setTimeout(repintar, 560);
        return r;
      };
    }
    window.CoachTarjetasCF = { repintar: repintar, disciplina: disciplina };
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(mount, 360); });
  else setTimeout(mount, 360);
})();
