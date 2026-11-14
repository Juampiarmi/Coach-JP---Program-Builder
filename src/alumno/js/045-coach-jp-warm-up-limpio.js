/* =========================================================
   COACH JP · warm-up limpio y reloj de descanso reactivado
========================================================= */
(function(){
  function bloqueDe(id){
    var d = (typeof getCurrentDay === 'function') ? getCurrentDay() : null;
    if(!d || !id) return null;
    var todos = (d.blocks || []).concat(d.finisher ? [d.finisher] : [], d.hyrox ? [d.hyrox] : []);
    return todos.filter(function(b){ return b.id === id; })[0] || null;
  }
  function esc(s){
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  /* mismo prefijo táctico que arma warmup() -- IIFE aparte, sin helpers
     compartidos, así que se repite acá (ver comentario largo junto al
     original). */
  var RX_ENFRIAMIENTO = /cool.?down|vuelta a la calma|enfriamiento/i;
  function prefijoFase(b){
    var t = ((b && b.title) || '') + ' ' + ((b && b.subtitle) || '');
    return RX_ENFRIAMIENTO.test(t) ? 'ENFRIAMIENTO' : 'CALENTAMIENTO';
  }

  /* ---------------------------------------------------------
     1 · PROTOCOLO DE ENTRADA EN CALOR
        subtítulo, dosis o instrucción — nunca una píldora vacía
  --------------------------------------------------------- */
  var RX_FASE = /^(?:\d+\s*[\.\)]\s*)?(?:fase\s*\d|elevaci[óo]n de (?:temperatura|pulso)|elevar temperatura|activaci[óo]n|movilidad(?: articular)?|series de aproximaci[óo]n|aproximaci[óo]n|cool.?down|vuelta a la calma|preparaci[óo]n)/i;
  /* directiva de refactor (2026-09): RX_FASE detecta títulos de sección por
     una palabra genérica al inicio ("Movilidad...", "Activación...") -- eso
     atrapaba ejercicios reales con nombres que arrancan igual (ej.
     "Movilidad de cadera 90/90 — rotaciones por lado") y los mostraba como
     título plano en vez de ítem con su chip. Ahora la dosis manda primero:
     si el renglón trae un número de series/tiempo/reps en cualquier parte
     del texto, SIEMPRE es un ítem de trabajo, nunca un título de sección,
     sin importar con qué palabra empiece. */
  function claseDe(txt, dosis){
    var t = String(txt || '').replace(/\s+/g, ' ').trim();
    if(!t) return null;
    if(dosis) return 'item';
    /* si declara una dosis en el texto, es trabajo y no un subtítulo */
    if(/\d/.test(t) && /(\bmin\b|\bseg\b|\d\s*s\b|\breps?\b|[x×]\s*\d|\d\s*\/\s*\d|\bm\b|\bcal\b)/i.test(t)) return 'item';
    if(/:\s*$/.test(t) || RX_FASE.test(t)) return 'fase';
    /* pulido (armonización Concepto F): "es corto y sin puntuación" ya no
       se usa como aproximación de "debe ser un subtítulo de fase" -- eso
       atrapaba ejercicios reales sin dosis explícita (técnica corporal,
       movilidad libre: "Eccentric Hip Flexor Sit-up", "Dead Bug con
       control respiratorio") y los mostraba como texto plano de sección
       en vez de tarjeta de ejercicio, justo el bug reportado. Misma
       filosofía que el fix de "la dosis manda primero" de arriba: sin
       coincidir con una palabra clave de fase reconocida (RX_FASE) ni
       terminar en ":", se asume ítem de trabajo -- limpiar() ya sabe
       darle el chip "MOB" cuando no hay dosis numérica. Una frase larga
       con puntuación real (instrucción del coach, no nombre de
       ejercicio) sigue yendo a "nota". */
    return /[.,;]/.test(t) ? 'nota' : 'item';
  }
  function limpiar(){
    document.querySelectorAll('.block.wu-card .wu-list').forEach(function(lista){
      lista.querySelectorAll('.wu-item').forEach(function(it){
        var dose = it.querySelector('.wu-dose');
        var name = it.querySelector('.wu-name');
        if(!name) return;
        var txt = name.textContent.replace(/\s+/g, ' ').trim();
        var dosis = dose ? dose.textContent.replace(/\s+/g, ' ').trim() : '';
        if(dosis === '·' || dosis === '.') dosis = '';
        var cls = claseDe(txt, dosis);
        var vid = it.querySelector('.video-link'); /* se preserva al reclasificar */
        if(cls === 'fase'){
          var blDe = it.closest('.block');
          var bDe = blDe ? bloqueDe(blDe.dataset.blockId) : null;
          var f = document.createElement('div');
          f.className = 'wu-fase';
          f.textContent = prefijoFase(bDe) + ' \u00b7 ' + txt.replace(/^\d+\s*[\.\)]\s*/, '').replace(/:\s*$/, '');
          it.parentNode.replaceChild(f, it);
          return;
        }
        if(cls === 'nota'){
          var n = document.createElement('div');
          n.className = 'wu-nota';
          n.textContent = txt;
          if(vid) n.insertAdjacentHTML('beforeend', vid.outerHTML);
          it.parentNode.replaceChild(n, it);
          return;
        }
        /* línea de trabajo: siempre lleva chip de volumen a la izquierda --
           ninguna queda como bullet pelado. Si no se pudo extraer una
           dosis concreta (series/tiempo), se marca como movilidad libre. */
        if(!dose){
          dose = document.createElement('span');
          dose.className = 'wu-dose';
          it.insertBefore(dose, it.firstChild);
        }
        if(!dosis) dose.textContent = 'MOB';
        it.classList.remove('plain');
        var bOld = it.querySelector('.wu-bullet'); if(bOld) bOld.remove();
      });
    });
  }

  /* ---------------------------------------------------------
     2 · RELOJ DE DESCANSO EMERGENTE (MUSCULACIÓN Y FUERZA)
  --------------------------------------------------------- */
  function esCF(){ return document.body.classList.contains('cf-modo'); }
  function descansoDe(bl){
    var b = bloqueDe(bl ? bl.dataset.blockId : '');
    var seg = b && parseInt(b.restSeconds, 10);
    if(seg > 0) return seg;
    var slot = bl ? bl.querySelector('.timer-slot[data-rest]') : null;
    if(slot){ var s = parseInt(slot.dataset.rest, 10); if(s > 0) return s; }
    try{ return parseInt(state.restSec, 10) || 90; }catch(e){ return 90; }
  }
  function nombreDe(bl, row){
    var n = row ? row.closest('.block') : bl;
    var ex = n ? n.querySelector('.ex-name') : null;
    var t = ex ? (ex.childNodes[0] ? ex.childNodes[0].textContent : ex.textContent) : '';
    return String(t || 'Descanso').replace(/\s+/g, ' ').trim().slice(0, 34);
  }
  /* Athlete C (Rest Timer táctico in-situ, Bodybuilding) -- mismo patrón
     que jpCfRestBadge/jpCfRestOnTick de CrossFit (más arriba en el
     archivo), pero con nombres propios (jpBbRest*) para no compartir ni
     un solo identificador con esa rama: CERO riesgo de pisarla. Se
     espeja el MISMO motor compartido (window.CoachTV.mirror/estado) sin
     duplicar el conteo, y la barra flotante (#restHud) sigue mostrándose
     igual que siempre -- esto se agrega AL LADO, no la reemplaza. */
  var jpBbRestBoundRow = null;
  function jpBbRestMMSS(seg){
    var s = Math.max(0, Math.round(seg || 0));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }
  function jpBbRestQuitar(row){
    var b = row && row.querySelector('.jp-bb-rest-badge');
    if(b) b.remove();
  }
  function jpBbRestPintar(row, st){
    var b = row.querySelector('.jp-bb-rest-badge');
    if(!b){ b = document.createElement('div'); b.className = 'jp-bb-rest-badge'; row.appendChild(b); }
    var pct = st.total > 0 ? Math.max(0, Math.min(1, st.left / st.total)) : 0;
    b.style.setProperty('--rp', (pct * 100).toFixed(1) + '%');
    b.innerHTML = '<span class="jp-bb-rest-ic">⏱️</span><span class="jp-bb-rest-tx">Descansá ' + jpBbRestMMSS(st.left) + '</span>';
  }
  function jpBbRestOnTick(st){
    var row = jpBbRestBoundRow;
    if(row && !document.body.contains(row)) row = null;
    jpBbRestBoundRow = row;
    if(!row) return;
    if(st.active && !st.finished) jpBbRestPintar(row, st);
    else { jpBbRestQuitar(row); jpBbRestBoundRow = null; }
  }
  function arrancar(seg, etiqueta, row){
    /* el descanso automático no interrumpe el Custom WOD Timer si está corriendo */
    var cwt = document.getElementById('cwtWrap');
    if(cwt && cwt.classList.contains('on')) return;
    if(window.CoachTV && typeof window.CoachTV.rest === 'function'){
      if(row && typeof window.CoachTV.mirror === 'function'){
        if(jpBbRestBoundRow && jpBbRestBoundRow !== row) jpBbRestQuitar(jpBbRestBoundRow);
        jpBbRestBoundRow = row;
        window.CoachTV.mirror(jpBbRestOnTick);
      }
      window.CoachTV.rest(seg, etiqueta);
    }
  }
  /* trabajo agrupado (biset / triset / circuito): la ronda manda sobre el reloj.
     El descanso arranca sólo cuando la fila equivalente de TODOS los ejercicios
     del bloque quedó tildada, nunca al cerrar el primer ejercicio de la ronda. */
  function agrupado(bl){
    if(!bl) return false;
    /* FIX (Pizarra Táctica Sports & Bodybuilding, REFACTOR DEFINITIVO): un
       bloque de pizarra libre puede tener MÁS de un .set-tracker (varios
       ejercicios independientes redactados en el mismo bloque de texto,
       igual que un WOD de CrossFit puede tener varios movimientos) sin
       que eso signifique que están agrupados en rondas -- a diferencia
       de un biset/triset clásico, donde cada .set-tracker cuelga
       DIRECTO de .block-body (mismo criterio que ya usa unificar()/
       limpiarResiduos() para detectar la estructura "cruda" antes de
       convertirla a rondas, ver más abajo), los de pizarraSports() viven
       anidados dentro de su propia tarjeta (.jp-sb-ex/.jp-sb-subex) --
       nunca directo de .block-body. Contar sólo los directos evita que
       un bloque de pizarra con 3 ejercicios independientes se lea como
       "agrupado" y se quede sin su descanso automático por ejercicio. */
    return bl.querySelectorAll(':scope > .block-body > .set-tracker').length > 1 || !!bl.querySelector('.bs-r');
  }
  function rondaCompleta(bl, row){
    /* bloque unificado: la ronda es la caja .bs-r que contiene la fila */
    var caja = row ? row.closest('.bs-r') : null;
    if(caja){
      return [].slice.call(caja.querySelectorAll('.set-check')).every(function(c){ return c.checked; });
    }
    var tr = row ? row.closest('.set-tracker') : null;
    if(!tr) return true;
    var i = [].indexOf.call(tr.querySelectorAll('.set-row'), row);
    if(i < 0) return true;
    var todos = [].slice.call(bl.querySelectorAll('.set-tracker'));
    return todos.every(function(t){
      var f = t.querySelectorAll('.set-row')[i];
      if(!f) return true;                       /* ejercicio con menos rondas: no bloquea */
      var c = f.querySelector('.set-check');
      return !c || c.checked;
    });
  }
  function etiquetaRonda(bl, row){
    var caja = row ? row.closest('.bs-r') : null;
    if(caja && caja.dataset.ronda) return 'Descanso · Ronda ' + caja.dataset.ronda + ' completa';
    var tr = row ? row.closest('.set-tracker') : null;
    if(!tr) return null;
    var i = [].indexOf.call(tr.querySelectorAll('.set-row'), row);
    return i >= 0 ? ('Descanso · Ronda ' + (i + 1) + ' completa') : null;
  }
  window.jpRondaCompleta = rondaCompleta;
  /* FASE 2.3 -- único punto de entrada para que "✓ Cerrar Ronda N"
     (módulo aparte, ver su listener de .bs-cerrar) dispare el reloj de
     descanso: arrancar()/descansoDe()/etiquetaRonda() viven en ESTE
     closure (RELOJ DE DESCANSO EMERGENTE), así que se exponen acá en vez
     de duplicar esa lógica en el otro módulo. */
  window.jpArrancarDescansoRonda = function(bl, caj){
    if(!bl || esCF()) return;
    var lb = (caj && etiquetaRonda(bl, caj.querySelector('.set-row'))) || ('Descanso · ' + nombreDe(bl));
    arrancar(descansoDe(bl), lb);
  };
  /* directiva ("Reconstrucción total del tracker de series en Sports") --
     mismo puente que jpArrancarDescansoRonda: el nuevo botón de check
     nativo (.jp-btn-check-native) es un <button>, nunca dispara 'change'
     sobre .set-check, así que el listener de más abajo ("al tildar una
     serie") nunca lo ve. Se expone acá (mismo closure que ya tiene
     arrancar()/descansoDe()/nombreDe()/agrupado()/esCF(), sin duplicar
     esa lógica) para que el listener delegado de la Pizarra Sports (ver
     pizarraSports(), otro módulo) dispare el mismo reloj compartido. */
  /* directiva técnica ("Auditoría integral del reloj emergente") -- segOverride
     (opcional, el "Rest Xs" REAL de ESTE ejercicio puntual, ver
     data-rest-sec en pizarraSports() y el listener de .jp-btn-check-native)
     tiene prioridad absoluta sobre descansoDe(bl), que sólo sabe leer un
     descanso a nivel BLOQUE (b.restSeconds/.timer-slot) -- nunca el de un
     ejercicio individual dentro de un bloque de Pizarra con varios
     ejercicios de descansos distintos. Sin esto, TODO check de serie
     arrancaba siempre el fallback genérico (state.restSec, 90s), sin
     importar lo que el coach haya escrito línea por línea. */
  window.jpArrancarDescansoSetNative = function(bl, segOverride){
    if(!bl || esCF()) return;
    if(segOverride === -1) return;       /* "Rest 0s": el ejercicio no lleva descanso */
    if(bl.classList.contains('wu-card')) return;
    if(agrupado(bl)) return;
    var lb = 'Descanso · ' + nombreDe(bl);
    var seg = (segOverride && segOverride > 0) ? segOverride : descansoDe(bl);
    /* micro-pausa (< 30 s): no se abre la barra de descanso, el alumno sigue */
    if(seg < 30) return;
    setTimeout(function(){ arrancar(seg, lb); }, 90);
  };
  /* badge de descanso (1 toque): arranca el reloj siempre, sin el filtro de micro-pausa ni el de bloque agrupado */
  window.jpArrancarDescansoManual = function(seg, lb){
    if(esCF()) return;
    seg = parseInt(seg, 10) || 0;
    if(seg > 0) arrancar(seg, lb || 'Descanso');
  };

  /* al tildar una serie */
  document.addEventListener('change', function(e){
    var chk = e.target.closest('.set-check');
    if(!chk || !chk.checked || esCF()) return;
    var row = chk.closest('.set-row');
    var bl = chk.closest('.block');
    var b = bloqueDe(bl ? bl.dataset.blockId : '');
    /* la entrada en calor y los circuitos livianos no abren el reloj */
    if(bl && bl.classList.contains('wu-card')) return;
    /* Pizarra Táctica Sports (REFACTOR DEFINITIVO): un bloque tipo:'list'
       con b.sportsPizarra nunca trae isBlock/isSuperset/isFinisher (esos
       flags sólo los pone renderBlockInner() para los tipos clásicos),
       así que sin este OR se quedaba mudo -- ninguna serie disparaba
       descanso. Se reconoce por la marca .jp-sb-board que pizarraSports()
       ya inserta dentro de .block-body. */
    var trabajo = (b && (b.isBlock || b.isSuperset || b.isFinisher)) ||
                  (bl && bl.classList.contains('core-live')) ||
                  (bl && !!bl.querySelector('.jp-sb-board'));
    if(!trabajo) return;
    /* FASE 2.3 (Lógica de Check en Biset) -- un bloque agrupado (biset/
       triset/circuito) YA NO dispara el reloj acá, ni siquiera cuando la
       última estación de la ronda queda tildada a mano: eso todavía se
       sentía como "se disparó solo" sin que el alumno tocara nada. El
       único disparador para trabajo agrupado pasa a ser el botón
       explícito "✓ Cerrar Ronda N" (ver su listener .bs-cerrar más abajo,
       que llama arrancar() directamente) -- acá simplemente no hace nada
       si agrupado(bl) es cierto. Bloque individual (isBlock/isFinisher,
       nunca agrupado) sigue exactamente igual que siempre. */
    if(agrupado(bl)) return;
    var lb = 'Descanso · ' + nombreDe(bl, row);
    setTimeout(function(){ arrancar(descansoDe(bl), lb, row); }, 90);
  });
  /* al cerrar un bloque de fuerza */
  document.addEventListener('change', function(e){
    var cb = e.target.closest('.block-done-cb');
    if(!cb || !cb.checked || esCF()) return;
    var bl = cb.closest('.block');
    var b = bloqueDe(bl ? bl.dataset.blockId : '');
    if(!b || !(b.isBlock || b.isSuperset || b.isFinisher)) return;
    if(bl.classList.contains('wu-card')) return;
    setTimeout(function(){ arrancar(descansoDe(bl), 'Descanso de bloque'); }, 120);
  });

  /* el HUD nunca tapa la navegación de la rutina */
  function convivencia(){
    var hud = document.getElementById('restHud');
    if(!hud) return;
    if(!hud.dataset.conv){
      hud.dataset.conv = '1';
      hud.addEventListener('click', function(ev){ ev.stopPropagation(); });
    }
    var cwt = document.getElementById('cwtWrap');
    if(cwt && cwt.classList.contains('on')) hud.classList.remove('on');
  }

  function repintar(){ try{ limpiar(); convivencia(); }catch(e){} }
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
        setTimeout(function(){ propio = false; }, 200);
      }, 190);
    }, main);
    if(typeof window.renderMain === 'function'){
      var _rm = window.renderMain;
      window.renderMain = function(){
        var r = _rm.apply(this, arguments);
        setTimeout(repintar, 240);
        setTimeout(repintar, 680);
        return r;
      };
    }
    window.CoachDescanso = { arrancar: arrancar, segundos: descansoDe, limpiarWarmUp: limpiar };
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(mount, 420); });
  else setTimeout(mount, 420);
})();
