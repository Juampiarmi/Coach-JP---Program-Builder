-- Las plantillas usan el id local del Builder (texto corto, no UUID): la columna pasa a texto.
alter table public.coach_templates alter column id type text using id::text;
alter table public.coach_templates add constraint coach_templates_id_len check (length(id) between 1 and 64);
