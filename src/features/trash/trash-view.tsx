"use client";

import { useState } from "react";
import { FileText, Search, Trash2, Undo2 } from "lucide-react";
import * as api from "@/data/api";
import type { ID } from "@/data/types";
import { access, profileName, relTime, useCtx } from "@/data/hooks";
import { LEVEL } from "@/data/access";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/feedback";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { ViewHeader, ViewSkeleton } from "@/features/shell/view-skeleton";

export function TrashView() {
  const ctx = useCtx();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [confirm, setConfirm] = useState<ID | null>(null);
  const [now] = useState(() => Date.now());
  if (!ctx) return <ViewSkeleton />;
  const { db, me, wsId } = ctx;
  // solo las raíces de lo borrado (no cada subpágina)
  const items = db.pages
    .filter((p) => p.workspaceId === wsId && p.archivedAt && access(db, p.id, me) >= LEVEL.view)
    .filter((p) => {
      const parent = p.parentId ? db.pages.find((x) => x.id === p.parentId) : null;
      return !parent || parent.archivedAt !== p.archivedAt;
    })
    .filter((p) => (p.title || "sin título").toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.archivedAt ?? "").localeCompare(a.archivedAt ?? ""));
  const target = db.pages.find((p) => p.id === confirm);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[var(--layout-page-width)] px-6 pt-10 pb-24 max-md:px-4 max-md:pt-4">
        <ViewHeader title="Papelera" />
        <p className="-mt-2 mb-4 text-sm text-text-muted">Lo que está aquí se borra solo a los 30 días.</p>
        <div className="mb-4">
          <Input label="Buscar en la papelera" hideLabel icon={<Search />} placeholder="Buscar en la papelera" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {items.length === 0 ? (
          <EmptyState icon={<Trash2 />} title={q ? "Nada coincide" : "La papelera está vacía"} />
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {items.map((p) => {
              const canEdit = access(db, p.id, me) >= LEVEL.edit;
              const canDelete = access(db, p.id, me) >= LEVEL.full;
              const days = Math.max(0, 30 - Math.floor((now - Date.parse(p.archivedAt!)) / 864e5));
              return (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                  <span className="w-5 text-center">{p.icon || <FileText className="size-4 text-text-muted" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{p.title || "Sin título"}</span>
                    <span className="block text-xs text-text-muted">
                      Borrada {relTime(p.archivedAt!)} · de {profileName(db, p.ownerId)} · se elimina en {days} días
                    </span>
                  </span>
                  {canEdit && (
                    <Button size="sm" variant="ghost" onClick={async () => (await api.restorePage(p.id), toast({ text: "Página restaurada", kind: "success" }))}>
                      <Undo2 /> Restaurar
                    </Button>
                  )}
                  {canDelete && (
                    <Button size="icon" variant="ghost" aria-label={`Borrar ${p.title || "página"} para siempre`} onClick={() => setConfirm(p.id)}>
                      <Trash2 />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <Dialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <DialogContent title="¿Borrar para siempre?" description={`"${target?.title || "Sin título"}" y sus subpáginas no se podrán recuperar.`}>
          <div className="flex justify-end gap-2 p-5">
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (confirm) await api.deletePage(confirm);
                setConfirm(null);
                toast({ text: "Borrada definitivamente", kind: "info" });
              }}
            >
              Borrar para siempre
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
