"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowDownUp,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Filter,
  Maximize2,
  MoreHorizontal,
  Plus,
  Table2,
  Trash2,
  X,
  CheckSquare,
} from "lucide-react";
import * as api from "@/data/api";
import type { CellValue, DbProperty, DbRow, DbView, ID, Page, PropertyType, ViewConfig } from "@/data/types";
import { DomainError } from "@/data/types";
import { access, useCtx } from "@/data/hooks";
import { LEVEL } from "@/data/access";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Tag } from "@/components/ui/tag";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, Popover, PopoverContent, PopoverTrigger } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { CellDisplay, CellEditor, propsOf, TYPE_LABEL } from "./cells";
import { cn } from "@/lib/cn";

type Row = DbRow & { page: Page };

const VIEW_ICON = { table: Table2, board: Columns3, calendar: CalendarDays };

function applyView(rows: Row[], props: DbProperty[], cfg: ViewConfig): Row[] {
  let out = rows;
  for (const f of cfg.filters ?? []) {
    const prop = props.find((p) => p.id === f.propertyId);
    if (!prop) continue;
    out = out.filter((r) => {
      const v = r.values[f.propertyId];
      const empty = v === null || v === undefined || v === "" || v === false;
      switch (f.op) {
        case "empty":
          return empty;
        case "not_empty":
          return !empty;
        case "is":
          return prop.type === "checkbox" ? !!v === !!f.value : v === f.value;
        case "is_not":
          return v !== f.value;
        case "contains":
          return String(v ?? "").toLowerCase().includes(String(f.value ?? "").toLowerCase());
      }
    });
  }
  const sorts = cfg.sorts ?? [];
  return [...out].sort((a, b) => {
    for (const s of sorts) {
      const prop = props.find((p) => p.id === s.propertyId);
      if (!prop) continue;
      const key = (r: Row) => {
        const v = r.values[s.propertyId];
        if (prop.type === "select" || prop.type === "status") return prop.options.findIndex((o) => o.id === v);
        return v ?? "";
      };
      const ka = key(a);
      const kb = key(b);
      const c = typeof ka === "number" && typeof kb === "number" ? ka - kb : String(ka).localeCompare(String(kb), "es");
      if (c) return s.dir === "asc" ? c : -c;
    }
    return a.position - b.position;
  });
}

export function DatabaseView({ databaseId, onOpenRow }: { databaseId: ID; onOpenRow: (pageId: ID) => void }) {
  const ctx = useCtx()!;
  const { db, me } = ctx;
  const toast = useToast();
  const database = db.databases.find((d) => d.id === databaseId)!;
  const canEdit = access(db, database.pageId, me) >= LEVEL.edit;
  const views = db.dbViews.filter((v) => v.databaseId === databaseId).sort((a, b) => a.position - b.position);
  const [viewId, setViewId] = useState(views[0]?.id);
  const view = views.find((v) => v.id === viewId) ?? views[0];
  const props = propsOf(db, databaseId);
  const rows: Row[] = useMemo(
    () =>
      db.dbRows
        .filter((r) => r.databaseId === databaseId)
        .map((r) => ({ ...r, page: db.pages.find((p) => p.id === r.pageId)! }))
        .filter((r) => r.page && !r.page.archivedAt),
    [db.dbRows, db.pages, databaseId],
  );
  const shown = view ? applyView(rows, props, view.config) : rows;

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      toast({ text: e instanceof DomainError ? e.message : "No se pudo guardar el cambio.", kind: "error" });
    }
  };

  const newRow = async (values: Record<ID, CellValue> = {}) => {
    // las filas nuevas respetan los filtros "es igual a" de la vista
    for (const f of view?.config.filters ?? []) if (f.op === "is" && f.value !== undefined) values[f.propertyId] ??= f.value;
    const row = await api.createRow(databaseId, values);
    onOpenRow(row.pageId);
  };

  if (!view) return null;
  const filterCount = (view.config.filters ?? []).length;
  const sortCount = (view.config.sorts ?? []).length;

  return (
    <section aria-label="Tareas" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1 border-b border-border pb-1">
        <div role="tablist" aria-label="Vistas" className="flex flex-1 flex-wrap items-center gap-1">
          {views.map((v) => {
            const Icon = VIEW_ICON[v.type];
            return (
              <button
                key={v.id}
                role="tab"
                aria-selected={v.id === view.id}
                onClick={() => setViewId(v.id)}
                className={cn("flex h-7 items-center gap-1.5 rounded-md px-2 text-sm text-text-muted hover:bg-hover", v.id === view.id && "font-medium text-text after:absolute")}
              >
                <Icon className="size-4" /> {v.name}
                {v.id === view.id && <span className="sr-only">(vista actual)</span>}
              </button>
            );
          })}
        </div>
        <FilterButton props={props} view={view} canEdit={canEdit} onSave={(config) => run(() => api.saveView(view.id, { config }))} count={filterCount} />
        <SortButton props={props} view={view} canEdit={canEdit} onSave={(config) => run(() => api.saveView(view.id, { config }))} count={sortCount} />
        {canEdit && (
          <Button variant="primary" size="sm" onClick={() => run(() => newRow())}>
            <Plus /> Nueva
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<CheckSquare />}
          title="Aún no hay tareas"
          text="Agrega la primera, asígnala a alguien y ponle fecha."
          action={
            canEdit && (
              <Button variant="primary" size="sm" onClick={() => run(() => newRow())}>
                <Plus /> Nueva tarea
              </Button>
            )
          }
        />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<Filter />}
          title="Ninguna tarea coincide con el filtro"
          action={
            canEdit && (
              <Button size="sm" onClick={() => run(() => api.saveView(view.id, { config: { filters: [] } }))}>
                Quitar filtros
              </Button>
            )
          }
        />
      ) : view.type === "table" ? (
        <TableView rows={shown} props={props} canEdit={canEdit} databaseId={databaseId} onOpenRow={onOpenRow} run={run} onNew={() => run(() => newRow())} />
      ) : view.type === "board" ? (
        <BoardView rows={shown} props={props} view={view} canEdit={canEdit} onOpenRow={onOpenRow} run={run} onNew={(v) => run(() => newRow(v))} />
      ) : (
        <CalendarView rows={shown} props={props} view={view} canEdit={canEdit} onOpenRow={onOpenRow} run={run} onNew={(v) => run(() => newRow(v))} />
      )}
    </section>
  );
}

// ---------------------------------------------------------------- filtro y orden
function FilterButton({ props, view, canEdit, onSave, count }: { props: DbProperty[]; view: DbView; canEdit: boolean; onSave: (c: ViewConfig) => void; count: number }) {
  const filters = view.config.filters ?? [];
  return (
    <Popover>
      <PopoverTrigger className={cn("flex h-7 items-center gap-1 rounded-md px-2 text-sm text-text-muted hover:bg-hover", count && "text-accent")}>
        <Filter className="size-4" /> Filtrar{count ? ` (${count})` : ""}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
        {filters.length === 0 && <p className="px-1 py-2 text-sm text-text-muted">Sin filtros. Muestra todas las tareas.</p>}
        {filters.map((f, i) => {
          const prop = props.find((p) => p.id === f.propertyId);
          if (!prop) return null;
          return (
            <div key={i} className="mb-2 flex items-center gap-1 text-sm">
              <span className="w-24 shrink-0 truncate font-medium">{prop.name}</span>
              <select
                aria-label="Condición"
                disabled={!canEdit}
                value={f.op}
                onChange={(e) => onSave({ filters: filters.map((x, j) => (j === i ? { ...x, op: e.target.value as typeof f.op } : x)) })}
                className="h-7 rounded-sm border border-border-input bg-bg px-1 text-sm"
              >
                {prop.type === "text" ? <option value="contains">contiene</option> : <option value="is">es</option>}
                {prop.type !== "text" && prop.type !== "checkbox" && <option value="is_not">no es</option>}
                <option value="empty">está vacío</option>
                <option value="not_empty">no está vacío</option>
              </select>
              {(f.op === "is" || f.op === "is_not" || f.op === "contains") && (
                <div className="min-w-0 flex-1 rounded-sm border border-border-input">
                  <CellEditor prop={prop} value={f.value} readOnly={!canEdit} onChange={(v) => onSave({ filters: filters.map((x, j) => (j === i ? { ...x, value: v } : x)) })} className="min-h-7" />
                </div>
              )}
              {canEdit && (
                <button aria-label="Quitar filtro" onClick={() => onSave({ filters: filters.filter((_, j) => j !== i) })} className="rounded-sm p-1 text-text-muted hover:bg-hover">
                  <X className="size-4" />
                </button>
              )}
            </div>
          );
        })}
        {canEdit && (
          <Menu>
            <MenuTrigger className="flex h-7 items-center gap-1 rounded-md px-1 text-sm text-text-muted hover:bg-hover">
              <Plus className="size-4" /> Agregar filtro
            </MenuTrigger>
            <MenuContent align="start">
              {props.map((p) => (
                <MenuItem key={p.id} onSelect={() => onSave({ filters: [...filters, { propertyId: p.id, op: p.type === "text" ? "contains" : "is", value: p.type === "checkbox" ? true : undefined }] })}>
                  {p.name}
                </MenuItem>
              ))}
            </MenuContent>
          </Menu>
        )}
      </PopoverContent>
    </Popover>
  );
}

function SortButton({ props, view, canEdit, onSave, count }: { props: DbProperty[]; view: DbView; canEdit: boolean; onSave: (c: ViewConfig) => void; count: number }) {
  const sorts = view.config.sorts ?? [];
  return (
    <Popover>
      <PopoverTrigger className={cn("flex h-7 items-center gap-1 rounded-md px-2 text-sm text-text-muted hover:bg-hover", count && "text-accent")}>
        <ArrowDownUp className="size-4" /> Ordenar{count ? ` (${count})` : ""}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        {sorts.length === 0 && <p className="px-1 py-2 text-sm text-text-muted">Orden manual.</p>}
        {sorts.map((s, i) => (
          <div key={i} className="mb-2 flex items-center gap-1 text-sm">
            <span className="flex-1 truncate font-medium">{props.find((p) => p.id === s.propertyId)?.name}</span>
            <select
              aria-label="Dirección"
              disabled={!canEdit}
              value={s.dir}
              onChange={(e) => onSave({ sorts: sorts.map((x, j) => (j === i ? { ...x, dir: e.target.value as "asc" | "desc" } : x)) })}
              className="h-7 rounded-sm border border-border-input bg-bg px-1 text-sm"
            >
              <option value="asc">Ascendente</option>
              <option value="desc">Descendente</option>
            </select>
            {canEdit && (
              <button aria-label="Quitar orden" onClick={() => onSave({ sorts: sorts.filter((_, j) => j !== i) })} className="rounded-sm p-1 text-text-muted hover:bg-hover">
                <X className="size-4" />
              </button>
            )}
          </div>
        ))}
        {canEdit && (
          <Menu>
            <MenuTrigger className="flex h-7 items-center gap-1 rounded-md px-1 text-sm text-text-muted hover:bg-hover">
              <Plus className="size-4" /> Agregar orden
            </MenuTrigger>
            <MenuContent align="start">
              {props
                .filter((p) => !sorts.some((s) => s.propertyId === p.id))
                .map((p) => (
                  <MenuItem key={p.id} onSelect={() => onSave({ sorts: [...sorts, { propertyId: p.id, dir: "asc" }] })}>
                    {p.name}
                  </MenuItem>
                ))}
            </MenuContent>
          </Menu>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------- tabla
function TableView({ rows, props, canEdit, databaseId, onOpenRow, run, onNew }: { rows: Row[]; props: DbProperty[]; canEdit: boolean; databaseId: ID; onOpenRow: (id: ID) => void; run: (fn: () => Promise<unknown>) => void; onNew: () => void }) {
  const grid = useRef<HTMLDivElement>(null);
  const onKeyDown = (e: React.KeyboardEvent) => {
    const cell = (e.target as HTMLElement).closest<HTMLElement>("[data-cell]");
    if (!cell || !["ArrowUp", "ArrowDown"].includes(e.key) || (e.target as HTMLElement).tagName === "INPUT") return;
    const [r, c] = cell.dataset.cell!.split(":").map(Number);
    const next = grid.current?.querySelector<HTMLElement>(`[data-cell="${r + (e.key === "ArrowDown" ? 1 : -1)}:${c}"]`);
    const focusable = next?.querySelector<HTMLElement>("button, input, a") ?? next;
    if (focusable) {
      e.preventDefault();
      focusable.focus();
    }
  };
  return (
    <div className="overflow-x-auto">
      <div ref={grid} role="grid" aria-rowcount={rows.length + 1} onKeyDown={onKeyDown} className="min-w-max text-sm">
        <div role="row" className="flex border-b border-border text-xs text-text-muted">
          <div role="columnheader" className="sticky left-0 z-10 flex h-8 w-72 shrink-0 items-center bg-bg px-2 font-medium">
            Nombre
          </div>
          {props.map((p) => (
            <PropertyHeader key={p.id} prop={p} canEdit={canEdit} run={run} />
          ))}
          {canEdit && <AddPropertyButton databaseId={databaseId} run={run} />}
        </div>
        {rows.map((r, ri) => (
          <div role="row" key={r.id} className="group flex border-b border-border hover:bg-surface">
            <div role="gridcell" data-cell={`${ri}:0`} className="sticky left-0 z-10 flex h-[34px] w-72 shrink-0 items-center gap-1 bg-bg pr-1 group-hover:bg-surface">
              <input
                aria-label="Nombre de la tarea"
                defaultValue={r.page.title}
                key={r.page.title}
                readOnly={!canEdit}
                placeholder="Sin título"
                onBlur={(e) => e.target.value !== r.page.title && run(() => api.savePage(r.pageId, { title: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                className="h-full min-w-0 flex-1 bg-transparent px-2 font-medium outline-none placeholder:text-text-faint focus:ring-2 focus:ring-focus"
              />
              <button onClick={() => onOpenRow(r.pageId)} aria-label={`Abrir ${r.page.title || "tarea"}`} className="flex h-6 items-center gap-1 rounded-sm border border-border bg-bg px-1.5 text-xs text-text-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-hover max-md:opacity-100">
                <Maximize2 className="size-3" /> Abrir
              </button>
            </div>
            {props.map((p, ci) => (
              <div role="gridcell" data-cell={`${ri}:${ci + 1}`} key={p.id} className="h-[34px] w-44 shrink-0 border-l border-border">
                <CellEditor prop={p} value={r.values[p.id]} readOnly={!canEdit} onChange={(v) => run(() => api.updateRowValues(r.id, { [p.id]: v }))} />
              </div>
            ))}
          </div>
        ))}
        {canEdit && (
          <button onClick={onNew} className="flex h-8 w-72 items-center gap-1 px-2 text-sm text-text-muted hover:bg-hover">
            <Plus className="size-4" /> Nueva
          </button>
        )}
      </div>
    </div>
  );
}

function PropertyHeader({ prop, canEdit, run }: { prop: DbProperty; canEdit: boolean; run: (fn: () => Promise<unknown>) => void }) {
  const [renaming, setRenaming] = useState(false);
  return (
    <div role="columnheader" className="flex h-8 w-44 shrink-0 items-center border-l border-border">
      {renaming ? (
        <input
          autoFocus
          aria-label="Nombre de la propiedad"
          defaultValue={prop.name}
          onBlur={(e) => (setRenaming(false), e.target.value !== prop.name && run(() => api.updateProperty(prop.id, { name: e.target.value })))}
          onKeyDown={(e) => (e.key === "Enter" && (e.target as HTMLInputElement).blur(), e.key === "Escape" && setRenaming(false))}
          className="h-7 w-full bg-bg px-2 text-xs outline-none ring-2 ring-focus"
        />
      ) : canEdit ? (
        <Menu>
          <MenuTrigger className="flex h-full w-full items-center gap-1 px-2 text-left font-medium hover:bg-hover">
            <span className="flex-1 truncate">{prop.name}</span>
            <span className="text-text-faint">{TYPE_LABEL[prop.type]}</span>
          </MenuTrigger>
          <MenuContent align="start">
            <MenuItem onSelect={() => setTimeout(() => setRenaming(true), 0)}>Cambiar nombre</MenuItem>
            <MenuSeparator />
            <MenuItem danger onSelect={() => run(() => api.deleteProperty(prop.id))}>
              <Trash2 /> Borrar propiedad
            </MenuItem>
          </MenuContent>
        </Menu>
      ) : (
        <span className="truncate px-2 font-medium">{prop.name}</span>
      )}
    </div>
  );
}

function AddPropertyButton({ databaseId, run }: { databaseId: ID; run: (fn: () => Promise<unknown>) => void }) {
  return (
    <Menu>
      <MenuTrigger aria-label="Agregar propiedad" className="flex h-8 w-10 items-center justify-center border-l border-border hover:bg-hover">
        <Plus className="size-4" />
      </MenuTrigger>
      <MenuContent align="start">
        {(Object.keys(TYPE_LABEL) as PropertyType[]).map((t) => (
          <MenuItem key={t} onSelect={() => run(() => api.addProperty(databaseId, TYPE_LABEL[t], t))}>
            {TYPE_LABEL[t]}
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}

// ---------------------------------------------------------------- tablero
function BoardView({ rows, props, view, canEdit, onOpenRow, run, onNew }: { rows: Row[]; props: DbProperty[]; view: DbView; canEdit: boolean; onOpenRow: (id: ID) => void; run: (fn: () => Promise<unknown>) => void; onNew: (v: Record<ID, CellValue>) => void }) {
  const group = props.find((p) => p.id === view.config.groupBy && (p.type === "status" || p.type === "select")) ?? props.find((p) => p.type === "status" || p.type === "select");
  const [over, setOver] = useState<string | null>(null);
  const [live, setLive] = useState("");
  if (!group) return <p className="py-6 text-sm text-text-muted">Agrega una propiedad de Estado o Selección para ver el tablero.</p>;
  const columns = [{ id: "__none", label: `Sin ${group.name.toLowerCase()}`, color: "gray" as const }, ...group.options];
  const visibleProps = props.filter((p) => p.id !== group.id && (p.type === "person" || p.type === "date"));

  const moveTo = (rowId: ID, colId: string) => {
    const col = columns.find((c) => c.id === colId);
    const inCol = rows.filter((r) => (r.values[group.id] ?? "__none") === colId);
    run(() => api.moveRow(rowId, inCol.length ? Math.max(...inCol.map((r) => r.position)) + 1 : 0, { [group.id]: colId === "__none" ? null : colId }));
    setLive(`Tarea movida a ${col?.label}`);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      <p className="sr-only" aria-live="assertive">
        {live}
      </p>
      {columns.map((col) => {
        const items = rows.filter((r) => (r.values[group.id] ?? "__none") === col.id);
        if (col.id === "__none" && items.length === 0) return null;
        return (
          <div
            key={col.id}
            onDragOver={(e) => canEdit && (e.preventDefault(), setOver(col.id))}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const id = e.dataTransfer.getData("application/x-ofi-row");
              if (id) moveTo(id, col.id);
            }}
            className={cn("flex w-[272px] shrink-0 flex-col gap-2 rounded-lg p-1", over === col.id && "bg-accent-soft")}
          >
            <div className="flex items-center gap-2 px-1 text-sm">
              <Tag color={col.color}>{col.label}</Tag>
              <span className="text-text-faint">{items.length}</span>
            </div>
            {items.map((r) => (
              <div
                key={r.id}
                draggable={canEdit}
                onDragStart={(e) => e.dataTransfer.setData("application/x-ofi-row", r.id)}
                className="group relative rounded-md bg-bg p-2.5 shadow-card hover:bg-surface"
              >
                <button onClick={() => onOpenRow(r.pageId)} className="block w-full text-left text-sm font-medium after:absolute after:inset-0">
                  {r.page.title || <span className="text-text-faint">Sin título</span>}
                </button>
                {visibleProps.some((p) => r.values[p.id]) && (
                  <div className="mt-2 flex flex-col gap-1 text-xs text-text-muted">
                    {visibleProps.map((p) => (r.values[p.id] ? <CellDisplay key={p.id} prop={p} value={r.values[p.id]} /> : null))}
                  </div>
                )}
                {canEdit && (
                  <Menu>
                    <MenuTrigger aria-label="Mover tarea" className="absolute top-1.5 right-1.5 z-10 rounded-sm p-0.5 text-text-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-hover max-md:opacity-100">
                      <MoreHorizontal className="size-4" />
                    </MenuTrigger>
                    <MenuContent align="end">
                      {columns
                        .filter((c) => c.id !== col.id && c.id !== "__none")
                        .map((c) => (
                          <MenuItem key={c.id} onSelect={() => moveTo(r.id, c.id)}>
                            Mover a <Tag color={c.color}>{c.label}</Tag>
                          </MenuItem>
                        ))}
                      <MenuSeparator />
                      <MenuItem danger onSelect={() => run(() => api.deleteRow(r.id))}>
                        <Trash2 /> Mover a la papelera
                      </MenuItem>
                    </MenuContent>
                  </Menu>
                )}
              </div>
            ))}
            {canEdit && col.id !== "__none" && (
              <button onClick={() => onNew({ [group.id]: col.id })} className="flex h-8 items-center gap-1 rounded-md px-2 text-sm text-text-muted hover:bg-hover">
                <Plus className="size-4" /> Nueva
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- calendario
function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function CalendarView({ rows, props, view, canEdit, onOpenRow, run, onNew }: { rows: Row[]; props: DbProperty[]; view: DbView; canEdit: boolean; onOpenRow: (id: ID) => void; run: (fn: () => Promise<unknown>) => void; onNew: (v: Record<ID, CellValue>) => void }) {
  const dateProp = props.find((p) => p.id === view.config.dateProperty && p.type === "date") ?? props.find((p) => p.type === "date");
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  if (!dateProp) return <p className="py-6 text-sm text-text-muted">Agrega una propiedad de Fecha para ver el calendario.</p>;
  const first = new Date(cursor);
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7)); // semana parte el lunes
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const today = ymd(new Date());
  const undated = rows.filter((r) => !r.values[dateProp.id]);

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="flex-1 text-sm font-semibold capitalize">{cursor.toLocaleDateString("es-CL", { month: "long", year: "numeric" })}</h3>
        <Button size="sm" variant="ghost" onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
          Hoy
        </Button>
        <Button size="icon" variant="ghost" aria-label="Mes anterior" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
          <ChevronLeft />
        </Button>
        <Button size="icon" variant="ghost" aria-label="Mes siguiente" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
          <ChevronRight />
        </Button>
      </div>
      <div role="grid" aria-label="Calendario" className="grid grid-cols-7 overflow-hidden rounded-lg border border-border text-xs">
        {["lun", "mar", "mié", "jue", "vie", "sáb", "dom"].map((d) => (
          <div key={d} role="columnheader" className="border-b border-border bg-surface px-2 py-1 text-text-muted">
            {d}
          </div>
        ))}
        {days.map((d, i) => {
          const key = ymd(d);
          const items = rows.filter((r) => r.values[dateProp.id] === key);
          const inMonth = d.getMonth() === cursor.getMonth();
          return (
            <div
              role="gridcell"
              key={key}
              onDragOver={(e) => canEdit && e.preventDefault()}
              onDrop={(e) => {
                const id = e.dataTransfer.getData("application/x-ofi-row");
                if (id) run(() => api.updateRowValues(id, { [dateProp.id]: key }));
              }}
              className={cn("group min-h-24 border-border p-1 max-md:min-h-16", i % 7 !== 6 && "border-r", i < 35 && "border-b", !inMonth && "bg-surface")}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className={cn("flex size-6 items-center justify-center rounded-full", key === today && "bg-accent font-semibold text-on-accent", !inMonth && "text-text-faint")}>{d.getDate()}</span>
                {canEdit && (
                  <button aria-label={`Nueva tarea el ${d.toLocaleDateString("es-CL")}`} onClick={() => onNew({ [dateProp.id]: key })} className="rounded-sm p-0.5 text-text-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-hover">
                    <Plus className="size-3.5" />
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                {items.slice(0, 3).map((r) => (
                  <button
                    key={r.id}
                    draggable={canEdit}
                    onDragStart={(e) => e.dataTransfer.setData("application/x-ofi-row", r.id)}
                    onClick={() => onOpenRow(r.pageId)}
                    className="truncate rounded-sm bg-bg px-1.5 py-0.5 text-left shadow-card hover:bg-hover"
                  >
                    {r.page.title || "Sin título"}
                  </button>
                ))}
                {items.length > 3 && <span className="px-1 text-text-muted">{items.length - 3} más</span>}
              </div>
            </div>
          );
        })}
      </div>
      {undated.length > 0 && (
        <p className="mt-2 text-xs text-text-muted">
          {undated.length} {undated.length === 1 ? "tarea sin fecha" : "tareas sin fecha"}: ábrelas desde la tabla para asignarles una.
        </p>
      )}
    </div>
  );
}
