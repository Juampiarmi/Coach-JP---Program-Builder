# Voz del timer (ElevenLabs)

La app **nunca** llama a la API: las frases fijas se generan acá, una sola vez, y quedan como archivos en `voz/<idioma>/<id>.mp3` junto con `voz/manifest.json`.

```powershell
node tools/voz/generar.js --dry     # qué generaría
node tools/voz/generar.js           # genera solo lo nuevo o cambiado
node tools/voz/generar.js --check   # ¿cada frase tiene su mp3 vigente en es y en?
```

- Voz por idioma: `frases.json` → `porIdioma` pisa la voz, el modelo y los ajustes generales (hoy el español usa Charlie con más expresividad: estabilidad 0,3, estilo 0,65, velocidad 1,12). Cambiar uno no regenera el otro idioma.
- Probar otras voces o ajustes sin tocar el paquete: `node tools/voz/probar-voces.js es [ids]` (genera una pista por candidata en `tools/voz/muestras/`, ignorada por git).
- Frases, voz (Charlie), modelo y ajustes: `frases.json`. Cambiar un texto o un ajuste regenera solo esa frase (hash en el manifest).
- Clave: variable `ELEVENLABS_API_KEY` o un `.env` en `tools/voz/`, en la raíz o en `elevenlabs-tts/`. Ninguno se commitea (`tools/voz/.gitignore`).
- La clave del proyecto no puede consultar voces ni créditos: un error de cuota recién aparece al generar. El paquete completo son ~100 caracteres por idioma.
- Para publicar: subir la carpeta `voz/` junto a la app (en la raíz del sitio sirve para el Builder y para `atleta/`: la app prueba `voz/` y `../voz/`).
- Idioma nuevo: agregarlo a `IDIOMAS` en `generar.js`, a cada frase de `frases.json` y a `JP_I18N` (`src/shared/i18n/`).

En la app: `src/alumno/js/` → `jpVoz` (módulo `020-voz-del-timer.js`). Sin los mp3 o sin red, el timer suena como siempre (tonos).
