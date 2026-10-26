import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md text-sm font-medium whitespace-nowrap select-none transition-colors duration-[var(--duration-fast)] disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-accent text-on-accent hover:brightness-95 active:brightness-90",
        secondary: "border border-border bg-bg text-text hover:bg-hover",
        ghost: "text-text-muted hover:bg-hover hover:text-text",
        danger: "bg-danger text-on-danger hover:brightness-95",
      },
      size: {
        sm: "h-7 px-2",
        md: "h-8 px-3 max-md:h-10",
        lg: "h-10 px-4",
        icon: "size-7 p-0 max-md:size-10",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

type Props = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { loading?: boolean };

export function Button({ className, variant, size, loading, children, disabled, ...props }: Props) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
