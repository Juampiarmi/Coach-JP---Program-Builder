/* =========================================================
   BODY MAINTENANCE / STRETCHING WORKOUTS · banco de cierres opcionales de 5 a 10 minutos
   ---------------------------------------------------------
   · Rutinas cortas de movilidad y flexibilidad organizadas por sector corporal (cadera, hombros, escápulas, tobillos, cadena posterior,
     tren inferior y superior completos, torácica, front rack, press por encima de la cabeza, lumbar y descarga general).
   · Se insertan en el COOL-DOWN del día (d.cooldown + d.cooldownNota): la app del alumno ya lo muestra como su propia tarjeta
     «Cool-Down y Recuperación» al final de la sesión. NO se crea ningún bloque: la estructura principal del entrenamiento, el volumen,
     los bisets y las alertas no cambian. Cada rutina entra con su encabezado numerado («1. Body Maintenance · …»), que la app lee
     como subtítulo de fase, y queda marcada como OPCIONAL.
   · Sugerencia del día: según los grupos que más trabajó la sesión (mismo cálculo que el volumen del Builder) se proponen primero
     las rutinas que mejor la complementan.
   · API: window.CoachMantenimiento = { rutinas, sectores, porId, lineas, minutos, sugerir, insertar, quitar, abrir }
   ========================================================= */
(function(){
  'use strict';
  var SECTORES = [
    { k: 'cadera',    lb: 'Cadera' },
    { k: 'hombros',   lb: 'Hombros' },
    { k: 'escapulas', lb: 'Escápulas' },
    { k: 'tobillos',  lb: 'Tobillos' },
    { k: 'posterior', lb: 'Isquios / cadena posterior' },
    { k: 'lower',     lb: 'Tren inferior' },
    { k: 'upper',     lb: 'Tren superior' },
    { k: 'toracica',  lb: 'Torácica' },
    { k: 'olimpico',  lb: 'Front rack / overhead' },
    { k: 'general',   lb: 'Descarga general' }
  ];
  /* m: segundos estimados de cada ítem (para la duración total que ve el coach); todas las rutinas quedan entre 5 y 10 minutos */
  var RUTINAS = [
    { id: 'cadera', sector: 'cadera', titulo: 'Movilidad de cadera', icono: '🦵',
      objetivo: 'Recuperás la rotación interna y externa y la extensión de cadera que la sentadilla, el peso muerto y estar sentado te van quitando.',
      items: [['Cambio de cadera 90/90', '2x8 por lado, lento', 70], ['Estiramiento de flexor de cadera en estocada (rodilla en el piso)', '2x40 s por lado', 170], ['Paloma en el piso (glúteo y rotadores)', '2x40 s por lado', 170], ['Rana con balanceo atrás (aductores)', '2x10', 60], ['Sentadilla profunda sostenida con apoyo', '2x40 s', 90]] },
    { id: 'hombros', sector: 'hombros', titulo: 'Movilidad de hombros', icono: '🙆',
      objetivo: 'Devolvés rango a la articulación del hombro después de empujar y tirar: pectoral y dorsal más largos, manguito activo y brazos arriba sin compensar con la espalda.',
      items: [['Dislocaciones con banda o palo', '2x12', 60], ['Estiramiento de pectoral en marco de puerta', '2x30 s por lado', 130], ['Rotación externa con banda', '2x15 por lado', 90], ['Deslizamientos en pared (wall slides)', '2x10', 60], ['Estiramiento de dorsal en banco (postura de rezo)', '2x40 s', 90]] },
    { id: 'escapulas', sector: 'escapulas', titulo: 'Amplitud escapular', icono: '🪽',
      objetivo: 'Las escápulas vuelven a deslizar libres sobre la caja torácica: más rango para remar, jalar y empujar, y un hombro que trabaja centrado.',
      items: [['Retracciones escapulares colgado', '2x10', 60], ['Flexiones escapulares (scap push-ups)', '2x12', 60], ['Apertura de banda', '2x15', 60], ['Y-T-W boca abajo en el piso', '1x8 de cada letra', 90], ['Gato-camello pensando en las escápulas', '1x10', 40]] },
    { id: 'tobillos', sector: 'tobillos', titulo: 'Dorsiflexión de tobillos', icono: '🦶',
      objetivo: 'Más rango de tobillo para que la rodilla avance en la sentadilla y la zancada sin levantar el talón ni cargar la zona lumbar.',
      items: [['Rodilla a la pared (knee to wall)', '2x10 por lado', 100], ['Estiramiento de gemelo en pared (rodilla extendida)', '2x30 s por lado', 130], ['Estiramiento de sóleo (rodilla flexionada)', '2x30 s por lado', 130], ['Sentadilla con talones apoyados sostenida', '2x30 s', 70], ['Elevación de puntas de pie (tibial anterior)', '2x15', 50]] },
    { id: 'posterior', sector: 'posterior', titulo: 'Isquios y cadena posterior', icono: '🧘',
      objetivo: 'Alargás isquiosurales y glúteos después de la bisagra de cadera: vuelve el rango para el próximo peso muerto y baja la tensión de la espalda baja.',
      items: [['Estiramiento de isquios acostado con banda', '2x40 s por lado', 170], ['Bisagra de cadera con palo (sin carga)', '2x10', 60], ['Deslizamiento neural sentado (nervio ciático)', '2x10 por lado', 80], ['Pinza de pie con rodillas apenas flexionadas', '2x30 s', 70], ['Postura del niño con brazos largos', '1x60 s', 60]] },
    { id: 'lower', sector: 'lower', titulo: 'Lower body completo', icono: '🦿',
      objetivo: 'Recorrés todo el tren inferior en 10 minutos: cadera, cuádriceps, isquios, aductores y tobillo, para bajar la rigidez de un día de piernas y llegar suelto al próximo.',
      items: [['World\'s greatest stretch', '2x5 por lado', 100], ['Estiramiento de flexor de cadera en estocada', '1x40 s por lado', 85], ['Paloma en el piso', '1x40 s por lado', 85], ['Estiramiento de cuádriceps acostado de lado', '1x40 s por lado', 85], ['Estiramiento de isquios acostado con banda', '1x40 s por lado', 85], ['Rodilla a la pared (knee to wall)', '1x10 por lado', 50], ['Rana sostenida (aductores)', '1x45 s', 45]] },
    { id: 'upper', sector: 'upper', titulo: 'Upper body completo', icono: '💪',
      objetivo: 'Cerrás un día de torso devolviendo rango a columna dorsal, pecho, dorsales, hombros, brazos y cuello: menos rigidez y mejor postura para el resto del día.',
      items: [['Gato-camello', '1x10', 40], ['Rotación torácica en cuadrupedia', '2x8 por lado', 90], ['Estiramiento de pectoral en marco de puerta', '1x40 s por lado', 85], ['Estiramiento de dorsal en banco (postura de rezo)', '1x45 s', 45], ['Dislocaciones con banda o palo', '1x12', 30], ['Estiramiento de tríceps por encima de la cabeza', '1x30 s por lado', 65], ['Inclinación lateral de cuello suave', '1x20 s por lado', 45]] },
    { id: 'toracica', sector: 'toracica', titulo: 'Movilidad torácica', icono: '🔄',
      objetivo: 'La columna dorsal vuelve a rotar y extenderse: es la base para un press por encima de la cabeza limpio y para que la zona lumbar no compense.',
      items: [['Rotación torácica en cuadrupedia (thread the needle)', '2x8 por lado', 100], ['Extensión torácica sobre rodillo', '2x8', 70], ['Libro abierto acostado de lado', '2x8 por lado', 100], ['Gato-camello', '1x10', 40]] },
    { id: 'frontrack', sector: 'olimpico', titulo: 'Movilidad de front rack', icono: '🏋️',
      objetivo: 'Codos arriba y muñecas cómodas con la barra sobre los hombros: el rango que piden el front squat, la cargada y el thruster.',
      items: [['Estiramiento de dorsal y tríceps en banco (rezo con codos apoyados)', '2x40 s', 90], ['Flexo-extensión de muñecas en cuadrupedia', '2x10', 50], ['Rodillo en dorsal ancho', '1x60 s por lado', 120], ['Rack con barra vacía sostenido, codos altos', '2x20 s', 60], ['Extensión torácica sobre rodillo', '1x10', 40]] },
    { id: 'press', sector: 'olimpico', titulo: 'Movilidad para press por encima de la cabeza', icono: '⬆️',
      objetivo: 'Brazos completamente arriba sin arquear la espalda: dorsal largo, columna dorsal móvil y escápulas que rotan hacia arriba.',
      items: [['Deslizamientos en pared (wall slides)', '2x10', 60], ['Estiramiento de dorsal en banco (postura de rezo)', '2x40 s', 90], ['Dislocaciones con banda o palo', '2x12', 60], ['Elevación de brazos boca abajo en Y', '2x10', 60], ['Extensión torácica sobre rodillo', '1x10', 40]] },
    { id: 'lumbar', sector: 'posterior', titulo: 'Descarga de espalda baja', icono: '🌀',
      objetivo: 'Bajás la carga de la zona lumbar después de sentadillas, peso muerto o remos pesados: movimiento suave, flexores de cadera largos y control del tronco.',
      items: [['Rodillas al pecho acostado', '1x40 s', 40], ['Gato-camello', '1x10', 40], ['Rotación de columna acostado', '1x30 s por lado', 65], ['Estiramiento de flexor de cadera en estocada', '1x40 s por lado', 85], ['Bird dog lento', '1x8 por lado', 70]] },
    { id: 'descarga', sector: 'general', titulo: 'Descarga general y respiración', icono: '🌬️',
      objetivo: 'Pasás del modo entrenamiento al modo recuperación: respiración lenta, columna suelta y piernas arriba para que el cuerpo empiece a recuperar apenas terminás.',
      items: [['Respiración diafragmática acostado con pies en la pared', '2 min', 120], ['Postura del niño', '1x60 s', 60], ['Rotación de columna acostado', '1x30 s por lado', 60], ['Piernas en la pared', '1 min', 60]] }
  ];
  function porId(id){ return RUTINAS.filter(function(r){ return r.id === id; })[0] || null; }
  function minutos(r){ var s = 0; (r.items || []).forEach(function(i){ s += i[2] || 45; }); return Math.max(5, Math.min(10, Math.round(s / 60))); }
  /* líneas del cool-down: encabezado numerado (la app lo muestra como subtítulo) + un ítem por movimiento en formato «Movimiento — dosis» */
  function encabezado(r, n){ return (n || 1) + '. Body Maintenance · ' + r.titulo + ' · ' + minutos(r) + ' min (opcional)'; }
  function lineas(r, n){ return [encabezado(r, n)].concat(r.items.map(function(i){ return i[0] + ' — ' + i[1]; })); }
  var RX_ENC = /^\d+\.\s*Body Maintenance · /;

  /* grupos que más trabajó el día (mismo cálculo que el volumen del Builder) -> rutinas que mejor lo complementan */
  function nz(s){ return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function sugerir(p, di){
    var puntos = {}, suma = function(id, n){ puntos[id] = (puntos[id] || 0) + n; };
    var dia = {};
    try{ if(typeof window.jpCalcVolumen === 'function' && p) dia = window.jpCalcVolumen(p).porDia[di] || {}; }catch(e){}
    var g = function(k){ return dia[k] || 0; };
    var inferior = g('Cuádriceps') + g('Glúteo / Isquios') + g('Glúteo medio') + g('Isquios') + g('Piernas') + g('Gemelos');
    var superior = g('Pectoral') + g('Espalda') + g('Hombros') + g('Bíceps') + g('Tríceps') + g('Brazos') + g('Salud de hombro');
    suma('cadera', g('Cuádriceps') + g('Glúteo / Isquios') + g('Glúteo medio') + g('Piernas'));
    suma('tobillos', g('Cuádriceps') + g('Gemelos') + g('Piernas') * 0.5);
    suma('posterior', g('Glúteo / Isquios') + g('Isquios'));
    suma('lumbar', (g('Glúteo / Isquios') + g('Espalda')) * 0.4);
    suma('lower', inferior * 0.7);
    suma('hombros', g('Pectoral') + g('Hombros') + g('Salud de hombro'));
    suma('press', g('Hombros') * 0.8 + g('Tríceps') * 0.3);
    suma('escapulas', g('Espalda') + g('Bíceps') * 0.4);
    suma('toracica', (g('Espalda') + g('Pectoral') + g('Hombros')) * 0.35);
    suma('upper', superior * 0.7);
    /* levantamientos olímpicos, front squat, thruster -> front rack */
    try{
      var d = p && p.dias && p.dias[di], txt = nz((d && (d.bloques || []).map(function(b){ return (b.titulo || '') + ' ' + (b.items || []).join(' '); }).join(' ')) || '');
      if(/front squat|sentadilla frontal|clean|cargada|thruster|snatch|arranque|jerk|envion/.test(txt)) suma('frontrack', 14);
      if(/press militar|press de hombro|push press|overhead|por encima de la cabeza|handstand/.test(txt)) suma('press', 4);
    }catch(e){}
    if(inferior && superior) suma('descarga', 3);
    var ids = Object.keys(puntos).filter(function(k){ return puntos[k] > 0; }).sort(function(a, b){ return puntos[b] - puntos[a]; });
    if(!ids.length) ids = ['descarga', 'lower', 'upper'];
    return ids.slice(0, 3);
  }

  /* inserta la rutina al cierre del día: 'sumar' (después de lo que ya tenga el cool-down) o 'reemplazar' (deja solo la rutina). Nunca toca d.bloques. */
  function insertar(d, id, modo){
    var r = porId(id); if(!d || !r) return false;
    var prev = Array.isArray(d.cooldown) ? d.cooldown.slice() : [];
    /* una rutina que ya estaba se reemplaza (no se duplica) */
    var limpio = quitarDeLista(prev, r.titulo);
    var base = modo === 'reemplazar' ? [] : limpio;
    var n = base.filter(function(l){ return /^\d+\.\s/.test(l); }).length + 1;
    /* si el cool-down tenía ítems sueltos sin encabezado, se les pone uno para que la rutina nueva no se mezcle */
    if(base.length && !/^\d+\.\s/.test(base[0])){ base = ['1. Vuelta a la calma'].concat(base); n = 2; }
    d.cooldown = base.concat(lineas(r, n));
    var notas = (d.cooldownNota && modo !== 'reemplazar') ? String(d.cooldownNota).split(/\s*\n\s*/).filter(function(x){ return x && x.indexOf(r.titulo + ':') !== 0; }) : [];
    notas.push(r.titulo + ': ' + r.objetivo);
    d.cooldownNota = notas.join('\n');
    d.mantenimiento = (Array.isArray(d.mantenimiento) && modo !== 'reemplazar' ? d.mantenimiento.filter(function(x){ return x !== id; }) : []).concat([id]);
    return true;
  }
  function quitarDeLista(lista, titulo){
    var out = [], saltando = false;
    lista.forEach(function(l){
      if(RX_ENC.test(l)){ saltando = l.indexOf('· ' + titulo + ' ·') >= 0; if(saltando) return; }
      else if(/^\d+\.\s/.test(l)) saltando = false;
      if(!saltando) out.push(l);
    });
    return out;
  }
  function quitar(d, id){
    var r = porId(id); if(!d || !r) return false;
    d.cooldown = quitarDeLista(Array.isArray(d.cooldown) ? d.cooldown : [], r.titulo);
    /* renumerado de los encabezados que quedan; un "1. Vuelta a la calma" que quedó solo se vuelve a ítems sueltos */
    var k = 0; d.cooldown = d.cooldown.map(function(l){ return /^\d+\.\s/.test(l) ? (++k) + '. ' + l.replace(/^\d+\.\s*/, '') : l; });
    if(k === 1 && d.cooldown[0] === '1. Vuelta a la calma') d.cooldown = d.cooldown.slice(1);
    d.cooldownNota = String(d.cooldownNota || '').split(/\s*\n\s*/).filter(function(x){ return x && x.indexOf(r.titulo + ':') !== 0; }).join('\n');
    d.mantenimiento = (d.mantenimiento || []).filter(function(x){ return x !== id; });
    return true;
  }

  /* ---------- UI: botón junto al Cool-down del día + modal del banco ---------- */
  function esc(t){ return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function css(){
    if(document.getElementById('bmCss')) return;
    var st = document.createElement('style'); st.id = 'bmCss';
    st.textContent =
      '.bm-bar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:6px}' +
      '.bm-bar .bm-tag{font-size:11px;padding:3px 9px;border-radius:999px;border:1px solid rgba(52,211,153,.45);color:#6EE7B7;background:rgba(52,211,153,.08)}' +
      '.bm-bar .bm-x{cursor:pointer;margin-left:4px;opacity:.7}' +
      '#bmModal{position:fixed;inset:0;z-index:9000;background:rgba(5,8,14,.72);display:flex;align-items:flex-start;justify-content:center;padding:4vh 12px;overflow:auto}' +
      '#bmModal .bm-box{width:min(880px,100%);background:#11151c;border:1px solid var(--line-2,#2a2f3a);border-radius:16px;padding:18px 18px 14px;color:var(--txt,#e8ecf2)}' +
      '#bmModal h3{margin:0 0 4px;font-size:17px}#bmModal .bm-sub{margin:0 0 12px;font-size:12.5px;color:var(--muted,#8b94a3);line-height:1.5}' +
      '#bmModal .bm-fil{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}' +
      '#bmModal .bm-f{cursor:pointer;padding:6px 11px;border-radius:999px;border:1px solid var(--line-2,#2a2f3a);background:transparent;color:var(--txt-2,#c3c9d3);font:600 12px/1 inherit;font-family:inherit}' +
      '#bmModal .bm-f.on{border-color:#34D399;color:#6EE7B7;background:rgba(52,211,153,.1)}' +
      '#bmModal .bm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}' +
      '#bmModal .bm-c{border:1px solid var(--line-2,#2a2f3a);border-radius:12px;padding:12px;background:rgba(255,255,255,.02);display:flex;flex-direction:column;gap:6px}' +
      '#bmModal .bm-c.sug{border-color:rgba(52,211,153,.6);box-shadow:0 0 0 1px rgba(52,211,153,.25) inset}' +
      '#bmModal .bm-c h4{margin:0;font-size:14px;display:flex;align-items:center;gap:6px}#bmModal .bm-c h4 small{margin-left:auto;font-size:11px;color:#6EE7B7;font-weight:700}' +
      '#bmModal .bm-c p{margin:0;font-size:12px;color:var(--muted,#8b94a3);line-height:1.45}' +
      '#bmModal .bm-c ul{margin:0;padding-left:16px;font-size:12px;line-height:1.5;color:var(--txt-2,#c3c9d3)}' +
      '#bmModal .bm-acts{display:flex;gap:6px;margin-top:auto;flex-wrap:wrap}' +
      '#bmModal .bm-sugtag{font-size:10.5px;font-weight:800;letter-spacing:.06em;color:#34D399;text-transform:uppercase}' +
      '#bmModal .bm-foot{display:flex;justify-content:flex-end;margin-top:12px}' +
      '@media(max-width:560px){#bmModal{padding:10px 8px}#bmModal .bm-box{padding:14px 12px}}';
    document.head.appendChild(st);
  }
  var filtro = '';
  function pintarModal(){
    var m = document.getElementById('bmModal'); if(!m) return;
    var p = (typeof plan === 'function' && S.activeId) ? plan(S.activeId) : null, di = (S.ui && S.ui.day) || 0, d = p && p.dias ? p.dias[di] : null;
    var sug = sugerir(p, di), ya = (d && d.mantenimiento) || [];
    var lista = RUTINAS.filter(function(r){ return !filtro || r.sector === filtro; }).slice().sort(function(a, b){
      var ia = sug.indexOf(a.id), ib = sug.indexOf(b.id); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    m.querySelector('.bm-fil').innerHTML = '<button type="button" class="bm-f' + (!filtro ? ' on' : '') + '" data-bmf="">Todas</button>' +
      SECTORES.map(function(s){ return '<button type="button" class="bm-f' + (filtro === s.k ? ' on' : '') + '" data-bmf="' + s.k + '">' + esc(s.lb) + '</button>'; }).join('');
    m.querySelector('.bm-grid').innerHTML = lista.map(function(r){
      var esSug = sug.indexOf(r.id) >= 0, puesta = ya.indexOf(r.id) >= 0;
      return '<div class="bm-c' + (esSug ? ' sug' : '') + '" data-bmid="' + r.id + '">' + (esSug ? '<span class="bm-sugtag">Sugerida para este día</span>' : '') +
        '<h4>' + r.icono + ' ' + esc(r.titulo) + '<small>' + minutos(r) + ' min</small></h4><p>' + esc(r.objetivo) + '</p>' +
        '<ul>' + r.items.map(function(i){ return '<li>' + esc(i[0]) + ' — ' + esc(i[1]) + '</li>'; }).join('') + '</ul>' +
        '<div class="bm-acts">' + (puesta
          ? '<button type="button" class="btn xs ghost" data-bmquitar="' + r.id + '">✕ Quitar del cierre</button>'
          : '<button type="button" class="btn xs gold" data-bmsumar="' + r.id + '">➕ Agregar al cierre del día</button><button type="button" class="btn xs ghost" data-bmreemp="' + r.id + '" title="Deja el cool-down solo con esta rutina">↺ Reemplazar el cool-down</button>') +
        '</div></div>';
    }).join('');
    var t = m.querySelector('.bm-dia'); if(t) t.textContent = d ? ((d.short || ('Día ' + (di + 1))) + (d.title ? ' · ' + d.title : '')) : '';
  }
  function abrir(){
    css();
    if(!S.activeId){ try{ toast('Elegí un alumno/a primero', 'warn'); }catch(e){} return; }
    var m = document.getElementById('bmModal');
    if(!m){
      m = document.createElement('div'); m.id = 'bmModal';
      m.innerHTML = '<div class="bm-box" role="dialog" aria-label="Body Maintenance"><h3>🧘 Body Maintenance · Stretching (5-10 min)</h3>' +
        '<p class="bm-sub">Cierres opcionales de movilidad y flexibilidad para el final de la sesión. Se suman al <b>Cool-Down</b> de <b class="bm-dia"></b>: no crean bloques ni cambian el entrenamiento principal, y el alumno/a los ve como su propia tarjeta al terminar.</p>' +
        '<div class="bm-fil"></div><div class="bm-grid"></div><div class="bm-foot"><button type="button" class="btn ghost" data-bmcerrar="1">Cerrar</button></div></div>';
      document.body.appendChild(m);
      m.addEventListener('click', function(e){
        if(e.target === m || e.target.closest('[data-bmcerrar]')){ m.remove(); return; }
        var f = e.target.closest('[data-bmf]'); if(f){ filtro = f.getAttribute('data-bmf'); pintarModal(); return; }
        var b = e.target.closest('[data-bmsumar],[data-bmreemp],[data-bmquitar]'); if(!b) return;
        var d = (typeof curDay === 'function') ? curDay() : null; if(!d) return;
        var id = b.getAttribute('data-bmsumar') || b.getAttribute('data-bmreemp') || b.getAttribute('data-bmquitar');
        if(window.CoachUndo && typeof CoachUndo.vigilar === 'function'){ try{ CoachUndo.vigilar('Body Maintenance'); }catch(eU){} }
        var r = porId(id);
        if(b.hasAttribute('data-bmquitar')){ quitar(d, id); toast('Body Maintenance quitado: ' + r.titulo); }
        else { insertar(d, id, b.hasAttribute('data-bmreemp') ? 'reemplazar' : 'sumar'); toast('🧘 ' + r.titulo + ' (' + minutos(r) + ' min) agregado al cierre del día'); }
        try{ save(); }catch(eS){} try{ renderBuilder(); }catch(eR){} pintarModal();
      });
    }
    pintarModal();
  }
  /* botón y etiquetas debajo del Cool-down de cada día (Sports y CrossFit) */
  function barra(){
    var ta = document.querySelector('#dayPanel textarea[data-df="cooldown"]'); if(!ta) return;
    css();
    var d = (typeof curDay === 'function') ? curDay() : null, ids = (d && d.mantenimiento) || [];
    var bar = ta.parentNode.querySelector('.bm-bar');
    if(!bar){ bar = document.createElement('div'); bar.className = 'bm-bar'; ta.parentNode.insertBefore(bar, ta.nextSibling); }
    bar.innerHTML = '<button type="button" class="btn xs" data-bmabrir="1" title="Rutinas de 5 a 10 minutos de movilidad y stretching por sector, para el cierre de la sesión">🧘 Body Maintenance</button>' +
      ids.map(function(id){ var r = porId(id); return r ? '<span class="bm-tag">' + r.icono + ' ' + esc(r.titulo) + ' · ' + minutos(r) + ' min<span class="bm-x" data-bmx="' + id + '" title="Quitar">✕</span></span>' : ''; }).join('');
  }
  document.addEventListener('click', function(e){
    var t = e.target; if(!t || !t.closest) return;
    if(t.closest('[data-bmabrir]')){ abrir(); return; }
    var x = t.closest('[data-bmx]');
    if(x){ var d = curDay(); if(d){ if(window.CoachUndo && CoachUndo.vigilar){ try{ CoachUndo.vigilar('Quitar Body Maintenance'); }catch(eU){} } quitar(d, x.getAttribute('data-bmx')); try{ save(); }catch(eS){} renderBuilder(); } }
  });
  var _rb = window.renderBuilder;
  if(typeof _rb === 'function'){
    window.renderBuilder = function(){ var r = _rb.apply(this, arguments); try{ barra(); }catch(e){ console.warn('body maintenance', e); } return r; };
  }
  window.CoachMantenimiento = { rutinas: RUTINAS, sectores: SECTORES, porId: porId, lineas: lineas, minutos: minutos, sugerir: sugerir, insertar: insertar, quitar: quitar, abrir: abrir };
})();
