"use client";

import { useState } from "react";
import { Bell, CheckSquare, FileText, Hash, MessageSquare, MoreHorizontal, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { Tag, TAG_COLORS, UnreadBadge } from "@/components/ui/tag";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import { Dialog, DialogContent, DialogTrigger, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, Tooltip } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";

const people = [
  { id: "a1", name: "Camila Rojas" },
  { id: "b2", name: "Matías Soto" },
  { id: "c3", name: "Javiera Muñoz" },
  { id: "d4", name: "Tomás Fuentes" },
  { id: "e5", name: "Valentina Díaz" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b border-border py-6">
      <h2 className="text-xs font-semibold tracking-wide text-text-muted uppercase">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignPage() {
  const toast = useToast();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  return (
    <main className="mx-auto max-w-[900px] px-4 pb-24 md:px-8">
      <header className="flex items-center justify-between py-6">
        <h1 className="text-h1 font-bold">Sistema de diseño</h1>
        <Button
          variant="secondary"
          onClick={() => {
            const next = theme === "light" ? "dark" : "light";
            setTheme(next);
            document.documentElement.dataset.theme = next;
          }}
        >
          {theme === "light" ? "Probar tema oscuro" : "Probar tema claro"}
        </Button>
      </header>

      <Section title="Tipografía">
        <p className="text-title font-bold">Plan de la semana</p>
        <p className="text-h1 font-bold">Título 1</p>
        <p className="text-h2 font-semibold">Título 2</p>
        <p className="text-h3 font-semibold">Título 3</p>
        <p className="text-base">Texto del documento. Escribe con calma, aquí se lee cómodo.</p>
        <p className="text-sm">Texto de interfaz, el tamaño por defecto.</p>
        <p className="text-sm text-text-muted">Texto secundario.</p>
        <p className="text-xs text-text-muted">Texto pequeño y metadatos.</p>
      </Section>

      <Section title="Botones">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary">
            <Plus /> Nueva página
          </Button>
          <Button>Secundario</Button>
          <Button variant="ghost">Fantasma</Button>
          <Button variant="danger">
            <Trash2 /> Borrar
          </Button>
          <Button variant="primary" loading>
            Guardando
          </Button>
          <Button disabled>Deshabilitado</Button>
          <Tooltip label="Más opciones">
            <Button variant="ghost" size="icon" aria-label="Más opciones">
              <MoreHorizontal />
            </Button>
          </Tooltip>
        </div>
      </Section>

      <Section title="Campos">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Nombre de la oficina" placeholder="Ej: Estudio Contable Biobío" />
          <Input label="Correo" type="email" defaultValue="correo@" error="Revisa el correo, falta el dominio." />
          <Input label="Buscar" hideLabel icon={<Search />} placeholder="Buscar páginas, mensajes o personas" />
          <Input label="Deshabilitado" disabled placeholder="No disponible" />
        </div>
      </Section>

      <Section title="Personas y estados">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar {...people[0]} size={20} />
          <Avatar {...people[1]} size={24} online />
          <Avatar {...people[2]} size={32} />
          <Avatar {...people[3]} size={40} online />
          <AvatarStack people={people} />
          <UnreadBadge count={3} />
          <UnreadBadge count={128} />
        </div>
        <div className="flex flex-wrap gap-2">
          {TAG_COLORS.map((c, i) => (
            <Tag key={c} color={c}>
              {["Por hacer", "En curso", "Listo", "En espera", "Urgente", "Idea"][i]}
            </Tag>
          ))}
        </div>
        <p className="text-sm">
          Revisemos esto con{" "}
          <span className="rounded-sm bg-mention-bg px-1 font-medium text-on-mention">@Camila Rojas</span> mañana.
        </p>
      </Section>

      <Section title="Menús y diálogos">
        <div className="flex flex-wrap gap-2">
          <Menu>
            <MenuTrigger asChild>
              <Button>Abrir menú</Button>
            </MenuTrigger>
            <MenuContent>
              <MenuItem>
                <FileText /> Abrir página
              </MenuItem>
              <MenuItem>
                <MessageSquare /> Conversar sobre esto
              </MenuItem>
              <MenuItem>
                <CheckSquare /> Convertir en tarea
              </MenuItem>
              <MenuSeparator />
              <MenuItem danger>
                <Trash2 /> Mover a la papelera
              </MenuItem>
            </MenuContent>
          </Menu>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Abrir diálogo</Button>
            </DialogTrigger>
            <DialogContent title="Invitar al equipo" description="Hasta 10 personas por oficina.">
              <div className="flex flex-col gap-3 p-5">
                <Input label="Correos" placeholder="nombre@oficina.cl" />
                <Button variant="primary">Enviar invitaciones</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={() => toast({ text: "Página movida a la papelera", kind: "info", action: { label: "Deshacer", run: () => {} } })}>
            Mostrar aviso
          </Button>
          <Button onClick={() => toast({ text: "No se pudo enviar el mensaje", kind: "error" })}>Aviso de error</Button>
        </div>
      </Section>

      <Section title="Superficies">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-surface">
            <div className="flex items-center justify-between px-3 py-2 text-sm">
              <span className="flex items-center gap-2">
                <Hash className="size-4 text-text-muted" /> general
              </span>
              <UnreadBadge count={2} />
            </div>
            <div className="flex items-center gap-2 bg-surface-2 px-3 py-2 text-sm font-medium">
              <FileText className="size-4 text-text-muted" /> Página activa
            </div>
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:bg-hover">
              <Bell className="size-4" /> Bandeja
            </div>
          </div>
          <div className="rounded-md bg-bg p-3 shadow-card">
            <p className="text-sm font-medium">Preparar propuesta para cliente</p>
            <div className="mt-2 flex items-center gap-2">
              <Tag color="blue">En curso</Tag>
              <Avatar {...people[2]} size={20} />
              <span className="text-xs text-text-muted">28 oct</span>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Vacío y cargando">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border">
            <EmptyState
              icon={<CheckSquare />}
              title="Aún no hay tareas"
              text="Agrega la primera y asígnala a alguien del equipo."
              action={
                <Button variant="primary" size="sm">
                  <Plus /> Nueva tarea
                </Button>
              }
            />
          </div>
          <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </Section>
    </main>
  );
}
