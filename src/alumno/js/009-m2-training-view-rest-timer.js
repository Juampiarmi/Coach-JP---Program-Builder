/* =========================================================
   M2 · TRAINING VIEW, REST TIMER, PR, PIZARRA Y SUMMARY
========================================================= */
(function(){
  /* las marcas del coach pueden venir como objeto {nombre:kg} o como lista
     [{nombre, kg, reps, e1rm}] — se normalizan a un mapa nombre → 1RM estimado */
  const PRS = (function(){
    var raw = (PROGRAM_CONFIG && PROGRAM_CONFIG.prs) || {};
    var out = {};
    if(Array.isArray(raw)){
      raw.forEach(function(m){
        if(!m || !m.nombre) return;
        var v = parseFloat(m.e1rm) || parseFloat(m.kg) || 0;
        if(v > 0) out[m.nombre] = v;
      });
    } else {
      Object.keys(raw).forEach(function(k){
        var m = raw[k];
        var v = (m && typeof m === 'object') ? (parseFloat(m.e1rm) || parseFloat(m.kg) || 0) : (parseFloat(m) || 0);
        var nom = (m && typeof m === 'object' && m.nombre) ? m.nombre : k;
        if(v > 0) out[nom] = v;
      });
    }
    return out;
  })();
  window.JP_PRS = PRS;
  state.scores = state.scores || {};
  state.session = state.session || {};
  state.restSec = state.restSec || 90;

  /* ---------- persistencia extra (se suma a la que ya había) ---------- */
  const _flushExtraSesion = _spFlush;
  _spFlush = function(){
    _flushExtraSesion();
    try{
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      raw.scores = state.scores; raw.session = state.session; raw.restSec = state.restSec;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
    }catch(e){ _spReintentar(); }
  };
  try{
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    state.scores = raw.scores || {}; state.session = raw.session || {};
    state.restSec = raw.restSec || 90;
  }catch(e){}

  const vibrar = ms => { try{ if(navigator.vibrate) navigator.vibrate(ms); }catch(e){} };
  const mmss = s => String(Math.floor(Math.max(0,s)/60)).padStart(2,'0') + ':' + String(Math.max(0,s)%60).padStart(2,'0');

  /* =========================================================
     1) REST TIMER FLOTANTE
  ========================================================= */
  const hud = document.getElementById('restHud');
  const hudTime = document.getElementById('rhTime');
  const hudLb = document.getElementById('rhLb');
  let restLeft = 0, restInt = null, restRun = false, restTotal = 90;
  /* directiva10 -- mismo cambio de arquitectura que buildRoundTimer (ver
     comentario largo junto a esa función, ~línea 5346): restTargetEnd
     guarda el instante absoluto (epoch ms) en el que debería terminar el
     descanso. tick() ya no resta 1 de restLeft a ciegas cada segundo --
     antes, si el navegador suspendía este setInterval al bloquear la
     pantalla (comportamiento normal en iOS/Android para ahorrar batería),
     restLeft se quedaba clavado en el valor de antes de irse y sólo
     retomaba la cuenta regresiva de a 1 por segundo real cuando volvía,
     mostrando un tiempo "viejo" que ya no reflejaba lo que pasó en
     verdad. Ahora restLeft se recalcula siempre contra restTargetEnd. */
  let restTargetEnd = 0;
  /* directiva ("Rest Timer Premium in-situ") -- el motor del descanso
     sigue siendo ÚNICO y compartido (persistencia, resync en background,
     notificaciones, beep/vibración ya blindados arriba), pero ahora
     puede "espejarse" en un widget que vive DENTRO del bloque de
     CrossFit en vez de la barra flotante (#restHud), igual que espejo()
     ya hace con el Timer de Box. restActive cubre TODA la vida del
     descanso (arranque -> cierre), independiente de restRun (que sólo
     indica corriendo/pausado) y de restJustFinished (la ventana breve
     de "listo" antes del auto-cierre) -- así un espejo externo puede
     distinguir sin ambigüedad sus 3 estados aun cuando restLeft/restTotal
     queden en su último valor tras cerrar. */
  let restActive = false, restJustFinished = false, onRestTick = null;
  function estadoRest(){
    return { active: restActive, running: restRun, finished: restJustFinished,
      left: restLeft, total: restTotal, label: hudLb ? hudLb.textContent : '' };
  }

  /* =========================================================
     DIRECTIVA 13, CAPA 1: NOTIFICACIÓN LOCAL DE DESCANSO TERMINADO
     Sólo tiene sentido avisar por notificación cuando el alumno YA no
     está mirando la pantalla (app minimizada o en otra pestaña) -- si
     la tiene abierta, el HUD de descanso (beep + vibración + flash
     visual, ya existentes arriba) alcanza y sobra; una notificación
     encima sería ruido duplicado. document.hidden es la señal estándar
     para "no la está mirando ahora mismo". El permiso se pide una sola
     vez, recién en el primer descanso real que arranca el alumno (gesto
     propio: tocó el check de una serie) -- nunca al cargar la página,
     que es la razón más común por la que un navegador termina bloqueando
     el permiso para siempre. ========================================= */
  let notifPermPedido = false;
  function pedirPermisoNotifDescanso(){
    try{ jpBgTimer.pedirPermiso(); }catch(e){}
    if(notifPermPedido) return;
    notifPermPedido = true;
    try{
      if('Notification' in window && Notification.permission === 'default'){
        Notification.requestPermission().catch(function(){});
      }
    }catch(e){}
  }
  /* directiva maestra ("Background timer"): aviso unificado en jpBgTimer
     ("⏱️ ¡Tiempo cumplido! Tu descanso/bloque ha finalizado." + vibración
     [200,100,200]); sólo actúa con la app en segundo plano. */
  function mostrarNotifDescanso(){
    try{ jpBgTimer.finalizado(); }catch(e){}
  }

  function pintarRest(){
    hudTime.textContent = mmss(restLeft);
    hud.style.setProperty('--p', restTotal > 0 ? Math.max(0, Math.min(1, restLeft / restTotal)) : 0);
    hud.classList.toggle('warn', restLeft <= 10 && restLeft > 0);
    document.getElementById('rhToggle').innerHTML = restRun ? JP_IC_PAUSA : JP_IC_PLAY;
    hud.querySelectorAll('[data-rest]').forEach(b =>
      b.classList.toggle('on', parseInt(b.dataset.rest,10) === state.restSec));
    if(onRestTick) try{ onRestTick(estadoRest()); }catch(e){}
  }
  var _restAv = -1;
  function tick(){
    if(!restRun) return;
    restLeft = Math.max(0, Math.round((restTargetEnd - Date.now()) / 1000));
    /* directiva maestra ("Sonido de Box"): 10 s restantes = un tono corto de
       advertencia (sólo en descansos de más de 20 s) y segundos 3-2-1 =
       beeps secos; _restAv evita repetir el mismo segundo entre ticks. */
    if(restLeft === 10 && restTotal > 20 && _restAv !== 10){
      _restAv = 10; try{ jpBox.aviso10(); }catch(e){}
    }
    if(restLeft <= 3 && restLeft > 0 && _restAv !== restLeft){
      _restAv = restLeft;
      try{ jpAudioTactical.soundTimerTick(restLeft); }catch(e){}
      CoachVibra.cuenta(); window.pulsoVisual && pulsoVisual();
    }
    if(restLeft <= 0){
      restLeft = 0; pararRest();
      restJustFinished = true;
      /* directiva ("Motor de Retroalimentación Háptica & Sonido Táctico")
         -- tono firme + patrón militar nuevos al terminar el descanso.
         Motor único (arrancarRest/tick): CF (jpCfRestOnTick) y Sports
         (barra flotante) espejan este mismo tick, así que un solo punto
         de cambio cubre las dos disciplinas sin tocar cada widget. */
      try{ jpAudioTactical.soundTimerEnd(); }catch(e){}
      try{ jpAudioTactical.vibrateTimerEnd(); }catch(e){}
      window.pulsoVisual && pulsoVisual(true);
      mostrarNotifDescanso();
      hudLb.textContent = '¡A la próxima serie!';
      setTimeout(cerrarRest, 3200);
    }
    pintarRest();
  }
  /* directiva (timer en segundo plano persistente): el resync por
     visibilitychange/focus/pageshow de arriba ya cubre "minimizar,
     bloquear el celular, cambiar de app" -- pero si el navegador o el
     SO matan la pestaña de verdad (memoria baja, PWA recién reabierta)
     restTargetEnd se pierde por completo, al vivir sólo en memoria. Se
     guarda en el mismo blob de localStorage que ya usa este módulo
     (STORAGE_KEY, ver _spFlush arriba) para poder reconstruir la cuenta
     regresiva al milisegundo exacto también después de un cierre real. */
  function guardarRestTimer(){
    try{
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if(restRun) raw.restTimer = { targetEnd: restTargetEnd, total: restTotal, label: hudLb.textContent };
      else delete raw.restTimer;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
    }catch(e){}
  }
  /* directiva ("Rest Timer Premium in-situ") -- tercer parámetro "oculto"
     (opcional, default false: comportamiento sin cambios para todo
     llamador existente): cuando un botón de descanso de CrossFit arranca
     el motor, pide que la barra flotante NO se muestre (ese caso ya
     tiene su propio espejo in-situ, ver jpCfRestBadge/jpCfRestOnTick
     más abajo) -- "sin barras flotantes desfasadas" del enunciado. */
  /* directiva maestra ("Optimización en el registro de cargas: botonera
     rápida de ajuste en descanso") -- muestra/oculta el mini-panel de
     steppers +/-2.5kg/+5kg según si window.__jpRestKgInput (fijado por
     el listener de check nativo, ver .jp-btn-check-native en la otra
     IIFE de Pizarra Sports) apunta a una próxima serie real -- nunca se
     inventa un objetivo, si no hay próxima serie el panel queda oculto. */
  function mostrarAjusteKgRest(){
    var panel = document.getElementById('rhKgAdjust');
    var valEl = document.getElementById('rhKgAdjustVal');
    if(!panel || !valEl) return;
    var input = window.__jpRestKgInput;
    if(!input || !document.body.contains(input)){ panel.hidden = true; return; }
    panel.hidden = false;
    var actual = parseFloat(input.value) || parseFloat(input.placeholder) || 0;
    valEl.textContent = actual > 0 ? (actual + ' kg') : '— kg';
  }
  function arrancarRest(seg, etiqueta, oculto){
    pedirPermisoNotifDescanso();
    restLeft = seg || state.restSec;
    restTotal = restLeft;
    restTargetEnd = Date.now() + restLeft * 1000;
    hudLb.textContent = etiqueta || 'Descanso';
    restActive = true; restJustFinished = false;
    hud.classList.toggle('cf-mirrored', !!oculto);
    hud.classList.add('on'); restRun = true;
    if(restInt){ restInt.stop(); } restInt = jpTicker(tick, function(){ return restTargetEnd; }); restInt.start();
    try{ window.jpWake.on('descanso'); }catch(eW){}
    pintarRest();
    mostrarAjusteKgRest();
    guardarRestTimer();
    /* timestampFin absoluto: aviso en segundo plano aunque se bloquee la pantalla */
    _restAv = -1;
    try{ jpBgTimer.programar(restTargetEnd); }catch(e){}
  }
  function pararRest(){ restRun = false; if(restInt){ restInt.stop(); } restInt = null; try{ window.jpWake.off('descanso'); }catch(eW){} pintarRest(); guardarRestTimer(); try{ jpBgTimer.cancelar(); }catch(e){} }
  /* pausa/reanuda el descanso activo sin cerrarlo -- misma lógica que ya
     tenía el toggle ▶/⏸ de la barra flotante, ahora nombrada aparte para
     que el widget in-situ de CrossFit (jpCfRestOnTick) pueda dispararla
     también vía window.CoachTV.toggle(). */
  function toggleRest(){
    restRun = !restRun;
    if(restRun){
      restTargetEnd = Date.now() + restLeft * 1000;
      if(!restInt){ restInt = jpTicker(tick, function(){ return restTargetEnd; }); restInt.start(); }
      try{ jpBgTimer.programar(restTargetEnd); }catch(e){}
      try{ window.jpWake.on('descanso'); }catch(eW){}
    }else{
      if(restInt){ restInt.stop(); } restInt = null;
      try{ jpBgTimer.cancelar(); }catch(e){}
      try{ window.jpWake.off('descanso'); }catch(eW){}
    }
    pintarRest();
    guardarRestTimer();
  }
  /* directiva10 -- resync forzado (Page Visibility API), llamado apenas la
     app vuelve a primer plano: recalcula restLeft contra restTargetEnd YA,
     sin esperar el próximo tick natural del setInterval (que en background
     puede haber quedado en pausa total, o -- según el navegador -- retomar
     recién en su próximo múltiplo de 1s real, con hasta 1s de demora extra
     además del tiempo que ya estuvo bloqueado). Si el descanso ya se
     cumplió mientras el celular estaba bloqueado, dispara la finalización
     (beep + vibración + cierre) en el acto, en vez de dejarlo "colgado". */
  function sincronizarRestActivo(){ if(restRun) tick(); }
  function cerrarRest(){ restActive = false; restJustFinished = false; pararRest(); hud.classList.remove('on'); }
  document.getElementById('rhX').addEventListener('click', cerrarRest);
  document.getElementById('rhSkip').addEventListener('click', cerrarRest);
  /* 10/09 -- toggle vista expandida: puramente visual (agrega/quita una
     clase), no interfiere con tick()/restRun/restInt. */
  const rhExpandBtn = document.getElementById('rhExpand');
  if(rhExpandBtn) rhExpandBtn.addEventListener('click', function(){
    const on = hud.classList.toggle('expanded');
    rhExpandBtn.setAttribute('aria-expanded', on ? 'true' : 'false');
  });
  function sumarRest(n){
    restLeft = Math.max(0, restLeft + n);
    if(restLeft > restTotal) restTotal = restLeft;
    /* directiva10 -- todo ajuste manual (+30s, y cualquier otro delta que
       llegue por acá, ej. window.CoachTV.sumar) redefine también la marca
       de tiempo absoluta, para que el próximo tick siga contando en base
       al reloj real y no arrastre el offset viejo. */
    restTargetEnd = Date.now() + restLeft * 1000;
    try{ if(navigator.vibrate) navigator.vibrate(20); }catch(e){}
    pintarRest();
    guardarRestTimer();
    try{ if(restRun) jpBgTimer.programar(restTargetEnd); }catch(e){}
  }
  document.getElementById('rhPlus').addEventListener('click', function(){ sumarRest(window.COACH_DISCIPLINA === 'sports' ? 10 : 15); });
  document.getElementById('rhToggle').addEventListener('click', toggleRest);
  /* directiva maestra ("Botonera rápida de ajuste en descanso") -- ajusta
     directo el input de kg de la PRÓXIMA serie (window.__jpRestKgInput,
     fijado al arrancar este mismo descanso) sin abrir el teclado
     numérico del celular; persiste con el mismo setLoadField() que ya
     usa la edición manual, así el valor sobrevive aunque el alumno
     cierre la app antes de tocar [ ✓ ]. */
  var rhKgAdjustPanel = document.getElementById('rhKgAdjust');
  if(rhKgAdjustPanel) rhKgAdjustPanel.addEventListener('click', function(e){
    var btn = e.target.closest('[data-kgdelta]'); if(!btn) return;
    var input = window.__jpRestKgInput;
    if(!input || !document.body.contains(input)) return;
    var delta = parseFloat(btn.dataset.kgdelta) || 0;
    var actual = parseFloat(input.value) || parseFloat(input.placeholder) || 0;
    var nuevo = Math.max(0, Math.round((actual + delta) * 2) / 2);
    input.value = nuevo;
    var row = input.closest('.jp-set-row-native');
    if(row && row.dataset.setKey) setLoadField(row.dataset.setKey, 'kg', nuevo);
    var valEl = document.getElementById('rhKgAdjustVal');
    if(valEl) valEl.textContent = nuevo + ' kg';
    try{ if(navigator.vibrate) navigator.vibrate(15); }catch(err){}
  });
  hud.querySelectorAll('[data-rest]').forEach(b => b.addEventListener('click', function(){
    state.restSec = parseInt(b.dataset.rest, 10);
    saveProgress();
    arrancarRest(state.restSec, 'Descanso');
  }));
  document.addEventListener('visibilitychange', function(){
    if(document.visibilityState === 'visible') sincronizarRestActivo();
  });
  window.addEventListener('pageshow', sincronizarRestActivo);
  window.addEventListener('focus', sincronizarRestActivo);

  /* restaura un descanso activo guardado en localStorage al cargar la
     página de cero (la pestaña se cerró/mató de verdad, no sólo se
     minimizó) -- reconstruye restTargetEnd desde el timestamp absoluto
     guardado y llama a tick() ya mismo: si el descanso se cumplió
     mientras la app estaba cerrada, dispara la finalización en el acto
     en vez de dejarlo "colgado" (mismo criterio que sincronizarRestActivo). */
  (function restaurarRestTimer(){
    try{
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const rt = raw.restTimer;
      if(!rt || !(rt.targetEnd > 0)) return;
      restTargetEnd = rt.targetEnd;
      restTotal = rt.total || 90;
      hudLb.textContent = rt.label || 'Descanso';
      hud.classList.add('on'); restRun = true; restActive = true;
      if(restInt){ restInt.stop(); } restInt = jpTicker(tick, function(){ return restTargetEnd; }); restInt.start();
      try{ window.jpWake.on('descanso'); }catch(eW){}
      tick();
      if(restRun) try{ jpBgTimer.programar(restTargetEnd); }catch(e){}
    }catch(e){}
  })();

  /* =========================================================
     2) NEW PR
  ========================================================= */
  function nombreDeFila(row){
    const blockEl = row.closest('.block');
    if(!blockEl) return '';
    const ex = blockEl.querySelector('.ex-name');
    const t = ex ? ex.childNodes[0] : null;
    return (t ? t.textContent : (blockEl.querySelector('.block-label')||{}).textContent || '').trim();
  }
  const _nrm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const PRS_N = (function(){ const o = {}; Object.keys(PRS).forEach(function(k){ o[_nrm(k)] = PRS[k]; }); return o; })();
  function prDe(nombre){
    const n = _nrm(nombre), l = _nrm(limpiarNombre(nombre));
    if(PRS_N[n] != null) return PRS_N[n];
    if(PRS_N[l] != null) return PRS_N[l];
    let best = 0;
    Object.keys(PRS_N).forEach(function(k){
      if(k.length < 4) return;
      if(n.indexOf(k) >= 0 || k.indexOf(n) >= 0 || l.indexOf(k) >= 0 || k.indexOf(l) >= 0)
        best = Math.max(best, parseFloat(PRS_N[k]) || 0);
    });
    return best;
  }
  function mejorPrevio(nombre, keyActual){
    let best = parseFloat(prDe(nombre)) || 0;
    Object.keys(state.loads).forEach(function(k){
      if(k === keyActual) return;
      const l = state.loads[k];
      if(!l || l.kg == null || l.__ex !== nombre) return;
      const v = parseFloat(l.kg);
      if(v > best) best = v;
    });
    return best;
  }
  function chequearPR(row){
    const kgIn = row.querySelector('.set-kg'); if(!kgIn) return false;
    const kg = parseFloat(kgIn.value); if(!(kg > 0)) return false;
    const key = row.dataset.setKey;
    const nombre = nombreDeFila(row);
    if(!nombre) return false;
    state.loads[key] = state.loads[key] || {};
    state.loads[key].__ex = nombre;
    const prev = mejorPrevio(nombre, key);
    const esPR = prev > 0 && kg > prev;
    row.classList.toggle('is-pr', esPR);
    let bd = row.querySelector('.pr-badge');
    if(esPR && !bd){
      bd = document.createElement('span'); bd.className = 'pr-badge';
      bd.textContent = '🔥 NEW PR';
      row.appendChild(bd);
      const blockEl = row.closest('.block');
      if(blockEl){
        blockEl.classList.add('has-pr');
        /* pulso una sola vez, en el instante del récord — no en cada repintado */
        blockEl.classList.add('block-pr-flash');
        setTimeout(function(){ blockEl.classList.remove('block-pr-flash'); }, 1100);
      }
      /* directiva ("Motor de Retroalimentación Háptica y Sonido Táctico")
         -- tono armónico ascendente + vibración de confirmación nuevos
         al registrar un PR. */
      try{ jpAudioTactical.soundPrRecord(); }catch(e){}
      try{ jpAudioTactical.vibratePrRecord(); }catch(e){}
      state.session.prs = state.session.prs || [];
      if(state.session.prs.indexOf(nombre) < 0) state.session.prs.push(nombre);
      saveProgress();
    } else if(!esPR && bd){ bd.remove(); }
    return esPR;
  }

  /* =========================================================
     2.1) MEMORIA DE CARGAS HISTÓRICAS
     Al tildar un set completado, indexa la carga por nombre de ejercicio
     (normalizado, mismo _nrm que ya usa el PR) en state.historialCargas
     -- independiente de semana/día/bloque, a diferencia de state.loads
     (atado a un set puntual). Sirve la sugerencia "Último: X kg" de
     renderSetRows(), reutilizando la MISMA fuente de verdad. */
  function registrarHistorial(row){
    const kgIn = row.querySelector('.set-kg'); if(!kgIn) return;
    const kg = parseFloat(kgIn.value); if(!(kg > 0)) return;
    const nombre = nombreDeFila(row); if(!nombre) return;
    const repsIn = row.querySelector('.set-reps');
    const reps = repsIn ? parseInt(repsIn.value, 10) : NaN;
    const hk = nrmHist(nombre); if(!hk) return;
    state.historialCargas[hk] = { nombre: nombre, kg: kg, reps: (reps > 0 ? reps : ''), ts: Date.now() };
  }

  /* =========================================================
     3) PIZARRA METCON / WOD
  ========================================================= */
  const FMT_RX = [
    { re:/amrap\s*(\d+)?/i, lb:'AMRAP', modo:'down' },
    { re:/emom\s*(\d+)?/i,  lb:'EMOM',  modo:'down' },
    { re:/every\s*(\d+):(\d+)/i, lb:'EVERY X:00', modo:'down' },
    { re:/rounds?\s*for\s*time|\bRFT\b/i, lb:'ROUNDS FOR TIME', modo:'up' },
    { re:/chipper/i, lb:'CHIPPER', modo:'up' },
    { re:/for\s*time/i, lb:'FOR TIME', modo:'up' },
    { re:/tabata/i, lb:'TABATA', modo:'down' },
    { re:/\be(\d+)\s*m?om\b/i, lb:'EMOM', modo:'down' },
    { re:/every\s*\d+(?:[.,]\d+)?\s*(?:min|minutos?|')/i, lb:'EVERY X:00', modo:'down' },
    { re:/death\s*by/i, lb:'DEATH BY', modo:'down' },
    { re:/\bladders?\b|escalera\s*(?:ascendente|descendente)/i, lb:'LADDER', modo:'up' },
    { re:/interval/i, lb:'INTERVALOS', modo:'down' }
  ];
  function primerFormato(txt){
    /* gana el formato que aparece primero en el texto real, no el orden de la tabla */
    let mejor = null, pos = 1e9;
    for(let i = 0; i < FMT_RX.length; i++){
      const m = String(txt || '').match(FMT_RX[i].re);
      if(m && m.index < pos){ pos = m.index; mejor = FMT_RX[i]; }
    }
    return mejor;
  }
  /* formato estructurado (block.boardFmt, seteado por el coach en el Builder) --
     si está presente gana sobre la inferencia por regex de abajo; si no, el
     comportamiento previo (formatoDe/primerFormato) sigue exactamente igual. */
  var CF_FMT_MAP = {
    fortime: { lb:'FOR TIME', modo:'up' },
    amrap:   { lb:'AMRAP',    modo:'down' },
    emom:    { lb:'EMOM',     modo:'down' },
    tabata:  { lb:'TABATA',   modo:'down' },
    chipper: { lb:'CHIPPER',  modo:'up' }
  };
  function formatoEstructurado(block){
    var k = String(block.boardFmt || '').toLowerCase().replace(/[^a-z]/g, '');
    return CF_FMT_MAP[k] || null;
  }
  var CF_SCORE_PH = {
    tiempo: 'Tiempo final (ej: 11:42)',
    rondas: 'Rondas + reps (ej: 6+12)',
    reps:   'Reps totales (ej: 143)',
    kg:     'Carga total (ej: 82.5 kg)',
    check:  '✓ Completado',
    notas:  'Cargas logradas / notas libres'
  };
  function formatoDe(block, lineas, weekIdx){
    /* el cuerpo del bloque manda: si dice EMOM, la tarjeta dice EMOM.
       El fallback (cuando el cuerpo de ESTA semana no trae ninguna palabra
       de formato -- ej. rotó a un superset de fuerza con notación B1/B2) usa
       la etiqueta YA resuelta para la semana actual, nunca el título estático
       congelado en la semana 1. El subtítulo estático sólo se suma a ese
       fallback si esta semana NO rotó (si rotó, el subtítulo describe el
       contenido de otra semana y arrastraría el mismo formato viejo) -- si
       nada matchea, se muestra el badge genérico "WOD" en vez de arrastrar
       un formato de otra semana */
    const base = block.title || '';
    const etiquetaWi = (block.weekName && weekIdx != null && block.weekName[weekIdx]) || base;
    const rotado = etiquetaWi !== base;
    const fallback = etiquetaWi + (rotado ? '' : ' ' + (block.subtitle || ''));
    return primerFormato(lineas.join(' ')) || primerFormato(fallback);
  }
  function minutosDe(block, lineas){
    if(block.cardioMinutes) return parseInt(block.cardioMinutes, 10) || 0;
    const m = ((block.subtitle||'') + ' ' + lineas.join(' ')).match(/(\d{1,2})\s*(?:min|minuto|')/i);
    return m ? parseInt(m[1], 10) : 0;
  }
  /* directiva ("Sprint 1: Timer contextual de WOD") -- traduce el formato
     que el parser de la Pizarra YA detecta (block.boardFmt / formatoDe(),
     más minutos/cap/intervalo del texto o de block.cfParam) en la
     configuración que entiende el HUD Timer (CoachWodTimer.configurar).
     Devuelve null si el bloque no declara un formato cronometrable (el
     botón entonces no se pinta): nunca inventa un timer para un bloque de
     fuerza sin formato. Sólo lee datos ya compilados, no toca el parser. */
  function jpWodTimerCfg(block, lineas, f){
    var kFmt = String(block.boardFmt || '').toLowerCase().replace(/[^a-z]/g, '');
    var lb = f ? String(f.lb || '') : '';
    var txt = lineas.join(' ') + ' ' + (block.title || '') + ' ' + (block.subtitle || '');
    var param = String(block.cfParam || '').trim();
    function seg(s){
      var m = String(s || '').match(/(\d+)\s*:\s*(\d+)/);
      if(m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
      var n = String(s || '').match(/(\d+)/);
      return n ? parseInt(n[1], 10) * 60 : 0;
    }
    var modo = '';
    if(kFmt === 'amrap' || /AMRAP/.test(lb)) modo = 'amrap';
    else if(kFmt === 'emom' || /EMOM|EVERY|DEATH/.test(lb)) modo = 'emom';
    else if(kFmt === 'tabata' || /TABATA/.test(lb)) modo = 'tabata';
    else if(kFmt === 'fortime' || kFmt === 'chipper' || /FOR TIME|CHIPPER|LADDER/.test(lb)) modo = 'fortime';
    else if(/INTERVALOS/.test(lb)) modo = 'intervalos';
    if(!modo) return null;
    var c = { modo: modo };
    if(modo === 'amrap'){
      var mA = txt.match(/amrap\s*(?:de\s*)?(\d+)/i) || txt.match(/(\d+)\s*(?:min|minutos|')\s*amrap/i);
      c.total = mA ? parseInt(mA[1], 10) : (param ? Math.round(seg(param) / 60) : minutosDe(block, lineas));
      if(!(c.total > 0)) c.total = 12;
    } else if(modo === 'emom'){
      var mE = txt.match(/every\s*(\d+)\s*:\s*(\d+)/i);
      var inter = mE ? parseInt(mE[1], 10) * 60 + parseInt(mE[2], 10) : 0;
      if(!inter){ var mE2 = txt.match(/every\s*(\d+(?:\.\d+)?)\s*(?:min|minutos|')/i); if(mE2) inter = Math.round(parseFloat(mE2[1]) * 60); }
      var mEn = txt.match(/\be(\d+)\s*m?om\b/i);          /* E2OM / E2MOM / E3MOM: el número es el intervalo en minutos */
      if(!inter && mEn) inter = parseInt(mEn[1], 10) * 60;
      if(!inter && param) inter = seg(param);
      /* "EMOM 16" con 16 cargado como parametro: es la duracion total, no un intervalo de 16 minutos */
      if(inter > 600 && /emom/i.test(txt)) inter = 60;
      if(!(inter >= 5)) inter = 60;
      var mR = txt.match(/\bx\s*(\d+)/i) || txt.match(/(\d+)\s*(?:sets?|rounds?|rondas?)\b/i);
      var mTot = txt.match(/emom\s*(?:de\s*)?(\d+)/i), mTotE = mEn ? txt.match(/\be\d+\s*m?om\s*(?:de\s*)?(\d+)/i) : null;
      c.intervalo = inter;
      var hayEvery = /\bevery\b/i.test(txt);
      c.rondas = (!hayEvery && mTot) ? parseInt(mTot[1], 10) : mR ? parseInt(mR[1], 10)
        : Math.max(1, Math.round(((mTot ? parseInt(mTot[1], 10) : (minutosDe(block, lineas) || 12)) * 60) / inter));
      /* "E2MOM 16 min" = 16 minutos en total, no 16 rondas: 8 rondas de 2:00 */
      if(mEn && mTotE && !/\bx\s*\d/i.test(txt)) c.rondas = Math.max(1, Math.round(parseInt(mTotE[1], 10) * 60 / inter));
      /* DEATH BY: cada minuto suma una repetición hasta fallar; el reloj queda en intervalos de 1:00 (20 como tope, el alumno corta cuando falla) */
      if(/death\s*by/i.test(txt)){ c.intervalo = 60; c.rondas = 20; }
    } else if(modo === 'fortime'){
      /* "Time Cap: 15:00", "cap 12", "cap de 20" y "Time cap - 9:30" (el ':' o el guion después de "cap" es el formato del botón Cap del Builder) */
      var mC = txt.match(/cap\s*(?:de\s*)?[:\-\u2013]?\s*(\d+)(?:\s*:\s*(\d+))?/i);
      c.cap = mC ? Math.round((parseInt(mC[1], 10) + (mC[2] ? parseInt(mC[2], 10) / 60 : 0)) * 10) / 10 : (param ? Math.round(seg(param) / 60) : 0);
    } else {
      var mW = txt.match(/(\d+)\s*s?\s*(?:on|work|trabajo)\b/i), mRs = txt.match(/(\d+)\s*s?\s*(?:off|rest|descanso)\b/i);
      var mRd = txt.match(/(\d+)\s*(?:rounds?|rondas?|sets?)\b/i);
      c.work = mW ? parseInt(mW[1], 10) : 20;
      c.rest = mRs ? parseInt(mRs[1], 10) : 10;
      c.rondas = mRd ? parseInt(mRd[1], 10) : 8;
    }
    return c;
  }
  window.jpWodTimerCfg = jpWodTimerCfg;
  function jpCfLimpiaPacing(h){
    return String(h || '').replace(/(^|<br\s*\/?>)\s*(?:[^A-Za-z0-9\u00c0-\u00ff<]{0,6}\s*pacing(?:\s+(?:general|sugerido))?\s*:\s*)+/gi, '$1').trim();
  }
  function jpCfSubLabels(h){
    return String(h || '').replace(/(^|<br\s*\/?>|\s)((?:[-\u2022*](?:\s|<br\s*\/?>)*)?(?:[^A-Za-z0-9\u00c0-\u00ff<\s\-\u2022*:]{1,6}(?:\s|<br\s*\/?>)*)?)([A-Z\u00c1\u00c9\u00cd\u00d3\u00da\u00d1][A-Z\u00c1\u00c9\u00cd\u00d3\u00da\u00d1 \/\-]{3,38}):\s+/g, function(m, pre, ico, lb){
      var ic = String(ico || '').replace(/<br\s*\/?>/gi, ' ').replace(/^[-\u2022*]\s*/, '').replace(/\s+$/, '');
      return '<span class="jp-cf-sub">' + (ic ? ic + ' ' : '') + lb.replace(/\s+$/, '') + ':</span>';
    }).replace(/^<span class="jp-cf-sub">/, '<span class="jp-cf-sub jp-cf-sub0">');
  }
  function jpCfPlano(h){ return String(h || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
  function jpCfParesCarga(txt){
    var re = /(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)\s*(kg|lb)/gi, out = [], seen = {}, m;
    while((m = re.exec(String(txt || '')))){ var k = m[1] + '/' + m[2] + ' ' + m[3].toLowerCase(); if(!seen[k]){ seen[k] = 1; out.push(k); } }
    return out;
  }
  /* [ AMRAP 20 MIN ] / [ 5 RONDAS FOR TIME ] / [ EMOM 16 MIN ] + time cap + pacing + chips de carga (Rx / Scaled) */
  function jpCfCabeceraWod(cfg, block, lineas, c){
    var txt = lineas.join(' ') + ' ' + (block.title || ''), fmt = '', cap = '';
    function mm(sg){ sg = Math.round(sg); return Math.floor(sg / 60) + ':' + ('0' + (sg % 60)).slice(-2); }
    if(cfg.modo === 'amrap') fmt = 'AMRAP ' + cfg.total + ' MIN';
    else if(cfg.modo === 'emom') fmt = /death\s*by/i.test(txt) ? 'DEATH BY · CADA 1:00' : (cfg.intervalo === 60 ? 'EMOM ' + Math.round(cfg.rondas) + ' MIN' : 'EVERY ' + mm(cfg.intervalo) + ' × ' + cfg.rondas);
    else if(cfg.modo === 'tabata') fmt = 'TABATA ' + cfg.rondas + ' RONDAS';
    else if(cfg.modo === 'fortime'){
      var mR = txt.match(/(\d+)\s*(?:rounds?|rondas?)\b/i), esq = txt.match(/\b(\d+(?:\s*-\s*\d+){1,})\b/);
      if(/chipper/i.test(txt)) fmt = 'CHIPPER';
      else if(/\bladders?\b/i.test(txt)) fmt = 'LADDER · FOR TIME';
      else if(mR) fmt = mR[1] + ' RONDAS FOR TIME';
      else if(esq) fmt = 'FOR TIME · ' + esq[1].replace(/\s+/g, '');
      else fmt = 'FOR TIME';
      if(cfg.cap > 0) cap = 'TIME CAP: ' + cfg.cap + ' MIN';
    } else fmt = 'INTERVALOS';
    var pac = jpCfPlano(c && c.pacing); if(pac.length > 78) pac = '';
    var rx = jpCfParesCarga(lineas.join(' ')), sc = jpCfParesCarga(jpCfPlano(c && c.escalado));
    /* una sola prescripcion: la de la categoria del alumno */
    var nvA = String((typeof PROGRAM_CONFIG !== 'undefined' && PROGRAM_CONFIG.cfNivel) || ''), esEsc = nvA === 'development' || nvA === 'advanced';
    var lbN = { development: 'Development', advanced: 'Advanced', rx: 'RX', elite: 'Elite' }[nvA] || 'Rx';
    var cargasN = rx.length ? rx : ((esEsc && sc.length) ? sc : []);
    var chips = cargasN.length ? '<span class="jp-cf-chip"><b>' + lbN + '</b> ' + escSB(cargasN.join(' · ')) + '</span>' : '';
    /* etiquetas de dinámica: partners, relación de descanso e híbrido tipo Hyrox (se leen del propio texto del bloque, no se inventan) */
    var txtT = lineas.join(' ') + ' ' + (block.title || '') + ' ' + (block.subtitle || ''), tags = [];
    if(/i\s*go\s*,?\s*you\s*go|\bigyg\b|yo\s*voy\s*,?\s*vos\s*vas/i.test(txtT)) tags.push('I GO · YOU GO');
    else if(/sincroniz|synchro/i.test(txtT)) tags.push('PARTNERS · SINCRONIZADO');
    else if(/\bpartners?\b|en\s*parejas|\bpairs?\b/i.test(txtT)) tags.push('PARTNERS');
    var rrT = /rest\s*(\d)\s*:\s*(\d)(?!\d)/i.exec(txtT);
    if(rrT) tags.push('DESCANSO ' + rrT[1] + ':' + rrT[2] + ' · TRABAJO:DESCANSO');
    var estT = ['hyrox', 'skierg', 'ski erg', 'sled', 'farmer', 'sandbag', 'wall ball', 'rowerg', 'burpee broad'].filter(function(k){ return txtT.toLowerCase().indexOf(k) >= 0; }).length;
    if(estT >= 2) tags.push('HYBRID · ESTACIONES');
    chips += tags.map(function(t){ return '<span class="jp-cf-chip jp-cf-dyn">' + escSB(t) + '</span>'; }).join('');
    return '<div class="jp-cf-fmtbadge">[ ' + escSB(fmt) + ' ]</div>' +
      ((cap || pac) ? '<div class="jp-cf-capline">' + (cap ? '<span class="cap">' + cap + '</span>' : '') + (pac ? '<span class="pac">🎯 PACING: ' + escSB(pac) + '</span>' : '') + '</div>' : '') +
      (chips ? '<div class="jp-cf-chips">' + chips + '</div>' : '');
  }
  /* ============================================================
     FORMATOS CONTINUOS (EMOM / AMRAP / FOR TIME / min continuo)
     Una linea que trae varios "Min N:" (o "/" entre estaciones) NUNCA se parte con split por "/" ni por comas: se corta
     solo donde empieza cada "Min N:" y cada estacion se muestra COMPLETA en su propio renglon. La pildora superior lleva
     solo la estructura clave: [ EMOM 14 MIN | 4 INTERVALOS | REST PLANIFICADO ].
     ============================================================ */
  var RX_CONT_SB = /\b(?:emom|e\d+mom|amrap|for\s*time|min(?:ute|uto)?s?\s*continu\w*)\b/i;
  var RX_MIN_LINEA_SB = /^\s*[-\u2022*]?\s*min(?:ute|uto)?s?\s*\d+/i;
  var RX_MARCA_MIN_SB = /(?:^|[\s\/;.,])(?=min(?:ute|uto)?s?\s*\d+(?:\s*[-\u2013]\s*\d+)?\s*[:.\-\u2013\u2014)])/gi;
  function jpExplotarContinuo(lineas){
    var out = [];
    (lineas || []).forEach(function(l){
      var t = String(l == null ? '' : l), cortes = [], m;
      RX_MARCA_MIN_SB.lastIndex = 0;
      while((m = RX_MARCA_MIN_SB.exec(t))){
        var c = m.index + m[0].length;
        if(c > 0 && cortes.indexOf(c) < 0) cortes.push(c);
        if(m[0] === '') RX_MARCA_MIN_SB.lastIndex++;
      }
      var piezas = [], ult = 0;
      cortes.forEach(function(c){ piezas.push(t.slice(ult, c)); ult = c; });
      piezas.push(t.slice(ult));
      piezas.forEach(function(p){
        p.split(/\.\s+(?=repet\w*\b|repite\b)/i).forEach(function(q){
          q = q.replace(/[\s\/;,]+$/, '').trim();
          if(q) out.push(q);
        });
      });
    });
    return out;
  }
  function jpContinuoInfo(block, lineas, relajado){
    var ex = jpExplotarContinuo(lineas);
    var minL = ex.filter(function(l){ return RX_MIN_LINEA_SB.test(l); });
    /* relajado (Sports): un bloque de Metcon/cardio con AMRAP/EMOM/FOR TIME y SIN lineas de series "NxM" tambien es continuo aunque no traiga "Min N:" */
    var contSinMin = !!relajado && /^(?:metcon|cardio|endurance)$/.test(String(block.category || '')) && !ex.some(function(l){ return /\d+\s*x\s*\d/i.test(l); });
    if(minL.length < 2 && !contSinMin) return null;
    var iCab = -1;
    for(var i = 0; i < ex.length; i++){ if(RX_CONT_SB.test(ex[i]) && !RX_MIN_LINEA_SB.test(ex[i])){ iCab = i; break; } }
    var cabTxt = iCab >= 0 ? ex[iCab] : '';
    var cab = cabTxt + ' ' + (block.title || '') + ' ' + (block.boardFmt || '');
    var mF = cab.match(RX_CONT_SB);
    if(!mF) return null;
    var fmt = mF[0].toUpperCase().replace(/\s+/g, ' ');
    if(/CONTINU/.test(fmt)) fmt = 'MIN CONTINUO';
    var mins = 0, mM = cabTxt.match(/(?:emom|e\d+mom|amrap)\s*(?:de\s*)?(\d+)/i) || cabTxt.match(/(\d+)\s*(?:min\w*|')/i);
    if(mM && !/FOR TIME/.test(fmt)) mins = parseInt(mM[1], 10);
    var cap = 0, mC = cab.match(/cap\s*(?:de\s*)?(\d+)/i);
    if(mC) cap = parseInt(mC[1], 10);
    var maxMin = 0;
    minL.forEach(function(l){ var n = parseInt((l.match(/\d+/) || [0])[0], 10); if(n > maxMin) maxMin = n; });
    var mI = cab.match(/(\d+)\s*intervalos?/i);
    var inter = mI ? parseInt(mI[1], 10) : maxMin;
    var rest = /descanso|\brest\b/i.test(ex.join(' '));
    var detalle = ex.filter(function(l, k){ return k !== iCab; });
    var resto = cabTxt.replace(RX_CONT_SB, ' ').replace(/\d+\s*(?:min\w*|')/ig, ' ').replace(/\(?\s*\d+\s*intervalos?\s*\)?/ig, ' ').replace(/[:()\-\u2013\u2014]/g, ' ').replace(/\s+/g, ' ').trim();
    if(resto.length >= 6) detalle.unshift(resto);
    return { lineas: ex, fmt: fmt, mins: mins, cap: cap, inter: inter, rest: rest, detalle: detalle, etiqueta: fmt + (mins ? ' ' + mins + ' MIN' : '') };
  }
  function jpCfgContinuo(c){
    if(!c) return null;
    if(/^E?\d*MOM$|EMOM/.test(c.fmt)) return { modo: 'emom', intervalo: 60, rondas: c.mins || c.inter || 12 };
    if(/AMRAP/.test(c.fmt)) return { modo: 'amrap', total: c.mins || 12 };
    if(/FOR TIME/.test(c.fmt)) return { modo: 'fortime', cap: c.cap || 0 };
    return null;
  }
  function jpContinuoPillHtml(c){
    var seg = ['<span class="jp-db-seg jp-db-vol">\u23f1 ' + escSB(c.etiqueta) + '</span>'];
    if(c.inter) seg.push('<span class="jp-db-seg jp-db-tempo">' + c.inter + ' INTERVALOS</span>');
    if(c.rest) seg.push('<span class="jp-db-seg jp-db-rest">REST PLANIFICADO</span>');
    return '<div class="jp-dose-bar jp-cont-pill"><span class="jp-db-br">[</span>' + seg.join('<span class="jp-db-sep">|</span>') + '<span class="jp-db-br">]</span></div>';
  }
  function jpContinuoListaHtml(c){
    return '<ul class="jp-cont-lista">' + c.detalle.map(function(l){
      var m = String(l).match(/^\s*[-\u2022*]?\s*(min(?:ute|uto)?s?\s*\d+(?:\s*[-\u2013]\s*\d+)?)\s*[:.\-\u2013\u2014)]*\s*(.*)$/i);
      return '<li>' + (m ? '<b>' + escSB(m[1].charAt(0).toUpperCase() + m[1].slice(1)) + ':</b> ' + escSB(m[2]) : escSB(l)) + '</li>';
    }).join('\n') + '</ul>';
  }
  /* Sports: las estaciones de un bloque cronometrado (AMRAP / EMOM / For Time) con la MISMA fila que el resto de los circuitos: número (o minuto), nombre corto, cantidad en su pastilla y la aclaración en su línea;
     la consigna ("las tres estaciones en orden...", descansos) va en una banda aparte. CrossFit sigue usando jpContinuoListaHtml. */
  function jpEsBandaSB(l){
    return jpEsConsignaSB(l) || /^\s*(?:rest|descanso)\b/i.test(l) || (!/^\s*[-\u2022*]/.test(l) && !/^\s*min(?:ute|uto)?s?\s*\d/i.test(l) && !jpPartirEstacionSB(l) && String(l).trim().length > 48);
  }
  function jpFilaEstacionHtml(idTxt, nm, qty, nota){
    return '<div class="jp-sb-plain jp-sb-plain-est"><span class="jp-sb-ex-id">' + escSB(idTxt) + '</span><span class="jp-sb-plain-nombre">' + escSB(nm) + '</span>' +
      (qty ? '<span class="jp-sb-plain-pill">' + escSB(qty) + '</span>' : '') + (nota ? '<div class="jp-sb-nota">' + escSB(nota) + '</div>' : '') + '</div>';
  }
  function jpContinuoEstacionesSB(c){
    var n = 0;
    return c.detalle.map(function(l0){
      var l = String(l0 == null ? '' : l0).trim();
      if(!l.replace(/^[\s\-\u2013\u2014\u2022*]+/, '')) return '';      /* una viñeta suelta ("-") que deja el corte por minutos no es una estación */
      if(jpEsBandaSB(l)) return '<div class="jp-sb-plain jp-sb-plain-fmt"><span class="jp-sb-fmt-ic" aria-hidden="true">⏱</span><span class="jp-sb-plain-nombre">' + escSB(l.replace(/^[\s\-–—•*]+/, '')) + '</span></div>';
      var mMin = l.match(/^\s*[-•*]?\s*min(?:ute|uto)?s?\s*(\d+(?:\s*[-–]\s*\d+)?)\s*[:.\-–—)]*\s*(.*)$/i);
      var idTxt = mMin ? 'M' + mMin[1].replace(/\s+/g, '') : jpIdx2(++n);
      var txt = jpLimpiarNombreEstacionSB(mMin ? mMin[2] : l), est = jpPartirEstacionSB(txt);
      return jpFilaEstacionHtml(idTxt, est ? est.nm : txt, est ? est.qty : '', est ? est.nota : '');
    }).join('');
  }
  function jpContinuoSportsHtml(c, block, weekIdx, dayId){
    var skey = weekIdx + '|' + dayId + '|' + block.id;
    var nk = function(k){ return skey + '|__cont_' + k; };
    var val = function(k){ return escSB((state.notes && state.notes[nk(k)]) || ''); };
    var nivel = (state.notes && state.notes[nk('nivel')]) || '';
    var tcfg = jpCfgContinuo(c);
    return jpContinuoPillHtml(c) + jpContinuoEstacionesSB(c) +
      (tcfg ? '<button type="button" class="jp-cf-wodtimer jp-cont-timer" data-wodcfg="' + encodeURIComponent(JSON.stringify(tcfg)) + '">\u23f1 INICIAR TIMER ' + escSB(c.etiqueta) + '</button>' : '') +
      '<div class="jp-cont-reg"><div class="jp-cont-reg-lb">[ REGISTRO DEL WOD ]</div>' +
        '<label class="jp-cont-f"><span>CARGA UTILIZADA</span><input type="text" class="jp-cont-in" data-nkey="' + nk('carga') + '" placeholder="Ej: KB 16 kg / 20 kg" value="' + val('carga') + '"></label>' +
        '<label class="jp-cont-f"><span>SCORE / RONDAS</span><input type="text" class="jp-cont-in" data-nkey="' + nk('score') + '" placeholder="Ej: 4 rondas + 6 reps" value="' + val('score') + '"></label>' +
        '<div class="jp-cont-rx"><button type="button" data-contrx="RX" data-nkey="' + nk('nivel') + '" class="' + (nivel === 'RX' ? 'on' : '') + '">COMPLETADO RX</button><button type="button" data-contrx="SCALED" data-nkey="' + nk('nivel') + '" class="' + (nivel === 'SCALED' ? 'on' : '') + '">SCALED</button></div>' +
        '<label class="jp-cont-f"><span>NOTAS DEL WOD</span><input type="text" class="jp-cont-in" data-nkey="' + nk('notas') + '" placeholder="Sensaciones, escalados, pausas..." value="' + val('notas') + '"></label>' +
      '</div>';
  }
  document.addEventListener('input', function(e){
    var i = e.target && e.target.closest ? e.target.closest('.jp-cont-in') : null;
    if(!i) return;
    state.notes = state.notes || {};
    state.notes[i.dataset.nkey] = i.value;
    saveProgress();
  });
  document.addEventListener('click', function(e){
    var b = e.target && e.target.closest ? e.target.closest('[data-contrx]') : null;
    if(!b) return;
    var v = b.getAttribute('data-contrx'), k = b.dataset.nkey;
    state.notes = state.notes || {};
    state.notes[k] = state.notes[k] === v ? '' : v;
    Array.prototype.forEach.call(b.parentNode.querySelectorAll('[data-contrx]'), function(x){ x.classList.toggle('on', x.getAttribute('data-contrx') === state.notes[k]); });
    saveProgress();
  });
  function tituloBloqueHtmlSB(t){
    var m = String(t || '').match(/^([^:]{3,45}):\s*(\S.*)$/);
    if(!m) return '<div class="jp-sb-title">' + escSB(t) + '</div>';
    return '<div class="jp-sb-title jp-sb-title-split"><span class="jp-sb-title-pre">' + escSB(m[1]) + ':</span> <span class="jp-sb-title-main">' + escSB(m[2]) + '</span></div>';
  }
  function rxIntervaloSB(en){
    var nombres = String(en.titulo || '').split(/\s*\+\s*/), reps = String(en.reps || '').split('+');
    var txt = (en.reps && reps.length === nombres.length)
      ? nombres.map(function(n, i){ return reps[i] + ' ' + n; }).join(' + ')
      : ((en.reps ? en.reps + ' ' : '') + en.titulo);
    return txt + (en.carga ? ' @ ' + en.carga : '');
  }
  /* ============================================================
     REGISTRO DE 1 TOQUE · una sola tarjeta por ejercicio, sin hoja modal y sin elegir "por bloque / por serie"
     - KG × REPS ya vienen cargados: lo que hiciste la semana pasada (o la progresión que sugiere la app).
     - Si mantuviste la marca, un toque en ✓ guarda el ejercicio: la app aplica el dato a la serie efectiva (top set) y deja
       las demás series hechas; aclimatación y back-off no reciben kilos inventados. Nunca hay modales.
     - Si cambiás algo, tocás el casillero, lo corregís y ✓ guarda lo nuevo.
     - Si el ejercicio lleva técnica avanzada (Myo-Reps / Drop-Set / Rest-Pause), las series normales se guardan con ✓ y
       recién ahí aparece la SERIE FINAL con su fase; sin párrafos de teoría en pantalla.
     Escribe en state.loads con la MISMA clave que siempre (getLoadKey): tonelaje, reporte y Story lo leen igual.
     ============================================================ */
  var QR_CFG = {};
  var QR_TEC_NOM = { myoreps: 'MYO-REPS', dropset: 'DROP-SET', restpause: 'REST-PAUSE' };
  function regLetra(c, i){
    var x = c.ex[i], m = String(x.nombre || '').match(/^([A-Fa-f])(\d{1,2})[.):\-]\s*/);
    if(m) return m[1].toUpperCase() + m[2];
    if(x.grp){
      var idx = 0, k; for(k = 0; k < i; k++){ if(c.ex[k].grp === x.grp) idx++; }
      return String.fromCharCode(65 + ((parseInt(String(x.grp).replace(/\D/g, ''), 10) || 0) % 6)) + (idx + 1);
    }
    return 'E' + (i + 1);
  }
  function regNombreCorto(n){ return String(n || '').replace(/^[A-Fa-f]\d{1,2}[.):\-]\s*/, '').replace(/\s*\([^)]*\)\s*$/, '').trim(); }
  function regEtq(e, i){ return (e.et && e.et[i - 1]) ? String(e.et[i - 1]) : ''; }
  /* series a las que se aplica lo cargado: las marcadas "Top Set"; si no hay, el último tramo de una pirámide; si no, todas menos aclimatación */
  function regSetsTop(e){
    var out = [], i;
    for(i = 1; i <= e.sets; i++){ if(/top/i.test(regEtq(e, i))) out.push(i); }
    if(out.length) return out;
    if(e.rp && e.rp.length > 1){
      var ult = String(e.rp[e.rp.length - 1]);
      for(i = e.rp.length; i >= 1 && String(e.rp[i - 1]) === ult; i--) out.unshift(i);
      if(out.length && out.length < e.sets) return out;
      out = [];
    }
    for(i = 1; i <= e.sets; i++){ if(!/aclimat|warm|calent|aproxim/i.test(regEtq(e, i))) out.push(i); }
    if(out.length) return out;
    for(i = 1; i <= e.sets; i++) out.push(i);
    return out;
  }
  /* referencia de una serie: la Semana 1 manda (base estricta de la progresión); si esa serie no tiene dato en la Semana 1, la semana anterior más cercana que lo tenga.
     Una serie desmarcada a propósito (done === false) no cuenta como marca. */
  function regUltRegKey(c, e, keyIdx){
    var orden = [], pw;
    if(c.w > 0) orden.push(0);
    for(pw = c.w - 1; pw >= 1; pw--) orden.push(pw);
    for(var q = 0; q < orden.length; q++){
      var lq = getLoad(getLoadKey(orden[q], c.d, c.b, e.idx, keyIdx));
      if(lq && lq.done !== false && ((lq.kg != null && lq.kg !== '') || (lq.reps != null && lq.reps !== ''))) return { w: orden[q], kg: lq.kg, reps: lq.reps };
    }
    /* sin registro en la misma posición (bloque regenerado, ejercicios reordenados, plantilla reasignada): se busca por el NOMBRE del ejercicio */
    try{
      if(typeof window.jpRegistroPrevio === 'function'){
        var rp = window.jpRegistroPrevio(c, e, keyIdx);
        if(rp && rp.ref) return { w: rp.w, kg: rp.ref.kg, reps: rp.ref.reps > 0 ? rp.ref.reps : '' };
      }
    }catch(eN){}
    return null;
  }
  function regUltReg(c, e, set){ return regUltRegKey(c, e, set + (e.ko || 0)); }
  function qrTec(e){ return (e && QR_TEC_NOM[e.tec] && e.sets > 1) ? e.tec : ''; }
  function qrKey(cfg){ return cfg.w + '|' + cfg.d + '|' + cfg.b; }
  function qrNum(v){ var n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; }
  function qrRango(txt){ var m = /(\d+)\s*[-–]\s*(\d+)/.exec(String(txt || '')); return m ? { min: +m[1], max: +m[2] } : null; }
  function qrSetsBase(e){ return qrTec(e) ? e.sets - 1 : e.sets; }
  /* clave de la serie i (1..n) y de la serie con técnica: en los simples con Drop-Set / Myo-Reps las normales van desplazadas (e.ko) y la técnica en la posición 1 */
  function qrClave(c, e, i){ return getLoadKey(c.w, c.d, c.b, e.idx, i + (e.ko || 0)); }
  function qrClaveFinal(c, e){ return getLoadKey(c.w, c.d, c.b, e.idx, e.ko ? 1 : e.sets); }
  /* ---- registro serie por serie ----
     Cada serie efectiva tiene su propia fila (SERIE 1, 2, 3...) con su KG × REPS y su ✓, guardada con la MISMA clave de siempre (getLoadKey):
     el tonelaje, el reporte, el historial y la Story la leen igual. Las series que el alumno agrega por encima de lo prescripto usan las
     claves que siguen a las del ejercicio (nunca pisan la serie con técnica). */
  var QR_EXTRA = {};
  function qrExtraKey(c, i){ return qrKey(c) + '|' + i; }
  function qrIdxClave(e, j){ var nb = qrSetsBase(e); return j <= nb ? j + (e.ko || 0) : e.sets + (j - nb); }
  function qrClaveSerie(c, e, j){ return getLoadKey(c.w, c.d, c.b, e.idx, qrIdxClave(e, j)); }
  function qrConDato(ld){ return !!(ld && ((ld.kg != null && ld.kg !== '') || (ld.reps != null && ld.reps !== '') || ld.done)); }
  /* cuántas filas se muestran: las prescriptas + las agregadas (las que ya tienen dato guardado siguen apareciendo después de una recarga) */
  function qrTotalSeries(c, e, i){
    var nb = Math.max(1, qrSetsBase(e)), n = nb, extra = QR_EXTRA[qrExtraKey(c, i)] || 0, j;
    for(j = nb + 1; j <= nb + 12; j++){ if(qrConDato(getLoad(qrClaveSerie(c, e, j)))) n = j; }
    return Math.min(nb + 12, Math.max(n, nb + extra));
  }
  function qrFila(c, e, j, nb, sinKg, prev){
    var key = qrClaveSerie(c, e, j), ld = getLoad(key), kx = qrIdxClave(e, j);
    var f = { j: j, key: key, done: !!ld.done, kg: '', rp: '', pre: false, extra: j > nb, rpPh: '—' };
    var presc = (j <= nb && e.rp && e.rp[j - 1] != null) ? e.rp[j - 1] : e.reps, nr = String(presc || '').match(/^[0-9]+/);
    if(nr) f.rpPh = nr[0];
    if((ld.kg != null && ld.kg !== '') || (ld.reps != null && ld.reps !== '')){
      f.kg = ld.kg != null ? String(ld.kg) : ''; f.rp = ld.reps != null ? String(ld.reps) : '';
      return f;
    }
    var ult = regUltRegKey(c, e, kx), sug = null, rr = qrRango(presc);
    if(!sinKg){
      try{ if(typeof window.jpSugerirCarga === 'function') sug = window.jpSugerirCarga(c, e, kx); }catch(eS){}
      if(sug && sug.kg > 0){ f.kg = String(Math.round(sug.kg * 100) / 100); f.pre = true; }
      else if(ult && ult.kg != null && ult.kg !== ''){ f.kg = String(ult.kg); f.pre = true; }
      else if(prev && prev.kg){ f.kg = prev.kg; f.pre = true; }
      else if(e.carga){
        var pm = String(e.carga).match(/^\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:kgs?)?\s*$/i);
        if(pm){ f.kg = pm[1].replace(',', '.'); f.pre = true; }
      }
    }
    if(ult && ult.reps != null && ult.reps !== ''){
      /* si la progresión sube el peso (llegaste al tope del rango), las reps arrancan de nuevo desde el mínimo */
      var sube = !!(sug && sug.origen === 'progresion' && ult.kg != null && qrNum(f.kg) > qrNum(ult.kg));
      f.rp = (sube && rr) ? String(rr.min) : String(ult.reps); f.pre = true;
    }
    return f;
  }
  function qrTxtSerie(kg, reps, sinKg){
    return [kg != null && kg !== '' && !sinKg ? kg + ' kg' : '', reps != null && reps !== '' ? '× ' + reps : ''].filter(Boolean).join(' ');
  }
  /* todo lo que la tarjeta necesita saber de un ejercicio (estado guardado + valores sugeridos) */
  function qrModelo(c, e, i){
    var nsMax = qrSetsBase(e), tec = qrTec(e);
    var tops = regSetsTop(e).filter(function(x){ return x <= nsMax; });
    if(!tops.length) tops = [nsMax];
    var ref = tops[tops.length - 1], ld = getLoad(qrClave(c, e, ref));
    var modoR = (typeof window.jpModoInput === 'function') ? window.jpModoInput(e.nombre) : '';
    var sinKg = (modoR === 'banda' || modoR === 'tiempo' || modoR === 'solo' || (modoR === 'bw' && !(parseFloat(ld.kg) > 0)));
    var hechas = 0, s;
    for(s = 1; s <= nsMax; s++){ if(getLoad(qrClave(c, e, s)).done) hechas++; }
    var baseOk = hechas >= nsMax, fld = tec ? getLoad(qrClaveFinal(c, e)) : {}, finOk = tec ? !!fld.done : true;
    var repsRef = (e.rp && e.rp[ref - 1] != null) ? e.rp[ref - 1] : e.reps, nr = String(repsRef || '').match(/^[0-9]+/);
    var ult = regUltReg(c, e, ref), hint = '', sug = null;
    var base = ult ? 'Sem ' + (ult.w + 1) + ': ' + [ult.kg !== '' && ult.kg != null ? ult.kg + ' kg' : '', ult.reps !== '' && ult.reps != null ? '× ' + ult.reps : ''].filter(Boolean).join(' ') : '';
    var guardado = (ld.kg != null && ld.kg !== '') || (ld.reps != null && ld.reps !== '');
    if(guardado) hint = base;
    else {
      try{ if(!sinKg && typeof window.jpSugerirCarga === 'function') sug = window.jpSugerirCarga(c, e, ref + (e.ko || 0)); }catch(eS){}
      var kgS = sug && sug.kg > 0 ? String(Math.round(sug.kg * 100) / 100) : '';
      if(sug && sug.origen === 'progresion' && ult && qrNum(kgS) > qrNum(ult.kg)) hint = '↑ Subí a ' + kgS + ' kg · ' + base;
      else if(sug && sug.origen === 'progresion' && base) hint = 'Mantené el peso · ' + base;
      else if(sug && sug.origen === 'descarga') hint = 'Descarga · ' + base;
      else if(sug && sug.origen === 'real') hint = 'Según tu marca · ' + kgS + ' kg';
      else if(sug && sug.origen === 'coach') hint = 'Carga pautada';
      else hint = base || (e.rir ? 'Elegí un peso para RIR ' + e.rir : '');
    }
    var nt = qrTotalSeries(c, e, i), nd = 0, filas = [], prev = null, mejor = null, j;
    for(j = 1; j <= nt; j++){
      var f = qrFila(c, e, j, nsMax, sinKg, prev); filas.push(f); prev = f;
      if(f.done){
        nd++;
        /* la serie que representa al ejercicio en la pastilla: la de más kilos (o, sin peso, la de más repeticiones) */
        var kgN = qrNum(f.kg), rpN = qrNum(f.rp);
        if(!mejor || kgN > mejor.kgN || (kgN === mejor.kgN && rpN > mejor.rpN)) mejor = { kgN: kgN, rpN: rpN, kg: f.kg, rp: f.rp };
      }
    }
    var conFinal = !!(tec && !e.ko);                              /* la serie final con técnica cuenta como una serie más del ejercicio */
    var saved = mejor ? qrTxtSerie(mejor.kg, mejor.rp, sinKg) + ((baseOk && finOk) ? '' : ' · ' + (nd + (conFinal && finOk ? 1 : 0)) + '/' + (nt + (conFinal ? 1 : 0))) : '';
    /* serie final con técnica: valores propios (Drop-Set arranca sin kilos; Myo-Reps y Rest-Pause, con los de la última serie normal) */
    var ult1 = filas[Math.max(0, nsMax - 1)] || {}, fin = null;
    if(tec && !e.ko){
      var fg = (fld.kg != null && fld.kg !== '') || (fld.reps != null && fld.reps !== '');
      fin = { done: finOk, kg: fg ? String(fld.kg != null ? fld.kg : '') : (tec === 'dropset' ? '' : (ult1.kg || '')), rp: fg ? String(fld.reps != null ? fld.reps : '') : '', pre: !fg && tec !== 'dropset' && !!ult1.kg, key: qrClaveFinal(c, e) };
    }
    var quitable = (QR_EXTRA[qrExtraKey(c, i)] || 0) > 0 && nt > Math.max(1, nsMax) && !qrConDato(getLoad(qrClaveSerie(c, e, nt)));
    return { ref: base ? base.replace(': ', ' · ') : '', saved: saved, tec: tec, nsMax: nsMax, ns: nsMax, nt: nt, nd: nd, filas: filas, fin: fin, quitable: quitable, sinKg: sinKg, modoR: modoR, hint: hint, kgPh: '—', rpPh: nr ? nr[0] : '—', baseOk: baseOk, finOk: finOk, todoOk: baseOk && finOk };
  }
  var QR_LBL = {};
  function qrPlano(s){ return String(s || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(); }
  function qrCorta(s, n){
    s = qrPlano(s); if(s.length <= n) return s;
    var cut = s.slice(0, n), sp = cut.lastIndexOf(' ');
    return (sp > 40 ? cut.slice(0, sp) : cut).replace(/[,;:\s]+$/, '') + '…';
  }
  /* línea guía del panel: la pauta del coach para ESE ejercicio (cue eficiente) y, si no hay, la primera frase del objetivo del bloque */
  function qrGuia(c, e, i){
    var tips = String(c.tp || '').split(/\n+|<br\s*\/?>/i).map(qrPlano).filter(Boolean), L = regLetra(c, i), nom = regNombreCorto(e.nombre).toLowerCase(), hit = '', kind = 'PAUTA';
    tips.some(function(l){ var mm = /^([A-F]\d)\s*·\s*CUE EFICIENTE\s*:\s*(.+)$/i.exec(l); if(mm && mm[1].toUpperCase() === L){ hit = mm[2]; return true; } return false; });
    if(!hit && nom) tips.some(function(l){
      var mm = /^([^:]{3,60}):\s*(.+)$/.exec(l), et = mm ? mm[1].toLowerCase() : '';
      if(mm && !/^(set-up|cue eficiente|cuidado|tempo|ramp-up|nota|transici|progresi|[a-f]\d\s*·)/.test(et) && (et.indexOf(nom) >= 0 || nom.indexOf(et) >= 0)){ hit = mm[2]; return true; }
      return false;
    });
    if(!hit && c.ex.length === 1) tips.some(function(l){ var mm = /^CUE EFICIENTE\s*:\s*(.+)$/i.exec(l); if(mm){ hit = mm[1]; return true; } return false; });
    if(!hit){ var o = qrPlano(c.obj); if(o){ hit = o.split(/[.:]\s/)[0]; kind = 'OBJETIVO'; } }
    return { k: kind, t: qrCorta(hit, 130) };
  }
  /* RIR del ejercicio: lo marca el alumno al terminar; la doble progresión de la semana siguiente solo sube la carga si hubo reservas (RIR 1 o más) */
  function qrRirKey(c, e){ return c.w + '|' + c.d + '|' + c.b + '|' + e.idx; }
  function qrRirHtml(c, e, m){
    var sel = (state.rirEx || {})[qrRirKey(c, e)];
    return '<div class="jp-qc-rir" role="group" aria-label="RIR del ejercicio (repeticiones que te sobraron)"><span class="jp-qc-rir-lb">RIR</span>' +
      [0, 1, 2, 3].map(function(n){ return '<button type="button" class="jp-qc-rirb' + (sel === n ? ' on' : '') + '" data-rirx="' + n + '" aria-pressed="' + (sel === n ? 'true' : 'false') + '">' + (n === 3 ? '3+' : n) + '</button>'; }).join('') +
      '<span class="jp-qc-rir-h">reps que te sobraron</span></div>';
  }
  /* COACHING TIPS del ejercicio (Set-up · Ejecución · Cuidado): salen de las pautas del bloque; en un biset / triset, solo las líneas de ESTE ejercicio (A1 · ..., A2 · ...) */
  function qrTipsHtml(c, e, i){
    var lineas = String(c.tp || '').split(/\n+|<br\s*\/?>/i).map(qrPlano).filter(Boolean);
    var L = regLetra(c, i), multi = c.ex && c.ex.length > 1;
    var G = { su: '', ej: '', cu: '' };
    lineas.forEach(function(l){
      var m = /^(?:([A-F]\d)\s*\u00b7\s*)?([^:]{2,40}):\s*(.+)$/.exec(l); if(!m) return;
      if(multi && (!m[1] || m[1].toUpperCase() !== L)) return;
      var et = m[2].toUpperCase();
      if(/^SET-?UP/.test(et)){ if(!G.su) G.su = m[3]; }
      else if(/^(CUE|CLAVE|EJECUCI|CONTROL|RITMO)/.test(et)){ if(!G.ej) G.ej = m[3]; }
      else if(/^(CUIDADO|ERROR|PRECAUCI)/.test(et)){ if(!G.cu) G.cu = m[3]; }
    });
    if(!G.su && !G.ej && !G.cu) return '';
    var fila = function(cls, lb, txt){ return txt ? '<div class="jp-ex-tip ' + cls + '"><b>' + lb + '</b><span>' + escSB(qrCorta(txt, 190)) + '</span></div>' : ''; };
    return '<details class="jp-ex-tips"><summary><span class="jp-ex-tips-t">COACHING TIPS</span><span class="jp-ex-tips-s">Set-up \u00b7 Ejecuci\u00f3n \u00b7 Cuidado</span></summary><div class="jp-ex-tips-b">' +
      fila('su', 'SET-UP', G.su) + fila('ej', 'EJECUCI\u00d3N', G.ej) + fila('cu', 'CUIDADO', G.cu) + '</div></details>';
  }
  /* plan de cargas semana a semana con el peso real que el alumno ya registró (ver jpPlanCargas en 087-1): solo aparece si ese ejercicio ya tiene un registro */
  function qrPlanHtml(c, e){
    var pl = null; try{ pl = typeof window.jpPlanCargas === 'function' ? window.jpPlanCargas(c, e) : null; }catch(eP){}
    if(!pl || !pl.semanas || !pl.semanas.length) return '';
    var fmt = function(n){ return String(Math.round(n * 100) / 100).replace('.', ','); };
    var cel = pl.semanas.map(function(sm){
      var et = 'S' + (sm.w + 1) + (sm.tipo === 'descarga' ? ' · ' + jpT('app.plan.desc') : (sm.tipo === 'pico' ? ' · ' + jpT('app.plan.pico') : ''));
      var pie = sm.origen === 'real' ? jpT('app.plan.hecho') + (sm.reps ? ' · ×' + sm.reps : '') : (sm.rir || '');
      return '<span class="jp-pl-w jp-pl-' + sm.tipo + (sm.w === pl.actual ? ' hoy' : '') + (sm.origen === 'real' ? ' real' : '') + '" data-w="' + sm.w + '"><small>' + escSB(et) + '</small><b>' + (sm.kg > 0 ? fmt(sm.kg) + '<u>kg</u>' : '—') + '</b><i>' + escSB(pie) + '</i></span>';
    }).join('');
    return '<div class="jp-qc-plan"><div class="jp-pl-t">' + escSB(jpT('app.plan.t')) + '</div><div class="jp-pl-g" style="--n:' + pl.semanas.length + '">' + cel + '</div></div>';
  }
  window.jpPlanHtml = qrPlanHtml;
  /* ---------- TABLERO DE SERIES · HOJA RÁPIDA (v30, Opción 4 del Showroom aprobada) ----------
     Cada ejercicio muestra sus series como fichas: naranja = hecha (con lo registrado), borde cian = la que sigue, punteada = pendiente con la sugerencia tenue
     («Sug. 80×7»). Al tocar una ficha sube una hoja inferior con ±2,5 kg / ±1 rep y «✓ Registrar» fijo al pie. Es una capa sobre el registro de siempre:
     la hoja escribe en las MISMAS filas (.jp-qc-r, misma clave getLoadKey) y confirma con qrGuardarSerie / qrFinal, así el guardado, el tonelaje, el
     historial, el plan de cargas, las series extra y el RIR no cambian, y ningún plan guardado se toca. */
  function qrTbFmt(v){ return String(v == null ? '' : v).replace('.', ','); }
  /* sugerencia de la serie (índice ix): lo cargado si ya hay dato; si no, la sugerencia de la fila y la HERENCIA de la serie anterior ya hecha hoy */
  function qrTbSug(c, e, m, ix){
    var f = m.filas[ix], hay = !f.pre && (f.kg !== '' || f.rp !== '');
    if(f.done || hay) return { kg: m.sinKg ? '' : f.kg, rp: f.rp, aj: !f.done && hay };
    var kg = f.kg, rp = f.rp || (f.rpPh !== '—' ? f.rpPh : ''), pv = ix > 0 ? m.filas[ix - 1] : null;
    if(pv && pv.done && !f.extra){
      if(pv.kg !== '' && !m.sinKg) kg = pv.kg;
      if(pv.rp !== '' && !(e.rp && e.rp.length)) rp = pv.rp;                /* con reps distintas por serie (pirámide) se respeta la prescripta */
    }
    return { kg: m.sinKg ? '' : kg, rp: rp, aj: false };
  }
  function qrTbUnidad(e, m){ return m.modoR === 'tiempo' ? 's' : ((m.modoR === 'solo' && e.u && e.u !== 'reps') ? String(e.u) : 'reps'); }
  function qrTbTxt(kg, rp, m, un){
    var hayRp = rp !== '' && rp != null;
    if(m.sinKg || kg === '' || kg == null) return hayRp ? qrTbFmt(rp) + ' ' + un : '—';     /* sin peso sugerido todavía: solo las reps */
    return qrTbFmt(kg) + '×' + (hayRp ? qrTbFmt(rp) : '—');
  }
  function qrTableroHtml(c, e, i, m){
    var nx = -1, un = qrTbUnidad(e, m);
    m.filas.some(function(f, ix){ if(!f.done){ nx = ix; return true; } return false; });
    var tiles = m.filas.map(function(f, ix){
      var s = qrTbSug(c, e, m, ix), txt = qrTbTxt(s.kg, s.rp, m, un), sig = ix === nx;
      var lab = 'S' + f.j + (f.done ? ' ✓' : (sig ? ' · sigue' : '')) + (f.extra ? ' · extra' : '');
      var body = f.done ? '<span class="jp-tb-v">' + escSB(txt) + '</span><em>registrada</em>'
        : (s.aj ? '<span class="jp-tb-v">' + escSB(txt) + '</span><em>sin confirmar</em>'
        : '<span class="jp-tb-v jp-tb-sg">Sug. ' + escSB(txt) + '</span><em>' + (sig ? 'tocá para cargar' : escSB((e.reps || '') + (e.reps ? ' ' + un : ''))) + '</em>');
      return '<button type="button" class="jp-tb-t' + (f.done ? ' on' : (sig ? ' nx' : '')) + '" data-sj="' + f.j + '" aria-label="Serie ' + f.j + (f.done ? ' registrada: ' : (s.aj ? ' sin confirmar: ' : ' sugerida: ')) + escSB(txt) + '"><small>' + lab + '</small>' + body + '</button>';
    }).join('');
    if(m.fin){
      var fs = { kg: m.sinKg ? '' : m.fin.kg, rp: m.fin.rp }, ft = qrTbTxt(fs.kg, fs.rp, m, un), abre = m.baseOk || m.fin.done;
      tiles += '<button type="button" class="jp-tb-t jp-tb-fin' + (m.fin.done ? ' on' : (abre ? ' nx' : ' lock')) + '" data-sj="f"' + (abre ? '' : ' disabled') + ' aria-label="Serie final ' + escSB(QR_TEC_NOM[m.tec]) + '"><small>⚡ FINAL · ' + escSB(QR_TEC_NOM[m.tec]) + '</small>' +
        (m.fin.done ? '<span class="jp-tb-v">' + escSB(ft) + '</span><em>registrada</em>' : '<span class="jp-tb-v jp-tb-sg">' + (abre ? 'Sug. ' + escSB(ft) : 'después de las series') + '</span><em>' + (abre ? 'tocá para cargar' : 'se habilita al terminar') + '</em>') + '</button>';
    }
    return '<div class="jp-tb" role="group" aria-label="Series de ' + escSB(regNombreCorto(e.nombre)) + '">' + tiles + '</div>';
  }
  function qrCardHtml(c, e, i){
    var m = qrModelo(c, e, i), k = qrKey(c);
    var unidad = m.modoR === 'tiempo' ? 'SEG' : (m.modoR === 'solo' && e.u && e.u !== 'reps' ? String(e.u).toUpperCase() : 'REPS');
    var ulb = unidad === 'REPS' ? 'REPETICIONES' : (unidad === 'SEG' ? 'SEGUNDOS' : unidad), ual = unidad === 'REPS' ? 'repeticiones' : unidad.toLowerCase();
    var pres = [e.sets + ' × ' + (e.reps || (e.rp ? e.rp.join('+') : '')) + (e.u ? ' ' + e.u : ''), e.rir ? 'RIR ' + e.rir : '', e.carga ? '@ ' + e.carga : ''].filter(Boolean).join(' · ');
    /* la pastilla dice siempre de QUÉ ejercicio es: orden (01) o letra de la estación (A1/A2) + nombre + estado */
    var letraE = regLetra(c, i), idE = (QR_LBL[k + '|' + i] || {}).id || (/^E\d+$/.test(letraE) ? ('0' + (i + 1)).slice(-2) : letraE), nomE = regNombreCorto(e.nombre);
    var guia = qrGuia(c, e, i);
    /* v30: las series se registran en el tablero de fichas (arriba); la pastilla queda como acceso secundario a RIR, plan de cargas y series extra */
    var tg = '<button type="button" class="jp-qc-tg" aria-expanded="false" aria-label="Más del registro (RIR, plan y series extra) del ejercicio ' + escSB(idE) + ', ' + escSB(nomE) + '">' +
      '<span class="jp-qc-tg-t"><span class="jp-qc-tg-l">' + (m.todoOk ? 'Carga registrada' : 'Más del registro') + '</span><span class="jp-qc-tg-id">· ' + escSB(idE) + '</span><span class="jp-qc-chev" aria-hidden="true">▾</span></span>' +
      '<span class="jp-qc-tg-b"><span class="jp-qc-tg-h">RIR · plan · + serie</span>' + (m.ref ? '<span class="jp-qc-tg-r">' + escSB(m.ref) + '</span>' : '') + '</span></button>';
    var inputs = function(kg, rp, pre, rpPh, n){
      return (m.sinKg ? '' : '<input type="text" inputmode="decimal" class="jp-qc-kg' + (pre && kg ? ' pre' : '') + '" autocomplete="off" aria-label="Peso en kilos de la ' + n + '" value="' + escSB(kg) + '" placeholder="—"><b class="jp-qc-x">×</b>') +
        '<input type="text" inputmode="decimal" class="jp-qc-rp' + (pre && rp ? ' pre' : '') + '" autocomplete="off" aria-label="' + ual.charAt(0).toUpperCase() + ual.slice(1) + ' de la ' + n + '" value="' + escSB(rp) + '" placeholder="' + escSB(rpPh) + '">';
    };
    var filas = m.filas.map(function(f){
      var n = 'serie ' + f.j;
      return '<div class="jp-qc-r' + (f.done ? ' jp-done' : '') + (f.extra ? ' extra' : '') + '" data-sj="' + f.j + '" data-key="' + escSB(f.key) + '">' +
        '<span class="jp-qc-sn"><small>SERIE</small><b>' + f.j + '</b></span>' + inputs(f.kg, f.rp, f.pre, f.rpPh, n) +
        '<button type="button" class="jp-qc-ok' + (f.done ? ' on' : '') + '" aria-pressed="' + (f.done ? 'true' : 'false') + '" aria-label="' + (f.done ? 'Desmarcar ' : 'Marcar ') + n + ' como hecha">✓</button></div>';
    }).join('');
    var cab = '<div class="jp-qc-hd"><i></i>' + (m.sinKg ? '' : '<span>PESO · KG</span><i></i>') + '<span>' + ulb + '</span><i></i></div>';
    var fin = '';
    if(m.fin){
      fin = '<div class="jp-qc-fin"><span class="jp-qc-fin-lb">⚡ ' + (e.grp ? 'RONDA' : 'SERIE') + ' FINAL · ' + QR_TEC_NOM[m.tec] + '</span>' +
        '<div class="jp-qc-r jp-qc-rf' + (m.fin.done ? ' jp-done' : '') + '" data-sj="f" data-key="' + escSB(m.fin.key) + '"><span class="jp-qc-sn"><small>SERIE</small><b>' + (m.nsMax + 1) + '</b></span>' +
        inputs(m.fin.kg, m.fin.rp, m.fin.pre, m.rpPh, 'serie final') +
        '<button type="button" class="jp-qc-finok jp-qc-ok' + (m.fin.done ? ' on ok' : '') + '" aria-pressed="' + (m.fin.done ? 'true' : 'false') + '" aria-label="' + (m.fin.done ? 'Desmarcar' : 'Marcar') + ' la serie final como hecha">✓</button></div></div>';
    }
    return '<div class="jp-qc jp-qc-tb' + (m.todoOk ? ' ok' : '') + (m.sinKg ? ' sinkg' : '') + '" data-qk="' + escSB(k) + '" data-qi="' + i + '" data-ns="' + m.ns + '" data-max="' + m.nsMax + '"' + (m.tec ? ' data-tec="' + m.tec + '"' : '') + (m.baseOk ? ' data-base="1"' : '') + '>' + qrTableroHtml(c, e, i, m) + tg + '<div class="jp-qc-body"><div class="jp-qc-bi"><div class="jp-qc-bx">' +
      '<div class="jp-qc-top"><span class="jp-qc-let">' + regLetra(c, i) + '</span><span class="jp-qc-n">' + escSB(regNombreCorto(e.nombre)) + '</span><span class="jp-qc-p">' + escSB(pres) + '</span></div>' +
      qrPlanHtml(c, e) + cab + '<div class="jp-qc-rows">' + filas + '</div>' +
      '<div class="jp-qc-acts"><button type="button" class="jp-qc-add" aria-label="Agregar una serie más">＋ AGREGAR SERIE</button>' + (m.quitable ? '<button type="button" class="jp-qc-del" aria-label="Quitar la última serie agregada">− QUITAR</button>' : '') + '</div>' +
      (m.sinKg ? '' : qrRirHtml(c, e, m)) +
      fin +
      (guia.t ? '<div class="jp-qc-guia"><b>' + guia.k + '</b><span>' + escSB(guia.t) + '</span></div>' : '') +
      (m.hint ? '<div class="jp-qc-m"><span class="jp-qc-hint">' + escSB(m.hint) + '</span></div>' : '') +
    '</div></div></div>' + qrTipsHtml(c, e, i) + '</div>';
  }
  /* devuelve el contenedor con una tarjeta por ejercicio; jpQrAcomodar() las mueve dentro de la fila de cada ejercicio */
  function jpRegBotonHtml(cfg){
    QR_CFG[qrKey(cfg)] = cfg;
    return '<div class="jp-qr" data-qk="' + escSB(qrKey(cfg)) + '">' + cfg.ex.map(function(e, i){ return qrCardHtml(cfg, e, i); }).join('') + '</div>';
  }
  /* la técnica especial (mini-sets / bajadas) solo se muestra cuando las series normales ya están hechas */
  function qrTecAbrir(board){
    if(!board || !board.querySelectorAll) return;
    var cards = board.querySelectorAll('.jp-qc[data-tec]');
    if(!cards.length) return;
    var abierto = false;
    Array.prototype.forEach.call(cards, function(cd){ if(cd.getAttribute('data-base') === '1') abierto = true; });
    board.classList.add('jp-tec-gate');
    board.classList.toggle('jp-tec-open', abierto);
  }
  /* tempo del ejercicio: el de la dosis (e.tempo) o, si el coach lo dejó solo en las pautas ("TEMPO: Tempo 3010 (...)"), el que figura ahí */
  function qrTempoDe(c, e, i){
    var propio = tempoLimpioSB(e && e.tempo); if(propio) return propio;
    var L = regLetra(c, i), out = '';
    String(c.tp || '').split(/\n+|<br\s*\/?>/i).map(qrPlano).some(function(l){
      var m = /^(?:([A-F]\d)\s*\u00b7\s*)?TEMPO\s*:\s*(?:Tempo\s*)?([0-9xX]{3,4})\b/i.exec(l); if(!m) return false;
      if(m[1] && c.ex && c.ex.length > 1 && m[1].toUpperCase() !== L) return false;
      out = m[2]; return true;
    });
    return out;
  }
  /* el tempo va en la fila técnica de la tarjeta (junto al RIR); si la barra de dosis no lo trae, se agrega acá */
  function qrInyectarTempo(fila, tp){
    var bar = fila && fila.querySelector(':scope > .jp-dose-bar'); if(!bar || !tp || bar.querySelector('.jp-db-tempo')) return;
    var r3 = bar.querySelector('.jp-db-r3');
    if(!r3){ r3 = document.createElement('div'); r3.className = 'jp-db-row jp-db-r3'; bar.appendChild(r3); }
    var s = document.createElement('span'); s.className = 'jp-db-seg jp-db-tempo'; s.innerHTML = '<small>TEMPO</small> <b>' + escSB(tp) + '</b>';
    r3.insertBefore(s, r3.firstChild);
  }
  /* lo que la tarjeta del ejercicio ya muestra en su COACHING TIPS (Set-up · Ejecución · Cuidado) y el tempo (ficha + caja de cadencia) no se repite en
     "PAUTAS TÉCNICAS & TIPS DEL BLOQUE". En un bloque con varios ejercicios la tarjeta solo toma las líneas con letra de estación (A1 · ...): las demás se conservan. */
  function quitarTipsDeTarjetaSB(texto, nEj){
    if(!(nEj > 0)) return texto;
    var multi = nEj > 1;
    return String(texto || '').split('\n').filter(function(l){
      var m = /^\s*(?:([A-F]\d)\s*·\s*)?([^:]{2,40}):\s*\S/.exec(l); if(!m) return true;
      var et = m[2].trim();
      if(multi && !m[1] && !/^tempo/i.test(et)) return true;
      return !/^(set-?\s*up|cue|clave|ejecuci|control|ritmo|cuidado|error|precauci|tempo)/i.test(et);
    }).join('\n');
  }
  /* tempo "3110" -> "3 s bajada · 1 s pausa abajo · 1 s subida · 0 s pausa arriba" (X = explosivo) */
  function jpExplicarTempoSB(tp){
    var m = String(tp || '').match(/^([\dXx])([\dXx])([\dXx])([\dXx])$/);
    if(!m) return '';
    var sg = function(v, txt){ return v + ' s ' + txt; };
    return [sg(m[1], 'bajada'), sg(m[2], 'pausa abajo'), /x/i.test(m[3]) ? 'subida explosiva' : sg(m[3], 'subida'), sg(m[4], 'pausa arriba')].join(' · ');
  }
  /* "OBJETIVO FISIOLÓGICO" y "TEMPO (CADENCIA)" viven en recuadros plegables al pie de la tarjeta del ejercicio (debajo de los coaching tips), no en el acordeón del bloque.
     El objetivo es del bloque: va en la primera tarjeta. El tempo es de cada ejercicio: se explica con el que muestra su propia ficha. */
  function jpCajasTarjetaSB(root, objetivoHtml){
    var board = root && root.querySelector ? root.querySelector('[data-sportsboard]') : null; if(!board) return;
    var caja = function(cls, tit, sub, cuerpo){
      return '<details class="jp-ex-box jp-ex-box-' + cls + '"><summary><span class="jp-ex-box-t">' + tit + '</span><span class="jp-ex-box-s">' + sub + '</span></summary><div class="jp-ex-box-b">' + cuerpo + '</div></details>';
    };
    var unidades = Array.prototype.slice.call(board.querySelectorAll('.jp-sb-ex, .jp-sb-subex-resumen'));
    var objetivoPendiente = !!objetivoHtml;
    unidades.forEach(function(u){
      var ya = u.querySelector(':scope > .jp-ex-cajas');
      if(ya && ya.querySelector('.jp-ex-box')) return;
      if(u.hasAttribute('data-notas-k')){ objetivoPendiente = false; return; }      /* sus notas (y el objetivo del bloque) ya están en las pautas del bloque (jpNotasAgrupar) */
      var html = '';
      if(objetivoPendiente){ html += caja('obj', '&#127919; ' + escSB(jpT('app.card.obj.t')), escSB(jpT('app.card.obj.s')), objetivoHtml); objetivoPendiente = false; }
      var chip = Array.prototype.filter.call(u.querySelectorAll('.jp-db-tempo b'), function(b){ return b.closest('.jp-sb-ex, .jp-sb-subex-resumen') === u; })[0];
      var tp = chip ? String(chip.textContent || '').trim() : '', ex = jpExplicarTempoSB(tp);
      if(ex) html += caja('tempo', '&#9201; ' + escSB(jpT('app.card.tempo.t')), escSB(tp), '<div class="jp-tempo-row"><b>' + escSB(tp) + '</b> → ' + escSB(ex) + '</div>');
      if(!html) return;
      if(ya){ ya.insertAdjacentHTML('beforeend', html); return; }     /* el agrupador de notas ya la había creado con los coaching tips */
      var div = document.createElement('div'); div.className = 'jp-ex-cajas'; div.innerHTML = html;
      u.appendChild(div);
    });
    if(objetivoPendiente){                                                       /* sin tarjetas de ejercicio en el bloque: el objetivo cierra el tablero */
      var d2 = document.createElement('div'); d2.className = 'jp-ex-cajas'; d2.innerHTML = caja('obj', '&#127919; ' + escSB(jpT('app.card.obj.t')), escSB(jpT('app.card.obj.s')), objetivoHtml);
      var det2 = board.querySelector(':scope > .jp-block-details'); if(det2) board.insertBefore(d2, det2); else board.appendChild(d2);
    }
    try{ jpNotasAgrupar(board); }catch(eN){}
  }
  /* NOTAS DEL EJERCICIO DENTRO DE LAS PAUTAS DEL BLOQUE (2026-11, v27): debajo de "Registrar carga" había una fila de pastillas NOTAS · COACHING · OBJETIVO · TEMPO en cada
     tarjeta: un control más por ejercicio que se repetía en todo el día (y el tempo ya está en la barra de dosis). Ahora la tarjeta termina en "Registrar carga" y las notas de cada
     ejercicio pasan, con su número y nombre, al desplegable "PAUTAS TÉCNICAS & TIPS DEL BLOQUE": un solo control por bloque y nada se pierde (se mueven los mismos <details>).
     Idempotente: se llama cada vez que se arma o se acomoda un tablero; una unidad ya procesada queda marcada (data-notas-k) y su sección no se duplica. */
  var NOTAS_DEF = [
    { k: 'tips',  sel: '.jp-ex-tips',      lb: 'app.notas.tips' },
    { k: 'obj',   sel: '.jp-ex-box-obj',   lb: 'app.notas.obj' },
    { k: 'tempo', sel: '.jp-ex-box-tempo', lb: 'app.notas.tempo' }
  ];
  var _notasK = 0;
  function jpPautasDelBloqueSB(board){
    var det = board.querySelector(':scope > .jp-block-details');
    if(!det){
      det = document.createElement('details'); det.className = 'jp-block-details';
      det.innerHTML = '<summary class="jp-summary-btn"><svg class="jp-pauta-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2v.2h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg><span>' + escSB(jpT('app.card.tips')) + '</span></summary><div class="jp-details-content"></div>';
      var pie = board.querySelector(':scope > .jp-done-btn');
      if(pie) board.insertBefore(det, pie); else board.appendChild(det);
    }
    var cont = det.querySelector(':scope > .jp-details-content');
    if(!cont){ cont = document.createElement('div'); cont.className = 'jp-details-content'; det.appendChild(cont); }
    return cont;
  }
  function jpNotasAgrupar(root){
    if(!root || !root.querySelectorAll) return;
    var unidades = root.matches && root.matches('.jp-sb-ex, .jp-sb-subex-resumen') ? [root] : Array.prototype.slice.call(root.querySelectorAll('.jp-sb-ex, .jp-sb-subex-resumen'));
    unidades.forEach(function(u){
      var propio = function(el){ return el && el.closest('.jp-sb-ex, .jp-sb-subex-resumen') === u; };
      var caj = u.querySelector(':scope > .jp-ex-cajas');
      var piezas = [];
      NOTAS_DEF.forEach(function(d){ var el = Array.prototype.filter.call(u.querySelectorAll(d.sel), propio)[0]; if(el) piezas.push({ d: d, el: el }); });
      if(caj){ var fila0 = caj.querySelector(':scope > .jp-notas-chips'); if(fila0) caj.removeChild(fila0); }
      if(!piezas.length){ if(caj && !caj.children.length) caj.parentNode.removeChild(caj); return; }
      /* el tablero del bloque (el desplegable de pautas es hijo directo suyo); en un biset la unidad está anidada dentro del recuadro */
      var board = u.parentNode;
      while(board && board.nodeType === 1 && !(board.classList.contains('jp-sb-board') || board.hasAttribute('data-sportsboard'))) board = board.parentNode;
      if(!board || board.nodeType !== 1) board = u.parentNode;
      var cont = jpPautasDelBloqueSB(board);
      var key = u.getAttribute('data-notas-k'); if(!key){ key = 'n' + (++_notasK); u.setAttribute('data-notas-k', key); }
      var sec = cont.querySelector(':scope > .jp-pauta-ex[data-notas-k="' + key + '"]');
      if(!sec){
        var idEl = u.querySelector('.jp-sb-ex-id, .jp-sb-letra'), nmEl = u.querySelector('.jp-sb-ex-nombre, .jp-sb-subex-tit'), nm = '';
        if(nmEl){ var cl = nmEl.cloneNode(true); Array.prototype.forEach.call(cl.querySelectorAll('.jp-nom-en'), function(x){ x.parentNode.removeChild(x); }); nm = String(cl.textContent || '').replace(/\s+/g, ' ').trim(); }
        var idTx = idEl ? String(idEl.textContent || '').replace(/[^0-9A-Za-z]/g, '') : '';
        sec = document.createElement('div'); sec.className = 'jp-pauta-ex'; sec.setAttribute('data-notas-k', key);
        sec.innerHTML = '<div class="jp-pauta-ex-tit">' + (idTx ? '<span class="jp-pauta-ex-id">' + escSB(idTx) + '</span>' : '') + '<span>' + escSB(nm || jpT('app.notas.lb')) + '</span></div>';
        cont.appendChild(sec);
      }
      piezas.forEach(function(p){
        var viejo = sec.querySelector(':scope > [data-nota="' + p.d.k + '"]'); if(viejo && viejo !== p.el) sec.removeChild(viejo);
        var lbViejo = sec.querySelector(':scope > .jp-pauta-ex-lb[data-lb="' + p.d.k + '"]'); if(lbViejo) sec.removeChild(lbViejo);
        var tp = p.d.k === 'tempo' ? p.el.querySelector('.jp-ex-box-s') : null;
        var lb = document.createElement('div'); lb.className = 'jp-pauta-ex-lb'; lb.setAttribute('data-lb', p.d.k);
        lb.innerHTML = escSB(jpT(p.d.lb)) + (tp ? ' <b>' + escSB(String(tp.textContent || '').trim()) + '</b>' : '');
        p.el.open = true; p.el.setAttribute('data-nota', p.d.k); p.el.classList.add('jp-pauta-ex-nota');
        sec.appendChild(lb); sec.appendChild(p.el);
      });
      if(caj && !caj.children.length) caj.parentNode.removeChild(caj);
    });
  }
  window.jpNotasAgrupar = jpNotasAgrupar;
  /* estaciones de cardio / finisher (filas simples): nombre limpio y consigna de formato */
  function jpLimpiarNombreEstacionSB(nm){
    return String(nm || '').replace(/^[\s\-\u2013\u2014\u2022*]+/, '').replace(/\s*[x\u00d7]\s*$/i, '').trim();
  }
  function jpEsLineaFormatoSB(txt, hayPastilla){
    var t = String(txt || '').trim();
    if(!t || hayPastilla) return false;
    return t.length > 48 || /^(?:\d+|un|una|dos|tres|cuatro|cinco|seis|siete|ocho)\s+(?:rondas?|series?|vueltas?|intervalos?)\b|^(?:amrap|emom|for\s*time|hiit|tabata|chipper)\b/i.test(t);
  }
  /* consigna de formato por su arranque ("4 rondas", "AMRAP", "EMOM", "HIIT por intervalos"): nunca una estación aunque lleve "x 40 s" más adelante */
  function jpEsConsignaSB(txt){
    return /^\s*(?:(?:\d+|un|una|dos|tres|cuatro|cinco|seis|siete|ocho)\s+(?:rondas?|series?|vueltas?|intervalos?)\b|(?:amrap|emom|e\d+mom|for\s*time|hiit|tabata|chipper)\b)/i.test(String(txt || ''));
  }
  /* "SkiErg x 40 s al máximo sostenible" -> { nm: "SkiErg", qty: "40 S", nota: "Al máximo sostenible" }; sin cantidad ("x 40 s", "x 20 m", "x 12 cal", "x 10") devuelve null */
  function jpPartirEstacionSB(txt){
    var t = String(txt || '').trim();
    var m = t.match(/^(.*?\S)\s+[x×]\s*(\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?)\s*(minutos?|min|segundos?|segs?|seg|s|mts?|metros?|km|m|cals?|calor[ií]as|repeticiones|reps?)?(?![A-Za-zÀ-ÿ])[.,:;]?\s*(.*)$/i);
    var unidadSB = function(u0){ var u = String(u0 || '').toLowerCase(); return !u ? '' : (/^min/.test(u) ? 'MIN' : (/^seg|^s$/.test(u) ? 'S' : (/^(?:m|mt|mts|metro|metros)$/.test(u) ? 'M' : (/^km/.test(u) ? 'KM' : (/^cal/.test(u) ? 'CAL' : 'REPS'))))); };
    if(!m){
      /* cantidad al principio ("20 min Caminata inclinada (Zona 2)"): la cantidad va a la pastilla y el resto es el nombre */
      var mI = t.match(/^(\d+(?:[.,]\d+)?)\s*(minutos?|min|km|cals?)\s+(\S.*)$/i);
      return mI ? { nm: mI[3].trim(), qty: mI[1] + ' ' + unidadSB(mI[2]), nota: '' } : null;
    }
    var un = unidadSB(m[3]);
    var nota = String(m[4] || '').replace(/^[\s\-–—:,;]+/, '').trim();
    return { nm: m[1].trim(), qty: m[2].replace(/\s+/g, '') + (un ? ' ' + un : ''), nota: nota ? nota.charAt(0).toUpperCase() + nota.slice(1) : '' };
  }
  window.jpPartirEstacion = jpPartirEstacionSB; window.jpEsConsigna = jpEsConsignaSB;
  window.jpLimpiarNombreEstacion = jpLimpiarNombreEstacionSB; window.jpEsLineaFormato = jpEsLineaFormatoSB;
  window.jpQuitarTipsDeTarjeta = quitarTipsDeTarjetaSB; window.jpCajasTarjeta = jpCajasTarjetaSB;
  /* cada tarjeta pasa a vivir DENTRO de la fila de su ejercicio (nombre, video y dosis arriba; KG × REPS y ✓ abajo): una sola tarjeta por ejercicio */
  function jpQrAcomodar(root){
    var boards = root && root.matches && root.matches('[data-sportsboard]') ? [root] : (root && root.querySelectorAll ? Array.prototype.slice.call(root.querySelectorAll('[data-sportsboard]')) : []);
    boards.forEach(function(board){
      var box = board.querySelector('.jp-qr');
      if(box){
        var cards = Array.prototype.slice.call(box.querySelectorAll('.jp-qc'));
        var filas = Array.prototype.slice.call(board.querySelectorAll('.jp-sb-ex, .jp-sb-subex-resumen'));
        if(filas.length === cards.length && cards.length){
          cards.forEach(function(cd, i){
            /* la pastilla toma el mismo número (01) o letra (A1) que muestra la fila del ejercicio: nunca hay dos criterios distintos */
            var idEl = filas[i].querySelector('.jp-sb-ex-id, .jp-sb-letra'), idTx = idEl ? String(idEl.textContent || '').replace(/[^0-9A-Za-z]/g, '') : '';
            if(idTx){ QR_LBL[cd.getAttribute('data-qk') + '|' + cd.getAttribute('data-qi')] = { id: idTx }; var spId = cd.querySelector('.jp-qc-tg-id'); if(spId) spId.textContent = '· ' + idTx; }
            var tr = filas[i].querySelector(':scope > .jp-set-tracker-tecnica');
            if(tr) filas[i].insertBefore(cd, tr); else filas[i].appendChild(cd);
            try{ var kt = qrCtx(cd); if(kt) qrInyectarTempo(filas[i], qrTempoDe(kt.c, kt.e, parseInt(cd.getAttribute('data-qi'), 10))); }catch(eT){}
          });
          box.parentNode.removeChild(box);
        }
      }
      jpRegistroAlFinalDelBisetSB(board);
      jpTbRefrescarRondas(board);
      qrTecAbrir(board);
      try{ jpNotasAgrupar(board); }catch(eN){}
    });
  }
  /* REGISTRO DE CARGA AL FINAL DEL BISET / TRISET (v28): las tarjetas «Registrar carga» de A1, A2, A3... ya no quedan intercaladas entre las estaciones
     (cortaban la lectura de la ronda): se juntan al cierre del recuadro del biset, en el mismo orden y con su letra. Antes de moverlas, las notas de cada
     estación pasan a las pautas del bloque (jpNotasAgrupar), así nada se pierde. Idempotente: una tarjeta ya movida no se vuelve a tocar. */
  function jpRegistroAlFinalDelBisetSB(board){
    if(!board || !board.querySelectorAll) return;
    Array.prototype.forEach.call(board.querySelectorAll('.jp-sb-biset'), function(bis){
      var subs = Array.prototype.slice.call(bis.querySelectorAll('.jp-sb-subex-resumen')), cards = [];
      subs.forEach(function(sx){ var cd = sx.querySelector(':scope > .jp-qc'); if(cd){ try{ jpNotasAgrupar(sx); }catch(eN){} cards.push(cd); } });
      if(!cards.length) return;
      var reg = bis.querySelector(':scope > .jp-sb-biset-reg');
      if(!reg){
        var letras = subs.map(function(sx){ var l = sx.querySelector('.jp-sb-letra'); return l ? String(l.textContent || '').trim() : ''; }).filter(Boolean);
        reg = document.createElement('div'); reg.className = 'jp-sb-biset-reg';
        reg.innerHTML = '<div class="jp-sb-biset-reg-t"><span>' + (subs.length === 2 ? 'REGISTRO DEL BISET' : (subs.length === 3 ? 'REGISTRO DEL TRISET' : 'REGISTRO DEL BLOQUE')) + '</span>' + (letras.length ? '<em>' + escSB(letras.join(' · ')) + '</em>' : '') + '</div>';
        bis.appendChild(reg);
      }
      cards.forEach(function(cd){ reg.appendChild(cd); });
    });
  }
  window.jpRegistroAlFinalDelBiset = jpRegistroAlFinalDelBisetSB;
  /* v30 · RONDAS DEL BISET / TRISET EN EL TABLERO: una fila ancha por ronda con sus estaciones (A1 + A2 · 3 estaciones), el estado (EN CURSO / PENDIENTE / ✓ HECHA)
     y el resumen de lo registrado (✓ 26×10 · 12×15) o la sugerencia tenue. Nunca columnas apretadas. Al tocar una ronda, la hoja muestra todas sus estaciones. */
  function qrTbId(cd, k){ var i = parseInt(cd.getAttribute('data-qi'), 10); return (QR_LBL[cd.getAttribute('data-qk') + '|' + i] || {}).id || regLetra(k.c, i); }
  function jpTbRondasSB(bis){
    if(!bis || !bis.querySelector) return;
    var reg = bis.querySelector(':scope > .jp-sb-biset-reg'); if(!reg) return;
    var est = Array.prototype.slice.call(reg.querySelectorAll(':scope > .jp-qc')).map(function(cd){
      var k = qrCtx(cd); if(!k) return null; var i = parseInt(cd.getAttribute('data-qi'), 10), m = qrModelo(k.c, k.e, i);
      return { cd: cd, k: k, i: i, m: m, id: qrTbId(cd, k), un: qrTbUnidad(k.e, m) };
    }).filter(Boolean);
    var box = reg.querySelector(':scope > .jp-tb-rondas');
    if(est.length < 2){ if(box) box.parentNode.removeChild(box); reg.classList.remove('jp-tb-bis'); return; }
    var nR = Math.max.apply(null, est.map(function(x){ return x.m.nt; })), cur = -1, r, h = '';
    var hecha = function(rr){ return est.every(function(x){ return !x.m.filas[rr] || x.m.filas[rr].done; }); };
    for(r = 0; r < nR; r++){ if(!hecha(r)){ cur = r; break; } }
    for(r = 0; r < nR; r++){
      var st = est.filter(function(x){ return !!x.m.filas[r]; }), ok = hecha(r), estado = ok ? '✓ HECHA' : (r === cur ? 'EN CURSO' : 'PENDIENTE');
      var letras = st.map(function(x){ return x.id; }).join(' + ') + (st.length > 2 ? ' · ' + st.length + ' estaciones' : '');
      var res = st.map(function(x){ var s = qrTbSug(x.k.c, x.k.e, x.m, r); return qrTbTxt(s.kg, s.rp, x.m, x.un); }).join(' · ');
      var algunaAj = st.some(function(x){ return qrTbSug(x.k.c, x.k.e, x.m, r).aj; });
      h += '<button type="button" class="jp-tb-rt' + (ok ? ' on' : (r === cur ? ' nx' : '')) + '" data-r="' + (r + 1) + '" aria-label="Ronda ' + (r + 1) + ', ' + estado.replace('✓ ', '') + ': ' + escSB(res) + '">' +
        '<span class="jp-tb-rl"><small>RONDA ' + (r + 1) + '</small><b>' + estado + '</b></span>' +
        '<span class="jp-tb-rv"><em>' + escSB(letras) + '</em><span class="jp-tb-v' + (ok || algunaAj ? '' : ' jp-tb-sg') + '">' + (ok ? '✓ ' : (algunaAj ? '' : 'Sug. ')) + escSB(res) + '</span></span></button>';
    }
    if(!box){
      box = document.createElement('div'); box.className = 'jp-tb-rondas'; box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'Rondas');
      var tit = reg.querySelector(':scope > .jp-sb-biset-reg-t');
      if(tit && tit.nextSibling) reg.insertBefore(box, tit.nextSibling); else reg.appendChild(box);
    }
    box.innerHTML = h;
    reg.classList.add('jp-tb-bis');
  }
  function jpTbRefrescarRondas(root){ Array.prototype.forEach.call((root || document).querySelectorAll('.jp-sb-biset'), jpTbRondasSB); }
  window.jpTbRondas = jpTbRondasSB;

  function qrCtx(card){
    var cfg = QR_CFG[card.getAttribute('data-qk')], e = cfg && cfg.ex[parseInt(card.getAttribute('data-qi'), 10)];
    return (cfg && e) ? { c: cfg, e: e } : null;
  }
  /* valores de una fila: lo escrito o, si falta, el valor sugerido que se ve en gris (reps prescriptas) */
  function qrValFila(row){
    var kgI = row.querySelector('.jp-qc-kg'), rpI = row.querySelector('.jp-qc-rp');
    var fb = function(inp){ return inp ? (inp.value || (/^[0-9]/.test(inp.placeholder) ? inp.placeholder : '')) : ''; };
    return { kv: fb(kgI), rv: fb(rpI), pideKg: !!kgI, kgI: kgI, rpI: rpI };
  }
  function qrAviso(){
    try{ jpAudioTactical.soundCheckSet(); }catch(e1){}
    try{ jpAudioTactical.vibrateCheckSet(); }catch(e2){}
  }
  function qrRefrescar(card, mantener){
    var k = qrCtx(card); if(!k || !card.parentNode) return null;
    var tmp = document.createElement('div');
    tmp.innerHTML = qrCardHtml(k.c, k.e, parseInt(card.getAttribute('data-qi'), 10));
    var nuevo = tmp.firstChild, board = card.closest('[data-sportsboard]');
    if(mantener && card.classList.contains('jp-open')){ nuevo.classList.add('jp-open'); var tg0 = nuevo.querySelector('.jp-qc-tg'); if(tg0) tg0.setAttribute('aria-expanded', 'true'); }
    var tipsAntes = card.querySelector('.jp-ex-tips'), tipsAhora = nuevo.querySelector('.jp-ex-tips');
    if(tipsAntes && tipsAhora && tipsAntes.open) tipsAhora.open = true;
    /* las notas del ejercicio ya viven agrupadas fuera de la tarjeta de carga: el tip nuevo no se duplica */
    var uEx = card.closest('.jp-sb-ex, .jp-sb-subex-resumen');
    if(tipsAhora && uEx && uEx.querySelector(':scope > .jp-ex-cajas > .jp-ex-tips')) tipsAhora.parentNode.removeChild(tipsAhora);
    card.parentNode.replaceChild(nuevo, card);
    qrTecAbrir(board);
    var bisR = nuevo.closest ? nuevo.closest('.jp-sb-biset') : null;
    if(bisR) jpTbRondasSB(bisR);                                   /* v30: las rondas del biset reflejan al instante lo registrado */
    if(TB && TB.items && !TB.guardando) tbPintar();
    return nuevo;
  }
  /* marca o desmarca UNA serie: guarda KG × REPS de esa serie con su propia clave (nunca se reparten kilos entre series) */
  function qrGuardarSerie(card, row){
    var k = qrCtx(card); if(!k || !row) return;
    if(card.classList.contains('jp-sav')) return;
    var c = k.c, e = k.e, key = row.getAttribute('data-key'), ld = getLoad(key);
    if(ld.done){                                                   /* segundo toque: desmarca y conserva lo escrito */
      setLoadField(key, 'done', false);
      qrRefrescar(card, true); return;
    }
    var v = qrValFila(row);
    if((v.pideKg && !v.kv) || !v.rv){
      row.classList.add('falta'); setTimeout(function(){ row.classList.remove('falta'); }, 700);
      var vacio = (v.pideKg && !v.kv) ? v.kgI : v.rpI;
      if(vacio){ try{ vacio.focus(); }catch(eF){} }
      return;
    }
    if(v.kv) setLoadField(key, 'kg', v.kv);
    if(v.rv) setLoadField(key, 'reps', v.rv);
    setLoadField(key, 'ex', regNombreCorto(e.nombre));           /* el historial verifica que la marca sea de ESTE ejercicio */
    if(e.u && e.u !== 'reps') setLoadField(key, 'u', e.u);       /* la unidad del segundo casillero (m / seg): el tonelaje la excluye */
    if(e.uni) setLoadField(key, 'uni', 1);                       /* unilateral: el tonelaje cuenta los dos lados */
    setLoadField(key, 'done', true);
    qrAviso();
    var i = parseInt(card.getAttribute('data-qi'), 10), m = qrModelo(c, e, i);
    if(m.todoOk){ qrCerrarYRefrescar(card); return; }             /* todo hecho: el panel se pliega */
    var nuevo = qrRefrescar(card, true);
    if(nuevo){ var sig = nuevo.querySelector('.jp-qc-r:not(.jp-done) .jp-qc-kg') || nuevo.querySelector('.jp-qc-r:not(.jp-done) .jp-qc-rp'); if(sig){ try{ sig.focus({ preventScroll: true }); }catch(eN){} } }
  }
  /* serie final con técnica: KG × REPS propios, marcada aparte de las series normales */
  function qrFinal(card){
    var k = qrCtx(card); if(!k) return;
    var row = card.querySelector('.jp-qc-fin .jp-qc-r'); if(!row) return;
    var c = k.c, e = k.e, key = row.getAttribute('data-key');
    if(getLoad(key).done){ setLoadField(key, 'done', false); qrRefrescar(card, true); return; }
    var v = qrValFila(row);
    if(!v.rv && !v.kv){
      row.classList.add('falta'); setTimeout(function(){ row.classList.remove('falta'); }, 700);
      if(v.rpI){ try{ v.rpI.focus(); }catch(eF){} }
      return;
    }
    if(v.kv) setLoadField(key, 'kg', v.kv);
    if(v.rv) setLoadField(key, 'reps', v.rv);
    setLoadField(key, 'ex', regNombreCorto(e.nombre));
    if(e.u && e.u !== 'reps') setLoadField(key, 'u', e.u);
    setLoadField(key, 'done', true);
    qrAviso();
    qrCerrarYRefrescar(card);
  }
  function qrAgregar(card){
    var k = qrCtx(card); if(!k) return;
    var i = parseInt(card.getAttribute('data-qi'), 10), ek = qrExtraKey(k.c, i);
    if(qrTotalSeries(k.c, k.e, i) >= Math.max(1, qrSetsBase(k.e)) + 12) return;
    QR_EXTRA[ek] = (QR_EXTRA[ek] || 0) + 1;
    var nuevo = qrRefrescar(card, true);
    if(nuevo){ var filas = nuevo.querySelectorAll('.jp-qc-r:not(.jp-qc-rf)'), ult = filas[filas.length - 1], inp = ult && (ult.querySelector('.jp-qc-kg') || ult.querySelector('.jp-qc-rp')); if(inp){ try{ inp.focus({ preventScroll: true }); inp.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }catch(eF){} } }
  }
  function qrQuitar(card){
    var k = qrCtx(card); if(!k) return;
    var i = parseInt(card.getAttribute('data-qi'), 10), ek = qrExtraKey(k.c, i);
    if((QR_EXTRA[ek] || 0) > 0) QR_EXTRA[ek]--;
    qrRefrescar(card, true);
  }
  function qrCerrar(card){
    card.classList.remove('jp-open');
    var tg = card.querySelector('.jp-qc-tg'); if(tg) tg.setAttribute('aria-expanded', 'false');
    var af = document.activeElement; if(af && card.contains(af) && af.blur){ try{ af.blur(); }catch(eB){} }
  }
  /* guardar: el panel se pliega con la animación y recién entonces la pastilla se repinta con el resumen */
  function qrCerrarYRefrescar(card){
    qrCerrar(card); card.classList.add('jp-sav');
    setTimeout(function(){ qrRefrescar(card); }, 240);
  }
  function qrAlternar(card){
    if(!card) return;
    if(card.classList.contains('jp-open')){ qrCerrar(card); return; }
    Array.prototype.forEach.call(document.querySelectorAll('.jp-qc.jp-open'), function(o){ if(o !== card) qrCerrar(o); });
    card.classList.add('jp-open');
    var tg = card.querySelector('.jp-qc-tg'); if(tg) tg.setAttribute('aria-expanded', 'true');
    /* el foco va a los kilos de la primera serie pendiente (o a las reps si el ejercicio no lleva peso); se hace dentro del toque para que el teclado abra de una */
    var campo = card.querySelector('.jp-qc-r:not(.jp-done) .jp-qc-kg') || card.querySelector('.jp-qc-r:not(.jp-done) .jp-qc-rp') || card.querySelector('.jp-qc-kg') || card.querySelector('.jp-qc-rp');
    if(campo){ try{ campo.focus({ preventScroll: true }); }catch(eF){} }
    setTimeout(function(){ try{ card.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }catch(eS){} }, 260);
  }
  document.addEventListener('click', function(ev){
    var t = ev.target; if(!t || !t.closest) return;
    var tgb = t.closest('.jp-qc-tg');
    if(tgb){ ev.preventDefault(); qrAlternar(tgb.closest('.jp-qc')); return; }
    var fi = t.closest('.jp-qc-finok');
    if(fi){ ev.preventDefault(); ev.stopPropagation(); qrFinal(fi.closest('.jp-qc')); return; }
    var ok = t.closest('.jp-qc-ok');
    if(ok){ ev.preventDefault(); ev.stopPropagation(); qrGuardarSerie(ok.closest('.jp-qc'), ok.closest('.jp-qc-r')); return; }
    var rb = t.closest('.jp-qc-rirb');
    if(rb){
      ev.preventDefault(); ev.stopPropagation();
      var cardR = rb.closest('.jp-qc'), kr = cardR && qrCtx(cardR); if(!kr) return;
      var nR = parseInt(rb.getAttribute('data-rirx'), 10), clR = qrRirKey(kr.c, kr.e);
      state.rirEx = state.rirEx || {};
      if(state.rirEx[clR] === nR) delete state.rirEx[clR]; else state.rirEx[clR] = nR;
      saveProgress();
      qrRefrescar(cardR, true);
      return;
    }
    var ad = t.closest('.jp-qc-add');
    if(ad){ ev.preventDefault(); ev.stopPropagation(); qrAgregar(ad.closest('.jp-qc')); return; }
    var dl = t.closest('.jp-qc-del');
    if(dl){ ev.preventDefault(); ev.stopPropagation(); qrQuitar(dl.closest('.jp-qc')); return; }
  });
  document.addEventListener('input', function(ev){
    var t = ev.target; if(!t || !t.classList || !(t.classList.contains('jp-qc-kg') || t.classList.contains('jp-qc-rp'))) return;
    var vq = t.value.replace(/,/g, '.').replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    if(vq !== t.value) t.value = vq;
    t.classList.remove('pre');
    var row = t.closest('.jp-qc-r');
    if(row){
      row.classList.remove('falta');
      /* lo tipeado se guarda en el acto: antes solo se guardaba al tildar ✓ y si el alumno cargaba kilos y reps y salía sin tildar, la Semana 2 quedaba sin ninguna referencia.
         Un borrador NO cuenta como serie hecha (done sigue sin marcar: el tonelaje y el historial no lo suman) pero sí sirve de referencia para la carga sugerida de la semana siguiente. */
      var kRow = row.getAttribute('data-key');
      if(kRow){
        var campoQ = t.classList.contains('jp-qc-kg') ? 'kg' : 'reps';
        setLoadField(kRow, campoQ, t.value);
        if(!getLoad(kRow).ex){ var cardQ = row.closest('.jp-qc'), kq = cardQ && qrCtx(cardQ); if(kq) setLoadField(kRow, 'ex', regNombreCorto(kq.e.nombre)); }
      }
    }
  });
  /* ---------- v30 · HOJA RÁPIDA (abajo, al alcance del pulgar) ----------
     Una sola hoja para todo el día. Muestra la serie (o la ronda entera de un biset / triset, estación por estación con aire) con botones ±2,5 kg / ±1 rep.
     Cada valor dice si es «sugerido» (tenue, cursiva, borde punteado) o «ajustado» por el alumno (blanco sólido). «✓ Registrar» escribe en las filas reales de
     la tarjeta y confirma con qrGuardarSerie / qrFinal (mismas claves, mismo guardado). Si la serie ya estaba hecha, el botón la desmarca (como el ✓ de siempre). */
  var TB = { items: null, vals: null, titulo: '', sub: '', que: '', el: null, guardando: false };
  function tbEl(){
    if(TB.el && document.body.contains(TB.el)) return TB.el;
    var d = document.createElement('div'); d.id = 'jpTbSheet'; d.className = 'jp-tbs'; d.hidden = true;
    document.body.appendChild(d); TB.el = d; return d;
  }
  function tbItem(it){
    var card = null;
    Array.prototype.some.call(document.querySelectorAll('.jp-qc'), function(cd){ if(cd.getAttribute('data-qk') === it.qk && cd.getAttribute('data-qi') === String(it.qi)){ card = cd; return true; } return false; });
    if(!card) return null;
    var k = qrCtx(card); if(!k) return null;
    var m = qrModelo(k.c, k.e, it.qi), fin = it.j === 'f', f = fin ? m.fin : m.filas[it.j - 1]; if(!f) return null;
    var row = card.querySelector('.jp-qc-r[data-sj="' + it.j + '"]'); if(!row) return null;
    return { card: card, k: k, m: m, f: f, fin: fin, row: row, ix: fin ? -1 : it.j - 1, id: qrTbId(card, k), un: qrTbUnidad(k.e, m) };
  }
  function tbSugIt(x){
    if(x.fin){ var hay = !x.f.pre && (x.f.kg !== '' || x.f.rp !== ''); return { kg: x.m.sinKg ? '' : x.f.kg, rp: x.f.rp, aj: hay && !x.f.done }; }
    return qrTbSug(x.k.c, x.k.e, x.m, x.ix);
  }
  function tbStp(n, f, v, s, d, lb){
    var aj = v !== '';
    return '<div class="jp-tbs-stp' + (aj ? ' aj' : '') + '" data-n="' + n + '" data-f="' + f + '"><small>' + escSB(lb) + '<i>' + (aj ? 'ajustado' : 'sugerido') + '</i></small><div class="jp-tbs-sp">' +
      '<button type="button" data-tba="inc" data-n="' + n + '" data-f="' + f + '" data-d="-' + d + '" aria-label="Restar ' + String(d).replace('.', ',') + '">&minus;</button>' +
      '<input type="text" inputmode="decimal" autocomplete="off" data-n="' + n + '" data-f="' + f + '" value="' + escSB(v) + '" placeholder="' + escSB(s !== '' && s != null ? s : '—') + '" aria-label="' + escSB(lb) + '">' +
      '<button type="button" data-tba="inc" data-n="' + n + '" data-f="' + f + '" data-d="' + d + '" aria-label="Sumar ' + String(d).replace('.', ',') + '">+</button></div></div>';
  }
  function tbPintar(){
    var el = tbEl(), xs = (TB.items || []).map(tbItem);
    if(!xs.length || xs.some(function(x){ return !x; })){ tbCerrar(); return; }
    var multi = xs.length > 1, todos = xs.every(function(x){ return x.f.done; });
    var h = '<div class="jp-tbs-bg" data-tba="cerrar"></div><div class="jp-tbs-p" role="dialog" aria-modal="true" aria-label="' + escSB(TB.titulo) + '"><i class="jp-tbs-grab" aria-hidden="true"></i>' +
      '<div class="jp-tbs-h"><div><small>' + escSB(TB.sub) + '</small><b>' + escSB(TB.titulo) + '</b></div><button type="button" class="jp-tbs-x" data-tba="cerrar" aria-label="Cerrar">&times;</button></div>' +
      '<div class="jp-tbs-ley"><span class="jp-tb-sg">80</span> sugerido · <b>82,5</b> ajustado por vos</div><div class="jp-tbs-body">';
    xs.forEach(function(x, n){
      var s = tbSugIt(x), v = TB.vals[n], e = x.k.e, ult = x.fin ? null : regUltRegKey(x.k.c, e, qrIdxClave(e, x.f.j));
      var ref = [ult ? 'Semana ' + (ult.w + 1) + ': ' + [ult.kg !== '' && ult.kg != null ? qrTbFmt(ult.kg) + ' kg' : '', ult.reps !== '' && ult.reps != null ? '× ' + ult.reps : ''].filter(Boolean).join(' ') : '', e.reps ? 'objetivo ' + e.reps : '', e.rir ? 'RIR ' + e.rir : ''].filter(Boolean).join(' · ');
      h += '<div class="jp-tbs-e" data-n="' + n + '">' + (multi ? '<div class="jp-tbs-n"><span class="jp-tbs-l">' + escSB(x.id) + '</span>' + escSB(regNombreCorto(e.nombre)) + '</div>' : '') +
        '<div class="jp-tbs-r' + (x.m.sinKg ? ' uno' : '') + '">' + (x.m.sinKg ? '' : tbStp(n, 'kg', v.kg, s.kg, 2.5, 'KG')) + tbStp(n, 'rp', v.rp, s.rp, 1, x.un.toUpperCase()) + '</div>' +
        (ref ? '<div class="jp-tbs-a">' + escSB(ref) + '</div>' : '') + '</div>';
    });
    h += '</div><div class="jp-tbs-dock"><button type="button" class="jp-tbs-ok' + (todos ? ' on' : '') + '" data-tba="ok">' + (todos ? '✓ Registrada · tocá para desmarcar' : '✓ Registrar ' + escSB(TB.que)) + '</button></div></div>';
    el.innerHTML = h;
  }
  function tbAbrir(items, titulo, sub, que){
    TB.items = items; TB.titulo = titulo; TB.sub = sub; TB.que = que;
    TB.vals = items.map(function(it){ var x = tbItem(it); if(!x) return { kg: '', rp: '' }; var s = tbSugIt(x); return (x.f.done || s.aj) ? { kg: x.m.sinKg ? '' : String(x.f.kg || ''), rp: String(x.f.rp || '') } : { kg: '', rp: '' }; });
    tbPintar();
    var el = tbEl(); el.hidden = false; document.documentElement.classList.add('jp-tbs-on');
    setTimeout(function(){ el.classList.add('on'); }, 10);
  }
  function tbCerrar(){
    TB.items = null; TB.vals = null;
    var el = TB.el; if(!el) return;
    el.classList.remove('on'); document.documentElement.classList.remove('jp-tbs-on');
    setTimeout(function(){ if(!TB.items){ el.hidden = true; el.innerHTML = ''; } }, 200);
  }
  function tbRegistrar(){
    var xs = (TB.items || []).map(tbItem);
    if(!xs.length || xs.some(function(x){ return !x; })){ tbCerrar(); return; }
    TB.guardando = true;
    try{
      if(xs.every(function(x){ return x.f.done; })){                            /* ya registrada: desmarca (como el segundo toque del ✓) */
        TB.items.forEach(function(it){ var y = tbItem(it); if(!y || !y.f.done) return; if(y.fin) qrFinal(y.card); else qrGuardarSerie(y.card, y.row); });
        tbCerrar(); return;
      }
      var vals = xs.map(function(x, n){ var s = tbSugIt(x), v = TB.vals[n]; return { kg: v.kg !== '' ? v.kg : (s.kg || ''), rp: v.rp !== '' ? v.rp : (s.rp || '') }; });
      var falta = -1;
      xs.forEach(function(x, n){
        if(x.f.done || falta >= 0) return;
        var sinDato = x.fin ? (!vals[n].kg && !vals[n].rp) : ((!x.m.sinKg && !vals[n].kg) || !vals[n].rp);
        if(sinDato) falta = n;
      });
      if(falta >= 0){
        var bx = TB.el && TB.el.querySelector('.jp-tbs-e[data-n="' + falta + '"]');
        if(bx){ bx.classList.add('falta'); setTimeout(function(){ bx.classList.remove('falta'); }, 900); }
        return;
      }
      TB.items.forEach(function(it, n){
        var y = tbItem(it); if(!y || y.f.done) return;
        var kgI = y.row.querySelector('.jp-qc-kg'), rpI = y.row.querySelector('.jp-qc-rp');
        if(kgI) kgI.value = vals[n].kg;
        if(rpI) rpI.value = vals[n].rp;
        if(y.fin) qrFinal(y.card); else qrGuardarSerie(y.card, y.row);
      });
      tbCerrar();
    } finally {
      TB.guardando = false;
      setTimeout(function(){ jpTbRefrescarRondas(); }, 300);
    }
  }
  window.jpTablero = { abrir: tbAbrir, cerrar: tbCerrar, registrar: tbRegistrar, estado: function(){ return TB; } };
  document.addEventListener('click', function(ev){
    var t = ev.target; if(!t || !t.closest) return;
    var tt = t.closest('.jp-tb-t');
    if(tt){
      ev.preventDefault(); ev.stopPropagation(); if(tt.disabled) return;
      var cd = tt.closest('.jp-qc'), k = cd && qrCtx(cd); if(!k) return;
      var i = parseInt(cd.getAttribute('data-qi'), 10), sj = tt.getAttribute('data-sj'), m = qrModelo(k.c, k.e, i), id = qrTbId(cd, k);
      if(sj === 'f') tbAbrir([{ qk: cd.getAttribute('data-qk'), qi: i, j: 'f' }], regNombreCorto(k.e.nombre), id + ' · ⚡ serie final · ' + QR_TEC_NOM[m.tec], 'serie final');
      else tbAbrir([{ qk: cd.getAttribute('data-qk'), qi: i, j: parseInt(sj, 10) }], regNombreCorto(k.e.nombre), id + ' · serie ' + sj + ' de ' + m.nt, 'serie ' + sj);
      return;
    }
    var rt = t.closest('.jp-tb-rt');
    if(rt){
      ev.preventDefault(); ev.stopPropagation();
      var reg = rt.closest('.jp-sb-biset-reg'), r = parseInt(rt.getAttribute('data-r'), 10); if(!reg) return;
      var cards = Array.prototype.slice.call(reg.querySelectorAll(':scope > .jp-qc')), items = [], ids = [], nR = 0;
      cards.forEach(function(cd2){
        var k2 = qrCtx(cd2); if(!k2) return; var i2 = parseInt(cd2.getAttribute('data-qi'), 10), m2 = qrModelo(k2.c, k2.e, i2);
        nR = Math.max(nR, m2.nt);
        if(m2.filas[r - 1]){ items.push({ qk: cd2.getAttribute('data-qk'), qi: i2, j: r }); ids.push(qrTbId(cd2, k2)); }
      });
      if(!items.length) return;
      tbAbrir(items, ids.join(' → ') + (items.length > 1 ? ' sin pausa' : ''), (items.length === 2 ? 'Biset' : (items.length === 3 ? 'Triset' : 'Bloque')) + ' · ronda ' + r + ' de ' + nR, 'ronda ' + r);
      return;
    }
    var a = t.closest('#jpTbSheet [data-tba]'); if(!a) return;
    ev.preventDefault();
    var act = a.getAttribute('data-tba');
    if(act === 'cerrar'){ tbCerrar(); return; }
    if(act === 'ok'){ tbRegistrar(); return; }
    if(act === 'inc' && TB.items){
      var n = parseInt(a.getAttribute('data-n'), 10), f = a.getAttribute('data-f'), d = parseFloat(a.getAttribute('data-d')), x = tbItem(TB.items[n]); if(!x) return;
      var s = tbSugIt(x), v = TB.vals[n][f], base = qrNum(v !== '' ? v : (f === 'kg' ? s.kg : s.rp));
      var nv = Math.max(0, base + d);
      TB.vals[n][f] = f === 'kg' ? String(Math.round(nv * 100) / 100) : String(Math.round(nv));
      tbPintar();
    }
  });
  document.addEventListener('input', function(ev){
    var t = ev.target; if(!t || !t.closest || !t.closest('#jpTbSheet') || !TB.vals) return;
    var n = parseInt(t.getAttribute('data-n'), 10), f = t.getAttribute('data-f'); if(isNaN(n) || !f) return;
    var vq = t.value.replace(/,/g, '.').replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    if(vq !== t.value) t.value = vq;
    TB.vals[n][f] = vq;
    var stp = t.closest('.jp-tbs-stp'); if(stp){ stp.classList.toggle('aj', vq !== ''); var tag = stp.querySelector('small i'); if(tag) tag.textContent = vq !== '' ? 'ajustado' : 'sugerido'; }
  });
  document.addEventListener('keydown', function(ev){ if(ev.key === 'Escape' && TB.items) tbCerrar(); });
  /* al tocar un casillero se selecciona todo: se corrige escribiendo encima, sin borrar a mano */
  document.addEventListener('focusin', function(ev){
    var t = ev.target; if(t && t.classList && (t.classList.contains('jp-qc-kg') || t.classList.contains('jp-qc-rp'))){ try{ t.select(); }catch(e0){} }
  });
  /* al marcar la fase de la técnica (fila del tracker) la tarjeta del ejercicio se actualiza sola */
  document.addEventListener('click', function(ev){
    var t = ev.target; if(!t || !t.closest) return;
    var chk = t.closest('.jp-btn-check-native'); if(!chk) return;
    var board = chk.closest('[data-sportsboard]'); if(!board) return;
    setTimeout(function(){ Array.prototype.forEach.call(board.querySelectorAll('.jp-qc'), function(cd){ qrRefrescar(cd, true); }); }, 80);
  });
  document.addEventListener('click', function(e){
    var b = e.target && e.target.closest ? e.target.closest('#jpCerrarDiaBtn') : null;
    if(!b) return;
    e.preventDefault();
    var dc = document.getElementById('dayCompleteBtn'), wa = document.getElementById('jpWaReportBtn');
    if(dc && !dc.classList.contains('done')) dc.click();      /* completa el dia (con su aviso de bloques pendientes) y abre el reporte */
    else if(wa) wa.click();                                    /* dia ya concluido: solo reenvia el reporte */
  });
  function esMetcon(block, weekIdx){
    /* además del título/categoría estáticos, se testea la etiqueta YA
       resuelta para la semana actual -- así un bloque cuya categoría
       estática nunca dijo "metcon" igual muestra la pizarra si esta semana
       rotó a un WOD (sólo agrega casos verdaderos, nunca saca uno) */
    var etiquetaWi = (block.weekName && weekIdx != null && block.weekName[weekIdx]) || '';
    return block.category === 'metcon' ||
           /met.?con|wod|bloque c|amrap|emom|for time|chipper/i.test((block.title||'') + ' ' + (block.subtitle||'') + ' ' + etiquetaWi);
  }
  var CF_FASE_LB = { warmup:'WARM-UP & MOBILITY', strength:'STRENGTH / LIFTING', metcon:'METCON / WOD', cardio:'HYROX STATIONS', accessory:'CASH OUT / COOL DOWN', endurance:'2º TURNO · ENDURANCE' };
  /* un bloque de "strength" es SKILL / TÉCNICA cuando su contenido es técnico (gimnásticos, mecánica olímpica, drills) y no de carga pesada */
  function jpCfFaseLabel(block){
    if(block.category === 'strength'){
      var t = (block.title || '') + ' ' + (block.subtitle || '') + ' ' + (block.items || []).slice(0, 3).join(' ');
      if(/skill|t[eé]cnic|gymnastic|mechanic|kipping|handstand|muscle.?up|double.?under|efficiency|drill|progresi[oó]n/i.test(t) && !/heavy|pesad|\b1\s*rm\b|\b3\s*rm\b|build to|m[aá]x/i.test(t)) return 'SKILL / TÉCNICA';
    }
    /* accesorios: solo el bloque de cierre (estiramiento, respiracion, vuelta a la calma) es CASH OUT / COOL DOWN; el trabajo de volumen es ACCESSORY */
    if(block.category === 'accessory'){
      var ta = (block.title || '') + ' ' + (block.subtitle || '') + ' ' + (block.items || []).slice(0, 3).join(' ');
      if(!/cool.?down|cash.?out|estir|stretch|respiraci[oó]n|vuelta a la calma|movilidad final|breath/i.test(ta)) return 'ACCESSORY WORK';
    }
    return CF_FASE_LB[block.category] || 'METCON / WOD';
  }
  /* identidad visual táctica por fase (directiva): un glifo distinto por
     tipo de trabajo para que se reconozca de un vistazo, además del
     color de borde/tag ya diferenciado por CSS (.jp-cf-fase-*). */
  var CF_FASE_ICON = { warmup:'\ud83d\udd25', strength:'\ud83c\udfcb\ufe0f', metcon:'\u26a1', cardio:'\ud83c\udfc3', accessory:'\ud83e\udde9', endurance:'\ud83c\udfc3' };
  var CF_PARAM_PREFIX = { fortime:'Cap ', chipper:'Cap ', emom:'Cada ' };
  /* solo las fases de competencia/tiempo (WOD-Metcon, Hyrox Stations,
     2º Turno/Endurance) llevan campo de Score -- Warm-up, Skill/Strength y
     Accessory/Cooldown no se puntúan, no importa qué formato tenga el
     texto suelto. */
  var CF_SCORE_FASES = { metcon:1, cardio:1, endurance:1 };
  /* "2º Turno / Endurance & Running" (directiva): placeholder de registro
     propio -- el resto de las fases usa el genérico de formato/tiempo, pero
     acá el alumno carga splits/zona/distancia, no rondas+reps. */
  var CF_ENDURANCE_PH = "Tiempo, splits o distancia (ej: 5km @ 4:45 min/km o 30' Z2)";
  /* esBloqueVacioCF() es global (ver renderBlock() más arriba en el script
     anterior) -- misma función, un solo lugar donde vive la definición. */
  /* parser de la Pizarra Táctica: distingue encabezado de protocolo (termina en
     ':' o arranca con '#'), instrucción/transición de intervalo (Cap/Rest/AMRAP
     suelto, ya sin prescripción de carga) y movimiento real (reps+nombre con
     carga '@ 70kg', medida 'cm/m' o el separador estructurado 'Nombre — valor')
     -- sólo el movimiento real va en tarjeta modular con pastilla de carga. */
  function jpMdBold(t){ return String(t || '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); }
  function jpCfEsHeader(l){ return /^\s*#+\s*/.test(l) || /:\s*$/.test(l.replace(/\*\*/g, '').trim()); }
  /* directiva ("Rediseño y reubicación del texto colgado de Core") -- un
     header que declara el FORMATO del bloque ("5 Super Sets:", "Every
     4:00 x 4 Sets:", "3 Rondas:") es distinto de un header narrativo
     suelto ("Objetivo:") -- se detecta por terminar en sets/rounds/
     rondas y se renderiza como pastilla táctica propia (.cf-format-
     badge, naranja), nunca como el bloque de texto blanco genérico. */
  function jpCfEsFormatoHeader(l){
    return /\b(sets?|rounds?|rondas?)\s*:\s*$/i.test(String(l || '').replace(/\*\*/g, '').trim());
  }
  function jpCfTieneCarga(l){ return /@\s*[\d.]/.test(l) || /\d[\d.\/]*\s*(?:kg|kgs|lb|lbs|cm|m)\b/i.test(l); }
  /* directiva ("Erradicar Óvalos y Textos Sueltos") -- una palabra de
     transición entre movimientos/series ("Then:", "Rest between sets")
     no es ni un header de protocolo ni una instrucción con badge propio
     -- es un separador visual puro. Se detecta por FORMA (línea corta,
     matchea una de las frases de transición conocidas) y se renderiza
     como divisor (.jp-cf-divider), nunca como pastilla ni texto
     blanco suelto. */
  var RX_CF_TRANSICION = /^(then|rest\s*between\s*(?:sets?|rounds?)|immediately\s*after|straight\s*into|no\s*rest)\s*:?\s*$/i;
  function jpCfEsTransicion(l){ return RX_CF_TRANSICION.test(String(l || '').replace(/\*\*/g, '').trim()); }
  /* esquema de reps puro (ej. "21-15-9", "5-5-5-5-5") -- pastilla táctica
     propia, no es ni encabezado ni movimiento con carga */
  function jpCfEsEsquema(l){ return /^\d+(?:\s*[-–\/]\s*\d+){1,}$/.test(l.trim()); }
  /* resalta el número/unidad inicial de una línea de movimiento (reps,
     calorías, minutos) en Cyan Táctico -- el resto del nombre del
     ejercicio queda en blanco nítido. Sólo reconoce unidades reales
     (kg/cm/min/seg/cal/reps/rondas/%) para no comerse la primera palabra
     de ejercicios que arrancan con número pero no traen unidad (ej.
     "10 Front squats" -> "10" + "Front squats", nunca "10 Front"). */
  /* directiva crítica (limpieza visual Pizarra CrossFit): la unidad "m"
     (metros) sin límite de palabra matcheaba la primera letra de CUALQUIER
     nombre que empezara con "M" ("Muscle snatches" -> unidad "M" + resto
     "uscle snatches", pintado como "10 M uscle snatches" -- el corte de
     palabra reportado NUNCA fue un bug de CSS/word-break). El lookahead
     (?![a-zA-Z]) exige que la unidad no siga en letras -- así "300m" (fin
     de cadena) sigue reconociéndose igual que antes, pero "Muscle..."
     nunca vuelve a interpretarse como unidad + resto. */
  /* directiva ("Estandarización del número de reps") -- un rango de reps
     ("3-5 Single leg strict TTB", "21-15-9 Thrusters") antes sólo
     resaltaba el PRIMER dígito, dejando "-5"/"−15−9" colgado como texto
     suelto pegado al nombre ("3 -5 Single leg..."). El grupo 1 ahora
     también consume cualquier cantidad de segmentos "-N" repetidos, así
     "3-5"/"21-15-9" completo queda dentro del span cyan, nunca partido. */
  /* directiva maestra ("Parser de notación de box"): el número inicial admite
     rangos con guion ("160-200m", "15-20 GHD", "10-12 reps") y duales
     Hombre/Mujer con barra ("15/12 Cal row", "30/24 Cal Assault Bike",
     "21/15/9") como UNA sola entidad numérica -- antes la barra cortaba la
     cadena y el primer número quedaba solo en celeste. */
  var JP_CF_UNIT_RX = /^(\d+(?:[.,]\d+)?(?:\s*[-–\/]\s*\d+(?:[.,]\d+)?)*)\s*(?:(kgs?|lbs?|cms?|kms?|mins?|minutos?|segs?|segundos?|secs?|cals?|calories|reps?|rondas?|rounds?|mts?|metros?|%|m)(?![a-zA-Z]))?\s*(.*)$/i;
  /* directiva ("Estandarización del número de reps y display") -- "Set 1:
     5 Strict press" no arrancaba con dígito (arranca con "Set"), así que
     JP_CF_UNIT_RX nunca lo tocaba: quedaba TODO en blanco plano, sin
     pill de set ni reps resaltadas. Se detecta el prefijo "Set N:" antes
     de esa regex, se separa en su propio pill táctico (.jp-cf-set-pill)
     y el resto ("5 Strict press") se resalta recursivamente igual que
     cualquier otra línea. */
  function jpCfHighlightNum(t){
    const raw = String(t || '');
    const setM = raw.match(/^set\s*(\d+)\s*:\s*(.+)$/i);
    if(setM){
      return '<span class="jp-cf-set-pill">SET ' + setM[1] + '</span> ' + jpCfHighlightNum(setM[2]);
    }
    const m = raw.match(JP_CF_UNIT_RX);
    if(!m || !m[1]) return jpMdBold(raw);
    let num = m[1], unit = m[2] || '', rest = (m[3] || '').trim();
    /* "5x5 Back Squat", "4 x 8-10 Press": el esquema de series x repeticiones va junto, no "5 x5" */
    const mx = !unit ? rest.match(/^[x×]\s*(\d+(?:\s*[-–]\s*\d+)?)\s*(.*)$/i) : null;
    if(mx){ num = num + 'x' + mx[1].replace(/\s+/g, ''); rest = (mx[2] || '').trim(); }
    return '<span class="jp-cf-num">' + num + (unit ? ' ' + unit : '') + '</span>' + (rest ? ' ' + jpMdBold(rest) : '');
  }
  /* título del bloque: color sólido titanio, una sola pieza -- el corte
     bicolor en la primera palabra (ej. "WARM" blanco + "UP ESPECIFICO"
     naranja) partía a la mitad términos compuestos como "WARM-UP",
     "COOL-DOWN" o "BUY-IN" de forma arbitraria (splitea por el PRIMER
     espacio, sin noción de dónde termina la palabra real). Directiva
     ("Refinamiento de títulos de bloque") pide un color parejo y legible,
     nunca cortado a mitad de palabra. */
  function jpCfTituloHtml(t){
    const s = String(t || 'WOD');
    return '<span class="jp-cf-t1">' + s + '</span>';
  }
  function jpCfSplit(l){
    const i = l.indexOf(' — ');
    if(i >= 0) return { nm: l.slice(0, i).trim(), val: l.slice(i + 3).trim() };
    const m = l.match(/^(.*?)(@\s*[^()]+(?:\([^)]*\))?)\s*$/);
    if(m && m[1].trim()) return { nm: m[1].trim(), val: m[2].trim() };
    /* el número del valor puede ser un rango/dual completo ("Run 160-200m" ->
       "Run" + "160-200m"): antes el regex arrancaba en mitad del rango y
       partía "Run 160-" de un badge "200m". Exige un espacio antes del número. */
    const m2 = l.match(/^(.*?)\s+((?:\d[\d.,]*(?:\s*[-–\/]\s*\d[\d.,]*)*)\s*(?:kg|kgs|lb|lbs|cm|cms|m|km|kms|mts?|cal|cals)\b.*)$/i);
    if(m2 && m2[1].trim() && !/\s\/\s|\bmin(?:ute|uto)?s?\s*\d+\s*[:.\-]/i.test(m2[2])) return { nm: m2[1].trim(), val: m2[2].trim() };
    return { nm: l, val: '' };
  }
  /* directiva ("normalización lingüística del motor de 1RM") --
     lematización canónica: minúsculas + sin acentos + plural->singular
     (ES/EN) palabra por palabra, para que "Back squats"/"Power
     snatches"/"Clean & Jerks"/"Deadlifts"/"Push presses" resuelvan la
     MISMA familia que su forma singular ("Back squats" sin lematizar
     nunca matcheaba /\bsquat\b/ porque "squat" ahí no termina en un
     límite de palabra -- le sigue la "s" del plural). No lematiza
     palabras de 3 letras o menos (evita romper "rdl", "oly", etc.) ni
     las que ya terminan en doble "s" tipo "press"/"cross" (esas son
     singulares intactas -- su plural agrega "es": "presses"). Tras
     sacar la "s" final, sólo saca también la "e" que quedó si esa "e"
     pertenece al sufijo "-es" del plural (stem terminado en sonido
     sibilante ch/sh/s/x/z, ej. "snatches"->"snatche"->"snatch",
     "boxes"->"boxe"->"box") -- si la "e" es parte del propio nombre
     (stem con "e" muda, ej. "bridges"->"bridge", "lunges"->"lunge") se
     conserva: sacarla sin este chequeo rompía "Single-leg glute
     bridges" a "bridg" en vez de "bridge". */
  function jpLemaPalabra(w){
    const s = String(w || '');
    if(!/[a-z]s$/i.test(s) || s.length <= 3) return s;
    if(/ss$/i.test(s)) return s;
    const sinS = s.slice(0, -1);
    if(/(?:ch|sh|[sxz])e$/i.test(sinS)) return sinS.slice(0, -1);
    return sinS;
  }
  function jpLemaFrase(s){
    return String(s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .split(/\s+/)
      .map(jpLemaPalabra)
      .join(' ');
  }
  /* directiva ("Motor de 1RM exacto") -- benchmark madre: cualquier
     variante/complejo de un levantamiento olímpico o troncal comparte
     UN SOLO 1RM ("Low hang power snatch"/"Muscle snatch"/"Snatch
     balance" -> "Snatch"), en vez de pedirle al atleta un 1RM distinto
     por cada variante de la misma familia. Sin familia reconocida,
     usa el nombre tal cual llegó (ningún movimiento se queda sin poder
     cargar su propio 1RM). */
  function jpBenchmarkMadre(nombre){
    const n = jpLemaFrase(nombre);
    /* sinónimos en español: la Bóveda de PRs reconoce el mismo benchmark */
    if(/\bsnatch\b|\barranque\b/.test(n)) return 'Snatch';
    if(/\bsentadilla\s*frontal\b/.test(n)) return 'Front Squat';
    if(/\bpeso\s*muerto\b/.test(n)) return 'Deadlift';
    if(/\bpress\s*(?:de\s*)?banca\b|\bpress\s*plano\b/.test(n)) return 'Bench Press';
    if(/\bpress\s*(?:militar|estricto)\b|\bshoulder\s*press\b|\boverhead\s*press\b/.test(n)) return 'Strict Press';
    if(/\bcargada\b/.test(n) && /\benvion\b/.test(n)) return 'Clean & Jerk';
    if(/\bcargada\b/.test(n)) return 'Clean';
    if(/\benvion\b/.test(n)) return 'Jerk';
    if(/\bclean\b/.test(n) && /\bjerk\b/.test(n)) return 'Clean & Jerk';
    if(/\bclean\b/.test(n)) return 'Clean';
    if(/\bjerk\b/.test(n)) return 'Jerk';
    if(/\bfront\s*squat\b/.test(n)) return 'Front Squat';
    if(/\bback\s*squat\b|\bsquat\b/.test(n)) return 'Back Squat';
    if(/\bdeadlift\b/.test(n)) return 'Deadlift';
    if(/\bbench\b/.test(n)) return 'Bench Press';
    if(/\bstrict\s*press\b|\bpress\b/.test(n)) return 'Strict Press';
    return String(nombre || '').trim();
  }
  /* directiva -- "sin redondeos forzados": (1RM * %) / 100 exacto, sin
     forzar el resultado a múltiplos de 2.5kg. Se redondea sólo a 1
     decimal para evitar ruido de punto flotante (67.5, no
     67.49999999999999), y ese decimal se oculta cuando el resultado ya
     es un número entero (75, no 75.0). */
  function jpKgExacto(rm, pct){
    const v = Math.round((rm * pct / 100) * 10) / 10;
    return (Math.abs(v - Math.round(v)) < 0.001) ? String(Math.round(v)) : String(v);
  }
  /* directiva crítica (rediseño de acceso a videos, 2026-09) -- la
     Pizarra Táctica ya NO muestra ningún botón de video adentro de la
     fila: el texto de cada movimiento fluye limpio de punta a punta con
     su carga/distancia a la derecha, sin nada empujándolo ni rompiendo
     el flujo de lectura. El acceso a los videos se mudó por completo al
     módulo "Clips Técnicos del Bloque" (jpCfClips/jpCfClipsRowHtml, más
     abajo), que se arma una sola vez por bloque -- no por línea -- y
     sólo con coincidencias directas/exactas (nunca por aproximación,
     ver buscarVideo(nombre, true)). */
  /* lista de ejercicios de un bloque de Fuerza/Skill/Accesorios con sus series: A1 + A2 o triserie reciben un registro por ejercicio */
  /* unidad natural del movimiento: ergs = cal, traslados = mts, isometricos = seg; el resto reps */
  function unidadMatrizCF(nm){
    var n = String(nm || '').toLowerCase();
    if(/\b(?:row|rower|rowing|echo|assault|air bike|bike ?erg|ski ?erg)\b/.test(n)) return 'cal';
    if(/\b(?:carry|carries|lunges?|zancadas?|shuttle|handstand walk|hs walk|bear crawl|run|sled|yoke)\b/.test(n)) return 'mts';
    if(/\b(?:plank|plancha|l-?sit|hang|wall ?sit|hollow hold)\b/.test(n)) return 'seg';
    return '';
  }
  function jpCfListaEjercicios(lineas){
    var L = (lineas || []).map(function(x){ return String(x == null ? '' : x).trim(); }).filter(Boolean);
    var global = 0;
    L.forEach(function(l){ var m = l.match(/(\d+)\s*(?:sets?|series?|rondas?|vueltas?|rounds?)\b/i); if(m && !global) global = parseInt(m[1], 10); });
    var exs = [];
    L.forEach(function(l){
      if(!jpCfEsMovimiento(l) || jpCfEsTransicion(l) || RX_CF_OR.test(l)) return;
      var mx = l.match(/(?:^|\s)(\d+)\s*[x\u00d7]\s*\d/i), ms = l.match(/(\d+)\s*(?:sets?|series?)\b/i);
      var sets = mx ? parseInt(mx[1], 10) : (ms ? parseInt(ms[1], 10) : global);
      var nm = l.replace(/\*\*/g, '').replace(/@.*$/, '').replace(/^[A-F]\d[.)]\s*/i, '')
        .replace(/\b\d+\s*(?:sets?|series?|rondas?|rounds?)\b\s*[:x\u00d7-]?/ig, ' ')
        .replace(/\b\d+(?:\s*[-\u2013]\s*\d+)?\s*(?:reps?|repeticiones)\b/ig, ' ')
        .replace(/(?:^|\s)\d+\s*[x\u00d7]\s*\d+(?:\s*[-\u2013]\s*\d+)?/ig, ' ')
        .replace(/\s*\(.*$/, '').replace(/^[\s:\u00b7\-\u2013\u2014]+|[\s:\u00b7\-\u2013\u2014]+$/g, '').replace(/\s{2,}/g, ' ').trim();
      var um = l.match(/(?:\d+\s*[x\u00d7]\s*\d+(?:\s*[-\u2013]\s*\d+)?|\d+)\s*(seg(?:undos?)?|min|mts?|metros?|cal(?:or[i\u00ed]as?)?|s|m)\b/i), und = '';
      if(um){ var uu = um[1].toLowerCase(); und = /^s/.test(uu) ? 'seg' : (/^min/.test(uu) ? 'min' : (/^cal/.test(uu) ? 'cal' : 'mts')); }
      nm = nm.replace(/^(?:seg(?:undos?)?|min|mts?|metros?|cal(?:or[i\u00ed]as?)?)\b\s*/i, '').trim();
      if(!und && !/\breps?\b/i.test(l)) und = unidadMatrizCF(nm);
      if(!nm || nm.length > 48 || !(sets > 0 && sets <= 10)) return;
      exs.push({ nombre: nm, sets: sets, unidad: und || 'reps' });
    });
    return exs.slice(0, 6);
  }
  window.jpCfListaEjercicios = jpCfListaEjercicios;
  /* texto de estrategia/pautas/escalado pegado dentro de la prescripcion: sale de la tarjeta de trabajo y va al acordeon */
  function jpCfSepararMeta(lineas){
    var out = { lineas: [], objetivo: '', tips: '', pacing: '', escalado: '' }, campo = '';
    (lineas || []).forEach(function(raw){
      var t = String(raw == null ? '' : raw).trim();
      var m = t.match(/^[\s*_>\-\u2013\u2022\u00b7]*\[\s*(objetivo[^\]]*|estrategia[^\]]*|pautas[^\]]*|coaching[^\]]*|tips?|pacing[^\]]*|escalado[^\]]*|rx\s+alternativo)\s*\]\s*:?\s*(.*)$/i);
      if(m){
        var e = m[1].toLowerCase();
        campo = /objetivo/.test(e) ? 'objetivo' : (/pacing/.test(e) ? 'pacing' : (/escalado|rx/.test(e) ? 'escalado' : 'tips'));
        if(m[2].trim()) out[campo] += (out[campo] ? '\n' : '') + m[2].trim();
        return;
      }
      var mi = t.match(/^[\s*_>\-\u2013\u2022\u00b7]*(?:[^A-Za-z0-9\u00c0-\u00ff\s\[]{1,6}\s*)?(estrategia(?:\s+de\s+progresi[o\u00f3]n)?|progresi[o\u00f3]n|pacing(?:\s+(?:general|sugerido))?|coaching(?:\s+tips?)?|tips?(?:\s*\/\s*pautas)?|pautas?(?:\s+t[e\u00e9]cnicas?)?|gesti[o\u00f3]n\s+del\s+tiempo(?:\s*\/\s*transiciones)?|transiciones|foco(?:\s+del\s+(?:coach|bloque))?|criterio(?:\s+del\s+coach)?|cuidado|claves?|errores?\s+comunes|objetivo)\s*:\s*(\S.*)$/i);
      if(mi){
        var ei = mi[1].toLowerCase(), ci = /objetivo/.test(ei) ? 'objetivo' : (/^pacing/.test(ei) ? 'pacing' : 'tips');
        var txi = mi[2].trim();
        if(ci === 'tips' && /estrategia|progresi|gesti|transicion|cuidado|errores|claves?/.test(ei)) txi = mi[1].replace(/\s+/g, ' ').toUpperCase() + ': ' + txi;
        out[ci] += (out[ci] ? '\n' : '') + txi;
        campo = '';
        return;
      }
      if(campo){
        if(/^\s*(?:\d|@|\[)/.test(t)) campo = '';
        else { out[campo] += (out[campo] ? '\n' : '') + t; return; }
      }
      out.lineas.push(raw);
    });
    return out;
  }
  function jpCfEsMovimiento(l){
    if(jpCfEsHeader(l)) return false;
    if(jpCfEsEsquema(l)) return false;
    if(/^\s*\d+\.\s/.test(l) && l.indexOf(' — ') < 0 && !jpCfTieneCarga(l)) return false;
    if(esLineaDirectiva(l) && !jpCfTieneCarga(l)) return false;
    if(/\b(amrap|emom|rest|descanso)\b/i.test(l) && !jpCfTieneCarga(l) && l.indexOf(' — ') < 0) return false;
    return true;
  }
  /* directiva ("Resuelve dinámicamente referencias de carga entre
     bloques") -- dado el texto crudo de una línea, intenta resolver su
     carga en kg: primero un "@ N%" contra el 1RM del atleta (mismo
     criterio que ya usa jpCfFila más abajo), si no un "@ Xkg"/"Xkg"
     literal. Extraído a función propia para que jpCfCargaBloque()
     pueda reusarlo sobre CUALQUIER bloque del día, no sólo el que se
     está pintando en este momento. */
  /* directiva ("Resolución Reactiva de Cargas Cruzadas") -- devuelve
     { kg, benchmark, liftKey } en vez de sólo el número: cuando la
     línea es "@ N%" pero el atleta TODAVÍA no cargó su 1RM, kg queda
     en null pero benchmark/liftKey sí viajan -- eso es lo que permite
     ofrecer el badge interactivo "@ Usar carga Bloque N" (abre el
     mismo modal de 1RM) en vez del mensaje de depuración "sin
     resolver" que veía el alumno antes. */
  function jpCfResolverKgLinea(l){
    const partes = jpCfSplit(l);
    if(!partes.val) return null;
    const pctMatch = partes.val.match(/^@\s*(\d{1,3}(?:[.,]\d+)?)(?:\s*[-–]\s*(\d{1,3}(?:[.,]\d+)?))?\s*%(?:\s*1\s*rm)?/i);
    if(pctMatch){
      const pctLo = parseFloat(pctMatch[1].replace(',', '.'));
      /* rango ("@ 70-80%"): para el tonelaje/cargas cruzadas se usa el punto medio */
      const pct = pctMatch[2] ? (pctLo + parseFloat(pctMatch[2].replace(',', '.'))) / 2 : pctLo;
      const liftBase = partes.nm.replace(/^\d+\s*/, '') || partes.nm;
      const benchmark = jpBenchmarkMadre(liftBase);
      const liftKey = nrmHist(benchmark);
      const propio = state.oneRM && state.oneRM[liftKey];
      return { kg: (propio > 0) ? parseFloat(jpKgExacto(propio, pct)) : null, benchmark: benchmark, liftKey: liftKey };
    }
    const kgMatch = partes.val.match(/(\d+(?:[.,]\d+)?)\s*kg/i);
    if(kgMatch) return { kg: parseFloat(kgMatch[1].replace(',', '.')), benchmark: null, liftKey: null };
    return null;
  }
  /* directiva ("Resolución Reactiva de Cargas Cruzadas") -- bug real
     encontrado: "@ carga bloque 1" siempre leía day.blocks[0] (el
     PRIMER bloque del día, casi siempre el Warm-up, sin carga que
     resolver), nunca el bloque que el coach realmente escribe como
     "BLOQUE 1" en su título -- el índice del array no tiene por qué
     coincidir con el número que el coach le puso al bloque a mano
     ("BLOQUE 1: BACK SQUAT WAVE" bien podría ser el SEGUNDO bloque del
     día, después del Warm-up). Ahora se busca PRIMERO un bloque cuyo
     título declare "Bloque N"/"Block N" explícitamente; si ninguno lo
     hace, cae al índice posicional (1-indexado) como respaldo. */
  function jpCfCargaBloque(dayId, n){
    const day = (typeof DAYS !== 'undefined') ? DAYS.find(function(d){ return d.id === dayId; }) : null;
    if(!day || !day.blocks) return null;
    const rxTitulo = new RegExp('\\b(?:bloque|block)\\s*' + n + '\\b', 'i');
    let block = day.blocks.find(function(b){ return b.title && rxTitulo.test(b.title); });
    if(!block) block = day.blocks[n - 1];
    if(!block || !block.items) return null;
    let fallback = null;
    for(let i = 0; i < block.items.length; i++){
      const r = jpCfResolverKgLinea(String(block.items[i] || ''));
      if(!r) continue;
      if(r.kg != null) return r;
      if(!fallback && r.benchmark) fallback = r;
    }
    return fallback;
  }
  /* directiva ("Cronómetro de Descanso Integrado") -- extrae segundos de
     una línea de rest/descanso en cualquiera de los formatos que ya usa
     el coach: "mm:ss" (Rest 1:30), "N seg"/"Ns" (Descanso 90 seg) o "N
     min" (Rest 1.5 min). null si la línea menciona rest/descanso pero
     no trae una duración reconocible -- ahí se sigue mostrando como
     texto plano, nunca un botón que no sabría cuánto contar. */
  function jpCfParsearDescanso(l){
    const t = String(l || '');
    if(!/\brest\b|\bdescanso\b/i.test(t)) return null;
    let m = t.match(/(\d{1,2}):(\d{2})/);
    if(m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    m = t.match(/(\d+(?:[.,]\d+)?)\s*(?:seg|segundos?|s)\b/i);
    if(m) return Math.round(parseFloat(m[1].replace(',', '.')));
    m = t.match(/(\d+(?:[.,]\d+)?)\s*(?:min|minutos?)\b/i);
    if(m) return Math.round(parseFloat(m[1].replace(',', '.')) * 60);
    return null;
  }
  /* directiva ("Rediseño Premium del Rest Timer") -- el botón "[ ⏱️
     INICIAR REST 1:30 ]" reusa window.CoachTV.rest/toggle/sumar/parar/
     estado(seg,etiqueta), el MISMO motor de cuenta regresiva compartido
     (persistencia, resync en background, beep, vibración, notificación)
     que ya usa Bodybuilding al tildar una serie -- nunca un timer nuevo.
     La diferencia: acá NO se muestra la barra flotante (#restHud, 3er
     arg "true") -- el PROPIO botón se convierte en el timer in-situ,
     espejando el estado del motor en cada tick (window.CoachTV.mirror),
     con 3 estados: Reposo -> Corriendo (cuenta + barra de progreso +
     micro-controles +30s/✕) -> Listo (auto-revierte a Reposo, igual que
     ya hacía la barra flotante). Si la duración no es reconocible, cae
     al badge de texto plano de siempre (comportamiento sin cambios). */
  let jpCfRestBoundWrap = null;
  function jpCfRestMMSS(seg){
    const s = Math.max(0, Math.round(seg || 0));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }
  function jpCfRestPintarIdle(wrap){
    wrap.classList.remove('running', 'listo');
    wrap.innerHTML = '<button type="button" class="jp-cf-rest-main">' + JP_IC_CRONO + ' INICIAR REST ' + jpCfRestMMSS(parseInt(wrap.dataset.restSec, 10)) + '</button>';
  }
  function jpCfRestPintarRunning(wrap, st){
    wrap.classList.add('running'); wrap.classList.remove('listo');
    const pct = st.total > 0 ? Math.max(0, Math.min(1, st.left / st.total)) : 0;
    wrap.style.setProperty('--rp', (pct * 100).toFixed(1) + '%');
    wrap.innerHTML =
      '<button type="button" class="jp-cf-rest-main">' + (st.running ? JP_IC_PAUSA : JP_IC_PLAY) + ' ' + jpCfRestMMSS(st.left) + '</button>' +
      '<button type="button" class="jp-cf-rest-plus">+30s</button>' +
      '<button type="button" class="jp-cf-rest-x">&#10005;</button>';
  }
  function jpCfRestPintarListo(wrap){
    wrap.classList.remove('running'); wrap.classList.add('listo');
    wrap.innerHTML = '<span class="jp-cf-rest-listo">&#10003; LISTO PARA LA SIGUIENTE RONDA</span>';
  }
  /* espejo del motor: se registra vía window.CoachTV.mirror() apenas se
     arranca el primer descanso desde un bloque de CrossFit (ver el
     delegado de click más abajo) y a partir de ahí se llama en CADA
     tick del motor compartido, arranque o cierre haya sido. Si el wrap
     vinculado quedó desmontado (cambio de día/pestaña que re-renderiza
     la Pizarra), se lo intenta re-ubicar por etiqueta entre los widgets
     actualmente en pantalla -- autocuración sin tocar el motor. */
  function jpCfRestOnTick(st){
    let wrap = jpCfRestBoundWrap;
    if(wrap && !document.body.contains(wrap)) wrap = null;
    if(!wrap && (st.active || st.finished)){
      const cands = document.querySelectorAll('.jp-cf-rest[data-rest-lb]');
      for(let i = 0; i < cands.length; i++){ if(cands[i].dataset.restLb === st.label){ wrap = cands[i]; break; } }
    }
    jpCfRestBoundWrap = wrap;
    if(!wrap) return;
    if(st.finished) jpCfRestPintarListo(wrap);
    else if(st.active) jpCfRestPintarRunning(wrap, st);
    else jpCfRestPintarIdle(wrap);
  }
  function jpCfRestBadge(l){
    const seg = jpCfParsearDescanso(l);
    if(seg == null || seg <= 0) return null;
    /* directiva maestra ("Umbral de descansos cortos"): menos de 30 s NO lleva
       botón de timer (desbloquear el teléfono cuesta más que la pausa):
       sólo una indicación textual inline. */
    if(seg < 30) return '<div class="jp-cf-row jp-cf-micro-row"><span class="jp-micro-pausa">' + seg + 's micro-pausa</span></div>';
    return '<div class="jp-cf-row jp-cf-rest-row"><div class="jp-cf-rest" data-rest-sec="' + seg + '" data-rest-lb="' + String(l).replace(/"/g, '') + '">' +
      '<button type="button" class="jp-cf-rest-main">' + JP_IC_CRONO + ' INICIAR REST ' + jpCfRestMMSS(seg) + '</button></div></div>';
  }
  /* =========================================================
     directiva maestra ("Parser de notación de box"): pre-proceso de las
     líneas de una Pizarra ANTES de pintar fila por fila --
       · tarjeta de notas tácticas (esquemas de carga / opciones / escalados)
       · escaleras y pirámides compactas (10-9-8...-1)
       · micro-pausas (< 30 s) fusionadas inline con el ejercicio previo
     y contexto de bloque por intervalo ("Every X:XX"), donde no se mezclan
     descansos fijos con el running clock.
  ========================================================= */
  var jpCfIntervaloCtx = false;
  var RX_CF_NOTA_INI = /^\s*(?:[-•*]\s*)?(?:esquema\s+de\s+cargas?|opci[oó]n(?:es)?\b|escalad[oa]s?\b|scaled?\b|scaling\b|rx\+?\s*:|intermedi[oa]\b|nota\b|note\b)/i;
  function jpCfEsNotaInicio(l){
    var t = String(l || '').replace(/\*\*/g, '').trim();
    if(RX_CF_NOTA_INI.test(t)) return true;
    var arrobas = (t.match(/@/g) || []).length;
    if(/\b(?:rounds?|rondas?)\s*\d+(?:\s*[-–]\s*\d+)?\s*:/i.test(t) && arrobas >= 1) return true;
    return arrobas >= 2 && t.length > 50 && !/^\d/.test(t);
  }
  function jpCfEsNotaCont(l){
    var t = String(l || '').trim();
    if(!t) return false;
    if(RX_CF_NOTA_INI.test(t) || RX_CF_OR.test(t)) return false;
    return /^(?:[-•*]|\(|rounds?\b|rondas?\b|r\d\b|round\s*\d|\d+\s*[-–]\s*\d+\s*:)/i.test(t) ||
           /^[a-záéíóúñ]/.test(t) || (/@/.test(t) && !/^\d/.test(t));
  }
  function jpCfMicroRest(s){
    var t = String(s || '').replace(/\*\*/g, '').trim();
    if(!/^(?:rest|descanso)\b/i.test(t) || t.length > 24) return 0;
    var seg = jpCfParsearDescanso(t);
    return (seg > 0 && seg < 30) ? seg : 0;
  }
  /* escalera: ≥4 repeticiones consecutivas del mismo movimiento (o de un ciclo
     de 2-3 movimientos) con reps que suben/bajan de a 1 -> UNA fila por
     movimiento en notación estándar ("10-9-8-7-6-5-4-3-2-1 Burpees") */
  function jpCfDetectarEscalera(L, i){
    function parse(s){
      var m = String(s || '').match(/^\s*(\d+)\s+(?!x\b)(.+)$/i);
      if(!m) return null;
      var resto = m[2].trim();
      return { n: parseInt(m[1], 10), resto: resto, base: resto.split(/\s+(?:@|—|-)\s*/)[0].toLowerCase().replace(/\s+/g, ' ') };
    }
    for(var p = 1; p <= 3; p++){
      var cab = [];
      for(var j = 0; j < p; j++){ var q = parse(L[i + j]); if(!q){ cab = null; break; } cab.push(q); }
      if(!cab) continue;
      var nums = cab.map(function(){ return []; }), ciclos = 0;
      for(var k = i; k + p <= L.length; k += p){
        var ok = true, grp = [];
        for(var j2 = 0; j2 < p; j2++){ var q2 = parse(L[k + j2]); if(!q2 || q2.base !== cab[j2].base){ ok = false; break; } grp.push(q2); }
        if(!ok) break;
        grp.forEach(function(g, ix){ nums[ix].push(g.n); }); ciclos++;
      }
      if(ciclos < 3) continue;
      var paso = nums[0][1] - nums[0][0];
      if(!paso) continue;
      var usar = ciclos;
      for(var t = 2; t < ciclos; t++){ if((nums[0][t] - nums[0][t - 1]) * paso <= 0){ usar = t; break; } }
      if(usar < (Math.abs(paso) === 1 ? 4 : 3)) continue;
      var filas = cab.map(function(c, ix){
        var serie = nums[ix].slice(0, usar);
        var etiqueta = serie.length <= 12 ? serie.join('-') : (serie[0] + ' to ' + serie[serie.length - 1]);
        return etiqueta + ' ' + c.resto;
      });
      return { filas: filas, next: i + usar * p };
    }
    return null;
  }
  var RX_CF_OR = /^[\s\-–—*_]*(?:or|o|ó|o\s+bien)[\s\-–—*_]*$/i;
  /* tarjeta de nota táctica: las plecas "|" se desglosan en una lista con
     sangría (Rounds 1–2 / 3–4 / 5+), la directiva final lleva flecha sutil (↳)
     y las opciones intermedias/escaladas van con borde cian tenue (jerarquía
     secundaria, distinta del borde ámbar del esquema RX) */
  function jpCfNotaHtml(grupo){
    var alt = /^\s*(?:[-•*]\s*)?(?:opci[oó]n|escalad|scaled?|scaling|intermedi)/i.test(String(grupo[0]).replace(/\*\*/g, ''));
    var toks = [];
    grupo.forEach(function(l){ String(l).split('|').forEach(function(p){ p = p.trim(); if(p) toks.push(p); }); });
    if(!toks.length) return '';
    var titulo = '';
    var m0 = toks[0].match(/^(.*?)\s*\(\s*(.*)$/);
    if(m0 && m0[1]){ titulo = m0[1]; toks[0] = m0[2]; }
    else {
      var mc = toks[0].match(/^([^:]{2,40}):\s*(.+)$/);
      if(mc && !/^(?:rounds?|rondas?|r\d)/i.test(toks[0])){ titulo = mc[1]; toks[0] = mc[2]; }
    }
    toks[toks.length - 1] = toks[toks.length - 1].replace(/\)\s*$/, '');
    toks = toks.filter(Boolean);
    var fmt = function(t){
      return jpMdBold(String(t)
        .replace(/(rounds?|rondas?)\s*(\d+)\s*-\s*(\d+)/ig, '$1 $2–$3')
        .replace(/(\d)(kg|lbs?)\b/ig, '$1 $2'));
    };
    var esRound = function(t){ return /^(?:rounds?|rondas?|r\d)/i.test(t); };
    var lead = [], items = [], notas = [];
    toks.forEach(function(t){
      if(esRound(t)) items.push(t);
      else if(items.length) notas.push(t);
      else lead.push(t);
    });
    return '<div class="jp-cf-notecard' + (alt ? ' alt' : '') + '">' +
      (titulo ? '<div class="jp-cf-nt">' + jpMdBold(titulo) + '</div>' : '') +
      lead.map(function(t){ return '<div class="jp-cf-nlead">' + fmt(t) + '</div>'; }).join('') +
      (items.length ? '<ul class="jp-cf-nl">' + items.map(function(t){ return '<li>' + fmt(t) + '</li>'; }).join('') + '</ul>' : '') +
      notas.map(function(t){ return '<div class="jp-cf-nstrat">&#8627; ' + fmt(t) + '</div>'; }).join('') +
    '</div>';
  }
  function jpCfRenderLineas(lineas, dayId){
    var L = lineas.map(function(x){ return String(x == null ? '' : x).trim(); });
    var out = [], i = 0;
    while(i < L.length){
      var l = L[i];
      /* 1) esquemas de carga / opciones / escalados: tarjeta de notas continua */
      if(jpCfEsNotaInicio(l)){
        var j = i, grupo = [], prof = 0;
        do {
          var cur = L[j]; grupo.push(cur);
          prof += (cur.match(/\(/g) || []).length - (cur.match(/\)/g) || []).length;
          j++;
        } while(j < L.length && grupo.length < 8 && (prof > 0 || jpCfEsNotaCont(L[j])));
        out.push(jpCfNotaHtml(grupo));
        i = j; continue;
      }
      /* 2) escaleras y pirámides */
      var esc2 = jpCfDetectarEscalera(L, i);
      if(esc2){ esc2.filas.forEach(function(f){ out.push(jpCfFila(f, dayId)); }); i = esc2.next; continue; }
      /* 3) micro-pausa (< 30 s) fusionada con el ejercicio anterior */
      var sig = (i + 1 < L.length) ? jpCfMicroRest(L[i + 1]) : 0;
      if(sig && jpCfEsMovimiento(l)){ out.push(jpCfFila(l, dayId, { microRest: sig })); i += 2; continue; }
      out.push(jpCfFila(l, dayId)); i++;
    }
    /* un unico boton "INICIAR REST" por bloque (el primero): los demas descansos del bloque no repiten el boton */
    var restVisto = false;
    out = out.filter(function(h){
      if(typeof h === 'string' && h.indexOf('jp-cf-rest-row') >= 0){ if(restVisto) return false; restVisto = true; }
      return true;
    });
    return out.join('');
  }
  /* línea de descanso: sin duración reconocible ("Rest tiempo restante") o
     dentro de un bloque gobernado por un running clock (Every X:XX) es una
     línea de cierre tenue (itálica), nunca un botón huérfano. */
  function jpCfRestFila(l){
    var t = String(l || '').replace(/\*\*/g, '').trim();
    var esRest = /^\s*(?:rest|descanso)\b/i.test(t);
    var seg = jpCfParsearDescanso(l);
    if(esRest && (seg == null || jpCfIntervaloCtx)){
      /* micro-barra técnica con icono, gris acero: "⏱️ Rest: tiempo restante hasta completar el intervalo" */
      var resto = t.replace(/^\s*(?:rest|descanso)\b\s*:?\s*/i, '').trim();
      var txt = (!resto || /tiempo\s+restante|remaining|time\s+left/i.test(resto))
        ? 'Rest: tiempo restante hasta completar el intervalo'
        : 'Rest: ' + resto;
      return '<div class="jp-cf-row jp-cf-closing jp-cf-restbar"><span>' + jpMdBold(txt) + '</span></div>';
    }
    return jpCfRestBadge(l);
  }
  /* "20s on / 40s off" (y variantes work/rest): estructura de intervalos en un
     solo chip -- el trabajo activo nunca se pierde detrás de un botón de rest */
  var RX_CF_ONOFF = /(\d+(?:[.,]\d+)?)\s*(s|sec|secs|seg|segs|min|mins)?\s*(?:on|work|trabajo)\b\s*[\/\-–,;·|+&]*\s*(\d+(?:[.,]\d+)?)\s*(s|sec|secs|seg|segs|min|mins)?\s*(?:off|rest|descanso)\b/i;
  /* calificadores de lado: "(Right)"/"(Left)" se quedan pegados al nombre */
  var RX_CF_LADO = /\s*\((right|left|derecha?|izquierd[ao]|der|izq|each|each side|per side|por lado|c\/u)\)/i;
  function jpCfFila(raw, dayId, extra){
    /* directiva ("Alineación Táctica en Movilidad y Cooldown") -- una
       viñeta manual tipeada por el coach ("✦ Foam roll — 2 min") queda
       desalineada porque es sólo texto suelto pegado al nombre -- se
       recorta acá, ANTES de cualquier clasificación, así la fila usa
       siempre la sangría/alineación uniforme que ya da .jp-cf-row (flex),
       nunca el carácter crudo del coach. */
    let l = String(raw || '').trim().replace(/^[\u2726\u2022\u2023\u25aa\u00b7\u2043]\s*/, '');
    if(RX_CF_OR.test(l)){
      return '<div class="jp-cf-or"><span>&mdash; O BIEN &mdash;</span></div>';
    }
    if(jpCfEsTransicion(l)){
      return '<div class="jp-cf-divider"><span>' + l.replace(/:\s*$/, '').toUpperCase() + '</span></div>';
    }
    if(jpCfEsHeader(l)){
      const txt = l.replace(/^\s*#+\s*/, '');
      if(jpCfEsFormatoHeader(txt)){
        /* directiva ("Erradicación de Óvalos") -- nunca ":" colgado al
           final del chip: "⚡ 5 SETS", jamás "⚡ 5 SETS:". */
        return '<div class="cf-format-badge">\u26a1 ' + jpMdBold(txt).replace(/:\s*$/, '') + '</div>';
      }
      return '<div class="jp-cf-row jp-cf-header">' + jpMdBold(txt) + '</div>';
    }
    if(jpCfEsEsquema(l)){
      return '<div class="jp-cf-row jp-cf-scheme">' + l.trim() + '</div>';
    }
    const mOnOff = l.match(RX_CF_ONOFF);
    if(mOnOff){
      const uni = function(u){ return /^min/i.test(u || '') ? 'min' : 's'; };
      const resto = l.replace(mOnOff[0], ' ').replace(/^[\s\-–—:·|,;]+|[\s\-–—:·|,;]+$/g, '').trim();
      return '<div class="jp-cf-row jp-cf-interval"><span class="jp-cf-rn">' + (resto ? jpCfHighlightNum(resto) : 'Intervalos') + '</span>' +
        '<span class="jp-cf-rv"><span class="jp-cf-time">' + mOnOff[1] + uni(mOnOff[2]) + ' ON &middot; ' + mOnOff[3] + uni(mOnOff[4]) + ' OFF</span></span></div>';
    }
    if(/^\s*\d+\.\s/.test(l) && l.indexOf(' — ') < 0 && !jpCfTieneCarga(l)){
      return '<div class="jp-cf-row jp-cf-badge">' + jpMdBold(l) + '</div>';
    }
    if(esLineaDirectiva(l) && !jpCfTieneCarga(l)){
      return jpCfRestFila(l) || '<div class="jp-cf-row jp-cf-badge">' + jpMdBold(l) + '</div>';
    }
    /* objetivo/transición de intervalo suelto (ej: "90 Seg AMRAP") -- lleva
       AMRAP/EMOM/rest en el cuerpo (no sólo al inicio, por eso esLineaDirectiva
       no lo agarra) pero no prescribe carga ni movimiento puntual */
    if(/\b(amrap|emom|rest|descanso)\b/i.test(l) && !jpCfTieneCarga(l) && l.indexOf(' — ') < 0){
      return jpCfRestFila(l) || '<div class="jp-cf-row jp-cf-badge">' + jpMdBold(l) + '</div>';
    }
    let lado = '';
    const mLado = l.match(RX_CF_LADO);
    if(mLado){ lado = mLado[1]; l = l.replace(RX_CF_LADO, ' ').replace(/\s{2,}/g, ' ').trim(); }
    const partes = jpCfSplit(l);
    /* directiva ("Resolución activa de % 1RM a Kilogramos"): "@ 76%" (con
       o sin el "(~XX kg)" que compile() ya haya resuelto con la marca
       del COACH) se vuelve un botón tocable -- si el atleta cargó su
       propio 1RM para este movimiento (state.oneRM, ver jpAbrirPct1RM
       más abajo), ese valor manda sobre la estimación del coach y
       recalcula EN VIVO, sin recompilar nada. */
    /* directiva ("Resolución Reactiva de Cargas Cruzadas"): "@ carga
       bloque 1" (o "@ carga del bloque 1") lee el peso ya resuelto (por
       % de 1RM o literal en kg) en el Bloque 1 del MISMO día y lo
       muestra directo en kg, en cian táctico -- tres estados posibles:
       (a) resuelto -> span "@ X kg"; (b) el bloque referenciado tiene
       un % de 1RM pero el atleta todavía no cargó el suyo -> botón
       tocable "@ Usar carga Bloque N" que abre el mismo modal de 1RM
       (reusa .jp-cf-pct y su delegación de click, ver jpAbrirPct1RM);
       (c) el bloque no existe o no tiene ninguna carga referenciable ->
       span neutro "@ -- kg". Nunca el mensaje de depuración "sin
       resolver" que veía el alumno antes. */
    const refBloqueMatch = partes.val && partes.val.match(/^@\s*carga\s*(?:del\s*)?bloque\s*(\d+)/i);
    const pctMatch = partes.val && partes.val.match(/^@\s*(\d{1,3}(?:[.,]\d+)?)(?:\s*[-–]\s*(\d{1,3}(?:[.,]\d+)?))?\s*%(?:\s*1\s*rm)?/i);
    let valHtml = jpMdBold(partes.val);
    /* directiva ("Separación de Metadatos") -- una línea con DOS o más
       etiquetas "@" (ej. "@ 45/30kg @ 60s") no es un único valor: es
       carga + tiempo, cada uno en su propia pastilla táctica. Sólo entra
       acá cuando hay 2+ "@" en partes.val -- el caso de un único "@"
       (pctMatch/refBloqueMatch/kg-lb de abajo, todos probados y en
       producción) sigue exactamente el mismo camino de siempre. */
    const multiAtMatch = partes.val && (partes.val.match(/@/g) || []).length >= 2;
    if(multiAtMatch){
      valHtml = partes.val.split(/(?=@)/).map(function(seg){
        seg = seg.trim().replace(/^@\s*/, '');
        if(!seg) return '';
        if(/^\d+\s*(?:seg|segundos|s|sec|min|minutos)\b/i.test(seg) || /^\u23f1/.test(seg)){
          return '<span class="jp-cf-time">' + jpMdBold(seg.replace(/^\u23f1\ufe0f?\s*/, '')) + '</span>';
        }
        return '<span class="jp-cf-load">' + jpMdBold(seg) + '</span>';
      }).join(' ');
    } else if(refBloqueMatch){
      const nBloque = parseInt(refBloqueMatch[1], 10);
      const ref = jpCfCargaBloque(dayId, nBloque);
      if(ref && ref.kg != null){
        valHtml = '<span class="jp-cf-refload">@ ' + ref.kg + ' kg</span>';
      } else if(ref && ref.benchmark){
        valHtml = '<button type="button" class="jp-cf-pct" data-pct-lift="' + ref.benchmark.replace(/"/g,'') + '" data-pct-key="' + ref.liftKey + '">@ Usar carga Bloque ' + nBloque + '</button>';
      } else {
        valHtml = '<span class="jp-cf-refload jp-cf-refload-empty">@ -- kg</span>';
      }
    } else if(pctMatch){
      const pct = parseFloat(pctMatch[1].replace(',', '.'));
      const pctHi = pctMatch[2] ? parseFloat(pctMatch[2].replace(',', '.')) : null;
      const con1RM = /1\s*rm/i.test(pctMatch[0]);
      /* directiva -- la clave del 1RM no puede incluir el conteo de reps
         de ESA serie puntual ("5 Back squat" vs "3 Back squat"): son el
         mismo levantamiento, un solo 1RM cargado por el atleta tiene que
         aplicar a TODAS las filas del bloque que lo usan, no sólo a la
         que tocó primero. */
      const liftBase = partes.nm.replace(/^\d+\s*/, '') || partes.nm;
      /* directiva ("Motor de 1RM exacto") -- la clave y el nombre que ve
         el atleta en el modal son el benchmark madre (Snatch/Clean &
         Jerk/Back Squat/Deadlift/...), no el texto literal del complejo:
         "Low hang power snatch" y "Muscle snatch" comparten el 1RM de
         "Snatch", nunca piden uno cada uno. */
      const benchmark = jpBenchmarkMadre(liftBase);
      const liftKey = nrmHist(benchmark);
      const propio = state.oneRM && state.oneRM[liftKey];
      let kgTxt;
      if(propio > 0){
        /* "@ 70-80% 1RM (85 - 97.5 kg)": ambos extremos con el 1RM del atleta */
        kgTxt = pctHi != null
          ? ' (' + jpKgExacto(propio, pct) + ' - ' + jpKgExacto(propio, pctHi) + ' kg)'
          : ' (' + jpKgExacto(propio, pct) + ' kg)';
      } else {
        const resto = partes.val.slice(pctMatch[0].length).trim();
        kgTxt = resto ? ' ' + resto : '';
      }
      valHtml = '<button type="button" class="jp-cf-pct" data-pct-lift="' + benchmark.replace(/"/g,'') + '" data-pct-key="' + liftKey + '">@ ' + (pctHi != null ? pct + '-' + pctHi : pct) + '%' + (con1RM ? ' 1RM' : '') + kgTxt + '</button>';
    } else if(partes.val && /^@?\s*[\d.]+(?:\s*\/\s*[\d.]+)?\s*(?:kg|kgs|lbs?)\b/i.test(partes.val)){
      /* directiva ("Integración del Amarillo Oro de Branding") -- carga
         literal en kg/lb ("@ 43/29kg", "42.5/30kg") sin porcentaje ni
         referencia cruzada: mismo tratamiento visual de pastilla que
         .jp-cf-pct/.jp-cf-refload (ver CSS .jp-cf-load), pero como texto
         plano (no hay 1RM ni bloque que resolver, ya es un valor final). */
      valHtml = '<span class="jp-cf-load">' + jpMdBold(partes.val) + '</span>';
    } else if(partes.val && /^@?\s*rpe\s*\d+(?:\.\d+)?/i.test(partes.val)){
      /* directiva ("Regex de Oro: cargas reales únicamente") -- "@ RPE 8"
         es una carga de esfuerzo real (igual que un %/kg), va en oro --
         nunca el texto descriptivo genérico de abajo (dimensiones,
         indicaciones sin número de esfuerzo real: "@ cuadrado 1x1m", "@
         suave"), que ahora queda neutro por default en .jp-cf-rv (ver
         CSS, ya no es oro por defecto). */
      valHtml = '<span class="jp-cf-load">' + jpMdBold(partes.val) + '</span>';
    } else if(partes.val && /^@?\s*\d+\s*(?:min|minutos?|s|sec|seg|segundos?)\s*$/i.test(partes.val)){
      /* directiva ("Alineación Táctica en Movilidad y Cooldown") -- un
         tiempo prescrito suelto ("— 2 min", "— 60 s", típico de Warm-up/
         Cooldown) se extrae a su propia pastilla de tiempo a la derecha,
         mismo tratamiento visual que .jp-cf-time del split de "@ ... @
         ..." de arriba -- nunca texto plano gris sin jerarquía. */
      valHtml = '<span class="jp-cf-time">' + jpMdBold(partes.val.replace(/^@\s*/, '')) + '</span>';
    } else if(partes.val && partes.val.length <= 48 && /^\[.*\]$|^[~(]|\d/.test(partes.val) &&
              !/^[\d.,]+(?:\s*[-–\/]\s*[\d.,]+)*\s*(?:m|km|mts?|cm|kg|cal|cals)$/i.test(partes.val)){
      /* nota auxiliar corta ("[ 5cm déficit ]", "~30% Back Squat"): píldora de
         carbón sólido con texto ámbar técnico, nunca un borde de alerta */
      valHtml = '<span class="jp-cf-nota-chip">' + jpMdBold(partes.val) + '</span>';
    }
    /* micro-pausa fusionada: "Dead hang @ 10s" + "Rest 10s" -> "10s hold · 10s rest" */
    const micro = extra && extra.microRest;
    if(micro){
      const mt = partes.val && partes.val.match(/^@?\s*(\d+(?:[.,]\d+)?)\s*(?:s|seg|sec|segundos?)$/i);
      if(mt) valHtml = '<span class="jp-cf-time">' + mt[1] + 's hold &middot; ' + micro + 's rest</span>';
      else valHtml = (partes.val ? valHtml + ' ' : '') + '<span class="jp-cf-time">' + micro + 's rest</span>';
    }
    const esComplex = partes.nm.indexOf(' + ') >= 0 && partes.nm.length > 26;
    /* estación de EMOM / intervalos: celda táctil "[ MIN 1 ] Run" */
    const mMin = partes.nm.match(/^Min(?:uto)?s?\s*(\d+(?:\s*[-\u2013]\s*\d+)?)\s*(?:--|[-\u2013\u2014:])\s*(.+)$/i);
    const nmHtml = mMin ? '<span class="jp-cf-min">[ MIN ' + mMin[1].replace(/\s+/g, '') + ' ]</span>' + jpCfHighlightNum(mMin[2]) : jpCfHighlightNum(partes.nm);
    return '<div class="jp-cf-row' + (mMin ? ' jp-cf-cell' : '') + ((micro || /jp-cf-time/.test(valHtml)) ? ' jp-cf-row-chip' : '') + '">' +
        '<span class="jp-cf-rn' + (esComplex ? ' jp-cf-rn-complex' : '') + '">' + nmHtml +
          (lado ? '&nbsp;<span class="jp-cf-side">(' + lado + ')</span>' : '') + '</span>' +
        ((partes.val || micro) ? '<span class="jp-cf-rv">' + valHtml + '</span>' : '') +
      '</div>';
  }
  /* recolector de clips únicos del bloque completo -- una sola pasada
     sobre TODAS las líneas (cualquier fase), matcheando sólo contra
     video real y directo (soloDirecto=true en buscarVideo): un nombre
     que sólo CONTIENE a otro ("low hang power snatch" vs "hang power
     snatch") ya no cuenta como el mismo movimiento acá. */
  /* directiva ("Sanitización de Nombres en Acordeón de Videos") -- el
     acordeón mostraba el nombre CRUDO de la línea del bloque ("20
     Single-leg glute bridges (10 por pierna)", "Lift 1: 1 Power
     snatch"), arrastrando prefijos de serie, conteo de reps y notas
     entre paréntesis al botón visible. limpiarNombre() ya saca todo
     eso (se reusa la misma limpieza que usa buscarVideo() para NO
     duplicar lógica de parseo); acá se le suma Title Case palabra por
     palabra (respeta guiones: "single-leg" -> "Single-Leg") y se
     singulariza sólo la ÚLTIMA palabra con el mismo lematizador del
     motor de 1RM (jpLemaPalabra) -- "bridges" -> "bridge", sin tocar
     el resto de la frase para no alterar nombres que ya son correctos
     tal cual ("Hang power snatch" no tiene plural que sacar). */
  function jpCfClipTitleCase(s){
    return String(s || '').toLowerCase().replace(/[a-záéíóúñ]+/gi, function(w){
      return w.charAt(0).toUpperCase() + w.slice(1);
    });
  }
  function jpCfClipNombre(raw){
    const limpio = limpiarNombre(raw);
    if(!limpio) return limpio;
    const partes = limpio.split(/\s+/);
    const ultima = partes.pop();
    partes.push(jpLemaPalabra(ultima));
    return jpCfClipTitleCase(partes.join(' '));
  }
  /* directiva ("Parser de Complexes y Videos Técnicos Aislados") --
     un complex olímpico ("1 Power snatch + 1 Low hang power snatch + 1
     Hang power snatch") es UNA línea con VARIOS movimientos, nunca un
     solo ejercicio: antes se buscaba video para la frase completa y
     salía deformada ("Power Snatch + 1 Low Hang", recortada por el
     tope de 6 palabras de limpiarNombre()). Se tokeniza por +/,&//
     ANTES de limpiar, cada segmento se procesa como un movimiento
     propio (misma limpieza + match exacto + fallback de benchmark que
     ya usa una línea simple) -- una línea sin separador produce un
     único segmento, comportamiento sin cambios para el caso normal. */
  function jpCfTokenizarComplex(nm){
    return String(nm || '').split(/\s*[+/&,]\s*/).map(function(s){ return s.trim(); }).filter(Boolean);
  }
  /* [✕] del Builder + sanitización: mismas claves que el compilador
     (nombre normalizado y nombre con stemming de plurales) y tope de 45
     caracteres para el nombre -- una instrucción larga nunca es un ejercicio */
  function jpNrmKey(s){
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[.,;:!\u00a1?\u00bf"'\u0060]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function jpStemKey(s){
    var base = String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[.,;:!\u00a1?\u00bf"'\u0060()\[\]]+/g, ' ').replace(/\s+/g, ' ').trim();
    return base.split(' ').map(function(w){
      if(w.length <= 3) return w;
      if(/(ches|shes|sses|xes|zes|ones)$/.test(w)) return w.slice(0, -2);
      if(/s$/.test(w) && !/(ss|us|is)$/.test(w)) return w.slice(0, -1);
      return w;
    }).join(' ');
  }
  function jpCfClips(lineas, descartados, bloque){
    const vistos = new Set();
    const out = [];
    const propiosIds = (bloque && Array.isArray(bloque.videosBloqueIds)) ? bloque.videosBloqueIds : null;
    const ajenosIds = {};
    if(propiosIds){
      try{
        const diaC = typeof getCurrentDay === 'function' ? getCurrentDay() : null;
        ((diaC && diaC.blocks) || []).forEach(function(b2){
          if(!b2 || b2.id === bloque.id || !Array.isArray(b2.videosBloqueIds)) return;
          b2.videosBloqueIds.forEach(function(y){ ajenosIds[y] = 1; });
        });
      }catch(errAj){}
    }
    const dis = Array.isArray(descartados) ? descartados : [];
    lineas.forEach(function(raw){
      const l = String(raw || '').trim();
      if(l.length > 45 && !/[\d:|@+]/.test(l)) return;
      if(!jpCfEsMovimiento(l)) return;
      const nmCrudo = jpCfSplit(l).nm;
      /* directiva (fix de videos en Warm-up/Corework/Accesorios) -- acá
         NO se vuelve a filtrar con esEstructura(nm): ese chequeo corre
         sobre el nombre CRUDO de jpCfSplit (todavía con la nota entre
         paréntesis sin limpiar, ej. "20 Single-leg glute bridges (10 por
         pierna)"), y NO_VIDEO rechaza cualquier texto que contenga "("
         en cualquier posición -- así un ejercicio real con una
         aclaración entre paréntesis nunca llegaba a intentar
         buscarVideo(). buscarVideo() ya limpia el nombre por su cuenta
         (limpiarNombre(): saca paréntesis, conteo de reps, "@...", etc.)
         antes de buscar match directo/exacto -- soloDirecto=true sigue
         garantizando que nunca se asigna un video por aproximación. */
      if(!nmCrudo) return;
      jpCfTokenizarComplex(nmCrudo).forEach(function(seg){
        if(!seg) return;
        if(limpiarNombre(seg).length > 45) return;
        if(dis.length){
          var limpio = limpiarNombre(seg);
          if(dis.indexOf(jpNrmKey(seg)) >= 0 || dis.indexOf(jpNrmKey(limpio)) >= 0 ||
             dis.indexOf(jpStemKey(seg)) >= 0 || dis.indexOf(jpStemKey(limpio)) >= 0) return;
        }
        /* directiva ("Fallback inteligente"): si la variante puntual no
           tiene video propio, se prueba el benchmark de base antes de
           omitir el clip por completo -- ver jpVideoFallbackBenchmark(). */
        const ytid = buscarVideo(seg, true) || jpVideoFallbackBenchmark(seg);
        if(!ytid || vistos.has(ytid)) return;
        if(propiosIds && propiosIds.indexOf(ytid) < 0) return;      /* solo los videos de ESTE bloque: nunca se arrastra el de otro */
        vistos.add(ytid);
        out.push({ nombre: jpCfClipNombre(seg) || seg, ytid: ytid });
      });
    });
    return out;
  }
  /* directiva ("Unificación de Acordeones al Pie del Bloque") -- ya no
     arma su propio <details>: sólo la tira de chips, para que
     "Videos Técnicos" y "Objetivo del estímulo & Coaching Tips" vivan
     en UN SOLO acordeón (ver pizarra() más abajo, arma el <details>
     único combinando esto con objetivo/tips/pacing/escalado). */
  /* tips de WOD combinado: "[MOVIMIENTO]" + SET-UP / EFICIENCIA / CUIDADO por movimiento y una estrategia general al final */
  function formatTipsCF(h){
    var lineas = String(h || '').split(/<br\s*\/?>|\r?\n/i).map(function(x){ return x.trim(); }).filter(Boolean);
    var secs = [], cur = null, gen = null, ultimo = null;
    lineas.forEach(function(l){
      var t0 = l.replace(/^[^A-Za-z\u00c1\u00c9\u00cd\u00d3\u00da\u00d1\[*]+/, '');
      var mh = t0.match(/^\[([^\]]{2,60})\]$/);
      if(mh){ cur = { nombre: mh[1], items: [] }; secs.push(cur); gen = null; ultimo = null; return; }
      var ml = t0.match(/^([A-Z\u00c1\u00c9\u00cd\u00d3\u00da\u00d1][A-Z\u00c1\u00c9\u00cd\u00d3\u00da\u00d1 &\/\-]{2,42}):\s*(.*)$/);
      if(ml){
        if(/ESTRATEGIA GENERAL/.test(ml[1])){ gen = { txt: ml[2] ? [ml[2]] : [] }; cur = null; ultimo = null; return; }
        if(cur){ ultimo = { lb: ml[1], tx: ml[2] }; cur.items.push(ultimo); return; }
      }
      if(gen){ gen.txt.push(l); return; }
      if(ultimo){ ultimo.tx += ' ' + l; }
    });
    if(!secs.length) return '';
    var ico = function(lb){ return /SET-?UP|AGARRE|POSTURA/.test(lb) ? '&#127919; ' : (/CUIDADO|ERROR/.test(lb) ? '&#128721; ' : '&#9889; '); };
    return secs.map(function(sc){
      return '<div class="jp-cf-mov"><div class="jp-cf-movh">[' + sc.nombre + ']</div>' +
        sc.items.map(function(it){ return '<div class="jp-tip-fase jp-tip-bullet"><b class="jp-tip-lb">' + ico(it.lb) + it.lb + '</b> ' + it.tx + '</div>'; }).join('') + '</div>';
    }).join('') + (gen ? '<div class="jp-cf-mov jp-cf-gen"><div class="jp-cf-movh">&#9201; ESTRATEGIA GENERAL DEL WOD</div><div class="jp-tip-fase">' + gen.txt.join(' ') + '</div></div>' : '');
  }
  function jpCfClipsRowHtml(clips){
    if(!clips.length) return '';
    return '<div class="jp-cf-vid-cards">' +
      clips.map(function(c){
        return '<button type="button" class="jp-cf-vid-card" data-yt="' + c.ytid + '" aria-label="Ver la t\u00e9cnica de ' + String(c.nombre).replace(/"/g,'') + '">' +
          '<span class="jp-cf-vid-thumb" style="background-image:url(https://img.youtube.com/vi/' + c.ytid + '/mqdefault.jpg)">' +
            '<span class="jp-cf-vid-play">&#9654;</span>' +
          '</span>' +
          '<span class="jp-cf-vid-info">' +
            '<span class="jp-cf-vid-nombre">' + c.nombre + '</span>' +
            '<span class="jp-cf-vid-tap">[ TAP PARA REPRODUCIR ]</span>' +
          '</span>' +
        '</button>';
      }).join('') +
    '</div>';
  }
  function pizarra(blockEl, block, weekIdx, dayId){
    /* lee las líneas directo del dato compilado (block.items), no del DOM
       ya renderizado -- más robusto y permite el parseo nombre/valor sin
       depender de cómo el renderer genérico haya envuelto cada línea. */
    if(esBloqueVacioCF(block)) return;
    /* directiva ("Independencia Total de Semanas") -- itemsDeSemana()
       (helper global, ver junto a esBloqueVacioCF) es la fuente única de
       esta regla: Semana 1 sigue viviendo en block.items; Semana 2/3/4
       sin bifurcar en el Builder devuelve directamente vacío, NUNCA el
       contenido de otra semana. */
    const itemsSemana = itemsDeSemana(block, weekIdx);
    /* 17/09 · auditoría general: una línea nula o vacía (dato viejo, pegado
       con saltos de más, etc.) no debe sobrevivir como fila muda en la
       Pizarra -- se purga acá, en el propio render, para que la reparación
       no dependa de que el coach corra auditarYRepararPlanes(). */
    const lineasAll = itemsSemana.map(function(l){ return l; }).filter(function(l){ return l != null && String(l).trim() !== ''; });
    const metaTxt = jpCfSepararMeta(lineasAll);
    const lineas = metaTxt.lineas;
    const f = formatoEstructurado(block) || formatoDe(block, lineas, weekIdx);
    const min = minutosDe(block, lineas);
    /* CrossFit: solo cuando una linea larga trae varias estaciones juntas (el caso que se amputaba); el formato multilinea ya tiene su pizarra propia */
    const cont0 = lineas.length ? jpContinuoInfo(block, lineas) : null;
    const cont = (cont0 && cont0.lineas.length > lineas.length) ? cont0 : null;
    const skey = weekIdx + '|' + dayId + '|' + block.id;
    const guardado = state.scores[skey] || '';
    const ph = (block.scoreType && CF_SCORE_PH[block.scoreType]) ||
      (block.category === 'endurance' ? CF_ENDURANCE_PH :
      (f && f.modo === 'up' ? 'Tiempo final (ej: 11:42)' : 'Rondas + reps (ej: 6+12)'));
    const scoreLb = block.category === 'endurance' ? 'REGISTRO' : 'SCORE';
    const fase = CF_FASE_LB[block.category] || 'WOD / METCON';
    const kFmt = String(block.boardFmt || '').toLowerCase().replace(/[^a-z]/g, '');
    const paramTxt = block.cfParam ? ((CF_PARAM_PREFIX[kFmt] || '') + block.cfParam) : (min ? (min + ' min') : '');
    const c0 = block.cierre || {};
    const unir = function(a, b){ return [a, b ? escSB(b).replace(/\n/g, '<br>') : ''].filter(Boolean).join('<br>'); };
    const c = { objetivo: unir(c0.objetivo, metaTxt.objetivo), tips: unir(c0.tips, metaTxt.tips), pacing: jpCfLimpiaPacing(unir(c0.pacing, metaTxt.pacing)), escalado: unir(c0.escalado, metaTxt.escalado) };
    const tieneCierre = !!(c.objetivo || c.tips || c.pacing || c.escalado);
    /* directiva ("Rediseño y reubicación del texto colgado de Core") --
       block.subtitle ("Trabajo de core focalizado") ya NO se pinta como
       recuadro gris flotante antes de las filas -- pasa a ser una fila
       más dentro del acordeón único de pautas técnicas (ver abajo). */
    const subtituloVisible = (block.subtitle && !(block.weekName && block.weekName[weekIdx] && block.weekName[weekIdx] !== block.title)) ? block.subtitle : '';
    /* directiva: "Sin registro" es una elección explícita del coach de no
       trackear nada en este bloque -- pisa el criterio por fase de más
       arriba (CF_SCORE_FASES), nunca al revés. */
    const scoreVisible = !!CF_SCORE_FASES[block.category] && block.scoreType !== 'ninguno';
    /* Accessory/Cooldown no trackea serie por serie: sólo un campo libre
       de notas de carga/sensaciones, al pie del bloque -- reutiliza
       state.notes (mismo store que las notas de sesión) con una key
       propia (sufijo __accnotas) para no pisar ningún otro uso. */
    const notasVisible = block.category === 'accessory' || (!!CF_SCORE_FASES[block.category] && block.scoreType !== 'ninguno');
    const notaKey = skey + '|__accnotas';
    const notaGuardada = (state.notes && state.notes[notaKey]) || '';

    /* directiva ("Independencia Total de Semanas") -- si esta semana
       todavía no tiene prescripción propia (lineas vacío por semana > 1),
       nunca se deja el tablero con las filas en blanco sin explicación:
       un mensaje claro en vez del WOD de otra semana. */
    const filas = cont ? (jpCfIntervaloCtx = true, jpContinuoPillHtml(cont) + jpContinuoListaHtml(cont)) : lineas.length ? (jpCfIntervaloCtx = lineas.some(function(l){ return /^[^A-Za-z0-9]*(?:every|e\d*mom|emom|cada)\b|^\s*\d+:\d{2}\s*(?:min\w*)?\s*(?:x|×)\s*\d/i.test(String(l)); }), jpCfRenderLineas(lineas, dayId))
      : (weekIdx > 0 ? '<div class="jp-cf-row jp-cf-badge">Todavía no se cargó la prescripción de esta semana. Consultá con tu coach.</div>' : '');
    /* registro de series: un casillero IDENTIFICADO por ejercicio (A1 / A2 / triserie), nunca uno generico */
    let gridHtml = '';
    (function(){
      if(!lineas.length || jpCfIntervaloCtx) return;
      if(block.category !== 'strength' && block.category !== 'accessory') return;
      const exs = jpCfListaEjercicios(lineas);
      if(!exs.length) return;
      gridHtml = jpRegBotonHtml({ w: weekIdx, d: dayId, b: block.id, t: block.title || '', ex: exs.map(function(ex, k){
        return { idx: 'cf' + k, nombre: ex.nombre, sets: ex.sets, reps: '', carga: '', u: ex.unidad && ex.unidad !== 'reps' ? ex.unidad : '', r: 0 };
      }) });
    })();
    const clips = jpCfClips(lineas, block.videosDismissed, block);

    const faseCls = 'jp-cf-fase-' + (CF_FASE_LB[block.category] ? block.category : 'metcon');
    const cfgCab = (esMetcon(block, weekIdx) && lineas.length) ? jpWodTimerCfg(block, cont ? cont.lineas : lineas, f) : null;
    const cabeceraWod = cfgCab ? jpCfCabeceraWod(cfgCab, block, lineas, c) : '';
    /* cabecera limpia: [ CROSSFIT · FASE ] // N MIN. El "(N MIN)" del titulo pasa a la etiqueta; el titulo grande se oculta cuando solo repite la fase
       (queda en el DOM: lo usan el bloque plegado y "bloque completado"). Un titulo con informacion propia ("Fran", "Back Squat 5x5") se conserva. */
    const tituloCrudoCF = (!block.title || /^\s*bloque\s*\d*\s*$/i.test(block.title)) ? fase : block.title;
    const mMinCF = String(tituloCrudoCF).match(/\(\s*(\d+)\s*min\w*\s*\)\s*$/i);
    const tituloVisCF = mMinCF ? String(tituloCrudoCF).replace(/\s*\(\s*\d+\s*min\w*\s*\)\s*$/i, '') : tituloCrudoCF;
    const minTagCF = mMinCF ? mMinCF[1] : ((!cabeceraWod && min) ? min : '');
    const nrmCF = function(x){ return String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); };
    const faseNrmCF = nrmCF(jpCfFaseLabel(block)), titNrmCF = nrmCF(tituloVisCF);
    const tituloDupCF = !titNrmCF || titNrmCF === faseNrmCF || titNrmCF === nrmCF(fase) || (titNrmCF.length >= 3 && faseNrmCF.indexOf(titNrmCF) >= 0);
    const html =
      '<div class="wod-board jp-cfboard ' + faseCls + '" data-wodb="' + block.id + '">' +
        '<div class="jp-cf-tag">[ CROSSFIT &middot; ' + jpCfFaseLabel(block) + ' ]' + (minTagCF ? ' <span class="jp-sb-tmin">// ' + minTagCF + ' MIN</span>' : '') + '</div>' +
        '<div class="jp-cf-title' + (tituloDupCF ? ' jp-cf-title-dup' : '') + '">' + jpCfTituloHtml(tituloVisCF) + '</div>' +
        /* directiva (ergonomía integral): se retira el badge de formato
           ("TABATA"/"EMOM"/etc, .jp-cf-fmtbar) -- redundante con la
           bajada de texto del propio bloque ("Every 2:30 x 6 Sets:"),
           sobrecargaba la vista. f/paramTxt se conservan (siguen
           usándose más abajo para el placeholder del casillero de
           score), sólo se retira este render puntual. */
        cabeceraWod +
        '<div class="jp-cf-rows">' + filas + '</div>' +
        /* directiva ("Sprint 1: Timer contextual de WOD") -- botón táctico
           discreto que abre el HUD Timer ya configurado con el formato y
           los minutos/intervalos detectados (ver jpWodTimerCfg()), sin
           pasar por las 3 pantallas de selección manual. El acceso manual
           del dock inferior queda aparte, intacto. */
        (function(){
          /* directiva maestra ("Botonera simétrica al cierre del bloque"):
             [ INICIAR TIMER DE ESTE WOD ] y [ DESCANSO RÁPIDO ] comparten UNA
             fila de dos columnas iguales (grid 1fr 1fr, gap 8px) en vez de
             apilarse como dos rectángulos masivos; con un solo botón ocupa
             el ancho completo. */
          var tcfg = lineas.length ? (jpWodTimerCfg(block, cont ? cont.lineas : lineas, f) || (cont ? jpCfgContinuo(cont) : null)) : null;
          var btnWod = tcfg ? '<button type="button" class="jp-cf-wodtimer" data-wodcfg="' + encodeURIComponent(JSON.stringify(tcfg)) + '">' + (cont ? 'INICIAR ' + escSB(cont.etiqueta) : 'INICIAR WOD') + '</button>' : '';
          var btnRest = '';
          if(lineas.length && (block.category === 'strength' || block.category === 'accessory') && filas.indexOf('jp-cf-rest') < 0){
            var segQ = 0;
            for(var qi = 0; qi < lineas.length && !segQ; qi++){ segQ = jpCfParsearDescanso(lineas[qi]) || 0; }
            if(!(segQ > 0)) segQ = block.category === 'accessory' ? 60 : 90;
            /* descanso prescrito < 30 s = micro-pausa: sin botón */
            if(segQ >= 30 && !jpCfIntervaloCtx){
              var lbQ = 'Descanso \u00b7 ' + String(block.title || 'Bloque').replace(/[<>"&]/g, '').slice(0, 28);
              btnRest = '<button type="button" class="jp-cf-quickrest" data-rest-sec="' + segQ + '" data-rest-lb="' + lbQ + '">DESCANSO R&Aacute;PIDO ' + jpCfRestMMSS(segQ) + '</button>';
            }
          }
          return (btnWod || btnRest) ? '<div class="jp-cf-btnrow">' + btnWod + btnRest + '</div>' : '';
        })() + gridHtml +
        /* directiva ("Sprint 1: descanso rápido en series") -- los bloques de
           Skill/Strength y Accessory de CrossFit no tienen tilde por serie
           (se leen como texto), así que el alumno no tenía cómo arrancar un
           descanso sin abrir el cronómetro. Chip de 1 toque que dispara la
           barra flotante de descanso (CoachTV.rest, el MISMO motor que ya
           usa Bodybuilding al tildar una serie), con el descanso prescrito
           ("Rest 90s" en cualquier línea del bloque) o, si no hay, 90s en
           fuerza / 60s en accesorio. Si el bloque ya trae su propio botón
           "INICIAR REST" in-situ (línea de descanso explícita), no se
           duplica. WODs/metcon quedan afuera: ahí manda el reloj del WOD. */

        /* directiva ("Unificación de Acordeones al Pie del Bloque") --
           UN SOLO <details> táctico agrupa el foco del bloque, el
           objetivo/tips/pacing/escalado y los chips de video (antes
           tres piezas sueltas: recuadro gris de subtítulo, acordeón de
           videos, acordeón de objetivo). El contador "(N)" del título
           es la cantidad de videos, igual que mostraba el acordeón
           viejo de clips. */
        (scoreVisible ?
          '<div class="wod-score">' +
            '<label>[ ' + scoreLb + ' ]</label>' +
            '<input class="wod-score-in" data-skey="' + skey + '" placeholder="' + ph + '" value="' + (guardado || '') + '" />' +
            '<span class="ws-ok" data-sok="' + skey + '">' + (guardado ? '✓ guardado' : '') + '</span>' +
          '</div>' : '') +
        (notasVisible ?
          '<div class="jp-cf-notas">' +
            '<label>[ NOTAS ]</label>' +
            '<input class="jp-cf-notas-in" data-nkey="' + notaKey + '" placeholder="' + (block.category === 'accessory' ? 'Ej: Usé KB de 24kg y banda roja' : 'Notas del WOD (carga usada, escalados, sensaciones)') + '" value="' + String(notaGuardada).replace(/"/g, '&quot;') + '" />' +
          '</div>' : '') +
        /* videos en miniatura compacta y, al final, el acordeon de estrategia */
        (clips.length ? '<div class="jp-cf-vids"><div class="jp-sb-vid-title">&#127916; VIDEOS T&Eacute;CNICOS</div>' + jpCfClipsRowHtml(clips) + '</div>' : '') +
        ((tieneCierre || subtituloVisible) ?
          '<details class="jp-cf-acc"><summary><svg class="jp-pauta-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2v.2h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg><span>' + escSB(jpT('app.card.tips')) + '</span></summary>' +
            (subtituloVisible ? '<div class="jp-cf-accrow"><span class="lb">&#128270; FOCO DEL BLOQUE</span><p>' + subtituloVisible + '</p></div>' : '') +
            (c.objetivo ? '<div class="jp-cf-accrow"><span class="lb">&#127919; FOCO DEL EST&Iacute;MULO</span><p>' + jpCfSubLabels(c.objetivo) + '</p></div>' : '') +
            (c.pacing ? '<div class="jp-cf-accrow"><span class="lb">&#9889; ESTRATEGIA DE PACING</span><p>' + jpCfSubLabels(c.pacing) + '</p></div>' : '') +
            (c.tips ? '<div class="jp-cf-accrow"><span class="lb">&#128736;&#65039; NOTA T&Eacute;CNICA / AJUSTE PERSONALIZADO</span>' + (formatTipsCF(c.tips) || '<p>' + jpCfSubLabels(c.tips) + '</p>') + '</div>' : '') +
            (c.escalado ? '<div class="jp-cf-accrow"><span class="lb">&#9878;&#65039; ESCALADO Y ADAPTACIONES</span><p>' + jpCfSubLabels(c.escalado) + '</p></div>' : '') +
          '</details>' : '') +
      '</div>';
    const body = blockEl.querySelector('.block-body');
    if(body && !body.querySelector('[data-wodb]')) body.insertAdjacentHTML('afterbegin', html);
    if(body && (block.category === 'strength' || block.category === 'accessory')){
      var rowsEl = body.querySelector('[data-wodb="' + block.id + '"] .jp-cf-rows');
      if(rowsEl && !rowsEl.querySelector('[data-est]')){
        var estRows = [].slice.call(rowsEl.children).filter(function(r){ return r.classList.contains('jp-cf-row') && r.querySelector(':scope > .jp-cf-rn'); }), nHdr = 0;
        /* "EVERY 04:00 x 5 SETS", "Every 3 min for 6 sets", "5 Sets", "Rest 2:00", "Min 3": encabezados de estructura, nunca ejercicios -> sin letra E y con estilo de encabezado */
        var RX_ESTR = /^\s*(?:\d+\s*[x\u00d7]\s*)?(?:every\b|emom\b|e\d+mom\b|amrap\b|for\s*time\b|time\s*cap\b|cap\b|rest\b|descanso\b|descans[a\u00e1]\b|then\b|luego\b|buy-?in\b|cash-?out\b|\d+\s*(?:rounds?|rondas?|sets?|series)\b|min(?:ute)?s?\s*\d|x\s*\d+(?:\s*[-\u2013]\s*\d+)?\s*(?:sets?|series|rounds?|rondas?)?\s*$|(?:todos\s+los\s+sets|all\s+sets)\b|carga\s+(?:del?\s+)?(?:set|serie|ronda)\b|(?:dedic[a\u00e1]|constru[i\u00ed]|build\s+to)\w*)/i;
        estRows = estRows.filter(function(r){
          var rn0 = r.querySelector(':scope > .jp-cf-rn'), tx0 = rn0.textContent.replace(/\s+/g, ' ').trim();
          if(!RX_ESTR.test(tx0)) return true;
          r.classList.add('jp-cf-header'); r.setAttribute('data-estr', '1');
          r.textContent = tx0.replace(/:\s*$/, '');
          return false;
        });
        estRows.forEach(function(r){
          var rn = r.querySelector(':scope > .jp-cf-rn'), mE = rn.textContent.trim().match(/^([A-Fa-f]\d{1,2})\s*[:.\-]\s*\S/);
          if(mE){ r.setAttribute('data-est', mE[1].toUpperCase()); nHdr++;
            var tn = rn.firstChild; if(tn && tn.nodeType === 3) tn.nodeValue = tn.nodeValue.replace(/^\s*[A-Fa-f]\d{1,2}\s*[:.\-]\s*/, ''); }
        });
        /* letras E1, E2... solo en supersets REALES (ejercicios cruzados en una misma ronda); en EMOM, AMRAP, circuitos y series simples el nombre del ejercicio alcanza */
        var esSuper = /super\s*-?set|bi\s*-?set|tri\s*-?set|giant\s*set/i.test(String(block.title || '') + ' ' + rowsEl.textContent);
        if(esSuper){ rowsEl.classList.add('jp-cf-super'); rowsEl.setAttribute('data-super', '1'); }
        if(!nHdr && esSuper && estRows.length > 1) estRows.forEach(function(r, i){ r.setAttribute('data-est', 'E' + (i + 1)); });
      }
    }
    /* corrección de duplicación: la pizarra táctica reemplaza visualmente la lista de
       viñetas de la que se leyó (no solo en días 100% CrossFit, también en días
       híbridos donde body.cf-modo nunca se activa) — se oculta la fuente, no se borra */
    if(body){
      body.querySelectorAll('.ex-row, .wu-phase').forEach(function(el){
        if(!el.closest('[data-wodb]')) el.style.display = 'none';
      });
    }
    /* un solo cronómetro por bloque: el de la pizarra manda */
    if(body) body.querySelectorAll('.quick-timer').forEach(function(q){
      if(!q.closest('[data-wodb]')) q.remove();
    });
    /* la pizarra no lleva cronómetro propio: el alumno abre el ⏱️ Custom WOD Timer
       de la barra superior y lo configura a demanda */
    const slot = body ? body.querySelector('.wod-timer-slot') : null;
    if(slot) slot.remove();
    const inp = body ? body.querySelector('.wod-score-in') : null;
    if(inp && !inp.dataset.on){
      inp.dataset.on = '1';
      inp.addEventListener('input', function(){
        state.scores[inp.dataset.skey] = inp.value;
        saveProgress();
        const ok = body.querySelector('[data-sok="' + inp.dataset.skey + '"]');
        if(ok) ok.textContent = inp.value ? '✓ guardado' : '';
      });
      inp.addEventListener('click', function(e){ e.stopPropagation(); });
    }
    const notasInp = body ? body.querySelector('.jp-cf-notas-in') : null;
    if(notasInp && !notasInp.dataset.on){
      notasInp.dataset.on = '1';
      notasInp.addEventListener('input', function(){
        state.notes = state.notes || {};
        state.notes[notasInp.dataset.nkey] = notasInp.value;
        saveProgress();
      });
      notasInp.addEventListener('click', function(e){ e.stopPropagation(); });
    }
  }

  /* ============================================================
     REFACTOR DEFINITIVO -- PIZARRA TÁCTICA SPORTS & BODYBUILDING
     Réplica exacta de la experiencia de pizarra() de arriba, pero para
     block.sportsPizarra (nunca para bloques CrossFit -- pizarra() de
     arriba sigue intacta, sin un solo cambio). La diferencia real: acá
     cada línea de ejercicio se resuelve a un tracker de series REAL
     ([KG][REPS][✓], vía renderSetRows(), MISMO motor que ya usan los
     bloques 'block'/'superset' clásicos) en vez de texto plano -- el
     descanso automático al tildar una serie ya lo dispara el listener
     global existente (ver "eventos globales: descanso al tildar una
     serie" más abajo en el archivo), cero JS nuevo ahí.
     NOTA IMPORTANTE: b.items se guarda SIN líneas en blanco
     (setBlockField las descarta, ver Builder) -- así que a diferencia
     de un parser que separa "por párrafo", acá cada línea se clasifica
     una por una (nombre / dosis / nota / sub-línea de biserie) para
     reconstruir dónde empieza cada ejercicio, sin depender de blancos
     que nunca llegan a esta altura. */
  /* esc() vive redeclarada localmente en decenas de IIFEs separadas a lo
     largo de este documento (ninguna versión es realmente "global") --
     el closure donde vive pizarra()/decorar() no define la suya, así
     que se agrega acá una copia mínima, mismo criterio ya establecido
     en el resto del archivo. */
  function escSB(s){ return (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  var TAGS_TECNICA_SB = [
    { reBracket:/\[\s*drop\s*-?\s*set\s*\]/i, reLibre:/\bdrop[\s-]?set\b/i, v:'dropset' },
    { reBracket:/\[\s*rest\s*-?\s*pause\s*\]/i, reLibre:/\brest[\s-]?pause\b/i, v:'restpause' },
    { reBracket:/\[\s*myo\s*-?\s*reps?\s*\]/i, reLibre:/\bmyo[\s-]?reps?\b/i, v:'myoreps' },
    { reBracket:/\[\s*al\s+fallo\s*\]/i, reLibre:/\bal\s+fallo\b/i, v:'fallo' }
  ];
  var TECNICAS_BADGE_SB = {
    dropset: '🔥 DROP SET', restpause: '⚡ REST-PAUSE',
    myoreps: '🔁 MYO-REPS', fallo: '🎯 AL FALLO'
  };
  function extraerTecnicaSB(texto){
    var limpio = String(texto || ''), tecnica = '';
    TAGS_TECNICA_SB.forEach(function(tag){
      if(tag.reBracket.test(limpio)){ tecnica = tag.v; limpio = limpio.replace(tag.reBracket, '').trim(); }
      else if(!tecnica && tag.reLibre.test(limpio)){ tecnica = tag.v; }
    });
    return { tecnica: tecnica, texto: limpio.trim() };
  }
  /* directiva ("Compilación estructurada de Myo-Reps") -- una línea de
     dosis puede traer la serie Myo-Rep INLINE, pegada al resto ("3 sets
     x 12 reps + 1 set MYO-REPS (12 reps activación + 3x4 miniseries con
     10s de pausa) | Tempo 2011 | RIR 0 | Rest 75s"): antes esto rompía
     esSoloDosisSB() (el residuo tras sacar sólo "3 sets x 12" era
     larguísimo) y la línea entera terminaba como nota cruda en cursiva,
     sin sets ni inputs. Se recorta la cláusula "+ N set myo-reps (...)"
     ANTES de parsear la dosis base, así "3 sets x 12" se reconoce limpio
     y el detalle (activación/microseries/pausa) se extrae aparte. */
  var RX_MYO_CLAUSE_SB = /\+?\s*(?:\d+\s*sets?\s*)?myo[\s-]?reps?\s*(?:\(([^)]*)\))?/i;
  function extraerMyoInfoSB(detalle){
    var t = String(detalle || ''), out = {};
    var mAct = t.match(/(\d+)\s*reps?\s*(?:de\s*)?activaci[o\u00f3]n/i);
    if(mAct) out.activacion = parseInt(mAct[1], 10);
    var mMicro = t.match(/(\d+)\s*x\s*(\d+)\s*(?:micro\s*-?\s*series|miniseries)/i);
    if(mMicro){ out.microCount = parseInt(mMicro[1], 10); out.microReps = parseInt(mMicro[2], 10); }
    var mRest = t.match(/(\d+)\s*s(?:eg(?:undos)?)?\s*(?:de\s*)?(?:pausa|descanso|rest)/i);
    if(mRest) out.restSeg = parseInt(mRest[1], 10);
    return (out.activacion || out.microCount || out.restSeg) ? out : null;
  }
  /* directiva ("Limpieza de residuos en Drop Set") -- "-30%"/"20%" dentro
     del texto de una línea de técnica: se guarda para integrarlo en el
     badge del set ("🔥 DROP SET (-30%)") en vez de dejarlo como texto
     suelto. */
  function extraerPctSB(texto){
    var m = String(texto || '').match(/(-?\d+)\s*%/);
    return m ? parseInt(m[1], 10) : null;
  }
  /* directiva ("Fix crítico: parser flexible") -- "4x6-8" era el ÚNICO
     formato aceptado (número pegado directo a x/×). Un coach escribiendo
     en prosa normal ("4 sets x 10-12 reps", "3 series de 12", "4 rondas
     x 8") no matcheaba nada: dosis.sets quedaba undefined, la línea caía
     al catch-all de parsearPizarraSB() como un ejercicio NUEVO en vez de
     la dosis del anterior -- el bug reportado (texto crudo sin
     casilleros). "sets?/series?/rondas?" con su conector x/de opcional
     cubren la prosa humana real sin dejar de matchear "4x6-8" (la
     primera alternativa sigue siendo "x" pelado). */
  var RX_DOSIS_SB = /(\d+)\s*(?:x|×|sets?\s*(?:x|×|de|:)?|series?\s*(?:x|×|de|:)?|rondas?\s*(?:x|×|de|:)?)\s*(\d+(?:(?:\s*[-\u2013\u2014]\s*|\s+a\s+)\d+)*)/i;
  /* volumen escrito sin patron "NxM": "8-10 reps", "10 repeticiones", "3 series" */
  var RX_MULTI_TRAMO_SB = /\d+\s*[x\u00d7]\s*\d+(?:\s*[-\u2013]\s*\d+)?\s*(?:\([^)]*\))?\s*\+\s*\d+\s*[x\u00d7]\s*\d+/i;
  var RX_REPS_SUELTAS_SB = /(\d+(?:\s*[-\u2013\u2014]\s*\d+)?)\s*(?:reps?|repeticiones)\b/i;
  var RX_SETS_SUELTOS_SB = /(\d+)\s*(?:sets?|series?|rondas?)\b/i;
  /* donde empieza la prescripcion dentro de "Nombre 8-10 reps | Tempo 2110 | Rest 15s" */
  var RX_CORTE_DOSIS_SB = /\s*(?:\||\b(?:tempo|rir|rest|descanso)\b|\d+(?:\s*[-\u2013\u2014]\s*\d+)?\s*(?:reps?|repeticiones)\b)/i;
  /* un descanso de 1 a 9 s no es real ("Rest 3 – 4 minutes", "Rest 4" salian como 4 s): 1-6 se leen como minutos, 7-9 vuelven al estandar de 60 s */
  function normRestSB(seg){
    seg = parseInt(seg, 10) || 0;
    if(seg > 0 && seg < 10) return seg <= 6 ? seg * 60 : 60;
    return seg;
  }
  function parsearDosisSB(txt){
    var t = String(txt || ''), out = {}, m;
    if((m = t.match(RX_DOSIS_SB))){
      out.sets = parseInt(m[1], 10); out.reps = m[2].replace(/\s+a\s+/g, '-').replace(/\s+/g, '').replace(/[\u2013\u2014]/g, '-');
      /* directiva ("Reconstrucción total del tracker de series") --
         detecta la unidad de la magnitud secundaria mirando SÓLO el
         tramo de texto justo después del rango de reps (hasta el
         próximo "|" o ~12 caracteres si no hay pipe) -- "3x30s" ->
         seg, "3x50m"/"3x50 mts" -> mts, "4x20 cal" -> cal. Nunca la
         línea COMPLETA: "4x8-10 | Tempo 3010 | RIR 2 | Rest 150s"
         también tiene una "s" pegada a un número ("150s"), y mirar
         toda la línea la clasificaba como tiempo por error. */
      var tras0 = m.index + m[0].length;
      var pipeIdx = t.indexOf('|', tras0);
      var tras = pipeIdx >= 0 ? t.slice(tras0, pipeIdx) : t.slice(tras0, tras0 + 12);
      out.unidad = detectarUnidadSecundariaSB(tras);
    }
    /* el volumen NUNCA se pierde: sin patron "NxM", se toman las reps ("8-10 reps") y los sets ("3 series") por separado */
    if(!out.reps && (m = t.match(RX_REPS_SUELTAS_SB))){ out.reps = m[1].replace(/\s+/g, '').replace(/[\u2013\u2014]/g, '-'); out.unidad = 'reps'; }
    if(!out.sets && (m = t.match(RX_SETS_SUELTOS_SB))) out.sets = parseInt(m[1], 10);
    if((m = t.match(/tempo\s*([\d\u00a7]{3,4})/i))) out.tempo = m[1];
    /* carga prescripta en kilos: "| 80 kg" o "@ 80 kg" (tambien rango "70-75 kg") */
    if((m = t.match(/(?:@|\|)\s*(?:carga\s*:?\s*)?(\d+(?:[.,]\d+)?(?:\s*[-\u2013]\s*\d+(?:[.,]\d+)?)?)\s*kgs?\b/i))) out.carga = m[1].replace(/\s+/g, '').replace(',', '.') + ' kg';
    /* directiva ("Impresión completa de dosis en el header") -- antes
       sólo capturaba UN dígito ("RIR 2-1" perdía el "-1"): el header del
       alumno necesita el RIR EXACTO que escribió el coach, rango u
       observación "/ Fallo técnico" incluidos. */
    if((m = t.match(/rir\s*(\d+(?:\s*-\s*\d+)?(?:\s*\/\s*fallo\s*t[eé]cnico)?)/i))) out.rir = m[1].replace(/\s+/g, ' ').trim();
  /* directiva maestra ("Parser universal y tolerante para Sports &
       Bodybuilding") -- reescritura genérica: en vez de intentar cubrir
       formas COMPUESTAS puntuales de descanso a mano (frágil, se rompe
       apenas el coach redacta distinto -- "Rest 60s entre piernas / 90s
       AL COMPLETAR AMBAS" nunca hubiera matcheado el patrón anterior,
       anclado a "entre <palabra>" en las DOS mitades), se captura TODA la
       cláusula de descanso tal cual venga (Rest\s*([^|]+), hasta el
       próximo "|" o fin de línea, sin asumir estructura interna) y se usa
       el ÚLTIMO número mencionado ahí como el descanso real del
       temporizador -- es siempre el que separa una serie/ronda completa
       de la siguiente, sin importar cuántas aclaraciones vengan antes. */
    var restM = t.match(/(?:rest|descanso)\s*(?:de\s*)?([^|;)]+)/i);
    if(restM){
      var clausulaRest = restM[1].replace(/\b(?:rir|tempo)\b.*$/i, '');
      var restMin = clausulaRest.match(/(\d+)\s*:\s*(\d{2})/);
      var restNums = clausulaRest.match(/\d+/g);
      var restMn = clausulaRest.match(/(\d+(?:[.,]\d+)?)\s*(?:min\b|minutos?\b|minutes?\b|m\b|')/i);
      var restMS = clausulaRest.match(/(\d+)\s*(?:min(?:utos?|utes?)?|m)\b\.?\s*(\d{1,2})\s*(?:s|seg\w*)?\b/i);
      if(restMin) out.restSeconds = parseInt(restMin[1], 10) * 60 + parseInt(restMin[2], 10);
      else if(restMS) out.restSeconds = parseInt(restMS[1], 10) * 60 + parseInt(restMS[2], 10);
      else if(restMn) out.restSeconds = Math.round(parseFloat(restMn[1].replace(',', '.')) * 60);
      else if(restNums) out.restSeconds = normRestSB(parseInt(restNums[restNums.length - 1], 10));
    } else {
      var restPre = t.match(/(\d+)\s*(?:"|\u2033|\u201d|seg(?:undos)?\b|s\b)\s*(?:de\s+)?(?:rest|descanso)\b/i);
      if(restPre) out.restSeconds = parseInt(restPre[1], 10);
    }
    /* parser canónico (el mismo que usa el Builder): descansos en min/minutes/rangos y etiqueta del rango ("180-240s") */
    if(typeof jpDosisCanon === 'function'){
      var cnR = jpDosisCanon(t);
      if(cnR.rest !== undefined){ out.restSeconds = cnR.rest; if(cnR.restLabel) out.restLabel = cnR.restLabel; }
    }
    /* especificación secundaria ("por pierna"/"por lado"/"c/u"/"cada
       lado"/"isométrico"): nunca debe romper el reconocimiento de la
       dosis base ni colarse como nombre de ejercicio nuevo -- se guarda
       aparte para que el llamador la muestre como micro-etiqueta de
       soporte (directiva: "[ ⚡ UNILATERAL · POR PIERNA ]"). */
    if(/\bpor\s*pierna\b/i.test(t)) out.notaSecundaria = 'Por pierna';
    else if(/\bpor\s*lado\b|\bc\/u\b|\bc\/lado\b|\bcada\s*lado\b/i.test(t)) out.notaSecundaria = 'Por lado';
    else if(/\bisom[eé]tric[oa]\b/i.test(t)) out.notaSecundaria = 'Isométrico';
    return out;
  }
  function esSoloDosisSB(linea, dosis){
    if(!(dosis.sets || dosis.reps || dosis.tempo || dosis.restSeconds || dosis.rir)) return false;
    /* directiva ("Motor de Ondulación S1 -> S4"): el RIR que genera
       ondularMesocicloAutomatico() en el Builder viene en rango ("RIR
       0-1") y S3 suma el sufijo "/ Fallo técnico" -- el strip original
       sólo reconocía "RIR" + UN dígito suelto, así que esa línea quedaba
       con residuo >= 4 caracteres y la dosis dejaba de reconocerse como
       continuación del ejercicio anterior (se abría un ejercicio nuevo
       fantasma con el texto de la dosis como nombre). */
    /* directiva maestra ("Parser universal y tolerante") -- el strip del
       segmento de descanso ahora consume TODA la cláusula (rest\s*[^|]+,
       mismo patrón agnóstico que parsearDosisSB de arriba) sin importar
       cuántas aclaraciones/barras traiga -- antes sólo se comía "Rest
       60s" y el resto quedaba como residuo largo, tumbando la línea a
       "ejercicio nuevo" fantasma. Se suma "isométrico" a las
       especificaciones secundarias en prosa que nunca son parte del
       nombre. */
    var resto = linea.replace(/\d+\s*(?:x|×|sets?\s*(?:x|×|de|:)?|series?\s*(?:x|×|de|:)?|rondas?\s*(?:x|×|de|:)?)\s*\d+(?:(?:\s*[-\u2013\u2014]\s*|\s+a\s+)\d+)*(?:\s*(?:reps?|repeticiones)\b)?/gi, '')
      .replace(/\d+(?:\s*[-\u2013\u2014]\s*\d+)?\s*(?:reps?|repeticiones)\b/gi, '').replace(/\d+\s*(?:sets?|series?|rondas?)\b/gi, '')
      .replace(/tempo\s*(?:[\d\u00a7]{3,4}|isom[eé]tric[oa]|continuo)/gi, '').replace(/rir\s*\d+(?:\s*-\s*\d+)?(?:\s*\/\s*fallo\s*t[eé]cnico)?/gi, '')
      .replace(/(?:@|\|)\s*(?:carga\s*:?\s*)?\d+(?:[.,]\d+)?(?:\s*[-\u2013]\s*\d+(?:[.,]\d+)?)?\s*kgs?\b/gi, '')
      .replace(/\bdrop[\s-]?set\b|\brest[\s-]?pause\b|\bmyo[\s-]?reps?\b|\bal\s+fallo\b/gi, '')
      .replace(/(?:rest|descanso)\s*[^|]+/gi, '')
      .replace(/\bpor\s*pierna\b|\bpor\s*lado\b|\bc\/u\b|\bcada\s*lado\b|\bisom[eé]tric[oa]\b/gi, '')
      .replace(/[|.:,\-–\/]/g, '').trim();
    return resto.length < 4;
  }
  /* directiva ("Parser avanzado de metodologías de hipertrofia") -- un
     título de fase ("ANCLA DE FUERZA", "VOLUMEN EFECTIVO", "DROP OFF",
     "PUMP FINAL") es imposible de cubrir con una lista cerrada de
     palabras (cada coach redacta distinto), así que se detecta por
     FORMA, no por contenido: una línea corta, sin ningún dígito y
     escrita TODO EN MAYÚSCULAS es, en la convención real de escritura
     de un coach, casi siempre un separador táctico, nunca el nombre de
     un ejercicio real (esos se escriben en minúscula/Title Case). */
  function esFaseTacticaSB(linea){
    var t = String(linea || '').trim();
    if(!t || t.length > 40) return false;
    if(/\d/.test(t)) return false;
    if(esLineaDirectiva(t)) return false;
    var soloLetras = t.replace(/[^A-Za-zÀ-ÿ]/g, '');
    if(!soloLetras) return false;
    return t === t.toUpperCase() && t !== t.toLowerCase();
  }
  var RX_SUBEJ_SB = /^A(\d+)[.)]\s*(.+?):\s*(.+)$/i;
  /* directiva ("Refactoring maestro UI/UX Sports: colisión de letras en
     circuitos de Core") -- RX_SUBEJ_SB captura el nombre hasta el ÚLTIMO
     ":" antes de la dosis (no greedy pero ancla al primer ":" que
     encuentra): si la línea trae un prefijo de estación duplicado o
     residual ("A3. A2. Press Pallof: 3x12"), ese "A2." queda pegado
     DENTRO de subM[2] -- el badge de estación (.jp-sb-letra, letra
     calculada por índice) se pinta aparte, generando el texto ilegible
     reportado ("A3. A2. PRESS PALLOF" con una pastilla "C" montada
     encima). Se limpia CUALQUIER prefijo de estación sobrante (uno o
     varios, "A1.", "B2)", etc.) del nombre antes de asignarlo. */
  var RX_PREFIJO_ESTACION_SB = /^(?:[A-Za-z]\d+\s*[.:)\-\u2013\u2014\u00b7]+\s*|[A-Za-z]\d+\s+(?=\S)|[A-Za-z]\d*[.)]\s*|[A-Za-z]\s*:\s+)/;
  function limpiarPrefijoEstacionSB(nombre){
    var t = String(nombre || '').trim();
    var guard = 0;
    while(RX_PREFIJO_ESTACION_SB.test(t) && guard < 5){ t = t.replace(RX_PREFIJO_ESTACION_SB, '').trim(); guard++; }
    return t;
  }
  var RX_BISET_HEAD_SB = /\b(biset|biserie|superset|superserie|triset|triserie|circuito)\b/i;
  /* metadatos de coaching que NUNCA son prescripción: "[OBJETIVO ...]", "[COACHING TIPS ...]" y los encabezados de
     tips ("SET-UP", "CONTROL DE LA FASE", "INTENCIÓN NEUROMUSCULAR", "CUE MOTOR", "ERROR COMÚN"). Todo ese texto
     (y sus renglones de continuación) va exclusivamente al acordeón "PAUTAS TÉCNICAS, TIPS & VIDEOS DEL BLOQUE". */
  var RX_META_ETIQ_SB = /^\s*\[\s*(objetivo|coaching)\b[^\]]*\]\s*:?\s*(.*)$/i;
  var RX_META_TIPHEAD_SB = /^\s*(?:set[\s-]*up|control\s+de\s+la\s+fase|fase\s+exc[eé]ntrica|intenci[oó]n\s+neuromuscular|cue\s+motor|error\s+com[uú]n)\b/i;
  var RX_BLOQUE_TAG_SB = /^\s*\[\s*bloque\s*\d*\s*\]/i;
  function separarMetaPizarraSB(lineas){
    var cuerpo = [], obj = [], tips = [], modo = '';
    for(var i = 0; i < lineas.length; i++){
      var l = String(lineas[i] == null ? '' : lineas[i]).trim();
      if(!l) continue;
      var mE = l.match(RX_META_ETIQ_SB);
      if(mE){
        modo = /^objetivo/i.test(mE[1]) ? 'obj' : 'tips';
        if(mE[2]) (modo === 'obj' ? obj : tips).push(mE[2]);
        continue;
      }
      /* "[BLOQUE 1] Warm-Up ..." es el delimitador del bloque, no un ejercicio */
      if(RX_BLOQUE_TAG_SB.test(l)){ modo = ''; continue; }
      if(RX_META_TIPHEAD_SB.test(l)){ modo = 'tips'; tips.push(l); continue; }
      if(modo){
        var sig = String(lineas[i + 1] == null ? '' : lineas[i + 1]).trim();
        var esEj = RX_DOSIS_SB.test(l) || /^[A-Za-z]?\d+[.)]\s+\S/.test(l) || (!!sig && esSoloDosisSB(sig, parsearDosisSB(sig)));
        if(!esEj){ (modo === 'obj' ? obj : tips).push(l); continue; }
        modo = '';
      }
      cuerpo.push(lineas[i]);
    }
    return { lineas: cuerpo, objective: obj.join('\n'), tips: tips.join('\n') };
  }
  /* la técnica suelta (Myo-Reps / Drop Set) pertenece a la estación que nombra; si no nombra ninguna, a la última escrita */
  function subPorNombreSB(entry, linea){
    var n = normTitSB(linea);
    for(var i = 0; i < entry.subs.length; i++){
      var p = normTitSB(entry.subs[i].nombre).split(' ').filter(function(w){ return w.length > 3; }).slice(0, 2);
      if(p.length && p.every(function(w){ return n.indexOf(w) >= 0; })) return entry.subs[i];
    }
    return null;
  }
  function destinoTecnicaSB(entry, linea){
    var n = normTitSB(linea);
    for(var i = 0; i < entry.subs.length; i++){
      var p = normTitSB(entry.subs[i].nombre).split(' ').filter(function(w){ return w.length > 3; }).slice(0, 2);
      if(p.length && p.every(function(w){ return n.indexOf(w) >= 0; })) return entry.subs[i];
    }
    return entry.subs[entry.subs.length - 1];
  }
  /* "ESTRATEGIA BIOMECÁNICA & TIPS": una fase pedagógica por renglón, etiqueta en negrita dorada */
  function formatTipsSB(texto, nombres){
    var t = String(texto || '').trim();
    if(!t) return '';
    t = t.replace(/\b((?:ESTRATEGIA|REGLA|PAUTA|PLAN)\s+DE)\s*\n+\s*(?=TRANSICI)/gi, '$1 ');
    t = t.replace(/(TRANSICI[OÓ]N R[AÁ]PIDA)\s*,?\s*\n?\s*SET-?UP(?: Y ANCLAJE)?\s*:/gi, '$1 & SET-UP:');
    t = t.replace(/^([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ &\/-]{3,60}),\s*\n+(?=[A-ZÁÉÍÓÚÑ][^:\n]{2,70}:)/gm, '$1 & ');
    t = t.replace(/\s+(?=[A-F]\d\s*\u00b7\s*[A-Z])/g, '\n');      /* "A1 · ... A1 · ..." en un solo renglon: una etiqueta por linea */
    t = t.replace(/(\S)\s*(?=(?:SET-?UP|CLAVE|CUIDADO|CONTROL DE LA FASE|INTENCI[OÓ]N NEUROMUSCULAR|ERROR COM[UÚ]N|CUE MOTOR)[^:\n]{0,70}:)/g, function(m, c, off, whole){
      return /\b[A-F]\d\s*\u00b7\s*$/.test(whole.slice(0, off + m.length)) ? m : c + '\n';
    });
    t = t.replace(/ &\n/g, ' & ');
    var items = t.split(/\n+/).map(function(l){ return l.trim(); }).filter(Boolean).map(function(l){
      var m = l.match(/^([A-Z\u00c1\u00c9\u00cd\u00d3\u00da\u00d10-9][A-Z\u00c1\u00c9\u00cd\u00d3\u00da\u00d10-9 &\/\-\u2013\u00b7().,]{2,90}?):\s*(.*)$/);
      return m ? { lb: m[1], tx: m[2] } : { lb: '', tx: l };
    });
    var etiquetados = items.filter(function(i){ return i.lb; });
    function corto(x){ return String(x || '').trim(); }
    var ICO_TIP = { 'SET-UP': '&#127919; ', 'CLAVE': '&#9889; ', 'CUIDADO': '&#128721; ' };
    /* biset: cada estación conserva su letra ("A1 · SET-UP:", "A2 · ERROR:") */
    if(etiquetados.some(function(i){ return /^[A-F]\d\s*\u00b7/.test(i.lb); })){
      var grupos = {}, orden = [], trans = [], transDesc = false;
      etiquetados.forEach(function(i){
        var mm = i.lb.match(/^([A-F]\d)\s*\u00b7\s*(.+)$/), letra = mm ? mm[1] : '', k = normTitSB(mm ? mm[2] : i.lb);
        if(/transici/.test(k)){ trans.push(i.tx); if(/descanso/.test(k)) transDesc = true; return; }
        var cat = /set up|estabilidad|anclaje|postura|posicion/.test(k) ? 'SET-UP' : (/error|evitar|cuidado/.test(k) ? 'CUIDADO' : 'CLAVE');
        var key = letra + '|' + cat;
        if(!grupos[key]){ grupos[key] = { letra: letra, cat: cat, tx: [] }; orden.push(key); }
        grupos[key].tx.push(i.tx);
      });
      var ORD = { 'SET-UP': 0, 'CLAVE': 1, 'CUIDADO': 2 };
      orden.sort(function(a, b){ var A = grupos[a], B = grupos[b]; return A.letra === B.letra ? ORD[A.cat] - ORD[B.cat] : (A.letra < B.letra ? -1 : 1); });
      var porLetra = {}, ordL = [], nom = nombres || {};
      orden.forEach(function(k){ var g = grupos[k]; if(!porLetra[g.letra]){ porLetra[g.letra] = []; ordL.push(g.letra); } porLetra[g.letra].push(g); });
      return ordL.map(function(L){
        var info = nom[L] || null;
        var cab = L ? '<div class="jp-tip-exh"><span class="jp-tip-exn">' + L + (info && info.nombre ? ' \u00b7 ' + escSB(String(info.nombre).toUpperCase()) : '') + '</span>' + ((info && info.btn) || '') + '</div>' : '';
        return '<div class="jp-tip-ex">' + cab + porLetra[L].map(function(g){ return '<div class="jp-tip-fase jp-tip-bullet"><b class="jp-tip-lb">' + ICO_TIP[g.cat] + g.cat + '</b> ' + escSB(corto(g.tx.join(' '))) + '</div>'; }).join('') + '</div>';
      }).join('') + (trans.length ? '<div class="jp-tip-ex jp-tip-trans"><div class="jp-tip-fase jp-tip-bullet"><b class="jp-tip-lb">&#9201; TRANSICI&Oacute;N' + (transDesc ? ' &amp; DESCANSO' : '') + '</b> ' + escSB(corto(trans.join(' '))) + '</div></div>' : '');
    }
    /* pautas escritas "EJERCICIO: texto" (o "TOP SET:", "DESCANSO:"): cada línea conserva su rótulo y su orden, igual que en el Builder. Antes se fundían en un solo
       SET-UP / CLAVE / CUIDADO y se perdía a qué ejercicio hablaba cada pauta. Solo se agrupa cuando los rótulos son del vocabulario técnico (SET-UP, CLAVE, CUIDADO...). */
    var VOC_TIP_SB = /set up|estabilidad|anclaje|postura|posicion|error|evitar|cuidado|clave|cue|control de la fase|intencion|tempo|transici/;
    var propiosTip = etiquetados.filter(function(i){ return !VOC_TIP_SB.test(normTitSB(i.lb)); });
    if(etiquetados.length >= 2 && propiosTip.length * 2 >= etiquetados.length){
      return items.map(function(it){
        if(it.lb) return '<div class="jp-tip-fase"><b class="jp-tip-lb">' + escSB(it.lb) + '</b> ' + escSB(it.tx) + '</div>';
        return '<div class="jp-tip-fase">' + escSB(it.tx) + '</div>';
      }).join('');
    }
    if(etiquetados.length >= 2){
      var setup = [], accion = [], error = [];
      etiquetados.forEach(function(i){
        var k = normTitSB(i.lb);
        if(/set up|estabilidad|anclaje|postura|posicion/.test(k)) setup.push(i.tx);
        else if(/error|evitar|cuidado/.test(k)) error.push(i.tx);
        else accion.push(i.tx);
      });
      var bl = [];
      if(setup.length) bl.push(['SET-UP', corto(setup.join(' '))]);
      if(accion.length) bl.push(['CLAVE', corto(accion.join(' '))]);
      if(error.length) bl.push(['CUIDADO', corto(error.join(' '))]);
      return bl.map(function(x){ return '<div class="jp-tip-fase jp-tip-bullet"><b class="jp-tip-lb">' + ICO_TIP[x[0]] + x[0] + '</b> ' + escSB(x[1]) + '</div>'; }).join('');
    }
    return items.map(function(it){
      if(it.lb) return '<div class="jp-tip-fase"><b class="jp-tip-lb">' + escSB(it.lb) + '</b> ' + escSB(it.tx) + '</div>';
      return '<div class="jp-tip-fase">' + escSB(it.tx) + '</div>';
    }).join('');
  }
  function metaHtmlSB(t){ return escSB(t).replace(/\n/g, '<br>'); }
  function normTitSB(s){ return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  /* estación de biset/superserie con el nombre en su propio renglón ("A1) Goblet Squat", "B2. Remo", "1. Press"):
     la dosis llega en las líneas siguientes. El prefijo sólo con número ("1.") exige estar ya dentro de un biset. */
  var RX_ESTACION_SB = /^([A-Za-z]?)(\d+)[.)]\s+(\S.*)$/;
  /* vuelca una línea de dosis ("3x12 | Tempo 3010 | RIR 2", "Rest 90s") sobre una estación del biset */
  function aplicarDosisSubSB(sub, entry, txt){
    var res = extraerTecnicaSB(txt);
    var d = parsearDosisSB(res.texto);
    if(d.sets || d.reps){ if(d.sets) sub.sets = d.sets; if(d.reps){ sub.reps = d.reps; sub.unidad = d.unidad || sub.unidad; } }
    if(d.tempo && !sub.tempo) sub.tempo = d.tempo;
    if(d.rir && !sub.rir) sub.rir = d.rir;
    if(d.carga) sub.carga = d.carga;
    if(d.restSeconds !== undefined) sub.restSeconds = d.restSeconds;
    if(res.tecnica) sub.tecnica = res.tecnica;
    if(res.tecnica === 'dropset') sub.tecnicaPct = extraerPctSB(res.texto);
    var myoC = txt.match(RX_MYO_CLAUSE_SB);
    if(myoC){ sub.tecnica = 'myoreps'; sub.myoInfo = extraerMyoInfoSB(myoC[1] || ''); }
    var parenM = res.texto.match(/\(([^)]+)\)/);
    var extra = [parenM ? parenM[1] : '', (d.notaSecundaria && d.notaSecundaria !== 'Por pierna' && d.notaSecundaria !== 'Por lado') ? d.notaSecundaria : ''].filter(Boolean).join(' · ');
    if(extra) sub.nota = sub.nota ? sub.nota + ' · ' + extra : extra;
    if(d.notaSecundaria === 'Por pierna' || d.notaSecundaria === 'Por lado') sub.unilateral = d.notaSecundaria;
    if(d.sets && !entry.rondasExp){ entry.rondas = Math.max(entry.rondasAuto || 0, d.sets); entry.rondasAuto = entry.rondas; }
    return d;
  }
  var RX_RONDAS_SB = /(\d+)\s*rondas?/i;
  var RX_REST_SB = /rest\s*(\d+)/i;
  /* directiva ("Pizarra Única"): 🎯/"Objetivo:" y 💡/"Tip:"/"Pauta:" son
     metadata del bloque (ver extraerMetadatosPizarraSports() del lado
     del Builder, mismo par de prefijos) -- NUNCA deben convertirse en un
     ejercicio fantasma ni en la dosis del ejercicio anterior, así que se
     detectan y descartan ANTES que cualquier otra clasificación. */
  var RX_META_OBJETIVO_SB = /^(?:🎯|objetivo\s*:)/i;
  var RX_META_TIP_SB = /^(?:💡|tip\s*:|pauta\s*:)/i;
  function esLineaMetaSB(linea){
    return RX_META_OBJETIVO_SB.test(linea) || RX_META_TIP_SB.test(linea);
  }
  /* clasifica línea por línea (sin depender de blancos, ver nota de
     arriba) y reconstruye ejercicios simples y biseries/trisets. */
  /* "Nombre 4x6-8", "Nombre — 4 sets x 6-8 reps | Tempo...", "Nombre (4x6-8) Tempo...", "3x10 Nombre @ 20kg",
     "Nombre 4 series de 6 a 8 repeticiones": el titulo se corta limpio donde empieza la dosis (sin patron NxM, solo con reps +
     tempo/RIR/descanso tambien cuenta). Devuelve null si la linea no trae dosis o lo que queda no parece un nombre de ejercicio. */
  function cortarNombreDosisSB(linea){
    var t = String(linea || '').trim().replace(/^\d+\s*[.)]\s+/, '');
    if(!t) return null;
    var m = t.match(RX_DOSIS_SB), idx = -1, fin = 0;
    if(m){ idx = m.index; fin = m.index + m[0].length; }
    else {
      var mr = t.match(RX_REPS_SUELTAS_SB), dp = parsearDosisSB(t);
      if(mr && (dp.tempo || dp.rir || dp.restSeconds !== undefined)){ idx = mr.index; fin = mr.index + mr[0].length; }
    }
    if(idx < 0) return null;
    var nombre;
    if(idx > 0) nombre = t.slice(0, idx).replace(/[\s:|\-\u2013\u2014(\[]+$/, '');
    else nombre = t.slice(fin).replace(/^[\s:|\-\u2013\u2014,]+/, '').replace(/^(?:reps?|repeticiones)\b\s*(?:de\s+)?/i, '').split(/\s*(?:@|\||\(|,)/)[0];
    nombre = String(nombre).trim();
    if(nombre.length < 3 || nombre.length > 70 || !/[A-Za-z\u00c0-\u00ff]{3}/.test(nombre)) return null;
    if(esLineaDirectiva(nombre) || /^(?:rest|descanso|tempo|rir|realizar|hacer|completar|repetir|luego|despu[e\u00e9]s|total|en total|aprox\w*|aplicar|mantener|usar|buscar)\b/i.test(nombre)) return null;
    return { nombre: nombre, dosis: t, dosisPrimero: idx === 0 };
  }
  /* un ejercicio sin dosis escrita que NO es cardio/calentamiento/nota se registra igual: 1 set interactivo por defecto */
  function esEjercicioIndividualSB(entry, block){
    var t = String(entry.titulo || '').trim();
    if(!t || t.length > 60 || t.split(/\s+/).length > 8 || /[.!?]\s*$/.test(t)) return false;
    if(/^(?:nota|tip|obj|objetivo|pauta|recuerd|importante|descanso|rest|cap|amrap|emom|every|realizar|hacer|completar|repetir|luego|despu[e\u00e9]s|total|aplicar|mantener|usar|buscar|controlar|evitar|priorizar|enfocar|cuidar|recordar|respirar|\*)/i.test(t)) return false;
    if(/^(?:metcon|cardio|endurance|warmup)$/.test(String(block.category || ''))) return false;
    if(/^\s*(?:\u26a1|\u23f1|\u26a0|[\ud83c-\ud83d][\udc00-\udfff])/.test(t) || /\b(?:estrategia|coaching|tips?|objetivo|notas?|errores?|cues?|progresi[o\u00f3]n)\b/i.test(t)) return false;
    if(/\b\d+\s*(?:min|minutos|km|cal|mts?|metros)\b/i.test(t) || /\b(?:cardio|bici|bike|cinta|trote|trotar|correr|caminata|el[ií]ptico|assault|skierg|remo suave)\b/i.test(t)) return false;
    return true;
  }
  /* "Every 1:30 x 6 sets", "Every 2 min x 5", "EMOM 10 min", "E2MOM 12 min": encabezado de intervalo, NUNCA un ejercicio
     (antes "1:30 x 6" se leia como 30 series x 6 reps = 30 casilleros). Solo si no trae nombre de ejercicio en la misma linea. */
  function parseIntervaloSB(linea){
    var l = String(linea || '').replace(/^[^A-Za-z0-9]+/, '').replace(/[*\s]+$/, '').trim(), m, seg = 0, sets = 0, resto = '';
    if((m = l.match(/^(?:every|each|cada)\s+(\d+)(?::(\d{2}))?\s*(?:(min(?:ute|uto)?s?|seg(?:undos?)?|secs?|s)\b)?(.*)$/i))){
      if(m[2] !== undefined) seg = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
      else if(m[3] && /^s/i.test(m[3])) seg = parseInt(m[1], 10);
      else seg = parseInt(m[1], 10) * 60;
      resto = m[4] || '';
    } else if((m = l.match(/^(\d+):(\d{2})\s*(?:min\w*)?\s*(?:x|\u00d7)\s*(\d+)(.*)$/i))){
      seg = parseInt(m[1], 10) * 60 + parseInt(m[2], 10); sets = parseInt(m[3], 10); resto = m[4] || '';
    } else if((m = l.match(/^(?:emom|e(\d+)mom)\s*(?:de\s*)?(\d+)\s*(?:min\w*)?(.*)$/i))){
      seg = m[1] ? parseInt(m[1], 10) * 60 : 60;
      sets = m[1] ? Math.floor(parseInt(m[2], 10) / parseInt(m[1], 10)) : parseInt(m[2], 10);
      resto = m[3] || '';
    } else return null;
    if(!(seg > 0)) return null;
    var mS = null;
    if(!sets){
      var r0 = resto.replace(/^[\s,;]*(?:min(?:ute|uto)?s?\b)?/i, '');
      mS = r0.match(/^\s*(?:x|\u00d7|\u00b7|por|for)\s*(\d+)\s*(?:sets?|rondas?|rounds?|series|vueltas)?/i) || r0.match(/^\s*(\d+)\s*(?:sets?|rondas?|rounds?|series|vueltas)\b/i);
      if(mS){ sets = parseInt(mS[1], 10); resto = r0.slice(mS[0].length); }
    } else resto = resto.replace(/^\s*(?:sets?|rondas?|rounds?|series|vueltas)\b/i, '');
    var guard = 0, ant;
    do{ ant = resto; resto = resto.replace(/^[\s:,.;\-\u2013\u2014\u00b7*]+/, '').replace(/^\([^)]*\)/, ''); guard++; } while(resto !== ant && guard < 6);
    resto = resto.trim();
    if(resto && !/[A-Za-z\u00c0-\u00ff0-9]/.test(resto)) resto = '';
    return { seg: seg, sets: sets, resto: resto, texto: 'Every ' + fmtIntervaloSB(seg) + (sets ? ' x ' + sets + ' sets' : '') };
  }
  function fmtIntervaloSB(seg){ return Math.floor(seg / 60) + ':' + ('0' + (seg % 60)).slice(-2); }
  var RX_NOTA_INT_SB = /^\s*(?:\u26a1|\u23f1|\u26a0|[\ud83c-\ud83d][\udc00-\udfff])|\b(?:estrategia|coaching|tips?|objetivo|notas?|errores?|cues?|progresi[o\u00f3]n)\b/i;
  /* ejercicio dentro de un grupo de intervalo: "1 Snatch balance + 1 Overhead squat @ 60-70% 1RM" -> nombre "Snatch balance + Overhead squat",
     reps "1+1", carga "60-70% 1RM", sets del encabezado */
  function aplicarIntervaloSB(en, hdr){
    var titulo = String(en.titulo || '');
    if(RX_NOTA_INT_SB.test(titulo) && !/@/.test(titulo)) return;
    en.int = hdr;
    var mC = titulo.match(/@\s*(.+)$/);
    if(mC){ en.carga = mC[1].trim(); titulo = titulo.replace(/\s*@.*$/, ''); }
    if(titulo.indexOf('|') >= 0){
      var dP = parsearDosisSB(titulo);
      if(dP.tempo && !en.tempo) en.tempo = dP.tempo;
      if(dP.rir && !en.rir) en.rir = dP.rir;
      titulo = titulo.split('|')[0];
    }
    var partes = titulo.trim().split(/\s*\+\s*/), reps = [], nombres = [];
    partes.forEach(function(p){
      var m = p.match(/^(\d+(?:\s*[-\u2013]\s*\d+)?)\s*(?:x|reps?)?\s+(\S.*)$/i);
      if(m){ reps.push(m[1].replace(/\s+/g, '')); nombres.push(m[2].trim()); } else nombres.push(p.trim());
    });
    en.titulo = nombres.join(' + ');
    if(!en.reps) en.reps = reps.length === nombres.length ? reps.join('+') : (reps[0] || '');
    if(!en.sets) en.sets = hdr.sets || 1;
    en.dosisAsignada = true; en.complex = nombres.length > 1; en.setsDef = false;
    if(!en.restSeconds) en.restSeconds = hdr.seg || 0;
  }
  /* notas tacticas ("⏱ PAUTA DE DESCANSO: ...", "ESTRATEGIA DE PROGRESIÓN: ...", "⚡ Foco ..."): jamas un ejercicio; se muestran como micro-banner */
  var RX_NOTA_EMOJI_SB = /^\s*(?:\u26a1|\u23f1|\u23f0|\u26a0|\ud83c\udfaf|\ud83d\udca1|\ud83d\uded1|\ud83d\udccc|\ud83d\udcdd)/;
  var RX_NOTA_TACTICA_SB = /^\s*(?:estrategia|pauta|notas?|coaching|progresi[o\u00f3]n|recomendaci[o\u00f3]n|criterio)\b[^:\n]{0,45}:\s*\S/i;
  function crearNotaSB(linea){
    var t = String(linea || '').trim(), mE = t.match(/^\s*(\u26a1|\u23f1|\u23f0|\u26a0|\ud83c\udfaf|\ud83d\udca1|\ud83d\uded1|\ud83d\udccc|\ud83d\udcdd)\s*/);
    var icono = mE ? mE[1] : '', cuerpo = mE ? t.slice(mE[0].length) : t, label = '', texto = cuerpo;
    var mC = cuerpo.match(/^([^:]{2,60}):\s*(.*)$/);
    if(mC){ label = mC[1].trim(); texto = mC[2].trim(); }
    if(!label) label = /descanso|rest/i.test(cuerpo) ? 'PAUTA DE DESCANSO' : (/progres|estrateg/i.test(cuerpo) ? 'ESTRATEGIA DE PROGRESI\u00d3N' : 'NOTA');
    if(!icono) icono = /descanso|rest/i.test(label) ? '\u23f1' : (/progres|estrateg/i.test(label) ? '\ud83c\udfaf' : '\ud83d\udca1');
    return { tipo: 'nota', icono: icono, titulo: label, texto: texto };
  }
  /* "12 High & Wide Leg Press" suelto dentro de una triserie: es otra estacion del mismo grupo, nunca un renglon aparte */
  function nombreHuerfanoSB(linea){
    var t = String(linea || '').trim();
    if(!t || t.length > 70 || /[:@|]/.test(t) || /[.!?]\s*$/.test(t)) return null;
    if(esLineaDirectiva(t) || RX_NOTA_TACTICA_SB.test(t) || RX_NOTA_EMOJI_SB.test(t)) return null;
    var cn = cortarNombreDosisSB(t);
    if(cn) return { nombre: limpiarPrefijoEstacionSB(cn.nombre), dosis: cn.dosis };
    var m = t.match(/^(\d+(?:\s*[-\u2013]\s*\d+)?)\s*(?:x|\u00d7|reps?)?\s+(\S.*)$/i);
    var nom = (m ? m[2] : t).trim(), reps = m ? m[1].replace(/\s+/g, '') : '';
    if(nom.length < 3 || nom.split(/\s+/).length > 8 || !/[A-Za-z\u00c0-\u00ff]{3}/.test(nom)) return null;
    if(/^(?:rest|descanso|descansar|tempo|rir|realizar|hacer|completar|repetir|luego|despu[e\u00e9]s|total|mantener|usar|rondas?|rounds?)\b/i.test(nom)) return null;
    return { nombre: nom, reps: reps };
  }
  /* tempo con X ("Tempo 31X0"): la X no es un "NxM" -- antes se leia como 31 series x 0 reps y la linea entera pasaba a ser el titulo.
     Se enmascara con \u00a7 mientras se parsea y se restaura al devolver las entradas. */
  function restaurarTempoSB(o, vistos){
    vistos = vistos || [];
    if(typeof o === 'string') return o.indexOf('\u00a7') >= 0 ? o.replace(/\u00a7/g, 'X') : o;
    if(!o || typeof o !== 'object' || vistos.indexOf(o) >= 0) return o;
    vistos.push(o);
    if(Array.isArray(o)){ for(var i = 0; i < o.length; i++) o[i] = restaurarTempoSB(o[i], vistos); return o; }
    Object.keys(o).forEach(function(k){ o[k] = restaurarTempoSB(o[k], vistos); });
    return o;
  }
  function parsearPizarraSB(lineas, opts){
    var entries = [], actual = null;
    lineas = separarMetaPizarraSB(lineas).lineas.map(function(l){
      return String(l == null ? '' : l).replace(/(tempo\s*:?\s*)([0-9Xx]{3,4})\b/gi, function(m, a, b){ return /[Xx]/.test(b) ? a + b.replace(/[Xx]/g, '\u00a7') : m; });
    });
    var hayIntSB = false;
    lineas = lineas.reduce(function(a, l){
      var h = parseIntervaloSB(l);
      if(h){ hayIntSB = true; a.push(h.texto); if(h.resto) a.push(h.resto); return a; }
      a.push(hayIntSB ? String(l).replace(/^\s*[A-Fa-f]\d+\s*[.:)\-\u2013\u2014]\s*/, '') : l);
      return a;
    }, []);
    /* el título del bloque ("Superserie", "Biset: ...") habilita las estaciones sólo-número ("1." / "2.") */
    var titBiset = !!(opts && opts.titulo && RX_BISET_HEAD_SB.test(String(opts.titulo)));
    var titSuper = !!(opts && opts.titulo && /super/i.test(String(opts.titulo)));
    lineas.forEach(function(raw){
      var linea = String(raw || '').trim();
      if(!linea) return;
      if(esLineaMetaSB(linea)) return;
      var hdrInt = parseIntervaloSB(linea);
      if(hdrInt){ actual = null; entries.push({ tipo: 'intervalo', seg: hdrInt.seg, sets: hdrInt.sets, texto: hdrInt.texto }); return; }
      if(RX_NOTA_EMOJI_SB.test(linea) || RX_NOTA_TACTICA_SB.test(linea)){ entries.push(crearNotaSB(linea)); return; }
      var mSetR = linea.match(/^\s*(?:sets?|series?)\s*(\d+)(?:\s*[-\u2013]\s*(\d+))?\s*[:.\-\u2013\u2014]\s*(\S.*)$/i);
      if(mSetR){
        var restoSR = mSetR[3], cargaSR = '', mCSR = restoSR.match(/@\s*(.+)$/);
        if(mCSR){ cargaSR = mCSR[1].trim(); restoSR = restoSR.replace(/\s*@.*$/, ''); }
        var mRSR = restoSR.match(/^(\d+(?:\s*[-\u2013]\s*\d+)?)\s*(?:x|\u00d7|reps?)?\s+(\S.*)$/i);
        var nSetsSR = mSetR[2] ? Math.max(1, parseInt(mSetR[2], 10) - parseInt(mSetR[1], 10) + 1) : 1;
        actual = { tipo:'simple', titulo: (mRSR ? mRSR[2] : restoSR).trim(), tituloOriginal: linea, sets: nSetsSR, reps: mRSR ? mRSR[1].replace(/\s+/g, '').replace(/\u2013/g, '-') : '', carga: cargaSR, tempo:'', restSeconds:0, rir:'', dosisAsignada:true, tecnica:'', tecnicaPct:null, myoInfo:null, notas:[], unidad:'reps' };
        entries.push(actual);
        return;
      }
      /* "BARBELL BACK SQUAT × 1x3 (Aclimatación) + 1x6 (Top Set) + 2x8 (Back-off) | TEMPO 3110 | REST 120-180s": un solo ejercicio con tres tramos
         (4 sets en total), nunca solo la primera dosis. Sin nombre en la línea, los tramos pasan al ejercicio recién nombrado. */
      var cnT = (typeof jpDosisCanon === 'function') ? jpDosisCanon(linea) : null;
      if(((cnT && cnT.tramos.length > 1) || (!cnT && RX_MULTI_TRAMO_SB.test(linea))) && !(actual && actual.tipo === 'biserie' && actual.subs.length)){
        var iTr = cnT ? cnT.corte : linea.search(/\d+\s*[x\u00d7]\s*\d+/i);
        var nomTr = (typeof jpLimpiarNombreEj === 'function') ? jpLimpiarNombreEj(linea.slice(0, iTr)) : linea.slice(0, iTr).replace(/^[\s\-\u2013\u2014\u2022*]+/, '').replace(/\s+[x\u00d7]\s*$/i, '').replace(/[\s\u00d7:|\-\u2013\u2014(]+$/, '').trim();
        var colaTr = linea.slice(iTr), segTr = colaTr.split('|')[0], tramosTr = [], mTr2;
        if(cnT){
          cnT.tramos.forEach(function(t){ tramosTr.push({ sets: t.sets, reps: t.reps, unidad: 'reps', tempo: '', rir: '', rest: 0, etq: t.etq || '' }); });
        } else {
          var rxT = /(\d+)\s*[x\u00d7]\s*(\d+(?:\s*[-\u2013]\s*\d+)?)\s*(?:\(([^)]*)\))?/gi;
          while((mTr2 = rxT.exec(segTr))) tramosTr.push({ sets: parseInt(mTr2[1], 10), reps: mTr2[2].replace(/\s+/g, '').replace(/\u2013/g, '-'), unidad: 'reps', tempo: '', rir: '', rest: 0, etq: mTr2[3] ? mTr2[3].trim() : '' });
        }
        var destTr = null;
        if(tramosTr.length > 1){
          if(nomTr){
            destTr = { tipo:'simple', titulo: nomTr, tituloOriginal: linea, sets:0, reps:'', tempo:'', restSeconds:0, rir:'', dosisAsignada:true, tecnica:'', tecnicaPct:null, myoInfo:null, notas:[], unidad:'reps' };
            entries.push(destTr); actual = destTr;
          } else if(actual && actual.tipo === 'simple' && !actual.dosisAsignada) destTr = actual;
        }
        if(destTr){
          var dTr = parsearDosisSB(colaTr);
          destTr.tramos = tramosTr;
          destTr.sets = tramosTr.reduce(function(a, t){ return a + t.sets; }, 0);
          destTr.reps = tramosTr.reduce(function(a, t){ return t.sets > a.sets ? t : a; }, tramosTr[0]).reps;
          destTr.tempo = dTr.tempo || ''; destTr.rir = dTr.rir || ''; destTr.restSeconds = dTr.restSeconds || 0;
          destTr.restLabel = dTr.restLabel || '';
          destTr.dosisAsignada = true;
          return;
        }
      }
      var subM = linea.match(RX_SUBEJ_SB);
      /* "A1) Nombre" sin dosis (o "B2. Nombre 3x12" sin dos puntos): nueva estación del biset; la dosis se acumula
         con los renglones siguientes. Un "A1" cuando el biset abierto ya empezó en 1, o un cambio de letra, abre otro biset. */
      var estM = !subM ? linea.match(RX_ESTACION_SB) : null;
      var mDosisE = estM ? estM[3].match(RX_DOSIS_SB) : null;
      var corteE = (estM && !mDosisE) ? estM[3].search(RX_CORTE_DOSIS_SB) : -1;
      var idxDosisE = mDosisE ? mDosisE.index : (corteE > 0 ? corteE : -1);
      var nomPuroE = estM ? (idxDosisE >= 0 ? estM[3].slice(0, idxDosisE) : estM[3]).replace(/[\s:|\-\u2013\u2014]+$/, '').trim() : '';
      if(estM && nomPuroE && (estM[1] || titBiset || (actual && actual.tipo === 'biserie'))){
        var letraE = estM[1].toUpperCase();
        if(!actual || actual.tipo !== 'biserie' || (letraE && actual.letra && actual.letra !== letraE) || (estM[2] === '1' && actual.subs.length)){
          actual = { tipo:'biserie', titulo: titSuper ? 'Superserie' : 'Biset / Triset', subs:[], rondas:3, restSeconds:90, letra: letraE };
          entries.push(actual);
        }
        if(!actual.letra) actual.letra = letraE;
        var resNomE = extraerTecnicaSB(nomPuroE);
        var nomE = limpiarPrefijoEstacionSB(resNomE.tecnica ? resNomE.texto : nomPuroE);
        var subE = { nombre: nomE, reps:'', tempo:'', tecnica: resNomE.tecnica || '', nota:'', unilateral:'', unidad:'reps', rir:'', restSeconds:0, sets:0 };
        actual.subs.push(subE);
        if(idxDosisE >= 0) aplicarDosisSubSB(subE, actual, estM[3].slice(idxDosisE));
        return;
      }
      if(subM){
        if(!actual || actual.tipo !== 'biserie'){ actual = { tipo:'biserie', titulo:'Biset / Triset', subs:[], rondas:3, restSeconds:90 }; entries.push(actual); }
        var resSub = extraerTecnicaSB(subM[3]);
        var dosisSub = parsearDosisSB(resSub.texto);
        var parenM = resSub.texto.match(/\(([^)]+)\)/);
        /* directiva maestra ("Parser universal y tolerante") -- "por
           pierna"/"por lado" se montan como micro-chip táctico propio
           (ver jp-sb-unilateral en el render, más abajo), nunca mezclados
           dentro de la nota en cursiva genérica. */
        var esUnilateralSub = dosisSub.notaSecundaria === 'Por pierna' || dosisSub.notaSecundaria === 'Por lado';
        var notaSubCombinada = [parenM ? parenM[1] : '', (!esUnilateralSub && dosisSub.notaSecundaria) || ''].filter(Boolean).join(' · ');
        actual.subs.push({ nombre: limpiarPrefijoEstacionSB(subM[2]), reps: dosisSub.reps || '', tempo: dosisSub.tempo || '', tecnica: resSub.tecnica, nota: notaSubCombinada, unilateral: esUnilateralSub ? dosisSub.notaSecundaria : '', unidad: dosisSub.unidad || 'reps', rir: dosisSub.rir || '', carga: dosisSub.carga || '', restSeconds: dosisSub.restSeconds || 0, sets: dosisSub.sets || 0,
          tecnicaPct: resSub.tecnica === 'dropset' ? extraerPctSB(resSub.texto) : null,
          myoInfo: (subM[3].match(RX_MYO_CLAUSE_SB) ? extraerMyoInfoSB(subM[3].match(RX_MYO_CLAUSE_SB)[1] || '') : null) });
        if(subM[3].match(RX_MYO_CLAUSE_SB)) actual.subs[actual.subs.length - 1].tecnica = 'myoreps';
        if(dosisSub.sets && !actual.rondasExp){ actual.rondas = Math.max(actual.rondasAuto || 0, dosisSub.sets); actual.rondasAuto = actual.rondas; }
        return;
      }
      if(RX_BISET_HEAD_SB.test(linea) && (!actual || actual.tipo !== 'biserie' || actual.subs.length)){
        actual = { tipo:'biserie', titulo: linea.replace(/^(biset|superset|triset|circuito)\s*[·:\-]?\s*/i, '').trim() || linea, subs:[], rondas:3, restSeconds:90 };
        entries.push(actual);
        return;
      }
      if(actual && actual.tipo === 'biserie' && !actual.subs.length && (RX_RONDAS_SB.test(linea) || RX_REST_SB.test(linea))){
        var rM = linea.match(RX_RONDAS_SB); if(rM){ actual.rondas = parseInt(rM[1], 10); actual.rondasExp = true; }
        var restM = linea.match(RX_REST_SB); if(restM) actual.restSeconds = parseInt(restM[1], 10);
        return;
      }
      if(actual && actual.tipo === 'biserie'){
        var dBis = parsearDosisSB(linea);
        var esRestBis = /^\s*(?:rest|descanso)\b/i.test(linea);
        var arrancaConDosis = !!(dBis.sets && linea.search(RX_DOSIS_SB) === 0);
        /* "3 sets x 4 reps, 5 respiraciones": detalle del protocolo Myo-Reps de la estación que lo prescribe, no su dosis */
        if(actual.subs.length && arrancaConDosis && !esRestBis){
          var subMyo = actual.subs.filter(function(s){ return s.tecnica === 'myoreps'; })[0];
          if(subMyo && actual.subs[actual.subs.length - 1].reps && dBis.sets){
            subMyo.myoInfo = Object.assign(subMyo.myoInfo || {}, { microCount: dBis.sets, microReps: parseInt(dBis.reps, 10) || 0 });
            return;
          }
        }
        if(actual.subs.length && (esRestBis || arrancaConDosis || esSoloDosisSB(linea, dBis))){
          aplicarDosisSubSB(actual.subs[actual.subs.length - 1], actual, linea);
          return;
        }
        /* biset sin estaciones todavía: la dosis es del grupo y la heredan las estaciones que no traigan la suya */
        if(!actual.subs.length && (esRestBis || arrancaConDosis || esSoloDosisSB(linea, dBis))){
          actual.base = actual.base || { reps:'', tempo:'', rir:'', unidad:'reps', restSeconds:0, sets:0 };
          aplicarDosisSubSB(actual.base, actual, linea);
          return;
        }
        /* "+ 3 set myo-reps (...)" / "[DROPSET] ..." sueltos: son de la ESTACIÓN que los prescribe (la anterior) */
        var porNombreB = actual.subs.length ? subPorNombreSB(actual, linea) : null;
        if(actual.subs.length && (porNombreB || !/^[^:\[\n]{3,}:\s*\S/.test(linea))){
          var lastB = porNombreB || destinoTecnicaSB(actual, linea);
          var myoB = linea.match(RX_MYO_CLAUSE_SB);
          var resTB = extraerTecnicaSB(linea.replace(/^\*\s*/, ''));
          if(myoB){ lastB.tecnica = 'myoreps'; lastB.myoInfo = extraerMyoInfoSB(myoB[1] || ''); return; }
          if(resTB.tecnica){ lastB.tecnica = resTB.tecnica; if(resTB.tecnica === 'dropset') lastB.tecnicaPct = extraerPctSB(resTB.texto); return; }
        }
        if(actual.subs.length && (/^\*/.test(linea) || esLineaDirectiva(linea))){
          var ult = actual.subs[actual.subs.length - 1];
          var txtN = linea.replace(/^\*\s*/, '');
          ult.nota = ult.nota ? ult.nota + ' · ' + txtN : txtN;
          return;
        }
        /* ejercicio suelto dentro del grupo (sin "A3."): pasa a ser la estacion siguiente */
        var huer = actual.subs.length ? nombreHuerfanoSB(linea) : null;
        if(huer){
          var subH = { nombre: huer.nombre, reps: huer.reps || '', tempo: '', tecnica: '', nota: '', unilateral: '', unidad: 'reps', rir: '', restSeconds: 0, sets: 0 };
          actual.subs.push(subH);
          if(huer.dosis) aplicarDosisSubSB(subH, actual, huer.dosis);
          return;
        }
      }
      /* directiva maestra ("Refactoring Visual y Optimización de Espacio")
         -- una línea que es SOLO una duración suelta ("6 minutos:", "10
         min:") nunca es un ejercicio -- antes caía al catch-all 'simple'
         y se pintaba como una fila más de la lista, con su propia flecha
         ▸, como si fuera algo que el alumno tiene que "hacer". Se separa
         a su propio tipo para que el render la monte como chip de
         cabecera del bloque (⏱ TIEMPO ESTIMADO), nunca como fila. */
      var mDuracion = linea.match(/^(\d+)\s*(?:minutos?|mins?)\s*:?\s*$/i);
      if(mDuracion){
        entries.push({ tipo:'duracion', minutos: parseInt(mDuracion[1], 10) });
        return;
      }
      /* directiva ("Parser avanzado de metodologías") -- separador
         táctico de fase: nunca se vuelve "actual" (la próxima línea real
         sigue arrancando su propio ejercicio nuevo con normalidad, sin
         que un título de fase se interponga). */
      if(esFaseTacticaSB(linea)){
        entries.push({ tipo:'fase', titulo: linea });
        return;
      }
      /* directiva ("Compilación estructurada de Myo-Reps") -- si la línea
         trae la cláusula "+ N set myo-reps (...)" pegada a la dosis base,
         se recorta ANTES de intentar parsear/validar la dosis: así "3
         sets x 12 reps" se sigue reconociendo limpio aunque comparta
         línea con el detalle de Myo-Reps. */
      var myoClauseM = linea.match(RX_MYO_CLAUSE_SB);
      var lineaParaDosis = myoClauseM ? (linea.slice(0, myoClauseM.index) + linea.slice(myoClauseM.index + myoClauseM[0].length)).replace(/\s+/g, ' ').trim() : linea;
      var dosis = parsearDosisSB(lineaParaDosis);
      /* detalle del protocolo Myo-Reps escrito como línea de dosis ("3 sets x 4 reps con 5 respiraciones"): es del ejercicio con la
         técnica; nunca abre una tarjeta nueva "3 SETS | 4 REPS" */
      /* series escalonadas: "1 Set × 3 reps (Aclimatación pesada) | Tempo 31X0" bajo "Sentadilla con barra" son TRAMOS del mismo
         ejercicio (aclimatación, top set, back-off), nunca ejercicios nuevos. Solo si la línea empieza con la dosis y no trae nombre propio. */
      if(actual && actual.tipo === 'simple' && (actual.tramos || (!actual.dosisAsignada && !actual.tecnica)) && dosis.sets && lineaParaDosis.search(RX_DOSIS_SB) === 0){
        var mTr = lineaParaDosis.match(RX_DOSIS_SB), restoTr = lineaParaDosis.slice(mTr[0].length), parenTr = restoTr.match(/\(([^)]*)\)/);
        var sinTr = restoTr.replace(/\([^)]*\)/g, '').replace(/^\s*(?:reps?|repeticiones)\b/i, '').replace(/tempo\s*[\d\u00a7]{3,4}/gi, '')
          .replace(/rir\s*\d+(?:\s*-\s*\d+)?(?:\s*\/\s*fallo\s*t[eé]cnico)?/gi, '').replace(/(?:rest|descanso)\s*[^|]+/gi, '').replace(/[|.:,\-\u2013\u2014\/@%\s]/g, '');
        if((actual.tramos || parenTr) && !/[A-Za-z\u00c0-\u00ff]{3}/.test(sinTr)){
          actual.tramos = actual.tramos || [];
          actual.tramos.push({ sets: dosis.sets, reps: dosis.reps || '', unidad: dosis.unidad || 'reps', tempo: dosis.tempo || '', rir: dosis.rir || '', rest: dosis.restSeconds || 0, etq: parenTr ? parenTr[1].trim() : '' });
          var mayorTr = actual.tramos.reduce(function(a, t){ return t.sets > a.sets ? t : a; }, actual.tramos[0]);
          actual.sets = actual.tramos.reduce(function(a, t){ return a + t.sets; }, 0);
          actual.reps = mayorTr.reps; actual.unidad = mayorTr.unidad || 'reps';
          actual.restSeconds = actual.tramos.reduce(function(a, t){ return t.rest || a; }, 0);
          actual.dosisAsignada = true;
          return;
        }
      }
      if(actual && actual.tipo === 'simple' && actual.dosisAsignada && actual.tecnica === 'myoreps' && dosis.sets && lineaParaDosis.search(RX_DOSIS_SB) === 0){
        actual.myoInfo = Object.assign(actual.myoInfo || {}, { microCount: dosis.sets, microReps: parseInt(dosis.reps, 10) || 0 });
        return;
      }
      if(actual && actual.tipo === 'simple' && !actual.dosisAsignada && esSoloDosisSB(lineaParaDosis, dosis)){
        actual.sets = dosis.sets || actual.sets;
        actual.reps = dosis.reps || actual.reps;
        actual.tempo = dosis.tempo || actual.tempo;
        actual.restSeconds = dosis.restSeconds || actual.restSeconds;
        actual.rir = dosis.rir || actual.rir;
        if(dosis.carga) actual.carga = dosis.carga;
        actual.unidad = dosis.unidad || actual.unidad;
        actual.dosisAsignada = true;
        if(dosis.notaSecundaria){
          if(dosis.notaSecundaria === 'Por pierna' || dosis.notaSecundaria === 'Por lado') actual.unilateral = dosis.notaSecundaria;
          else actual.notas.push(dosis.notaSecundaria);
        }
        var resDosis = extraerTecnicaSB(lineaParaDosis);
        if(resDosis.tecnica){
          actual.tecnica = resDosis.tecnica;
          if(resDosis.tecnica === 'dropset') actual.tecnicaPct = extraerPctSB(resDosis.texto);
        }
        if(myoClauseM){
          actual.tecnica = 'myoreps';
          actual.myoInfo = extraerMyoInfoSB(myoClauseM[1] || '');
        }
        return;
      }
      /* una línea de nota/técnica avanzada NUNCA arranca un ejercicio
         nuevo -- se detecta por: empezar con "*", matchear
         esLineaDirectiva() (rest/cap/nota/amrap/...), o mencionar una
         técnica reconocida (con o sin corchetes, ver extraerTecnicaSB) --
         esto último es clave para el ejemplo de la propia directiva
         ("[DROPSET] última serie al 20% al fallo", sin "*" adelante).
         directiva maestra ("Registro ágil de 1 toque para Drop Sets y
         Myo-Reps") -- BUG REAL: una línea que SÍ trae su propio nombre
         antes de los dos puntos ("Abducción de cadera en máquina: 12
         reps al fallo [DROPSET]") es un EJERCICIO NUEVO con su propia
         técnica, no una nota suelta sobre el ejercicio anterior -- pero
         el único chequeo era "¿menciona una técnica?", así que se
         tragaba la línea entera como continuación y el ejercicio
         desaparecía. esPropioNombreConDosis descarta la continuación
         cuando la línea tiene "algo: algo" (estructura de declaración
         propia) -- el ejemplo real de la directiva ("[DROPSET] última
         serie...", el tag ARRANCA la línea, sin nombre ni ":" antes)
         sigue funcionando exactamente igual. */
      /* una línea "Rest 120s" / "Rest 0s" suelta tras la dosis fija el descanso del ejercicio
         (la dosis y el descanso se redactan en renglones separados); "Rest 0s" = sin descanso */
      if(actual && actual.tipo === 'simple' && /^\s*(?:rest|descanso)\b/i.test(linea) && dosis.restSeconds !== undefined){
        actual.restSeconds = dosis.restSeconds;
        if(dosis.restLabel) actual.restLabel = dosis.restLabel;
        if(dosis.restSeconds === 0) actual.restCero = true;
        return;
      }
      var resTecLinea = extraerTecnicaSB(linea);
      var esPropioNombreConDosis = /^[^:\[\n]{3,}:\s*\S/.test(linea);
      if(actual && actual.tipo === 'simple' && (esLineaDirectiva(linea) || /^\*/.test(linea) || (resTecLinea.tecnica && !esPropioNombreConDosis))){
        var resNota = extraerTecnicaSB(linea.replace(/^\*\s*/, ''));
        if(resNota.tecnica) actual.tecnica = resNota.tecnica;
        /* directiva ("Limpieza de residuos en técnicas avanzadas") -- el
           texto explicativo crudo de una línea de técnica (dropset/rest-
           pause/myo-reps/al fallo) NUNCA se vuelve a mostrar como nota
           suelta en cursiva: ya se comunica por completo con su badge en
           el set correspondiente. Sólo se conserva el dato útil (% para
           dropset, detalle estructurado para myo-reps); una nota SIN
           técnica (ej. "* usar agarre cerrado") se sigue mostrando igual
           que siempre. */
        if(resNota.tecnica === 'dropset'){
          actual.tecnicaPct = extraerPctSB(resNota.texto);
        } else if(resNota.tecnica === 'myoreps'){
          actual.myoInfo = extraerMyoInfoSB(resNota.texto) || actual.myoInfo;
        } else if(!resNota.tecnica && resNota.texto){
          actual.notas.push(resNota.texto);
        }
        return;
      }
      /* directiva maestra ("Parser universal y tolerante para Sports &
         Bodybuilding") -- "Nombre: dosis" en UNA sola línea (sin el
         prefijo "A1." de biset/triset, ej. "Sentadilla búlgara: 3 sets x
         8-10 reps por pierna | Tempo 3010 | RIR 2 | Rest 60s entre
         piernas / 90s al completar ambas") nunca abría un ejercicio con
         dosis real -- caía siempre al catch-all de abajo con sets:0 (la
         línea ENTERA quedaba como "nombre"), y el bloque se rendía como
         texto plano crudo sin SET 1/SET 2 interactivos -- el bug
         reportado explícitamente. Mismo criterio que RX_SUBEJ_SB (nombre
         : dosis) pero sin exigir el prefijo de estación -- sólo dispara
         si lo que sigue al PRIMER ":" matchea una dosis real reconocible
         (nunca con un "Nota: ..."/"Objetivo: ..." suelto, que no trae
         NxM adentro). */
      var mNombreDosis = linea.match(/^([^:]+):\s*(.+)$/);
      var dosisPrevND = mNombreDosis ? parsearDosisSB(mNombreDosis[2]) : null;
      var repsConPrescSB = !!(dosisPrevND && dosisPrevND.reps && (dosisPrevND.tempo || dosisPrevND.rir || dosisPrevND.restSeconds !== undefined));
      if(mNombreDosis && (RX_DOSIS_SB.test(mNombreDosis[2]) || repsConPrescSB)){
        var resND = extraerTecnicaSB(mNombreDosis[2]);
        var dosisND = parsearDosisSB(resND.texto);
        actual = { tipo:'simple', titulo: limpiarPrefijoEstacionSB(mNombreDosis[1]), sets: dosisND.sets || (dosisND.reps ? 1 : 0), reps: dosisND.reps || '', tempo: dosisND.tempo || '', restSeconds: dosisND.restSeconds || 0, rir: dosisND.rir || '', dosisAsignada:true, tecnica: resND.tecnica || '', tecnicaPct: resND.tecnica === 'dropset' ? extraerPctSB(resND.texto) : null, myoInfo:null, notas:[], unidad: dosisND.unidad || 'reps' };
        if(dosisND.notaSecundaria){
          if(dosisND.notaSecundaria === 'Por pierna' || dosisND.notaSecundaria === 'Por lado') actual.unilateral = dosisND.notaSecundaria;
          else actual.notas.push(dosisND.notaSecundaria);
        }
        entries.push(actual);
        return;
      }
      /* "Bench Press 4x6-8" / "Bench Press — 4 sets x 6-8 reps | Tempo..." / "1. Bench Press 4x6-8" / "3x10 DB Row @ 20kg": el titulo se corta donde empieza la dosis */
      var corteND = cortarNombreDosisSB(lineaParaDosis);
      if(corteND){
        var resCN = extraerTecnicaSB(corteND.dosis);
        var dosisCN = parsearDosisSB(resCN.texto);
        actual = { tipo:'simple', titulo: limpiarPrefijoEstacionSB(corteND.nombre), tituloOriginal: linea, sets: dosisCN.sets || (dosisCN.reps ? 1 : 0), reps: dosisCN.reps || '', tempo: dosisCN.tempo || '', restSeconds: dosisCN.restSeconds || 0, rir: dosisCN.rir || '', dosisAsignada:true, tecnica: resCN.tecnica || '', tecnicaPct: resCN.tecnica === 'dropset' ? extraerPctSB(resCN.texto) : null, myoInfo:null, notas:[], unidad: dosisCN.unidad || 'reps' };
        if(dosisCN.notaSecundaria){
          if(dosisCN.notaSecundaria === 'Por pierna' || dosisCN.notaSecundaria === 'Por lado') actual.unilateral = dosisCN.notaSecundaria;
          else actual.notas.push(dosisCN.notaSecundaria);
        }
        var mCarga = corteND.dosisPrimero ? corteND.dosis.match(/@\s*([\d.,]+\s*(?:kg|lbs?))/i) : null;
        if(mCarga) actual.notas.push('@ ' + mCarga[1]);
        else if(dosisCN.carga) actual.carga = dosisCN.carga;
        if(actual.sets){ entries.push(actual); return; }
      }
      /* directiva maestra ("Registro ágil de 1 toque para Drop Sets y
         Myo-Reps") -- BUG REAL: el catch-all final (línea sin dosis
         reconocible, típico de "Nombre: 15 reps activación [MYO-REPS]"
         cuando "15 reps" solo no matchea RX_DOSIS_SB) nunca corría
         extraerTecnicaSB() -- tecnica quedaba SIEMPRE vacía acá, así que
         un MYO-REPS/DROP SET escrito en formato libre (sin "NxM" claro)
         perdía su técnica por completo y el badge/registro de 1 toque
         nunca podían dispararse. Se extrae acá también, con el mismo
         resTecLinea ya calculado arriba (cero llamada duplicada) --
         nunca se le suma al título/nombre visible, que sigue siendo la
         línea original menos el corchete de técnica si lo traía. */
      var tituloSinTecnica = (resTecLinea.tecnica ? resTecLinea.texto : linea).replace(/^\d+\s*[.)]\s+/, '');
      actual = { tipo:'simple', titulo: tituloSinTecnica, sets:0, reps:'', tempo:'', restSeconds:0, rir:'', dosisAsignada:false,
        tecnica: resTecLinea.tecnica || '',
        tecnicaPct: resTecLinea.tecnica === 'dropset' ? extraerPctSB(resTecLinea.texto) : null,
        myoInfo: resTecLinea.tecnica === 'myoreps' ? extraerMyoInfoSB(resTecLinea.texto) : null,
        notas:[], unidad:'reps' };
      entries.push(actual);
    });
    /* una estación sin prescripción propia hereda la de la estación más cercana que sí la trae (nunca una caja con sólo "3 SERIES") */
    entries.forEach(function(en){
      if(en.tipo !== 'biserie' || en.subs.length < 2) return;
      en.subs.forEach(function(s, i){
        if(s.reps) return;
        var fuente = null, j, k;
        for(j = i + 1; j < en.subs.length && !fuente; j++) if(en.subs[j].reps) fuente = en.subs[j];
        for(k = i - 1; k >= 0 && !fuente; k--) if(en.subs[k].reps) fuente = en.subs[k];
        if(!fuente) return;
        s.reps = fuente.reps; s.sets = s.sets || fuente.sets; s.unidad = fuente.unidad;
        if(!s.tempo) s.tempo = fuente.tempo;
        if(!s.rir) s.rir = fuente.rir;
      });
    });
    entries.forEach(function(en){
      if(en.tipo !== 'biserie' || !en.base) return;
      en.subs.forEach(function(s){
        if(!s.reps) s.reps = en.base.reps;
        if(!s.sets) s.sets = en.base.sets;
        if(!s.tempo) s.tempo = en.base.tempo;
        if(!s.rir) s.rir = en.base.rir;
        if(!s.restSeconds) s.restSeconds = en.base.restSeconds;
        if(s.unidad === 'reps' && en.base.unidad) s.unidad = en.base.unidad;
      });
    });
    /* los ejercicios que siguen a un encabezado de intervalo heredan sus sets y su cadencia (hasta una fase nueva u otro encabezado) */
    var hdrAct = null;
    entries.forEach(function(en){
      if(en.tipo === 'intervalo'){ hdrAct = en; return; }
      if(en.tipo === 'fase'){ hdrAct = null; return; }
      if(hdrAct && en.tipo === 'simple') aplicarIntervaloSB(en, hdrAct);
    });
    return restaurarTempoSB(entries);
  }
  /* directiva maestra ("Reporte táctico de sesión a WhatsApp") -- expuesta
     a window para que el desglose por bloque/set del reporte (otra IIFE,
     ver generarDesgloseBloquesWA() más abajo en el archivo) pueda
     re-parsear el texto de la Pizarra sin duplicar el parser. */
  window.parsearPizarraSB = parsearPizarraSB;
  /* ============================================================
     REFACTORING INTEGRAL (directiva "Reconstrucción total del tracker
     de series en Sports"): tabla de registro nativa desde cero, EXCLUSIVA
     de la Pizarra Sports (nunca tocada por CrossFit -- pizarra() de CF
     sigue usando su propio único input de score, nunca esta función ni
     renderSetRows()). Reemplaza únicamente el uso que hacía pizarraSports()
     de renderSetRows()/.set-tracker (que sigue existiendo intacta para
     bloques CLÁSICOS de Sports, fuera de la Pizarra -- esta función nueva
     no la modifica ni la reemplaza ahí). Inputs 100% nativos, sin la capa
     de colapso/expansión de .set-tracker que venía arrastrando ajustes de
     especificidad CSS de rondas anteriores. */
  /* recibe SÓLO el tramo de texto justo después del rango de reps (ver
     parsearDosisSB) -- por eso los patrones anclan al inicio (^), sin
     exigir un dígito propio: ese dígito ya quedó consumido en el match
     de sets×reps, acá sólo queda leer la palabra/letra de unidad que
     sigue pegada o con un espacio de por medio ("s"/"seg", "m"/"mts"/
     "metros", "cal"). */
  function detectarUnidadSecundariaSB(trasTexto){
    var t = String(trasTexto || '').trim();
    if(/^(?:seg(?:undos?)?|s)\b/i.test(t)) return 'seg';
    if(/^min(?:utos?)?\b/i.test(t)) return 'min';
    if(/^(?:m|mts?|metros?)\b/i.test(t)) return 'mts';
    if(/^cal(?:or[ií]as?)?\b/i.test(t)) return 'cal';
    return 'reps';
  }
  /* directiva maestra ("Registro ágil de 1 toque para Drop Sets y Myo-
     Reps") -- en sala de pesas no hay pausa pasiva entre bajadas/micro-
     series para manipular el celular: un ejercicio con técnica MYO-REPS
     o DROP SET SIEMPRE se registra con UNA sola fila interactiva (nunca
     el tracker tradicional de N sets ni una UI de microseries aparte),
     sin importar cómo el coach haya fraseado la dosis (incluso si no
     matcheó ningún patrón "NxM" y entry.sets quedó en 0 -- antes esos
     casos se caían al render "plano" sin tracker, el bug reportado).
     Reusa data-set-key/.jp-input-native/.jp-btn-check-native TAL CUAL
     (mismo listener delegado, mismo setLoadField(), mismo cálculo de
     tonelaje) -- cero JS nuevo para completar/cargar kg×reps, sólo
     cambia el rótulo de la píldora y se suma la línea de protocolo +
     nota opcional (persistida en state.notes, mismo mecanismo ya usado
     por el resto de la app, ver listener .jp-intensity-note más abajo). */
  var PROTOCOLO_TECNICA_SB = {
    myoreps: { pill: 'SERIE ACTIVACI\u00d3N', icono: '\u26a1', texto: 'Protocolo Myo-reps: despu\u00e9s de la activaci\u00f3n, 3 a 5 mini-sets al fallo t\u00e9cnico (RIR 0) con 5 respiraciones de pausa. Los mini-sets son parte de esta serie: no suman series.', ph: '4 mini-sets completados' },
    dropset: { pill: 'CARGA INICIAL', icono: '\ud83d\udcc9', texto: 'Protocolo Drop Set: Descarga inmediata (-20% a -25%) al fallo sin descanso.', ph: '2 bajadas hasta 20kg' }
  };
  /* DROP SET: tres tarjetas en secuencia (la serie principal y dos bajadas), cada una con su peso x repeticiones al fallo y su check. Reusa la fila
     nativa (data-set-key / .jp-input-native / .jp-btn-check-native): mismos listeners, mismo setLoadField(), mismo tonelaje. Claves: slot 1 (la de siempre,
     los registros viejos se conservan), 'd1' y 'd2'. El peso de cada bajada se sugiere solo (-20% de la tarjeta anterior) como placeholder. */
  function dropRedondeoSB(v, pct){ return Math.round(v * (1 - (pct || 20) / 100) * 2) / 2; }
  /* ESTRUCTURA DE UNA TÉCNICA DE INTENSIDAD: cuántas series son, cuál lleva la técnica y en qué fases se ejecuta -- el alumno nunca duda de cuántos sets hacer ni en qué orden.
     o = { tecnica, sets, pct, microReps, ronda } (ronda: la técnica va en un biset / triset, donde la unidad es la ronda) */
  function estructuraTecnicaSB(o){
    var tec = o.tecnica, n = parseInt(o.sets, 10) || 1, ronda = !!o.ronda, U = ronda ? 'RONDA' : 'SERIE', u = ronda ? 'ronda' : 'serie';
    var nom = { dropset: 'DROP-SET', myoreps: 'MYO-REPS', restpause: 'REST-PAUSE' }[tec]; if(!nom) return '';
    var ic = { dropset: '\ud83d\udd25', myoreps: '\ud83d\udd01', restpause: '\u26a1' }[tec], pct = Math.abs(o.pct || 20);
    var fases = {
      dropset: ['<span class="jp-tec-fase">1 \u00b7 carga de trabajo</span> al fallo', '<span class="jp-tec-fase">2 \u00b7 bajada \u2212' + pct + '%</span> al fallo', '<span class="jp-tec-fase">3 \u00b7 bajada \u2212' + pct + '%</span> al fallo'],
      myoreps: ['<span class="jp-tec-fase">1 \u00b7 activaci\u00f3n</span> a 1-2 reps del fallo', '<span class="jp-tec-fase">2 \u00b7 mini-sets</span>: 3 a 5 de ' + (o.microReps || 4) + ' reps, con 5 respiraciones de pausa'],
      restpause: ['<span class="jp-tec-fase">1 \u00b7 serie al fallo</span> t\u00e9cnico', '<span class="jp-tec-fase">2 \u00b7 pausa 15-20 s</span> y +2-4 reps', '<span class="jp-tec-fase">3 \u00b7 pausa 15-20 s</span> y +2-4 reps']
    }[tec];
    var pills = '';
    for(var i = 1; i < n; i++) pills += '<span class="jp-tec-p">' + i + '</span>';
    var previas = n > 1 ? '<b>' + U + (n > 2 ? 'S 1 a ' + (n - 1) : ' 1') + '</b>: normales, al RIR indicado. ' : '';
    return '<div class="jp-tec-est">' + (n > 1 ? '<div class="jp-tec-strip jp-tec-norm"><span class="jp-tec-lb">' + (ronda ? 'RONDAS' : 'SERIES') + ' NORMALES</span>' + pills + '</div>' : '') + '<div class="jp-tec-banner"><span class="jp-tec-bic" aria-hidden="true">' + ic + '</span><span class="jp-tec-bt"><b>' + nom + '</b><small>' + U + ' ' + n + ' · técnica de intensidad</small></span></div></div>';
  }
  function renderRegistroDropsetSB(weekIdx, dayId, blockId, exIdx, unidadSec, refSemanaAnterior, ctx){
    unidadSec = unidadSec || 'reps'; ctx = ctx || {};
    var pctD = Math.abs(ctx.pct || 20), nS = ctx.n || 1, totS = ctx.tot || nS;
    var pasos = [
      { idx: 1,    n: 1, lb: 'FASE 1 \u00b7 CARGA DE TRABAJO',      sub: 'al fallo \u00b7 es la serie ' + nS },
      { idx: 'd1', n: 2, lb: 'FASE 2 \u00b7 BAJADA 1', sub: '-' + pctD + '% del peso \u00b7 al fallo \u00b7 misma serie ' + nS },
      { idx: 'd2', n: 3, lb: 'FASE 3 \u00b7 BAJADA 2', sub: '-' + pctD + '% otra vez \u00b7 al fallo \u00b7 misma serie ' + nS }
    ];
    var base = 0, html = '<div class="jp-set-tracker-native jp-set-tracker-tecnica jp-drop-tracker" data-pct="' + pctD + '">' +
      '<div class="jp-tec-head">SERIE ' + nS + ' DE ' + totS + ' \u00b7 DROP-SET<small>3 fases seguidas, sin descanso entre fases: cuentan como 1 sola serie</small></div>';
    pasos.forEach(function(p, i){
      var key = getLoadKey(weekIdx, dayId, blockId, exIdx, p.idx);
      var ld = getLoad(key);
      var prevKg = null, prevSec = null;
      if(refSemanaAnterior && weekIdx > 0){
        var pl = getLoad(getLoadKey(weekIdx - 1, dayId, blockId, exIdx, p.idx));
        if(pl.kg != null && pl.kg !== '') prevKg = pl.kg;
        if(pl.reps != null && pl.reps !== '') prevSec = pl.reps;
      }
      var kgVal = ld.kg != null ? ld.kg : '';
      var secVal = ld.reps != null ? ld.reps : '';
      var kgPh = '\u2014';
      if(kgVal === ''){
        if(i > 0 && base > 0) kgPh = String(dropRedondeoSB(base, pctD));
        else if(prevKg != null) kgPh = String(prevKg);
      }
      var secPh = (secVal === '' && prevSec != null) ? String(prevSec) : '\u2014';
      var kgNum = parseFloat(String(kgVal).replace(',', '.'));
      base = kgNum > 0 ? kgNum : (parseFloat(kgPh) || 0);
      html += '<div class="jp-drop-card" data-drop-step="' + p.n + '"' + (i === pasos.length - 1 ? ' data-drop-last="1"' : '') + '>' +
          '<div class="jp-drop-cap"><b>' + p.n + '</b> ' + p.lb + ' <small>' + p.sub + '</small></div>' +
          '<div class="jp-set-row-native' + (ld.done ? ' completed' : '') + modoClsCtxSB(ctx) + '" data-set-key="' + key + '">' +
            '<div class="jp-set-inputs-group">' +
              '<input type="number" inputmode="decimal" step="0.5" pattern="[0-9]*" autocomplete="off" enterkeyhint="done" class="jp-input-native jp-val-primary" placeholder="' + kgPh + '" value="' + escSB(kgVal) + '" />' +
              '<span class="jp-unit">kg</span>' +
              '<span class="jp-sep">\u00d7</span>' +
              '<input type="number" inputmode="decimal" step="0.5" pattern="[0-9]*" autocomplete="off" enterkeyhint="done" class="jp-input-native jp-val-secondary" placeholder="' + secPh + '" value="' + escSB(secVal) + '" />' +
              '<span class="jp-unit">' + unidadSec + '</span>' +
              '<button type="button" class="jp-btn-check-native' + (ld.done ? ' completed' : '') + '" aria-label="Marcar ' + p.lb + ' completada">\u2713</button>' +
            '</div>' +
          '</div>' +
        '</div>';
    });
    return html + '<div class="jp-drop-nota">Sin descanso entre bajadas: el reloj arranca al marcar la \u00faltima.</div></div>';
  }
  /* al escribir el peso de una tarjeta, la sugerencia de las siguientes se recalcula (-20% de la anterior) */
  function jpDropSugerirSB(tr){
    var base = 0, pctS = parseInt(tr.getAttribute('data-pct'), 10) || 20;
    tr.querySelectorAll('.jp-drop-card').forEach(function(c, i){
      var kg = c.querySelector('.jp-val-primary'); if(!kg) return;
      var v = parseFloat(String(kg.value).replace(',', '.'));
      if(i > 0 && !kg.value && base > 0) kg.placeholder = String(dropRedondeoSB(base, pctS));
      base = v > 0 ? v : (parseFloat(kg.placeholder) || 0);
    });
  }
  function renderRegistroTecnicaUnicaSB(weekIdx, dayId, blockId, exIdx, tecnica, unidadSec, refSemanaAnterior, ctx){
    unidadSec = unidadSec || 'reps'; ctx = ctx || {};
    if(tecnica === 'dropset') return renderRegistroDropsetSB(weekIdx, dayId, blockId, exIdx, unidadSec, refSemanaAnterior, ctx);
    var proto = PROTOCOLO_TECNICA_SB[tecnica];
    var key = getLoadKey(weekIdx, dayId, blockId, exIdx, 1);
    var ld = getLoad(key);
    var prevKg = null, prevSec = null;
    if(refSemanaAnterior && weekIdx > 0){
      var prevLd = getLoad(getLoadKey(weekIdx - 1, dayId, blockId, exIdx, 1));
      if(prevLd.kg != null && prevLd.kg !== '') prevKg = prevLd.kg;
      if(prevLd.reps != null && prevLd.reps !== '') prevSec = prevLd.reps;
    }
    var kgVal = ld.kg != null ? ld.kg : '';
    var secVal = ld.reps != null ? ld.reps : '';
    var kgPlaceholder = (kgVal === '' && prevKg != null) ? String(prevKg) : '—';
    var secPlaceholder = (secVal === '' && prevSec != null) ? String(prevSec) : '—';
    var notaKey = key + '|nota';
    var notaVal = (state.notes && state.notes[notaKey]) || '';
    /* directiva ("Tratamiento exclusivo de intensificadores") -- Nivel 2
       (Protocolo de Descarga/Mini-sets): registro ergonómico de 1 toque
       en vez de tipear texto libre a mano -- chips de bajada porcentual
       (sólo Drop Set, tiene sentido de %; Myo-Reps trabaja con la MISMA
       carga, sólo cuenta mini-series) + contador rápido de reps
       efectivas + botón "Agregar". El resultado se COMPONE y se anexa
       al MISMO input .jp-intensity-note de siempre (ver listener de
       persistencia en state.notes más abajo, CERO cambios ahí) -- los
       chips son sólo una forma más rápida de escribir la nota, nunca un
       campo de datos nuevo: texto viejo tipeado a mano sigue
       leyéndose/editándose igual que siempre. */
    var esDropset = tecnica === 'dropset';
    var chipsHtml = esDropset ?
      '<div class="jp-tecnica-chips">' +
        ['10', '15', '20', '25'].map(function(p){ return '<button type="button" class="jp-tecnica-chip" data-pct="' + p + '">-' + p + '%</button>'; }).join('') +
      '</div>' : '';
    var addLabel = esDropset ? '\u2795 Agregar bajada' : '\u2795 Agregar mini-set';
    var nSerie = ctx.n || 1, totSerie = ctx.tot || nSerie;
    return '<div class="jp-set-tracker-native jp-set-tracker-tecnica">' +
        '<div class="jp-tec-head">SERIE ' + nSerie + ' DE ' + totSerie + ' \u00b7 MYO-REPS<small>activaci\u00f3n + 3 a 5 mini-sets: cuentan como 1 sola serie</small></div>' +
        '<div class="jp-set-row-native' + (ld.done ? ' completed' : '') + modoClsCtxSB(ctx) + '" data-set-key="' + key + '">' +
          '<span class="jp-set-pill">' + 'SERIE ' + nSerie + ' \u00b7 ACTIVACI\u00d3N' + '</span>' +
          '<div class="jp-set-inputs-group">' +
            '<input type="number" inputmode="decimal" step="0.5" pattern="[0-9]*" autocomplete="off" enterkeyhint="done" class="jp-input-native jp-val-primary" placeholder="' + kgPlaceholder + '" value="' + escSB(kgVal) + '" />' +
            '<span class="jp-unit">kg</span>' +
            '<span class="jp-sep">\u00d7</span>' +
            '<input type="number" inputmode="decimal" step="0.5" pattern="[0-9]*" autocomplete="off" enterkeyhint="done" class="jp-input-native jp-val-secondary" placeholder="' + secPlaceholder + '" value="' + escSB(secVal) + '" />' +
            '<span class="jp-unit">' + unidadSec + '</span>' +
            '<button type="button" class="jp-btn-check-native' + (ld.done ? ' completed' : '') + '" aria-label="Marcar serie completada">\u2713</button>' +
          '</div>' +
        '</div>' +
        '<div class="jp-tecnica-protocolo">' + proto.icono + ' ' + proto.texto + '</div>' +
        '<div class="jp-tecnica-quickreg">' +
          chipsHtml +
          '<div class="jp-tecnica-stepper">' +
            '<button type="button" class="jp-tecnica-step-btn" data-step="-1" aria-label="Menos reps">\u2212</button>' +
            '<span class="jp-tecnica-step-val" data-stepval>0</span>' +
            '<button type="button" class="jp-tecnica-step-btn" data-step="1" aria-label="M\u00e1s reps">+</button>' +
            '<span class="jp-tecnica-step-unit">reps</span>' +
            '<button type="button" class="jp-tecnica-add-btn" data-addbajada="' + notaKey + '">' + addLabel + '</button>' +
          '</div>' +
        '</div>' +
        '<input type="text" class="jp-intensity-note" data-notekey="' + notaKey + '" placeholder="Nota opcional (ej. ' + proto.ph + ')" value="' + escSB(notaVal) + '" />' +
      '</div>';
  }
  function renderSetRowsNativeSB(weekIdx, dayId, blockId, exIdx, numSets, unidadSec, refSemanaAnterior, tecnicaInfo, rirAnterior, nombreEj, metaReps, keyOff){
    unidadSec = unidadSec || 'reps'; keyOff = keyOff || 0;
    var modoEj = modoInputSB(nombreEj);          /* 'bw' (peso corporal) | 'tiempo' (isométrico) | '' */
    var numSetsInt = parseInt(numSets, 10) || 1;
    /* directiva ("Parser avanzado de metodologías") -- [DROPSET]/[MYO-
       REPS]/[REST-PAUSE]/[AL FALLO]/[PARCIALES] son técnicas que
       normalmente se aplican a la ÚLTIMA serie ("última serie al 20% al
       fallo"), nunca al ejercicio completo -- antes el badge vivía una
       sola vez en la cabecera del ejercicio, sin indicar a cuál serie
       correspondía. Sin un número de serie explícito en el texto del
       coach, se asume la última (el caso real de uso casi siempre).
       Myo-Reps es la excepción: nunca modifica una serie base existente,
       siempre AGREGA una serie de activación propia + microseries (ver
       más abajo), así que nunca participa del badge-en-la-última-serie
       genérico. */
    var setTecnica = (tecnicaInfo && tecnicaInfo.tecnica) ? tecnicaInfo : null;
    var esMyo = !!(setTecnica && setTecnica.tecnica === 'myoreps');
    var setTecnicaIdx = (setTecnica && !esMyo) ? (setTecnica.setIndex || numSetsInt) : 0;
    var html = '<div class="jp-set-tracker-native">';
    for(var i = 1; i <= numSetsInt; i++){
      var key = getLoadKey(weekIdx, dayId, blockId, exIdx, i + keyOff);
      var ld = getLoad(key);
      var prevKg = null, prevSec = null;
      if(refSemanaAnterior && weekIdx > 0){
        var prevLd = getLoad(getLoadKey(weekIdx - 1, dayId, blockId, exIdx, i + keyOff));
        if(prevLd.kg != null && prevLd.kg !== '') prevKg = prevLd.kg;
        if(prevLd.reps != null && prevLd.reps !== '') prevSec = prevLd.reps;
      }
      /* directiva maestra ("Ghost Load & Target Pacing") -- formato EXACTO
         pedido: "// S ANTERIOR: {kg} kg × {reps} reps · [RIR {n}]". Sin
         registro previo (prevKg/prevSec null) se mantiene el placeholder
         limpio de siempre -- refHtml queda vacío, nunca se ensucia la
         interfaz con un "// S ANTERIOR:" fantasma sin datos. */
      var refHtml = '';
      if(prevKg != null || prevSec != null){
        var refTxt = (prevKg != null ? prevKg + ' kg' : '') +
          (prevKg != null && prevSec != null ? ' \u00d7 ' : '') +
          (prevSec != null ? prevSec + ' ' + unidadSec : '') +
          (rirAnterior ? ' \u00b7 [RIR ' + rirAnterior + ']' : '');
        refHtml = '<span class="jp-set-ref">// S ANTERIOR: ' + refTxt + '</span>';
      }
      var kgVal = ld.kg != null ? ld.kg : '';
      var secVal = ld.reps != null ? ld.reps : '';
      var kgPlaceholder = (kgVal === '' && prevKg != null) ? String(prevKg) : '—';
      /* directiva maestra ("Quick-Check con carga previa/fantasma") -- el
         placeholder de reps nunca reflejaba el Ghost Load (siempre "0",
         a diferencia de kg): el quick-fill del check [✓] (ver el
         listener de .jp-btn-check-native más abajo) no tenía de dónde
         tomar una reps sugerida cuando era la primera serie de la
         semana. Mismo criterio que kgPlaceholder, ahora simétrico. */
      var secPlaceholder = (secVal === '' && prevSec != null) ? String(prevSec) : (secVal === '' && metaReps ? String(metaReps) : '—');
      var doneCls = ld.done ? ' completed' : '';
      var badgeHtml = '';
      if(setTecnica && !esMyo && i === setTecnicaIdx && TECNICAS_BADGE_SB[setTecnica.tecnica]){
        /* directiva ("Limpieza de residuos en Drop Set") -- el % detectado
           en la línea original ("-30%") se integra en el propio badge en
           vez de quedar como texto suelto aparte. */
        var pctSufijo = (setTecnica.tecnica === 'dropset' && setTecnica.pct != null) ? ' (' + setTecnica.pct + '%)' : '';
        badgeHtml = '<span class="jp-sb-set-badge jp-sb-badge-' + setTecnica.tecnica + '">' + TECNICAS_BADGE_SB[setTecnica.tecnica] + pctSufijo + '</span>';
      }
      var esActMyo = esMyo && i === numSetsInt;
      var pillTxt = esActMyo ? 'SERIE ' + i + ' \u00b7 MYO' : 'SERIE ' + i;
      var kgInputHtml = '<input type="number" inputmode="decimal" step="0.5" pattern="[0-9]*" autocomplete="off" enterkeyhint="done" class="jp-input-native jp-val-primary" placeholder="' + kgPlaceholder + '" value="' + escSB(kgVal) + '" />';
      var secInputHtml = '<input type="number" inputmode="decimal" step="0.5" pattern="[0-9]*" autocomplete="off" enterkeyhint="done" class="jp-input-native jp-val-secondary" placeholder="' + secPlaceholder + '" value="' + escSB(secVal) + '" />';
      var checkHtml = '<button type="button" class="jp-btn-check-native' + (ld.done ? ' completed' : '') + '" aria-label="Marcar serie ' + i + ' completada">\u2713</button>';
      var inputsInner;
      if(modoEj === 'tiempo' || modoEj === 'solo'){
        /* isométrico (Plancha, Hold): un único input de tiempo [ 30 ] seg */
        inputsInner = kgInputHtml + '<span class="jp-pad-cell"></span><span class="jp-sep jp-sep-ghost">\u00d7</span>' + secInputHtml + '<span class="jp-unit">' + ((modoEj === 'solo' || unidadSec !== 'reps') ? unidadSec : 'seg') + '</span>' + checkHtml;
      } else if(modoEj === 'banda'){
        /* banda elastica: chip BANDA fijo, sin kg ni lastre -- solo reps */
        inputsInner = '<span class="jp-bw-cell"><span class="jp-bw-chip">BANDA</span></span>' +
          kgInputHtml + '<span class="jp-unit jp-unit-kg">kg</span>' +
          '<span class="jp-sep">\u00d7</span>' + secInputHtml + '<span class="jp-unit">' + unidadSec + '</span>' + checkHtml;
      } else if(modoEj === 'bw'){
        /* peso corporal: chip BW fijo; el kg sólo aparece si se agrega lastre */
        inputsInner = '<span class="jp-bw-cell"><span class="jp-bw-chip">BW</span><button type="button" class="jp-lastre-btn">+ Lastre</button></span>' +
          kgInputHtml + '<span class="jp-unit jp-unit-kg">kg</span>' +
          '<span class="jp-sep">\u00d7</span>' + secInputHtml + '<span class="jp-unit">' + unidadSec + '</span>' + checkHtml;
      } else {
        inputsInner = kgInputHtml + '<span class="jp-unit">kg</span>' + '<span class="jp-sep">\u00d7</span>' + secInputHtml + '<span class="jp-unit">' + unidadSec + '</span>' + checkHtml;
      }
      var modoCls = modoEj ? ' jp-modo-' + modoEj + ((modoEj === 'bw' && parseFloat(kgVal) > 0) ? ' jp-lastre-on' : '') : '';
      html += '<div class="jp-set-row-native' + doneCls + modoCls + '" data-set-key="' + key + '">' +
          '<span class="jp-set-pill' + (esActMyo ? ' jp-pill-myo' : '') + '">' + pillTxt + '</span>' +
          refHtml + badgeHtml +
          '<div class="jp-set-inputs-group">' + inputsInner + '</div>' +
        '</div>';
    }
    /* directiva ("Compilación estructurada de Myo-Reps") -- serie de
       activación propia (misma fila nativa .jp-set-row-native que las
       series base, reusa getLoadKey/setLoadField sin ningún código
       nuevo de persistencia: cuenta para el volumen real de la sesión
       igual que cualquier otra serie tildada) + microseries en una
       sub-fila compacta debajo, cada una con su propio input chico. */
    /* Myo-Reps (directiva "Rediseño y anclaje"): el SET de activación es la ÚLTIMA serie de la estación
       ("SET n (ACTIVACIÓN MYO-REPS)") y el protocolo vive inmediatamente debajo, dentro de la misma tarjeta:
       chips de mini-sets (+4, +4, +3...) y botón para agregar hasta 5 */
    if(esMyo){
      var myo = setTecnica.myo || {};
      var microReps = myo.microReps > 0 ? myo.microReps : 4;
      var microBase = myo.microCount > 0 ? myo.microCount : 3;
      var microMax = 5, microVis = Math.min(microMax, Math.max(3, microBase)), microInputs = '';
      for(var mi = 1; mi <= microMax; mi++){
        var microKey0 = getLoadKey(weekIdx, dayId, blockId, exIdx, 'm' + mi);
        var microVal0 = getLoad(microKey0).reps;
        if(microVal0 != null && microVal0 !== '' && mi > microVis) microVis = mi;
      }
      for(var mj = 1; mj <= microMax; mj++){
        var mKey = getLoadKey(weekIdx, dayId, blockId, exIdx, 'm' + mj);
        var mVal = getLoad(mKey).reps;
        microInputs += '<button type="button" class="jp-myo-mini' + (mVal ? ' hecho' : '') + '" data-micro-key="' + mKey + '" data-micro-target="' + microReps + '" aria-pressed="' + (mVal ? 'true' : 'false') + '"' + (mj > microVis ? ' hidden' : '') + '>+' + (mVal ? escSB(mVal) : microReps) + '</button>';
      }
      html += '<div class="jp-myo-mod">' +
          '<div class="jp-myo-lb">\u26a1 MYO-REPS \u00b7 3 a 5 mini-sets \u00b7 RIR 0</div>' +
          '<div class="jp-myo-chips">' + microInputs + '<button type="button" class="jp-myo-add"' + (microVis >= microMax ? ' hidden' : '') + '>[ + AGREGAR MINI-SET ]</button></div>' +
        '</div>';
    }
    html += '</div>';
    return html;
  }
  /* directiva ("Unificación de tips/videos") -- recolecta los videos
     ÚNICOS de todo el bloque (ejercicios simples + subs de biset) para
     el listado "🎬 VIDEOS TÉCNICOS DEL BLOQUE" del acordeón único --
     reusa buscarVideo() (mismo matching que ya usa videoLinkHtml() en
     cada fila individual, cero lógica nueva de resolución). */
  /* directiva ("Videos Enraizados en Cada Bloque") -- antes sólo
     entraban acá los ejercicios "simple" con dosis real (entry.sets
     truthy): un ejercicio sin dosis reconocida (línea única "3x10
     Nombre", vía la rama "plain" de pizarraSports() más abajo) SÍ tenía
     su propio ícono de video inline en la fila, pero ESE ícono es un
     .video-link real que limpiar() (módulo CROSSFIT: SIN VIDEOS EN EL
     WOD, más abajo en el archivo -- corre para .jp-sb-board igual que
     para un WOD de CrossFit porque comparte la clase wod-board) barre
     hacia el Glosario Técnico del PIE de la sesión -- el alumno tenía
     que scrollear hasta el final para ver un ejercicio del Bloque 1.
     Ahora TODO ejercicio simple (con o sin dosis reconocida) entra acá,
     así el chip sobrevive DENTRO del acordeón del bloque aunque su
     ícono inline se haya ido al glosario. */
  /* directiva maestra ("Reparación y compilación universal de videos por
     bloque") -- revierte la exclusión total de calentamiento ("Desvinculación
     del Warm-up", una directiva anterior): el coach SÍ carga/vincula
     videos técnicos para movilidad y activación desde el Builder
     (b.videoOverrides, compilados en VIDEO_MAP igual que cualquier otro
     bloque, ver buildProgramConfig()) y esos videos nunca llegaban al
     alumno -- el parámetro esCalentamiento se conserva en la firma (otros
     llamadores lo siguen pasando) pero ya no corta la recolección. */
  /* directiva maestra ("Fix de asociación de videos en Warm-up/Pizarra")
     -- una línea del catch-all sin dosis reconocida (ver parsearPizarraSB,
     entry.titulo cae ahí como la LÍNEA CRUDA completa, ej.
     "Rotaciones torácicas en cuadrupedia x 8 reps por lado") nunca
     matcheaba contra la biblioteca porque buscarVideo() comparaba la
     prescripción pegada como si fuera parte del nombre. Se recorta acá,
     SOLO para la búsqueda de video (nunca toca entry.titulo/nombre que
     se siguen mostrando tal cual en el render), todo sufijo reconocible
     de dosis/ejecución al final del texto: "x N reps/seg/mts/cal",
     "tempo NNNN", "RIR N", "rest Ns", "por lado/pierna", paréntesis
     finales y el resto de texto tras un "|". */
  function limpiarNombreParaVideoSB(nombre){
    var t = String(nombre || '').trim();
    t = t.replace(/^[\s\-–—•*]+/, '');
    t = t.split('|')[0].trim();
    t = t.replace(/\s*\([^)]*\)\s*$/, '');
    t = t.replace(/\s*[x\u00d7]\s*\d[\w.\/]*.*$/i, '');
    t = t.replace(/\s*\btempo\s*\d+\w*.*$/i, '');
    t = t.replace(/\s*\brir\s*\d+(?:-\d+)?.*$/i, '');
    t = t.replace(/\s*\brest\s*\d+\s*s(?:eg)?.*$/i, '');
    t = t.replace(/\s*\bpor\s+(?:lado|pierna)\b.*$/i, '');
    t = t.replace(/\s*\bc\/u\b.*$/i, '');
    return t.trim();
  }
  /* directiva maestra ("Compilación universal de videos en desplegable
     inferior") -- block.videosBloque es la lista YA RESUELTA por
     buildProgramConfig() (mismo resolveExacto()/candidatosTexto() que
     alimenta el chip verde "Video vinculado" del Builder, ver el
     comentario gemelo ahí), persistida en el propio objeto del bloque:
     ésa es ahora la ÚNICA fuente de verdad. El re-parseo con
     parsearPizarraSB()/buscarVideo() de abajo queda SOLO como fallback
     para exports viejos (compilados antes de esta directiva, sin el
     campo nuevo) -- nunca se ejecutan los dos a la vez. */
  /* lista de videos del bloque para la semana activa (export nuevo: videosBloqueSemana; exports viejos: videosBloque) */
  function videosDeSemanaSB(block){
    if(!block) return null;
    var w = (typeof state !== 'undefined' && state && state.currentWeek) || 0;
    if(Array.isArray(block.videosBloqueSemana) && Array.isArray(block.videosBloqueSemana[w])) return block.videosBloqueSemana[w];
    return Array.isArray(block.videosBloque) ? block.videosBloque : null;
  }
  /* titulo con el termino tecnico en ingles y, debajo y tenue, la descripcion en español (solo si el ejercicio esta en la biblioteca) */
  function claveNomSB(x){ return String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.,;:!?"']+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function singNomSB(x){ return claveNomSB(x).split(' ').map(function(w){ return w.length > 3 ? w.replace(/(?:es|s)$/, '') : w; }).join(' '); }
  function limpiarTituloSB(t){
    return String(t == null ? '' : t).replace(/^[\s\-\u2013\u2014\u2022*]+/, '').replace(/\s+[x\u00d7]\s*$/i, '').replace(/[\u00d7:]\s*$/, '').trim();
  }
  function infoNombreSB(titulo, block){
    titulo = limpiarTituloSB(titulo);
    var m = block && block.nombresEx;
    if(!m) return null;
    var k = claveNomSB(titulo);
    if(m[k]) return m[k];
    var ks = singNomSB(titulo), claves = Object.keys(m);
    for(var i = 0; i < claves.length; i++){ if(singNomSB(claves[i]) === ks) return m[claves[i]]; }
    return null;
  }
  function nombrePrincipalSB(titulo, block){
    var i = infoNombreSB(titulo, block);
    return (i && i.en) ? i.en : limpiarTituloSB(titulo);
  }
  /* abreviaturas comerciales para que el inglés entre paréntesis no rompa la línea en 375px */
  function enCortoSB(en){
    var t = String(en == null ? '' : en).trim();
    t = t.replace(/\bRomanian Deadlift\b/i, 'RDL').replace(/\bStiff[- ]Leg(?:ged)? Deadlift\b/i, 'SLDL').replace(/\bOverhead Press\b/i, 'OHP');
    if(t.length > 24) t = t.replace(/\bDumbbells?\b/i, 'DB').replace(/\bBarbell\b/i, 'BB').replace(/\bKettlebell\b/i, 'KB');
    return t;
  }
  function nombreHibridoSB(titulo, block){
    var i = infoNombreSB(titulo, block), limpio = limpiarTituloSB(titulo);
    if(!i || !(i.es || i.en)) return escSB(limpio);
    if(!i.es || !i.en || claveNomSB(i.es) === claveNomSB(i.en)) return escSB(i.es || i.en);
    return escSB(i.es) + ' <span class="jp-nom-en">(' + escSB(enCortoSB(i.en)) + ')</span>';
  }
  function subEsSB(titulo, block){
    return '';     /* el español ya es el nombre principal (nombreHibridoSB) */
    var i = infoNombreSB(titulo, block);
    if(!i || !i.en || !i.es || claveNomSB(i.es) === claveNomSB(i.en)) return '';
    return '<div class="jp-es-sub">' + escSB(i.es) + '</div>';
  }
  function recolectarVideosSB(entries, esCalentamiento, block){
    var listaSem = videosDeSemanaSB(block);
    if(listaSem){      /* export nuevo: la lista del bloque manda, aunque este vacia */
      return listaSem;
    }
    var vistos = {}, out = [];
    entries.forEach(function(entry){
      if(entry.tipo === 'simple'){
        var nm = jpCfSplit(entry.titulo).nm || entry.titulo;
        var yt = buscarVideo(limpiarNombreParaVideoSB(nm));
        if(yt && !vistos[yt]){ vistos[yt] = 1; out.push({ nombre: nm, ytid: yt }); }
      } else if(entry.tipo === 'biserie'){
        (entry.subs || []).forEach(function(sub){
          var yt = buscarVideo(limpiarNombreParaVideoSB(sub.nombre));
          if(yt && !vistos[yt]){ vistos[yt] = 1; out.push({ nombre: sub.nombre, ytid: yt }); }
        });
      }
    });
    return out;
  }
  /* directiva maestra ("Rediseño de Pautas Técnicas, Tips y Videos del
     Bloque") -- tarjetas tácticas horizontales (nunca el grid cuadrado
     con nombres truncados de antes): thumbnail 16:9 con micro-marco
     celeste + botón play centrado, nombre COMPLETO sin cortes, subtítulo
     "[ TAP PARA VER TÉCNICA ]" en titanio tenue. */
  function chipsVideoSB(lista, busquedas){
    busquedas = busquedas || [];
    if(!lista.length && !busquedas.length) return '';
    return '<div class="jp-sb-vid-title">&#127916; VIDEOS T&Eacute;CNICOS DEL BLOQUE</div>' +
      '<div class="jp-sb-vid-cards">' + lista.map(function(v){
        return '<button type="button" class="jp-sb-vid-card" data-yt="' + v.ytid + '" aria-label="Ver t\u00e9cnica de ' + escSB(v.nombre).replace(/"/g,'') + '">' +
          '<span class="jp-sb-vid-thumb" style="background-image:url(https://img.youtube.com/vi/' + v.ytid + '/mqdefault.jpg)">' +
            '<span class="jp-sb-vid-play">\u25b6\ufe0e</span>' +
          '</span>' +
          '<span class="jp-sb-vid-info">' +
            '<span class="jp-sb-vid-nombre">' + escSB(v.nombre) + '</span>' +
            '<span class="jp-sb-vid-tap">[ TAP PARA REPRODUCIR ]</span>' +
          '</span>' +
        '</button>';
      }).join('') + busquedas.map(function(nm){
        var q = limpiarNombreParaVideoSB(nm) || nm;
        return '<button type="button" class="jp-sb-vid-card jp-ver-busca" data-vsearch="' + escSB(q) + '" aria-label="Buscar la t\u00e9cnica de ' + escSB(nm).replace(/"/g,'') + '">' +
          '<span class="jp-sb-vid-thumb jp-sb-vid-thumb-na"><span class="jp-sb-vid-play">\u25b6\ufe0e</span></span>' +
          '<span class="jp-sb-vid-info">' +
            '<span class="jp-sb-vid-nombre">' + escSB(nm) + '</span>' +
            '<span class="jp-sb-vid-tap">[ TAP PARA BUSCAR EN YOUTUBE ]</span>' +
          '</span>' +
        '</button>';
      }).join('') + '</div>';
  }
  /* directiva ("Unificación Total de Core") -- contador táctico compacto
     de rondas al pie de un biset/triset/circuito: [ - ] Ronda X de N
     [ + ] [ ✓ Ronda Completa ]. Estado puramente de sesión en memoria
     (window.__jpRondaActual, nunca persiste ni compite con state.loads/
     setLoadField -- las series reales de cada ejercicio siguen siendo la
     fuente de verdad, esto es sólo una referencia rápida de "en qué
     ronda estoy" mientras se corre el circuito). */
  window.__jpRondaActual = window.__jpRondaActual || {};
  function contadorRondasSB(weekIdx, dayId, blockId, idx, totalRondas){
    const key = weekIdx + '|' + dayId + '|' + blockId + '|' + idx;
    const actual = window.__jpRondaActual[key] || 1;
    return '<div class="jp-sb-rondas-ctl" data-rondakey="' + key + '" data-rondatotal="' + totalRondas + '">' +
        '<button type="button" class="jp-ronda-btn" data-rondadelta="-1" aria-label="Ronda anterior">−</button>' +
        '<span class="jp-ronda-txt">Ronda <b class="jp-ronda-n">' + actual + '</b> de ' + totalRondas + '</span>' +
        '<button type="button" class="jp-ronda-btn" data-rondadelta="1" aria-label="Ronda siguiente">+</button>' +
        '<button type="button" class="jp-ronda-ok">&#10003; Ronda Completa</button>' +
      '</div>';
  }
  document.addEventListener('click', function(e){
    const ctl = e.target.closest('.jp-sb-rondas-ctl'); if(!ctl) return;
    const key = ctl.dataset.rondakey, total = parseInt(ctl.dataset.rondatotal, 10) || 3;
    const btnDelta = e.target.closest('[data-rondadelta]');
    const btnOk = e.target.closest('.jp-ronda-ok');
    if(!btnDelta && !btnOk) return;
    let actual = window.__jpRondaActual[key] || 1;
    if(btnDelta) actual = Math.max(1, Math.min(total, actual + parseInt(btnDelta.dataset.rondadelta, 10)));
    else actual = Math.min(total, actual + 1);
    window.__jpRondaActual[key] = actual;
    const n = ctl.querySelector('.jp-ronda-n'); if(n) n.textContent = actual;
    if(btnOk){
      try{ if(navigator.vibrate) navigator.vibrate([15, 30, 15]); }catch(err){}
      try{ beepSetCheck(true); }catch(err){}
    }
  });
  /* directiva ("Desvinculación del Warm-up del Glosario"): un bloque de
     Pizarra cuyo TÍTULO lo identifica como calentamiento/activación
     nunca debe alimentar el glosario de video (por eso NUNCA se llama a
     videoLinkHtml() para sus ejercicios más abajo -- sin .video-link en
     el DOM, limpiar() no tiene nada que barrer hacia LEXICO) ni montar
     casilleros de Kg/series efectivas -- se detecta por título, igual
     criterio de "forma, no lista cerrada de una sola palabra" que ya usa
     esWarm() para bloques clásicos (que nunca toca la Pizarra, ver esa
     función más abajo en el archivo). */
  var RX_CALENTAMIENTO_SB = /calentamiento|warm.?up|movilidad|activaci[oó]n|entrada\s+en\s+calor/i;
  function esBloqueCalentamientoSB(block){
    /* por título, o porque el bloque se eligió/importó como "Entrada en calor" (modalidad / categoría) */
    return RX_CALENTAMIENTO_SB.test(String((block && block.title) || '')) ||
           !!(block && (block.modalidad === 'calentamiento' || block.category === 'warmup'));
  }
  /* directiva ("Jerarquía de RIR vs Sets"): el RIR mezclado en cian con
     los pills [SET 1]/[SET 2] del tracker nativo confundía al alumno
     (mismo borde/texto que un botón de serie). El cian queda reservado
     EXCLUSIVAMENTE para el tracker (número de serie/inputs/check) --
     el RIR usa el espectro de esfuerzo (rojo=fallo, naranja=alto,
     oro=margen), nunca cian. La tier se decide por el número MÁS BAJO
     que haya en el texto (el más exigente: "RIR 2-1" -> tier de "1") o
     por la mención de "fallo" sin importar el número. */
  function tierRirSB(rir){
    const t = String(rir || '').toLowerCase();
    if(!t) return null;
    if(/fallo/.test(t)) return 'danger';
    const nums = t.match(/\d+/g);
    if(!nums) return 'margen';
    const min = Math.min.apply(null, nums.map(Number));
    if(min <= 0) return 'danger';
    if(min <= 2) return 'alto';
    return 'margen';
  }
  var ICONO_RIR_SB = { danger:'\ud83d\udd25', alto:'\ud83d\udd25', margen:'\ud83d\udd25' };
  /* directiva ("Prescripción Táctica Ilustrativa de la Dosis"): banner de
     micro-badges tácticos (series/reps/tempo/RIR/rest) en vez del texto
     plano gris de antes -- cada campo es su propio pill de alto
     contraste, tipografía condensada. SETS/REPS/TEMPO/REST comparten un
     estilo neutro "carbón integrado" (nunca cian, ese color es sólo del
     tracker); el RIR es el ÚNICO con color propio, por tier de esfuerzo. */
  function jpIdx2(n){ return (n < 10 ? '0' : '') + n; }
  function fmtRestSB(s){
    s = parseInt(s, 10) || 0;
    return s + 's';
  }
  /* meta tenue a la derecha del encabezado de cada fila de ronda: "Target: 8-10 reps @ RIR 0-1" */
  function metaRondaSB(sub){
    if(!sub || (!sub.reps && !sub.rir)) return '';
    var t = (sub.reps ? sub.reps + ' ' + (sub.unidad || 'reps') : '') + (sub.rir ? (sub.reps ? ' @ ' : '') + 'RIR ' + sub.rir : '');
    return '<span class="jp-ronda-tg">Target: ' + escSB(t) + '</span>';
  }
  /* ejercicio con tramos de carga (aclimatación / top set / back-off): total de sets, un chip por tramo y la fila de pausa y cadencia */
  function tramosHtmlSB(en){
    var lad = en.tramos.length >= 3 && en.tramos.every(function(t){ return t.sets == 1 && /^\d+$/.test(String(t.reps)) && !t.etq; });
    if(lad){
      var ns = en.tramos.map(function(t){ return parseInt(t.reps, 10); }), dir = ns[1] - ns[0];
      lad = !!dir && ns.every(function(n, i){ return i === 0 || (n - ns[i - 1]) * dir > 0; });
    }
    if(lad){
      var un = String(en.tramos[0].unidad || 'reps').toUpperCase(), rirs = en.tramos.map(function(t){ return t.rir || ''; });
      var rirC = rirs.every(function(x){ return x === rirs[0]; }) ? rirs[0] : '';
      var nums = ns.length > 8 ? '<b>' + ns[0] + '</b><i>\u2192</i><b>' + ns[ns.length - 1] + '</b>' : ns.map(function(n){ return '<b>' + n + '</b>'; }).join('<i>\u2013</i>');
      var rb0 = restBadgeSB(en.restSeconds, en.restLabel);
      return '<div class="jp-dose-bar jp-ladder-bar"><div class="jp-ux-ladder"><span class="k">ESCALERA</span><span class="n">' + nums + '</span><span class="u">' + escSB(un) + (rirC ? ' \u00b7 RIR ' + escSB(rirC) : '') + '</span></div>' +
        (rb0 ? '<div class="jp-db-row jp-db-r2">' + rb0 + '</div>' : '') + filaUnilateralSB(en.unilateral) + '</div>';
    }
    var t0 = en.tramos[0].tempo, tempoComun = en.tempo || ((t0 && en.tramos.every(function(t){ return t.tempo === t0; })) ? t0 : '');
    var chips = en.tramos.map(function(t){
      var extra = t.rir ? 'RIR ' + t.rir : '';
      return '<span class="jp-db-seg jp-db-vol jp-tr-chip">' + t.sets + (t.sets == 1 ? ' SERIE' : ' SERIES') + ' \u00d7 ' + escSB(t.reps) + ' ' + escSB(String(t.unidad || 'reps').toUpperCase()) +
        (t.etq ? ' <em>(' + escSB(t.etq) + ')</em>' : '') + (extra ? ' \u00b7 ' + escSB(extra) : '') + '</span>';
    }).join('');
    var rb = restBadgeSB(en.restSeconds, en.restLabel);
    /* mismo orden que la línea del Builder ("tramos | Tempo | RIR" y abajo el descanso): el tempo y el RIR del ejercicio se muestran antes de la pausa */
    /* el tempo ya no se imprime en la línea principal: vive en el acordeón de pautas ("TEMPO (CADENCIA)") */
    var tmpT = '';
    var rirT = (en.rir && !en.tramos.some(function(t){ return t.rir; })) ? '<span class="jp-db-seg jp-db-rir jp-rir-' + tierRirSB(en.rir) + '">' + ICONO_RIR_SB[tierRirSB(en.rir)] + ' RIR ' + escSB(en.rir) + '</span>' : '';
    var r2 = (rb || tmpT || rirT) ? '<div class="jp-db-row jp-db-r2">' + tmpT + rirT + rb + '</div>' : '';
    return '<div class="jp-dose-bar"><div class="jp-db-row jp-db-r1"><span class="jp-tr-total">' + en.sets + ' SERIES</span></div><div class="jp-db-row jp-db-tr">' + chips + '</div>' + r2 + filaUnilateralSB(en.unilateral) + '</div>';
  }
  function tempoLimpioSB(tempo){
    var s = String(tempo == null ? '' : tempo).replace(/^\s*tempo\s*[:\-]?\s*/i, '').trim();
    return /^[0-9xX]{3,4}$|^[0-9xX](?:\s*[-\/]\s*[0-9xX]){2,3}$/.test(s) ? s.replace(/\s+/g, '') : '';
  }
  /* Tarjeta de ejercicio en tres filas horizontales (el estilo visual lo pone data-jp-estilo, ver shared/tarjeta-ejercicio.css):
       fila 1 · VOLUMEN: series x repeticiones, grande y a lo largo de la tarjeta
       fila 2 · DESCANSO: debajo del volumen (un toque = cuenta regresiva)
       fila 3 · TÉCNICA: tempo y RIR (más la carga pautada y el modificador unilateral)
     sinPausa marca la estacion intermedia de un biset/triset (A1 -> A2 sin descanso) */
  function restBadgeSB(seg, lbl){
    seg = normRestSB(seg);
    if(seg <= 0) return '';
    return '<button type="button" class="jp-db-seg jp-db-rest jp-rest-go" data-rest-go="' + seg + '" aria-label="Iniciar descanso de ' + seg + ' segundos">\u23f1\ufe0e\u25b6\ufe0e DESCANSO ' + (lbl ? escSB(lbl) : fmtRestSB(seg)) + '</button>';
  }
  function dosisCompletaSB(sets, reps, unidad, tempo, rir, restSeconds, extra, uni, sinPausa, restLabel, rondas){
    var r1 = '', r2 = [], r3 = [];
    var u = escSB(String(unidad || 'reps').toUpperCase());
    if(!sets && !reps) return '';
    /* criterio único: ejercicio suelto = SERIES; estaciones encadenadas (biset / triset) = RONDAS */
    var rotSets = rondas ? (sets == 1 ? 'RONDA' : 'RONDAS') : (sets == 1 ? 'SERIE' : 'SERIES');
    var vS = sets ? '<b class="jp-vn">' + sets + '</b> <span class="jp-vl">' + rotSets + '</span>' : '';
    var vR = reps ? '<b class="jp-vr">' + escSB(reps) + '</b> <span class="jp-vl">' + u + '</span>' : '';
    r1 = '<span class="jp-db-seg jp-db-vol">' + vS + (vS && vR ? ' <i class="jp-vx">\u00d7</i> ' : '') + vR + '</span>';
    var rb = restBadgeSB(restSeconds, restLabel);
    if(rb) r2.push(rb);
    else if(sinPausa) r2.push('<span class="jp-db-seg jp-db-rest jp-db-nopause">\u26a1 SIN DESCANSO</span>');
    var tp = tempoLimpioSB(tempo);
    if(tp) r3.push('<span class="jp-db-seg jp-db-tempo"><small>TEMPO</small> <b>' + escSB(tp) + '</b></span>');
    /* 2026-11 (v27): sin tempo pautado no se agrega nada. La celda «RITMO · CONTROL» por defecto aparecía en ejercicios donde no corresponde (olímpicos como el hang power clean,
       trabajos con banda, isométricos): la técnica muestra solo lo que el coach pautó y el estilo compacto reparte el ancho entre las celdas que hay (tarjeta-ejercicio.css). */
    if(rir){
      var tier = tierRirSB(rir);
      r3.push('<span class="jp-db-seg jp-db-rir jp-rir-' + tier + '"><small>RIR</small> <b>' + escSB(rir) + '</b></span>');
    }
    if(extra) r3.push('<span class="jp-db-seg jp-db-carga"><small>CARGA</small> <b>' + escSB(String(extra).replace(/^@\s*/, '')) + '</b></span>');
    return '<div class="jp-dose-bar"><div class="jp-db-row jp-db-r1">' + r1 + '</div>' +
      (r2.length ? '<div class="jp-db-row jp-db-r2">' + r2.join('') + '</div>' : '') +
      (r3.length ? '<div class="jp-db-row jp-db-r3">' + r3.join('') + '</div>' : '') + filaUnilateralSB(uni) + '</div>';
  }
  window.jpDosisHtml = dosisCompletaSB;      /* público para las pruebas del runner (tests/parsers) */
  window.jpPizarraSports = pizarraSports;    /* idem: el runner arma un bloque y mira el DOM real de la tarjeta */
  /* directiva maestra ("Parser universal y tolerante para Sports &
     Bodybuilding") -- micro-chip táctico de soporte para modificadores de
     unilateralidad/ejecución ("por pierna"/"por lado"): formato exacto
     pedido "[ ⚡ UNILATERAL · POR PIERNA ]", nunca mezclado con la nota en
     cursiva genérica (ver notaSubCombinada/actual.notas en
     parsearPizarraSB, más abajo). */
  function chipUnilateralSB(valor){
    if(!valor) return '';
    /* 2026-11: ícono ⇄ (lado a lado) en lugar del ⚡, que se confundía con «⚡ SIN DESCANSO»; el badge va en su propia fila (filaUnilateralSB), no como una celda más de la técnica */
    return '<span class="jp-sb-unilateral"><i class="jp-uni-ic" aria-hidden="true">\u21c4</i> UNILATERAL \u00b7 ' + escSB(String(valor).toUpperCase()) + '</span>';
  }
  function filaUnilateralSB(valor){ return valor ? '<div class="jp-db-row jp-db-uni">' + chipUnilateralSB(valor) + '</div>' : ''; }
  /* directiva maestra ("Estilización de Listados de Activación") -- el
     glifo táctico (▸, cian, ver .jp-sb-plain-warmup::before en CSS) ya
     comunica el bullet visualmente -- un guión común "-" que el coach
     tipeó a mano al redactar la línea ("- Movilidad de cadera: ...")
     nunca debe quedar duplicado/colgando al inicio del nombre. */
  /* directiva ("Badge de categoría"): el tag superior de la card muestra la categoría real del
     bloque ([ SPORTS · 🎯 FUERZA ], [ SPORTS · 💪 HIPERTROFIA ]...), nunca "BLOQUE" genérico */
  function tagCategoriaSB(block, esCalent){
    var m = block.modalidad || '';
    if(esCalent || m === 'calentamiento') return 'ACTIVACI&Oacute;N';
    if(m === 'fuerza') return 'FUERZA';
    if(m === 'hipertrofia') return 'HIPERTROFIA';
    if(m === 'core') return 'CORE';
    if(m === 'accesorio') return 'ACCESORIO';
    if(m === 'metcon') return 'CARDIO';
    return 'BLOQUE';
  }
  /* una línea de activación redactada como lista continua ("Gato-camello, plancha lateral,
     dead bug", "• a • b", "a - b - c") se parte en un renglón por ejercicio */
  function partirListaActivacionSB(txt){
    var t = String(txt || '').trim();
    var porMarcas = t.split(/\s*[•·]\s*|\s+-\s+/).map(function(s){ return s.trim(); }).filter(Boolean);
    if(porMarcas.length > 1) return porMarcas;
    var cs = t.split(/\s*[,;]\s+/).map(function(s){ return s.trim(); }).filter(Boolean);
    var sinDosis = cs.every(function(s){ return (/[a-záéíóúñ]/i.test(s) || /^\d+\s*\/\s*\d+$/.test(s)) && !/^\d+\s*(?:reps?|seg|s|min|m)\b/i.test(s); });
    if(cs.length > 1 && sinDosis && (cs.length >= 3 || t.length > 50)) return cs;
    return [t];
  }
  /* botón de video junto al nombre de cada estación de un biset: el mismo video que reconoce el bloque
     (block.videosBloque) o, en exports viejos, el de la biblioteca; sin video no se dibuja nada */
  function miniVideoSB(nombre, block){
    var norm = function(s){ return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); };
    var n = norm(limpiarNombreParaVideoSB(nombre)), ytid = '';
    if(!n) return '';
    var lista = videosDeSemanaSB(block) || [];
    /* la estación puede estar escrita en español y su video guardado con el nombre técnico en inglés (o al revés): se prueban ambos */
    var infoV = infoNombreSB(nombre, block), cands = [n];
    if(infoV){ [infoV.en, infoV.es].forEach(function(x){ var c = norm(x); if(c && cands.indexOf(c) < 0) cands.push(c); }); }
    for(var i = 0; i < lista.length && !ytid; i++){
      var v = norm(lista[i].nombre);
      if(v && cands.some(function(c){ return v === c || v.indexOf(c) >= 0 || c.indexOf(v) >= 0; })) ytid = lista[i].ytid;
    }
    if(!ytid && !videosDeSemanaSB(block)){ try{ ytid = buscarVideo(limpiarNombreParaVideoSB(nombre)) || ''; }catch(e){ ytid = ''; } }
    if(!ytid) return '';
    return '<button type="button" class="jp-sb-vid-mini" data-yt="' + ytid + '" aria-label="Ver t\u00e9cnica de ' + escSB(nombre).replace(/"/g, '') + '" title="Ver t\u00e9cnica">&#9654;</button>';
  }
  /* [ ▶ VER TÉCNICA ]: mismo video del bloque, en modal rápido con loop y sin sonido */
  function verTecnicaSB(nombre, block){
    return '';      /* el video vive solo en las tarjetas del pie del bloque (chipsVideoSB) */
  }
  /* autocarga y calistenia: sin input de kg por defecto (chip BW + "+ Lastre"); isométricos: un único input de tiempo */
  var RX_BW_SB = /(?:hanging|colgad|dominad|pull ?ups?|chin ?ups?|fondos?|dips?|flexion(?:es)?|push ?ups?|knee raises?|leg raises?|elevacion(?:es)? de (?:rodillas|piernas)|muscle ?ups?|burpees?|abdominales|crunch(?:es)?|sit ?ups?|v ?ups?|remo invertido|inverted row|australian|puente de gluteos?|glute bridge|bird ?dog|dead ?bug|superman|mountain climbers?|escaladores|air squats?|sentadillas? (?:al )?aire)/;
  var RX_NOBW_SB = /(?:lastre|weighted|con peso|chaleco|maquina|polea|asistid|smith|con barra|barbell|mancuernas?|dumbbells?|kettlebells?|discos?)/;
  var RX_CF_SOLO_SB = /(?:^|\s)(?:row|rower|rowing|echo bike|assault bike|air bike|bike ?erg|ski ?erg|shuttle run|handstand walk|hs walk|bear crawl|run|toes to bar|t2b|ttb|box jumps?|double unders?|rope climbs?|handstand push ?ups?|hspu)(?=\s|$)/;
  var RX_PLANK_DIN_SB = /(?:pull ?through|\brow\b|remo|reach|\btaps?\b|walk ?outs?|up ?down|jacks?|mountain|climb|\bsaw\b|drag|tuck|rotaci|rotation|toque|pasos)/;
  var RX_TIEMPO_SB = /(?:plancha|plank|isometric|isometrico|hold|wall ?sit|dead ?hang|colgado pasivo|hollow|suspension)/;
  function modoInputSB(nombre){
    var n = normTitSB(nombre);
    if(!n) return '';
    if(window.COACH_DISCIPLINA !== 'sports' && RX_CF_SOLO_SB.test(n)) return 'solo';      /* CrossFit: un solo input (cal / mts / reps), sin kg */
    var eq = (typeof jpClasificarEquipo === 'function') ? jpClasificarEquipo(nombre) : '';
    if(eq === 'banda') return 'banda';      /* banda elastica: reps (o tiempo), nunca kg */
    if(RX_TIEMPO_SB.test(n) && !RX_PLANK_DIN_SB.test(n)) return 'tiempo';      /* plancha con movimiento = reps, no segundos */
    if(eq === 'bw') return 'bw';
    if(RX_BW_SB.test(n) && !RX_NOBW_SB.test(n)) return 'bw';
    return '';
  }
  /* clase de modo para las filas de Drop Set / Myo-Reps (reciben el nombre por ctx) */
  function modoClsCtxSB(ctx){ var m = (ctx && ctx.nombre) ? modoInputSB(ctx.nombre) : ''; return m ? ' jp-modo-' + m : ''; }
  window.jpModoInput = modoInputSB;
  document.addEventListener('click', function(e){
    var lb = e.target.closest && e.target.closest('.jp-lastre-btn');
    if(lb){
      var rw = lb.closest('.jp-set-row-native');
      if(rw){ rw.classList.add('jp-lastre-on'); var ki = rw.querySelector('.jp-val-primary'); if(ki) ki.focus(); }
      return;
    }
    var ad = e.target.closest && e.target.closest('.jp-myo-add');
    if(ad){
      var box = ad.parentElement, oc = box.querySelector('.jp-myo-mini[hidden]');
      if(oc){ oc.hidden = false; }
      if(!box.querySelector('.jp-myo-mini[hidden]')) ad.hidden = true;
    }
  });
  document.addEventListener('input', function(e){
    var el = e.target;
    if(el && el.classList && el.classList.contains('jp-myo-mini') && el.tagName === 'INPUT') el.classList.toggle('hecho', !!el.value);
  });
  document.addEventListener('click', function(e){
    var go = e.target.closest && e.target.closest('.jp-rest-go'); if(!go) return;
    e.preventDefault();
    var seg = parseInt(go.getAttribute('data-rest-go'), 10) || 0; if(!seg) return;
    var card = go.closest('.jp-sb-ex, .jp-sb-subex-resumen'), nm = card && card.querySelector('.jp-sb-ex-nombre, .jp-sb-subex-tit');
    try{ if(navigator.vibrate) navigator.vibrate(12); }catch(err){}
    go.classList.add('on'); setTimeout(function(){ go.classList.remove('on'); }, 900);
    var etiquetaDesc = 'Descanso \u00b7 ' + (nm ? nm.textContent.replace(/\s*\([^)]*\)\s*$/, '').trim() : 'ejercicio');
    if(typeof window.jpArrancarDescansoManual === 'function') window.jpArrancarDescansoManual(seg, etiquetaDesc);
    /* el toque en el bot\u00f3n de descanso SIEMPRE abre el reloj flotante: si por cualquier motivo el puente del m\u00f3dulo de calentamiento no lo abri\u00f3
       (no carg\u00f3, o el motor qued\u00f3 en otro estado), se lo pide directo al motor \u00fanico de descanso. En CrossFit el descanso lo gobierna su propio widget. */
    setTimeout(function(){
      var h = document.getElementById('restHud');
      if(!h || h.classList.contains('on')) return;
      var cwt = document.getElementById('cwtWrap');
      if((cwt && cwt.classList.contains('on')) || document.body.classList.contains('cf-disc')) return;
      if(window.CoachTV && typeof window.CoachTV.rest === 'function') window.CoachTV.rest(seg, etiquetaDesc);
    }, 160);
  });
  function restAttrSB(e){ return e.restCero ? '0' : (e.restSeconds || ''); }
  function limpiarGuionActivacionSB(nombre){
    return String(nombre || '').replace(/^[\s\-–—•*]+/, '').trim();
  }
  /* directiva maestra ("Ghost Load & Target Pacing") -- el RIR de la
     ghost load es el que el coach prescribió la semana ANTERIOR para
     ese mismo ejercicio, nunca el de la semana activa. block.weekItems[
     weekIdx-1] guarda el texto ya ondulado de esa semana (ver
     ondularMesocicloAutomatico() del Builder) -- se re-parsea con el
     MISMO parsearPizarraSB() (cero lógica nueva de extracción) y se lee
     el RIR de la entrada en la MISMA posición idx/si que la semana
     activa: el orden de líneas nunca cambia entre semanas (la
     ondulación sólo reescribe dosis in-place), así que la posición es
     un identificador estable. Se degrada a '' con cualquier desajuste
     (plan viejo, texto editado a mano de forma irregular) -- nunca
     rompe el render por un dato ausente. */
  /* BISET POR TÍTULO (v28): un bloque de la Pizarra titulado «Biset», «Triset» o «Superserie» cuyos ejercicios vienen sin letra de estación (A1 / A2)
     se dibuja igual como biset: recuadro naranja, pastilla, transición y registro al final. Solo si TODOS los ejercicios del bloque tienen dosis (2 a 4)
     y ninguno es de intervalo o técnica especial. El arreglo conserva su largo (las entradas absorbidas quedan como «agrupada») para que cada estación
     mantenga su clave de registro de siempre (e<idx>): las cargas que el alumno ya anotó siguen apareciendo. El plan guardado no se toca. */
  function jpAgruparBisetPorTituloSB(entries, titulo){
    if(!Array.isArray(entries) || !/\b(?:bi-?sets?|tri-?sets?|super-?series?|super-?sets?)\b/i.test(String(titulo || ''))) return entries;
    if(entries.some(function(e){ return e && e.tipo === 'biserie'; })) return entries;
    var simples = entries.filter(function(e){ return e && e.tipo === 'simple'; });
    if(simples.length < 2 || simples.length > 4) return entries;
    if(!simples.every(function(e){ return e.dosisAsignada && (e.reps || e.sets) && !e.int && !e.tecnica; })) return entries;
    var subs = simples.map(function(e){
      return { nombre: e.titulo, reps: e.reps || '', tempo: e.tempo || '', tecnica: '', nota: (e.notas || []).join(' · '), unilateral: e.unilateral || '', unidad: e.unidad || 'reps',
               rir: e.rir || '', restSeconds: 0, sets: e.sets, carga: e.carga || '', idxOrig: entries.indexOf(e) };
    });
    var rest = +simples[simples.length - 1].restSeconds || Math.max.apply(null, simples.map(function(e){ return +e.restSeconds || 0; })) || 0;
    subs[subs.length - 1].restSeconds = rest;
    var bis = { tipo: 'biserie', titulo: 'Biset / Triset', subs: subs, rondas: simples[0].sets || 3, restSeconds: rest, letra: 'A', rondasAuto: simples[0].sets || 3, porTitulo: true };
    var puesto = false;
    return entries.map(function(e){
      if(simples.indexOf(e) < 0) return e;
      if(!puesto){ puesto = true; return bis; }
      return { tipo: 'agrupada' };
    });
  }
  window.jpAgruparBisetPorTitulo = jpAgruparBisetPorTituloSB;
  function rirSemanaAnteriorSB(block, weekIdx, idx, si){
    if(!(weekIdx > 0)) return '';
    try{
      var prevLineas = itemsDeSemana(block, weekIdx - 1);
      if(!prevLineas.length) return '';
      var prevEntries = parsearPizarraSB(prevLineas, { titulo: block.title });
      var prevEntry = prevEntries[idx];
      if(!prevEntry) return '';
      if(si != null) return (prevEntry.tipo === 'biserie' && prevEntry.subs && prevEntry.subs[si]) ? (prevEntry.subs[si].rir || '') : '';
      return prevEntry.rir || '';
    }catch(e){ return ''; }
  }
  function pizarraSports(blockEl, block, weekIdx, dayId){
    if(esBloqueVacioCF(block)) return;
    const body = blockEl.querySelector('.block-body');
    if(!body || body.querySelector('[data-sportsboard]')) return;
    const lineasBrutas = itemsDeSemana(block, weekIdx).filter(function(l){ return l != null && String(l).trim() !== ''; });
    const sepMeta = separarMetaPizarraSB(lineasBrutas);
    let lineas = sepMeta.lineas;
    /* el título del bloque ("Warm-Up Dinámico...") nunca se repite como primera viñeta de ejercicio */
    if(!block.ocultaTituloTablero && lineas.length > 1 && normTitSB(lineas[0]) && normTitSB(lineas[0]) === normTitSB(block.title)) lineas = lineas.slice(1);
    if(!lineas.length){
      if(weekIdx > 0){
        body.insertAdjacentHTML('afterbegin', '<div class="wod-board jp-sb-board" data-sportsboard="' + block.id + '"><div class="jp-sb-tag">[ SPORTS ]</div><div class="jp-sb-nota">Todavía no se cargó la prescripción de esta semana.</div></div>');
      }
      return;
    }
    let entries = parsearPizarraSB(lineas, { titulo: block.title });
    if(!entries.length) return;
    const esCalentamiento = esBloqueCalentamientoSB(block);
    if(!esCalentamiento) entries = jpAgruparBisetPorTituloSB(entries, block.title);      /* «Biset · Espalda» sin A1/A2 también se dibuja como biset */
    const contS = esCalentamiento ? null : jpContinuoInfo(block, lineas, true);
    /* directiva ("Jerarquía Cromática Coach JP"): el PRIMER ejercicio con
       dosis real de cada bloque es el "ancla" (el movimiento pesado
       principal) -- se destaca en amarillo oro (ver .jp-sb-ex-ancla en
       CSS), el resto queda en blanco/cyan como accesorio. Nunca aplica a
       un bloque de calentamiento (ahí no hay ancla, es activación). */
    let anclaUsada = false;
    let nIndiv = 0;                  /* badge [ E1 ] [ E2 ]... de los ejercicios individuales del bloque */
    const regCfg = [];               /* ejercicios de intervalo: se registran desde el bottom sheet, sin casilleros en la tarjeta */
    const gruposInt = {};            /* cuantos ejercicios cuelgan de cada encabezado de intervalo (para el rotulo [ E1 ] / [ E1–E2 ]) */
    entries.forEach(function(en){
      if(en && en.tipo === 'simple' && en.int && !esCalentamiento){ const hi = entries.indexOf(en.int); if(hi >= 0) gruposInt[hi] = (gruposInt[hi] || 0) + 1; }
    });
    let filas = contS ? jpContinuoSportsHtml(contS, block, weekIdx, dayId) : '';
    let duracionEstimada = 0;
    (contS ? [] : entries).forEach(function(entry, idx){
      if(entry.tipo === 'duracion'){
        if(!duracionEstimada) duracionEstimada = entry.minutos;
        return;
      }
      if(entry.tipo === 'fase'){
        filas += '<div class="jp-sb-fase">' + escSB(entry.titulo) + '</div>';
        return;
      }
      if(entry.tipo === 'biserie' && entry.subs.length){
        if(esCalentamiento){
          /* directiva maestra ("Reparación y compilación universal de
             videos por bloque") -- videoLinkHtml(sub.nombre) faltaba por
             completo acá: un sub-ejercicio de calentamiento (biset/triset
             de movilidad) nunca tuvo ícono de video, ni siquiera cuando
             la biblioteca/videoOverrides sí tenían el match real. */
          const subsPlain = entry.subs.map(function(sub){
            const dosisTxt = sub.reps ? sub.reps + ' ' + (sub.unidad || 'reps') : '';
            const nombreLimpio = limpiarGuionActivacionSB(sub.nombre);
            return '<div class="jp-sb-plain jp-sb-plain-warmup">' +
                (dosisTxt ? '<span class="jp-sb-plain-pill">' + escSB(dosisTxt) + '</span>' : '') +
                '<span class="jp-sb-plain-nombre">' + escSB(nombreLimpio) + '</span>' +
                (sub.nota ? '<div class="jp-sb-nota">' + escSB(sub.nota) + '</div>' : '') +
              '</div>';
          }).join('');
          filas += '<div class="jp-sb-biset">' +
              '<div class="jp-sb-biset-title">' + escSB(entry.titulo) + '</div>' +
              '<div class="jp-sb-bracket">' + subsPlain + '</div>' +
            '</div>';
          return;
        }
        const rondasN = entry.rondas || 3;
        const subsInfo = entry.subs.map(function(sub, si){
          const exIdx = sub.idxOrig != null ? 'e' + sub.idxOrig : 'b' + idx + 's' + si;      /* agrupado por título: conserva la clave de registro que ya tenía */
          /* entre estaciones del mismo biset no hay descanso (A1 -> A2 sin pausa): el Rest real corresponde a la ultima estacion */
          const restSub = sub.restSeconds ? sub.restSeconds : (si < entry.subs.length - 1 ? '0' : '');
          const tmp = document.createElement('div');
          tmp.innerHTML = renderSetRowsNativeSB(weekIdx, dayId, block.id, exIdx, rondasN, sub.unidad, true, sub.tecnica ? { tecnica: sub.tecnica, pct: sub.tecnicaPct, myo: sub.myoInfo } : null, (sub.idxOrig != null ? rirSemanaAnteriorSB(block, weekIdx, sub.idxOrig) : rirSemanaAnteriorSB(block, weekIdx, idx, si)), sub.nombre, sub.unidad === 'reps' || !sub.unidad ? sub.reps : '');
          const rows = Array.prototype.map.call(tmp.querySelectorAll('.jp-set-row-native'), function(r){ return r.outerHTML; });
          const myo = tmp.querySelector('.jp-myo-mod');
          return { sub: sub, si: si, restSub: restSub, rows: rows, myo: myo ? myo.outerHTML : '' };
        });
        const cabeceras = subsInfo.map(function(o){
          const trans = o.si > 0 ? '<div class="jp-sb-trans" role="note"><span class="jp-sb-trans-pill"><i aria-hidden="true">\u2193</i> SIN PAUSA \u00b7 PAS\u00c1 AL ' + (entry.letra || 'A') + (o.si + 1) + '</span></div>' : '';
          return trans + '<div class="jp-sb-subex-resumen">' +
              '<div class="jp-sb-subex-head"><span class="jp-sb-letra">' + (entry.letra || 'A') + (o.si + 1) + '</span>' +
                '<span class="jp-sb-subex-tit">' + nombreHibridoSB(o.sub.nombre, block) + '</span>' + verTecnicaSB(o.sub.nombre, block) + '</div>' + subEsSB(o.sub.nombre, block) +
              dosisCompletaSB(entry.rondas, o.sub.reps, o.sub.unidad, o.sub.tempo, o.sub.rir, o.sub.restSeconds || (o.si === subsInfo.length - 1 ? entry.restSeconds : 0), o.sub.carga ? '@ ' + o.sub.carga : '', o.sub.unilateral, o.si < subsInfo.length - 1, undefined, true) +
              (o.sub.tecnica && o.sub.tecnica !== 'fallo' ? estructuraTecnicaSB({ tecnica: o.sub.tecnica, sets: rondasN, ronda: true, pct: o.sub.tecnicaPct, microReps: o.sub.myoInfo && o.sub.myoInfo.microReps }) : '') +
              (o.sub.nota && !o.sub.tecnica ? '<div class="jp-sb-nota">' + escSB(o.sub.nota) + '</div>' : '') +
            '</div>';
        }).join('');
        subsInfo.forEach(function(o){
          regCfg.push({ grp: 'b' + idx, gn: subsInfo.length, idx: o.sub.idxOrig != null ? 'e' + o.sub.idxOrig : 'b' + idx + 's' + o.si, nombre: o.sub.nombre, sets: rondasN, reps: o.sub.reps || '', carga: o.sub.carga || '', u: o.sub.unidad && o.sub.unidad !== 'reps' ? o.sub.unidad : '', rir: String(o.sub.rir != null ? o.sub.rir : (entry.rir || '')), r: String(o.restSub) === '0' ? -1 : (parseInt(o.restSub, 10) || 0), tec: o.sub.tecnica || '', uni: o.sub.unilateral || '' });
        });
        const subsHtml = cabeceras + subsInfo.map(function(o){ return o.myo; }).join('');
        const tituloBiset = entry.titulo === 'Biset / Triset' ? (entry.subs.length === 2 ? 'Biset' : (entry.subs.length === 3 ? 'Triset' : 'Superserie')) : entry.titulo;
        filas += '<div class="jp-sb-biset">' +
            '<div class="jp-sb-biset-title"><span class="jp-sb-biset-pill">' + (subsInfo.length === 2 ? 'BISET' : (subsInfo.length === 3 ? 'TRISET' : 'SUPERSERIE')) + ' \u00b7 ' + rondasN + (rondasN === 1 ? ' RONDA' : ' RONDAS') + '</span><span class="jp-sb-biset-sub">EJERCICIOS ENCADENADOS \u00b7 SIN PAUSA ENTRE ELLOS</span></div>' +
            '<div class="jp-sb-bracket">' + subsHtml + '</div>' +
          '</div>';
        return;
      }
      if(entry.tipo === 'nota'){
        filas += '<div class="jp-nota-t"><div class="jp-nota-tt">' + entry.icono + ' ' + escSB(String(entry.titulo).toUpperCase()) + '</div>' + (entry.texto ? '<div class="jp-nota-tx">' + escSB(entry.texto) + '</div>' : '') + '</div>';
        return;
      }
      if(entry.tipo === 'intervalo'){
        const nGrupo = gruposInt[idx] || 0, e0 = nIndiv + 1;
        const rotE = nGrupo ? (nGrupo > 1 ? 'E' + e0 + '\u2013E' + (e0 + nGrupo - 1) : 'E' + e0) : '';
        const hhmm = ('0' + Math.floor(entry.seg / 60)).slice(-2) + ':' + ('0' + (entry.seg % 60)).slice(-2);
        filas += '<div class="jp-int-head">' + (rotE ? '<span class="jp-int-e">[ ' + rotE + ' ]</span>' : '') +
          '<span class="jp-int-t">EVERY ' + hhmm + (entry.sets ? ' \u00d7 ' + entry.sets + ' SERIES' : '') + '</span></div>';
        return;
      }
      if(entry.tipo !== 'simple') return;
      const exIdx = 'e' + idx;
      if(entry.int && !esCalentamiento && !entry.tecnica){
        nIndiv++;
        regCfg.push({ idx: exIdx, nombre: entry.titulo, sets: entry.sets || 1, reps: entry.reps || '', carga: entry.carga || '', u: entry.unidad && entry.unidad !== 'reps' ? entry.unidad : '', rir: String(entry.rir || ''), r: -1, tec: entry.tecnica || '' });
        filas += '<div class="jp-int-rx" data-rest-sec="0"><div class="jp-int-txt">' + escSB(rxIntervaloSB(entry)) + '</div>' +
          (entry.rir ? '<div class="jp-int-meta">' + 'RIR ' + escSB(entry.rir) + '</div>' : '') + '</div>';
        return;
      }
      if(entry.sets > 6 && !esCalentamiento && !entry.tecnica){
        nIndiv++;
        regCfg.push({ idx: exIdx, nombre: entry.titulo, sets: entry.sets || 1, reps: entry.reps || '', carga: entry.carga || '', u: entry.unidad && entry.unidad !== 'reps' ? entry.unidad : '', rir: String(entry.rir || ''), tec: entry.tecnica || '' });
        filas += '<div class="jp-sb-ex jp-sb-ex-int" data-rest-sec="0">' +
            '<div class="jp-sb-ex-head"><span class="jp-sb-ex-id">' + jpIdx2(nIndiv) + '</span><span class="jp-sb-ex-nombre">' + nombreHibridoSB(entry.titulo, block) + '</span></div>' + subEsSB(entry.titulo, block) +
            dosisCompletaSB(entry.sets || 1, entry.reps, entry.unidad, entry.tempo, entry.rir, 0, entry.carga ? '@ ' + entry.carga : '') +
          '</div>';
        return;
      }
      /* directiva maestra ("Registro ágil de 1 toque para Drop Sets y
         Myo-Reps") -- toma prioridad ANTES del chequeo de "sin dosis"
         de abajo: un MYO-REPS/DROP SET se registra igual con la fila
         única, tenga o no el coach un patrón "NxM" reconocible en la
         línea. Nunca en calentamiento (ahí la técnica no aplica). */
      if(!esCalentamiento && (entry.tecnica === 'myoreps' || entry.tecnica === 'dropset')){
        const esAnclaTec = !anclaUsada; anclaUsada = true;
        if((parseInt(entry.sets, 10) || 0) > 1) regCfg.push({ idx: exIdx, nombre: entry.titulo, sets: parseInt(entry.sets, 10) || 1, reps: entry.reps || '', carga: entry.carga || '', u: entry.unidad && entry.unidad !== 'reps' ? entry.unidad : '', rir: String(entry.rir || ''), r: restAttrSB(entry) === '0' ? -1 : (parseInt(restAttrSB(entry), 10) || 0), tec: entry.tecnica, ko: 1, uni: entry.unilateral || '' });
        filas += '<div class="jp-sb-ex' + (esAnclaTec ? ' jp-sb-ex-ancla' : '') + '" data-rest-sec="' + restAttrSB(entry) + '">' +
            '<div class="jp-sb-ex-head"><span class="jp-sb-ex-id">' + jpIdx2(++nIndiv) + '</span><span class="jp-sb-ex-nombre">' + nombreHibridoSB(entry.titulo, block) + '</span>' + verTecnicaSB(entry.titulo, block) + '</div>' + subEsSB(entry.titulo, block) +
            dosisCompletaSB(entry.sets, entry.reps, entry.unidad, entry.tempo, entry.rir, entry.restSeconds, entry.carga ? '@ ' + entry.carga : '', entry.unilateral, !!entry.restCero) +
            estructuraTecnicaSB({ tecnica: entry.tecnica, sets: entry.sets, pct: entry.tecnicaPct, microReps: entry.myoInfo && entry.myoInfo.microReps }) +
            renderRegistroTecnicaUnicaSB(weekIdx, dayId, block.id, exIdx, entry.tecnica, entry.unidad, true, { n: parseInt(entry.sets, 10) || 1, tot: parseInt(entry.sets, 10) || 1, pct: entry.tecnicaPct, nombre: entry.titulo }) +
          '</div>';
        return;
      }
      /* directiva ("Clonar experiencia pura de CrossFit", requerimiento 2):
         una línea sin patrón SxReps jamás tuvo una dosis real asignada
         (entry.sets sigue en 0, ver parsearPizarraSB) -- típico de
         calentamiento/movilidad/cardio suave ("Remo suave — 3 min", "20
         cal Row"). Para esos casos NUNCA se inventa un tracker de series
         mudo: se replica la fila táctica limpia de CrossFit (pastilla de
         dosis + nombre, vía el mismo jpCfSplit() que ya usa jpCfFila()
         más arriba en este archivo -- función pura, sin estado de CF,
         reutilizable tal cual). Un bloque de calentamiento SIEMPRE cae
         acá, aunque la línea sí haya matcheado una dosis numérica (ej.
         "3x10 Air Squats") -- para eso el valor de la pastilla se arma
         con entry.sets/reps cuando existen, en vez de sólo con
         jpCfSplit(). directiva maestra ("Reparación y compilación
         universal de videos por bloque"): revierte la supresión de
         videoLinkHtml() para calentamiento ("Desvinculación del
         Warm-up", una directiva anterior) -- el coach SÍ vincula videos
         de movilidad/activación y nunca llegaban al alumno. */
      if(esCalentamiento && entry.tipo === 'simple' && entry.tituloOriginal){
        /* el calentamiento mantiene su render de lista/viñetas: se restituye la linea original */
        entry.titulo = entry.tituloOriginal; entry.sets = 0; entry.reps = ''; entry.tempo = ''; entry.restSeconds = 0; entry.rir = ''; entry.dosisAsignada = false; entry.notas = [];
      }
      if(!esCalentamiento && !entry.sets && esEjercicioIndividualSB(entry, block)){ entry.sets = 1; entry.setsDef = true; }
      if(!entry.sets || esCalentamiento){
        /* activación redactada como lista continua: un renglón limpio con viñeta cian por ejercicio */
        if(esCalentamiento && !entry.sets){
          const itemsLista = partirListaActivacionSB(entry.titulo);
          if(itemsLista.length > 1){
            filas += itemsLista.map(function(it){
              return '<div class="jp-sb-plain jp-sb-plain-warmup"><span class="jp-sb-plain-nombre">' + escSB(limpiarGuionActivacionSB(it)) + '</span></div>';
            }).join('') + (entry.notas.length ? '<div class="jp-sb-nota">' + escSB(entry.notas.join(' · ')) + '</div>' : '');
            return;
          }
        }
        const partesPlain = jpCfSplit(entry.titulo);
        const pillTxt = entry.sets ? (entry.sets + (entry.reps ? 'x' + entry.reps : '') + (entry.unidad && entry.unidad !== 'reps' ? ' ' + entry.unidad : '')) : partesPlain.val;
        /* nombre de estación limpio: sin el guion de viñeta ni la "x" que queda colgando cuando la cantidad pasó a la pastilla ("- Sled push / Trineo x" -> "Sled push / Trineo") */
        const nombrePlain = esCalentamiento ? limpiarGuionActivacionSB(partesPlain.nm) : jpLimpiarNombreEstacionSB(partesPlain.nm);
        /* la línea de formato ("Cuatro rondas: ...", AMRAP, EMOM, For Time) es una consigna, no una estación: va en una banda sin número */
        /* estación de cardio / finisher: una línea con viñeta ("- SkiErg x 40 s al máximo sostenible") o con cantidad ("Assault bike x 40 s a un ritmo sostenible") es SIEMPRE una estación,
           aunque sea larga: antes las de más de 48 caracteres se tomaban por consigna de formato y el circuito mezclaba filas numeradas con bandas de cronómetro. Todas las estaciones se
           arman igual: número, nombre corto, cantidad en su pastilla y la aclaración en una línea propia. */
        const estPartida = !esCalentamiento ? jpPartirEstacionSB(nombrePlain) : null;
        const esEstacionPlain = !esCalentamiento && (!!pillTxt || /^\s*[\-–—•*]\s*\S/.test(partesPlain.nm) || (!!estPartida && !jpEsConsignaSB(nombrePlain)));
        const esFormatoPlain = !esCalentamiento && !esEstacionPlain && jpEsLineaFormatoSB(nombrePlain, !!pillTxt);
        const claseEst = !esCalentamiento && !esFormatoPlain;
        if(esFormatoPlain){
          filas += '<div class="jp-sb-plain jp-sb-plain-fmt"><span class="jp-sb-fmt-ic" aria-hidden="true">⏱</span><span class="jp-sb-plain-nombre">' + escSB(nombrePlain) + '</span></div>';
          return;
        }
        const nomEst = (esEstacionPlain && estPartida) ? estPartida.nm : nombrePlain;
        const pillEst = pillTxt || ((esEstacionPlain && estPartida) ? estPartida.qty : '');
        const notaEst = [(esEstacionPlain && estPartida && estPartida.nota) ? estPartida.nota : ''].concat(entry.notas || []).filter(Boolean);
        filas += '<div class="jp-sb-plain' + (esCalentamiento ? ' jp-sb-plain-warmup' : '') + (claseEst ? ' jp-sb-plain-est' : '') + '">' +
            (!esCalentamiento ? '<span class="jp-sb-ex-id">' + jpIdx2(++nIndiv) + '</span>' : '') +
            '<span class="jp-sb-plain-nombre">' + escSB(nomEst) + '</span>' +
            (pillEst ? '<span class="jp-sb-plain-pill">' + escSB(pillEst) + '</span>' : '') +
            (entry.tecnica && TECNICAS_BADGE_SB[entry.tecnica] ? '<span class="jp-sb-badge jp-sb-badge-' + entry.tecnica + '">' + TECNICAS_BADGE_SB[entry.tecnica] + '</span>' : '') +
            (notaEst.length ? '<div class="jp-sb-nota">' + escSB(notaEst.join(' · ')) + '</div>' : '') +
          '</div>';
        return;
      }
      const esAncla = !anclaUsada; anclaUsada = true;
      regCfg.push({ idx: exIdx, nombre: entry.titulo, sets: entry.sets || 1, reps: entry.reps || '', carga: entry.carga || '', u: entry.unidad && entry.unidad !== 'reps' ? entry.unidad : '', rir: String(entry.rir || ''), r: restAttrSB(entry) === '0' ? -1 : (parseInt(restAttrSB(entry), 10) || 0), tec: entry.tecnica || '', uni: entry.unilateral || '' });
      if(entry.tecnica === 'restpause' && !entry.tramos){
        var cfgRp = regCfg[regCfg.length - 1]; cfgRp.et = [];
        for(var kq = 0; kq < cfgRp.sets; kq++) cfgRp.et.push(kq === cfgRp.sets - 1 ? '\u26a1 REST-PAUSE: al fallo \u2192 pausa 15-20 s \u2192 +2-4 reps \u2192 pausa \u2192 +2-4 reps (una sola serie)' : '');
      }
      if(entry.tramos){
        var cfgTr = regCfg[regCfg.length - 1]; cfgTr.rp = []; cfgTr.et = [];
        entry.tramos.forEach(function(t){ for(var k = 0; k < t.sets; k++){ cfgTr.rp.push(t.reps); cfgTr.et.push(t.etq || ''); } });
      }
      /* directiva técnica ("Auditoría integral del reloj emergente") --
         mismo data-rest-sec que .jp-sb-subex, ver comentario ahí arriba. */
      filas += '<div class="jp-sb-ex' + (esAncla ? ' jp-sb-ex-ancla' : '') + '" data-rest-sec="' + restAttrSB(entry) + '">' +
          '<div class="jp-sb-ex-head"><span class="jp-sb-ex-id">' + jpIdx2(++nIndiv) + '</span><span class="jp-sb-ex-nombre">' + nombreHibridoSB(entry.titulo, block) + '</span>' + verTecnicaSB(entry.titulo, block) + '</div>' + subEsSB(entry.titulo, block) +
          (entry.tramos ? tramosHtmlSB(entry) : dosisCompletaSB(entry.setsDef ? 0 : entry.sets, entry.reps, entry.unidad, entry.tempo, entry.rir, entry.restSeconds, entry.carga ? '@ ' + entry.carga : '', entry.unilateral, !!entry.restCero)) +
          (entry.tecnica === 'restpause' && !entry.tramos ? estructuraTecnicaSB({ tecnica: 'restpause', sets: entry.sets || 1 }) : '') +
          (entry.notas.length ? '<div class="jp-sb-nota">' + escSB(entry.notas.join(' · ')) + '</div>' : '') +
          (entry.tecnica && TECNICAS_BADGE_SB[entry.tecnica] ? '<span class="jp-sb-badge jp-sb-badge-' + entry.tecnica + '">' + TECNICAS_BADGE_SB[entry.tecnica] + '</span>' : '') +
        '</div>';
    });
    if(!filas) return;
    /* directiva ("Unificación de tips/videos"): UN SOLO acordeón por
       bloque -- absorbe lo que antes se veía triplicado (este mismo
       acordeón + "Criterio del Coach" + "Pautas Técnicas, Tips y
       Objetivo", ver pintarCriterios()/metodologia() más abajo en el
       archivo, ambos ahora se retiran para cualquier bloque con
       .jp-sb-board) y suma un listado de chips de video únicos del
       bloque completo (ejercicios simples + sub-ejercicios de biset),
       reusando videoLinkHtml()/buscarVideo() -- mismos datos que ya
       resuelve cada fila, sin duplicar lógica de matching. */
    const videosBloque = recolectarVideosSB(entries, esCalentamiento, block);
    /* biset: cada estacion necesita su tarjeta; si una no tiene video vinculado se ofrece la busqueda de su tecnica */
    const busquedasVid = [];
    (function(){
      const subsAll = [];
      entries.forEach(function(en){ if(en && en.tipo === 'biserie') (en.subs || []).forEach(function(sb){ subsAll.push(sb.nombre); }); });
      let faltan = subsAll.length - videosBloque.length;
      if(faltan <= 0) return;
      subsAll.forEach(function(nm){
        if(faltan > 0 && !miniVideoSB(nm, block)){ busquedasVid.push(nm); faltan--; }
      });
    })();
    /* lo escrito en los campos propios + lo que el coach dejó mezclado en la prescripción libre (sin repetir) */
    const unirMetaSB = function(propio, extra){
      const ex = metaHtmlSB(extra);
      if(!ex) return propio || '';
      if(!propio) return ex;
      /* mismo contenido escrito dos veces (campo propio + prescripción libre): se conserva sólo el más completo */
      const np = normTitSB(String(propio).replace(/<[^>]*>/g, ' ')), ne = normTitSB(String(extra));
      if(np.indexOf(ne) >= 0) return propio;
      if(ne.indexOf(np) >= 0) return ex;
      return propio;      /* dos párrafos distintos: queda un único resumen, el del campo propio */
    };
    const objetivoHtml = unirMetaSB(block.objective, sepMeta.objective);
    const nombresTips = {};
    entries.forEach(function(en){
      if(en && en.tipo === 'biserie' && en.subs){
        const L0 = String(en.letra || 'A').toUpperCase();
        en.subs.forEach(function(sb, ix){ nombresTips[L0 + (ix + 1)] = { nombre: sb.nombre, btn: verTecnicaSB(sb.nombre, block) }; });
      }
    });
    const tipsHtml = /<[a-z][^>]*>/i.test(String(block.tips || ''))
      ? unirMetaSB(block.tips, sepMeta.tips)
      : formatTipsSB(quitarTipsDeTarjetaSB((function(){
          var p = String(block.tips || ''), x = String(sepMeta.tips || '');
          if(!x) return p;
          if(!p) return x;
          var np = normTitSB(p), nx = normTitSB(x);
          if(np.indexOf(nx) >= 0) return p;
          if(nx.indexOf(np) >= 0) return x;
          return p + '\n' + x;
        })(), regCfg.length), nombresTips);
    /* tempo "3110" -> "3 s bajada · 1 s pausa abajo · 1 s subida · 0 s pausa arriba" (X = explosivo) */
    const explicarTempoSB = function(tp){
      const m = String(tp || '').match(/^([\dXx])([\dXx])([\dXx])([\dXx])$/);
      if(!m) return '';
      const sg = function(v, txt){ return v + ' s ' + txt; };
      return [sg(m[1], 'bajada'), sg(m[2], 'pausa abajo'), /x/i.test(m[3]) ? 'subida explosiva' : sg(m[3], 'subida'), sg(m[4], 'pausa arriba')].join(' \u00b7 ');
    };
    const tempoHtml = (function(){
      const filasT = [];
      const add = function(nom, tp){ const ex = explicarTempoSB(tp); if(ex) filasT.push('<div class="jp-tempo-row"><b>' + escSB((function(){ const inf = infoNombreSB(nom, block); return (inf && (inf.es || inf.en)) || limpiarTituloSB(nom); })()) + '</b> \u00b7 ' + escSB(tp) + ' \u2192 ' + ex + '</div>'); };
      if(esCalentamiento) return '';
      entries.forEach(function(en){
        if(!en) return;
        if(en.tipo === 'simple'){
          const tp = en.tempo || (en.tramos ? (en.tramos.filter(function(t){ return t.tempo; })[0] || {}).tempo : '');
          if(tp) add(en.titulo, tp);
        } else if(en.tipo === 'biserie'){
          (en.subs || []).forEach(function(sb){ if(sb.tempo) add(sb.nombre, sb.tempo); });
        }
      });
      return filasT.length ? '<div class="jp-sb-pauta"><div class="jp-sb-pauta-lb jp-lb-tempo">\u23f1 ' + escSB(jpT('app.card.tempo.t')) + '</div><div class="jp-sb-pauta-txt">' + filasT.join('') + '</div></div>' : '';
    })();
    const tieneAcc = !!tipsHtml;
    /* directiva maestra ("Limpieza de indicadores y títulos secundarios")
       -- el énfasis muscular/técnico que el coach agrega entre paréntesis
       al título del bloque ("BLOQUE 4 | GLÚTEO (EXTENSIÓN DE CADERA &
       TENSIÓN MECÁNICA)") ya no se deja pegado al título principal en
       naranja pleno -- se separa a su propia línea técnica con doble
       barra ("// ..."), mismo patrón ya usado para el título de la
       sesión (splitTituloSesionSports). */
    const tituloBloqueM = String(block.title || '').match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    const tituloBloquePrincipal = tituloBloqueM ? (tituloBloqueM[1].trim() || block.title) : (block.title || '');
    const tituloBloqueEnfasis = tituloBloqueM ? tituloBloqueM[2].trim() : '';
    /* cabecera limpia: [ BIOMECANICA APLICADA · FUERZA ] // 22 MIN. El titulo grande repetia la categoria: queda en el DOM (lo usa el bloque plegado y
       "Bloque completado") pero se oculta con CSS. El tiempo sale del "(22 MIN)" del titulo o de la duracion estimada del bloque. */
    const mMinT = tituloBloqueEnfasis.match(/^(\d+)\s*MIN/i), minutosTag = mMinT ? mMinT[1] : (duracionEstimada || '');
    const html = '<div class="wod-board jp-sb-board" data-sportsboard="' + block.id + '">' +
        '<div class="jp-sb-tag">[ ' + escSB(jpT('app.card.tag')) + ' &middot; ' + tagCategoriaSB(block, esCalentamiento) + ' ]' + (minutosTag ? ' <span class="jp-sb-tmin">// ' + minutosTag + ' MIN</span>' : '') + '</div>' +
        (block.ocultaTituloTablero ? '' : tituloBloqueHtmlSB(tituloBloquePrincipal)) +
        (tituloBloqueEnfasis ? '<div class="jp-block-emphasis">// ' + escSB(tituloBloqueEnfasis.toUpperCase()) + '</div>' : '') +
        filas + chipsVideoSB(videosBloque, busquedasVid) +
        (tieneAcc ?
          '<details class="jp-block-details"><summary class="jp-summary-btn"><svg class="jp-pauta-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2v.2h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg><span>' + escSB(jpT('app.card.tips')) + '</span></summary>' +
            '<div class="jp-details-content">' +
              (tipsHtml ? '<div class="jp-sb-pauta"><div class="jp-sb-pauta-lb jp-lb-tips">&#128161; ' + escSB(jpT('app.card.tips.lb')) + '</div><div class="jp-sb-pauta-txt">' + tipsHtml + '</div></div>' : '') +
            '</div>' +
          '</details>' : '') +
        (regCfg.length ? jpRegBotonHtml({ w: weekIdx, d: dayId, b: block.id, t: block.title || '', ex: regCfg, obj: String(block.objective || ''), tp: String(block.tips || '') }) : '') +
      '</div>';
    var htmlFinal = html;
    if(esCalentamiento){
      /* solo ejercicios reales: se excluye la prescripcion general ("1 Set: 6 min continuo", "3 rondas") */
      var RX_PRESC_GEN_SB = /^\s*(?:\d+\s*(?:sets?|series?|rondas?|rounds?)\b\s*[:\-\u2013]|\d+\s*(?:min|minutos)\b.*\b(?:continu\w*|total|de trabajo)|(?:circuito|rondas?|tiempo total|total)\b)/i;
      var nAct = 0;
      filas.split('jp-sb-plain-nombre">').slice(1).forEach(function(p){ if(!RX_PRESC_GEN_SB.test(p.split('<')[0])) nAct++; });
      htmlFinal = '<details class="jp-warm-acc"><summary><span class="jp-warm-lb">\ud83d\udd25 ACTIVACI\u00d3N' + (nAct ? ' \u00b7 ' + nAct + ' EJERCICIOS' : '') + '</span><span class="jp-warm-chev">\u25bc</span></summary>' + html + '</details>';
    }
    body.insertAdjacentHTML('afterbegin', htmlFinal);
    try{ jpQrAcomodar(body); }catch(eQr){ console.warn('registro 1 toque', eQr); }
    try{ jpCajasTarjetaSB(body, objetivoHtml); }catch(eCj){ console.warn('cajas de la tarjeta', eCj); }
    body.querySelectorAll('.ex-row, .wu-phase, .coach-note').forEach(function(el){
      if(!el.closest('[data-sportsboard]')) el.style.display = 'none';
    });
    /* directiva ("Refactoring integral: reconstrucción total del tracker
       de series en Sports"): renderSetRowsNativeSB() ya arma filas nativas
       (.jp-set-row-native) autosuficientes -- no quedan .set-row/.set-
       tracker acá adentro, así que no hace falta ninguna clase de
       colapso/expansión ni wireSetRow() (ese sigue existiendo intacto
       para bloques CLÁSICOS de Sports, fuera de la Pizarra). La conexión
       de eventos de estas filas nuevas vive en un único listener
       delegado sobre document (ver más abajo en el archivo, junto a
       "RELOJ DE DESCANSO EMERGENTE"), así que ni siquiera importa en qué
       momento se insertan en el DOM. */
  }

  /* ============================================================
     REFACTORING INTEGRAL -- EVENTOS DELEGADOS DE LA FILA NATIVA
     Únicos listeners que tocan .jp-input-native/.jp-btn-check-native
     (exclusivos de la Pizarra Sports, ver renderSetRowsNativeSB() más
     arriba) -- delegados sobre document, así que conectan CUALQUIER fila
     sin importar cuándo se insertó al DOM (nunca hace falta re-cablear
     nada a mano, a diferencia del viejo wireSetRow() por-elemento). Cero
     alcance sobre CrossFit: esas clases no existen en ningún HTML que
     genere pizarra() de CF.
     ============================================================ */
  document.addEventListener('input', function(e){
    const el = e.target;
    const esKg = el.classList && el.classList.contains('jp-val-primary');
    const esSec = el.classList && el.classList.contains('jp-val-secondary');
    if(esKg || esSec){
      const row = el.closest('.jp-set-row-native'); if(!row) return;
      const key = row.dataset.setKey; if(!key) return;
      setLoadField(key, esKg ? 'kg' : 'reps', el.value);
      if(esKg){ const trDrop = row.closest('.jp-drop-tracker'); if(trDrop) jpDropSugerirSB(trDrop); }
      return;
    }
    /* directiva ("Compilación estructurada de Myo-Reps") -- cada input
       chico de microserie persiste su propio conteo de reps, mismo
       mecanismo getLoadKey/setLoadField que el resto del tracker (clave
       con sufijo 'm1'/'m2'/... en vez de un número de serie, ver
       renderSetRowsNativeSB) -- nunca compite con el volumen (kg*reps)
       de las series reales, es sólo referencia de la activación. */
    if(el.classList && el.classList.contains('jp-myo-mini')){
      const microKey = el.dataset.microKey; if(!microKey) return;
      setLoadField(microKey, 'reps', el.value);
    }
  });
  document.addEventListener('click', function(e){
    const btn = e.target.closest('.jp-btn-check-native');
    if(!btn) return;
    const row = btn.closest('.jp-set-row-native'); if(!row) return;
    const key = row.dataset.setKey; if(!key) return;
    const nowDone = !btn.classList.contains('completed');
    /* directiva maestra ("Optimización en el registro de cargas: Quick-
       Check con carga previa/fantasma") -- si el alumno tilda [✓] con el
       input de kg vacío, se completa solo ANTES de marcar la serie,
       tomando primero la serie INMEDIATAMENTE ANTERIOR de este mismo
       ejercicio ya cargada en esta sesión (más precisa: es lo que el
       alumno acaba de levantar hace 90 segundos) y, si no hay ninguna
       previa (Set 1), cae al Ghost Load / target ya precalculado que
       kgPlaceholder/placeholder de reps ya muestran como sugerencia (ver
       renderSetRowsNativeSB() más arriba) -- así el reloj de descanso
       arranca en el mismo toque, sin que el alumno tenga que parar a
       escribir en medio de la serie. Nunca pisa un valor que el alumno
       ya haya tipeado a mano (sólo actúa si el input está vacío), y
       nunca corre al DEStildar. */
    if(nowDone){
      const kgInput = row.querySelector('.jp-val-primary');
      const repsInput = row.querySelector('.jp-val-secondary');
      const prevRow = row.previousElementSibling;
      const prevKgInput = (prevRow && prevRow.classList && prevRow.classList.contains('jp-set-row-native')) ? prevRow.querySelector('.jp-val-primary') : null;
      const prevRepsInput = (prevRow && prevRow.classList && prevRow.classList.contains('jp-set-row-native')) ? prevRow.querySelector('.jp-val-secondary') : null;
      const sinKgFila = row.classList.contains('jp-modo-banda') || row.classList.contains('jp-modo-tiempo') || row.classList.contains('jp-modo-solo') ||
        (row.classList.contains('jp-modo-bw') && !row.classList.contains('jp-lastre-on'));
      if(kgInput && !kgInput.value && !sinKgFila){
        const autoKg = (prevKgInput && prevKgInput.value) ? prevKgInput.value
          : (/^\d/.test(kgInput.placeholder) && kgInput.placeholder !== '0' ? kgInput.placeholder : '');
        if(autoKg){ kgInput.value = autoKg; setLoadField(key, 'kg', autoKg); }
      }
      if(repsInput && !repsInput.value){
        const autoReps = (prevRepsInput && prevRepsInput.value) ? prevRepsInput.value
          : (/^\d+(?:[.,]\d+)?$/.test(repsInput.placeholder) && repsInput.placeholder !== '0' ? repsInput.placeholder : '');
        if(autoReps){ repsInput.value = autoReps; setLoadField(key, 'reps', autoReps); }
      }
    }
    btn.classList.toggle('completed', nowDone);
    row.classList.toggle('completed', nowDone);
    setLoadField(key, 'done', nowDone);
    /* directiva ("Motor de Retroalimentación Háptica & Sonido Táctico")
       -- al TILDAR (nowDone=true) usa el tono dual + vibración corta
       nuevos; al destildar se conserva el beep grave de siempre (la
       directiva sólo especifica el feedback de "marcar", no el de
       deshacer). */
    if(nowDone){
      try{ jpAudioTactical.soundCheckSet(); }catch(err){}
      try{ jpAudioTactical.vibrateCheckSet(); }catch(err){}
      const bl = btn.closest('.block');
      /* directiva técnica ("Auditoría integral del reloj emergente") --
         el descanso real de ESTE ejercicio puntual (data-rest-sec, ver
         pizarraSports() más arriba) viaja como override explícito -- sin
         él, jpArrancarDescansoSetNative()/descansoDe() caían siempre al
         fallback genérico (state.restSec) e ignoraban el "Rest Xs" que el
         coach prescribió línea por línea. */
      const dropCard = btn.closest('.jp-drop-card');      /* drop set: sin descanso entre bajadas, el reloj arranca con la ultima tarjeta */
      const exWrap = btn.closest('.jp-sb-ex, .jp-sb-subex');
      const restOverride = exWrap ? (exWrap.dataset.restSec === '0' ? -1 : (parseInt(exWrap.dataset.restSec, 10) || 0)) : 0;   /* -1 = "Rest 0s": sin descanso */
      /* directiva maestra ("Botonera rápida de ajuste en descanso") -- la
         próxima fila del MISMO ejercicio (siguiente .jp-set-row-native
         hermano directo, ver renderSetRowsNativeSB()) es el objetivo de
         los steppers +/- del HUD de descanso -- referencia global simple
         (mismo patrón __jpRondaActual ya usado en este archivo) porque
         el HUD vive en OTRA IIFE (RELOJ DE DESCANSO EMERGENTE) y no
         comparte closure con este listener. */
      const nextRow = row.nextElementSibling;
      window.__jpRestKgInput = (nextRow && nextRow.classList && nextRow.classList.contains('jp-set-row-native'))
        ? nextRow.querySelector('.jp-val-primary') : null;
      if(bl && typeof window.jpArrancarDescansoSetNative === 'function' && !(dropCard && dropCard.getAttribute('data-drop-last') !== '1')) window.jpArrancarDescansoSetNative(bl, restOverride);
    } else {
      try{ beepSetCheck(false); }catch(err){}
    }
  });
  /* directiva maestra ("Registro ágil de 1 toque para Drop Sets y Myo-
     Reps") -- persistencia de la nota opcional de intensidad, mismo
     mecanismo state.notes[key] ya usado en el resto de la app (ver
     comentario en renderRegistroTecnicaUnicaSB más arriba): nunca traba
     el flujo -- no hay validación, no hay confirmación, se guarda sola
     mientras el alumno/a tipea. */
  document.addEventListener('input', function(e){
    var el = e.target.closest('.jp-intensity-note'); if(!el) return;
    state.notes = state.notes || {};
    state.notes[el.dataset.notekey] = el.value;
    saveProgress();
  });
  /* directiva ("Tratamiento exclusivo de intensificadores") -- chips de
     bajada + contador rápido de reps de renderRegistroTecnicaUnicaSB():
     selección de UN chip a la vez (single-select), stepper nunca baja
     de 0, "Agregar" compone el fragmento y lo anexa al MISMO input
     .jp-intensity-note (dispara 'input' real -> reusa el listener de
     persistencia de arriba tal cual, cero mecanismo de guardado nuevo)
     y resetea chip+contador para la siguiente bajada/mini-set. */
  document.addEventListener('click', function(e){
    var chip = e.target.closest('.jp-tecnica-chip');
    if(chip){
      var group = chip.closest('.jp-tecnica-quickreg');
      var wasActive = chip.classList.contains('active');
      group.querySelectorAll('.jp-tecnica-chip').forEach(function(c){ c.classList.remove('active'); });
      if(!wasActive) chip.classList.add('active');
      return;
    }
    var stepBtn = e.target.closest('.jp-tecnica-step-btn');
    if(stepBtn){
      var valEl = stepBtn.closest('.jp-tecnica-stepper').querySelector('[data-stepval]');
      var next = Math.max(0, (parseInt(valEl.textContent, 10) || 0) + (parseInt(stepBtn.dataset.step, 10) || 0));
      valEl.textContent = String(next);
      return;
    }
    var addBtn = e.target.closest('.jp-tecnica-add-btn');
    if(addBtn){
      var quickreg = addBtn.closest('.jp-tecnica-quickreg');
      var activeChip = quickreg.querySelector('.jp-tecnica-chip.active');
      var reps = parseInt(quickreg.querySelector('[data-stepval]').textContent, 10) || 0;
      if(!activeChip && reps === 0) return; /* nada que agregar todavía */
      var frag = (activeChip ? ('-' + activeChip.dataset.pct + '%: ') : '') + reps + ' reps';
      var noteInput = quickreg.parentElement.querySelector('.jp-intensity-note');
      if(noteInput){
        noteInput.value = noteInput.value ? (noteInput.value + ', ' + frag) : frag;
        noteInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      quickreg.querySelectorAll('.jp-tecnica-chip').forEach(function(c){ c.classList.remove('active'); });
      quickreg.querySelector('[data-stepval]').textContent = '0';
    }
  });

  /* directiva ("Motor de 1RM exacto") -- modal táctico CENTRADO: el
     popover chico anclado al botón quedaba tapado por el teclado
     numérico de iOS (posición absoluta contra las coordenadas de la
     página, que no se reacomoda cuando el visual viewport se achica) y
     podía desbordar el ancho en pantallas angostas. Ahora es un overlay
     de pantalla completa (mismo patrón que guideModal/painModal/
     calcModal) con la tarjeta SIEMPRE centrada en el viewport visible,
     título con el benchmark madre y cálculo exacto (1RM×%/100, sin
     redondear a múltiplos de 2.5kg) que recalcula TODAS las filas del
     día que usan ese mismo 1RM al guardar. */
  function jpPctEsc(s){ return String(s == null ? '' : s).replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
  function jpCerrarPct1RM(){
    var ex = document.querySelector('.jp-pct-overlay');
    if(ex) ex.remove();
  }
  function jpAbrirPct1RM(liftName, key){
    jpCerrarPct1RM();
    var actual = (state.oneRM && state.oneRM[key]) || '';
    var overlay = document.createElement('div');
    overlay.className = 'jp-pct-overlay';
    overlay.innerHTML =
      '<div class="jp-pct-pop">' +
        '<div class="jp-pct-pop-lb">Ingresar 1RM: ' + jpPctEsc(liftName) + '</div>' +
        '<div class="jp-pct-pop-row">' +
          '<input type="text" inputmode="decimal" class="jp-pct-pop-in" placeholder="Kg" value="' + jpPctEsc(actual) + '">' +
        '</div>' +
        '<div class="jp-pct-pop-actions">' +
          '<button type="button" class="jp-pct-pop-ok" data-pctsave="' + jpPctEsc(key) + '">Guardar</button>' +
          '<button type="button" class="jp-pct-pop-x" data-pctcancel="1">Cancelar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    var input = overlay.querySelector('.jp-pct-pop-in');
    input.focus(); input.select();
    input.addEventListener('keydown', function(ev){
      if(ev.key === 'Enter'){ ev.preventDefault(); overlay.querySelector('[data-pctsave]').click(); }
      else if(ev.key === 'Escape'){ ev.preventDefault(); jpCerrarPct1RM(); }
    });
    overlay.addEventListener('click', function(ev){ if(ev.target === overlay) jpCerrarPct1RM(); });
  }
  function jpGuardarPct1RM(btn){
    var pop = btn.closest('.jp-pct-pop');
    var input = pop && pop.querySelector('.jp-pct-pop-in');
    var kg = parseFloat(input ? input.value.replace(',', '.') : '');
    var key = btn.dataset.pctsave || '';
    jpCerrarPct1RM();
    if(!(kg > 0) || !key) return;
    state.oneRM = state.oneRM || {};
    state.oneRM[key] = kg;
    saveProgress();
    /* directiva ("Motor de Retroalimentación Háptica y Sonido Táctico")
       -- CrossFit no usa el tracker clásico de sets (chequearPR arriba
       en el archivo): acá es donde el atleta de CF de verdad guarda un
       PR/1RM, mismo feedback nuevo que en Sports. */
    /* directiva maestra ("Bóveda de PRs · UX continua y mute"): guardar una
       marca es SILENCIOSO (sólo vibración háptica) y, si se la editó desde la
       Bóveda, se vuelve a la lista actualizada con la fila en destello -- la
       Bóveda sólo se cierra cuando el alumno toca [ Cerrar ] o el fondo. */
    try{ jpAudioTactical.vibratePrRecord(); }catch(e){}
    if(window.__jpPrsDesdeLista) jpAbrirListaPRs(key);
    if(typeof renderMain === 'function') renderMain();
  }
  /* directiva ("rediseño header CrossFit") -- chip de acceso rápido
     "⚡ PRs / 1RM": lista los benchmarks madre (Snatch/Clean & Jerk/
     Back Squat/Deadlift/etc.) con el 1RM que el atleta ya cargó (o "—"
     si todavía no cargó ninguno), cada fila abre el mismo modal de
     arriba para cargar/actualizar -- no hace falta esperar a tocar un
     "@ 76%" puntual en la Pizarra para revisar o corregir un 1RM. */
  /* directiva ("Expansión y Personalización de PRs/1RM") -- se agregan las
     variantes olímpicas/de fuerza más usadas en CrossFit; los nombres
     ORIGINALES ('Clean & Jerk', 'Jerk') se mantienen tal cual para no
     huerfanar el 1RM que un atleta ya haya guardado bajo esas claves
     (nrmHist() indexa por nombre normalizado). */
  var JP_BENCHMARKS_LISTA = [
    'Snatch', 'Power Snatch', 'Hang Power Snatch', 'Hang Squat Snatch',
    'Clean & Jerk', 'Clean', 'Power Clean', 'Hang Power Clean', 'Hang Squat Clean',
    'Jerk', 'Push Jerk', 'Split Jerk',
    'Strict Press', 'Push Press', 'Bench Press',
    'Back Squat', 'Front Squat', 'Overhead Squat (OHS)',
    'Deadlift', 'Sumo Deadlift'
  ];
  function jpBenchmarkFila(nombre){
    var key = nrmHist(nombre);
    var val = state.oneRM && state.oneRM[key];
    return '<button type="button" class="jp-prs-row" data-pct-lift="' + nombre + '" data-pct-key="' + key + '">' +
      '<span>' + nombre + '</span><span class="jp-prs-val">' + (val > 0 ? val + ' kg' : '— cargar') + '</span></button>';
  }
  /* directiva -- ejercicios personalizados agregados por el propio atleta
     (ej. "Thruster", "Weighted Pull-Up"), persistidos aparte de la lista
     fija en state.customBenchmarks (ver loadProgress/_spSerialize) para
     que sobrevivan a un reload/cierre de la app. */
  function jpAgregarBenchmarkPersonalizado(nombre, kg){
    nombre = String(nombre || '').trim();
    if(!nombre || !(kg > 0)) return false;
    state.customBenchmarks = state.customBenchmarks || [];
    var key = nrmHist(nombre);
    var yaExiste = JP_BENCHMARKS_LISTA.concat(state.customBenchmarks).some(function(n){ return nrmHist(n) === key; });
    if(!yaExiste) state.customBenchmarks.push(nombre);
    state.oneRM = state.oneRM || {};
    state.oneRM[key] = kg;
    saveProgress();
    return true;
  }
  function jpAbrirListaPRs(flashKey){
    jpCerrarPct1RM();
    window.__jpPrsDesdeLista = false;
    var overlay = document.createElement('div');
    overlay.className = 'jp-pct-overlay';
    var filas = JP_BENCHMARKS_LISTA.map(jpBenchmarkFila).join('') +
      (state.customBenchmarks || []).map(jpBenchmarkFila).join('');
    overlay.innerHTML =
      '<div class="jp-pct-pop jp-prs-pop">' +
        '<div class="jp-pct-pop-lb">&#9889; PRs / 1RM</div>' +
        '<div class="jp-prs-list">' + filas + '</div>' +
        '<button type="button" class="jp-prs-addbtn" data-pct-addcustom="1">&#10133; Agregar Ejercicio Personalizado</button>' +
        '<div class="jp-prs-addform" id="jpPrsAddForm" style="display:none">' +
          '<input type="text" class="jp-prs-addform-name" id="jpPrsAddName" placeholder="Nombre (ej: Thruster)" maxlength="40">' +
          '<input type="number" class="jp-prs-addform-kg" id="jpPrsAddKg" placeholder="kg" min="0" step="0.5">' +
          '<button type="button" class="jp-prs-addform-save" data-pct-savecustom="1">Guardar</button>' +
        '</div>' +
        '<div class="jp-pct-pop-actions"><button type="button" class="jp-pct-pop-x" data-pctcancel="1">Cerrar</button></div>' +
      '</div>';
    document.body.appendChild(overlay);
    /* micro-feedback de éxito: la fila recién guardada destella verde/dorado */
    if(flashKey){
      var rowsL = overlay.querySelectorAll('.jp-prs-row');
      for(var fi = 0; fi < rowsL.length; fi++){
        if(rowsL[fi].dataset.pctKey === flashKey){ rowsL[fi].classList.add('jp-flash-ok'); rowsL[fi].scrollIntoView({ block:'nearest' }); break; }
      }
    }
    overlay.addEventListener('click', function(ev){ if(ev.target === overlay) jpCerrarPct1RM(); });
  }
  /* directiva ("Bóveda de PRs Benchmark") -- el drawer de Perfil/Info
     (módulo aparte, más abajo en el archivo) necesita poder abrir esta
     misma lista de benchmarks para CrossFit en vez del hub genérico de
     PRs de Bodybuilding; se expone en window porque montarPerfil() vive
     en otro closure y no tiene acceso directo a esta función. */
  window.jpAbrirListaPRs = jpAbrirListaPRs;
  /* directiva ("Story Card: Tonelaje Real") -- datosStoryCF() (módulo de
     la Story Card, otro closure más arriba en el archivo) necesita el
     MISMO motor de resolución de "@ N%"/"@ Xkg" que ya usa la Pizarra
     para calcular el tonelaje real de la sesión -- se expone acá para
     no duplicar la lógica de 1RM/lematización en otro lado. */
  window.jpCfResolverKgLinea = jpCfResolverKgLinea;
  document.addEventListener('click', function(e){
    var quickRestBtn = e.target.closest('.jp-cf-quickrest');
    if(quickRestBtn){
      e.stopPropagation();
      var qSeg = parseInt(quickRestBtn.dataset.restSec, 10);
      if(qSeg > 0 && window.CoachTV && typeof window.CoachTV.rest === 'function'){
        window.CoachTV.rest(qSeg, quickRestBtn.dataset.restLb || 'Descanso');
        try{ if(navigator.vibrate) navigator.vibrate(20); }catch(errQr){}
      }
      return;
    }
    var wodTimerBtn = e.target.closest('.jp-cf-wodtimer');
    if(wodTimerBtn){
      e.stopPropagation();
      try{ var bdW = wodTimerBtn.closest('.jp-cfboard'); window.__jpWodActivo = bdW ? { id: bdW.getAttribute('data-wodb'), w: state.currentWeek, d: state.currentDay } : null; }catch(errA){}
      try{
        var wcfg = JSON.parse(decodeURIComponent(wodTimerBtn.dataset.wodcfg || ''));
        if(window.CoachWodTimer && typeof window.CoachWodTimer.configurar === 'function') window.CoachWodTimer.configurar(wcfg);
      }catch(errWt){}
      return;
    }
    var quick = e.target.closest('.jp-prs-quickbtn');
    if(quick){
      e.stopPropagation();
      /* directiva ("Balancear margen derecho -- Sports") -- Sports no
         usa la lista de benchmarks olímpicos de CrossFit acá: redirige
         a la Bóveda de Récords Personales ya existente (CoachHubUI,
         ver #prHubWrap / abrirHub() más abajo), la misma que hoy se
         abre desde el drawer de Perfil. */
      if(window.COACH_DISCIPLINA === 'sports'){
        if(window.CoachHubUI && typeof window.CoachHubUI.abrir === 'function') window.CoachHubUI.abrir();
      } else {
        jpAbrirListaPRs();
      }
      return;
    }
    var row = e.target.closest('.jp-prs-row');
    if(row){ e.stopPropagation(); jpAbrirPct1RM(row.dataset.pctLift || '', row.dataset.pctKey || ''); window.__jpPrsDesdeLista = true; return; }
    var addCustom = e.target.closest('[data-pct-addcustom]');
    if(addCustom){
      e.stopPropagation();
      var form = document.getElementById('jpPrsAddForm');
      if(form){ form.style.display = 'flex'; addCustom.style.display = 'none'; var nm = document.getElementById('jpPrsAddName'); if(nm) nm.focus(); }
      return;
    }
    var saveCustom = e.target.closest('[data-pct-savecustom]');
    if(saveCustom){
      e.stopPropagation();
      var nmEl = document.getElementById('jpPrsAddName'), kgEl = document.getElementById('jpPrsAddKg');
      var ok = jpAgregarBenchmarkPersonalizado(nmEl ? nmEl.value : '', kgEl ? parseFloat(kgEl.value) : 0);
      if(ok) jpAbrirListaPRs(nmEl ? nrmHist(nmEl.value) : '');
      return;
    }
    var btn = e.target.closest('.jp-cf-pct');
    if(btn){ e.stopPropagation(); jpAbrirPct1RM(btn.dataset.pctLift || '', btn.dataset.pctKey || ''); window.__jpPrsDesdeLista = false; return; }
    var save = e.target.closest('[data-pctsave]');
    if(save){ e.stopPropagation(); jpGuardarPct1RM(save); return; }
    var cancel = e.target.closest('[data-pctcancel]');
    if(cancel){
      e.stopPropagation();
      var esListaCerrar = !!cancel.closest('.jp-prs-pop');
      jpCerrarPct1RM();
      /* [ Cancelar ] de una marca individual vuelve a la Bóveda; [ Cerrar ] de la Bóveda la cierra */
      if(esListaCerrar) window.__jpPrsDesdeLista = false;
      else if(window.__jpPrsDesdeLista) jpAbrirListaPRs();
      return;
    }
    var restMain = e.target.closest('.jp-cf-rest-main');
    if(restMain){
      e.stopPropagation();
      var restWrap = restMain.closest('.jp-cf-rest');
      if(restWrap){
        if(restWrap.classList.contains('running')){
          if(window.CoachTV && typeof window.CoachTV.toggle === 'function') window.CoachTV.toggle();
        } else if(!restWrap.classList.contains('listo')){
          var seg = parseInt(restWrap.dataset.restSec, 10);
          if(seg > 0 && window.CoachTV && typeof window.CoachTV.rest === 'function'){
            if(jpCfRestBoundWrap && jpCfRestBoundWrap !== restWrap && document.body.contains(jpCfRestBoundWrap)) jpCfRestPintarIdle(jpCfRestBoundWrap);
            jpCfRestBoundWrap = restWrap;
            if(typeof window.CoachTV.mirror === 'function') window.CoachTV.mirror(jpCfRestOnTick);
            window.CoachTV.rest(seg, restWrap.dataset.restLb || 'Descanso', true);
            try{ if(navigator.vibrate) navigator.vibrate(20); }catch(x){}
          }
        }
      }
      return;
    }
    var restPlus = e.target.closest('.jp-cf-rest-plus');
    if(restPlus){
      e.stopPropagation();
      if(window.CoachTV && typeof window.CoachTV.sumar === 'function') window.CoachTV.sumar(30);
      try{ if(navigator.vibrate) navigator.vibrate(15); }catch(x){}
      return;
    }
    var restX = e.target.closest('.jp-cf-rest-x');
    if(restX){
      e.stopPropagation();
      if(window.CoachTV && typeof window.CoachTV.parar === 'function') window.CoachTV.parar();
      return;
    }
    if(!e.target.closest('.jp-pct-pop')) jpCerrarPct1RM();
  });

  /* =========================================================
     4) TRAINING VIEW / FOCUS MODE
  ========================================================= */
  let tvOn = false, tvIdx = 0;
  function bloquesVisibles(){ return Array.prototype.slice.call(mainEl.querySelectorAll('.block')); }
  function pintarTV(){
    const bs = bloquesVisibles();
    document.body.classList.toggle('focus-mode', tvOn);
    const btn = document.getElementById('tvStart');
    if(btn){
      btn.classList.toggle('on', tvOn);
      btn.innerHTML = tvOn ? '⏹ Salir' : '🚀 Iniciar Entrenamiento';
    }
    /* en móvil el botón de salir viaja a la barra inferior para quedar siempre al alcance del pulgar */
    const nav0 = document.getElementById('tvNav'), bar0 = mainEl.querySelector('.tv-bar');
    if(btn){
      if(tvOn && nav0 && btn.parentNode !== nav0){ nav0.appendChild(btn); btn.classList.add('tv-mini'); }
      if(!tvOn && bar0 && btn.parentNode !== bar0){ bar0.appendChild(btn); btn.classList.remove('tv-mini'); }
    }
    if(!tvOn){ bs.forEach(b => b.classList.remove('tv-active')); return; }
    if(tvIdx >= bs.length) tvIdx = Math.max(0, bs.length - 1);
    bs.forEach((b, i) => {
      b.classList.toggle('tv-active', i === tvIdx);
      if(i === tvIdx) b.classList.remove('collapsed');
    });
    const nav = document.getElementById('tvNav');
    if(nav){
      const lbEl = bs[tvIdx] && bs[tvIdx].querySelector('.block-label');
      const corto = lbEl ? lbEl.textContent.replace(/^bloque\s*[a-z0-9]*\s*·\s*/i, '').split('—')[0].trim().slice(0, 26) : '';
      nav.querySelector('.tv-pos').textContent = (tvIdx+1) + '/' + bs.length + (corto ? ' · ' + corto : '');
      nav.querySelector('[data-tv="prev"]').disabled = tvIdx === 0;
      nav.querySelector('[data-tv="next"]').disabled = tvIdx >= bs.length - 1;
    }
    const el = bs[tvIdx];
    if(el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 150), behavior:'smooth' });
  }
  function tvMover(n){
    const bs = bloquesVisibles();
    /* al pasar de bloque se marca el anterior como hecho */
    if(n > 0 && bs[tvIdx]){
      const cb = bs[tvIdx].querySelector('.block-done-cb');
      if(cb && !cb.checked){ cb.checked = true; cb.dispatchEvent(new Event('click', {bubbles:true})); }
    }
    tvIdx = Math.min(Math.max(0, tvIdx + n), Math.max(0, bs.length - 1));
    pintarTV();
  }

  /* =========================================================
     5) SESSION SUMMARY
  ========================================================= */
  /* directiva de implementación (2026-09) -- checkout de RIR/RPE
     auto-reportado (ítem 1 de la consultoría). Clave propia de localStorage
     (mismo criterio que coachjp_nutrilog_v1 u otros módulos chicos de esta
     vista), en vez de sumarse al allowlist de _spSerialize()/loadProgress()
     de más arriba -- así queda 100% aislado, cero riesgo de tocar el
     guardado de progreso ya existente (series, pesos, notas, etc.). */
  var KCR = 'coachjp_checkout_rpe_v1';
  function checkoutRpeLeer(){ try{ return JSON.parse(localStorage.getItem(KCR) || '{}') || {}; }catch(e){ return {}; } }
  function checkoutRpeGuardar(o){ try{ localStorage.setItem(KCR, JSON.stringify(o)); }catch(e){} }
  function resumenDatos(weekIdx, day){
    let vol = 0, series = 0, reps = 0, maxKg = 0;
    const pref = weekIdx + '|' + day.id + '|';
    /* el progreso guardado puede traer restos de una planificacion anterior que usaba el mismo id de dia (otra rutina, otros bloques):
       solo cuentan las series de los bloques que existen hoy en este dia */
    const validos = {}; ((day && day.blocks) || []).forEach(function(b){ validos[b.id] = 1; });
    const hayValidos = Object.keys(validos).length > 0;
    Object.keys(state.loads).forEach(function(k){
      if(k.indexOf(pref) !== 0) return;
      if(hayValidos && !validos[k.split('|')[2]]) return;
      const l = state.loads[k];
      if(!l || !l.done) return;
      series++;
      const kg = numJP(l.kg), rp = Math.round(jpRepsReales(l.reps));
      reps += rp; vol += jpTonelajeSerie(l);
      if(kg > maxKg) maxKg = kg;
    });
    /* directiva (resumen de sesión CrossFit): score del WOD del día, si
       ya lo cargó -- mismo criterio de "bloque metcon/cardio/endurance"
       que ya usa datosStoryCF() para la Story Card. */
    let scoreWod = '';
    const wodBlk = (day.blocks || []).find(b => b.category === 'metcon') ||
      (day.blocks || []).find(b => b.category === 'cardio' || b.category === 'endurance');
    if(wodBlk){
      const skeyWod = weekIdx + '|' + day.id + '|' + wodBlk.id;
      scoreWod = (state.scores && state.scores[skeyWod]) || '';
    }
    /* un solo criterio de tonelaje en toda la app: para la sesión abierta se usa el mismo cálculo del HUD (kg × reps válidas; sin metros, segundos ni acarreos) */
    return { vol: Math.round(vol), series: series, reps: reps, maxKg: maxKg, scoreWod: scoreWod };
  }
  /* directiva maestra ("Reporte táctico de sesión a WhatsApp") -- desglose
     por bloque de ejercicios completados, formato EXACTO pedido: nombre
     del ejercicio en negrita (markdown de WhatsApp, "*texto*") y una
     línea "• Set N: {kg} kg × {reps} reps" por cada serie REALMENTE
     tildada (done===true) con carga y reps cargados -- si faltan sets
     por completar, quedan afuera solos (nunca se inventa un "Set N" sin
     dato real). Sólo alcanza a bloques de Pizarra (Array.isArray(
     block.items), el formato activo de Sports & CrossFit) -- re-parsea
     con el MISMO parser ya expuesto (window.parsearPizarraSB, ver
     pizarraSports() más arriba) para no duplicar lógica de extracción de
     nombres/rondas. Un bloque clásico ('block'/'superset'/'finisher',
     formato legado) no rompe nada -- simplemente no aporta desglose,
     mismo comportamiento (ausencia, no error) que ya tenía el reporte
     viejo para cualquier bloque. */
  function generarDesgloseBloquesWA(weekIdx, day){
    var out = [];
    if(typeof window.parsearPizarraSB !== 'function') return out;
    (day.blocks || []).forEach(function(block){
      if(!Array.isArray(block.items) || !block.items.length) return;
      var lineasBloque = itemsDeSemana(block, weekIdx);
      if(!lineasBloque.length) return;
      var entries;
      try{ entries = window.parsearPizarraSB(lineasBloque); }catch(e){ return; }
      entries.forEach(function(entry, idx){
        if(entry.tipo === 'simple' && (entry.sets || entry.tecnica === 'dropset')){
          var setsTxt = [];
          for(var i = 1; i <= (entry.sets || 1); i++){
            var ld = getLoad(getLoadKey(weekIdx, day.id, block.id, 'e' + idx, i));
            if(ld && ld.done && numJP(ld.reps) > 0){
              setsTxt.push(lineaSetWA(i, ld));
            }
          }
          if(entry.tecnica === 'dropset'){
            ['d1', 'd2'].forEach(function(ds, di){
              var ldd = getLoad(getLoadKey(weekIdx, day.id, block.id, 'e' + idx, ds));
              if(ldd && ldd.done && numJP(ldd.reps) > 0) setsTxt.push('  \u2022 Drop ' + (di + 1) + ': ' + (numJP(ldd.kg) > 0 ? fmtJP(numJP(ldd.kg)) + ' kg \u00d7 ' : '') + fmtJP(numJP(ldd.reps)) + ' reps');
            });
          }
          if(setsTxt.length) out.push('*' + entry.titulo + '*:\n' + setsTxt.join('\n'));
        } else if(entry.tipo === 'biserie'){
          (entry.subs || []).forEach(function(sub, si){
            var setsTxt = [];
            var totalSets = entry.rondas || 3;
            for(var i = 1; i <= totalSets; i++){
              var ld = getLoad(getLoadKey(weekIdx, day.id, block.id, 'b' + idx + 's' + si, i));
              if(ld && ld.done && numJP(ld.reps) > 0){
                setsTxt.push(lineaSetWA(i, ld));
              }
            }
            if(setsTxt.length) out.push('*' + sub.nombre + '*:\n' + setsTxt.join('\n'));
          });
        }
      });
    });
    return out;
  }
  function pintarResumen(weekIdx, day, blocks){
    const ids = dayBlockIds(day);
    const hechos = ids.filter(id => isBlockDone(weekIdx, day.id, id)).length;
    const viejo = mainEl.querySelector('.summary-card');
    if(hechos < ids.length || !ids.length){ if(viejo) viejo.remove(); return; }
    const d = resumenDatos(weekIdx, day);
    const nkey = weekIdx + '|' + day.id + '|__sesion';
    const esCF = window.COACH_DISCIPLINA !== 'sports';
    /* directiva (aislamiento de PRs por día, Sports & Bodybuilding):
       state.session.prs es un log de nombres de ejercicio de TODO el
       mesociclo que nunca se resetea (mismo bug ya reparado antes en el
       reporte de WhatsApp, ver scShare más abajo) -- filtrarlo acá
       también, para que la pantalla de fin de sesión y el evento que se
       le manda al coach (más abajo) nunca arrastren PRs de días
       anteriores. Se cruza state.session.prDetalle (trae fecha) contra
       HOY y contra los ejercicios reales de ESTE día -- no alcanza con
       la fecha sola porque el mismo día calendario puede tener más de
       una sesión. CrossFit sigue leyendo state.session.prs tal cual,
       sin ningún cambio de comportamiento. */
    let prs = (state.session.prs || []);
    if(!esCF){
      const hoyISO = new Date().toISOString().slice(0, 10);
      const nombresHoy = {};
      (day.blocks || []).forEach(function(b){
        if(b.exerciseName) nombresHoy[nrmHist(b.exerciseName)] = 1;
        (b.exercises || []).forEach(function(e){ if(e.name) nombresHoy[nrmHist(e.name)] = 1; });
      });
      const vistos = {};
      prs = ((state.session && state.session.prDetalle) || [])
        .filter(function(p){ return p.fecha === hoyISO && nombresHoy[nrmHist(p.ex)]; })
        .map(function(p){ return p.ex; })
        .filter(function(nombre){ if(vistos[nombre]) return false; vistos[nombre] = 1; return true; });
    }
    /* racha del mesociclo: reusa window.CoachMetricas.racha() (módulo de la
       Story Card, ya calcula esto para la tarjeta de Instagram) en vez de
       recalcular la consistencia acá de nuevo */
    const r = (window.CoachMetricas && typeof window.CoachMetricas.racha === 'function') ? window.CoachMetricas.racha() : null;
    /* NUEVO (28/08, feed de actividad del coach) — hasta ahora, terminar
       una sesión NUNCA encolaba nada: CoachOutbox solo se usaba para
       readiness/feedback/PR/fatiga, no había ningún evento de "sesión
       completa" (el coach no se enteraba ni siquiera con el panel nuevo).
       Se dispara acá porque esta función ya es, en los hechos, el punto
       donde se detecta el día 100% terminado (hechos===ids.length más
       arriba) y ya tiene calculados vol/series/reps/PRs/racha — cero
       cálculo nuevo. Guard de una sola vez por día (mismo patrón que
       state.fatigaAvisada, ~línea 7620): sin esto, cada re-render de la
       vista (renderMain corre seguido) reencolaría el mismo evento. */
    state.sesionNotificada = state.sesionNotificada || {};
    var skeySesion = weekIdx + '|' + day.id;
    if(!state.sesionNotificada[skeySesion] && window.CoachOutbox && window.CoachOutbox.encolar){
      state.sesionNotificada[skeySesion] = 1;
      window.CoachOutbox.encolar({
        tipo: 'sesion_completa', dia: day.short, semana: weekIdx + 1,
        vol: d.vol, series: d.series, reps: d.reps, prs: prs
      });
      saveProgress();
    }
    /* directiva (resumen de sesión CrossFit): Tiempo Total / Bloques
       Completados / Carga Máxima / Score del WOD, en vez del set de
       Bodybuilding (kg de volumen/series/reps) que no representa una
       sesión de CrossFit -- "Kg de Volumen" queda reservado a modalidades
       de musculación, como pide la directiva. Mismo cálculo de duración
       ya usado por el reporte de WhatsApp (state.session.inicio, acotado
       a 1-240 min para no mostrar un número sin sentido). */
    const iniSesion = (state.session && state.session.inicio) || 0;
    const minSesion = iniSesion ? Math.round((Date.now() - iniSesion) / 60000) : 0;
    const tSesCF = (typeof window.jpTiempoSesion === 'function') ? window.jpTiempoSesion() : null;
    const minSesionOk = (tSesCF && tSesCF.min > 0) ? tSesCF.min : ((minSesion >= 1 && minSesion <= 90) ? minSesion : 0);
    const statsHtml = esCF
      ? ('<div class="sc-stat"><div class="v">' + (minSesionOk || '—') + '</div><div class="k">min de sesión</div></div>' +
         '<div class="sc-stat"><div class="v">' + ids.length + '</div><div class="k">bloques completados</div></div>' +
         '<div class="sc-stat"><div class="v">' + Math.round(d.maxKg) + '</div><div class="k">kg carga máxima</div></div>' +
         '<div class="sc-stat"><div class="v" data-no-odo="1">' + (d.scoreWod || '—') + '</div><div class="k">score del wod</div></div>')
      : ('<div class="sc-stat"><div class="v">' + d.vol.toLocaleString('es-AR') + '</div><div class="k">kg de volumen</div></div>' +
         '<div class="sc-stat"><div class="v">' + d.series + '</div><div class="k">series completadas</div></div>' +
         '<div class="sc-stat"><div class="v">' + d.reps + '</div><div class="k">repeticiones</div></div>' +
         '<div class="sc-stat"><div class="v">' + ids.length + '</div><div class="k">bloques</div></div>');
    const SP = window.COACH_DISCIPLINA === 'sports';
    const html =
      '<div class="summary-card">' +
        '<div class="sc-h"><span class="sc-ic">🏁</span><h3>Sesión completa — ' + day.short + '</h3></div>' +
        '<div class="sc-stats">' +
          statsHtml +
          /* valor de una sola cifra a propósito: el odómetro de animarResumen()
             (más abajo) hace parseInt(v.textContent.replace(/[^\d]/g,'')) sobre
             CADA .sc-stat .v de la tarjeta salvo data-no-odo -- un formato "3/16"
             se leería como 316 y el odómetro reescribiría el texto final a "316" */
        '</div>' +
        (prs.length ? '<div class="sc-prs">' + prs.map(p => '<span>🔥 PR en ' + p + '</span>').join('') + '</div>' : '') +
        '<div class="sc-body">' +
          /* directiva de implementación (2026-09) -- checkout de RIR/RPE
             auto-reportado por el alumno/a (ítem 1 de la consultoría): se
             muestra el mismo picker táctico de 1 a 10 que ya usa el coach
             del lado del Builder (jp-rpe-chip), acá reimplementado con las
             clases propias de esta vista (sc-rpe-chip) porque Builder y
             TEMPLATE_HTML se compilan como documentos aparte. La elección
             viaja a Coach JP como evento 'checkout_rpe' (mismo circuito de
             CoachOutbox que readiness_sueno/readiness_molestia) para que el
             coach no tenga que cargarlo de memoria en su Checkout de sesión. */
          '<label>' + (SP ? 'ESFUERZO PERCIBIDO · RPE' : '💪 Esfuerzo percibido de la sesión (RIR/RPE 1–10)') + '</label>' +
          '<div class="sc-rpe-row" id="scRpeRow">' +
            Array.from({ length: SP ? 5 : 10 }, (_, i) => {
              const n = i + (SP ? 6 : 1), on = checkoutRpeLeer()[nkey] === n;
              return '<button type="button" class="sc-rpe-chip' + (on ? ' on' : '') + '" data-scrpe="' + n + '">' + (SP ? 'RPE ' + n : n) + '</button>';
            }).join('') +
            '<span class="sc-rpe-ok" id="scRpeOk">' + (checkoutRpeLeer()[nkey] ? '✅ Enviado a tu coach' : '') + '</span>' +
          '</div>' +
          '<label>' + (SP ? 'NOTAS O COMENTARIOS PARA EL COACH' : '📝 Notas generales de la sesión') + '</label>' +
          '<textarea id="scNotes" placeholder="' + (SP ? 'Cómo te sentiste, qué costó, qué salió mejor que la semana pasada…' : '¿Cómo te sentiste? ¿Qué costó, qué salió mejor que la semana pasada?') + '">' +
            ((state.notes && state.notes[nkey]) || '') + '</textarea>' +
          '<div class="sc-actions">' +
            '<button class="sc-save" id="scSave" type="button">💾 Guardar y sincronizar</button>' +
            '<button class="sc-share" id="scShare" type="button">' + (SP ? '\ud83d\udcf2 FINALIZAR D\u00cdA Y ENVIAR REPORTE' :'\ud83d\udcf2 ENVIAR RESUMEN DE SESI\u00d3N AL COACH') + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    if(viejo) viejo.outerHTML = html;
    else mainEl.insertAdjacentHTML('beforeend', html);
    const rpeRow = document.getElementById('scRpeRow');
    if(rpeRow) rpeRow.addEventListener('click', function(e){
      const chip = e.target.closest('[data-scrpe]');
      if(!chip) return;
      const n = parseInt(chip.dataset.scrpe, 10);
      const oRpe = checkoutRpeLeer();
      oRpe[nkey] = n;
      checkoutRpeGuardar(oRpe);
      rpeRow.querySelectorAll('.sc-rpe-chip').forEach(function(b){
        b.classList.toggle('on', parseInt(b.dataset.scrpe, 10) === n);
      });
      if(window.CoachOutbox && window.CoachOutbox.encolar){
        window.CoachOutbox.encolar({
          tipo: 'checkout_rpe', dia: day.short, diaId: day.id, semana: weekIdx + 1, rpe: n
        });
      }
      const okEl = document.getElementById('scRpeOk');
      if(okEl) okEl.textContent = '✅ Enviado a tu coach';
      if(window.CoachVibra) CoachVibra.toque();
    });
    const ta = document.getElementById('scNotes');
    if(ta) ta.addEventListener('input', function(){
      state.notes = state.notes || {}; state.notes[nkey] = ta.value; saveProgress();
    });
    let notaEnviada = (state.feedback && state.feedback[weekIdx + '|' + day.id + '|__feedback']) || '';
    function enviarNotaCoach(){
      if(!SP || !ta) return;
      const v = String(ta.value || '').trim();
      if(!v || v === notaEnviada) return;
      notaEnviada = v;
      state.feedback = state.feedback || {};
      state.feedback[weekIdx + '|' + day.id + '|__feedback'] = v;
      saveProgress();
      if(window.CoachOutbox && window.CoachOutbox.encolar){
        window.CoachOutbox.encolar({ tipo: 'feedback', ex: (day.short || 'Sesión') + ' · ' + (day.label || ''), nota: v, semana: weekIdx + 1 });
      }
    }
    const sv = document.getElementById('scSave');
    if(sv) sv.addEventListener('click', function(){
      enviarNotaCoach();
      saveProgress();
      /* confirmación honesta: el progreso ya quedó a salvo en el teléfono
         (localStorage + IndexedDB, ver saveProgress arriba) sea cual sea el
         estado de la red — solo el texto cambia según haya o no conexión,
         reusando la misma señal que ya pinta el .off-pill */
      sv.textContent = navigator.onLine ? '✅ Guardado y a salvo' : '✅ Guardado en el teléfono';
      setTimeout(function(){ sv.textContent = '💾 Guardar y sincronizar'; }, 2200);
    });
    const sh = document.getElementById('scShare');
    if(sh) sh.addEventListener('click', function(){
      enviarNotaCoach();
      if(typeof window.jpEnviarReporteSesion === 'function'){ window.jpEnviarReporteSesion(); return; }
      /* directiva maestra ("Reporte táctico de sesión a WhatsApp") --
         reescribe el mensaje al formato EXACTO pedido: encabezado con
         negrita markdown de WhatsApp ("*texto*"), fecha, tonelaje real
         (mismo calcularTonelajeSesion() que ya alimenta el HUD en vivo,
         nunca un cálculo paralelo) y desglose por bloque/set (sólo los
         sets con el check marcado, ver generarDesgloseBloquesWA() más
         arriba). PRs y RPE se conservan como líneas de valor agregado --
         no las pide el formato pero tampoco lo contradicen. */
      const hoyISO = new Date().toISOString().slice(0, 10);
      const prsHoy = ((state.session && state.session.prDetalle) || []).filter(function(p){ return p.fecha === hoyISO; });
      const prLinea = prsHoy.length
        ? '🔥 *PRs de hoy:* ' + prsHoy.map(function(p){
            const deltaTxt = (p.delta != null && p.delta > 0) ? ' (+' + p.delta + 'kg)' : '';
            return p.ex + ' ' + fmtJP(numJP(p.kg)) + 'kg \u00d7 ' + p.reps + deltaTxt;
          }).join(', ')
        : '';
      const rpeHoy = checkoutRpeLeer()[nkey];
      const notaHoy = (state.notes && state.notes[nkey]) || '';
      const fechaHoy = new Date().toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' });
      const tonelajeHoy = (typeof calcularTonelajeSesion === 'function') ? calcularTonelajeSesion() : d.vol;
      const desglose = generarDesgloseBloquesWA(weekIdx, day);

      let txt = '🏋️\u200d\u2642\ufe0f *REPORTE DE SESI\u00d3N \u00b7 COACH JP*\n' +
        '\ud83d\udc64 *Atleta:* ' + PROGRAM_CONFIG.athleteName + '\n' +
        '\ud83d\udcc5 *D\u00eda:* ' + day.short + ' | *Fase:* ' + WEEKS_META[weekIdx].short + ' | ' + fechaHoy + '\n' +
        '\u26a1 *Tonelaje Total Acumulado:* ' + tonelajeHoy.toLocaleString('es-AR') + ' KG\n' +
        '-----------------------------\n' +
        (desglose.length ? desglose.join('\n\n') : '_A\u00fan no hay series completadas con carga registrada._') +
        '\n-----------------------------';
      if(prLinea) txt += '\n' + prLinea;
      if(rpeHoy) txt += '\n\ud83d\udcaa *Esfuerzo percibido (RPE):* ' + rpeHoy + '/10';
      if(notaHoy) txt += '\n\ud83d\udcdd *Comentarios del Alumno/a:* ' + notaHoy;

      /* directiva: wa.me/<numero>?text= abre directo la conversación con
         el coach cuando PROGRAM_CONFIG.coachPhone está cargado (Builder,
         ficha de identidad) -- sin número configurado, degrada solo al
         comportamiento de siempre (wa.me/?text=, el alumno elige a
         quién mandárselo), cero regresión para planes ya exportados. */
      const coachPhone = window.COACH_WHATSAPP_PHONE || (typeof PROGRAM_CONFIG !== 'undefined' && PROGRAM_CONFIG.coachPhone) || '';
      const url = 'https://wa.me/' + coachPhone + '?text=' + encodeURIComponent(txt);
      window.open(url, '_blank', 'noopener');
    });
  }

  /* =========================================================
     6) ENGANCHE AL RENDER
  ========================================================= */
  const _renderMain = renderMain;
  renderMain = function(){
    const r = _renderMain.apply(this, arguments);
    try{ decorar(); }catch(e){ console.warn('training view', e); }
    return r;
  };
  /* ENVIAR REPORTE AL COACH POR WHATSAPP: mismo formato del resumen de sesión (tonelaje real, desglose por bloque con las series
     tildadas, PRs de hoy, RPE y comentarios); abre wa.me/<número del coach> si el Builder lo cargó, o el selector de contacto */
  function enviarReporteCoachWA(){
    if(typeof window.jpEnviarReporteSesion === 'function'){ window.jpEnviarReporteSesion(); return; }
    var day = diaActual(), weekIdx = state.currentWeek;
    if(!day) return;
    var nkey = weekIdx + '|' + day.id + '|__sesion';
    var hoyISO = new Date().toISOString().slice(0, 10);
    var prsHoy = ((state.session && state.session.prDetalle) || []).filter(function(p){ return p.fecha === hoyISO; });
    var rpeHoy = (typeof checkoutRpeLeer === 'function') ? checkoutRpeLeer()[nkey] : null;
    var notaHoy = (state.notes && state.notes[nkey]) || '';
    var fecha = new Date().toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' });
    var tonelaje = (typeof calcularTonelajeSesion === 'function') ? calcularTonelajeSesion() : 0;
    var desglose = generarDesgloseBloquesWA(weekIdx, day);
    var txt = '🏋️ *REPORTE DE SESIÓN · COACH JP*\n' +
      '👤 *Atleta:* ' + PROGRAM_CONFIG.athleteName + '\n' +
      '📅 *Día:* ' + day.short + ' | *Fase:* ' + WEEKS_META[weekIdx].short + ' | ' + fecha + '\n' +
      '⚡ *Tonelaje Total Acumulado:* ' + Number(tonelaje || 0).toLocaleString('es-AR') + ' KG\n' +
      '-----------------------------\n' +
      (desglose.length ? desglose.join('\n\n') : '_Aún no hay series completadas con carga registrada._') +
      '\n-----------------------------';
    if(prsHoy.length) txt += '\n🔥 *PRs de hoy:* ' + prsHoy.map(function(p){ return p.ex + ' ' + fmtJP(numJP(p.kg)) + 'kg × ' + p.reps; }).join(', ');
    if(rpeHoy) txt += '\n💪 *Esfuerzo percibido (RPE):* ' + rpeHoy + '/10';
    if(notaHoy) txt += '\n📝 *Comentarios del Alumno/a:* ' + notaHoy;
    var tel = window.COACH_WHATSAPP_PHONE || (typeof PROGRAM_CONFIG !== 'undefined' && PROGRAM_CONFIG.coachPhone) || '';
    try{ if(navigator.vibrate) navigator.vibrate(20); }catch(e){}
    window.open('https://wa.me/' + tel + '?text=' + encodeURIComponent(txt), '_blank', 'noopener');
  }
  window.CoachReporteWA = enviarReporteCoachWA;
  document.addEventListener('click', function(e){
    if(e.target.closest && e.target.closest('#jpWaReportBtn')) enviarReporteCoachWA();
  });
  function diaActual(){ return DAYS.find(function(d){ return d.id === state.currentDay; }) || DAYS[0]; }

  function decorar(){
    const day = diaActual(); if(!day) return;
    const weekIdx = state.currentWeek;

    /* 05/09 — se retira el botón "🚀 Iniciar Entrenamiento" y su barra: bloqueaba
       la navegación y empujaba los ejercicios fuera del viewport inicial. La
       sesión debe quedar lista de inmediato, sin paso intermedio. El Focus/TV
       Mode (window.CoachTV.focus/salir) queda intacto como API por si algún
       otro punto de entrada lo activa, pero ya no tiene disparador visible en
       esta vista. */

    /* pizarra en los bloques de MetCon */
    const mapa = {};
    (day.blocks || []).forEach(function(b){ mapa[b.id] = b; });
    if(day.finisher) mapa[day.finisher.id] = day.finisher;
    if(day.hyrox) mapa[day.hyrox.id] = day.hyrox;
    mainEl.querySelectorAll('.block').forEach(function(el){
      const b = mapa[el.dataset.blockId]; if(!b) return;
      /* gate de disciplina: en Sports la pizarra WOD nunca debe montarse,
         ni siquiera sobre un bloque Hyrox con category:'metcon' -- así el
         bloque cae siempre en su renderer estructural (isHyrox).
         En CrossFit, la pizarra monta en CUALQUIER fase (Warm-up, Skill/
         Strength, WOD/Metcon, Hyrox Stations, Accessory/Cooldown), no sólo
         en la detectada como "metcon" -- de lo contrario Warm-up/Strength
         caían en el renderer genérico de Bodybuilding, que el CSS de modo
         CrossFit deja prácticamente vacío (el "bloque colapsado" reportado). */
      if(window.COACH_DISCIPLINA !== 'sports' && Array.isArray(b.items)) pizarra(el, b, weekIdx, day.id);
      /* REFACTOR DEFINITIVO: equivalente Sports de la línea de arriba --
         nunca se ejecuta para CrossFit (gate exclusivo COACH_DISCIPLINA
         === 'sports'), así que pizarra()/CF no se ven afectados. */
      else if(window.COACH_DISCIPLINA === 'sports' && Array.isArray(b.items) && b.sportsPizarra) pizarraSports(el, b, weekIdx, day.id);
      /* PR sobre lo que ya estaba cargado */
      el.querySelectorAll('.set-row').forEach(function(row){ chequearPR(row); });
    });

    pintarTV();
    pintarResumen(weekIdx, day, day.blocks || []);
  }

  /* eventos globales: descanso al tildar una serie + PR al escribir kg */
  document.addEventListener('change', function(e){
    const chk = e.target.closest('.set-check');
    if(chk){
      const row = chk.closest('.set-row');
      /* directiva ("Motor de Retroalimentación Háptica & Sonido Táctico")
         -- tono dual + vibración corta nuevos al TILDAR; al destildar
         sigue el beep grave clásico de siempre. */
      if(chk.checked){ try{ jpAudioTactical.soundCheckSet(); }catch(err){} }
      else { beepSetCheck(false); }
      if(chk.checked){
        /* pulido háptico: tap corto (patrón nuevo de la directiva) en cada
           serie, pulso de éxito más largo y distinto cuando ESA marca deja
           el bloque entero completo (se conserva -- señal deliberada,
           distinta de un set suelto) -- el cierre de ronda (bs-cerrar,
           módulo aparte) dispara su propio pulso de éxito y usa
           window.__jpRondaCerrando para no duplicar el buzz corto en cada
           estación que marca de paso. */
        if(!window.__jpRondaCerrando){
          const bloqueEl = chk.closest('.block');
          const todos = bloqueEl ? [].slice.call(bloqueEl.querySelectorAll('.set-check')) : [];
          const completo = todos.length > 0 && todos.every(function(c){ return c.checked; });
          if(completo) vibrar([30, 50, 60]);
          else{ try{ jpAudioTactical.vibrateCheckSet(); }catch(err){} }
        }
        /* el reloj de descanso automático se retiró: el único temporizador es
           el ⏱️ Custom WOD Timer de la barra superior, que abrís cuando lo necesitás */
      }
      if(row) chequearPR(row);
      if(row && chk.checked){ registrarHistorial(row); saveProgress(); }
      const day = diaActual();
      if(day) pintarResumen(state.currentWeek, day, day.blocks || []);
    }
  });
  document.addEventListener('input', function(e){
    const kg = e.target.closest('.set-kg');
    if(kg){ const row = kg.closest('.set-row'); if(row){ chequearPR(row); saveProgress(); } }
  });
  /* chip "Último: X kg" (Memoria de Cargas Históricas): click autocompleta
     el casillero de Kg de la Serie 1 con el último valor registrado para
     ese ejercicio, en cualquier semana/bloque -- el alumno sigue pudiendo
     editarlo antes de guardar, nunca se fuerza el número. */
  document.addEventListener('click', function(e){
    const chip = e.target.closest('.set-hist-chip');
    if(!chip) return;
    const row = chip.closest('.set-row'); if(!row) return;
    const kgIn = row.querySelector('.set-kg'); if(!kgIn) return;
    kgIn.value = chip.dataset.histKg;
    kgIn.dispatchEvent(new Event('input', { bubbles: true }));
    chip.remove();
  });
  /* al marcar un bloque como hecho se recalcula el resumen de la sesión
     (el label del bloque corta la propagación, así que se engancha el estado) */
  const _setBlockDone = setBlockDone;
  setBlockDone = function(weekIdx, dayId, blockId, val){
    const r = _setBlockDone.apply(this, arguments);
    try{
      const day = DAYS.find(function(d){ return d.id === dayId; });
      if(day) setTimeout(function(){ pintarResumen(weekIdx, day, day.blocks || []); }, 40);
    }catch(e){ console.warn('resumen', e); }
    return r;
  };
  const _setDayDone = setDayDone;
  setDayDone = function(weekIdx, dayId){
    const r = _setDayDone.apply(this, arguments);
    try{
      const day = DAYS.find(function(d){ return d.id === dayId; });
      if(day) setTimeout(function(){ pintarResumen(weekIdx, day, day.blocks || []); }, 40);
    }catch(e){ console.warn('resumen', e); }
    return r;
  };
  /* sombra de la navegación pegajosa */
  window.addEventListener('scroll', function(){
    document.body.classList.toggle('nav-stuck', window.scrollY > 40);
  }, { passive:true });
  /* atajos: espacio pausa el descanso, flechas mueven de bloque */
  document.addEventListener('keydown', function(e){
    if(!tvOn) return;
    if(e.target && /input|textarea/i.test(e.target.tagName)) return;
    if(e.key === 'ArrowRight'){ tvMover(1); e.preventDefault(); }
    if(e.key === 'ArrowLeft'){ tvMover(-1); e.preventDefault(); }
  });

  window.CoachTV = { focus: () => { tvOn = true; pintarTV(); }, salir: () => { tvOn = false; pintarTV(); },
                     rest: arrancarRest, sumar: sumarRest, pr: chequearPR, resumen: resumenDatos,
                     pintar: () => decorar(),
                     /* directiva ("Rest Timer Premium in-situ") -- hooks para que el
                        widget espejado dentro del bloque de CrossFit controle y lea
                        el MISMO motor compartido sin duplicar su lógica de conteo. */
                     toggle: toggleRest, parar: cerrarRest, estado: estadoRest,
                     mirror: (cb) => { onRestTick = cb; } };
  /* la vista ya se dibujó en init(): se decora una vez al cargar el módulo */
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ try{ decorar(); }catch(e){} });
  else { try{ decorar(); }catch(e){ console.warn('training view', e); } }
})();
