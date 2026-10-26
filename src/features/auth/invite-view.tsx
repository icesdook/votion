"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import * as api from "@/data/api";
import { DomainError } from "@/data/types";
import { useDB, useMe } from "@/data/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard } from "./login-view";
import { ViewSkeleton } from "@/features/shell/view-skeleton";

export function InviteView() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const db = useDB();
  const me = useMe();
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  if (!db) return <ViewSkeleton />;
  const inv = api.getInvite(token);

  if (inv.status === "not_found") {
    return (
      <AuthCard title="Invitación no encontrada" subtitle="El enlace puede estar incompleto. Pide a quien te invitó que te lo envíe de nuevo.">
        <Link href="/login" className="text-sm text-accent underline underline-offset-2">
          Ir a entrar
        </Link>
      </AuthCard>
    );
  }
  if (inv.status === "expired") {
    return <AuthCard title="Esta invitación venció" subtitle={`Pide a ${inv.inviter?.name || "quien te invitó"} que te envíe una nueva para ${inv.ws.name}.`}>{null}</AuthCard>;
  }
  if (inv.status === "used" || (me?.workspace && me.workspace.id === inv.ws.id)) {
    return (
      <AuthCard title={`Ya eres parte de ${inv.ws.name}`}>
        <Button variant="primary" className="w-full" onClick={() => router.replace("/w")}>
          Ir a la oficina
        </Button>
      </AuthCard>
    );
  }
  if (!me) {
    return (
      <AuthCard title={`Te invitaron a ${inv.ws.name}`} subtitle={`${inv.inviter?.name || "Alguien"} quiere que trabajes con su equipo. Entra con ${inv.invite.email} para aceptar.`}>
        <Button variant="primary" className="w-full" onClick={() => router.push(`/login?next=${encodeURIComponent(`/invite/${token}`)}`)}>
          Entrar para aceptar
        </Button>
      </AuthCard>
    );
  }
  if (me.workspace) {
    return <AuthCard title="Ya perteneces a otra oficina" subtitle={`Por ahora cada cuenta es parte de una sola oficina. Sal de ${me.workspace.name} o entra con otro correo.`}>{null}</AuthCard>;
  }

  return (
    <AuthCard title={`Únete a ${inv.ws.name}`} subtitle={`Invitación de ${inv.inviter?.name || "tu equipo"}.`}>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api.acceptInvite(token, name);
            router.replace("/w");
          } catch (err) {
            setError(
              err instanceof DomainError
                ? err.code === "member_limit_reached"
                  ? "La oficina ya completó su límite de personas."
                  : err.message
                : "No se pudo aceptar la invitación.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <Input label="Tu nombre" value={name || me.profile.name} onChange={(e) => setName(e.target.value)} required maxLength={60} error={error} autoFocus />
        <Button type="submit" variant="primary" size="lg" loading={busy}>
          Unirme
        </Button>
      </form>
    </AuthCard>
  );
}
