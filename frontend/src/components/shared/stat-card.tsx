import { memo } from "react";
import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  label: string;
  value: string;
  delta?: number;
  icon?: LucideIcon;
  isLoading?: boolean;
  hint?: string;
  className?: string;
}

function StatCardBase({
  label,
  value,
  delta,
  icon: Icon,
  isLoading,
  hint,
  className,
}: StatCardProps) {
  if (isLoading) {
    return (
      <Card className={cn("p-5", className)}>
        <Skeleton className="h-4 w-20 mb-3" />
        <Skeleton className="h-7 w-28 mb-2" />
        <Skeleton className="h-3 w-16" />
      </Card>
    );
  }
  const isUp = (delta ?? 0) >= 0;
  return (
    <Card className={cn("relative overflow-hidden p-5 transition-shadow hover:shadow-md", className)}>
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {Icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight text-foreground">{value}</div>
      {delta !== undefined && (
        <div className="mt-1 flex items-center gap-1 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              isUp ? "text-success" : "text-destructive"
            )}
          >
            {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {isUp ? "+" : ""}
            {delta.toFixed(2)}%
          </span>
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      )}
    </Card>
  );
}

export const StatCard = memo(StatCardBase);
