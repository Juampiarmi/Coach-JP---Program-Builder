/* =========================================================
   COACH JP · pizarra modular de CrossFit
========================================================= */
(function(){
  function bloqueDe(id){
    var d = (typeof getCurrentDay === 'function') ? getCurrentDay() : null;
    if(!d || !id) return null;
    var todos = (d.blocks || []).concat(d.finisher ? [d.finisher] : [], d.hyrox ? [d.hyrox] : []);
    return todos.filter(function(b){ return b.id === id; })[0] || null;
  }
  var VACIAS = { de:1, del:1, la:1, el:1, los:1, las:1, con:1, en:1, por:1, para:1, y:1, a:1,
                 cada:1, min:1, mins:1, minutos:1, seg:1, segundos:1, reps:1, rep:1, rondas:1,
                 ronda:1, series:1, serie:1, cal:1, calorias:1, metros:1, m:1, kg:1, x:1 };
  function nrm(s){
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }
  function tokens(s){
    return nrm(s).split(' ').filter(function(t){
      return t.length > 2 && !VACIAS[t] && !/^\d+$/.test(t);
    });
  }
  /* busca el movimiento en el mapa de videos del programa */
  /* nombres candidatos dentro de una línea de pizarra, sin números ni unidades */
  function movimientos(txt){
    var t = String(txt || '').replace(/^[\s\-•*]+/, '')
      .replace(/^(?:\d+\s*(?:sets?|series?|rondas?|rounds?|reps?|x)\b[:.]?\s*)+/i, '');
    return t.split(/\s*\+\s*|\s*\/\s*/).map(function(p){
      return p.replace(/\([^)]*\)/g, ' ')
              .replace(/[—–]\s*.*$/, '')
              .replace(/^\s*\d+\s*(?:m|km|s|seg|segundos?|min|minutos?|cal|kg|lbs?|reps?|x)?\s*/i, '')
              .replace(/\b\d+\s*(?:kg|lbs?|cal|m|s|seg|min|%)\b.*$/i, '')
              .replace(/\bx\s*\d+.*$/i, '')
              .replace(/\s{2,}/g, ' ').trim();
    }).filter(function(s){ return s.length > 2; });
  }
  /* coincidencia 100% exacta con la biblioteca: cero asignación por aproximación */
  function videoDe(txt){
    if(typeof VIDEO_MAP === 'undefined' || !VIDEO_MAP) return null;
    var mapa = {};
    Object.keys(VIDEO_MAP).forEach(function(k){ if(VIDEO_MAP[k]) mapa[nrm(k)] = k; });
    var cand = movimientos(txt);
    for(var i = 0; i < cand.length; i++){
      var k = nrm(cand[i]);
      if(k && mapa[k]) return { id: VIDEO_MAP[mapa[k]], nombre: mapa[k] };
    }
    return null;
  }
  var PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.2v13.6L19 12z"/></svg>';

  /* ---------------------------------------------------------
     1 · MODO DE VIDEO POR BLOQUE
  --------------------------------------------------------- */
  function modos(){
    document.querySelectorAll('.block').forEach(function(bl){
      var b = bloqueDe(bl.dataset.blockId);
      if(!b) return;
      /* un WOD nunca lleva video embebido: la pizarra pura es obligatoria */
      var cuerpo = (bl.textContent || '').replace(/\s+/g, ' ');
      var esWod = bl.classList.contains('cat-metcon') || !!bl.querySelector('.wod-board') ||
                  /\bemom\b|\bamrap\b|for\s*time|\brft\b|tabata|chipper|met.?con|\bwod\b/i.test(cuerpo);
      var tech = (b.boardMode === 'tech') && !esWod;
      var board = bl.querySelector('.cf-board') || bl.querySelector('.wod-board');
      if(!board) return;
      if(board.dataset.modo !== (tech ? 'tech' : 'board')){
        board.dataset.modo = tech ? 'tech' : 'board';
        board.classList.toggle('tech-on', tech);
        /* el modo es configuración del Builder: el alumno no ve metadatos internos */
        var viejo = board.querySelector('.cf-modo-tag');
        if(viejo) viejo.remove();
      }
      if(!tech){
        bl.querySelectorAll('.cf-vd').forEach(function(v){ v.remove(); });
        return;
      }
      /* modo técnico: cada movimiento reconocido suma su acceso al video */
      board.querySelectorAll('.cf-line:not(.head), .wb-line:not(.head)').forEach(function(l){
        if(l.querySelector('.cf-vd')) return;
        var destino = l.querySelector('span:not(.n):not(.det)') || l;
        /* vinculación estricta: sólo si el movimiento existe tal cual en la biblioteca */
        var v = videoDe(destino.textContent);
        if(!v || !v.id) return;
        var a = document.createElement('a');
        a.className = 'cf-vd';
        a.innerHTML = PLAY + 'Video';
        a.href = 'javascript:void(0)';
        a.dataset.yt = v.id;
        a.title = 'Ver la técnica de ' + v.nombre;
        a.addEventListener('click', function(ev){
          ev.stopPropagation();
          try{ if(typeof openVideoPopup === 'function') openVideoPopup(v.id); }catch(e){}
        });
        destino.appendChild(a);
      });
    });
  }

  /* ---------------------------------------------------------
     2 · CIERRE TÉCNICO DEL BLOQUE (sin emojis)
  --------------------------------------------------------- */
  function esc(s){
    return String(s || '')
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
  }
  function cierres(){
    document.querySelectorAll('.block').forEach(function(bl){
      var viejo = bl.querySelector('.cf-cierre');
      /* la Pizarra Táctica (jp-cfboard) ya pinta su propio acordeón de
         objetivo/tips/pacing/escalado -- pintarlo también acá lo duplica */
      if(bl.querySelector('.jp-cf-acc')){ if(viejo) viejo.remove(); return; }
      var b = bloqueDe(bl.dataset.blockId);
      var c = b && b.cierre;
      if(!c || !(c.objetivo || c.tips || c.pacing)){ if(viejo) viejo.remove(); return; }
      var html =
        (c.objetivo ? '<div class="cc-s"><h5>Objetivo fisiol&oacute;gico / est&iacute;mulo</h5><p>' + esc(c.objetivo) + '</p></div>' : '') +
        (c.tips ? '<div class="cc-s"><h5>Coaching tips y pautas t&eacute;cnicas</h5><p>' + esc(c.tips) + '</p></div>' : '') +
        (c.pacing ? '<div class="cc-s"><h5>Estrategia de ritmo / pacing</h5><p>' + esc(c.pacing) + '</p></div>' : '');
      if(viejo){
        if(viejo.innerHTML !== html) viejo.innerHTML = html;
        var bd = bl.querySelector('.cf-board') || bl.querySelector('.wod-board');
        if(bd && viejo.parentNode !== bd) bd.appendChild(viejo);
        return;
      }
      var caja = document.createElement('div');
      caja.className = 'cf-cierre';
      caja.innerHTML = html;
      var board = bl.querySelector('.cf-board') || bl.querySelector('.wod-board');
      if(board) board.appendChild(caja);
      else (bl.querySelector('.block-body') || bl).appendChild(caja);
    });
  }

  /* ---------------------------------------------------------
     3 · SIN RELOJES DENTRO DE LAS TARJETAS
        el único temporizador es el Custom WOD Timer de la barra
  --------------------------------------------------------- */
  function sinRelojes(){
    document.querySelectorAll('.quick-timer, .quick-timer-slot, .wod-timer-slot, .round-timer')
      .forEach(function(t){ t.remove(); });
  }

  /* ---------------------------------------------------------
     4 · MONTAJE
  --------------------------------------------------------- */
  function repintar(){ try{ sinRelojes(); modos(); cierres(); }catch(e){} }
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
        setTimeout(function(){ propio = false; }, 160);
      }, 140);
    }, main);
    if(typeof window.renderMain === 'function'){
      var _rm = window.renderMain;
      window.renderMain = function(){
        var r = _rm.apply(this, arguments);
        setTimeout(repintar, 110);
        setTimeout(repintar, 420);
        return r;
      };
    }
    window.CoachPizarraCF = { modos: modos, cierres: cierres, repintar: repintar };
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(mount, 260); });
  else setTimeout(mount, 260);
})();
