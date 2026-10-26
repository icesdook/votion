import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsView } from "@/features/settings/settings-view";
import { ViewSkeleton } from "@/features/shell/view-skeleton";

export const metadata: Metadata = { title: "Ajustes" };

export default function Page() {
  return (
    <Suspense fallback={<ViewSkeleton />}>
      <SettingsView />
    </Suspense>
  );
}
