// Reglas de acceso. Misma lógica que page_access() e in_channel() en schema.sql,
// para que la interfaz oculte lo mismo que la base de datos rechaza.
import type { AccessLevel, Channel, DB, ID, Page } from "./types";

export const LEVEL = { none: 0, view: 1, comment: 2, edit: 3, full: 4 } as const;
export type LevelNum = 0 | 1 | 2 | 3 | 4;

const fromName: Record<AccessLevel, LevelNum> = { view: 1, comment: 2, edit: 3, full: 4 };

export function isMember(db: DB, workspaceId: ID, userId: ID) {
  return db.members.some((m) => m.workspaceId === workspaceId && m.userId === userId);
}

export function isAdmin(db: DB, workspaceId: ID, userId: ID) {
  return db.members.some(
    (m) => m.workspaceId === workspaceId && m.userId === userId && (m.role === "owner" || m.role === "admin"),
  );
}

/** Cadena de la página hacia la raíz (incluye la página). */
export function ancestry(db: DB, pageId: ID): Page[] {
  const byId = new Map(db.pages.map((p) => [p.id, p]));
  const out: Page[] = [];
  let cur = byId.get(pageId);
  let guard = 0;
  while (cur && guard++ < 64) {
    out.push(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return out;
}

export function pageAccess(db: DB, pageId: ID, userId: ID): LevelNum {
  const chain = ancestry(db, pageId);
  if (chain.length === 0) return 0;
  const ws = chain[0].workspaceId;
  if (!isMember(db, ws, userId)) return 0;
  const ids = new Set(chain.map((p) => p.id));
  let lvl: LevelNum = 0;
  for (const pp of db.pagePermissions) {
    if (pp.userId === userId && ids.has(pp.pageId)) lvl = Math.max(lvl, fromName[pp.level]) as LevelNum;
  }
  const anyPrivate = chain.some((p) => p.isPrivate);
  if (!anyPrivate) lvl = Math.max(lvl, 3) as LevelNum;
  if (chain.some((p) => p.ownerId === userId)) lvl = 4;
  if (!anyPrivate && isAdmin(db, ws, userId)) lvl = 4;
  return lvl;
}

export function canChannel(db: DB, ch: Channel, userId: ID): boolean {
  if (!isMember(db, ch.workspaceId, userId)) return false;
  if (ch.kind === "channel") return true;
  if (ch.kind === "dm") return db.channelMembers.some((m) => m.channelId === ch.id && m.userId === userId);
  return !!ch.pageId && pageAccess(db, ch.pageId, userId) >= LEVEL.comment;
}

export function levelLabel(l: LevelNum) {
  return ["Sin acceso", "Puede ver", "Puede comentar", "Puede editar", "Acceso total"][l];
}
