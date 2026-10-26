import { useId } from "react";
import { cn } from "@/lib/cn";

type Props = React.ComponentProps<"input"> & {
  label: string;
  hideLabel?: boolean;
  error?: string;
  icon?: React.ReactNode;
};

export function Input({ label, hideLabel, error, icon, className, id, ...props }: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errId = `${inputId}-error`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className={cn("text-xs text-text-muted", hideLabel && "sr-only")}>
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-text-faint [&_svg]:size-4">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
          className={cn(
            "h-8 w-full rounded-md border border-border-input bg-bg px-2.5 text-sm text-text placeholder:text-text-faint max-md:h-10",
            "focus:border-accent focus:outline-2 focus:outline-offset-0 focus:outline-focus",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-danger",
            icon && "pl-8",
            className,
          )}
          {...props}
        />
      </div>
      {error && (
        <p id={errId} className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
