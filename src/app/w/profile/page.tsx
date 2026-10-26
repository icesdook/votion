import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfileView } from "@/features/settings/profile-view";
import { ViewSkeleton } from "@/features/shell/view-skeleton";

export const metadata: Metadata = { title: "Mi perfil" };

export default function Page() {
  return (
    <Suspense fallback={<ViewSkeleton />}>
      <ProfileView />
    </Suspense>
  );
}
