-- Coach JP Nutrition · B1: base en la nube para el Builder y la app del atleta.
-- Correr una sola vez en el SQL Editor de Supabase (o con `supabase db push`).
--
-- Quién ve qué:
--   · Coach: usuario de Supabase Auth (email + contraseña o link mágico) con fila en `coaches`.
--     Lee y escribe todo lo de SUS atletas, y nada de los demás.
--   · Atleta: sin cuenta. Su celular abre una sesión anónima y se vincula con el link (#k=token) o con su PIN
--     mediante claim_athlete(). Desde ahí lee SU plan activo y escribe SUS registros diarios y de peso.
--   · Nadie (salvo las funciones de este archivo) lee el PIN, ni el atleta ve borradores u otros atletas.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------------------------------------

create table public.coaches (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  name text not null default '',
  handle text not null default '',
  created_at timestamptz not null default now()
);

-- Emails habilitados para crear su cuenta de coach (equipo). El primer coach del proyecto entra sin estar acá.
create table public.coach_allowlist (
  email text primary key check (email = lower(email)),
  invited_by uuid references public.coaches (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.athletes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches (id) on delete cascade,
  -- Link fijo: …/nutrition/plan/<slug>
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 2 and 60),
  name text not null check (length(name) between 1 and 120),
  sex text check (sex in ('M', 'F')),
  base_weight_kg numeric(5, 2) check (base_weight_kg between 30 and 250),
  goal text check (goal in ('cut', 'recomp', 'maintain', 'bulk')),
  phase text not null default '',
  discipline text not null default '',
  training_weekdays smallint[] not null default '{}',
  timezone text not null default 'America/Argentina/Buenos_Aires',
  pin_enabled boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index athletes_coach_idx on public.athletes (coach_id);

-- Borrador del Builder (el AthletePlan completo). Sólo el coach.
create table public.plan_drafts (
  athlete_id uuid primary key references public.athletes (id) on delete cascade,
  plan jsonb not null,
  hash text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

-- Versiones publicadas: `payload` es el mismo objeto que antes se embebía en el index.html exportado.
create table public.published_plans (
  id bigint generated always as identity primary key,
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  version integer not null check (version > 0),
  payload jsonb not null,
  hash text not null default '',
  note text not null default '',
  published_at timestamptz not null default now(),
  published_by uuid references auth.users (id) on delete set null,
  is_active boolean not null default false,
  unique (athlete_id, version)
);
create unique index published_plans_one_active on public.published_plans (athlete_id) where is_active;

-- Secretos de acceso. Sin policies para el atleta: sólo las funciones security definer los leen.
create table public.athlete_access (
  athlete_id uuid primary key references public.athletes (id) on delete cascade,
  token text not null,
  pin_hash text,
  rotated_at timestamptz not null default now()
);

-- Celulares vinculados (sesiones anónimas de Supabase Auth).
create table public.athlete_devices (
  user_id uuid not null references auth.users (id) on delete cascade,
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  label text not null default '',
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (user_id, athlete_id)
);
create index athlete_devices_athlete_idx on public.athlete_devices (athlete_id);

-- Intentos de PIN (freno a la fuerza bruta).
create table public.access_attempts (
  id bigint generated always as identity primary key,
  slug text not null,
  user_id uuid,
  ok boolean not null,
  at timestamptz not null default now()
);
create index access_attempts_slug_idx on public.access_attempts (slug, at desc);

-- Un registro por atleta y día (fecha local del atleta).
create table public.daily_logs (
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  day date not null,
  mode text not null default 'on' check (mode in ('on', 'off')),
  plan_version integer,
  -- Estado crudo (para restaurar el día en otro celular).
  checks jsonb not null default '{}',
  opts jsonb not null default '{}',
  swaps jsonb not null default '{}',
  social jsonb not null default '{}',
  extras jsonb not null default '{}',
  rebal jsonb not null default '{}',
  water_ml integer not null default 0 check (water_ml between 0 and 10000),
  water_target_ml integer check (water_target_ml between 0 and 10000),
  -- Resumen calculado en la app (lo usa el panel del coach).
  meals_done smallint not null default 0 check (meals_done >= 0),
  meals_total smallint not null default 0 check (meals_total >= 0),
  missed text[] not null default '{}',
  kcal integer not null default 0,
  kcal_target integer not null default 0,
  p numeric(6, 1) not null default 0,
  c numeric(6, 1) not null default 0,
  f numeric(6, 1) not null default 0,
  p_target numeric(6, 1) not null default 0,
  adherent boolean not null default false,
  client_updated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (athlete_id, day)
);
create index daily_logs_day_idx on public.daily_logs (day desc);

create table public.weight_logs (
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  day date not null,
  kg numeric(5, 2) not null check (kg between 30 and 250),
  fasted boolean not null default true,
  note text not null default '' check (length(note) <= 280),
  source text not null default 'pwa' check (source in ('pwa', 'coach')),
  client_updated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (athlete_id, day)
);

-- Alertas del panel vistas / pospuestas por el coach.
create table public.alert_acks (
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  alert_key text not null,
  until timestamptz not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (athlete_id, alert_key)
);

-- ---------------------------------------------------------------------------------------------------------
-- Funciones auxiliares de permisos (stable security definer: sin policies recursivas)
-- ---------------------------------------------------------------------------------------------------------

create or replace function public.is_coach_of(a uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.athletes where id = a and coach_id = auth.uid());
$$;

create or replace function public.is_device_of(a uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.athlete_devices d
    join public.athletes t on t.id = d.athlete_id
    where d.athlete_id = a and d.user_id = auth.uid() and d.revoked_at is null and t.archived_at is null
  );
$$;

create or replace function public.is_anonymous_session() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;

-- ---------------------------------------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------------------------------------

create or replace function public.tg_touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger athletes_touch before update on public.athletes
  for each row execute function public.tg_touch_updated_at();

-- Registros del atleta: fecha razonable, tamaño acotado, "gana el último" por client_updated_at
-- y actualización de last_seen del celular.
create or replace function public.tg_log_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  tz text;
  local_today date;
begin
  select timezone into tz from public.athletes where id = new.athlete_id;
  local_today := (now() at time zone coalesce(tz, 'America/Argentina/Buenos_Aires'))::date;
  if new.day > local_today + 1 or new.day < date '2024-01-01' then
    raise exception 'Fecha fuera de rango: %', new.day using errcode = '22008';
  end if;
  if tg_op = 'UPDATE' and new.client_updated_at < old.client_updated_at then
    return null; -- llegó una versión más vieja (otro celular desconectado): se ignora sin error
  end if;
  if tg_table_name = 'daily_logs' then
    if octet_length(new.checks::text) + octet_length(new.opts::text) + octet_length(new.swaps::text)
       + octet_length(new.social::text) + octet_length(new.extras::text) + octet_length(new.rebal::text) > 65536 then
      raise exception 'Registro diario demasiado grande' using errcode = '54000';
    end if;
  else
    if not public.is_coach_of(new.athlete_id) then
      new.source := 'pwa';
    end if;
  end if;
  new.updated_at := now();
  update public.athlete_devices set last_seen = now()
    where athlete_id = new.athlete_id and user_id = auth.uid();
  return new;
end;
$$;

create trigger daily_logs_guard before insert or update on public.daily_logs
  for each row execute function public.tg_log_guard();
create trigger weight_logs_guard before insert or update on public.weight_logs
  for each row execute function public.tg_log_guard();

-- ---------------------------------------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------------------------------------

alter table public.coaches enable row level security;
alter table public.coach_allowlist enable row level security;
alter table public.athletes enable row level security;
alter table public.plan_drafts enable row level security;
alter table public.published_plans enable row level security;
alter table public.athlete_access enable row level security;
alter table public.athlete_devices enable row level security;
alter table public.access_attempts enable row level security;
alter table public.daily_logs enable row level security;
alter table public.weight_logs enable row level security;
alter table public.alert_acks enable row level security;

-- coaches: cada uno su fila (el alta pasa por ensure_coach()).
create policy coaches_self_select on public.coaches for select using (id = auth.uid());
create policy coaches_self_update on public.coaches for update using (id = auth.uid()) with check (id = auth.uid());

-- coach_allowlist: cualquier coach del proyecto la ve y la administra (equipo).
create policy allowlist_coaches on public.coach_allowlist for all
  using (exists (select 1 from public.coaches where id = auth.uid()))
  with check (exists (select 1 from public.coaches where id = auth.uid()));

-- athletes
create policy athletes_coach_all on public.athletes for all
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());
create policy athletes_device_select on public.athletes for select
  using (public.is_device_of(id));

-- plan_drafts: sólo el coach
create policy drafts_coach_all on public.plan_drafts for all
  using (public.is_coach_of(athlete_id)) with check (public.is_coach_of(athlete_id));

-- published_plans: coach todo; el atleta sólo la versión activa
create policy plans_coach_all on public.published_plans for all
  using (public.is_coach_of(athlete_id)) with check (public.is_coach_of(athlete_id));
create policy plans_device_active on public.published_plans for select
  using (is_active and public.is_device_of(athlete_id));

-- athlete_access: el coach lee el link para reenviarlo; los cambios van por funciones
create policy access_coach_select on public.athlete_access for select
  using (public.is_coach_of(athlete_id));

-- athlete_devices: el coach los ve y los revoca; el celular ve su propia vinculación
create policy devices_coach_select on public.athlete_devices for select using (public.is_coach_of(athlete_id));
create policy devices_coach_update on public.athlete_devices for update
  using (public.is_coach_of(athlete_id)) with check (public.is_coach_of(athlete_id));
create policy devices_coach_delete on public.athlete_devices for delete using (public.is_coach_of(athlete_id));
create policy devices_self_select on public.athlete_devices for select using (user_id = auth.uid());

-- access_attempts: sin policies (sólo claim_athlete)

-- daily_logs: el coach lee; el atleta lee y escribe los suyos
create policy daily_coach_select on public.daily_logs for select using (public.is_coach_of(athlete_id));
create policy daily_device_select on public.daily_logs for select using (public.is_device_of(athlete_id));
create policy daily_device_insert on public.daily_logs for insert with check (public.is_device_of(athlete_id));
create policy daily_device_update on public.daily_logs for update
  using (public.is_device_of(athlete_id)) with check (public.is_device_of(athlete_id));

-- weight_logs: el coach todo (puede cargar un peso de consulta); el atleta los suyos
create policy weight_coach_all on public.weight_logs for all
  using (public.is_coach_of(athlete_id)) with check (public.is_coach_of(athlete_id));
create policy weight_device_select on public.weight_logs for select using (public.is_device_of(athlete_id));
create policy weight_device_insert on public.weight_logs for insert with check (public.is_device_of(athlete_id));
create policy weight_device_update on public.weight_logs for update
  using (public.is_device_of(athlete_id)) with check (public.is_device_of(athlete_id));
create policy weight_device_delete on public.weight_logs for delete using (public.is_device_of(athlete_id));

-- alert_acks: sólo el coach
create policy acks_coach_all on public.alert_acks for all
  using (public.is_coach_of(athlete_id)) with check (public.is_coach_of(athlete_id));

-- La clave pública sin sesión (rol anon) no toca ninguna tabla: hasta el atleta usa una sesión anónima.
revoke all on all tables in schema public from anon;
revoke all on public.athlete_access, public.access_attempts from authenticated;
grant select on public.athlete_access to authenticated;

-- ---------------------------------------------------------------------------------------------------------
-- Funciones de negocio (RPC)
-- ---------------------------------------------------------------------------------------------------------

-- Alta del coach después de iniciar sesión. Sólo emails habilitados (o el primer coach del proyecto).
create or replace function public.ensure_coach(p_name text default '') returns public.coaches
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  mail text := lower(coalesce(auth.jwt() ->> 'email', ''));
  row public.coaches;
begin
  if uid is null or public.is_anonymous_session() then
    raise exception 'Necesitás iniciar sesión como coach' using errcode = '42501';
  end if;
  select * into row from public.coaches where id = uid;
  if found then return row; end if;
  if exists (select 1 from public.coaches) and not exists (select 1 from public.coach_allowlist where email = mail) then
    raise exception 'Este email no está habilitado como coach' using errcode = '42501';
  end if;
  insert into public.coaches (id, email, name) values (uid, mail, coalesce(p_name, '')) returning * into row;
  return row;
end;
$$;

-- ¿Está libre este link? (los slugs son globales porque la URL es pública)
create or replace function public.slug_available(p_slug text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.athletes where slug = lower(p_slug));
$$;

-- Genera (o regenera) el link secreto del atleta. Devuelve el token para armar …/plan/<slug>#k=<token>.
create or replace function public.rotate_athlete_token(p_athlete uuid) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  tok text := translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/=', '-_');
begin
  if not public.is_coach_of(p_athlete) then
    raise exception 'Sin permiso sobre este atleta' using errcode = '42501';
  end if;
  insert into public.athlete_access (athlete_id, token) values (p_athlete, tok)
    on conflict (athlete_id) do update set token = excluded.token, rotated_at = now();
  return tok;
end;
$$;

-- PIN opcional de 4 dígitos (null = desactivar).
create or replace function public.set_athlete_pin(p_athlete uuid, p_pin text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_coach_of(p_athlete) then
    raise exception 'Sin permiso sobre este atleta' using errcode = '42501';
  end if;
  if p_pin is not null and p_pin !~ '^[0-9]{4}$' then
    raise exception 'El PIN tiene que ser de 4 números' using errcode = '22023';
  end if;
  if not exists (select 1 from public.athlete_access where athlete_id = p_athlete) then
    perform public.rotate_athlete_token(p_athlete);
  end if;
  update public.athlete_access
    set pin_hash = case when p_pin is null then null else extensions.crypt(p_pin, extensions.gen_salt('bf', 8)) end
    where athlete_id = p_athlete;
  update public.athletes set pin_enabled = p_pin is not null where id = p_athlete;
end;
$$;

-- Vincula el celular (sesión anónima) al atleta con el token del link o con el PIN.
-- Devuelve {ok:true, athlete_id, name, slug} o {ok:false, error:'bad_credentials'}; 'locked' y link inexistente son errores.
create or replace function public.claim_athlete(p_slug text, p_token text default null, p_pin text default null, p_label text default '')
returns json
language plpgsql security definer set search_path = public, extensions as $$
declare
  uid uuid := auth.uid();
  a public.athletes;
  acc public.athlete_access;
  fails int;
  ok boolean := false;
begin
  if uid is null then
    raise exception 'Sin sesión' using errcode = '42501';
  end if;
  select * into a from public.athletes where slug = lower(p_slug) and archived_at is null;
  if not found then
    raise exception 'Link inválido' using errcode = 'P0002';
  end if;
  select * into acc from public.athlete_access where athlete_id = a.id;
  if not found then
    raise exception 'Link inválido' using errcode = 'P0002';
  end if;

  if p_token is not null and length(p_token) >= 16 then
    ok := p_token = acc.token;
  elsif p_pin is not null then
    select count(*) into fails from public.access_attempts
      where slug = a.slug and not access_attempts.ok and at > now() - interval '15 minutes';
    if fails >= 5 then
      raise exception 'Demasiados intentos. Esperá 15 minutos.' using errcode = '54000';
    end if;
    ok := acc.pin_hash is not null and acc.pin_hash = extensions.crypt(p_pin, acc.pin_hash);
    insert into public.access_attempts (slug, user_id, ok) values (a.slug, uid, ok);
  end if;

  if not ok then
    -- Sin raise: así el intento fallido queda registrado (un error desharía el insert y nunca bloquearía).
    return json_build_object('ok', false, 'error', 'bad_credentials');
  end if;

  insert into public.athlete_devices (user_id, athlete_id, label)
    values (uid, a.id, left(coalesce(p_label, ''), 80))
    on conflict (user_id, athlete_id) do update set revoked_at = null, last_seen = now(), label = excluded.label;
  return json_build_object('ok', true, 'athlete_id', a.id, 'name', a.name, 'slug', a.slug);
end;
$$;

-- Publica una versión nueva y la deja activa (atómico). Devuelve el número de versión.
create or replace function public.publish_plan(p_athlete uuid, p_payload jsonb, p_hash text, p_note text default '')
returns integer
language plpgsql security invoker set search_path = public as $$
declare
  v int;
begin
  if not public.is_coach_of(p_athlete) then
    raise exception 'Sin permiso sobre este atleta' using errcode = '42501';
  end if;
  perform 1 from public.athletes where id = p_athlete for update; -- serializa publicaciones simultáneas
  select coalesce(max(version), 0) + 1 into v from public.published_plans where athlete_id = p_athlete;
  update public.published_plans set is_active = false where athlete_id = p_athlete and is_active;
  insert into public.published_plans (athlete_id, version, payload, hash, note, published_by, is_active)
    values (p_athlete, v, p_payload, coalesce(p_hash, ''), coalesce(p_note, ''), auth.uid(), true);
  return v;
end;
$$;

-- Vuelve a dejar activa una versión anterior.
create or replace function public.activate_plan_version(p_athlete uuid, p_version integer) returns void
language plpgsql security invoker set search_path = public as $$
begin
  if not exists (select 1 from public.published_plans where athlete_id = p_athlete and version = p_version) then
    raise exception 'No existe esa versión' using errcode = 'P0002';
  end if;
  update public.published_plans set is_active = false where athlete_id = p_athlete and is_active;
  update public.published_plans set is_active = true where athlete_id = p_athlete and version = p_version;
end;
$$;

-- Guarda el borrador con control de conflicto entre dispositivos del coach.
-- p_base = updated_at que el dispositivo tenía; si en la nube hay uno más nuevo, avisa en vez de pisarlo.
create or replace function public.save_draft(p_athlete uuid, p_plan jsonb, p_hash text, p_base timestamptz default null, p_force boolean default false)
returns timestamptz
language plpgsql security invoker set search_path = public as $$
declare
  cur timestamptz;
  ts timestamptz := clock_timestamp();
begin
  if not public.is_coach_of(p_athlete) then
    raise exception 'Sin permiso sobre este atleta' using errcode = '42501';
  end if;
  select updated_at into cur from public.plan_drafts where athlete_id = p_athlete for update;
  if found and not p_force and p_base is not null and cur > p_base then
    raise exception 'draft_conflict' using errcode = '40001', detail = cur::text;
  end if;
  insert into public.plan_drafts (athlete_id, plan, hash, updated_at, updated_by)
    values (p_athlete, p_plan, coalesce(p_hash, ''), ts, auth.uid())
    on conflict (athlete_id) do update set plan = excluded.plan, hash = excluded.hash, updated_at = ts, updated_by = excluded.updated_by;
  return ts;
end;
$$;

-- Cierra la sesión del atleta en todos sus celulares (y, si se pide, invalida el link viejo).
create or replace function public.revoke_athlete_devices(p_athlete uuid, p_rotate boolean default true) returns text
language plpgsql security definer set search_path = public as $$
declare
  tok text;
begin
  if not public.is_coach_of(p_athlete) then
    raise exception 'Sin permiso sobre este atleta' using errcode = '42501';
  end if;
  update public.athlete_devices set revoked_at = now() where athlete_id = p_athlete and revoked_at is null;
  if p_rotate then
    tok := public.rotate_athlete_token(p_athlete);
  end if;
  return tok;
end;
$$;

-- Permisos de ejecución: nada para el rol anon; cada función, sólo a sesiones iniciadas.
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.is_coach_of(uuid), public.is_device_of(uuid), public.is_anonymous_session(),
  public.ensure_coach(text), public.slug_available(text), public.rotate_athlete_token(uuid),
  public.set_athlete_pin(uuid, text), public.claim_athlete(text, text, text, text),
  public.publish_plan(uuid, jsonb, text, text), public.activate_plan_version(uuid, integer),
  public.save_draft(uuid, jsonb, text, timestamptz, boolean), public.revoke_athlete_devices(uuid, boolean)
  to authenticated;
