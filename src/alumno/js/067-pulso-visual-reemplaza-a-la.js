/* pulso visual: reemplaza a la vibración donde el navegador no la permite */
(function(){
  var el = null, t1 = null;
  function nodo(){
    if(el) return el;
    el = document.createElement('div'); el.id = 'jpPulso';
    document.body.appendChild(el);
    return el;
  }
  window.pulsoVisual = function(esFinal){
    try{
      var n = nodo();
      n.classList.toggle('fin', !!esFinal);
      n.classList.add('on');
      clearTimeout(t1);
      t1 = setTimeout(function(){ n.classList.remove('on'); }, esFinal ? 380 : 170);
    }catch(e){}
  };

  /* el encabezado del timer no promete lo que el equipo no puede hacer */
  function textoHonesto(){
    var hay = window.CoachVibra && CoachVibra.soporta();
    if(hay) return;
    document.querySelectorAll('.cwt-sub').forEach(function(p){
      p.textContent = p.textContent.replace(
        'Suena y vibra en los últimos 3 segundos de cada conteo.',
        'Suena y destella en los últimos 3 segundos de cada conteo. Tu navegador no permite vibración.');
    });
    document.querySelectorAll('.man-step p').forEach(function(p){
      if(p.innerHTML.indexOf('Suena y vibra en los últimos 3 segundos') >= 0)
        p.innerHTML = p.innerHTML.replace('Suena y vibra en los últimos 3 segundos',
                                          'Suena y destella en los últimos 3 segundos');
    });
  }
  if(document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(textoHonesto, 900); });
  else setTimeout(textoHonesto, 900);
  [1800, 3600].forEach(function(ms){ setTimeout(textoHonesto, ms); });
})();
