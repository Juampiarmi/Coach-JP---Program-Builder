# Voz del timer (ElevenLabs)

La app **nunca** llama a la API: las frases fijas se generan acá, una sola vez, y quedan como archivos en `voz/<idioma>/<id>.mp3` junto con `voz/manifest.json`.

**El paquete viaja dentro de la app.** `generar.js` también escribe `src/alumno/js/089-voz-paquete.js` (los mp3 en base64, ~180 KB): la app que se exporta es un archivo autónomo (se abre desde un `blob:`, un archivo o cualquier hosting) y no puede depender de una carpeta `voz/` al lado. Los archivos de `voz/` son la fuente del paquete y el respaldo si la app se publica con la carpeta junto a ella. Después de tocar clips: `node tools/voz/generar.js` (o `--empaquetar` si solo cambiaste archivos) y `node tools/build.js`.

```powershell
node tools/voz/generar.js --dry     # qué generaría
node tools/voz/generar.js           # genera solo lo nuevo o cambiado
node tools/voz/generar.js --check   # ¿cada frase tiene su mp3 vigente en es y en, y el paquete incrustado está al día?
node tools/voz/generar.js --empaquetar   # regenera solo el paquete incrustado a partir de voz/
```

- Voz por idioma: `frases.json` → `porIdioma` pisa la voz, el modelo y los ajustes generales (hoy el español usa Charlie con más expresividad: estabilidad 0,3, estilo 0,65, velocidad 1,12). Cambiar uno no regenera el otro idioma.
- Probar otras voces o ajustes sin tocar el paquete: `node tools/voz/probar-voces.js es [ids]` (genera una pista por candidata en `tools/voz/muestras/`, ignorada por git).
- Frases, voz (Charlie), modelo y ajustes: `frases.json`. Cambiar un texto o un ajuste regenera solo esa frase (hash en el manifest).
- Clave: variable `ELEVENLABS_API_KEY` o un `.env` en `tools/voz/`, en la raíz o en `elevenlabs-tts/`. Ninguno se commitea (`tools/voz/.gitignore`).
- La clave del proyecto no puede consultar voces ni créditos: un error de cuota recién aparece al generar. El paquete completo son ~100 caracteres por idioma.
- Con la voz activa el pitido NO suena: la voz lo reemplaza (solo si el paquete no carga, el timer cae a los tonos para no quedar mudo). Voz apagada = tonos de siempre.
- Idioma nuevo: agregarlo a `IDIOMAS` en `generar.js`, a cada frase de `frases.json` y a `JP_I18N` (`src/shared/i18n/`).

En la app: `src/alumno/js/088-voz-del-timer.js` (`jpVoz`) y el paquete `089-voz-paquete.js` (generado: no editar a mano).
