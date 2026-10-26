-- 0003: la oficina nace armada (arreglo A de replica/fixes.md).
-- Bienvenida, Tareas del equipo (tablero), Reuniones semanales y Manual, en vez de una página en blanco.

create or replace function _t(txt text) returns jsonb language sql immutable as $$
  select jsonb_build_object('type','text','text',txt,'styles','{}'::jsonb)
$$;
create or replace function _block(kind text, txt text, props jsonb default '{}'::jsonb) returns jsonb language sql immutable as $$
  select jsonb_build_object('type', kind, 'props', props,
    'content', case when txt = '' then '[]'::jsonb else jsonb_build_array(_t(txt)) end)
$$;
create or replace function _link(txt text, pid uuid) returns jsonb language sql immutable as $$
  select jsonb_build_object('type','paragraph','content', jsonb_build_array(
    jsonb_build_object('type','link','href','/w/p/' || pid,'content', jsonb_build_array(_t(txt)))))
$$;

create or replace function seed_tasks_database(p_ws uuid, p_parent uuid, p_name text, p_uid uuid, p_first_view text default 'table')
returns table (page_id uuid, database_id uuid, status_id uuid, first_status text)
language plpgsql security definer set search_path = public as $$
declare pg uuid; d uuid; st uuid; dt uuid; s1 text := gen_random_uuid()::text;
begin
  insert into pages (workspace_id, parent_id, title, icon, owner_id, created_by, position)
  values (p_ws, p_parent, p_name, '✅', p_uid, p_uid,
          (select coalesce(max(position), 0) + 1 from pages where workspace_id = p_ws and parent_id is not distinct from p_parent))
  returning id into pg;
  insert into databases (page_id, name) values (pg, p_name) returning id into d;
  insert into db_properties (database_id, name, type, position, options) values
    (d, 'Estado', 'status', 1, jsonb_build_array(
      jsonb_build_object('id', s1, 'label', 'Por hacer', 'color', 'gray'),
      jsonb_build_object('id', gen_random_uuid(), 'label', 'En curso', 'color', 'blue'),
      jsonb_build_object('id', gen_random_uuid(), 'label', 'Listo', 'color', 'green')))
    returning id into st;
  insert into db_properties (database_id, name, type, position) values (d, 'Responsable', 'person', 2);
  insert into db_properties (database_id, name, type, position) values (d, 'Fecha', 'date', 3) returning id into dt;
  insert into db_views (database_id, name, type, config, position) values
    (d, 'Tabla', 'table', '{}', case when p_first_view = 'table' then 0 else 2 end),
    (d, 'Tablero', 'board', jsonb_build_object('groupBy', st), case when p_first_view = 'board' then 0 else 2 end),
    (d, 'Calendario', 'calendar', jsonb_build_object('dateProperty', dt), 3);
  return query select pg, d, st, s1;
end $$;

create or replace function seed_office_template(p_ws uuid, p_uid uuid, p_general uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t record; reu uuid; man uuid; wel uuid; rowpg uuid;
begin
  select * into t from seed_tasks_database(p_ws, null, 'Tareas del equipo', p_uid, 'board');
  update pages set position = 2 where id = t.page_id;

  insert into pages (workspace_id, title, icon, owner_id, created_by, position, content) values (p_ws, 'Reuniones semanales', '🗓️', p_uid, p_uid, 3,
    jsonb_build_array(
      _block('paragraph', 'Copia este bloque para cada reunión. Escribe @ para nombrar a alguien y avisarle.'),
      _block('heading', 'Lunes (fecha)', '{"level":2}'),
      _block('heading', 'Asistentes', '{"level":3}'), _block('bulletListItem', ''),
      _block('heading', 'Temas', '{"level":3}'), _block('bulletListItem', ''),
      _block('heading', 'Acuerdos', '{"level":3}'), _block('checkListItem', '', '{"checked":false}'),
      _block('heading', 'Próximos pasos', '{"level":3}'),
      _block('paragraph', 'Convierte cada acuerdo en una tarea: escribe en el chat y usa «Convertir en tarea».')))
  returning id into reu;

  insert into pages (workspace_id, title, icon, owner_id, created_by, position, content) values (p_ws, 'Manual de la oficina', '📘', p_uid, p_uid, 4,
    jsonb_build_array(
      _block('paragraph', 'Lo que todos deben saber, en un solo lugar.'),
      _block('heading', 'Horario', '{"level":2}'), _block('paragraph', ''),
      _block('heading', 'Cómo nos comunicamos', '{"level":2}'),
      _block('bulletListItem', 'Avisos para todos: canal #general.'),
      _block('bulletListItem', 'Temas de un documento: botón Conversar dentro de la página.'),
      _block('bulletListItem', 'Pedidos con fecha: una tarea en Tareas del equipo.'),
      _block('heading', 'Vacaciones y permisos', '{"level":2}'), _block('paragraph', ''),
      _block('heading', 'Contactos útiles', '{"level":2}'), _block('paragraph', '')))
  returning id into man;

  insert into pages (workspace_id, title, icon, owner_id, created_by, position, content) values (p_ws, 'Bienvenida', '👋', p_uid, p_uid, 1,
    jsonb_build_array(
      _block('paragraph', 'Este es el lugar de la oficina para escribir, organizar el trabajo y conversar.'),
      _block('heading', 'Primeros pasos', '{"level":2}'),
      _block('checkListItem', 'Invita a tu equipo desde Ajustes', '{"checked":false}'),
      _block('checkListItem', 'Saluda en #general', '{"checked":false}'),
      _block('checkListItem', 'Crea la primera tarea y asígnala a alguien', '{"checked":false}'),
      _block('checkListItem', 'Completa el horario en el Manual de la oficina', '{"checked":false}'),
      _block('heading', 'Lo que ya está listo', '{"level":2}'),
      _link('✅ Tareas del equipo', t.page_id), _link('🗓️ Reuniones semanales', reu), _link('📘 Manual de la oficina', man),
      _block('heading', 'Atajos', '{"level":2}'),
      _block('bulletListItem', 'Escribe / para agregar títulos, listas o una tabla de tareas.'),
      _block('bulletListItem', 'Escribe @ para nombrar a alguien: le llega un aviso.'),
      _block('bulletListItem', 'Ctrl + K para buscar cualquier cosa.')))
  returning id into wel;

  insert into pages (workspace_id, parent_id, title, owner_id, created_by, is_database_row, position)
  values (p_ws, t.page_id, 'Revisar la página de Bienvenida', p_uid, p_uid, true, 0) returning id into rowpg;
  insert into db_rows (database_id, page_id, values, position) values (t.database_id, rowpg, jsonb_build_object(t.status_id::text, t.first_status), 0);
  insert into favorites (user_id, page_id, position) values (p_uid, t.page_id, 1);
  insert into messages (channel_id, author_id, body) values (p_general, null,
    jsonb_build_array(jsonb_build_object('t','text','v','Todo listo. Empieza por '), jsonb_build_object('t','page','id', wel)));
end $$;

create or replace function create_workspace(p_name text, p_owner_name text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); ws uuid; ch uuid; who text;
begin
  if uid is null then raise exception 'forbidden' using errcode = 'P0001'; end if;
  if exists (select 1 from members where user_id = uid) then raise exception 'already_member' using errcode = 'P0001'; end if;
  if length(trim(coalesce(p_name, ''))) not between 1 and 80 then raise exception 'invalid' using errcode = 'P0001'; end if;
  if nullif(trim(p_owner_name), '') is not null then
    update profiles set name = left(trim(p_owner_name), 60) where id = uid;
  end if;
  select coalesce(nullif(name, ''), email) into who from profiles where id = uid;
  insert into workspaces (name, created_by) values (trim(p_name), uid) returning id into ws;
  insert into members (workspace_id, user_id, role) values (ws, uid, 'owner');
  insert into channels (workspace_id, kind, name, created_by) values (ws, 'channel', 'general', uid) returning id into ch;
  insert into channel_members (channel_id, user_id) values (ch, uid);
  insert into messages (channel_id, author_id, body) values (ch, null, jsonb_build_array(jsonb_build_object('t','text','v', who || ' creó la oficina.')));
  perform seed_office_template(ws, uid, ch);
  return ws;
end $$;

revoke execute on function seed_office_template(uuid, uuid, uuid), seed_tasks_database(uuid, uuid, text, uuid, text) from public;
