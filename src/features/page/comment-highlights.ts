"use client";

import { useEffect } from "react";
import type { CommentThread, ID } from "@/data/types";

// Resalta el texto comentado con la CSS Custom Highlight API: no modifica el DOM ni el documento,
// así que funciona aunque la persona solo pueda comentar, y no despierta al observador de ProseMirror.

type HighlightRegistry = { set: (n: string, h: unknown) => void; delete: (n: string) => void };
const NAME = "ofi-comment";

function supported() {
  return typeof window !== "undefined" && "Highlight" in window && "highlights" in CSS;
}

/** Busca la cita dentro de los nodos de texto del bloque y devuelve el rango. */
function findRange(block: Element, quote: string): Range | null {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let full = "";
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    // solo el contenido del propio bloque, no el de sus hijos anidados
    // BlockNote repite data-id en el contenedor exterior e interior: se compara por id, no por elemento
    if (n.parentElement?.closest("[data-id]")?.getAttribute("data-id") !== block.getAttribute("data-id")) continue;
    nodes.push(n as Text);
    full += (n as Text).data;
  }
  const q = quote.trim();
  if (!q) return null;
  const at = full.indexOf(q);
  if (at < 0) return null;
  const range = document.createRange();
  let offset = 0;
  let started = false;
  for (const n of nodes) {
    const len = n.data.length;
    if (!started && at < offset + len) {
      range.setStart(n, at - offset);
      started = true;
    }
    if (started && at + q.length <= offset + len) {
      range.setEnd(n, at + q.length - offset);
      return range;
    }
    offset += len;
  }
  return null;
}

export function useCommentHighlights(pageId: ID, threads: CommentThread[], onOpen: (threadId: ID) => void) {
  const key = threads
    .filter((t) => !t.resolvedAt && t.blockId && t.anchor?.quote)
    .map((t) => `${t.id}:${t.blockId}:${t.anchor!.quote}`)
    .join("|");

  useEffect(() => {
    if (!supported()) return;
    const registry = (CSS as unknown as { highlights: HighlightRegistry }).highlights;
    const open = threads.filter((t) => !t.resolvedAt && t.blockId && t.anchor?.quote);
    let root: Element | null = null;
    let ranges: { id: ID; range: Range }[] = [];

    const paint = () => {
      ranges = [];
      if (!root) return;
      for (const t of open) {
        const block = root.querySelector(`[data-id="${CSS.escape(t.blockId!)}"]`);
        const r = block && findRange(block, t.anchor!.quote);
        if (r) ranges.push({ id: t.id, range: r });
      }
      const HL = (window as unknown as { Highlight: new (...r: Range[]) => unknown }).Highlight;
      registry.set(NAME, new HL(...ranges.map((x) => x.range)));
    };

    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(paint);
    };
    // solo lee el DOM: no escribe, así que no hay bucle
    const obs = new MutationObserver(schedule);
    // el editor carga en diferido: esperar a que exista
    let waited = 0;
    let wait: ReturnType<typeof setTimeout> | undefined;
    const attach = () => {
      root = document.querySelector(`[data-page-editor="${pageId}"] .bn-editor`);
      if (!root) {
        if ((waited += 100) < 8000) wait = setTimeout(attach, 100);
        return;
      }
      schedule();
      obs.observe(root, { childList: true, subtree: true, characterData: true });
      root.addEventListener("click", onClick as EventListener);
    };

    const onClick = (e: MouseEvent) => {
      const pos = document.caretPositionFromPoint?.(e.clientX, e.clientY);
      if (!pos) return;
      const hit = ranges.find((x) => x.range.isPointInRange(pos.offsetNode, pos.offset));
      if (hit) onOpen(hit.id);
    };
    attach();

    return () => {
      clearTimeout(wait);
      cancelAnimationFrame(frame);
      obs.disconnect();
      root?.removeEventListener("click", onClick as EventListener);
      registry.delete(NAME);
    };
    // `key` resume los hilos abiertos; onOpen es estable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId, key]);
}
