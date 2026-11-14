(function(){
  'use strict';
  if (typeof window.updateProgress !== 'function' || window.updateProgress.__deskRing) return;
  var _updateProgress = window.updateProgress;
  window.updateProgress = function(){
    var r = _updateProgress.apply(this, arguments);
    try{
      var countEl = document.getElementById('progress-count');
      var pct = countEl ? (parseInt(countEl.textContent, 10) || 0) : 0;
      var num = document.getElementById('progressRingNum');
      var fill = document.getElementById('progressRingFill');
      if(num) num.textContent = pct + '%';
      if(fill){
        var c = 2 * Math.PI * 15.5;
        fill.style.strokeDasharray = (c * pct / 100).toFixed(1) + ' ' + c.toFixed(1);
      }
    }catch(e){ /* solo UI del anillo — nunca debe romper el progreso real */ }
    return r;
  };
  window.updateProgress.__deskRing = 1;
})();
