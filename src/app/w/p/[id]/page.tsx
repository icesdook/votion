import type { Metadata } from "next";
import { Suspense } from "react";
import { PageView } from "@/features/page/page-view";
import { ViewSkeleton } from "@/features/shell/view-skeleton";

export const metadata: Metadata = { title: "Página" };

export default function Page() {
  return (
    <Suspense fallback={<ViewSkeleton />}>
      <PageView />
    </Suspense>
  );
}
