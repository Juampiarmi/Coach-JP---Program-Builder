-- =====================================================================
-- RolHer App · Esquema base de Supabase (PostgreSQL)
-- Ejecutar completo en: Supabase → SQL Editor → New query → Run.
-- Es idempotente: se puede volver a correr sin romper datos existentes.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Unidades de negocio
-- ---------------------------------------------------------------------
create table if not exists public.unidades (
  id         smallserial primary key,
  nombre     text not null unique check (nombre = upper(btrim(nombre)) and length(nombre) between 2 and 30),
  activa     boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.unidades (nombre) values ('UBER'), ('TRY'), ('HOTEL')
on conflict (nombre) do nothing;

-- ---------------------------------------------------------------------
-- 2. Vehículos (flota)
--    Patente: formato viejo (AAA999) o Mercosur (AA999AA), sin espacios ni guiones.
-- ---------------------------------------------------------------------
create table if not exists public.vehiculos (
  id                  uuid primary key default gen_random_uuid(),
  patente             text not null unique
                        check (patente ~ '^([A-Z]{3}[0-9]{3}|[A-Z]{2}[0-9]{3}[A-Z]{2})$'),
  marca               text not null check (length(btrim(marca)) > 0),
  modelo              text not null check (length(btrim(modelo)) > 0),
  anio                smallint check (anio between 1980 and 2100),
  unidad              text not null references public.unidades (nombre) on update cascade,
  km_actual           integer check (km_actual >= 0),
  service_km_proximo  integer check (service_km_proximo >= 0),
  vtv_vencimiento     date,
  seguro_vencimiento  date,
  activo              boolean not null default true,
  created_at          timestamptz not null default now()
);

create index if not exists vehiculos_unidad_idx on public.vehiculos (unidad);

-- ---------------------------------------------------------------------
-- 3. Movimientos (ingresos y egresos)
--    Reglas de negocio blindadas en la base, además de la UI:
--      * monto siempre positivo (el signo lo da `tipo`)
--      * solo un INGRESO con TARJETA puede financiarse en 3 o 6 cuotas
-- ---------------------------------------------------------------------
create table if not exists public.movimientos (
  id           uuid primary key default gen_random_uuid(),
  fecha        date not null,
  unidad       text not null references public.unidades (nombre) on update cascade,
  tipo         text not null check (tipo in ('INGRESO', 'EGRESO')),
  categoria    text not null check (length(btrim(categoria)) > 0),
  monto        numeric(14, 2) not null check (monto > 0),
  medio_pago   text not null default 'EFECTIVO'
                 check (medio_pago in ('EFECTIVO', 'TRANSFERENCIA', 'MERCADO_PAGO', 'TARJETA')),
  cuotas       smallint not null default 1 check (cuotas in (1, 3, 6)),
  vehiculo_id  uuid references public.vehiculos (id) on delete set null,
  descripcion  text,
  created_at   timestamptz not null default now(),
  constraint movimientos_cuotas_solo_tarjeta_ingreso
    check (cuotas = 1 or (tipo = 'INGRESO' and medio_pago = 'TARJETA'))
);

create index if not exists movimientos_fecha_idx    on public.movimientos (fecha desc);
create index if not exists movimientos_unidad_idx   on public.movimientos (unidad);
create index if not exists movimientos_vehiculo_idx on public.movimientos (vehiculo_id);

-- ---------------------------------------------------------------------
-- 4. Plan de cuotas (cobros pendientes de ventas en cuotas)
-- ---------------------------------------------------------------------
create table if not exists public.plan_cuotas (
  id                 uuid primary key default gen_random_uuid(),
  movimiento_id      uuid not null references public.movimientos (id) on delete cascade,
  numero             smallint not null check (numero >= 1),
  total_cuotas       smallint not null check (total_cuotas in (3, 6)),
  monto              numeric(14, 2) not null check (monto > 0),
  fecha_vencimiento  date not null,
  estado             text not null default 'PENDIENTE' check (estado in ('PENDIENTE', 'COBRADA')),
  fecha_cobro        date,
  created_at         timestamptz not null default now(),
  unique (movimiento_id, numero),
  check (numero <= total_cuotas),
  check ((estado = 'COBRADA') = (fecha_cobro is not null))
);

create index if not exists plan_cuotas_venc_idx on public.plan_cuotas (fecha_vencimiento) where estado = 'PENDIENTE';

-- ---------------------------------------------------------------------
-- 5. Trigger: genera el plan de cuotas al registrar un cobro en tarjeta 3/6 cuotas.
--    La última cuota absorbe el redondeo para que la suma sea exacta al centavo.
--    Vencimientos mensuales a partir del mes siguiente a la fecha del movimiento.
-- ---------------------------------------------------------------------
create or replace function public.fn_generar_plan_cuotas()
returns trigger
language plpgsql
as $$
declare
  v_base  numeric(14, 2);
  v_monto numeric(14, 2);
  i       smallint;
begin
  if new.medio_pago <> 'TARJETA' or new.cuotas not in (3, 6) then
    return new;
  end if;

  v_base := trunc(new.monto / new.cuotas, 2);

  for i in 1..new.cuotas loop
    v_monto := case when i = new.cuotas then new.monto - v_base * (new.cuotas - 1) else v_base end;
    insert into public.plan_cuotas (movimiento_id, numero, total_cuotas, monto, fecha_vencimiento)
    values (new.id, i, new.cuotas, v_monto, (new.fecha + make_interval(months => i))::date)
    on conflict (movimiento_id, numero) do nothing;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_generar_plan_cuotas on public.movimientos;
create trigger trg_generar_plan_cuotas
  after insert on public.movimientos
  for each row execute function public.fn_generar_plan_cuotas();

-- ---------------------------------------------------------------------
-- 6. Row Level Security
--    Etapa actual: acceso de lectura/escritura para anon y authenticated mientras
--    se integra Supabase Auth. Al activar auth, reemplazar `to anon, authenticated`
--    por `to authenticated` (y filtrar por organización si corresponde).
-- ---------------------------------------------------------------------
alter table public.unidades    enable row level security;
alter table public.vehiculos   enable row level security;
alter table public.movimientos enable row level security;
alter table public.plan_cuotas enable row level security;

drop policy if exists unidades_select on public.unidades;
create policy unidades_select on public.unidades for select to anon, authenticated using (true);

drop policy if exists vehiculos_all on public.vehiculos;
create policy vehiculos_all on public.vehiculos for all to anon, authenticated using (true) with check (true);

drop policy if exists movimientos_all on public.movimientos;
create policy movimientos_all on public.movimientos for all to anon, authenticated using (true) with check (true);

drop policy if exists plan_cuotas_all on public.plan_cuotas;
create policy plan_cuotas_all on public.plan_cuotas for all to anon, authenticated using (true) with check (true);

-- ---------------------------------------------------------------------
-- 7. Realtime para la flota (alta de vehículos en vivo)
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'vehiculos'
  ) then
    alter publication supabase_realtime add table public.vehiculos;
  end if;
end $$;
