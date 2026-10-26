"use client";

import { useState } from "react";
import { Building2, Link2, Lock } from "lucide-react";
import * as api from "@/data/api";
import type { AccessLevel, ID, Page } from "@/data/types";
import { DomainError } from "@/data/types";
import { ancestry, levelLabel } from "@/data/access";
import { access, membersOf, useCtx } from "@/data/hooks";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";

const LEVELS: AccessLevel[] = ["full", "edit", "comment", "view"];

export function SharePopover({ page }: { page: Page }) {
  const ctx = useCtx()!;
  const { db, me, wsId } = ctx;
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const mine = access(db, page.id, me);
  const canManage = mine >= 4;
  const root = ancestry(db, page.id).at(-1)!;
  const isPrivate = ancestry(db, page.id).some((p) => p.isPrivate);
  const members = membersOf(db, wsId);
  const ws = db.workspaces.find((w) => w.id === wsId)!;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast({ text: e instanceof DomainError ? e.message : "No se pudo cambiar el acceso.", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  const explicit = (u: ID) => db.pagePermissions.find((p) => p.pageId === page.id && p.userId === u)?.level;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          {isPrivate ? <Lock /> : null} Compartir
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(380px,calc(100vw-16px))] p-3">
        <p className="mb-2 text-sm font-semibold">Quién puede ver esta página</p>
        <div className="mb-3 flex items-center gap-3 rounded-md bg-surface p-2">
          {isPrivate ? <Lock className="size-5 text-text-muted" /> : <Building2 className="size-5 text-text-muted" />}
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium">{isPrivate ? "Privada" : `Todo ${ws.name}`}</p>
            <p className="text-xs text-text-muted">
              {isPrivate ? "Solo tú y las personas que agregues abajo." : "Cualquier persona de la oficina puede verla y editarla."}
              {page.parentId && " Se hereda de la página principal."}
            </p>
          </div>
          {canManage && !page.parentId && (
            <select
              aria-label="Acceso general"
              disabled={busy}
              value={page.isPrivate ? "private" : "ws"}
              onChange={(e) => run(() => api.setPageAccess(page.id, e.target.value === "private"))}
              className="h-7 rounded-md border border-border bg-bg px-1 text-sm"
            >
              <option value="ws">Toda la oficina</option>
              <option value="private" disabled={page.ownerId !== me}>
                Privada
              </option>
            </select>
          )}
        </div>

        <p className="mb-1 text-xs text-text-muted">Personas</p>
        <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
          {members.map((m) => {
            const eff = access(db, page.id, m.userId);
            const ex = explicit(m.userId);
            const owner = root.ownerId === m.userId || page.ownerId === m.userId;
            return (
              <li key={m.userId} className="flex items-center gap-2 text-sm">
                <Avatar id={m.userId} name={m.profile.name || m.profile.email} size={24} />
                <span className="min-w-0 flex-1 truncate">
                  {m.profile.name || m.profile.email}
                  {m.userId === me && <span className="text-text-muted"> (tú)</span>}
                </span>
                {canManage && m.userId !== me && !owner ? (
                  <select
                    aria-label={`Acceso de ${m.profile.name}`}
                    disabled={busy}
                    value={ex ?? "inherit"}
                    onChange={(e) => run(() => (e.target.value === "inherit" ? api.revokePermission(page.id, m.userId) : api.grantPermission(page.id, m.userId, e.target.value as AccessLevel)))}
                    className="h-7 rounded-md border border-border bg-bg px-1 text-xs"
                  >
                    <option value="inherit">{eff && !ex ? `${levelLabel(eff)} (general)` : "Sin acceso"}</option>
                    {LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {levelLabel(({ full: 4, edit: 3, comment: 2, view: 1 } as const)[l])}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-text-muted">{owner ? "Creó la página" : levelLabel(eff)}</span>
                )}
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex justify-between border-t border-border pt-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(`${location.origin}/w/p/${page.id}`);
                toast({ text: "Enlace copiado. Solo funciona para quien tenga acceso.", kind: "success" });
              } catch {
                toast({ text: "No se pudo copiar el enlace.", kind: "error" });
              }
            }}
          >
            <Link2 /> Copiar enlace
          </Button>
          {!canManage && <span className="self-center text-xs text-text-muted">Pide acceso total para cambiar esto.</span>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
