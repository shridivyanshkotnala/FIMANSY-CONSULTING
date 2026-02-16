import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Percent,
  Calendar,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

/**
 * DSOTracker
 *
 * Visualization only.
 *
 * future redux:
 * const { months, metrics } = useSelector(selectDSO)
 */

export function DSOTracker({
  months = [],
  metrics = null,
  loading = false,
}) {

  const formatCurrency = (amount) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
    return `₹${amount?.toFixed?.(0) || 0}`;
  };

  if (loading || !metrics) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-48 bg-muted rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const isDSOCritical = (metrics?.currentDSO || 0) > 45;

  return (
    <div className="space-y-6">

      {/* Alert */}
      {isDSOCritical && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Collection Risk</AlertTitle>
          <AlertDescription>
            DSO is {metrics?.currentDSO} days — collection cycle is unhealthy.
          </AlertDescription>
        </Alert>
      )}

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-4">

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Current DSO</p>
            <p className={cn("text-3xl font-bold", isDSOCritical && "text-destructive")}>
              {metrics?.currentDSO} <span className="text-lg font-normal">days</span>
            </p>
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              {metrics?.trend === "up" ? <TrendingUp className="h-4 w-4 text-destructive"/> :
               metrics?.trend === "down" ? <TrendingDown className="h-4 w-4 text-success"/> : null}
              vs {metrics?.previousDSO} last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">At-Risk Revenue</p>
            <p className="text-2xl font-bold">{formatCurrency(metrics?.atRiskRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-2">Receivables exposure</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Inflation Impact</p>
            <p className="text-2xl font-bold text-destructive">
              -{formatCurrency(metrics?.inflationCost)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Delayed collection cost</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Financing Cost</p>
            <p className="text-2xl font-bold text-destructive">
              -{formatCurrency(metrics?.interestCost)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Working capital interest</p>
          </CardContent>
        </Card>

      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            DSO Trend
          </CardTitle>
          <CardDescription>Lower is healthier</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={months}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value} days`, "DSO"]}/>
                <ReferenceLine y={45} stroke="hsl(var(--destructive))" strokeDasharray="5 5"/>
                <ReferenceLine y={30} stroke="hsl(var(--success))" strokeDasharray="5 5"/>
                <Area type="monotone" dataKey="dso" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.2)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Benchmark */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-info" />
            Benchmark
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm">
              <span>Your DSO</span>
              <span>{metrics?.currentDSO} days</span>
            </div>
            <Progress value={Math.min(metrics?.currentDSO || 0, 90)/90*100}/>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="p-3 rounded-lg bg-success/10 border border-success/20">
              <p className="text-sm font-medium text-success">Excellent</p>
              <p className="text-2xl font-bold">&lt;30</p>
            </div>
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-sm font-medium text-warning">Acceptable</p>
              <p className="text-2xl font-bold">30-45</p>
            </div>
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm font-medium text-destructive">Critical</p>
              <p className="text-2xl font-bold">&gt;45</p>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
