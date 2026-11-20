/* =========================================================
   VOZ DEL TIMER · frases fijas pregeneradas (ElevenLabs) sobre el motor de audio de siempre
   ---------------------------------------------------------
   · La app NUNCA llama a la API: las frases (3-2-1, Ya, Descanso, A trabajar, Siguiente ronda, Última ronda, Mitad, Stop buen trabajo) se generan una vez con
     tools/voz/generar.js y viven en voz/<es|en>/<id>.mp3 + voz/manifest.json.
   · Al activarse (o al arrancar con la voz activa) se descargan y se decodifican a AudioBuffer en el MISMO AudioContext de los tonos (ensureAudioCtx): reproducir una
     frase es un start() igual que un beep, sin latencia y por el mismo compresor. Se recorta el silencio inicial de cada clip.
   · El service worker guarda los mp3 en su propia caché (coachjp-voz-v1) para que sigan disponibles sin conexión.
   · Contrato con jpPerfilSonido.reproducir: jpVoz.hablar(ev, n, clip) devuelve true si habló (o si corresponde callar el tono). Sin voz activa, sin clips, sin red o
     con el mute general, devuelve false y suena el tono de siempre. El mute general (jp_audio_muted) silencia voz y tonos.
   · Preferencias: jp_voz ('1' activa; por defecto apagada) y jp_voz_lang ('auto' | 'es' | 'en'). 'auto' sigue el idioma de la app (JP_I18N).
   ========================================================= */
var jpVoz = (function(){
  var KEY = 'jp_voz', KEY_L = 'jp_voz_lang', BASES = ['voz/', '../voz/'], VIGENCIA_PISTA = 2500;
  var BUF = {}, cargas = {}, base = null, manifest = null, actual = null, pistaTxt = null, pistaT = 0, hablaT = 0;
  /* pista del timer -> frase: lo que el timer anuncia antes de la transición ('done' = fin de todo) */
  var PISTAS = { tono: '_tono', go: 'go', rest: 'rest', work: 'work', next_round: 'next_round', last_round: 'last_round', done: 'finish', finish: 'finish', halfway: 'halfway' };
  function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function lsSet(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }
  function activa(){ return lsGet(KEY) === '1'; }
  function silenciada(){ try{ return typeof isAudioMuted === 'function' && isAudioMuted(); }catch(e){ return false; } }
  function pref(){ var p = lsGet(KEY_L); return (p === 'es' || p === 'en') ? p : 'auto'; }
  function idioma(){
    var p = pref(); if(p !== 'auto') return p;
    var l = 'es'; try{ if(window.JP_I18N && JP_I18N.lang) l = JP_I18N.lang(); }catch(e){}
    return l === 'en' ? 'en' : 'es';
  }
  function T(k, d){ try{ return (typeof window.jpT === 'function') ? window.jpT(k) : d; }catch(e){ return d; } }
  function avisarCambio(){ try{ document.dispatchEvent(new CustomEvent('jp-voz-cambio')); }catch(e){} }

  /* ---------- carga: manifest -> mp3 -> AudioBuffer (+ aviso al service worker para el caché offline) ---------- */
  function pedir(url){ return fetch(url, { cache: 'no-cache' }).then(function(r){ if(!r.ok) throw new Error(url + ' ' + r.status); return r; }); }
  function leerManifest(){
    if(manifest) return Promise.resolve(manifest);
    var i = 0;
    function probar(){
      if(i >= BASES.length) return Promise.reject(new Error('sin paquete de voz'));
      var b = BASES[i++];
      return pedir(b + 'manifest.json').then(function(r){ return r.json(); }).then(function(m){ base = b; manifest = m; return m; }, probar);
    }
    return probar();
  }
  function decodificar(ctx, ab){
    return new Promise(function(res, rej){ var p = ctx.decodeAudioData(ab, res, rej); if(p && p.then) p.then(res, rej); });
  }
  /* silencio inicial de la síntesis: se salta al reproducir para que la palabra arranque pegada al segundo exacto */
  function inicioUtil(buf){
    try{
      var d = buf.getChannelData(0), n = Math.min(d.length, Math.round(buf.sampleRate * 0.4));
      for(var i = 0; i < n; i++){ if(Math.abs(d[i]) > 0.02) return Math.max(0, i / buf.sampleRate - 0.008); }
    }catch(e){}
    return 0;
  }
  function cargar(lang){
    lang = lang || idioma();
    if(BUF[lang] && BUF[lang].__listo) return Promise.resolve(true);
    if(cargas[lang]) return cargas[lang];
    var ctx = null; try{ ctx = ensureAudioCtx(true); }catch(e){}
    if(!ctx || typeof fetch !== 'function'){ return Promise.resolve(false); }
    cargas[lang] = leerManifest().then(function(m){
      var ids = Object.keys(m.clips || {}).filter(function(id){ return m.clips[id] && m.clips[id][lang]; });
      /* ?v=<hash del manifest>: si una frase se regenera cambia la URL y el service worker (cache-first) trae la nueva */
      var urls = ids.map(function(id){ return base + lang + '/' + id + '.mp3?v=' + encodeURIComponent(m.clips[id][lang].h || '0'); });
      return Promise.all(ids.map(function(id, k){
        return pedir(urls[k]).then(function(r){ return r.arrayBuffer(); }).then(function(ab){ return decodificar(ctx, ab); }).then(function(b){
          BUF[lang] = BUF[lang] || {}; BUF[lang][id] = { b: b, off: inicioUtil(b) };
        });
      })).then(function(){
        BUF[lang] = BUF[lang] || {}; BUF[lang].__listo = true;
        try{
          if(navigator.serviceWorker && navigator.serviceWorker.controller){
            navigator.serviceWorker.controller.postMessage({ tipo: 'jp-voz', accion: 'precachear', urls: [new URL(base + 'manifest.json', document.baseURI).href].concat(urls.map(function(u){ return new URL(u, document.baseURI).href; })) });
          }
        }catch(e){}
        return true;
      });
    }).catch(function(e){ cargas[lang] = null; return false; });    /* sin paquete / sin red: se reintenta la próxima vez y mientras tanto suenan los tonos */
    return cargas[lang];
  }

  /* ---------- reproducción ---------- */
  function decir(id, forzar){
    if(!forzar && (!activa() || silenciada())) return false;
    if(forzar && silenciada()) return false;
    var lang = idioma(), e = BUF[lang] && BUF[lang][id];
    if(!e){ cargar(lang); return false; }
    var ctx = null; try{ ctx = ensureAudioCtx(); }catch(x){}
    if(!ctx) return false;
    function tocar(){
      try{
        if(actual){ try{ actual.stop(); }catch(z){} actual = null; }
        var s = ctx.createBufferSource(); s.buffer = e.b;
        var out = (window.jpPerfilSonido && jpPerfilSonido.bus && jpPerfilSonido.bus()) || ctx.destination;
        s.connect(out); s.onended = function(){ if(actual === s) actual = null; };
        s.start(ctx.currentTime + 0.006, e.off); actual = s; hablaT = Date.now();
      }catch(x){ console.warn('voz del timer', x); }
    }
    if(ctx.state !== 'running'){ var p = ctx.resume(); if(p && p.then) p.then(tocar).catch(function(){}); else tocar(); }
    else tocar();
    return true;
  }
  /* el timer anuncia hacia dónde va la transición antes de llamar a la chicharra / al "YA" */
  function pista(k){ pistaTxt = PISTAS[k] || null; pistaT = Date.now(); }
  function tomarPista(){ var k = (pistaTxt && Date.now() - pistaT < VIGENCIA_PISTA) ? pistaTxt : null; pistaTxt = null; return k; }
  /* true = habló (o corresponde callar el tono). false = que suene el tono de siempre */
  function hablar(ev, n, clip){
    if(!activa() || silenciada()) return false;
    var id = null;
    if(ev === 'tick') id = (n >= 1 && n <= 3) ? 'n' + n : null;
    else {
      var p = tomarPista();
      if(p === '_tono') return false;    /* el timer pidió el tono de siempre para este aviso */
      id = clip || p || (ev === 'inicio' ? 'go' : (ev === 'mitad' ? 'halfway' : null));
      if(!id && ev === 'fin' && Date.now() - hablaT < 1500) return true;    /* ya habló hace un instante ("Ya" y fin de la preparación): sin tono encima */
    }
    return id ? decir(id) : false;
  }
  function probar(){
    try{ gestoAudio(); }catch(e){}
    cargar().then(function(ok){
      if(!ok) return;
      [['n3', 0], ['n2', 1000], ['n1', 2000], ['go', 3000]].forEach(function(p){ setTimeout(function(){ decir(p[0], true); }, p[1]); });
    });
  }
  function activar(on){
    lsSet(KEY, on ? '1' : '0');
    if(on){ try{ gestoAudio(); }catch(e){} cargar(); }
    avisarCambio();
  }
  function fijarIdioma(v){ lsSet(KEY_L, (v === 'es' || v === 'en') ? v : 'auto'); if(activa()) cargar(); avisarCambio(); }

  /* ---------- controles: fila de Ajustes (hdpVozToggle / hdpVozIdioma / hdpVozProbar) y chip del timer de WOD (cwtVoz) ---------- */
  function pintar(){
    var on = activa();
    var fila = document.getElementById('hdpVozToggle');
    if(fila) Array.prototype.forEach.call(fila.querySelectorAll('[data-voz]'), function(b){ b.classList.toggle('on', b.dataset.voz === (on ? 'on' : 'off')); });
    var idi = document.getElementById('hdpVozIdioma');
    if(idi) Array.prototype.forEach.call(idi.querySelectorAll('[data-vlang]'), function(b){ b.classList.toggle('on', b.dataset.vlang === pref()); });
    var rowI = document.getElementById('hdpVozIdiomaRow'); if(rowI) rowI.style.display = on ? '' : 'none';
    var rowP = document.getElementById('hdpVozProbarRow'); if(rowP) rowP.style.display = on ? '' : 'none';
    var ej = document.getElementById('hdpVozEjemploLb'); if(ej) ej.textContent = T('app.voz.ejemplo', '3 - 2 - 1 - ¡Ya!');
    var lb = document.getElementById('hdpVozLb'); if(lb) lb.textContent = '🗣 ' + T('app.voz.lb', 'Voz del timer');
    var lbI = document.getElementById('hdpVozIdiomaLb'); if(lbI) lbI.textContent = T('app.voz.idioma', 'Idioma de la voz');
    var au = document.getElementById('hdpVozAuto'); if(au) au.textContent = T('app.voz.auto', 'AUTO');
    var pr = document.getElementById('hdpVozProbar'); if(pr) pr.textContent = '▶ ' + T('app.voz.probar', 'Probar');
    var chip = document.getElementById('cwtVoz');
    if(chip){
      chip.textContent = on ? '🗣 ' + T('app.voz.chip.on', 'VOZ: ON') : '🗣 ' + T('app.voz.chip.off', 'VOZ: OFF');
      chip.classList.toggle('off', !on);
      chip.title = on ? T('app.voz.chip.t.on', 'Apagar la voz del timer') : T('app.voz.chip.t.off', 'Activar la voz del timer');
    }
  }
  document.addEventListener('click', function(e){
    var t = e.target; if(!t || !t.closest) return;
    var b = t.closest('#hdpVozToggle [data-voz]'); if(b){ activar(b.dataset.voz === 'on'); return; }
    b = t.closest('#hdpVozIdioma [data-vlang]'); if(b){ fijarIdioma(b.dataset.vlang); return; }
    if(t.closest('#hdpVozProbar')){ probar(); return; }
    if(t.closest('#cwtVoz')){ activar(!activa()); try{ if(navigator.vibrate) navigator.vibrate([15]); }catch(x){} }
  });
  document.addEventListener('jp-voz-cambio', pintar);
  function iniciar(){ pintar(); if(activa()) setTimeout(function(){ cargar(); }, 1200); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();

  return {
    activa: activa, activar: activar, idioma: idioma, preferencia: pref, fijarIdioma: fijarIdioma, cargar: cargar, decir: decir, hablar: hablar, pista: pista, probar: probar, pintar: pintar,
    /* clips ya decodificados por idioma (QA / tests) */
    listos: function(lang){ var b = BUF[lang || idioma()] || {}; return Object.keys(b).filter(function(k){ return k !== '__listo'; }); },
    /* tests: sin red ni sonido real */
    __poner: function(lang, id, buf){ BUF[lang] = BUF[lang] || {}; BUF[lang][id] = { b: buf, off: 0 }; BUF[lang].__listo = true; },
    __vaciar: function(){ BUF = {}; cargas = {}; manifest = null; base = null; pistaTxt = null; hablaT = 0; }
  };
})();
window.jpVoz = jpVoz;
