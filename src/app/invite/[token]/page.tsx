import type { Metadata } from "next";
import { Suspense } from "react";
import { InviteView } from "@/features/auth/invite-view";
import { ViewSkeleton } from "@/features/shell/view-skeleton";

export const metadata: Metadata = { title: "Invitación" };

export default function Page() {
  return (
    <Suspense fallback={<ViewSkeleton />}>
      <InviteView />
    </Suspense>
  );
}
