# Supabase · base en la nube del Builder y la app del atleta

## Configuración única en el panel de Supabase

1. **SQL Editor → New query**: pegá y ejecutá `migrations/20261115000100_core.sql` completo (una sola vez).
2. **Authentication → Sign In / Providers**
   - *Email*: activado (email + contraseña). El link mágico usa el mismo proveedor.
   - **Allow anonymous sign-ins**: activado (así el atleta entra con su link, sin crear cuenta).
   - Recomendado: *Attack Protection → CAPTCHA* (Turnstile) para que nadie cree sesiones anónimas en masa.
3. **Authentication → URL Configuration**
   - *Site URL*: `https://<usuario>.github.io/<repo>/nutrition/`
   - *Redirect URLs*: agregá `https://<usuario>.github.io/<repo>/nutrition/**` (link mágico y recuperación de contraseña).
4. **Authentication → Users → Add user**: creá tu usuario de coach (email + contraseña, "Auto Confirm").
   El primer coach que inicia sesión en el Builder queda dado de alta solo; los siguientes tienen que estar
   invitados desde el Builder (tabla `coach_allowlist`).
5. **Project Settings → API**: copiá *Project URL* y la clave *anon / public*.
   En GitHub: *Settings → Secrets and variables → Actions → Variables* creá
   `SUPABASE_URL` y `SUPABASE_ANON_KEY` (son públicas: la seguridad la dan los permisos por fila).
   Nunca uses la clave `service_role` en el Builder ni en la app del atleta.

6. **GitHub → Actions → Deploy GitHub Pages → Run workflow** (o cualquier commit a `main`): el Builder publicado
   ya muestra **Entrar a la nube** y la app del atleta queda viva en `…/nutrition/plan/<slug>`.

## Uso diario

- **Coach:** entrá al Builder → *Entrar a la nube* → *Mis atletas* (panel con alertas) → abrí un atleta →
  ajustá el plan (se guarda solo) → *Publicar* → *Mandar por WhatsApp* la primera vez. Después cada *Publicar*
  le llega solo al alumno.
- **Alumno:** abre el link una vez, toca *Agregar a inicio* y usa la app como siempre. Sus comidas, agua y peso
  le llegan al coach solos (sin señal quedan guardados en el celular y se envían al volver).
- **Alumnos con la app en archivo:** exportá el respaldo (*Publicar → Respaldo · exportar archivo HTML*) y subilo
  en su repo de siempre: al abrirlo le aparece *Pasar mi historial a mi link nuevo*.

## Pruebas

```bash
npm run test:db      # permisos de la base (RLS + funciones) · requiere Postgres (PGHOST/PGPORT/PGUSER)
npm run test:unit    # alertas del panel del coach
npm run test:cloud   # punta a punta: Builder ↔ app del atleta contra un Supabase de prueba (Postgres real + RLS)
```

`e2e/fake-supabase.mjs` levanta un Supabase de prueba: Postgres real con estas migraciones y permisos, más una
imitación mínima de Auth y de la API REST. Sólo para pruebas.

## Pruebas de seguridad (local / CI)

```bash
PGHOST=/tmp PGPORT=54329 PGUSER=postgres bash supabase/tests/run.sh
```

Crean una base descartable con una imitación mínima de Supabase (`tests/shim.sql`: roles, `auth.uid()`,
`auth.jwt()`), aplican las migraciones y verifican, actuando como cada usuario:
alta de coaches, aislamiento entre coaches, vinculación por link y PIN, freno de intentos de PIN,
"gana el último" en los registros, revocación de celulares, acceso sin sesión y atletas archivados.

## Qué ve cada uno

| | Coach | Celular del atleta (vinculado) | Sin sesión |
|---|---|---|---|
| Ficha del atleta | sus atletas: todo | la suya: lectura | nada |
| Borrador del plan | sus atletas: todo | nada | nada |
| Plan publicado | todas las versiones | sólo la activa | nada |
| Link / PIN | lee el link para reenviarlo | nada | nada |
| Registros diarios | lectura | lectura y escritura | nada |
| Peso | todo | lectura, escritura y borrado | nada |
