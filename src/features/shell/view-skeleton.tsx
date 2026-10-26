import { Skeleton } from "@/components/ui/feedback";

export function ViewSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[var(--layout-page-width)] flex-col gap-3 px-6 pt-16" aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-10 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

/** Encabezado común de vistas que no son páginas (bandeja, papelera, ajustes). */
export function ViewHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 pb-4">
      <h1 className="text-h2 font-semibold">{title}</h1>
      {children}
    </div>
  );
}
