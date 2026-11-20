(function(){
  /* ---------------------------------------------------------
     1 · CUSTOM WOD TIMER (motor reutilizable)
  --------------------------------------------------------- */
  var modo = 'tabata', corriendo = false, tick = null;
  var restante = 0, ronda = 1, rondas = 8, fase = 'work', transcurrido = 0, vueltas = [];
  var pendiente = null, wl = null;
  var ultimoBeep = -1;
  /* directiva maestra ("Sonido de Box"): hito de mitad del trabajo -- se
     avisa UNA vez cuando el tiempo transcurrido llega al 50% del objetivo
     total del entrenamiento (ver duracionTotal()). */
  var mitadAvisada = false;
  /* directiva10 -- arquitectura de tiempo absoluto: este es el ÚNICO
     cronómetro que queda realmente activo en la app del alumno hoy (el
     descanso automático al tildar una serie se retiró, ver comentario en
     el módulo de Training View), así que aunque la directiva nombraba
     buildRoundTimer/#timerHud (código sin uso real, nunca se invoca en
     esta versión) y #restHud, el motor que de verdad hace falta blindar
     contra el bloqueo de pantalla es este. Mismo patrón que los otros dos:
     faseTargetEnd es el instante absoluto (epoch ms) en el que debería
     terminar la fase de cuenta regresiva actual (prep/work/rest/interval/
     amrap); transcurridoBase + transcurridoStart reconstruyen el
     cronómetro de cuenta-arriba (fortime) del mismo modo. "restante--" /
     "transcurrido++" a ciegas en cada setInterval(paso,1000) es justo el
     bug reportado: si el navegador suspende el intervalo al bloquear la
     pantalla, al volver seguía sumando/restando de a 1 por segundo real
     desde el valor viejo, sin reflejar el tiempo real que pasó bloqueado. */
  var faseTargetEnd = 0, transcurridoBase = 0, transcurridoStart = 0;

  /* El botón "AUDIO: ON/OFF" del HUD se quitó: el HUD solo tiene el chip VOZ (088-voz-del-timer.js) y el silencio general vive en Ajustes ("Sonido & Haptic", clave jp_audio_muted). */
  /* un solo AudioContext para toda la app (ensureAudioCtx): el timer de WOD ya no abre uno propio */
  function desbloquearAudio(){
    try{ unlockAudio(); }catch(e){}
  }
  function vibrar(p){ try{ if(navigator.vibrate) navigator.vibrate(p); }catch(e){} }
  function vibAl(p){ try{ if(window.jpPerfilSonido && jpPerfilSonido.silencio()) return; }catch(e){} vibrar(p); }
  function mmss(s){
    s = Math.max(0, Math.round(s));
    var m = Math.floor(s / 60), r = s % 60;
    return ('0' + m).slice(-2) + ':' + ('0' + r).slice(-2);
  }
  function parseInt2(txt){
    var t = String(txt || '').trim();
    if(t.indexOf(':') >= 0){
      var p = t.split(':');
      return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
    }
    return parseInt(t, 10) || 0;
  }
  function cfg(){
    var g = function(id){ var e = document.getElementById(id); return e ? e.value : ''; };
    return {
      work: Math.max(1, parseInt2(g('cwtWork')) || 20),
      rest: Math.max(0, parseInt2(g('cwtRest')) || 0),
      rounds: Math.max(1, parseInt(g('cwtRounds'), 10) || 1),
      intervalo: Math.max(5, parseInt2(g('cwtInt')) || 60),
      total: Math.max(1, parseInt(g('cwtTotal'), 10) || 1),
      cap: Math.max(0, parseInt(g('cwtCap'), 10) || 0),
      prep: Math.max(0, parseInt(g('cwtPrep'), 10) || 0)
    };
  }
  var CAMPOS = {
    tabata:  ['work','rest','rounds'],
    emom:    ['interval','total'],
    amrap:   ['total'],
    fortime: ['cap'],
    intervalos: ['work','rest','rounds']
  };
  /* directiva ("Refactor integral del Timer Táctico") -- título de la
     pantalla de configuración por modalidad; MODO_LABEL es puramente
     de presentación (no toca cfg()/estadoInicial()). */
  var MODO_LABEL = { amrap:'AMRAP', fortime:'FOR TIME', emom:'EMOM', tabata:'TABATA', intervalos:'INTERVALOS / HYROX' };
  /* EMOM: "EVERY [interval] FOR [rondas] RONDAS" es el campo real que ve
     el atleta -- el motor (estadoInicial()) sigue derivando rondas desde
     c.total (minutos totales) y c.intervalo, SIN TOCAR esa fórmula: acá
     sólo se mantiene cwtTotal sincronizado (rondas × intervalo) cada vez
     que cambia cwtEmomRondas o cwtInt, así el cálculo de siempre recibe
     el minutaje correcto sin que el atleta tenga que pensar en minutos. */
  function sincronizarEmomTotal(){
    var rEl = document.getElementById('cwtEmomRondas'), tEl = document.getElementById('cwtTotal');
    var iEl = document.getElementById('cwtInt');
    if(!rEl || !tEl || !iEl) return;
    var rondas = Math.max(1, parseInt(rEl.value, 10) || 1);
    var intervaloSeg = parseInt2(iEl.value) || 60;
    tEl.value = Math.max(1, Math.round(rondas * intervaloSeg / 60));
  }
  function pintarCampos(){
    document.querySelectorAll('#cwtCfg [data-modocfg]').forEach(function(el){
      var modos = (el.dataset.modocfg || '').split(' ');
      el.classList.toggle('hide', modos.indexOf(modo) < 0);
    });
    var fin = document.getElementById('cwtFin');
    if(fin) fin.style.display = modo === 'fortime' ? '' : 'none';
    var titEl = document.getElementById('cwtCfgTitle');
    if(titEl) titEl.textContent = MODO_LABEL[modo] || String(modo).toUpperCase();
    var wrapModo = document.getElementById('cwtWrap');
    if(wrapModo) wrapModo.dataset.modo = modo;
    if(modo === 'emom') sincronizarEmomTotal();
    reset();
  }
  function estadoInicial(){
    var c = cfg();
    vueltas = []; ronda = 1; transcurrido = 0; ultimoBeep = -1; mitadAvisada = false;
    if(modo === 'tabata' || modo === 'intervalos'){ fase = 'work'; restante = c.work; rondas = c.rounds; }
    else if(modo === 'emom'){ fase = 'work'; restante = c.intervalo; rondas = Math.max(1, Math.round(c.total * 60 / c.intervalo)); }
    else if(modo === 'amrap'){ fase = 'amrap'; restante = c.total * 60; rondas = 1; }
    else { fase = 'up'; restante = 0; rondas = 1; }
    /* conteo de preparación antes del tiempo activo */
    if(c.prep > 0){ pendiente = { fase: fase, restante: restante }; fase = 'prep'; restante = c.prep; }
    else pendiente = null;
    /* directiva10 -- deja el estado de reloj coherente incluso antes de
       arrancar() (que es quien realmente fija estos targets al ponerse en
       marcha); evita lecturas rancias si algo consulta el estado recién
       reseteado mientras el timer sigue en pausa. */
    transcurridoBase = 0; transcurridoStart = Date.now();
    faseTargetEnd = Date.now() + restante * 1000;
  }
  function pintar(){
    var t = document.getElementById('cwtTime'), f = document.getElementById('cwtPhase');
    var r = document.getElementById('cwtRound'), b = document.getElementById('cwtBar');
    var l = document.getElementById('cwtLaps');
    if(!t) return;
    t.textContent = (modo === 'fortime' && fase !== 'prep') ? mmss(transcurrido) : mmss(restante);
    var etiqueta = fase === 'prep' ? '⏳ PREPARACIÓN'
                 : (modo === 'tabata' || modo === 'intervalos') ? (fase === 'work' ? 'TRABAJO' : 'DESCANSO')
                 : modo === 'emom'   ? 'EMOM · MINUTO ' + ronda
                 : modo === 'amrap'  ? 'AMRAP'
                 : 'FOR TIME';
    f.textContent = corriendo ? etiqueta : (transcurrido || restante ? etiqueta + ' · en pausa' : 'Listo para arrancar');
    f.className = 'cwt-phase' + (corriendo ? (fase === 'rest' ? ' rest' : ' work') : '');
    if(modo === 'tabata' || modo === 'intervalos' || modo === 'emom') r.innerHTML = 'Ronda <b>' + ronda + '</b> de <b>' + rondas + '</b>';
    else if(modo === 'amrap') r.innerHTML = 'Tiempo total <b>' + mmss(cfg().total * 60) + '</b>';
    else r.innerHTML = cfg().cap ? 'Time cap <b>' + cfg().cap + ' min</b>' : 'Cronómetro <b>libre</b>';
    var c = cfg(), pct = 0;
    if(fase === 'prep') pct = c.prep ? 1 - restante / c.prep : 0;
    else if(modo === 'tabata' || modo === 'intervalos') pct = 1 - restante / (fase === 'work' ? c.work : Math.max(1, c.rest));
    else if(modo === 'emom') pct = 1 - restante / c.intervalo;
    else if(modo === 'amrap') pct = 1 - restante / (c.total * 60);
    else if(c.cap) pct = transcurrido / (c.cap * 60);
    b.style.width = Math.max(0, Math.min(1, pct)) * 100 + '%';
    var cuentaAtras = corriendo && (fase === 'prep' || modo !== 'fortime') && restante > 0;
    t.classList.toggle('alerta', cuentaAtras && restante <= 3);
    /* v3.2 · los últimos 10 segundos se avisan por color de estado, no por el número */
    var wrap = t.closest('.cwt-body') || t.parentNode;
    if(wrap) wrap.classList.toggle('cwt-warn', cuentaAtras && restante <= 10);
    if(f) f.classList.toggle('warn', cuentaAtras && restante <= 10);
    if(b && b.parentNode){
      var barra = b.parentNode;
      barra.classList.toggle('warn', cuentaAtras && restante <= 10);
      barra.classList.toggle('work', corriendo && fase !== 'rest');
      barra.classList.toggle('rest', corriendo && fase === 'rest');
    }
    /* directiva ("Refactor total del Cronómetro de Box") -- Thunder Gold
       (trabajo) & Cyan Táctico (descanso), fijado por estilo INLINE con
       prioridad "important": el archivo acumula varias generaciones de
       CSS para .cwt-phase/.cwt-bar (varios :root sucesivos redefiniendo
       las mismas variables --jp-work/--jp-brand-hi), y ninguna combinación
       de selector/orden en una hoja de estilos nueva logra ganarles de
       forma confiable. Los últimos 10 segundos (.warn) conservan su
       color de alerta ya existente -- sólo se limpia el inline para
       que la regla de warn de la hoja de estilos vuelva a mandar. */
    var enWarn = cuentaAtras && restante <= 10;
    if(f){
      if(corriendo && !enWarn) f.style.setProperty('color', fase === 'rest' ? '#00e5ff' : '#FF5500', 'important');
      else f.style.removeProperty('color');
    }
    if(b){
      if(corriendo && !enWarn) b.style.setProperty('background', fase === 'rest' ? '#00e5ff' : '#FF5500', 'important');
      else b.style.removeProperty('background');
    }
    if(l) l.innerHTML = vueltas.map(function(v, i){
      return '<div><span>Ronda ' + (i + 1) + '</span><b>' + mmss(v) + '</b></div>';
    }).join('');
    /* directiva ("Modo Mini-HUD Flotante Persistente") -- espejo aditivo,
       ver pintarMini() más abajo; no-op si la barra no está visible. */
    try{
      var bPl = document.getElementById('cwtPlus'), bSk = document.getElementById('cwtSkip');
      if(bPl) bPl.style.display = (modo === 'fortime') ? 'none' : '';
      if(bSk) bSk.style.display = (modo === 'tabata' || modo === 'intervalos' || modo === 'emom') ? '' : 'none';
    }catch(e){}
    pintarMini();
    /* gancho de la pantalla completa: espeja y arranca/detiene su lazo de
       220 ms según el cronómetro corra o no (ver módulo "Pantalla
       completa LED"). No-op si la pantalla completa está cerrada. */
    if(window.__cwtOnPintar) window.__cwtOnPintar();
  }
  /* +10 s a la fase en curso (corriendo o en pausa) sin tocar el resto del entrenamiento */
  function masDiezFase(){
    if(modo === 'fortime') return;
    restante = Math.max(0, restante + 10);
    if(corriendo) faseTargetEnd = Date.now() + restante * 1000;
    try{ vibrar([20]); }catch(e){}
    pintar();
  }
  /* salta la fase actual (trabajo/descanso/minuto) y pasa a la siguiente al instante; en AMRAP/FOR TIME no aplica */
  function saltarFase(){
    if(!corriendo || modo === 'fortime' || modo === 'amrap') return;
    faseTargetEnd = Date.now();
    try{ vibrar([30]); }catch(e){}
    paso();
  }
  /* duración (s) de la fase de cuenta regresiva actual: el aviso de 10 s
     restantes sólo tiene sentido en fases de más de 20 s (en un tabata de
     20/10 sonaría sin parar). */
  function duracionFase(c){
    if(fase === 'prep') return c.prep;
    if(modo === 'tabata' || modo === 'intervalos') return fase === 'work' ? c.work : c.rest;
    if(modo === 'emom') return c.intervalo;
    if(modo === 'amrap') return c.total * 60;
    return 0;
  }
  /* objetivo total del entrenamiento en segundos (0 = sin objetivo, p. ej.
     FOR TIME sin time cap): base del hito de "mitad del trabajo" y del fin
     que se agenda para la notificación en segundo plano. */
  function duracionTotal(c){
    if(modo === 'tabata' || modo === 'intervalos') return c.rounds * (c.work + c.rest);
    if(modo === 'emom') return Math.max(1, Math.round(c.total * 60 / c.intervalo)) * c.intervalo;
    if(modo === 'amrap') return c.total * 60;
    return c.cap ? c.cap * 60 : 0;
  }
  /* instante absoluto (epoch ms) del fin del entrenamiento completo */
  function finTotalMs(){
    var c = cfg(), tot = duracionTotal(c);
    if(!tot) return 0;
    if(fase === 'prep') return faseTargetEnd + tot * 1000;
    return transcurridoStart + (tot - transcurridoBase) * 1000;
  }
  /* ¿viene otro intervalo/ronda después de esta fase? (los rayos sólo se
     disparan en la cuenta 3-2-1 -> GO y al arrancar un nuevo intervalo) */
  function hayProximo(){
    var c = cfg();
    if(fase === 'prep') return true;
    if(modo === 'amrap' || modo === 'fortime') return false;
    if(modo === 'emom') return ronda < rondas;
    if(fase === 'work' && c.rest > 0) return true;
    return ronda < rondas;
  }
  function avisar(seg){
    if(seg === ultimoBeep) return;
    ultimoBeep = seg;
    if(seg === 10){
      if(duracionFase(cfg()) > 20 && fase !== 'prep') jpBox.aviso10();
    } else if(seg === 3 || seg === 2 || seg === 1){
      jpBox.cuenta(seg);
      jpRayo('gold'); jpEscudoPulso(); window.CoachVibra && CoachVibra.cuenta(); window.pulsoVisual && pulsoVisual();
    } else if(seg === 0){
      /* GO tras la cuenta 3-2-1: tono agudo y enérgico (1760 Hz); el resto de las transiciones conserva la bocina */
      try{
        var pista = !hayProximo() ? 'done' : ((fase === 'work' && cfg().rest > 0) ? 'rest' : 'work');
        /* voz: la preparación termina con "¡Ya!"; al abrirse una ronda nueva dice "Siguiente ronda" y, en la última, "Última ronda" */
        if(fase === 'prep') pista = 'go';
        else if(pista === 'work') pista = (ronda + 1 >= rondas) ? 'last_round' : 'next_round';
        jpPerfilSonido.hint(pista);
      }catch(e){}
      if(fase === 'prep') jpBox.go(); else jpBox.chicharra();
      if(hayProximo()) jpRayo('cyan'); window.CoachVibra && CoachVibra.fin(); window.pulsoVisual && pulsoVisual(true);
    }
  }
  function paso(){
    /* directiva10 -- en vez de resolver una sola transición de fase por
       llamada (lo que dejaría "debiendo" el resto del salto si el celular
       estuvo bloqueado más tiempo que la fase actual, y de paso estiraría
       la duración real del WOD un poquito cada vez que se bloquea), este
       bucle arrastra el sobrante de tiempo ("overshoot": cuánto ya se pasó
       del final de la fase) hacia la fase siguiente, encadenando tantas
       transiciones como hagan falta hasta llegar a la fase donde
       realmente está parado el reloj ahora mismo -- así el próximo
       "restante" que se pinta es siempre exacto, no una fase recién
       reiniciada de cero. guard corta cualquier bucle inesperado. */
    var guard = 0;
    while(true){
      if(++guard > 1000) return;
      var c = cfg();
      var now = Date.now();
      if(fase === 'prep'){
        var faltaPrep = faseTargetEnd - now;
        if(faltaPrep > 0){ restante = Math.round(faltaPrep / 1000); avisar(restante); pintar(); return; }
        var overPrep = -faltaPrep;
        fase = pendiente ? pendiente.fase : 'work';
        restante = pendiente ? pendiente.restante : 0;
        pendiente = null; ultimoBeep = -1;
        faseTargetEnd = now + restante * 1000 - overPrep;
        /* la fase real recién arranca ahora -- el cuenta-arriba tampoco debe
           contar el tiempo que duró la preparación. */
        transcurridoBase = 0; transcurridoStart = now; transcurrido = 0;
        jpBox.chicharra(); jpRayo('gold'); window.CoachVibra && CoachVibra.fin(); window.pulsoVisual && pulsoVisual(true);
        continue;
      }
      transcurrido = transcurridoBase + Math.round((now - transcurridoStart) / 1000);
      /* hito de mitad: doble beep al cumplirse el 50% del tiempo objetivo */
      if(!mitadAvisada){
        var totObj = duracionTotal(c);
        if(totObj >= 30 && transcurrido >= totObj / 2){
          mitadAvisada = true;
          if(transcurrido < totObj / 2 + 10){ jpBox.mitad(); vibAl([60, 40, 60]); }
        }
      }
      if(modo === 'fortime'){
        if(c.cap && transcurrido >= c.cap * 60){ var overCap = (transcurrido - c.cap * 60) * 1000; transcurrido = c.cap * 60; finalizar('Time cap', overCap > 8000); return; }
        pintar(); return;
      }
      var falta = faseTargetEnd - now;
      if(falta > 0){ restante = Math.round(falta / 1000); avisar(restante); pintar(); return; }
      var over = -falta;
      if(modo === 'amrap'){ finalizar('AMRAP completo', over > 8000); return; }
      if(modo === 'tabata' || modo === 'intervalos'){
        if(fase === 'work' && c.rest > 0){
          fase = 'rest'; restante = c.rest; faseTargetEnd = now + c.rest * 1000 - over; ultimoBeep = -1;
          if(over < 8000){ jpBox.chicharra(); jpRayo('gold'); }
          continue;
        }
        vueltas.push(c.work + (fase === 'rest' ? c.rest : 0));
        if(ronda >= rondas){ finalizar((modo === 'intervalos' ? 'Intervalos' : 'Tabata') + ' completo', over > 8000); return; }
        ronda++; fase = 'work'; restante = c.work; faseTargetEnd = now + c.work * 1000 - over; ultimoBeep = -1;
        if(over < 8000){ jpBox.chicharra(); jpRayo('gold'); }
        continue;
      }
      /* EMOM */
      vueltas.push(c.intervalo);
      if(ronda >= rondas){ finalizar('EMOM completo', over > 8000); return; }
      ronda++; restante = c.intervalo; faseTargetEnd = now + c.intervalo * 1000 - over; ultimoBeep = -1;
      if(over < 8000){ jpBox.chicharra(); jpRayo('gold'); vibAl([100, 50, 100]); }
      continue;
    }
  }
  /* instante de referencia del reloj: el fin de la fase (cuenta regresiva) o el inicio (cuenta arriba) */
  function refTick(){ return fase === 'up' ? transcurridoStart : faseTargetEnd; }
  function arrancar(){
    desbloquearAudio();      /* dentro del tap: en iOS/Chrome movil el contexto solo arranca asi */
    if(corriendo){ pausar(); return; }
    if(!restante && !transcurrido) estadoInicial();
    corriendo = true;
    /* directiva10 -- al arrancar o reanudar tras una pausa manual, se fija
       (o se refija) el instante absoluto en el que debe terminar la fase
       de cuenta regresiva actual, y el punto de partida real del
       cronómetro de cuenta-arriba -- exactamente el "targetEndTime =
       Date.now() + segundosRestantes*1000" pedido. */
    var now = Date.now();
    faseTargetEnd = now + restante * 1000;
    transcurridoBase = transcurrido;
    transcurridoStart = now;
    document.getElementById('cwtGo').textContent = '⏸︎ Pausar';
    /* primer toque real del alumno: acá se desbloquea el AudioContext
       (iOS/Chrome móvil) y se pide, una sola vez, el permiso de notificaciones */
    if(fase === 'prep'){ try{ jpPerfilSonido.hint('tono'); }catch(eH){} }    /* voz: durante la preparación el "¡Ya!" lo dice el final de la cuenta, no este toque */
    jpBox.inicio(); vibrar([30]);
    try{ jpBgTimer.pedirPermiso(); }catch(e){}
    if(tick) tick.stop();
    tick = jpTicker(paso, refTick); tick.start();
    despierto(true);
    pintar();
    /* timestampFin absoluto del entrenamiento completo -> aviso en segundo plano */
    var finMs = finTotalMs();
    try{ if(finMs > now) jpBgTimer.programar(finMs); else jpBgTimer.cancelar(); }catch(e){}
  }
  function despierto(on){
    /* mismo candado unificado que el descanso: se vuelve a pedir solo al regresar a la app */
    try{ if(on) window.jpWake.on('wod'); else window.jpWake.off('wod'); }catch(e){}
  }
  function pausar(){
    /* directiva10 -- recalcula contra el reloj real antes de congelar
       restante/transcurrido (si no, quedarían con el valor del último
       tick entero, hasta ~1s desactualizado respecto del clic real). */
    var now = Date.now();
    if(fase !== 'up') restante = Math.max(0, Math.round((faseTargetEnd - now) / 1000));
    if(fase !== 'prep') transcurrido = transcurridoBase + Math.round((now - transcurridoStart) / 1000);
    corriendo = false;
    if(tick){ tick.stop(); } tick = null;
    despierto(false);
    try{ jpBgTimer.cancelar(); }catch(e){}
    document.getElementById('cwtGo').textContent = '▶ Continuar';
    pintar();
  }
  /* directiva10 -- resync forzado por Page Visibility API (ver
     montarTimer() más abajo): recalcula restante/transcurrido YA contra
     faseTargetEnd, sin esperar el próximo tick natural del setInterval
     (que en algunos navegadores queda en pausa completa mientras la app
     está en segundo plano). Si la fase ya se cumplió mientras el celular
     estaba bloqueado, dispara de una la rutina de cambio de fase/fin
     (beep + vibración + avance), en vez de quedar "colgado" mostrando un
     tiempo viejo. */
  function sincronizarWodActivo(){ if(corriendo) paso(); }
  function reset(){
    corriendo = false; if(tick){ tick.stop(); } tick = null;
    despierto(false);
    try{ jpBgTimer.cancelar(); }catch(e){}
    estadoInicial();
    var g = document.getElementById('cwtGo');
    if(g) g.textContent = '▶︎ Empezar';
    pintar();
  }
  function finalizar(motivo, silencioso){
    try{ document.dispatchEvent(new CustomEvent('jp-wod-fin', { detail: { modo: modo, seg: transcurrido, motivo: String(motivo || '') } })); }catch(eFin){}
    corriendo = false; if(tick){ tick.stop(); } tick = null;
    despierto(false);
    /* chicharra larga de fin de round. Si el fin ocurrió hace rato (el
       celular estuvo bloqueado), ya avisó la notificación: no se hace sonar
       el buzzer "viejo" al volver a la app. */
    if(!silencioso){ try{ jpPerfilSonido.hint('done'); }catch(eH){} jpBox.chicharra(1.2); vibAl([100, 50, 100, 50, 220]); }
    try{ jpBgTimer.finalizado(); }catch(e){}
    var f = document.getElementById('cwtPhase');
    if(f){ f.textContent = '🏁 ' + (motivo || 'Terminado') + ' · ' + mmss(transcurrido); f.className = 'cwt-phase work'; }
    var g = document.getElementById('cwtGo');
    if(g) g.textContent = '▶︎ Empezar';
    var t = document.getElementById('cwtTime');
    if(t && modo !== 'fortime') t.textContent = '00:00';
    restante = 0;
  }
  /* directiva ("Refactor integral del Timer Táctico") -- pantalla es
     ESTADO PURAMENTE VISUAL (modo-select / config / run), nunca leído
     por cfg()/estadoInicial()/paso()/arrancar(): sólo decide qué bloque
     de #cwtWrap se muestra. */
  var pantalla = 'modo';
  function mostrarPantalla(p){
    pantalla = p;
    /* el botón MINIMIZAR sólo existe con el temporizador en carrera (ver CSS data-pantalla) */
    var wPan = document.getElementById('cwtWrap'); if(wPan) wPan.dataset.pantalla = p;
    document.querySelectorAll('.cwt-pantalla').forEach(function(el){
      el.classList.toggle('on', el.dataset.pantalla === p);
    });
  }
  function abrirTimer(){
    var w = document.getElementById('cwtWrap');
    if(!w) return;
    /* el chip VOZ refleja el silencio general (jp_audio_muted) que se pudo cambiar en Ajustes desde la última vez */
    try{ if(window.jpVoz) window.jpVoz.pintar(); }catch(e){}
    /* si ya estaba abierto y minimizado (motor corriendo en background,
       ver minimizar() más abajo), sólo se restaura la vista completa --
       nunca se resetea un WOD en curso por re-abrir el timer. */
    if(w.classList.contains('on') && w.classList.contains('cwt-minimized')){
      restaurarDesdeMinimizado();
      return;
    }
    w.classList.add('on');
    w.classList.remove('cwt-minimized');
    ocultarMini();
    mostrarPantalla('modo');
    pintarCampos();
  }
  /* directiva ("Sprint 1: Timer contextual de WOD") -- abre el HUD ya
     configurado con la modalidad/tiempos detectados en la Pizarra
     ({modo, total|cap|intervalo+rondas|work+rest+rondas}), directo a la
     pantalla "run" lista para ▶ Empezar -- sin pasar por Selección de
     Modalidad ni Configuración. Sólo escribe los MISMOS inputs que ya lee
     cfg() y reusa pintarCampos()/reset(); no toca paso()/arrancar()/
     estadoInicial(). Si ya hay un WOD corriendo (minimizado), NO se pisa:
     sólo se vuelve a mostrar el HUD en carrera. */
  function configurar(c){
    var w = document.getElementById('cwtWrap');
    if(!w || !c || !CAMPOS[c.modo]) return;
    if(corriendo){
      w.classList.add('on'); restaurarDesdeMinimizado(); mostrarPantalla('run');
      return;
    }
    var set = function(id, v){ var e = document.getElementById(id); if(e && v != null && v !== '') e.value = v; };
    var mmssTxt = function(s){ s = Math.max(1, Math.round(s)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); };
    modo = c.modo;
    if(c.modo === 'amrap') set('cwtTotal', c.total);
    else if(c.modo === 'fortime') set('cwtCap', c.cap || 0);
    else if(c.modo === 'emom'){ set('cwtInt', mmssTxt(c.intervalo || 60)); set('cwtEmomRondas', c.rondas); }
    else { set('cwtWork', c.work); set('cwtRest', c.rest); set('cwtRounds', c.rondas); }
    document.querySelectorAll('.cwt-mode, .cwt-mode-extra').forEach(function(x){ x.classList.toggle('on', x.dataset.cwt === modo); });
    document.querySelectorAll('[data-cwtcapval]').forEach(function(x){ x.classList.toggle('on', c.modo === 'fortime' && parseInt(x.dataset.cwtcapval, 10) === (c.cap || 0)); });
    w.classList.add('on'); w.classList.remove('cwt-minimized');
    ocultarMini();
    pintarCampos();
    mostrarPantalla('run');
    vibrar([12]);
  }
  function cerrarTimer(){
    var w = document.getElementById('cwtWrap');
    if(w){ w.classList.remove('on'); w.classList.remove('cwt-minimized'); }
    if(corriendo) pausar();
    ocultarMini();
  }
  /* directiva ("Modo Mini-HUD Flotante Persistente") -- minimizar/
     restaurar son cambios puramente visuales: el setInterval de paso()
     sigue corriendo idéntico, minimizado o no (nunca se pausa acá). */
  function minimizar(){
    var w = document.getElementById('cwtWrap'), m = document.getElementById('cwtMini');
    if(!w) return;
    w.classList.add('cwt-minimized');
    if(m) m.classList.add('on');
    pintarMini();
    vibrar([12]);
  }
  function ocultarMini(){
    var m = document.getElementById('cwtMini');
    if(m) m.classList.remove('on');
  }
  function restaurarDesdeMinimizado(){
    var w = document.getElementById('cwtWrap');
    if(w) w.classList.remove('cwt-minimized');
    ocultarMini();
  }
  /* directiva -- espejo en vivo del HUD para la barra flotante: se llama
     de forma aditiva desde pintar() (el renderer de siempre, jamás la
     matemática de paso()/arrancar()), así el mini-HUD queda siempre
     sincronizado con el mismo estado que ya calcula el motor. */
  function pintarMini(){
    var mini = document.getElementById('cwtMini'); if(!mini || !mini.classList.contains('on')) return;
    var t = document.getElementById('cwtTime'), r = document.getElementById('cwtRound');
    var mt = document.getElementById('cwtMiniTime'), mr = document.getElementById('cwtMiniRound');
    var mg = document.getElementById('cwtMiniGo');
    if(mt && t) mt.textContent = t.textContent;
    if(mr && r) mr.textContent = r.textContent.replace(/\s+/g, ' ');
    if(mg) mg.innerHTML = corriendo ? JP_IC_PAUSA : JP_IC_PLAY;
  }
  function montarTimer(){
    var w = document.getElementById('cwtWrap'); if(!w || w.dataset.listo) return;
    w.dataset.listo = '1';
    w.addEventListener('click', function(e){ if(e.target === w) cerrarTimer(); });
    document.getElementById('cwtX').addEventListener('click', cerrarTimer);
    document.getElementById('cwtGo').addEventListener('click', arrancar);
    document.getElementById('cwtReset').addEventListener('click', reset);
    (function(){ var bP = document.getElementById('cwtPlus'), bS = document.getElementById('cwtSkip'); if(bP) bP.addEventListener('click', masDiezFase); if(bS) bS.addEventListener('click', saltarFase); })();
    document.getElementById('cwtFin').addEventListener('click', function(){ finalizar('Terminado'); });
    /* directiva ("Pantalla de Selección de Modalidad") -- .cwt-mode-extra
       (Intervalos/Hyrox) comparte data-cwt/delegación con .cwt-mode, sólo
       cambia su estilo (ver CSS). */
    document.querySelector('.cwt-modes').addEventListener('click', function(e){
      var b = e.target.closest('[data-cwt]'); if(!b) return;
      modo = b.dataset.cwt;
      document.querySelectorAll('.cwt-mode, .cwt-mode-extra').forEach(function(x){ x.classList.toggle('on', x === b); });
      vibrar([15]);
      pintarCampos();
      mostrarPantalla('config');
    });
    document.getElementById('cwtCfg').addEventListener('input', function(){ if(!corriendo) reset(); });
    /* directiva ("Pantallas de Configuración Específica") -- arranca
       desde la pantalla de config: arrancar() es el MISMO gatillo que ya
       usa #cwtGo (nunca se duplica la lógica de start/pause), sólo se le
       suma la transición visual a la pantalla de carrera. */
    var startBtn = document.getElementById('cwtStart');
    if(startBtn) startBtn.addEventListener('click', function(){ arrancar(); mostrarPantalla('run'); });
    var backBtn = document.getElementById('cwtBack');
    if(backBtn) backBtn.addEventListener('click', function(){ mostrarPantalla('modo'); });
    var backRunBtn = document.getElementById('cwtBackRun');
    if(backRunBtn) backRunBtn.addEventListener('click', function(){ if(!corriendo) mostrarPantalla('modo'); });
    /* AMRAP -- chips +1m/+5m sobre el input central de minutos */
    document.querySelectorAll('[data-cwttotaldelta]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var el = document.getElementById('cwtTotal'); if(!el) return;
        el.value = Math.max(1, (parseInt(el.value, 10) || 0) + parseInt(btn.dataset.cwttotaldelta, 10));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        vibrar([12]);
      });
    });
    /* FOR TIME -- chips de time cap preseteado + "SIN LÍMITE" */
    document.querySelectorAll('[data-cwtcapval]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var el = document.getElementById('cwtCap'); if(!el) return;
        el.value = btn.dataset.cwtcapval;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        document.querySelectorAll('[data-cwtcapval]').forEach(function(b){ b.classList.toggle('on', b === btn); });
        vibrar([12]);
      });
    });
    /* EMOM -- "FOR [rondas] RONDAS" mantiene sincronizado cwtTotal (ver
       sincronizarEmomTotal(), nunca toca estadoInicial()). */
    var emomRondasEl = document.getElementById('cwtEmomRondas');
    if(emomRondasEl) emomRondasEl.addEventListener('input', function(){ if(modo === 'emom') sincronizarEmomTotal(); });
    var cwtIntEl = document.getElementById('cwtInt');
    if(cwtIntEl) cwtIntEl.addEventListener('input', function(){ if(modo === 'emom') sincronizarEmomTotal(); });
    /* Mini-HUD flotante */
    var minBtn = document.getElementById('cwtMin');
    if(minBtn) minBtn.addEventListener('click', minimizar);
    var mini = document.getElementById('cwtMini');
    if(mini){
      mini.addEventListener('click', function(e){
        if(e.target.closest('#cwtMiniGo') || e.target.closest('#cwtMiniX')) return;
        restaurarDesdeMinimizado();
      });
      var miniGo = document.getElementById('cwtMiniGo');
      if(miniGo) miniGo.addEventListener('click', function(e){ e.stopPropagation(); arrancar(); });
      var miniX = document.getElementById('cwtMiniX');
      if(miniX) miniX.addEventListener('click', function(e){ e.stopPropagation(); cerrarTimer(); });
    }
    pintarCampos();
    /* directiva10 -- Page Visibility API: apenas la app vuelve a primer
       plano (se destraba la pantalla, se vuelve de otra app, o simplemente
       la pestaña recupera el foco) se resincroniza YA el cronómetro activo
       contra el reloj real. */
    document.addEventListener('visibilitychange', function(){
      if(document.visibilityState === 'visible') sincronizarWodActivo();
    });
    window.addEventListener('pageshow', sincronizarWodActivo);
    window.addEventListener('focus', sincronizarWodActivo);
  }
  window.CoachWodTimer = { abrir: abrirTimer, cerrar: cerrarTimer, configurar: configurar, modo: function(m){ modo = m; pintarCampos(); },
                           prep: function(){ return fase === 'prep'; },
                           estado: function(){ return { modo: modo, corriendo: corriendo, restante: restante,
                                                        transcurrido: transcurrido, ronda: ronda, rondas: rondas, fase: fase }; },
                           paso: paso, reset: reset, arrancar: arrancar, finalizar: finalizar, mmss: mmss,
                           resync: sincronizarWodActivo };


  function montar(){
    montarTimer();
    if(!document.getElementById('btnWodTimerAth')){
      /* vive fijo en la Fila 2 (Herramientas Tácticas), entre %1RM y Guía */
      var host = document.querySelector('.hd-row-tools') || document.querySelector('.hd-actions') || document.querySelector('.masthead');
      if(host){
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'nav-pill'; b.id = 'btnWodTimerAth';
        b.innerHTML = '\u23f1<span class="lbl"> Custom Timer</span>';
        b.title = 'Custom WOD Timer';
        b.addEventListener('click', abrirTimer);
        var guide = document.getElementById('guideBtn');
        if(guide && guide.parentNode === host) host.insertBefore(b, guide);
        else host.appendChild(b);
      }
    }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar);
  else setTimeout(montar, 40);
})();
