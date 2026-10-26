import { cn } from "@/lib/cn";

export function EmptyState({
  icon,
  title,
  text,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  text?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-2 px-6 py-10 text-center", className)}>
      <span className="text-text-faint [&_svg]:size-8" aria-hidden>
        {icon}
      </span>
      <p className="text-sm font-semibold">{title}</p>
      {text && <p className="max-w-xs text-sm text-text-muted">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cn("block animate-pulse rounded-sm bg-surface-2", className)} />;
}
