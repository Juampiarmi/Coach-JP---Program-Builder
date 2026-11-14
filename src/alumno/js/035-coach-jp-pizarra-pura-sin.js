/* =========================================================
   COACH JP · pizarra pura: sin timers ni videos rotos
========================================================= */
(function(){
  var FMT = [
    { re:/\bemom\b|every\s*\d+\s*(?:min|')/i,                    lb:'EMOM' },
    { re:/\bamrap\b/i,                                           lb:'AMRAP' },
    { re:/\btabata\b/i,                                          lb:'TABATA' },
    { re:/rounds?\s*for\s*time|\brft\b/i,                        lb:'ROUNDS FOR TIME' },
    { re:/\bchipper\b/i,                                         lb:'CHIPPER' },
    { re:/for\s*time/i,                                          lb:'FOR TIME' },
    { re:/\bintervals?\b|intervalos?/i,                          lb:'INTERVALOS' }
  ];
  /* gana el formato que aparece primero en el texto real del bloque */
  function formatoReal(txt){
    var t = String(txt || ''), mejor = null, pos = 1e9;
    FMT.forEach(function(f){
      var m = t.match(f.re);
      if(m && m.index < pos){ pos = m.index; mejor = f; }
    });
    return mejor;
  }
  function duracionReal(txt, fmt){
    /* sólo se acepta un tiempo que esté escrito en la planificación */
    var t = String(txt || '');
    if(fmt){
      var linea = t.split(/\n|\.\s/).filter(function(l){ return fmt.re.test(l); })[0] || t;
      var m = linea.match(/(\d{1,3})\s*(?:min|minutos?|minutes?|')/i);
      if(m) return m[1] + ' min';
    }
    var g = t.match(/(\d{1,3})\s*(?:min|minutos?|minutes?)\b/i);
    return g ? g[1] + ' min' : '';
  }
  function esWod(bl, txt){
    if(bl.classList.contains('cat-metcon')) return true;
    if(bl.querySelector('.wod-board')) return true;
    return /\bemom\b|\bamrap\b|for\s*time|\brft\b|tabata|chipper|met.?con|\bwod\b/i.test(txt);
  }
  function cuerpoDe(bl){
    var b = bl.querySelector('.wod-board .wb-body') || bl.querySelector('.cf-board .cf-body') ||
            bl.querySelector('.block-body') || bl;
    return (b.textContent || '').replace(/\s+/g, ' ');
  }

  /* ---------------------------------------------------------
     1 · FUERA TODO INDICADOR DE TIEMPO DE LA TARJETA
  --------------------------------------------------------- */
  function sinRelojes(){
    document.querySelectorAll(
      '.block .quick-timer, .block .quick-timer-slot, .block .wod-timer-slot, ' +
      '.block .round-timer, .block .timer-slot, .block .wb-dur, .block .wb-tipo'
    ).forEach(function(t){ t.remove(); });
    /* cualquier pill de tiempo que quede en un encabezado de pizarra */
    document.querySelectorAll('.wod-board .wb-h > *, .cf-board .cf-h > *').forEach(function(el){
      if(el.classList.contains('wb-fmt') || el.classList.contains('cf-t') ||
         el.classList.contains('cf-fmt') || el.classList.contains('cf-modo-tag')) return;
      var t = (el.textContent || '').trim();
      if(/⏱|⏲|🕐|\d+\s*(min|minutos?|seg|s)\b|\d{1,2}:\d{2}/i.test(t)) el.remove();
    });
  }

  /* ---------------------------------------------------------
     2 · MODO PIZARRA PURA OBLIGATORIO EN TODO WOD
  --------------------------------------------------------- */
  function pizarraPura(){
    document.querySelectorAll('.block').forEach(function(bl){
      var txt = cuerpoDe(bl) + ' ' + ((bl.querySelector('.block-label') || {}).textContent || '');
      if(!esWod(bl, txt)){ bl.classList.remove('wod-puro'); return; }
      bl.classList.add('wod-puro');
      /* nada de reproductores, placeholders ni enlaces azules dentro del WOD */
      /* se van los reproductores rotos; el botón ▶ de técnica se queda */
      bl.querySelectorAll('.cf-vd, iframe, video, .vid-box, .video-frame')
        .forEach(function(v){ v.remove(); });
      var board = bl.querySelector('.cf-board');
      if(board){ board.classList.add('modo-board'); board.classList.remove('tech-on'); }
      var tag = bl.querySelector('.cf-modo-tag');
      if(tag && tag.textContent !== 'Pizarra pura') tag.textContent = 'Pizarra pura';
    });
  }

  /* ---------------------------------------------------------
     3 · FORMATO Y SUBTÍTULO COHERENTES CON EL TEXTO REAL
  --------------------------------------------------------- */
  function limpioFmt(s){
    return String(s || '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
      .replace(/\s{2,}/g, ' ').trim();
  }
  function coherencia(){
    document.querySelectorAll('.block').forEach(function(bl){
      var cuerpo = cuerpoDe(bl);
      var f = formatoReal(cuerpo);

      /* etiqueta del encabezado de la pizarra */
      var wf = bl.querySelector('.wod-board .wb-fmt');
      if(wf && f && limpioFmt(wf.textContent) !== f.lb) wf.textContent = f.lb;
      var cf = bl.querySelector('.cf-board .cf-fmt');
      if(cf){
        var lb = f ? f.lb : limpioFmt(cf.textContent);
        if(cf.textContent !== lb) cf.textContent = lb;
      }

      /* subtítulo de la tarjeta: nunca puede contradecir al bloque */
      var sub = bl.querySelector('.block-subtitle');
      if(!sub) return;
      var actual = (sub.textContent || '').trim();
      if(!actual) return;
      var partes = actual.split(/\s*[·|]\s*/).filter(Boolean);
      var dur = duracionReal(cuerpo, f);
      var resto = partes.filter(function(x){
        /* se descartan los tramos que declaran formato o tiempo */
        if(formatoReal(x)) return false;
        if(/\d{1,3}\s*(min|minutos?|minutes?|seg|s)\b|\d{1,2}:\d{2}/i.test(x)) return false;
        return true;
      });
      var nuevo = [];
      if(f) nuevo.push(f.lb);
      if(dur) nuevo.push(dur);
      nuevo = nuevo.concat(resto);
      var texto = nuevo.join(' · ').trim();
      if(texto && texto !== actual) sub.textContent = texto;
    });
  }

  /* ---------------------------------------------------------
     4 · MONTAJE
  --------------------------------------------------------- */
  function repintar(){ try{ sinRelojes(); pizarraPura(); coherencia(); }catch(e){} }
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
        setTimeout(repintar, 130);
        setTimeout(repintar, 460);
        return r;
      };
    }
    window.CoachPurga = { relojes: sinRelojes, pizarra: pizarraPura, coherencia: coherencia, formato: formatoReal };
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(mount, 300); });
  else setTimeout(mount, 300);
})();
