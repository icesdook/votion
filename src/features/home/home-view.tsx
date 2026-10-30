"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckSquare, FilePlus, FileText, Hash, MessageSquare, UserPlus } from "lucide-react";
import * as api from "@/data/api";
import { access, membersOf, myChannels, profileName, relTime, shortDate, unreadFor, useCtx, useMe, visiblePages } from "@/data/hooks";
import { LEVEL } from "@/data/access";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/feedback";
import { Tag } from "@/components/ui/tag";
import { ViewSkeleton } from "@/features/shell/view-skeleton";
import { richPlain } from "@/data/api";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Buenos días" : h < 20 ? "Buenas tardes" : "Buenas noches";
}

export function HomeView() {
  const ctx = useCtx();
  const meInfo = useMe();
  const router = useRouter();
  if (!ctx || !meInfo) return <ViewSkeleton />;
  const { db, me, wsId } = ctx;
  const first = (meInfo.profile.name || "").split(" ")[0];
  const pages = visiblePages(db, wsId, me).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);
  const members = membersOf(db, wsId);
  const isAdmin = meInfo.member?.role !== "member";

  // mis tareas: filas donde alguna propiedad Persona soy yo y el estado no es el último (Listo)
  const myTasks = db.dbRows
    .map((r) => {
      const page = db.pages.find((p) => p.id === r.pageId);
      const props = db.dbProperties.filter((p) => p.databaseId === r.databaseId);
      const person = props.find((p) => p.type === "person" && r.values[p.id] === me);
      const status = props.find((p) => p.type === "status");
      const date = props.find((p) => p.type === "date");
      const opt = status?.options.find((o) => o.id === r.values[status.id]);
      const done = status && opt && status.options.at(-1)?.id === opt.id;
      return { r, page, person, opt, done, date: date ? (r.values[date.id] as string | null) : null };
    })
    .filter((x) => x.page && !x.page.archivedAt && x.person && !x.done && access(db, x.r.pageId, me) >= LEVEL.view)
    .sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"))
    .slice(0, 6);

  const { channels, dms } = myChannels(db, wsId, me);
  const activeChats = [...channels, ...dms]
    .map((c) => ({ c, last: db.messages.filter((m) => m.channelId === c.id && m.authorId && !m.deletedAt).at(-1), unread: unreadFor(db, c, me) }))
    .filter((x) => x.last)
    .sort((a, b) => b.last!.createdAt.localeCompare(a.last!.createdAt))
    .slice(0, 4);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[var(--layout-page-width-wide)] px-6 pt-12 pb-24 max-md:px-4 max-md:pt-6">
        <h1 className="text-h1 font-bold">
          {greeting()}
          {first ? `, ${first}` : ""}
        </h1>
        <p className="mt-1 text-sm text-text-muted">{new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })}</p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            variant="primary"
            onClick={async () => {
              const p = await api.createPage();
              router.push(`/w/p/${p.id}`);
            }}
          >
            <FilePlus /> Nueva página
          </Button>
          <Button
            onClick={async () => {
              const p = await api.createDatabase(null, "Tareas");
              router.push(`/w/p/${p.id}`);
            }}
          >
            <CheckSquare /> Nueva lista de tareas
          </Button>
          {isAdmin && members.length < (meInfo.workspace?.memberLimit ?? 10) && (
            <Button onClick={() => router.push("/w/settings?tab=members")}>
              <UserPlus /> Invitar ({members.length}/{meInfo.workspace?.memberLimit})
            </Button>
          )}
        </div>

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <section aria-labelledby="h-tareas" className="min-w-0">
            <h2 id="h-tareas" className="mb-2 text-sm font-semibold text-text-muted">
              Mis tareas pendientes
            </h2>
            {myTasks.length === 0 ? (
              <p className="rounded-lg border border-border p-4 text-sm text-text-muted">No tienes tareas asignadas. 🎉</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {myTasks.map(({ r, page, opt, date }) => (
                  <li key={r.id}>
                    <Link href={`/w/p/${r.pageId}`} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-hover">
                      <span className="min-w-0 flex-1 truncate">{page!.title || "Sin título"}</span>
                      {opt && <Tag color={opt.color}>{opt.label}</Tag>}
                      {date && <span className={date < new Date().toISOString().slice(0, 10) ? "text-xs text-danger" : "text-xs text-text-muted"}>{shortDate(date)}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="h-chat" className="min-w-0">
            <h2 id="h-chat" className="mb-2 text-sm font-semibold text-text-muted">
              Conversaciones recientes
            </h2>
            {activeChats.length === 0 ? (
              <p className="rounded-lg border border-border p-4 text-sm text-text-muted">Todavía no hay mensajes. Saluda en #general.</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {activeChats.map(({ c, last, unread }) => (
                  <li key={c.id}>
                    <Link href={`/w/c/${c.id}`} className="flex items-start gap-3 px-3 py-2 text-sm hover:bg-hover">
                      {c.kind === "channel" ? <Hash className="mt-0.5 size-4 text-text-muted" /> : <MessageSquare className="mt-0.5 size-4 text-text-muted" />}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className={unread ? "font-semibold" : "font-medium"}>{api.channelLabel(db, c, me)}</span>
                          <span className="text-xs text-text-faint">{relTime(last!.createdAt)}</span>
                        </span>
                        <span className="block truncate text-text-muted">
                          {profileName(db, last!.authorId)}: {richPlain(db, last!.body)}
                        </span>
                      </span>
                      {unread > 0 && <span className="mt-1 size-2 rounded-full bg-accent" aria-label={`${unread} sin leer`} />}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section aria-labelledby="h-recientes" className="mt-10">
          <h2 id="h-recientes" className="mb-2 text-sm font-semibold text-text-muted">
            Editadas recientemente
          </h2>
          {pages.length === 0 ? (
            <EmptyState icon={<FileText />} title="Aún no hay páginas" text="Crea la primera y cuéntale al equipo qué hay que saber." />
          ) : (
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {pages.map((p) => (
                <li key={p.id}>
                  <Link href={`/w/p/${p.id}`} className="flex h-28 flex-col justify-between rounded-lg border border-border p-3 hover:bg-hover">
                    <span className="text-2xl">{p.icon || <FileText className="size-6 text-text-faint" />}</span>
                    <span>
                      <span className="block truncate text-sm font-medium">{p.title || "Sin título"}</span>
                      <span className="flex items-center gap-1 text-xs text-text-faint">
                        {p.updatedBy && <Avatar id={p.updatedBy} name={profileName(db, p.updatedBy)} size={20} />}
                        {relTime(p.updatedAt)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
