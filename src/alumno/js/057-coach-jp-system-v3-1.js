/* =========================================================
   COACH JP · SYSTEM v3.1 — ACCESIBILIDAD Y LIMPIEZA VISUAL
   · control Aa de tamaño de texto (Normal / Grande / Extra)
   · sin títulos repetidos entre la tarjeta y su pizarra
   · sin subtítulos vacíos del tipo "00 min"
========================================================= */
(function(){
  'use strict';
  var KFZ = 'coachjp_fz';
  /* directiva de accesibilidad (2026-09, seguimiento) -- etiquetas A / A+ /
     A++ pedidas explícitamente; se mantienen las claves internas n/g/x
     (data-fz="g"/"x", ver :root y html[data-fz] más arriba en el archivo)
     porque son las que ya lee toda la cascada de variables fz y fzs, y el
     localStorage 'coachjp_fz' ya persistido -- cambiar las claves ahora
     rompería la preferencia ya guardada de cualquier alumno/a que la haya
     usado. */
  var OPC = [
    { k:'n', a:'A',   b:'Normal' },
    { k:'g', a:'A+',  b:'Medio +20%' },
    { k:'x', a:'A++', b:'Grande +40%' }
  ];
  function actual(){
    var v = document.documentElement.getAttribute('data-fz');
    return (v === 'g' || v === 'x') ? v : 'n';
  }
  function aplicar(k){
    if(k === 'n') document.documentElement.removeAttribute('data-fz');
    else document.documentElement.setAttribute('data-fz', k);
    /* clave propia y aislada: no toca el progreso ni la sincronización en la nube */
    try{ localStorage.setItem(KFZ, k); }catch(e){}
    pintar();
  }
  function pintar(){
    var k = actual();
    var sw = document.getElementById('jpFzSwitch');
    if(sw){
      sw.querySelectorAll('.fz-p').forEach(function(p){
        p.classList.toggle('on', p.dataset.fz === k);
        p.setAttribute('aria-pressed', p.dataset.fz === k ? 'true' : 'false');
      });
    }
    /* botón de la fila superior: se mantiene sincronizado con el mismo
       estado (data-fz), sin importar si el coach o el alumno/a cambió el
       tamaño desde el drawer o desde acá -- una sola fuente de verdad. */
    var hb = document.getElementById('hdcFzBtn');
    if(hb){
      hb.setAttribute('data-fz-lvl', k);
      hb.setAttribute('aria-pressed', k !== 'n' ? 'true' : 'false');
    }
  }
  /* directiva crítica (2026-09) -- "el selector no está visible / sólo
     aparece un ícono comprimido que no abre nada": montarSwitch() apuntaba
     a ".hd-actions", que vive dentro de <header class="masthead hd-top">
     -- el header LEGADO que el propio archivo ya deja oculto a propósito
     (ver comentario "contenido legado... se mantiene en el DOM oculto"
     unas líneas más arriba). El switch se montaba ahí igual, sin tirar
     error (el elemento existe en el DOM), pero con getBoundingClientRect()
     en 0x0 -- invisible e inclicable para cualquier alumno/a real. Lo que
     el coach veía como "ícono comprimido" es #hdcInfoBtn, el disparador del
     drawer de Perfil/Info -- un botón distinto, no el switch Aa.
     Nuevo anchor: #hdpFzSlot, una fila fija dentro de ese mismo drawer
     (sección "Ajustes y utilidades", al lado de "Unidad de carga") que sí
     está siempre disponible. */
  function montarSwitch(){
    var yaEstaba = document.getElementById('jpFzSwitch');
    var h = document.getElementById('hdpFzSlot');
    if(yaEstaba && yaEstaba.parentNode === h){ pintar(); return; }
    if(!h) return;
    if(yaEstaba) yaEstaba.remove(); /* migra una única vez si quedó un switch viejo montado en el header legado */
    h.innerHTML = '<span class="hdp-row-lb">Tamaño de texto</span>';
    var sw = document.createElement('div');
    sw.id = 'jpFzSwitch';
    sw.className = 'jp-font-scaler';
    sw.setAttribute('role', 'group');
    sw.setAttribute('aria-label', 'Tamaño del texto');
    sw.innerHTML = OPC.map(function(o){
      return '<button type="button" class="fz-p jp-btn-font" data-fz="' + o.k + '" ' +
             'title="Texto ' + o.b + '" aria-label="Texto ' + o.b + '">' + o.a + '</button>';
    }).join('');
    h.appendChild(sw);
    sw.addEventListener('click', function(e){
      var p = e.target.closest('.fz-p');
      if(!p) return;
      e.preventDefault(); e.stopPropagation();
      aplicar(p.dataset.fz);
      try{ if(navigator.vibrate) navigator.vibrate(12); }catch(x){}
    });
    pintar();
    try{ if(window.CoachTopBar && CoachTopBar.repintar) CoachTopBar.repintar(); }catch(e){}
  }

  /* directiva de accesibilidad (2026-09, 2do seguimiento) -- control directo
     en la fila superior (#hdcFzBtn, ya en el HTML base junto a #hdcInfoBtn):
     ciclo de 3 estados con un solo botón, más práctico que sumar 2-3
     botones nuevos en una fila que ya tiene escudo + identidad + chips +
     ficha. Reusa aplicar()/actual() -- mismo estado que el switch del
     drawer, ambos quedan sincronizados por pintar(). */
  var CICLO = ['n', 'g', 'x'];
  var ETIQ_TOAST = { n:'Normal', g:'Grande', x:'Muy Grande' };
  function siguienteNivel(){
    var i = CICLO.indexOf(actual());
    return CICLO[(i + 1) % CICLO.length];
  }
  function montarBotonHeader(){
    var b = document.getElementById('hdcFzBtn');
    if(!b || b.dataset.wired === '1') { pintar(); return; }
    b.dataset.wired = '1';
    b.addEventListener('click', function(e){
      e.preventDefault(); e.stopPropagation();
      var nuevo = siguienteNivel();
      aplicar(nuevo);
      try{ if(navigator.vibrate) navigator.vibrate(nuevo === 'n' ? 10 : [10, 30, 10]); }catch(x){}
      try{ if(typeof aviso === 'function') aviso('info', '🔤', 'Texto: ' + ETIQ_TOAST[nuevo], '', 1400); }catch(x){}
    });
    pintar();
  }

  /* ---------------------------------------------------------
     SIN TÍTULOS DUPLICADOS ENTRE LA TARJETA Y SU PIZARRA
  --------------------------------------------------------- */
  function nrm(t){
    return String(t || '').replace(/\s+/g, ' ').trim().toLowerCase()
      .replace(/[^a-z0-9áéíóúñ ]/g, '').trim();
  }
  function limpiarTitulos(){
    document.querySelectorAll('.block').forEach(function(bl){
      var lb = bl.querySelector('.block-label');
      if(!lb) return;
      var t = nrm(lb.textContent);
      if(!t) return;
      bl.querySelectorAll('.cf-board .cf-t, .wod-board .wb-t').forEach(function(x){
        var d = nrm(x.textContent);
        /* la pizarra no repite el título de su propia tarjeta */
        x.style.display = (d && (d === t || t.indexOf(d) >= 0 || d.indexOf(t) >= 0)) ? 'none' : '';
      });
      /* el subtítulo tampoco repite lo que ya dice el título */
      var sub = bl.querySelector('.block-subtitle');
      if(sub){
        var st = nrm(sub.textContent);
        var vacio = /^0+\s*(min|minutos?|seg|s)?$/i.test(sub.textContent.replace(/\s+/g, ' ').trim());
        /* tampoco repite lo que ya declara el banner de protocolo */
        var tag2 = bl.querySelector('.blk-tag');
        var enTag = !!(st && tag2 && nrm(tag2.textContent).indexOf(st) >= 0);
        sub.style.display = (!st || vacio || st === t || enTag) ? 'none' : '';
      }
      /* si el protocolo se repite, gana la línea grande de la pizarra:
         el subtítulo chico de la tarjeta es el que se calla */
      if(sub){
        var st2 = nrm(sub.textContent);
        var heads = [].slice.call(bl.querySelectorAll('.cf-body .cf-line.head, .wb-body .wb-line.head'));
        heads.forEach(function(h){ h.style.display = ''; });
        var choca = heads.filter(function(h){
          if(getComputedStyle(h).display === 'none') return false;
          if(!h.offsetParent && h.offsetHeight === 0) return false;   /* pizarra oculta */
          var ht = nrm(h.textContent);
          return ht && st2 && (ht === st2 || (ht.length > 6 && st2.indexOf(ht) >= 0) ||
                               (st2.length > 6 && ht.indexOf(st2) >= 0));
        });
        if(choca.length) sub.style.display = 'none';
      }
    });
  }

  /* ---------------------------------------------------------
     UNA LÍNEA CON PRESCRIPCIÓN NO ES UNA CABECERA
     Evita que "01. 2 Front Squats @ 82% 1RM" se pinte como
     eyebrow chiquito en lugar de como ejercicio legible.
  --------------------------------------------------------- */
  var RX_FMT = /^(amrap|emom|every|for\s*time|tabata|chipper|rounds?\s*for\s*time|\d+\s*(rondas?|rounds?|sets?|series)\b|in\s*\d)/i;
  var RX_DOSIS = /@|%|\bkg\b|\blbs?\b|\breps?\b|\bcal\b|\d+\s*[x\u00d7]\s*\d+|\d+\s*(m|km|cm)\b/i;
  function reclasificar(){
    document.querySelectorAll('.cf-line.head, .wb-line.head').forEach(function(l){
      var t = (l.textContent || '').replace(/\s+/g, ' ').trim();
      if(!t || RX_FMT.test(t)) return;
      if(/\d/.test(t) && RX_DOSIS.test(t) && !/:\s*$/.test(t)) l.classList.remove('head');
    });
  }
  /* ---------------------------------------------------------
     LA DOSIS SE DICE UNA SOLA VEZ
     Si el banner del bloque ya declara series y reps, la fila
     del ejercicio sólo agrega lo que suma (tempo, carga, lado).
  --------------------------------------------------------- */
  function desduplicarDosis(){
    document.querySelectorAll('.block').forEach(function(bl){
      var tag = bl.querySelector('.blk-tag');
      if(!tag) return;
      var base = {};
      String(tag.textContent || '').split(/[·\u2022\u25cf|]/).forEach(function(x){
        var t = nrm(x); if(t) base[t] = 1;
      });
      /* el banner del bloque ya lo dijo: la píldora del ejercicio no lo repite */
      bl.querySelectorAll('.rx-badge').forEach(function(r){
        var spans = [].slice.call(r.querySelectorAll(':scope > span:not(.rx-sep)'));
        if(spans.length < 2) return;
        var borro = false;
        spans.forEach(function(sp){
          if(!base[nrm(sp.textContent)]) return;
          var sep = sp.nextElementSibling && sp.nextElementSibling.classList.contains('rx-sep')
                  ? sp.nextElementSibling
                  : (sp.previousElementSibling && sp.previousElementSibling.classList.contains('rx-sep')
                     ? sp.previousElementSibling : null);
          if(sep) sep.remove();
          sp.remove(); borro = true;
        });
        if(borro && !r.querySelector(':scope > span:not(.rx-sep)')) r.style.display = 'none';
      });
      bl.querySelectorAll('.ex-detail').forEach(function(d){
        if(d.dataset.dedup === '1' && d.dataset.dedupSrc === d.textContent) return;
        var partes = d.textContent.split(/\s*·\s*/);
        var quedan = partes.filter(function(x){ return x.trim() && !base[nrm(x)]; });
        if(quedan.length === partes.length) return;      /* nada que recortar */
        var txt = quedan.join(' · ').trim();
        if(!txt){ d.style.display = 'none'; d.dataset.dedup = '1'; return; }
        d.textContent = txt;
        d.dataset.dedup = '1';
        d.dataset.dedupSrc = txt;
      });
    });
  }
  function repintar(){
    try{ montarSwitch(); }catch(e){ console.warn('v31·aa', e); }
    try{ montarBotonHeader(); }catch(e){ console.warn('v31·aa-header', e); }
    try{ reclasificar(); }catch(e){ console.warn('v31·heads', e); }
    try{ limpiarTitulos(); }catch(e){ console.warn('v31·titulos', e); }
    try{ desduplicarDosis(); }catch(e){ console.warn('v31·dosis', e); }
  }
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
        setTimeout(function(){ propio = false; }, 260);
      }, 240);
    }, main);
    [400, 900, 1800, 3000, 5000].forEach(function(ms){ setTimeout(repintar, ms); });
    /* este módulo corre después de los que construyen las píldoras del bloque */
    if(typeof window.renderMain === 'function'){
      var _rm = window.renderMain;
      window.renderMain = function(){
        var r = _rm.apply(this, arguments);
        [500, 1200, 2400, 4000].forEach(function(ms){ setTimeout(repintar, ms); });
        return r;
      };
    }
    window.CoachTexto = { fijar: aplicar, actual: actual, repintar: repintar };
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(mount, 760); });
  else setTimeout(mount, 760);
})();
