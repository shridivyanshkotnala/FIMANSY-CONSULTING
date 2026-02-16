import { cn } from "@/lib/utils";

/**
 * Pure visual skeleton loader.
 * No data dependency.
 * No API.
 * No state logic.
 * Safe component — will never need Redux.
 */

export function MobileSkeletonCard({ variant = "stat", className }) {
  if (variant === "stat") {
    return (
      <div className={cn("bg-card rounded-xl border p-4 animate-pulse", className)}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-3 w-20 bg-muted rounded mb-2" />
            <div className="h-7 w-28 bg-muted rounded mb-1" />
            <div className="h-2.5 w-24 bg-muted rounded" />
          </div>
          <div className="h-10 w-10 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={cn("bg-card border-b border-border/50 p-4 animate-pulse", className)}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-muted rounded-xl flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="h-4 w-32 bg-muted rounded mb-1.5" />
            <div className="h-3 w-24 bg-muted rounded" />
          </div>
          <div className="h-5 w-16 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (variant === "action") {
    return (
      <div className={cn("bg-card rounded-xl border border-l-4 border-l-muted p-4 animate-pulse", className)}>
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 bg-muted rounded-lg flex-shrink-0" />
          <div className="flex-1">
            <div className="h-4 w-full bg-muted rounded mb-3" />
            <div className="h-7 w-20 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Reusable list skeleton
 * UI only — no business logic
 */
export function MobileSkeletonList({ count = 5 }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: count }).map((_, i) => (
        <MobileSkeletonCard key={i} variant="list" />
      ))}
    </div>
  );
}
