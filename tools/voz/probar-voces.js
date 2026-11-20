#!/usr/bin/env node
/* Prueba de voces / parámetros para las frases del timer, SIN tocar voz/ ni el manifest.
   Genera por cada candidata un solo mp3 con la secuencia típica (tres, dos, uno, ya, a trabajar, stop) en tools/voz/muestras/<idioma>/ (carpeta ignorada por git).
   Uso:  node tools/voz/probar-voces.js es            todas las candidatas definidas abajo
         node tools/voz/probar-voces.js es adam,v3    solo esas
   Las candidatas se editan en CANDIDATAS (id de voz de ElevenLabs, modelo, ajustes y, opcional, un prefijo de entrega para eleven_v3). Cuando una gana: pasar su voz y
   ajustes a frases.json y correr `node tools/voz/generar.js --force`. Misma clave que generar.js. */
'use strict';
const fs = require('fs'), path = require('path');
const RAIZ = path.resolve(__dirname, '..', '..'), cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'frases.json'), 'utf8'));
const idioma = process.argv[2] || 'es', solo = process.argv[3] ? process.argv[3].split(',') : null;
const S = (o) => Object.assign({ stability: 0.4, similarity_boost: 0.75, style: 0.5, use_speaker_boost: true, speed: 1.1 }, o || {});
const M2 = 'eleven_multilingual_v2';
const CANDIDATAS = [
  { id: 'charlie-actual', nombre: 'Charlie (la actual)', voz: cfg.voz, modelo: cfg.modelo, ajustes: cfg.ajustes },
  { id: 'charlie-fuerte', nombre: 'Charlie · más expresivo', voz: 'IKne3meq5aSn9XLyUdCD', modelo: M2, ajustes: S({ stability: 0.3, style: 0.65, speed: 1.12 }) },
  { id: 'adam', nombre: 'Adam', voz: 'pNInz6obpgDQGcFmaJgB', modelo: M2, ajustes: S() },
  { id: 'arnold', nombre: 'Arnold', voz: 'VR6AewLTigWG4xSOukaG', modelo: M2, ajustes: S() },
  { id: 'josh', nombre: 'Josh', voz: 'TxGEqnHWrfWFTfGW9XjX', modelo: M2, ajustes: S() },
  { id: 'antoni', nombre: 'Antoni', voz: 'ErXwobaYiN019PkySvjV', modelo: M2, ajustes: S() },
  { id: 'callum', nombre: 'Callum', voz: 'N2lVS1w4EtoT3dr4eOWO', modelo: M2, ajustes: S() },
  { id: 'v3-charlie', nombre: 'Charlie · eleven_v3 (tags de entrega)', voz: 'IKne3meq5aSn9XLyUdCD', modelo: 'eleven_v3', ajustes: { stability: 0.0 }, prefijo: { go: '[shouting] ', work: '[excited] ', finish: '[excited] ' } },
  { id: 'v3-adam', nombre: 'Adam · eleven_v3 (tags de entrega)', voz: 'pNInz6obpgDQGcFmaJgB', modelo: 'eleven_v3', ajustes: { stability: 0.0 }, prefijo: { go: '[shouting] ', work: '[excited] ', finish: '[excited] ' } }
];
const SECUENCIA = ['n3', 'n2', 'n1', 'go', 'work', 'finish'];
function clave(){
  if(process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
  for(const f of [path.join(__dirname, '.env'), path.join(RAIZ, '.env'), path.join(RAIZ, 'elevenlabs-tts', '.env')]){
    try{ const m = /^ELEVENLABS_API_KEY\s*=\s*(.+)$/m.exec(fs.readFileSync(f, 'utf8')); if(m) return m[1].trim().replace(/^["']|["']$/g, ''); }catch(e){}
  }
  return '';
}
(async function(){
  const key = clave(); if(!key){ console.error('Falta ELEVENLABS_API_KEY'); process.exit(1); }
  const dir = path.join(__dirname, 'muestras', idioma); fs.mkdirSync(dir, { recursive: true });
  for(const c of CANDIDATAS.filter(c => !solo || solo.includes(c.id))){
    const partes = [];
    try{
      for(const id of SECUENCIA){
        const texto = ((c.prefijo && c.prefijo[id]) || '') + cfg.frases[id][idioma];
        const res = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + c.voz + '?output_format=' + cfg.formato, {
          method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
          body: JSON.stringify({ text: texto, model_id: c.modelo, language_code: idioma, voice_settings: c.ajustes })
        });
        if(!res.ok) throw new Error(res.status + ' ' + (await res.text()).slice(0, 160));
        partes.push(Buffer.from(await res.arrayBuffer()));
      }
      /* una sola pista: los mp3 de igual formato se pueden concatenar tal cual (sirve para comparar a oído; no es el paquete final) */
      fs.writeFileSync(path.join(dir, c.id + '.mp3'), Buffer.concat(partes));
      console.log('ok  ' + c.id + '  (' + c.nombre + ')  ' + partes.reduce((a, b) => a + b.length, 0) + ' bytes');
    }catch(e){ console.log('NO  ' + c.id + '  ' + e.message.replace(/\s+/g, ' ')); }
  }
})();
