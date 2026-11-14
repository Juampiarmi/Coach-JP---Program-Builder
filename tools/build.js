#!/usr/bin/env node
/* ============================================================
   tools/build.js · ensambla index.html a partir de src/
   ------------------------------------------------------------
   Uso:
     node tools/build.js            escribe index.html
     node tools/build.js --check    no escribe: falla (exit 1) si index.html no es EXACTAMENTE lo que produce src/

   Directivas (dentro de cualquier archivo de src/):
     @@include ruta@@     reemplaza la directiva por el contenido del archivo (ruta relativa a src/, se resuelve recursivo)
     - En una linea propia ("@@include x@@\n") consume tambien el salto de linea de la directiva.
     - En el medio de una linea se reemplaza solo la directiva.
   El contenido incluido se copia TAL CUAL (sin escapar): la app del alumno vive dentro de un template literal (TEMPLATE_HTML),
   asi que sus archivos conservan las barras invertidas dobles del literal. Ver tools/README.md.
   Sin dependencias: solo Node.
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const SRC = path.join(RAIZ, 'src');
const ENTRADA = path.join(SRC, 'index.src.html');
const SALIDA = path.join(RAIZ, 'index.html');

function leer(abs){
  /* git en Windows (autocrlf) puede entregar CRLF: la salida siempre es LF, igual que el index.html versionado */
  return fs.readFileSync(abs, 'utf8').replace(/\r\n/g, '\n');
}
function resolver(rel, desde){
  const abs = path.resolve(SRC, rel);
  if(abs !== SRC && !abs.startsWith(SRC + path.sep)) throw new Error('include fuera de src/: ' + rel + ' (en ' + desde + ')');
  if(!fs.existsSync(abs)) throw new Error('include inexistente: ' + rel + ' (en ' + desde + ')');
  return abs;
}
function expandir(texto, desde, pila){
  const sub = rel => {
    const abs = resolver(rel, desde);
    if(pila.indexOf(abs) >= 0) throw new Error('include circular: ' + pila.concat(abs).map(p => path.relative(SRC, p)).join(' -> '));
    return expandir(leer(abs), path.relative(SRC, abs), pila.concat(abs));
  };
  /* una funcion de reemplazo evita que "$&" o "$1" dentro del contenido se interpreten */
  return texto
    .replace(/^@@include ([^\s@]+)@@\n/gm, (m, rel) => sub(rel))
    .replace(/@@include ([^\s@]+)@@/g, (m, rel) => sub(rel));
}
function construir(){
  return expandir(leer(ENTRADA), path.relative(SRC, ENTRADA), [ENTRADA]);
}

const check = process.argv.includes('--check');
let salida;
try{ salida = construir(); }catch(e){ console.error('build: ' + e.message); process.exit(2); }
if(check){
  const actual = fs.existsSync(SALIDA) ? leer(SALIDA) : null;
  if(actual === salida){ console.log('OK · index.html coincide con src/ (' + Buffer.byteLength(salida) + ' bytes)'); process.exit(0); }
  let i = 0; const a = actual || '';
  while(i < a.length && i < salida.length && a[i] === salida[i]) i++;
  const linea = (salida.slice(0, i).match(/\n/g) || []).length + 1;
  console.error('DIFERENCIA · index.html no coincide con lo que produce src/ (primera diferencia cerca de la linea ' + linea + ').');
  console.error('Si editaste index.html a mano: trasladá el cambio a src/ (o corré "node tools/split.js" para volver a partir). Si editaste src/: corré "node tools/build.js".');
  process.exit(1);
}
/* OneDrive / antivirus pueden tener el archivo tomado un instante: se reintenta antes de rendirse */
for(let intento = 1; ; intento++){
  try{ fs.writeFileSync(SALIDA, salida); break; }
  catch(e){
    if(intento >= 5) throw e;
    const hasta = Date.now() + 500 * intento; while(Date.now() < hasta){ /* espera corta */ }
  }
}
console.log('index.html generado (' + Buffer.byteLength(salida) + ' bytes, ' + salida.split('\n').length + ' lineas)');
