"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu as MenuIcon } from "lucide-react";
import { useDB, useMe } from "@/data/hooks";
import { Skeleton } from "@/components/ui/feedback";
import { Sidebar } from "./sidebar";
import { SearchPalette } from "./search-palette";
import { ThemeSync } from "./theme-sync";
import { cn } from "@/lib/cn";
import { DemoBanner } from "./demo-banner";

export function AppShell({ children }: { children: React.ReactNode }) {
  const db = useDB();
  const me = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const ready = !!db;
  const noSession = ready && !me;
  const noWorkspace = ready && !!me && !me.workspace;

  useEffect(() => {
    if (noSession) router.replace("/login");
    else if (noWorkspace) router.replace("/onboarding");
  }, [noSession, noWorkspace, router]);

  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    // al navegar se cierra el cajón móvil
    setLastPath(pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        setCollapsed((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!ready || !me?.workspace) return <ShellSkeleton />;

  return (
    <div className="flex h-dvh overflow-hidden">
      <ThemeSync theme={me.profile.theme} />
      {/* escritorio */}
      <div className={cn("hidden shrink-0 md:block", collapsed && "md:hidden")}>
        <Sidebar onSearch={() => setSearchOpen(true)} onCollapse={() => setCollapsed(true)} />
      </div>
      {/* móvil: cajón */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button aria-label="Cerrar menú" className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full w-[min(300px,85vw)] shadow-pop">
            <Sidebar onSearch={() => setSearchOpen(true)} onCollapse={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <DemoBanner />
        <div className={cn("flex h-11 shrink-0 items-center gap-1 px-2 md:hidden", collapsed && "md:flex")}>
          <button
            className="rounded-md p-2 text-text-muted hover:bg-hover"
            aria-label="Abrir menú"
            onClick={() => (window.matchMedia("(min-width: 900px)").matches ? setCollapsed(false) : setMobileOpen(true))}
          >
            <MenuIcon className="size-5" />
          </button>
        </div>
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
      <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}

export function ShellSkeleton() {
  return (
    <div className="flex h-dvh" aria-busy="true" aria-label="Cargando">
      <div className="hidden w-[var(--layout-sidebar)] flex-col gap-3 bg-surface p-3 md:flex">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="mt-4 h-4 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-3 px-6 pt-20">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}
