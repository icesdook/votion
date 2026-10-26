-- Recorrido completo como usuarios reales con RLS activo. Ejecutar con scripts/test-db.sh
\set ON_ERROR_STOP 1
\set QUIET 1
insert into auth.users(id,email) values
 ('a0000000-0000-0000-0000-00000000000a','ana@ofi.cl'),
 ('b0000000-0000-0000-0000-00000000000b','beto@ofi.cl'),
 ('c0000000-0000-0000-0000-00000000000c','intruso@otro.cl');
create function as_user(u text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', u, false); end $$;
grant execute on function as_user(text) to authenticated, anon;
create table _r(k text primary key, v text); grant all on _r to authenticated, anon;
create function ok(cond boolean, label text) returns text language plpgsql as $$ begin
  if not cond then raise exception 'FALLA: %', label; end if; return 'ok   ' || label; end $$;
grant execute on function ok(boolean,text) to authenticated, anon;

-- 1. Ana crea la oficina
set role authenticated; select as_user('a0000000-0000-0000-0000-00000000000a');
insert into _r values ('ws', create_workspace('Estudio Biobío', 'Ana'));
select ok((select count(*) from channels where name='general')=1, 'oficina con #general');
select ok((select count(*) from pages where parent_id is null)=4, 'oficina armada: 4 páginas raíz');
select ok((select count(*) from databases)=1 and (select count(*) from db_views)=3, 'tablero de tareas con 3 vistas');
select ok((select name from db_views order by position limit 1)='Tablero', 'el tablero es la primera vista');
select ok((select count(*) from db_rows)=1, 'una tarea de ejemplo');
select ok((select count(*) from favorites where user_id=auth.uid())=1, 'tareas en favoritos');
select ok((select name from profiles where id=auth.uid())='Ana', 'nombre guardado');
select ok((select count(*) from messages)=2, 'mensajes del sistema en #general');

-- 2. invitaciones
insert into _r select 'inv', invite_members(array['beto@ofi.cl','malo','intruso@otro.cl'])::text;
select ok(jsonb_array_length((select v::jsonb->'sent' from _r where k='inv'))=2, 'dos invitaciones enviadas');
select ok(jsonb_array_length((select v::jsonb->'rejected' from _r where k='inv'))=1, 'correo no válido rechazado');
insert into _r select 'tok_b', (select v::jsonb->'sent'->0->>'token' from _r where k='inv');
insert into _r select 'tok_c', (select v::jsonb->'sent'->1->>'token' from _r where k='inv');

-- 3. invitación pública y aceptar
reset role; set role anon;
select ok((select get_invite((select v from _r where k='tok_b'))->>'status')='valid', 'anon ve invitación válida');
select ok((select get_invite('no-existe')->>'status')='not_found', 'token inexistente');
reset role; set role authenticated; select as_user('c0000000-0000-0000-0000-00000000000c');
do $$ begin perform accept_invite((select v from _r where k='tok_b'), 'X'); raise exception 'debió fallar'; exception when others then if sqlerrm <> 'forbidden' then raise; end if; end $$;
select ok(true, 'otra persona no puede usar la invitación de Beto');
select ok((select count(*) from pages)=0, 'intruso sin oficina no ve páginas');
select ok((select count(*) from messages)=0, 'intruso no ve mensajes');
select as_user('b0000000-0000-0000-0000-00000000000b');
select ok(accept_invite((select v from _r where k='tok_b'), 'Beto') = (select v::uuid from _r where k='ws'), 'Beto acepta');
select ok((select count(*) from channel_members cm join channels c on c.id=cm.channel_id where c.name='general' and cm.user_id=auth.uid())=1, 'Beto quedó en #general');
do $$ begin perform accept_invite((select v from _r where k='tok_b'), 'X'); raise exception 'debió fallar'; exception when others then if sqlerrm <> 'invite_used' then raise; end if; end $$;
select ok(true, 'invitación usada no sirve dos veces');

-- 4. Beto escribe una página mencionando a Ana
insert into pages(workspace_id,title,owner_id,created_by,content) values
 ((select v::uuid from _r where k='ws'),'Plan', auth.uid(), auth.uid(),
  '[{"type":"paragraph","content":[{"type":"text","text":"Revisar con ","styles":{}},{"type":"mention","props":{"userId":"a0000000-0000-0000-0000-00000000000a"}}]}]')
  returning id \gset plan_
insert into _r values ('plan', :'plan_id');
select ok((select search_text from pages where id=(select v::uuid from _r where k='plan')) like 'Revisar con%', 'texto de búsqueda calculado');
update pages set content = content || '[{"type":"paragraph","content":[{"type":"text","text":"otra línea","styles":{}}]}]' where id=(select v::uuid from _r where k='plan');
select ok((select count(*) from page_versions where page_id=(select v::uuid from _r where k='plan'))=1, 'versión guardada al editar');
select as_user('a0000000-0000-0000-0000-00000000000a');
select ok((select count(*) from notifications where kind='mention' and page_id=(select v::uuid from _r where k='plan'))=1, 'Ana recibe aviso de mención en página');

-- 5. página privada de Ana
insert into pages(workspace_id,title,owner_id,created_by,is_private) values ((select v::uuid from _r where k='ws'),'Privada', auth.uid(), auth.uid(), true) returning id \gset priv_
insert into _r values ('priv', :'priv_id');
select as_user('b0000000-0000-0000-0000-00000000000b');
select ok((select count(*) from pages where id=(select v::uuid from _r where k='priv'))=0, 'Beto no ve la página privada');
do $$ begin
  update pages set title='hackeada' where id=(select v::uuid from _r where k='priv');
  if found then raise exception 'Beto pudo editar'; end if; end $$;
select ok(true, 'Beto no puede editar la privada');
select as_user('a0000000-0000-0000-0000-00000000000a');
insert into page_permissions(page_id,user_id,level) values ((select v::uuid from _r where k='priv'),'b0000000-0000-0000-0000-00000000000b','view');
select as_user('b0000000-0000-0000-0000-00000000000b');
select ok((select count(*) from pages where id=(select v::uuid from _r where k='priv'))=1, 'con permiso de lectura, Beto la ve');
select ok(page_access((select v::uuid from _r where k='priv'))=1, 'nivel efectivo: ver');

-- 6. chat: mención en canal y DM
insert into messages(channel_id,author_id,body) values ((select id from channels where name='general'), auth.uid(),
  jsonb_build_array(jsonb_build_object('t','user','id','a0000000-0000-0000-0000-00000000000a'), jsonb_build_object('t','text','v',' mira '), jsonb_build_object('t','page','id',(select v from _r where k='plan'))))
  returning id \gset m1_
insert into _r values ('m1', :'m1_id');
select ok((select linked_page_id::text from messages where id=(select v::uuid from _r where k='m1'))=(select v from _r where k='plan'), 'mensaje enlaza la página');
select open_dm('a0000000-0000-0000-0000-00000000000a') as id \gset dm_
select ok(open_dm('a0000000-0000-0000-0000-00000000000a') = :'dm_id', 'abrir el DM dos veces da el mismo canal');
select ok(create_channel('#Clientes Nuevos') is not null, 'canal nuevo creado');
select ok((select name from channels where kind='channel' and name like 'clientes%')='clientes-nuevos', 'nombre de canal normalizado');
select ok(open_page_chat((select v::uuid from _r where k='plan')) is not null, 'chat de página creado');
insert into messages(channel_id,author_id,body) values (:'dm_id', auth.uid(), '[{"t":"text","v":"hola Ana"}]');
insert into messages(channel_id,author_id,body) values (:'dm_id', auth.uid(), '[{"t":"text","v":"¿estás?"}]');
select as_user('a0000000-0000-0000-0000-00000000000a');
select ok((select count(*) from notifications where kind='mention' and message_id is not null)=1, 'Ana recibe aviso de mención en chat');
select ok((select count(*) from notifications where kind='dm')=1, 'dos DMs seguidos = un solo aviso');
select as_user('c0000000-0000-0000-0000-00000000000c');
select ok((select count(*) from notifications)=0 and (select count(*) from channels)=0, 'intruso no ve avisos ni canales');
select as_user('a0000000-0000-0000-0000-00000000000a');
select ok((select count(*) from channels where kind='dm')=1, 'Ana ve su DM con Beto');

-- 7. hilos de comentarios
select as_user('a0000000-0000-0000-0000-00000000000a');
insert into comment_threads(page_id,created_by) values ((select v::uuid from _r where k='plan'), auth.uid()) returning id \gset th_
insert into comments(thread_id,author_id,body) values (:'th_id', auth.uid(), '[{"t":"text","v":"¿Fecha?"}]');
update comment_threads set resolved_at=now() where id=:'th_id';
select as_user('b0000000-0000-0000-0000-00000000000b');
insert into comments(thread_id,author_id,body) values (:'th_id', auth.uid(), '[{"t":"text","v":"El viernes"}]');
select ok((select resolved_at from comment_threads where id=:'th_id') is null, 'responder reabre el hilo');
select as_user('a0000000-0000-0000-0000-00000000000a');
select ok((select count(*) from notifications where kind='reply')=1, 'Ana recibe aviso de respuesta');
-- comentar en la privada: Beto solo puede ver, no comentar
select as_user('b0000000-0000-0000-0000-00000000000b');
do $$ begin
  insert into comment_threads(page_id,created_by) values ((select v::uuid from _r where k='priv'), auth.uid());
  raise exception 'debió fallar';
exception when insufficient_privilege then null; end $$;
select ok(true, 'con permiso de ver, Beto no puede comentar');

-- 8. tareas: asignar persona avisa
select as_user('a0000000-0000-0000-0000-00000000000a');
insert into pages(workspace_id,title,owner_id,created_by) values ((select v::uuid from _r where k='ws'),'Tareas',auth.uid(),auth.uid()) returning id \gset tp_
insert into databases(page_id,name) values (:'tp_id','Tareas') returning id \gset db_
insert into db_properties(database_id,name,type,options) values (:'db_id','Estado','status','[{"id":"s1","label":"Por hacer","color":"gray"}]') returning id \gset st_
insert into db_properties(database_id,name,type) values (:'db_id','Responsable','person') returning id \gset pr_
insert into pages(workspace_id,parent_id,title,owner_id,created_by,is_database_row) values ((select v::uuid from _r where k='ws'),:'tp_id','Llamar al cliente',auth.uid(),auth.uid(),true) returning id \gset rp_
insert into db_rows(database_id,page_id,values) values (:'db_id',:'rp_id', jsonb_build_object(:'pr_id','b0000000-0000-0000-0000-00000000000b'));
select as_user('b0000000-0000-0000-0000-00000000000b');
select ok((select count(*) from notifications where kind='assigned')=1, 'Beto recibe aviso de tarea asignada');

-- 9. convertir mensaje en tarea
insert into _r values ('task', message_to_task((select v::uuid from _r where k='m1'), :'db_id'));
select ok((select count(*) from db_rows where database_id=:'db_id')=2, 'mensaje convertido en tarea');
select ok((select values->>(:'st_id') from db_rows where page_id=(select v::uuid from _r where k='task'))='s1', 'tarea nueva parte en el primer estado');
select ok((select count(*) from messages where parent_id=(select v::uuid from _r where k='m1'))=1, 'aviso en el chat de la conversión');

-- 10. bloqueo suave
select as_user('a0000000-0000-0000-0000-00000000000a');
select ok((lock_page((select v::uuid from _r where k='plan'))->>'ok')::boolean, 'Ana toma el bloqueo');
select as_user('b0000000-0000-0000-0000-00000000000b');
select ok((lock_page((select v::uuid from _r where k='plan'))->>'holder')='a0000000-0000-0000-0000-00000000000a', 'Beto ve que Ana está editando');

-- 11. límite de personas
select as_user('a0000000-0000-0000-0000-00000000000a');
reset role; update workspaces set member_limit=3; set role authenticated;
insert into _r select 'inv2', invite_members(array['d@ofi.cl','e@ofi.cl'])::text;
select ok(jsonb_array_length((select v::jsonb->'rejected' from _r where k='inv2'))=2, 'límite cuenta miembros + invitaciones pendientes');

-- 12. Beto no puede invitar (no es admin)
select as_user('b0000000-0000-0000-0000-00000000000b');
do $$ begin perform invite_members(array['z@ofi.cl']); raise exception 'debió fallar'; exception when others then if sqlerrm <> 'forbidden' then raise; end if; end $$;
select ok(true, 'miembro común no puede invitar');
reset role;
\echo TODO OK
