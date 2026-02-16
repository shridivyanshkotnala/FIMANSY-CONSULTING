import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid
} from "recharts";

import { addDays, format, startOfDay } from "date-fns";
import { TrendingUp, Info } from "lucide-react";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

/*
  CashRunwayChart

  CURRENT:
    Simulated projection (no backend)

  FUTURE:
    Replace generator with Redux selector:
      state.cashflow.projection
*/

export function CashRunwayChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = startOfDay(new Date());

    // starting balance
    let balance = 250000;
    let runningBalance = balance;
    const projections = [];

    for (let i = 0; i <= 30; i++) {
      const currentDate = addDays(today, i);

      // simulate random business inflows/outflows
      const inflow = Math.random() > 0.6 ? Math.floor(Math.random() * 80000) : 0;
      const outflow = Math.random() > 0.5 ? Math.floor(Math.random() * 60000) : 0;

      runningBalance = runningBalance + inflow - outflow;

      projections.push({
        date: format(currentDate, "MMM dd"),
        inflow,
        outflow,
        balance: runningBalance,
      });
    }

    setTimeout(() => {
      setData(projections);
      setLoading(false);
    }, 400);
  }, []);

  const formatCurrency = (value) => {
    const absValue = Math.abs(value);
    if (absValue >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (absValue >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (absValue >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
    return `₹${value.toFixed(0)}`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const inflow = payload.find(p => p.dataKey === "inflow")?.value || 0;
      const outflow = payload.find(p => p.dataKey === "outflow")?.value || 0;
      const balance = payload.find(p => p.dataKey === "balance")?.value || 0;

      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium mb-2">{label}</p>
          <p className="text-sm"><span className="text-info">Inflow:</span> <b>{formatCurrency(inflow)}</b></p>
          <p className="text-sm"><span className="text-destructive">Outflow:</span> <b>{formatCurrency(outflow)}</b></p>
          <p className="text-sm mt-1 pt-1 border-t border-border">
            <span className="text-muted-foreground">Balance:</span> <b>{formatCurrency(balance)}</b>
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Cash Runway – Next 30 Days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const minBalance = Math.min(...data.map(d => d.balance));
  const hasNegativeProjection = minBalance < 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Cash Runway – Next 30 Days
          </CardTitle>

          <HoverCard>
            <HoverCardTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground">
                <Info className="h-4 w-4" />
              </button>
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
              <p className="text-sm">
                Simulated projection. Will later use real invoices & payments.
              </p>
            </HoverCardContent>
          </HoverCard>
        </div>

        {hasNegativeProjection && (
          <p className="text-xs text-destructive mt-1">
            ⚠️ Cash may go negative in projection.
          </p>
        )}
      </CardHeader>

      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={6} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={formatCurrency} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />

              <Area type="monotone" dataKey="inflow" stroke="hsl(var(--info))" fillOpacity={0.2} />
              <Area type="monotone" dataKey="outflow" stroke="hsl(var(--destructive))" fillOpacity={0.2} />
              <Area type="monotone" dataKey="balance" stroke="hsl(var(--primary))" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
