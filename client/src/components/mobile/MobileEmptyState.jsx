import { cn } from "@/lib/utils";

/**
 * Mobile empty state display component
 * Pure presentational component
 *
 * IMPORTANT:
 * Do NOT add API calls here.
 * Parent decides when empty state appears.
 * Later Redux selector will control visibility.
 */

export function MobileEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-6 text-center", className)}>
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title}
      </h3>

      <p className="text-sm text-muted-foreground max-w-[260px] mb-6">
        {description}
      </p>

      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-3 bg-primary text-primary-foreground font-medium rounded-xl touch-manipulation active:scale-95 transition-transform"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
