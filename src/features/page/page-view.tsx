"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronRight, FileQuestion, History, Lock, Maximize2, MessageCircle, MessageSquare, MoreHorizontal, MoveHorizontal, Pencil, Star, StarOff, Trash2, Undo2 } from "lucide-react";
import * as api from "@/data/api";
import type { ID, Page, PageContent } from "@/data/types";
import { DomainError } from "@/data/types";
import { ancestry, LEVEL } from "@/data/access";
import { access, profileName, relTime, useCtx } from "@/data/hooks";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import { Dialog, DialogContent, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, Popover, PopoverContent, PopoverTrigger, Tooltip } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { ViewSkeleton } from "@/features/shell/view-skeleton";
import { DatabaseView } from "@/features/database/database-view";
import { CellEditor, propsOf } from "@/features/database/cells";
import { CommentsPanel, type Draft } from "./comments-panel";
import { SharePopover } from "./share-popover";
import { HistoryDialog } from "./history-dialog";
import { PageChatDock } from "./page-chat-dock";
import { cn } from "@/lib/cn";

const PageEditor = dynamic(() => import("./editor").then((m) => m.PageEditor), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col gap-2 py-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  ),
});

const ICONS = ["📄", "📘", "📝", "✅", "📌", "💡", "🗓️", "📊", "🤝", "🏢", "🎯", "🚀", "🧾", "📣", "🔒", "⭐", "🧠", "🛠️", "💬", "🏖️"];

export function PageView() {
  const { id } = useParams<{ id: string }>();
  const ctx = useCtx();
  if (!ctx) return <ViewSkeleton />;
  return <PageBody key={id} pageId={id} />;
}

function useDarkMode() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const read = () => {
      const t = document.documentElement.dataset.theme;
      setDark(t ? t === "dark" : mq.matches);
    };
    read();
    mq.addEventListener("change", read);
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => (mq.removeEventListener("change", read), obs.disconnect());
  }, []);
  return dark;
}

/** Bloqueo suave: renueva cada 30 s mientras la página está abierta. */
function useSoftLock(pageId: ID, canEdit: boolean) {
  const [holder, setHolder] = useState<ID | null | "pending">(canEdit ? "pending" : null);
  const [mine, setMine] = useState(false);
  useEffect(() => {
    if (!canEdit) return;
    let alive = true;
    const tick = async () => {
      const r = await api.lockPage(pageId);
      if (!alive) return;
      setMine(r.ok);
      setHolder(r.holder);
    };
    tick();
    const t = setInterval(tick, 30_000);
    const onUnload = () => api.unlockPage(pageId);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener("beforeunload", onUnload);
      api.unlockPage(pageId);
    };
  }, [pageId, canEdit]);
  return { mine, holder };
}

export function PageBody({ pageId, embedded, onOpenAsPage }: { pageId: ID; embedded?: boolean; onOpenAsPage?: () => void }) {
  const ctx = useCtx()!;
  const { db, me } = ctx;
  const router = useRouter();
  const toast = useToast();
  const dark = useDarkMode();
  const page = db.pages.find((p) => p.id === pageId);
  const level = page ? access(db, pageId, me) : 0;
  const canEdit = level >= LEVEL.edit && !page?.archivedAt;
  const canComment = level >= LEVEL.comment && !page?.archivedAt;
  const lock = useSoftLock(pageId, canEdit);
  const [panel, setPanel] = useState<"comments" | "chat" | null>(null);
  const [draft, setDraft] = useState<Draft>(null);
  const [history, setHistory] = useState(false);
  const [peek, setPeek] = useState<ID | null>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pendingContent = useRef<PageContent | null>(null);
  const [initial] = useState(() => page?.content ?? []);

  const flush = useCallback(async () => {
    if (!pendingContent.current) return;
    const content = pendingContent.current;
    pendingContent.current = null;
    setSaving("saving");
    try {
      await api.savePage(pageId, { content });
      setSaving("saved");
    } catch (e) {
      setSaving("error");
      toast({ text: e instanceof DomainError ? e.message : "No se pudo guardar. Revisa tu conexión.", kind: "error" });
    }
  }, [pageId, toast]);

  useEffect(() => () => {
    clearTimeout(timer.current);
    flush();
  }, [flush]);

  useEffect(() => {
    if (page && !embedded) document.title = `${page.title || "Sin título"}`;
  }, [page, embedded]);

  if (!page) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState icon={<FileQuestion />} title="Esta página no existe" text="Puede que la hayan borrado definitivamente." action={<Button onClick={() => router.push("/w")}>Ir al inicio</Button>} />
      </div>
    );
  }
  if (level < LEVEL.view) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState icon={<Lock />} title="No tienes acceso a esta página" text={`Pide a ${profileName(db, page.ownerId)} que la comparta contigo.`} action={<Button onClick={() => router.push("/w")}>Ir al inicio</Button>} />
      </div>
    );
  }

  const database = db.databases.find((d) => d.pageId === pageId);
  const row = page.isDatabaseRow ? db.dbRows.find((r) => r.pageId === pageId) : undefined;
  const chain = ancestry(db, pageId).reverse();
  const fav = db.favorites.some((f) => f.userId === me && f.pageId === pageId);
  const lockedByOther = canEdit && !lock.mine && lock.holder && lock.holder !== "pending";
  const editorEditable = canEdit && lock.mine;
  const openThreads = db.commentThreads.filter((t) => t.pageId === pageId && !t.resolvedAt).length;

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      toast({ text: e instanceof DomainError ? e.message : "No se pudo completar la acción.", kind: "error" });
    }
  };

  const jumpToBlock = (blockId: string) => {
    const el = document.querySelector<HTMLElement>(`[data-page-editor="${pageId}"] [data-id="${blockId}"]`);
    if (!el) return toast({ text: "Ese texto ya no está en la página.", kind: "info" });
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ofi-flash");
    setTimeout(() => el.classList.remove("ofi-flash"), 1600);
  };

  const body = (
    <div className={cn("mx-auto w-full px-6 pt-10 pb-32 max-md:px-4 max-md:pt-6", page.fullWidth || database ? "max-w-[var(--layout-page-width-wide)]" : "max-w-[var(--layout-page-width)]")}>
      {page.archivedAt && (
        <div role="status" className="mb-6 flex flex-wrap items-center gap-3 rounded-md bg-tag-red-bg px-3 py-2 text-sm text-tag-red">
          <Trash2 className="size-4" /> Esta página está en la papelera.
          <span className="flex-1" />
          {level >= LEVEL.edit && (
            <Button size="sm" onClick={() => run(() => api.restorePage(pageId))}>
              <Undo2 /> Restaurar
            </Button>
          )}
        </div>
      )}
      {lockedByOther && (
        <div role="status" className="mb-6 flex items-center gap-2 rounded-md bg-mention-bg px-3 py-2 text-sm text-on-mention">
          <Pencil className="size-4" /> {profileName(db, lock.holder as ID)} está editando esta página. Puedes leer y comentar; los cambios aparecen solos.
        </div>
      )}

      <div className="group/title mb-2">
        {canEdit ? (
          <Popover>
            <PopoverTrigger aria-label="Cambiar ícono" className={cn("mb-2 rounded-md text-4xl leading-none hover:bg-hover", !page.icon && "text-base text-text-faint opacity-0 group-hover/title:opacity-100 focus-visible:opacity-100 max-md:opacity-100")}>
              {page.icon || "Agregar ícono"}
            </PopoverTrigger>
            <PopoverContent align="start" className="grid w-64 grid-cols-6 gap-1 p-2">
              {ICONS.map((i) => (
                <button key={i} onClick={() => run(() => api.savePage(pageId, { icon: i }))} className="rounded-sm p-1 text-xl hover:bg-hover" aria-label={`Ícono ${i}`}>
                  {i}
                </button>
              ))}
              {page.icon && (
                <button onClick={() => run(() => api.savePage(pageId, { icon: null }))} className="col-span-6 mt-1 rounded-sm py-1 text-sm text-text-muted hover:bg-hover">
                  Quitar ícono
                </button>
              )}
            </PopoverContent>
          </Popover>
        ) : (
          page.icon && <div className="mb-2 text-4xl leading-none">{page.icon}</div>
        )}
        <TitleInput page={page} readOnly={!canEdit} onEnter={() => focusEditorWhenReady(pageId)} />
        <p className="mt-1 text-xs text-text-faint">
          Editada {relTime(page.updatedAt)}
          {page.updatedBy && ` por ${profileName(db, page.updatedBy)}`}
          {saving === "saving" && " · Guardando…"}
          {saving === "saved" && " · Guardado"}
          {saving === "error" && <span className="text-danger"> · No se guardó</span>}
        </p>
      </div>

      {row && (
        <dl className="mb-6 grid grid-cols-[minmax(110px,160px)_1fr] gap-y-0.5 border-b border-border pb-4 text-sm">
          {propsOf(db, row.databaseId).map((p) => (
            <div key={p.id} className="contents">
              <dt className="flex h-8 items-center text-text-muted">{p.name}</dt>
              <dd className="rounded-md">
                <CellEditor prop={p} value={row.values[p.id]} readOnly={!canEdit} onChange={(v) => run(() => api.updateRowValues(row.id, { [p.id]: v }))} />
              </dd>
            </div>
          ))}
        </dl>
      )}

      {database ? (
        <DatabaseView databaseId={database.id} onOpenRow={setPeek} />
      ) : (
        <PageEditor
          pageId={pageId}
          initial={initial}
          editable={!!editorEditable}
          canComment={canComment}
          dark={dark}
          remoteContent={page.content}
          onChange={(content) => {
            pendingContent.current = content;
            setSaving("saving");
            clearTimeout(timer.current);
            timer.current = setTimeout(flush, 600);
          }}
          onComment={(blockId, quote) => {
            setDraft({ blockId, quote });
            setPanel("comments");
          }}
        />
      )}
    </div>
  );

  const side = panel && (
    <div className="fixed inset-0 z-30 bg-bg md:static md:z-auto md:w-[var(--layout-chat-dock)] md:shrink-0 md:border-l md:border-border">
      {panel === "comments" ? (
        <CommentsPanel pageId={pageId} draft={draft} onDraftDone={() => setDraft(null)} onClose={() => (setPanel(null), setDraft(null))} onJump={jumpToBlock} />
      ) : (
        <PageChatDock pageId={pageId} onClose={() => setPanel(null)} />
      )}
    </div>
  );

  const actions = (
    <div className="flex items-center gap-0.5">
      {!embedded && <SharePopover page={page} />}
      {canComment && (
        <Tooltip label="Conversar sobre esta página">
          <Button variant="ghost" size="icon" aria-label="Conversar sobre esta página" aria-pressed={panel === "chat"} onClick={() => setPanel(panel === "chat" ? null : "chat")}>
            <MessageCircle />
          </Button>
        </Tooltip>
      )}
      <Tooltip label="Comentarios">
        <Button variant="ghost" size={openThreads ? "sm" : "icon"} aria-label={`Comentarios${openThreads ? `, ${openThreads} abiertos` : ""}`} aria-pressed={panel === "comments"} onClick={() => setPanel(panel === "comments" ? null : "comments")}>
          <MessageSquare />
          {openThreads > 0 && <span className="text-xs">{openThreads}</span>}
        </Button>
      </Tooltip>
      <Menu>
        <MenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Más opciones de la página">
            <MoreHorizontal />
          </Button>
        </MenuTrigger>
        <MenuContent align="end">
          <MenuItem onSelect={() => run(() => api.toggleFavorite(pageId))}>
            {fav ? <StarOff /> : <Star />} {fav ? "Quitar de favoritos" : "Agregar a favoritos"}
          </MenuItem>
          {canEdit && !database && (
            <MenuItem onSelect={() => run(() => api.savePage(pageId, { fullWidth: !page.fullWidth }))}>
              <MoveHorizontal /> {page.fullWidth ? "Ancho normal" : "Ancho completo"}
            </MenuItem>
          )}
          {!database && (
            <MenuItem onSelect={() => setHistory(true)}>
              <History /> Historial
            </MenuItem>
          )}
          {embedded && onOpenAsPage && (
            <MenuItem onSelect={onOpenAsPage}>
              <Maximize2 /> Abrir como página
            </MenuItem>
          )}
          {canEdit && (
            <>
              <MenuSeparator />
              <MenuItem
                danger
                onSelect={() =>
                  run(async () => {
                    await api.archivePage(pageId);
                    toast({ text: "Movida a la papelera", kind: "info", action: { label: "Deshacer", run: () => api.restorePage(pageId) } });
                    if (!embedded) router.push(page.parentId ? `/w/p/${page.parentId}` : "/w");
                  })
                }
              >
                <Trash2 /> Mover a la papelera
              </MenuItem>
            </>
          )}
        </MenuContent>
      </Menu>
    </div>
  );

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className={cn("flex h-11 shrink-0 items-center gap-2 px-3", embedded && "pr-10")}>
          <nav aria-label="Ruta" className="flex min-w-0 flex-1 items-center gap-1 text-sm text-text-muted">
            {chain.map((p, i) => (
              <span key={p.id} className={cn("flex min-w-0 items-center gap-1", i < chain.length - 2 && "max-md:hidden")}>
                {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-text-faint" />}
                {i === chain.length - 1 ? (
                  <span className="truncate text-text" aria-current="page">
                    {p.icon} {p.title || "Sin título"}
                  </span>
                ) : (
                  <Link href={`/w/p/${p.id}`} className="truncate rounded-sm px-1 hover:bg-hover">
                    {p.icon} {p.title || "Sin título"}
                  </Link>
                )}
              </span>
            ))}
            {ancestry(db, pageId).some((p) => p.isPrivate) && <Lock className="ml-1 size-3.5 shrink-0" aria-label="Privada" />}
          </nav>
          {actions}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
      </div>
      {side}
      {!database && <HistoryDialog pageId={pageId} open={history} onOpenChange={setHistory} canEdit={canEdit} />}
      <Dialog open={!!peek} onOpenChange={(v) => !v && setPeek(null)}>
        {peek && (
          <DialogContent title={db.pages.find((p) => p.id === peek)?.title || "Tarea"} side="right" className="overflow-hidden [&>h2]:sr-only">
            <div className="min-h-0 flex-1">
              <PageBody key={peek} pageId={peek} embedded onOpenAsPage={() => (router.push(`/w/p/${peek}`), setPeek(null))} />
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

/** Enter en el título: pasa al editor aunque aún esté cargando (sin que lo escrito caiga en el título). */
function focusEditorWhenReady(pageId: ID) {
  (document.activeElement as HTMLElement | null)?.blur();
  const started = Date.now();
  const tryFocus = () => {
    const el = document.querySelector<HTMLElement>(`[data-page-editor="${pageId}"] [contenteditable="true"]`);
    if (el) return el.focus();
    if (Date.now() - started < 4000) requestAnimationFrame(tryFocus);
  };
  tryFocus();
}

function TitleInput({ page, readOnly, onEnter }: { page: Page; readOnly: boolean; onEnter: () => void }) {
  const [value, setValue] = useState(page.title);
  const focused = useRef(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!focused.current) setValue(page.title);
  }, [page.title]);

  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }, [value]);

  useEffect(() => {
    if (!readOnly && !page.title && Date.now() - Date.parse(page.createdAt) < 5000) ref.current?.focus();
  }, [readOnly, page.title, page.createdAt]);

  return (
    <textarea
      ref={ref}
      rows={1}
      aria-label="Título"
      value={value}
      readOnly={readOnly}
      placeholder="Sin título"
      maxLength={200}
      onFocus={() => (focused.current = true)}
      onBlur={() => {
        focused.current = false;
        clearTimeout(timer.current);
        if (value !== page.title) api.savePage(page.id, { title: value });
      }}
      onChange={(e) => {
        const v = e.target.value.replace(/\n/g, "");
        setValue(v);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => api.savePage(page.id, { title: v }), 500);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onEnter();
        }
      }}
      className="w-full resize-none overflow-hidden bg-transparent text-title leading-tight font-bold break-words outline-none placeholder:text-text-faint max-md:text-h1"
    />
  );
}
