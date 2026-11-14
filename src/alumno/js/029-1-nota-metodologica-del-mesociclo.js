(function(){
  'use strict';
  var CFG = (typeof PROGRAM_CONFIG !== 'undefined' && PROGRAM_CONFIG) || {};

  /* =========================================================
     1 · NOTA METODOLÓGICA DEL MESOCICLO
  ========================================================= */
  function esc(s){ var d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML; }
  /* directiva de refactor (2026-09): la tarjeta gigante generaba fricción
     visual ocupando toda la pantalla de inicio del día -- se reemplaza por
     una píldora sutil en la cabecera que abre el mismo contenido en un
     modal/drawer, sin estorbar la rutina. El modal se crea UNA sola vez en
     <body> (no lo pisa renderMain, que solo reemplaza #mainContent) y se
     abre/cierra con una clase; la píldora sí hay que reinsertarla en cada
     render porque #mainContent se reconstruye entero cada vez. */
  function crearModal(n){
    if(document.getElementById('notaMesoOverlay')) return;
    var overlay = document.createElement('div');
    overlay.className = 'nm-modal-overlay';
    overlay.id = 'notaMesoOverlay';
    overlay.innerHTML =
      '<div class="nota-meso" role="dialog" aria-modal="true" aria-label="Nota metodológica del mesociclo">' +
        '<div class="nm-h"><span style="font-size:1.3rem">📋</span>' +
          '<h3>Nota Metodológica del Mesociclo</h3>' +
          '<button type="button" class="nm-tog" id="notaMesoClose" aria-label="Cerrar">✕</button></div>' +
        '<div class="nm-b">' +
          '<div><h4>Foco y justificación fisiológica</h4><p>' + esc(n.foco) + '</p></div>' +
          '<div><h4>Puntos de adaptación personalizada</h4><p>' + esc(n.adaptacion) + '</p></div>' +
        '</div>' +
        '<div class="nm-ref"><b>Evidencia:</b> ' + (n.refs || []).map(esc).join('<br>') + '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    var cerrar = function(){ overlay.classList.remove('on'); };
    overlay.addEventListener('click', function(e){ if(e.target === overlay) cerrar(); });
    overlay.querySelector('#notaMesoClose').addEventListener('click', cerrar);
    window.CoachNotaMesoAbrir = function(){
      overlay.classList.add('on');
      try{ if(navigator.vibrate) navigator.vibrate(15); }catch(e){}
    };
  }
  /* UX/UI integral (13/09): la píldora ya no vive dentro de #mainContent
     (empujaba la rutina hacia abajo en cada carga) -- se crea UNA sola vez
     colgada de <body> y montarPerfil() (más abajo en el archivo) la
     reparenta a #hdpNotaSlot, dentro del drawer de Perfil/Info. El check
     de "ya existe" ahora es global (no scoped a #mainContent) porque el
     nodo puede vivir fuera de #mainContent en cualquier momento. */
  function nota(){
    var n = CFG.nota;
    if(!n || !n.foco) return;
    crearModal(n);
    if(document.getElementById('notaMesoPill')) return;
    var pill = document.createElement('button');
    pill.type = 'button'; pill.className = 'nm-pill'; pill.id = 'notaMesoPill';
    pill.innerHTML = '<span style="font-size:1rem">📋</span> Ver Nota Metodológica';
    pill.addEventListener('click', function(){ if(window.CoachNotaMesoAbrir) window.CoachNotaMesoAbrir(); });
    document.body.appendChild(pill);
  }

  /* =========================================================
     2 · SERIES: BADGES COMPACTOS Y AUTO-FILL
  ========================================================= */
  /* 10/09 -- FIX nomenclatura de series vs semanas: esta función compactaba
     "Serie 1"/"Serie 2" a "S1"/"S2", y "S1".."S4" son tambien la
     abreviatura oficial de las SEMANAS del mesociclo (ver WEEKS_META /
     week-pill) -- el atleta veía "S2" en una tarjeta de ejercicio y creía
     que había cambiado de semana. Se había compactado a "R" + número
     (Ronda/Round) para evitar la letra reservada de semanas, pero "R1"
     resultó su propia ambigüedad nueva (se lee "Ronda 1", que sólo
     existe de verdad en biset/triset) -- en un bloque simple de series
     rectas no hay ninguna ronda, así que confundía igual. Pulido de
     experiencia del alumno: pasa a "SET " + número -- palabra completa,
     nada que ver visualmente con la "S1" de semana, y es el término que
     ya usa toda la interfaz (Kg×Reps, no Ronda) para una serie suelta. */
  function badges(){
    document.querySelectorAll('.set-row-label').forEach(function(l){
      var t = l.textContent.trim();
      var m = t.match(/(\d+)/);
      if(m && !/^SERIE \d+$/.test(t)) l.textContent = 'SERIE ' + m[1];
    });
  }
  /* al completar una serie, la siguiente hereda los kilos */
  function autoFill(row){
    if(!row) return;
    var kg = row.querySelector('.set-kg');
    var reps = row.querySelector('.set-reps');
    var val = kg ? kg.value : '';
    if(!val) return;
    var sig = row.nextElementSibling;
    if(!sig || !sig.classList.contains('set-row')) return;
    var sKg = sig.querySelector('.set-kg');
    var sRp = sig.querySelector('.set-reps');
    var chk = sig.querySelector('.set-check');
    if(chk && chk.checked) return;                 /* ya la hizo: no se toca */
    if(sKg && !sKg.value){
      sKg.value = val;
      sKg.dispatchEvent(new Event('input', { bubbles:true }));
      sKg.dispatchEvent(new Event('change', { bubbles:true }));
      sKg.classList.add('auto-lleno');
      setTimeout(function(){ sKg.classList.remove('auto-lleno'); }, 900);
    }
    if(sRp && !sRp.value && reps && reps.value){
      sRp.value = reps.value;
      sRp.dispatchEvent(new Event('input', { bubbles:true }));
      sRp.dispatchEvent(new Event('change', { bubbles:true }));
    }
  }
  document.addEventListener('change', function(e){
    var c = e.target.closest('.set-check');
    if(!c || !c.checked) return;
    setTimeout(function(){ autoFill(c.closest('.set-row')); }, 60);
  }, true);
  window.CoachAutoFill = autoFill;

  /* =========================================================
     3 · MONTAJE
  ========================================================= */
  function repintar(){ try{ nota(); badges(); }catch(e){} }
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
        setTimeout(repintar, 100);
        setTimeout(repintar, 400);
        return r;
      };
    }
    window.CoachNotaMeso = { pintar: nota, badges: badges, autoFill: autoFill };
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(mount, 200); });
  else setTimeout(mount, 200);
})();
