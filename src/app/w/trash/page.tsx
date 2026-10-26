import type { Metadata } from "next";
import { Suspense } from "react";
import { TrashView } from "@/features/trash/trash-view";
import { ViewSkeleton } from "@/features/shell/view-skeleton";

export const metadata: Metadata = { title: "Papelera" };

export default function Page() {
  return (
    <Suspense fallback={<ViewSkeleton />}>
      <TrashView />
    </Suspense>
  );
}
