import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Optional right-aligned action(s), e.g. a button. */
  action?: React.ReactNode;
  /** Optional small eyebrow label above the title. */
  eyebrow?: string;
  className?: string;
}

/**
 * Consistent page header used across every dashboard/admin surface so the
 * whole product shares one visual rhythm. Server-safe (CSS-only fade-in).
 */
export function PageHeader({
  title,
  description,
  action,
  eyebrow,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 animate-fade-up sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="space-y-1">
        {eyebrow && (
          <p className="text-xs font-medium uppercase tracking-wider text-orange">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description && (
          <p className="text-muted-foreground max-w-2xl">{description}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
