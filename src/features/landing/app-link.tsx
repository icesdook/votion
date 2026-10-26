"use client";

import Link from "next/link";
import { useSessionUserId } from "@/data/hooks";
import { cn } from "@/lib/cn";

/** Botón principal: "Probar gratis" o "Ir a mi oficina" si ya hay sesión en este navegador. */
export function AppLink({ variant }: { variant: "header" | "hero" }) {
  const session = useSessionUserId();
  const label = session ? "Ir a mi oficina" : variant === "header" ? "Entrar" : "Probar gratis 30 días";
  const href = session ? "/w" : "/login";
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        variant === "hero" ? "h-12 bg-accent px-6 text-base text-on-accent hover:brightness-95" : "h-9 border border-border px-4 text-sm hover:bg-hover",
      )}
    >
      {label}
    </Link>
  );
}
