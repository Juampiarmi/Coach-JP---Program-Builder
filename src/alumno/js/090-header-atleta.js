/* Header del atleta · dato de contexto bajo el nombre (disciplina · nivel), estilo ficha. Solo suma una línea de texto: no toca el nombre ni ningún dato del plan. */
(function(){
  'use strict';
  function etiqueta(){
    var pc = (typeof PROGRAM_CONFIG !== 'undefined' && PROGRAM_CONFIG) || {}, nombre = String(pc.mesoName || ''), disc = String(pc.disciplina || '').toLowerCase();
    var d;
    if(/hyrox/i.test(nombre)) d = 'Hyrox';
    else if(window.COACH_DISCIPLINA === 'crossfit' || disc === 'crossfit') d = 'CrossFit';
    else if(/rugby|mtb|mountain|golf|running|tenis|f[uú]tbol|deport/i.test(nombre)) d = (/(rugby|mtb|mountain bike|golf|running|tenis|f[uú]tbol)/i.exec(nombre) || ['Deportes'])[0];
    else d = 'Bodybuilding';
    d = d.charAt(0).toUpperCase() + d.slice(1);
    var niv = String(pc.mesoNivel || pc.cfNivel || '').trim().toLowerCase();
    var nivTxt = ({ intermedio: 'Intermedio', avanzado: 'Avanzado', principiante: 'Principiante', pro: 'Pro', elite: 'Élite', 'élite': 'Élite' })[niv] || (niv ? niv.charAt(0).toUpperCase() + niv.slice(1) : '');
    return nivTxt ? d + ' · ' + nivTxt : d;
  }
  function pintar(){
    var nom = document.getElementById('hdcName'); if(!nom) return;
    var c = document.getElementById('hdcCtx');
    if(!c){ c = document.createElement('span'); c.id = 'hdcCtx'; c.className = 'hdc-ctx'; nom.parentNode.insertBefore(c, nom.nextSibling); }
    var t = etiqueta(); if(c.textContent !== t) c.textContent = t;
  }
  try{ pintar(); }catch(e){ console.warn('header·contexto', e); }
  window.jpHeaderContexto = pintar;
})();
