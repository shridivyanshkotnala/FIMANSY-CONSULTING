import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertTriangle, CheckCircle2, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * GapIndicatorPanel
 *
 * Pure visualization component.
 *
 * future redux:
 * const gapData = useSelector(selectWorkingCapitalGap)
 */

export function GapIndicatorPanel({ gapData = null, loading = false }) {

  const formatCurrency = (amount) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
    return `₹${amount?.toFixed?.(0) || 0}`;
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case "surplus":
        return {
          label: "Surplus",
          color: "text-success",
          bgColor: "bg-success/10",
          borderColor: "border-success/20",
          icon: <CheckCircle2 className="h-4 w-4" />,
          description: "Healthy working capital",
        };
      case "gap":
        return {
          label: "Funding Gap",
          color: "text-destructive",
          bgColor: "bg-destructive/10",
          borderColor: "border-destructive/20",
          icon: <AlertTriangle className="h-4 w-4" />,
          description: "Working capital stress",
        };
      default:
        return {
          label: "Neutral",
          color: "text-warning",
          bgColor: "bg-warning/10",
          borderColor: "border-warning/20",
          icon: <Minus className="h-4 w-4" />,
          description: "Monitor position",
        };
    }
  };

  if (loading || !gapData) {
    return (
      <Card className="col-span-1">
        <CardHeader className="pb-2">
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-8 w-20 mb-2 bg-muted rounded animate-pulse" />
          <div className="h-3 w-full bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const config = getStatusConfig(gapData.status);

  return (
    <Card className="col-span-1 transition-all hover:shadow-card-hover">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <div className={cn("p-1.5 rounded-md", config.bgColor)}>
            <Activity className={cn("h-4 w-4", config.color)} />
          </div>
          Gap Indicator
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">

        {/* Status */}
        <div className={cn("flex items-center gap-2 p-2 rounded-md border", config.bgColor, config.borderColor)}>
          <span className={config.color}>{config.icon}</span>
          <div className="flex-1">
            <span className={cn("font-semibold text-sm", config.color)}>
              {config.label}
            </span>
            <p className="text-[10px] text-muted-foreground">{config.description}</p>
          </div>
        </div>

        {/* Cycles */}
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Operating Cycle</span>
            <span className="font-medium">{gapData.operatingCycle} days</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Credit Cycle</span>
            <span className="font-medium">{gapData.creditCycle} days</span>
          </div>

          <div className="flex justify-between border-t pt-1.5">
            <span className={cn("font-medium", config.color)}>Net Gap</span>
            <span className={cn("font-bold", config.color)}>
              {gapData.netGap > 0 ? "+" : ""}{gapData.netGap} days
            </span>
          </div>
        </div>

        {/* Cash comparison */}
        <div className="text-[10px] text-muted-foreground pt-1 border-t">
          Virtual: {formatCurrency(gapData.lockedCash)} • Real: {formatCurrency(gapData.availableCash)}
        </div>

      </CardContent>
    </Card>
  );
}
