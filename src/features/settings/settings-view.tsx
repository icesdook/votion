"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy, LogOut, MailPlus, X } from "lucide-react";
import * as api from "@/data/api";
import type { ID } from "@/data/types";
import { DomainError } from "@/data/types";
import { membersOf, profileName, relTime, useCtx, useMe } from "@/data/hooks";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { ViewHeader, ViewSkeleton } from "@/features/shell/view-skeleton";
import { cn } from "@/lib/cn";

const ROLE = { owner: "Dueña o dueño", admin: "Administración", member: "Miembro" } as const;

export function SettingsView() {
  const ctx = useCtx();
  const meInfo = useMe();
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const tab = params.get("tab") === "members" ? "members" : "general";
  const [emails, setEmails] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ sent: string[]; rejected: { email: string; reason: string }[] }>();
  const [removing, setRemoving] = useState<ID | null>(null);
  if (!ctx || !meInfo?.workspace) return <ViewSkeleton />;
  const { db, me, wsId } = ctx;
  const ws = meInfo.workspace;
  const isAdmin = meInfo.member?.role !== "member";
  const members = membersOf(db, wsId);
  const invites = db.invites.filter((i) => i.workspaceId === wsId && !i.acceptedAt);
  const full = members.length + invites.filter((i) => i.expiresAt > new Date().toISOString()).length >= ws.memberLimit;

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) toast({ text: ok, kind: "success" });
    } catch (e) {
      toast({ text: e instanceof DomainError ? e.message : "No se pudo guardar.", kind: "error" });
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[var(--layout-page-width)] px-6 pt-10 pb-24 max-md:px-4 max-md:pt-4">
        <ViewHeader title="Ajustes de la oficina" />
        <div role="tablist" className="mb-6 flex gap-1 border-b border-border">
          {(["general", "members"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => router.replace(t === "members" ? "/w/settings?tab=members" : "/w/settings")}
              className={cn("-mb-px h-9 border-b-2 border-transparent px-3 text-sm text-text-muted hover:text-text", tab === t && "border-accent font-medium text-text")}
            >
              {t === "general" ? "General" : `Personas (${members.length}/${ws.memberLimit})`}
            </button>
          ))}
        </div>

        {tab === "general" ? (
          <form
            className="flex max-w-md flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const name = new FormData(e.currentTarget).get("name") as string;
              run(() => api.updateWorkspace({ name }), "Cambios guardados");
            }}
          >
            <Input name="name" label="Nombre de la oficina" defaultValue={ws.name} disabled={!isAdmin} maxLength={80} required />
            <div className="flex flex-col gap-1">
              <span className="text-xs text-text-muted">Ícono</span>
              <div className="flex flex-wrap gap-1">
                {["🏢", "🏬", "🏛️", "🧾", "⚖️", "🩺", "🛠️", "🎨", "📦", "🌱"].map((i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={!isAdmin}
                    aria-pressed={ws.icon === i}
                    aria-label={`Ícono ${i}`}
                    onClick={() => run(() => api.updateWorkspace({ icon: i }))}
                    className={cn("rounded-md p-1.5 text-xl hover:bg-hover disabled:opacity-50", ws.icon === i && "bg-accent-soft")}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
            {isAdmin ? (
              <Button type="submit" variant="primary" className="self-start">
                Guardar
              </Button>
            ) : (
              <p className="text-sm text-text-muted">Solo administración puede cambiar estos datos.</p>
            )}
            {meInfo.member?.role !== "owner" && (
              <div className="mt-8 border-t border-border pt-4">
                <Button type="button" variant="ghost" className="text-danger" onClick={() => setRemoving(me)}>
                  <LogOut /> Salir de la oficina
                </Button>
              </div>
            )}
          </form>
        ) : (
          <div className="flex flex-col gap-8">
            {isAdmin && (
              <section aria-labelledby="h-inv">
                <h2 id="h-inv" className="mb-2 text-sm font-semibold">
                  Invitar
                </h2>
                {full ? (
                  <p className="rounded-md bg-surface p-3 text-sm text-text-muted">La oficina llegó a {ws.memberLimit} personas (contando invitaciones pendientes).</p>
                ) : (
                  <form
                    className="flex flex-col gap-2 md:flex-row"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setBusy(true);
                      try {
                        setResult(await api.inviteMembers(emails.split(/[\s,;]+/).filter(Boolean)));
                        setEmails("");
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <div className="flex-1">
                      <Input label="Correos" hideLabel placeholder="nombre@empresa.cl, otra@empresa.cl" value={emails} onChange={(e) => setEmails(e.target.value)} />
                    </div>
                    <Button type="submit" variant="primary" loading={busy} disabled={!emails.trim()}>
                      <MailPlus /> Invitar
                    </Button>
                  </form>
                )}
                {result && (
                  <div className="mt-2 text-sm" role="status">
                    {result.sent.length > 0 && <p className="text-success">Invitación enviada a {result.sent.join(", ")}.</p>}
                    {result.rejected.map((r) => (
                      <p key={r.email} className="text-danger">
                        {r.email}: {r.reason}
                      </p>
                    ))}
                  </div>
                )}
              </section>
            )}

            <section aria-labelledby="h-mem">
              <h2 id="h-mem" className="mb-2 text-sm font-semibold">
                Personas
              </h2>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {members.map((m) => (
                  <li key={m.userId} className="flex items-center gap-3 px-3 py-2">
                    <Avatar id={m.userId} name={m.profile.name || m.profile.email} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {m.profile.name || "Sin nombre"}
                        {m.userId === me && <span className="text-text-muted"> (tú)</span>}
                      </span>
                      <span className="block truncate text-xs text-text-muted">{m.profile.email}</span>
                    </span>
                    {isAdmin && m.role !== "owner" && m.userId !== me ? (
                      <>
                        <select
                          aria-label={`Rol de ${m.profile.name}`}
                          value={m.role}
                          onChange={(e) => run(() => api.updateMemberRole(m.userId, e.target.value as "admin" | "member"))}
                          className="h-8 rounded-md border border-border bg-bg px-1 text-sm"
                        >
                          <option value="admin">{ROLE.admin}</option>
                          <option value="member">{ROLE.member}</option>
                        </select>
                        <Button size="icon" variant="ghost" aria-label={`Quitar a ${m.profile.name}`} onClick={() => setRemoving(m.userId)}>
                          <X />
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-text-muted">{ROLE[m.role]}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            {isAdmin && invites.length > 0 && (
              <section aria-labelledby="h-pend">
                <h2 id="h-pend" className="mb-2 text-sm font-semibold">
                  Invitaciones pendientes
                </h2>
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {invites.map((i) => {
                    const expired = i.expiresAt < new Date().toISOString();
                    return (
                      <li key={i.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{i.email}</span>
                          <span className={cn("block text-xs", expired ? "text-danger" : "text-text-muted")}>{expired ? "Vencida" : `Enviada ${relTime(new Date(Date.parse(i.expiresAt) - 7 * 864e5).toISOString())} por ${profileName(db, i.invitedBy)}`}</span>
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(`${location.origin}/invite/${i.token}`);
                              toast({ text: "Enlace de invitación copiado", kind: "success" });
                            } catch {
                              toast({ text: "No se pudo copiar.", kind: "error" });
                            }
                          }}
                        >
                          <Copy /> Copiar enlace
                        </Button>
                        <Button size="icon" variant="ghost" aria-label={`Anular invitación a ${i.email}`} onClick={() => run(() => api.revokeInvite(i.id))}>
                          <X />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
      <Dialog open={!!removing} onOpenChange={(v) => !v && setRemoving(null)}>
        <DialogContent
          title={removing === me ? "¿Salir de la oficina?" : `¿Quitar a ${removing ? profileName(db, removing) : ""}?`}
          description={removing === me ? "Perderás acceso a todas las páginas y conversaciones." : "Dejará de ver las páginas y conversaciones. Lo que escribió se mantiene."}
        >
          <div className="flex justify-end gap-2 p-5">
            <Button variant="ghost" onClick={() => setRemoving(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                const id = removing!;
                setRemoving(null);
                await run(() => api.removeMember(id));
                if (id === me) router.replace("/onboarding");
              }}
            >
              {removing === me ? "Salir" : "Quitar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
