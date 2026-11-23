/* =========================================================
   FICHA RÁPIDA DEL ALUMNO/A (Builder) + ALINEAR OBJETIVOS Y COACHING TIPS CON LA FICHA
   ---------------------------------------------------------
   · Arriba del día, una tarjeta compacta muestra lo que define la programación (género, nivel, objetivo, énfasis y restricciones) y se
     edita con un toque, sin abrir el modal grande ni salir del día. Escribe en los MISMOS campos de siempre (ath.genero, ath.nivel,
     ath.ficha.objetivo / enfasis, etiquetas «Molestia en …» de ath.tags), así la IA, la lectura del día y la app del alumno/a ven el cambio.
     «📋 Ficha completa» abre el modal de siempre.
   · Al cambiar la ficha aparece «Alinear objetivos y tips»:
       ⚙️ Motor local (instantáneo, todo el plan): cada bloque de trabajo recibe UNA oración en su objetivo fisiológico y UNA línea
          «TU FICHA:» en sus coaching tips (objetivo, nivel, prioridad de glúteo y cuidados por las restricciones de ESE bloque).
          Lo que se agrega queda registrado (b.jpFicha) y la próxima alineación reemplaza SOLO eso: el resto del texto (del Banco,
          de la IA o del coach) no se toca.
       ✨ IA (día actual): regenera objetivo y tips de cada bloque del día con la ficha nueva (los prompts ya la reciben), uno por uno,
          con avance y ⏹ para detener.
     Ediciones manuales: el objetivo o los tips que el coach escribió a mano en el Builder (b.jpMano) se respetan; un tilde permite
     incluirlos a propósito.
   API: window.CoachFichaRapida = { aplicarCambio, alinearLocal, fraseObjetivo, lineaTips, regenerarIA, detenerIA }
   ========================================================= */
(function(){
  'use strict';
  var OBJETIVOS = ['Hipertrofia', 'Fuerza', 'Recomposición corporal', 'Readaptación', 'Rendimiento'];
  var ENFASIS = ['Glúteo', 'Espalda', 'Pecho', 'Hombros', 'Brazos', 'Cuádriceps', 'Isquios', 'Core'];
  var ZONAS = ['Hombro', 'Rodilla', 'Lumbar', 'Cadera', 'Muñeca', 'Codo', 'Cuello', 'Tobillo'];
  var NIVELES = ['Inicial', 'Intermedio', 'Avanzado'];
  function nz(s){ return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }
  function esc(t){ return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  /* con varios objetivos manda el más específico (la hipertrofia es el más general) */
  var PRIORIDAD_OBJ = ['Readaptación', 'Recomposición corporal', 'Fuerza', 'Rendimiento', 'Hipertrofia'];
  function objetivoPrincipal(ath){ var l = objetivosDe(ath); return PRIORIDAD_OBJ.filter(function(o){ return l.indexOf(o) >= 0; })[0] || ''; }
  function objetivosDe(ath){ var f = (ath && ath.ficha) || {}; return [].concat(f.objetivo || []).filter(function(o){ return OBJETIVOS.indexOf(o) >= 0; }); }
  function zonasDe(ath){ return ZONAS.filter(function(z){ return (ath.tags || []).some(function(t){ return nz(t).indexOf(nz(z)) >= 0; }); }); }

  /* ---------- un cambio de la ficha (lo usa la tarjeta; también se puede llamar desde la consola o los tests) ---------- */
  function aplicarCambio(ath, campo, valor){
    if(!ath) return false;
    ath.ficha = ath.ficha || {};
    if(campo === 'genero') ath.genero = ath.genero === valor ? '' : valor;
    else if(campo === 'nivel') ath.nivel = valor;
    else if(campo === 'objetivo' || campo === 'enfasis'){
      var l = [].concat(ath.ficha[campo] || []), i = l.indexOf(valor);
      if(i >= 0) l.splice(i, 1); else l.push(valor);
      ath.ficha[campo] = l;
    } else if(campo === 'restriccion'){
      var z = nz(valor), tiene = (ath.tags || []).some(function(t){ return nz(t).indexOf(z) >= 0; });
      ath.tags = tiene ? (ath.tags || []).filter(function(t){ return nz(t).indexOf(z) < 0; }) : (ath.tags || []).concat(['Molestia en ' + valor.toLowerCase()]);
      var rz = ZONAS.filter(function(zz){ return (ath.tags || []).some(function(t){ return nz(t).indexOf(nz(zz)) >= 0; }); });
      if(rz.length) ath.ficha.restricciones = rz; else delete ath.ficha.restricciones;
    } else return false;
    pendiente[ath.id] = true;
    return true;
  }

  /* ---------- textos alineados con la ficha ---------- */
  var FRASE_OBJ = {
    'Hipertrofia': 'Para tu objetivo de hipertrofia, llegá cerca del fallo con técnica limpia y sumá repeticiones o carga semana a semana.',
    'Fuerza': 'Para tu objetivo de fuerza, priorizá la calidad de cada repetición y los descansos completos: la carga sube cuando la técnica se sostiene.',
    'Recomposición corporal': 'Para tu objetivo de recomposición, respetá los descansos y el RIR indicado: sostener la densidad suma gasto sin resignar músculo.',
    'Readaptación': 'Como estás en readaptación, el rango sin dolor manda: si aparece molestia, bajá la carga o el recorrido antes de seguir.',
    'Rendimiento': 'Pensando en tu rendimiento, subí con intención rápida y bajá con control: es fuerza que se transfiere a tu deporte.'
  };
  var CUE_OBJ = {
    'Hipertrofia': 'última serie cerca del fallo con técnica limpia',
    'Fuerza': 'descansos completos y repeticiones de calidad',
    'Recomposición corporal': 'descansos justos para sostener la densidad',
    'Readaptación': 'solo en rango sin dolor',
    'Rendimiento': 'intención rápida en la subida'
  };
  function estacionesDe(b){
    try{ if(window.CoachAuto && CoachAuto.tipsIA) return CoachAuto.tipsIA.estacionesBloque(b) || []; }catch(e){}
    return [];
  }
  function trabajaGluteo(est){ return est.some(function(e){ return e.ex && e.ex.grupo === 'Piernas/Glúteos' && (e.ex.patron === 'Cadera dominante' || e.ex.patron === 'Abducción / Aducción'); }); }
  function prioridadAlta(ath){ try{ return window.CoachLecturaDia && CoachLecturaDia.prioridadGluteo(ath).nivel === 'alta'; }catch(e){ return false; } }
  function fraseObjetivo(ath, b){
    var est = estacionesDe(b), obj = objetivoPrincipal(ath), partes = [];
    if(obj && FRASE_OBJ[obj]) partes.push(FRASE_OBJ[obj]);
    if(trabajaGluteo(est) && prioridadAlta(ath)) partes.push('Tu prioridad es el glúteo: buscá que empuje él en cada repetición, no la zona lumbar ni el cuádriceps.');
    else if(/inicial/.test(nz(ath.nivel))) partes.push('Como estás empezando, dejá dos repeticiones en reserva y priorizá aprender el movimiento.');
    return partes.slice(0, 2).join(' ');
  }
  function lineaTips(ath, b){
    var est = estacionesDe(b), obj = objetivoPrincipal(ath), cues = [];
    if(obj && CUE_OBJ[obj]) cues.push(CUE_OBJ[obj]);
    if(/inicial/.test(nz(ath.nivel))) cues.push('RIR 2 en todas las series mientras afianzás la técnica');
    else if(/avanzado/.test(nz(ath.nivel)) && obj !== 'Hipertrofia' && obj !== 'Readaptación') cues.push('la última serie puede ir a RIR 0 si la técnica se sostiene');
    if(trabajaGluteo(est) && prioridadAlta(ath)) cues.push('sentí el glúteo como motor del movimiento');
    /* cuidados por las restricciones de la ficha, solo de los ejercicios de ESTE bloque */
    var zonas = {};
    est.forEach(function(e){ if(!e.ex || typeof checkExercise !== 'function') return; checkExercise(ath, e.ex).forEach(function(a){ if(a.zonaLb) (zonas[a.zonaLb] = zonas[a.zonaLb] || []).push(e.ex.es); }); });
    Object.keys(zonas).forEach(function(z){ cues.push('cuidá ' + z.toLowerCase() + ' en ' + zonas[z].join(' y ') + ': rango sin dolor y, si molesta, bajá la carga o el recorrido'); });
    if(!cues.length) return '';
    var t = cues.join('; ');
    return 'TU FICHA: ' + t.charAt(0).toUpperCase() + t.slice(1) + '.';
  }
  function esTrabajo(b){
    return b && !(b.category === 'warmup' || b.modalidad === 'calentamiento') && b.modalidad !== 'movilidad' &&
      ((b.tipo === 'list' && b.sportsPizarra) || b.tipo === 'block' || b.tipo === 'superset');
  }
  /* reemplaza SOLO lo que agregó la alineación anterior; lo demás (Banco, IA, coach) queda igual */
  function alinearBloque(ath, b, forzar){
    var r = { o: false, t: false, manual: false };
    var prev = b.jpFicha || {}, mano = b.jpMano || {};
    var fo = fraseObjetivo(ath, b), lt = lineaTips(ath, b);
    if(!mano.o || forzar){
      var o = String(b.objective || '');
      if(prev.o && o.indexOf(prev.o) >= 0) o = o.replace(prev.o, '');
      o = o.replace(/\s{2,}/g, ' ').trim();
      var nuevo = fo ? (o ? o + ' ' + fo : fo) : o;
      if(nuevo !== String(b.objective || '')){ b.objective = nuevo; r.o = true; }
      prev.o = fo;
    } else r.manual = true;
    if(!mano.t || forzar){
      var ls = String(b.tips || '').split(/\r?\n/).filter(function(l){ return l.trim() && !(prev.t && l.trim() === prev.t) && !((!mano.t || forzar) && /^TU FICHA:/.test(l.trim())); });
      if(lt) ls.push(lt);
      var nt = ls.join('\n');
      if(nt !== String(b.tips || '')){ b.tips = nt; r.t = true; }
      prev.t = lt;
    } else r.manual = true;
    if(forzar) delete b.jpMano;
    b.jpFicha = prev;
    return r;
  }
  function alinearLocal(ath, p, opt){
    opt = opt || {};
    var res = { bloques: 0, objetivos: 0, tips: 0, respetados: 0 };
    if(!ath || !p) return res;
    if(window.CoachUndo && typeof CoachUndo.vigilar === 'function' && !opt.sinDeshacer){ try{ CoachUndo.vigilar('Alinear objetivos y tips con la ficha'); }catch(eU){} }
    (p.dias || []).forEach(function(d, di){
      if(opt.soloDia != null && di !== opt.soloDia) return;
      (d.bloques || []).forEach(function(b){
        if(!esTrabajo(b)) return;
        var r = alinearBloque(ath, b, !!opt.forzar);
        res.bloques++; if(r.o) res.objetivos++; if(r.t) res.tips++; if(r.manual) res.respetados++;
      });
    });
    delete pendiente[ath.id];
    return res;
  }

  /* ---------- IA: objetivo y tips del día actual, bloque por bloque, con ⏹ ---------- */
  var ia = { corriendo: false, ctrl: null, hechos: 0, total: 0, actual: '' };
  async function regenerarIA(forzar){
    if(ia.corriendo) return;
    var ath = active(), p = ath ? plan(ath.id) : null, d = (typeof curDay === 'function') ? curDay() : null;
    if(!ath || !p || !d) return;
    if(typeof jpIAListo === 'function' && !jpIAListo('regenerar objetivos y tips con la ficha')) return;
    var lista = (d.bloques || []).filter(function(b){ return b.tipo === 'list' && b.sportsPizarra && esTrabajo(b) && (forzar || !(b.jpMano && (b.jpMano.o || b.jpMano.t))); });
    if(!lista.length){ toast('No hay bloques de trabajo para regenerar en este día (o todos tienen texto propio)', 'info'); return; }
    if(window.CoachUndo && typeof CoachUndo.vigilar === 'function'){ try{ CoachUndo.vigilar('Regenerar objetivos y tips con IA (ficha)'); }catch(eU){} }
    ia = { corriendo: true, ctrl: (typeof AbortController === 'function') ? new AbortController() : null, hechos: 0, total: lista.length, actual: '' };
    pintar();
    var falla = null;
    for(var i = 0; i < lista.length; i++){
      if(ia.ctrl && ia.ctrl.signal.aborted) break;
      var b = lista[i]; ia.actual = b.titulo || ('Bloque ' + (i + 1)); pintar();
      var btn = { innerHTML: '', title: '', disabled: false, isConnected: false, dataset: {} };
      try{ await generarTipsSportsCore(b.id, btn, ia.ctrl ? ia.ctrl.signal : undefined, { silencioso: true }); }
      catch(e){ if(!(e && (e.cancelado || e.name === 'AbortError'))) falla = e; break; }
      if(ia.ctrl && ia.ctrl.signal.aborted) break;
      ia.hechos++;
    }
    var det = ia.ctrl && ia.ctrl.signal.aborted;
    ia.corriendo = false; ia.ctrl = null; delete pendiente[ath.id];
    try{ save(); }catch(eS){} try{ renderBuilder(); }catch(eR){}
    toast(det ? 'Regeneración detenida: ' + ia.hechos + ' de ' + ia.total + ' bloques quedaron con la ficha nueva' : (falla ? 'Se cortó en el bloque ' + (ia.hechos + 1) + ': ' + String(falla.message || falla).slice(0, 120) : '✨ ' + ia.hechos + ' bloques del día con objetivo y tips según la ficha'), det ? 'info' : (falla ? 'warn' : ''));
  }
  function detenerIA(){ if(ia.ctrl){ try{ ia.ctrl.abort(); }catch(e){} } }

  /* ---------- UI ---------- */
  var pendiente = {}, abierta = false, forzar = false;
  function css(){
    if(document.getElementById('frCss')) return;
    var st = document.createElement('style'); st.id = 'frCss';
    st.textContent =
      '#jpFichaRapida .fr-card{margin:0 0 12px;padding:10px 14px;border:1px solid var(--line-2,#2a2f3a);border-radius:12px;background:rgba(255,255,255,.02)}' +
      '#jpFichaRapida .fr-res{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:12.5px}' +
      '#jpFichaRapida .fr-res b{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#FF8A4D;margin-right:4px}' +
      '#jpFichaRapida .fr-t{padding:3px 9px;border-radius:999px;border:1px solid var(--line-2,#2a2f3a);color:var(--txt-2,#c3c9d3);font-size:11.5px}' +
      '#jpFichaRapida .fr-t.warn{border-color:rgba(224,101,74,.6);color:#F0A08C}#jpFichaRapida .fr-t.vacio{border-style:dashed;color:var(--muted,#8b94a3)}' +
      '#jpFichaRapida .fr-acts{margin-left:auto;display:flex;gap:6px}' +
      '#jpFichaRapida .fr-ed{margin-top:10px;display:grid;gap:8px}' +
      '#jpFichaRapida .fr-g{display:flex;flex-wrap:wrap;align-items:center;gap:6px}#jpFichaRapida .fr-g > span{flex:0 0 96px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted,#8b94a3)}' +
      '#jpFichaRapida .fr-c{cursor:pointer;padding:6px 11px;border-radius:999px;border:1px solid var(--line-2,#2a2f3a);background:transparent;color:var(--txt-2,#c3c9d3);font:600 12px/1 inherit;font-family:inherit}' +
      '#jpFichaRapida .fr-c.on{background:rgba(255,85,0,.14);border-color:#FF5500;color:#FF8A4D}#jpFichaRapida .fr-c.on.warn{background:rgba(224,101,74,.14);border-color:#E0654A;color:#F0A08C}' +
      '#jpFichaRapida .fr-al{margin-top:10px;padding:10px 12px;border-radius:10px;border:1px solid rgba(0,229,255,.35);background:rgba(0,229,255,.05);display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:12.5px}' +
      '#jpFichaRapida .fr-al p{margin:0;flex:1 1 260px;line-height:1.45}#jpFichaRapida .fr-al label{font-size:11.5px;color:var(--muted,#8b94a3);display:flex;align-items:center;gap:5px}' +
      '@media(max-width:640px){#jpFichaRapida .fr-g > span{flex-basis:100%}#jpFichaRapida .fr-acts{margin-left:0}}';
    document.head.appendChild(st);
  }
  function chip(campo, valor, on, warn){ return '<button type="button" class="fr-c' + (on ? ' on' : '') + (warn ? ' warn' : '') + '" data-frc="' + campo + '" data-frv="' + esc(valor) + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + esc(valor) + '</button>'; }
  function pintar(){
    var vol = document.getElementById('volCard'); if(!vol || !vol.parentNode) return;
    var cont = document.getElementById('jpFichaRapida');
    if(!cont){ cont = document.createElement('div'); cont.id = 'jpFichaRapida'; vol.parentNode.insertBefore(cont, vol); }
    var ath = (typeof active === 'function') ? active() : null, p = ath ? plan(ath.id) : null;
    if(!ath || !p){ cont.innerHTML = ''; return; }
    css();
    var f = ath.ficha || {}, obj = objetivosDe(ath), enf = [].concat(f.enfasis || []), zs = zonasDe(ath), gen = String(ath.genero || '').toUpperCase().charAt(0);
    var t = function(txt, cls){ return '<span class="fr-t' + (cls ? ' ' + cls : '') + '">' + esc(txt) + '</span>'; };
    var h = '<div class="fr-card"><div class="fr-res"><b>👤 Ficha</b>' +
      t(gen === 'F' ? 'Mujer' : (gen === 'M' ? 'Varón' : 'Género sin definir'), gen ? '' : 'vacio') + t(ath.nivel || 'Nivel sin definir', ath.nivel ? '' : 'vacio') +
      (obj.length ? obj.map(function(o){ return t(o); }).join('') : t('Objetivo sin definir', 'vacio')) +
      (enf.length ? t('Énfasis: ' + enf.join(', ')) : '') + (zs.length ? t('Cuidar: ' + zs.join(', '), 'warn') : '') +
      '<span class="fr-acts"><button type="button" class="btn xs" data-frtoggle="1">' + (abierta ? '▴ Listo' : '✏️ Editar rápido') + '</button><button type="button" class="btn xs ghost" data-frfull="1" title="Abre la ficha completa del alumno/a">📋 Ficha completa</button></span></div>';
    if(abierta){
      h += '<div class="fr-ed">' +
        '<div class="fr-g"><span>Género</span>' + chip('genero', 'F', gen === 'F').replace('>F<', '>Mujer<') + chip('genero', 'M', gen === 'M').replace('>M<', '>Varón<') + '</div>' +
        '<div class="fr-g"><span>Nivel</span>' + NIVELES.map(function(n){ return chip('nivel', n, ath.nivel === n); }).join('') + '</div>' +
        '<div class="fr-g"><span>Objetivo</span>' + OBJETIVOS.map(function(o){ return chip('objetivo', o, obj.indexOf(o) >= 0); }).join('') + '</div>' +
        '<div class="fr-g"><span>Énfasis</span>' + ENFASIS.map(function(o){ return chip('enfasis', o, enf.indexOf(o) >= 0); }).join('') + '</div>' +
        '<div class="fr-g"><span>Restricciones</span>' + ZONAS.map(function(z){ return chip('restriccion', z, zs.indexOf(z) >= 0, true); }).join('') + '</div></div>';
    }
    if(ia.corriendo){
      h += '<div class="fr-al"><p>✨ Regenerando con IA: bloque ' + (ia.hechos + 1) + ' de ' + ia.total + (ia.actual ? ' · ' + esc(ia.actual) : '') + '</p><button type="button" class="btn xs" data-frstop="1">⏹ Detener</button></div>';
    } else if(pendiente[ath.id]){
      h += '<div class="fr-al"><p><b>La ficha cambió.</b> Alineá los objetivos fisiológicos y los coaching tips con la ficha nueva: el motor local suma una oración y una línea «TU FICHA» en cada bloque del plan (sin tocar el resto del texto); la IA reescribe los bloques de este día.</p>' +
        '<label><input type="checkbox" data-frforzar="1"' + (forzar ? ' checked' : '') + '> incluir textos escritos a mano</label>' +
        '<button type="button" class="btn xs gold" data-fralin="1">⚙️ Alinear todo el plan</button><button type="button" class="btn xs" data-fria="1">✨ Regenerar este día con IA</button><button type="button" class="btn xs ghost" data-frdesc="1">Ahora no</button></div>';
    }
    cont.innerHTML = h + '</div>';
  }
  document.addEventListener('change', function(e){ var c = e.target && e.target.closest && e.target.closest('[data-frforzar]'); if(c) forzar = c.checked; });
  document.addEventListener('click', function(e){
    var t = e.target; if(!t || !t.closest || !t.closest('#jpFichaRapida')) return;
    var ath = active(); if(!ath) return;
    if(t.closest('[data-frtoggle]')){ abierta = !abierta; pintar(); return; }
    if(t.closest('[data-frfull]')){ if(typeof openAth === 'function') openAth(ath.id); return; }
    if(t.closest('[data-frstop]')){ detenerIA(); return; }
    if(t.closest('[data-frdesc]')){ delete pendiente[ath.id]; pintar(); return; }
    if(t.closest('[data-fralin]')){
      var r = alinearLocal(ath, plan(ath.id), { forzar: forzar });
      try{ save(); }catch(eS){} renderBuilder();
      toast('⚙️ Ficha aplicada en ' + r.bloques + ' bloques (' + r.objetivos + ' objetivos y ' + r.tips + ' tips actualizados)' + (r.respetados ? ' · ' + r.respetados + ' con texto propio respetado' : ''));
      return;
    }
    if(t.closest('[data-fria]')){ regenerarIA(forzar); return; }
    var c = t.closest('[data-frc]');
    if(c){
      if(window.CoachUndo && typeof CoachUndo.vigilar === 'function'){ try{ CoachUndo.vigilar('Editar ficha rápida'); }catch(eU){} }
      if(aplicarCambio(ath, c.getAttribute('data-frc'), c.getAttribute('data-frv'))){ try{ save(); }catch(eS){} renderBuilder(); }
    }
  });
  /* guardar la ficha completa (modal) también ofrece alinear */
  var _save = window.saveAth;
  if(typeof _save === 'function'){
    window.saveAth = function(){
      var id = (typeof editAthId !== 'undefined') ? editAthId : null, a0 = id ? getAth(id) : null;
      var antes = a0 ? JSON.stringify([a0.genero, a0.nivel, a0.tags, a0.ficha && a0.ficha.objetivo, a0.ficha && a0.ficha.enfasis, a0.foco]) : null;
      var r = _save.apply(this, arguments);
      try{ var a1 = id ? getAth(id) : null; if(a1 && antes !== JSON.stringify([a1.genero, a1.nivel, a1.tags, a1.ficha && a1.ficha.objetivo, a1.ficha && a1.ficha.enfasis, a1.foco])){ pendiente[a1.id] = true; renderBuilder(); } }catch(e){}
      return r;
    };
  }
  var _rb = window.renderBuilder;
  if(typeof _rb === 'function'){
    window.renderBuilder = function(){ var r = _rb.apply(this, arguments); try{ pintar(); }catch(e){ console.warn('ficha rápida', e); } return r; };
  }
  window.CoachFichaRapida = { aplicarCambio: aplicarCambio, alinearLocal: alinearLocal, fraseObjetivo: fraseObjetivo, lineaTips: lineaTips, regenerarIA: regenerarIA, detenerIA: detenerIA, pendiente: function(id){ return !!pendiente[id]; } };
})();
