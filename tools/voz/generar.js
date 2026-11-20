#!/usr/bin/env node
/* Generador del paquete de voz del timer (ElevenLabs). Se corre una vez en tu compu; la app NUNCA llama a la API.
   Uso:
     node tools/voz/generar.js            genera solo las frases nuevas o cambiadas (hash de texto + voz + modelo + ajustes)
     node tools/voz/generar.js --dry      muestra qué generaría, sin llamar a la API
     node tools/voz/generar.js --check    verifica que cada frase tenga su mp3 vigente en español e inglés (exit 1 si no)
     node tools/voz/generar.js --force    regenera todo
     node tools/voz/generar.js --solo go,finish   solo esas frases
     node tools/voz/generar.js --voz <id> usa otra voz (queda registrada en el manifest)
   La clave sale de la variable ELEVENLABS_API_KEY o de un .env (tools/voz/.env, .env en la raíz o elevenlabs-tts/.env). Ninguno se commitea. */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const RAIZ = path.resolve(__dirname, '..', '..'), SALIDA = path.join(RAIZ, 'voz'), IDIOMAS = ['es', 'en'];
const args = process.argv.slice(2), flag = n => args.includes('--' + n), valor = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : null; };
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'frases.json'), 'utf8'));
if(valor('voz')){ cfg.voz = valor('voz'); cfg.vozNombre = valor('voz'); }
/* configuración efectiva por idioma: lo de frases.json "porIdioma" pisa a lo general (voz, modelo, ajustes); así cambiar la voz del español no regenera el inglés */
const conf = idioma => Object.assign({ voz: cfg.voz, vozNombre: cfg.vozNombre, modelo: cfg.modelo, ajustes: cfg.ajustes }, (cfg.porIdioma || {})[idioma] || {});
const solo = valor('solo') ? valor('solo').split(',') : null;

function claveApi(){
  if(process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
  for(const f of [path.join(__dirname, '.env'), path.join(RAIZ, '.env'), path.join(RAIZ, 'elevenlabs-tts', '.env')]){
    try{ const m = /^ELEVENLABS_API_KEY\s*=\s*(.+)$/m.exec(fs.readFileSync(f, 'utf8')); if(m) return m[1].trim().replace(/^["']|["']$/g, ''); }catch(e){}
  }
  return '';
}
const hash = (id, idioma) => crypto.createHash('sha1').update(JSON.stringify({ t: cfg.frases[id][idioma], v: conf(idioma).voz, m: conf(idioma).modelo, a: conf(idioma).ajustes, f: cfg.formato, i: idioma })).digest('hex').slice(0, 12);
let manifest = { version: 1, voz: cfg.voz, modelo: cfg.modelo, clips: {} };
try{ manifest = JSON.parse(fs.readFileSync(path.join(SALIDA, 'manifest.json'), 'utf8')); }catch(e){}
manifest.clips = manifest.clips || {};
const ruta = (id, idioma) => path.join(SALIDA, idioma, id + '.mp3');
const vigente = (id, idioma) => fs.existsSync(ruta(id, idioma)) && manifest.clips[id] && manifest.clips[id][idioma] && manifest.clips[id][idioma].h === hash(id, idioma);
const ids = Object.keys(cfg.frases).filter(id => !solo || solo.includes(id));

async function generar(id, idioma, key){
  const res = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + conf(idioma).voz + '?output_format=' + cfg.formato, {
    method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text: cfg.frases[id][idioma], model_id: conf(idioma).modelo, language_code: idioma, voice_settings: conf(idioma).ajustes })
  });
  if(!res.ok) throw new Error('ElevenLabs respondió ' + res.status + ' en ' + idioma + '/' + id + ': ' + (await res.text()).slice(0, 300));
  return Buffer.from(await res.arrayBuffer());
}
(async function(){
  const pendientes = [];
  ids.forEach(id => IDIOMAS.forEach(i => { if(flag('force') || !vigente(id, i)) pendientes.push([id, i]); }));
  if(flag('check')){
    if(pendientes.length){ console.error('Faltan o están desactualizados ' + pendientes.length + ' clips: ' + pendientes.map(p => p[1] + '/' + p[0]).join(', ')); process.exit(1); }
    console.log('OK · ' + ids.length * IDIOMAS.length + ' clips vigentes (' + IDIOMAS.join(', ') + ')'); return;
  }
  const chars = pendientes.reduce((a, p) => a + cfg.frases[p[0]][p[1]].length, 0);
  console.log(pendientes.length + ' clips a generar (' + chars + ' caracteres) · voces ' + IDIOMAS.map(i => i + ': ' + (conf(i).vozNombre || conf(i).voz)).join(', ') + ' · ' + cfg.modelo);
  if(flag('dry') || !pendientes.length){ pendientes.forEach(p => console.log('  ' + p[1] + '/' + p[0] + '  «' + cfg.frases[p[0]][p[1]] + '»')); return; }
  const key = claveApi(); if(!key){ console.error('Falta ELEVENLABS_API_KEY (variable de entorno o .env).'); process.exit(1); }
  for(const [id, idioma] of pendientes){
    const buf = await generar(id, idioma, key);
    fs.mkdirSync(path.join(SALIDA, idioma), { recursive: true }); fs.writeFileSync(ruta(id, idioma), buf);
    manifest.clips[id] = manifest.clips[id] || {}; manifest.clips[id][idioma] = { h: hash(id, idioma), bytes: buf.length };
    console.log('  ok ' + idioma + '/' + id + '  ' + buf.length + ' bytes');
  }
  manifest.voz = cfg.voz; manifest.modelo = cfg.modelo; manifest.idiomas = IDIOMAS; manifest.voces = {}; IDIOMAS.forEach(i => { manifest.voces[i] = conf(i).vozNombre || conf(i).voz; });
  /* ids que ya no están en frases.json salen del manifest (el mp3 viejo queda para borrarlo a mano) */
  Object.keys(manifest.clips).forEach(id => { if(!cfg.frases[id]) delete manifest.clips[id]; });
  fs.writeFileSync(path.join(SALIDA, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log('Listo: ' + path.relative(RAIZ, SALIDA) + '/manifest.json');
})().catch(e => { console.error('Error: ' + e.message); process.exit(1); });
