import { cn } from "@/lib/cn";

const PALETTE = ["blue", "green", "yellow", "red", "purple", "gray"] as const;

function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

const BG: Record<(typeof PALETTE)[number], string> = {
  blue: "bg-tag-blue-bg text-tag-blue",
  green: "bg-tag-green-bg text-tag-green",
  yellow: "bg-tag-yellow-bg text-tag-yellow",
  red: "bg-tag-red-bg text-tag-red",
  purple: "bg-tag-purple-bg text-tag-purple",
  gray: "bg-tag-gray-bg text-tag-gray",
};

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

type Props = {
  id: string;
  name: string;
  src?: string | null;
  size?: 20 | 24 | 32 | 40;
  online?: boolean;
  className?: string;
};

export function Avatar({ id, name, src, size = 24, online, className }: Props) {
  const text = size <= 24 ? "text-[10px]" : "text-xs";
  return (
    <span
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
      title={name}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="size-full rounded-full object-cover" />
      ) : (
        <span
          role="img"
          aria-label={name}
          className={cn("flex size-full items-center justify-center rounded-full font-semibold", text, BG[colorFor(id)])}
        >
          {initials(name)}
        </span>
      )}
      {online && (
        <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-bg bg-success">
          <span className="sr-only">en línea</span>
        </span>
      )}
    </span>
  );
}

export function AvatarStack({ people, max = 4 }: { people: { id: string; name: string; src?: string | null }[]; max?: number }) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className="flex items-center -space-x-1" aria-label={`${people.length} personas`}>
      {shown.map((p) => (
        <Avatar key={p.id} {...p} className="rounded-full ring-2 ring-bg" />
      ))}
      {rest > 0 && (
        <span className="flex size-6 items-center justify-center rounded-full bg-surface-2 text-[10px] font-semibold text-text-muted ring-2 ring-bg">
          +{rest}
        </span>
      )}
    </div>
  );
}
