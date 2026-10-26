import type { Metadata } from "next";
import { Suspense } from "react";
import { OnboardingView } from "@/features/auth/onboarding-view";
import { ViewSkeleton } from "@/features/shell/view-skeleton";

export const metadata: Metadata = { title: "Crea tu oficina" };

export default function Page() {
  return (
    <Suspense fallback={<ViewSkeleton />}>
      <OnboardingView />
    </Suspense>
  );
}
