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

  var VERSION = 'v3 · Azul Noche · Clean Tech · High-Performance · Pulse · Compacto';
  /* escudo oficial: oro #F5C518 con el rayo negro */
  var ESCUDO = '<svg viewBox="0 0 64 74" role="img" aria-label="Coach JP"><defs><linearGradient id="srEsc" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FFF2A8"/><stop offset="38%" stop-color="#F5C518"/><stop offset="72%" stop-color="#D6A500"/><stop offset="100%" stop-color="#8A6B00"/></linearGradient></defs>' +
    '<path d="M32 2 L60 12 V36 C60 54 47 66 32 72 C17 66 4 54 4 36 V12 Z" fill="url(#srEsc)" stroke="#FFF2A8" stroke-width="1.6" stroke-linejoin="round"/><path d="M36 18 L21 40 H30 L27 58 L43 34 H33 Z" fill="#0A0C10"/></svg>';
  var ESTILOS = [
    { n: 1, nombre: 'Clean Tech', tag: 'Minimalista · acento cian', desc: 'Líneas finas con brillo, tipografía tabular y una estructura horizontal estricta: cada fila lleva su rótulo (volumen, descanso, técnica). Las repeticiones en cian y el descanso en menta.' },
    { n: 2, nombre: 'High-Performance', tag: 'Acento ocre', desc: 'Industrial deportivo: el volumen va en un bloque resaltado con el ocre de la marca, números enormes y el descanso en cian para que contraste.' },
    { n: 3, nombre: 'Pulse', tag: 'Color por dato', desc: 'Barra naranja de la marca arriba y cada dato con su color: series en naranja, descanso en menta, tempo en cian y RIR en ámbar. Se lee de un vistazo, sin recargar.' },
    { n: 4, nombre: 'Compacto de élite', tag: 'Densidad optimizada', desc: 'Pensado para leer en un segundo en el gimnasio: filas estrictas, descanso, tempo y RIR en una sola línea de celdas con filete de color y números en negrita pura.' }
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
    var r2 = '<button type="button" class="jp-db-seg jp-db-rest jp-rest-go" data-sr-rest="' + segDe(o.rest) + '" aria-label="Iniciar descanso de ' + esc(o.rest) + '">⏱︎▶︎ DESCANSO ' + esc(o.rest) + '</button>';
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

  /* ---------- cronómetro emergente de descanso (demo del Showroom) ----------
     En la app del alumno el botón "DESCANSO" abre el reloj flotante de descanso. Las tarjetas de muestra del Showroom hacen lo mismo con un reloj propio y autónomo
     (no usa datos ni guarda nada): así se prueba el gesto sin salir de la vista. */
  var TIMER = { fin: 0, restante: 0, total: 0, corre: false, intervalo: null };
  function segDe(txt){ var m = /^(\d+):(\d{2})$/.exec(String(txt || '').trim()); return m ? (parseInt(m[1], 10) * 60 + parseInt(m[2], 10)) : (parseInt(txt, 10) || 0); }
  function mmss(s){ s = Math.max(0, Math.round(s)); return ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + (s % 60)).slice(-2); }
  function timerEl(){ return document.getElementById('srTimer'); }
  function pintarTimer(){
    var el = timerEl(); if(!el) return;
    el.querySelector('.srt-t').textContent = mmss(TIMER.restante);
    el.querySelector('.srt-bar > i').style.width = (TIMER.total > 0 ? Math.max(0, Math.min(100, TIMER.restante / TIMER.total * 100)) : 0).toFixed(1) + '%';
    el.querySelector('[data-srt="pausa"]').textContent = TIMER.corre ? '⏸' : '▶';
    el.classList.toggle('srt-warn', TIMER.restante <= 10 && TIMER.restante > 0);
    el.classList.toggle('srt-fin', TIMER.restante <= 0);
  }
  function tickTimer(){
    if(!TIMER.corre) return;
    TIMER.restante = Math.max(0, Math.round((TIMER.fin - Date.now()) / 1000));
    if(TIMER.restante <= 0){ TIMER.corre = false; clearInterval(TIMER.intervalo); TIMER.intervalo = null; var el = timerEl(); if(el) el.querySelector('.srt-lb').textContent = '¡A la próxima serie!'; setTimeout(function(){ if(!TIMER.corre && TIMER.restante <= 0) cerrarTimer(); }, 3200); }
    pintarTimer();
  }
  function abrirTimer(seg, etiqueta){
    if(!(seg > 0)) return;
    var el = timerEl();
    if(!el){
      el = document.createElement('div'); el.id = 'srTimer'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Cronómetro de descanso');
      el.innerHTML = '<div class="srt-h"><span class="srt-lb"></span><button type="button" data-srt="cerrar" aria-label="Cerrar">✕</button></div><div class="srt-t">00:00</div><div class="srt-bar"><i></i></div>' +
        '<div class="srt-a"><button type="button" data-srt="pausa" aria-label="Pausar o reanudar">⏸</button><button type="button" data-srt="mas">+10s</button><button type="button" data-srt="saltar">SALTAR</button></div>';
      el.addEventListener('click', function(e){
        var b = e.target.closest ? e.target.closest('[data-srt]') : null; if(!b) return;
        var a = b.getAttribute('data-srt');
        if(a === 'cerrar' || a === 'saltar') cerrarTimer();
        else if(a === 'mas'){ TIMER.restante += 10; if(TIMER.restante > TIMER.total) TIMER.total = TIMER.restante; TIMER.fin = Date.now() + TIMER.restante * 1000; pintarTimer(); }
        else if(a === 'pausa'){
          TIMER.corre = !TIMER.corre;
          if(TIMER.corre){ TIMER.fin = Date.now() + TIMER.restante * 1000; if(!TIMER.intervalo) TIMER.intervalo = setInterval(tickTimer, 250); }
          else if(TIMER.intervalo){ clearInterval(TIMER.intervalo); TIMER.intervalo = null; }
          pintarTimer();
        }
      });
      document.body.appendChild(el);
    }
    el.querySelector('.srt-lb').textContent = etiqueta || 'Descanso';
    TIMER.total = TIMER.restante = seg; TIMER.fin = Date.now() + seg * 1000; TIMER.corre = true;
    if(TIMER.intervalo) clearInterval(TIMER.intervalo);
    TIMER.intervalo = setInterval(tickTimer, 250);
    el.classList.add('on'); pintarTimer();
  }
  function cerrarTimer(){
    TIMER.corre = false; if(TIMER.intervalo){ clearInterval(TIMER.intervalo); TIMER.intervalo = null; }
    var el = timerEl(); if(el) el.classList.remove('on');
  }

  /* ---------- la vista ---------- */
  function cabeza(){
    var fj = fijado();
    return '<div class="card sr-marca-card" style="padding:12px 16px"><div class="sr-marca">' + ESCUDO + '<div class="sr-marca-t"><span class="sr-marca-n">COACH <em>JP</em></span><span class="sr-marca-s">@coachjp.training</span></div></div></div>' +
      '<div class="topbar"><div><h2>🎨 Showroom</h2><div class="sub">Tarjetas de ejercicio sobre el fondo azul noche · 4 estilos para elegir</div></div><span class="pill teal" title="Si ves este sello estás en el Showroom nuevo">' + VERSION + '</span></div>' +
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
  /* ---------- vista previa REAL: la app del alumno compilada con tus datos, con el estilo cambiando en vivo ----------
     Se arma con el mismo compile() que la exportación: es literalmente lo que recibe el alumno. Usa el alumno activo si su plan tiene bloques; si no, un plan de ejemplo del Banco
     (un alumno de muestra que existe solo durante el armado: nada se guarda). El iframe vive en su propio contenedor (#srReal) para no recargarse cada vez que se redibuja el resto. */
  function planConBloques(p){ return !!(p && (p.dias || []).some(function(d){ return d && ((d.bloques || []).length || (Array.isArray(d.bloquesPorSemana) && d.bloquesPorSemana.some(function(a){ return a && a.length; }))); })); }
  function htmlAlumnoDemo(){
    var act = (typeof active === 'function') ? active() : null, p = act ? plan(act.id) : null;
    if(act && planConBloques(p)) return { html: compile(act), origen: 'alumno', nombre: fullName(act) };
    var tpl = (S.banco || []).filter(function(r){ return r && r.id === 'bkstd_jp26_m3_i' && (r.dias || []).length; })[0] || (S.banco || []).filter(function(r){ return r && (r.dias || []).length && !r.cfMes; })[0];
    if(!tpl) return null;
    var demo = { id: 'showroom_demo', nombre: 'Alumno', apellido: 'de muestra', freq: tpl.dias.length, nivel: 'Intermedio', genero: 'M', createdAt: Date.now() };
    var pd = newPlan(demo); pd.dias = JSON.parse(JSON.stringify(tpl.dias)); pd.meso = JSON.parse(JSON.stringify(tpl.meso || defaultWeeks()));
    pd.meta = Object.assign(pd.meta || {}, JSON.parse(JSON.stringify(tpl.meta || {})));
    S.athletes.push(demo); S.plans[demo.id] = pd;      /* el plan se registra antes de compilar para que plan() no dispare un guardado */
    try{ return { html: compile(demo), origen: 'demo', nombre: 'plan de ejemplo del Banco' }; }
    finally{ delete S.plans[demo.id]; var ix = S.athletes.indexOf(demo); if(ix >= 0) S.athletes.splice(ix, 1); }
  }
  function realCuerpo(){
    var n = REAL.estilo || fijado();
    return '<div class="card sr-real-card"><h3>📱 Vista previa REAL en la app del alumno</h3>' +
      '<div class="hint" style="margin:-6px 0 10px">Es la app del alumno compilada de verdad (fondo azul noche, tarjeta en tres filas, coaching tips desplegables). Cambiá de estilo y se aplica en el acto, sin recargar.</div>' +
      '<div class="sr-seg" style="margin-bottom:10px">' + ESTILOS.map(function(e){ return '<button type="button" class="btn sm' + (n === e.n ? ' gold' : ' ghost') + '" data-sr-real="' + e.n + '">Estilo ' + e.n + ' · ' + esc(e.nombre) + '</button>'; }).join('') +
        '<button type="button" class="btn sm" data-sr-fijar="' + n + '" style="margin-left:auto">📌 Fijar el estilo ' + n + '</button></div>' +
      '<div class="sr-phone"><iframe id="srRealFrame" title="Vista previa de la app del alumno" loading="lazy"></iframe></div>' +
      '<div class="hint" id="srRealInfo" style="margin-top:8px"></div></div>';
  }
  var REAL = { abierta: false, estilo: 0, origen: '' };
  function renderReal(){
    var box = document.getElementById('srReal'); if(!box) return;
    if(!REAL.abierta){
      box.innerHTML = '<div class="card sr-real-card"><h3>📱 Vista previa REAL en la app del alumno</h3>' +
        '<div class="hint" style="margin:-6px 0 10px">Compila la app del alumno de verdad (con tu alumno activo, o un plan de ejemplo del Banco si todavía no cargaste bloques) y te deja cambiar de estilo en vivo.</div>' +
        '<button type="button" class="btn gold" data-sr-abrir="1">▶ Abrir la vista previa real</button></div>';
      return;
    }
    box.innerHTML = realCuerpo();
    var fr = document.getElementById('srRealFrame'), info = document.getElementById('srRealInfo');
    var r = null;
    try{ r = htmlAlumnoDemo(); }catch(e){ console.warn('showroom: vista real', e); }
    if(!r){ if(info) info.textContent = 'No hay un plan con bloques ni plantillas del Banco para armar la vista previa.'; return; }
    REAL.origen = r.origen;
    if(info) info.textContent = 'Mostrando: ' + (r.origen === 'alumno' ? 'el plan de ' + r.nombre : r.nombre) + '.';
    fr.addEventListener('load', function(){ aplicarEnReal(REAL.estilo || fijado()); });
    fr.srcdoc = r.html;
  }
  function aplicarEnReal(n){
    var fr = document.getElementById('srRealFrame'); if(!fr) return;
    REAL.estilo = n;
    try{ if(fr.contentWindow && typeof fr.contentWindow.jpEstiloTarjeta === 'function') fr.contentWindow.jpEstiloTarjeta(n); }catch(e){}
    var btns = document.querySelectorAll('#srReal [data-sr-real]');
    for(var i = 0; i < btns.length; i++){ var on = parseInt(btns[i].getAttribute('data-sr-real'), 10) === n; btns[i].classList.toggle('gold', on); btns[i].classList.toggle('ghost', !on); }
    var fj = document.querySelector('#srReal [data-sr-fijar]'); if(fj){ fj.setAttribute('data-sr-fijar', String(n)); fj.textContent = '📌 Fijar el estilo ' + n; }
  }
  function render(){
    var host = document.getElementById('v-showroom'); if(!host) return;
    var top = document.getElementById('srTop'), real = document.getElementById('srReal');
    if(!top || !real){ host.innerHTML = '<div id="srTop"></div><div id="srReal"></div>'; top = document.getElementById('srTop'); real = document.getElementById('srReal'); renderReal(); }
    var cuerpo = VISTA.modo === 'comparar'
      ? '<div class="sr-grid">' + ESTILOS.map(function(e){ return columna(e, false); }).join('') + '</div>'
      : '<div class="sr-uno">' + columna(ESTILOS[VISTA.sel - 1], true) + '</div>';
    top.innerHTML = cabeza() + cuerpo;
  }
  function fijar(n){
    var u = ui(); u.estiloTarjeta = n;
    VISTA.prueba = 0; aplicar(n);
    try{ save(); }catch(e){}
    render();
    if(REAL.abierta) aplicarEnReal(n);
    try{ toast('📌 Estilo ' + nombreDe(n) + ' fijado. El Builder ya lo usa; los alumnos lo reciben al exportar o recompilar su app.'); }catch(e){}
  }
  function probar(n){
    VISTA.prueba = (VISTA.prueba === n) ? 0 : n;
    aplicar(VISTA.prueba || fijado());
    render();
    try{ toast(VISTA.prueba ? '👁️ Probando el estilo ' + nombreDe(n) + ' en el Builder (sin fijar)' : 'Volviste al estilo vigente: ' + nombreDe(fijado())); }catch(e){}
  }
  function clic(e){
    var t = e.target.closest ? e.target.closest('[data-sr-modo],[data-sr-sel],[data-sr-fijar],[data-sr-prueba],[data-sr-real],[data-sr-abrir],[data-sr-rest]') : null; if(!t) return;
    if(t.dataset.srRest){
      var cd = t.closest('.jp-sb-ex'), nm = cd && cd.querySelector('.jp-sb-ex-nombre');
      abrirTimer(parseInt(t.dataset.srRest, 10), 'Descanso · ' + (nm ? nm.textContent.replace(/\s*\([^)]*\)\s*$/, '').trim() : 'ejercicio'));
      return;
    }
    if(t.dataset.srAbrir){ REAL.abierta = true; renderReal(); return; }
    if(t.dataset.srReal){ aplicarEnReal(parseInt(t.dataset.srReal, 10) || 2); return; }
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
      if(view === 'showroom'){ render(); if(REAL.abierta) renderReal(); }
      return r;
    };
    go1.__showroom = true; window.go = go1;
  }
  function arrancar(){
    try{ montar(); enganchar(); }catch(e){ console.warn('showroom', e); }
    /* enlace directo: ...index.html#showroom abre el Showroom nuevo */
    try{ if(/^#showroom/.test(location.hash || '')) window.go('showroom'); }catch(e){}
    /* los botones del menú se atan por delegación o por elemento: el nuevo se ata acá */
    var nb = document.querySelector('.navbtn[data-view="showroom"]');
    if(nb && !nb.getAttribute('data-sr-nav')){ nb.setAttribute('data-sr-nav', '1'); nb.addEventListener('click', function(){ try{ window.go('showroom'); }catch(e){} }); }
  }
  window.CoachShowroom = { version: VERSION, htmlAlumnoDemo: htmlAlumnoDemo, aplicarEnReal: aplicarEnReal, estilos: ESTILOS, fijado: fijado, fijar: fijar, probar: probar, render: render, aplicar: aplicar };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(arrancar, 300); }); else setTimeout(arrancar, 300);
})();
