-- Esquema inicial (migración 0001). Postgres 15+ en Supabase.
-- Reglas de acceso: Row Level Security en todas las tablas, con funciones auxiliares.
-- Tiempos en timestamptz (UTC). Sin dinero en el MVP (la facturación se agrega en replica-backend).

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;     -- búsqueda por similitud

-- ---------------------------------------------------------------- usuarios
-- auth.users lo maneja Supabase Auth; profiles guarda lo visible.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null default '',
  avatar_url text,
  theme text not null default 'system' check (theme in ('system','light','dark')),
  email_digest boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- espacio de trabajo
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 80),
  icon text,
  member_limit int not null default 10 check (member_limit between 1 and 50),
  created_by uuid not null references profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index on members (user_id);

create table invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email text not null,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by uuid not null references profiles(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index on invites (workspace_id);
create unique index invites_one_open_per_email
  on invites (workspace_id, lower(email)) where accepted_at is null;

-- límite de miembros: es una regla de base de datos, no de interfaz
create function enforce_member_limit() returns trigger language plpgsql as $$
declare lim int; n int;
begin
  select member_limit into lim from workspaces where id = new.workspace_id for update;
  select count(*) into n from members where workspace_id = new.workspace_id;
  if n >= lim then
    raise exception 'member_limit_reached' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger members_limit before insert on members
  for each row execute function enforce_member_limit();

-- ---------------------------------------------------------------- páginas
create table pages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  parent_id uuid references pages(id) on delete cascade,
  title text not null default '',
  icon text,
  cover_url text,
  content jsonb not null default '[]',          -- documento del editor (bloques)
  search_text text not null default '',         -- texto plano para búsqueda, lo llena el servidor
  is_private boolean not null default false,    -- privada = solo dueño + invitados explícitos
  owner_id uuid not null references profiles(id) on delete restrict,
  position double precision not null default 0, -- orden entre hermanos (fraccional)
  is_database_row boolean not null default false,
  locked_by uuid references profiles(id) on delete set null, -- bloqueo suave de edición (MVP)
  locked_until timestamptz,
  archived_at timestamptz,                      -- en papelera
  created_by uuid not null references profiles(id) on delete restrict,
  updated_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint not_own_parent check (parent_id is null or parent_id <> id)
);
create index on pages (workspace_id, parent_id, position) where archived_at is null;
create index on pages (workspace_id, archived_at) where archived_at is not null;
create index on pages (owner_id);
create index pages_search_trgm on pages using gin ((title || ' ' || search_text) gin_trgm_ops);

-- evitar ciclos al mover una página dentro de su propia descendencia
create function prevent_page_cycle() returns trigger language plpgsql as $$
begin
  if new.parent_id is null then return new; end if;
  if exists (
    with recursive up as (
      select id, parent_id from pages where id = new.parent_id
      union all
      select p.id, p.parent_id from pages p join up on p.id = up.parent_id
    ) select 1 from up where id = new.id
  ) then
    raise exception 'page_cycle' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger pages_no_cycle before insert or update of parent_id on pages
  for each row execute function prevent_page_cycle();

create table page_permissions (
  page_id uuid not null references pages(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  level text not null check (level in ('full','edit','comment','view')),
  granted_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (page_id, user_id)
);
create index on page_permissions (user_id);

create table page_versions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references pages(id) on delete cascade,
  title text not null,
  content jsonb not null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on page_versions (page_id, created_at desc);

create table favorites (
  user_id uuid not null references profiles(id) on delete cascade,
  page_id uuid not null references pages(id) on delete cascade,
  position double precision not null default 0,
  primary key (user_id, page_id)
);
create index on favorites (page_id);

create table files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  page_id uuid references pages(id) on delete set null,
  storage_path text not null unique,
  name text not null,
  mime text not null,
  size_bytes bigint not null check (size_bytes between 1 and 26214400), -- 25 MB
  uploaded_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index on files (workspace_id);
create index on files (page_id);

-- ---------------------------------------------------------------- bases de datos (tareas)
create table databases (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null unique references pages(id) on delete cascade, -- la página que la contiene
  name text not null default 'Tareas',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table db_properties (
  id uuid primary key default gen_random_uuid(),
  database_id uuid not null references databases(id) on delete cascade,
  name text not null,
  type text not null check (type in ('text','select','status','person','date','checkbox','number')),
  options jsonb not null default '[]',   -- [{id, label, color}] para select/status
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (database_id, name)
);
create index on db_properties (database_id, position);

create table db_rows (
  id uuid primary key default gen_random_uuid(),
  database_id uuid not null references databases(id) on delete cascade,
  page_id uuid not null unique references pages(id) on delete cascade, -- cada fila es una página
  values jsonb not null default '{}',   -- {property_id: valor}
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on db_rows (database_id, position);
create index on db_rows using gin (values jsonb_path_ops);

create table db_views (
  id uuid primary key default gen_random_uuid(),
  database_id uuid not null references databases(id) on delete cascade,
  name text not null,
  type text not null check (type in ('table','board','calendar')),
  config jsonb not null default '{}',   -- {filters, sorts, group_by, date_property}
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on db_views (database_id, position);

-- ---------------------------------------------------------------- comentarios
create table comment_threads (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references pages(id) on delete cascade,
  block_id text,               -- null = comentario de página; si no, id del bloque
  anchor jsonb,                -- {from, to, quote} para comentarios inline
  resolved_at timestamptz,
  resolved_by uuid references profiles(id) on delete set null,
  created_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index on comment_threads (page_id, resolved_at);

create table comments (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references comment_threads(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  body jsonb not null,          -- texto enriquecido con menciones
  edited_at timestamptz,
  created_at timestamptz not null default now()
);
create index on comments (thread_id, created_at);

-- ---------------------------------------------------------------- chat (nuevo)
create table channels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  kind text not null check (kind in ('channel','dm','page')),
  name text,                    -- obligatorio si kind = 'channel'
  page_id uuid unique references pages(id) on delete cascade, -- chat lateral de una página
  dm_key text,                  -- 'userA:userB' ordenado, para no duplicar DMs
  created_by uuid not null references profiles(id) on delete cascade,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  constraint channel_has_name check (kind <> 'channel' or (name is not null and length(name) between 1 and 40)),
  constraint page_chat_has_page check (kind <> 'page' or page_id is not null),
  unique (workspace_id, dm_key)
);
create unique index channels_unique_name on channels (workspace_id, lower(name)) where kind = 'channel';

create table channel_members (
  channel_id uuid not null references channels(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  muted boolean not null default false,
  primary key (channel_id, user_id)
);
create index on channel_members (user_id);

create table messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references channels(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  parent_id uuid references messages(id) on delete cascade, -- hilo
  body jsonb not null,               -- texto con menciones y enlaces a páginas
  linked_page_id uuid references pages(id) on delete set null, -- "convertir en tarea/página"
  client_id text,                    -- id del cliente para idempotencia al reenviar
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (author_id, client_id)
);
create index on messages (channel_id, created_at desc);
create index on messages (parent_id);

create table reactions (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('comment','message')),
  target_id uuid not null,
  user_id uuid not null references profiles(id) on delete cascade,
  emoji text not null check (length(emoji) <= 16),
  created_at timestamptz not null default now(),
  unique (target_type, target_id, user_id, emoji)
);
create index on reactions (target_type, target_id);

-- ---------------------------------------------------------------- notificaciones
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  kind text not null check (kind in ('mention','reply','assigned','invite','dm')),
  actor_id uuid references profiles(id) on delete set null,
  page_id uuid references pages(id) on delete cascade,
  thread_id uuid references comment_threads(id) on delete cascade,
  message_id uuid references messages(id) on delete cascade,
  dedupe_key text,                -- evita duplicados si el mismo evento llega dos veces
  read_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);
create index on notifications (user_id, read_at, created_at desc);

-- ---------------------------------------------------------------- updated_at automático
create function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
do $$ declare t text; begin
  foreach t in array array['profiles','workspaces','pages','databases','db_properties','db_rows','db_views'] loop
    execute format('create trigger %I_touch before update on %I for each row execute function touch_updated_at()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------- funciones de acceso
create function is_member(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where workspace_id = ws and user_id = auth.uid())
$$;

create function is_admin(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where workspace_id = ws and user_id = auth.uid()
                 and role in ('owner','admin'))
$$;

-- Nivel de acceso efectivo a una página: el más amplio entre
--   a) permisos explícitos en la página o cualquier ancestro (herencia),
--   b) 'edit' para todo miembro si ni la página ni sus ancestros son privados,
--   c) 'full' para el dueño de la página o de un ancestro.
-- Devuelve 0 none, 1 view, 2 comment, 3 edit, 4 full.
create function page_access(pid uuid) returns int
language sql stable security definer set search_path = public as $$
  with recursive chain as (
    select id, parent_id, workspace_id, is_private, owner_id, 0 as depth from pages where id = pid
    union all
    select p.id, p.parent_id, p.workspace_id, p.is_private, p.owner_id, c.depth + 1
    from pages p join chain c on p.id = c.parent_id
    where c.depth < 64
  ),
  ws as (select workspace_id from chain where depth = 0)
  select case when not is_member((select workspace_id from ws)) then 0 else greatest(
    coalesce((select max(case pp.level when 'view' then 1 when 'comment' then 2
                                        when 'edit' then 3 when 'full' then 4 end)
              from page_permissions pp join chain c on c.id = pp.page_id
              where pp.user_id = auth.uid()), 0),
    case when not exists (select 1 from chain where is_private) then 3 else 0 end,
    case when exists (select 1 from chain where owner_id = auth.uid()) then 4 else 0 end,
    case when is_admin((select workspace_id from ws))
              and not exists (select 1 from chain where is_private) then 4 else 0 end
  ) end
$$;

create function in_channel(ch uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from channels c
    where c.id = ch and is_member(c.workspace_id) and (
      (c.kind = 'channel')                                              -- canales: todo el espacio
      or (c.kind = 'dm' and exists (select 1 from channel_members m
                                    where m.channel_id = c.id and m.user_id = auth.uid()))
      or (c.kind = 'page' and page_access(c.page_id) >= 2)             -- chat de página: quien puede comentar
    ))
$$;

-- ---------------------------------------------------------------- RLS
alter table profiles enable row level security;
alter table workspaces enable row level security;
alter table members enable row level security;
alter table invites enable row level security;
alter table pages enable row level security;
alter table page_permissions enable row level security;
alter table page_versions enable row level security;
alter table favorites enable row level security;
alter table files enable row level security;
alter table databases enable row level security;
alter table db_properties enable row level security;
alter table db_rows enable row level security;
alter table db_views enable row level security;
alter table comment_threads enable row level security;
alter table comments enable row level security;
alter table channels enable row level security;
alter table channel_members enable row level security;
alter table messages enable row level security;
alter table reactions enable row level security;
alter table notifications enable row level security;

-- perfiles: me veo a mí y a mis compañeros de espacio
create policy profiles_read on profiles for select using (
  id = auth.uid() or exists (
    select 1 from members a join members b on a.workspace_id = b.workspace_id
    where a.user_id = auth.uid() and b.user_id = profiles.id));
create policy profiles_update on profiles for update using (id = auth.uid());

create policy ws_read on workspaces for select using (is_member(id));
create policy ws_update on workspaces for update using (is_admin(id));
-- crear espacio y aceptar invitaciones van por funciones del servidor (service role)

create policy members_read on members for select using (is_member(workspace_id));
create policy members_admin on members for update using (is_admin(workspace_id));
create policy members_remove on members for delete using (is_admin(workspace_id) or user_id = auth.uid());

create policy invites_admin on invites for all using (is_admin(workspace_id)) with check (is_admin(workspace_id));

create policy pages_read on pages for select using (page_access(id) >= 1);
create policy pages_insert on pages for insert with check (
  is_member(workspace_id) and owner_id = auth.uid() and created_by = auth.uid()
  and (parent_id is null or page_access(parent_id) >= 3));
create policy pages_update on pages for update using (page_access(id) >= 3);
create policy pages_delete on pages for delete using (page_access(id) >= 4);

create policy perms_read on page_permissions for select using (page_access(page_id) >= 1);
create policy perms_write on page_permissions for all using (page_access(page_id) >= 4)
  with check (page_access(page_id) >= 4);

create policy versions_read on page_versions for select using (page_access(page_id) >= 1);

create policy fav_own on favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy files_read on files for select using (
  is_member(workspace_id) and (page_id is null or page_access(page_id) >= 1));
create policy files_insert on files for insert with check (is_member(workspace_id) and uploaded_by = auth.uid());

create policy db_read on databases for select using (page_access(page_id) >= 1);
create policy db_write on databases for all using (page_access(page_id) >= 3) with check (page_access(page_id) >= 3);
create policy dbp_read on db_properties for select using (
  page_access((select page_id from databases d where d.id = database_id)) >= 1);
create policy dbp_write on db_properties for all using (
  page_access((select page_id from databases d where d.id = database_id)) >= 3)
  with check (page_access((select page_id from databases d where d.id = database_id)) >= 3);
create policy dbr_read on db_rows for select using (page_access(page_id) >= 1);
create policy dbr_write on db_rows for all using (page_access(page_id) >= 3) with check (page_access(page_id) >= 3);
create policy dbv_read on db_views for select using (
  page_access((select page_id from databases d where d.id = database_id)) >= 1);
create policy dbv_write on db_views for all using (
  page_access((select page_id from databases d where d.id = database_id)) >= 3)
  with check (page_access((select page_id from databases d where d.id = database_id)) >= 3);

create policy threads_read on comment_threads for select using (page_access(page_id) >= 1);
create policy threads_write on comment_threads for insert with check (page_access(page_id) >= 2 and created_by = auth.uid());
create policy threads_resolve on comment_threads for update using (page_access(page_id) >= 2);
create policy comments_read on comments for select using (
  page_access((select page_id from comment_threads t where t.id = thread_id)) >= 1);
create policy comments_insert on comments for insert with check (
  author_id = auth.uid() and page_access((select page_id from comment_threads t where t.id = thread_id)) >= 2);
create policy comments_own on comments for update using (author_id = auth.uid());
create policy comments_del on comments for delete using (author_id = auth.uid());

create policy channels_read on channels for select using (in_channel(id));
create policy channels_create on channels for insert with check (is_member(workspace_id) and created_by = auth.uid());
create policy channels_admin on channels for update using (created_by = auth.uid() or is_admin(workspace_id));
create policy chm_read on channel_members for select using (in_channel(channel_id));
create policy chm_own on channel_members for update using (user_id = auth.uid());
create policy chm_join on channel_members for insert with check (user_id = auth.uid() and in_channel(channel_id));

create policy msg_read on messages for select using (in_channel(channel_id));
create policy msg_insert on messages for insert with check (author_id = auth.uid() and in_channel(channel_id));
create policy msg_own on messages for update using (author_id = auth.uid());

create policy react_read on reactions for select using (
  (target_type = 'message' and exists (select 1 from messages m where m.id = target_id and in_channel(m.channel_id)))
  or (target_type = 'comment' and exists (select 1 from comments c join comment_threads t on t.id = c.thread_id
                                          where c.id = target_id and page_access(t.page_id) >= 1)));
create policy react_own on reactions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notif_own on notifications for select using (user_id = auth.uid());
create policy notif_read on notifications for update using (user_id = auth.uid());
-- las notificaciones las crea el servidor (service role) al detectar menciones/respuestas

-- ---------------------------------------------------------------- tiempo real
-- Supabase Realtime: cambios de messages, notifications y pages (título/orden) al cliente.
alter publication supabase_realtime add table messages, notifications, pages, comment_threads, comments, db_rows;
