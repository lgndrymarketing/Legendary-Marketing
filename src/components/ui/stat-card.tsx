import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  /** Optional supporting note under the value (e.g. "3 new this week"). */
  hint?: string;
  className?: string;
}

/**
 * Standard metric tile — icon chip + value + label — used across the admin
 * command center and elsewhere so every KPI reads the same way.
 */
export function StatCard({ label, value, icon: Icon, hint, className }: StatCardProps) {
  return (
    <Card className={cn("transition-shadow hover:shadow-md", className)}>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange/10">
          <Icon className="h-6 w-6 text-orange" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground/80">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
