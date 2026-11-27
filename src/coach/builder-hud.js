/* ============================================================
   BUILDER HUD · capa propia del Builder (Fase 0, 2026-11)
   ------------------------------------------------------------
   Punto único para las mejoras de presentación del Builder, al final del documento (después de todos los módulos) y con su CSS en
   coach/estilos/builder-hud.css. SOLO PRESENTACIÓN: nunca escribe en S, nunca llama a save() y no guarda nada en localStorage.
   Se reaplica cada vez que el Builder se redibuja. API para los tests: window.JPB = { aplicar, resumenBloque, abrir, cerrar, paneles }.
   ============================================================ */
(function(){
  'use strict';
  if(window.JPB) return;
  var obs = null, pend = 0;
  function aplicar(){
    pend = 0;
    if(obs) obs.disconnect();
    /* (Fase 1 en adelante: paneles plegados, resumen de bloque, etc.) */
    var v = document.getElementById('v-builder');
    if(obs && v) obs.observe(v, { childList: true, subtree: true });
  }
  function programar(){ if(!pend) pend = setTimeout(aplicar, 60); }
  function montar(){
    if(!document.getElementById('v-builder')) return;
    if(!obs && window.MutationObserver) obs = new MutationObserver(programar);
    aplicar();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
  window.JPB = { aplicar: aplicar, resumenBloque: function(){ return ''; }, abrir: function(){}, cerrar: function(){}, paneles: [] };
})();
