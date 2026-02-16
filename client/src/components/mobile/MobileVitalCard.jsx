import { useState } from "react";
import { ChevronDown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/*
========================================================
MobileVitalCard

Represents a single KPI metric block (cash, overdue, gap etc)

IMPORTANT:
This component must NEVER fetch or compute data.

It should ONLY display data passed from parent.
Later parent will read values from Redux selectors like:

useSelector(selectCashMetrics)
useSelector(selectReceivableMetrics)

Why?
UI components must stay deterministic.
Otherwise debugging financial mismatches becomes impossible.
========================================================
*/

export function MobileVitalCard({
  title,
  value,
  subtitle,
  icon,
  delta,
  variant = "neutral",
  loading = false,
  expandedContent,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return "border-l-success bg-success/5";
      case "warning":
        return "border-l-warning bg-warning/5";
      case "danger":
        return "border-l-destructive bg-destructive/5";
      default:
        return "border-l-primary bg-card";
    }
  };

  const getValueColor = () => {
    switch (variant) {
      case "success":
        return "text-success";
      case "warning":
        return "text-warning";
      case "danger":
        return "text-destructive";
      default:
        return "text-foreground";
    }
  };

  /* =========================
     Loading Skeleton
  ========================= */
  if (loading) {
    return (
      <div className="bg-card rounded-xl p-4 border shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-32 mb-1" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </div>
    );
  }

  /* =========================
     Main Card
  ========================= */
  return (
    <div
      className={cn(
        "rounded-xl border border-l-4 shadow-sm transition-all duration-200",
        getVariantStyles(),
        expandedContent && "cursor-pointer active:scale-[0.99]"
      )}
      onClick={() => expandedContent && setIsExpanded(!isExpanded)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">

            {/* Title + Delta */}
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {title}
              </p>

              {delta !== undefined && (
                <span
                  className={cn(
                    "flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                    delta > 0 && "bg-success/10 text-success",
                    delta === 0 && "bg-muted text-muted-foreground",
                    delta < 0 && "bg-destructive/10 text-destructive"
                  )}
                >
                  {delta > 0 ? (
                    <TrendingUp className="h-2.5 w-2.5" />
                  ) : delta < 0 ? (
                    <TrendingDown className="h-2.5 w-2.5" />
                  ) : (
                    <Minus className="h-2.5 w-2.5" />
                  )}
                  {delta > 0 ? "+" : ""}
                  {delta.toFixed(1)}%
                </span>
              )}
            </div>

            {/* Value */}
            <p className={cn("text-2xl font-bold font-heading tracking-tight", getValueColor())}>
              {value}
            </p>

            {/* Subtitle */}
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {subtitle}
            </p>
          </div>

          {/* Icon + Expand Arrow */}
          {(icon || expandedContent) && (
            <div className="flex items-center gap-2 ml-3">
              {icon && (
                <div
                  className={cn(
                    "p-2.5 rounded-xl",
                    variant === "success" && "bg-success/10 text-success",
                    variant === "warning" && "bg-warning/10 text-warning",
                    variant === "danger" && "bg-destructive/10 text-destructive",
                    variant === "neutral" && "bg-primary/10 text-primary"
                  )}
                >
                  {icon}
                </div>
              )}

              {expandedContent && (
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    isExpanded && "rotate-180"
                  )}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expandable Content */}
      {expandedContent && isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-border/50 mt-2">
          <div className="pt-3">{expandedContent}</div>
        </div>
      )}
    </div>
  );
}
