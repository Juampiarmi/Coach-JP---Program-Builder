-- Coach JP · Check-in semanal del atleta y plantillas propias del coach.
-- Aditiva: no toca las tablas existentes.

-- ---------------------------------------------------------------------------------------------------------
-- Check-in semanal (30 segundos): energía, hambre, digestión, peso y foto opcional.
-- Uno por atleta y semana (week = lunes de la semana, fecha local del atleta).
-- ---------------------------------------------------------------------------------------------------------
create table public.checkins (
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  week date not null,
  energy smallint not null check (energy between 1 and 5),
  hunger smallint not null check (hunger between 1 and 5),
  heavy boolean not null default false,
  note text not null default '' check (length(note) <= 280),
  kg numeric(5, 2) check (kg between 30 and 250),
  -- Foto chica (JPEG comprimido en el celular, data URL). Opcional.
  photo text check (photo is null or (photo like 'data:image/%' and length(photo) <= 300000)),
  client_updated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (athlete_id, week)
);
create index checkins_week_idx on public.checkins (week desc);

create or replace function public.tg_checkin_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  tz text;
  local_today date;
begin
  select timezone into tz from public.athletes where id = new.athlete_id;
  local_today := (now() at time zone coalesce(tz, 'America/Argentina/Buenos_Aires'))::date;
  if new.week > local_today + 1 or new.week < date '2024-01-01' or extract(isodow from new.week) <> 1 then
    raise exception 'Semana inválida: %', new.week using errcode = '22008';
  end if;
  if tg_op = 'UPDATE' and new.client_updated_at < old.client_updated_at then
    return null; -- versión más vieja de otro celular: se ignora
  end if;
  new.updated_at := now();
  update public.athlete_devices set last_seen = now()
    where athlete_id = new.athlete_id and user_id = auth.uid();
  return new;
end;
$$;
create trigger checkins_guard before insert or update on public.checkins
  for each row execute function public.tg_checkin_guard();

alter table public.checkins enable row level security;
-- El coach lee los check-ins de sus atletas; el atleta lee y escribe los suyos.
create policy checkins_coach_select on public.checkins for select using (public.is_coach_of(athlete_id));
create policy checkins_device_select on public.checkins for select using (public.is_device_of(athlete_id));
create policy checkins_device_insert on public.checkins for insert with check (public.is_device_of(athlete_id));
create policy checkins_device_update on public.checkins for update
  using (public.is_device_of(athlete_id)) with check (public.is_device_of(athlete_id));

-- ---------------------------------------------------------------------------------------------------------
-- Plantillas propias del coach (planes guardados para reutilizar con otros atletas).
-- ---------------------------------------------------------------------------------------------------------
create table public.coach_templates (
  id uuid primary key,
  coach_id uuid not null default auth.uid() references public.coaches (id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  data jsonb not null check (octet_length(data::text) <= 524288),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index coach_templates_coach_idx on public.coach_templates (coach_id, created_at desc);
create trigger coach_templates_touch before update on public.coach_templates
  for each row execute function public.tg_touch_updated_at();

alter table public.coach_templates enable row level security;
create policy templates_coach_all on public.coach_templates for all
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- Sin acceso para la clave pública sin sesión; los atletas (sesión anónima) nunca ven plantillas.
revoke all on public.checkins, public.coach_templates from anon;
grant select, insert, update on public.checkins to authenticated;
grant select, insert, update, delete on public.coach_templates to authenticated;
revoke execute on function public.tg_checkin_guard() from public, anon;
