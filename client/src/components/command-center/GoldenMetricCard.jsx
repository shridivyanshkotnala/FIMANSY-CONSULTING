import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * GoldenMetricCard
 *
 * Pure UI component.
 * Displays a highlighted top-level metric (the "hero number").
 *
 * Data must be provided by parent container (Redux / selectors / analytics engine).
 *
 * Example usage:
 * <GoldenMetricCard
 *    title="Cash Runway"
 *    value="72 days"
 *    subtitle="Based on current burn rate"
 *    variant="warning"
 * />
 */

export function GoldenMetricCard({
  title,
  value,
  subtitle,
  loading = false,
  variant = "neutral",
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return {
          border: "border-success/30",
          bg: "bg-success/5",
          valueColor: "text-success",
        };
      case "warning":
        return {
          border: "border-warning/30",
          bg: "bg-warning/5",
          valueColor: "text-warning",
        };
      case "danger":
        return {
          border: "border-destructive/30",
          bg: "bg-destructive/5",
          valueColor: "text-destructive",
        };
      default:
        return {
          border: "border-border",
          bg: "bg-card",
          valueColor: "text-foreground",
        };
    }
  };

  const styles = getVariantStyles();

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
        "border-2 transition-all hover:shadow-card-hover",
        styles.border,
        styles.bg
      )}
    >
      <CardContent className="pt-6 pb-6 text-center">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
          {title}
        </p>

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
