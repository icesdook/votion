"use client";

import { useEffect } from "react";

/** Aplica la preferencia de tema del perfil al documento. */
export function ThemeSync({ theme }: { theme: "system" | "light" | "dark" }) {
  useEffect(() => {
    const el = document.documentElement;
    if (theme === "system") delete el.dataset.theme;
    else el.dataset.theme = theme;
  }, [theme]);
  return null;
}
