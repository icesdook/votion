"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import * as api from "@/data/api";
import { DomainError } from "@/data/types";
import { useDB, useMe } from "@/data/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard } from "./login-view";
import { ViewSkeleton } from "@/features/shell/view-skeleton";

export function OnboardingView() {
  const router = useRouter();
  const db = useDB();
  const me = useMe();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState<string | null>(null);
  const [office, setOffice] = useState("");
  const [emails, setEmails] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ sent: string[]; rejected: { email: string; reason: string }[] }>();
  // al crear la oficina aquí mismo, no redirigir: falta el paso de invitar
  const creating = useRef(false);

  useEffect(() => {
    if (db && !me) router.replace("/login");
    else if (me?.workspace && step === 1 && !creating.current) router.replace("/w");
  }, [db, me, step, router]);

  if (!db || !me) return <ViewSkeleton />;

  if (step === 1) {
    return (
      <AuthCard title="Crea tu oficina" subtitle="Un espacio para las páginas, tareas y conversaciones de tu equipo.">
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(undefined);
            creating.current = true;
            try {
              await api.createWorkspace(office, name ?? me.profile.name);
              setStep(2);
            } catch (err) {
              creating.current = false;
              setError(err instanceof DomainError ? err.message : "No se pudo crear la oficina.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Input label="Tu nombre" value={name ?? me.profile.name} onChange={(e) => setName(e.target.value)} required maxLength={60} autoComplete="name" autoFocus />
          <Input label="Nombre de la oficina" placeholder="Ej: Estudio Contable Biobío" value={office} onChange={(e) => setOffice(e.target.value)} required maxLength={80} error={error} />
          <Button type="submit" variant="primary" size="lg" loading={busy}>
            Continuar
          </Button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Invita a tu equipo" subtitle="Hasta 10 personas en total. Les llegará un enlace para unirse.">
      {result ? (
        <div className="flex flex-col gap-4">
          {result.sent.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm">
              {result.sent.map((e) => (
                <li key={e} className="flex items-center gap-2">
                  <Check className="size-4 text-success" /> {e}
                </li>
              ))}
            </ul>
          )}
          {result.rejected.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm text-danger">
              {result.rejected.map((r) => (
                <li key={r.email}>
                  {r.email}: {r.reason}
                </li>
              ))}
            </ul>
          )}
          <Button variant="primary" size="lg" onClick={() => router.replace("/w")}>
            Ir a mi oficina
          </Button>
        </div>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const list = emails.split(/[\s,;]+/).filter(Boolean);
            if (!list.length) return router.replace("/w");
            setBusy(true);
            try {
              setResult(await api.inviteMembers(list));
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="emails" className="text-xs text-text-muted">
              Correos (separados por coma o en líneas distintas)
            </label>
            <textarea
              id="emails"
              rows={4}
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder={"ana@empresa.cl\nbeto@empresa.cl"}
              className="rounded-md border border-border-input bg-bg px-2.5 py-2 text-sm placeholder:text-text-faint focus:border-accent focus:outline-2 focus:outline-offset-0 focus:outline-focus"
            />
          </div>
          <Button type="submit" variant="primary" size="lg" loading={busy}>
            {emails.trim() ? "Enviar invitaciones" : "Lo haré después"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
