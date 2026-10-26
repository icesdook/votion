// API de datos del clon. Hoy usa la capa falsa (localStorage); replica-backend
// reemplaza los cuerpos por llamadas a Supabase/server actions con LAS MISMAS firmas.
import { canChannel, isAdmin, isMember, LEVEL, pageAccess } from "./access";
import { getDB, getSessionUserId, latency, mutate, now, setSessionUserId, uid } from "./fake/store";
import {
  type AccessLevel,
  type CellValue,
  type Channel,
  type DB,
  DomainError,
  type ID,
  type Message,
  type Notification,
  type Page,
  type PageContent,
  type PropertyType,
  type RichText,
  type Role,
  type ViewConfig,
  type ViewType,
} from "./types";

// ---------------------------------------------------------------- utilidades
function me(): ID {
  const id = getSessionUserId();
  if (!id) throw new DomainError("forbidden", "Sin sesión");
  return id;
}

function mustPage(db: DB, id: ID) {
  const p = db.pages.find((x) => x.id === id);
  if (!p) throw new DomainError("not_found");
  return p;
}

function requireLevel(db: DB, pageId: ID, userId: ID, min: number) {
  if (pageAccess(db, pageId, userId) < min) throw new DomainError("forbidden");
}

function notify(db: DB, n: Omit<Notification, "id" | "createdAt">) {
  if (n.userId === n.actorId) return;
  if (n.dedupeKey && db.notifications.some((x) => x.userId === n.userId && x.dedupeKey === n.dedupeKey)) return;
  db.notifications.push({ ...n, id: uid(), createdAt: now() });
}

export function richMentions(body: RichText): ID[] {
  return [...new Set(body.filter((n) => n.t === "user").map((n) => (n as { id: ID }).id))];
}

export function richPlain(db: DB | null, body: RichText): string {
  return body
    .map((n) => {
      if (n.t === "text") return n.v;
      if (n.t === "br") return "\n";
      if (n.t === "user") return "@" + (db?.profiles.find((p) => p.id === n.id)?.name ?? "persona");
      return db?.pages.find((p) => p.id === n.id)?.title || "página";
    })
    .join("");
}

type BlockLike = { type?: string; text?: string; props?: Record<string, unknown>; content?: unknown; children?: unknown };

/** Recorre el documento del editor: texto plano y menciones a personas. */
export function scanContent(content: PageContent) {
  const text: string[] = [];
  const users = new Set<ID>();
  const walk = (nodes: unknown) => {
    if (!Array.isArray(nodes)) return;
    for (const raw of nodes) {
      const n = raw as BlockLike;
      if (n.type === "text" && typeof n.text === "string") text.push(n.text);
      if (n.type === "mention" && n.props?.userId) users.add(String(n.props.userId));
      if (Array.isArray(n.content)) walk(n.content);
      else if (n.content && typeof n.content === "object") walk((n.content as { rows?: unknown }).rows ?? []);
      if (Array.isArray(n.children)) walk(n.children);
    }
  };
  walk(content);
  return { text: text.join(" ").replace(/\s+/g, " ").trim(), users: [...users] };
}

function workspaceOf(db: DB, userId: ID) {
  const m = db.members.find((x) => x.userId === userId);
  return m ? db.workspaces.find((w) => w.id === m.workspaceId) ?? null : null;
}

function nextPosition(db: DB, parentId: ID | null, workspaceId: ID) {
  const sib = db.pages.filter((p) => p.parentId === parentId && p.workspaceId === workspaceId);
  return sib.length ? Math.max(...sib.map((p) => p.position)) + 1 : 1;
}

function systemMessage(db: DB, channelId: ID, text: string) {
  db.messages.push({ id: uid(), channelId, authorId: null, body: [{ t: "text", v: text }], createdAt: now() });
}

// ---------------------------------------------------------------- sesión y auth (F01, F02)
/** Enlace mágico simulado: en producción envía un email; aquí devuelve el usuario. */
export async function signInWithEmail(email: string) {
  await latency(300);
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new DomainError("invalid", "Revisa el correo.");
  return mutate((db) => {
    let p = db.profiles.find((x) => x.email === clean);
    if (!p) {
      p = { id: uid(), email: clean, name: "", avatarUrl: null, theme: "system", emailDigest: true };
      db.profiles.push(p);
    }
    return p;
  });
}

export function completeSignIn(userId: ID) {
  setSessionUserId(userId);
}

export function signOut() {
  setSessionUserId(null);
}

export async function createWorkspace(name: string, ownerName: string) {
  await latency();
  const userId = me();
  const clean = name.trim();
  if (!clean || clean.length > 80) throw new DomainError("invalid", "El nombre debe tener entre 1 y 80 caracteres.");
  return mutate((db) => {
    if (workspaceOf(db, userId)) throw new DomainError("already_member", "Ya perteneces a una oficina.");
    const prof = db.profiles.find((p) => p.id === userId)!;
    if (ownerName.trim()) prof.name = ownerName.trim();
    const ws = { id: uid(), name: clean, icon: null, memberLimit: 10, createdBy: userId, createdAt: now() };
    db.workspaces.push(ws);
    db.members.push({ workspaceId: ws.id, userId, role: "owner", joinedAt: now() });
    const general: Channel = { id: uid(), workspaceId: ws.id, kind: "channel", name: "general", createdBy: userId, createdAt: now() };
    db.channels.push(general);
    db.channelMembers.push({ channelId: general.id, userId, lastReadAt: now(), muted: false });
    systemMessage(db, general.id, `${prof.name || "Alguien"} creó la oficina.`);
    db.pages.push({
      id: uid(),
      workspaceId: ws.id,
      parentId: null,
      title: "Primeros pasos",
      icon: "👋",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Escribe aquí lo que tu equipo necesita saber. Presiona / para agregar listas, títulos o una tabla de tareas.", styles: {} }] },
      ],
      searchText: "Escribe aquí lo que tu equipo necesita saber.",
      isPrivate: false,
      ownerId: userId,
      position: 1,
      isDatabaseRow: false,
      createdBy: userId,
      createdAt: now(),
      updatedAt: now(),
    });
    return ws;
  });
}

export async function inviteMembers(emails: string[]) {
  await latency(250);
  const userId = me();
  return mutate((db) => {
    const ws = workspaceOf(db, userId);
    if (!ws || !isAdmin(db, ws.id, userId)) throw new DomainError("forbidden");
    const current = db.members.filter((m) => m.workspaceId === ws.id).length;
    const open = db.invites.filter((i) => i.workspaceId === ws.id && !i.acceptedAt && i.expiresAt > now()).length;
    let room = ws.memberLimit - current - open;
    const sent: string[] = [];
    const rejected: { email: string; reason: string }[] = [];
    for (const raw of emails) {
      const email = raw.trim().toLowerCase();
      if (!email) continue;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        rejected.push({ email, reason: "Correo no válido" });
        continue;
      }
      const prof = db.profiles.find((p) => p.email === email);
      if (prof && isMember(db, ws.id, prof.id)) {
        rejected.push({ email, reason: "Ya es parte de la oficina" });
        continue;
      }
      if (db.invites.some((i) => i.workspaceId === ws.id && i.email === email && !i.acceptedAt && i.expiresAt > now())) {
        rejected.push({ email, reason: "Ya tiene una invitación pendiente" });
        continue;
      }
      if (room <= 0) {
        rejected.push({ email, reason: `Se alcanzó el límite de ${ws.memberLimit} personas` });
        continue;
      }
      const token = uid().replace(/-/g, "");
      db.invites.push({
        id: uid(),
        workspaceId: ws.id,
        email,
        token,
        invitedBy: userId,
        expiresAt: new Date(Date.now() + 7 * 864e5).toISOString(),
        acceptedAt: null,
      });
      room--;
      sent.push(email);
    }
    return { sent, rejected };
  });
}

export function getInvite(token: string) {
  const db = getDB();
  const inv = db?.invites.find((i) => i.token === token);
  if (!db || !inv) return { status: "not_found" as const };
  const ws = db.workspaces.find((w) => w.id === inv.workspaceId)!;
  const inviter = db.profiles.find((p) => p.id === inv.invitedBy);
  if (inv.acceptedAt) return { status: "used" as const, ws, inviter, invite: inv };
  if (inv.expiresAt < now()) return { status: "expired" as const, ws, inviter, invite: inv };
  return { status: "valid" as const, ws, inviter, invite: inv };
}

export async function acceptInvite(token: string, name: string) {
  await latency();
  const userId = me();
  return mutate((db) => {
    const inv = db.invites.find((i) => i.token === token);
    if (!inv) throw new DomainError("not_found");
    if (inv.acceptedAt) throw new DomainError("invite_used");
    if (inv.expiresAt < now()) throw new DomainError("invite_expired");
    const prof = db.profiles.find((p) => p.id === userId)!;
    if (prof.email !== inv.email) throw new DomainError("forbidden", `Esta invitación es para ${inv.email}.`);
    if (isMember(db, inv.workspaceId, userId)) throw new DomainError("already_member");
    const ws = db.workspaces.find((w) => w.id === inv.workspaceId)!;
    if (db.members.filter((m) => m.workspaceId === ws.id).length >= ws.memberLimit) throw new DomainError("member_limit_reached");
    if (name.trim()) prof.name = name.trim();
    db.members.push({ workspaceId: ws.id, userId, role: "member", joinedAt: now() });
    inv.acceptedAt = now();
    for (const ch of db.channels.filter((c) => c.workspaceId === ws.id && c.kind === "channel" && !c.archivedAt)) {
      db.channelMembers.push({ channelId: ch.id, userId, lastReadAt: now(), muted: false });
    }
    const general = db.channels.find((c) => c.workspaceId === ws.id && c.kind === "channel" && c.name === "general");
    if (general) systemMessage(db, general.id, `${prof.name || prof.email} se unió a la oficina.`);
    return ws;
  });
}

export async function updateMemberRole(userId: ID, role: Exclude<Role, "owner">) {
  await latency();
  const actor = me();
  mutate((db) => {
    const ws = workspaceOf(db, actor);
    if (!ws || !isAdmin(db, ws.id, actor)) throw new DomainError("forbidden");
    const m = db.members.find((x) => x.workspaceId === ws.id && x.userId === userId);
    if (!m || m.role === "owner") throw new DomainError("forbidden", "No se puede cambiar el rol de la dueña o dueño.");
    m.role = role;
  });
}

export async function removeMember(userId: ID) {
  await latency();
  const actor = me();
  mutate((db) => {
    const ws = workspaceOf(db, actor);
    if (!ws) throw new DomainError("forbidden");
    if (actor !== userId && !isAdmin(db, ws.id, actor)) throw new DomainError("forbidden");
    const m = db.members.find((x) => x.workspaceId === ws.id && x.userId === userId);
    if (!m || m.role === "owner") throw new DomainError("forbidden", "La dueña o dueño no puede salir de la oficina.");
    db.members = db.members.filter((x) => x !== m);
    db.channelMembers = db.channelMembers.filter((cm) => !(cm.userId === userId && db.channels.find((c) => c.id === cm.channelId)?.workspaceId === ws.id));
  });
}

export async function revokeInvite(inviteId: ID) {
  const actor = me();
  mutate((db) => {
    const inv = db.invites.find((i) => i.id === inviteId);
    if (!inv || !isAdmin(db, inv.workspaceId, actor)) throw new DomainError("forbidden");
    db.invites = db.invites.filter((i) => i.id !== inviteId);
  });
}

export async function updateWorkspace(patch: { name?: string; icon?: string | null }) {
  const actor = me();
  mutate((db) => {
    const ws = workspaceOf(db, actor);
    if (!ws || !isAdmin(db, ws.id, actor)) throw new DomainError("forbidden");
    if (patch.name !== undefined) {
      const n = patch.name.trim();
      if (!n || n.length > 80) throw new DomainError("invalid", "El nombre debe tener entre 1 y 80 caracteres.");
      ws.name = n;
    }
    if (patch.icon !== undefined) ws.icon = patch.icon;
  });
}

export async function updateProfile(patch: { name?: string; theme?: "system" | "light" | "dark"; emailDigest?: boolean }) {
  const userId = me();
  mutate((db) => {
    const p = db.profiles.find((x) => x.id === userId)!;
    if (patch.name !== undefined) p.name = patch.name.trim().slice(0, 60);
    if (patch.theme) p.theme = patch.theme;
    if (patch.emailDigest !== undefined) p.emailDigest = patch.emailDigest;
  });
}

// ---------------------------------------------------------------- páginas (F03, F04, F11)
export async function createPage(opts: { parentId?: ID | null; title?: string; isPrivate?: boolean; content?: PageContent; icon?: string | null } = {}) {
  const userId = me();
  return mutate((db) => {
    const ws = workspaceOf(db, userId);
    if (!ws) throw new DomainError("forbidden");
    if (opts.parentId) requireLevel(db, opts.parentId, userId, LEVEL.edit);
    const content = opts.content ?? [];
    const p: Page = {
      id: uid(),
      workspaceId: ws.id,
      parentId: opts.parentId ?? null,
      title: (opts.title ?? "").slice(0, 200),
      icon: opts.icon ?? null,
      content,
      searchText: scanContent(content).text,
      isPrivate: opts.parentId ? false : !!opts.isPrivate,
      ownerId: userId,
      position: nextPosition(db, opts.parentId ?? null, ws.id),
      isDatabaseRow: false,
      createdBy: userId,
      updatedBy: userId,
      createdAt: now(),
      updatedAt: now(),
    };
    db.pages.push(p);
    return p;
  });
}

const VERSION_EVERY_MS = 10 * 60_000;

export async function savePage(id: ID, patch: { title?: string; content?: PageContent; icon?: string | null; fullWidth?: boolean }) {
  const userId = me();
  return mutate((db) => {
    const p = mustPage(db, id);
    requireLevel(db, id, userId, LEVEL.edit);
    if (p.lockedBy && p.lockedBy !== userId && p.lockedUntil && p.lockedUntil > now() && patch.content) {
      throw new DomainError("forbidden", "Otra persona está editando esta página.");
    }
    const lastVersion = db.pageVersions.filter((v) => v.pageId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (patch.content && (!lastVersion || Date.now() - Date.parse(lastVersion.createdAt) > VERSION_EVERY_MS)) {
      db.pageVersions.push({ id: uid(), pageId: id, title: p.title, content: p.content, createdBy: p.updatedBy ?? p.createdBy, createdAt: now() });
    }
    if (patch.title !== undefined) p.title = patch.title.slice(0, 200);
    if (patch.icon !== undefined) p.icon = patch.icon;
    if (patch.fullWidth !== undefined) p.fullWidth = patch.fullWidth;
    if (patch.content) {
      const before = new Set(scanContent(p.content).users);
      const scan = scanContent(patch.content);
      p.content = patch.content;
      p.searchText = scan.text;
      for (const u of scan.users) {
        if (before.has(u) || !isMember(db, p.workspaceId, u)) continue;
        if (pageAccess(db, id, u) < LEVEL.view) continue; // sin acceso, no se notifica
        notify(db, { userId: u, workspaceId: p.workspaceId, kind: "mention", actorId: userId, pageId: id, dedupeKey: `page:${id}:${u}` });
      }
    }
    p.updatedBy = userId;
    p.updatedAt = now();
    return p;
  });
}

const LOCK_MS = 60_000;
/** Bloqueo suave: true si este usuario puede editar ahora. */
export async function lockPage(id: ID) {
  const userId = me();
  return mutate((db) => {
    const p = mustPage(db, id);
    if (pageAccess(db, id, userId) < LEVEL.edit) return { ok: false, holder: null as ID | null };
    if (p.lockedBy && p.lockedBy !== userId && p.lockedUntil && p.lockedUntil > now()) return { ok: false, holder: p.lockedBy };
    p.lockedBy = userId;
    p.lockedUntil = new Date(Date.now() + LOCK_MS).toISOString();
    return { ok: true, holder: userId };
  });
}

export async function unlockPage(id: ID) {
  const userId = getSessionUserId();
  if (!userId) return;
  mutate((db) => {
    const p = db.pages.find((x) => x.id === id);
    if (p && p.lockedBy === userId) {
      p.lockedBy = null;
      p.lockedUntil = null;
    }
  });
}

export async function movePage(id: ID, parentId: ID | null, position: number, opts: { isPrivate?: boolean } = {}) {
  const userId = me();
  mutate((db) => {
    const p = mustPage(db, id);
    if (p.isDatabaseRow) throw new DomainError("invalid", "Las filas de una tabla se ordenan dentro de la tabla.");
    requireLevel(db, id, userId, LEVEL.edit);
    if (parentId) {
      requireLevel(db, parentId, userId, LEVEL.edit);
      let cur: Page | undefined = db.pages.find((x) => x.id === parentId);
      let guard = 0;
      while (cur && guard++ < 64) {
        if (cur.id === id) throw new DomainError("page_cycle", "No puedes mover una página dentro de sí misma.");
        cur = cur.parentId ? db.pages.find((x) => x.id === cur!.parentId) : undefined;
      }
    }
    p.parentId = parentId;
    p.position = position;
    if (!parentId && opts.isPrivate !== undefined) {
      if (opts.isPrivate && p.ownerId !== userId) throw new DomainError("forbidden", "Solo quien creó la página puede hacerla privada.");
      p.isPrivate = opts.isPrivate;
    }
    if (parentId) p.isPrivate = false; // la privacidad la define la raíz
    p.updatedAt = now();
  });
}

function subtree(db: DB, id: ID) {
  const ids = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const p of db.pages) {
      if (p.parentId && ids.has(p.parentId) && !ids.has(p.id)) {
        ids.add(p.id);
        grew = true;
      }
    }
  }
  return ids;
}

export async function archivePage(id: ID) {
  const userId = me();
  mutate((db) => {
    requireLevel(db, id, userId, LEVEL.edit);
    const ts = now();
    for (const pid of subtree(db, id)) {
      const p = db.pages.find((x) => x.id === pid)!;
      if (!p.archivedAt) p.archivedAt = ts;
    }
    db.favorites = db.favorites.filter((f) => f.pageId !== id);
  });
}

export async function restorePage(id: ID) {
  const userId = me();
  mutate((db) => {
    const root = mustPage(db, id);
    const ts = root.archivedAt;
    requireLevel(db, id, userId, LEVEL.edit);
    for (const pid of subtree(db, id)) {
      const p = db.pages.find((x) => x.id === pid)!;
      if (p.archivedAt === ts) p.archivedAt = null;
    }
    const parent = root.parentId ? db.pages.find((x) => x.id === root.parentId) : null;
    if (parent?.archivedAt) root.parentId = null; // el padre sigue en la papelera: vuelve a la raíz
  });
}

export async function deletePage(id: ID) {
  const userId = me();
  mutate((db) => {
    requireLevel(db, id, userId, LEVEL.full);
    const ids = subtree(db, id);
    const dbIds = new Set(db.databases.filter((d) => ids.has(d.pageId)).map((d) => d.id));
    const threadIds = new Set(db.commentThreads.filter((t) => ids.has(t.pageId)).map((t) => t.id));
    const chIds = new Set(db.channels.filter((c) => c.pageId && ids.has(c.pageId)).map((c) => c.id));
    db.pages = db.pages.filter((p) => !ids.has(p.id));
    db.pagePermissions = db.pagePermissions.filter((x) => !ids.has(x.pageId));
    db.pageVersions = db.pageVersions.filter((x) => !ids.has(x.pageId));
    db.favorites = db.favorites.filter((x) => !ids.has(x.pageId));
    db.databases = db.databases.filter((d) => !dbIds.has(d.id));
    db.dbProperties = db.dbProperties.filter((x) => !dbIds.has(x.databaseId));
    db.dbRows = db.dbRows.filter((x) => !dbIds.has(x.databaseId) && !ids.has(x.pageId));
    db.dbViews = db.dbViews.filter((x) => !dbIds.has(x.databaseId));
    db.commentThreads = db.commentThreads.filter((t) => !threadIds.has(t.id));
    db.comments = db.comments.filter((c) => !threadIds.has(c.threadId));
    db.channels = db.channels.filter((c) => !chIds.has(c.id));
    db.messages = db.messages.filter((m) => !chIds.has(m.channelId));
    for (const m of db.messages) if (m.linkedPageId && ids.has(m.linkedPageId)) m.linkedPageId = null;
    db.notifications = db.notifications.filter((n) => !(n.pageId && ids.has(n.pageId)));
  });
}

export async function restoreVersion(versionId: ID) {
  const userId = me();
  mutate((db) => {
    const v = db.pageVersions.find((x) => x.id === versionId);
    if (!v) throw new DomainError("not_found");
    const p = mustPage(db, v.pageId);
    requireLevel(db, p.id, userId, LEVEL.edit);
    db.pageVersions.push({ id: uid(), pageId: p.id, title: p.title, content: p.content, createdBy: userId, createdAt: now() });
    p.title = v.title;
    p.content = v.content;
    p.searchText = scanContent(v.content).text;
    p.updatedBy = userId;
    p.updatedAt = now();
  });
}

export async function toggleFavorite(pageId: ID) {
  const userId = me();
  mutate((db) => {
    const has = db.favorites.find((f) => f.userId === userId && f.pageId === pageId);
    if (has) db.favorites = db.favorites.filter((f) => f !== has);
    else db.favorites.push({ userId, pageId, position: Date.now() });
  });
}

// ---------------------------------------------------------------- permisos (F06)
export async function setPageAccess(pageId: ID, isPrivate: boolean) {
  const userId = me();
  mutate((db) => {
    const p = mustPage(db, pageId);
    requireLevel(db, pageId, userId, LEVEL.full);
    if (p.parentId) throw new DomainError("invalid", "Las subpáginas siguen el acceso de su página principal.");
    p.isPrivate = isPrivate;
  });
}

export async function grantPermission(pageId: ID, targetId: ID, level: AccessLevel) {
  const userId = me();
  mutate((db) => {
    const p = mustPage(db, pageId);
    requireLevel(db, pageId, userId, LEVEL.full);
    if (!isMember(db, p.workspaceId, targetId)) throw new DomainError("invalid");
    const ex = db.pagePermissions.find((x) => x.pageId === pageId && x.userId === targetId);
    if (ex) ex.level = level;
    else db.pagePermissions.push({ pageId, userId: targetId, level });
  });
}

export async function revokePermission(pageId: ID, targetId: ID) {
  const userId = me();
  mutate((db) => {
    requireLevel(db, pageId, userId, LEVEL.full);
    db.pagePermissions = db.pagePermissions.filter((x) => !(x.pageId === pageId && x.userId === targetId));
  });
}

// ---------------------------------------------------------------- comentarios (F05)
function notifyThread(db: DB, threadId: ID, actorId: ID, body: RichText) {
  const th = db.commentThreads.find((t) => t.id === threadId)!;
  const page = db.pages.find((p) => p.id === th.pageId)!;
  const mentioned = richMentions(body);
  for (const u of mentioned) {
    if (pageAccess(db, page.id, u) < LEVEL.view) continue;
    notify(db, { userId: u, workspaceId: page.workspaceId, kind: "mention", actorId, pageId: page.id, threadId, dedupeKey: `cm:${threadId}:${u}:${Date.now()}` });
  }
  const participants = new Set(db.comments.filter((c) => c.threadId === threadId).map((c) => c.authorId));
  for (const u of participants) {
    if (mentioned.includes(u)) continue;
    notify(db, { userId: u, workspaceId: page.workspaceId, kind: "reply", actorId, pageId: page.id, threadId });
  }
}

export async function createThread(pageId: ID, body: RichText, anchor?: { blockId: string; quote: string }) {
  const userId = me();
  if (!body.length) throw new DomainError("invalid");
  return mutate((db) => {
    requireLevel(db, pageId, userId, LEVEL.comment);
    const th = { id: uid(), pageId, blockId: anchor?.blockId ?? null, anchor: anchor ? { quote: anchor.quote.slice(0, 280) } : null, createdBy: userId, createdAt: now() };
    db.commentThreads.push(th);
    db.comments.push({ id: uid(), threadId: th.id, authorId: userId, body, createdAt: now() });
    notifyThread(db, th.id, userId, body);
    return th;
  });
}

export async function addComment(threadId: ID, body: RichText) {
  const userId = me();
  if (!body.length) throw new DomainError("invalid");
  mutate((db) => {
    const th = db.commentThreads.find((t) => t.id === threadId);
    if (!th) throw new DomainError("not_found");
    requireLevel(db, th.pageId, userId, LEVEL.comment);
    notifyThread(db, threadId, userId, body);
    db.comments.push({ id: uid(), threadId, authorId: userId, body, createdAt: now() });
    if (th.resolvedAt) th.resolvedAt = null;
  });
}

export async function editComment(commentId: ID, body: RichText) {
  const userId = me();
  mutate((db) => {
    const c = db.comments.find((x) => x.id === commentId);
    if (!c || c.authorId !== userId) throw new DomainError("forbidden");
    c.body = body;
    c.editedAt = now();
  });
}

export async function deleteComment(commentId: ID) {
  const userId = me();
  mutate((db) => {
    const c = db.comments.find((x) => x.id === commentId);
    if (!c || c.authorId !== userId) throw new DomainError("forbidden");
    c.deletedAt = now();
    c.body = [];
  });
}

export async function resolveThread(threadId: ID, resolved: boolean) {
  const userId = me();
  mutate((db) => {
    const th = db.commentThreads.find((t) => t.id === threadId);
    if (!th) throw new DomainError("not_found");
    requireLevel(db, th.pageId, userId, LEVEL.comment);
    th.resolvedAt = resolved ? now() : null;
    th.resolvedBy = resolved ? userId : null;
  });
}

export async function toggleReaction(targetType: "comment" | "message", targetId: ID, emoji: string) {
  const userId = me();
  mutate((db) => {
    const ex = db.reactions.find((r) => r.targetType === targetType && r.targetId === targetId && r.userId === userId && r.emoji === emoji);
    if (ex) db.reactions = db.reactions.filter((r) => r !== ex);
    else db.reactions.push({ id: uid(), targetType, targetId, userId, emoji });
  });
}

// ---------------------------------------------------------------- bandeja
export async function markRead(ids: ID[] | "all") {
  const userId = me();
  mutate((db) => {
    for (const n of db.notifications) {
      if (n.userId !== userId || n.readAt) continue;
      if (ids === "all" || ids.includes(n.id)) n.readAt = now();
    }
  });
}

// ---------------------------------------------------------------- base de datos de tareas (F07)
export async function createDatabase(parentId: ID | null, name = "Tareas") {
  const userId = me();
  return mutate((db) => {
    const ws = workspaceOf(db, userId);
    if (!ws) throw new DomainError("forbidden");
    if (parentId) requireLevel(db, parentId, userId, LEVEL.edit);
    const page: Page = {
      id: uid(),
      workspaceId: ws.id,
      parentId,
      title: name,
      icon: "✅",
      content: [],
      searchText: "",
      isPrivate: false,
      ownerId: userId,
      position: nextPosition(db, parentId, ws.id),
      isDatabaseRow: false,
      createdBy: userId,
      createdAt: now(),
      updatedAt: now(),
    };
    db.pages.push(page);
    const dbId = uid();
    db.databases.push({ id: dbId, pageId: page.id, name });
    const st = uid();
    db.dbProperties.push(
      {
        id: st,
        databaseId: dbId,
        name: "Estado",
        type: "status",
        position: 1,
        options: [
          { id: uid(), label: "Por hacer", color: "gray" },
          { id: uid(), label: "En curso", color: "blue" },
          { id: uid(), label: "Listo", color: "green" },
        ],
      },
      { id: uid(), databaseId: dbId, name: "Responsable", type: "person", position: 2, options: [] },
    );
    const date = uid();
    db.dbProperties.push({ id: date, databaseId: dbId, name: "Fecha", type: "date", position: 3, options: [] });
    db.dbViews.push(
      { id: uid(), databaseId: dbId, name: "Tabla", type: "table", config: {}, position: 1 },
      { id: uid(), databaseId: dbId, name: "Tablero", type: "board", config: { groupBy: st }, position: 2 },
      { id: uid(), databaseId: dbId, name: "Calendario", type: "calendar", config: { dateProperty: date }, position: 3 },
    );
    return page;
  });
}

function mustDatabase(db: DB, databaseId: ID) {
  const d = db.databases.find((x) => x.id === databaseId);
  if (!d) throw new DomainError("not_found");
  return d;
}

export async function addProperty(databaseId: ID, name: string, type: PropertyType) {
  const userId = me();
  return mutate((db) => {
    const d = mustDatabase(db, databaseId);
    requireLevel(db, d.pageId, userId, LEVEL.edit);
    const clean = name.trim() || "Propiedad";
    if (db.dbProperties.some((p) => p.databaseId === databaseId && p.name.toLowerCase() === clean.toLowerCase())) {
      throw new DomainError("duplicate_name", "Ya existe una propiedad con ese nombre.");
    }
    const props = db.dbProperties.filter((p) => p.databaseId === databaseId);
    const prop = { id: uid(), databaseId, name: clean, type, options: [], position: props.length ? Math.max(...props.map((p) => p.position)) + 1 : 1 };
    db.dbProperties.push(prop);
    return prop;
  });
}

export async function updateProperty(propertyId: ID, patch: { name?: string; options?: { id: ID; label: string; color: "gray" | "blue" | "green" | "yellow" | "red" | "purple" }[] }) {
  const userId = me();
  mutate((db) => {
    const p = db.dbProperties.find((x) => x.id === propertyId);
    if (!p) throw new DomainError("not_found");
    requireLevel(db, mustDatabase(db, p.databaseId).pageId, userId, LEVEL.edit);
    if (patch.name !== undefined) {
      const clean = patch.name.trim();
      if (!clean) throw new DomainError("invalid");
      if (db.dbProperties.some((x) => x.databaseId === p.databaseId && x.id !== p.id && x.name.toLowerCase() === clean.toLowerCase())) {
        throw new DomainError("duplicate_name", "Ya existe una propiedad con ese nombre.");
      }
      p.name = clean;
    }
    if (patch.options) p.options = patch.options;
  });
}

export async function deleteProperty(propertyId: ID) {
  const userId = me();
  mutate((db) => {
    const p = db.dbProperties.find((x) => x.id === propertyId);
    if (!p) throw new DomainError("not_found");
    requireLevel(db, mustDatabase(db, p.databaseId).pageId, userId, LEVEL.edit);
    db.dbProperties = db.dbProperties.filter((x) => x.id !== propertyId);
    for (const r of db.dbRows) if (r.databaseId === p.databaseId) delete r.values[propertyId];
    for (const v of db.dbViews) {
      if (v.databaseId !== p.databaseId) continue;
      if (v.config.groupBy === propertyId) v.config.groupBy = undefined;
      if (v.config.dateProperty === propertyId) v.config.dateProperty = undefined;
      v.config.filters = v.config.filters?.filter((f) => f.propertyId !== propertyId);
      v.config.sorts = v.config.sorts?.filter((s) => s.propertyId !== propertyId);
    }
  });
}

export async function createRow(databaseId: ID, values: Record<ID, CellValue> = {}, title = "") {
  const userId = me();
  return mutate((db) => {
    const d = mustDatabase(db, databaseId);
    const container = mustPage(db, d.pageId);
    requireLevel(db, d.pageId, userId, LEVEL.edit);
    const rows = db.dbRows.filter((r) => r.databaseId === databaseId);
    const page: Page = {
      id: uid(),
      workspaceId: container.workspaceId,
      parentId: container.id,
      title: title.slice(0, 200),
      icon: null,
      content: [],
      searchText: "",
      isPrivate: false,
      ownerId: userId,
      position: rows.length,
      isDatabaseRow: true,
      createdBy: userId,
      createdAt: now(),
      updatedAt: now(),
    };
    db.pages.push(page);
    const row = { id: uid(), databaseId, pageId: page.id, values, position: rows.length ? Math.max(...rows.map((r) => r.position)) + 1 : 0, createdAt: now(), updatedAt: now() };
    db.dbRows.push(row);
    assignNotify(db, databaseId, page, {}, values, userId);
    return row;
  });
}

function assignNotify(db: DB, databaseId: ID, page: Page, before: Record<ID, CellValue>, after: Record<ID, CellValue>, actorId: ID) {
  for (const prop of db.dbProperties.filter((p) => p.databaseId === databaseId && p.type === "person")) {
    const u = after[prop.id];
    if (typeof u === "string" && u && u !== before[prop.id] && pageAccess(db, page.id, u) >= LEVEL.view) {
      notify(db, { userId: u, workspaceId: page.workspaceId, kind: "assigned", actorId, pageId: page.id, dedupeKey: `assign:${page.id}:${u}` });
    }
  }
}

export async function updateRowValues(rowId: ID, patch: Record<ID, CellValue>) {
  const userId = me();
  mutate((db) => {
    const r = db.dbRows.find((x) => x.id === rowId);
    if (!r) throw new DomainError("not_found");
    requireLevel(db, r.pageId, userId, LEVEL.edit);
    const before = { ...r.values };
    r.values = { ...r.values, ...patch };
    r.updatedAt = now();
    assignNotify(db, r.databaseId, mustPage(db, r.pageId), before, r.values, userId);
  });
}

export async function moveRow(rowId: ID, position: number, patch?: Record<ID, CellValue>) {
  const userId = me();
  mutate((db) => {
    const r = db.dbRows.find((x) => x.id === rowId);
    if (!r) throw new DomainError("not_found");
    requireLevel(db, r.pageId, userId, LEVEL.edit);
    r.position = position;
    if (patch) {
      const before = { ...r.values };
      r.values = { ...r.values, ...patch };
      assignNotify(db, r.databaseId, mustPage(db, r.pageId), before, r.values, userId);
    }
    r.updatedAt = now();
  });
}

export async function deleteRow(rowId: ID) {
  const r = getDB()?.dbRows.find((x) => x.id === rowId);
  if (r) await archivePage(r.pageId);
}

export async function saveView(viewId: ID, patch: { name?: string; config?: ViewConfig; type?: ViewType }) {
  const userId = me();
  mutate((db) => {
    const v = db.dbViews.find((x) => x.id === viewId);
    if (!v) throw new DomainError("not_found");
    requireLevel(db, mustDatabase(db, v.databaseId).pageId, userId, LEVEL.edit);
    if (patch.name !== undefined) v.name = patch.name.trim() || v.name;
    if (patch.type) v.type = patch.type;
    if (patch.config) v.config = { ...v.config, ...patch.config };
  });
}

// ---------------------------------------------------------------- chat (F08, F09)
export async function createChannel(name: string) {
  const userId = me();
  const clean = name.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, "-").replace(/[^a-z0-9ñáéíóúü_-]/g, "");
  if (!clean || clean.length > 40) throw new DomainError("invalid", "Usa entre 1 y 40 letras, números o guiones.");
  return mutate((db) => {
    const ws = workspaceOf(db, userId);
    if (!ws) throw new DomainError("forbidden");
    if (db.channels.some((c) => c.workspaceId === ws.id && c.kind === "channel" && c.name?.toLowerCase() === clean)) {
      throw new DomainError("duplicate_name", "Ya existe un canal con ese nombre.");
    }
    const ch: Channel = { id: uid(), workspaceId: ws.id, kind: "channel", name: clean, createdBy: userId, createdAt: now() };
    db.channels.push(ch);
    for (const m of db.members.filter((x) => x.workspaceId === ws.id)) {
      db.channelMembers.push({ channelId: ch.id, userId: m.userId, lastReadAt: now(), muted: false });
    }
    const creator = db.profiles.find((p) => p.id === userId);
    systemMessage(db, ch.id, `${creator?.name || "Alguien"} creó #${clean}.`);
    return ch;
  });
}

export async function openDM(otherId: ID) {
  const userId = me();
  return mutate((db) => {
    const ws = workspaceOf(db, userId);
    if (!ws || !isMember(db, ws.id, otherId)) throw new DomainError("forbidden");
    const key = [userId, otherId].sort().join(":");
    let ch = db.channels.find((c) => c.workspaceId === ws.id && c.dmKey === key);
    if (!ch) {
      ch = { id: uid(), workspaceId: ws.id, kind: "dm", dmKey: key, createdBy: userId, createdAt: now() };
      db.channels.push(ch);
      for (const u of new Set([userId, otherId])) db.channelMembers.push({ channelId: ch.id, userId: u, lastReadAt: now(), muted: false });
    }
    return ch;
  });
}

export async function openPageChat(pageId: ID) {
  const userId = me();
  return mutate((db) => {
    const p = mustPage(db, pageId);
    requireLevel(db, pageId, userId, LEVEL.comment);
    let ch = db.channels.find((c) => c.kind === "page" && c.pageId === pageId);
    if (!ch) {
      ch = { id: uid(), workspaceId: p.workspaceId, kind: "page", pageId, createdBy: userId, createdAt: now() };
      db.channels.push(ch);
    }
    if (!db.channelMembers.some((m) => m.channelId === ch!.id && m.userId === userId)) {
      db.channelMembers.push({ channelId: ch.id, userId, lastReadAt: now(), muted: false });
    }
    return ch;
  });
}

export async function sendMessage(channelId: ID, body: RichText, clientId: string, parentId?: ID | null) {
  const userId = me();
  if (!body.length || !richPlain(null, body).trim()) throw new DomainError("invalid");
  await latency(80);
  return mutate((db) => {
    const dup = db.messages.find((m) => m.authorId === userId && m.clientId === clientId);
    if (dup) return dup; // reintento: no duplicar
    const ch = db.channels.find((c) => c.id === channelId);
    if (!ch || !canChannel(db, ch, userId)) throw new DomainError("forbidden");
    const firstPage = body.find((n) => n.t === "page") as { id: ID } | undefined;
    const msg: Message = { id: uid(), channelId, authorId: userId, parentId: parentId ?? null, body, linkedPageId: firstPage?.id ?? null, clientId, createdAt: now() };
    db.messages.push(msg);
    const cm = db.channelMembers.find((m) => m.channelId === channelId && m.userId === userId);
    if (cm) cm.lastReadAt = now();
    else db.channelMembers.push({ channelId, userId, lastReadAt: now(), muted: false });
    const mentioned = richMentions(body);
    for (const u of mentioned) {
      if (!canChannel(db, ch, u)) continue;
      notify(db, { userId: u, workspaceId: ch.workspaceId, kind: "mention", actorId: userId, channelId, messageId: msg.id, pageId: ch.pageId ?? null });
    }
    if (ch.kind === "dm") {
      for (const m of db.channelMembers.filter((x) => x.channelId === ch.id && x.userId !== userId && !mentioned.includes(x.userId))) {
        notify(db, { userId: m.userId, workspaceId: ch.workspaceId, kind: "dm", actorId: userId, channelId, messageId: msg.id, dedupeKey: `dm:${ch.id}:${m.userId}:${new Date().toISOString().slice(0, 13)}` });
      }
    }
    return msg;
  });
}

export async function editMessage(messageId: ID, body: RichText) {
  const userId = me();
  mutate((db) => {
    const m = db.messages.find((x) => x.id === messageId);
    if (!m || m.authorId !== userId || m.deletedAt) throw new DomainError("forbidden");
    m.body = body;
    m.editedAt = now();
  });
}

export async function deleteMessage(messageId: ID) {
  const userId = me();
  mutate((db) => {
    const m = db.messages.find((x) => x.id === messageId);
    if (!m || m.authorId !== userId) throw new DomainError("forbidden");
    m.deletedAt = now();
    m.body = [];
  });
}

export async function markChannelRead(channelId: ID) {
  const userId = getSessionUserId();
  if (!userId) return;
  mutate((db) => {
    const ch = db.channels.find((c) => c.id === channelId);
    if (!ch || !canChannel(db, ch, userId)) return;
    const cm = db.channelMembers.find((m) => m.channelId === channelId && m.userId === userId);
    if (cm) cm.lastReadAt = now();
    else db.channelMembers.push({ channelId, userId, lastReadAt: now(), muted: false });
    for (const n of db.notifications) if (n.userId === userId && n.channelId === channelId && !n.readAt) n.readAt = now();
  });
}

/** Convierte un mensaje en tarea de una base de datos (o en página si no hay base). */
export async function messageToTask(messageId: ID, databaseId?: ID) {
  const userId = me();
  return mutate((db) => {
    const msg = db.messages.find((m) => m.id === messageId);
    if (!msg || msg.deletedAt) throw new DomainError("not_found");
    const ch = db.channels.find((c) => c.id === msg.channelId)!;
    if (!canChannel(db, ch, userId)) throw new DomainError("forbidden");
    const text = richPlain(db, msg.body).trim();
    const title = text.length > 80 ? text.slice(0, 77) + "…" : text;
    const author = msg.authorId ? db.profiles.find((p) => p.id === msg.authorId)?.name : null;
    const content = [
      { type: "paragraph", content: [{ type: "text", text, styles: {} }] },
      { type: "paragraph", content: [{ type: "text", text: `Creada desde un mensaje${author ? " de " + author : ""}${ch.kind === "channel" ? " en #" + ch.name : ""}.`, styles: { italic: true } }] },
    ];
    let pageId: ID;
    const ws = ch.workspaceId;
    const d = databaseId ? db.databases.find((x) => x.id === databaseId) : undefined;
    if (d) {
      requireLevel(db, d.pageId, userId, LEVEL.edit);
      const container = mustPage(db, d.pageId);
      const rows = db.dbRows.filter((r) => r.databaseId === d.id);
      pageId = uid();
      db.pages.push({ id: pageId, workspaceId: ws, parentId: container.id, title, icon: null, content, searchText: text, isPrivate: false, ownerId: userId, position: rows.length, isDatabaseRow: true, createdBy: userId, createdAt: now(), updatedAt: now() });
      const statusProp = db.dbProperties.find((p) => p.databaseId === d.id && p.type === "status");
      const values: Record<ID, CellValue> = {};
      if (statusProp?.options[0]) values[statusProp.id] = statusProp.options[0].id;
      db.dbRows.push({ id: uid(), databaseId: d.id, pageId, values, position: rows.length ? Math.max(...rows.map((r) => r.position)) + 1 : 0, createdAt: now(), updatedAt: now() });
    } else {
      pageId = uid();
      db.pages.push({ id: pageId, workspaceId: ws, parentId: null, title, icon: null, content, searchText: text, isPrivate: false, ownerId: userId, position: nextPosition(db, null, ws), isDatabaseRow: false, createdBy: userId, createdAt: now(), updatedAt: now() });
    }
    msg.linkedPageId = pageId;
    const actor = db.profiles.find((p) => p.id === userId);
    db.messages.push({ id: uid(), channelId: ch.id, authorId: null, parentId: msg.id, body: [{ t: "text", v: `${actor?.name || "Alguien"} lo convirtió en ` }, { t: "page", id: pageId }], createdAt: now() });
    return pageId;
  });
}

// ---------------------------------------------------------------- búsqueda (F10)
export type SearchResult =
  | { kind: "page"; id: ID; title: string; snippet: string; icon?: string | null }
  | { kind: "message"; id: ID; channelId: ID; snippet: string; channelLabel: string }
  | { kind: "person"; id: ID; name: string; email: string };

function norm(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function search(db: DB, userId: ID, q: string): SearchResult[] {
  const query = norm(q.trim());
  const ws = workspaceOf(db, userId);
  if (!ws) return [];
  const pages = db.pages
    .filter((p) => p.workspaceId === ws.id && !p.archivedAt && pageAccess(db, p.id, userId) >= LEVEL.view)
    .map((p) => {
      const t = norm(p.title || "Sin título");
      const body = norm(p.searchText);
      const score = !query ? 0 : t.startsWith(query) ? 3 : t.includes(query) ? 2 : body.includes(query) ? 1 : -1;
      return { p, score, body };
    })
    .filter((x) => !query || x.score >= 0)
    .sort((a, b) => b.score - a.score || b.p.updatedAt.localeCompare(a.p.updatedAt))
    .slice(0, query ? 8 : 6)
    .map(({ p, body }): SearchResult => {
      let snippet = "";
      const i = query ? body.indexOf(query) : -1;
      if (i >= 0) snippet = p.searchText.slice(Math.max(0, i - 30), i + 60);
      return { kind: "page", id: p.id, title: p.title || "Sin título", snippet, icon: p.icon };
    });
  if (!query) return pages;
  const messages = db.messages
    .filter((m) => !m.deletedAt && m.authorId)
    .filter((m) => {
      const ch = db.channels.find((c) => c.id === m.channelId);
      return ch && ch.workspaceId === ws.id && canChannel(db, ch, userId) && norm(richPlain(db, m.body)).includes(query);
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
    .map((m): SearchResult => {
      const ch = db.channels.find((c) => c.id === m.channelId)!;
      return { kind: "message", id: m.id, channelId: ch.id, snippet: richPlain(db, m.body).slice(0, 120), channelLabel: channelLabel(db, ch, userId) };
    });
  const people = db.members
    .filter((m) => m.workspaceId === ws.id)
    .map((m) => db.profiles.find((p) => p.id === m.userId)!)
    .filter((p) => norm(p.name).includes(query) || norm(p.email).includes(query))
    .slice(0, 4)
    .map((p): SearchResult => ({ kind: "person", id: p.id, name: p.name || p.email, email: p.email }));
  return [...pages, ...messages, ...people];
}

export function channelLabel(db: DB, ch: Channel, userId: ID) {
  if (ch.kind === "channel") return `#${ch.name}`;
  if (ch.kind === "page") return `Chat de ${db.pages.find((p) => p.id === ch.pageId)?.title || "una página"}`;
  const other = ch.dmKey?.split(":").find((id) => id !== userId) ?? userId;
  return db.profiles.find((p) => p.id === other)?.name || "Mensaje directo";
}

export { workspaceOf };
