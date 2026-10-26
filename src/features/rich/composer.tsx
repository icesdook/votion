"use client";

import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import { FileText, SendHorizontal } from "lucide-react";
import type { ID, RichText } from "@/data/types";
import { access, membersOf, useCtx, visiblePages } from "@/data/hooks";
import { LEVEL } from "@/data/access";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

type Token = { label: string; node: { t: "user"; id: ID } | { t: "page"; id: ID } };
type Suggest = { kind: "user" | "page"; start: number; query: string } | null;

export type ComposerHandle = { focus: () => void; setText: (s: string) => void };

/** Convierte el texto + tokens insertados en RichText. */
function serialize(text: string, tokens: Token[]): RichText {
  const out: RichText = [];
  const sorted = [...tokens].sort((a, b) => b.label.length - a.label.length);
  let rest = text;
  while (rest.length) {
    let best: { i: number; tok: Token } | null = null;
    for (const tok of sorted) {
      const i = rest.indexOf(tok.label);
      if (i >= 0 && (!best || i < best.i)) best = { i, tok };
    }
    if (!best) {
      pushText(out, rest);
      break;
    }
    if (best.i > 0) pushText(out, rest.slice(0, best.i));
    out.push(best.tok.node);
    rest = rest.slice(best.i + best.tok.label.length);
  }
  return out;
}

function pushText(out: RichText, s: string) {
  s.split("\n").forEach((part, i) => {
    if (i > 0) out.push({ t: "br" });
    if (part) out.push({ t: "text", v: part });
  });
}

export const Composer = forwardRef<
  ComposerHandle,
  {
    label: string;
    placeholder: string;
    onSubmit: (body: RichText) => void | Promise<void>;
    onArrowUpEmpty?: () => void;
    onCancel?: () => void;
    initialBody?: RichText;
    submitLabel?: string;
    compact?: boolean;
    disabled?: boolean;
    disabledText?: string;
    pageScope?: ID; // si es chat/comentario de una página, solo mencionar a quien tiene acceso
  }
>(function Composer({ label, placeholder, onSubmit, onArrowUpEmpty, onCancel, initialBody, submitLabel = "Enviar", compact, disabled, disabledText, pageScope }, ref) {
  const ctx = useCtx();
  const [init] = useState(() => fromBody(initialBody ?? [], ctx));
  const [text, setText] = useState(init.text);
  const [tokens, setTokens] = useState<Token[]>(init.tokens);
  const [suggest, setSuggest] = useState<Suggest>(null);
  const [sel, setSel] = useState(0);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [below, setBelow] = useState(false);

  useImperativeHandle(ref, () => ({ focus: () => taRef.current?.focus(), setText }));

  const options = useMemo(() => {
    if (!ctx || !suggest) return [];
    const q = suggest.query.toLowerCase();
    if (suggest.kind === "user") {
      return membersOf(ctx.db, ctx.wsId)
        .filter((m) => (m.profile.name || m.profile.email).toLowerCase().includes(q))
        .slice(0, 6)
        .map((m) => ({
          id: m.userId,
          label: m.profile.name || m.profile.email,
          noAccess: pageScope ? access(ctx.db, pageScope, m.userId) < LEVEL.view : false,
        }));
    }
    return visiblePages(ctx.db, ctx.wsId, ctx.me)
      .concat(ctx.db.pages.filter((p) => p.isDatabaseRow && !p.archivedAt && access(ctx.db, p.id, ctx.me) >= LEVEL.view))
      .filter((p) => (p.title || "sin título").toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 6)
      .map((p) => ({ id: p.id, label: p.title || "Sin título", icon: p.icon, noAccess: false }));
  }, [ctx, suggest, pageScope]);

  const detect = (value: string, caret: number) => {
    // si arriba no hay espacio (p. ej. el comentario al inicio del panel), la lista se abre hacia abajo
    const top = taRef.current?.getBoundingClientRect().top ?? 999;
    setBelow(top < 280);
    const before = value.slice(0, caret);
    const at = before.match(/(^|\s)@([^\s@]{0,30})$/);
    if (at) return setSuggest({ kind: "user", start: caret - at[2].length - 1, query: at[2] }), setSel(0);
    const pg = before.match(/\[\[([^\]\n]{0,40})$/);
    if (pg) return setSuggest({ kind: "page", start: caret - pg[1].length - 2, query: pg[1] }), setSel(0);
    setSuggest(null);
  };

  const pick = (o: { id: ID; label: string }) => {
    if (!suggest || !taRef.current) return;
    const caret = taRef.current.selectionStart;
    const label = suggest.kind === "user" ? `@${o.label}` : `[[${o.label}]]`;
    const next = text.slice(0, suggest.start) + label + " " + text.slice(caret);
    setText(next);
    setTokens((t) => [...t.filter((x) => x.label !== label), { label, node: suggest.kind === "user" ? { t: "user", id: o.id } : { t: "page", id: o.id } }]);
    setSuggest(null);
    requestAnimationFrame(() => {
      const pos = suggest.start + label.length + 1;
      taRef.current?.setSelectionRange(pos, pos);
      taRef.current?.focus();
    });
  };

  const submit = async () => {
    const body = serialize(text.trimEnd(), tokens.filter((t) => text.includes(t.label)));
    if (!body.length || !text.trim()) return;
    setText("");
    setTokens([]);
    await onSubmit(body);
  };

  if (disabled) {
    return <p className="rounded-md bg-surface px-3 py-2 text-sm text-text-muted">{disabledText}</p>;
  }

  return (
    <div className="relative">
      {suggest && options.length > 0 && (
        <div role="listbox" aria-label={suggest.kind === "user" ? "Personas" : "Páginas"} className={cn("absolute left-0 z-30 w-72 rounded-lg bg-bg p-1 shadow-pop", below ? "top-full mt-1" : "bottom-full mb-1")}>
          {options.map((o, i) => (
            <button
              key={o.id}
              role="option"
              aria-selected={i === sel}
              onMouseDown={(e) => (e.preventDefault(), pick(o))}
              className={cn("flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm", i === sel && "bg-hover")}
            >
              {suggest.kind === "user" ? (
                <Avatar id={o.id} name={o.label} size={20} />
              ) : (
                <span className="w-5 text-center">{"icon" in o && o.icon ? String(o.icon) : <FileText className="size-4 text-text-muted" />}</span>
              )}
              <span className="flex-1 truncate">{o.label}</span>
              {o.noAccess && <span className="text-xs text-text-faint">sin acceso</span>}
            </button>
          ))}
        </div>
      )}
      <div className={cn("flex items-end gap-2 rounded-lg border border-border-input bg-bg px-3 py-2 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent", compact && "px-2 py-1.5")}>
        <label className="sr-only" htmlFor={label}>
          {label}
        </label>
        <textarea
          id={label}
          ref={taRef}
          rows={1}
          value={text}
          placeholder={placeholder}
          onChange={(e) => {
            setText(e.target.value);
            detect(e.target.value, e.target.selectionStart);
            const el = e.target;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 8 * 20 + 8) + "px";
          }}
          onKeyDown={(e) => {
            if (suggest && options.length) {
              if (e.key === "ArrowDown") return (e.preventDefault(), setSel((s) => (s + 1) % options.length));
              if (e.key === "ArrowUp") return (e.preventDefault(), setSel((s) => (s - 1 + options.length) % options.length));
              if (e.key === "Enter" || e.key === "Tab") return (e.preventDefault(), pick(options[sel]));
              if (e.key === "Escape") return (e.preventDefault(), setSuggest(null));
            }
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
            if (e.key === "ArrowUp" && !text && onArrowUpEmpty) {
              e.preventDefault();
              onArrowUpEmpty();
            }
            if (e.key === "Escape" && onCancel) onCancel();
          }}
          className="max-h-[168px] min-h-5 flex-1 resize-none bg-transparent text-sm leading-5 outline-none placeholder:text-text-faint"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim()}
          aria-label={submitLabel}
          className="rounded-md p-1 text-accent hover:bg-accent-soft disabled:text-text-faint disabled:hover:bg-transparent"
        >
          <SendHorizontal className="size-4" />
        </button>
      </div>
      {!compact && <p className="mt-1 px-1 text-xs text-text-faint max-md:hidden">Enter envía · Shift + Enter nueva línea · @ para nombrar · [[ para enlazar una página</p>}
    </div>
  );
});

/** Convierte RichText a texto editable + tokens (para editar un mensaje o comentario). */
function fromBody(body: RichText, ctx: ReturnType<typeof useCtx>) {
  const tokens: Token[] = [];
  const text = body
    .map((n) => {
      if (n.t === "text") return n.v;
      if (n.t === "br") return "\n";
      const name =
        n.t === "user"
          ? ctx?.db.profiles.find((p) => p.id === n.id)?.name || "persona"
          : ctx?.db.pages.find((p) => p.id === n.id)?.title || "Sin título";
      const label = n.t === "user" ? `@${name}` : `[[${name}]]`;
      tokens.push({ label, node: n });
      return label;
    })
    .join("");
  return { text, tokens };
}
