"use client";

import { useRouter } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { resetDemo } from "@/data/fake/store";
import { DEMO_MODE } from "@/lib/mode";

/** Aviso fijo en la demo: los datos son de ejemplo y viven solo en este navegador. */
export function DemoBanner() {
  const router = useRouter();
  if (!DEMO_MODE) return null;
  return (
    <div role="note" className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-mention-bg px-4 py-1.5 text-xs text-on-mention">
      <FlaskConical className="size-3.5" aria-hidden />
      <span className="flex-1">
        <strong>Demo:</strong> datos de ejemplo, solo en este navegador.
        <span className="max-md:hidden"> Abre otra pestaña con otra persona para probar el trabajo en equipo.</span>
      </span>
      <button
        className="font-semibold underline underline-offset-2"
        onClick={() => {
          resetDemo();
          router.replace("/login");
        }}
      >
        Empezar de nuevo
      </button>
    </div>
  );
}
