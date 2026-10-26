"use client";

import Link from "next/link";
import { FileText, Lock } from "lucide-react";
import type { RichText } from "@/data/types";
import { access, profileName, useCtx } from "@/data/hooks";
import { LEVEL } from "@/data/access";

/** Muestra texto enriquecido: menciones y enlaces a páginas respetan permisos. */
export function RichView({ body }: { body: RichText }) {
  const ctx = useCtx();
  if (!ctx) return null;
  const { db, me } = ctx;
  return (
    <>
      {body.map((n, i) => {
        if (n.t === "text") return <span key={i}>{n.v}</span>;
        if (n.t === "br") return <br key={i} />;
        if (n.t === "user")
          return (
            <span key={i} className="rounded-sm bg-mention-bg px-0.5 font-medium text-on-mention">
              @{profileName(db, n.id)}
            </span>
          );
        const page = db.pages.find((p) => p.id === n.id);
        if (!page) return <span key={i} className="text-text-faint line-through">página eliminada</span>;
        if (access(db, page.id, me) < LEVEL.view)
          return (
            <span key={i} className="inline-flex items-center gap-1 text-text-muted">
              <Lock className="size-3" /> página sin acceso
            </span>
          );
        return (
          <Link key={i} href={`/w/p/${page.id}`} className="inline-flex items-center gap-1 rounded-sm font-medium underline decoration-border-input underline-offset-2 hover:bg-hover">
            {page.icon ? <span aria-hidden>{page.icon}</span> : <FileText className="size-3.5" aria-hidden />}
            {page.title || "Sin título"}
            {page.archivedAt && <span className="text-xs text-text-faint">(en papelera)</span>}
          </Link>
        );
      })}
    </>
  );
}

/** Vista previa de la primera página enlazada en un mensaje. */
export function PageCard({ pageId }: { pageId: string }) {
  const ctx = useCtx();
  if (!ctx) return null;
  const page = ctx.db.pages.find((p) => p.id === pageId);
  if (!page || page.archivedAt || access(ctx.db, page.id, ctx.me) < LEVEL.view) return null;
  const parent = page.parentId ? ctx.db.pages.find((p) => p.id === page.parentId) : null;
  return (
    <Link href={`/w/p/${page.id}`} className="mt-1 flex max-w-sm items-center gap-3 rounded-md border border-border bg-bg px-3 py-2 hover:bg-hover">
      <span className="text-lg" aria-hidden>
        {page.icon || <FileText className="size-5 text-text-muted" />}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{page.title || "Sin título"}</span>
        <span className="block truncate text-xs text-text-muted">{parent ? `En ${parent.title || "Sin título"}` : page.isDatabaseRow ? "Tarea" : "Página"}</span>
      </span>
    </Link>
  );
}
