/* =========================================================
   COACH JP · bloques enlazados + finisher estructurado
========================================================= */
(function(){
  /* ---------------------------------------------------------
     1 · CÁPSULA TÁCTICA DE BISET / SUPERSET / TRI-SET
        jerarquía: título del bloque > estructura > intensidad
  --------------------------------------------------------- */
  function capsula(){
    document.querySelectorAll('.block .superset-header').forEach(function(sh){
      var cuerpo = sh.closest('.block-body');
      if(!sh.dataset.v2){
        var crudo = (sh.textContent || '').replace(/\s+/g, ' ').trim();
        var tipo = (crudo.match(/TRI-?SET|BISET|SUPERSET/i) || ['BISET'])[0].toUpperCase().replace('TRISET', 'TRI-SET');
        var rondas = (crudo.match(/(\d+)\s*RONDAS?/i) || [])[1] || '';
        /* lo que no es estructura (RPE, fallo técnico) baja a la línea secundaria */
        var resto = crudo.split(/·/).map(function(s){ return s.trim(); })
          .filter(function(s){ return s && !/TRI-?SET|BISET|SUPERSET/i.test(s) && !/^\d+\s*RONDAS?$/i.test(s); })
          .join(' · ');
        var html = '<span class="sh-kind">Linked Block</span>' +
          '<span class="sh-dot">&#9679;</span>' +
          '<span class="sh-text">' + tipo + (rondas ? ' <b>(' + rondas + ' RONDAS TOTALES)</b>' : '') + '</span>' +
          (resto ? '<span class="sh-meta">' + resto + '</span>' : '');
        if(sh.innerHTML !== html) sh.innerHTML = html;
        sh.dataset.v2 = '1';
      }
      /* por encima de la caja de sugerencia de intensidad */
      if(cuerpo && cuerpo.firstElementChild !== sh) cuerpo.insertBefore(sh, cuerpo.firstElementChild);
    });
  }

  /* ---------------------------------------------------------
     2 · FINISHER ESTRUCTURADO (exclusivo Bodybuilding)
  --------------------------------------------------------- */
  function finisher(){
    var main = document.getElementById('mainContent');
    if(!main) return;
    var vista = main.querySelector('.day-view');
    var dia = (typeof getCurrentDay === 'function') ? getCurrentDay() : null;
    var f = dia && dia.finisherIA;
    var viejo = main.querySelector('.fin-block');
    var cf = document.body.classList.contains('cf-modo');
    if(!vista || !f || !f.protocolo || cf){ if(viejo) viejo.remove(); return; }
    var html =
      '<div class="fb-eyebrow">Finisher &middot; Bloque de congesti&oacute;n final</div>' +
      '<div class="fb-proto">' + txt(f.protocolo) + '</div>' +
      (f.trabajo ? '<div class="fb-work">' + lineas(f.trabajo) + '</div>' : '') +
      (f.objetivos ? '<div class="fb-sec"><h5>Objetivos fisiol&oacute;gicos</h5><p>' + txt(f.objetivos) + '</p></div>' : '') +
      (f.tips ? '<div class="fb-sec"><h5>Coaching tips y estrategia</h5><p>' + txt(f.tips) + '</p></div>' : '');
    if(viejo){ if(viejo.innerHTML !== html) viejo.innerHTML = html; return; }
    var caja = document.createElement('div');
    caja.className = 'fin-block';
    caja.innerHTML = html;
    var stack = vista.querySelector('.blocks-stack');
    if(stack && stack.parentNode) stack.parentNode.insertBefore(caja, stack.nextSibling);
    else vista.appendChild(caja);
  }
  /* el protocolo formateado se pinta línea por línea, con su numeración en volt */
  function lineas(s){
    return String(s || '').split(/\r?\n/).map(function(l){
      var t = txt(l);
      if(!t) return '';
      var m = t.match(/^(\d{1,2})[.)]\s*(.+)$/);
      if(m) return '<div class="fw-l"><span class="fw-n">' + m[1] + '</span>' + m[2] + '</div>';
      return '<div class="fw-l fw-h">' + t + '</div>';
    }).join('');
  }
  /* regla estricta del módulo: nada de emojis en el texto generado */
  function txt(s){
    return String(s || '')
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .trim();
  }

  /* ---------------------------------------------------------
     3 · MONTAJE
  --------------------------------------------------------- */
  function repintar(){ try{ capsula(); finisher(); }catch(e){} }
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
        setTimeout(function(){ propio = false; }, 150);
      }, 120);
    }, main);
    if(typeof window.renderMain === 'function'){
      var _rm = window.renderMain;
      window.renderMain = function(){
        var r = _rm.apply(this, arguments);
        setTimeout(repintar, 90);
        setTimeout(repintar, 380);
        return r;
      };
    }
    window.CoachLinked = { capsula: capsula, finisher: finisher, repintar: repintar };
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(mount, 220); });
  else setTimeout(mount, 220);
})();
