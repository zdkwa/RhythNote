import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DaySectionProps {
  title: string;
  count?: number;
  description?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children?: ReactNode;
  emptyHint?: string;
  className?: string;
}

export function DaySection({
  title,
  count,
  description,
  collapsible = false,
  defaultOpen = true,
  children,
  emptyHint,
  className,
}: DaySectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  const heading = (
    <span className="flex items-baseline gap-2">
      <h2 className="font-display text-xl font-semibold text-foreground">
        {title}
      </h2>
      {typeof count === "number" ? (
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
          {count}
        </span>
      ) : null}
    </span>
  );

  return (
    <section className={cn("space-y-3", className)} aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            className="flex items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {heading}
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                !open && "-rotate-90",
              )}
            />
          </button>
        ) : (
          heading
        )}
        {description ? (
          <p className="text-[11px] text-muted-foreground">{description}</p>
        ) : null}
      </div>

      {open ? (
        children ? (
          <div className="stagger space-y-3">{children}</div>
        ) : emptyHint ? (
          <p className="rounded-lg border border-dashed border-border/70 px-4 py-3 text-xs text-muted-foreground">
            {emptyHint}
          </p>
        ) : null
      ) : null}
    </section>
  );
}
