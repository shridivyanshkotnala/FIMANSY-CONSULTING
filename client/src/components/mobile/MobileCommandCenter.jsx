import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileVitalCard } from "@/components/mobile/MobileVitalCard";
import { MobileActionCard } from "@/components/mobile/MobileActionCard";
import { MobileSkeletonCard } from "@/components/mobile/MobileSkeletonCard";
import { Button } from "@/components/ui/button";
import { differenceInDays } from "date-fns";
import {
  Zap,
  Wallet,
  TrendingDown,
  AlertTriangle,
  Link2,
  Package,
  Bell,
} from "lucide-react";

/*
===========================================================
DATA SOURCE NOTE (IMPORTANT)

Earlier:
Supabase was fetching:
- bank_transactions
- invoices
- inventory_items

Now:
This component expects BUSINESS DATA from global store (Redux later)

You will inject:
commandCenterData = {
  bankTransactions: [],
  invoices: [],
  inventoryItems: []
}

Replace MOCK_DATA with Redux selector later.
===========================================================
*/

// ---- TEMP MOCK (Replace with Redux selector later) ----
const MOCK_DATA = {
  bankTransactions: [],
  invoices: [],
  inventoryItems: [],
};

export function MobileCommandCenter() {
  const navigate = useNavigate();

  const [data, setData] = useState({
    liquidCash: 0,
    liquidCashDelta: 0,
    payablesGap: 0,
    receivablesOverdue: 0,
    overdueCount: 0,
    loading: true,
  });

  const [actions, setActions] = useState([]);
  const [actionsLoading, setActionsLoading] = useState(true);

  useEffect(() => {
    /*
    ===========================================================
    FINANCIAL INTELLIGENCE CALCULATIONS
    These formulas must NEVER be removed.
    Only data source changes (Redux/API later)
    ===========================================================
    */

    const transactions = MOCK_DATA.bankTransactions;
    const invoices = MOCK_DATA.invoices;
    const inventory = MOCK_DATA.inventoryItems;

    /* ---------------- Liquid Cash ---------------- */
    let liquidCash = 0;
    const latestWithBalance = transactions.find(t => t.balance);
    if (latestWithBalance) liquidCash = Number(latestWithBalance.balance);

    /* -------- Cash Delta vs last month ---------- */
    const lastMonthBalance = transactions.length > 30
      ? Number(transactions[transactions.length - 30]?.balance || 0)
      : 0;

    const liquidCashDelta =
      lastMonthBalance > 0
        ? ((liquidCash - lastMonthBalance) / lastMonthBalance) * 100
        : 0;

    /* -------- Upcoming 7-day Payables Gap -------- */
    const upcomingPayables = invoices
      .filter(i => i.type === "payable" && i.status === "pending")
      .reduce((sum, i) => sum + Number(i.amount || 0), 0);

    const expectedReceivables = invoices
      .filter(i => i.type === "receivable" && i.status === "pending")
      .reduce((sum, i) => sum + Number(i.amount || 0), 0);

    const payablesGap = expectedReceivables - upcomingPayables;

    /* -------- MSMED Overdue (45 days) -------- */
    const today = new Date();

    const overdueInvoices = invoices.filter(inv =>
      inv.dueDate && differenceInDays(today, new Date(inv.dueDate)) >= 45
    );

    const receivablesOverdue = overdueInvoices.reduce(
      (sum, inv) => sum + Number(inv.amount || 0),
      0
    );

    setData({
      liquidCash,
      liquidCashDelta,
      payablesGap,
      receivablesOverdue,
      overdueCount: overdueInvoices.length,
      loading: false,
    });

    /*
    ===========================================================
    ACTION ENGINE (Decision System)
    This is NOT UI — this is a recommendation engine.
    ===========================================================
    */

    const actionItems = [];

    // Unlinked transactions
    const unlinked = transactions.filter(t => t.reconciliation_status === "unmatched");
    if (unlinked.length > 0) {
      actionItems.push({
        id: "unlinked",
        severity: unlinked.length > 10 ? "critical" : "warning",
        icon: <Link2 className="h-5 w-5" />,
        message: `${unlinked.length} unlinked bank transactions`,
        actionLabel: "Link Now",
        actionPath: "/banking",
      });
    }

    // Low inventory
    const lowStock = inventory.filter(i => i.quantity <= i.reorder_level);
    if (lowStock.length > 0) {
      actionItems.push({
        id: "stock",
        severity: "warning",
        icon: <Package className="h-5 w-5" />,
        message: `${lowStock.length} items below safety stock`,
        actionLabel: "View",
        actionPath: "/inventory",
      });
    }

    // MSMED overdue
    if (overdueInvoices.length > 0) {
      actionItems.push({
        id: "msmed",
        severity: "critical",
        icon: <AlertTriangle className="h-5 w-5" />,
        message: `${overdueInvoices.length} invoices past 45-day limit`,
        actionLabel: "Send Reminder",
        actionPath: "/cash-intelligence",
      });
    }

    const severityOrder = { critical: 0, warning: 1, info: 2 };
    actionItems.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    setActions(actionItems);
    setActionsLoading(false);

  }, []);

  const formatCurrency = (amount) => {
    const abs = Math.abs(amount);
    if (abs >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (abs >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (abs >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
    return `₹${amount.toFixed(0)}`;
  };

  return (
    <MobileLayout title="Command Center">
      <div className="p-4 space-y-6">

        {/* Vital Signs */}
        <section className="space-y-3">
          {data.loading ? (
            <>
              <MobileSkeletonCard variant="stat" />
              <MobileSkeletonCard variant="stat" />
              <MobileSkeletonCard variant="stat" />
            </>
          ) : (
            <>
              <MobileVitalCard
                title="Liquid Cash"
                value={formatCurrency(data.liquidCash)}
                subtitle="Available bank balance"
                icon={<Wallet className="h-5 w-5" />}
                delta={data.liquidCashDelta}
                variant="neutral"
              />

              <MobileVitalCard
                title="7-Day Gap"
                value={`${data.payablesGap >= 0 ? "+" : ""}${formatCurrency(data.payablesGap)}`}
                subtitle="Receivables vs payables"
                icon={<TrendingDown className="h-5 w-5" />}
                variant={data.payablesGap >= 0 ? "success" : "danger"}
              />

              <MobileVitalCard
                title="Overdue"
                value={formatCurrency(data.receivablesOverdue)}
                subtitle={
                  data.overdueCount > 0
                    ? `${data.overdueCount} invoices past 45 days`
                    : "No overdue invoices"
                }
                icon={<AlertTriangle className="h-5 w-5" />}
                variant={
                  data.overdueCount === 0
                    ? "success"
                    : data.receivablesOverdue > 100000
                    ? "danger"
                    : "warning"
                }
              />
            </>
          )}
        </section>

        {/* CTA */}
        <Button
          size="lg"
          onClick={() => navigate("/cash-intelligence")}
          className="w-full h-14 text-base font-semibold shadow-lg"
        >
          <Zap className="h-5 w-5 mr-2" />
          What Should I Do Today?
        </Button>

        {/* Actions */}
        <section>
          {actionsLoading ? (
            <MobileSkeletonCard variant="action" />
          ) : actions.length === 0 ? (
            <div className="text-center py-8 bg-card rounded-xl border">
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
                <Bell className="h-6 w-6 text-success" />
              </div>
              <p className="font-medium">All caught up!</p>
            </div>
          ) : (
            actions.map(a => <MobileActionCard key={a.id} {...a} />)
          )}
        </section>

      </div>
    </MobileLayout>
  );
}
