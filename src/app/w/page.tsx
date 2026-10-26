import type { Metadata } from "next";
import { Suspense } from "react";
import { HomeView } from "@/features/home/home-view";
import { ViewSkeleton } from "@/features/shell/view-skeleton";

export const metadata: Metadata = { title: "Inicio" };

export default function Page() {
  return (
    <Suspense fallback={<ViewSkeleton />}>
      <HomeView />
    </Suspense>
  );
}
