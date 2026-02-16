import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
// ❌ removed supabase
// import { supabase } from "@/integrations/supabase/client";

// ⚠️ AUTH CONTEXT
// Still needed only to know which org to request data for later via Redux/API
import { useAuth } from "@/hooks/useAuth";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { TrendingUp, TrendingDown } from "lucide-react";

/**
 * CashFlowChart
 *
 * PURPOSE:
 * Visualizes cash movement trend over time.
 *
 * IMPORTANT ARCHITECTURE NOTE:
 * This component DOES calculate financial aggregation.
 * But it MUST NOT fetch database directly.
 *
 * Later:
 * Redux/API provides:
 *   invoices[]
 *   bankTransactions[]
 *
 * This component derives:
 *   moneyIn
 *   moneyOut
 *   net
 *   trend
 */

export function CashFlowChart() {
  const { organization } = useAuth();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalIn: 0, totalOut: 0, trend: 0 });

  useEffect(() => {
    if (!organization?.id) return;

    /**
     * TODO (Redux/API Integration Later)
     *
     * Replace this mock with:
     * dispatch(fetchCashflowData(organization.id))
     *
     * Expected shape:
     * {
     *   invoices: [],
     *   transactions: []
     * }
     */

    const mockInvoices = [];
    const mockTransactions = [];

    const monthlyData = [];
    const today = new Date();

    // --- BUSINESS LOGIC PRESERVED ---
    for (let i = 3; i >= 0; i--) {
      const monthDate = subMonths(today, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      let moneyIn = 0;
      let moneyOut = 0;

      // invoices aggregation
      mockInvoices.forEach((inv) => {
        const invDate = new Date(inv.date_of_issue);
        if (invDate >= monthStart && invDate <= monthEnd) {
          if (inv.document_category === "revenue") {
            moneyIn += Number(inv.total_with_gst);
          } else {
            moneyOut += Number(inv.total_with_gst);
          }
        }
      });

      // bank transaction aggregation
      mockTransactions.forEach((tx) => {
        const txDate = new Date(tx.transaction_date);
        if (txDate >= monthStart && txDate <= monthEnd) {
          moneyIn += Number(tx.credit_amount || 0);
          moneyOut += Number(tx.debit_amount || 0);
        }
      });

      monthlyData.push({
        month: format(monthDate, "MMM yyyy"),
        moneyIn,
        moneyOut,
        net: moneyIn - moneyOut,
      });
    }

    setData(monthlyData);

    // ---- SUMMARY CALCULATION (KEEP) ----
    const totalIn = monthlyData.reduce((sum, m) => sum + m.moneyIn, 0);
    const totalOut = monthlyData.reduce((sum, m) => sum + m.moneyOut, 0);

    const lastMonth = monthlyData[monthlyData.length - 1]?.net || 0;
    const prevMonth = monthlyData[monthlyData.length - 2]?.net || 0;
    const trend =
      prevMonth !== 0 ? ((lastMonth - prevMonth) / Math.abs(prevMonth)) * 100 : 0;

    setSummary({ totalIn, totalOut, trend });
    setLoading(false);
  }, [organization?.id]);

  const formatCurrency = (value) => {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
    return `₹${value.toFixed(0)}`;
  };

  const formatTooltipValue = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Cash Flow Trend</CardTitle>
            <CardDescription>
              Money in vs money out over the last 4 months
            </CardDescription>
          </div>

          {/* Summary Metrics */}
          <div className="flex items-center gap-4 text-sm">
            <div className="text-right">
              <p className="text-muted-foreground">Total In</p>
              <p className="font-semibold text-success">
                {formatCurrency(summary.totalIn)}
              </p>
            </div>

            <div className="text-right">
              <p className="text-muted-foreground">Total Out</p>
              <p className="font-semibold text-destructive">
                {formatCurrency(summary.totalOut)}
              </p>
            </div>

            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted">
              {summary.trend >= 0 ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span className={summary.trend >= 0 ? "text-success" : "text-destructive"}>
                {Math.abs(summary.trend).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />

              <Tooltip
                formatter={(value, name) => [
                  formatTooltipValue(value),
                  name === "moneyIn" ? "Money In" : "Money Out",
                ]}
              />

              <Legend formatter={(v) => (v === "moneyIn" ? "Money In" : "Money Out")} />

              <Bar dataKey="moneyIn" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="moneyOut" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
