"use client";

import { useState } from "react";
import { History } from "lucide-react";
import * as api from "@/data/api";
import type { ID } from "@/data/types";
import { scanContent } from "@/data/api";
import { profileName, relTime, useCtx } from "@/data/hooks";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { EmptyState } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

export function HistoryDialog({ pageId, open, onOpenChange, canEdit }: { pageId: ID; open: boolean; onOpenChange: (v: boolean) => void; canEdit: boolean }) {
  const ctx = useCtx()!;
  const toast = useToast();
  const versions = ctx.db.pageVersions.filter((v) => v.pageId === pageId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [sel, setSel] = useState<ID | null>(null);
  const current = versions.find((v) => v.id === sel) ?? versions[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Historial de la página" description="Se guarda una versión cada 10 minutos de edición." className="w-[min(860px,calc(100vw-32px))]">
        {versions.length === 0 ? (
          <EmptyState icon={<History />} title="Aún no hay versiones anteriores" text="Aparecerán aquí a medida que el equipo edite la página." />
        ) : (
          <div className="flex min-h-[360px] flex-col gap-3 p-5 md:flex-row">
            <ul className="flex shrink-0 flex-col gap-1 md:w-56">
              {versions.map((v) => (
                <li key={v.id}>
                  <button onClick={() => setSel(v.id)} aria-current={v.id === current?.id} className={cn("w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-hover", v.id === current?.id && "bg-surface-2")}>
                    <span className="block font-medium">{relTime(v.createdAt)}</span>
                    <span className="block text-xs text-text-muted">{profileName(ctx.db, v.createdBy)}</span>
                  </button>
                </li>
              ))}
            </ul>
            {current && (
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <div className="max-h-[50vh] min-h-0 flex-1 overflow-y-auto rounded-md border border-border p-4">
                  <p className="mb-2 text-h3 font-semibold">{current.title || "Sin título"}</p>
                  <p className="text-sm whitespace-pre-wrap text-text-muted">{scanContent(current.content).text || "Página vacía."}</p>
                </div>
                {canEdit && (
                  <Button
                    variant="primary"
                    className="self-end"
                    onClick={async () => {
                      await api.restoreVersion(current.id);
                      onOpenChange(false);
                      toast({ text: "Versión restaurada. La anterior quedó guardada en el historial.", kind: "success" });
                    }}
                  >
                    Restaurar esta versión
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
