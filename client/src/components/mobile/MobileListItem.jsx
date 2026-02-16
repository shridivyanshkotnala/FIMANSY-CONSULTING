import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

/**
 * MobileListItem
 * A reusable row item used in mobile list screens (transactions, vendors, etc).
 * Pure presentational component — no data fetching and no global state usage.
 *
 * 🔵 Redux Integration Note:
 * This component should NEVER talk to Redux directly.
 * Parent container (screen/page) should pass already prepared data via props.
 * Keep this as a dumb UI component to avoid unnecessary re‑renders on store updates.
 */
export function MobileListItem({
  title,
  subtitle,
  value,
  valueSubtext,
  icon,
  status,
  onClick,
  showArrow = true,
  className,
}) {
  const getStatusStyles = (variant) => {
    switch (variant) {
      case "success":
        return "bg-success/10 text-success";
      case "warning":
        return "bg-warning/10 text-warning";
      case "danger":
        return "bg-destructive/10 text-destructive";
      case "info":
        return "bg-info/10 text-info";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-4 bg-card border-b border-border/50 last:border-b-0",
        onClick && "cursor-pointer active:bg-accent/50 touch-manipulation transition-colors",
        className
      )}
      onClick={onClick}
    >
      {/* Left Icon */}
      {icon && (
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          {icon}
        </div>
      )}
      
      {/* Main Text Section */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Right Side Info */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Status Badge */}
        {status && (
          <span
            className={cn(
              "text-[10px] font-semibold uppercase px-2 py-1 rounded-md",
              getStatusStyles(status.variant)
            )}
          >
            {status.label}
          </span>
        )}
        
        {/* Value Display */}
        {value && (
          <div className="text-right">
            <p className="text-sm font-semibold text-foreground">{value}</p>
            {valueSubtext && (
              <p className="text-[10px] text-muted-foreground">{valueSubtext}</p>
            )}
          </div>
        )}

        {/* Navigation Arrow */}
        {onClick && showArrow && (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
