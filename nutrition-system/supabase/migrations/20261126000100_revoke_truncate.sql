-- Endurecimiento: TRUNCATE no pasa por RLS. Los roles del cliente (anon / authenticated) sólo necesitan
-- select / insert / update / delete (filtrados por las políticas); se les quitan TRUNCATE, REFERENCES y TRIGGER
-- que Supabase otorga por defecto a toda tabla nueva del esquema public.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke truncate, references, trigger on public.%I from anon, authenticated', t.tablename);
  end loop;
end $$;
