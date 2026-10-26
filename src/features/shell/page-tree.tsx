"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ChevronRight, FileText, Lock, MoreHorizontal, Plus, Star, StarOff, Table2, Trash2, ArrowRightLeft, Pencil } from "lucide-react";
import * as api from "@/data/api";
import { DomainError, type Page } from "@/data/types";
import { access, useCtx } from "@/data/hooks";
import { LEVEL } from "@/data/access";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

type Drop = { id: string; where: "before" | "after" | "inside" } | null;
const DRAG_MIME = "application/x-ofi-page";

export function PageTree({ root, pages, emptyText, onCreate }: { root: "shared" | "private"; pages: Page[]; emptyText: string; onCreate: () => void }) {
  const ctx = useCtx();
  const [drop, setDrop] = useState<Drop>(null);
  if (!ctx) return null;
  const { db, me } = ctx;
  const roots = pages
    .filter((p) => !p.parentId || !pages.some((x) => x.id === p.parentId)) // padres sin acceso: la página sube a la raíz
    .filter((p) => (root === "private" ? p.isPrivate && p.ownerId === me : !(p.isPrivate && p.ownerId === me)))
    .sort((a, b) => a.position - b.position);
  const hasDatabase = new Set(db.databases.map((d) => d.pageId));

  const children = (id: string) => pages.filter((p) => p.parentId === id).sort((a, b) => a.position - b.position);

  if (roots.length === 0) {
    return (
      <button onClick={onCreate} className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs text-text-faint hover:bg-hover">
        <Plus className="size-3.5" /> {emptyText}
      </button>
    );
  }

  return (
    <ul role="tree" aria-label={root === "private" ? "Páginas privadas" : "Páginas de la oficina"} className="flex flex-col gap-px">
      {roots.map((p) => (
        <TreeItem key={p.id} page={p} depth={0} getChildren={children} isDb={(id) => hasDatabase.has(id)} drop={drop} setDrop={setDrop} root={root} siblings={roots} />
      ))}
    </ul>
  );
}

function TreeItem({
  page,
  depth,
  getChildren,
  isDb,
  drop,
  setDrop,
  root,
  siblings,
}: {
  page: Page;
  depth: number;
  getChildren: (id: string) => Page[];
  isDb: (id: string) => boolean;
  drop: Drop;
  setDrop: (d: Drop) => void;
  root: "shared" | "private";
  siblings: Page[];
}) {
  const ctx = useCtx()!;
  const { db, me } = ctx;
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const kids = isDb(page.id) ? [] : getChildren(page.id);
  const active = pathname === `/w/p/${page.id}`;
  const containsActive = (id: string): boolean => getChildren(id).some((c) => pathname === `/w/p/${c.id}` || containsActive(c.id));
  const [expanded, setExpanded] = useState(() => containsActive(page.id));
  const [renaming, setRenaming] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const canEdit = access(db, page.id, me) >= LEVEL.edit;
  const fav = db.favorites.some((f) => f.userId === me && f.pageId === page.id);
  const sharedPrivate = page.isPrivate && page.ownerId !== me;

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      toast({ text: e instanceof DomainError ? e.message : "No se pudo completar la acción.", kind: "error" });
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dragged = e.dataTransfer.getData(DRAG_MIME);
    const where = drop?.where;
    setDrop(null);
    if (!dragged || dragged === page.id || !where) return;
    if (where === "inside") {
      const kidsNow = getChildren(page.id);
      run(() => api.movePage(dragged, page.id, kidsNow.length ? kidsNow[kidsNow.length - 1].position + 1 : 1));
      setExpanded(true);
    } else {
      const sibs = siblings.filter((s) => s.id !== dragged);
      const i = sibs.findIndex((s) => s.id === page.id);
      const before = where === "before" ? sibs[i - 1] : sibs[i];
      const after = where === "before" ? sibs[i] : sibs[i + 1];
      const pos = before && after ? (before.position + after.position) / 2 : before ? before.position + 1 : after ? after.position - 1 : 1;
      run(() => api.movePage(dragged, page.parentId, pos, page.parentId ? {} : { isPrivate: root === "private" }));
    }
  };

  const dropHere = drop?.id === page.id ? drop.where : null;

  return (
    <li role="treeitem" aria-expanded={kids.length ? expanded : undefined} aria-selected={active} className="relative">
      <div
        ref={rowRef}
        draggable={canEdit && !renaming}
        onDragStart={(e) => {
          e.dataTransfer.setData(DRAG_MIME, page.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes(DRAG_MIME) || !canEdit) return;
          e.preventDefault();
          const r = rowRef.current!.getBoundingClientRect();
          const y = (e.clientY - r.top) / r.height;
          const where = isDb(page.id) ? (y < 0.5 ? "before" : "after") : y < 0.25 ? "before" : y > 0.75 ? "after" : "inside";
          if (drop?.id !== page.id || drop.where !== where) setDrop({ id: page.id, where });
        }}
        onDragLeave={() => dropHere && setDrop(null)}
        onDrop={onDrop}
        onDragEnd={() => setDrop(null)}
        className={cn(
          "group relative flex h-7 items-center gap-1 rounded-md pr-1 text-text-muted hover:bg-hover hover:text-text max-md:h-9",
          active && "bg-surface-2 font-medium text-text",
          dropHere === "inside" && "bg-accent-soft text-on-accent-soft",
        )}
        style={{ paddingLeft: 4 + depth * 14 }}
      >
        {dropHere === "before" && <span className="pointer-events-none absolute inset-x-1 -top-px h-0.5 rounded bg-accent" />}
        {dropHere === "after" && <span className="pointer-events-none absolute inset-x-1 -bottom-px h-0.5 rounded bg-accent" />}
        <button
          aria-label={expanded ? "Contraer" : "Expandir"}
          tabIndex={-1}
          onClick={() => setExpanded((v) => !v)}
          className={cn("flex size-5 shrink-0 items-center justify-center rounded-sm hover:bg-surface-2", !kids.length && "invisible")}
        >
          <ChevronRight className={cn("size-3.5 transition-transform", expanded && "rotate-90")} />
        </button>
        {renaming ? (
          <input
            autoFocus
            aria-label="Nombre de la página"
            defaultValue={page.title}
            className="h-6 min-w-0 flex-1 rounded-sm border border-accent bg-bg px-1 text-sm text-text outline-none"
            onBlur={(e) => {
              setRenaming(false);
              if (e.target.value !== page.title) run(() => api.savePage(page.id, { title: e.target.value }));
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setRenaming(false);
            }}
          />
        ) : (
          <Link
            href={`/w/p/${page.id}`}
            className="flex min-w-0 flex-1 items-center gap-1.5 outline-none"
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" && kids.length) setExpanded(true);
              if (e.key === "ArrowLeft") setExpanded(false);
              if (e.key === "F2" && canEdit) setRenaming(true);
            }}
          >
            <span className="flex w-4 shrink-0 justify-center text-sm" aria-hidden>
              {page.icon || (isDb(page.id) ? <Table2 className="size-4" /> : <FileText className="size-4" />)}
            </span>
            <span className={cn("truncate", !page.title && "text-text-faint")}>{page.title || "Sin título"}</span>
            {sharedPrivate && <Lock className="size-3 shrink-0 text-text-faint" aria-label="Privada, compartida contigo" />}
          </Link>
        )}
        <div className="flex items-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 max-md:opacity-100">
          <Menu>
            <MenuTrigger aria-label={`Opciones de ${page.title || "la página"}`} className="rounded-sm p-0.5 hover:bg-surface-2">
              <MoreHorizontal className="size-4" />
            </MenuTrigger>
            <MenuContent align="start">
              <MenuItem onSelect={() => run(() => api.toggleFavorite(page.id))}>
                {fav ? <StarOff /> : <Star />} {fav ? "Quitar de favoritos" : "Agregar a favoritos"}
              </MenuItem>
              {canEdit && (
                <MenuItem onSelect={() => setTimeout(() => setRenaming(true), 0)}>
                  <Pencil /> Cambiar nombre
                </MenuItem>
              )}
              {canEdit && !page.parentId && page.ownerId === me && (
                <MenuItem onSelect={() => run(() => api.movePage(page.id, null, Date.now(), { isPrivate: !page.isPrivate }))}>
                  <ArrowRightLeft /> {page.isPrivate ? "Mover a Oficina" : "Mover a Privado"}
                </MenuItem>
              )}
              {canEdit && page.parentId && (
                <MenuItem onSelect={() => run(() => api.movePage(page.id, null, Date.now(), { isPrivate: false }))}>
                  <ArrowRightLeft /> Sacar a la raíz
                </MenuItem>
              )}
              {canEdit && (
                <>
                  <MenuSeparator />
                  <MenuItem
                    danger
                    onSelect={() =>
                      run(async () => {
                        await api.archivePage(page.id);
                        if (active) router.push("/w");
                        toast({ text: "Movida a la papelera", kind: "info", action: { label: "Deshacer", run: () => api.restorePage(page.id) } });
                      })
                    }
                  >
                    <Trash2 /> Mover a la papelera
                  </MenuItem>
                </>
              )}
            </MenuContent>
          </Menu>
          {canEdit && !isDb(page.id) && (
            <button
              aria-label="Agregar subpágina"
              className="rounded-sm p-0.5 hover:bg-surface-2"
              onClick={() =>
                run(async () => {
                  const p = await api.createPage({ parentId: page.id });
                  setExpanded(true);
                  router.push(`/w/p/${p.id}`);
                })
              }
            >
              <Plus className="size-4" />
            </button>
          )}
        </div>
      </div>
      {expanded && kids.length > 0 && (
        <ul role="group" className="flex flex-col gap-px">
          {kids.map((k) => (
            <TreeItem key={k.id} page={k} depth={depth + 1} getChildren={getChildren} isDb={isDb} drop={drop} setDrop={setDrop} root={root} siblings={kids} />
          ))}
        </ul>
      )}
    </li>
  );
}
