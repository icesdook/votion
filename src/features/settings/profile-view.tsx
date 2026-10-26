"use client";

import * as api from "@/data/api";
import { useMe } from "@/data/hooks";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ViewHeader, ViewSkeleton } from "@/features/shell/view-skeleton";
import { cn } from "@/lib/cn";

export function ProfileView() {
  const me = useMe();
  const toast = useToast();
  if (!me) return <ViewSkeleton />;
  const p = me.profile;
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[var(--layout-page-width)] px-6 pt-10 pb-24 max-md:px-4 max-md:pt-4">
        <ViewHeader title="Mi perfil" />
        <form
          className="flex max-w-md flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await api.updateProfile({ name: new FormData(e.currentTarget).get("name") as string });
            toast({ text: "Perfil guardado", kind: "success" });
          }}
        >
          <div className="flex items-center gap-3">
            <Avatar id={p.id} name={p.name || p.email} size={40} />
            <span className="text-sm text-text-muted">La foto de perfil llega con la versión conectada.</span>
          </div>
          <Input name="name" label="Nombre" defaultValue={p.name} maxLength={60} required />
          <Input label="Correo" value={p.email} disabled readOnly />
          <Button type="submit" variant="primary" className="self-start">
            Guardar
          </Button>
        </form>

        <section className="mt-10 flex max-w-md flex-col gap-4" aria-labelledby="h-pref">
          <h2 id="h-pref" className="text-sm font-semibold">
            Preferencias
          </h2>
          <fieldset>
            <legend className="mb-1 text-xs text-text-muted">Tema</legend>
            <div className="flex gap-1">
              {(["system", "light", "dark"] as const).map((t) => (
                <button
                  key={t}
                  aria-pressed={p.theme === t}
                  onClick={() => api.updateProfile({ theme: t })}
                  className={cn("h-8 rounded-md border border-border px-3 text-sm hover:bg-hover", p.theme === t && "border-accent bg-accent-soft text-on-accent-soft")}
                >
                  {t === "system" ? "Automático" : t === "light" ? "Claro" : "Oscuro"}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 size-4 accent-[var(--color-accent)]" checked={p.emailDigest} onChange={(e) => api.updateProfile({ emailDigest: e.target.checked })} />
            <span>
              Resumen por correo
              <span className="block text-xs text-text-muted">Cada mañana, si tienes menciones sin leer de más de una hora.</span>
            </span>
          </label>
        </section>
      </div>
    </div>
  );
}
