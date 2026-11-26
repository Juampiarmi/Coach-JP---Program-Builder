-- Banco Global del coach: platos y alimentos propios (carga rápida con IA, recetas editadas, marcas) sincronizados
-- entre los dispositivos del coach. Cada fila es un ítem de la Food & Brand DB (JSON validado en el cliente).
create table public.coach_foods (
  coach_id uuid not null default auth.uid() references public.coaches (id) on delete cascade,
  id text not null check (length(id) between 1 and 80),
  data jsonb not null check (octet_length(data::text) <= 65536),
  deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (coach_id, id)
);
create index coach_foods_updated_idx on public.coach_foods (coach_id, updated_at desc);
create trigger coach_foods_touch before update on public.coach_foods
  for each row execute function public.tg_touch_updated_at();

alter table public.coach_foods enable row level security;
create policy coach_foods_own on public.coach_foods for all
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- Ni la clave pública sin sesión ni los atletas (sesión anónima, sin fila en coaches) leen el banco del coach.
revoke all on public.coach_foods from anon;
grant select, insert, update, delete on public.coach_foods to authenticated;
