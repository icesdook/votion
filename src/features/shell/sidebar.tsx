"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  ChevronDown,
  ChevronsLeft,
  Hash,
  Home,
  LogOut,
  Plus,
  Search,
  Settings,
  Star,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import * as api from "@/data/api";
import { resetDemo } from "@/data/fake/store";
import { channelLabel } from "@/data/api";
import { membersOf, myChannels, unreadFor, unreadNotifications, useCtx, useMe, visiblePages } from "@/data/hooks";
import { Avatar } from "@/components/ui/avatar";
import { UnreadBadge } from "@/components/ui/tag";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, Popover, PopoverContent, PopoverTrigger, Tooltip } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { PageTree } from "./page-tree";
import { NewChannelDialog } from "./new-channel-dialog";
import { cn } from "@/lib/cn";

function NavLink({ href, icon, label, badge, active }: { href: string; icon: React.ReactNode; label: string; badge?: number; active?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-7 items-center gap-2 rounded-md px-2 text-sm text-text-muted hover:bg-hover hover:text-text max-md:h-9 [&_svg]:size-4",
        active && "bg-surface-2 font-medium text-text",
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge ? <UnreadBadge count={badge} /> : null}
    </Link>
  );
}

function SectionHeader({ label, open, onToggle, action }: { label: string; open: boolean; onToggle: () => void; action?: React.ReactNode }) {
  return (
    <div className="group mt-4 flex h-6 items-center px-2">
      <button onClick={onToggle} aria-expanded={open} className="flex flex-1 items-center gap-1 text-xs font-medium text-text-faint hover:text-text-muted">
        {label}
        <ChevronDown className={cn("size-3 transition-transform", !open && "-rotate-90")} />
      </button>
      {action}
    </div>
  );
}

export function Sidebar({ onSearch, onCollapse }: { onSearch: () => void; onCollapse: () => void }) {
  const ctx = useCtx();
  const meInfo = useMe();
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState({ fav: true, shared: true, private: true, channels: true, dms: true });
  const [newChannel, setNewChannel] = useState(false);
  if (!ctx || !meInfo?.workspace) return null;
  const { db, me, wsId } = ctx;
  const ws = meInfo.workspace;
  const isAdmin = meInfo.member?.role !== "member";

  const pages = visiblePages(db, wsId, me);
  const favorites = db.favorites
    .filter((f) => f.userId === me)
    .sort((a, b) => a.position - b.position)
    .map((f) => pages.find((p) => p.id === f.pageId))
    .filter(Boolean);
  const { channels, dms } = myChannels(db, wsId, me);
  const notif = unreadNotifications(db, me);
  const members = membersOf(db, wsId);

  const newPage = async (isPrivate: boolean) => {
    const p = await api.createPage({ isPrivate });
    router.push(`/w/p/${p.id}`);
  };

  const toggle = (k: keyof typeof open) => setOpen((s) => ({ ...s, [k]: !s[k] }));

  return (
    <nav aria-label="Principal" className="flex h-full w-[var(--layout-sidebar)] max-w-full flex-col bg-surface text-sm">
      {/* cabecera */}
      <div className="flex items-center gap-1 p-2">
        <Menu>
          <MenuTrigger className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-hover">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-surface-2 text-sm">{ws.icon || ws.name[0]}</span>
            <span className="min-w-0 flex-1 truncate font-semibold">{ws.name}</span>
            <ChevronDown className="size-3.5 text-text-faint" />
          </MenuTrigger>
          <MenuContent align="start" className="w-64">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <Avatar id={me} name={meInfo.profile.name || meInfo.profile.email} size={24} />
              <div className="min-w-0">
                <p className="truncate font-medium">{meInfo.profile.name || "Sin nombre"}</p>
                <p className="truncate text-xs text-text-muted">{meInfo.profile.email}</p>
              </div>
            </div>
            <MenuSeparator />
            {isAdmin && (
              <MenuItem onSelect={() => router.push("/w/settings?tab=members")}>
                <UserPlus /> Invitar al equipo
              </MenuItem>
            )}
            <MenuItem onSelect={() => router.push("/w/settings")}>
              <Settings /> Ajustes de la oficina
            </MenuItem>
            <MenuItem onSelect={() => router.push("/w/profile")}>
              <Users /> Mi perfil
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              onSelect={() => {
                api.signOut();
                router.replace("/login");
              }}
            >
              <LogOut /> Cerrar sesión
            </MenuItem>
            {process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DEMO === "1" ? (
              <MenuItem
                onSelect={() => {
                  resetDemo();
                  toast({ text: "Datos de demostración reiniciados", kind: "info" });
                  router.replace("/login");
                }}
              >
                <Trash2 /> Reiniciar demo
              </MenuItem>
            ) : null}
          </MenuContent>
        </Menu>
        <Tooltip label="Ocultar barra (Ctrl + \)">
          <button onClick={onCollapse} aria-label="Ocultar barra lateral" className="rounded-md p-1.5 text-text-faint hover:bg-hover hover:text-text">
            <ChevronsLeft className="size-4" />
          </button>
        </Tooltip>
      </div>

      <div className="flex flex-col gap-px px-2">
        <button onClick={onSearch} className="flex h-7 items-center gap-2 rounded-md px-2 text-text-muted hover:bg-hover hover:text-text max-md:h-9">
          <Search className="size-4" />
          <span className="flex-1 text-left">Buscar</span>
          <kbd className="text-xs text-text-faint max-md:hidden">Ctrl K</kbd>
        </button>
        <NavLink href="/w" icon={<Home />} label="Inicio" active={pathname === "/w"} />
        <NavLink href="/w/inbox" icon={<Bell />} label="Bandeja" badge={notif} active={pathname === "/w/inbox"} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {favorites.length > 0 && (
          <>
            <SectionHeader label="Favoritos" open={open.fav} onToggle={() => toggle("fav")} />
            {open.fav &&
              favorites.map((p) => (
                <NavLink key={p!.id} href={`/w/p/${p!.id}`} icon={<span className="w-4 text-center text-sm">{p!.icon || <Star className="size-4" />}</span>} label={p!.title || "Sin título"} active={pathname === `/w/p/${p!.id}`} />
              ))}
          </>
        )}

        <SectionHeader
          label="Oficina"
          open={open.shared}
          onToggle={() => toggle("shared")}
          action={
            <Tooltip label="Nueva página para todo el equipo">
              <button onClick={() => newPage(false)} aria-label="Nueva página compartida" className="rounded-sm p-0.5 text-text-faint opacity-0 group-hover:opacity-100 hover:bg-hover hover:text-text focus-visible:opacity-100 max-md:opacity-100">
                <Plus className="size-4" />
              </button>
            </Tooltip>
          }
        />
        {open.shared && <PageTree root="shared" pages={pages} emptyText="Aún no hay páginas compartidas." onCreate={() => newPage(false)} />}

        <SectionHeader
          label="Privado"
          open={open.private}
          onToggle={() => toggle("private")}
          action={
            <Tooltip label="Nueva página privada">
              <button onClick={() => newPage(true)} aria-label="Nueva página privada" className="rounded-sm p-0.5 text-text-faint opacity-0 group-hover:opacity-100 hover:bg-hover hover:text-text focus-visible:opacity-100 max-md:opacity-100">
                <Plus className="size-4" />
              </button>
            </Tooltip>
          }
        />
        {open.private && <PageTree root="private" pages={pages} emptyText="Tus notas privadas aparecen aquí." onCreate={() => newPage(true)} />}

        <SectionHeader
          label="Canales"
          open={open.channels}
          onToggle={() => toggle("channels")}
          action={
            <Tooltip label="Nuevo canal">
              <button onClick={() => setNewChannel(true)} aria-label="Nuevo canal" className="rounded-sm p-0.5 text-text-faint opacity-0 group-hover:opacity-100 hover:bg-hover hover:text-text focus-visible:opacity-100 max-md:opacity-100">
                <Plus className="size-4" />
              </button>
            </Tooltip>
          }
        />
        {open.channels &&
          channels.map((c) => (
            <NavLink key={c.id} href={`/w/c/${c.id}`} icon={<Hash />} label={c.name ?? ""} badge={unreadFor(db, c, me)} active={pathname === `/w/c/${c.id}`} />
          ))}

        <SectionHeader
          label="Mensajes directos"
          open={open.dms}
          onToggle={() => toggle("dms")}
          action={
            <Popover>
              <Tooltip label="Escribir a alguien">
                <PopoverTrigger aria-label="Nuevo mensaje directo" className="rounded-sm p-0.5 text-text-faint opacity-0 group-hover:opacity-100 hover:bg-hover hover:text-text focus-visible:opacity-100 data-[state=open]:opacity-100 max-md:opacity-100">
                  <Plus className="size-4" />
                </PopoverTrigger>
              </Tooltip>
              <PopoverContent align="start" className="w-60">
                <p className="px-2 py-1 text-xs text-text-muted">Escribir a…</p>
                {members
                  .filter((m) => m.userId !== me)
                  .map((m) => (
                    <button
                      key={m.userId}
                      className="flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left hover:bg-hover"
                      onClick={async () => {
                        const ch = await api.openDM(m.userId);
                        router.push(`/w/c/${ch.id}`);
                      }}
                    >
                      <Avatar id={m.userId} name={m.profile.name || m.profile.email} size={20} />
                      <span className="truncate">{m.profile.name || m.profile.email}</span>
                    </button>
                  ))}
                {members.length <= 1 && <p className="px-2 py-2 text-sm text-text-muted">Invita a alguien para conversar.</p>}
              </PopoverContent>
            </Popover>
          }
        />
        {open.dms &&
          dms.map((c) => {
            const other = c.dmKey?.split(":").find((id) => id !== me) ?? me;
            return (
              <NavLink
                key={c.id}
                href={`/w/c/${c.id}`}
                icon={<Avatar id={other} name={channelLabel(db, c, me)} size={20} />}
                label={channelLabel(db, c, me) + (other === me ? " (tú)" : "")}
                badge={unreadFor(db, c, me)}
                active={pathname === `/w/c/${c.id}`}
              />
            );
          })}
        {open.dms && dms.length === 0 && <p className="px-2 py-1 text-xs text-text-faint">Usa + para escribirle a un compañero.</p>}

        <div className="mt-4 flex flex-col gap-px">
          <NavLink href="/w/trash" icon={<Trash2 />} label="Papelera" active={pathname === "/w/trash"} />
          <NavLink href="/w/settings" icon={<Settings />} label="Ajustes" active={pathname.startsWith("/w/settings")} />
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-border px-3 py-2 text-xs text-text-faint">
        <Users className="size-3" /> {members.length} de {ws.memberLimit} personas
      </div>
      <NewChannelDialog open={newChannel} onOpenChange={setNewChannel} />
    </nav>
  );
}
