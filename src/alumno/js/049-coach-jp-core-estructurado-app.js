/* =========================================================
   COACH JP · CORE ESTRUCTURADO (app del alumno)
   1 · Mata el bucle de filas rotas del bloque de Core.
   2 · Lo reconstruye como Individual / Biset / Triset / Circuito
       con nombre, video circular y series S1 · S2 · S3.
   3 · El reloj de descanso lo dispara la ronda, no el ejercicio.
========================================================= */
(function(){
  var RX_CORE = /\bcore\b|abdomen|abdominal|estabilidad|anti.?rotaci[óo]n/i;
  var RX_ESTR = /^\s*(?:\d+\s*(?:sets?|series?|rondas?|rounds?)\s*:?\s*$|[-–—]?\s*(?:rest|descanso)\b|[-–—]+\s*$)/i;

  function bloqueDe(id){
    var d = (typeof getCurrentDay === 'function') ? getCurrentDay() : null;
    if(!d || !id) return null;
    var todos = (d.blocks || []).concat(d.finisher ? [d.finisher] : [], d.hyrox ? [d.hyrox] : []);
    return todos.filter(function(b){ return b.id === id; })[0] || null;
  }
  function esc(s){
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function esCore(b, bl){
    /* directiva ("Erradicación total del componente legacy de Core"): un
       bloque marcado b.sportsPizarra ya vive en el sistema moderno de
       Pizarra Libre (pizarraSports() lo pinta con la misma UI táctica que
       Fuerza/Hipertrofia) -- NUNCA debe caer acá, sin importar el título
       ("Core & Estabilidad" matchea RX_CORE igual que antes de migrar).
       Chequeado ANTES que cualquier otra cosa y sin depender de que
       pizarraSports() ya haya insertado su .wod-board (guardia de abajo,
       bl.querySelector('.wod-board')): esa guardia sólo protege una vez
       que la Pizarra YA pintó, pero reconstruir() puede correr en una
       pasada más temprana (mount()/repintar() con sus propios timers) --
       chequear el dato del bloque en vez del DOM ya pintado es inmune a
       esa carrera. */
    if(b && b.sportsPizarra) return false;
    /* en plantillas que rotan de semana (ej. CrossFit Atletas 6 semanas) un
       mismo bloque puede ser "core" la semana 1 y un WOD/metcon la semana 2 --
       b.title/b.subtitle son estáticos (congelados en la semana 1) y NUNCA
       cambian, así que testearlos acá hacía que el bloque siguiera
       clasificado como core aunque esta semana sea otra cosa. Se usa la
       etiqueta YA resuelta para la semana actual (weekName[wi], la misma que
       ve el alumno en el título del bloque); el subtítulo estático sólo se
       suma al test cuando ESTA semana no rotó (weekName[wi] coincide con el
       título base) -- si rotó, el subtítulo describe el contenido de otra
       semana y sumarlo produciría el mismo falso positivo que el título */
    var wi = (typeof state !== 'undefined' && state) ? (state.currentWeek || 0) : 0;
    var base = (b && b.title) || '';
    var etiquetaWi = (b && b.weekName && b.weekName[wi]) || base;
    var rotado = etiquetaWi !== base;
    var t = etiquetaWi + (rotado ? '' : ' ' + ((b && b.subtitle) || ''));
    return !!(b && b.coreBlock) || RX_CORE.test(t);
  }

  /* ---------------------------------------------------------
     1 · LECTURA DE LA PIZARRA VIEJA
  --------------------------------------------------------- */
  function rondasDe(items){
    for(var i = 0; i < items.length; i++){
      var m = String(items[i]).match(/(\d+)\s*(?:sets?|series?|rondas?|rounds?)/i);
      if(m) return Math.max(1, Math.min(10, parseInt(m[1], 10)));
    }
    return 3;
  }
  function movimientosDe(items){
    var out = [];
    (items || []).forEach(function(raw){
      var t = String(raw || '').replace(/^[\s\-•*]+/, '').replace(/[\s\-–—]+$/, '').trim();
      if(!t || RX_ESTR.test(t)) return;
      var dosis = '';
      var corte = t.split(/\s+[—–]\s+/);
      if(corte.length > 1){ t = corte[0].trim(); dosis = corte.slice(1).join(' — ').trim(); }
      var pre = t.match(/^(\d+\s*(?:s|seg|segundos?|min|reps?|x)?\.?)\s+(.+)$/i);
      if(pre && !dosis){ dosis = pre[1].trim(); t = pre[2].trim(); }
      var post = t.match(/^(.+?)\s+(\d+\s*(?:s|seg|min)\b.*)$/i);
      if(post && !dosis){ t = post[1].trim(); dosis = post[2].trim(); }
      t = t.replace(/\s{2,}/g, ' ').trim();
      if(t.length < 3) return;
      out.push({ name: t, reps: dosis || '' });
    });
    return out;
  }
  var ETIQUETA = { single:'Ejercicio individual', biset:'Biset', triset:'Triset', circuito:'Circuito' };
  function modoDe(b, n){
    if(b && b.coreMode) return b.coreMode;
    if(n >= 4) return 'circuito';
    if(n === 3) return 'triset';
    if(n === 2) return 'biset';
    return 'single';
  }

  /* ---------------------------------------------------------
     2 · RECONSTRUCCIÓN DE LA TARJETA
  --------------------------------------------------------- */
  function video(nombre){
    return (typeof videoLinkHtml === 'function') ? videoLinkHtml(nombre) : '';
  }
  function filas(dayId, blockId, exIdx, rondas, hint, nombre){
    /* este módulo sólo reconstruye bloques que esCore(b, bl) ya clasificó
       como Core más arriba (ver reconstruir()) -- se le pasa 'Core' fijo
       como etiqueta de bloque para que renderSetRows() oculte el Kg acá
       también, sin depender de que el NOMBRE puntual del ejercicio matchee
       la lista de patrones (un WOD viejo puede traer movimientos de Core
       con nombres libres que esa lista no cubre). */
    if(typeof renderSetRows === 'function')
      return renderSetRows(state.currentWeek || 0, dayId, blockId, exIdx, rondas, hint || 'Reps', 0, nombre, 'Core');
    return '';
  }
  function reconstruir(){
    var dia = (typeof getCurrentDay === 'function') ? getCurrentDay() : null;
    if(!dia || document.body.classList.contains('cf-modo')) return;
    document.querySelectorAll('.block').forEach(function(bl){
      var b = bloqueDe(bl.dataset.blockId);
      if(!esCore(b, bl)) return;
      /* si ya se pintó la pizarra WOD/Metcon para este bloque (ver "3) PIZARRA
         METCON / WOD"), es un bloque de pizarra y nunca debe recibir
         tratamiento de "core estructurado" -- aunque esCore() diera falso
         positivo (ej. b.coreBlock cargado inconsistente en datos viejos),
         esto evita la tarjeta azul "Core" duplicada sobre el tablero WOD */
      if(bl.querySelector('.wod-board') || bl.querySelector('.cf-board')) return;
      /* el core ya estructurado (o ya unificado en rondas) sólo necesita su cabecera */
      var yaTiene = !!bl.querySelector('.set-tracker') || !!bl.querySelector('.set-row') ||
                    !!bl.querySelector('.bs-wrap');
      var lista = [];
      var rondas = 3;

      if(b && b.isSuperset && (b.exercises || []).length){
        lista = b.exercises.map(function(x){ return { name:x.name, reps:x.reps }; });
        rondas = parseInt(b.efSets, 10) || 3;
      } else if(b && b.isBlock){
        lista = [{ name: b.exerciseName, reps: b.reps }];
        rondas = parseInt(b.efSets, 10) || 3;
      } else if(b){
        var items = b.items || [];
        lista = movimientosDe(items);
        rondas = rondasDe(items);
      }
      if(!lista.length){ bl.classList.remove('core-live'); return; }
      rondas = Math.max(1, Math.min(10, rondas));

      var modo = modoDe(b, lista.length);
      var cabecera =
        '<span class="ch-k">Core</span><span class="ch-d">&#9679;</span>' +
        '<span class="ch-m">' + esc(ETIQUETA[modo] || 'Circuito') + ' &middot; ' + lista.length +
          ' ejercicio' + (lista.length === 1 ? '' : 's') + '</span>' +
        '<span class="ch-r">' + rondas + ' RONDA' + (rondas === 1 ? '' : 'S') + '</span>';

      var cuerpo = bl.querySelector('.block-body') || bl;
      /* el banner estándar .blk-tag ya declara modo, rondas y estaciones:
         la cabecera propia sólo aparece si ese banner todavía no se pintó */
      var estandar = bl.querySelector('.blk-tag');
      var head = bl.querySelector('.core-head');
      if(estandar){ if(head) head.remove(); head = null; }
      else{
        if(!head){
          head = document.createElement('div');
          head.className = 'core-head';
          cuerpo.insertBefore(head, cuerpo.firstElementChild);
        }
        if(head.innerHTML !== cabecera) head.innerHTML = cabecera;
      }

      bl.classList.add('core-live');
      if(yaTiene){
        /* numeración de estación sobre los nombres ya renderizados */
        var rows = bl.querySelectorAll('.bs-ex .bs-e');
        if(!rows.length) rows = bl.querySelectorAll('.ex-row');
        if(rows.length > 1) rows.forEach(function(r, i){
          var n = r.querySelector('.core-est');
          var txt = String(i + 1).padStart(2, '0');
          if(!n){
            n = document.createElement('span');
            n.className = 'core-est';
            r.insertBefore(n, r.firstChild);
          }
          if(n.textContent !== txt) n.textContent = txt;
        });
        return;
      }

      /* pizarra vieja: se reemplaza por estaciones interactivas */
      var clave = modo + '|' + rondas + '|' + lista.map(function(x){ return x.name; }).join('|');
      if(bl.dataset.coreK === clave) return;
      bl.dataset.coreK = clave;

      var html = lista.map(function(x, i){
        return '<div class="ex-row">' +
            (lista.length > 1 ? '<span class="core-est">' + String(i + 1).padStart(2, '0') + '</span>' : '') +
            '<div class="ex-bullet"></div>' +
            '<span class="ex-name">' + esc(x.name) + video(x.name) + '</span>' +
            (x.reps ? '<span class="ex-detail">' + esc(x.reps) + '</span>' : '') +
          '</div>' +
          filas(dia.id, bl.dataset.blockId, i, rondas, x.reps, x.name);
      }).join('');

      var caja = bl.querySelector('.core-build');
      if(!caja){
        caja = document.createElement('div');
        caja.className = 'core-build';
        var ancla = bl.querySelector('.core-head');
        if(ancla && ancla.nextSibling) cuerpo.insertBefore(caja, ancla.nextSibling);
        else cuerpo.appendChild(caja);
      }
      if(caja.innerHTML !== html) caja.innerHTML = html;
      /* lo viejo se va: ni líneas sueltas ni checkboxes genéricos en bucle */
      bl.querySelectorAll('.core-list, .mini-log').forEach(function(x){ x.remove(); });
      bl.querySelectorAll('.ex-row').forEach(function(r){
        if(!caja.contains(r) && !r.querySelector('.set-check')) r.remove();
      });
      bl.querySelectorAll('.wod-line, .cf-line').forEach(function(l){
        if(!caja.contains(l)) l.remove();
      });
      bl.querySelectorAll('.video-link').forEach(function(v){
        if(v.dataset.wired) return;
        v.dataset.wired = '1';
        v.addEventListener('click', function(){
          var id = v.dataset.yt;
          if(id && typeof openVideoPopup === 'function') openVideoPopup(id);
        });
      });
    });
  }

  /* ---------------------------------------------------------
     3 · PERSISTENCIA DE LAS FILAS RECONSTRUIDAS
  --------------------------------------------------------- */
  function guardar(row, campo, valor){
    var k = row && row.dataset ? row.dataset.setKey : '';
    if(!k || typeof setLoadField !== 'function') return;
    setLoadField(k, campo, valor);
  }
  document.addEventListener('change', function(e){
    var c = e.target.closest('.core-build .set-check');
    if(!c) return;
    var row = c.closest('.set-row');
    if(!row) return;
    guardar(row, 'done', c.checked);
    row.classList.toggle('set-row-done', c.checked);
  });
  document.addEventListener('input', function(e){
    var kg = e.target.closest('.core-build .set-kg');
    if(kg){ guardar(kg.closest('.set-row'), 'kg', kg.value); return; }
    var rp = e.target.closest('.core-build .set-reps');
    if(rp){ guardar(rp.closest('.set-row'), 'reps', rp.value); }
  });

  function repintar(){ try{ reconstruir(); }catch(e){} }
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
      }, 170);
    }, main);
    if(typeof window.renderMain === 'function'){
      var _rm = window.renderMain;
      window.renderMain = function(){
        var r = _rm.apply(this, arguments);
        setTimeout(repintar, 300);
        setTimeout(repintar, 780);
        return r;
      };
    }
    window.CoachCoreApp = { repintar: repintar, reconstruir: reconstruir, movimientos: movimientosDe };
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(mount, 520); });
  else setTimeout(mount, 520);
})();
