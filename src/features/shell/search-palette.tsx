"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog as D } from "radix-ui";
import { FileText, MessageSquare, Search, User } from "lucide-react";
import { search, type SearchResult, openDM } from "@/data/api";
import { useCtx } from "@/data/hooks";
import { DialogContent } from "@/components/ui/overlay";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

export function SearchPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const ctx = useCtx();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const results = useMemo(() => (ctx ? search(ctx.db, ctx.me, q) : []), [ctx, q]);

  const setOpen = (v: boolean) => {
    if (!v) {
      setQ("");
      setSel(0);
    }
    onOpenChange(v);
  };

  const go = async (r: SearchResult) => {
    setOpen(false);
    if (r.kind === "page") router.push(`/w/p/${r.id}`);
    else if (r.kind === "message") router.push(`/w/c/${r.channelId}#m-${r.id}`);
    else {
      const ch = await openDM(r.id);
      router.push(`/w/c/${ch.id}`);
    }
  };

  const groups: { label: string; kind: SearchResult["kind"] }[] = [
    { label: q ? "Páginas" : "Recientes", kind: "page" },
    { label: "Mensajes", kind: "message" },
    { label: "Personas", kind: "person" },
  ];

  return (
    <D.Root open={open} onOpenChange={setOpen}>
      <DialogContent title="Buscar" side="palette">
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="size-4 text-text-faint" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSel((s) => Math.min(s + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSel((s) => Math.max(s - 1, 0));
              } else if (e.key === "Enter" && results[sel]) {
                e.preventDefault();
                go(results[sel]);
              }
            }}
            role="combobox"
            aria-expanded="true"
            aria-controls="search-results"
            aria-activedescendant={results[sel] ? `sr-${sel}` : undefined}
            aria-label="Buscar páginas, mensajes o personas"
            placeholder="Buscar páginas, mensajes o personas"
            className="h-12 flex-1 bg-transparent text-base outline-none placeholder:text-text-faint"
          />
          <kbd className="text-xs text-text-faint">Esc</kbd>
        </div>
        <div id="search-results" role="listbox" className="max-h-[min(420px,60vh)] overflow-y-auto p-2">
          {results.length === 0 && <p className="px-3 py-8 text-center text-sm text-text-muted">{q ? `Nada coincide con "${q}".` : "Escribe para buscar."}</p>}
          {groups.map((g) => {
            const items = results.map((r, i) => ({ r, i })).filter((x) => x.r.kind === g.kind);
            if (!items.length) return null;
            return (
              <div key={g.kind} className="mb-2">
                <p className="px-2 py-1 text-xs font-medium text-text-faint">{g.label}</p>
                {items.map(({ r, i }) => (
                  <button
                    key={r.kind + r.id}
                    id={`sr-${i}`}
                    role="option"
                    aria-selected={i === sel}
                    onMouseEnter={() => setSel(i)}
                    onClick={() => go(r)}
                    className={cn("flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left", i === sel && "bg-hover")}
                  >
                    {r.kind === "page" && (
                      <>
                        <span className="flex w-5 justify-center text-base">{r.icon || <FileText className="size-4 text-text-muted" />}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">{r.title}</span>
                          {r.snippet && <span className="block truncate text-xs text-text-muted">…{r.snippet}…</span>}
                        </span>
                      </>
                    )}
                    {r.kind === "message" && (
                      <>
                        <MessageSquare className="size-4 shrink-0 text-text-muted" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">{r.snippet}</span>
                          <span className="block truncate text-xs text-text-muted">{r.channelLabel}</span>
                        </span>
                      </>
                    )}
                    {r.kind === "person" && (
                      <>
                        {ctx ? <Avatar id={r.id} name={r.name} size={20} /> : <User className="size-4" />}
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {r.name} <span className="text-text-muted">· {r.email}</span>
                        </span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </D.Root>
  );
}
