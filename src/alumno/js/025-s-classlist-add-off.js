(function(){
  'use strict';
  var SPL_T0 = Date.now(), SPL_MIN = 300;
  function ocultarSplash(){
    if(window.__jpHold){ setTimeout(ocultarSplash, 60); return; }
    var falta = SPL_MIN - (Date.now() - SPL_T0);
    if(falta > 0){ setTimeout(ocultarSplash, falta); return; }
    var s = document.getElementById('jpSplash');
    if(!s) return;
    s.classList.add('off');
    setTimeout(function(){ if(s && s.parentNode) s.parentNode.removeChild(s); }, 380);
  }
  function listo(){
    /* se espera al primer render real de la sesión */
    var t0 = Date.now();
    var chequear = function(){
      var hay = document.querySelector('#mainContent .block, #mainContent .card, .week-selector-wrap');
      if(hay || Date.now() - t0 > 900){ setTimeout(ocultarSplash, 40); return; }
      setTimeout(chequear, 90);
    };
    chequear();
  }
  if(document.readyState === 'complete' || document.readyState === 'interactive') listo();
  else document.addEventListener('DOMContentLoaded', listo);
  window.addEventListener('load', function(){ setTimeout(ocultarSplash, 120); });
  /* reintento continuo: no depende de un único disparo ni del momento de parseo */
  (function insistir(){
    var t0 = Date.now();
    (function tick(){
      var s = document.getElementById('jpSplash');
      if(!s) return;                                  /* ya se fue */
      if(s.classList.contains('off')) return;
      if(Date.now() - t0 > 900) ocultarSplash();
      if(Date.now() - t0 < 15000) setTimeout(tick, 150);
    })();
  })();
  window.CoachSplash = { ocultar: ocultarSplash };

  /* =========================================================
     HEADER: subtítulo oficial sin repetir la marca
  ========================================================= */
  function header(){
    var c = document.querySelector('.hd-cert');
    /* Checkpoint 3: el subtítulo ahora es el diferenciador de disciplina en
       vez de un texto fijo -- mismo mecanismo de siempre (se reafirma en
       cada repintado), sólo cambia qué etiqueta y qué color le impone. */
    var esCF = window.COACH_DISCIPLINA === 'crossfit';
    var etiqueta = esCF ? 'CROSSFIT & HYROX TACTICAL' : 'BODYBUILDING & SPORTS PERFORMANCE';
    if(c && c.textContent.replace(/\\s+/g, ' ').trim() !== etiqueta) c.textContent = etiqueta;
    if(c) c.style.setProperty('color', esCF ? '#D2793F' : '#38BDF8', 'important');
  }

  /* =========================================================
     CÁPSULAS VISIBLES DEL ASISTENTE DE CARGA
  ========================================================= */
  /* UX/UI integral (13/09), parte 3: se retira por completo el botón
     "Asistente de Discos" (bullet 2 de la directiva). "Series de
     Aproximación" no se elimina -- se ocultaba/reducía en la tarjeta a un
     enlace diminuto ("[ + Ver aproximación ]") para que no compita con
     las series efectivas reales, en vez de un botón de ancho completo. */
  function capsulas(){
    document.querySelectorAll('.block').forEach(function(bl){
      var box = bl.querySelector('.jp-tools');
      if(!box || box.dataset.cap === '1') return;
      if(!bl.querySelector('.set-row')) return;
      box.dataset.cap = '1';
      box.innerHTML = '';
      box.classList.add('jp-tools-mini');
      var link = document.createElement('button');
      link.type = 'button'; link.className = 'cap-tool-mini';
      link.innerHTML = '[ + Ver aproximación ]';
      link.addEventListener('click', function(){
        if(window.CoachHerramientas) window.CoachHerramientas.abrir(bl);
      });
      box.appendChild(link);
      /* la salida vieja del bloque ya no se usa: todo va al modal */
      var out = bl.querySelector('.jp-out'); if(out) out.remove();
      /* las cápsulas van justo encima de las series */
      var tracker = bl.querySelector('.set-tracker');
      if(tracker && tracker.parentNode && box.nextElementSibling !== tracker)
        tracker.parentNode.insertBefore(box, tracker);
    });
  }

  /* =========================================================
     GLOSARIO: SÓLO NOMBRES LIMPIOS DE LA BIBLIOTECA
  ========================================================= */
  var VM = (typeof VIDEO_MAP !== 'undefined' && VIDEO_MAP) || {};
  var BASURA = new RegExp([
    '\\\\d+\\\\s*(kg|lb|lbs|m|min|seg|reps?|rondas?|rounds?)\\\\b', '%', '\\\\bx\\\\s*\\\\d',
    '\\\\d+\\\\s*[-\\u2013]\\\\s*\\\\d', '\\\\bronda', '\\\\bround', 'amrap', 'emom', 'for\\\\s*time',
    'tabata', 'chipper', 'progres', 'calent', 'movilidad', 'activaci', 'aproximaci',
    'entrada en calor', 'descans', '\\\\brest\\\\b', '\\\\bserie', 'tempo', '\\\\brpe\\\\b', '\\\\brir\\\\b'
  ].join('|'), 'i');
  function limpioNombre(txt){
    var t = String(txt || '').replace(/🔎|🎬/g, '').replace(/\\s+/g, ' ').trim();
    t = t.split(' — ')[0].split(' - ')[0].split(' · ')[0];
    t = t.replace(/^\\d+\\s*[.)]?\\s*/, '');                 /* numeración inicial */
    t = t.replace(/\\([^)]*\\)/g, ' ');                      /* aclaraciones entre paréntesis */
    t = t.replace(/\\b\\d+([.,]\\d+)?\\s*(kg|lbs?|m|km|cal|min|s|seg|reps?)\\b/gi, ' ');
    t = t.replace(/\\b\\d+\\s*[x×]\\s*\\d+\\b/gi, ' ');
    /* preserva ángulos/variantes propias del nombre (ej. "Prensa 45°") al
       barrer el resto de números sueltos (series/rondas residuales) */
    t = t.replace(/\\d+(?:\\s*°)?/g, function(m){ return /°$/.test(m) ? m : ' '; });
    /* restos de unidades al inicio: "200 m Row" -> "Row" */
    t = t.replace(/^(m|km|cal|kg|lbs?|min|s|seg|reps?|x)\\b\\s*/i, '');
    t = t.replace(/\\s+/g, ' ').replace(/^[·:,\\-–\\s]+|[·:,\\-–\\s]+$/g, '').trim();
    return t;
  }
  function esEjercicioDeBiblioteca(nombre){
    if(!nombre || nombre.length < 3) return false;
    /* los ángulos/variantes numéricas propias del nombre (ej. "Prensa 45°")
       no cuentan como dígito residual de dosis -- se descartan antes de
       chequear si queda algún número suelto (indicio real de reps/series) */
    if(/\\d/.test(nombre.replace(/\\d+\\s*°/g, ''))) return false;
    var n = nombre.toLowerCase();
    if(BASURA.test(n)) return false;
    var palabras = nombre.split(/\\s+/);
    if(palabras.length > 5) return false;
    if(!/[a-záéíóúñ]/i.test(nombre)) return false;
    /* si el índice de videos de la biblioteca lo reconoce, entra seguro */
    var claves = Object.keys(VM);
    for(var i = 0; i < claves.length; i++){
      var k = claves[i].toLowerCase();
      if(k === n || k.indexOf(n) >= 0 || n.indexOf(k) >= 0) return true;
    }
    /* si no está en la biblioteca, igual entra si parece el nombre de un movimiento */
    return palabras.length <= 5;
  }
  window.CoachGlosarioFiltro = { limpio: limpioNombre, valido: esEjercicioDeBiblioteca };

  function depurarGlosario(){
    var g = document.getElementById('glosarioSesion'); if(!g) return;
    var vistos = {}, quedan = 0;
    g.querySelectorAll('.gl-card').forEach(function(c){
      var nm = c.querySelector('.nm');
      if(!nm) return;
      var limpio = limpioNombre(nm.textContent);
      if(!esEjercicioDeBiblioteca(limpio) || vistos[limpio.toLowerCase()]){ c.remove(); return; }
      vistos[limpio.toLowerCase()] = 1;
      if(nm.textContent !== limpio) nm.textContent = limpio;
      /* el enlace de búsqueda se recalcula con el nombre limpio */
      var a = c.querySelector('.video-link.vsearch');
      if(a) a.href = 'https://www.youtube.com/results?search_query=' +
        encodeURIComponent(limpio + ' técnica ejercicio');
      quedan++;
    });
    var n = g.querySelector('.gl-n');
    if(n) n.textContent = quedan + (quedan === 1 ? ' movimiento' : ' movimientos');
    if(!quedan) g.remove();
  }

  /* =========================================================
     SIN "CERO DOLOR" EN NINGUNA PARTE
  ========================================================= */
  function sinCeroDolor(){
    document.querySelectorAll('.pain-btn, .pain-note, [data-m="dolor"]').forEach(function(e){ e.remove(); });
    if(window.CoachCeroDolor) window.CoachCeroDolor = function(){ return false; };
  }

  /* =========================================================
     MONTAJE
  ========================================================= */
  function repintar(){
    try{ header(); capsulas(); depurarGlosario(); sinCeroDolor(); }catch(e){}
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
        setTimeout(function(){ propio = false; }, 150);
      }, 130);
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
    window.CoachFinal = { repintar: repintar, glosario: depurarGlosario, capsulas: capsulas };
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(mount, 150); });
  else setTimeout(mount, 150);
})();
