"use client";

import { useEffect, useRef, useState } from "react";
import { Check, MessageSquare, MoreHorizontal, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import * as api from "@/data/api";
import type { CommentThread, ID } from "@/data/types";
import { access, profileName, relTime, useCtx } from "@/data/hooks";
import { LEVEL } from "@/data/access";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/feedback";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/overlay";
import { RichView } from "@/features/rich/rich-text";
import { Composer } from "@/features/rich/composer";
import { cn } from "@/lib/cn";

export type Draft = { blockId: string; quote: string } | null;

export function CommentsPanel({
  pageId,
  draft,
  focusThread,
  onDraftDone,
  onClose,
  onJump,
}: {
  pageId: ID;
  draft: Draft;
  focusThread?: ID | null;
  onDraftDone: () => void;
  onClose: () => void;
  onJump: (blockId: string) => void;
}) {
  const ctx = useCtx()!;
  const { db, me } = ctx;
  const [filter, setFilter] = useState<"open" | "resolved">("open");
  const [person, setPerson] = useState<ID | "all">("all");
  const canComment = access(db, pageId, me) >= LEVEL.comment;
  const threads = db.commentThreads
    .filter((t) => t.pageId === pageId)
    .filter((t) => (filter === "open" ? !t.resolvedAt : !!t.resolvedAt))
    .filter((t) => person === "all" || db.comments.some((c) => c.threadId === t.id && c.authorId === person))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const authors = [...new Set(db.comments.filter((c) => db.commentThreads.find((t) => t.id === c.threadId)?.pageId === pageId).map((c) => c.authorId))];

  return (
    <aside aria-label="Comentarios" className="flex h-full w-full flex-col bg-bg">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
        <h2 className="flex-1 text-sm font-semibold">Comentarios</h2>
        <button onClick={onClose} aria-label="Cerrar comentarios" className="rounded-md p-1 text-text-muted hover:bg-hover">
          <X className="size-4" />
        </button>
      </header>
      <div className="flex shrink-0 items-center gap-1 border-b border-border px-3 py-2">
        <div role="tablist" className="flex gap-1">
          {(["open", "resolved"] as const).map((f) => (
            <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} className={cn("h-7 rounded-md px-2 text-sm text-text-muted hover:bg-hover", filter === f && "bg-surface-2 font-medium text-text")}>
              {f === "open" ? "Abiertos" : "Resueltos"}
            </button>
          ))}
        </div>
        <span className="flex-1" />
        {authors.length > 1 && (
          <select aria-label="Filtrar por persona" value={person} onChange={(e) => setPerson(e.target.value)} className="h-7 max-w-36 rounded-md border border-border bg-bg px-1 text-sm">
            <option value="all">Todos</option>
            {authors.map((a) => (
              <option key={a} value={a}>
                {profileName(db, a)}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {canComment && (draft || filter === "open") && (
          <div className="mb-4 rounded-lg border border-border p-2">
            {draft && <blockquote className="mb-2 border-l-2 border-accent pl-2 text-sm text-text-muted">{draft.quote || "Bloque seleccionado"}</blockquote>}
            <Composer
              compact
              label={draft ? "Comentar la selección" : "Comentar la página"}
              placeholder={draft ? "Comenta la selección…" : "Comenta la página…"}
              pageScope={pageId}
              onSubmit={async (body) => {
                await api.createThread(pageId, body, draft ?? undefined);
                onDraftDone();
                setFilter("open");
              }}
              onCancel={onDraftDone}
            />
          </div>
        )}
        {threads.length === 0 && (
          <EmptyState icon={<MessageSquare />} title={filter === "open" ? "Sin comentarios abiertos" : "Nada resuelto todavía"} text={filter === "open" ? "Selecciona texto y presiona Comentar, o escribe arriba sobre la página completa." : undefined} />
        )}
        <div className="flex flex-col gap-3">
          {threads.map((t) => (
            <Thread key={t.id} thread={t} onJump={onJump} canComment={canComment} focused={focusThread === t.id} />
          ))}
        </div>
      </div>
    </aside>
  );
}

function Thread({ thread, onJump, canComment, focused }: { thread: CommentThread; onJump: (b: string) => void; canComment: boolean; focused?: boolean }) {
  const ctx = useCtx()!;
  const { db, me } = ctx;
  const comments = db.comments.filter((c) => c.threadId === thread.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const [editing, setEditing] = useState<ID | null>(null);
  const [replying, setReplying] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focused]);

  return (
    <article ref={ref} className={cn("rounded-lg border border-border p-3", thread.resolvedAt && "bg-surface", focused && "ring-2 ring-focus")} aria-label={`Hilo de ${profileName(db, thread.createdBy)}`}>
      <div className="mb-2 flex items-start gap-2">
        {thread.anchor ? (
          <button onClick={() => thread.blockId && onJump(thread.blockId)} className="min-w-0 flex-1 border-l-2 border-mention-bg pl-2 text-left text-xs text-text-muted hover:text-text">
            <span className="line-clamp-2">{thread.anchor.quote || "Bloque"}</span>
          </button>
        ) : (
          <span className="flex-1 text-xs text-text-faint">Comentario de la página</span>
        )}
        {canComment && (
          <button
            onClick={() => api.resolveThread(thread.id, !thread.resolvedAt)}
            aria-label={thread.resolvedAt ? "Reabrir hilo" : `Resolver hilo de ${profileName(db, thread.createdBy)}`}
            className="flex h-6 shrink-0 items-center gap-1 rounded-md px-1.5 text-xs text-text-muted hover:bg-hover"
          >
            {thread.resolvedAt ? <RotateCcw className="size-3.5" /> : <Check className="size-3.5" />}
            {thread.resolvedAt ? "Reabrir" : "Resolver"}
          </button>
        )}
      </div>
      <div className="flex flex-col gap-3">
        {comments.map((c) => (
          <div key={c.id} className="group flex gap-2">
            <Avatar id={c.authorId} name={profileName(db, c.authorId)} size={24} />
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline gap-2 text-xs">
                <span className="font-semibold">{profileName(db, c.authorId)}</span>
                <time className="text-text-faint" dateTime={c.createdAt}>
                  {relTime(c.createdAt)}
                </time>
                {c.editedAt && <span className="text-text-faint">(editado)</span>}
              </p>
              {c.deletedAt ? (
                <p className="text-sm text-text-faint italic">Comentario eliminado</p>
              ) : editing === c.id ? (
                <Composer
                  compact
                  label="Editar comentario"
                  placeholder="Edita tu comentario"
                  initialBody={c.body}
                  submitLabel="Guardar"
                  onCancel={() => setEditing(null)}
                  onSubmit={async (body) => (await api.editComment(c.id, body), setEditing(null))}
                />
              ) : (
                <div className="text-sm break-words whitespace-pre-wrap">
                  <RichView body={c.body} />
                </div>
              )}
              <Reactions targetId={c.id} />
            </div>
            {c.authorId === me && !c.deletedAt && editing !== c.id && (
              <Menu>
                <MenuTrigger aria-label="Opciones del comentario" className="self-start rounded-sm p-0.5 text-text-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-hover max-md:opacity-100">
                  <MoreHorizontal className="size-4" />
                </MenuTrigger>
                <MenuContent align="end">
                  <MenuItem onSelect={() => setEditing(c.id)}>
                    <Pencil /> Editar
                  </MenuItem>
                  <MenuItem danger onSelect={() => api.deleteComment(c.id)}>
                    <Trash2 /> Borrar
                  </MenuItem>
                </MenuContent>
              </Menu>
            )}
          </div>
        ))}
      </div>
      {canComment &&
        (replying ? (
          <div className="mt-3">
            <Composer compact label="Responder" placeholder="Responde…" pageScope={thread.pageId} onCancel={() => setReplying(false)} onSubmit={async (body) => (await api.addComment(thread.id, body), setReplying(false))} />
          </div>
        ) : (
          <button onClick={() => setReplying(true)} className="mt-2 text-xs text-text-muted hover:text-text">
            Responder
          </button>
        ))}
    </article>
  );
}

function Reactions({ targetId }: { targetId: ID }) {
  const ctx = useCtx()!;
  const rs = ctx.db.reactions.filter((r) => r.targetType === "comment" && r.targetId === targetId);
  const mine = (e: string) => rs.some((r) => r.emoji === e && r.userId === ctx.me);
  const counts = ["👍", "✅", "👀"].map((e) => [e, rs.filter((r) => r.emoji === e).length] as const);
  return (
    <div className="mt-1 flex gap-1">
      {counts.map(([e, n]) => (
        <button
          key={e}
          onClick={() => api.toggleReaction("comment", targetId, e)}
          aria-pressed={mine(e)}
          aria-label={`Reaccionar con ${e}`}
          className={cn("flex h-5 items-center gap-0.5 rounded-pill px-1.5 text-xs", n ? "border border-border" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100", mine(e) && "border-accent bg-accent-soft")}
        >
          {e} {n > 0 && n}
        </button>
      ))}
    </div>
  );
}
