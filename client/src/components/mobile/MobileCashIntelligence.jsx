import { useEffect, useState } from "react";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileVitalCard } from "@/components/mobile/MobileVitalCard";
import { MobileTimePeriodSwipe } from "@/components/mobile/MobileTimePeriodSwipe";
import { MobileSkeletonCard } from "@/components/mobile/MobileSkeletonCard";
import { useAuth } from "@/hooks/useAuth"; // ⚠️ TEMP — replace with Redux selector
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle
} from "lucide-react";

/*
========================================================
MobileCashIntelligence

Operational awareness dashboard (NOT ledger truth)

RULE:
This screen NEVER calculates accounting balance.
It only summarizes already-processed financial data.

Future Flow:
Redux → selectors → this screen → cards
========================================================
*/

export function MobileCashIntelligence() {

  /*
  TEMP AUTH SOURCE
  Replace later with:
  const organization = useSelector(selectOrganization)
  */
  const { organization } = useAuth();

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("week");

  /*
  This state will later come from Redux selector:
  const data = useSelector(selectCashInsights(period))
  */
  const [data, setData] = useState({
    cashIn: 0,
    cashOut: 0,
    netFlow: 0,
    pendingReceivables: 0,
    pendingPayables: 0,
  });

  useEffect(() => {
    if (!organization?.id) return;

    /*
    ========================================================
    REMOVE THIS BLOCK COMPLETELY WHEN API CONNECTS

    Replace with:
    dispatch(fetchCashInsights({ organizationId, period }))
    ========================================================
    */

    const mockFinancialData = () => {

      /*
      KEEP THESE FORMULAS — BUSINESS LOGIC
      Only DATA SOURCE changes later.
      */

      const receivables = [
        { total: 120000, status: "paid" },
        { total: 45000, status: "pending" },
        { total: 30000, status: "paid" },
      ];

      const payables = [
        { total: 70000, status: "paid" },
        { total: 25000, status: "pending" },
        { total: 15000, status: "paid" },
      ];

      const pendingReceivables =
        receivables.filter(r => r.status === "pending")
          .reduce((sum, r) => sum + r.total, 0);

      const pendingPayables =
        payables.filter(p => p.status === "pending")
          .reduce((sum, p) => sum + p.total, 0);

      const cashIn =
        receivables.filter(r => r.status !== "pending")
          .reduce((sum, r) => sum + r.total, 0);

      const cashOut =
        payables.filter(p => p.status !== "pending")
          .reduce((sum, p) => sum + p.total, 0);

      setData({
        cashIn,
        cashOut,
        netFlow: cashIn - cashOut,
        pendingReceivables,
        pendingPayables,
      });

      setLoading(false);
    };

    mockFinancialData();

  }, [organization?.id, period]);

  /*
  Compact mobile formatter
  Display only — not accounting precision
  */
  const formatCurrency = (amount) => {
    const absAmount = Math.abs(amount);
    if (absAmount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (absAmount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (absAmount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
    return `₹${amount.toFixed(0)}`;
  };

  return (
    <MobileLayout title="Cash Flow" showBack>
      <div className="p-4">

        <MobileTimePeriodSwipe
          periods={[
            { key: "today", label: "Today" },
            { key: "week", label: "This Week" },
            { key: "month", label: "This Month" },
          ]}
          defaultPeriod="week"

          /*
          Later:
          dispatch(setCashInsightPeriod(period))
          */
          onPeriodChange={setPeriod}
        >
          {() => (
            <div className="space-y-3">

              {loading ? (
                <>
                  <MobileSkeletonCard variant="stat" />
                  <MobileSkeletonCard variant="stat" />
                  <MobileSkeletonCard variant="stat" />
                </>
              ) : (
                <>
                  <MobileVitalCard
                    title="Cash In"
                    value={formatCurrency(data.cashIn)}
                    subtitle="Total received"
                    icon={<TrendingUp className="h-5 w-5" />}
                    variant="success"
                  />

                  <MobileVitalCard
                    title="Cash Out"
                    value={formatCurrency(data.cashOut)}
                    subtitle="Total paid"
                    icon={<TrendingDown className="h-5 w-5" />}
                    variant="danger"
                  />

                  <MobileVitalCard
                    title="Net Flow"
                    value={`${data.netFlow >= 0 ? "+" : ""}${formatCurrency(data.netFlow)}`}
                    subtitle="Cash in - Cash out"
                    icon={<Wallet className="h-5 w-5" />}
                    variant={data.netFlow >= 0 ? "success" : "danger"}
                  />
                </>
              )}

              {/* Pending Section */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                  Pending
                </h3>

                <div className="space-y-3">
                  <MobileVitalCard
                    title="Receivables"
                    value={formatCurrency(data.pendingReceivables)}
                    subtitle="Expected to receive"
                    icon={<Clock className="h-5 w-5" />}
                    variant="warning"
                  />

                  <MobileVitalCard
                    title="Payables"
                    value={formatCurrency(data.pendingPayables)}
                    subtitle="Expected to pay"
                    icon={<AlertTriangle className="h-5 w-5" />}
                    variant="warning"
                  />
                </div>
              </div>

            </div>
          )}
        </MobileTimePeriodSwipe>

      </div>
    </MobileLayout>
  );
}
