import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

/**
 * VitalSignCard
 *
 * Pure UI component.
 * Displays already-computed financial metric.
 *
 * IMPORTANT:
 * This component must NEVER calculate business logic.
 * Only renders values provided by parent container.
 */

export function VitalSignCard({
  title,
  value,
  subtitle,
  delta,
  loading = false,
  variant = "neutral",
}) {

  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return {
          border: "border-success/40",
          bg: "bg-gradient-to-br from-success/10 to-success/5",
          valueColor: "text-success",
          glow: "shadow-success/10",
        };
      case "warning":
        return {
          border: "border-warning/40",
          bg: "bg-gradient-to-br from-warning/10 to-warning/5",
          valueColor: "text-warning",
          glow: "shadow-warning/10",
        };
      case "danger":
        return {
          border: "border-destructive/40",
          bg: "bg-gradient-to-br from-destructive/10 to-destructive/5",
          valueColor: "text-destructive",
          glow: "shadow-destructive/10",
        };
      default:
        return {
          border: "border-border",
          bg: "bg-card",
          valueColor: "text-foreground",
          glow: "",
        };
    }
  };

  const styles = getVariantStyles();

  const getDeltaDisplay = () => {
    if (delta === undefined || delta === null || isNaN(delta)) return null;

    const isPositive = delta > 0;
    const isNeutral = delta === 0;

    return (
      <div
        className={cn(
          "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
          isPositive && "bg-success/10 text-success",
          isNeutral && "bg-muted text-muted-foreground",
          !isPositive && !isNeutral && "bg-destructive/10 text-destructive"
        )}
      >
        {isPositive ? (
          <TrendingUp className="h-3 w-3" />
        ) : isNeutral ? (
          <Minus className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )}
        <span>{isPositive ? "+" : ""}{delta.toFixed(1)}%</span>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className={cn("border-2", styles.border, styles.bg)}>
        <CardContent className="pt-6 pb-6 text-center">
          <Skeleton className="h-4 w-24 mx-auto mb-4" />
          <Skeleton className="h-12 w-32 mx-auto mb-3" />
          <Skeleton className="h-3 w-28 mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "border-2 transition-all hover:shadow-lg",
        styles.border,
        styles.bg,
        styles.glow && `shadow-lg ${styles.glow}`
      )}
    >
      <CardContent className="pt-6 pb-6">
        <div className="flex items-start justify-between mb-2">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          {getDeltaDisplay()}
        </div>

        <p
          className={cn(
            "text-4xl md:text-5xl font-bold font-heading tracking-tight mb-2",
            styles.valueColor
          )}
        >
          {value}
        </p>

        <p className="text-sm text-muted-foreground">
          {subtitle}
        </p>
      </CardContent>
    </Card>
  );
}
