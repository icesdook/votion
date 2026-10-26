# Arquitectura: espacio de trabajo colaborativo para oficinas pequeñas (reconstrucción de las funciones centrales de Notion + chat interno)

> Nombre de producto pendiente (lo define replica-brand). Mientras tanto: "el clon".
> Supuesto: web responsive primero; móvil nativo después (Flutter o Expo, según lo que se prefiera).
> Supuesto: el MVP es multi-oficina (SaaS), pero también se puede autoalojar con Docker en una sola oficina.

## Stack

| capa | elección | por qué |
| --- | --- | --- |
| web | Next.js (App Router) + TypeScript | Server actions y rutas en un solo proyecto. Es el ecosistema donde viven los editores de bloques maduros. |
| editor | BlockNote (sobre TipTap/ProseMirror) | Da bloques, menú `/`, arrastrar bloques y colaboración con Yjs ya resueltos. Escribir un editor desde cero es meses de trabajo. *Revisar la licencia del paquete exacto: el núcleo es abierto y algunos extras no.* |
| estilos | Tailwind + tokens de replica-design | |
| base de datos | Postgres en Supabase | Postgres ya conocido. Supabase trae Auth, Realtime, Storage y RLS en uno. Se puede autoalojar con Docker si una oficina lo exige. |
| ORM | Drizzle | SQL explícito, tipos en TS, migraciones simples. RLS sigue siendo la barrera real. |
| auth | Supabase Auth (enlace mágico + Google) | Sin contraseñas que gestionar. Encaja con "fácil de usar". |
| tiempo real | Supabase Realtime (chat, notificaciones, presencia) + Yjs vía Hocuspocus (coedición, fase 2) | El chat necesita entrega en vivo desde el día 1. La coedición al carácter es *should*, así que va en la fase 2 con bloqueo suave en el MVP. |
| archivos | Supabase Storage | Bucket privado por espacio, URLs firmadas, límite de 25 MB. |
| email | Resend | Invitaciones, enlace mágico y resumen diario de menciones. |
| jobs | pg_cron en Supabase + una ruta de Vercel Cron | Resumen por email, purga de papelera a 30 días, recorte de versiones. |
| pagos | Fuera del MVP. Después: Stripe si está disponible para la cuenta, o Flow / Mercado Pago para Chile | Precio plano por oficina. Se decide en replica-launch. |
| hosting | Vercel (web) + Supabase cloud | Costo cercano a cero sin usuarios. Ruta alternativa: Docker Compose en servidor propio. |

Una sola base de datos, sin microservicios.

## Esquema

Tablas: 20. Acceso: **Row Level Security en todas**, con 4 funciones auxiliares (`is_member`, `is_admin`, `page_access`, `in_channel`). SQL completo en `replica/schema.sql`.

Decisiones clave:

- **Página = documento JSON del editor** (`pages.content`), no una tabla de bloques. Es más simple, rápido y encaja con BlockNote. Los comentarios inline se anclan al `block_id` del JSON.
- **Cada fila de la base de datos de tareas es una página** (`db_rows.page_id`), igual que en el original, así que cada tarea tiene contenido y comentarios propios.
- **Permisos heredados** por árbol, resueltos en `page_access(pid)`. Gana el nivel más amplio entre: permiso explícito en la página o un ancestro, `edit` para todos si nada en la cadena es privado, y `full` para el dueño o un admin.
- **Límite de 10 miembros** con trigger en base de datos.
- **Sin ciclos** al mover páginas (trigger recursivo).
- **Chat**: `channels.kind` ∈ `channel` (todo el espacio), `dm` (dos personas, `dm_key` único) y `page` (chat lateral de una página, visible para quien puede comentarla).
- **Idempotencia**: `messages.client_id` único por autor (reintento del cliente sin duplicar) y `notifications.dedupe_key`.

Verificado en Postgres 16 local: carga limpia y pruebas de límite, ciclo, herencia y RLS correctas.

## API

La mayoría de lecturas van directo del cliente a Supabase con RLS. Las escrituras con reglas de negocio pasan por **server actions** (marcadas *SA*) o rutas `/api`.

### F01 / F02: espacio e invitaciones
| método ruta | hace | quién | entrada | salida | flujo |
| --- | --- | --- | --- | --- | --- |
| SA createWorkspace | crea espacio, dueño, canal #general y página de bienvenida | usuario logueado | name | workspace | F01 |
| SA inviteMembers | crea invitaciones y envía emails | admin | emails[] | enviados, rechazados (límite) | F01 |
| GET /invite/[token] | muestra la invitación | público | token | válida / expirada / ya miembro | F02 |
| SA acceptInvite | agrega miembro y lo suma a #general | usuario con el email invitado | token | redirige al espacio | F02 |
| SA updateMemberRole / removeMember | cambia rol o saca miembro | admin | user_id, role | ok | S18 |

### F03 / F04 / F11: páginas
| método ruta | hace | quién | entrada | salida | flujo |
| --- | --- | --- | --- | --- | --- |
| select pages (Supabase) | árbol del sidebar | miembro (RLS) | workspace_id | páginas visibles | F04 |
| SA createPage | crea página (con padre opcional) | edit en el padre | parent_id?, title | page | F03 |
| SA savePage | guarda contenido, extrae `search_text`, crea versión cada 10 min de edición | edit | id, content, title | updated_at | F03 |
| SA lockPage / unlockPage | bloqueo suave (60 s renovable) mientras alguien edita | edit | id | holder | F03 |
| SA movePage | cambia padre y posición | edit en origen y destino | id, parent_id, position | ok / ciclo | F04 |
| SA archivePage / restorePage / deletePage | papelera | full | id | ok | F11 |
| select page_versions | historial | view | page_id | versiones | F11 |
| SA restoreVersion | restaura versión (guarda la actual antes) | edit | version_id | page | F11 |
| SA toggleFavorite | favorito | miembro | page_id | ok | F04 |
| POST /api/upload | URL firmada para subir archivo | edit | page_id, nombre, tamaño, mime | url | F03 |

### F05 / F06: colaboración y permisos
| método ruta | hace | quién | entrada | salida | flujo |
| --- | --- | --- | --- | --- | --- |
| SA createThread | abre hilo (de página o inline) + primer comentario | comment | page_id, block_id?, anchor?, body | thread | F05 |
| SA addComment / editComment / deleteComment | | comment / autor | | | F05 |
| SA resolveThread / reopenThread | | comment | thread_id | | F05 |
| SA toggleReaction | | quien ve el objeto | target, emoji | | F05, F08 |
| (servidor) notifyMentions | detecta @personas en comentarios, mensajes y páginas, y crea notificaciones solo para quien tiene acceso | interno | | | F05 |
| SA markRead / markAllRead | bandeja | dueño | ids | | S14 |
| SA setPageAccess | privada o todo el espacio | full | page_id, is_private | | F06 |
| SA grantPermission / revokePermission | nivel por persona | full | page_id, user_id, level | | F06 |

### F07: base de datos de tareas
| método ruta | hace | quién | entrada | salida | flujo |
| --- | --- | --- | --- | --- | --- |
| SA createDatabase | crea BD con propiedades por defecto (Estado, Responsable, Fecha) y vistas tabla, tablero y calendario | edit | page_id | database | F07 |
| SA addProperty / updateProperty / deleteProperty | | edit | | | F07 |
| SA createRow | fila + su página | edit | database_id, values | row | F07 |
| SA updateRowValues | cambia celdas; si cambia Responsable, notifica `assigned` | edit | row_id, patch | row | F07 |
| SA moveRow | orden o columna del tablero | edit | row_id, position, status | | F07 |
| SA saveView | filtros, orden y agrupación | edit | view_id, config | | F07 |

### F08 / F09: chat
| método ruta | hace | quién | entrada | salida | flujo |
| --- | --- | --- | --- | --- | --- |
| select channels + no leídos | lista del sidebar | miembro (RLS) | workspace_id | canales con contador | F08 |
| SA createChannel | canal nuevo | miembro | name | channel | F08 |
| SA openDM | busca o crea el DM | miembro | user_id | channel | F08 |
| SA openPageChat | busca o crea el chat lateral de una página | comment | page_id | channel | F09 |
| SA sendMessage | inserta mensaje (idempotente por `client_id`), detecta menciones y enlaces a páginas | in_channel | channel_id, body, client_id, parent_id? | message | F08 |
| SA editMessage / deleteMessage | borrado suave | autor | | | F08 |
| SA markChannelRead | actualiza `last_read_at` | miembro del canal | channel_id | | F08 |
| SA messageToTask | crea fila en la BD de tareas (o página) con el texto del mensaje y enlaza ambos | edit en la BD destino | message_id, database_id | row | F09 |
| Realtime: messages, presencia | entrega en vivo y "escribiendo…" | in_channel | | | F08 |

### F10: búsqueda
| método ruta | hace | quién | entrada | salida | flujo |
| --- | --- | --- | --- | --- | --- |
| GET /api/search?q= | busca en títulos y texto de páginas (pg_trgm), mensajes y personas; RLS filtra lo que no puedes ver | miembro | q | resultados agrupados | F10 |

Webhooks de entrada: ninguno en el MVP (pagos después).
Webhooks de salida: ninguno.

Jobs:
| nombre | horario | qué hace |
| --- | --- | --- |
| email-digest | cada hora; envía a las 9:00 hora local del usuario | resumen de menciones no leídas de más de 1 h (si `email_digest`) |
| purge-trash | diario 03:00 UTC | borra páginas archivadas hace más de 30 días y sus archivos |
| prune-versions | diario | deja una versión por hora en las últimas 48 h y una por día después |
| expire-locks | cada minuto (o perezoso al leer) | libera bloqueos vencidos |
| expire-invites | diario | marca invitaciones vencidas |

## Las partes que muerden

- **Editor**: es el 40% del riesgo. Usar BlockNote tal cual y no personalizar bloques en el MVP. Pegar desde Word/Google Docs tiene que funcionar razonablemente.
- **Coedición**: dos personas en la misma página. MVP con bloqueo suave ("Ana está editando, puedes comentar"). Fase 2: Yjs + Hocuspocus, guardando el estado Yjs junto al JSON.
- **Tiempo real del chat**: reconexión, mensajes enviados offline (cola local con `client_id`), orden por `created_at` del servidor y contadores de no leídos con `last_read_at`.
- **Permisos en todo lugar**: menciones, búsqueda, vistas previas de enlaces en el chat y notificaciones deben respetar `page_access`. Un enlace a página en el chat muestra "sin acceso" a quien no puede verla.
- **Rendimiento de `page_access`**: es recursiva por fila. Para 10 personas y unas miles de páginas está bien. Si crece, se materializa una tabla `page_ancestors`.
- **Zonas horarias**: fechas de tareas como fecha sin hora (`date`) en el JSON. Las horas se muestran en la zona del navegador y el resumen por email usa la zona del perfil.
- **Idempotencia**: reintentos de envío de mensajes (`client_id`) y notificaciones duplicadas (`dedupe_key`).
- **Carreras**: invitar al miembro 11 (trigger), mover páginas en paralelo (trigger de ciclos) y dos ediciones de la misma fila (último gana, con `updated_at` visible).
- **Archivos**: 25 MB por archivo, solo URLs firmadas y validación de mime en el servidor.
- **Multi-tenencia**: todo cuelga de `workspace_id`; RLS en todas las tablas y ninguna consulta con service role sin chequeo explícito.
- **Borrado de datos (Ley 19.628 / 21.719)**: eliminar cuenta borra el perfil. Los mensajes quedan como "usuario eliminado" y el espacio se puede exportar y borrar entero.

## Orden de construcción

1. **Rebanada vertical (feo, de punta a punta)**: login con enlace mágico → crear oficina → crear página → escribir → invitar compañero → el compañero la ve y responde en #general.
   Pantallas S01, S02, S03, S04, S06, S20. Tablas: profiles, workspaces, members, invites, pages, channels, channel_members, messages. Rutas: createWorkspace, inviteMembers, acceptInvite, createPage, savePage, sendMessage.
2. **Must**, por área:
   - Páginas y sidebar: árbol, arrastrar, privada/compartida, papelera (S04, S06, S07, S16).
   - Colaboración: comentarios de página e inline, resolver, @menciones, bandeja (S08, S14).
   - Permisos: compartir, herencia y roles (S09, S18).
   - Tareas: BD con tabla y tablero, fila como página (S10, S11, S13).
   - Chat: canales, DMs, no leídos, enlaces a páginas (S20, S21).
   - Búsqueda Ctrl+K (S15).
3. **Should**: calendario, filtros, historial, presencia, chat lateral en página, convertir mensaje en tarea, adjuntos, Google, resumen por email, responsive, coedición Yjs.
4. **Could**: menciones de fecha, reacciones, hilos en chat, estado en línea, plantillas, modo oscuro, app nativa.
5. **Arreglos de replica-entrepreneur**: se agregan cuando se lean las reseñas.

Estimación: rebanada vertical en ~1 semana; must en 3–4 semanas para una persona con Claude; should en 2–3 más.
