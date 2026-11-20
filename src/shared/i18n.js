/* =========================================================
   i18n · base para vender la app en inglés sin reescribirla
   ---------------------------------------------------------
   Reglas de la casa (ver src/shared/i18n/LEEME.md):
     1. TEXTO VISIBLE → diccionario. Todo texto que lee una persona (pautas, rótulos de la tarjeta, avisos) vive en src/shared/i18n/<idioma>.js con una clave estable
        ("motor.ped.aprox.F") y se pide con jpT('clave', { n: 3 }). El español es el idioma base y el de respaldo: si falta una clave en otro idioma, se ve el español (nunca una clave).
     2. PROTOCOLO → código. Los rótulos que el importador y los editores LEEN para entender un bloque ("[FUERZA]", "SET-UP:", "Rest 90s", "Drop-set") son un contrato entre piezas
        del sistema, no copy: se quedan como constantes en el código (ver PROTO en 10-motor-textos.js). Si algún día se traducen, se traducen en el parser y en el generador a la vez.
     3. NOMBRES DE VIDEO / EJERCICIO → siempre en español (campo es de la biblioteca). El inglés (en) es una etiqueta secundaria; jpNombreEj() es el único lugar que decide qué se muestra.
   Idioma activo: ?lang=en en la dirección, o localStorage "coachjp_lang"; por defecto es.
   ========================================================= */
(function(root){
  'use strict';
  if(root.JP_I18N && root.JP_I18N.__v) return;
  var BASE = 'es', DICT = {}, lang = BASE;
  function leerLang(){
    var l = '';
    try{ var m = /[?&]lang=([a-z]{2})\b/i.exec(root.location && root.location.search || ''); if(m) l = m[1].toLowerCase(); }catch(e){}
    if(!l){ try{ l = String(root.localStorage.getItem('coachjp_lang') || '').toLowerCase(); }catch(e2){} }
    return /^[a-z]{2}$/.test(l) ? l : BASE;
  }
  lang = leerLang();
  function add(idioma, dic){
    var d = DICT[idioma] = DICT[idioma] || {};
    Object.keys(dic || {}).forEach(function(k){ d[k] = dic[k]; });
  }
  function interpolar(txt, p){
    if(!p) return txt;
    return String(txt).replace(/\{(\w+)\}/g, function(m, k){ return p[k] != null ? String(p[k]) : m; });
  }
  /* t('clave', { n: 2 }): si hay n y existen clave.one / clave.other, elige por cantidad (en inglés y en español 1 = one) */
  function buscar(idioma, clave, p){
    var d = DICT[idioma]; if(!d) return null;
    if(p && typeof p.n === 'number'){
      var suf = (p.n === 1) ? '.one' : '.other';
      if(d[clave + suf] != null) return d[clave + suf];
    }
    return d[clave] != null ? d[clave] : null;
  }
  function t(clave, p){
    var v = buscar(lang, clave, p);
    if(v == null && lang !== BASE) v = buscar(BASE, clave, p);
    return v == null ? clave : interpolar(v, p);
  }
  function setLang(l){
    l = String(l || BASE).toLowerCase(); if(!/^[a-z]{2}$/.test(l)) l = BASE;
    lang = l; try{ root.localStorage.setItem('coachjp_lang', l); }catch(e){}
    try{ if(root.document && root.document.documentElement) root.document.documentElement.lang = l; }catch(e2){}
    return lang;
  }
  /* herramientas para tests y para el equipo de traducción */
  function claves(idioma){ return Object.keys(DICT[idioma] || {}); }
  function faltantes(idioma){ var e = DICT[idioma] || {}; return claves(BASE).filter(function(k){ return e[k] == null; }); }
  function cobertura(idioma){ var n = claves(BASE).length; return n ? Math.round((n - faltantes(idioma).length) / n * 100) : 100; }
  function marcadores(txt){ return (String(txt).match(/\{\w+\}/g) || []).sort().join(','); }
  /* claves cuyo texto traducido usa otros {marcadores} que el español: rompería la interpolación */
  function incoherentes(idioma){
    var base = DICT[BASE] || {}, d = DICT[idioma] || {};
    return Object.keys(d).filter(function(k){ return base[k] == null || marcadores(base[k]) !== marcadores(d[k]); });
  }
  root.JP_I18N = { __v: 1, BASE: BASE, add: add, t: t, setLang: setLang, lang: function(){ return lang; }, idiomas: function(){ return Object.keys(DICT); }, claves: claves, faltantes: faltantes, cobertura: cobertura, incoherentes: incoherentes };
  root.jpT = t;
  /* nombre que se muestra de un ejercicio: SIEMPRE el español (video y plantillas en español); el inglés va entre paréntesis como etiqueta secundaria cuando existe */
  root.jpNombreEj = function(ex, conIngles){
    if(!ex) return '';
    var es = String(ex.es || ex.en || '');
    return (conIngles && ex.en && String(ex.en).toLowerCase() !== es.toLowerCase()) ? es + ' (' + ex.en + ')' : es;
  };
})(typeof window !== 'undefined' ? window : this);
