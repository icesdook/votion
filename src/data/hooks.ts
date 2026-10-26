"use client";

import { useMemo, useSyncExternalStore } from "react";
import { canChannel, LEVEL, pageAccess, type LevelNum } from "./access";
import { getDB, getSessionUserId, subscribe } from "./fake/store";
import type { Channel, DB, ID, Page } from "./types";

const serverSnapshot = () => null;

/** Base completa (null hasta hidratar en el navegador). */
export function useDB(): DB | null {
  return useSyncExternalStore(subscribe, getDB, serverSnapshot);
}

export function useSessionUserId(): ID | null {
  return useSyncExternalStore(subscribe, getSessionUserId, serverSnapshot);
}

export function useMe() {
  const db = useDB();
  const uid = useSessionUserId();
  return useMemo(() => {
    if (!db || !uid) return null;
    const profile = db.profiles.find((p) => p.id === uid);
    if (!profile) return null;
    const member = db.members.find((m) => m.userId === uid) ?? null;
    const workspace = member ? db.workspaces.find((w) => w.id === member.workspaceId) ?? null : null;
    return { profile, member, workspace };
  }, [db, uid]);
}

export type Ctx = { db: DB; me: ID; wsId: ID };

/** Contexto listo para pantallas dentro del espacio de trabajo. */
export function useCtx(): Ctx | null {
  const db = useDB();
  const me = useMe();
  if (!db || !me?.workspace) return null;
  return { db, me: me.profile.id, wsId: me.workspace.id };
}

export function profileName(db: DB, id: ID | null | undefined) {
  if (!id) return "Sistema";
  const p = db.profiles.find((x) => x.id === id);
  return p?.name || p?.email || "Persona eliminada";
}

export function membersOf(db: DB, wsId: ID) {
  return db.members
    .filter((m) => m.workspaceId === wsId)
    .map((m) => ({ ...m, profile: db.profiles.find((p) => p.id === m.userId)! }))
    .filter((m) => m.profile)
    .sort((a, b) => (a.profile.name || a.profile.email).localeCompare(b.profile.name || b.profile.email, "es"));
}

export function visiblePages(db: DB, wsId: ID, me: ID): Page[] {
  return db.pages.filter((p) => p.workspaceId === wsId && !p.archivedAt && !p.isDatabaseRow && pageAccess(db, p.id, me) >= LEVEL.view);
}

export function access(db: DB, pageId: ID, me: ID): LevelNum {
  return pageAccess(db, pageId, me);
}

export function unreadFor(db: DB, ch: Channel, me: ID) {
  const cm = db.channelMembers.find((m) => m.channelId === ch.id && m.userId === me);
  const since = cm?.lastReadAt ?? "0";
  return db.messages.filter((m) => m.channelId === ch.id && !m.deletedAt && m.authorId && m.authorId !== me && m.createdAt > since).length;
}

export function myChannels(db: DB, wsId: ID, me: ID) {
  const list = db.channels.filter((c) => c.workspaceId === wsId && !c.archivedAt && c.kind !== "page" && canChannel(db, c, me));
  return {
    channels: list.filter((c) => c.kind === "channel").sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "es")),
    dms: list.filter((c) => c.kind === "dm"),
  };
}

export function unreadNotifications(db: DB, me: ID) {
  return db.notifications.filter((n) => n.userId === me && !n.readAt).length;
}

/** Hora relativa corta en español. */
export function relTime(iso: string) {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 60) return "ahora";
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  const d = new Date(iso);
  const days = Math.floor(s / 86400);
  if (days < 7) return days === 1 ? "ayer" : `hace ${days} días`;
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

export function clockTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

export function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Hoy";
  if (d.toDateString() === y.toDateString()) return "Ayer";
  return d.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
}

export function shortDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: y === new Date().getFullYear() ? undefined : "numeric" });
}
