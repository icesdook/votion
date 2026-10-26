"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Hash } from "lucide-react";
import * as api from "@/data/api";
import { DomainError } from "@/data/types";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function NewChannelDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setName("");
          setError(undefined);
        }
      }}
    >
      <DialogContent title="Nuevo canal" description="Un canal es una conversación abierta para toda la oficina, sobre un tema o proyecto.">
        <form
          className="flex flex-col gap-4 p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const ch = await api.createChannel(name);
              onOpenChange(false);
              setName("");
              router.push(`/w/c/${ch.id}`);
            } catch (err) {
              setError(err instanceof DomainError ? err.message : "No se pudo crear el canal.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Input label="Nombre" icon={<Hash />} placeholder="ej: clientes" value={name} onChange={(e) => (setName(e.target.value), setError(undefined))} error={error} autoFocus maxLength={40} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={busy} disabled={!name.trim()}>
              Crear canal
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
