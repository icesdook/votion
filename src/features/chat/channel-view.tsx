"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useParams } from "next/navigation";
import { Hash, MessageSquareOff, WifiOff } from "lucide-react";
import { channelLabel } from "@/data/api";
import { canChannel } from "@/data/access";
import { membersOf, useCtx } from "@/data/hooks";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/feedback";
import { Composer, type ComposerHandle } from "@/features/rich/composer";
import { ViewSkeleton } from "@/features/shell/view-skeleton";
import { MessageList, useSender } from "./message-list";

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function useOnline() {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

export function ChannelView() {
  const { id } = useParams<{ id: string }>();
  const ctx = useCtx();
  if (!ctx) return <ViewSkeleton />;
  const ch = ctx.db.channels.find((c) => c.id === id);
  if (!ch || !canChannel(ctx.db, ch, ctx.me)) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState icon={<MessageSquareOff />} title="Esta conversación no existe o no tienes acceso" text="Puede que la hayan borrado o que sea un mensaje directo entre otras personas." />
      </div>
    );
  }
  return <Channel key={ch.id} channelId={ch.id} />;
}

function Channel({ channelId }: { channelId: string }) {
  const ctx = useCtx()!;
  const { db, me, wsId } = ctx;
  const ch = db.channels.find((c) => c.id === channelId)!;
  const { pending, send, retry } = useSender(channelId);
  const composer = useRef<ComposerHandle>(null);
  const online = useOnline();
  const label = channelLabel(db, ch, me);
  const members = ch.kind === "channel" ? membersOf(db, wsId).map((m) => ({ id: m.userId, name: m.profile.name || m.profile.email })) : [];
  const other = ch.kind === "dm" ? ch.dmKey?.split(":").find((x) => x !== me) ?? me : null;

  useEffect(() => {
    document.title = `${label} · Chat`;
    composer.current?.focus();
  }, [label]);

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-4">
        {ch.kind === "channel" ? <Hash className="size-4 text-text-muted" /> : other && <Avatar id={other} name={label} size={20} />}
        <h1 className="min-w-0 flex-1 truncate text-sm font-semibold">{ch.kind === "channel" ? ch.name : label}</h1>
        {members.length > 0 && <AvatarStack people={members} />}
      </header>
      <MessageList
        channelId={channelId}
        pending={pending}
        onRetry={retry}
        emptyTitle={ch.kind === "channel" ? `Este es el comienzo de #${ch.name}` : `Tu conversación con ${label}`}
        emptyText={ch.kind === "channel" ? "Saluda al equipo o comparte una página con [[." : "Lo que escriban aquí solo lo ven ustedes dos."}
      />
      <div className="shrink-0 px-2 pb-3 md:px-4">
        {!online && (
          <p className="mb-2 flex items-center gap-2 text-xs text-warning">
            <WifiOff className="size-3.5" /> Sin conexión: tus mensajes se enviarán al reconectar.
          </p>
        )}
        <Composer
          ref={composer}
          label={`Mensaje para ${label}`}
          placeholder={ch.kind === "channel" ? `Escribe a #${ch.name}` : `Escribe a ${label}`}
          onSubmit={send}
          onArrowUpEmpty={() => {
            const mine = db.messages.filter((m) => m.channelId === channelId && m.authorId === me && !m.deletedAt).at(-1);
            if (mine) window.dispatchEvent(new CustomEvent("ofi:edit-message", { detail: mine.id }));
          }}
        />
      </div>
    </div>
  );
}
