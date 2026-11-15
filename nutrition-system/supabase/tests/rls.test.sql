-- Pruebas de seguridad: cada bloque actúa como un usuario distinto (coach, otro coach, celular del atleta,
-- celular desconocido, visitante sin sesión) y verifica qué puede y qué no puede leer o escribir.
\set QUIET on
\o /dev/null
set client_min_messages = warning;

create schema test;
grant usage on schema test to anon, authenticated;

-- Actúa como un usuario: claims del JWT (sub, email, is_anonymous) en la sesión.
create function test.login(uid uuid, mail text default null, anon boolean default false) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'email', mail, 'role', 'authenticated', 'is_anonymous', anon)::text, false);
$$;
-- Espera que una sentencia falle (opcionalmente con un código de error dado).
create function test.fails(stmt text, code text default null) returns void
language plpgsql as $$
begin
  execute stmt;
  raise exception 'Se esperaba un error y no lo hubo: %', stmt;
exception when others then
  if sqlerrm like 'Se esperaba un error%' then raise; end if;
  if code is not null and sqlstate <> code then
    raise exception 'Error % (%) en vez de % en: %', sqlstate, sqlerrm, code, stmt;
  end if;
end;
$$;
-- Vinculación rechazada (link o PIN incorrecto).
create function test.rejected(slug text, tok text, pin text default null) returns void language plpgsql as $$
begin
  if (public.claim_athlete(slug, tok, pin) ->> 'ok')::boolean then
    raise exception 'Se esperaba rechazo de la vinculación (% / %)', tok, pin;
  end if;
end;
$$;
create function test.count(stmt text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute 'select count(*) from (' || stmt || ') q' into n;
  return n;
end;
$$;
grant execute on all functions in schema test to anon, authenticated;

-- Usuarios de Auth
insert into auth.users (id, email, is_anonymous) values
  ('00000000-0000-0000-0000-0000000000c1', 'coach@jp.com', false),
  ('00000000-0000-0000-0000-0000000000c2', 'socio@jp.com', false),
  ('00000000-0000-0000-0000-0000000000e3', 'intruso@mail.com', false),
  ('00000000-0000-0000-0000-0000000000d1', null, true),
  ('00000000-0000-0000-0000-0000000000d2', null, true),
  ('00000000-0000-0000-0000-0000000000d3', null, true);

-- ============ 1 · Alta de coaches ============
set role authenticated;
select test.login('00000000-0000-0000-0000-0000000000d1', null, true);
select test.fails($$select public.ensure_coach('anon')$$, '42501');           -- una sesión anónima no es coach

select test.login('00000000-0000-0000-0000-0000000000c1', 'coach@jp.com');
do $$ begin assert (public.ensure_coach('Juan Pablo')).id = auth.uid(), 'primer coach entra'; end $$;
insert into public.coach_allowlist (email, invited_by) values ('socio@jp.com', auth.uid());

select test.login('00000000-0000-0000-0000-0000000000e3', 'intruso@mail.com');
select test.fails($$select public.ensure_coach('x')$$, '42501');              -- email no habilitado
do $$ begin assert test.count('select * from public.coach_allowlist') = 0, 'un no-coach no ve la lista'; end $$;

select test.login('00000000-0000-0000-0000-0000000000c2', 'socio@jp.com');
do $$ begin assert (public.ensure_coach('Socio')).id = auth.uid(), 'coach invitado entra'; end $$;

-- ============ 2 · Atletas, borrador y publicación (coach 1) ============
select test.login('00000000-0000-0000-0000-0000000000c1', 'coach@jp.com');
insert into public.athletes (id, coach_id, slug, name, sex, goal) values
  ('00000000-0000-0000-0000-0000000000a1', auth.uid(), 'juan-pablo', 'Juan Pablo', 'M', 'cut');
select test.fails($$insert into public.athletes (coach_id, slug, name) values ('00000000-0000-0000-0000-0000000000c2', 'ajeno', 'X')$$, '42501');
select test.fails($$insert into public.athletes (coach_id, slug, name) values (auth.uid(), 'Mal Slug!', 'X')$$, '23514');
do $$ begin assert not public.slug_available('juan-pablo') and public.slug_available('otro'), 'slug_available'; end $$;

do $$
declare ts1 timestamptz; ts2 timestamptz; v int;
begin
  ts1 := public.save_draft('00000000-0000-0000-0000-0000000000a1', '{"meals":[]}', 'h1');
  ts2 := public.save_draft('00000000-0000-0000-0000-0000000000a1', '{"meals":[1]}', 'h2', ts1);
  assert ts2 > ts1, 'el borrador avanza';
  begin
    perform public.save_draft('00000000-0000-0000-0000-0000000000a1', '{"meals":[2]}', 'h3', ts1); -- base vieja
    raise exception 'debía avisar el conflicto';
  exception when serialization_failure then null; end;
  perform public.save_draft('00000000-0000-0000-0000-0000000000a1', '{"meals":[2]}', 'h3', ts1, true); -- forzar
  v := public.publish_plan('00000000-0000-0000-0000-0000000000a1', '{"meals":["v1"]}', 'h1', 'inicial');
  assert v = 1, 'versión 1';
  v := public.publish_plan('00000000-0000-0000-0000-0000000000a1', '{"meals":["v2"]}', 'h2');
  assert v = 2, 'versión 2';
  assert test.count('select * from public.published_plans where is_active') = 1, 'una sola versión activa';
end $$;

-- Link secreto y PIN
select public.rotate_athlete_token('00000000-0000-0000-0000-0000000000a1') as tok \gset
select public.set_athlete_pin('00000000-0000-0000-0000-0000000000a1', '4321');
select test.fails($$select public.set_athlete_pin('00000000-0000-0000-0000-0000000000a1', '12a4')$$, '22023');
do $$ begin assert (select pin_hash <> '4321' from public.athlete_access), 'el PIN se guarda cifrado'; end $$;

-- ============ 3 · Otro coach no ve nada del coach 1 ============
select test.login('00000000-0000-0000-0000-0000000000c2', 'socio@jp.com');
do $$
begin
  assert test.count('select * from public.athletes') = 0, 'coach 2 no ve atletas ajenos';
  assert test.count('select * from public.plan_drafts') = 0, 'ni borradores';
  assert test.count('select * from public.published_plans') = 0, 'ni planes';
  assert test.count('select * from public.athlete_access') = 0, 'ni links';
end $$;
select test.fails($$select public.publish_plan('00000000-0000-0000-0000-0000000000a1', '{}', 'x')$$, '42501');
select test.fails($$select public.rotate_athlete_token('00000000-0000-0000-0000-0000000000a1')$$, '42501');
select test.fails($$select public.save_draft('00000000-0000-0000-0000-0000000000a1', '{}', 'x')$$, '42501');
update public.athletes set name = 'hackeado' where id = '00000000-0000-0000-0000-0000000000a1';
delete from public.athletes where id = '00000000-0000-0000-0000-0000000000a1';

-- ============ 4 · Celular del atleta: vinculación ============
select test.login('00000000-0000-0000-0000-0000000000d1', null, true);
do $$ begin assert test.count('select * from public.published_plans') = 0, 'sin vincular no ve el plan'; end $$;
select test.rejected('juan-pablo', 'token-equivocado-1234567890');
select test.fails($$select public.claim_athlete('no-existe', 'x')$$, 'P0002');
select public.claim_athlete('juan-pablo', :'tok', null, 'iPhone de JP');
do $$
begin
  assert test.count('select * from public.athletes') = 1, 've su ficha';
  assert (select name from public.athletes) = 'Juan Pablo', 'el otro coach no pudo renombrarlo';
  assert test.count('select * from public.published_plans') = 1, 've sólo la versión activa';
  assert (select version from public.published_plans) = 2, 'la activa es la 2';
  assert test.count('select * from public.plan_drafts') = 0, 'no ve el borrador';
  assert test.count('select * from public.athlete_access') = 0, 'no ve el link ni el PIN';
end $$;
select test.fails($$select * from public.access_attempts$$, '42501');           -- ni los intentos de PIN
select test.fails($$update public.athlete_access set pin_hash = null$$, '42501');
select test.fails($$select public.ensure_coach('yo')$$, '42501');
select test.fails($$select public.publish_plan('00000000-0000-0000-0000-0000000000a1', '{}', 'x')$$, '42501');
select test.fails($$insert into public.published_plans (athlete_id, version, payload, is_active) values ('00000000-0000-0000-0000-0000000000a1', 9, '{}', false)$$, '42501');
select test.fails($$insert into public.athletes (coach_id, slug, name) values ('00000000-0000-0000-0000-0000000000c1', 'colado', 'X')$$, '42501');
update public.athletes set name = 'yo mismo' where id = '00000000-0000-0000-0000-0000000000a1';
do $$ begin assert (select name from public.athletes) = 'Juan Pablo', 'el atleta no edita su ficha'; end $$;

-- Registros diarios y de peso
insert into public.daily_logs (athlete_id, day, mode, checks, meals_done, meals_total, kcal, kcal_target, client_updated_at)
  values ('00000000-0000-0000-0000-0000000000a1', current_date, 'on', '{"m1":true}', 1, 4, 600, 2500, now());
-- "gana el último": una versión más vieja que llega tarde se ignora sin error
insert into public.daily_logs (athlete_id, day, meals_done, client_updated_at)
  values ('00000000-0000-0000-0000-0000000000a1', current_date, 0, now() - interval '1 hour')
  on conflict (athlete_id, day) do update set meals_done = excluded.meals_done, client_updated_at = excluded.client_updated_at;
do $$ begin assert (select meals_done from public.daily_logs) = 1, 'no la pisa una versión vieja'; end $$;
insert into public.daily_logs (athlete_id, day, meals_done, client_updated_at)
  values ('00000000-0000-0000-0000-0000000000a1', current_date, 2, now() + interval '1 second')
  on conflict (athlete_id, day) do update set meals_done = excluded.meals_done, client_updated_at = excluded.client_updated_at;
do $$ begin assert (select meals_done from public.daily_logs) = 2, 'una versión nueva sí la actualiza'; end $$;
select test.fails($$insert into public.daily_logs (athlete_id, day) values ('00000000-0000-0000-0000-0000000000a1', current_date + 10)$$, '22008');
select test.fails($$insert into public.daily_logs (athlete_id, day, extras) values ('00000000-0000-0000-0000-0000000000a1', current_date - 1, jsonb_build_object('x', repeat('a', 70000)))$$, '54000');
insert into public.weight_logs (athlete_id, day, kg, source) values ('00000000-0000-0000-0000-0000000000a1', current_date, 80.4, 'coach');
do $$ begin assert (select source from public.weight_logs) = 'pwa', 'el atleta no puede firmar como coach'; end $$;
select test.fails($$insert into public.weight_logs (athlete_id, day, kg) values ('00000000-0000-0000-0000-0000000000a1', current_date - 1, 12)$$, '23514');

-- ============ 5 · Celular desconocido y PIN ============
select test.login('00000000-0000-0000-0000-0000000000d2', null, true);
do $$
begin
  assert test.count('select * from public.athletes') = 0, 'un desconocido no ve atletas';
  assert test.count('select * from public.daily_logs') = 0, 'ni registros';
  assert test.count('select * from public.weight_logs') = 0, 'ni pesos';
end $$;
select test.fails($$insert into public.daily_logs (athlete_id, day) values ('00000000-0000-0000-0000-0000000000a1', current_date - 2)$$, '42501');
select test.rejected('juan-pablo', null, '0000');
select test.rejected('juan-pablo', null, '1111');
select public.claim_athlete('juan-pablo', null, '4321', 'Android');     -- PIN correcto
do $$ begin assert test.count('select * from public.daily_logs') = 1, 'con PIN ve sus registros'; end $$;

select test.login('00000000-0000-0000-0000-0000000000d3', null, true);
select test.rejected('juan-pablo', null, '0001');
select test.rejected('juan-pablo', null, '0002');
select test.rejected('juan-pablo', null, '0003');  -- 5 fallos en 15 min
select test.fails($$select public.claim_athlete('juan-pablo', null, '4321')$$, '54000'); -- bloqueado aunque acierte
select public.claim_athlete('juan-pablo', :'tok');                     -- el link con token sigue funcionando

-- ============ 6 · El coach ve los registros y revoca celulares ============
select test.login('00000000-0000-0000-0000-0000000000c1', 'coach@jp.com');
do $$
begin
  assert test.count('select * from public.daily_logs') = 1, 'el coach ve el registro diario';
  assert test.count('select * from public.weight_logs') = 1, 'y el peso';
  assert test.count('select * from public.athlete_devices') = 3, 'y los 3 celulares vinculados';
end $$;
select test.fails($$insert into public.daily_logs (athlete_id, day) values ('00000000-0000-0000-0000-0000000000a1', current_date - 3)$$, '42501');
insert into public.weight_logs (athlete_id, day, kg, source) values ('00000000-0000-0000-0000-0000000000a1', current_date - 7, 81.2, 'coach');
select public.revoke_athlete_devices('00000000-0000-0000-0000-0000000000a1', true) as tok2 \gset
select public.activate_plan_version('00000000-0000-0000-0000-0000000000a1', 1);

select test.login('00000000-0000-0000-0000-0000000000d1', null, true);
do $$ begin assert test.count('select * from public.published_plans') = 0, 'revocado: deja de ver el plan'; end $$;
select test.rejected('juan-pablo', :'tok');                              -- link viejo invalidado
select public.claim_athlete('juan-pablo', :'tok2');
do $$ begin assert (select version from public.published_plans) = 1, 'link nuevo: ve la versión reactivada'; end $$;

-- ============ 7 · Visitante sin sesión (clave pública sola) ============
reset role;
set role anon;
select set_config('request.jwt.claims', '', false);
select test.fails($$select * from public.athletes$$, '42501');
select test.fails($$select * from public.published_plans$$, '42501');
select test.fails($$select public.claim_athlete('juan-pablo', 'x')$$, '42501');
reset role;

-- ============ 8 · Atleta archivado ============
select test.login('00000000-0000-0000-0000-0000000000c1', 'coach@jp.com');
set role authenticated;
update public.athletes set archived_at = now() where id = '00000000-0000-0000-0000-0000000000a1';
select test.login('00000000-0000-0000-0000-0000000000d1', null, true);
do $$ begin assert test.count('select * from public.published_plans') = 0, 'archivado: el atleta deja de ver el plan'; end $$;
reset role;

\echo '✓ 8 bloques de seguridad: alta de coaches, aislamiento entre coaches, vinculación por link y PIN, freno de intentos, registros, revocación, sin sesión y archivados'
