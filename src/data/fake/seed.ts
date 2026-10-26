// Datos de ejemplo para desarrollo. Todo el texto es propio.
import type { DB, DbProperty, Page, PageContent } from "../types";

const t = (minAgo: number) => new Date(Date.now() - minAgo * 60_000).toISOString();
const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

const P = (text: string, id?: string) => ({ id, type: "paragraph", content: [{ type: "text", text, styles: {} }] });
const H = (text: string, level: 1 | 2 | 3, id?: string) => ({ id, type: "heading", props: { level }, content: [{ type: "text", text, styles: {} }] });
const LI = (text: string) => ({ type: "bulletListItem", content: [{ type: "text", text, styles: {} }] });
const CHK = (text: string, checked = false) => ({ type: "checkListItem", props: { checked }, content: [{ type: "text", text, styles: {} }] });

export const DEMO = {
  ws: "ws-demo",
  camila: "u-camila",
  matias: "u-matias",
  javiera: "u-javiera",
  tomas: "u-tomas",
  valentina: "u-valentina",
};

function plain(content: PageContent) {
  return (content as { content?: { text?: string }[] }[])
    .map((b) => (b.content ?? []).map((c) => c.text ?? "").join(""))
    .join(" ");
}

export function seed(): DB {
  const { ws, camila, matias, javiera, tomas, valentina } = DEMO;
  const people = [
    [camila, "Camila Rojas", "camila@oficina.demo"],
    [matias, "Matías Soto", "matias@oficina.demo"],
    [javiera, "Javiera Muñoz", "javiera@oficina.demo"],
    [tomas, "Tomás Fuentes", "tomas@oficina.demo"],
    [valentina, "Valentina Díaz", "valentina@oficina.demo"],
  ] as const;

  const page = (p: Partial<Page> & Pick<Page, "id" | "title">): Page => {
    const content = p.content ?? [];
    return {
      workspaceId: ws,
      parentId: null,
      icon: null,
      searchText: plain(content),
      isPrivate: false,
      ownerId: camila,
      position: 0,
      isDatabaseRow: false,
      createdBy: camila,
      createdAt: t(60 * 24 * 5),
      updatedAt: t(90),
      ...p,
      content,
    };
  };

  const welcome = page({
    id: "p-bienvenida",
    title: "Bienvenida al equipo",
    icon: "👋",
    position: 1,
    content: [
      P("Este es el lugar donde escribimos, organizamos el trabajo y conversamos. Todo queda junto y a mano."),
      H("Para partir", 2),
      CHK("Completa tu perfil con nombre y foto", true),
      CHK("Escribe un saludo en #general"),
      CHK("Revisa las tareas asignadas a ti en Tareas del equipo"),
      H("Atajos útiles", 2),
      LI("Escribe / para agregar títulos, listas, casillas o una tabla de tareas."),
      LI("Escribe @ para nombrar a un compañero; le llega un aviso."),
      LI("Ctrl + K para buscar cualquier cosa."),
    ],
  });

  const manual = page({
    id: "p-manual",
    title: "Manual de la oficina",
    icon: "📘",
    position: 2,
    ownerId: matias,
    createdBy: matias,
    content: [
      P("Acuerdos básicos para trabajar bien juntos.", "b-manual-intro"),
      H("Horario", 2),
      P("La oficina abre de 9:00 a 18:00. Los viernes salimos a las 17:00.", "b-manual-horario"),
      H("Reuniones", 2),
      P("Reunión de equipo los lunes a las 10:00. Cada uno trae sus tres prioridades de la semana.", "b-manual-reuniones"),
    ],
  });

  const vacaciones = page({
    id: "p-vacaciones",
    title: "Vacaciones y permisos",
    icon: "🏖️",
    parentId: manual.id,
    position: 1,
    ownerId: matias,
    createdBy: matias,
    content: [P("Pide tus vacaciones con dos semanas de anticipación y anótalas en el calendario de tareas.")],
  });

  const tareasPage = page({
    id: "p-tareas",
    title: "Tareas del equipo",
    icon: "✅",
    position: 3,
    content: [],
  });

  const reunion = page({
    id: "p-notas-camila",
    title: "Notas personales",
    icon: "🔒",
    position: 4,
    isPrivate: true,
    content: [P("Ideas para la próxima reunión con clientes.")],
  });

  const dbId = "db-tareas";
  const props: DbProperty[] = [
    {
      id: "prop-estado",
      databaseId: dbId,
      name: "Estado",
      type: "status",
      position: 1,
      options: [
        { id: "st-todo", label: "Por hacer", color: "gray" },
        { id: "st-doing", label: "En curso", color: "blue" },
        { id: "st-done", label: "Listo", color: "green" },
      ],
    },
    { id: "prop-resp", databaseId: dbId, name: "Responsable", type: "person", position: 2, options: [] },
    { id: "prop-fecha", databaseId: dbId, name: "Fecha", type: "date", position: 3, options: [] },
    {
      id: "prop-prio",
      databaseId: dbId,
      name: "Prioridad",
      type: "select",
      position: 4,
      options: [
        { id: "pr-alta", label: "Alta", color: "red" },
        { id: "pr-media", label: "Media", color: "yellow" },
        { id: "pr-baja", label: "Baja", color: "gray" },
      ],
    },
  ];

  const rowsData: [string, string, string, number, string][] = [
    ["Preparar propuesta para cliente nuevo", "st-doing", javiera, 2, "pr-alta"],
    ["Ordenar archivos del trimestre", "st-todo", tomas, 5, "pr-baja"],
    ["Actualizar el manual con el horario de verano", "st-todo", matias, 9, "pr-media"],
    ["Cotizar sillas para la sala de reuniones", "st-doing", valentina, 1, "pr-media"],
    ["Enviar resumen mensual", "st-done", camila, -3, "pr-alta"],
    ["Revisar contrato de arriendo", "st-todo", camila, 12, "pr-alta"],
  ];
  const rowPages: Page[] = [];
  const rows = rowsData.map(([title, st, resp, d, pr], i) => {
    const pid = `p-row-${i}`;
    rowPages.push(page({ id: pid, title, parentId: tareasPage.id, position: i, isDatabaseRow: true, content: [] }));
    return {
      id: `row-${i}`,
      databaseId: dbId,
      pageId: pid,
      values: { "prop-estado": st, "prop-resp": resp, "prop-fecha": day(d), "prop-prio": pr },
      position: i,
      createdAt: t(60 * 24 * 3),
      updatedAt: t(60),
    };
  });

  return {
    profiles: people.map(([id, name, email]) => ({ id, name, email, avatarUrl: null, theme: "system", emailDigest: true })),
    workspaces: [{ id: ws, name: "Oficina Demo", icon: "🏢", memberLimit: 10, createdBy: camila, createdAt: t(60 * 24 * 7) }],
    members: people.map(([id], i) => ({
      workspaceId: ws,
      userId: id,
      role: i === 0 ? "owner" : i === 1 ? "admin" : "member",
      joinedAt: t(60 * 24 * (7 - i)),
    })),
    invites: [],
    pages: [welcome, manual, vacaciones, tareasPage, reunion, ...rowPages],
    pagePermissions: [],
    pageVersions: [],
    favorites: [{ userId: camila, pageId: tareasPage.id, position: 1 }],
    databases: [{ id: dbId, pageId: tareasPage.id, name: "Tareas del equipo" }],
    dbProperties: props,
    dbRows: rows,
    dbViews: [
      { id: "v-tabla", databaseId: dbId, name: "Tabla", type: "table", config: {}, position: 1 },
      { id: "v-tablero", databaseId: dbId, name: "Tablero", type: "board", config: { groupBy: "prop-estado" }, position: 2 },
      { id: "v-cal", databaseId: dbId, name: "Calendario", type: "calendar", config: { dateProperty: "prop-fecha" }, position: 3 },
    ],
    commentThreads: [
      { id: "th-1", pageId: manual.id, blockId: "b-manual-horario", anchor: { quote: "Los viernes salimos a las 17:00." }, createdBy: javiera, createdAt: t(300) },
    ],
    comments: [
      { id: "cm-1", threadId: "th-1", authorId: javiera, body: [{ t: "text", v: "¿Esto aplica también en verano? " }, { t: "user", id: matias }], createdAt: t(300) },
      { id: "cm-2", threadId: "th-1", authorId: matias, body: [{ t: "text", v: "Sí, todo el año. Lo dejo más claro en el texto." }], createdAt: t(240) },
    ],
    channels: [
      { id: "ch-general", workspaceId: ws, kind: "channel", name: "general", createdBy: camila, createdAt: t(60 * 24 * 7) },
      { id: "ch-proyectos", workspaceId: ws, kind: "channel", name: "proyectos", createdBy: matias, createdAt: t(60 * 24 * 6) },
      { id: "ch-dm-cm", workspaceId: ws, kind: "dm", dmKey: [camila, matias].sort().join(":"), createdBy: camila, createdAt: t(60 * 24 * 2) },
    ],
    channelMembers: [
      ...people.map(([id]) => ({ channelId: "ch-general", userId: id, lastReadAt: id === camila ? t(200) : t(0), muted: false })),
      ...people.map(([id]) => ({ channelId: "ch-proyectos", userId: id, lastReadAt: t(0), muted: false })),
      { channelId: "ch-dm-cm", userId: camila, lastReadAt: t(500), muted: false },
      { channelId: "ch-dm-cm", userId: matias, lastReadAt: t(0), muted: false },
    ],
    messages: [
      { id: "m-1", channelId: "ch-general", authorId: null, body: [{ t: "text", v: "Camila Rojas creó la oficina." }], createdAt: t(60 * 24 * 7) },
      { id: "m-2", channelId: "ch-general", authorId: camila, body: [{ t: "text", v: "¡Hola a todos! Desde hoy usamos este espacio. Partan por " }, { t: "page", id: "p-bienvenida" }], createdAt: t(60 * 24 * 7 - 5) },
      { id: "m-3", channelId: "ch-general", authorId: tomas, body: [{ t: "text", v: "Buenísimo, ya completé mi perfil." }], createdAt: t(400) },
      { id: "m-4", channelId: "ch-general", authorId: valentina, body: [{ t: "text", v: "Encontré dos proveedores de sillas, mañana comparto la cotización." }], createdAt: t(150) },
      { id: "m-5", channelId: "ch-general", authorId: javiera, body: [{ t: "user", id: camila }, { t: "text", v: " ¿revisamos la propuesta antes del almuerzo?" }], createdAt: t(30) },
      { id: "m-6", channelId: "ch-proyectos", authorId: matias, body: [{ t: "text", v: "Dejé las tareas de la semana en " }, { t: "page", id: "p-tareas" }], createdAt: t(600) },
      { id: "m-7", channelId: "ch-dm-cm", authorId: matias, body: [{ t: "text", v: "Te dejé un comentario en el manual, cuando puedas lo miras." }], createdAt: t(230) },
    ],
    reactions: [
      { id: "r-1", targetType: "message", targetId: "m-2", userId: tomas, emoji: "🎉" },
      { id: "r-2", targetType: "message", targetId: "m-2", userId: valentina, emoji: "🎉" },
      { id: "r-3", targetType: "message", targetId: "m-4", userId: camila, emoji: "👍" },
    ],
    notifications: [
      { id: "n-1", userId: camila, workspaceId: ws, kind: "mention", actorId: javiera, channelId: "ch-general", messageId: "m-5", createdAt: t(30) },
      { id: "n-2", userId: camila, workspaceId: ws, kind: "dm", actorId: matias, channelId: "ch-dm-cm", messageId: "m-7", createdAt: t(230) },
      { id: "n-3", userId: matias, workspaceId: ws, kind: "mention", actorId: javiera, pageId: manual.id, threadId: "th-1", createdAt: t(300) },
    ],
  };
}
