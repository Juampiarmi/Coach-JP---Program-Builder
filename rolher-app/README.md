# RolHer App

PWA de gestión financiera y control de flota para las unidades de negocio **UBER**, **TRY** y **HOTEL**.

**Stack:** Next.js 14 (App Router) · TypeScript estricto · Tailwind CSS · Lucide React · Recharts · Supabase.

## Puesta en marcha

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Crear el esquema en Supabase: abrir **SQL Editor**, pegar `supabase/schema.sql` y ejecutar (es idempotente).
3. Configurar credenciales:
   ```bash
   cp .env.example .env.local
   ```
   Completar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API).
4. Desarrollo:
   ```bash
   npm run dev
   ```

Verificaciones obligatorias antes de cada commit: `npm run typecheck`, `npm run lint` y `npm run build`.

Sin credenciales la app compila y corre igual: muestra un aviso y estados vacíos, y el selector de unidades usa la lista local.

## Módulos

| Ruta      | Función |
|-----------|---------|
| `/`       | KPIs (ingresos, egresos, resultado, **caja real**), gráfico de 6 meses, filtro por unidad, últimos movimientos |
| `/carga`  | Carga rápida de ingresos/egresos. "Guardar" queda bloqueado hasta que unidad, fecha, categoría y monto > 0 sean válidos |
| `/cuotas` | Semáforo (vencidas / vencen en 7 días / al día / cobradas) y proyección de cobro a 30 y 60 días |
| `/flota`  | Ficha por patente con costos acumulados, alertas de VTV, seguro y service, y alta de vehículos en vivo (Realtime) |

## Reglas de negocio (aplicadas en UI **y** en la base)

- **Monto** siempre > 0; el signo lo da el `tipo` (INGRESO / EGRESO). Acepta `15000`, `15.000` o `15.000,50`.
- **Cuotas:** solo un INGRESO con TARJETA puede ser en 3 o 6 cuotas. El trigger `fn_generar_plan_cuotas` crea el plan mensual y la última cuota absorbe el redondeo.
- **Caja real** = ingresos de contado + cuotas cobradas − egresos. Una venta en cuotas no entra a caja hasta que se cobra cada cuota.
- **Patentes:** formato viejo `ABC123` o Mercosur `AB123CD`. Se aceptan con espacios o guiones y se guardan normalizadas (CHECK con regex + UNIQUE).
- **Fechas:** strings `YYYY-MM-DD` en hora local, para evitar el corrimiento de un día por UTC.

## Estructura

```
app/            Rutas (App Router), layout, manifest PWA, estilos globales
components/     UI compartida (AppShell, Field, estados), dashboard/ y flota/
lib/
  types.ts        Modelo de dominio y constantes
  supabase.ts     Cliente singleton (null si faltan las variables de entorno)
  data.ts         Acceso a datos: nunca lanza, devuelve Result<T> con errores legibles
  validation.ts   Patentes, montos y validadores de formularios
  finance.ts      Cálculos puros: KPIs, flujo, semáforo, proyección, alertas de flota
  useUnidades.ts  Hook resiliente: Supabase → fallback ['UBER','TRY','HOTEL'] con timeout y reintento
  useAsync.ts     Carga con estados de carga y error; descarta respuestas obsoletas
supabase/schema.sql  Tablas, restricciones, índices, trigger, RLS y publicación Realtime
public/         Service worker e íconos
```

## Convenciones de UI

- Fondo `bg-slate-50`, tarjetas `.card` (`border-slate-200/80`, sombra sutil), mobile-first.
- Inputs `.input`: `h-12` (48px) y `text-base` (16px), para evitar el auto-zoom de iOS.
- Formularios en `grid grid-cols-1 sm:grid-cols-2 gap-4`.
- Gráfico: ingresos `#0d9488`, egresos `#ea580c` (paleta validada para daltonismo).

## Seguridad (pendiente)

Las políticas RLS permiten acceso `anon` mientras se integra Supabase Auth. Antes de producción hay que restringirlas a `authenticated` (ver la sección 6 de `schema.sql`).
