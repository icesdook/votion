-- 0002: lógica del servidor.
-- Operaciones que deben ser atómicas (RPC con security definer) y avisos/búsqueda/versiones
-- calculados en la base de datos, para que no dependan de que el cliente los cree.

-- ---------------------------------------------------------------- acceso para cualquier usuario
-- page_access(pid) usa auth.uid(); los triggers necesitan preguntar por otra persona.
create or replace function page_access_for(pid uuid, uid uuid) returns int
language sql stable security definer set search_path = public as $$
  with recursive chain as (
    select id, parent_id, workspace_id, is_private, owner_id, 0 as depth from pages where id = pid
    union all
    select p.id, p.parent_id, p.workspace_id, p.is_private, p.owner_id, c.depth + 1
    from pages p join chain c on p.id = c.parent_id
    where c.depth < 64
  ),
  ws as (select workspace_id from chain where depth = 0),
  mem as (select role from members where workspace_id = (select workspace_id from ws) and user_id = uid)
  select case when not exists (select 1 from mem) then 0 else greatest(
    coalesce((select max(case pp.level when 'view' then 1 when 'comment' then 2
                                        when 'edit' then 3 when 'full' then 4 end)
              from page_permissions pp join chain c on c.id = pp.page_id
              where pp.user_id = uid), 0),
    case when not exists (select 1 from chain where is_private) then 3 else 0 end,
    case when exists (select 1 from chain where owner_id = uid) then 4 else 0 end,
    case when (select role from mem) in ('owner','admin')
              and not exists (select 1 from chain where is_private) then 4 else 0 end
  ) end
$$;

create or replace function page_access(pid uuid) returns int
language sql stable security definer set search_path = public as $$
  select page_access_for(pid, auth.uid())
$$;

create or replace function in_channel_for(ch uuid, uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from channels c
    where c.id = ch
      and exists (select 1 from members m where m.workspace_id = c.workspace_id and m.user_id = uid)
      and (
        c.kind = 'channel'
        or (c.kind = 'dm' and exists (select 1 from channel_members cm where cm.channel_id = c.id and cm.user_id = uid))
        or (c.kind = 'page' and page_access_for(c.page_id, uid) >= 2)
      ))
$$;

create or replace function in_channel(ch uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select in_channel_for(ch, auth.uid())
$$;

-- ---------------------------------------------------------------- utilidades de texto
-- Personas mencionadas en un RichText de chat/comentario: [{t:'user', id}]
create or replace function rich_mentions(body jsonb) returns setof uuid
language sql immutable as $$
  select distinct (e->>'id')::uuid from jsonb_array_elements(coalesce(body, '[]'::jsonb)) e where e->>'t' = 'user'
$$;

-- Personas mencionadas en el documento del editor: nodos {type:'mention', props:{userId}}
create or replace function doc_mentions(doc jsonb) returns setof uuid
language sql immutable as $$
  select distinct (v #>> '{}')::uuid
  from jsonb_path_query(coalesce(doc, '[]'::jsonb), 'lax $.** ? (@.type == "mention").props.userId') v
  where (v #>> '{}') ~ '^[0-9a-f-]{36}$'
$$;

-- Texto plano del documento, para buscar
create or replace function doc_text(doc jsonb) returns text
language sql immutable as $$
  select coalesce(string_agg(v #>> '{}', ' '), '')
  from jsonb_path_query(coalesce(doc, '[]'::jsonb), 'lax $.**.text') v
  where jsonb_typeof(v) = 'string'
$$;

-- ---------------------------------------------------------------- crear oficina (F01)
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
  insert into pages (workspace_id, title, icon, owner_id, created_by, position, content)
  values (ws, 'Primeros pasos', '👋', uid, uid, 1, jsonb_build_array(jsonb_build_object(
    'type','paragraph','content', jsonb_build_array(jsonb_build_object('type','text','text',
    'Escribe aquí lo que tu equipo necesita saber. Presiona / para agregar listas, títulos o una tabla de tareas.','styles','{}'::jsonb)))));
  return ws;
end $$;

-- messages.author_id debe aceptar null (mensajes del sistema)
alter table messages alter column author_id drop not null;
drop policy if exists msg_insert on messages;
create policy msg_insert on messages for insert with check (author_id = auth.uid() and in_channel(channel_id));

-- ---------------------------------------------------------------- invitar (F01)
create or replace function invite_members(p_emails text[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); ws uuid; lim int; room int; e text; sent jsonb := '[]'; rejected jsonb := '[]'; tok text;
begin
  select m.workspace_id into ws from members m where m.user_id = uid and m.role in ('owner','admin');
  if ws is null then raise exception 'forbidden' using errcode = 'P0001'; end if;
  select member_limit into lim from workspaces where id = ws for update;
  room := lim - (select count(*) from members where workspace_id = ws)
              - (select count(*) from invites where workspace_id = ws and accepted_at is null and expires_at > now());
  foreach e in array p_emails loop
    e := lower(trim(e));
    continue when e = '';
    if e !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
      rejected := rejected || jsonb_build_object('email', e, 'reason', 'Correo no válido');
    elsif exists (select 1 from members m join profiles p on p.id = m.user_id where m.workspace_id = ws and p.email = e) then
      rejected := rejected || jsonb_build_object('email', e, 'reason', 'Ya es parte de la oficina');
    elsif exists (select 1 from invites where workspace_id = ws and lower(email) = e and accepted_at is null and expires_at > now()) then
      rejected := rejected || jsonb_build_object('email', e, 'reason', 'Ya tiene una invitación pendiente');
    elsif room <= 0 then
      rejected := rejected || jsonb_build_object('email', e, 'reason', 'Se alcanzó el límite de ' || lim || ' personas');
    else
      delete from invites where workspace_id = ws and lower(email) = e and accepted_at is null; -- vencidas
      insert into invites (workspace_id, email, invited_by) values (ws, e, uid) returning token into tok;
      sent := sent || jsonb_build_object('email', e, 'token', tok);
      room := room - 1;
    end if;
  end loop;
  return jsonb_build_object('sent', sent, 'rejected', rejected);
end $$;

-- ---------------------------------------------------------------- invitación pública (F02)
-- Vista mínima de una invitación por token, sin exponer la tabla.
create or replace function get_invite(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when i.id is null then jsonb_build_object('status','not_found') else jsonb_build_object(
    'status', case when i.accepted_at is not null then 'used' when i.expires_at < now() then 'expired' else 'valid' end,
    'email', i.email, 'workspace', w.name, 'workspace_id', w.id,
    'inviter', coalesce(nullif(p.name,''), p.email)) end
  from (select 1) x
  left join invites i on i.token = p_token
  left join workspaces w on w.id = i.workspace_id
  left join profiles p on p.id = i.invited_by
$$;

create or replace function accept_invite(p_token text, p_name text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); inv invites; me profiles; ch record; general uuid;
begin
  select * into inv from invites where token = p_token for update;
  if inv.id is null then raise exception 'not_found' using errcode = 'P0001'; end if;
  if inv.accepted_at is not null then raise exception 'invite_used' using errcode = 'P0001'; end if;
  if inv.expires_at < now() then raise exception 'invite_expired' using errcode = 'P0001'; end if;
  select * into me from profiles where id = uid;
  if me.id is null or lower(me.email) <> lower(inv.email) then raise exception 'forbidden' using errcode = 'P0001'; end if;
  if exists (select 1 from members where user_id = uid) then raise exception 'already_member' using errcode = 'P0001'; end if;
  if nullif(trim(p_name), '') is not null then update profiles set name = left(trim(p_name), 60) where id = uid; end if;
  insert into members (workspace_id, user_id, role) values (inv.workspace_id, uid, 'member'); -- el trigger aplica el límite
  update invites set accepted_at = now() where id = inv.id;
  for ch in select id, name from channels where workspace_id = inv.workspace_id and kind = 'channel' and archived_at is null loop
    insert into channel_members (channel_id, user_id) values (ch.id, uid) on conflict do nothing;
    if ch.name = 'general' then general := ch.id; end if;
  end loop;
  if general is not null then
    insert into messages (channel_id, author_id, body) values (general, null, jsonb_build_array(jsonb_build_object('t','text','v',
      coalesce(nullif((select name from profiles where id = uid), ''), me.email) || ' se unió a la oficina.')));
  end if;
  return inv.workspace_id;
end $$;

-- ---------------------------------------------------------------- perfiles automáticos
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email) values (new.id, lower(new.email)) on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- ---------------------------------------------------------------- avisos
create or replace function notify_user(p_user uuid, p_ws uuid, p_kind text, p_actor uuid,
  p_page uuid default null, p_thread uuid default null, p_message uuid default null, p_dedupe text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user is null or p_user = p_actor then return; end if;
  insert into notifications (user_id, workspace_id, kind, actor_id, page_id, thread_id, message_id, dedupe_key)
  values (p_user, p_ws, p_kind, p_actor, p_page, p_thread, p_message, p_dedupe)
  on conflict (user_id, dedupe_key) do nothing;
end $$;

-- comentarios: menciones y respuestas, solo a quien puede ver la página
create or replace function trg_comment_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare th comment_threads; pg pages; u uuid;
begin
  select * into th from comment_threads where id = new.thread_id;
  select * into pg from pages where id = th.page_id;
  for u in select rich_mentions(new.body) loop
    if page_access_for(pg.id, u) >= 1 then
      perform notify_user(u, pg.workspace_id, 'mention', new.author_id, pg.id, th.id, null, 'cm:' || new.id || ':' || u);
    end if;
  end loop;
  for u in select distinct author_id from comments where thread_id = new.thread_id and id <> new.id loop
    if u not in (select rich_mentions(new.body)) and page_access_for(pg.id, u) >= 1 then
      perform notify_user(u, pg.workspace_id, 'reply', new.author_id, pg.id, th.id, null, 'rp:' || new.id || ':' || u);
    end if;
  end loop;
  -- responder reabre el hilo
  update comment_threads set resolved_at = null, resolved_by = null where id = th.id and resolved_at is not null;
  return new;
end $$;
drop trigger if exists comments_notify on comments;
create trigger comments_notify after insert on comments for each row execute function trg_comment_notify();

-- mensajes: menciones, DMs, y página enlazada
create or replace function trg_message_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare ch channels; u uuid; mentioned uuid[];
begin
  if new.author_id is null then return new; end if;
  select * into ch from channels where id = new.channel_id;
  select coalesce(array_agg(x), '{}') into mentioned from rich_mentions(new.body) x;
  foreach u in array mentioned loop
    if in_channel_for(ch.id, u) then
      perform notify_user(u, ch.workspace_id, 'mention', new.author_id, ch.page_id, null, new.id, 'msg:' || new.id || ':' || u);
    end if;
  end loop;
  if ch.kind = 'dm' then
    for u in select user_id from channel_members where channel_id = ch.id and user_id <> new.author_id loop
      if not (u = any(mentioned)) then
        -- un aviso por hora por conversación, para no llenar la bandeja
        perform notify_user(u, ch.workspace_id, 'dm', new.author_id, null, null, new.id,
          'dm:' || ch.id || ':' || u || ':' || to_char(now() at time zone 'utc', 'YYYYMMDDHH24'));
      end if;
    end loop;
  end if;
  update channel_members set last_read_at = now() where channel_id = ch.id and user_id = new.author_id;
  return new;
end $$;
drop trigger if exists messages_notify on messages;
create trigger messages_notify after insert on messages for each row execute function trg_message_notify();

create or replace function trg_message_link() returns trigger
language plpgsql as $$
begin
  if new.linked_page_id is null then
    select (e->>'id')::uuid into new.linked_page_id from jsonb_array_elements(new.body) e where e->>'t' = 'page' limit 1;
  end if;
  return new;
end $$;
drop trigger if exists messages_link on messages;
create trigger messages_link before insert on messages for each row execute function trg_message_link();

-- páginas: texto de búsqueda, versiones cada 10 min y menciones nuevas
create or replace function trg_page_before() returns trigger
language plpgsql security definer set search_path = public as $$
declare last_v timestamptz;
begin
  new.search_text := doc_text(new.content);
  if tg_op = 'UPDATE' and new.content is distinct from old.content then
    select max(created_at) into last_v from page_versions where page_id = old.id;
    if last_v is null or last_v < now() - interval '10 minutes' then
      insert into page_versions (page_id, title, content, created_by) values (old.id, old.title, old.content, coalesce(old.updated_by, old.created_by));
    end if;
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  end if;
  return new;
end $$;
drop trigger if exists pages_before on pages;
create trigger pages_before before insert or update on pages for each row execute function trg_page_before();

create or replace function trg_page_mentions() returns trigger
language plpgsql security definer set search_path = public as $$
declare u uuid; actor uuid := coalesce(auth.uid(), new.updated_by, new.created_by);
begin
  for u in select doc_mentions(new.content) except select doc_mentions(case when tg_op = 'UPDATE' then old.content else '[]'::jsonb end) loop
    if page_access_for(new.id, u) >= 1 then
      perform notify_user(u, new.workspace_id, 'mention', actor, new.id, null, null, 'page:' || new.id || ':' || u);
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists pages_mentions on pages;
create trigger pages_mentions after insert or update of content on pages for each row execute function trg_page_mentions();

-- tareas: aviso al asignar una persona
create or replace function trg_row_assigned() returns trigger
language plpgsql security definer set search_path = public as $$
declare prop record; u uuid; pg pages;
begin
  select * into pg from pages where id = new.page_id;
  for prop in select id from db_properties where database_id = new.database_id and type = 'person' loop
    u := nullif(new.values ->> prop.id::text, '')::uuid;
    if u is not null and (tg_op = 'INSERT' or u is distinct from nullif(old.values ->> prop.id::text, '')::uuid)
       and page_access_for(pg.id, u) >= 1 then
      perform notify_user(u, pg.workspace_id, 'assigned', coalesce(auth.uid(), pg.created_by), pg.id, null, null, 'assign:' || pg.id || ':' || u);
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists rows_assigned on db_rows;
create trigger rows_assigned after insert or update of values on db_rows for each row execute function trg_row_assigned();

-- ---------------------------------------------------------------- convertir mensaje en tarea (F09)
create or replace function message_to_task(p_message uuid, p_database uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); m messages; ch channels; d databases; v_txt text; v_title text; pid uuid; st record; vals jsonb := '{}'; who text;
begin
  select * into m from messages where id = p_message and deleted_at is null;
  if m.id is null then raise exception 'not_found' using errcode = 'P0001'; end if;
  select * into ch from channels where id = m.channel_id;
  if not in_channel_for(ch.id, uid) then raise exception 'forbidden' using errcode = 'P0001'; end if;
  select string_agg(case e->>'t' when 'text' then e->>'v' when 'br' then ' '
           when 'user' then '@' || coalesce((select name from profiles where id = (e->>'id')::uuid), 'persona')
           else coalesce((select title from pages where id = (e->>'id')::uuid), 'página') end, '')
    into v_txt from jsonb_array_elements(m.body) e;
  v_title := case when length(v_txt) > 80 then left(v_txt, 77) || '…' else v_txt end;
  if p_database is not null then
    select * into d from databases where id = p_database;
    if d.id is null or page_access_for(d.page_id, uid) < 3 then raise exception 'forbidden' using errcode = 'P0001'; end if;
    insert into pages (workspace_id, parent_id, title, owner_id, created_by, is_database_row, content,
                       position)
    values (ch.workspace_id, d.page_id, v_title, uid, uid, true,
            jsonb_build_array(jsonb_build_object('type','paragraph','content', jsonb_build_array(jsonb_build_object('type','text','text', v_txt, 'styles','{}'::jsonb)))),
            (select coalesce(max(position), 0) + 1 from db_rows where database_id = d.id))
    returning id into pid;
    select id, options into st from db_properties where database_id = d.id and type = 'status' order by position limit 1;
    if st.id is not null and jsonb_array_length(st.options) > 0 then vals := jsonb_build_object(st.id::text, st.options->0->>'id'); end if;
    insert into db_rows (database_id, page_id, values, position)
    values (d.id, pid, vals, (select coalesce(max(position), 0) + 1 from db_rows where database_id = d.id));
  else
    insert into pages (workspace_id, title, owner_id, created_by, content, position)
    values (ch.workspace_id, v_title, uid, uid,
            jsonb_build_array(jsonb_build_object('type','paragraph','content', jsonb_build_array(jsonb_build_object('type','text','text', v_txt, 'styles','{}'::jsonb)))),
            (select coalesce(max(position), 0) + 1 from pages where workspace_id = ch.workspace_id and parent_id is null))
    returning id into pid;
  end if;
  update messages set linked_page_id = pid where id = m.id;
  select coalesce(nullif(name,''), email) into who from profiles where id = uid;
  insert into messages (channel_id, author_id, parent_id, body)
  values (ch.id, null, m.id, jsonb_build_array(jsonb_build_object('t','text','v', who || ' lo convirtió en '), jsonb_build_object('t','page','id', pid)));
  return pid;
end $$;

-- el autor puede editar solo su mensaje; el sistema actualiza linked_page_id vía la función de arriba
-- ---------------------------------------------------------------- limpieza (pg_cron)
create or replace function purge_trash() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with gone as (delete from pages where archived_at < now() - interval '30 days' returning 1) select count(*) into n from gone;
  delete from invites where accepted_at is null and expires_at < now() - interval '30 days';
  return n;
end $$;

create or replace function prune_versions() returns void
language sql security definer set search_path = public as $$
  delete from page_versions v using (
    select id, row_number() over (partition by page_id,
             case when created_at > now() - interval '48 hours' then date_trunc('hour', created_at) else date_trunc('day', created_at) end
             order by created_at desc) rn
    from page_versions) x
  where v.id = x.id and x.rn > 1
$$;

create or replace function release_stale_locks() returns void
language sql security definer set search_path = public as $$
  update pages set locked_by = null, locked_until = null where locked_until < now()
$$;

-- Programación (solo si pg_cron está habilitado en el proyecto: Database > Extensions)
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('purge-trash', '0 3 * * *', 'select purge_trash()');
    perform cron.schedule('prune-versions', '30 3 * * *', 'select prune_versions()');
    perform cron.schedule('release-locks', '* * * * *', 'select release_stale_locks()');
  end if;
end $$;

-- ---------------------------------------------------------------- bloqueo suave (F03)
create or replace function lock_page(p_page uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); p pages;
begin
  select * into p from pages where id = p_page for update;
  if p.id is null or page_access_for(p.id, uid) < 3 then return jsonb_build_object('ok', false, 'holder', null); end if;
  if p.locked_by is not null and p.locked_by <> uid and p.locked_until > now() then
    return jsonb_build_object('ok', false, 'holder', p.locked_by);
  end if;
  update pages set locked_by = uid, locked_until = now() + interval '60 seconds' where id = p.id;
  return jsonb_build_object('ok', true, 'holder', uid);
end $$;

create or replace function unlock_page(p_page uuid) returns void
language sql security definer set search_path = public as $$
  update pages set locked_by = null, locked_until = null where id = p_page and locked_by = auth.uid()
$$;

-- ---------------------------------------------------------------- permisos de ejecución
revoke execute on function purge_trash(), prune_versions(), release_stale_locks(), notify_user(uuid, uuid, text, uuid, uuid, uuid, uuid, text) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function create_workspace(text, text), invite_members(text[]), accept_invite(text, text),
      message_to_task(uuid, uuid), lock_page(uuid), unlock_page(uuid), page_access(uuid), in_channel(uuid) to authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant execute on function get_invite(text) to anon;
  end if;
end $$;

-- ---------------------------------------------------------------- lectura de lo recién creado
-- En INSERT ... RETURNING (lo que hace supabase-js con .insert().select()) la fila nueva todavía
-- no es visible para page_access()/in_channel(); quien la creó debe poder leerla igual.
drop policy if exists pages_read on pages;
create policy pages_read on pages for select using (owner_id = auth.uid() or page_access(id) >= 1);
drop policy if exists channels_read on channels;
create policy channels_read on channels for select using (created_by = auth.uid() or in_channel(id));

-- ---------------------------------------------------------------- canales (F08, F09)
create or replace function open_dm(p_other uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); ws uuid; k text; ch uuid;
begin
  select workspace_id into ws from members where user_id = uid;
  if ws is null or not exists (select 1 from members where workspace_id = ws and user_id = p_other) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  k := least(uid::text, p_other::text) || ':' || greatest(uid::text, p_other::text);
  select id into ch from channels where workspace_id = ws and dm_key = k;
  if ch is null then
    insert into channels (workspace_id, kind, dm_key, created_by) values (ws, 'dm', k, uid) returning id into ch;
    insert into channel_members (channel_id, user_id) values (ch, uid), (ch, p_other) on conflict do nothing;
  end if;
  return ch;
end $$;

create or replace function open_page_chat(p_page uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); ch uuid; ws uuid;
begin
  if page_access_for(p_page, uid) < 2 then raise exception 'forbidden' using errcode = 'P0001'; end if;
  select workspace_id into ws from pages where id = p_page;
  select id into ch from channels where kind = 'page' and page_id = p_page;
  if ch is null then
    insert into channels (workspace_id, kind, page_id, created_by) values (ws, 'page', p_page, uid) returning id into ch;
  end if;
  insert into channel_members (channel_id, user_id) values (ch, uid) on conflict do nothing;
  return ch;
end $$;

create or replace function create_channel(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); ws uuid; clean text; ch uuid; who text;
begin
  select workspace_id into ws from members where user_id = uid;
  if ws is null then raise exception 'forbidden' using errcode = 'P0001'; end if;
  clean := regexp_replace(regexp_replace(lower(trim(both '#' from trim(p_name))), '\s+', '-', 'g'), '[^a-z0-9ñáéíóúü_-]', '', 'g');
  if length(clean) not between 1 and 40 then raise exception 'invalid' using errcode = 'P0001'; end if;
  if exists (select 1 from channels where workspace_id = ws and kind = 'channel' and lower(name) = clean) then
    raise exception 'duplicate_name' using errcode = 'P0001';
  end if;
  insert into channels (workspace_id, kind, name, created_by) values (ws, 'channel', clean, uid) returning id into ch;
  insert into channel_members (channel_id, user_id) select ch, user_id from members where workspace_id = ws;
  select coalesce(nullif(name,''), email) into who from profiles where id = uid;
  insert into messages (channel_id, author_id, body) values (ch, null, jsonb_build_array(jsonb_build_object('t','text','v', who || ' creó #' || clean || '.')));
  return ch;
end $$;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function open_dm(uuid), open_page_chat(uuid), create_channel(text) to authenticated;
  end if;
end $$;
