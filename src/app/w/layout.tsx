import { Suspense } from "react";
import { AppShell, ShellSkeleton } from "@/features/shell/app-shell";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
