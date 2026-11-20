# i18n · textos listos para pasar al inglés

Base para vender la app en inglés sin reescribirla. El español rioplatense es el idioma base y el de respaldo.

## Piezas

| Archivo | Qué es |
|---|---|
| `../i18n.js` | Runtime: `JP_I18N` (`add`, `t`, `setLang`, `lang`, `claves`, `faltantes`, `cobertura`, `incoherentes`), `jpT('clave', {n: 3})` y `jpNombreEj(ej, conIngles)` |
| `es.motor.js` | Motor de textos del Builder: base de conocimiento por ejercicio (`motor.kb.*`), notas por rol (`motor.rol.*`), técnicas (`motor.tec.*`), calentamiento (`motor.wu.*`) |
| `es.pedagogia.js` / `en.pedagogia.js` | Pautas pedagógicas del bloque (`motor.ped.*`) y sus rótulos (`motor.lbl.*`) |
| `en.motor.js` | Inglés de roles y técnicas del motor |
| `es.app.js` / `en.app.js` | Rótulos fijos de la app del alumno (`app.*`): primer lote, la tarjeta del bloque |

Los archivos se incluyen con `@@include` en `src/index.src.html` (Builder) y `src/alumno/index.html` (app del alumno), antes del código que los usa.

## Reglas

1. **Texto visible → diccionario.** Lo que lee una persona va en el diccionario con una clave estable (`area.zona.nombre`) y se pide con `jpT`. Marcadores `{n}`; plurales con `clave.one` / `clave.other`.
2. **Protocolo → código.** Lo que el importador y los editores *leen* (`[FUERZA]`, `SET-UP:`, `Rest 90s`, la dosis `3x10-12 por lado`) es un contrato entre piezas, no copy: no se traduce con el diccionario (si algún día se traduce, se cambia a la vez en el parser y en el generador). Por eso la dosis lleva siempre ` por lado`, aunque el texto explicativo diga «per side».
3. **Nombres de ejercicio y video → español.** `es` es el nombre que se muestra; el inglés es una etiqueta secundaria. Solo `jpNombreEj` decide qué se ve.
4. Si falta una clave en inglés se ve el español, nunca la clave.

## Idioma activo

`?lang=en` en la dirección, o `localStorage` `coachjp_lang`. Por defecto `es`.

## Agregar un idioma o un texto

1. Texto nuevo: agregar la clave en `es.*.js` y en `en.*.js`, y usar `jpT('clave')`. Los tests (`i18n.02`) avisan si en inglés hay claves huérfanas o marcadores distintos.
2. Idioma nuevo: crear `xx.motor.js`, `xx.pedagogia.js`, `xx.app.js` con `JP_I18N.add('xx', {...})` e incluirlos igual que los de inglés.
3. Progreso: `JP_I18N.cobertura('en')` da el porcentaje traducido y `JP_I18N.faltantes('en')` lista lo que falta.

## Qué falta (para el inglés completo)

- `motor.kb.*` (base de conocimiento por ejercicio) y `motor.wu.*` (calentamiento): están en el diccionario en español pero todavía sin versión en inglés.
- El resto de los textos fijos de la app del alumno y del Builder (botones, menús, avisos) sigue escrito en el código: se migran de a zonas con el mismo procedimiento.
