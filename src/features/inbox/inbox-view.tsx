"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AtSign, Bell, CheckCheck, CheckSquare, MessageSquare, Reply } from "lucide-react";
import * as api from "@/data/api";
import type { Notification } from "@/data/types";
import { access, profileName, relTime, useCtx } from "@/data/hooks";
import { canChannel, LEVEL } from "@/data/access";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { ViewHeader, ViewSkeleton } from "@/features/shell/view-skeleton";
import { RichView } from "@/features/rich/rich-text";
import { cn } from "@/lib/cn";

const KIND = {
  mention: { icon: AtSign, text: "te mencionó" },
  reply: { icon: Reply, text: "respondió en un hilo" },
  assigned: { icon: CheckSquare, text: "te asignó una tarea" },
  invite: { icon: Bell, text: "te invitó" },
  dm: { icon: MessageSquare, text: "te escribió" },
} as const;

export function InboxView() {
  const ctx = useCtx();
  const router = useRouter();
  const [tab, setTab] = useState<"all" | "unread">("all");
  if (!ctx) return <ViewSkeleton />;
  const { db, me } = ctx;
  const items = db.notifications
    .filter((n) => n.userId === me)
    .filter((n) => tab === "all" || !n.readAt)
    .filter((n) => {
      // no mostrar avisos de cosas a las que ya no tienes acceso
      if (n.pageId && access(db, n.pageId, me) < LEVEL.view) return false;
      if (n.channelId) {
        const ch = db.channels.find((c) => c.id === n.channelId);
        if (!ch || !canChannel(db, ch, me)) return false;
      }
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unread = db.notifications.filter((n) => n.userId === me && !n.readAt).length;

  const open = (n: Notification) => {
    api.markRead([n.id]);
    if (n.channelId) router.push(`/w/c/${n.channelId}${n.messageId ? `#m-${n.messageId}` : ""}`);
    else if (n.pageId) router.push(`/w/p/${n.pageId}`);
  };

  const preview = (n: Notification) => {
    if (n.messageId) {
      const m = db.messages.find((x) => x.id === n.messageId);
      return m && !m.deletedAt ? <RichView body={m.body} /> : <span className="italic">Mensaje eliminado</span>;
    }
    if (n.threadId) {
      const c = db.comments.filter((x) => x.threadId === n.threadId && x.authorId === n.actorId).at(-1);
      return c ? <RichView body={c.body} /> : null;
    }
    return null;
  };

  const where = (n: Notification) => {
    if (n.channelId) {
      const ch = db.channels.find((c) => c.id === n.channelId);
      return ch ? api.channelLabel(db, ch, me) : "";
    }
    const p = db.pages.find((x) => x.id === n.pageId);
    return p ? `${p.icon ?? ""} ${p.title || "Sin título"}` : "";
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[var(--layout-page-width)] px-6 pt-10 pb-24 max-md:px-4 max-md:pt-4">
        <ViewHeader title="Bandeja">
          {unread > 0 && (
            <Button size="sm" variant="ghost" onClick={() => api.markRead("all")}>
              <CheckCheck /> Marcar todo como leído
            </Button>
          )}
        </ViewHeader>
        <div role="tablist" className="mb-4 flex gap-1">
          {(["all", "unread"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("h-7 rounded-md px-2 text-sm text-text-muted hover:bg-hover", tab === t && "bg-surface-2 font-medium text-text")}>
              {t === "all" ? "Todo" : `Sin leer${unread ? ` (${unread})` : ""}`}
            </button>
          ))}
        </div>
        {items.length === 0 ? (
          <EmptyState icon={<Bell />} title={tab === "unread" ? "Estás al día" : "Aquí llegan tus avisos"} text="Cuando alguien te nombre con @, te responda o te asigne una tarea, aparecerá aquí." />
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {items.map((n) => {
              const K = KIND[n.kind];
              return (
                <li key={n.id}>
                  <button onClick={() => open(n)} className={cn("flex w-full gap-3 px-3 py-3 text-left hover:bg-hover", !n.readAt && "bg-surface")}>
                    <span className="relative shrink-0">
                      <Avatar id={n.actorId ?? "x"} name={profileName(db, n.actorId)} size={32} />
                      <span className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-bg">
                        <K.icon className="size-3 text-text-muted" />
                      </span>
                    </span>
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block">
                        <span className="font-semibold">{profileName(db, n.actorId)}</span> {K.text}
                        <span className="text-text-muted"> en {where(n)}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-text-muted">{preview(n)}</span>
                      <span className="mt-0.5 block text-xs text-text-faint">{relTime(n.createdAt)}</span>
                    </span>
                    {!n.readAt && <span className="mt-2 size-2 shrink-0 rounded-full bg-accent" aria-label="Sin leer" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
