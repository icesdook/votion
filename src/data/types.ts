// Tipos del dominio. Reflejan replica/schema.sql (camelCase en el cliente).

export type ID = string;
export type ISODate = string;

export type Role = "owner" | "admin" | "member";
export type AccessLevel = "full" | "edit" | "comment" | "view";

export interface Profile {
  id: ID;
  email: string;
  name: string;
  avatarUrl?: string | null;
  theme: "system" | "light" | "dark";
  emailDigest: boolean;
}

export interface Workspace {
  id: ID;
  name: string;
  icon?: string | null;
  memberLimit: number;
  createdBy: ID;
  createdAt: ISODate;
}

export interface Member {
  workspaceId: ID;
  userId: ID;
  role: Role;
  joinedAt: ISODate;
}

export interface Invite {
  id: ID;
  workspaceId: ID;
  email: string;
  token: string;
  invitedBy: ID;
  expiresAt: ISODate;
  acceptedAt?: ISODate | null;
}

/** Documento del editor: lista de bloques de BlockNote (JSON). */
export type PageContent = unknown[];

export interface Page {
  id: ID;
  workspaceId: ID;
  parentId: ID | null;
  title: string;
  icon?: string | null;
  content: PageContent;
  searchText: string;
  isPrivate: boolean;
  ownerId: ID;
  position: number;
  isDatabaseRow: boolean;
  fullWidth?: boolean;
  lockedBy?: ID | null;
  lockedUntil?: ISODate | null;
  archivedAt?: ISODate | null;
  createdBy: ID;
  updatedBy?: ID | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface PagePermission {
  pageId: ID;
  userId: ID;
  level: AccessLevel;
}

export interface PageVersion {
  id: ID;
  pageId: ID;
  title: string;
  content: PageContent;
  createdBy: ID | null;
  createdAt: ISODate;
}

export interface Favorite {
  userId: ID;
  pageId: ID;
  position: number;
}

export type PropertyType = "text" | "select" | "status" | "person" | "date" | "checkbox" | "number";
export interface PropertyOption {
  id: ID;
  label: string;
  color: "gray" | "blue" | "green" | "yellow" | "red" | "purple";
}

export interface Database {
  id: ID;
  pageId: ID;
  name: string;
}

export interface DbProperty {
  id: ID;
  databaseId: ID;
  name: string;
  type: PropertyType;
  options: PropertyOption[];
  position: number;
}

export type CellValue = string | number | boolean | null;
export interface DbRow {
  id: ID;
  databaseId: ID;
  pageId: ID;
  values: Record<ID, CellValue>;
  position: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type ViewType = "table" | "board" | "calendar";
export interface ViewConfig {
  filters?: { propertyId: ID; op: "is" | "is_not" | "contains" | "empty" | "not_empty"; value?: CellValue }[];
  sorts?: { propertyId: ID; dir: "asc" | "desc" }[];
  groupBy?: ID; // propiedad status/select para el tablero
  dateProperty?: ID; // para el calendario
  hidden?: ID[];
}
export interface DbView {
  id: ID;
  databaseId: ID;
  name: string;
  type: ViewType;
  config: ViewConfig;
  position: number;
}

/** Texto enriquecido simple para comentarios y mensajes. */
export type RichNode =
  | { t: "text"; v: string }
  | { t: "user"; id: ID }
  | { t: "page"; id: ID }
  | { t: "br" };
export type RichText = RichNode[];

export interface CommentThread {
  id: ID;
  pageId: ID;
  blockId?: string | null;
  anchor?: { quote: string } | null;
  resolvedAt?: ISODate | null;
  resolvedBy?: ID | null;
  createdBy: ID;
  createdAt: ISODate;
}

export interface Comment {
  id: ID;
  threadId: ID;
  authorId: ID;
  body: RichText;
  editedAt?: ISODate | null;
  deletedAt?: ISODate | null;
  createdAt: ISODate;
}

export type ChannelKind = "channel" | "dm" | "page";
export interface Channel {
  id: ID;
  workspaceId: ID;
  kind: ChannelKind;
  name?: string | null;
  pageId?: ID | null;
  dmKey?: string | null;
  createdBy: ID;
  archivedAt?: ISODate | null;
  createdAt: ISODate;
}

export interface ChannelMember {
  channelId: ID;
  userId: ID;
  lastReadAt: ISODate;
  muted: boolean;
}

export interface Message {
  id: ID;
  channelId: ID;
  authorId: ID | null; // null = mensaje del sistema
  parentId?: ID | null;
  body: RichText;
  linkedPageId?: ID | null;
  clientId?: string | null;
  editedAt?: ISODate | null;
  deletedAt?: ISODate | null;
  createdAt: ISODate;
}

export interface Reaction {
  id: ID;
  targetType: "comment" | "message";
  targetId: ID;
  userId: ID;
  emoji: string;
}

export type NotificationKind = "mention" | "reply" | "assigned" | "invite" | "dm";
export interface Notification {
  id: ID;
  userId: ID;
  workspaceId: ID;
  kind: NotificationKind;
  actorId?: ID | null;
  pageId?: ID | null;
  threadId?: ID | null;
  messageId?: ID | null;
  channelId?: ID | null;
  dedupeKey?: string | null;
  readAt?: ISODate | null;
  createdAt: ISODate;
}

export interface DB {
  profiles: Profile[];
  workspaces: Workspace[];
  members: Member[];
  invites: Invite[];
  pages: Page[];
  pagePermissions: PagePermission[];
  pageVersions: PageVersion[];
  favorites: Favorite[];
  databases: Database[];
  dbProperties: DbProperty[];
  dbRows: DbRow[];
  dbViews: DbView[];
  commentThreads: CommentThread[];
  comments: Comment[];
  channels: Channel[];
  channelMembers: ChannelMember[];
  messages: Message[];
  reactions: Reaction[];
  notifications: Notification[];
}

/** Error de dominio con código estable (igual a los errores de la base de datos). */
export class DomainError extends Error {
  constructor(
    public code:
      | "member_limit_reached"
      | "page_cycle"
      | "forbidden"
      | "not_found"
      | "invite_expired"
      | "invite_used"
      | "already_member"
      | "invalid"
      | "duplicate_name",
    message?: string,
  ) {
    super(message ?? code);
  }
}
