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
