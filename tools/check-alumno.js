#!/usr/bin/env node
/* ============================================================
   tools/check-alumno.js · controles de la app del alumno (src/alumno/)
   ------------------------------------------------------------
     node tools/check-alumno.js                 valida los archivos de src/alumno/ y que index.html (ensamblado) los contenga tal cual
     node tools/check-alumno.js --contra <ref>  además compara el TEMPLATE_HTML evaluado con el de otra versión de index.html (ej: HEAD~1, un archivo o una rama de git)
   1) cada src/alumno/js/*.js es JavaScript válido (los marcadores {{...}} de compile() se reemplazan por null antes de analizar)
   2) ningún archivo trae CR ni la cadena @@include / @@template
   3) el TEMPLATE_HTML evaluado de index.html == el texto que producen los archivos de src/alumno/ (sin pasar por el escape del literal)
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const vm = require('vm');

const RAIZ = path.resolve(__dirname, '..');
const DIR = path.join(RAIZ, 'src', 'alumno');
let fallas = 0;
const falla = m => { fallas++; console.error('✗ ' + m); };

/* 1 y 2 · sintaxis y limpieza de cada archivo */
let nJs = 0, nCss = 0;
(function recorrer(d){
  fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
    const abs = path.join(d, e.name), rel = path.relative(RAIZ, abs);
    if(e.isDirectory()){ recorrer(abs); return; }
    const t = fs.readFileSync(abs, 'utf8');
    if(/\r/.test(t.replace(/\r\n/g, ''))) falla(rel + ': tiene un CR suelto');
    if(/@@(?:include|template)/.test(t) && !/index\.html$/.test(e.name)) falla(rel + ': contiene una directiva del build');
    if(/\.js$/.test(e.name)){
      nJs++;
      try{ new vm.Script(t.replace(/\{\{[A-Z_]+\}\}/g, 'null'), { filename: rel }); }
      catch(err){ falla(rel + ': ' + err.message); }
    } else if(/\.css$/.test(e.name)) nCss++;
  });
})(DIR);

/* 2b · la sesión de audio NUNCA puede ser 'playback': pausaría la música del usuario al abrir la app (siempre 'ambient') */
(function revisarAudio(){
  const RX = /audioSession\.type\s*=\s*['"]playback['"]/;
  function recorrer(p){
    if(!fs.existsSync(p)) return;
    if(fs.statSync(p).isDirectory()){ fs.readdirSync(p).forEach(n => recorrer(path.join(p, n))); return; }
    if(!/\.(js|html)$/.test(p)) return;
    if(RX.test(fs.readFileSync(p, 'utf8'))) falla(path.relative(RAIZ, p) + ": asigna audioSession.type = 'playback' (tiene que ser 'ambient')");
  }
  recorrer(path.join(RAIZ, 'src', 'index.src.html'));
  recorrer(DIR);
})();

/* 3 · el TEMPLATE_HTML de index.html == lo que dicen los archivos */
function plantillaDe(html){
  const ini = html.indexOf('const TEMPLATE_HTML = `');
  const fin = html.indexOf('\n`;', ini);
  if(ini < 0 || fin < 0) throw new Error('no se encontró TEMPLATE_HTML');
  return vm.runInNewContext('`' + html.slice(ini + 'const TEMPLATE_HTML = `'.length, fin + 1) + '`');
}
function expandirSinEscapar(rel, pila){
  const abs = path.join(path.join(RAIZ, 'src'), rel);
  const t = fs.readFileSync(abs, 'utf8').replace(/\r\n/g, '\n');
  return t.replace(/^@@include ([^\s@]+)@@\n/gm, (m, r) => expandirSinEscapar(r)).replace(/@@include ([^\s@]+)@@/g, (m, r) => expandirSinEscapar(r));
}
const salida = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
let evaluada = '';
try{ evaluada = plantillaDe(salida); }catch(e){ falla('index.html: ' + e.message); }
const esperada = expandirSinEscapar('alumno/index.html');
if(evaluada && evaluada !== esperada) falla('el TEMPLATE_HTML evaluado de index.html no coincide con src/alumno/ (¿falta correr node tools/build.js?)');

/* comparación opcional contra otra versión */
const i = process.argv.indexOf('--contra');
if(i > 0){
  const ref = process.argv[i + 1];
  let otro = '';
  try{
    otro = fs.existsSync(ref) ? fs.readFileSync(ref, 'utf8') : cp.execFileSync('git', ['show', ref + ':index.html'], { cwd: RAIZ, maxBuffer: 1 << 28 }).toString('utf8');
    otro = otro.replace(/\r\n/g, '\n');
    const evalOtro = plantillaDe(otro);
    if(evalOtro === evaluada) console.log('✓ TEMPLATE_HTML idéntico al de ' + ref + ' (' + evaluada.length + ' caracteres)');
    else{
      let k = 0; while(k < evalOtro.length && evalOtro[k] === evaluada[k]) k++;
      falla('TEMPLATE_HTML distinto al de ' + ref + ' (primera diferencia en el carácter ' + k + ': «' + evalOtro.slice(k, k + 40).replace(/\n/g, '↵') + '» vs «' + evaluada.slice(k, k + 40).replace(/\n/g, '↵') + '»)');
    }
  }catch(e){ falla('no se pudo comparar con ' + ref + ': ' + e.message); }
}

if(fallas){ console.error('\n' + fallas + ' problema(s)'); process.exit(1); }
console.log('✓ app del alumno OK · ' + nJs + ' archivos JS con sintaxis válida · ' + nCss + ' CSS · TEMPLATE_HTML coincide con src/alumno/');
