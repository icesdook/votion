# Recon map: Notion (web, escritorio vía navegador; móvil responsive)

Alcance: el núcleo colaborativo de Notion (páginas con bloques, árbol de páginas, una base de datos simple de tareas, comentarios/menciones/bandeja) **más un chat interno**, que Notion no tiene.
Para: oficinas de hasta 10 personas que quieren trabajar juntas en un solo lugar, sin curva de aprendizaje.
Fecha: 2026-10-26

> Supuesto: plataforma web primero (responsive para móvil). App nativa queda fuera del MVP.
> Supuesto: el recon se hizo solo con fuentes públicas (centro de ayuda, precios, releases). No se usó la cuenta del usuario.

## Fuentes

| # | fuente | URL | notas |
| --- | --- | --- | --- |
| 1 | ayuda: comentarios, menciones y reacciones | https://www.notion.com/help/comments-mentions-and-reminders | comentarios de página e inline, panel de comentarios, resolver, @personas/@páginas/@fechas, reacciones, Inbox |
| 2 | ayuda: compartir y permisos | https://www.notion.com/help/sharing-and-permissions | 6 niveles de acceso, herencia de permisos, teamspaces, invitados, publicar en la web |
| 3 | guía: tipos de vista de base de datos | https://www.notion.com/da/help/guides/when-to-use-each-type-of-database-view | tabla, tablero, cronograma, calendario, lista, galería |
| 4 | categoría de ayuda: vistas | https://www.notion.com/help/category/database-views/all | índice de artículos de vistas |
| 5 | precios (comparativa externa, verificada ago 2026) | https://tinycommand.com/blogs/notion-pricing-2026 | Free / Plus USD 12-16 / Business USD 18-22 / Enterprise; IA como add-on de USD 10 |
| 6 | releases | https://www.notion.com/en-gb/releases/2026-07-08 | foco reciente en agentes de IA (3.7, 3.8, oct 2026). Sin chat interno |
| 7 | API pública: comentarios | https://developers.notion.com/guides/data-apis/working-with-comments | confirma modelo de hilos de comentarios |
| 8 | API pública: vistas | https://developers.notion.com/guides/data-apis/working-with-views | confirma modelo de vistas sobre una base de datos |

Lectura del precio: lo que Notion cobra en Plus/Business es historial ilimitado, invitados, permisos avanzados y teamspaces privados. Para 10 personas, Plus cuesta ~USD 120-160/mes y la IA va aparte. Hay espacio para un precio plano por oficina.

## Ciclo central

Un equipo escribe y organiza su trabajo en páginas compartidas, y conversa sobre él (comentarios en la página + chat del equipo) sin salir de la herramienta.

## Pantallas

| ID | pantalla | ruta / cómo se llega | propósito | componentes clave | estados vistos |
| --- | --- | --- | --- | --- | --- |
| S01 | Registro / inicio de sesión | /login | entrar con email (enlace mágico) o Google | input, botón, separador | vacío, error, enviando, enlace enviado |
| S02 | Crear espacio de trabajo | primer login | nombre de la oficina, invitar compañeros | input, lista de emails, botón | vacío, invitaciones enviadas, error de email |
| S03 | Aceptar invitación | /invite/:token | unirse a un espacio | tarjeta, botón | válida, expirada, ya miembro |
| S04 | Shell de la app | /w/:espacio | sidebar + área principal | sidebar, árbol, buscador, avatar | cargando, móvil (sidebar colapsable) |
| S05 | Inicio / bienvenida | /w/:espacio/home | páginas recientes, actividad, accesos rápidos | tarjetas, lista | vacío (primer día), lleno |
| S06 | Página (editor) | /p/:id | escribir con bloques | editor, menú /, menú de bloque, portada, ícono, breadcrumbs | vacía (placeholder), llena, solo lectura, sin permiso, borrada |
| S07 | Menú de comandos "/" | escribir / en el editor | insertar bloques | popover, lista filtrable | filtrando, sin resultados |
| S08 | Panel de comentarios | botón en la página | ver/filtrar hilos de la página | hilo, input, filtro abierto/resuelto | vacío, con hilos, resueltos |
| S09 | Compartir página | botón Compartir | acceso por persona y general | popover, select de nivel, lista de miembros | privada, todo el espacio, enlace público |
| S10 | Base de datos: tabla | bloque o página de BD | ver tareas en filas | tabla, celdas por tipo de propiedad, "+ nueva" | vacía, llena, filtrada sin resultados |
| S11 | Base de datos: tablero | pestaña de vista | tareas como tarjetas por estado | columnas, tarjetas arrastrables | vacía, llena, arrastrando |
| S12 | Base de datos: calendario | pestaña de vista | tareas por fecha | grilla de mes, chips | mes vacío, lleno |
| S13 | Fila abierta como página | clic en fila/tarjeta | propiedades + contenido + comentarios | panel lateral o modal, propiedades | nueva, llena |
| S14 | Bandeja (Inbox) | ícono campana | menciones, respuestas, asignaciones | lista, filtro, marcar leído | vacía, con no leídos |
| S15 | Búsqueda rápida | Ctrl/Cmd+K | saltar a páginas, mensajes, personas | modal, lista de resultados | vacía, resultados, sin resultados |
| S16 | Papelera | sidebar | restaurar o borrar definitivo | lista, botones | vacía, llena |
| S17 | Historial de página | menú de página | ver/restaurar versiones | lista de versiones, vista previa | una versión, varias |
| S18 | Ajustes del espacio | sidebar | miembros, roles, invitar, nombre/logo | tabs, tabla de miembros | 1 miembro, lleno, límite de 10 alcanzado |
| S19 | Perfil / preferencias | avatar | nombre, foto, notificaciones, tema | formulario | — |
| S20 | **Chat: canales** *(nuevo, no existe en Notion)* | sidebar > Chat | conversación del equipo por canal (#general, #proyecto) | lista de canales, hilo de mensajes, input, reacciones | vacío, lleno, escribiendo..., sin conexión |
| S21 | **Chat: mensajes directos** *(nuevo)* | clic en un compañero | conversación 1 a 1 | igual que S20 + estado en línea | vacío, lleno |
| S22 | **Chat: panel lateral en página** *(nuevo)* | botón "Conversar" en S06 | hablar de una página sin salir de ella | dock lateral | vacío, lleno |

Total: 22 pantallas (19 de Notion, 3 nuevas de chat).

## Flujos

```
F01 Crear la oficina e invitar al equipo
    S01 -> S02 -> S05
    clics camino feliz: 5 (email, enlace, nombre, emails, crear)
    borde: email ya registrado, invitación a email inválido, superar 10 personas

F02 Compañero se une por invitación
    S03 -> S04 -> S05
    clics: 2
    borde: invitación expirada, ya es miembro, entra con otra cuenta

F03 Crear y escribir una página
    S04 (+ nueva página) -> S06 -> S07 -> S06
    clics: 2 + escribir
    borde: título vacío, pegar texto con formato, pérdida de conexión al escribir

F04 Organizar páginas (anidar, mover, favoritos)
    S04 sidebar: arrastrar página dentro de otra
    clics: 1 arrastre
    borde: mover una página dentro de su propia subpágina, mover a sección privada

F05 Comentar y mencionar a un compañero
    S06 (seleccionar texto) -> comentario -> @persona -> S14 del compañero
    clics: 3
    borde: mencionar a alguien sin acceso, editar/borrar comentario, resolver y reabrir

F06 Compartir una página
    S06 -> S09 -> elegir nivel
    clics: 3
    borde: quitar acceso a sí mismo, subpáginas heredan, enlace público desactivado

F07 Gestionar tareas del equipo
    S06 (/tabla) -> S10 -> nueva fila -> asignar persona + fecha + estado -> S11 arrastrar
    clics: ~6
    borde: tarea sin fecha en calendario, filtro sin resultados, borrar propiedad usada

F08 Chatear con el equipo  (nuevo)
    S04 -> S20 -> escribir -> enviar
    clics: 2
    borde: mensaje mientras offline, editar/borrar mensaje, mención @todos

F09 Pasar de una conversación a una página y viceversa  (nuevo, el diferenciador)
    S20 mensaje -> "convertir en tarea/página" -> S13
    S06 -> S22 conversar sobre la página
    clics: 2
    borde: página borrada después de enlazarla en el chat, usuario sin acceso a la página enlazada

F10 Encontrar algo
    Ctrl+K -> S15 -> resultado
    clics: 1 + escribir
    borde: resultados en páginas sin permiso (no deben aparecer)

F11 Recuperar algo borrado o una versión anterior
    S16 o S17 -> restaurar
    clics: 2
```

Número a superar: crear y compartir una página con el equipo en ≤ 3 clics.

## Componentes

| componente | variantes | estados | usado en |
| --- | --- | --- | --- |
| Botón | primario, secundario, fantasma, peligro, ícono | normal, hover, foco, deshabilitado, cargando | todas |
| Input de texto | normal, búsqueda, con ícono | vacío, foco, error, deshabilitado | S01, S02, S15, S18-S21 |
| Sidebar | expandido, colapsado, móvil (drawer) | — | S04 |
| Árbol de páginas | ítem, ítem con hijos, favorito | normal, hover, activo, arrastrando, renombrando | S04 |
| Editor de bloques | — | vacío con placeholder, editando, solo lectura | S06, S13 |
| Bloques | texto, H1-H3, lista, lista numerada, checklist, toggle, cita, callout, divisor, código, imagen, archivo, enlace a página, tabla de BD | normal, seleccionado, arrastrando | S06 |
| Menú de comandos (/) | — | filtrando, vacío | S07 |
| Popover / menú contextual | menú de bloque, compartir, más opciones | abierto | S06, S09 |
| Modal / panel lateral | modal centrado, peek lateral | abierto, cerrando | S13, S15 |
| Avatar | usuario, grupo apilado, con estado en línea | en línea, ausente | S04, S09, S18, S20, S21 |
| Hilo de comentarios | inline, de página | abierto, resuelto | S06, S08, S13 |
| Mención | persona, página, fecha | normal, sin acceso | editor, comentarios, chat |
| Reacción emoji | — | propia, de otros | comentarios, chat |
| Tabla de BD | celdas: texto, select, estado, persona, fecha, checkbox, número | editando, ordenada, filtrada | S10 |
| Tarjeta de tablero | — | normal, arrastrando | S11 |
| Grilla de calendario | mes | hoy, con eventos | S12 |
| Mensaje de chat | propio, ajeno, agrupado, del sistema | enviando, enviado, editado, error | S20-S22 |
| Input de chat | — | vacío, escribiendo, con adjunto | S20-S22 |
| Toast | info, éxito, error, deshacer | — | todas |
| Badge de no leídos | — | — | S04, S14, S20 |
| Estado vacío | ilustración + texto + acción | — | S05, S10, S14, S16, S20 |

## Modelo de datos inferido

```
Workspace   id, name, icon, created_at, member_limit (10)
            evidencia: S02, S18, ayuda de compartir ("Everyone at [workspace]")
            confianza: alta

Member      workspace_id, user_id, role (owner | admin | member), joined_at
            evidencia: S18, ayuda de compartir (owners, admins, members, guests)
            confianza: alta (invitados quedan fuera del MVP)

User        id, email, name, avatar_url
            confianza: alta

Invite      id, workspace_id, email, token, expires_at, accepted_at
            evidencia: S03; supuesto
            confianza: media

Page        id, workspace_id, parent_id (nullable, árbol), title, icon, cover,
            is_private, owner_id, position, archived_at, created_by, updated_at
            evidencia: S04 árbol, S06, ayuda "subpages inherit parent permissions"
            confianza: alta

Block       id, page_id, parent_block_id, type, content (json), position
            evidencia: S06/S07, API pública
            confianza: alta (Notion modela todo como bloques; el clon puede guardar
            el documento como un JSON de editor por página, que es más simple)

PagePermission  page_id, user_id | general, level (full | edit | comment | view)
            evidencia: ayuda de compartir (6 niveles; el MVP usa 4)
            confianza: alta

PageVersion id, page_id, snapshot (json), created_by, created_at
            evidencia: S17, precios (historial 7 días gratis / ilimitado pagado)
            confianza: media

Database    id, page_id, name
Property    id, database_id, name, type (text|select|status|person|date|checkbox|number), options (json), position
Row         id, database_id, page_id (cada fila es una página), values (json)
View        id, database_id, type (table|board|calendar), filters, sorts, group_by
            evidencia: guía de vistas, API de vistas
            confianza: alta

CommentThread id, page_id, block_id (nullable = de página), anchor (json), resolved_at
Comment     id, thread_id, author_id, body, created_at, edited_at
Reaction    target_type (comment|message), target_id, user_id, emoji
            evidencia: ayuda de comentarios, API de comentarios
            confianza: alta

Mention     source_type, source_id, mentioned_user_id | page_id
Notification id, user_id, kind (mention|reply|assigned|invite), source, read_at
            evidencia: ayuda de comentarios (Inbox)
            confianza: alta

Channel     id, workspace_id, name, kind (channel|dm), created_by      (nuevo)
ChannelMember channel_id, user_id, last_read_at                         (nuevo)
Message     id, channel_id, author_id, body, parent_id (hilo), page_id (si es chat de página),
            created_at, edited_at, deleted_at                           (nuevo)
            evidencia: no existe en Notion; diseño propio
            confianza: supuesto (diseño propio)
```

Relaciones: Workspace 1-n Member, Workspace 1-n Page, Page 1-n Page (hijos), Page 1-1 Database (opcional), Database 1-n Row (cada una es Page), Page 1-n CommentThread 1-n Comment, Workspace 1-n Channel 1-n Message, Message n-1 Page (enlace opcional), User 1-n Notification.

## Matriz de funciones

Ver `features.csv`. Must: 28, should: 18, could: 9, skip: 8 (63 filas; 8 son nuevas de chat).

## Fuera de alcance (no se puede o no conviene clonar)

- Notion AI y los agentes (3.7, 3.8): es un producto aparte, con costo por modelo. Queda como "could" a futuro con un proveedor propio.
- Galería de plantillas de la comunidad y el marketplace: es contenido y red de terceros.
- Integraciones con apps de terceros (Slack, GitHub, etc.): la red de socios de Notion no se puede clonar.
- Notion Sites / publicar en la web con dominio: fuera del enfoque de oficina interna.
- SSO SAML, auditoría, controles Enterprise: no aplican a 10 personas.
- La marca, el editor, los textos y los íconos de Notion: se reconstruye el comportamiento, no el contenido.
- Invitados externos y teamspaces múltiples: innecesarios para una sola oficina pequeña (should/could más adelante).

## Tamaño

Pantallas 22, flujos 11, entidades 17.
Partes difíciles:
1. **Editor de bloques** (anidación, arrastrar, menú /, pegar con formato). Se resuelve usando un editor abierto (TipTap/ProseMirror o BlockNote) en vez de escribirlo desde cero.
2. **Tiempo real**: chat en vivo, presencia y que dos personas editen la misma página. El chat en vivo es must; la coedición simultánea al carácter (CRDT) es should, con bloqueo suave por página como MVP.
3. **Permisos con herencia** sobre el árbol de páginas, aplicados también en búsqueda y menciones.

Tamaño: **L** para todo; **M** (unas semanas) para el MVP recortado con los must.
