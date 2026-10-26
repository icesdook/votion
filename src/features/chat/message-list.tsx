"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, FilePlus, MoreHorizontal, Pencil, SmilePlus, Trash2, RotateCw } from "lucide-react";
import * as api from "@/data/api";
import type { ID, Message, RichText } from "@/data/types";
import { access, clockTime, dayLabel, profileName, useCtx } from "@/data/hooks";
import { LEVEL } from "@/data/access";
import { Avatar } from "@/components/ui/avatar";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, Popover, PopoverContent, PopoverTrigger, Tooltip } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/feedback";
import { RichView, PageCard } from "@/features/rich/rich-text";
import { Composer, type ComposerHandle } from "@/features/rich/composer";
import { cn } from "@/lib/cn";

const QUICK = ["👍", "🎉", "❤️", "😂", "👀", "✅"];
const GROUP_MS = 5 * 60_000;

export type Pending = { clientId: string; body: RichText; createdAt: string; failed?: boolean };

export function MessageList({ channelId, pending, onRetry, emptyTitle, emptyText }: { channelId: ID; pending: Pending[]; onRetry: (p: Pending) => void; emptyTitle: string; emptyText: string }) {
  const ctx = useCtx()!;
  const { db, me } = ctx;
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const [readMark] = useState(() => db.channelMembers.find((m) => m.channelId === channelId && m.userId === me)?.lastReadAt ?? null);
  const messages = useMemo(
    () => db.messages.filter((m) => m.channelId === channelId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [db.messages, channelId],
  );
  const shownPending = pending.filter((p) => !messages.some((m) => m.clientId === p.clientId && m.authorId === me));

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, shownPending.length]);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    if (hash) {
      const el = document.getElementById(hash);
      if (el) {
        stick.current = false;
        el.scrollIntoView({ block: "center" });
        el.classList.add("bg-accent-soft");
        setTimeout(() => el.classList.remove("bg-accent-soft"), 2000);
      }
    }
  }, []);

  useEffect(() => {
    const mark = () => document.visibilityState === "visible" && api.markChannelRead(channelId);
    mark();
    document.addEventListener("visibilitychange", mark);
    return () => document.removeEventListener("visibilitychange", mark);
  }, [channelId, messages.length]);

  const rows: { m: Message; day: string | null; isNew: boolean; grouped: boolean }[] = [];
  {
    let lastDay = "";
    let prev: Message | null = null;
    let markerShown = false;
    for (const m of messages) {
      const day = dayLabel(m.createdAt);
      const showDay = day !== lastDay;
      lastDay = day;
      const grouped = !showDay && !!prev && prev.authorId === m.authorId && !!m.authorId && !prev.deletedAt && Date.parse(m.createdAt) - Date.parse(prev.createdAt) < GROUP_MS;
      const isNew = !markerShown && !!readMark && m.createdAt > readMark && !!m.authorId && m.authorId !== me;
      if (isNew) markerShown = true;
      prev = m;
      rows.push({ m, day: showDay ? day : null, isNew, grouped });
    }
  }

  return (
    <div
      ref={scroller}
      onScroll={(e) => {
        const el = e.currentTarget;
        stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      }}
      role="log"
      aria-live="polite"
      aria-label="Mensajes"
      className="min-h-0 flex-1 overflow-y-auto px-2 py-3 md:px-4"
    >
      {messages.length === 0 && shownPending.length === 0 && <EmptyState icon={<SmilePlus />} title={emptyTitle} text={emptyText} />}
      {rows.map(({ m, day, isNew, grouped }) => {
        return (
          <div key={m.id}>
            {day && (
              <div className="my-3 flex items-center gap-3 text-xs font-medium text-text-faint" role="separator">
                <span className="h-px flex-1 bg-border" /> {day} <span className="h-px flex-1 bg-border" />
              </div>
            )}
            {isNew && (
              <div className="my-2 flex items-center gap-3 text-xs font-semibold text-danger" role="separator">
                <span className="h-px flex-1 bg-danger" /> Nuevos
              </div>
            )}
            <MessageRow m={m} grouped={grouped} />
          </div>
        );
      })}
      {shownPending.map((p) => (
        <div key={p.clientId} className={cn("flex gap-3 rounded-md px-2 py-1", !p.failed && "opacity-60")}>
          <span className="w-8 shrink-0" />
          <div className="min-w-0 flex-1 text-sm whitespace-pre-wrap">
            <RichView body={p.body} />
            {p.failed ? (
              <button onClick={() => onRetry(p)} className="ml-2 inline-flex items-center gap-1 text-xs text-danger underline underline-offset-2">
                <RotateCw className="size-3" /> No se envió · Reintentar
              </button>
            ) : (
              <span className="ml-2 text-xs text-text-faint">enviando…</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function MessageRow({ m, grouped }: { m: Message; grouped: boolean }) {
  const ctx = useCtx()!;
  const { db, me } = ctx;
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const editRef = useRef<ComposerHandle>(null);
  const mine = m.authorId === me;
  const reactions = db.reactions.filter((r) => r.targetType === "message" && r.targetId === m.id);
  const byEmoji = new Map<string, ID[]>();
  for (const r of reactions) byEmoji.set(r.emoji, [...(byEmoji.get(r.emoji) ?? []), r.userId]);
  const databases = db.databases.filter((d) => access(db, d.pageId, me) >= LEVEL.edit && !db.pages.find((p) => p.id === d.pageId)?.archivedAt);

  useEffect(() => {
    if (editing) editRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    const onEdit = (e: Event) => {
      if ((e as CustomEvent<string>).detail === m.id && m.authorId === me) setEditing(true);
    };
    window.addEventListener("ofi:edit-message", onEdit);
    return () => window.removeEventListener("ofi:edit-message", onEdit);
  }, [m.id, m.authorId, me]);

  if (!m.authorId) {
    return (
      <div id={`m-${m.id}`} className="flex gap-3 px-2 py-1 text-xs text-text-muted">
        <span className="w-8 shrink-0" />
        <span>
          <RichView body={m.body} /> · {clockTime(m.createdAt)}
        </span>
      </div>
    );
  }

  const convert = async (databaseId?: ID) => {
    try {
      const pageId = await api.messageToTask(m.id, databaseId);
      toast({ text: databaseId ? "Tarea creada" : "Página creada", kind: "success", action: { label: "Abrir", run: () => router.push(`/w/p/${pageId}`) } });
    } catch {
      toast({ text: "No se pudo convertir el mensaje.", kind: "error" });
    }
  };

  const name = profileName(db, m.authorId);
  return (
    <article id={`m-${m.id}`} aria-label={`${name}, ${clockTime(m.createdAt)}`} className={cn("group relative flex gap-3 rounded-md px-2 transition-colors hover:bg-surface", grouped ? "py-0.5" : "mt-2 py-1")}>
      <div className="w-8 shrink-0">
        {!grouped && <Avatar id={m.authorId} name={name} size={32} />}
        {grouped && <span className="hidden pt-0.5 text-[10px] text-text-faint group-hover:inline">{clockTime(m.createdAt)}</span>}
      </div>
      <div className="min-w-0 flex-1">
        {!grouped && (
          <p className="flex items-baseline gap-2">
            <span className="text-sm font-semibold">{name}</span>
            <time dateTime={m.createdAt} className="text-xs text-text-faint">
              {clockTime(m.createdAt)}
            </time>
          </p>
        )}
        {m.deletedAt ? (
          <p className="text-sm text-text-faint italic">Mensaje eliminado</p>
        ) : editing ? (
          <div className="py-1">
            <Composer
              ref={editRef}
              compact
              label="Editar mensaje"
              placeholder="Edita tu mensaje"
              initialBody={m.body}
              submitLabel="Guardar"
              onCancel={() => setEditing(false)}
              onSubmit={async (body) => {
                await api.editMessage(m.id, body);
                setEditing(false);
              }}
            />
            <p className="mt-1 text-xs text-text-faint">Esc para cancelar · Enter para guardar</p>
          </div>
        ) : (
          <div className="text-sm break-words whitespace-pre-wrap">
            <RichView body={m.body} />
            {m.editedAt && <span className="ml-1 text-xs text-text-faint">(editado)</span>}
          </div>
        )}
        {!m.deletedAt && m.linkedPageId && <PageCard pageId={m.linkedPageId} />}
        {byEmoji.size > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {[...byEmoji].map(([emoji, users]) => (
              <button
                key={emoji}
                onClick={() => api.toggleReaction("message", m.id, emoji)}
                aria-pressed={users.includes(me)}
                title={users.map((u) => profileName(db, u)).join(", ")}
                className={cn("flex h-6 items-center gap-1 rounded-pill border px-2 text-xs", users.includes(me) ? "border-accent bg-accent-soft text-on-accent-soft" : "border-border bg-bg hover:bg-hover")}
              >
                {emoji} {users.length}
              </button>
            ))}
          </div>
        )}
      </div>
      {!m.deletedAt && !editing && (
        <div className="absolute -top-3 right-2 hidden items-center rounded-md border border-border bg-bg shadow-card group-focus-within:flex group-hover:flex">
          <Popover>
            <Tooltip label="Reaccionar">
              <PopoverTrigger aria-label="Reaccionar" className="p-1.5 text-text-muted hover:bg-hover">
                <SmilePlus className="size-4" />
              </PopoverTrigger>
            </Tooltip>
            <PopoverContent className="flex gap-1">
              {QUICK.map((e) => (
                <button key={e} aria-label={`Reaccionar con ${e}`} onClick={() => api.toggleReaction("message", m.id, e)} className="rounded-sm p-1 text-lg hover:bg-hover">
                  {e}
                </button>
              ))}
            </PopoverContent>
          </Popover>
          <Menu>
            <MenuTrigger aria-label="Más acciones" className="p-1.5 text-text-muted hover:bg-hover">
              <MoreHorizontal className="size-4" />
            </MenuTrigger>
            <MenuContent align="end">
              {databases.map((d) => (
                <MenuItem key={d.id} onSelect={() => convert(d.id)}>
                  <CheckSquare /> Convertir en tarea de {db.pages.find((p) => p.id === d.pageId)?.title || d.name}
                </MenuItem>
              ))}
              <MenuItem onSelect={() => convert()}>
                <FilePlus /> Convertir en página
              </MenuItem>
              {mine && (
                <>
                  <MenuSeparator />
                  <MenuItem onSelect={() => setEditing(true)}>
                    <Pencil /> Editar
                  </MenuItem>
                  <MenuItem danger onSelect={() => api.deleteMessage(m.id)}>
                    <Trash2 /> Borrar
                  </MenuItem>
                </>
              )}
            </MenuContent>
          </Menu>
        </div>
      )}
    </article>
  );
}

/** Estado de envío con cola local: si no hay conexión, se reintenta al volver. */
export function useSender(channelId: ID) {
  const [pending, setPending] = useState<Pending[]>([]);
  const toast = useToast();

  const attempt = async (p: Pending) => {
    setPending((s) => s.map((x) => (x.clientId === p.clientId ? { ...x, failed: false } : x)));
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setPending((s) => s.map((x) => (x.clientId === p.clientId ? { ...x, failed: true } : x)));
      return;
    }
    try {
      await api.sendMessage(channelId, p.body, p.clientId);
      setPending((s) => s.filter((x) => x.clientId !== p.clientId));
    } catch {
      setPending((s) => s.map((x) => (x.clientId === p.clientId ? { ...x, failed: true } : x)));
      toast({ text: "No se pudo enviar el mensaje.", kind: "error" });
    }
  };

  useEffect(() => {
    const onOnline = () => pending.filter((p) => p.failed).forEach(attempt);
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  });

  const send = (body: RichText) => {
    const p: Pending = { clientId: crypto.randomUUID(), body, createdAt: new Date().toISOString() };
    setPending((s) => [...s, p]);
    attempt(p);
  };

  return { pending, send, retry: attempt };
}
