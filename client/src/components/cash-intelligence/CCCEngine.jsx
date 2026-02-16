import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Package,
  FileText,
  Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

/**
 * CCCEngine
 *
 * PURE VISUALIZATION COMPONENT
 *
 * future redux:
 * const { months, current, fundingGap, trend } = useSelector(selectCCC)
 */

export function CCCEngine({
  months = [],
  current = null,
  fundingGap = 0,
  trend = 0,
  loading = false,
}) {

  const formatCurrency = (amount) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    return `₹${(amount / 1000).toFixed(0)}K`;
  };

  if (loading || !current) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-48 bg-muted rounded animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">

      {/* Formula Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Cash Conversion Cycle (CCC)
          </CardTitle>
          <CardDescription>
            Time required to convert operations into cash
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">

          {/* Visual Formula */}
          <div className="flex items-center justify-center gap-2 p-4 bg-muted/50 rounded-lg flex-wrap">

            <div className="flex flex-col items-center p-3 bg-card rounded-md border min-w-[100px]">
              <Package className="h-5 w-5 text-info mb-1" />
              <span className="text-2xl font-bold">{current?.inventoryDays}</span>
              <span className="text-xs text-muted-foreground">Inventory</span>
            </div>

            <span className="text-xl font-bold text-muted-foreground">+</span>

            <div className="flex flex-col items-center p-3 bg-card rounded-md border min-w-[100px]">
              <FileText className="h-5 w-5 text-warning mb-1" />
              <span className="text-2xl font-bold">{current?.receivableDays}</span>
              <span className="text-xs text-muted-foreground">Receivable</span>
            </div>

            <span className="text-xl font-bold text-muted-foreground">−</span>

            <div className="flex flex-col items-center p-3 bg-card rounded-md border min-w-[100px]">
              <Building2 className="h-5 w-5 text-success mb-1" />
              <span className="text-2xl font-bold">{current?.payableDays}</span>
              <span className="text-xs text-muted-foreground">Payable</span>
            </div>

            <span className="text-xl font-bold text-muted-foreground">=</span>

            <div className={cn(
              "flex flex-col items-center p-3 rounded-md border min-w-[100px]",
              (current?.ccc || 0) > 45
                ? "bg-destructive/10 border-destructive/20"
                : "bg-success/10 border-success/20"
            )}>
              <Clock className={cn(
                "h-5 w-5 mb-1",
                (current?.ccc || 0) > 45 ? "text-destructive" : "text-success"
              )} />
              <span className={cn(
                "text-2xl font-bold",
                (current?.ccc || 0) > 45 ? "text-destructive" : "text-success"
              )}>
                {current?.ccc}
              </span>
              <span className="text-xs text-muted-foreground">CCC Days</span>
            </div>

          </div>

          {/* Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={months}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value} days`, "CCC"]} />
                <ReferenceLine y={45} stroke="hsl(var(--destructive))" strokeDasharray="5 5" />
                <Line type="monotone" dataKey="ccc" stroke="hsl(var(--primary))" strokeWidth={2}/>
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Trend */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              {trend > 0 ? (
                <TrendingUp className="h-5 w-5 text-destructive" />
              ) : (
                <TrendingDown className="h-5 w-5 text-success" />
              )}
              <span className="text-sm">
                CCC {trend > 0 ? "increased" : "decreased"} by {Math.abs(trend)} days
              </span>
            </div>
            <Badge variant={trend > 0 ? "destructive" : "outline"}>
              {trend > 0 ? "Monitor" : "Improving"}
            </Badge>
          </div>

        </CardContent>
      </Card>

      {/* Funding Gap Alert */}
      {fundingGap > 0 && (current?.ccc || 0) > 45 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Working Capital Gap</AlertTitle>
          <AlertDescription>
            Estimated capital locked: <strong>{formatCurrency(fundingGap)}</strong>
          </AlertDescription>
        </Alert>
      )}

    </div>
  );
}
