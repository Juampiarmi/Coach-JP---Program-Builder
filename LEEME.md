# Coach JP · PWA Dual

Los tres archivos de esta carpeta hacen que el sistema se instale como app.
El `dashboard.html` y la app del alumno ya funcionan solos: si estos archivos
están al lado, los usan; si no, generan su propio manifiesto y service worker
en memoria. Con GitHub Pages conviene subirlos.

## Cómo se sube a GitHub Pages

```
tu-repo/
├── index.html          ← renombrá acá dashboard.html  (APP DEL ENTRENADOR)
├── manifest.json
├── sw.js
├── icon-192.png
├── icon-512.png
├── icon-192-maskable.png
├── icon-512-maskable.png
└── atleta/
    ├── index.html      ← la app exportada del alumno
    └── manifest.json   ← copiá acá manifest-atleta.json con ese nombre
```

## Los dos modos

**Entrenador** — abrí la raíz (`https://usuario.github.io/tu-repo/`).
Acceso completo: Builder, alumnos, biblioteca, mesociclos, Centro de
Planificaciones. Botón **📲 Instalar App de Coach / Builder** en la barra lateral.

**Atleta** — dos caminos, los dos bloqueados:

1. La app exportada del alumno (`/atleta/index.html`). Es la recomendada:
   lleva su rutina adentro, funciona sin señal y trae el botón
   **📲 Instalar mi Rutina en el Celular**.
2. El panel con `?view=athlete` (por ejemplo
   `https://usuario.github.io/tu-repo/?view=athlete&token=XYZ`).
   Oculta y bloquea el Builder, la biblioteca, el banco, las sedes, los datos
   y el exportador. Si alguien intenta entrar por URL, lo devuelve a Home.

El `sw.js` recuerda el rol del dispositivo: aceptá `?rol=athlete` al registrarlo
para que la caché del alumno quede separada de la del entrenador.

## iOS

En iPhone y iPad no existe el botón de instalar: hay que usar
Compartir → «Agregar a pantalla de inicio». La app ya avisa esto sola cuando
detecta Safari. Las metas `apple-mobile-web-app-*` están puestas, así que abre
en pantalla completa y sin barra del navegador.

---

## Sincronización de marcas (PRs) del alumno

La app del alumno guarda todo primero en el teléfono (localStorage + IndexedDB),
así que puede entrenar sin señal en el gimnasio. Cuando vuelve la conexión, la
cola pendiente se reenvía sola.

Para que esas marcas lleguen a tu panel por Supabase:

1. En el panel, configurá la nube (☁️ Supabase) con la URL del proyecto y la
   **anon key pública**.
2. En **Exportar**, tildá *«Sincronizar las marcas del alumno con mi nube»*
   antes de generar el `index.html` del alumno.
3. La app del alumno queda con ese canal embebido. Nunca viajan tus claves de IA
   ni el resto de la configuración: sólo la anon key pública, la tabla y la clave
   de sincronización.

Tabla mínima en Supabase (SQL editor):

```sql
create table if not exists coachjp_sync (
  clave text primary key,
  data text,
  updated_at bigint,
  device text
);
```

Si preferís no usar la nube, dejá el tilde apagado: las marcas quedan en el
teléfono del alumno y se pasan al panel cuando abrís su archivo en la misma
computadora.
