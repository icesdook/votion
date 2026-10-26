"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useEffect, useMemo, useRef } from "react";
import { BlockNoteSchema, defaultInlineContentSpecs, filterSuggestionItems, insertOrUpdateBlockForSlashMenu } from "@blocknote/core";
import { es } from "@blocknote/core/locales";
import {
  createReactInlineContentSpec,
  FormattingToolbar,
  FormattingToolbarController,
  getDefaultReactSlashMenuItems,
  getFormattingToolbarItems,
  SuggestionMenuController,
  useBlockNoteEditor,
  useComponentsContext,
  useCreateBlockNote,
  type DefaultReactSuggestionItem,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { useRouter } from "next/navigation";
import { FileText, MessageSquarePlus, Table2 } from "lucide-react";
import * as api from "@/data/api";
import type { ID, PageContent } from "@/data/types";
import { access, membersOf, profileName, useCtx, visiblePages } from "@/data/hooks";
import { LEVEL } from "@/data/access";

// ---------- mención a persona dentro del documento
const Mention = createReactInlineContentSpec(
  { type: "mention", propSchema: { userId: { default: "" } }, content: "none" },
  {
    render: function MentionRender(props) {
      const ctx = useCtx();
      const id = props.inlineContent.props.userId;
      return (
        <span className="rounded-sm bg-mention-bg px-0.5 font-medium text-on-mention" data-user-id={id}>
          @{ctx ? profileName(ctx.db, id) : "persona"}
        </span>
      );
    },
  },
);

export const schema = BlockNoteSchema.create({
  inlineContentSpecs: { ...defaultInlineContentSpecs, mention: Mention },
});
export type Editor = typeof schema.BlockNoteEditor;

function CommentButton({ onComment }: { onComment: (blockId: string, quote: string) => void }) {
  const Components = useComponentsContext()!;
  const ed = useBlockNoteEditor(schema);
  return (
    <Components.FormattingToolbar.Button
      mainTooltip="Comentar"
      label="Comentar"
      icon={<MessageSquarePlus size={16} />}
      onClick={() => {
        onComment(ed.getTextCursorPosition().block.id, ed.getSelectedText());
      }}
    >
      Comentar
    </Components.FormattingToolbar.Button>
  );
}

export function PageEditor({
  pageId,
  initial,
  editable,
  canComment,
  dark,
  onChange,
  onComment,
  remoteContent,
}: {
  pageId: ID;
  initial: PageContent;
  editable: boolean;
  canComment: boolean;
  dark: boolean;
  onChange: (content: PageContent) => void;
  onComment: (blockId: string, quote: string) => void;
  remoteContent: PageContent; // contenido guardado, para reflejar cambios de otra persona cuando no editas
}) {
  const ctx = useCtx();
  const router = useRouter();
  const editor = useCreateBlockNote(
    {
      schema,
      dictionary: {
        ...es,
        placeholders: { ...es.placeholders, default: "Escribe algo o presiona / para ver opciones", emptyDocument: "Escribe algo o presiona / para ver opciones" },
      },
      initialContent: initial.length ? (initial as never) : undefined,
      domAttributes: { editor: { "aria-label": "Contenido de la página" } },
    },
    [pageId],
  );
  const lastLocal = useRef<string>(JSON.stringify(initial));

  // reflejar cambios remotos cuando esta persona no está editando
  useEffect(() => {
    const incoming = JSON.stringify(remoteContent);
    if (editable || incoming === lastLocal.current) return;
    lastLocal.current = incoming;
    const blocks = remoteContent.length ? (remoteContent as never[]) : [{ type: "paragraph" } as never];
    editor.replaceBlocks(editor.document, blocks);
  }, [remoteContent, editable, editor]);

  // los enlaces internos navegan sin recargar
  useEffect(() => {
    const el = document.querySelector(`[data-page-editor="${pageId}"]`);
    const onClick = (e: Event) => {
      const a = (e.target as HTMLElement).closest("a");
      const href = a?.getAttribute("href");
      if (href?.startsWith("/w/")) {
        e.preventDefault();
        router.push(href);
      }
    };
    el?.addEventListener("click", onClick);
    return () => el?.removeEventListener("click", onClick);
  }, [pageId, router]);

  const slashItems = useMemo(
    () => (ed: Editor): DefaultReactSuggestionItem[] => {
      // arreglo B de fixes.md: lo común primero, el resto agrupado en "Más bloques"
      const COMMON = ["paragraph", "heading", "heading_2", "bullet_list", "numbered_list", "check_list", "toggle_list", "quote"];
      const HIDDEN = ["video", "audio", "emoji", "file"];
      const all = getDefaultReactSlashMenuItems(ed) as (DefaultReactSuggestionItem & { key?: string })[];
      const common = COMMON.map((k) => all.find((i) => i.key === k)).filter(Boolean).map((i) => ({ ...i!, group: "Básicos" }));
      const more = all.filter((i) => !COMMON.includes(i.key ?? "") && !HIDDEN.includes(i.key ?? "")).map((i) => ({ ...i, group: "Más bloques" }));
      const team: DefaultReactSuggestionItem[] = [
        {
          title: "Tabla de tareas",
          subtext: "Tareas con estado, responsable y fecha, en tabla, tablero o calendario",
          aliases: ["tabla", "tareas", "base de datos", "kanban", "tablero"],
          group: "Equipo",
          icon: <Table2 size={18} />,
          onItemClick: async () => {
            const p = await api.createDatabase(pageId, "Tareas");
            insertOrUpdateBlockForSlashMenu(ed, {
              type: "paragraph",
              content: [{ type: "link", href: `/w/p/${p.id}`, content: [{ type: "text", text: "✅ Tareas", styles: {} }] }],
            } as never);
          },
        },
        {
          title: "Subpágina",
          subtext: "Una página nueva dentro de esta",
          aliases: ["pagina", "página", "subpagina", "page"],
          group: "Equipo",
          icon: <FileText size={18} />,
          onItemClick: async () => {
            const p = await api.createPage({ parentId: pageId, title: "Sin título" });
            insertOrUpdateBlockForSlashMenu(ed, {
              type: "paragraph",
              content: [{ type: "link", href: `/w/p/${p.id}`, content: [{ type: "text", text: "📄 Sin título", styles: {} }] }],
            } as never);
            router.push(`/w/p/${p.id}`);
          },
        },
      ];
      return [...common, ...team, ...more];
    },
    [pageId, router],
  );

  if (!ctx) return null;
  const { db, me, wsId } = ctx;

  return (
    <div data-page-editor={pageId} className="ofi-editor -mx-[54px] max-md:-mx-3">
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme={dark ? "dark" : "light"}
        formattingToolbar={false}
        slashMenu={false}
        onChange={() => {
          const doc = editor.document as unknown as PageContent;
          lastLocal.current = JSON.stringify(doc);
          onChange(doc);
        }}
      >
        <FormattingToolbarController
          formattingToolbar={() => (
            <FormattingToolbar>
              {[...getFormattingToolbarItems(), ...(canComment ? [<CommentButton key="comment" onComment={onComment} />] : [])]}
            </FormattingToolbar>
          )}
        />
        <SuggestionMenuController triggerCharacter="/" getItems={async (q) => filterSuggestionItems(slashItems(editor), q)} />
        <SuggestionMenuController
          triggerCharacter="@"
          getItems={async (q) =>
            filterSuggestionItems(
              membersOf(db, wsId).map((m) => {
                const noAccess = access(db, pageId, m.userId) < LEVEL.view;
                return {
                  title: m.profile.name || m.profile.email,
                  subtext: noAccess ? "No tiene acceso a esta página: no recibirá aviso" : m.userId === me ? "Tú" : m.profile.email,
                  onItemClick: () => {
                    editor.insertInlineContent([{ type: "mention", props: { userId: m.userId } }, " "]);
                  },
                };
              }),
              q,
            )
          }
        />
        <SuggestionMenuController
          triggerCharacter="[["
          getItems={async (q) =>
            filterSuggestionItems(
              visiblePages(db, wsId, me)
                .filter((p) => p.id !== pageId)
                .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
                .slice(0, 30)
                .map((p) => ({
                  title: p.title || "Sin título",
                  subtext: "Enlazar página",
                  icon: <span>{p.icon || "📄"}</span>,
                  onItemClick: () => {
                    editor.insertInlineContent([{ type: "link", href: `/w/p/${p.id}`, content: `${p.icon ? p.icon + " " : ""}${p.title || "Sin título"}` }, " "]);
                  },
                })),
              q,
            )
          }
        />
      </BlockNoteView>
    </div>
  );
}
