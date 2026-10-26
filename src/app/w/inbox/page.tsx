import type { Metadata } from "next";
import { Suspense } from "react";
import { InboxView } from "@/features/inbox/inbox-view";
import { ViewSkeleton } from "@/features/shell/view-skeleton";

export const metadata: Metadata = { title: "Bandeja" };

export default function Page() {
  return (
    <Suspense fallback={<ViewSkeleton />}>
      <InboxView />
    </Suspense>
  );
}
