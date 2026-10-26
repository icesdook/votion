"use client";

import { Dialog as D, DropdownMenu as M, Popover as P, Tooltip as T } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

const panel = "rounded-lg bg-bg shadow-pop";

// ---------- Dialog
export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  title,
  description,
  children,
  className,
  side,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  side?: "center" | "right" | "palette";
}) {
  const pos =
    side === "right"
      ? "top-0 right-0 h-full w-full md:w-1/2 rounded-none md:rounded-l-lg"
      : side === "palette"
        ? "top-[12vh] left-1/2 w-[min(640px,calc(100vw-32px))] -translate-x-1/2"
        : "top-1/2 left-1/2 w-[min(480px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2";
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-40 bg-black/30" />
      <D.Content className={cn("fixed z-50 flex flex-col", panel, pos, className)}>
        <D.Title className={side === "palette" ? "sr-only" : "px-5 pt-4 text-h3 font-semibold"}>{title}</D.Title>
        {description ? (
          <D.Description className="px-5 pt-1 text-sm text-text-muted">{description}</D.Description>
        ) : (
          <D.Description className="sr-only">{title}</D.Description>
        )}
        {side !== "palette" && (
          <D.Close className="absolute top-3 right-3 rounded-md p-1 text-text-muted hover:bg-hover" aria-label="Cerrar">
            <X className="size-4" />
          </D.Close>
        )}
        {children}
      </D.Content>
    </D.Portal>
  );
}

// ---------- Popover
export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export const PopoverAnchor = P.Anchor;
export function PopoverContent({ className, ...props }: React.ComponentProps<typeof P.Content>) {
  return (
    <P.Portal>
      <P.Content sideOffset={6} collisionPadding={8} className={cn("z-50 p-1", panel, className)} {...props} />
    </P.Portal>
  );
}

// ---------- Menu
export const Menu = M.Root;
export const MenuTrigger = M.Trigger;
export function MenuContent({ className, ...props }: React.ComponentProps<typeof M.Content>) {
  return (
    <M.Portal>
      <M.Content sideOffset={6} collisionPadding={8} className={cn("z-50 min-w-48 p-1", panel, className)} {...props} />
    </M.Portal>
  );
}
export function MenuItem({ className, danger, ...props }: React.ComponentProps<typeof M.Item> & { danger?: boolean }) {
  return (
    <M.Item
      className={cn(
        "flex h-7 cursor-default items-center gap-2 rounded-sm px-2 text-sm outline-none select-none data-[disabled]:opacity-50 data-[highlighted]:bg-hover [&_svg]:size-4 [&_svg]:text-text-muted",
        danger && "text-danger [&_svg]:text-danger",
        className,
      )}
      {...props}
    />
  );
}
export const MenuSeparator = () => <M.Separator className="my-1 h-px bg-border" />;

// ---------- Tooltip
export const TooltipProvider = T.Provider;
export function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <T.Root delayDuration={400}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content sideOffset={6} className="z-50 rounded-md bg-text px-2 py-1 text-xs text-bg">
          {label}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
