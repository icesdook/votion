"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";
import * as api from "@/data/api";
import { DomainError, type Profile } from "@/data/types";
import { useDB, useMe } from "@/data/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { DEMO_MODE } from "@/lib/mode";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-surface px-4 py-10">
      <p className="flex items-center gap-2 text-h3 font-bold tracking-tight">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/telar-mark.svg" alt="" width={28} height={28} className="rounded-md" />
        Telar
      </p>
      <div className="w-full max-w-[400px] rounded-lg bg-bg p-6 shadow-card md:p-8">
        <h1 className="text-h2 font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-text-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}


export function LoginView() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const db = useDB();
  const me = useMe();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<Profile | null>(null);

  useEffect(() => {
    if (me) router.replace(next || (me.workspace ? "/w" : "/onboarding"));
  }, [me, next, router]);

  const finish = (p: Profile) => {
    api.completeSignIn(p.id);
  };

  if (sent) {
    return (
      <AuthCard title="Revisa tu correo" subtitle={`Te enviamos un enlace para entrar a ${sent.email}. Vence en 15 minutos.`}>
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <MailCheck className="size-10 text-accent" aria-hidden />
          {DEMO_MODE && (
            <Button variant="primary" className="w-full" onClick={() => finish(sent)}>
              Abrir el enlace (modo demo)
            </Button>
          )}
          <button className="text-sm text-text-muted underline underline-offset-2" onClick={() => setSent(null)}>
            Usar otro correo
          </button>
        </div>
      </AuthCard>
    );
  }

  const demoPeople = db?.profiles.filter((p) => db.members.some((m) => m.userId === p.id)).slice(0, 5) ?? [];

  return (
    <AuthCard title="Entra a tu oficina" subtitle="Sin contraseñas: te mandamos un enlace al correo.">
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(undefined);
          try {
            setSent(await api.signInWithEmail(email));
          } catch (err) {
            setError(err instanceof DomainError ? err.message : "No pudimos enviar el enlace. Intenta de nuevo.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Input label="Correo de trabajo" type="email" autoComplete="email" placeholder="nombre@empresa.cl" value={email} onChange={(e) => setEmail(e.target.value)} error={error} required autoFocus />
        <Button type="submit" variant="primary" size="lg" loading={busy}>
          Enviarme el enlace
        </Button>
      </form>
      {DEMO_MODE && demoPeople.length > 0 && (
        <div className="mt-8 border-t border-border pt-4">
          <p className="text-xs text-text-muted">Modo demo: entra como alguien del equipo de ejemplo. Abre otra pestaña con otra persona para probar el trabajo en conjunto.</p>
          <div className="mt-3 flex flex-col gap-1">
            {demoPeople.map((p) => (
              <button key={p.id} onClick={() => finish(p)} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-hover">
                <Avatar id={p.id} name={p.name} size={24} />
                <span className="flex-1">{p.name}</span>
                <span className="text-xs text-text-faint">{p.email}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthCard>
  );
}
