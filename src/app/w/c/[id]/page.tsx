import type { Metadata } from "next";
import { Suspense } from "react";
import { ChannelView } from "@/features/chat/channel-view";
import { ViewSkeleton } from "@/features/shell/view-skeleton";

export const metadata: Metadata = { title: "Chat" };

export default function Page() {
  return (
    <Suspense fallback={<ViewSkeleton />}>
      <ChannelView />
    </Suspense>
  );
}
