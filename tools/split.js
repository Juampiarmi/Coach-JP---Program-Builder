#!/usr/bin/env node
/* ============================================================
   tools/split.js · parte index.html en src/ (UNA sola vez, o para re-partir si alguien edito index.html a mano)
   ------------------------------------------------------------
   Es una operacion mecanica por lineas: no cambia ni un byte del resultado. Garantia: despues de partir, "node tools/build.js --check" tiene que dar OK.
     src/index.src.html              app del coach (Builder): todo lo que rodea al template del alumno
     src/alumno/index.html           la app del alumno (el contenido del template literal TEMPLATE_HTML), con un marcador @@include por cada bloque
     src/alumno/css/NNN-*.css        cada <style> del alumno
     src/alumno/js/NNN-*.js          cada <script> del alumno
   Los archivos del alumno conservan el escape del template literal (barras dobles, <\/script>): son "texto del literal", no JS puro todavia.
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const SRC = path.join(RAIZ, 'src');
/* en Windows con autocrlf el working copy llega con CRLF; el blob versionado es LF: se trabaja siempre en LF */
const origen = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
if(origen.indexOf('\r') >= 0) throw new Error('index.html tiene un CR suelto (no CRLF): revisalo antes de partir');
if(origen.indexOf('@@include') >= 0) throw new Error('index.html ya contiene la cadena "@@include": no se puede usar como directiva');
const lineas = origen.split('\n');

const PREFIJO = 'const TEMPLATE_HTML = `';
const ini = lineas.findIndex(l => l.startsWith(PREFIJO));
if(ini < 0) throw new Error('no se encontro TEMPLATE_HTML');
let fin = -1;
for(let i = ini + 1; i < lineas.length; i++){ if(/^`;\s*$/.test(lineas[i])){ fin = i; break; } }
if(fin < 0) throw new Error('no se encontro el cierre del template');

/* cuerpo del template = lo que hay entre el backtick de apertura y el de cierre (termina en "\n") */
const cuerpo = [lineas[ini].slice(PREFIJO.length)].concat(lineas.slice(ini + 1, fin));

/* ---------- bloques <style> / <script> con las etiquetas solas en su linea ---------- */
const RX_ABRE = /^\s*<(style|script)\b[^>]*>\s*$/;
const RX_CIERRA = { style: /^\s*<\/style>\s*$/, script: /^\s*<\\?\/script>\s*$/ };
function slugDe(tag, contenido){
  const id = /\bid="([^"]+)"/.exec(tag);
  if(id) return id[1].replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  /* primer comentario con texto de titulo entre las primeras lineas */
  for(let k = 0; k < Math.min(contenido.length, 14); k++){
    let t = contenido[k].replace(/^\s*\/?\*+\s*|\s*\*+\/?\s*$/g, '').replace(/^[=\-\s]+|[=\-\s]+$/g, '').trim();
    if(/^(?:\(function|'use strict'|var |const |let |function |if\s*\(|try\s*\{|window\.|document\.|typeof |\.|[#a-z]+\s*\{)/.test(t)) continue;
    if(t.replace(/[^A-Za-zÁ-ú]/g, '').length < 8) continue;
    const s = t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').slice(0, 5).join('-');
    if(s.length >= 6) return s;
  }
  return 'sin-titulo';
}
const shell = [];
const archivos = {};          /* ruta relativa a src/ -> contenido */
let n = 0, i = 0;
while(i < cuerpo.length){
  const l = cuerpo[i];
  const m = RX_ABRE.exec(l);
  if(m){
    const tipo = m[1];
    let j = i + 1;
    while(j < cuerpo.length && !RX_CIERRA[tipo].test(cuerpo[j])) j++;
    if(j < cuerpo.length && j > i + 1){
      const contenido = cuerpo.slice(i + 1, j);
      n++;
      const ext = tipo === 'style' ? 'css' : 'js';
      const nombre = 'alumno/' + ext + '/' + String(n).padStart(3, '0') + '-' + slugDe(l, contenido) + '.' + ext;
      archivos[nombre] = contenido.join('\n') + '\n';
      shell.push(l, '@@include ' + nombre + '@@', cuerpo[j]);
      i = j + 1; continue;
    }
  }
  shell.push(l); i++;
}

/* ---------- escritura ---------- */
fs.rmSync(SRC, { recursive: true, force: true });
function escribir(rel, texto){
  const abs = path.join(SRC, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, texto);
}
Object.keys(archivos).forEach(r => escribir(r, archivos[r]));
escribir('alumno/index.html', shell.join('\n') + '\n');
/* coach: todo lo anterior + el prefijo + marcador + "`;" y el resto */
const coach = lineas.slice(0, ini).join('\n') + '\n' + PREFIJO + '@@include alumno/index.html@@' + lineas.slice(fin).join('\n');
escribir('index.src.html', coach);
console.log('src/ generado: ' + Object.keys(archivos).length + ' archivos css/js del alumno + alumno/index.html (' + shell.length + ' lineas) + index.src.html (' + coach.split('\n').length + ' lineas)');
