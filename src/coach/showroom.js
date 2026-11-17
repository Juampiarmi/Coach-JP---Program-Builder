/* =========================================================
   SHOWROOM · prototipado visual de las tarjetas de ejercicio (4 estilos sobre el fondo azul noche)
   ---------------------------------------------------------
   - Vista "🎨 Showroom" del menú lateral: muestra la MISMA tarjeta de ejercicio de la app del alumno en los 4 estilos, en tiempo real.
   - El coach puede comparar los 4 a la vez o ver uno grande, probarlo en el Builder y fijarlo como definitivo: queda guardado en S.ui.estiloTarjeta,
     se aplica al Builder (data-jp-estilo en <body>) y viaja a la app del alumno en PROGRAM_CONFIG.estiloTarjeta (la recibe al exportar / recompilar).
   - Las tarjetas de muestra usan las clases REALES de la app del alumno (jp-sb-ex, jp-dose-bar, jp-ex-tips...), así que lo que se ve acá es lo que verá el alumno.
   ========================================================= */
(function(){
  'use strict';
  if(window.CoachShowroom) return;

  var ESTILOS = [
    { n: 1, nombre: 'Clean Tech', tag: 'Minimalista', desc: 'Líneas finas, tipografía tabular y una estructura horizontal estricta: cada fila lleva su rótulo (volumen, descanso, técnica). La máxima limpieza visual.' },
    { n: 2, nombre: 'High-Performance', tag: 'Acento ocre', desc: 'Industrial deportivo: el volumen va en un bloque resaltado con el ocre de la marca, números enormes y mayor contraste en las métricas.' },
    { n: 3, nombre: 'Glass', tag: 'Glassmorphism sutil', desc: 'Capas translúcidas con desenfoque suave sobre el azul noche, bordes brillantes de 1 px y tarjetas que flotan.' },
    { n: 4, nombre: 'Compacto de élite', tag: 'Densidad optimizada', desc: 'Pensado para leer en un segundo en el gimnasio: filas estrictas, descanso, tempo y RIR en una sola línea de celdas y números en negrita pura.' }
  ];
  var VISTA = { modo: 'comparar', sel: 2, prueba: 0 };       /* modo: comparar | uno · sel: estilo grande · prueba: estilo probado (sin fijar) en el Builder */

  function esc(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function ui(){ try{ S.ui = S.ui || {}; return S.ui; }catch(e){ return {}; } }
  function fijado(){ var n = parseInt(ui().estiloTarjeta, 10); return (n >= 1 && n <= 4) ? n : 2; }
  function tieneFijado(){ var n = parseInt(ui().estiloTarjeta, 10); return n >= 1 && n <= 4; }
  function nombreDe(n){ var e = ESTILOS[n - 1]; return e ? n + ' · ' + e.nombre : String(n); }
  /* El estilo fijado se aplica a las vistas del Builder (NO al <body>) para que las tarjetas de muestra del Showroom, que llevan su propio estilo, no hereden el del Builder. */
  function aplicar(n){
    try{
      document.body.removeAttribute('data-jp-estilo');
      var vistas = document.querySelectorAll('.view');
      for(var i = 0; i < vistas.length; i++){ if(vistas[i].id === 'v-showroom') vistas[i].removeAttribute('data-jp-estilo'); else vistas[i].setAttribute('data-jp-estilo', String(n)); }
    }catch(e){}
  }

  /* ---------- tarjetas de muestra (mismas clases que la app del alumno) ---------- */
  function tips(su, ej, cu){
    return '<details class="jp-ex-tips" open><summary><span class="jp-ex-tips-t">COACHING TIPS</span><span class="jp-ex-tips-s">Set-up · Ejecución · Cuidado</span></summary><div class="jp-ex-tips-b">' +
      '<div class="jp-ex-tip su"><b>SET-UP</b><span>' + esc(su) + '</span></div>' +
      '<div class="jp-ex-tip ej"><b>EJECUCIÓN</b><span>' + esc(ej) + '</span></div>' +
      '<div class="jp-ex-tip cu"><b>CUIDADO</b><span>' + esc(cu) + '</span></div></div></details>';
  }
  function dosis(o){
    var r1 = '<span class="jp-db-seg jp-db-vol"><b class="jp-vn">' + o.series + '</b> <span class="jp-vl">SERIES</span> <i class="jp-vx">×</i> <b class="jp-vr">' + esc(o.reps) + '</b> <span class="jp-vl">' + (o.unidad || 'REPS') + '</span></span>';
    var r2 = '<button type="button" class="jp-db-seg jp-db-rest jp-rest-go" tabindex="-1">⏱︎▶︎ DESCANSO ' + esc(o.rest) + '</button>';
    var r3 = (o.tempo ? '<span class="jp-db-seg jp-db-tempo"><small>TEMPO</small> <b>' + esc(o.tempo) + '</b></span>' : '') +
             '<span class="jp-db-seg jp-db-rir jp-rir-alto"><small>RIR</small> <b>' + esc(o.rir) + '</b></span>' +
             (o.extra ? '<span class="jp-db-seg jp-db-carga"><small>CARGA</small> <b>' + esc(o.extra) + '</b></span>' : '');
    return '<div class="jp-dose-bar"><div class="jp-db-row jp-db-r1">' + r1 + '</div><div class="jp-db-row jp-db-r2">' + r2 + '</div><div class="jp-db-row jp-db-r3">' + r3 + '</div></div>';
  }
  function tarjeta(o){
    return '<div class="jp-sb-ex' + (o.ancla ? ' jp-sb-ex-ancla' : '') + '">' +
      '<div class="jp-sb-ex-head"><span class="jp-sb-ex-id">' + o.id + '</span><span class="jp-sb-ex-nombre">' + esc(o.nombre) + ' <span class="jp-nom-en">(' + esc(o.en) + ')</span></span></div>' +
      dosis(o) +
      '<div class="jp-qc"><button type="button" class="jp-qc-tg" tabindex="-1"><span class="jp-qc-tg-t"><span class="jp-qc-tg-l">Registrar carga</span><span class="jp-qc-tg-id">· ' + o.id + '</span></span><span class="jp-qc-tg-b"><span class="jp-qc-tg-h">Tocar para registrar</span></span></button>' +
      tips(o.su, o.ej, o.cu) + '</div></div>';
  }
  var MUESTRA = [
    { id: '01', nombre: 'Press de banca plano con barra', en: 'Barbell Bench Press', ancla: true, series: 4, reps: '5-7', rest: '3:00', tempo: '3010', rir: '2',
      su: 'Escápulas juntas y hacia abajo, pies firmes y la barra sobre la línea del pecho.', ej: 'Bajá controlado hasta rozar el pecho y empujá como si te alejaras del banco.', cu: 'No rebotes ni despegues la cadera del banco; si el hombro molesta, cerrá un poco el agarre.' },
    { id: '02', nombre: 'Remo con barra inclinado', en: 'Bent-Over Barbell Row', series: 4, reps: '6-8', rest: '2:30', tempo: '2011', rir: '1',
      su: 'Torso a 45 grados, abdomen duro y la barra cerca de las piernas.', ej: 'Tirá de los codos hacia la cadera y sostené medio segundo arriba.', cu: 'Si el torso se levanta para ayudar, bajá la carga.' },
    { id: '03', nombre: 'Plancha lateral', en: 'Side Plank', series: 3, reps: '30', unidad: 'SEG', rest: '0:45', rir: '1',
      su: 'Codo bajo el hombro, pies apilados y la cadera alta.', ej: 'Cuerpo en línea recta, respirando sin soltar el abdomen.', cu: 'No dejes caer la cadera hacia el piso.' }
  ];
  function pantalla(n, conTips){
    var lista = conTips ? MUESTRA : MUESTRA.slice(0, 2);
    return '<div class="sr-stage" data-jp-estilo="' + n + '"><div class="sr-bloque"><div class="sr-bloque-h"><span>FUERZA PRINCIPAL</span><em>// 17 MIN</em></div>' + lista.map(tarjeta).join('') + '</div></div>';
  }

  /* ---------- la vista ---------- */
  function cabeza(){
    var fj = fijado();
    return '<div class="topbar"><div><h2>🎨 Showroom</h2><div class="sub">Tarjetas de ejercicio sobre el fondo azul noche · 4 estilos para elegir</div></div></div>' +
      '<div class="card sr-info"><div class="sr-info-t"><b>Estilo vigente:</b> <span class="pill gold">' + esc(nombreDe(fj)) + '</span> ' + (tieneFijado() ? '' : '<span class="hint" style="display:inline">(por defecto: todavía no fijaste ninguno)</span>') +
        (VISTA.prueba ? ' <span class="pill teal">probando: ' + esc(nombreDe(VISTA.prueba)) + '</span>' : '') + '</div>' +
      '<div class="hint">Las 4 versiones comparten la misma estructura: <b>volumen grande</b> a lo largo de la tarjeta, el <b>descanso debajo</b>, el <b>tempo y el RIR</b> en la línea técnica y los <b>coaching tips</b> (Set-up, Ejecución, Cuidado) desplegables al pie. Al fijar un estilo se aplica al Builder y viaja a la app de cada alumno cuando exportás o recompilás.</div>' +
      '<div class="sr-ctrl"><div class="sr-seg" role="tablist" aria-label="Modo de vista">' +
        '<button type="button" class="btn sm' + (VISTA.modo === 'comparar' ? ' gold' : ' ghost') + '" data-sr-modo="comparar">▦ Comparar los 4</button>' +
        '<button type="button" class="btn sm' + (VISTA.modo === 'uno' ? ' gold' : ' ghost') + '" data-sr-modo="uno">▭ Ver uno grande</button></div>' +
        (VISTA.modo === 'uno' ? '<div class="sr-seg" role="tablist" aria-label="Estilo">' + ESTILOS.map(function(e){ return '<button type="button" class="btn sm' + (VISTA.sel === e.n ? ' gold' : ' ghost') + '" data-sr-sel="' + e.n + '">Estilo ' + e.n + '</button>'; }).join('') + '</div>' : '') +
      '</div></div>';
  }
  function columna(e, grande){
    var fj = fijado(), es = (fj === e.n && tieneFijado());
    return '<div class="sr-col' + (es ? ' sr-fijado' : '') + '">' +
      '<div class="sr-col-h"><div><div class="sr-col-t">Estilo ' + e.n + ' · ' + esc(e.nombre) + '</div><div class="sr-col-s">' + esc(e.tag) + '</div></div>' + (es ? '<span class="pill gold">✓ FIJADO</span>' : '') + '</div>' +
      '<p class="sr-col-d">' + esc(e.desc) + '</p>' + pantalla(e.n, !!grande) +
      '<div class="sr-acc"><button type="button" class="btn sm ghost" data-sr-prueba="' + e.n + '" title="Aplica este estilo al Builder mientras lo probás, sin fijarlo">👁️ Probar en el Builder</button>' +
      '<button type="button" class="btn sm gold" data-sr-fijar="' + e.n + '"' + (es ? ' disabled' : '') + '>' + (es ? '✓ Estilo fijado' : '📌 Fijar como definitivo') + '</button></div></div>';
  }
  function render(){
    var host = document.getElementById('v-showroom'); if(!host) return;
    var cuerpo = VISTA.modo === 'comparar'
      ? '<div class="sr-grid">' + ESTILOS.map(function(e){ return columna(e, false); }).join('') + '</div>'
      : '<div class="sr-uno">' + columna(ESTILOS[VISTA.sel - 1], true) + '</div>';
    host.innerHTML = cabeza() + cuerpo;
  }
  function fijar(n){
    var u = ui(); u.estiloTarjeta = n;
    VISTA.prueba = 0; aplicar(n);
    try{ save(); }catch(e){}
    render();
    try{ toast('📌 Estilo ' + nombreDe(n) + ' fijado. El Builder ya lo usa; los alumnos lo reciben al exportar o recompilar su app.'); }catch(e){}
  }
  function probar(n){
    VISTA.prueba = (VISTA.prueba === n) ? 0 : n;
    aplicar(VISTA.prueba || fijado());
    render();
    try{ toast(VISTA.prueba ? '👁️ Probando el estilo ' + nombreDe(n) + ' en el Builder (sin fijar)' : 'Volviste al estilo vigente: ' + nombreDe(fijado())); }catch(e){}
  }
  function clic(e){
    var t = e.target.closest ? e.target.closest('[data-sr-modo],[data-sr-sel],[data-sr-fijar],[data-sr-prueba]') : null; if(!t) return;
    if(t.dataset.srModo){ VISTA.modo = t.dataset.srModo; render(); return; }
    if(t.dataset.srSel){ VISTA.sel = parseInt(t.dataset.srSel, 10) || 2; render(); return; }
    if(t.dataset.srFijar){ fijar(parseInt(t.dataset.srFijar, 10)); return; }
    if(t.dataset.srPrueba){ probar(parseInt(t.dataset.srPrueba, 10)); return; }
  }

  /* ---------- montaje: botón del menú, sección y enganche a go() ---------- */
  function montar(){
    var side = document.querySelector('.sidebar');
    if(side && !side.querySelector('[data-view="showroom"]')){
      var ref = side.querySelector('[data-view="datos"]');
      var b = document.createElement('button'); b.className = 'navbtn'; b.setAttribute('data-view', 'showroom'); b.innerHTML = '<i>🎨</i> Showroom';
      if(ref && ref.parentNode) ref.parentNode.insertBefore(b, ref); else side.appendChild(b);
    }
    var sec = document.getElementById('v-showroom');
    if(!sec){
      sec = document.createElement('section'); sec.id = 'v-showroom'; sec.className = 'view'; sec.style.display = 'none';
      var datos = document.getElementById('v-datos');
      if(datos && datos.parentNode) datos.parentNode.insertBefore(sec, datos); else document.querySelector('.main').appendChild(sec);
    }
    if(!sec.getAttribute('data-sr')){ sec.setAttribute('data-sr', '1'); sec.addEventListener('click', clic); }
    aplicar(fijado());
  }
  function enganchar(){
    var go0 = window.go;
    if(typeof go0 !== 'function' || go0.__showroom) return;
    var go1 = function(view){
      /* una prueba sin fijar no se queda: al salir del Showroom el Builder vuelve al estilo vigente */
      if(view !== 'showroom' && VISTA.prueba){ VISTA.prueba = 0; aplicar(fijado()); }
      var r = go0.apply(this, arguments);
      aplicar(VISTA.prueba || fijado());
      if(view === 'showroom') render();
      return r;
    };
    go1.__showroom = true; window.go = go1;
  }
  function arrancar(){
    try{ montar(); enganchar(); }catch(e){ console.warn('showroom', e); }
    /* los botones del menú se atan por delegación o por elemento: el nuevo se ata acá */
    var nb = document.querySelector('.navbtn[data-view="showroom"]');
    if(nb && !nb.getAttribute('data-sr-nav')){ nb.setAttribute('data-sr-nav', '1'); nb.addEventListener('click', function(){ try{ window.go('showroom'); }catch(e){} }); }
  }
  window.CoachShowroom = { estilos: ESTILOS, fijado: fijado, fijar: fijar, probar: probar, render: render, aplicar: aplicar };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(arrancar, 300); }); else setTimeout(arrancar, 300);
})();
