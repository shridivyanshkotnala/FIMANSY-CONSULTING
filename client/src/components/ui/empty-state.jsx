import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/*
  EmptyState

  Reusable “no data yet” screen.

  Used when:
  - no documents
  - no transactions
  - no reports
  - no results after filtering

  Keeps UX consistent instead of random blank pages.
*/

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title}
      </h3>

      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {description}
      </p>

      {actionLabel && onAction && (
        <Button onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
