import { cn } from "@/lib/cn";

export const TAG_COLORS = ["gray", "blue", "green", "yellow", "red", "purple"] as const;
export type TagColor = (typeof TAG_COLORS)[number];

const STYLES: Record<TagColor, string> = {
  gray: "bg-tag-gray-bg text-tag-gray",
  blue: "bg-tag-blue-bg text-tag-blue",
  green: "bg-tag-green-bg text-tag-green",
  yellow: "bg-tag-yellow-bg text-tag-yellow",
  red: "bg-tag-red-bg text-tag-red",
  purple: "bg-tag-purple-bg text-tag-purple",
};

export function Tag({ color = "gray", children, className }: { color?: TagColor; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-5 items-center rounded-sm px-1.5 text-xs font-medium whitespace-nowrap", STYLES[color], className)}>
      {children}
    </span>
  );
}

export function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-pill bg-accent px-1 text-[11px] font-semibold text-on-accent">
      {count > 99 ? "99+" : count}
      <span className="sr-only"> sin leer</span>
    </span>
  );
}
