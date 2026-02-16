import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  AlertTriangle,
  TrendingUp,
  TrendingDown
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * FinancialKPICards
 *
 * IMPORTANT:
 * This component CONTAINS CORE ACCOUNTING FORMULAS.
 * We removed database fetching, but calculations stay.
 *
 * Redux later must supply RAW invoices dataset.
 *
 * REQUIRED REDUX DATA SHAPE:
 * invoices: [
 *   {
 *     document_category: "revenue" | "expense" | "liability"
 *     total_with_gst: number
 *     total_gst: number
 *     status: "pending" | "paid"
 *     date_of_issue: string
 *   }
 * ]
 */

export function FinancialKPICards() {
  const { organization } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState({
    totalReceivables: 0,
    totalPayables: 0,
    estimatedGSTLiability: 0,
    estimatedTDSLiability: 0,
    receivablesChange: 0,
    payablesChange: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization?.id) return;

    /**
     * 🔴 REDUX INTEGRATION POINT
     *
     * Replace with:
     * const invoices = useSelector(selectInvoices)
     */
    const invoices = window.__MOCK_INVOICES__ || [];

    if (!invoices.length) {
      setLoading(false);
      return;
    }

    // -------------------------------
    // CORE FINANCIAL CALCULATIONS
    // -------------------------------

    // Receivables = unpaid revenue
    const receivables = invoices
      .filter(inv => inv.document_category === "revenue" && inv.status === "pending")
      .reduce((sum, inv) => sum + Number(inv.total_with_gst), 0);

    // Payables = unpaid expenses/liabilities
    const payables = invoices
      .filter(inv =>
        (inv.document_category === "expense" || inv.document_category === "liability") &&
        inv.status === "pending"
      )
      .reduce((sum, inv) => sum + Number(inv.total_with_gst), 0);

    // Current month GST calculation
    const now = new Date();
    const currentMonthInvoices = invoices.filter(inv => {
      const d = new Date(inv.date_of_issue);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const outputGST = currentMonthInvoices
      .filter(inv => inv.document_category === "revenue")
      .reduce((sum, inv) => sum + Number(inv.total_gst || 0), 0);

    const inputGST = currentMonthInvoices
      .filter(inv => inv.document_category === "expense" || inv.document_category === "liability")
      .reduce((sum, inv) => sum + Number(inv.total_gst || 0), 0);

    // GST payable formula
    const gstLiability = Math.max(0, outputGST - inputGST);

    // TDS estimation formula (kept intentionally)
    const tdsLiability = payables * 0.1;

    setData({
      totalReceivables: receivables,
      totalPayables: payables,
      estimatedGSTLiability: gstLiability,
      estimatedTDSLiability: tdsLiability,

      // trend placeholders (Redux analytics later)
      receivablesChange: 0,
      payablesChange: 0,
    });

    setLoading(false);

  }, [organization?.id]);

  const formatCurrency = (amount) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount.toFixed(0)}`;
  };

  const kpiCards = [
    {
      title: "Total Receivables",
      value: data.totalReceivables,
      icon: ArrowDownLeft,
      color: "text-success",
      bgColor: "bg-success/10",
      trend: data.receivablesChange,
      description: "Unpaid sales invoices",
      onClick: () => navigate("/documents?filter=receivables"),
    },
    {
      title: "Total Payables",
      value: data.totalPayables,
      icon: ArrowUpRight,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      trend: data.payablesChange,
      description: "Unpaid purchase invoices",
      onClick: () => navigate("/documents?filter=payables"),
    },
    {
      title: "GST Liability",
      value: data.estimatedGSTLiability,
      icon: Wallet,
      color: "text-warning",
      bgColor: "bg-warning/10",
      description: "Estimated for this month",
      onClick: () => navigate("/documents?filter=gst"),
    },
    {
      title: "TDS Liability",
      value: data.estimatedTDSLiability,
      icon: AlertTriangle,
      color: "text-info",
      bgColor: "bg-info/10",
      description: "Estimated TDS payable",
      onClick: () => navigate("/documents?filter=tds"),
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpiCards.map((kpi) => (
        <Card
          key={kpi.title}
          className="cursor-pointer transition-all hover:shadow-card-hover hover:scale-[1.02]"
          onClick={kpi.onClick}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </span>
              <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", kpi.bgColor)}>
                <kpi.icon className={cn("h-5 w-5", kpi.color)} />
              </div>
            </div>

            <p className="text-2xl font-bold tracking-tight">
              {formatCurrency(kpi.value)}
            </p>

            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              {kpi.trend !== undefined && (
                <span className={cn(kpi.trend >= 0 ? "text-success" : "text-destructive")}>
                  {kpi.trend >= 0 ? <TrendingUp className="h-3 w-3 inline" /> : <TrendingDown className="h-3 w-3 inline" />}
                  {Math.abs(kpi.trend)}%
                </span>
              )}
              {kpi.description}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
