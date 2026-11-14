#!/usr/bin/env node
/* ============================================================
   tools/desescapar.js · paso 2 de la modularización (UNA sola vez)
   ------------------------------------------------------------
   Los archivos de src/alumno/ nacieron como "texto del template literal" (barras dobles, <\/script>): el JS y el CSS de la app del alumno no eran JS ni CSS válidos
   por sí solos. Este script los convierte a su contenido REAL (lo que recibe el navegador del alumno): cada archivo se evalúa como template literal y se reescribe con
   el resultado. Desde entonces tools/build.js aplica el escape del literal al incluirlos (directiva @@template).
   Verificación: el TEMPLATE_HTML evaluado de index.html tiene que quedar idéntico, carácter por carácter, al de antes (ver tools/check-alumno.js).
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RAIZ = path.resolve(__dirname, '..');
const DIR = path.join(RAIZ, 'src', 'alumno');
const aEvaluar = [];
(function recorrer(d){
  fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
    const abs = path.join(d, e.name);
    if(e.isDirectory()) recorrer(abs); else if(/\.(html|css|js)$/.test(e.name)) aEvaluar.push(abs);
  });
})(DIR);

function evaluar(raw){ return vm.runInNewContext('`' + raw + '`'); }
let n = 0, cambiados = 0;
aEvaluar.forEach(f => {
  const raw = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
  let val;
  try{ val = evaluar(raw); }catch(e){ throw new Error('no se pudo evaluar ' + path.relative(RAIZ, f) + ': ' + e.message); }
  n++;
  if(val !== raw){ cambiados++; fs.writeFileSync(f, val); }
});
console.log('desescapados: ' + cambiados + ' de ' + n + ' archivos de src/alumno/');
