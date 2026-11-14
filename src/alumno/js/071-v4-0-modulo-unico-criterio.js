/* =========================================================
   v4.0 · módulo único: criterio, LED y arte de fondo
========================================================= */
(function(){

  /* 3 · ARTE DE FONDO: retirado. Se limpia si quedó montado de una versión previa. */
  function arte(){
    var v = document.getElementById('jpArte');
    if(v && v.parentNode) v.parentNode.removeChild(v);
  }

  /* ---------------------------------------------------------
     2 · DISPLAY LED
  --------------------------------------------------------- */
  var SEL_LED = '.cwt-time, .cf-time, .rh-time, .timer-display, #cwtTime, #rhTime';
  function ghost(el){
    var t = (el.textContent || '').trim();
    /* cada dígito se reemplaza por un 8 apagado; el resto se conserva */
    var g = t.replace(/[0-9]/g, '8');
    if(el.dataset.ghost !== g) el.dataset.ghost = g;
  }
  function led(){
    var nodos = document.querySelectorAll(SEL_LED);
    for(var i = 0; i < nodos.length; i++){
      var el = nodos[i];
      if(!el.classList.contains('jp-led')) el.classList.add('jp-led');
      ghost(el);
    }
  }
  function vigilarLed(){
    try{
      /* Auditoría de performance: este observer mira TODO document.body con
         subtree+characterData, así que cualquier mutación en cualquier parte
         de la app (tipeo en el Builder, timers de la sesión, etc.) lo
         disparaba. El repintado puntual de ghost(el) por nodo es barato y se
         mantiene sincrónico, pero led() escanea el documento completo
         (querySelectorAll(SEL_LED)) -- eso se debouncea a 150ms para
         colapsar ráfagas de mutaciones en un solo escaneo en vez de uno por
         mutación. */
      var ledPend = null;
      new MutationObserver(function(muts){
        for(var i = 0; i < muts.length; i++){
          var t = muts[i].target;
          var el = t.nodeType === 1 ? t : t.parentElement;
          if(!el) continue;
          if(el.classList && el.classList.contains('jp-led')) ghost(el);
        }
        clearTimeout(ledPend);
        ledPend = setTimeout(led, 150);
      }).observe(document.body, { childList:true, subtree:true, characterData:true });
    }catch(e){}
  }

  /* ---------------------------------------------------------
     1 · CRITERIO DEL COACH · redacción en primera persona
  --------------------------------------------------------- */
  function bloqueDeId(id){
    try{
      var d = (typeof getCurrentDay === 'function') ? getCurrentDay() : null;
      if(!d) return null;
      var b = (d.blocks || []).filter(function(x){ return x.id === id; })[0];
      return b || null;
    }catch(e){ return null; }
  }

  function criterios(b){
    var out = [];
    if(!b) return out;

    /* por qué esta estructura */
    if(b.isSuperset){
      out.push(b.isTriset
        ? 'Armé este triset con tres ejercicios que no compiten entre sí: mientras uno trabaja, los otros descansan. Es la forma de meterte volumen sin estirar la sesión.'
        : 'Armé este biset para encadenar dos ejercicios sin pausa en el medio. El descanso va recién al cerrar la ronda.');
    } else if(b.isFinisher){
      out.push('Puse este finisher al cierre a propósito: busco sensación muscular con carga baja, no un récord.');
    } else if(b.isBlock){
      out.push('Este es un bloque ancla: lo puse temprano en la sesión para que le llegues con la energía intacta.');
    }

    /* tempo */
    var tempo = b.tempo || ((b.exercises || [])[0] || {}).tempo || '';
    if(/^\d{4}$/.test(tempo)){
      var ecc = tempo.charAt(0), pausaAbajo = tempo.charAt(1), pausaArriba = tempo.charAt(3);
      var t = 'Elegí el tempo ' + tempo + ': ' + ecc + ' segundos de bajada controlada';
      if(pausaAbajo !== '0') t += ' y ' + pausaAbajo + ' segundo de pausa abajo, en el estiramiento, que es donde más rinde el estímulo';
      else if(pausaArriba !== '0') t += ' y ' + pausaArriba + ' segundo de sostén arriba, para que la contracción sea real y no un rebote';
      else t += ', sin rebote: la bajada es la mitad del ejercicio';
      out.push(t + '.');
    }

    /* descanso */
    var r = parseInt(b.restSeconds, 10) || 0;
    if(r >= 150) out.push('Te dejo <b>' + r + ' segundos</b> de descanso a propósito. Con menos, la serie siguiente cae y el estímulo se convierte en fatiga acumulada.');
    else if(r > 0 && r <= 75) out.push('El descanso corto de <b>' + r + ' segundos</b> es parte del ejercicio: acá busco densidad, no carga máxima.');

    /* aproximaciones */
    if(b.hasApprox && b.approxSets > 0)
      out.push('Las ' + b.approxSets + ' series de aproximación no cuentan como trabajo: preparan el patrón y suben la temperatura sin gastarte.');

    /* RIR del subtítulo, si lo declaré al programar */
    var sub = (b.subtitle || '') + ' ' + (b.title || '');
    var rir = sub.match(/RIR\s*(\d)(?:\s*-\s*(\d))?/i);
    if(rir) out.push('Te pido RIR ' + rir[1] + (rir[2] ? ' a ' + rir[2] : '') +
      ': terminás cada serie con esas repeticiones en el bolsillo. No busco el fallo acá.');

    /* naturaleza del bloque */
    if(b.category === 'metcon' || b.category === 'cardio')
      out.push('Este bloque se mide en tiempo, no en kilos. El objetivo es sostener el ritmo de principio a fin, no salir disparado y morir a la mitad.');
    if(b.category === 'warmup')
      out.push('Estos cinco minutos reemplazan al cardio general: preparan el patrón exacto que vas a hacer hoy.');

    /* lo que escribí yo al programar */
    if(b.objective) out.push('<b>Objetivo:</b> ' + b.objective);
    if(b.tips)      out.push(b.tips);
    if(b.altNote)   out.push('<b>Alternativa:</b> ' + b.altNote);
    if(b.cierre && b.cierre.objetivo) out.push('<b>Objetivo del bloque:</b> ' + b.cierre.objetivo);
    if(b.cierre && b.cierre.pacing)   out.push('<b>Ritmo:</b> ' + b.cierre.pacing);

    return out;
  }

  function armar(lista, titulo, sufijo){
    if(!lista.length) return null;
    var d = document.createElement('details');
    d.className = 'jp-criterio';
    d.innerHTML =
      '<summary><span class="cr-ic">🧠</span>' +
      '<span class="cr-t">' + titulo + '</span>' +
      '<span class="cr-s">' + (sufijo || 'Por qué hacemos esto') + '</span>' +
      '<span class="cr-cv">▾</span></summary>' +
      '<div class="cr-b"><ul>' + lista.map(function(x){
        return '<li>' + x + '</li>';
      }).join('') + '</ul></div>';
    return d;
  }

  function pintarCriterios(){
    /* limpieza de la Pizarra Táctica (2026-09-16): "Criterio del Coach"
       por bloque y "Criterio del día" son fundamentación de Bodybuilding
       (orden de bloques por demanda, etc.) -- no aplican a CrossFit, donde
       el acordeón de la propia pizarra ya cubre objetivo/tips/pacing. */
    if(window.COACH_DISCIPLINA !== 'sports') return;
    var bloques = document.querySelectorAll('.block[data-block-id]');
    for(var i = 0; i < bloques.length; i++){
      var bl = bloques[i];
      /* directiva ("Unificación de tips/videos"): un Bloque de Pizarra
         Sports ya tiene su PROPIO acordeón único (.jp-block-details,
         ver pizarraSports()) con los MISMOS campos objective/tips que
         lee criterios() acá abajo -- sin este corte, el alumno veía el
         objetivo y los tips repetidos DOS veces (acá + en el acordeón
         de la pizarra). Un bloque CLÁSICO de Sports (fuera de la
         Pizarra) no tiene ese acordeón propio, así que sigue mostrando
         "Criterio del Coach" exactamente igual que siempre. */
      if(bl.querySelector('.jp-sb-board')) continue;
      /* el criterio se inyecta dentro de .block-body, así que hay que buscarlo
         en todo el bloque, no solo entre los hijos directos. Si quedaron
         copias de un repintado anterior, dejo solo la primera. */
      var previos = bl.querySelectorAll('.jp-criterio');
      if(previos.length){
        for(var k = 1; k < previos.length; k++){
          if(previos[k].parentNode) previos[k].parentNode.removeChild(previos[k]);
        }
        continue;
      }
      var b = bloqueDeId(bl.dataset.blockId);
      var lista = criterios(b);
      if(!lista.length) continue;
      var det = armar(lista, 'Criterio del Coach');
      if(!det) continue;
      var cuerpo = bl.querySelector('.block-body') || bl;
      cuerpo.appendChild(det);
      /* la fundamentación ya vive acá: las cajas sueltas se ocultan */
      var viejas = cuerpo.querySelectorAll('.coach-note, .objective-box');
      for(var j = 0; j < viejas.length; j++){
        if(!det.contains(viejas[j])) viejas[j].style.display = 'none';
      }
    }

    /* criterio del día, al final de todo */
    try{
      var main = document.getElementById('mainContent') || document.querySelector('.day-view');
      var vista = document.querySelector('.day-view');
      if(vista && !vista.querySelector(':scope > .jp-criterio-dia')){
        var d = (typeof getCurrentDay === 'function') ? getCurrentDay() : null;
        if(d){
          var lst = [];
          if(d.focusText) lst.push('<b>Foco de hoy:</b> ' + d.focusText);
          if(d.summary)   lst.push(d.summary);
          var nB = (d.blocks || []).length;
          if(nB) lst.push('Ordené los ' + nB + ' bloques de mayor a menor demanda: lo que más te exige va primero, cuando todavía estás entero.');
          if(lst.length){
            var det2 = armar(lst, 'Criterio del día', 'Cómo pensé esta sesión');
            if(det2){ det2.classList.add('jp-criterio-dia'); vista.appendChild(det2); }
          }
        }
      }
    }catch(e){}
  }

  /* ---------------------------------------------------------
     montaje
  --------------------------------------------------------- */
  function repintar(){
    try{ led(); }catch(e){}
    try{ pintarCriterios(); }catch(e){}
  }
  function mount(){
    arte();
    repintar();
    vigilarLed();
    if(typeof window.renderMain === 'function' && !window.renderMain.__jpv40){
      var _rm = window.renderMain;
      var w = function(){ var r = _rm.apply(this, arguments); setTimeout(repintar, 90); setTimeout(repintar, 420); return r; };
      w.__jpv40 = 1;
      window.renderMain = w;
    }
    [700, 1800, 3400].forEach(function(ms){ setTimeout(repintar, ms); });
    window.CoachCriterio = { repintar: repintar, textos: criterios };
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(mount, 400); });
  else setTimeout(mount, 400);
})();
