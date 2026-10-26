"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import * as api from "@/data/api";
import type { ID } from "@/data/types";
import { useCtx } from "@/data/hooks";
import { Skeleton } from "@/components/ui/feedback";
import { Composer } from "@/features/rich/composer";
import { MessageList, useSender } from "@/features/chat/message-list";

/** Conversación lateral sobre una página: la ve quien puede comentarla. */
export function PageChatDock({ pageId, onClose }: { pageId: ID; onClose: () => void }) {
  const ctx = useCtx()!;
  const existing = ctx.db.channels.find((c) => c.kind === "page" && c.pageId === pageId);
  const [channelId, setChannelId] = useState<ID | null>(existing?.id ?? null);

  useEffect(() => {
    if (!channelId) api.openPageChat(pageId).then((c) => setChannelId(c.id));
  }, [channelId, pageId]);

  return (
    <aside aria-label="Conversación de la página" className="flex h-full w-full flex-col bg-bg">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
        <h2 className="flex-1 text-sm font-semibold">Conversar sobre esta página</h2>
        <button onClick={onClose} aria-label="Cerrar conversación" className="rounded-md p-1 text-text-muted hover:bg-hover">
          <X className="size-4" />
        </button>
      </header>
      {channelId ? (
        <DockBody channelId={channelId} pageId={pageId} />
      ) : (
        <div className="flex flex-col gap-2 p-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      )}
    </aside>
  );
}

function DockBody({ channelId, pageId }: { channelId: ID; pageId: ID }) {
  const { pending, send, retry } = useSender(channelId);
  return (
    <>
      <MessageList channelId={channelId} pending={pending} onRetry={retry} emptyTitle="Nadie ha conversado aquí" emptyText="Lo que escribas lo ven todas las personas que pueden comentar esta página." />
      <div className="shrink-0 p-2">
        <Composer compact label="Mensaje sobre la página" placeholder="Escribe sobre esta página…" pageScope={pageId} onSubmit={send} />
      </div>
    </>
  );
}
