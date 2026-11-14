/* =========================================================
   COACH JP · entrada en calor compacta y metcon sin duplicados
========================================================= */
(function(){
  function bloqueDe(id){
    var d = (typeof getCurrentDay === 'function') ? getCurrentDay() : null;
    if(!d || !id) return null;
    var todos = (d.blocks || []).concat(d.finisher ? [d.finisher] : [], d.hyrox ? [d.hyrox] : []);
    return todos.filter(function(b){ return b.id === id; })[0] || null;
  }
  var RX_WARM = /entrada en calor|warm.?up|movilidad|activaci[óo]n|cool.?down|vuelta a la calma/i;
  function esWarm(b, bl){
    /* un bloque con series, biset o finisher es trabajo medible: nunca warm-up */
    if(b && (b.isBlock || b.isSuperset || b.isFinisher)) return false;
    if(bl.querySelector('.set-row, .set-tracker')) return false;
    if(b && b.blockType && /warm/i.test(b.blockType)) return true;
    if(b && b.boardFmt && /WARM/i.test(b.boardFmt)) return true;
    if(b && b.category === 'warmup') return true;
    if(bl.classList.contains('cat-warmup')) return true;
    /* sólo el título del bloque decide, nunca una palabra suelta del subtítulo */
    var t = ((b && b.title) || (bl.querySelector('.block-label') || {}).textContent || '').trim();
    return /^(?:\\W*)?(entrada en calor|warm.?up|movilidad|activaci[óo]n|cool.?down|vuelta a la calma)/i.test(t);
  }
  function esc(s){
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  /* rótulo táctico del bloque para prefijar cada fase ("[ CALENTAMIENTO ·
     FASE 1: ... ]") -- el mismo esWarm() cubre entrada en calor Y vuelta
     a la calma bajo un único diseño (.wu-card), así que el prefijo tiene
     que distinguir cuál de los dos es para no rotular un cool-down como
     "Calentamiento". Los corchetes los pone el CSS (.wu-fase::before/
     ::after); acá sólo se arma el texto de adentro. */
  var RX_ENFRIAMIENTO = /cool.?down|vuelta a la calma|enfriamiento/i;
  function prefijoFase(b){
    var t = ((b && b.title) || '') + ' ' + ((b && b.subtitle) || '');
    return RX_ENFRIAMIENTO.test(t) ? 'ENFRIAMIENTO' : 'CALENTAMIENTO';
  }
  /* separa la dosis (tiempo, reps, distancia) del nombre del ejercicio */
  function partir(txt){
    var t = String(txt || '').replace(/\\s+/g, ' ').trim();
    if(!t) return null;
    var dosis = '', nombre = t;
    var m;
    /* «Row 4 min», «Bicicleta o cinta — 6 min progresivos» -- \\s+ (no \\s*)
       alrededor del guion a propósito: un guion sin espacio a los lados
       casi siempre es parte de un nombre compuesto ("Pass-Through",
       "Sit-up", "Face-pull"), no el separador nombre/dosis. Con \\s*
       .*? no-codicioso paraba en ESE guion interno (ej. "Banded Pass" +
       "Through — 15 reps", que igual "parecía" válido porque el resto
       tenía un dígito) y perdía la dosis real más adelante. Exigir
       espacio real de los dos lados obliga a saltar los guiones de
       compuestos y llegar al separador real. */
    if((m = t.match(/^(.*?)\\s+[—–-]\\s+(.+)$/)) && /\\d/.test(m[2])){
      nombre = m[1].trim(); dosis = m[2].trim();
    }
    /* «3x12 Curl», «2x15 Face pull» */
    else if((m = t.match(/^(\\d+\\s*[x×]\\s*\\d+[^\\s]*)\\s+(.+)$/i))){ dosis = m[1]; nombre = m[2]; }
    /* «15 Banded pass-through», «10/10 Puente de glúteo» */
    else if((m = t.match(/^(\\d+\\s*\\/\\s*\\d+|\\d+)\\s*(reps?|s|seg|segundos?|min|minutos?|m|km|cal)?\\s+(.+)$/i))){
      dosis = (m[1] + (m[2] ? ' ' + m[2] : '')).trim(); nombre = m[3];
    }
    /* «Row 5:00 @ suave» */
    else if((m = t.match(/^(.+?)\\s+(\\d+:\\d{2}|\\d+\\s*(?:min|minutos?|s|seg))\\b(.*)$/i))){
      nombre = (m[1] + (m[3] || '')).trim(); dosis = m[2];
    }
    if(dosis){
      dosis = dosis.replace(/\\breps?\\b/i, 'reps').replace(/\\bminutos?\\b/i, 'min')
                   .replace(/\\bsegundos?\\b/i, 's').replace(/\\s{2,}/g, ' ').trim();
      /* se queda sólo la parte numérica; lo demás vuelve al nombre */
      var md = dosis.match(/^(\\d+\\s*[x×]\\s*\\d+\\s*(?:s|seg|min|reps)?|\\d+\\s*\\/\\s*\\d+|\\d+\\s*(?:min|s|seg|reps|m|km|cal)?)\\b/i);
      if(md && md[1] && md[1].length < dosis.length){
        var cola = dosis.slice(md[1].length).trim();
        if(cola) nombre = (nombre + ' ' + cola).replace(/\\s{2,}/g, ' ').trim();
        dosis = md[1].trim();
      }
      if(dosis.length > 16) { nombre = t; dosis = ''; }
    }
    return { dosis: dosis, nombre: nombre.replace(/^[·•\\-\\s]+/, '').trim() };
  }

  /* ---------------------------------------------------------
     1 · ENTRADA EN CALOR: CHECKLIST DE LECTURA RÁPIDA
  --------------------------------------------------------- */
  function warmup(){
    document.querySelectorAll('.block').forEach(function(bl){
      var b = bloqueDe(bl.dataset.blockId);
      /* directiva ("Clonar experiencia pura de CrossFit", requerimiento 2):
         este conversor es genérico (detecta "warm-up" por TÍTULO, sin
         mirar disciplina) y corre para cualquier .block -- un Bloque de
         Pizarra Sports titulado "Entrada en calor"/"Movilidad" (nombre
         perfectamente normal que un coach le pondría) quedaba duplicado:
         pizarraSports() ya dibuja SU PROPIA fila limpia dosis+nombre para
         estos casos (ver requerimiento 2 de la misma directiva), así que
         este módulo -- pensado para el viejo bloque 'list' clásico -- se
         retira por completo de cualquier bloque marcado b.sportsPizarra.
         Nunca se ejecuta para CrossFit (b.sportsPizarra no existe ahí). */
      if(!esWarm(b, bl) || (b && b.sportsPizarra)){ bl.classList.remove('wu-card'); return; }
      bl.classList.add('wu-card');
      /* fuera todo lo que pertenece a un bloque de trabajo medible */
      bl.querySelectorAll('.rx-badge, .mini-log, .set-tracker, .jp-tools, .rir-bar, .load-suggest, .pre-bar, .blk-tag, .cf-score, .wod-score, .cf-proto, .cf-levels')
        .forEach(function(x){ x.remove(); });

      var origen = bl.querySelector('.cf-board .cf-body') || bl.querySelector('.wb-body');
      var filas = [];
      if(origen){
        origen.querySelectorAll('.cf-line, .wb-line').forEach(function(l){
          var head = l.classList.contains('head');
          var txt = (l.querySelector('span:not(.n)') || l).textContent;
          var vidEl = l.querySelector('.video-link');
          filas.push({ head: head, txt: txt, vid: vidEl ? vidEl.outerHTML : '' });
        });
      } else {
        bl.querySelectorAll('.block-body .ex-row, .block-body .wu-phase').forEach(function(r){
          if(r.classList.contains('wu-phase')){ filas.push({ head:true, txt:r.textContent, vid:'' }); return; }
          var n = r.querySelector('.ex-name');
          var d = r.querySelector('.ex-detail');
          var vidEl = r.querySelector('.video-link');
          var nombre = n ? (n.childNodes[0] ? n.childNodes[0].textContent : n.textContent) : r.textContent;
          filas.push({ head:false, txt: String(nombre || '').trim() + (d ? ' — ' + d.textContent.trim() : ''), vid: vidEl ? vidEl.outerHTML : '' });
        });
      }
      filas = filas.filter(function(f){ return String(f.txt || '').replace(/\\s+/g, ' ').trim(); });
      if(!filas.length){ return; }

      /* directiva de refactor (2026-09): el video demostrativo del ítem NO
         puede perderse al reconstruir la lista limpia -- antes se
         descartaba (solo se leía el texto), dejando el warm-up sin acceso
         a video. Se conserva el <a class="video-link"> original tal cual
         (mismo data-yt/thumbnail que ya arma videoLinkHtml) y se reinserta
         a la derecha del nombre, igual que en los bloques principales. */
      var prefijo = prefijoFase(b);
      var html = filas.map(function(f){
        var t = String(f.txt).replace(/\\s+/g, ' ').trim();
        if(f.head || /^\\d+\\s*[\\.\\)]\\s/.test(t) || /:$/.test(t))
          return '<div class="wu-fase">' + esc(prefijo + ' \\u00b7 ' + t.replace(/^\\d+\\s*[\\.\\)]\\s*/, '').replace(/:$/, '')) + '</div>';
        var p = partir(t);
        if(!p) return '';
        return '<div class="wu-item">' +
          (p.dosis ? '<span class="wu-dose">' + esc(p.dosis) + '</span>' : '<span class="wu-dose">·</span>') +
          '<span class="wu-name">' + esc(p.nombre) + '</span>' + (f.vid || '') + '</div>';
      }).join('');

      var lista = bl.querySelector('.wu-list');
      if(!lista){
        lista = document.createElement('div');
        lista.className = 'wu-list';
        var cuerpo = bl.querySelector('.block-body') || bl;
        cuerpo.insertBefore(lista, cuerpo.firstElementChild);
      }
      if(lista.innerHTML !== html) lista.innerHTML = html;
      /* el contenido original queda oculto: la lista limpia lo reemplaza */
      bl.querySelectorAll('.ex-row, .wu-phase').forEach(function(x){ x.style.display = 'none'; });
      if(origen) origen.style.display = 'none';
      var brd = bl.querySelector('.cf-board, .wod-board');
      if(brd){
        brd.style.background = 'transparent';
        brd.style.border = 'none';
        var h = brd.querySelector('.cf-h, .wb-h');
        if(h) h.style.display = 'none';
      }
    });
  }

  /* ---------------------------------------------------------
     2 · METCON: UNA SOLA ESTRUCTURA, SIN TEXTO REPETIDO
  --------------------------------------------------------- */
  function nrm(s){ return String(s || '').toLowerCase().replace(/\\s+/g, ' ').trim().replace(/[:.]$/, ''); }
  function sinDuplicados(){
    document.querySelectorAll('.block').forEach(function(bl){
      if(bl.classList.contains('wu-card')) return;
      var proto = nrm((bl.querySelector('.cf-proto') || {}).textContent);
      var vistas = {};
      bl.querySelectorAll('.cf-line, .wb-line').forEach(function(l){
        var t = nrm((l.querySelector('span:not(.n)') || l).textContent);
        if(!t) return;
        /* la línea que repite el protocolo o una línea ya mostrada se oculta */
        if((proto && t === proto) || vistas[t]) l.classList.add('dup');
        else { vistas[t] = 1; l.classList.remove('dup'); }
      });
      /* la numeración se recalcula sobre lo que realmente se ve */
      var n = 0;
      bl.querySelectorAll('.cf-line, .wb-line').forEach(function(l){
        if(l.classList.contains('dup') || l.classList.contains('head')) return;
        n++;
        var num = l.querySelector('span.n');
        var board = l.closest('.cf-board, .wod-board');
        var volt = board && board.classList.contains('board-volt');
        var txt = volt ? (n < 10 ? '0' + n : String(n)) : String(n);
        if(num && num.textContent !== txt) num.textContent = txt;
      });
    });
  }

  function repintar(){ try{ warmup(); sinDuplicados(); }catch(e){} }
  /* click delegado para el botón de video reinsertado en .wu-list: el
     bloque se reconstruye por completo en cada repintado (innerHTML), así
     que un listener atado a un <a> puntual no sobrevive; delegando en el
     documento una sola vez alcanza para siempre, sin importar cuántas
     veces se repinte la lista. */
  document.addEventListener('click', function(e){
    var link = e.target.closest && e.target.closest('.wu-list .video-link');
    if(!link) return;
    var ytid = link.dataset.yt;
    if(ytid && typeof openVideoPopup === 'function') openVideoPopup(ytid);
  });
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
        setTimeout(function(){ propio = false; }, 190);
      }, 180);
    }, main);
    if(typeof window.renderMain === 'function'){
      var _rm = window.renderMain;
      window.renderMain = function(){
        var r = _rm.apply(this, arguments);
        setTimeout(repintar, 200);
        setTimeout(repintar, 600);
        return r;
      };
    }
    window.CoachWarmUp = { repintar: repintar, esWarm: esWarm, partir: partir };
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(mount, 380); });
  else setTimeout(mount, 380);
})();
