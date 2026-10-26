"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import type { CellValue, DbProperty, ID, PropertyOption } from "@/data/types";
import { membersOf, profileName, shortDate, useCtx } from "@/data/hooks";
import { Tag, TAG_COLORS } from "@/components/ui/tag";
import { Avatar } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/overlay";
import { cn } from "@/lib/cn";
import * as api from "@/data/api";

export const TYPE_LABEL: Record<DbProperty["type"], string> = {
  text: "Texto",
  select: "Selección",
  status: "Estado",
  person: "Persona",
  date: "Fecha",
  checkbox: "Casilla",
  number: "Número",
};

/** Muestra un valor (solo lectura). */
export function CellDisplay({ prop, value }: { prop: DbProperty; value: CellValue | undefined }) {
  const ctx = useCtx();
  if (value === undefined || value === null || value === "") return <span className="text-text-faint">—</span>;
  switch (prop.type) {
    case "select":
    case "status": {
      const o = prop.options.find((x) => x.id === value);
      return o ? <Tag color={o.color}>{o.label}</Tag> : <span className="text-text-faint">—</span>;
    }
    case "person":
      return ctx ? (
        <span className="flex min-w-0 items-center gap-1.5">
          <Avatar id={String(value)} name={profileName(ctx.db, String(value))} size={20} />
          <span className="truncate">{profileName(ctx.db, String(value))}</span>
        </span>
      ) : null;
    case "date":
      return <span>{shortDate(String(value))}</span>;
    case "checkbox":
      return value ? <Check className="size-4 text-success" aria-label="Sí" /> : <span className="text-text-faint">—</span>;
    case "number":
      return <span className="tabular-nums">{Number(value).toLocaleString("es-CL")}</span>;
    default:
      return <span className="truncate">{String(value)}</span>;
  }
}

/** Celda editable: abre el editor adecuado al tipo. */
export function CellEditor({ prop, value, onChange, readOnly, className }: { prop: DbProperty; value: CellValue | undefined; onChange: (v: CellValue) => void; readOnly?: boolean; className?: string }) {
  const [open, setOpen] = useState(false);
  const base = cn("flex h-full min-h-8 w-full items-center px-2 text-left text-sm", !readOnly && "hover:bg-hover", className);

  if (readOnly) return <div className={base}><CellDisplay prop={prop} value={value} /></div>;

  if (prop.type === "checkbox") {
    return (
      <label className={cn(base, "cursor-pointer")}>
        <input type="checkbox" className="size-4 accent-[var(--color-accent)]" checked={!!value} onChange={(e) => onChange(e.target.checked)} aria-label={prop.name} />
      </label>
    );
  }
  if (prop.type === "text" || prop.type === "number") {
    return (
      <input
        aria-label={prop.name}
        type={prop.type === "number" ? "number" : "text"}
        defaultValue={value === null || value === undefined ? "" : String(value)}
        key={String(value)}
        onBlur={(e) => {
          const v = e.target.value;
          const next = prop.type === "number" ? (v === "" ? null : Number(v)) : v;
          if (next !== (value ?? (prop.type === "number" ? null : ""))) onChange(next);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            (e.target as HTMLInputElement).value = value === null || value === undefined ? "" : String(value);
            (e.target as HTMLInputElement).blur();
          }
        }}
        className={cn(base, "bg-transparent outline-none focus:bg-bg focus:ring-2 focus:ring-focus", prop.type === "number" && "text-right tabular-nums")}
      />
    );
  }
  if (prop.type === "date") {
    return (
      <input
        aria-label={prop.name}
        type="date"
        value={value ? String(value) : ""}
        onChange={(e) => onChange(e.target.value || null)}
        className={cn(base, "bg-transparent outline-none focus:ring-2 focus:ring-focus [color-scheme:inherit]")}
      />
    );
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={base}>
        <span className="sr-only">{prop.name}: </span>
        <CellDisplay prop={prop} value={value} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        {prop.type === "person" ? (
          <PersonPicker value={value as string | null} onPick={(v) => (onChange(v), setOpen(false))} />
        ) : (
          <OptionPicker prop={prop} value={value as string | null} onPick={(v) => (onChange(v), setOpen(false))} />
        )}
      </PopoverContent>
    </Popover>
  );
}

function PersonPicker({ value, onPick }: { value: string | null; onPick: (v: string | null) => void }) {
  const ctx = useCtx();
  if (!ctx) return null;
  return (
    <div role="listbox" aria-label="Personas">
      {membersOf(ctx.db, ctx.wsId).map((m) => (
        <button key={m.userId} role="option" aria-selected={value === m.userId} onClick={() => onPick(m.userId)} className="flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left text-sm hover:bg-hover">
          <Avatar id={m.userId} name={m.profile.name || m.profile.email} size={20} />
          <span className="flex-1 truncate">{m.profile.name || m.profile.email}</span>
          {value === m.userId && <Check className="size-4 text-accent" />}
        </button>
      ))}
      {value && (
        <button onClick={() => onPick(null)} className="mt-1 flex h-8 w-full items-center gap-2 rounded-sm border-t border-border px-2 text-left text-sm text-text-muted hover:bg-hover">
          <X className="size-4" /> Quitar
        </button>
      )}
    </div>
  );
}

function OptionPicker({ prop, value, onPick }: { prop: DbProperty; value: string | null; onPick: (v: string | null) => void }) {
  const [q, setQ] = useState("");
  const matches = prop.options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()));
  const create = async () => {
    const label = q.trim();
    if (!label) return;
    const opt: PropertyOption = { id: crypto.randomUUID(), label, color: TAG_COLORS[prop.options.length % TAG_COLORS.length] };
    await api.updateProperty(prop.id, { options: [...prop.options, opt] });
    onPick(opt.id);
  };
  return (
    <div>
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (matches[0]) onPick(matches[0].id);
            else create();
          }
        }}
        placeholder="Buscar o crear opción"
        aria-label="Buscar o crear opción"
        className="mb-1 h-8 w-full rounded-sm border border-border-input bg-bg px-2 text-sm outline-none focus:border-accent"
      />
      <div role="listbox" aria-label={prop.name}>
        {matches.map((o) => (
          <button key={o.id} role="option" aria-selected={value === o.id} onClick={() => onPick(o.id)} className="flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left hover:bg-hover">
            <Tag color={o.color}>{o.label}</Tag>
            <span className="flex-1" />
            {value === o.id && <Check className="size-4 text-accent" />}
          </button>
        ))}
        {q.trim() && !matches.some((o) => o.label.toLowerCase() === q.trim().toLowerCase()) && (
          <button onClick={create} className="flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left text-sm hover:bg-hover">
            Crear <Tag color={TAG_COLORS[prop.options.length % TAG_COLORS.length]}>{q.trim()}</Tag>
          </button>
        )}
        {value && (
          <button onClick={() => onPick(null)} className="mt-1 flex h-8 w-full items-center gap-2 rounded-sm border-t border-border px-2 text-left text-sm text-text-muted hover:bg-hover">
            <X className="size-4" /> Quitar
          </button>
        )}
      </div>
    </div>
  );
}

export function propsOf(db: { dbProperties: DbProperty[] }, databaseId: ID) {
  return db.dbProperties.filter((p) => p.databaseId === databaseId).sort((a, b) => a.position - b.position);
}
