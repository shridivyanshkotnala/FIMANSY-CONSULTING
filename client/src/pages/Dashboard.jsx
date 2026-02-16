import { useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentInvoices } from "@/components/dashboard/RecentInvoices";
import { ExpenseChart } from "@/components/dashboard/ExpenseChart";
import { CategoryBreakdown } from "@/components/dashboard/CategoryBreakdown";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  IndianRupee,
  TrendingDown,
  TrendingUp,
  Upload
} from "lucide-react";

/*
  PURE PRESENTATION PAGE

  Receives raw invoices
  Calculates stats locally
  No backend / auth dependency
*/

export default function Dashboard({ invoices = [], loading = false }) {

  const navigate = useNavigate();

  // ---------- BUSINESS CALCULATIONS ----------
  const stats = useMemo(() => {

    if (!invoices.length) {
      return {
        totalInvoices: 0,
        totalExpenses: 0,
        totalRevenue: 0,
        totalAssets: 0,
        totalLiabilities: 0,
        pendingInvoices: 0,
      };
    }

    const expenses = invoices.filter(i => i.document_category === "expense" || !i.document_category);
    const revenue = invoices.filter(i => i.document_category === "revenue");
    const assets = invoices.filter(i => i.document_category === "asset");
    const liabilities = invoices.filter(i => i.document_category === "liability");

    return {
      totalInvoices: invoices.length,
      totalExpenses: expenses.reduce((s, i) => s + Number(i.total_with_gst || 0), 0),
      totalRevenue: revenue.reduce((s, i) => s + Number(i.total_with_gst || 0), 0),
      totalAssets: assets.reduce((s, i) => s + Number(i.total_with_gst || 0), 0),
      totalLiabilities: liabilities.reduce((s, i) => s + Number(i.total_with_gst || 0), 0),
      pendingInvoices: invoices.filter(i => i.status === "pending").length,
    };

  }, [invoices]);

  // ---------- FORMAT ----------
  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <AppLayout
      title="Dashboard"
      actions={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate("/upload?type=bank_statement")}>
            <FileText className="h-4 w-4 mr-2" />
            Upload Bank Statement
          </Button>
          <Button size="sm" onClick={() => navigate("/upload")}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Invoice
          </Button>
        </div>
      }
    >
      <div className="space-y-6">

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Documents"
            value={stats.totalInvoices}
            description={`${stats.pendingInvoices} pending review`}
            icon={<FileText className="h-4 w-4" />}
            loading={loading}
          />

          <StatCard
            title="Total Expenses"
            value={formatCurrency(stats.totalExpenses)}
            description="Purchase invoices"
            icon={<TrendingDown className="h-4 w-4" />}
            loading={loading}
          />

          <StatCard
            title="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            description="Sales invoices"
            icon={<TrendingUp className="h-4 w-4" />}
            loading={loading}
          />

          <StatCard
            title="Net Position"
            value={formatCurrency(stats.totalRevenue - stats.totalExpenses)}
            description={`Assets: ${formatCurrency(stats.totalAssets)} | Liabilities: ${formatCurrency(stats.totalLiabilities)}`}
            icon={<IndianRupee className="h-4 w-4" />}
            loading={loading}
          />
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          <ExpenseChart invoices={invoices}/>
          <CategoryBreakdown invoices={invoices}/>
        </div>

        {/* Recent Activity */}
        <RecentInvoices invoices={invoices}/>

      </div>
    </AppLayout>
  );
}
