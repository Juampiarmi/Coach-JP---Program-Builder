/* =========================================================
   DATA MODEL — inyectado desde el Dashboard Coach JP
========================================================= */
const PROGRAM_CONFIG = {{PROGRAM_CONFIG_JSON}};
const WEEKS_META = PROGRAM_CONFIG.weeks;
/* Nomenclatura de periodización de las 4 semanas (solo lo que se muestra: el plan guardado del alumno no se modifica). CrossFit conserva sus nombres. */
(function(){
  try{
    var NOM = ['Bloque A · Acumulación Base (Volumen útil)', 'Bloque B · Sobrecarga Progresiva (RIR ajustado)', 'Bloque C · Intensificación Máxima (Pico de RPE)', 'Bloque D · Descarga Funcional (Deload & Supercompensación)'];
    if(PROGRAM_CONFIG.modoSemanal || !Array.isArray(WEEKS_META)) return;
    WEEKS_META.forEach(function(w, i){ if(w && i < NOM.length){ if(w.faseOriginal === undefined) w.faseOriginal = w.phase; w.phase = NOM[i]; } });
  }catch(e){}
})();
const VIDEO_MAP = PROGRAM_CONFIG.videoMap;
const DAYS = PROGRAM_CONFIG.days;
/* 10/09 -- CONCORDANCIA DE GÉNERO: PROGRAM_CONFIG.genero llega 'F'/'M'/''
   desde la ficha del alumno/a en el Builder (#aGenero, ver saveAth()).
   generoTxt(masc, fem) devuelve la forma que corresponde; sin dato
   cargado ('' o ausente) se mantiene la forma masculina, que es la que
   ya usaba toda la app antes de esta directiva -- así ningún atleta sin
   el campo cargado ve un cambio de texto. Queda como función global (no
   adentro de un IIFE de módulo) para que cualquier módulo del archivo
   compilado la pueda usar sin depender de orden de carga. Deliberadamente
   NO hay detección automática de género por nombre de pila: adivinar
   género a partir de un nombre no es confiable y puede terminar
   misgenerizando al alumno/a -- el selector explícito del Builder es la
   única fuente de verdad. */
function generoTxt(masc, fem){
  return (PROGRAM_CONFIG.genero === 'F') ? fem : masc;
}
/* 10/09 -- disclaimer nutricional único para todo el lado del alumno/a
   (nutriCard() de la sesión + pestaña de Nutrición). El Builder tiene su
   propia copia textual idéntica (NUTRI_DISCLAIMER, junto a AJUSTE) porque
   TEMPLATE_HTML se compila como documento aparte y no puede importar esa
   constante -- misma redacción en los dos lugares, a mano. */
const NUTRI_DISCLAIMER_TXT = 'Contenido educativo y orientativo: guías de macronutrientes, timing ' +
  'nutricional e hidratación en el marco del entrenamiento. No constituye diagnóstico ni ' +
  'prescripción dietoterápica clínica — el rol del coach de fuerza es formativo, no médico. ' +
  'Ante patologías, alergias no declaradas, trastornos de la conducta alimentaria o cualquier ' +
  'condición de salud, consultá con un/a nutricionista o médico/a matriculado/a.';
function weekDetail(block, weekIdx){
  const wm = WEEKS_META[weekIdx];
  let efSets = block.efSets;
  let approxSets = block.approxSets || 0;
  if(wm.deload){
    efSets = Math.max(1, Math.ceil(efSets/2));
    if(approxSets > 0) approxSets = Math.max(1, approxSets - 1);
  }
  const setsLabel = block.hasApprox ? (approxSets + ' aprox. + ' + efSets + ' Ef.') : (efSets + ' Ef.');
  const failNote = (wm.fail && block.failCapable) ? ' · última serie a FALLO TÉCNICO CONTROLADO' : '';
  return { setsLabel: setsLabel, text: block.exerciseName + ' — ' + setsLabel + ' x ' + block.reps + ' (' + wm.rpe + failNote + ') · Tempo ' + block.tempo + ' · Descanso ' + block.restSeconds + 's', efSets: efSets, approxSets: approxSets };
}
function supersetDetail(block, weekIdx){
  const wm = WEEKS_META[weekIdx];
  let rounds = block.efSets;
  if(wm.deload) rounds = Math.max(1, Math.ceil(rounds/2));
  const failNote = (wm.fail && block.failCapable) ? ' · última ronda al fallo técnico controlado' : '';
  return {
    header: (block.isTriset ? 'TRISET' : 'BISET') + ' · ' + rounds + ' RONDAS · ' + wm.rpe + failNote,
    exercises: block.exercises,
    rounds: rounds
  };
}
function finisherDetail(block, weekIdx){
  if(!block.roundsByWeek || !block.roundsByWeek[weekIdx]) return null;
  return { roundsText: block.roundsByWeek[weekIdx], exercises: block.exercises };
}
function hyroxDetail(block, weekIdx){
  const wm = WEEKS_META[weekIdx];
  const movements = (block.movements || []).filter(function(m){ return m != null && String(m).trim() !== ''; });
  return { minutes: wm.amrapMinutes, movements: movements, note: wm.hyroxNote };
}
const CATEGORY_META = {
  warmup:{ cls:'bi-warmup', labelCls:'bl-warmup', insightsCls:'insights-warmup' },
  strength:{ cls:'bi-strength', labelCls:'bl-strength', insightsCls:'insights-strength' },
  metcon:{ cls:'bi-metcon', labelCls:'bl-metcon', insightsCls:'insights-metcon' },
  cardio:{ cls:'bi-cardio', labelCls:'bl-cardio', insightsCls:'insights-cardio' },
  accessory:{ cls:'bi-accessory', labelCls:'bl-accessory', insightsCls:'insights-accessory' },
  endurance:{ cls:'bi-cardio', labelCls:'bl-cardio', insightsCls:'insights-cardio' }
};
function limpiarNombre(n){
  let t = String(n||'').trim();
  t = t.replace(/^\s*(?:[A-Za-z]\d+\s*[.:)\-\u2013\u2014\u00b7]+\s*|\d+\s*[.)]\s+)/, '');      /* "A1. " / "B2) " / "1. " */
  /* saca prefijos tipo "Fase 1 · " o "Block A: " para encontrar mejor el video */
  const p1 = t.split(' · ');
  if(p1.length > 1 && p1[0].length <= 26) t = p1.slice(1).join(' · ');
  const p2 = t.split(': ');
  if(p2.length > 1 && p2[0].length <= 22) t = p2.slice(1).join(': ');
  t = t.replace(/\s*\(.*?\)\s*$/, '');
  /* saca reps, cargas y unidades para que la búsqueda quede sobre el movimiento */
  t = t.replace(/^\s*\d+\s*[\-–]?\s*\d*\s*(reps?|cals?|m|km|metros?|seg|s)?\s+/i, '');
  t = t.replace(/\s*@.*$/, '');
  t = t.replace(/\s*[\d\.]+\s*\/\s*[\d\.]+\s*kg.*$/i, '');
  t = t.replace(/\s*x\s*\d+.*$/i, '');
  t = t.replace(/\s*[\-–—]\s*$/, '');
  t = t.split(',')[0];                                   /* "Power cleans, construyendo…" → "Power cleans" */
  const w = t.trim().split(/\s+/);
  if(w.length > 6) t = w.slice(0, 6).join(' ');
  return t.trim();
}
/* líneas que son estructura del entrenamiento, no ejercicios: no llevan link de video.
   directiva ("Purga y refinamiento del Glosario Técnico") -- "8 minutos"/
   "WARM-UP ESPECÍFICO"/"Calentamiento" colaban acá porque el filtro sólo
   conocía vocabulario de CrossFit (rest/amrap/emom/score/...); ninguna de
   sus alternativas cubría los títulos/duraciones genéricas que un
   calentamiento de Sports redacta en prosa. Se suman esas palabras
   (siempre ancladas al INICIO de la línea, mismo criterio ya usado acá
   para "rest"/"amrap"/etc., admitiendo un número + espacio adelante para
   "8 minutos"/"30 segundos"). */
const NO_VIDEO = /^(\s*[-–—]|min\s*\d+\s*[:\-]?\s*$|rest\b|descans|x\s*\d+\s*(sets?|rondas?|rounds?)|\d+\s*(sets?|rondas?|rounds?)\b|amrap\b|emom\b|every\s*\d|for\s*time|cap\b|elite\s*:|rx\+?\s*:|int(ermediate|ermedio)?\s*:|scaled\s*:|target|notas?\b|luego\b|then\b|despu[eé]s\b|objetivo\b|score\b|\(|\d+\s*$|\d*\s*(minutos?|segundos?)\b|warm.?up|calentamiento\b|movilidad\b|activaci[oó]n\b|enfriamiento\b|vuelta a la calma\b)/i;
function esEstructura(t){
  const s = String(t || '').trim();
  if(!s) return true;
  if(NO_VIDEO.test(s)) return true;
  if(/[:：]\s*$/.test(s)) return true;          /* encabezado de formato */
  if(s.split(/\s+/).length > 12) return true;   /* frase larga = indicación, no ejercicio */
  if(!/[a-záéíóúñ]/i.test(s)) return true;
  return false;
}
/* =========================================================
   COACH JP v3.0 · MATCHER INTELIGENTE DE VIDEOS
   Normaliza el nombre (tildes, signos, prefijos "01." / "Fase 1 ·" /
   "Block A:", sufijos "x 10-12 reps", "@ 2110") y busca coincidencia
   exacta y parcial en VIDEO_MAP y en el cat\u00e1logo de la biblioteca.
========================================================= */
const VIDEO_LIB = (PROGRAM_CONFIG && PROGRAM_CONFIG.videoLib) || {};
function nrmVid(t){
  return String(t == null ? '' : t)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')      /* tildes */
    .toLowerCase()
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, ' ')
    .replace(/^\s*\d+\s*[.)\-\u2013]\s*/, '')             /* "01." / "3)" */
    .replace(/^\s*(fase|bloque|block|parte|serie|estacion|station)\s*[a-z0-9]*\s*[:\u00b7\-\u2013]\s*/i, '')
    .replace(/\s*[@]\s*[\d\/xX\s\-]+$/, '')                /* "@ 2110" */
    .replace(/\s*[x\u00d7]\s*\d+\s*[\-\u2013]?\s*\d*\s*(reps?|rep|seg|s|min|cal|m)?\s*$/i, '')
    .replace(/\s*\d+\s*[\-\u2013]\s*\d+\s*(reps?|seg|s|min|cal|m)?\s*$/i, '')
    .replace(/\s*\b(tempo|rpe|rir)\b.*$/i, '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/[^a-z0-9\u00f1\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
var _vidIdx = null;
function vidIndex(){
  if(_vidIdx) return _vidIdx;
  _vidIdx = { exacto: {}, claves: [] };
  var fuentes = [VIDEO_MAP || {}, VIDEO_LIB || {}];
  fuentes.forEach(function(m){
    Object.keys(m || {}).forEach(function(k){
      var id = m[k]; if(!id) return;
      [k, limpiarNombre(k)].forEach(function(v){
        var n = nrmVid(v);
        if(n && !_vidIdx.exacto[n]){ _vidIdx.exacto[n] = id; _vidIdx.claves.push(n); }
      });
    });
  });
  _vidIdx.claves.sort(function(a, b){ return b.length - a.length; });
  return _vidIdx;
}
/* singular/plural del último token ("deadlifts"->"deadlift",
   "squats"->"squat") -- nunca toca una palabra que ya termina en doble
   "s" ("press") para no destrozarla. Sigue siendo un match EXACTO del
   resto de la clave, muy distinto (y mucho más seguro) del fallback por
   contención de más abajo: "low hang power snatch" nunca "pasa a"
   "hang power snatch" por esta vía, sólo se tolera la "s" final. */
function nrmVidSingular(t){
  return String(t || '').replace(/([a-z])s\b/gi, function(m, prev){ return prev.toLowerCase() === 's' ? m : prev; });
}
function buscarVideo(name, soloDirecto){
  var idx = vidIndex();
  var directo = VIDEO_MAP[name] || VIDEO_MAP[String(name || '').trim()];
  if(directo) return directo;
  var candidatos = [nrmVid(name), nrmVid(limpiarNombre(name))];
  for(var i = 0; i < candidatos.length; i++){
    var n = candidatos[i];
    if(n && idx.exacto[n]) return idx.exacto[n];
  }
  /* directiva (fix de videos en Warm-up/Corework/Accesorios) -- tolerancia
     de plural: "Banded deadlifts" (texto del coach) vs "Banded Deadlift"
     (nombre exacto en la biblioteca) no matcheaban por la "s" final --
     mismo criterio EXACTO de arriba, sólo que sobre la forma singular. */
  for(var s = 0; s < candidatos.length; s++){
    var ns = nrmVidSingular(candidatos[s]);
    if(ns && ns !== candidatos[s] && idx.exacto[ns]) return idx.exacto[ns];
  }
  /* directiva (rediseño "Clips Técnicos del Bloque" de la Pizarra
     CrossFit): soloDirecto corta acá, antes del fallback de abajo --
     ese fallback por coincidencia parcial era la causa real de variantes
     mal vinculadas ("low hang power snatch" heredando el video de "hang
     power snatch", "muscle snatch" el de "snatch"): un nombre que
     CONTIENE a otro no es necesariamente el mismo movimiento. Los Clips
     del bloque sólo deben mostrar un match directo/exacto (mismo criterio
     estricto que ya usa el chip "Video vinculado" del Builder). El resto
     de la app (Bodybuilding, warmup/cooldown, biset) sigue exactamente
     igual, con el fallback aproximado que ya tenía. */
  if(soloDirecto) return null;
  /* coincidencia parcial: gana la clave m\u00e1s larga contenida en el nombre */
  for(var j = 0; j < candidatos.length; j++){
    var t = candidatos[j];
    if(!t || t.length < 4) continue;
    for(var k = 0; k < idx.claves.length; k++){
      var c = idx.claves[k];
      if(c.length < 4) break;
      /* contencion por palabras completas: "arm" ya no engancha "warm up" ni "arm bar" */
      if(t === c || (' ' + t + ' ').indexOf(' ' + c + ' ') >= 0 || ((' ' + c + ' ').indexOf(' ' + t + ' ') >= 0 && t.length >= 5)) return idx.exacto[c];
    }
  }
  return null;
}
/* directiva ("Fallback inteligente" de Videos Técnicos) -- si una
   variante puntual como "Low hang power snatch" no tiene video propio
   en la biblioteca, en vez de omitirla se prueba el movimiento
   benchmark de base sacando UNA palabra calificadora a la vez desde el
   principio de la frase ("hang power snatch" -> "power snatch" ->
   "snatch"), probando un match EXACTO (buscarVideo con soloDirecto) en
   cada paso -- nunca una coincidencia parcial/por contención (ese
   fallback fue el que causó variantes mal vinculadas en una directiva
   anterior, ver comentario de soloDirecto en buscarVideo() más arriba).
   Sacar sólo la PRIMERA palabra a la vez reproduce exactamente la
   jerarquía Low Hang Power Snatch -> Hang Power Snatch -> Power Snatch
   -> Snatch que pide la directiva, deteniéndose en el primer nivel que
   sí tenga video cargado. */
function jpVideoFallbackBenchmark(nombre){
  var palabras = String(nombre || '').trim().split(/\s+/);
  for(var corte = 1; corte < palabras.length; corte++){
    var candidato = palabras.slice(corte).join(' ');
    if(candidato.length < 3) break;
    if(/^(?:press|curl|row|raise|raises|fly|flye|extension|pull|push)$/i.test(candidato)) continue;      /* "Push Press" no se reduce a "Press" (banca plana) */
    var ytid = buscarVideo(candidato, true);
    if(ytid) return ytid;
  }
  return null;
}
function videoLinkHtml(name){
  const key = (name||'').trim();
  if(!key) return '';
  if(esEstructura(key)) return '';
  /* window.__jpSinVideo (módulo "v4.1") ya no recibe true desde compile()
     para pizarras de CrossFit (ver buildProgramConfig) -- se deja el
     chequeo por si algún caller viejo todavía lo setea a mano. */
  if(window.__jpSinVideo) return '';
  const ytid = buscarVideo(key);
  /* trigger con thumbnail real (28/08, Fase 3 · Sección 03 pto.5): el modal
     y el iframe NO cambian, solo el disparador — antes un ícono circular
     chico, ahora una miniatura real de YouTube (mqdefault.jpg, mismo ID que
     ya usa el iframe) con el triángulo superpuesto. Si la miniatura no
     carga (privado/borrado), el fondo translúcido de abajo queda como
     estaba antes — el botón nunca se rompe visualmente. */
  if(ytid) return ' <a class="video-link jp-play has-thumb" href="javascript:void(0)" data-yt="' + ytid + '" ' +
    'style="background-image:url(https://img.youtube.com/vi/' + ytid + '/mqdefault.jpg)" ' +
    'title="Ver la t\u00e9cnica" aria-label="Ver la t\u00e9cnica de ' + key.replace(/"/g,'') + '">' +
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.2v13.6L19 12z"/></svg></a>';
  /* FIX (auditoría Karina Dantur): sin match en la biblioteca -- el ID
     puede estar roto o el ejercicio renombrado/borrado. Nunca se deja el
     nombre sin ninguna vía de acceso al video: acceso directo de búsqueda
     en YouTube con el nombre ya guardado, en vez de un ícono ausente.
     Reutiliza .vsearch, la clase de fallback que ya existía en el CSS
     (~línea 8915) pero que había quedado sin ningún generador conectado. */
  return ' <a class="video-link jp-play vsearch" href="https://www.youtube.com/results?search_query=' +
    encodeURIComponent(key + ' t\u00e9cnica ejercicio') + '" target="_blank" rel="noopener noreferrer" ' +
    'title="Buscar t\u00e9cnica en YouTube" aria-label="Buscar t\u00e9cnica de ' + key.replace(/"/g,'') + ' en YouTube">' +
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.2v13.6L19 12z"/></svg><span class="mag">\ud83d\udd0d</span></a>';
}
/* Micro-badge "EN" (2026-09, refinamiento visual): el nombre en inglés del
   ejercicio ya no se muestra pegado al español en la cabecera -- compile()
   lo manda aparte (block.exerciseNameEn / x.nameEn) y esta cápsula táctil
   lo deja a un toque de distancia sin ocupar espacio de título. Toque =
   toggle de una mini burbuja (::after, lee data-en) en vez de :hover, que
   no existe en el celular del alumno. */
function enBadgeHtml(en){
  if(!en) return '';
  /* escapado propio: esta función vive en el ámbito superior de la app
     exportada, sin un esc() global compartido (cada módulo abajo define
     el suyo local dentro de su propia IIFE) -- se evita esa dependencia
     para no atarse al orden de carga de los scripts. */
  var safe = String(en).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  return ' <button type="button" class="ex-en-badge" data-en="' + safe +
    '" aria-label="Nombre en ingl\u00e9s: ' + safe + '">EN</button>';
}
(function(){
  document.addEventListener('click', function(e){
    var b = e.target.closest && e.target.closest('.ex-en-badge');
    document.querySelectorAll('.ex-en-badge.on').forEach(function(el){
      if(el !== b) el.classList.remove('on');
    });
    if(b){ b.classList.toggle('on'); e.stopPropagation(); e.preventDefault(); }
  }, true);
})();
window.buscarVideo = buscarVideo;
/* CoachRepaintBus — shim local para esta app exportada (standalone).
   Los módulos de este documento llaman window.CoachRepaintBus.register(fn, target)
   asumiendo el mismo bus que existe en el dashboard del coach, pero esta página
   compilada corre en un documento aparte (ver brief del proyecto: TEMPLATE_HTML
   no comparte scope con index.html) — sin este shim, cada .register() lanzaba
   "Cannot read properties of undefined" al cargar. Misma implementación/API,
   solo que vive acá también. */
if(!window.CoachRepaintBus){
  window.CoachRepaintBus = (function(){
    const registry = new Map();
    return {
      register(fn, target){
        const node = target || document.getElementById('mainContent') || document.body;
        let entry = registry.get(node);
        if(!entry){
          entry = { handlers: [] };
          entry.observer = new MutationObserver(muts => {
            for(let i = 0; i < entry.handlers.length; i++){
              try{ entry.handlers[i](muts); }catch(e){ console.warn('CoachRepaintBus handler', e); }
            }
          });
          entry.observer.observe(node, { childList:true, subtree:true, characterData:true });
          registry.set(node, entry);
        }
        entry.handlers.push(fn);
      }
    };
  })();
}
/* =========================================================
   STATE
========================================================= */
const STORAGE_KEY = '{{STORAGE_KEY}}';
/* Bug preexistente: este flag quedaba fijo en 'sports' en TODO documento
   compilado, sin importar la disciplina real del plan -- eso apagaba en
   silencio la Pizarra Táctica (gate de pizarra() más abajo) y el botón de
   Vista Musculación/CrossFit para cualquier atleta de CrossFit ya exportado.
   Se deriva del mismo flag que ya calcula bien buildProgramConfig() en el
   Builder (PROGRAM_CONFIG.modoSemanal); en Sports sigue siendo 'sports'
   exactamente igual que antes, cero cambio de comportamiento. */
window.COACH_DISCIPLINA = PROGRAM_CONFIG.modoSemanal ? 'crossfit' : 'sports';
/* fondo de alto rendimiento (micro-dot matrix) exclusivo de CrossFit -- ver
   body.cf-disc en el <style> final del documento. Se marca acá (una sola
   vez, apenas se conoce la disciplina) en vez de depender de body.cf-modo,
   que sólo se activa en días 100% CrossFit y nunca en días híbridos. */
if(window.COACH_DISCIPLINA !== 'sports') document.body.classList.add('cf-disc');
/* estilo de tarjeta de ejercicio que el coach fijó en el Showroom (1 Clean Tech · 2 High-Performance · 4 Compacto de élite; el 3 se descartó; el 4 es el estilo por defecto): lo aplica el atributo data-jp-estilo del body */
window.jpEstiloTarjeta = function(n){ n = parseInt(n, 10); if(!(n === 1 || n === 2 || n === 4)) n = 4; document.body.setAttribute('data-jp-estilo', String(n)); return n; };
try{ window.jpEstiloTarjeta(PROGRAM_CONFIG.estiloTarjeta); }catch(eEst){ document.body.setAttribute('data-jp-estilo', '4'); }
/* historialCargas (directiva "Memoria de Cargas Históricas"): índice por
   nombre de ejercicio (normalizado) -> {kg, reps, ts}, independiente de
   semana/día/bloque (a diferencia de state.loads, que vive atado a un
   set puntual). Clave nueva, aditiva -- planes/atletas viejos sin este
   campo siguen funcionando exactamente igual, arranca vacío. */
/* oneRM (directiva "Resolución activa de % 1RM a kilogramos"): índice
   por nombre de ejercicio (normalizado, misma clave que historialCargas)
   -> kg, cargado por el propio atleta desde la Pizarra CrossFit (tocar
   el "@ 76%" de una fila) -- gana siempre sobre la marca del coach que
   compile() ya haya resuelto en el texto, para recalcular todo el
   bloque al instante con el 1RM real del día. Clave nueva, aditiva. */
const state = { mode:'complete', currentWeek:0, currentDay:(DAYS[0]||{}).id, completed:{}, fatigue:{}, loads:{}, notes:{}, scores:{}, session:{}, checkout:{}, restSec:90, sleep:{}, readinessPain:{}, videoLinks:{}, sesionNotificada:{}, historialCargas:{}, oneRM:{}, customBenchmarks:[], rirEx:{}, rir:{}, dolor:{} };
let timerCounter = 0;
const liveTimers = {};
let activeTimerId = null;
/* Equipamiento por NOMBRE del ejercicio: 'banda' (banda elastica), 'bw' (peso corporal declarado) o '' (carga real: barra, mancuernas,
   kettlebell, maquina, polea, disco...). El casillero de kg se reserva para '' -- en 'banda' y 'bw' solo van reps / tiempo / notas.
   Cualquier palabra de carga real gana: "sentadilla con barra y bandas" o "dominadas con lastre" siguen pidiendo kg. */
var JP_RX_CARGA_EQ = /(?:^|\s)(?:con barra|barra (?:olimpica|z|ez|recta|hexagonal)|barbell|mancuernas?|dumbbells?|db|kettlebells?|kb|polea|poleas|cables?|maquina|machine|smith|multipower|discos?|plates?|landmine|trap bar|hex bar|trineo|sled|sandbag|saco|wall ?balls?|balon medicinal|medball|lastre|lastrad[oa]s?|weighted|chaleco|con peso|asistid[oa]s?|assisted|jalon|pec deck|contractora|prensa|hack)(?=\s|$)/;
var JP_RX_BANDA_EQ = /(?:^|\s)(?:bandas?|bands?|banded|elastic[oa]s?|theraband|miniband|mini bands?|resistance bands?|tubing)(?=\s|$)/;
var JP_RX_BW_EQ = /(?:^|\s)(?:peso corporal|bodyweight|body weight|bw|sin peso|sin carga|autocarga|calistenia|calisthenics)(?=\s|$)/;
function jpClasificarEquipo(nombre){
  var n = String(nombre == null ? '' : nombre).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  if(!n) return '';
  if(JP_RX_CARGA_EQ.test(n)) return '';
  if(JP_RX_BANDA_EQ.test(n)) return 'banda';
  if(JP_RX_BW_EQ.test(n)) return 'bw';
  return '';
}
window.jpClasificarEquipo = jpClasificarEquipo;
/* ultima posicion del alumno (semana + dia): clave propia, se escribe en el acto al navegar (no depende del guardado diferido del progreso,
   que el sistema puede matar antes de ejecutarse) */
function jpGuardarPosicion(){
  try{ localStorage.setItem(STORAGE_KEY + ':pos', JSON.stringify({ w: state.currentWeek, d: state.currentDay, t: Date.now() })); }catch(e){}
}
function jpLeerPosicion(){
  try{ var p = JSON.parse(localStorage.getItem(STORAGE_KEY + ':pos') || 'null'); return (p && typeof p === 'object') ? p : null; }catch(e){ return null; }
}
/* un campo guardado que no sea un objeto (dato viejo o dañado) se trata como vacío: el resto de la app asume objetos */
function _objOk(v){ return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}; }
function loadProgress(){
  let raw = null;
  try{
    raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      if(parsed && typeof parsed === 'object' && !Array.isArray(parsed)){
        state.completed = _objOk(parsed.completed);
        state.fatigue = _objOk(parsed.fatigue);
        state.loads = _objOk(parsed.loads);
        state.notes = _objOk(parsed.notes);
        state.checkout = _objOk(parsed.checkout);
        state.sleep = _objOk(parsed.sleep);
        state.readinessPain = _objOk(parsed.readinessPain);
        state.videoLinks = _objOk(parsed.videoLinks);
        /* sesionNotificada (28/08, feed de actividad): guarda qué días ya
           encolaron su evento "sesión completa", para no reenviarlo en
           cada visita al mismo día ya terminado — ver pintarResumen() más
           abajo. Clave nueva, no pisa ni reinterpreta ninguna de arriba. */
        state.sesionNotificada = _objOk(parsed.sesionNotificada);
        state.historialCargas = _objOk(parsed.historialCargas);
        state.oneRM = _objOk(parsed.oneRM);
        state.customBenchmarks = Array.isArray(parsed.customBenchmarks) ? parsed.customBenchmarks : [];
        /* RIR que el alumno marca por ejercicio (alimenta la doble progresión de la semana siguiente) y RIR / dolor por bloque: antes no se guardaban y se perdían al recargar */
        state.rirEx = _objOk(parsed.rirEx); state.rir = _objOk(parsed.rir); state.dolor = _objOk(parsed.dolor);
        if(parsed.mode === 'complete' || parsed.mode === 'quick') state.mode = parsed.mode;
        if(typeof parsed.currentWeek === 'number' && WEEKS_META[parsed.currentWeek]) state.currentWeek = parsed.currentWeek;
      }
    }
  }catch(e){
    /* JSON dañado: se conserva una copia intacta (clave ":corrupto") antes de que el próximo guardado la pise, y se arranca limpio */
    try{ if(raw) localStorage.setItem(STORAGE_KEY + ':corrupto', raw); }catch(e2){}
    state.completed = {}; state.fatigue = {}; state.loads = {}; state.notes = {}; state.checkout = {}; state.sleep = {}; state.readinessPain = {}; state.videoLinks = {}; state.sesionNotificada = {}; state.historialCargas = {}; state.oneRM = {}; state.customBenchmarks = []; state.rirEx = {}; state.rir = {}; state.dolor = {};
  }
}
let _spT = null, _spDirty = false, _spFallos = 0, _spAvisado = false;
function _spReintentar(){
  _spDirty = true; _spFallos++;
  if(_spFallos >= 3 && !_spAvisado){
    _spAvisado = true;
    try{ if(window.CoachAviso && window.CoachAviso.mostrar) window.CoachAviso.mostrar('fatiga', '⚠️', 'No se pudo guardar tu progreso', 'El teléfono no deja escribir en el almacenamiento (puede estar lleno). Liberá espacio o cerrá otras pestañas: lo registrado sigue en pantalla y se reintenta solo.', 12000); }catch(e){}
  }
  clearTimeout(_spT);
  _spT = setTimeout(function(){ try{ _spFlush(); }catch(e){} }, Math.min(15000, 2000 * _spFallos));
}
function _spSerialize(){
  return JSON.stringify({ completed: state.completed, fatigue: state.fatigue, loads: state.loads, notes: state.notes, checkout: state.checkout, sleep: state.sleep, readinessPain: state.readinessPain, videoLinks: state.videoLinks, mode: state.mode, currentWeek: state.currentWeek, sesionNotificada: state.sesionNotificada, historialCargas: state.historialCargas, oneRM: state.oneRM, customBenchmarks: state.customBenchmarks, rirEx: state.rirEx, rir: state.rir, dolor: state.dolor });
}
function _spFlush(){
  if(!_spDirty) return;
  /* directiva (timer en segundo plano persistente): esto pisaba TODO el
     blob de localStorage con sólo los campos de "state" -- cualquier
     campo aparte que otro módulo hubiera guardado en la misma clave
     (ej. restTimer, agregado más abajo para que el descanso sobreviva
     a un cierre real de la app) desaparecía cada vez que este flush
     corría, y corre justo en pagehide/visibilitychange:hidden -- el
     instante exacto en que background timer más lo necesita. Pasa a
     mezclar sobre lo que ya había en vez de reemplazarlo entero. */
  try{
    let raw = {};
    try{ raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); if(!raw || typeof raw !== 'object' || Array.isArray(raw)) raw = {}; }
    catch(eP){
      /* lo guardado está dañado: se conserva una copia antes de reemplazarlo por el estado en memoria */
      try{ if(!localStorage.getItem(STORAGE_KEY + ':corrupto')) localStorage.setItem(STORAGE_KEY + ':corrupto', localStorage.getItem(STORAGE_KEY) || ''); }catch(eC){}
      raw = {};
    }
    Object.assign(raw, JSON.parse(_spSerialize()));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
    _spDirty = false; _spFallos = 0;
  }catch(e){ _spReintentar(); }
}
function saveProgress(){
  _spDirty = true;
  clearTimeout(_spT);
  _spT = setTimeout(function(){
    if(typeof requestIdleCallback === 'function') requestIdleCallback(_spFlush, { timeout: 500 });
    else setTimeout(_spFlush, 0);
  }, 1100);
}
window.addEventListener('pagehide', function(){ _spFlush(); });
window.addEventListener('beforeunload', function(){ _spFlush(); });
document.addEventListener('visibilitychange', function(){ if(document.visibilityState === 'hidden') _spFlush(); });
document.addEventListener('freeze', function(){ _spFlush(); });
function isBlockDone(weekIdx, dayId, blockId){
  return !!(state.completed[weekIdx] && state.completed[weekIdx][dayId] && state.completed[weekIdx][dayId][blockId]);
}
function setBlockDone(weekIdx, dayId, blockId, val){
  state.completed[weekIdx] = state.completed[weekIdx] || {};
  state.completed[weekIdx][dayId] = state.completed[weekIdx][dayId] || {};
  state.completed[weekIdx][dayId][blockId] = val;
  /* al destildar un bloque el día deja de estar concluido (antes quedaba "hecho" con un bloque sin hacer) */
  if(!val && state.completed[weekIdx][dayId].__dayDone) state.completed[weekIdx][dayId].__dayDone = false;
  saveProgress();
}
function isDayDone(weekIdx, dayId){
  return !!(state.completed[weekIdx] && state.completed[weekIdx][dayId] && state.completed[weekIdx][dayId].__dayDone);
}
function setDayDone(weekIdx, dayId, val, blockIds){
  state.completed[weekIdx] = state.completed[weekIdx] || {};
  state.completed[weekIdx][dayId] = state.completed[weekIdx][dayId] || {};
  state.completed[weekIdx][dayId].__dayDone = val;
  blockIds.forEach(function(bid){ state.completed[weekIdx][dayId][bid] = val; });
  saveProgress();
}
/* =========================================================
   REGISTRO DE CARGAS (Kg / Reps / check por serie)
========================================================= */
/* 12vo pedido (26/08) — AUDITORÍA DE INPUTS: <input type="number"> rechaza la
   coma como separador decimal en la mayoría de los navegadores (el spec de
   HTML solo reconoce el punto, sin importar el locale del dispositivo) — un
   alumno argentino que escribe "87,5" ve que la coma directamente no se
   tipea, o termina con el campo vacío/sin guardar. Los campos de carga
   pasan de type="number" a type="text" (mismo teclado numérico en celular
   vía inputmode="decimal"/"numeric") y se sanean acá a mano: dígitos + un
   solo separador (coma o punto, siempre normalizado a punto), hasta 3
   enteros y 2 decimales para peso, hasta 3 dígitos enteros para reps —
   así el .value que terminan leyendo setLoadField()/parseFloat() en el
   resto del archivo siempre es un número limpio, sin tocar esos otros
   puntos de lectura. */
function sanearPeso(v){
  v = String(v == null ? '' : v).replace(',', '.').replace(/[^0-9.]/g, '');
  const partes = v.split('.');
  const ent = (partes[0] || '').slice(0, 3);
  if(partes.length < 2) return ent;
  const dec = partes.slice(1).join('').slice(0, 2);
  return ent + '.' + dec;
}
function sanearReps(v){
  return String(v == null ? '' : v).replace(/[^0-9]/g, '').slice(0, 3);
}
function getLoadKey(weekIdx, dayId, blockId, exIdx, setIdx){
  return weekIdx + '|' + dayId + '|' + blockId + '|' + exIdx + '|' + setIdx;
}
/* misma normalización que usa el módulo de PR (Training View, _nrm) --
   duplicada acá en el ámbito superior porque renderSetRows() vive afuera
   de esa IIFE: ambas deben coincidir letra por letra para que la clave
   que graba registrarHistorial() sea la misma que lee ultimoHistorial(). */
function nrmHist(s){
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}
function ultimoHistorial(nombreEx){
  const hk = nrmHist(nombreEx);
  return hk ? (state.historialCargas[hk] || null) : null;
}
function getLoad(key){ return state.loads[key] || {}; }
/* "2,5" y "2.5" son el mismo número (nunca "25"); fmtJP los muestra siempre con punto */
function numJP(v){ var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : 0; }
function fmtJP(n){ return String(Math.round(n * 100) / 100); }
/* una serie del reporte: se omite si quedó en 0 reps (no hay trabajo efectivo) */
function lineaSetWA(i, ld){
  var kg = numJP(ld.kg), reps = numJP(ld.reps);
  return '  \u2022 Serie ' + i + ': ' + (kg > 0 ? fmtJP(kg) + ' kg \u00d7 ' : '') + fmtJP(reps) + ' reps';
}
/* directiva maestra ("HUD de telemetría en vivo: tonelaje acumulado de
   sesión") -- suma kg*reps de TODA serie tildada (done===true) en el
   día/semana activos, leyendo directo de state.loads (misma fuente de
   verdad que ya usa el resto de la app, cero cálculo paralelo). Las
   claves de state.loads son "weekIdx|dayId|blockId|exIdx|setIdx" (ver
   getLoadKey más arriba) -- filtrar por el prefijo "weekIdx|dayId|"
   basta para aislar sólo el día/semana que el alumno tiene abiertos
   ahora mismo, sin tocar el resto del historial guardado. */
/* TONELAJE · UN SOLO CRITERIO PARA TODA LA APP
   Tonelaje de una serie = kg × repeticiones realmente hechas, solo si la serie está tildada (✓) y es trabajo de carga:
     · reps "12+4+3" (Myo-Reps / Rest-Pause) suman todos los tramos; un rango "8-10" toma el primer número
     · ejercicios UNILATERALES ("por pierna" / "por lado"): se registran las reps de UN lado, pero la carga se movió con los dos: cuentan por 2
     · fuera: series sin kilos o sin reps, ejercicios medidos en metros / segundos / minutos, bandas, acarreos y trineo (kg × metros no es tonelaje)
   Tonelaje de un día = suma de sus series, contando solo los bloques que existen HOY en ese día (el progreso guardado puede traer restos de un plan anterior
   con el mismo id de día). Lo usan el HUD en vivo, el resumen de sesión, el reporte al coach, la Story Card, el historial y el reporte del mesociclo. */
var JP_RX_ACARREO = /\b(carry|carries|transporte|farmer|maleta|suitcase|trineo|sled|prowler|caminata|paseo)\b/i;
var JP_RX_UNILATERAL = /\b(unilateral|a una pierna|una pierna|single[\s-]?leg|one[\s-]?leg|single[\s-]?arm|one[\s-]?arm|un brazo|b[uú]lgara|bulgarian|split squat|pistol)\b/i;
function jpRepsReales(v){
  var s = String(v == null ? '' : v).replace(',', '.').trim();
  if(/^\d+(\.\d+)?(\s*\+\s*\d+(\.\d+)?)+$/.test(s)) return s.split('+').reduce(function(a, x){ return a + (parseFloat(x) || 0); }, 0);
  return numJP(s);
}
function jpTonelajeSerie(ld){
  if(!ld || !ld.done) return 0;
  var kg = numJP(ld.kg), reps = jpRepsReales(ld.reps);
  if(!(kg > 0) || !(reps > 0)) return 0;
  if(ld.u && ld.u !== 'reps') return 0;                          /* el ejercicio se prescribió en metros / segundos / minutos */
  var nm = String(ld.ex || '');
  if(nm){
    var mo = ''; try{ if(typeof window.jpModoInput === 'function') mo = window.jpModoInput(nm); }catch(eM){}
    if(mo === 'tiempo' || mo === 'solo' || mo === 'banda') return 0;
    if(JP_RX_ACARREO.test(nm)) return 0;
  }
  var lados = (ld.uni || (nm && JP_RX_UNILATERAL.test(nm))) ? 2 : 1;
  return kg * reps * lados;
}
function jpTonelajeDia(weekIdx, day){
  if(!day) return 0;
  var pref = weekIdx + '|' + day.id + '|', validos = {}, hay = false;
  ((day && day.blocks) || []).forEach(function(b){ if(b && b.id != null){ validos[b.id] = 1; hay = true; } });
  var total = 0;
  Object.keys(state.loads || {}).forEach(function(k){
    if(k.indexOf(pref) !== 0) return;
    if(hay && !validos[k.split('|')[2]]) return;
    total += jpTonelajeSerie(state.loads[k]);
  });
  return isFinite(total) ? Math.round(total) : 0;
}
function calcularTonelajeSesion(){
  var day = (typeof getCurrentDay === 'function') ? getCurrentDay() : null;
  return day ? jpTonelajeDia(state.currentWeek, day) : 0;
}
var _tonelajeAnimId = null, _tonelajeActual = 0, _tonelajeMostrado = 0, _tonelajeFinT = null;
function _tonFmt(n){ return Number(n || 0).toLocaleString('es-AR'); }
/* odómetro de 300ms (directiva: "transición rápida (300ms)") + destello
   dorado tenue -- reactivo desde setLoadField() de acá abajo, así que
   cubre check/uncheck Y edición manual de kg o reps en el mismo tick. */
function actualizarTonelajeHUD(){
  var hud = document.getElementById('jpTonelajeHud'); var val = document.getElementById('jpTonelajeVal');
  if(!hud || !val) return;
  var nuevo = calcularTonelajeSesion();
  /* el cálculo real se publica en el acto: la píldora superior del día y cualquier otro lector usan ESTE número, nunca el que está a mitad de la animación */
  try{ val.setAttribute('data-kg', String(nuevo)); document.dispatchEvent(new CustomEvent('jp:tonelaje', { detail: { kg: nuevo } })); }catch(eEv){}
  if(nuevo === _tonelajeActual && val.textContent === _tonFmt(nuevo)){ return; }
  _tonelajeActual = nuevo;
  clearTimeout(_tonelajeFinT);
  /* garantía: pase lo que pase con la animación (cancelada por otro tildado, pestaña lenta u oculta) el número termina SIEMPRE en el total real */
  _tonelajeFinT = setTimeout(function(){
    if(_tonelajeAnimId){ cancelAnimationFrame(_tonelajeAnimId); _tonelajeAnimId = null; }
    val.textContent = _tonFmt(_tonelajeActual); _tonelajeMostrado = _tonelajeActual;
  }, 420);
  var desde = _tonelajeMostrado;
  /* directiva maestra ("HUD de telemetría en vivo") -- requestAnimationFrame
     se suspende por completo en una pestaña/documento oculto (throttling
     estándar de todo navegador moderno, para ahorrar batería): si el
     alumno tildó el set justo cuando la app pasó a segundo plano (o el
     entorno de test la tiene oculta), la animación jamás dispararía y el
     número quedaría trabado en el valor viejo. Salto directo al valor
     final sin animar en ese caso -- nunca se pierde el dato, sólo el
     efecto visual del odómetro, que de todos modos nadie está mirando
     mientras la pantalla está apagada/oculta. */
  if(document.hidden){
    val.textContent = _tonFmt(nuevo);
    _tonelajeMostrado = nuevo;
    hud.classList.add('jp-tonelaje-flash');
    clearTimeout(hud._tonelajeFlashT);
    hud._tonelajeFlashT = setTimeout(function(){ hud.classList.remove('jp-tonelaje-flash'); }, 320);
    return;
  }
  var t0 = null, dur = 300;
  if(_tonelajeAnimId) cancelAnimationFrame(_tonelajeAnimId);
  function frame(ts){
    if(t0 === null) t0 = ts;
    var p = Math.min(1, (ts - t0) / dur);
    var v = Math.round(desde + (nuevo - desde) * p);
    val.textContent = _tonFmt(v); _tonelajeMostrado = v;
    if(p < 1){ _tonelajeAnimId = requestAnimationFrame(frame); }
    else{ _tonelajeAnimId = null; _tonelajeMostrado = nuevo; }
  }
  _tonelajeAnimId = requestAnimationFrame(frame);
  hud.classList.remove('jp-tonelaje-flash');
  void hud.offsetWidth; /* fuerza reflow para poder re-disparar la animación en tildes consecutivos */
  hud.classList.add('jp-tonelaje-flash');
  clearTimeout(hud._tonelajeFlashT);
  hud._tonelajeFlashT = setTimeout(function(){ hud.classList.remove('jp-tonelaje-flash'); }, 320);
}
function setLoadField(key, field, value){
  state.loads[key] = state.loads[key] || {};
  if(field === 'kg' || field === 'reps') value = (typeof value === 'string') ? value.replace(/,/g, '.') : value;
  state.loads[key][field] = value;
  /* sello de tiempo: permite mostrarle al alumno cuándo hizo esa serie */
  state.loads[key].ts = Date.now();
  if(field === 'done'){ if(value){ if(!state.loads[key].tsDone) state.loads[key].tsDone = state.loads[key].ts; } else { delete state.loads[key].tsDone; } }
  saveProgress();
  /* directiva maestra ("HUD de telemetría en vivo") -- recalcula SIEMPRE
     que kg/reps/done cambian (tildar, destildar o corregir un valor ya
     cargado), nunca sólo al tildar -- así el tonelaje jamás queda
     desactualizado si el alumno corrige una serie después de cerrarla. */
  if(field === 'kg' || field === 'reps' || field === 'done'){
    try{ actualizarTonelajeHUD(); }catch(e){}
  }
}
function renderSetRows(weekIdx, dayId, blockId, exIdx, numSets, repsHint, sugKg, nombreEx, blockLabel, refSemanaAnterior){
  /* parser de unidades: si la prescripción de esta estación ya viene en
     distancia/tiempo ("20 metros", "30 seg", "400m"), el segundo input
     no debe seguir etiquetado "Reps" -- se adapta a la unidad real.
     Directiva "casilleros dinámicos": mira nombre Y prescripción (antes
     sólo miraba repsHint -- "Farmer carry" avisa por el NOMBRE, no
     siempre trae metros en el detalle). */
  const nm = String(nombreEx || '');
  const rh = String(repsHint || '');
  const bl = String(blockLabel || '');
  let repsPlaceholder = 'Reps';
  if(/\bcarry\b/i.test(nm) || /\d\s*(metros?|km|m)\b/i.test(rh) || /\d\s*(metros?|km|m)\b/i.test(nm)) repsPlaceholder = 'm';
  else if(/\d\s*(segundos?|seg|minutos?|min|s)\b/i.test(rh)) repsPlaceholder = 'seg';
  /* FASE 2.4 -- fallback táctico: numSets llega en 0/NaN cuando el
     ejercicio no tiene series cargadas (dato viejo, importación
     incompleta, o el coach todavía escribiendo) -- antes esto pintaba un
     .set-tracker VACÍO (el for de abajo nunca entraba), un ejercicio
     "mudo" sin ningún casillero para registrar nada. Nunca se debe
     mostrar así: se fuerza UNA fila de ejecución operativa (Set 1,
     target "Libre / Fallo" en vez de un número inventado) para que el
     alumno siempre tenga dónde cargar lo que hizo, sea cual sea la
     prescripción real. */
  const numSetsInt = parseInt(numSets, 10) || 0;
  /* el defecto real que reporta la auditoría (193024) es la RESISTENCIA
     LIBRE -- reps vacío ("" o null): efSets ya llega con un mínimo de 1
     puesto más arriba (weekDetail), así que numSetsInt<=0 casi nunca
     ocurre en la práctica. sinReps sólo cambia el placeholder de cada
     fila (nunca inventa un número de series que el coach no cargó);
     sinFilas es el caso extremo -- ninguna serie en absoluto -- y es lo
     único que fuerza a un mínimo de 1 fila para que el bloque no quede
     mudo. */
  const sinReps = !String(repsHint || '').trim();
  const sinFilas = numSetsInt <= 0;
  const sinDosisReal = sinReps || sinFilas;
  if(sinDosisReal) repsPlaceholder = 'Libre / Fallo';
  /* bandas/peso corporal: el estímulo lo da la tensión de la banda o el
     propio peso, no un número de Kg real -- se oculta ese casillero y
     queda sólo Reps, centrado. Sólo mira el NOMBRE (no la prescripción)
     para no deshabilitar el campo por accidente en un ejercicio con
     barra que mencione un peso en el detalle. */
  /* mismo criterio que la pizarra (jpClasificarEquipo): bandas elasticas (singular/plural) y peso corporal declarado, salvo que el nombre traiga carga real */
  const esBanda = /\b(banda|band|el[aá]stica|bw|bodyweight)\b/i.test(nm) || jpClasificarEquipo(nm) !== '';
  /* supresión de Kg en Core/abdominales (directiva): estos ejercicios se
     miden en reps o tiempo, nunca en Kg -- ni siquiera cuando llevan algo
     de lastre, ese dato no es lo que el coach quiere trackear semana a
     semana acá. Se detecta por el NOMBRE del ejercicio (lista cerrada de
     patrones de Core) o por la etiqueta del BLOQUE ("Core"/"Zona Media"),
     esta última pasada aparte en blockLabel porque acá sólo se recibe el
     nombre del ejercicio puntual. */
  const esCore = /\b(plank|rollout|flutter|dead\s*bug|hollow|crunch|ab\s*wheel|pallof|twist|v-?up|sit-?up)\b/i.test(nm) ||
    /\b(core|zona\s*media)\b/i.test(bl);
  const ocultaKg = esBanda || esCore;
  /* claridad mancuernas (directiva): "15 kg" es ambiguo -- ¿una mancuerna
     o las dos sumadas? El label/placeholder aclaran que es POR MANO; el
     número que el alumno tipea se guarda y se usa igual que cualquier
     otro Kg (PR hub, %1RM, sugerencia de carga de la semana siguiente),
     sin multiplicarlo por 2 en ningún lado -- convención unitaria
     consistente en todo el sistema, para no arriesgar los históricos de
     carga ya guardados de los atletas reales con una duplicación oculta. */
  const esMancuerna = /\b(mancuernas?|dumbbell|db)\b/i.test(nm);
  let html = '<div class="set-tracker">';
  /* directiva de rediseño: marca la primera serie sin completar como
     "activa" para darle escala numérica destacada (kg/reps más grandes) --
     puramente visual, se calcula sobre state.loads ya leído más abajo
     (ld.done), no agrega ni cambia ningún dato. */
  let activaMarcada = false;
  const numSetsEfectivo = sinFilas ? 1 : numSetsInt;
  for(let i=1;i<=numSetsEfectivo;i++){
    const key = getLoadKey(weekIdx, dayId, blockId, exIdx, i);
    const ld = getLoad(key);
    /* 09/09 -- MOTOR DE PROGRESION SEMANAL ENTRE MICROCICLOS: si el alumno
       todavía no cargó nada para ESTA semana en esta estación/serie
       puntual, se precarga con un valor sugerido -- y se GUARDA de una
       (no es sólo un placeholder visual): así, si el alumno confía en el
       número y sólo toca el check, el dato real queda persistido igual.
       Nunca pisa un valor que el alumno ya haya cargado esta semana.
       Prioridad de la sugerencia de Kg: (1) el target por %1RM/carga base
       del bloque -- el mismo número que ya muestra el badge .load-suggest,
       calculado afuera y pasado acá en sugKg -- si no hay, (2) lo que el
       alumno efectivamente levantó la semana pasada en esta MISMA
       estación y serie (S-1). Las reps sugeridas son siempre lo
       ejecutado en S-1 (el objetivo programado suele ser un rango tipo
       "10-12", no sirve para precargar un número exacto). */
    let kgVal = ld.kg, repsVal = ld.reps, sugerido = false;
    /* directiva ("Feature exclusiva Sports & Bodybuilding: Referencia de
       Carga Semana a Semana"): pizarraSports() pasa refSemanaAnterior=true
       -- en vez de precargar Y GUARDAR de una el kg/reps de la semana
       anterior (comportamiento de siempre, ver comentario original más
       abajo, sin cambios para quien NO pasa este flag), acá sólo se
       calcula prevLd para mostrar un micro-badge táctico y dejar el kg
       previo como PLACEHOLDER visible -- el alumno decide si lo confirma
       tipeando/tildando, nunca queda un dato de esta semana persistido
       sin que él lo haya cargado. CrossFit nunca pasa este flag (pizarra()
       de CF no llama renderSetRows en absoluto), así que esta rama es
       inalcanzable para CrossFit. */
    let prevRefKg = null, prevRefReps = null;
    if(refSemanaAnterior){
      if(weekIdx > 0){
        const prevLd = getLoad(getLoadKey(weekIdx - 1, dayId, blockId, exIdx, i));
        if(prevLd.kg != null && prevLd.kg !== '') prevRefKg = prevLd.kg;
        if(prevLd.reps != null && prevLd.reps !== '') prevRefReps = prevLd.reps;
      }
    } else if(!ocultaKg && (kgVal == null || kgVal === '') && weekIdx > 0){
      const prevLd = getLoad(getLoadKey(weekIdx - 1, dayId, blockId, exIdx, i));
      const kgPrev = (prevLd.kg != null && prevLd.kg !== '') ? prevLd.kg : null;
      const kgSug = (sugKg && sugKg > 0) ? sugKg : kgPrev;
      if(kgSug != null){ kgVal = kgSug; setLoadField(key, 'kg', kgVal); sugerido = true; }
      if((repsVal == null || repsVal === '') && prevLd.reps != null && prevLd.reps !== ''){
        repsVal = prevLd.reps; setLoadField(key, 'reps', repsVal); sugerido = true;
      }
    } else if(ocultaKg && (repsVal == null || repsVal === '') && weekIdx > 0){
      const prevLd = getLoad(getLoadKey(weekIdx - 1, dayId, blockId, exIdx, i));
      if(prevLd.reps != null && prevLd.reps !== ''){ repsVal = prevLd.reps; setLoadField(key, 'reps', repsVal); sugerido = true; }
    }
    /* pedido 41: Kg/×/Reps/✓ viven ahora agrupados en .set-load, un
       sub-contenedor flex propio con flex-wrap:nowrap -- así, si algún
       día no entran junto a la etiqueta "Serie N" en la misma línea,
       el grupo entero baja de línea COMO UNIDAD (nunca se separa el
       check de los inputs, que era el bug reportado en "Press
       Guillotina"). .set-row en sí sigue con flex-wrap:wrap (pedido 40,
       más abajo) porque .jp-hist todavía necesita su propia línea. */
    let claseActiva = '';
    if(!ld.done && !activaMarcada){ claseActiva = ' set-row-active'; activaMarcada = true; }
    /* directiva de rediseño F (v2): resumen compacto server-side para la
       fila cuando está colapsada (no activa, no expandida a mano) --
       "62.5×10" si ya tiene carga, "—" si todavía no. Se calcula acá
       porque acá es donde ya están kgVal/repsVal resueltos (sugeridos o
       reales); el CSS decide cuándo mostrar esto vs. los inputs reales,
       nunca se lee/escribe un dato nuevo. */
    const resumenCompacto = ocultaKg
      ? (repsVal != null && repsVal !== '' ? (repsVal + ' ' + repsPlaceholder.toLowerCase()) : '\u2014')
      : ((kgVal != null && kgVal !== '' && repsVal != null && repsVal !== '')
        ? (kgVal + '\u00d7' + repsVal) : '\u2014');
    /* Core/abdominales (directiva): cuando la prescripción es por tiempo
       ("30 seg", "45s", '30"'), la etiqueta chica del campo de Reps pasa
       a decir "SEGUNDOS / TIEMPO" en vez de "seg" -- más claro para el
       alumno que ese número no son repeticiones. Sólo aplica a Core (las
       bandas siguen con su etiqueta habitual m/seg/reps). */
    const esTiempo = /seg|\d\s*s\b|"/i.test(rh);
    const repsUnitLabel = (esCore && esTiempo) ? 'SEGUNDOS / TIEMPO' : repsPlaceholder.toLowerCase();
    /* directiva "Memoria de Cargas Históricas": chip sutil "Último: X kg"
       sólo en la Serie 1, sólo cuando todavía no hay un valor cargado ni
       sugerido para este set (nunca pisa la sugerencia por %1RM/semana
       anterior, que ya tiene prioridad más arriba) -- clickeable, autocompleta
       el casillero de Kg sin forzar nada que el alumno no haya elegido. */
    let historialChipHtml = '';
    if(!ocultaKg && i === 1 && (kgVal == null || kgVal === '')){
      const hReg = ultimoHistorial(nm);
      if(hReg && hReg.kg > 0){
        historialChipHtml = '<button type="button" class="set-hist-chip" data-hist-kg="' + hReg.kg + '">\u21a9 \u00daltimo: <b>' + hReg.kg + ' kg</b></button>';
      }
    }
    /* directiva ("Referencia de Carga Semana a Semana"): micro-badge
       "S{N-1}: {kg}kg × {reps}" -- sólo existe cuando refSemanaAnterior
       vino en true (exclusivo pizarraSports(), ver arriba) y hay un dato
       real de la semana anterior para ESTE mismo bloque/estación/serie. */
    let refBadgeHtml = '';
    if(refSemanaAnterior && (prevRefKg != null || prevRefReps != null)){
      const refTxt = (prevRefKg != null ? prevRefKg + 'kg' : '') +
        (prevRefKg != null && prevRefReps != null ? ' \u00d7 ' : '') +
        (prevRefReps != null ? prevRefReps : '');
      refBadgeHtml = '<span class="set-ref-badge">S' + weekIdx + ': ' + refTxt + '</span>';
    }
    const kgPlaceholder = (refSemanaAnterior && (kgVal == null || kgVal === '') && prevRefKg != null)
      ? String(prevRefKg)
      : (esMancuerna ? 'Por mano (ej: 15)' : 'Kg');
    html += '<div class="set-row' + (ld.done?' set-row-done':'') + (sugerido?' set-row-sug':'') + claseActiva + (ocultaKg?' set-row-banda':'') + '" data-set-key="' + key + '">' +
      '<button type="button" class="set-row-toggle" aria-label="Ver serie ' + i + '">' +
        '<span class="set-row-label">Serie ' + i + '</span>' +
        '<span class="set-row-compact">' + resumenCompacto + '</span>' +
      '</button>' +
      (refBadgeHtml ? '<div class="set-hist-row">' + refBadgeHtml + '</div>' : (historialChipHtml ? '<div class="set-hist-row">' + historialChipHtml + '</div>' : '')) +
      '<div class="set-load' + (ocultaKg?' set-load-banda':'') + '">' +
        /* bandas/peso corporal y Core/abdominales: sin casillero de Kg --
           el estímulo no se mide en un número de carga real (ver
           ocultaKg más arriba). */
        (ocultaKg ? '' :
          '<span class="set-field"><span class="set-unit">' + (esMancuerna ? 'KG (C/U)' : 'kg') + '</span>' +
            '<input class="set-input set-kg' + (sugerido&&kgVal!=null?' set-input-sug':'') + '" type="text" inputmode="decimal" autocomplete="off" placeholder="' + kgPlaceholder + '" value="' + (kgVal!=null?kgVal:'') + '" />' +
          '</span>' +
          '<span class="set-x" aria-hidden="true">\u00d7</span>'
        ) +
        /* el objetivo (repsHint) ya no va como placeholder acá: se veía como
           texto tenue "dato ya cargado" y desaparecía justo al tocar el campo
           para tipear -- ahora el objetivo se muestra afuera, en texto fijo
           y legible (badge de prescripción / roster del biset), y el input
           queda limpio para que el alumno cargue lo realizado. La etiqueta
           chica arriba (.set-unit) sí queda fija -- "reps", o "m"/"seg"
           cuando la estación es de distancia/tiempo (repsPlaceholder), o
           "SEGUNDOS / TIEMPO" en Core por tiempo (repsUnitLabel). */
        '<span class="set-field"><span class="set-unit">' + repsUnitLabel + '</span>' +
          '<input class="set-input set-reps' + (sugerido&&repsVal!=null?' set-input-sug':'') + '" type="text" inputmode="numeric" autocomplete="off" placeholder="' + repsPlaceholder + '" value="' + (repsVal!=null?repsVal:'') + '" />' +
        '</span>' +
        '<input class="set-check" type="checkbox" ' + (ld.done?'checked':'') + ' />' +
      '</div>' +
    '</div>';
  }
  html += '</div>';
  return html;
}
/* target de Kg sugerido para la semana, mismo cálculo que ya usa el badge
   .load-suggest (cargaSugeridaHtml) pero devolviendo un único número listo
   para precargar un input -- ver PCT_SEMANA/redondear05 más abajo. */
function cargaSugeridaKg(block, weekIdx){
  const base = parseFloat(block && block.baseLoad);
  if(!base || base <= 0) return 0;
  const propio = block.weekPct && block.weekPct[weekIdx] != null && block.weekPct[weekIdx] !== ''
    ? parseFloat(block.weekPct[weekIdx]) : null;
  if(propio) return redondear05(base * propio / 100);
  const w = PCT_SEMANA[weekIdx] || PCT_SEMANA[PCT_SEMANA.length - 1];
  return redondear05((base * w.pct[0] / 100 + base * w.pct[1] / 100) / 2);
}
/* chip "Ref previa: 80 kg × 10" -- lo último que el alumno efectivamente
   registró en esta estación la semana pasada (última serie con Kg y Reps
   cargados). Vacío si es la Semana 1 o si no hay nada que mostrar. */
function refPreviaHtml(weekIdx, dayId, blockId, exIdx, numSets){
  if(!(weekIdx > 0)) return '';
  for(let i = numSets; i >= 1; i--){
    const prevLd = getLoad(getLoadKey(weekIdx - 1, dayId, blockId, exIdx, i));
    if(prevLd.kg != null && prevLd.kg !== '' && prevLd.reps != null && prevLd.reps !== ''){
      return '<span class="ref-previa" title="Lo que registraste la semana pasada en esta estación">' +
        '↩ Ref previa: <b>' + prevLd.kg + ' kg × ' + prevLd.reps + '</b></span>';
    }
  }
  return '';
}
function fatigueKey(weekIdx, dayId){ return weekIdx + '_' + dayId; }
function getFatigue(weekIdx, dayId){ return state.fatigue[fatigueKey(weekIdx, dayId)] || null; }
function setFatigue(weekIdx, dayId, level){
  state.fatigue[fatigueKey(weekIdx, dayId)] = level;
  saveProgress();
}
const FATIGUE_SUGGESTIONS = {
  green:'Buen día para entrenar tal cual está armado — si se siente sólido, incluso podés apretar un poco más el RPE objetivo.',
  yellow:'Restale una serie efectiva a cada ancla pesada de hoy y bajá 1 punto el RPE objetivo. El Finisher y el Hyrox quedan a tu criterio — sumalos solo si el cuerpo responde bien.',
  red:'Priorizá técnica sobre carga: hacé solo los bloques principales a RPE 6-7, saltate finisher y Hyrox, y cerrá con 10 minutos de cardio suave si el cuerpo lo pide. Mañana es otro día.'
};
/* =========================================================
   READINESS SCORE — checklist de entrada de 3 toques
   (sueño · estrés/energía · molestias). El estrés/energía reusa
   el mismo state.fatigue/getFatigue/setFatigue de siempre (verde
   = alta energía) para no duplicar almacenamiento; sueño y
   molestias son estado nuevo, propio de este checklist.
========================================================= */
const READINESS_PAIN_ZONES = ['Rodilla', 'Espalda baja', 'Hombro', 'Cadera', 'Tobillo'];
function getSleep(weekIdx, dayId){ return state.sleep[fatigueKey(weekIdx, dayId)] || null; }
function setSleep(weekIdx, dayId, val){
  state.sleep[fatigueKey(weekIdx, dayId)] = val;
  saveProgress();
  if(window.CoachOutbox && window.CoachOutbox.encolar){
    window.CoachOutbox.encolar({ tipo:'readiness_sueno', valor:val, semana:weekIdx, dia:dayId });
  }
}
function getPainZones(weekIdx, dayId){ return state.readinessPain[fatigueKey(weekIdx, dayId)] || []; }
function togglePainZone(weekIdx, dayId, zona){
  const k = fatigueKey(weekIdx, dayId);
  let arr = (state.readinessPain[k] || []).slice();
  if(zona === null){ arr = []; }
  else if(arr.indexOf(zona) >= 0){ arr = arr.filter(function(z){ return z !== zona; }); }
  else { arr.push(zona); }
  state.readinessPain[k] = arr;
  saveProgress();
  if(arr.length && window.CoachOutbox && window.CoachOutbox.encolar){
    window.CoachOutbox.encolar({ tipo:'readiness_molestia', zonas:arr, semana:weekIdx, dia:dayId });
  }
  return arr;
}
function readinessAdvisory(zonas){
  if(!zonas || !zonas.length) return '';
  const lista = zonas.join(' · ');
  return '<div class="rdy-advisory"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>' +
    '<div><b>Molestia en ' + lista.toLowerCase() + '</b> — hoy autoregulamos: sumá +1 RIR y evitá el rango de dolor en los ejercicios que la comprometan. Marcá el bloque afectado con 🩹 si necesitás avisar al coach en tiempo real.</div></div>';
}
/* 09/09 -- ASISTENTE DE SOBRECARGA DINÁMICA VÍA READINESS: cruza el
   check-in de entrada (sueño + energía + molestias) con la sugerencia de
   carga que YA se muestra en .load-suggest (cargaSugeridaHtml, target por
   %1RM) y .rm-sug (sugerencias(), target por marca personal) -- no
   reemplaza ese número, le agrega un renglón aparte dentro de la misma
   caja, así nunca hay dos fuentes de verdad compitiendo por el mismo Kg. */
function readinessCargaTexto(weekIdx, dayId){
  const sleepVal = getSleep(weekIdx, dayId);
  const stressVal = getFatigue(weekIdx, dayId);
  const zonas = getPainZones(weekIdx, dayId);
  if(!sleepVal && !stressVal) return null; /* todavía no contestó el check-in: sin sugerencia */
  if(zonas.length){
    return { cls:'hold', html:'🛡️ <b>Sostené la carga de hoy:</b> molestia declarada en ' + zonas.join(' · ').toLowerCase() + ' — priorizá técnica, RIR 2-3.' };
  }
  if(sleepVal === 'optima' && stressVal === 'green'){
    return { cls:'up', html:'⚡ <b>Condición óptima:</b> +2.5 kg recomendados para la serie efectiva.' };
  }
  if(stressVal === 'red' || sleepVal === 'mala'){
    return { cls:'hold', html:'🛡️ <b>Sostené la carga:</b> ' + (stressVal === 'red' ? 'energía baja hoy' : 'dormiste flojo') + ' — priorizá técnica, RIR 2-3.' };
  }
  return null; /* combinación intermedia (ej. sueño regular + energía alta): sin ajuste, se sigue el plan tal cual */
}
function aplicarSobrecargaReadiness(weekIdx, dayId){
  const tip = readinessCargaTexto(weekIdx, dayId);
  document.querySelectorAll('.load-suggest, .rm-sug').forEach(function(box){
    let el = box.querySelector('.rdy-load-tip');
    if(!tip){ if(el) el.remove(); return; }
    if(!el){ el = document.createElement('div'); el.className = 'rdy-load-tip'; box.appendChild(el); }
    el.className = 'rdy-load-tip rdy-load-' + tip.cls;
    el.innerHTML = tip.html;
  });
}
/* Contexto de sesión (28/08, Fase 3 · Sección 03 pto.2) — bloque compacto
   "lo que trajiste la última vez" ANTES del check-in de entrada, para que
   la sesión abra con contexto en vez de con un formulario en blanco.
   Cero cálculo nuevo: racha viene de window.CoachMetricas.racha() (mismo
   módulo que ya la usa la Story Card y la tarjeta de cierre de sesión) y
   el último PR viene de state.session.prDetalle (ya lo llena capturarPR()
   en cada récord, nunca se resetea entre días — es el log real de marcas
   de todo el mesociclo, no solo "esta sesión"). Si no hay nada que mostrar
   todavía (primera sesión, cero historial), no se renderiza nada. */
function renderContextoSesion(){
  /* limpieza de la Pizarra Táctica (2026-09-16): "lo que trajiste la
     última vez" es racha/PR de trabajo con series -- ruido de Bodybuilding
     en una sesión de CrossFit, aunque el alumno tenga historial viejo. */
  if(window.COACH_DISCIPLINA !== 'sports') return '';
  const r = (window.CoachMetricas && typeof window.CoachMetricas.racha === 'function') ? window.CoachMetricas.racha() : null;
  const det = (state.session && state.session.prDetalle) || [];
  const ultimoPR = det.length ? det[det.length - 1] : null;
  if(!ultimoPR) return '';
  const chips = [];
  if(ultimoPR){
    /* nombre del ejercicio: se saca el paréntesis final (traducción/alias,
       ej. "Press Guillotina (Guillotine Press)") antes de truncar, así el
       chip no corta a mitad de palabra en el caso común */
    const nombrePR = String(ultimoPR.ex || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
    const nombreCorto = nombrePR.length > 24 ? nombrePR.slice(0, 23).trim() + '…' : nombrePR;
    chips.push('<div class="ctx-chip"><span class="ctx-val">' + ultimoPR.kg + 'kg</span><span class="ctx-key">🏆 último PR · ' + nombreCorto + '</span></div>');
  }
  if(!chips.length) return '';
  return '<div class="context-card" id="contextCard">' +
    '<div class="ctx-head"><span class="ctx-ic">📊</span><span class="ctx-tt">Lo que trajiste la última vez</span></div>' +
    '<div class="ctx-chips">' + chips.join('') + '</div>' +
  '</div>';
}
/* pedido 41: texto compacto de la barra colapsada -- '' mientras el
   check-in de hoy no arrancó (arranca cerrada igual, muestra "Opcional"),
   y un resumen de una línea apenas hay sueño y/o energía cargados, para
   que el alumno vea de un vistazo qué contestó sin tener que reabrirla. */
function readinessResumenTxt(sleepVal, stressVal, zonas){
  if(!sleepVal && !stressVal) return '';
  const LB_SLEEP = { optima:'sueño óptimo', regular:'sueño regular', mala:'sueño flojo' };
  const LB_STRESS = { green:'energía alta', yellow:'energía media', red:'energía baja' };
  const partes = [];
  if(sleepVal) partes.push(LB_SLEEP[sleepVal] || sleepVal);
  if(stressVal) partes.push(LB_STRESS[stressVal] || stressVal);
  if(zonas && zonas.length) partes.push(zonas.length + ' molestia' + (zonas.length>1?'s':''));
  let txt = 'Check-in: ' + partes.join(' · ');
  /* 10/09 -- texto de estado con concordancia de género: condición óptima
     (mismo criterio que readinessCargaTexto/"+2.5 kg recomendados") suma
     "Lista/Listo para entrenar" al resumen colapsado del check-in. */
  if(sleepVal === 'optima' && stressVal === 'green' && !(zonas && zonas.length)){
    txt += ' · ' + generoTxt('Listo', 'Lista') + ' para entrenar';
  }
  return txt;
}
/* directiva ("Elevación estética de lujo táctico: purga de Briefing") --
   erradica por completo el acordeón colapsable "⚡ Briefing & Check-in"
   (sueño/estrés/molestias, 3 toques) entre los badges del día y el
   primer bloque: el scroll ahora baja directo del título de la sesión al
   entrenamiento. El "Foco Técnico del Día" (day.focusText) que una
   directiva anterior había fusionado DENTRO de esa misma tarjeta plegable
   es contenido de coaching real, no un check-in opcional -- se conserva,
   pero como banner fijo y siempre visible (reusa el mismo bloque .rdy-foco
   ya estilizado, sin el <details>/<summary> ni las preguntas de check-in
   que lo rodeaban). renderReadinessCard()/wireReadinessCheckin() quedan
   intactas (sin invocarse) por si algo más las necesita más adelante. */
/* directiva maestra ("Micro-Acordeón Colapsable para 'Directiva Táctica /
   Foco Técnico'") -- la tarjeta fija (directiva anterior) ocupaba casi el
   70% de la primera pantalla en mobile. Pasa a <details> nativo COLAPSADO
   por defecto (mismo patrón <details>[open]+animación ya establecido en
   el archivo para .readiness-card/.tactical-briefing, cero JS nuevo de
   animación): [ 🎯 DIRECTIVA TÁCTICA · FOCO TÉCNICO ] ▾ + una línea de
   previsualización truncada en titanio -- el Bloque 1 queda visible de
   entrada sin tener que scrollear el foco completo. */
function renderFocoTecnico(day){
  if(!day.focusText) return '';
  var preview = String(day.focusText).replace(/\s+/g, ' ').trim();
  if(preview.length > 72) preview = preview.slice(0, 72).trim() + '…';
  return '<details class="jp-foco-acc">' +
    '<summary class="jp-foco-acc-summary">' +
      '<span class="jp-foco-acc-ic">🎯</span>' +
      '<span class="jp-foco-acc-tx">DIRECTIVA TÁCTICA \u00b7 FOCO T\u00c9CNICO</span>' +
      '<span class="jp-foco-acc-preview">' + preview + '</span>' +
      '<span class="jp-foco-acc-chev" aria-hidden="true">\u25be</span>' +
    '</summary>' +
    '<div class="jp-foco-acc-body">' +
      '<div class="rdy-foco">' +
        '<div class="rdy-foco-badge">🎯 DIRECTIVA TÁCTICA</div>' +
        '<div class="rdy-foco-title">' + (day.focusTitle||'Foco Técnico del Día') + '</div>' +
        '<p class="rdy-foco-text">' + day.focusText + '</p>' +
      '</div>' +
    '</div>' +
  '</details>';
}
function renderReadinessCard(weekIdx, day){
  const sleepVal = getSleep(weekIdx, day.id);
  const stressVal = getFatigue(weekIdx, day.id);
  const zonas = getPainZones(weekIdx, day.id);
  const seg = function(name, opts, cur){
    return '<div class="rdy-seg" data-rdy-seg="' + name + '">' + opts.map(function(o){
      return '<button type="button" class="' + (cur===o.v?'on':'') + '" data-v="' + o.v + '">' + o.l + '</button>';
    }).join('') + '</div>';
  };
  const resumen = readinessResumenTxt(sleepVal, stressVal, zonas);
  const completo = !!(sleepVal && stressVal);
  /* Athlete A+B (primera pantalla): Check-in + Foco Técnico del Día se
     fusionan en UNA sola pastilla esbelta "⚡ Briefing & Check-in" en vez
     de dos <details> apiladas (el viejo .focus-accordion independiente
     de renderMain() se elimina -- ver ahí). Se logra agregando el foco
     como una sección más DENTRO del mismo body de #readinessCard, sin
     tocar su <details>/<summary> nativo: wireReadinessCheckin() sigue
     abriendo/cerrando exactamente el mismo elemento de siempre (mismo id,
     mismo auto-colapso al completar sueño+energía, mismo open
     programático desde el dock) -- pedido 41 y todo lo de acá arriba
     sigue intacto, solo se le agrega contenido al final del body. */
  /* FASE 2.1 -- tarjeta táctica de foco, con borde cian y badge propio
     para separarla limpiamente del check-in de 3 toques que la sigue
     dentro del mismo body fusionado. */
  const focoHtml = day.focusText ? (
    '<div class="rdy-foco">' +
      '<div class="rdy-foco-badge">🎯 DIRECTIVA TÁCTICA</div>' +
      '<div class="rdy-foco-title">' + (day.focusTitle||'Foco Técnico del Día') + '</div>' +
      '<p class="rdy-foco-text">' + day.focusText + '</p>' +
    '</div>'
  ) : '';
  return '<details class="readiness-card' + (completo?' rdy-done':'') + '" id="readinessCard">' +
    '<summary class="rdy-summary">' +
      '<span class="rdy-sum-ic">⚡</span>' +
      '<span class="rdy-sum-tx">' + (resumen || 'Briefing &amp; Check-in') + '</span>' +
      (resumen ? '' : '<span class="rdy-sum-tag">Opcional</span>') +
      '<span class="rdy-chev" aria-hidden="true">▾</span>' +
    '</summary>' +
    '<div class="rdy-body">' +
      focoHtml +
      '<div class="fatigue-card-title">¿Cómo llegás hoy? <span class="rdy-eyebrow">Check de entrada · 3 toques</span></div>' +
      '<div class="rdy-q"><div class="rdy-lb">Calidad de sueño</div>' + seg('sleep', [{v:'optima',l:'Óptima'},{v:'regular',l:'Regular'},{v:'mala',l:'Mala'}], sleepVal) + '</div>' +
      '<div class="rdy-q"><div class="rdy-lb">Nivel de estrés / energía</div>' + seg('stress', [{v:'green',l:'Alto'},{v:'yellow',l:'Medio'},{v:'red',l:'Bajo'}], stressVal) + '</div>' +
      '<div class="rdy-q"><div class="rdy-lb">Molestias específicas</div><div class="rdy-pills" id="rdyPills">' +
        '<button type="button" class="rdy-pill' + (!zonas.length?' on':'') + '" data-zona="">Ninguna</button>' +
        READINESS_PAIN_ZONES.map(function(z){
          return '<button type="button" class="rdy-pill' + (zonas.indexOf(z)>=0?' on':'') + '" data-zona="' + z + '"><span class="flag"></span>' + z + '</button>';
        }).join('') +
      '</div></div>' +
      '<div id="rdyAdvisory">' + readinessAdvisory(zonas) + '</div>' +
    '</div>' +
  '</details>';
}
function wireReadinessCheckin(day, weekIdx){
  const card = document.getElementById('readinessCard');
  if(!card) return;
  /* refresca la barra colapsada (texto + estado "completo") sin tener
     que re-renderizar toda la tarjeta -- se llama tras cada respuesta */
  function actualizarResumen(){
    const sleepVal = getSleep(weekIdx, day.id);
    const stressVal = getFatigue(weekIdx, day.id);
    const zonas = getPainZones(weekIdx, day.id);
    const resumen = readinessResumenTxt(sleepVal, stressVal, zonas);
    const tx = card.querySelector('.rdy-sum-tx');
    const tag = card.querySelector('.rdy-sum-tag');
    if(tx) tx.textContent = resumen || 'Briefing & Check-in';
    if(tag) tag.style.display = resumen ? 'none' : '';
    const completo = !!(sleepVal && stressVal);
    card.classList.toggle('rdy-done', completo);
    return completo;
  }
  card.addEventListener('click', function(e){
    const zBtn = e.target.closest('.rdy-pill');
    if(zBtn){
      const zona = zBtn.getAttribute('data-zona');
      const zonas = togglePainZone(weekIdx, day.id, zona || null);
      card.querySelectorAll('.rdy-pill').forEach(function(b){
        const bz = b.getAttribute('data-zona');
        b.classList.toggle('on', bz ? zonas.indexOf(bz) >= 0 : zonas.length === 0);
      });
      const host = document.getElementById('rdyAdvisory');
      if(host) host.innerHTML = readinessAdvisory(zonas);
      actualizarResumen();
      if(typeof aplicarSobrecargaReadiness === 'function') aplicarSobrecargaReadiness(weekIdx, day.id);
      return;
    }
    const seg = e.target.closest('.rdy-seg');
    if(seg && e.target.tagName === 'BUTTON'){
      const v = e.target.getAttribute('data-v');
      const eraCompleto = !!(getSleep(weekIdx, day.id) && getFatigue(weekIdx, day.id));
      seg.querySelectorAll('button').forEach(function(b){ b.classList.toggle('on', b === e.target); });
      if(seg.getAttribute('data-rdy-seg') === 'sleep') setSleep(weekIdx, day.id, v);
      else if(seg.getAttribute('data-rdy-seg') === 'stress') setFatigue(weekIdx, day.id, v);
      const esAhoraCompleto = actualizarResumen();
      /* el atleta recién contestó sueño o energía -- la sugerencia de
         sobrecarga (⚡ +2.5kg / 🛡️ sostener carga) se recalcula en el acto,
         no hace falta cerrar y reabrir el check-in para verla aplicada. */
      if(typeof aplicarSobrecargaReadiness === 'function') aplicarSobrecargaReadiness(weekIdx, day.id);
      /* al completar sueño + energía (las 2 preguntas obligatorias) se
         pliega sola para devolver la pantalla a la rutina -- si el
         alumno la abrió solo para revisar/tocar molestias después de
         ya haber completado, no la vuelve a cerrar de golpe */
      if(esAhoraCompleto && !eraCompleto && card.open){
        setTimeout(function(){ card.open = false; }, 550);
      }
      return;
    }
  });
  actualizarResumen();
}
/* =========================================================
   AUDIO
========================================================= */
let _audioCtx = null;
var _audioFallo = false;
/* Sesión de audio SIEMPRE "ambient": mezcla los avisos con lo que el alumno ya está escuchando (Spotify, Apple Music, podcasts) y nunca toma el foco de audio.
   La sesión "playback" hacía lo contrario: pausaba su música al abrir la app y registraba a Coach JP como reproductor multimedia (control center / pantalla de bloqueo).
   Costo asumido: con el interruptor de silencio del iPhone activado los avisos no suenan (la vibración sí). Ningún lugar de la app puede volver a "playback". */
function jpSesionAudio(){
  try{ if(navigator.audioSession && navigator.audioSession.type !== 'ambient') navigator.audioSession.type = 'ambient'; }catch(e0){}
}
jpSesionAudio();
function ensureAudioCtx(pasivo){
  /* El audio NUNCA puede romper la app: aqui no se lanza ninguna excepcion. Sin Web Audio (o si el constructor falla) devuelve null y
     todos los llamadores simplemente no suenan. El contexto no se crea al cargar la pagina: nace en el primer gesto o el primer aviso. */
  if(!pasivo) jpSesionAudio();
  if(_audioCtx || _audioFallo) return _audioCtx;
  try{
    var AC = window.AudioContext || window.webkitAudioContext;
    if(!AC){ _audioFallo = true; return null; }
    /* latencyHint "interactive": el menor retardo posible entre el evento del timer y el tono */
    try{ _audioCtx = new AC({ latencyHint: 'interactive' }); }catch(e){ _audioCtx = new AC(); }
    /* iOS 16.4+: la sesion de audio queda en "ambient" (jpSesionAudio): mezcla con la musica del usuario y nunca pide el foco de audio */
    /* si el sistema lo interrumpe (llamada, bloqueo de pantalla), queda a la espera del proximo toque */
    try{ _audioCtx.addEventListener('statechange', function(){ if(_audioCtx && _audioCtx.state !== 'running' && window.__jpArmarAudio) window.__jpArmarAudio(); }); }catch(e3){}
  }catch(e4){ _audioCtx = null; _audioFallo = true; }
  return _audioCtx;
}
/* reanuda el contexto SOLO si ya existe (no lo crea: se llama tambien al volver a la pestana, sin gesto) */
function resumeAudioCtx(){ try{ if(_audioCtx && _audioCtx.state !== 'running'){ var p = _audioCtx.resume(); if(p && p.catch) p.catch(function(){}); } }catch(e){} }
/* gesto del usuario: aqui si se crea (si hace falta) y se reanuda */
function gestoAudio(){ try{ ensureAudioCtx(true); resumeAudioCtx(); }catch(e){} }
function unlockAudio(){
  try{
    const ctx = ensureAudioCtx(true); if(!ctx) return; resumeAudioCtx();
    /* buffer silencioso de 1 muestra dentro del gesto: es lo que Safari/iOS exige para habilitar el contexto */
    const buf = ctx.createBuffer(1, 1, 22050), src = ctx.createBufferSource();
    src.buffer = buf; src.connect(ctx.destination); src.start(0);
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.01);
    /* el bus (compresor) queda armado de antemano: el primer aviso real no paga su creacion */
    try{ if(window.jpPerfilSonido && jpPerfilSonido.calentar) jpPerfilSonido.calentar(); }catch(e3){}
  }catch(e){}
}
['touchstart','pointerdown','click'].forEach(function(evt){ try{ document.addEventListener(evt, gestoAudio, { passive: true }); }catch(e){} });
['visibilitychange','pageshow','focus'].forEach(function(evt){ (evt === 'visibilitychange' ? document : window).addEventListener(evt, function(){ if(evt !== 'visibilitychange' || document.visibilityState === 'visible') resumeAudioCtx(); }); });
function isAudioMuted(){
  try{ return localStorage.getItem('jp_audio_muted') === '1'; }catch(e){ return false; }
}
function playBeep(freq, dur, peakGain, delay, type){
  if(isAudioMuted()) return;
  try{
    const ctx = ensureAudioCtx(); if(!ctx) return; resumeAudioCtx();
    const start = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = type || 'sine'; osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(peakGain, start + 0.012);
    gain.gain.setValueAtTime(peakGain, start + Math.max(dur - 0.04, 0.012));
    gain.gain.linearRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(start); osc.stop(start + dur + 0.03);
  }catch(e){ console.warn('playBeep falló:', e); }
}
/* =========================================================
   SONIDO DE TIMERS Y DESCANSOS · UN SOLO MOTOR NATIVO (Web Audio API)
   Todo se sintetiza por codigo: sin MP3/WAV ni librerias externas, sin retardo de carga y funciona sin conexion.
   Es el unico sonido de TODOS los relojes (WOD, intervalos, descanso entre series). Cuenta ascendente:
     3  -> La4   440.00 Hz
     2  -> Re5   587.33 Hz  sube la tension
     1  -> La5   880.00 Hz  pre-alerta
     YA -> Re6  1174.66 Hz  mismo pulso seco de ~0.17 s, mas agudo y con mas ganancia (arranque / fin de la cuenta / fin del descanso)
   Timbre tactico-industrial: ondas de sierra y cuadradas desafinadas entre si, filtro pasa-bajos con barrido dinamico y resonancia,
   saturacion suave (waveshaper). Todos los avisos (3-2-1-YA) son pulsos secos de ~0.17 s con cuerpo
   grave-medio (cuadrada una octava abajo); todo por un compresor comun para que nunca sature.
   Contrato: cuenta(n) con n = segundos que faltan (3, 2, 1); go() / chicharra() = el "YA".
========================================================= */
var jpPerfilSonido = (function(){
  var HZ = { 3: 440, 2: 587.33, 1: 880, ya: 1174.66 };
  var LAT = 0.006;      /* margen minimo de agenda: el tono arranca en el proximo bloque de audio */
  /* limpieza: la eleccion de perfil de versiones anteriores ya no existe */
  try{ localStorage.removeItem(((typeof STORAGE_KEY !== 'undefined') ? STORAGE_KEY : 'coachjp') + '_sonido'); }catch(e){}

  var bus = null, busCtx = null;
  function salida(ctx){
    if(bus && busCtx === ctx) return bus;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 10; comp.attack.value = 0.002; comp.release.value = 0.12;
    var mg = ctx.createGain(); mg.gain.value = 0.9;
    comp.connect(mg); mg.connect(ctx.destination);
    bus = comp; busCtx = ctx; return bus;
  }
  var CURVAS = {};
  function curva(k){
    if(!CURVAS[k]){
      var n = 1024, c = new Float32Array(n), i, x, t = Math.tanh(k);
      for(i = 0; i < n; i++){ x = i * 2 / n - 1; c[i] = Math.tanh(k * x) / t; }
      CURVAS[k] = c;
    }
    return CURVAS[k];
  }
  /* un parcial: f (Hz), d (s), v (volumen pico), t (retardo), tipo, atk (s), lp (corte pasa-bajos), q, lpEnv, dist, resp, env */
  function parcial(ctx, o){
    var t0 = ctx.currentTime + LAT + (o.t || 0), osc = ctx.createOscillator(), g = ctx.createGain(), nodo = osc;
    osc.type = o.tipo || 'sine';
    osc.frequency.setValueAtTime(o.f, t0);
    /* filtro pasa-bajos: corte inicial lp, resonancia q (dB) y barrido dinamico lpEnv [[segundos, Hz]] (exponencial) */
    if(o.lp){
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(o.lp, t0);
      if(o.q) lp.Q.setValueAtTime(o.q, t0);
      if(o.lpEnv) o.lpEnv.forEach(function(p){ lp.frequency.exponentialRampToValueAtTime(p[1], t0 + p[0]); });
      osc.connect(lp); nodo = lp;
    }
    /* saturacion suave (tanh): aspereza y pegada */
    if(o.dist){ var ws = ctx.createWaveShaper(); ws.curve = curva(o.dist); ws.oversample = '2x'; nodo.connect(ws); nodo = ws; }
    /* respiracion: un LFO lento modula la ganancia de forma multiplicativa (la cola sigue cayendo a cero, sin zumbido residual) */
    if(o.resp){
      var br = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      br.gain.setValueAtTime(1, t0); lfo.frequency.setValueAtTime(o.resp.hz, t0); lg.gain.setValueAtTime(o.resp.prof, t0);
      lfo.connect(lg); lg.connect(br.gain); nodo.connect(br); nodo = br;
      lfo.start(t0); lfo.stop(t0 + o.d + 0.03);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(o.v, t0 + (o.atk || 0.003));
    /* env: puntos [segundos, fraccion del pico] de la caida: golpe inicial -> sustain -> cola larga */
    if(o.env) o.env.forEach(function(p){ g.gain.exponentialRampToValueAtTime(Math.max(0.0001, o.v * p[1]), t0 + p[0]); });
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.d);
    nodo.connect(g); g.connect(salida(ctx));
    osc.start(t0); osc.stop(t0 + o.d + 0.03);
  }
  /* 3 - 2 - 1: pulso de alerta tactica (radar / control de lanzamiento). ~0.17 s, seco y fuerte.
     Dos sierras desafinadas 0.7 % (densidad) por un pasa-bajos resonante que barre de brillante a oscuro en 90 ms (la "pegada"),
     mas una cuadrada una octava abajo para el cuerpo grave-medio. Sube de tono y de volumen: 440 -> 587.33 -> 880 Hz. */
  function pip(ctx, n){
    var f = HZ[n] || HZ[3], v = n === 1 ? 0.25 : (n === 2 ? 0.22 : 0.19);
    var barrido = [[0.09, f * 2.2]];
    parcial(ctx, { f: f, d: 0.17, v: v, tipo: 'sawtooth', lp: f * 7, lpEnv: barrido, q: 6, dist: 2, atk: 0.002, env: [[0.025, 1], [0.11, 0.45]] });
    parcial(ctx, { f: f * 1.007, d: 0.17, v: v * 0.7, tipo: 'sawtooth', lp: f * 7, lpEnv: barrido, q: 6, dist: 2, atk: 0.002, env: [[0.025, 1], [0.11, 0.45]] });
    parcial(ctx, { f: f / 2, d: 0.15, v: v * 0.55, tipo: 'square', lp: f * 2.5, q: 2, atk: 0.002, env: [[0.03, 1], [0.1, 0.4]] });
  }
  /* YA / fin de descanso: el mismo pulso seco de 0.17 s que 3-2-1 (misma envolvente, mismo barrido de filtro), pero mas agudo, con una
     sierra extra, una capa grave-media (cuadrada 587 Hz + sierra 293 Hz) y mas ganancia: potente, aspero y breve. */
  function ya(ctx){
    var f = HZ.ya, barrido = [[0.09, f * 2.2]], env = [[0.025, 1], [0.11, 0.45]];
    parcial(ctx, { f: f * 0.994, d: 0.17, v: 0.3, tipo: 'sawtooth', lp: f * 7, lpEnv: barrido, q: 6, dist: 2.5, atk: 0.002, env: env });
    parcial(ctx, { f: f * 1.006, d: 0.17, v: 0.3, tipo: 'sawtooth', lp: f * 7, lpEnv: barrido, q: 6, dist: 2.5, atk: 0.002, env: env });
    parcial(ctx, { f: f, d: 0.17, v: 0.24, tipo: 'sawtooth', lp: f * 7, lpEnv: barrido, q: 6, dist: 2.5, atk: 0.002, env: env });
    parcial(ctx, { f: f / 2, d: 0.15, v: 0.3, tipo: 'square', lp: 2600, q: 2, dist: 2, atk: 0.002, env: [[0.03, 1], [0.1, 0.4]] });
    parcial(ctx, { f: f / 4, d: 0.15, v: 0.24, tipo: 'sawtooth', lp: 1100, atk: 0.002, env: [[0.03, 1], [0.1, 0.4]] });
  }
  /* mitad del tiempo objetivo: doble golpe seco de sierra (no compite con la cuenta final) */
  function mitad(ctx){
    parcial(ctx, { f: HZ[2], d: 0.09, v: 0.08, tipo: 'sawtooth', lp: HZ[2] * 3, q: 4, atk: 0.002, env: [[0.02, 1]] });
    parcial(ctx, { f: HZ[2], d: 0.09, v: 0.08, tipo: 'sawtooth', lp: HZ[2] * 3, q: 4, atk: 0.002, env: [[0.02, 1]], t: 0.15 });
  }
  var VIB = { tick: [30], mitad: [50, 40, 50], fin: [120, 80, 160], inicio: [120, 80, 160] };
  function vibrar(ev, sinVib){
    if(sinVib || !VIB[ev] || ev === 'mitad') return;
    try{ if(navigator.vibrate) navigator.vibrate(VIB[ev]); }catch(e){}
  }
  /* si el llamador no dice que numero es (3, 2 o 1), se numera por orden de llegada dentro de una misma cuenta */
  var seqN = 0, seqT = 0;
  function siguiente(){
    var ahora = Date.now();
    if(ahora - seqT > 2200) seqN = 0;
    seqN = Math.min(3, seqN + 1); seqT = ahora;
    return 4 - seqN;
  }
  function emitir(ev, n){
    try{
      var ctx = ensureAudioCtx(); if(!ctx) return;
      var tocar = function(){
        if(ev === 'tick') pip(ctx, n);
        else if(ev === 'inicio' || ev === 'fin') ya(ctx);
        else if(ev === 'mitad') mitad(ctx);
      };
      /* contexto suspendido / interrumpido (iOS tras bloquear la pantalla): se reanuda y suena apenas queda en marcha */
      if(ctx.state !== 'running'){
        var p = ctx.resume();
        if(p && p.then) p.then(tocar).catch(function(){}); else tocar();
        return;
      }
      tocar();
    }catch(e){ console.warn('sonido de timer', e); }
  }
  function reproducir(ev, sinVib, num, clip){
    vibrar(ev, sinVib);
    if(isAudioMuted()) return;
    var n = 0;
    if(ev === 'tick') n = (num >= 1 && num <= 3) ? Math.round(num) : siguiente();
    else if(ev === 'inicio' || ev === 'fin') seqN = 0;
    /* voz del timer (088-voz-del-timer.js): si habló (o corresponde callar el tono) no suena el tono; sin voz activa / sin clips / sin red suena el de siempre */
    try{ if(window.jpVoz && window.jpVoz.hablar(ev, n, clip)) return; }catch(eV){}
    emitir(ev, n);
  }
  function calentar(){ try{ salida(ensureAudioCtx()); }catch(e){} }
  /* escucha de control (consola / QA): 3 - 2 - 1 - YA */
  function probar(){
    [[3, 0], [2, 900], [1, 1800]].forEach(function(p){ setTimeout(function(){ emitir('tick', p[0]); }, p[1]); });
    setTimeout(function(){ emitir('inicio', 0); }, 2700);
  }
  return {
    actual: function(){ return 'ascendente'; },
    reproducir: reproducir,
    /* el timer anuncia hacia dónde va la transición ('go' | 'rest' | 'work' | 'next_round' | 'last_round' | 'done') antes de la chicharra: la voz dice la frase que corresponde */
    hint: function(k){ try{ if(window.jpVoz) window.jpVoz.pista(k); }catch(e){} },
    /* salida común (compresor) para que la voz pase por el mismo bus que los tonos */
    bus: function(){ try{ var c = ensureAudioCtx(true); return c ? salida(c) : null; }catch(e){ return null; } },
    probar: probar,
    calentar: calentar,
    hz: HZ,
    silencio: function(){ return false; },
    sinSonido: function(){ return false; }
  };
})();
window.jpPerfilSonido = jpPerfilSonido;
var jpBox = (function(){
  var ultimaChicharra = 0;
  return {
    tickSeco: function(n){ jpPerfilSonido.reproducir('tick', false, n); },
    gong:     function(){ jpPerfilSonido.reproducir('fin', true, 0, 'work'); },     /* fin del descanso (la voz dice "¡A trabajar!"): la vibración la dispara vibrateTimerEnd */
    cuenta:   function(n){ jpPerfilSonido.reproducir('tick', false, n); },
    go:       function(){ jpPerfilSonido.reproducir('inicio'); },
    aviso10:  function(){},      /* sin sonido: la advertencia de 10 s es visual (el audio queda reservado para 3-2-1-YA y no satura) */
    mitad:    function(){ jpPerfilSonido.reproducir('mitad', true); },   /* la háptica de la mitad ya la envía el HUD Timer */
    inicio:   function(){ jpPerfilSonido.reproducir('inicio'); },
    chicharra:function(){
      var ahora = Date.now();
      if(ahora - ultimaChicharra < 1400) return;      /* el "segundo 0" y la transicion de fase no suenan dos veces */
      ultimaChicharra = ahora; jpPerfilSonido.reproducir('fin');
    }
  };
})();
window.jpBox = jpBox;
/* el AudioContext de iOS Safari / Chrome móvil sólo arranca dentro de un
   gesto del usuario: el primer toque/click de cualquier tipo (antes de
   empezar un timer) lo desbloquea con un buffer silencioso. */
(function(){
  var evs = ['touchstart', 'touchend', 'pointerdown', 'pointerup', 'click', 'keydown'], armado = false;
  function quitar(){ armado = false; evs.forEach(function(ev){ document.removeEventListener(ev, intentar, true); }); }
  function armar(){ if(armado) return; armado = true; evs.forEach(function(ev){ document.addEventListener(ev, intentar, { capture: true, passive: true }); }); }
  /* se reintenta en cada gesto hasta que el contexto queda en "running" (en iOS touchstart no alcanza: hace falta touchend/click) */
  function intentar(){
    try{
      unlockAudio();
      var c = ensureAudioCtx();
      if(!c){ quitar(); return; }      /* sin Web Audio: no hay nada que desbloquear */
      if(c.state === 'running'){ quitar(); return; }
      var p = c.resume(); if(p && p.then) p.then(function(){ if(c.state === 'running') quitar(); }).catch(function(){});
    }catch(e){}
  }
  try{ armar(); }catch(e){}
  /* el contexto avisa (statechange, ver ensureAudioCtx) cuando el sistema lo interrumpe: vuelve a quedar a la espera del proximo toque */
  window.__jpArmarAudio = function(){ try{ armar(); }catch(e){} };
})();
function beepCountdown(){ jpBox.cuenta(); }
function beepGo(){ jpBox.inicio(); }
function beepStop(){ jpBox.aviso10(); }
function beepFinish(){ jpBox.chicharra(); }
/* =========================================================
   BACKGROUND TIMER · NOTIFICACIÓN LOCAL (directiva maestra) --
   jpBgTimer.programar(finTs) agenda el aviso "tiempo cumplido" en el
   Service Worker para el instante absoluto de fin (timestampFin = Date.now()
   + duración), de modo que suene aunque el alumno esté en otra app o con la
   pantalla apagada y el JS de la página suspendido (el SW lo muestra sólo si
   NINGUNA ventana de la app está visible). jpBgTimer.finalizado() cubre el
   caso "JS vivo pero app en segundo plano". Ambos usan la MISMA etiqueta de
   notificación, así que nunca se duplican. Cada llamada va protegida: sin
   permiso, sin SW o sin soporte la app sigue exactamente igual. */
var jpBgTimer = (function(){
  var TAG = 'coachjp-timer';
  var TXT = '\u23f1\ufe0f \u00a1Tiempo cumplido! Tu descanso/bloque ha finalizado.';
  var KEY = 'jp_timer_fin';
  var pedido = false;
  function reg(){
    try{
      if(!('serviceWorker' in navigator)) return Promise.resolve(null);
      return navigator.serviceWorker.getRegistration().catch(function(){ return null; });
    }catch(e){ return Promise.resolve(null); }
  }
  function aSW(msg){
    reg().then(function(r){
      var w = r && (r.active || r.waiting || r.installing);
      if(w) try{ w.postMessage(msg); }catch(e){}
    });
  }
  return {
    /* se pide en el primer gesto real (tocar ▶ de un timer), nunca al cargar */
    pedirPermiso: function(){
      if(pedido) return; pedido = true;
      try{ if('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(function(){}); }catch(e){}
    },
    programar: function(finTs){
      try{ localStorage.setItem(KEY, String(finTs)); }catch(e){}
      aSW({ tipo:'jp-timer', accion:'programar', at: finTs, titulo:'Coach JP', cuerpo: TXT });
    },
    cancelar: function(){
      try{ localStorage.removeItem(KEY); }catch(e){}
      aSW({ tipo:'jp-timer', accion:'cancelar' });
    },
    finalizado: function(){
      try{ localStorage.removeItem(KEY); }catch(e){}
      aSW({ tipo:'jp-timer', accion:'cancelar' });
      if(!document.hidden) return;                     /* en primer plano ya sonó/vibró el propio timer */
      try{ if(!isAudioMuted() && navigator.vibrate) navigator.vibrate([200, 100, 200]); }catch(e){}
      try{
        if(!('Notification' in window) || Notification.permission !== 'granted') return;
        reg().then(function(r){
          var opts = { body: TXT, vibrate: [200, 100, 200], tag: TAG, renotify: true };
          if(r && r.showNotification){ r.showNotification('Coach JP', opts).catch(function(){}); }
          else { try{ new Notification('Coach JP', opts); }catch(e){} }
        });
      }catch(e){}
    }
  };
})();
window.jpBgTimer = jpBgTimer;
/* =========================================================
   RAYOS TÁCTICOS (directiva maestra) -- micro-flash eléctrico perimetral
   (cian #38bdf8 / dorado #f59e0b) en los momentos clave del timer: cuenta
   3-2-1, GO y cada cambio de ronda/intervalo. Sólo opacity + transform +
   box-shadow inset sobre un overlay fijo con pointer-events:none: corre en
   el compositor (GPU), 280 ms, sin bloquear el hilo de JS. Sin timers: la
   animación se reinicia con requestAnimationFrame y se limpia sola en
   'animationend'. */
var jpRayoEl = null, jpRayoT = 0;
function jpRayo(color){
  try{
    var ahora = Date.now();
    if(ahora - jpRayoT < 220) return;
    jpRayoT = ahora;
    if(!jpRayoEl){
      jpRayoEl = document.createElement('div');
      jpRayoEl.id = 'jpRayo'; jpRayoEl.setAttribute('aria-hidden', 'true');
      document.body.appendChild(jpRayoEl);
    }
    jpRayoEl.className = (color === 'gold' ? 'gold' : 'cyan');
    /* Web Animations API: corre en el compositor, se reinicia sola en cada
       llamada y no depende de rAF ni de timers */
    if(jpRayoEl.animate){
      jpRayoEl.animate(
        [{ opacity: 0, transform: 'scale(1.025)' }, { opacity: 1, transform: 'scale(1.01)', offset: .22 }, { opacity: 0, transform: 'scale(1)' }],
        { duration: 280, easing: 'ease-out' });
    }
  }catch(e){}
}
window.jpRayo = jpRayo;
/* pulso del escudo central de la pantalla completa en los 3 segundos finales:
   el contorno sube a 0.6 de opacidad y emite resplandor ámbar (250-300 ms,
   Web Animations / filter: corre en el compositor, no bloquea JS) */
function jpEscudoPulso(){
  try{
    var f = document.getElementById('cwtFull');
    if(!f || !f.classList.contains('on')) return;
    var sh = f.querySelector('.cf-shield');
    if(!sh || !sh.animate) return;
    sh.animate([
      { filter: 'drop-shadow(0 0 0 rgba(245,158,11,0))' },
      { filter: 'drop-shadow(0 0 16px rgba(245,158,11,.5))', offset: .3 },
      { filter: 'drop-shadow(0 0 0 rgba(245,158,11,0))' }
    ], { duration: 280, easing: 'ease-out' });
    sh.querySelectorAll('path').forEach(function(p){
      if(p.animate) p.animate([{ stroke: 'rgba(245,158,11,.15)' }, { stroke: 'rgba(245,158,11,.6)', offset: .3 }, { stroke: 'rgba(245,158,11,.15)' }], { duration: 280, easing: 'ease-out' });
    });
  }catch(e){}
}
window.jpEscudoPulso = jpEscudoPulso;
/* iconos vectoriales monocromáticos (sin emojis nativos) para pausa/play/cronómetro */
var JP_IC_PAUSA = '<svg class="jp-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>';
var JP_IC_PLAY = '<svg class="jp-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5l12 7.5-12 7.5z"/></svg>';
var JP_IC_CRONO = '<svg class="jp-ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5"/><path d="M9 2h6"/></svg>';
var JP_ESCUDO_SVG = '<svg viewBox="0 0 64 74" aria-hidden="true"><path d="M32 2 L60 12 V36 C60 54 47 66 32 72 C17 66 4 54 4 36 V12 Z" fill="#FFD600" stroke="#FFF0A8" stroke-width="2"/><path d="M36 18 L21 40 H30 L27 58 L43 34 H33 Z" fill="#07080A"/></svg>';
/* click discreto al tildar una serie — mismo gate de mute que el resto (isAudioMuted) */
function beepSetCheck(on){ playBeep(on ? 1318 : 660, 0.055, 0.32, 0, 'triangle'); }
/* =========================================================
   MOTOR DE RETROALIMENTACIÓN HÁPTICA & SONIDO TÁCTICO (directiva)
   Namespace único jpAudioTactical -- reusa 100% ensureAudioCtx()/
   playBeep()/isAudioMuted() de arriba (AUDIO): nunca abre un segundo
   AudioContext ni duplica el gate de mute (el switch "🔔 Sonido &
   Haptic" de Ajustes y utilidades, ver hdpAudioToggle más abajo en el
   archivo, escribe la MISMA clave jp_audio_muted que ya lee
   isAudioMuted()). Frecuencias/patrones EXACTOS pedidos por la
   directiva -- funciones nuevas con nombre propio en vez de reusar
   beepSetCheck/beepFinish porque esos ya tienen su propia frecuencia
   fijada en producción (cambiarla ahí regresionaría el sonido actual
   del check de serie y del fin de timer clásico). */
var jpAudioTactical = {
  soundCheckSet: function(){
    if(jpPerfilSonido.sinSonido()) return;
    playBeep(520, 0.045, 0.26, 0, 'triangle');
    playBeep(780, 0.08, 0.3, 0.045, 'triangle');
  },
  /* directiva maestra ("Sonido de Box"): el tick de cuenta regresiva y el
     fin de descanso/timer usan el motor acústico seco de box (jpBox) */
  soundTimerTick: function(n){ jpBox.tickSeco(n); },
  soundTimerEnd: function(){ jpBox.gong(); },
  /* directiva maestra ("Silenciado de guardado"): registrar un PR/1RM es
     SILENCIOSO -- se retira el arpegio agudo; queda sólo la vibración
     háptica (vibratePrRecord) y el feedback visual. */
  soundPrRecord: function(){},
  /* el switch "🔔 Sonido & Haptic" apaga los DOS a la vez -- misma
     lectura de isAudioMuted() que ya gatea playBeep() más arriba. */
  /* directiva maestra ("Feedback háptico y cierre mecánico de serie
     'Lock-In'") -- 35ms exactos pedidos (antes 25ms); if(navigator.vibrate)
     ya blinda contra dispositivos sin soporte, sin arrojar warnings. */
  vibrateCheckSet: function(){ if(isAudioMuted()) return; try{ if(navigator.vibrate) navigator.vibrate(35); }catch(e){} },
  vibrateTimerEnd: function(){ if(isAudioMuted() || jpPerfilSonido.silencio()) return; try{ if(navigator.vibrate) navigator.vibrate([120, 80, 160]); }catch(e){} },
  vibratePrRecord: function(){ if(isAudioMuted()) return; try{ if(navigator.vibrate) navigator.vibrate([40, 30, 40, 30, 120]); }catch(e){} }
};
window.jpAudioTactical = jpAudioTactical;
/* =========================================================
   HÁPTICA CENTRAL · Web Vibration API con degradado silencioso
   iOS/Safari no expone navigator.vibrate: se detecta una sola vez,
   no se vuelve a intentar y no se ensucia la consola.
========================================================= */
var CoachVibra = (function(){
  var soporta = false;
  try{ soporta = ('vibrate' in navigator) && typeof navigator.vibrate === 'function'; }catch(e){ soporta = false; }
  function disparar(p){
    if(!soporta) return false;
    try{ return navigator.vibrate(p) !== false; }catch(e){ soporta = false; return false; }
  }
  return {
    soporta: function(){ return soporta; },
    cuenta:  function(){ if(jpPerfilSonido.silencio()) return false; return disparar(200); },   /* segundos 3, 2 y 1 */
    fin:     function(){ if(jpPerfilSonido.silencio()) return false; return disparar([200, 100, 200, 100, 400]); },   /* final del conteo   */
    toque:   function(){ return disparar(20); },    /* feedback de botón  */
    patron:  function(p){ return disparar(p); }
  };
})();
window.CoachVibra = CoachVibra;
function vibrate(pattern){ CoachVibra.patron(pattern); }
function fmt(sec){ sec = Math.max(0, Math.round(sec)); const m = Math.floor(sec/60), s = sec % 60; return (m<10?'0':'')+m+':'+(s<10?'0':'')+s; }
/* =========================================================
   WAKE LOCK MANAGER
========================================================= */
const WakeLockManager = (function(){
  let sentinel = null; let count = 0; const indicators = new Set();
  function refreshIndicators(){ indicators.forEach(function(el){ el.classList.toggle('on', !!sentinel); }); }
  async function acquireSentinel(){
    if(sentinel || !('wakeLock' in navigator)) return;
    try{ sentinel = await navigator.wakeLock.request('screen'); sentinel.addEventListener('release', function(){ sentinel = null; refreshIndicators(); }); refreshIndicators(); }catch(e){ sentinel = null; }
  }
  function register(indicatorEl){ if(indicatorEl) indicators.add(indicatorEl); refreshIndicators(); }
  function acquire(){ count++; acquireSentinel(); }
  function release(){ count = Math.max(0, count-1); if(count===0 && sentinel){ sentinel.release().catch(function(){}); sentinel = null; refreshIndicators(); } }
  document.addEventListener('visibilitychange', function(){ if(document.visibilityState==='visible' && count>0) acquireSentinel(); });
  return { acquire: acquire, release: release, register: register };
})();
/* Pantalla siempre encendida mientras corre CUALQUIER cronómetro (descanso entre series, Custom WOD Timer, timers rápidos). Un único candado,
   con un "motivo" por cronómetro: se libera solo cuando ya no queda ninguno activo y se vuelve a pedir al regresar a la app (el sistema lo suelta
   cada vez que la pantalla se bloquea o se cambia de pestaña). */
/* Reloj sin deriva para los cronómetros: cada pasada se agenda al PRÓXIMO borde de segundo del instante objetivo (refFn devuelve el epoch ms de la meta o del inicio),
   no "1000 ms desde ahora", así no se acumula atraso aunque el hilo se demore. Un vigilante revive la cadena si el navegador la congeló (pantalla bloqueada, ahorro
   de batería) y, ante cualquier error en la pasada, el reloj sigue vivo. El estado real SIEMPRE se calcula contra el reloj de pared, nunca contando ticks. */
function jpTicker(fn, refFn){
  var t = null, vig = null, activo = false, ultimo = 0;
  function programar(){
    clearTimeout(t); t = null;
    if(!activo) return;
    var ref = 0; try{ ref = refFn ? Number(refFn()) : 0; }catch(e0){ ref = 0; }
    var delay = 1000;
    if(ref > 0 && isFinite(ref)){ delay = (((ref - Date.now()) % 1000) + 1000) % 1000 + 12; }
    t = setTimeout(pasada, delay);
  }
  function pasada(){
    ultimo = Date.now();
    try{ fn(); }catch(e1){ try{ console.warn('cronómetro', e1); }catch(e2){} }
    programar();
  }
  return {
    start: function(){
      activo = true; ultimo = Date.now(); programar();
      clearInterval(vig);
      vig = setInterval(function(){ if(activo && Date.now() - ultimo > 2300) pasada(); }, 1000);
    },
    stop: function(){ activo = false; clearTimeout(t); clearInterval(vig); t = null; vig = null; },
    activo: function(){ return activo; }
  };
}
window.jpTicker = jpTicker;
const jpWake = (function(){
  var motivos = {}, sentinel = null, pidiendo = false, reintento = null, avisado = false;
  function hay(){ for(var k in motivos){ if(motivos[k]) return true; } return false; }
  function soporta(){ return 'wakeLock' in navigator; }
  function pedir(){
    if(sentinel || pidiendo || !hay() || !soporta() || document.visibilityState !== 'visible') return;
    pidiendo = true;
    try{
      navigator.wakeLock.request('screen').then(function(s){
        pidiendo = false;
        if(!hay()){ try{ s.release().catch(function(){}); }catch(e0){} return; }
        sentinel = s;
        s.addEventListener('release', function(){ if(sentinel === s){ sentinel = null; if(hay()) setTimeout(pedir, 300); } });
      }).catch(function(){ pidiendo = false; });
    }catch(e1){ pidiendo = false; }
  }
  function soltar(){ if(sentinel){ var s = sentinel; sentinel = null; try{ s.release().catch(function(){}); }catch(e2){} } }
  /* mientras haya un cronómetro activo y no haya candado, se vuelve a pedir cada 4 s (el sistema lo puede soltar por ahorro de batería o por un permiso que tardó) */
  function vigilar(){
    if(reintento) return;
    reintento = setInterval(function(){
      if(!hay()){ clearInterval(reintento); reintento = null; return; }
      if(!sentinel) pedir();
    }, 4000);
  }
  /* sin Wake Lock (navegadores viejos) el teléfono puede bloquearse solo: se avisa una vez para que el alumno lo evite */
  function avisarSinSoporte(){
    if(avisado || soporta()) return;
    avisado = true;
    try{ if(window.CoachAviso && window.CoachAviso.mostrar) window.CoachAviso.mostrar('fatiga', '💡', 'Mantené la pantalla encendida', 'Tu navegador no puede evitar que el teléfono se bloquee solo: poné el bloqueo automático en "nunca" mientras entrenás para que el reloj no se detenga.', 9000); }catch(e3){}
  }
  document.addEventListener('visibilitychange', function(){ if(document.visibilityState === 'visible') pedir(); });
  window.addEventListener('pageshow', pedir);
  window.addEventListener('focus', pedir);
  return {
    on: function(m){ motivos[m] = 1; pedir(); vigilar(); avisarSinSoporte(); },
    off: function(m){ delete motivos[m]; if(!hay()) soltar(); },
    activo: function(){ return !!sentinel; }
  };
})();
window.jpWake = jpWake;
/* =========================================================
   ITEM LINE PARSER
========================================================= */
/* 10/09 -- FIX casilleros fantasma en finisher/lista/metcon: antes,
   CUALQUIER renglón de texto de un bloque tipo 'list' (pizarras de
   CrossFit, circuitos, cardio) se envolvía en .ex-row vía renderLine(),
   y el módulo de "registro compacto en circuitos" (más abajo, función
   registro()) le clavaba un mini-log ([ ] Hecho | Reps o kg) a CADA
   .ex-row sin distinguir si era un ejercicio real o una línea de
   directiva/descanso/nota tipo "- Rest 60s entre rondas -", "Cap 12:00"
   o "min 1:". Esta lista de patrones identifica esas líneas para que
   NUNCA se conviertan en .ex-row (y por lo tanto nunca reciban input). */
/* directiva ("Sanitización del detector de videos y parser") -- suma
   encabezados estructurales de la Pizarra (biset/triset/circuito, "N
   rondas") a la lista de líneas que NUNCA se convierten en .ex-row ni
   reciben videoLinkHtml() -- antes "Triset de Core" colaba como
   ejercicio fantasma en el Glosario Técnico (el mismo renderer genérico
   paralelo que ya limpia nombreLimpioParaVideo() en renderLine(), ver
   más abajo). */
const RX_LINEA_DIRECTIVA = /^[-–—].*[-–—]$|^\(.*\)$|^(cap|rest|descanso|nota|amrap|emom|e2mom|e3mom|for\s*time|ft|min\s*\d+\s*:)\b|^\d+\s*rondas?\b|\b(biset|superset|triset|circuito)\b/i;
function esLineaDirectiva(text){
  const t = String(text == null ? '' : text).trim();
  if(!t) return true;
  return RX_LINEA_DIRECTIVA.test(t);
}
/* FASE 2.2 -- extrae una "dosis" corta y prolija (5/LADO, 2X15S, 2 MIN,
   8 REPS) del detalle libre que el coach escribió después del " — ". Cada
   patrón exige que el detalle EMPIECE con ese número/unidad (^...), y si
   ninguno matchea se devuelve dosis:null -- el detalle completo se
   muestra tal cual, SIN cortar ni una palabra. Esto es a propósito lo que
   evita el bug reportado (texto roto tipo "rotaciones de cadera
   repeticiones por lado", donde un extractor menos estricto se comía el
   número pero dejaba sueltas las palabras de al lado): mejor no mostrar
   dosis corta que mostrar una rota. */
function extraerDosisWU(detail){
  const t = String(detail || '').trim();
  let m;
  if((m = t.match(/^(\d+)\s*(?:x|\*)\s*(\d+)\s*(s|seg|segundos?)\b/i))) return { dosis: m[1] + 'X' + m[2] + 'S', resto: t };
  if((m = t.match(/^(\d+)\s*(?:min|minutos?)\b/i))) return { dosis: m[1] + ' MIN', resto: t };
  if((m = t.match(/^(\d+)\s*(?:s|seg|segundos?)\b/i))) return { dosis: m[1] + ' SEG', resto: t };
  if((m = t.match(/^(\d+)\s*(?:reps?|repeticiones?)\s*(?:por\s*lado|c\/u|cada\s*lado)\b/i))) return { dosis: m[1] + '/LADO', resto: t };
  if((m = t.match(/^(\d+)\s*(?:reps?|repeticiones?)\b/i))) return { dosis: m[1] + ' REPS', resto: t };
  return { dosis: null, resto: t };
}
/* directiva ("Sanitización del detector de videos y parser"): antes de
   resolver un nombre contra la biblioteca de videos, se limpia toda
   anotación que NUNCA es parte del nombre real del ejercicio --
   "A1. Nombre: dosis" (biset/triset/circuito), viñetas sueltas
   ("-"/"*"), y todo lo que sigue a un "|" (Tempo/RIR/Rest). Una línea
   que, ya limpia, queda como una dosis pura sin nombre ("3x10-12",
   típico cuando el nombre va en la línea de arriba) se descarta del
   todo -- nunca se llama a videoLinkHtml() con eso, así nunca aparece
   un chip fantasma "3x10-12 | Tempo 2011"/"Rest ... entre sets"/
   "BISET..." como el reportado. */
const RX_SUBEJ_VIDEO = /^A\d+[.)]\s*(.+?):\s*(.+)$/i;
const RX_DOSIS_SOLA_VIDEO = /^\d+\s*(?:x|×|sets?\s*(?:x|×|de|:)?|series?\s*(?:x|×|de|:)?|rondas?\s*(?:x|×|de|:)?)\s*\d+(?:\s*-\s*\d+)*(?:\s*(?:reps?|kg|lbs?|min|s|seg)\b)?\s*$/i;
function nombreLimpioParaVideo(text){
  let t = String(text || '').trim();
  const subM = t.match(RX_SUBEJ_VIDEO);
  if(subM) t = subM[1].trim();
  else{
    t = t.replace(/^[\s\-•*]+/, '');
    t = t.split('|')[0].trim();
  }
  if(!t || RX_DOSIS_SOLA_VIDEO.test(t)) return '';
  return t;
}
function renderLine(text, enBadge){
  enBadge = enBadge || '';
  /* las fases del calentamiento se muestran como subtítulo, no como ejercicio */
  if(/^\s*\d+\.\s/.test(text) && text.indexOf(' — ') < 0){
    return '<div class="wu-phase">' + text.trim() + '</div>';
  }
  /* líneas de directiva/descanso/nota: texto plano, nunca .ex-row (así
     nunca terminan con un casillero "Hecho | Reps o kg" fantasma) */
  if(esLineaDirectiva(text)){
    return '<div class="circuit-note">' + String(text).trim() + '</div>';
  }
  const dashSplit = text.split(' — ');
  if(dashSplit.length >= 2){
    const name = dashSplit[0];
    const detail = dashSplit.slice(1).join(' — ');
    const d = extraerDosisWU(detail);
    /* pastilla horizontal de 3 columnas: dosis (si se pudo extraer con
       confianza) | nombre + micro-foco | miniatura de video (videoLinkHtml
       ya la arma en 48x48, ver FASE 2 de la directiva anterior). Sin
       dosis reconocida, la columna izquierda no se pinta -- el detalle
       completo pasa entero al micro-foco, nunca se pierde información. */
    return '<div class="ex-row wu-pill"><div class="ex-bullet"></div>' +
      (d.dosis ? '<span class="wu-pill-dose">' + d.dosis + '</span>' : '') +
      '<span class="wu-pill-mid">' +
        '<span class="ex-name wu-pill-name">' + name + enBadge + '</span>' +
        '<span class="ex-detail wu-pill-focus">' + d.resto + '</span>' +
      '</span>' +
      videoLinkHtml(nombreLimpioParaVideo(name)) +
    '</div>';
  }
  return '<div class="ex-row"><div class="ex-bullet"></div><span class="ex-name">' + text + enBadge + videoLinkHtml(nombreLimpioParaVideo(text)) + '</span></div>';
}
/* =========================================================
   QUICK TIMER (cuenta regresiva simple, un solo tramo)
========================================================= */
function buildQuickTimer(root, seconds, label){
  root.innerHTML = '<div class="quick-timer-left" data-label="' + label + '"></div><div style="display:flex;align-items:center;gap:10px;"><span class="qt-display quick-timer-display">' + fmt(seconds) + '</span><button class="qt-btn quick-timer-btn" type="button">Iniciar</button></div>';
  const display = root.querySelector('.qt-display');
  const btn = root.querySelector('.qt-btn');
  let remaining = seconds, rafId=null, lastTs=null, running=false;
  btn.addEventListener('click', function(){
    unlockAudio();
    if(running) return;
    if(remaining<=0) remaining = seconds;
    running = true; btn.textContent = '...'; lastTs = performance.now();
    beepGo(); vibrate(70);
    WakeLockManager.acquire();
    const loop = function(ts){
      if(!running) return;
      remaining -= (ts-lastTs)/1000; lastTs = ts;
      if(remaining<=0){
        remaining = 0; display.textContent = fmt(0); running = false;
        btn.textContent = 'Reiniciar'; try{ jpPerfilSonido.hint('done'); }catch(eH){} beepFinish(); vibrate([80,50,80,50,200]);
        WakeLockManager.release();
        return;
      }
      display.textContent = fmt(remaining);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
  });
}
/* =========================================================
   ROUND TIMER (descanso entre series/rondas, con contador de series)
========================================================= */
const hudEl = document.getElementById('timerHud');
const hudPhaseEl = document.getElementById('hudPhase');
const hudTimeEl = document.getElementById('hudTime');
const hudPlayEl = document.getElementById('hudPlay');
const hudResetEl = document.getElementById('hudReset');
const hudCloseEl = document.getElementById('hudClose');
const hudMinEl = document.getElementById('hudMin');
const hudInfoEl = document.getElementById('hudInfo');
function setHudPhaseClass(cls){
  hudEl.classList.remove('hud-work','hud-rest','hud-prep','hud-done');
  hudEl.classList.add(cls);
}
function buildRoundTimer(container, rounds, restSeconds, opts){
  opts = opts || {};
  const tid = 't' + (timerCounter++);
  let round = 0;
  let remaining = restSeconds;
  let running = false;
  let rafId = null, lastBeepSec = null;
  /* directiva10 -- arquitectura de tiempo absoluto (epoch target), no más
     "remaining -= dt" acumulado entre frames de requestAnimationFrame.
     rAF YA se pausa por completo cuando el navegador manda la pestaña/app
     a segundo plano (pantalla bloqueada, cambio de app) -- al volver, el
     próximo frame llega con el remaining de antes de irse, intacto, en vez
     de reflejar el tiempo real transcurrido. endTs guarda el instante
     absoluto (Date.now()) en el que debería terminar la fase actual;
     "remaining" se recalcula siempre a partir de endTs - Date.now(), así
     que no importa cuánto haya durado la pausa del navegador: el próximo
     tick (natural o forzado por visibilitychange/pageshow/focus, ver
     sincronizarTimersActivos() más abajo) corrige de un salto. */
  let endTs = 0;
  container.innerHTML =
    '<div class="timer-box timer-compact tb-rest" data-tid="'+tid+'">' +
      '<div class="timer-box-label">DESCANSO ENTRE SERIES</div>' +
      '<div class="timer-phase-tag phase-rest tr-tag">DESCANSO</div>' +
      '<div class="timer-round-big">Serie <span class="tr-round">0</span> / ' + rounds + '</div>' +
      '<div class="timer-display tr-display">' + fmt(restSeconds) + '</div>' +
      '<div class="timer-round-bar"><div class="timer-round-bar-fill phase-rest tr-bar" style="width:0%"></div></div>' +
      '<div class="timer-controls-round">' +
        '<button class="tbtn-round tbtn-reset-round tr-reset" type="button" aria-label="Reiniciar">↺</button>' +
        '<button class="tbtn-round tbtn-play tr-play" type="button" aria-label="Iniciar descanso">▶</button>' +
      '</div>' +
      '<div class="wake-indicator tr-wake">Pantalla activa</div>' +
    '</div>';
  const box = container.querySelector('.timer-box');
  const tagEl = container.querySelector('.tr-tag');
  const roundEl = container.querySelector('.tr-round');
  const dispEl = container.querySelector('.tr-display');
  const barEl = container.querySelector('.tr-bar');
  const playBtn = container.querySelector('.tr-play');
  const resetBtn = container.querySelector('.tr-reset');
  const wakeEl = container.querySelector('.tr-wake');
  WakeLockManager.register(wakeEl);
  function updateDisplay(){
    dispEl.textContent = fmt(remaining);
    const pct = Math.max(0, Math.min(100, (1 - remaining/restSeconds) * 100));
    barEl.style.width = pct + '%';
    roundEl.textContent = String(round);
  }
  function setPhaseBox(cls, tagText){
    box.classList.remove('tb-work','tb-rest','tb-prep','tb-done');
    box.classList.add(cls);
    barEl.classList.remove('phase-work','phase-rest','phase-prep','phase-done');
    const phaseCls = cls.replace('tb-','phase-');
    barEl.classList.add(phaseCls);
    tagEl.classList.remove('phase-work','phase-rest','phase-prep','phase-done');
    tagEl.classList.add(phaseCls);
    tagEl.textContent = tagText;
    if(activeTimerId === tid){
      setHudPhaseClass('hud-' + cls.replace('tb-',''));
      hudPhaseEl.textContent = tagText;
    }
  }
  function tick(){
    if(!running) return;
    remaining = Math.max(0, (endTs - Date.now()) / 1000);
    if(remaining <= 3.2 && remaining > 0){
      const sec = Math.ceil(remaining);
      if(sec !== lastBeepSec && sec <= 3){ beepCountdown(); CoachVibra.cuenta(); window.pulsoVisual && pulsoVisual(); lastBeepSec = sec; }
    }
    if(remaining <= 0){
      remaining = 0; updateDisplay();
      running = false; round++; if(rafId){ cancelAnimationFrame(rafId); rafId = null; }
      /* voz: fin del descanso entre series = "¡A trabajar!"; la última serie cierra con "Stop, buen trabajo" */
      try{ jpPerfilSonido.hint(round >= rounds ? 'done' : 'work'); }catch(eH){}
      beepFinish(); CoachVibra.fin(); window.pulsoVisual && pulsoVisual(true);
      WakeLockManager.release();
      if(round >= rounds){
        setPhaseBox('tb-done', 'SERIES COMPLETAS');
        playBtn.disabled = true; playBtn.textContent = '✓';
        playBtn.classList.remove('is-running');
        if(activeTimerId === tid) hideHud();
      }else{
        remaining = restSeconds;
        endTs = Date.now() + restSeconds * 1000;
        setPhaseBox('tb-rest', 'LISTO PARA LA PRÓXIMA');
        playBtn.textContent = '▶'; playBtn.classList.remove('is-running');
        updateDisplay();
      }
      if(activeTimerId === tid) syncHudFrom(tid);
      return;
    }
    updateDisplay();
    if(activeTimerId === tid){ hudTimeEl.textContent = fmt(remaining); }
    rafId = requestAnimationFrame(tick);
  }
  function play(){
    if(round >= rounds) return;
    unlockAudio();
    if(running){
      /* pausa manual: se congela "remaining" con el último valor calculado
         contra endTs (ya está al día por el propio tick de más arriba). */
      running = false;
      if(rafId){ cancelAnimationFrame(rafId); rafId = null; }
      playBtn.textContent = '▶'; playBtn.classList.remove('is-running');
      WakeLockManager.release();
      if(activeTimerId === tid) hudPlayEl.textContent = '▶';
      return;
    }
    running = true; lastBeepSec = null;
    /* reanudar: nueva marca de tiempo absoluta a partir de los segundos
       que habían quedado congelados en la pausa. */
    endTs = Date.now() + remaining * 1000;
    playBtn.textContent = '❚❚'; playBtn.classList.add('is-running');
    setPhaseBox('tb-rest', 'DESCANSO');
    try{ jpPerfilSonido.hint('rest'); }catch(eH){}    /* voz: al empezar este timer arranca el descanso */
    beepGo(); vibrate(60);
    WakeLockManager.acquire();
    activeTimerId = tid;
    showHudFor(tid);
    rafId = requestAnimationFrame(tick);
  }
  function reset(){
    running = false; if(rafId){ cancelAnimationFrame(rafId); rafId = null; }
    round = 0; remaining = restSeconds; lastBeepSec = null; endTs = 0;
    playBtn.disabled = false; playBtn.textContent = '▶'; playBtn.classList.remove('is-running');
    setPhaseBox('tb-rest', 'DESCANSO');
    updateDisplay();
    WakeLockManager.release();
    if(activeTimerId === tid) hideHud();
  }
  /* directiva10 -- llamado por sincronizarTimersActivos() (Page Visibility
     API) para recalcular YA, sin esperar el próximo requestAnimationFrame
     (que en algunos navegadores tarda en retomar tras volver de segundo
     plano). Al llamar tick() directamente se recalcula remaining contra
     endTs y, si ya se cumplió el descanso mientras estuvo bloqueado, dispara
     la rutina de fin (beep/vibración/avance de ronda) en el acto. */
  function resync(){
    if(!running) return;
    if(rafId){ cancelAnimationFrame(rafId); rafId = null; }
    tick();
  }
  playBtn.addEventListener('click', play);
  resetBtn.addEventListener('click', reset);
  updateDisplay();
  liveTimers[tid] = {
    getState: function(){ return { running: running, remaining: remaining, phaseText: tagEl.textContent, phaseCls: box.classList.contains('tb-done')?'hud-done':(box.classList.contains('tb-work')?'hud-work':'hud-rest') }; },
    togglePlay: play,
    reset: reset,
    resync: resync
  };
  return liveTimers[tid];
}
function showHudFor(tid){
  const t = liveTimers[tid];
  if(!t) return;
  const s = t.getState();
  hudEl.classList.add('show');
  hudEl.setAttribute('aria-hidden','false');
  hudPhaseEl.textContent = s.phaseText;
  hudTimeEl.textContent = fmt(s.remaining);
  setHudPhaseClass(s.phaseCls);
  hudPlayEl.textContent = s.running ? '❚❚' : '▶';
  /* si el video ya estaba abierto (el alumno lo dejó puesto entre series),
     el HUD que recién aparece no debe quedar tapado por él -- ver
     ajustarPosicionVideoPopup() junto a openVideoPopup(). */
  if(typeof ajustarPosicionVideoPopup === 'function') setTimeout(ajustarPosicionVideoPopup, 0);
}
function syncHudFrom(tid){
  if(activeTimerId !== tid) return;
  const t = liveTimers[tid];
  if(!t) return;
  const s = t.getState();
  hudPhaseEl.textContent = s.phaseText;
  hudTimeEl.textContent = fmt(s.remaining);
  setHudPhaseClass(s.phaseCls);
  hudPlayEl.textContent = s.running ? '❚❚' : '▶';
}
function hideHud(){
  hudEl.classList.remove('show');
  hudEl.setAttribute('aria-hidden','true');
  activeTimerId = null;
}
hudPlayEl.addEventListener('click', function(){ if(activeTimerId && liveTimers[activeTimerId]) liveTimers[activeTimerId].togglePlay(); });
hudResetEl.addEventListener('click', function(){ if(activeTimerId && liveTimers[activeTimerId]) liveTimers[activeTimerId].reset(); });
hudCloseEl.addEventListener('click', function(){ hideHud(); });
/* directiva ergonómica: minimizar a un chip angosto en vez de taparle al
   alumno los casilleros de Kg×Reps de la ronda activa -- el chip sigue
   contando el tiempo (mismo DOM, sólo CSS), y tocarlo en cualquier punto
   lo vuelve a expandir. */
hudMinEl.addEventListener('click', function(e){
  e.stopPropagation();
  hudEl.classList.add('minimized');
  hudMinEl.textContent = '⤢';
  hudMinEl.title = 'Expandir';
});
hudInfoEl.addEventListener('click', function(){
  if(hudEl.classList.contains('minimized')){
    hudEl.classList.remove('minimized');
    hudMinEl.textContent = '‒';
    hudMinEl.title = 'Minimizar (no tapar los casilleros)';
  }
});
/* fix ergonómico (directiva): en mobile, .rest-hud y .timer-hud pasan a
   anclarse arriba (ver @media(max-width:600px) más abajo en el archivo)
   para nunca competir con los casilleros de Kg×Reps de la fila activa,
   sin importar en qué punto del scroll estaba el alumno cuando el
   descanso se disparó. Se mide la posición REAL de la cabecera pegajosa
   en vez de asumir un alto fijo -- mismo criterio que ya usa
   ajustarPosicionVideoPopup() para el popup de video. Un MutationObserver
   sobre la clase de cada HUD dispara el reposicionamiento apenas
   aparecen, sin tener que tocar arrancarRest()/showHudFor() desde acá. */
(function(){
  function reposicionarHuds(){
    /* la barra que hay que esquivar: la mini barra (46px) cuando se scrolleo, si no la cabecera completa.
       Se usa offsetHeight (no getBoundingClientRect): la cabecera se anima fuera de pantalla con transform. */
    const hdc = document.querySelector('.hd-compact');
    const altoBarra = document.body.classList.contains('jp-scrolled') ? 46 : (hdc ? hdc.offsetHeight : 0);
    const topPill = Math.max(72, Math.round(altoBarra + 8));
    document.documentElement.style.setProperty('--rest-top', topPill + 'px');
    if(window.innerWidth > 600) return;
    const px = topPill + 'px';
    const rh = document.getElementById('restHud');
    if(rh && rh.classList.contains('on')) rh.style.top = px;
    if(hudEl.classList.contains('show')) hudEl.style.top = px;
  }
  ['scroll','resize'].forEach(function(ev){ window.addEventListener(ev, reposicionarHuds, { passive: true }); });
  new MutationObserver(reposicionarHuds).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  reposicionarHuds();
  new MutationObserver(reposicionarHuds).observe(hudEl, { attributes: true, attributeFilter: ['class'] });
  /* #restHud (el <div> del descanso) todavía no existe en el DOM en este
     punto del parseo -- se declara más abajo en el HTML, después de este
     <script> -- así que observarlo acá mismo con getElementById devolvía
     null y el MutationObserver nunca llegaba a engancharse. Se difiere a
     DOMContentLoaded (o se dispara ya si el documento ya terminó de
     cargar), mismo patrón que usan los demás módulos de esta plantilla. */
  function engancharObserverRestHud(){
    const rhEl = document.getElementById('restHud');
    if(rhEl) new MutationObserver(reposicionarHuds).observe(rhEl, { attributes: true, attributeFilter: ['class'] });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', engancharObserverRestHud);
  else engancharObserverRestHud();
})();
/* directiva10 -- al volver de segundo plano (pantalla bloqueada, cambio de
   app, o simplemente foco de la pestaña), se resincronizan YA todos los
   cronómetros de rondas activos contra su endTs real, sin esperar a que
   requestAnimationFrame retome por su cuenta (que puede demorar, o en
   algunos navegadores quedar pausado hasta la próxima interacción). */
function sincronizarTimersRonda(){
  Object.keys(liveTimers).forEach(function(k){
    const t = liveTimers[k];
    if(t && typeof t.resync === 'function') t.resync();
  });
}
document.addEventListener('visibilitychange', function(){
  if(document.visibilityState === 'visible') sincronizarTimersRonda();
});
window.addEventListener('pageshow', sincronizarTimersRonda);
window.addEventListener('focus', sincronizarTimersRonda);
/* =========================================================
   RENDER: WEEK SELECTOR + WEEK INFO
========================================================= */
const weekSelectorEl = document.getElementById('weekSelector');
const weekInfoCardEl = document.getElementById('weekInfoCard');
const weekActiveBadgeEl = document.getElementById('weekActiveBadge');
const heroEyebrowEl = document.getElementById('heroEyebrow');
/* 09/09 -- "semana que le corresponde" a un atleta, sin fecha de inicio
   guardada: la primera semana (en orden) que todavía no tiene TODOS sus
   días marcados como terminados. Si ya terminó todo el programa, se queda
   en la última. Se usa para (a) ubicarlo ahí solo al ABRIR la app -- ver
   init() -- y (b) avisarle si navega a mano a una semana posterior sin
   haber cerrado la que le toca (ver el click de .week-pill más abajo). */
function semanaActivaCorrespondiente(){
  for(var i = 0; i < WEEKS_META.length; i++){
    var completa = DAYS.every(function(d){ return isDayDone(i, d.id); });
    if(!completa) return i;
  }
  return Math.max(0, WEEKS_META.length - 1);
}
/* directiva crítica (2026-09) -- "workout-first": ya no se pinta un banner
   aparte para "Entrenando en: Semana N" -- ese estado vive directamente en
   el chip activo de renderWeekSelector() (mismo dato, un solo lugar). Se
   deja como función segura (no-op sobre un elemento oculto) por si algo
   externo todavía la llama -- nunca rompía antes, tampoco ahora. */
function renderWeekActiveBadge(){
  if(!weekActiveBadgeEl) return;
}
/* directiva crítica (2026-09) -- barra compacta de semana: el chip activo
   muestra semana + fase inline; el resto de las semanas son chips chicos
   sin subtítulo (mismo click-to-switch de siempre). El detalle completo
   (nota metodológica, RPE) se movió a #weekInfoModal -- se abre tocando el
   botón ℹ️ o el chip activo, nunca ocupa espacio en el flujo principal. */
function renderWeekSelector(){
  /* FIX QUIRÚRGICO ("Habilitar selector de semanas en CrossFit") -- una
     directiva anterior ("rediseño header CrossFit") ocultaba esta barra
     por completo para CrossFit, razonando que el atleta navega por DÍA
     (week-tabs) y no por fase de mesociclo -- pero eso dejaba SIN forma
     de llegar a Semana 2/3/4 ya prescriptas por el coach (la
     independencia de semanas de CrossFit, ver itemsDeSemana()/pizarra(),
     necesita una forma de moverse entre semanas para tener sentido).
     Ahora CrossFit vuelve a mostrar la barra, pero con una variante
     propia compacta (.wpc-cf, ver CSS) -- sólo "S1/S2/S3/S4", SIN el
     ícono+fase de mesociclo de Bodybuilding (esos conceptos son de
     Sports, no aplican acá) -- reusando la MISMA lógica de click que
     ya cambia state.currentWeek + renderMain(). Bodybuilding/Sports
     sigue exactamente igual, cero cambios de comportamiento ahí. */
  const wrapMeso = weekSelectorEl.closest('.week-selector-wrap');
  const esCF = window.COACH_DISCIPLINA !== 'sports';
  if(wrapMeso){
    wrapMeso.style.display = '';
    wrapMeso.classList.toggle('week-selector-wrap-cf', esCF);
  }
  /* directiva ("Balancear margen derecho de la fila de semanas -- Sports")
     -- mismo botón estático (.jp-prs-quickbtn), label discipline-aware:
     CrossFit abre la lista de benchmarks olímpicos ("⚡ PRs / 1RM"),
     Sports abre la Bóveda de Récords Personales genérica bajo el label
     "📈 HISTORIAL" (ver el click delegado, más abajo en el archivo). */
  const quickBtn = document.querySelector('.jp-prs-quickbtn');
  if(quickBtn) quickBtn.innerHTML = esCF ? '&#9889; PRs / 1RM' : '&#128200; HISTORIAL';
  if(esCF){
    weekSelectorEl.innerHTML = (WEEKS_META || []).map(function(w, i){
      const activa = i === state.currentWeek;
      return '<div class="week-pill wpc-cf' + (activa ? ' active wpc-current' : ' wpc-mini') + '" data-week="' + i + '">' +
          '<span class="week-pill-name">' + (w.short || ('S' + (i + 1))) + '</span>' +
        '</div>';
    }).join('');
  } else {
    /* directiva maestra ("Compactación y Jerarquía del Header") -- las 4
       píldoras S1-S4 ahora son idénticas en tamaño (sólo el nombre corto,
       sin ícono ni fase inline): la fase de la semana activa se muestra
       aparte, en #weekPhaseSub, una sola línea monospace debajo de toda
       la fila (ver más abajo). Elimina el emoji 🎯/etc de w.icon acá. */
    weekSelectorEl.innerHTML = WEEKS_META.map(function(w,i){
      const activa = i === state.currentWeek;
      return '<div class="week-pill wpc-mini' + (activa ? ' active wpc-current' : '') + '" data-week="' + i + '"' +
          (activa ? ' title="Ver explicación de la semana" aria-label="Ver explicación de la semana"' : '') + '>' +
          '<span class="week-pill-name">' + w.short + '</span>' +
        '</div>';
    }).join('');
    const subEl = document.getElementById('weekPhaseSub');
    if(subEl){
      const wActiva = WEEKS_META[state.currentWeek] || {};
      subEl.textContent = wActiva.phase || '';
    }
  }
  weekSelectorEl.querySelectorAll('.week-pill').forEach(function(p){
    p.addEventListener('click', function(){
      if(p.classList.contains('wpc-current')){
        /* el modal de detalle de fase (RPE/deload/nota metodológica) es
           contenido de Bodybuilding -- en CrossFit el chip activo no
           tiene nada que explicar aparte, así que tocarlo no hace nada. */
        if(!esCF) abrirWeekInfoModal();
        return;
      }
      var destino = parseInt(p.dataset.week, 10);
      /* aviso suave (no bloqueante, sólo Bodybuilding): si salta a una
         semana posterior a la que le corresponde y esa semana propia
         todavía no está cerrada, se lo hacemos notar -- pero lo dejamos
         avanzar si quiere. En CrossFit las semanas son independientes a
         propósito (directiva de independencia de semanas): no hay una
         "semana correcta" que reforzar, así que este aviso no aplica. */
      /* el cartel emergente "Semana adelantada ... Entendido" se retiró por completo: cambiar de semana es directo y sin avisos */
      state.currentWeek = destino;
      jpGuardarPosicion();
      aplicarSemanaActivaBlocks();
      saveProgress();
      renderWeekSelector();
      renderWeekInfo();
      renderMain();
    });
  });
}
function abrirWeekInfoModal(){
  var m = document.getElementById('weekInfoModal');
  if(m && typeof openModal === 'function') openModal(m);
}
function renderWeekInfo(){
  const w = WEEKS_META[state.currentWeek];
  heroEyebrowEl.textContent = PROGRAM_CONFIG.mesoName + ' — ' + w.name;
  /* elemento legado oculto -- se mantiene sincronizado por si algo externo
     lo lee, pero ya no es lo que ve el alumno/a (ver #weekInfoModal). */
  if(weekInfoCardEl) weekInfoCardEl.innerHTML =
    '<div class="week-info-card' + (w.deload?' is-deload':'') + '">' +
      '<div class="week-info-icon">' + w.icon + '</div>' +
      '<div>' +
        '<div class="week-info-title">' + w.name + ' · ' + w.phase + ' — ' + w.rpe + '</div>' +
        '<div class="week-info-text">' + w.note + '</div>' +
      '</div>' +
    '</div>';
  var mIcon = document.getElementById('weekInfoModalIcon');
  var mTitle = document.getElementById('weekInfoModalTitle');
  var mText = document.getElementById('weekInfoModalText');
  if(mIcon) mIcon.textContent = w.icon;
  if(mTitle) mTitle.textContent = w.name + ' · ' + w.phase + ' — ' + w.rpe;
  if(mText){
    /* objetivo de la semana (CrossFit, generado/editado por el coach): se muestra primero, como texto (nunca como HTML) */
    var objSem = String(w.objetivo || '').trim();
    var objEl = document.createElement('div'); objEl.textContent = objSem;
    mText.innerHTML = objSem
      ? '<b>🎯 Objetivo de la semana</b><br>' + objEl.innerHTML.replace(/\n/g, '<br>') + (w.note ? '<br><br>' : '') + (w.note || '')
      : w.note;
  }
  renderWeekActiveBadge();
}
/* =========================================================
   RENDER: DAY TABS
========================================================= */
const weekTabsEl = document.getElementById('week-tabs');
function dayBlockIds(day){
  const ids = day.blocks.map(function(b){ return b.id; });
  if(day.finisher) ids.push(day.finisher.id);
  if(day.hyrox) ids.push(day.hyrox.id);
  return ids;
}
function renderDayTabs(){
  weekTabsEl.innerHTML = DAYS.map(function(d){
    const isActive = d.id === state.currentDay;
    const isDone = isDayDone(state.currentWeek, d.id);
    return '<div class="day-tab' + (isActive?' active':'') + (isDone?' completed-day':'') + (d.optional?' is-optional':'') + '" data-day="' + d.id + '" title="' + escHtmlSafe(d.short + (d.label ? ' \u00b7 ' + d.label : '')) + '">' +
      '<span class="tab-name">' + d.short + '</span>' +
      '<span class="tab-label">' + d.label + '</span>' +
      '<span class="day-dot"></span>' +
    '</div>';
  }).join('');
  weekTabsEl.querySelectorAll('.day-tab').forEach(function(t){
    t.addEventListener('click', function(){
      state.currentDay = t.dataset.day;
      jpGuardarPosicion();
      renderDayTabs();
      renderMain();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}
/* =========================================================
   RENDER: MAIN (día activo)
========================================================= */
const mainEl = document.getElementById('mainContent');
const progressFillEl = document.getElementById('progress-fill');
const progressCountEl = document.getElementById('progress-count');
function getCurrentDay(){
  return DAYS.find(function(d){ return d.id === state.currentDay; }) || DAYS[0];
}
/* Independencia real de semanas (CrossFit): day.blocks es la propiedad que
   TODO el resto de este script ya lee directamente (decorar(), pintarResumen(),
   datosStoryCF(), y una veintena más de módulos de repintado) -- en vez de
   injertar el selector de semana en cada uno de esos puntos, se mantiene
   day.blocks apuntando siempre al array de la semana activa (day.blocksPorSemana
   [state.currentWeek], exportado por el Builder sólo para planes CrossFit --
   ver buildProgramConfig()). Un plan sin blocksPorSemana (Sports/Bodybuilding,
   o una página ya exportada antes de este fix) no se toca: day.blocks sigue
   siendo exactamente el array fijo de siempre. Se llama al iniciar la app y
   cada vez que el alumno cambia de semana con la pastilla S1-S4. */
function aplicarSemanaActivaBlocks(){
  var wk = state.currentWeek || 0;
  DAYS.forEach(function(day){
    if(Array.isArray(day.blocksPorSemana)){
      day.blocks = day.blocksPorSemana[wk] || day.blocksPorSemana[0] || [];
    }
  });
}
function visibleBlocks(day){
  const all = day.blocks.concat(day.finisher ? [day.finisher] : [], day.hyrox ? [day.hyrox] : []);
  return all.filter(function(b){ return state.mode === 'complete' || !b.optional; });
}
/* algunos generadores de CrossFit marcan una semana de menor frecuencia dejando
   un bloque sin contenido real, con un texto centinela fijo en vez de la
   sesión. Sin este chequeo, ese texto se mostraba tal cual — como si el bloque
   estuviera roto o vacío por error — en vez de leerse como algo intencional. */
function esBloqueSinSemana(block, weekIdx){
  if(block.weekName && block.weekName[weekIdx] === '— Sin bloque esta semana —') return true;
  const arr = (block.weekItems && block.weekItems[weekIdx]) ? block.weekItems[weekIdx] : null;
  if(arr && arr.length === 1 && String(arr[0]).indexOf('No hay bloque asignado para este') === 0) return true;
  return false;
}
function alertsHtml(block){
  if(!block.alerts || !block.alerts.length) return '';
  return block.alerts.map(function(a){
    const cls = a.level === 'danger' ? 'note-danger' : (a.level === 'warn' ? 'note-warn' : 'note-safe');
    return '<div class="coach-note ' + cls + '"><strong>' + a.title + '</strong>' + a.msg + '</div>';
  }).join('');
}
function objectiveHtml(block){
  /* directiva ("Unificación de tips/videos") -- cuarta fuente de la
     misma duplicación, esta vez ESTÁTICA (horneada en el HTML de
     compile(), antes de que pizarraSports() corra en el navegador): la
     rama genérica de renderBlockInner() ya llamaba a esto para
     CUALQUIER bloque 'list' no-CF, pizarra incluida -- el mismo
     block.objective terminaba mostrándose acá Y en el acordeón único
     de la Pizarra. mapearBloques() marca block.sportsPizarra en el
     JSON compilado (ver buildProgramConfig), así que alcanza con cortar
     acá, un solo punto, para los 3 call-sites de esta función. */
  if(!block.objective || block.sportsPizarra) return '';
  const meta = CATEGORY_META[block.category] || CATEGORY_META.strength;
  return '<div class="block-insights ' + meta.insightsCls + '"><div class="insights-header">🎯 Objetivo del bloque</div><div class="insights-body"><div class="insight-item"><span class="insight-icon">✦</span><div class="insight-content"><div class="insight-text">' + block.objective + '</div></div></div></div></div>';
}
function renderBlockInner(block, day, weekIdx){
  let html = '';
  if(block.isBlock){
    const wd = weekDetail(block, weekIdx);
    const nombreSemana = (block.weekExercise && block.weekExercise[weekIdx]) || block.exerciseName;
    /* el badge "EN" sólo corresponde al ejercicio por defecto: si el coach
       escribió un reemplazo puntual para esta semana (weekExercise), ese
       texto libre no tiene un inglés asociado que mostrar aparte. */
    const enBadgeBlock = (!(block.weekExercise && block.weekExercise[weekIdx]) && block.exerciseNameEn) ? enBadgeHtml(block.exerciseNameEn) : '';
    const repsSemana = (block.weekReps && block.weekReps[weekIdx]) || block.reps;
    const setsSemana = (block.weekSets && block.weekSets[weekIdx]) || wd.efSets;
    const lblSets = (block.weekSets && block.weekSets[weekIdx]) ? (setsSemana + ' series · ') : wd.setsLabel;
    html += '<div class="ex-row"><div class="ex-bullet"></div><span class="ex-name">' + nombreSemana + enBadgeBlock + videoLinkHtml(nombreSemana) + '</span>' +
      '<span class="ex-detail"><strong>' + lblSets + '</strong>' + repsSemana + ' · Tempo ' + block.tempo +
      refPreviaHtml(weekIdx, day.id, block.id, 0, setsSemana) + '</span></div>';
    if(typeof renderSetRows === 'function'){
      html += renderSetRows(weekIdx, day.id, block.id, 0, setsSemana, repsSemana, cargaSugeridaKg(block, weekIdx), nombreSemana, (block.title||'') + ' ' + (block.subtitle||''));
    }
    var notaSem = (block.weekNote && block.weekNote[weekIdx]) || block.tips;
    if(notaSem){ html += '<div class="coach-note"><strong>Coach Note</strong>' + notaSem + '</div>'; }
    if(block.altNote){
      html += '<div class="coach-note note-safe"><strong>Alternativa</strong>' + block.altNote + '</div>';
    }
    html += alertsHtml(block);
    html += objectiveHtml(block);
    /* el reloj estático se retiró: el descanso lo maneja el temporizador flotante */
    html += '<div class="timer-slot" hidden data-rounds="' + wd.efSets + '" data-rest="' + block.restSeconds + '"></div>';
  } else if(block.isSuperset){
    const sd = supersetDetail(block, weekIdx);
    html += '<div class="superset-header"><span class="sh-icon">🔗</span><span class="sh-text">' + sd.header + '</span></div>';
    sd.exercises.forEach(function(ex, exIdx){
      /* FASE 2.3 -- se retira el badge [EN] específicamente acá (leído
         como "desconocido" en la auditoría visual): en biset/triset ya
         hay dos o tres nombres de ejercicio compitiendo por espacio en
         cada fila, así que la cápsula extra de "nombre en inglés" suma
         más ruido que valor justo en este contexto denso. enBadgeHtml()
         sigue existiendo tal cual para el resto de la app (bloque normal,
         finisher, calentamiento) -- no se toca la función, solo se deja
         de invocar en esta rama puntual. */
      html += '<div class="ex-row"><div class="ex-bullet"></div><span class="ex-name">' + ex.name + videoLinkHtml(ex.name) + '</span><span class="ex-detail">' + ex.reps + (ex.tempo ? ' · Tempo ' + ex.tempo : '') +
        refPreviaHtml(weekIdx, day.id, block.id, exIdx, sd.rounds) + '</span></div>';
      if(typeof renderSetRows === 'function'){
        html += renderSetRows(weekIdx, day.id, block.id, exIdx, sd.rounds, ex.reps, cargaSugeridaKg(block, weekIdx), ex.name, (block.title||'') + ' ' + (block.subtitle||''));
      }
    });
    html += '<span class="directive-badge">\u26a1 Transici\u00f3n continua (sin pausa)</span>';
    if(block.tips){ html += '<div class="coach-note"><strong>Coach Note</strong>' + block.tips + '</div>'; }
    if(block.altNote){ html += '<div class="coach-note note-safe"><strong>Alternativa</strong>' + block.altNote + '</div>'; }
    html += alertsHtml(block);
    html += objectiveHtml(block);
    html += '<div class="timer-slot" hidden data-rounds="' + sd.rounds + '" data-rest="' + block.restSeconds + '"></div>';
  } else if(block.isFinisher){
    const fd = finisherDetail(block, weekIdx);
    if(fd){
      fd.exercises.forEach(function(ex){
        html += renderLine(ex.name + ' — ' + ex.repsRange, enBadgeHtml(ex.nameEn));
      });
      html += '<div class="directive-chip round-chip">' + fd.roundsText + '</div>';
      if(block.tips){ html += '<div class="coach-note"><strong>Coach Note</strong>' + block.tips + '</div>'; }
      html += alertsHtml(block);
    }else{
      html += '<div class="info-card" style="margin-top:0;"><p>Esta semana es de descarga (Deload) — el finisher se saltea para disipar la fatiga acumulada.</p></div>';
    }
  } else if(block.isHyrox){
    const hd = hyroxDetail(block, weekIdx);
    if(hd.minutes){
      html += '<div class="directive-chip round-chip">AMRAP ' + hd.minutes + ' minutos — la mayor cantidad de rondas posibles</div>';
      hd.movements.forEach(function(m){ html += renderLine(m); });
      if(block.tips || hd.note){ html += '<div class="coach-note"><strong>Coach Note</strong>' + (block.tips||'') + (hd.note ? ' (' + hd.note + ')' : '') + '</div>'; }
      html += alertsHtml(block);
      html += '<div class="quick-timer-slot" data-seconds="' + (hd.minutes*60) + '" data-label="AMRAP"></div>';
    }else{
      html += '<div class="info-card" style="margin-top:0;"><p><strong style="color:var(--text-primary)">Semana de Descarga:</strong> cambiá el bloque Hyrox por 15-20 minutos de cardio Zona 2 continuo (bici, remo suave o caminata inclinada) a intensidad conversacional. El objetivo es circular sangre y disipar fatiga, no sumar más estímulo.</p></div>';
      html += '<div class="quick-timer-slot" data-seconds="1080" data-label="ZONA 2"></div>';
    }
  } else if(esBloqueSinSemana(block, weekIdx)){
    html += '<div class="info-card" style="margin-top:0;"><p>Esta semana el ciclo programa menor frecuencia: este bloque no tiene sesión asignada. No es un error, tranquilo/a.</p></div>';
  } else {
    const itemsSemana = itemsDeSemana(block, weekIdx);
    /* directiva ("Sanitización del detector de videos y parser"): este
       bloque 'list' genérico se ejecuta SIEMPRE, hasta para un bloque
       sportsPizarra -- pizarraSports() ya pinta su propia UI encima de
       este HTML (oculto vía display:none, ver su cola más abajo en el
       archivo), así que este .ex-row nunca se VE para la Pizarra, pero
       sigue existiendo en el DOM. renderLine() llama a videoLinkHtml()
       para cada línea cruda tal cual -- eso generaba un SEGUNDO
       .video-link oculto por ejercicio (pizarraSports() ya crea el suyo
       propio, limpio) que limpiar() barría igual hacia el Glosario
       Técnico: tarjetas DUPLICADAS por ejercicio, algunas con el ícono
       🔍 pegado al nombre porque la estructura .ex-name de renderLine()
       envuelve texto+link juntos sin un span de nombre propio que
       aislar. Se salta por completo para CUALQUIER bloque sportsPizarra
       -- pizarraSports() ya resuelve el video de cada ejercicio (simple,
       biset, "sin dosis") por su cuenta, este renderer paralelo nunca
       aporta nada nuevo ahí. Nunca afecta CrossFit (nunca trae
       sportsPizarra) ni un bloque 'list' clásico de Sports fuera de la
       Pizarra. */
    if(!itemsSemana.length && weekIdx > 0){
      /* directiva ("Independencia Total de Semanas") -- semana sin
         prescripción propia todavía: mensaje explícito en vez de
         mostrar (o heredar) el contenido de otra semana. */
      html += '<div class="info-card" style="margin-top:0;"><p>Todavía no se cargó la prescripción de esta semana. Consultá con tu coach.</p></div>';
    } else if(!block.sportsPizarra){
      itemsSemana.forEach(function(item){ html += renderLine(item); });
    }
    /* directiva ("Unificación de tips/videos") -- quinta fuente de la
       misma duplicación (Coach Note = block.tips, esta vez): el
       acordeón único de la Pizarra (.jp-sb-board) ya muestra
       block.tips una sola vez, así que este "Coach Note" estático se
       corta para cualquier bloque marcado sportsPizarra (ver comentario
       gemelo en objectiveHtml(), arriba en este mismo archivo). */
    if(block.tips && !block.sportsPizarra){ html += '<div class="coach-note"><strong>Coach Note</strong>' + block.tips + '</div>'; }
    html += alertsHtml(block);
    html += objectiveHtml(block);
    if(block.cardioMinutes){
      html += '<div class="quick-timer-slot" data-seconds="' + (block.cardioMinutes*60) + '" data-label="ZONA 2"></div>';
    }
  }
  return html;
}
/* porcentaje de la carga base según la semana del mesociclo */
const PCT_SEMANA = [
  { pct:[70,75], lb:'Aclimatación' },
  { pct:[80,85], lb:'Sobrecarga I' },
  { pct:[90,100], lb:'Pico / fallo técnico' },
  { pct:[60,60], lb:'Deload' },
  { pct:[75,80], lb:'Reintensificación' },
  { pct:[60,60], lb:'Deload / Cierre' }
];
function redondear05(v){ return Math.round(v / 0.5) * 0.5; }
function cargaSugeridaHtml(block, weekIdx){
  const trabajo = block.isBlock || block.isSuperset || block.isFinisher;
  if(!trabajo) return '';
  const base = parseFloat(block.baseLoad);
  const wm = WEEKS_META[weekIdx] || {};
  /* el bloque puede traer su propio % por semana (núcleo de weightlifting) */
  const propio = block.weekPct && block.weekPct[weekIdx] != null ? parseFloat(block.weekPct[weekIdx]) : null;
  if(!base || base <= 0){
    /* sin 1RM cargado: se muestra el carácter del esfuerzo, no kilos inventados */
    const rpe = (block.weekRpe && block.weekRpe[weekIdx]) || wm.rpe || 'RPE 8 (RIR 2)';
    return '<div class="load-suggest rpe"><span class="ls-ic">🎯</span><div><b>Sugerido: ' + rpe + '</b>' +
      '<span>Sin marca de 1RM cargada para este ejercicio: guiate por el carácter del esfuerzo' +
      (propio ? ' (intensidad programada ' + propio + '%)' : '') + '.</span></div></div>';
  }
  let a, b, pct;
  if(propio){
    a = b = redondear05(base * propio / 100);
    pct = propio + '%';
  } else {
    const w = PCT_SEMANA[weekIdx] || PCT_SEMANA[PCT_SEMANA.length - 1];
    a = redondear05(base * w.pct[0] / 100);
    b = redondear05(base * w.pct[1] / 100);
    pct = (w.pct[0] === w.pct[1]) ? (w.pct[0] + '%') : (w.pct[0] + '-' + w.pct[1] + '%');
  }
  const rango = (a === b) ? (a + ' kg') : (a + ' – ' + b + ' kg');
  const lb = propio ? (wm.phase || '') : (PCT_SEMANA[weekIdx] || PCT_SEMANA[PCT_SEMANA.length - 1]).lb;
  return '<div class="load-suggest"><span class="ls-ic">🎯</span><div><b>Sugerido ' + (wm.short || '') + ': <code class="ls-num">' + rango + '</code> (' + pct + ')</b>' +
    '<span>Sobre tu carga base de ' + base + ' kg · ' + lb + '</span></div></div>';
}
function notesKey(weekIdx, dayId, blockId){ return weekIdx + '|' + dayId + '|' + blockId; }
/* chips de 1 toque para la nota del bloque (propuesta 27/08, Sección 02 ·
   Notas por chip) — escriben al MISMO campo/clave que ya usa el textarea,
   no agregan un dato nuevo. */
const NOTE_CHIPS = [
  { ic:'💪', tx:'Fácil', frase:'Sensación: fácil, quedó margen.' },
  { ic:'😐', tx:'Justo', frase:'Sensación: justo, al límite de lo pautado.' },
  { ic:'🥵', tx:'Al límite', frase:'Sensación: al límite, muy exigido.' }
];
function bloqueNotasHtml(block, day, weekIdx){
  const k = notesKey(weekIdx, day.id, block.id);
  const val = (state.notes && state.notes[k]) ? state.notes[k] : '';
  const chips = '<div class="note-chips">' + NOTE_CHIPS.map(function(c){
    return '<button type="button" class="note-chip" data-note-frase="' + c.frase.replace(/"/g,'&quot;') + '">' +
      '<span class="ic">' + c.ic + '</span>' + c.tx + '</button>';
  }).join('') + '</div>';
  return '<div class="block-notes"><label>📝 Notas / Observaciones del Bloque</label>' + chips +
    '<textarea class="block-note-input" data-note-key="' + k + '" rows="2" placeholder="Sensaciones, molestias o ajustes de hoy...">' +
    val.replace(/</g,'&lt;') + '</textarea></div>';
}
/* Buzón de feedback en video — colapsable, solo en ejercicios principales
   (category === 'strength'). El alumno pega el link de su video de técnica;
   se guarda localmente y se encola a CoachOutbox para que el coach lo vea. */
function escHtmlSafe(s){
  return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function videoFeedbackHtml(block, day, weekIdx){
  if(block.category !== 'strength') return '';
  const k = notesKey(weekIdx, day.id, block.id);
  const links = (state.videoLinks && state.videoLinks[k]) || [];
  return '<details class="video-fb"><summary class="video-fb-sum">' +
      '<span class="vfb-ic">🎥</span><span class="vfb-ti">Buzón de feedback en video</span>' +
      (links.length ? '<span class="vfb-count">' + links.length + '</span>' : '') +
      '<span class="vfb-cv">▾</span>' +
    '</summary><div class="video-fb-body">' +
      (links.length ? '<div class="vfb-list">' + links.map(function(l, i){
        return '<div class="vfb-item"><a href="' + escHtmlSafe(l.url) + '" target="_blank" rel="noopener noreferrer">' + escHtmlSafe(l.url) + '</a>' +
          '<button type="button" class="vfb-del" data-vfb-del="' + i + '" data-vfb-key="' + escHtmlSafe(k) + '" title="Quitar">✕</button></div>';
      }).join('') + '</div>' : '') +
      '<div class="vfb-add">' +
        '<input type="url" class="vfb-input" placeholder="Pegá el link de tu video (YouTube, Drive, WhatsApp...)" data-vfb-key="' + escHtmlSafe(k) + '">' +
        '<button type="button" class="vfb-send" data-vfb-key="' + escHtmlSafe(k) + '">Enviar al coach</button>' +
      '</div>' +
    '</div></details>';
}
/* Íconos de línea a medida para categoría de bloque (propuesta 27/08,
   Sección 01 · Iconografía). block.icon es un DATO del atleta/rutina
   (lo elige el coach en el builder y queda guardado tal cual) — esta
   función SOLO cambia cómo se dibuja en pantalla, nunca toca ni
   reescribe ese dato. Si el emoji guardado no está en el mapa, se
   muestra el emoji original sin cambios: cero riesgo de romper rutinas
   ya armadas con íconos que hoy no cubrimos. */
const BLOCK_ICON_SVG = {
  '💪': '<line x1="3.2" y1="8" x2="12.8" y2="8"/><rect x="1.2" y="5.5" width="2" height="5" rx="0.6"/><rect x="12.8" y="5.5" width="2" height="5" rx="0.6"/>',
  '🏋️': '<line x1="3.2" y1="8" x2="12.8" y2="8"/><rect x="1.2" y="5.5" width="2" height="5" rx="0.6"/><rect x="12.8" y="5.5" width="2" height="5" rx="0.6"/>',
  '🔥': '<polyline points="4,11 8,7 12,11"/><polyline points="5.5,13.6 8,11 10.5,13.6"/>',
  '🎯': '<circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="2.4"/>',
  '📈': '<polyline points="2.5,12 6,8.5 9,10.5 13.5,4"/><circle cx="13.5" cy="4" r="1" fill="currentColor" stroke="none"/>',
  '🧊': '<rect x="3.5" y="3.5" width="9" height="9" rx="1" transform="rotate(45 8 8)"/>',
  '🛡️': '<polygon points="8,1.5 13,3.6 13,8.4 8,14.5 3,8.4 3,3.6"/>',
  '⚡': '<polygon points="8.5,1.5 4,9 7.3,9 6.3,14.5 12,7 8.3,7"/>',
  '🔁': '<polyline points="4,6 4,3 10,3"/><polyline points="8.5,1.5 10,3 8.5,4.5"/><polyline points="12,10 12,13 6,13"/><polyline points="7.5,14.5 6,13 7.5,11.5"/>',
  '🔗': '<rect x="2" y="6.2" width="6.2" height="3.6" rx="1.8"/><rect x="7.8" y="6.2" width="6.2" height="3.6" rx="1.8"/>',
  '🌀': '<path d="M13 8A5 5 0 1 1 10.6 3.9"/><polyline points="10,2.4 10.6,3.9 12.3,3.6"/>'
};
function blockIconHtml(raw){
  const body = BLOCK_ICON_SVG[raw];
  if(!body) return raw;
  return '<svg class="bi-svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
}
/* directiva de emergencia (rediseño F): rótulo del header = rol del bloque
   ("Bloque A · Principal"), nunca el nombre del ejercicio ni el título
   libre que haya escrito el coach -- eso es justo lo que desbordaba
   "[ SENTADILLA CON BA... ]". block.title/weekName no se pierden (siguen
   en el dato, no se muestran acá); el nombre real vive una sola vez, en
   .ex-name dentro del cuerpo. */
/* "Entrada en calor" truncaba con el rótulo más grande (pulido de
   jerarquía visual) -- "Calentamiento" dice lo mismo en menos caracteres
   y entra completo en el ancho del header. */
const ROL_BLOQUE_CAT = { strength:'Principal', accessory:'Accesorio', metcon:'Finisher', cardio:'Cardio', warmup:'Calentamiento' };
/* en CrossFit, category es la Fase de la pizarra (Warm-up/Skill-Strength/
   WOD-Metcon/Hyrox Stations/Accessory-Cooldown), no el rol de Bodybuilding
   -- "metcon" ahí NO es "Finisher", así que el pill de cada bloque usa un
   vocabulario propio en vez del de ROL_BLOQUE_CAT (pensado para musculación). */
const ROL_BLOQUE_CAT_CF = { warmup:'Warm-Up', strength:'Skill / Strength', metcon:'WOD / Metcon', cardio:'Hyrox Stations', accessory:'Accessory / Cooldown', endurance:'2º Turno / Endurance' };
/* placeholder que el compilador del Builder auto-completa en bloques vacíos
   (ver Módulo 44, "auto-fill vacío") -- si es lo único que trae el bloque,
   para el alumno es un bloque sin contenido real y no debe renderizarse.
   Global (no dentro del IIFE de pizarra()) porque tanto renderBlock() acá
   como pizarra() más abajo necesitan la misma regla. */
const CF_PLACEHOLDER = 'Cargá acá los ítems del bloque, uno por línea';
function esBloqueVacioCF(block){
  const items = (block.items || []).map(x => String(x || '').trim()).filter(Boolean);
  if(!items.length) return true;
  return items.length === 1 && items[0] === CF_PLACEHOLDER;
}
/* Independencia real de semanas: el parámetro block ya es el bloque
   propio de la semana activa (day.blocks fue apuntado ahí por
   aplicarSemanaActivaBlocks(), ver junto a getCurrentDay()) -- así que
   block.items YA es el contenido correcto de esa semana, sin ningún
   overlay adicional. weekIdx se mantiene en la firma sólo por
   compatibilidad con quien la llame, no se usa más. */
function itemsDeSemana(block, weekIdx){
  /* directiva ("Motor de Ondulación S1 -> S4"): un bloque de Pizarra
     Sports puede traer, además de block.items (Semana 1), una proyección
     propia por semana en block.weekItems[1..3] (ver
     ondularMesocicloAutomatico() en el Builder). CrossFit nunca llega acá
     con weekItems poblado -- su independencia de semanas vive en
     day.blocksPorSemana (block YA es el de la semana activa), así que
     este chequeo es un no-op total para CF. */
  if(weekIdx > 0 && Array.isArray(block.weekItems) && Array.isArray(block.weekItems[weekIdx]) && block.weekItems[weekIdx].length){
    return block.weekItems[weekIdx];
  }
  return block.items || [];
}
/* datos para la Story Card exclusiva de CrossFit: kg clave del bloque de
   fuerza/skill, estructura del WOD/Metcon y el score que el alumno ya
   cargó en la Pizarra -- lee directo de day.blocks (mismos datos
   compilados que ya usa pizarra(), sin duplicar lógica de parseo). */
function datosStoryCF(weekIdx, day){
  const blocks = (day.blocks || []).filter(b => !esBloqueVacioCF(b));
  const warmup = blocks.find(b => b.category === 'warmup');
  const strengthBlocks = blocks.filter(b => b.category === 'strength');
  const wodsDia = blocks.filter(b => b.category === 'metcon');
  const wod = wodsDia.find(b => String((state.scores && state.scores[weekIdx + '|' + day.id + '|' + b.id]) || '').trim()) || wodsDia[0] || blocks.find(b => b.category === 'cardio' || b.category === 'endurance');
  /* directiva (fix integral Story Card 9:16): antes la tarjeta sólo
     mostraba kilos clave + estructura + score -- si el bloque de fuerza
     no traía un "@ Xkg" literal (ej. técnica/skill sin carga puntual) o
     el WOD todavía no tenía score cargado, el cuerpo de la tarjeta
     quedaba con una sola card y el resto del lienzo vacío (el "lienzo
     casi vacío" reportado). Ahora Warm-up/Skill/WOD siempre aportan al
     menos un texto de resumen (con fallback al título del bloque), así
     el cuerpo nunca depende de un solo regex para tener contenido. */
  let warmupTxt = '';
  if(warmup){
    const hecho = isBlockDone(weekIdx, day.id, warmup.id);
    warmupTxt = (hecho ? '✓ ' : '') + (warmup.title || 'Warm-Up');
  }
  const prefDia = weekIdx + '|' + day.id + '|';
  /* directiva ("Consolidación Multi-Bloque Dinámica") -- el volumen ya
     NO se resuelve a nivel DÍA completo (o todo desde state.loads, o
     todo prescripto): se resuelve BLOQUE POR BLOQUE, mezclando lo que
     el alumno realmente tildó en state.loads con el cálculo prescripto
     SOLO para los bloques que no tengan series propias logueadas. Antes,
     si el alumno tildaba series de UN bloque (ej. Back Squat) pero no
     de otro (ej. Snatch Complex), el DÍA ENTERO caía al modo
     "loads-based" apenas volumenTotal > 0, y el Snatch quedaba
     directamente afuera de la suma -- el bug real reportado ("dejó
     afuera los Snatches y arrojó sólo 1.531 kg"). Ahora cada bloque
     aporta su propio volumen real (si el alumno lo tildó) o prescripto
     (si no), y la suma final es la unión de los dos, nunca uno u otro
     a nivel día. */
  function volumenDeBloque(b){
    let vol = 0, top = 0, huboLoads = false;
    const prefBloque = prefDia + b.id + '|';
    Object.keys(state.loads || {}).forEach(function(k){
      if(k.indexOf(prefBloque) !== 0) return;
      const l = state.loads[k];
      if(!l || !l.done) return;
      huboLoads = true;
      const kg = numJP(l.kg);
      vol += jpTonelajeSerie(l);
      if(kg > top) top = kg;
    });
    if(huboLoads) return { vol: vol, top: top };
    let setsActuales = 1, volP = 0, topP = 0;
    (b.items || []).forEach(function(raw){
      const l = String(raw || '').trim();
      if(!l) return;
      const schemeM = l.match(/x\s*(\d+)\s*sets?\b/i) || l.match(/^(\d+)\s*sets?\b/i);
      if(schemeM){ setsActuales = parseInt(schemeM[1], 10) || 1; return; }
      const repsM = l.match(/^(\d+)\s+\S/);
      if(!repsM) return;
      const reps = parseInt(repsM[1], 10) || 0;
      if(!reps) return;
      const resuelto = (typeof window.jpCfResolverKgLinea === 'function') ? window.jpCfResolverKgLinea(l) : null;
      const kg = (resuelto && resuelto.kg != null) ? resuelto.kg : null;
      if(kg == null || kg <= 0) return;
      volP += reps * setsActuales * kg;
      if(kg > topP) topP = kg;
    });
    return { vol: volP, top: topP };
  }
  let volumenTotal = 0, topLiftKg = 0;
  strengthBlocks.forEach(function(b){
    const r = volumenDeBloque(b);
    volumenTotal += r.vol;
    if(r.top > topLiftKg) topLiftKg = r.top;
  });
  volumenTotal = Math.round(volumenTotal);
  const esPR = !!(state.session && state.session.prs && state.session.prs.length > 0);
  /* directiva ("Composición Universal de Movimientos") -- Hero Card 1
     ya no protagoniza con el título de UN solo bloque (el más pesado):
     el título pasa a ser una categoría dinámica según la MEZCLA real de
     bloques de fuerza del día (halterofilia vs. básicos de barra), y un
     subtexto lista TODOS los bloques trabajados como chips ("Snatch
     Complex · Back Squat Wave"), no sólo el ganador. */
  function esOlimpico(b){
    const texto = ((b.title || '') + ' ' + (b.items || []).join(' ')).toLowerCase();
    return /snatch|clean|jerk|c&j|complex/.test(texto);
  }
  function limpiarTituloBloque(b){
    return String((b && b.title) || '').replace(/^\s*(?:bloque|block)\s*\d+\s*:\s*/i, '').trim();
  }
  let skillTitulo = '', skillChips = '', kgClave = '';
  if(strengthBlocks.length){
    const tieneOlimpico = strengthBlocks.some(esOlimpico);
    const tieneBasico = strengthBlocks.some(function(b){ return !esOlimpico(b); });
    if(tieneOlimpico && tieneBasico) skillTitulo = 'OLYMPIC LIFTING & STRENGTH';
    else if(tieneOlimpico) skillTitulo = 'OLYMPIC WEIGHTLIFTING';
    else skillTitulo = 'STRENGTH & TONNAGE';
    skillChips = strengthBlocks.map(limpiarTituloBloque).filter(function(t){ return t && !/^bloque\s*\d*$/i.test(t); }).join(' · ');
    if(topLiftKg <= 0){
      outer: for(const b of strengthBlocks){
        for(const l of (b.items || [])){
          const m = String(l).match(/@\s*([\d.,/]+)\s*kg/i) || String(l).match(/(\d+(?:[.,]\d+)?)\s*kg/i);
          if(m){ kgClave = m[1] + ' KG'; break outer; }
        }
      }
    }
  }
  let estructura = '';
  if(wod && wod.items){
    /* directiva -- "Formato y nombre del WOD": si el bloque arranca con
       una palabra de formato reconocible (EMOM/AMRAP/TABATA/FOR TIME/
       EVERY X:XX x N SETS), esa línea va primero -- es lo que el atleta
       reconoce de un vistazo, antes que el esquema de reps. */
    const formatoCrudo = (wod.items.map(x => String(x).trim())
      .find(l => /^(emom|e\d*mom|amrap|tabata|for\s*time|ft|every\s*\d)/i.test(l)) || '')
      .replace(/:\s*$/, '');
    /* directiva maestra ("Story Card táctica"): el formato se muestra en notación
       compacta ("20:00 AMRAP", "EMOM 20:00", "EVERY 4:00 × 5") */
    let formatoTxt;
    (function(){
      let mm;
      if((mm = formatoCrudo.match(/amrap\s*(\d+)/i)) || (mm = formatoCrudo.match(/(\d+)\s*(?:min(?:utos?)?)?\s*amrap/i))) formatoTxt = String(mm[1]).padStart(2, '0') + ':00 AMRAP';
      else if((mm = formatoCrudo.match(/^e(?:\d*)mom\s*(\d+)?/i)) && /emom/i.test(formatoCrudo)) formatoTxt = 'EMOM' + (mm[1] ? ' ' + String(mm[1]).padStart(2, '0') + ':00' : '');
      else if((mm = formatoCrudo.match(/every\s*(\d+:\d{2}|\d+)(?:\s*(?:x|×)\s*(\d+))?/i))) formatoTxt = 'EVERY ' + mm[1] + (mm[2] ? ' × ' + mm[2] : '');
      else if(/tabata/i.test(formatoCrudo)) formatoTxt = 'TABATA';
      else if(/for\s*time|^ft/i.test(formatoCrudo)) formatoTxt = 'FOR TIME';
      else formatoTxt = formatoCrudo.length && formatoCrudo.length <= 26 ? formatoCrudo : undefined;
    })();
    const esquema = wod.items.map(x => String(x).trim()).find(l => /^\d+(-\d+){1,}$/.test(l));
    /* directiva ("Movimientos condensados COMPLETOS") -- antes se
       cortaba a los primeros 2 movimientos (".slice(0,2)"), la causa del
       bug reportado que omitía el 3er movimiento real del WOD (ej. "12
       Thrusters" desaparecía de "12 Front Squats / 16 Toes to Bar / 12
       Thrusters"). Sin tope: heroCard() ya autoajusta el tamaño de
       fuente y envuelve a 2 líneas, así que una lista más larga se ve
       más chica en vez de perder movimientos reales. */
    /* movimientos clave: sólo nombres cortos -- las notas largas (esquemas de
       carga, opciones, escalados, tips) nunca entran a la tarjeta; sin reps ni
       cargas; máximo 4 */
    const movs = wod.items
      .map(x => String(x).trim())
      .filter(l => l && l.length <= 56 && !/^\d+(?:\s*[-–\/]\s*\d+){1,}$/.test(l) && !/^(cap|rest|descanso|nota|note|amrap|emom|e\d*mom|tabata|every|for\s*time|esquema|opci[oó]n|escal|scaled|rx|intermedi|tip)\b/i.test(l) && !/:\s*$/.test(l) && !/^[(\[]/.test(l))
      .map(l => l.split(' — ')[0].split('@')[0]
        .replace(/\([^)]*\)/g, ' ')
        .replace(/^\d+(?:[.,]\d+)?(?:\s*[-–\/]\s*\d+(?:[.,]\d+)?)*\s*(?:cals?|calories|reps?|mts?|m|km|kg)?\s+/i, '')
        .replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 4);
    estructura = [formatoTxt, movs.join(' · ')].filter(Boolean).join(' · ').toUpperCase();
  }
  if(!estructura && wod) estructura = (wod.title || '').toUpperCase();
  let score = '';
  if(wod){
    const skey = weekIdx + '|' + day.id + '|' + wod.id;
    score = (typeof state !== 'undefined' && state.scores && state.scores[skey]) || '';
  }
  /* directiva ("Métrica de Performance") -- si no hay score cargado pero
     el WOD ya está marcado como hecho y su esquema declara "Every X:XX x
     N Sets" (intervalos), se muestra "N / N INTERVALOS COMPLETADOS" en
     vez de dejar la Hero Card 2 sin ninguna métrica de cierre. */
  if(!score && wod && wod.items){
    const schemeLine = wod.items.map(x => String(x).trim()).find(l => /every\s*\d/i.test(l));
    const nM = schemeLine && schemeLine.match(/x\s*(\d+)\s*sets?/i);
    if(nM && isBlockDone(weekIdx, day.id, wod.id)){
      score = nM[1] + ' / ' + nM[1] + ' INTERVALOS COMPLETADOS';
    }
  }
  return {
    modo: 'crossfit',
    atleta: PROGRAM_CONFIG.athleteName || 'Atleta',
    tituloWod: (wod && wod.title) || day.title || day.short || 'WOD',
    wodTitulo: (wod && wod.title && !/^\s*bloque\s*\d*\s*$/i.test(wod.title)) ? String(wod.title).replace(/^\s*(?:bloque|block)\s*\d+\s*:\s*/i, '').trim() : '',
    volumenTotal: volumenTotal,
    topLiftKg: topLiftKg,
    esPR: esPR,
    fecha: new Date().toLocaleDateString('es-AR', { day:'2-digit', month:'long', year:'numeric' }),
    warmupTxt: warmupTxt,
    skillTitulo: skillTitulo,
    skillChips: skillChips,
    kgClave: kgClave,
    estructura: estructura,
    score: score,
    scorePR: !!(wod && state.scorePR && state.scorePR[weekIdx + '|' + day.id + '|' + wod.id]),
    formatoTxt: (function(){
      var p0 = String(estructura || '').split(' · ')[0] || '', m;
      if((m = p0.match(/^(\d+):00\s*AMRAP/i))) return 'AMRAP ' + parseInt(m[1], 10) + 'M';
      if((m = p0.match(/^EMOM\s*(\d+):00/i))) return 'EMOM ' + parseInt(m[1], 10) + 'M';
      if(/^EMOM/i.test(p0)) return 'EMOM';
      if(/^(?:EVERY|TABATA|FOR TIME)/i.test(p0)) return p0.toUpperCase();
      return '';
    })(),
    diaCorto: day.short || '',
    semanaN: (weekIdx || 0) + 1,
    sesionTxt: day.label || day.title || ''
  };
}
function rolBloque(block){
  if(window.COACH_DISCIPLINA !== 'sports') return ROL_BLOQUE_CAT_CF[block.category] || 'WOD';
  if(block.isSuperset) return block.isTriset ? 'Triset' : 'Biset';
  if(block.isFinisher) return 'Finisher';
  if(block.isHyrox) return 'Motor';
  return ROL_BLOQUE_CAT[block.category] || 'Bloque';
}
function renderBlock(block, day, weekIdx, idx){
  /* purga de bloques vacíos/placeholder en CrossFit: si el bloque de
     pizarra no trae contenido real, no se renderiza ni la tarjeta ni su
     envoltorio -- una card vacía no le sirve al alumno para nada. */
  if(window.COACH_DISCIPLINA !== 'sports' && Array.isArray(block.items) && esBloqueVacioCF(block)) return '';
  const meta = CATEGORY_META[block.category] || CATEGORY_META.strength;
  /* "2º Turno / Endurance & Running" (directiva) se agrupa con cardio a
     efectos de esta clasificación legada (aeróbico/medible, con Score) --
     su identidad visual propia (coral) viene de .jp-cf-fase-endurance más
     específica, no de acá. */
  const catCls = block.category === 'strength' ? 'cat-strength' : (block.category === 'warmup' ? 'cat-warmup' : (block.category === 'metcon' ? 'cat-metcon' : ((block.category === 'cardio' || block.category === 'endurance') ? 'cat-cardio' : 'cat-accessory')));
  const done = isBlockDone(weekIdx, day.id, block.id);
  const optionalCls = block.optional ? ' block-optional' : '';
  const vacioSemana = esBloqueSinSemana(block, weekIdx);
  /* directiva ("Refactoring maestro UI/UX Sports: doble header
     desincronizado") -- para un bloque de Pizarra Sports, esta cabecera
     genérica (icono + label + checkbox + chevron, compartida por TODOS
     los tipos de bloque) mostraba una etiqueta auto-numerada sin relación
     real con el contenido ("Bloque A · Principal"), mientras que
     pizarraSports() pinta SU PROPIA cabecera canónica ("[ SPORTS · BLOQUE
     ] BLOQUE 6 | CORE FUNCIONAL") apenas debajo, dentro del cuerpo -- dos
     títulos distintos para un mismo bloque, uno de ellos sin sentido real
     para el alumno. Se reemplaza la etiqueta genérica por el título REAL
     del bloque (nunca afecta CrossFit: sportsPizarra jamás viaja ahí, ver
     esBloqueSportsPizarra()/mapearBloques()) -- la cabecera colapsable
     queda sincronizada con lo que hay adentro, colapsada o expandida. */
  const etiquetaBloque = vacioSemana ? 'Sin sesión esta semana'
    : (block.sportsPizarra && block.title) ? block.title
    : ('Bloque ' + String.fromCharCode(65 + (idx % 26)) + ' · ' + rolBloque(block));
  return '<div class="block ' + catCls + (done?' block-done':'') + optionalCls + (vacioSemana?' block-restweek':'') + '" data-block-id="' + block.id + '" style="animation-delay:' + (idx*0.04) + 's">' +
    '<div class="block-header">' +
      '<div class="block-icon ' + meta.cls + '">' + blockIconHtml(block.icon) + '</div>' +
      '<div class="block-header-text">' +
        '<div class="block-label ' + meta.labelCls + '">' + etiquetaBloque + '</div>' +
        '<div class="block-subtitle">' + block.subtitle + '</div>' +
      '</div>' +
      '<label class="block-check" onclick="event.stopPropagation()"><input type="checkbox" class="block-done-cb" ' + (done?'checked':'') + ' /></label>' +
      '<div class="block-chevron">▾</div>' +
    '</div>' +
    '<div class="block-body">' + cargaSugeridaHtml(block, weekIdx) + renderBlockInner(block, day, weekIdx) +
      (block.category === 'warmup' ? '' : bloqueNotasHtml(block, day, weekIdx)) +
      /* UX/UI integral (13/09), parte 3: el buzón de feedback en video se
         retira de la vista del alumno -- esa interacción ahora se gestiona
         por WhatsApp. videoFeedbackHtml() y state.videoLinks quedan intactos
         (cero mutación de datos ya guardados), solo se deja de invocar el
         render acá. */
      '</div>' +
  '</div>';
}
/* Tarjeta de nutrición de la sesión: la arma el coach en el builder */
function nutriCard(day){
  var n = day && day.nutri;
  if(!n) return '';
  var fila = function(cls, lb, txt){
    if(!txt) return '';
    return '<div class="nut-row ' + cls + '"><span class="nut-lb">' + lb + '</span>' +
           '<p class="nut-tx">' + txt + '</p></div>';
  };
  var cuerpo = fila('pre', 'Antes', n.pre) + fila('intra', 'Durante', n.intra) + fila('post', 'Después', n.post) +
               (n.nota ? '<div class="nut-row nota"><span class="nut-lb">Nota del coach</span><p class="nut-tx">' + n.nota + '</p></div>' : '');
  if(!cuerpo) return '';
  return '<details class="nutri-card"><summary class="nutri-sum">' +
      '<span class="nut-ic">\uD83C\uDF7D\uFE0F</span>' +
      '<span class="nut-ti">Nutrición de hoy</span>' +
      '<span class="nut-hint">antes · durante · después</span>' +
      '<span class="nut-cv">\u25BE</span>' +
    '</summary><div class="nutri-body">' + cuerpo +
      '<p class="nut-legal">' + NUTRI_DISCLAIMER_TXT + '</p>' +
    '</div></details>';
}
/* directiva crítica ("Reingeniería cromática del encabezado de sesión") --
   el título crudo del día suele traer "DÍA N:" pegado a mano por el coach
   Y el énfasis muscular entre paréntesis al final ("HIPERTROFIA DE PIERNA
   COMPLETA (ÉNFASIS CUÁDRICEPS & CADENA POSTERIOR)") -- eso, sumado al tag
   de arriba que YA dice "DÍA N", duplicaba "DÍA 1" dos veces en la misma
   pantalla, todo en el mismo blanco puro sin jerarquía. Esta función
   separa: (a) un prefijo redundante "DÍA N:"/"DÍA N —" (se recorta, ya lo
   cubre el pretag de arriba), (b) el nombre principal de la sesión, (c) el
   énfasis entre paréntesis, si lo hay, como dato aparte. */
function splitTituloSesionSports(tituloRaw, dayNum){
  let t = String(tituloRaw || '').trim();
  /* directiva crítica -- construir el regex por concatenación de strings
     (new RegExp(str)) acá adentro es una trampa: el string pasa DOS veces
     por des-escapado de backslash (una al parsear TEMPLATE_HTML como
     template literal en el Builder, otra al parsear ESE string literal ya
     compilado como JS real en el navegador del alumno) -- \\s sobrevive
     la primera pasada como \s, pero \s todavía no es un escape válido
     para un STRING literal (sólo lo es para un regex literal), así que la
     segunda pasada se come el backslash igual. Un regex LITERAL sólo pasa
     por la primera desescapada, así que \d+ genérico (sin interpolar
     dayNum) evita el problema de raíz. */
  const mPrefijo = t.match(/^d[ií]a\s*\d+\s*[:\-–—]\s*/i);
  if(mPrefijo) t = t.slice(mPrefijo[0].length);
  const m = t.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if(m) return { principal: m[1].trim() || t, enfasis: m[2].trim() };
  return { principal: t, enfasis: '' };
}
function renderMain(){
  const day = getCurrentDay();
  const weekIdx = state.currentWeek;
  const blocks = visibleBlocks(day);
  const dayDone = isDayDone(weekIdx, day.id);
  let html = '<div class="day-view active">';
  /* pulido de jerarquía (directiva posterior a "workout-first"): el
     header del día había quedado DESPUÉS de los bloques -- reportado
     como "descolgado muy abajo, con espacio vacío y una barra cortada
     arriba". Vuelve a ser lo primero que se ve, pegado debajo del
     selector de días, sin tocar ningún dato ni listener (wireBlockInteractions/
     wireReadinessCheckin siguen buscando los mismos ids en el DOM ya
     pintado, sin importar el orden). */
  /* directiva crítica ("Reingeniería cromática del encabezado de sesión")
     -- reemplaza la línea doble ".day-eyebrow"+".day-title" (bloque
     masivo en blanco puro, "DÍA 1" repetido) por 3 niveles con jerarquía
     de color real: pretag táctico cian ("[ DÍA N · SEMANA N ]"), nombre
     principal en blanco titanio, y el énfasis muscular (si el coach lo
     escribió entre paréntesis) en su propia línea naranja táctico con
     prefijo "// ". CrossFit nunca ve esto (.day-header sigue oculto por
     completo vía body.cf-disc .day-header{display:none}, sin tocar). */
  const partesTitulo = splitTituloSesionSports(day.title, day.dayNum);
  /* directiva maestra ("Homologación estricta Bodybuilding = CrossFit") --
     la barra táctica colapsable [ ⚡ BRIEFING DEL COACH ▾ ] ya no es sólo
     de CrossFit: queda unificada para ambas disciplinas, justo debajo de
     la fila de semanas (antes del título de la sesión). Sólo aparece si
     el coach cargó texto en day.briefing. */
  if(window.COACH_DISCIPLINA !== 'crossfit' && day.briefing){
    html += '<details class="tactical-briefing"><summary class="tb-summary">' +
      '<span class="tb-ic">⚡</span><span class="tb-label">Briefing del Coach</span><span class="tb-chev">▾</span>' +
      '</summary><div class="tb-body">' + day.briefing + '</div></details>';
  }
  html += '<div class="day-header">';
  html += '<div><div class="jp-session-pretag">[ ' + day.short + ' · SEMANA ' + (weekIdx + 1) + ' ]</div>';
  html += '<div class="day-title jp-session-main">' + partesTitulo.principal + '</div>';
  if(partesTitulo.enfasis){
    html += '<div class="jp-session-emphasis">// ' + partesTitulo.enfasis.toUpperCase() + '</div>';
  }
  html += '<div class="day-meta-row">' + (day.metaChips||[]).map(function(c){ return '<span class="meta-chip">' + c + '</span>'; }).join('') + '</div></div>';
  html += '</div>';
  /* fix definitivo (directiva): "Foco táctico / Stimulus briefing" -- en
     CrossFit .day-header queda oculto por completo (ver body.cf-disc
     .day-header{display:none}), así que este banner vive en un elemento
     PROPIO, fuera de ese contenedor, para no depender de una regla CSS
     pensada para otra cosa. Sólo aparece si el coach cargó texto. */
  if(window.COACH_DISCIPLINA === 'crossfit' && day.briefing){
    html += '<details class="tactical-briefing"><summary class="tb-summary">' +
      '<span class="tb-ic">⚡</span><span class="tb-label">Briefing del Coach</span><span class="tb-chev">▾</span>' +
      '</summary><div class="tb-body">' + day.briefing + '</div></details>';
  }
  /* directiva (reajuste UI): el check-in de entrada vivía al fondo de la
     pantalla, después de las notas metodológicas, perdiendo su función de
     entrada -- sube a ser lo primero visible debajo del título del día,
     en paralelo/arriba de "Marcar Día Completo", antes de calentamiento
     y entrenamiento principal. wireReadinessCheckin() sigue buscando el
     mismo id en el DOM ya pintado, sin importar el orden. */
  /* directiva ("Elevación estética de lujo táctico: purga de Briefing") --
     el acordeón "⚡ Briefing & Check-in" (Foco + check-in de sueño/estrés/
     molestias, fusionados en una directiva anterior) se erradica por
     completo: el scroll baja directo del título de la sesión al primer
     bloque. Sólo sobrevive el Foco Técnico, como banner fijo siempre
     visible (ver renderFocoTecnico() más arriba). */
  html += renderFocoTecnico(day);
  html += '<div class="blocks-stack">';
  blocks.forEach(function(b, idx){ html += renderBlock(b, day, weekIdx, idx); });
  html += '</div>';
  html += renderContextoSesion();
  /* directiva de emergencia (rediseño F): la tarjeta de nutrición de la
     sesión se retira del flujo del día -- la nutrición se va a desarrollar
     en una app aparte. nutriCard() queda intacta y sin usar. */
  /* directiva ("Refactor visual: tabla táctica de series y limpieza
     definitiva en Sports") -- day.summary es un campo de texto libre que
     el coach puede tipear a mano (ver Builder, data-df="summary"), pero
     en la práctica quedaba con texto viejo arrastrado de una plantilla
     clásica aplicada antes de este refactor ("2 Anclas Pesadas + 2
     Bisets + Finisher · 5 bloques"), mostrado tal cual aunque el día ya
     fuera 100% Pizarra. En Sports se reemplaza por un conteo real y
     dinámico de bloques completados (isBlockDone ya es la misma fuente
     de verdad que usa el check "Marcar Día Completo"); CrossFit no se
     toca, sigue mostrando day.summary tal cual siempre lo hizo. */
  if(window.COACH_DISCIPLINA === 'sports'){
    if(blocks.length){
      const doneCount = blocks.filter(function(b){ return isBlockDone(weekIdx, day.id, b.id); }).length;
      html += '<div class="info-card jp-resumen-ses"><div class="info-card-title">Resumen de la Sesión</div><p>' + doneCount + ' / ' + blocks.length + ' bloques completados</p></div>';
    }
  } else if(day.summary){ html += '<div class="info-card jp-resumen-ses"><div class="info-card-title">Resumen de la Sesión</div><p>' + day.summary + '</p></div>'; }
  /* directiva ("Refactor urgente de interfaz Athlete", requerimiento 2):
     day.cooldown puede quedar poblado con un relleno GENÉRICO que varias
     herramientas de generación de día (Generador de Día por Estilo,
     Autocompletado con IA, etc., todas fuera del alcance de esta
     directiva) escriben por su cuenta con "if(!(dia.cooldown||[]).length)
     dia.cooldown = [...texto fijo...]" -- nunca porque el coach haya
     redactado o generado uno de verdad con el botón dedicado "Generar
     Cool-Down con IA". Esas herramientas son ajenas a este refactor (no
     se tocan), pero el requerimiento es explícito: la tarjeta nunca debe
     mostrarse salvo que el cool-down sea real. Como ningún dato marca la
     diferencia hoy, se detecta por coincidencia EXACTA con los rellenos
     conocidos (los mismos strings, literales, que usan esas
     herramientas) -- sólo en Sports, CrossFit ni siquiera lee esta
     rama. */
  var COOLDOWN_RELLENOS_GENERICOS = [
    'Respiración diafragmática — 2 min|Estiramiento suave de los grupos trabajados — 3 min',
    'Respiración diafragmática — 3 min|Movilidad suave de la zona, sin forzar — 3 min',
    'Respiración diafragmática — 4 min|Movilidad suave de la zona — 3 min',
    'Respiración nasal — 3 min|Movilidad de hombro y cadera — 3 min',
    'Estiramiento del grupo trabajado — 2x30s|Respiración nasal — 2 min',
    'Movilidad de muñeca y hombro — 3 min|Respiración nasal — 2 min'
  ];
  var cooldownEsRelleno = window.COACH_DISCIPLINA === 'sports' && !day.cooldownNota &&
    COOLDOWN_RELLENOS_GENERICOS.indexOf((day.cooldown||[]).join('|')) >= 0;
  if((day.cooldown||[]).length && !cooldownEsRelleno){
    /* las fases numeradas del generador se leen como subtítulo, no como una viñeta más */
    html += '<div class="info-card cooldown-card"><div class="info-card-title">Cool-Down y Recuperación</div><ul>' +
      day.cooldown.map(function(c){
        var f = String(c).match(/^(\d+)\.\s*(.+)$/);
        return f ? '<li class="cd-fase"><span>' + f[1] + '</span><b>' + f[2] + '</b></li>'
                 : '<li><span>&#10022;</span>' + c + '</li>';
      }).join('') + '</ul>' +
      (day.cooldownNota ? '<p class="cd-nota">' + day.cooldownNota + '</p>' : '') + '</div>'; }
  /* directiva ("Limpieza del Parser y Fin de Falsos Ejercicios") -- el
     bloque "Vault Técnico del Día" se elimina del todo: la vinculación
     de videos vive exclusivamente en los chips tácticos por bloque
     (jpCfClips, dentro de cada jp-cfboard), este carrusel aparte al pie
     del día era redundante. El formulario que lo alimentaba (Builder,
     ver renderVaultFooterCF) ya no lo puebla -- acá se apaga el render
     por completo (Regla de Oro: day.cfVault, si algún plan viejo de los
     33 atletas ya lo trae resuelto, sigue viajando intacto en el dato
     compilado, simplemente no se pinta; nada se borra ni se recalcula). */
  /* Story Card: botón fijo al cierre de la sesión, siempre justo antes de
     "Marcar Día Completo" -- no depende de tildar cada bloque a mano.
     FASE 2.5 -- antes esto era sólo CrossFit (dibujarCF() lee el bloque
     de fuerza/skill y el WOD/Metcon ya renderizado); Bodybuilding tenía
     el mismo botón pero ESCONDIDO dentro de .summary-card (ver
     inyectarBoton(), módulo de Story Card), invisible hasta terminar de
     tildar cada bloque a mano. Se pinta también acá para Bodybuilding, en
     el mismo lugar destacado que ya tiene CrossFit -- el click de abajo
     ahora elige abrirCF()/datosStoryCF() o abrir()/datosSports() según
     window.COACH_DISCIPLINA, cero cambio para CrossFit. */
  const esSports = window.COACH_DISCIPLINA === 'sports';
  html += '<button type="button" class="story-cta" id="storyCtaBtn">📸 GENERAR STORY CARD</button>';
  /* directiva (reubicación de cierre): "Marcar Día Completo" era una
     acción de cierre viviendo arriba, apretando el inicio del
     entrenamiento -- baja al final absoluto de la rutina, debajo del
     último bloque/cooldown, como CTA táctico de alto impacto. Mismo id
     (#dayCompleteBtn), así que wireBlockInteractions() lo engancha igual
     sin importar dónde quedó pintado en el DOM. */
  html += '<button type="button" class="day-complete-cta' + (dayDone?' done':'') + '" id="dayCompleteBtn">' +
    '<span class="dcc-ic">✓</span>' +
    '<span class="dcc-tx">' + (dayDone?'DÍA COMPLETO':'MARCAR DÍA COMPLETO') + '</span>' +
    '</button>';
  html += '<button type="button" class="jp-wa-report" id="jpWaReportBtn">&#128242; ENVIAR REPORTE AL COACH POR WHATSAPP</button>' +
    '<button type="button" class="jp-close-cta' + (dayDone ? ' done' : '') + '" id="jpCerrarDiaBtn">' + (dayDone ? '\u2714 D\u00cdA CONCLUIDO \u00b7 ENVIAR REPORTE' : '\ud83d\udcf2 FINALIZAR D\u00cdA Y ENVIAR REPORTE') + '</button>';
  html += '</div>';
  mainEl.innerHTML = html;
  wireBlockInteractions(day, weekIdx, blocks);
  wireReadinessCheckin(day, weekIdx);
  /* .load-suggest ya está en el DOM (vino armado en el html de arriba);
     .rm-sug lo agrega un módulo aparte (CoachMetodologia) unos milisegundos
     después de renderMain() -- se reintenta una vez más a los 300ms para
     alcanzarlo también a él, mismo patrón de "repintar con demora corta"
     que ya usan los demás módulos que dependen de otro módulo. */
  aplicarSobrecargaReadiness(weekIdx, day.id);
  setTimeout(function(){ try{ aplicarSobrecargaReadiness(weekIdx, day.id); }catch(e){} }, 300);
  updateProgress(day, weekIdx, blocks);
  /* directiva maestra ("HUD de telemetría en vivo") -- recalcula al
     entrar/cambiar de día o semana (el HUD vive fuera de #mainContent,
     sobrevive el innerHTML de arriba, pero su NÚMERO es por día/semana
     activos -- sin este llamado quedaría mostrando el total del día
     anterior hasta el primer check nuevo). */
  try{ actualizarTonelajeHUD(); }catch(e){}
}
/* =========================================================
   WIRE: interacciones de bloques (checkbox, colapso, timers, video)
========================================================= */
function updateProgress(day, weekIdx, blocks){
  const total = blocks.length;
  let done = 0;
  blocks.forEach(function(b){ if(isBlockDone(weekIdx, day.id, b.id)) done++; });
  const pct = total ? Math.round((done/total)*100) : 0;
  progressFillEl.style.width = pct + '%';
  progressCountEl.textContent = pct + '%';
}
/* directiva ("Bug crítico athlete-side: casilleros estáticos sin
   interacción") -- BUG RAÍZ encontrado: wireBlockInteractions() (más
   abajo) corre UNA sola vez, apenas mainEl.innerHTML = html se pinta con
   el HTML ESTÁTICO de compile() -- para un bloque de Pizarra Sports, ese
   HTML estático son líneas .ex-row planas (mapearBloques() nunca marca
   isBlock/isSuperset/etc para 'list', ver comentario ahí mismo), CERO
   .set-row todavía. decorar() (que llama pizarraSports()) corre DESPUÉS,
   inyectando recién ahí los .set-row/.set-kg/.set-reps/.set-check
   reales -- pero para ese momento wireBlockInteractions() ya pasó y
   nunca vuelve a mirar esos elementos. Resultado: el check tildaba su
   propio estado nativo (por eso "algo" parecía reaccionar, vía los
   listeners delegados en document en otro lado del archivo) pero
   setLoadField() NUNCA se llamaba -- kg/reps/done jamás se guardaban en
   state.loads, se perdían apenas se re-pintaba la semana. Esta función
   se extrae tal cual (mismo comportamiento, cero cambio de lógica) para
   poder invocarla TAMBIÉN desde pizarraSports() sobre sus propias filas
   recién insertadas -- data-sr-wired la vuelve segura de llamar más de
   una vez sobre la misma fila (nunca duplica listeners). */
function wireSetRow(row){
  if(row.dataset.srWired) return;
  row.dataset.srWired = '1';
  const key = row.dataset.setKey;
  const esBandaRow = row.classList.contains('set-row-banda');
  const kgInput = row.querySelector('.set-kg');
  const repsInput = row.querySelector('.set-reps');
  const chk = row.querySelector('.set-check');
  const compactEl = row.querySelector('.set-row-compact');
  /* directiva de rediseño F (v2): resumen compacto en vivo (mismo texto
     que ya arma renderSetRows() al pintar, recalculado acá sólo para
     que no quede desactualizado si el alumno tipea sin recargar la
     página -- no es una fuente de datos nueva, sólo texto derivado).
     17/09 · casilleros dinámicos (bandas/peso corporal): esas filas no
     tienen .set-kg en el DOM (renderSetRows() lo omite a propósito), así
     que kgInput puede ser null -- ambos listeners y el resumen se
     blindan contra eso en vez de asumir que el campo siempre existe. */
  function refrescarResumen(){
    if(!compactEl) return;
    const reps = repsInput ? repsInput.value : '';
    if(esBandaRow){
      compactEl.textContent = reps ? (reps + ' ' + (repsInput.placeholder||'reps').toLowerCase()) : '\u2014';
      return;
    }
    const kg = kgInput ? kgInput.value : '';
    compactEl.textContent = (kg && reps) ? (kg + '\u00d7' + reps) : '\u2014';
  }
  if(kgInput){
    kgInput.addEventListener('input', function(){
      const clean = sanearPeso(kgInput.value);
      if(clean !== kgInput.value) kgInput.value = clean;
      setLoadField(key, 'kg', clean);
      refrescarResumen();
    });
  }
  if(repsInput){
    repsInput.addEventListener('input', function(){
      const clean = sanearReps(repsInput.value);
      if(clean !== repsInput.value) repsInput.value = clean;
      setLoadField(key, 'reps', clean);
      refrescarResumen();
    });
  }
  if(chk){
    chk.addEventListener('change', function(){
      setLoadField(key, 'done', chk.checked);
      row.classList.toggle('set-row-done', chk.checked);
      /* la fila "activa" (la que se ve grande) tiene que avanzar a la
         próxima serie pendiente apenas se tilda la actual -- el server
         sólo la calcula al pintar, y acá no hay un renderMain() en cada
         check (sería carísimo re-renderizar todo el día por un tilde). */
      const tracker = row.closest('.set-tracker');
      if(tracker){
        const filas = Array.prototype.slice.call(tracker.querySelectorAll('.set-row'));
        filas.forEach(function(f){ f.classList.remove('set-row-active'); });
        const proxima = filas.filter(function(f){ return !f.classList.contains('set-row-done'); })[0];
        if(proxima) proxima.classList.add('set-row-active');
      }
    });
  }
  const toggleBtn = row.querySelector('.set-row-toggle');
  if(toggleBtn){
    toggleBtn.addEventListener('click', function(e){
      e.stopPropagation();
      if(row.classList.contains('set-row-active')) return; /* ya está expandida */
      row.classList.toggle('set-row-expanded');
    });
  }
}
function wireBlockInteractions(day, weekIdx, blocks){
  mainEl.querySelectorAll('.block').forEach(function(blockEl){
    const blockId = blockEl.dataset.blockId;
    const header = blockEl.querySelector('.block-header');
    const cb = blockEl.querySelector('.block-done-cb');
    header.addEventListener('click', function(e){
      if(e.target === cb || e.target.closest('.block-check')) return;
      blockEl.classList.toggle('collapsed');
    });
    cb.addEventListener('click', function(e){
      e.stopPropagation();
      const val = cb.checked;
      const eraDiaHecho = isDayDone(weekIdx, day.id);
      setBlockDone(weekIdx, day.id, blockId, val);
      blockEl.classList.toggle('block-done', val);
      if(val){
        blockEl.classList.add('block-flash');
        setTimeout(function(){ blockEl.classList.remove('block-flash'); }, 900);
      }
      updateProgress(day, weekIdx, blocks);
      renderDayTabs();
      /* el día estaba concluido y este bloque lo desmarca: se repinta para que el botón de cierre, el resumen y la pestaña digan lo mismo */
      if(eraDiaHecho && !val){ const y = window.scrollY; renderMain(); try{ window.scrollTo(0, y); }catch(eS){} }
    });
    blockEl.querySelectorAll('.set-row').forEach(wireSetRow);
    const noteEl = blockEl.querySelector('.block-note-input');
    if(noteEl){
      noteEl.addEventListener('input', function(){
        state.notes = state.notes || {};
        state.notes[noteEl.dataset.noteKey] = noteEl.value;
        saveProgress();
      });
      noteEl.addEventListener('click', function(e){ e.stopPropagation(); });
    }
    blockEl.querySelectorAll('.note-chip').forEach(function(chip){
      chip.addEventListener('click', function(e){
        e.stopPropagation();
        if(!noteEl) return;
        const frase = chip.dataset.noteFrase;
        /* si ya hay texto propio, se agrega abajo en vez de pisarlo */
        noteEl.value = noteEl.value.trim() ? (noteEl.value.replace(/\s+$/,'') + '\n' + frase) : frase;
        state.notes = state.notes || {};
        state.notes[noteEl.dataset.noteKey] = noteEl.value;
        chip.classList.add('on');
        setTimeout(function(){ chip.classList.remove('on'); }, 260);
        saveProgress();
      });
    });
    const vfb = blockEl.querySelector('.video-fb');
    if(vfb){
      /* Parche local del DOM (sin renderMain()) para que el <details> no se
         cierre solo al enviar/borrar un link — mismo criterio de fluidez
         que el resto de los micro-ajustes de esta sesión. */
      const patchVfb = function(k){
        const links = (state.videoLinks && state.videoLinks[k]) || [];
        const body = vfb.querySelector('.video-fb-body');
        const addRow = vfb.querySelector('.vfb-add');
        let listHost = vfb.querySelector('.vfb-list');
        if(links.length){
          if(!listHost){ listHost = document.createElement('div'); listHost.className = 'vfb-list'; body.insertBefore(listHost, addRow); }
          listHost.innerHTML = links.map(function(l, i){
            return '<div class="vfb-item"><a href="' + escHtmlSafe(l.url) + '" target="_blank" rel="noopener noreferrer">' + escHtmlSafe(l.url) + '</a>' +
              '<button type="button" class="vfb-del" data-vfb-del="' + i + '" data-vfb-key="' + escHtmlSafe(k) + '" title="Quitar">✕</button></div>';
          }).join('');
        } else if(listHost){ listHost.remove(); }
        let countEl = vfb.querySelector('.vfb-count');
        const cv = vfb.querySelector('.vfb-cv');
        if(links.length){
          if(!countEl){ countEl = document.createElement('span'); countEl.className = 'vfb-count'; cv.parentNode.insertBefore(countEl, cv); }
          countEl.textContent = links.length;
        } else if(countEl){ countEl.remove(); }
      };
      const sendVideoLink = function(input){
        const k = input.dataset.vfbKey;
        const url = (input.value || '').trim();
        if(!url) return;
        state.videoLinks = state.videoLinks || {};
        state.videoLinks[k] = state.videoLinks[k] || [];
        state.videoLinks[k].push({ url: url, ts: Date.now() });
        saveProgress();
        input.value = '';
        if(window.CoachOutbox && window.CoachOutbox.encolar){
          window.CoachOutbox.encolar({ tipo:'video_feedback', url: url, semana: weekIdx, dia: day.id, block: blockId });
        }
        try{ if(navigator.vibrate) navigator.vibrate(40); }catch(err){}
        patchVfb(k);
      };
      vfb.addEventListener('click', function(e){
        e.stopPropagation();
        const del = e.target.closest('[data-vfb-del]');
        if(del){
          const k = del.dataset.vfbKey, i = parseInt(del.dataset.vfbDel, 10);
          if(state.videoLinks && state.videoLinks[k]) state.videoLinks[k].splice(i, 1);
          saveProgress();
          patchVfb(k);
          return;
        }
        const sendBtn = e.target.closest('.vfb-send');
        if(sendBtn) sendVideoLink(vfb.querySelector('.vfb-input'));
      });
      const input = vfb.querySelector('.vfb-input');
      if(input){
        input.addEventListener('keydown', function(e){ if(e.key === 'Enter'){ e.preventDefault(); sendVideoLink(input); } });
      }
    }
    /* sin relojes dentro de las tarjetas: el único temporizador es el Custom WOD Timer
       de la barra superior, que abrís vos cuando lo necesitás */
    const qtSlot = blockEl.querySelector('.quick-timer-slot');
    if(qtSlot) qtSlot.remove();
  });
  mainEl.querySelectorAll('.video-link').forEach(function(link){
    link.addEventListener('click', function(){
      const ytid = link.dataset.yt;
      if(!ytid) return;
      openVideoPopup(ytid);
    });
  });
  const storyCtaBtn = document.getElementById('storyCtaBtn');
  if(storyCtaBtn){
    storyCtaBtn.addEventListener('click', function(){
      if(!window.CoachStory) return;
      if(window.COACH_DISCIPLINA === 'sports'){
        if(typeof window.CoachStory.abrir === 'function' && typeof window.CoachStory.datosSports === 'function'){
          window.CoachStory.abrir(window.CoachStory.datosSports(weekIdx, day));
        }
      } else if(typeof window.CoachStory.abrirCF === 'function'){
        window.CoachStory.abrirCF(datosStoryCF(weekIdx, day));
      }
    });
  }
  const dayCompleteBtn = document.getElementById('dayCompleteBtn');
  if(dayCompleteBtn){
    dayCompleteBtn.addEventListener('click', function(){
      const currentlyDone = isDayDone(weekIdx, day.id);
      const blockIds = dayBlockIds(day);
      const pasaACompleto = !currentlyDone;
      setDayDone(weekIdx, day.id, pasaACompleto, blockIds);
      renderDayTabs();
      renderMain();
      /* 10/09 -- mensaje de cierre de sesión (sólo al marcar como completo,
         no al desmarcar), con concordancia de género vía generoTxt() */
      if(pasaACompleto && window.CoachAviso && typeof window.CoachAviso.mostrar === 'function'){
        const quedaste = (typeof generoTxt === 'function') ? generoTxt('listo', 'lista') : 'listo';
        window.CoachAviso.mostrar('ok', '🎉', '¡Sesión completada, felicitaciones!',
          'Quedaste ' + quedaste + ' para lo que viene. Buen entrenamiento.', 5000);
      }
      /* reporte completo de la sesion al coach: se abre WhatsApp con el mensaje armado (el alumno solo lo envia) */
      if(pasaACompleto && typeof window.CoachReporteSesionWA === 'function'){ try{ window.CoachReporteSesionWA(); }catch(e){ console.warn('reporte WA', e); } }
    });
  }
}
/* =========================================================
   VIDEO POPUP
========================================================= */
const videoWrapEl = document.getElementById('video-popup-wrap');
const videoIframeEl = document.getElementById('video-popup-iframe');
const videoFallbackEl = document.getElementById('video-popup-fallback-link');
const videoCloseEl = document.getElementById('video-popup-close');
/* 09/09 -- si el cronómetro de descanso (.timer-hud) está visible, el popup
   de video se levanta arriba de él en vez de compartir la misma franja
   inferior (ver comentario de la clase .video-popup-wrap más arriba). Mide
   la posición REAL del HUD en vez de asumir un alto fijo, porque el propio
   HUD tiene varios "bottom" distintos según el contexto de la página (ver
   los !important de .timer-hud más abajo en el archivo). */
function ajustarPosicionVideoPopup(){
  if(!videoWrapEl) return;
  /* UX/UI integral (13/09): en mobile (<=640px) el popup ahora se centra
     con top/left/transform (ver @media(max-width:640px) más arriba) -- si
     esta función además le fija un "bottom" inline, position:fixed con
     top y bottom no-auto a la vez fuerza el alto del elemento a estirarse
     entre los dos, rompiendo el centrado. Ese ajuste de "bottom" solo
     tenía sentido para la ventanita de esquina de escritorio. */
  if(window.innerWidth <= 640) return;
  if(hudEl && hudEl.classList.contains('show')){
    const r = hudEl.getBoundingClientRect();
    const gap = 10;
    const offset = Math.max(20, Math.round(window.innerHeight - r.top + gap));
    videoWrapEl.style.bottom = offset + 'px';
  } else {
    videoWrapEl.style.bottom = '';
  }
}
window.addEventListener('resize', function(){
  if(videoWrapEl && videoWrapEl.classList.contains('open')) ajustarPosicionVideoPopup();
});
/* el HUD se mueve con una transición CSS (transform), así que medir su
   posición justo al togglear la clase .show puede leer un estado a mitad
   de camino -- se vuelve a medir cuando esa transición termina de asentarse. */
if(hudEl) hudEl.addEventListener('transitionend', function(){
  if(videoWrapEl && videoWrapEl.classList.contains('open')) ajustarPosicionVideoPopup();
});
function openVideoPopup(ytid, opts){
  var loop = !!(opts && opts.loop);
  videoIframeEl.src = 'https://www.youtube-nocookie.com/embed/' + ytid + '?autoplay=1&rel=0&modestbranding=1&playsinline=1' + (loop ? '&mute=1&loop=1&playlist=' + ytid : '');
  videoFallbackEl.href = 'https://www.youtube.com/watch?v=' + ytid;
  videoWrapEl.classList.add('open');
  ajustarPosicionVideoPopup();
}
function closeVideoPopup(){
  videoWrapEl.classList.remove('open');
  videoIframeEl.src = '';
}
videoCloseEl.addEventListener('click', closeVideoPopup);
/* =========================================================
   MODAL: GUÍA
========================================================= */
const guideModalEl = document.getElementById('guideModal');
const guideBtnEl = document.getElementById('guideBtn');
const guideCloseEl = document.getElementById('guideClose');
function openModal(el){ el.classList.add('open'); }
function closeModal(el){ el.classList.remove('open'); }
(function pintarMeso(){
  const sec = document.getElementById('mesoExplainSection');
  if(!sec || !PROGRAM_CONFIG.mesoObjetivo) return;
  document.getElementById('mesoExplainText').innerHTML =
    '<b style="color:var(--text-primary)">Objetivo del bloque:</b> ' + PROGRAM_CONFIG.mesoObjetivo +
    (PROGRAM_CONFIG.mesoTexto ? ' — ' + PROGRAM_CONFIG.mesoTexto : '');
  const t = document.getElementById('mesoExplainTable');
  t.innerHTML = '<tr><th>Semana</th><th>Fase</th><th>Intensidad</th></tr>' +
    (PROGRAM_CONFIG.weeks || []).map(function(w){
      return '<tr><td>' + (w.icon || '') + ' ' + w.name + '</td><td>' + (w.phase || '') +
             (w.note ? '<div style="color:var(--text-secondary);font-size:0.82rem;margin-top:3px">' + w.note + '</div>' : '') +
             '</td><td class="gt-strong">' + (w.rpe || '') + '</td></tr>';
    }).join('');
  sec.style.display = '';
})();
/* =========================================================
   directiva ("Guía Integral Sports & Bodybuilding" / "Guía Integral
   CrossFit & Hyrox") -- el manual técnico ("Técnica" del modal Guía)
   era 100% genérico, idéntico para las dos disciplinas. Se reemplaza
   en vivo, UNA sola vez al cargar la app (window.COACH_DISCIPLINA es
   fijo por app compilada, nunca cambia en runtime), con el contenido
   propio de cada una -- la tabla de "Progresión del Mesociclo" que
   sigue abajo (fuera de este contenedor) no se toca, sigue viniendo de
   {{GUIDE_PROGRESSION_ROWS}} igual que siempre. */
(function pintarGuiaTecnica(){
  const host = document.getElementById('guideTecnicaDinamica');
  if(!host) return;
  const esCF = window.COACH_DISCIPLINA !== 'sports';
  const title = document.getElementById('guideProgresionTitle');
  if(title) title.textContent = (esCF ? '5' : '6') + ' · Progresión del Mesociclo';
  host.innerHTML = esCF ? (
    '<div class="guide-section">' +
      '<div class="guide-section-title">1 · 🏋️ Clasificación de WODs &amp; Estímulos</div>' +
      '<p>Cada formato exige una estrategia de pacing distinta -- salir "a fondo" en el formato equivocado es la forma más común de arruinar un WOD entero antes de la mitad:</p>' +
      '<table class="guide-table">' +
        '<tr><th>Formato</th><th>Cómo se puntúa</th><th>Pacing</th></tr>' +
        '<tr><td class="gt-strong">AMRAP</td><td>Rondas + reps en el tiempo fijo</td><td>Ritmo CONSTANTE y sostenible desde el segundo 1 -- el objetivo es no bajar el ritmo en el último tercio, nunca explotar rápido al principio.</td></tr>' +
        '<tr><td class="gt-strong">EMOM</td><td>Trabajo dentro de cada intervalo</td><td>El trabajo real debe entrar cómodo en ~70-80% del intervalo -- el resto es margen de error, nunca descanso pleno garantizado.</td></tr>' +
        '<tr><td class="gt-strong">For Time</td><td>Tiempo total hasta terminar</td><td>Fraccionar el volumen ANTES de llegar al fallo muscular (ej. "21 en 3 series de 7") suele ser más rápido que ir sin fraccionar y frenar en seco.</td></tr>' +
        '<tr><td class="gt-strong">Chipper</td><td>Tiempo total, cada movimiento una vez</td><td>El pacing se decide estación por estación -- nunca parejo para todo el WOD, algunas estaciones piden más margen que otras.</td></tr>' +
        '<tr><td class="gt-strong">RFT</td><td>Tiempo total en N rondas fijas</td><td>Las primeras rondas marcan el ritmo real: si la ronda 1 se siente "fácil", probablemente vas demasiado rápido para sostenerlo hasta el final.</td></tr>' +
      '</table>' +
    '</div>' +
    '<div class="guide-section">' +
      '<div class="guide-section-title">2 · ❤️ Control de Umbral Anaeróbico</div>' +
      '<p>El umbral anaeróbico es el punto donde el cuerpo acumula lactato más rápido de lo que puede reciclarlo -- pasado ese punto, la ventilación se entrecorta y la técnica se degrada rápido, no sólo el ritmo.</p>' +
      '<p><b style="color:var(--text-primary)">Señal simple para regular ANTES de cruzarlo:</b> si no podés decir una frase corta en la transición entre estaciones, ya estás por encima del umbral. Bajar 1-2 escalones de intensidad por 15-20 segundos (nunca parar del todo) alcanza para recuperar el control ventilatorio sin perder el ritmo general -- pararse por completo cuesta mucho más tiempo total que bajar un cambio a tiempo.</p>' +
    '</div>' +
    '<div class="guide-section">' +
      '<div class="guide-section-title">3 · 🥇 Estándares Olímpicos &amp; Levantamiento</div>' +
      '<p>La posición de recibo cambia el nombre del movimiento -- identificala antes de cargar el porcentaje pedido:</p>' +
      '<table class="guide-table">' +
        '<tr><th>Posición</th><th>Punto de recibo</th></tr>' +
        '<tr><td class="gt-strong">Power</td><td>Recibo arriba de paralelo -- prioriza velocidad de extensión por sobre la profundidad.</td></tr>' +
        '<tr><td class="gt-strong">Hang</td><td>La barra arranca desde una altura (rodilla o muslo), nunca desde el piso -- se salta el primer tirón, exige más fuerza en el segundo.</td></tr>' +
        '<tr><td class="gt-strong">Squat</td><td>Recibo completo en sentadilla profunda -- el estándar competitivo de Snatch/Clean, mayor rango de recibo.</td></tr>' +
        '<tr><td class="gt-strong">Split</td><td>Recibo en posición de estocada (exclusivo del Jerk) -- mayor base de sustentación que el Power/Squat Jerk.</td></tr>' +
      '</table>' +
      '<p style="margin-top:8px">Cuando un bloque marca <span class="gd-load">"@ 75%"</span>, ese porcentaje es SIEMPRE relativo al 1RM que vos mismo cargaste en <b style="color:var(--text-primary)">⚡ PRs / 1RM</b> -- si todavía no cargaste el número de hoy, la app te lo pide apenas tocás el porcentaje.</p>' +
    '</div>' +
    '<div class="guide-section">' +
      '<div class="guide-section-title">4 · 🔄 Estrategia de Transiciones</div>' +
      '<p>En un WOD con estaciones mixtas (ergómetro + barra, por ejemplo), el tiempo perdido en transiciones muertas puede ser el 20-30% del tiempo total. Reglas simples que ahorran segundos reales: soltá el agarre del ergómetro ANTES de que el monitor marque el número exacto (el último medio segundo no suma nada real), tené la barra cargada y a la vista desde antes de terminar la estación anterior, y definí de antemano cuántas respiraciones te das en cada cambio -- 2-3 respiraciones controladas alcanzan para bajar la frecuencia cardíaca sin perder el ritmo general del WOD.</p>' +
    '</div>'
  ) : (
    '<div class="guide-section">' +
      '<div class="guide-section-title">1 · 🧬 Tensión Mecánica &amp; Longitud Muscular</div>' +
      '<p>La hipertrofia moderna no depende sólo de "sentir el músculo" -- dos motores hacen la mayor parte del trabajo: <b style="color:var(--text-primary)">tensión mecánica</b> (la fuerza que el músculo produce contra una carga externa) y estrés metabólico. El hallazgo más relevante de los últimos años: ese estímulo se maximiza cuando la tensión ocurre con el músculo en <b style="color:var(--text-primary)">posición estirada</b> (ej. la fase baja de una sentadilla, la apertura completa de un curl femoral) -- por eso vas a ver tempos con pausa isométrica ABAJO/estirado en varios bloques. No es capricho: es donde el estímulo de crecimiento es más alto por serie.</p>' +
    '</div>' +
    '<div class="guide-section">' +
      '<div class="guide-section-title">2 · 📊 Escala RIR (Reps in Reserve)</div>' +
      '<p>RIR mide cuántas repeticiones te quedaban en el tanque al terminar la serie. Tu coach elige el RIR objetivo de cada bloque a propósito -- no es lo mismo una serie técnica que una serie efectiva de verdad:</p>' +
      '<table class="guide-table">' +
        '<tr><th>RIR</th><th>Zona</th><th>Uso</th></tr>' +
        '<tr><td><span class="gd-rir gd-rir-tecnico">RIR 3</span></td><td>Técnico</td><td>Calibración de carga y forma, sin acercarse al límite real -- casi siempre en series de aproximación.</td></tr>' +
        '<tr><td><span class="gd-rir gd-rir-efectivo">RIR 1-2</span></td><td>Efectivo</td><td>Zona de máximo estímulo sostenible semana a semana -- acá vive la mayoría de tus series de trabajo real.</td></tr>' +
        '<tr><td><span class="gd-rir gd-rir-fallo">RIR 0</span></td><td>Fallo controlado</td><td>Sin una rep más con buena técnica -- reservado a la última serie de ejercicios puntuales, nunca a un bloque entero.</td></tr>' +
      '</table>' +
    '</div>' +
    '<div class="guide-section">' +
      '<div class="guide-section-title">3 · ⏱️ Código de Tempo (4 dígitos)</div>' +
      '<p>Cada número de la secuencia (ej. <span class="gd-load">3011</span>) controla una fase distinta del movimiento -- se lee de izquierda a derecha:</p>' +
      '<table class="guide-table">' +
        '<tr><th>Posición</th><th>Fase</th><th>Qué controla</th></tr>' +
        '<tr><td class="gt-strong">1º dígito</td><td>Excéntrica</td><td>Segundos de bajada/estiramiento bajo carga -- más lento, más tensión mecánica acumulada.</td></tr>' +
        '<tr><td class="gt-strong">2º dígito</td><td>Pausa estirada</td><td>Pausa isométrica en el punto de máximo estiramiento -- el "0" es sin pausa.</td></tr>' +
        '<tr><td class="gt-strong">3º dígito</td><td>Concéntrica</td><td>Segundos de subida/acortamiento -- normalmente el tramo más explosivo del movimiento.</td></tr>' +
        '<tr><td class="gt-strong">4º dígito</td><td>Pausa acortada</td><td>Pausa arriba, en la contracción máxima.</td></tr>' +
      '</table>' +
    '</div>' +
    '<div class="guide-section">' +
      '<div class="guide-section-title">4 · 🔀 Protocolos Avanzados de Densidad</div>' +
      '<p>Estas técnicas suman volumen efectivo en menos tiempo -- cada una tiene un criterio de ejecución exacto, no son intercambiables entre sí:</p>' +
      '<table class="guide-table">' +
        '<tr><th>Técnica</th><th>Criterio de ejecución</th></tr>' +
        '<tr><td class="gt-strong">Biserie / Tri-set</td><td>2 o 3 ejercicios encadenados SIN descanso entre ellos -- el descanso llega recién después de completar la ronda entera.</td></tr>' +
        '<tr><td class="gt-strong">Drop Set mecánico</td><td>Al fallo (o muy cerca), bajás la carga entre 20-30% de inmediato y seguís sin soltar la barra/mancuerna -- cero pausa entre la última rep y la primera del drop.</td></tr>' +
        '<tr><td class="gt-strong">Myo-Reps</td><td>Fatiga selectivamente las unidades motoras rápidas: una serie de activación cerca del fallo (~12-15 reps), pausa de 10-20s sin soltar la carga, y 3-4 micro-series cortas (3-5 reps) con la misma pausa entre cada una.</td></tr>' +
      '</table>' +
    '</div>' +
    '<div class="guide-section">' +
      '<div class="guide-section-title">5 · 📈 Sobrecarga Progresiva (Doble Progresión)</div>' +
      '<p>La forma más simple y sostenible de progresar: dentro de un mismo rango de reps (ej. 8-12), primero sumás <b style="color:#00e5ff">repeticiones</b> semana a semana manteniendo el mismo peso -- recién cuando llegás cómodo al TOPE del rango en todas las series, subís el <span class="gd-load">peso en kg</span> y volvés al piso del rango. Nunca subas peso y bajes de rango al mismo tiempo sin ese paso intermedio -- es la forma más confiable de progresar sin estancarte ni forzar la técnica.</p>' +
    '</div>'
  );
})();
/* directiva maestra ("Erradicación de tablas <table> en la Guía del
   Entrenamiento") -- las tablas HTML rígidas (4 columnas de Zonas FC,
   Formato/Puntuación/Pacing, Glosario...) partían las palabras en
   micro-columnas y metían scrollbar horizontal. Se reemplazan, una sola
   vez al cargar (todo el contenido de la Guía ya está pintado a esta
   altura), por Tarjetas Tácticas nativas: tarjeta por fila con badges de
   los campos cortos y el texto largo a ancho completo; Tempo en UNA
   tarjeta vertical de 4 micro-filas; Progresión del Mesociclo como lista
   vertical con el badge de RPE alineado a la derecha. */
(function guiaTablasATarjetas(){
  function convertir(tabla){
    var heads = [], datos = [];
    Array.prototype.slice.call(tabla.querySelectorAll('tr')).forEach(function(tr){
      var ths = tr.querySelectorAll('th');
      if(ths.length){ heads = Array.prototype.map.call(ths, function(t){ return t.textContent.trim(); }); return; }
      var tds = Array.prototype.slice.call(tr.querySelectorAll('td'));
      if(tds.length) datos.push(tds);
    });
    var cont = document.createElement('div');
    var h0 = (heads[0] || '').toLowerCase(), h1 = (heads[1] || '').toLowerCase();
    var html = '';
    if(h0 === 'semana'){
      cont.className = 'guide-cards gc-list';
      html = datos.map(function(c){
        var ult = c[c.length - 1];
        var numerica = /^[0-9]+$/.test(c[0].textContent.trim());
        return '<div class="gc-row"><div class="gc-row-main"><b>' + (numerica ? 'Semana ' : '') + c[0].innerHTML + '</b>' +
          (c.length > 2 ? '<span>' + c[1].innerHTML + '</span>' : '') + '</div>' +
          '<span class="gc-badge gc-badge-rpe">' + ult.textContent.trim() + '</span></div>';
      }).join('');
    } else if(h0.indexOf('posici') === 0 && h1 === 'fase'){
      cont.className = 'guide-cards';
      html = '<div class="gc-card gc-tempo">' + datos.map(function(c){
        return '<div class="gc-trow"><span class="gc-pill">' + c[0].textContent.trim() + '</span>' +
          '<div><b>' + c[1].innerHTML + '</b><p class="gc-p">' + c[2].innerHTML + '</p></div></div>';
      }).join('') + '</div>';
    } else {
      cont.className = 'guide-cards';
      html = datos.map(function(c){
        var n = c.length, out = '<div class="gc-card"><div class="gc-title">' + c[0].innerHTML + '</div>';
        if(n === 2){
          out += '<p class="gc-p">' + c[1].innerHTML + '</p>';
        } else if(n > 2){
          out += '<div class="gc-badges">';
          for(var i = 1; i < n - 1; i++){
            out += '<span class="gc-badge"><i>' + (heads[i] || '') + '</i>' + c[i].innerHTML + '</span>';
          }
          out += '</div><p class="gc-p">' + c[n - 1].innerHTML + '</p>';
        }
        return out + '</div>';
      }).join('');
    }
    cont.innerHTML = html;
    if(tabla.parentNode) tabla.parentNode.replaceChild(cont, tabla);
  }
  Array.prototype.slice.call(document.querySelectorAll('.guide-table')).forEach(convertir);
})();
guideBtnEl.addEventListener('click', function(){ openModal(guideModalEl); });
guideCloseEl.addEventListener('click', function(){ closeModal(guideModalEl); });
guideModalEl.addEventListener('click', function(e){ if(e.target === guideModalEl) closeModal(guideModalEl); });
/* directiva crítica (2026-09) -- modal de detalle de semana ("workout-first"),
   mismo patrón exacto que guideModal de arriba: cerrar con la X o tocando
   afuera. Se abre desde renderWeekSelector()/abrirWeekInfoModal() más arriba. */
const weekInfoModalEl = document.getElementById('weekInfoModal');
const weekInfoModalCloseEl = document.getElementById('weekInfoModalClose');
if(weekInfoModalEl && weekInfoModalCloseEl){
  weekInfoModalCloseEl.addEventListener('click', function(){ closeModal(weekInfoModalEl); });
  weekInfoModalEl.addEventListener('click', function(e){ if(e.target === weekInfoModalEl) closeModal(weekInfoModalEl); });
}
/* 10/09 -- pestañas internas de la Guía (Técnica / Glosario / Zonas FC) */
(function guiaTabs(){
  var tabs = document.querySelectorAll('#guideTabs .tm-tab');
  var paneles = document.querySelectorAll('#guideModal .gd-panel');
  tabs.forEach(function(btn){
    btn.addEventListener('click', function(){
      tabs.forEach(function(b){ b.classList.remove('on'); });
      btn.classList.add('on');
      var k = btn.dataset.gd;
      paneles.forEach(function(p){ p.classList.toggle('on', p.dataset.gdp === k); });
    });
  });
})();
/* =========================================================
   MODAL: GUÍA DE SENSACIONES Y AJUSTE
========================================================= */
/* la guía de sensaciones se abre desde el menú superior; el botón viejo ya no existe */
const painModalEl = document.getElementById('painModal');
const painBtnEl = document.getElementById('painBtn');
const painCloseEl = document.getElementById('painClose');
if(painBtnEl && painModalEl) painBtnEl.addEventListener('click', function(){ openModal(painModalEl); });
if(painCloseEl && painModalEl) painCloseEl.addEventListener('click', function(){ closeModal(painModalEl); });
if(painModalEl) painModalEl.addEventListener('click', function(e){ if(e.target === painModalEl) closeModal(painModalEl); });
/* =========================================================
   MODAL: CALCULADORA 1RM (Epley)
========================================================= */
const calcModalEl = document.getElementById('calcModal');
const calcBtnEl = document.getElementById('calcBtn');
const calcCloseEl = document.getElementById('calcClose');
const calcWeightEl = document.getElementById('calcWeight');
const calcRepsEl = document.getElementById('calcReps');
const calcRoundEl = document.getElementById('calcRound');
const calc1rmEl = document.getElementById('calc1rm');
const calcTableEl = document.getElementById('calcTable');
const PCT_TABLE = [50,55,60,65,70,75,80,85,90,95,100];
function roundTo(value, step){ return Math.round(value/step) * step; }
/* FIX (bug matemático reportado): con reps===1 el 1RM DEBE ser idéntico
   al peso levantado -- Epley/Brzycki sin este caso especial infla el
   100% (190kg x 1 rep estimaba 197.5kg en vez de 190kg). Con reps>1 se
   capea a 12 para no proyectar 1RMs irreales en series de altas reps. */
function calcOneRM(w, r){
  if(!(w > 0)) return 0;
  if(r <= 1) return w;
  const rCap = Math.min(r, 12);
  return w * (1 + rCap/30);
}
function recalcOneRM(){
  const w = parseFloat(calcWeightEl.value);
  const r = parseFloat(calcRepsEl.value);
  const step = parseFloat(calcRoundEl.value);
  if(!w || !r || w <= 0 || r <= 0){
    calc1rmEl.textContent = '';
    calcTableEl.innerHTML = '<p class="calc-empty">Ingresá peso y repeticiones para calcular tu 1RM estimado (fórmula de Epley) y la tabla de porcentajes.</p>';
    return;
  }
  const oneRM = calcOneRM(w, r);
  calc1rmEl.textContent = '1RM Estimado: ' + roundTo(oneRM, step) + ' kg';
  calcTableEl.innerHTML = PCT_TABLE.map(function(pct){
    const val = roundTo(oneRM * pct/100, step);
    return '<div class="calc-cell' + (pct===100?' is-target':'') + '"><div class="calc-pct">' + pct + '%</div><div class="calc-val">' + val + '</div></div>';
  }).join('');
}
calcBtnEl.addEventListener('click', function(){ openModal(calcModalEl); });
calcCloseEl.addEventListener('click', function(){ closeModal(calcModalEl); });
calcModalEl.addEventListener('click', function(e){ if(e.target === calcModalEl) closeModal(calcModalEl); });
[calcWeightEl, calcRepsEl, calcRoundEl].forEach(function(el){ el.addEventListener('input', recalcOneRM); el.addEventListener('change', recalcOneRM); });
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape'){
    closeModal(guideModalEl); closeModal(calcModalEl); closeModal(painModalEl); closeVideoPopup();
  }
});
/* =========================================================
   MODE SWITCH (Rápido / Completo) + HC TOGGLE
========================================================= */
const modeSwitchEl = document.getElementById('modeSwitch');
modeSwitchEl.querySelectorAll('.mode-pill').forEach(function(btn){
  btn.addEventListener('click', function(){
    modeSwitchEl.querySelectorAll('.mode-pill').forEach(function(b){ b.classList.remove('active'); });
    btn.classList.add('active');
    state.mode = btn.dataset.mode;
    saveProgress();
    document.body.classList.toggle('quick-mode', state.mode === 'quick');
    renderMain();
  });
});
/* alto contraste nativo: sin toggle, siempre activo */
/* =========================================================
   STICKY BAR
========================================================= */
const stickyBarEl = document.getElementById('stickyBar');
window.addEventListener('scroll', function(){
  stickyBarEl.classList.toggle('show', window.scrollY > 260);
}, { passive: true });
/* =========================================================
   INIT
========================================================= */
function init(){
  /* blindaje: ninguna excepción puede dejar la pantalla en blanco */
  try{
    try{ loadProgress(); }catch(e){ console.warn('init·loadProgress', e); }
    /* 09/09 -- al ABRIR la app (no durante la navegación manual dentro de
       la sesión) se corrige silenciosamente si quedó parado en una semana
       posterior a la que le corresponde según lo que ya completó -- ver
       semanaActivaCorrespondiente(). Si está en la semana correcta o en
       una ANTERIOR (repasando algo viejo a propósito) no se toca nada. */
    /* se reabre exactamente donde el alumno quedo (semana + dia). Antes: el dia no se guardaba (siempre Dia 1) y la semana se "corregia"
       hacia atras si quedaba alguna sesion sin marcar en una semana anterior (volvia a la Semana 1). Sin posicion guardada (primera
       apertura o instalacion vieja) se ubica en la primera semana/dia que todavia tiene sesiones pendientes. */
    try{
      var _pos = jpLeerPosicion();
      if(_pos){
        if(typeof _pos.w === 'number' && WEEKS_META[_pos.w]) state.currentWeek = _pos.w;
        if(typeof _pos.d === 'string' && DAYS.some(function(d){ return d.id === _pos.d; })) state.currentDay = _pos.d;
      } else {
        if(!state.currentWeek) state.currentWeek = semanaActivaCorrespondiente();
        var _pend = DAYS.filter(function(d){ return !d.optional && !isDayDone(state.currentWeek, d.id); })[0];
        if(_pend) state.currentDay = _pend.id;
      }
      jpGuardarPosicion();
    }catch(e){ console.warn('init·posicion', e); }
    try{ aplicarSemanaActivaBlocks(); }catch(e){ console.warn('init·semanaBlocks', e); }
    try{ renderWeekSelector(); }catch(e){ console.warn('init·weekSelector', e); }
    try{ renderWeekInfo(); }catch(e){ console.warn('init·weekInfo', e); }
    try{ renderDayTabs(); }catch(e){ console.warn('init·dayTabs', e); }
    try{ renderMain(); }catch(e){ console.warn('init·main', e); }
    document.body.classList.toggle('quick-mode', state.mode === 'quick');
    if(modeSwitchEl) modeSwitchEl.querySelectorAll('.mode-pill').forEach(function(b){
      b.classList.toggle('active', b.dataset.mode === state.mode);
    });
  }catch(err){
    console.error('init', err);
  }finally{
    /* pase lo que pase la interfaz queda visible y operable */
    try{
      document.documentElement.classList.remove('jp-cargando');
      document.documentElement.style.visibility = 'visible';
      /* CoachSplash se define mucho más abajo en el documento: en este punto
         todavía no existe. El liberador del <head> sí está desde el primer byte. */
      if(typeof window.__jpLiberarUI === 'function') window.__jpLiberarUI();
      else if(window.CoachSplash && CoachSplash.ocultar) CoachSplash.ocultar();
      window.__JP_INIT_OK = true;
    }catch(e){}
  }
}
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init);
}else{
  init();
}
