/* ============================================================
   tools/estilos.js · expande los selectores "@est" de los CSS de estilos de tarjeta
   ------------------------------------------------------------
   Los estilos de tarjeta de ejercicio (1 Clean Tech · 2 High-Performance · 4 Compacto de élite; el 3 se descartó y cae en el 2) se eligen con el atributo data-jp-estilo="N".
   Ese atributo vive en <body> (app del alumno y Builder) o en un contenedor de la vista previa (Showroom). Como la app del alumno trae capas de CSS viejas con
   !important y mucha especificidad, cada regla tiene que escribirse con la especificidad suficiente para ganarles. Para no repetirlo a mano en cientos de reglas,
   el CSS fuente usa un prefijo corto y este módulo lo expande:

     @est(2) .jp-dose-bar{...}   →  html body:not(#_):not(#__)[data-jp-estilo="2"] .jp-dose-bar, html body:not(#_):not(#__) [data-jp-estilo="2"] .jp-dose-bar{...}
     @est .jp-dose-bar{...}      →  lo mismo para CUALQUIER estilo (atributo presente)

   Se usa desde tools/build.js (directiva @@estilo ruta@@) y desde tools/check-alumno.js. Sin dependencias.
   ============================================================ */
'use strict';

const PREF = 'html body:not(#_):not(#__)';

function expandirSelector(sel){
  const m = /^\s*@est(?:\((\d)\))?\s*([\s\S]*)$/.exec(sel);
  if(!m) return sel.trim();
  const attr = m[1] ? '[data-jp-estilo="' + m[1] + '"]' : '[data-jp-estilo]';
  const resto = m[2].trim();
  return PREF + attr + (resto ? ' ' + resto : '') + ', ' + PREF + ' ' + attr + (resto ? ' ' + resto : '');
}

/* separa una lista de selectores por comas que NO estén dentro de paréntesis o corchetes */
function partirLista(txt){
  const out = []; let dep = 0, ini = 0;
  for(let i = 0; i < txt.length; i++){
    const c = txt[i];
    if(c === '(' || c === '[') dep++;
    else if(c === ')' || c === ']') dep--;
    else if(c === ',' && dep === 0){ out.push(txt.slice(ini, i)); ini = i + 1; }
  }
  out.push(txt.slice(ini));
  return out;
}

function expandirBloque(css){
  let out = '', i = 0;
  while(i < css.length){
    const a = css.indexOf('{', i);
    if(a < 0){ out += css.slice(i); break; }
    const pre = css.slice(i, a);
    /* cuerpo hasta la llave que cierra (se respetan llaves anidadas: @media) */
    let dep = 1, j = a + 1;
    while(j < css.length && dep > 0){ if(css[j] === '{') dep++; else if(css[j] === '}') dep--; j++; }
    const cuerpo = css.slice(a + 1, j - 1);
    const p = pre.trim();
    if(/^@(media|supports|container|layer)\b/i.test(p)) out += p + '{' + expandirBloque(cuerpo) + '}\n';
    else if(p.charAt(0) === '@' && !/^@est(?![A-Za-z])/.test(p)) out += p + '{' + cuerpo + '}\n';      /* @keyframes, @font-face: tal cual */
    else out += partirLista(p).map(expandirSelector).join(', ') + '{' + cuerpo.trim() + '}\n';
    i = j;
  }
  return out;
}

function expandirEstilos(css){
  const limpio = String(css).replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');
  return expandirBloque(limpio).replace(/\n{2,}/g, '\n');
}

module.exports = { expandirEstilos, PREF };
