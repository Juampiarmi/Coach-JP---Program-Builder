(function(){
  'use strict';
  var LIM_INACTIVO = 15 * 60 * 1000;   /* una pausa mayor a 15 min no cuenta como entrenamiento */

  function ses(){
    state.session = state.session || {};
    state.session.marcasTiempo = state.session.marcasTiempo || [];
    return state.session;
  }

  /* ---------------------------------------------------------
     1 · TIEMPO ACTIVO REAL
     Se suman los tramos entre acciones; si entre dos acciones
     pasaron más de 15 minutos, ese hueco no se contabiliza.
  --------------------------------------------------------- */
  function latido(){
    var s = ses();
    if(s.pausa) return;
    var t = Date.now();
    var m = s.marcasTiempo;
    if(m.length && t - m[m.length - 1] < 20000) return;   /* como mucho un latido cada 20 s */
    m.push(t);
    if(m.length > 900) s.marcasTiempo = m.slice(-900);
    if(!s.inicio) s.inicio = t;
    try{ saveProgress(); }catch(e){}
  }
  function minutosActivos(){
    var s = ses(), m = (s.marcasTiempo || []).slice();
    if(!m.length) return 0;
    /* directiva maestra ("Reparación del generador de StoryCard -- bug de
       tiempo anómalo, '16h 11m'") -- marcasTiempo se acumula entre días
       (hasta 900 marcas, nunca se resetea por sesión): sumar TODOS los
       tramos activos de toda la historia daba horas irreales aunque cada
       tramo fuera <= 15 min. Sólo cuenta la ÚLTIMA sesión (un hueco > 4 h
       entre marcas arranca una sesión nueva) y, como límite de cordura, si
       aun así supera 150 min se usa un promedio creíble de 60 min. */
    var HUECO_SESION = 4 * 60 * 60000, desde = 0;
    for(var j = 1; j < m.length; j++){ if(m[j] - m[j - 1] > HUECO_SESION) desde = j; }
    var total = 0;
    for(var i = desde + 1; i < m.length; i++){
      var d = m[i] - m[i - 1];
      if(d > 0 && d <= LIM_INACTIVO) total += d;
    }
    total += (s.tiempoPausado || 0) * 0;   /* lo pausado nunca se suma */
    var mins = Math.max(1, Math.round(total / 60000));
    return mins > 150 ? 60 : mins;
  }
  window.CoachTiempoActivo = minutosActivos;

  /* última acción REAL del alumno (series, kilos, repeticiones, bloques): el latido automático de cada minuto solo cuenta mientras haya habido una en los últimos 15 min.
     Antes sumaba también la app abierta sin entrenar (se abría el celular, se dejaba sobre el banco y el tiempo "de sesión" seguía corriendo). */
  var ultimaAccion = 0;
  ['change','input','click'].forEach(function(ev){
    document.addEventListener(ev, function(e){
      if(!e.target.closest) return;
      if(e.target.closest('.set-check, .set-kg, .set-reps, .block-check, .block-done-cb, .rir-chip, .jp-tool, .tv-nav button, .jp-qc-ok, .jp-qc-kg, .jp-qc-rp')){ ultimaAccion = Date.now(); latido(); }
    }, true);
  });
  function latidoPasivo(){
    if(document.visibilityState === 'hidden') return;
    if(!ultimaAccion || Date.now() - ultimaAccion > LIM_INACTIVO) return;
    latido();
  }
  window.__jpUltimaAccion = function(t){ if(t != null) ultimaAccion = t; return ultimaAccion; };    /* tests */
  window.__jpLatidoPasivo = latidoPasivo;

  /* ---------------------------------------------------------
     2 · PAUSA DE SESIÓN
  --------------------------------------------------------- */
  function pintarPausa(){
    var s = ses();
    var b = document.getElementById('sesPause');
    var bn = document.getElementById('sesBanner');
    document.body.classList.toggle('ses-paused', !!s.pausa);
    if(bn) bn.classList.toggle('on', !!s.pausa);
    if(b){
      b.classList.toggle('on', !!s.pausa);
      b.innerHTML = s.pausa ? '▶ Retomar sesión' : '⏸ Pausar sesión';
    }
  }
  function alternarPausa(forzar){
    var s = ses();
    var nuevo = (forzar == null) ? !s.pausa : !!forzar;
    if(nuevo){
      s.pausa = true; s.pausaDesde = Date.now();
      try{ if(navigator.vibrate) navigator.vibrate([60, 40, 60]); }catch(e){}
      /* si había un descanso corriendo, se congela */
      try{ if(window.CoachTV && window.CoachTV.pausar) window.CoachTV.pausar(); }catch(e){}
    } else {
      s.pausa = false;
      s.tiempoPausado = (s.tiempoPausado || 0) + Math.max(0, Date.now() - (s.pausaDesde || Date.now()));
      s.pausaDesde = 0;
      /* al retomar arranca un tramo nuevo: el hueco no se cuenta */
      s.marcasTiempo.push(Date.now());
      try{ if(navigator.vibrate) navigator.vibrate([30]); }catch(e){}
    }
    try{ saveProgress(); }catch(e){}
    pintarPausa();
    return s.pausa;
  }
  window.CoachPausa = { alternar: alternarPausa, activa: function(){ return !!ses().pausa; } };

  function botonPausa(){
    if(document.getElementById('sesPause')) return;
    var host = document.querySelector('.hd-actions') || document.querySelector('.masthead');
    if(!host) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'ses-pause'; b.id = 'sesPause';
    b.innerHTML = '⏸ Pausar sesión';
    b.title = 'Pausar la sesión sin perder el registro';
    b.addEventListener('click', function(){ alternarPausa(); });
    host.appendChild(b);
    var r = document.getElementById('sesResume');
    if(r) r.addEventListener('click', function(){ alternarPausa(false); });
    pintarPausa();
  }

  /* ---------------------------------------------------------
     3 · MÉTRICAS NUEVAS DE LA STORY CARD
  --------------------------------------------------------- */
  /* ids de los bloques que existen HOY en el dia activo (null si la rutina no los expone): el progreso viejo de otra planificacion con el mismo id de dia nunca entra a la tarjeta */
  function bloquesVigentes(){
    var o = {}, n = 0, day = DAYS.filter(function(x){ return x.id === state.currentDay; })[0];
    ((day && day.blocks) || []).forEach(function(b){ o[b.id] = 1; n++; });
    return n ? o : null;
  }
  function topLift(){
    var mejor = { kg: 0, ex: '' }, vig = bloquesVigentes(), nombres = nombresEjDia();
    var pref = state.currentWeek + '|' + state.currentDay + '|';
    Object.keys(state.loads || {}).forEach(function(k){
      if(k.indexOf(pref) !== 0) return;
      var p = k.split('|');
      if(vig && !vig[p[2]]) return;
      var l = state.loads[k], kg = parseFloat(l && l.kg);
      if(kg > mejor.kg) mejor = { kg: kg, ex: nombres[p[2] + '|' + p[3]] || (l && l.__ex) || '' };
    });
    return mejor;
  }
  /* mejores sets del día (por ejercicio): nombre real sacado de la rutina, mejor kg×reps y volumen */
  function nombresEjDia(){
    var nombres = {};
    try{
      var day = DAYS.filter(function(x){ return x.id === state.currentDay; })[0];
      ((day && day.blocks) || []).forEach(function(b){
        if(!b.sportsPizarra || typeof window.parsearPizarraSB !== 'function') return;
        var lin = itemsDeSemana(b, state.currentWeek).filter(function(l){ return l != null && String(l).trim(); });
        window.parsearPizarraSB(lin, { titulo: b.title }).forEach(function(en, idx){
          if(en.tipo === 'simple') nombres[b.id + '|e' + idx] = en.titulo;
          else if(en.tipo === 'biserie') en.subs.forEach(function(s, si){ nombres[b.id + '|b' + idx + 's' + si] = s.nombre; });
        });
      });
    }catch(e){}
    return nombres;
  }
  /* ejercicios con al menos una serie tildada hoy (aunque no lleven kg) */
  function ejerciciosHechosDia(){
    var pref = state.currentWeek + '|' + state.currentDay + '|', nombres = nombresEjDia(), vistos = {}, out = [], vig = bloquesVigentes();
    Object.keys(state.loads || {}).forEach(function(k){
      if(k.indexOf(pref) !== 0) return;
      var l = state.loads[k] || {}, p = k.split('|');
      if(vig && !vig[p[2]]) return;
      if(!l.done) return;
      var nm = nombres[p[2] + '|' + p[3]] || l.__ex || '';
      if(!nm || vistos[nm]) return;
      vistos[nm] = 1; out.push(nm);
    });
    return out;
  }
  /* todos los ejercicios con series hechas hoy (mejor set, volumen, series) y el reparto por grupo muscular */
  function detalleDia(){
    var pref = state.currentWeek + '|' + state.currentDay + '|', nombres = nombresEjDia(), mapa = {}, orden = [], vig = bloquesVigentes();
    Object.keys(state.loads || {}).forEach(function(k){
      if(k.indexOf(pref) !== 0) return;
      var l = state.loads[k] || {}, p = k.split('|');
      if(vig && !vig[p[2]]) return;
      if(!l.done) return;
      var nm = nombres[p[2] + '|' + p[3]] || l.__ex || '';
      if(!nm) return;
      var m = mapa[nm]; if(!m){ m = mapa[nm] = { ex: nm, kg: 0, reps: 0, vol: 0, n: 0 }; orden.push(nm); }
      m.n++;
      var kg = parseFloat(l.kg) || 0, rp = parseFloat(l.reps) || 0;
      if(kg > 0){
        m.vol += jpTonelajeSerie(l);
        if(kg > m.kg || (kg === m.kg && rp > m.reps)){ m.kg = kg; m.reps = rp > 0 ? rp : 1; }
      }
    });
    return orden.map(function(k){ mapa[k].vol = Math.round(mapa[k].vol); return mapa[k]; })
      .sort(function(a, b){ return (b.vol - a.vol) || (b.n - a.n); });
  }
  var GRUPOS_RX = [
    ['GEMELOS', /gemelo|pantorrilla|calf|talones/i], ['CORE', /abdominal|plancha|dead ?bug|rueda|pallof|core|crunch|ab wheel|bird ?dog|elevaci[oó]n de piernas|farmer|carry|paseo del granjero/i],
    ['TRÍCEPS', /tr[ií]ceps|franc[eé]s|skull|pushdown|jm press|fondos/i], ['ISQUIOS', /femoral|isquio|hamstring|leg curl|rumano|rdl|peso muerto|deadlift|good ?morning|nordic/i],
    ['BÍCEPS', /(?:^|[^a-z])curl|b[ií]ceps|biceps|martillo|hammer/i], ['GLÚTEO', /hip ?thrust|gl[uú]te|glute|patada|abducci[oó]n|puente de gl|kickback|step ?up/i],
    ['CUÁDRICEPS', /sentadilla|squat|prensa|leg press|extensi[oó]n de cu[aá]d|leg extension|hack|zancada|lunge|b[uú]lgara|bulgarian|estocada|cu[aá]driceps/i],
    ['HOMBROS', /hombro|militar|overhead|shoulder|lateral|elevaciones|p[aá]jaro|rear delt|face ?pull|arnold|delt/i], ['ESPALDA', /remo|row|jal[oó]n|pulldown|dominada|pull-?up|chin-?up|pull-?over|espalda|dorsal|lat /i],
    ['PECHO', /banca|bench|pecho|chest|apertura|fly|cruce|press inclinado|incline|flexi[oó]n|push-?up|fondos en paralelas/i]
  ];
  function grupoDe(nombre){ var t = String(nombre || ''); for(var i = 0; i < GRUPOS_RX.length; i++){ if(GRUPOS_RX[i][1].test(t)) return GRUPOS_RX[i][0]; } return ''; }
  function gruposDia(det){
    var c = {}, tot = 0;
    (det || []).forEach(function(x){ var g = grupoDe(x.ex); if(!g) return; c[g] = (c[g] || 0) + x.n; tot += x.n; });
    var lista = Object.keys(c).map(function(g){ return { nombre: g, n: c[g], pct: tot ? Math.round(c[g] / tot * 100) : 0 }; }).sort(function(a, b){ return b.n - a.n; });
    /* solo los grupos específicos (cuádriceps, isquios, glúteo, gemelos...): la referencia general de "tren inferior" no se repite como un renglón más,
       va en el texto descriptivo de la Story Card (ver esTrenInferior) */
    return lista;
  }
  var GRUPOS_PIERNA = { 'CUÁDRICEPS': 1, 'ISQUIOS': 1, 'GLÚTEO': 1, 'GEMELOS': 1 };
  /* true si la mayoría de las series efectivas de la lista de grupos es de tren inferior */
  function esTrenInferior(grupos){
    var tot = 0, inf = 0;
    (grupos || []).forEach(function(x){ tot += x.n || 0; if(GRUPOS_PIERNA[x.nombre]) inf += x.n || 0; });
    return tot > 0 && inf / tot >= 0.5;
  }
  window.jpEsTrenInferior = esTrenInferior;
  function topSetsDia(){
    var pref = state.currentWeek + '|' + state.currentDay + '|', nombres = nombresEjDia(), mapa = {}, vig = bloquesVigentes();
    Object.keys(state.loads || {}).forEach(function(k){
      if(k.indexOf(pref) !== 0) return;
      var l = state.loads[k] || {}, p = k.split('|');
      if(vig && !vig[p[2]]) return;
      var kg = parseFloat(l.kg), rp = parseFloat(l.reps);
      if(!l.done || !(kg > 0)) return;
      var nm = nombres[p[2] + '|' + p[3]] || l.__ex || '';
      if(!nm) return;
      var r = rp > 0 ? rp : 1, m = mapa[nm] || (mapa[nm] = { ex: nm, kg: 0, reps: 0, vol: 0, blk: {} });
      m.blk[p[2]] = 1;
      m.vol += jpTonelajeSerie(l);
      if(kg > m.kg || (kg === m.kg && r > m.reps)){ m.kg = kg; m.reps = r; }
    });
    return Object.keys(mapa).map(function(k){ mapa[k].vol = Math.round(mapa[k].vol); return mapa[k]; })
      .sort(function(a, b){ return (b.kg * (1 + b.reps / 30)) - (a.kg * (1 + a.reps / 30)); }).slice(0, 3);      /* los 3 MEJORES top sets con carga (por 1RM estimado del mejor set) */
  }
  /* bloques completados hoy que no estan representados en los 3 top sets (peso corporal, cardio, accesorios, calentamiento...) */
  function bloquesExtraDia(top){
    var w = state.currentWeek, dayId = state.currentDay, pref = w + '|' + dayId + '|', ids = {};
    var comp = ((state.completed || {})[w] || {})[dayId] || {};
    Object.keys(comp).forEach(function(k){ if(k !== '__dayDone' && comp[k]) ids[k] = 1; });
    Object.keys(state.loads || {}).forEach(function(k){
      if(k.indexOf(pref) !== 0) return;
      var l = state.loads[k] || {};
      if(l.done) ids[k.split('|')[2]] = 1;
    });
    (top || []).forEach(function(t){ Object.keys(t.blk || {}).forEach(function(bk){ delete ids[bk]; }); });
    /* solo bloques que existen hoy en la rutina del dia (sin restos de bloques viejos guardados en el progreso) */
    var diaAct = DAYS.filter(function(x){ return x.id === dayId; })[0], validos = {};
    ((diaAct && diaAct.blocks) || []).forEach(function(b){ validos[b.id] = 1; });
    return Object.keys(ids).filter(function(k){ return validos[k]; }).length;
  }
  function rachaMesociclo(){
    var total = 0, hechas = 0;
    var semanas = (typeof WEEKS_META !== 'undefined' && WEEKS_META.length) ? WEEKS_META.length : 4;
    var dias = (typeof DAYS !== 'undefined' && DAYS.length) ? DAYS.length : 4;
    total = semanas * dias;
    for(var w = 0; w < semanas; w++){
      var sem = (state.completed || {})[w] || {};
      DAYS.forEach(function(d){
        if(sem[d.id] && sem[d.id].__dayDone) hechas++;
      });
    }
    /* "sesión N de M": si el día abierto ya está concluido, ya está contado en "hechas" (antes se sumaba un 1 de más y la tarjeta decía una sesión por delante) */
    var semAct = (state.completed || {})[state.currentWeek] || {}, hoyHecho = !!(semAct[state.currentDay] && semAct[state.currentDay].__dayDone);
    var actual = Math.min(total, hechas + (hoyHecho ? 0 : 1));
    return { hechas: hechas, total: total, actual: Math.max(1, actual) };
  }
  function rpePromedio(){
    var vig = bloquesVigentes();    /* sin restos de bloques viejos guardados en el progreso de un plan anterior con el mismo id de día */
    var k = Object.keys(state.rir || {}).filter(function(x){
      if(x.indexOf(state.currentWeek + '|' + state.currentDay + '|') !== 0) return false;
      if(vig && !vig[x.split('|')[2]]) return false;
      return typeof state.rir[x] === 'number' && isFinite(state.rir[x]);
    });
    if(!k.length) return 0;
    var suma = 0;
    k.forEach(function(x){ suma += (10 - Math.min(3, state.rir[x])); });
    return Math.round(suma / k.length * 10) / 10;
  }
  window.CoachMetricas = { topLift: topLift, racha: rachaMesociclo, rpe: rpePromedio, minutos: minutosActivos, detalle: detalleDia, grupos: gruposDia };

  /* ---------------------------------------------------------
     4 · STORY CARD: pie nuevo, sin frase motivacional
  --------------------------------------------------------- */
  var W = 1080, HH = 1920;
  function rr(g, x, y, w, h, r){
    g.beginPath(); g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function pieYMetricas(d, estilo){
    if(typeof window.CoachStoryMarca === 'function' && window.COACH_DISCIPLINA === 'sports') return;   /* el diseno de marca ya dibuja el pie */
    var c = document.getElementById('storyCanvas'); if(!c) return;
    var g = c.getContext('2d');
    var dorado = estilo === 'champ';
    /* 09/09 -- Luxury Stealth: acento único dorado en los dos estilos
       (antes era naranja #D2793F en ambos) */
    var acento = '#E5C378';
    var y = 1508;
    var ancho = W - 180;

    /* limpia la franja inferior para reescribirla -- #121820 (no #08090B)
       para que no quede una costura visible contra el nuevo fondo en
       degradé "Dark Stealth Tactical" de dibujar()/champion() (el pie de
       la tarjeta cae justo en la parte más oscura del gradiente). Si hay
       foto de fondo (directiva), ese relleno opaco taparía la foto justo
       en la franja del pie -- se salta: el overlay oscuro ya pintado por
       storyFondoFoto() sobre TODO el canvas ya deja el texto legible acá
       también, y las cajas de abajo (fondo propio, semi-transparente)
       siguen leyéndose igual de bien encima de la foto. */
    var fotoActivaPie = !!(window.__storyFotoImg && window.__storyFotoImg.complete && window.__storyFotoImg.naturalWidth);
    g.save();
    /* directiva ("Pulido visual de la Story Card: caja residual detrás de
       la pastilla de métricas") -- este relleno usaba x=70/ancho=W-140,
       20px más ancho a cada lado que TODAS las cápsulas reales que
       contiene (la pastilla VOLUMEN·SETS·TIEMPO de dibujar()/champion() y
       las cajas de racha/top-lift de acá abajo, todas x=90/ancho=W-180) --
       ese borde de 20px sobrante quedaba como una franja oscura residual
       y desalineada asomando a los costados, en vez de un fondo limpio.
       Mismo inset que el resto del layout, sin excepción. */
    if(!fotoActivaPie){
      g.fillStyle = '#121820';
      g.fillRect(90, y - 16, W - 180, HH - y + 16);
    }
    if(dorado){
      var rg = g.createRadialGradient(W / 2, HH - 260, 40, W / 2, HH - 260, 760);
      rg.addColorStop(0, 'rgba(56,189,248,.14)'); rg.addColorStop(1, 'rgba(56,189,248,0)');
      g.fillStyle = rg; g.fillRect(90, y - 16, W - 180, HH - y + 16);
    }
    g.textAlign = 'center'; g.textBaseline = 'middle';

    var caja = function(yy, alto, fondo, borde){
      g.fillStyle = fondo; rr(g, 90, yy, ancho, alto, 24); g.fill();
      g.strokeStyle = borde; g.lineWidth = 2; rr(g, 90, yy, ancho, alto, 24); g.stroke();
    };
    var ajusta = window.CoachAjustarTexto || function(gg, t, w, b){ gg.font = '700 ' + b + 'px "Chakra Petch", sans-serif'; return b; };

    /* un solo banner de consistencia ("SESIÓN 1/24 // COMPLETA"): se retira la segunda barra redundante */
    var yB = y, hB = 150;
    caja(yB, hB, 'rgba(229,195,120,.10)', 'rgba(229,195,120,.45)');
    g.fillStyle = '#A0A8B4'; g.font = '700 26px "Chakra Petch", sans-serif';
    g.fillText('CONSISTENCIA DEL MESOCICLO', W / 2, yB + 44);
    var txtB = 'SESIÓN ' + d.sesionN + '/' + d.sesionTotal + ' // COMPLETA';
    ajusta(g, txtB, ancho - 60, 62, 30);
    g.fillStyle = acento;
    g.fillText(txtB, W / 2, yB + 104);

    /* firma discreta, siempre al pie */
    g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '700 28px "Chakra Petch", sans-serif';
    g.fillStyle = '#F59E0B'; g.font = '700 26px "JetBrains Mono", ui-monospace, monospace';
    g.fillText('⚡ PROGRAMMED BY @COACHJP', W / 2, HH - 88);

    /* el marco cepillado se redibuja arriba de la franja nueva */
    if(dorado){
      g.strokeStyle = 'rgba(229,195,120,.55)'; g.lineWidth = 4;
      rr(g, 46, 46, W - 92, HH - 92, 34); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.10)'; g.lineWidth = 2;
      rr(g, 64, 64, W - 128, HH - 128, 26); g.stroke();
    }
    g.restore();
  }

  function enriquecer(d){
    d = d || {};
    var r = rachaMesociclo(), t = topLift();
    /* TIEMPO: solo el medido. La estimación por lo programado (que podía mostrar "2 h 00 m" tras cargar tres series) ya no sale en la tarjeta: sin registro creíble
       el dato queda vacío y la tarjeta no dibuja el casillero. */
    d.tiempo = '';
    d.tiempoReal = 0;
    try{
      var tj = (typeof window.jpTiempoSesion === 'function') ? window.jpTiempoSesion() : null, ds = (typeof window.CoachDuracionSesion === 'function') ? window.CoachDuracionSesion() : null;
      var minsR = (ds && ds.min > 0 && !ds.estimada) ? ds.min : ((tj && tj.min > 0 && !tj.estimado) ? tj.min : 0);
      if(minsR > 0){ d.tiempoReal = minsR; d.tiempo = (typeof window.CoachFmtDuracion === 'function') ? window.CoachFmtDuracion(minsR) : String(minsR) + ' min'; }
    }catch(eT){}
    d.sesionN = r.actual; d.sesionTotal = r.total;
    d.topKg = t.kg; d.topEx = t.ex;
    d.rpe = rpePromedio();
    d.topSets = topSetsDia();
    d.bloquesExtra = bloquesExtraDia(d.topSets);
    d.listaEj = ejerciciosHechosDia();
    d.ejDetalle = detalleDia();
    d.grupos = gruposDia(d.ejDetalle);
    return d;
  }
  window.CoachStoryDatos = enriquecer;

  function mount(){
    botonPausa();
    /* abrir la app no es entrenar: el primer latido llega con la primera serie, no al cargar */
    /* engancha la Story Card: enriquece los datos y reescribe el pie */
    if(window.CoachStory && typeof window.CoachStory.abrir === 'function' && !window.CoachStory.__fino){
      var _ab = window.CoachStory.abrir;
      window.CoachStory.abrir = function(d){
        d = enriquecer(d || {});
        var r = _ab.call(this, d);
        var repinta = function(){
          var estilo = (window.CoachStoryStyles && window.CoachStoryStyles.actual()) || 'cyber';
          pieYMetricas(d, estilo);
        };
        setTimeout(repinta, 180);
        setTimeout(repinta, 700);
        var s = document.getElementById('scStyles');
        if(s && !s.dataset.fino){
          s.dataset.fino = '1';
          s.addEventListener('click', function(){ setTimeout(repinta, 140); });
        }
        return r;
      };
      window.CoachStory.__fino = 1;
      window.CoachStory.pie = pieYMetricas;
    }
    if(typeof window.renderMain === 'function'){
      var _rm = window.renderMain;
      window.renderMain = function(){
        var x = _rm.apply(this, arguments);
        setTimeout(function(){ botonPausa(); pintarPausa(); }, 60);
        return x;
      };
    }
    setInterval(latidoPasivo, 60000);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(mount, 60); });
  else setTimeout(mount, 60);
})();
