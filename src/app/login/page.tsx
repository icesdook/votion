import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginView } from "@/features/auth/login-view";
import { ViewSkeleton } from "@/features/shell/view-skeleton";

export const metadata: Metadata = { title: "Entrar" };

export default function Page() {
  return (
    <Suspense fallback={<ViewSkeleton />}>
      <LoginView />
    </Suspense>
  );
}
