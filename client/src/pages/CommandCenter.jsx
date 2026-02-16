import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { VitalSignCard } from "@/components/command-center/VitalSignCard";
import { ActionFeed } from "@/components/command-center/ActionFeed";
import { CashRunwayChart } from "@/components/command-center/CashRunwayChart";
import { BookConsultantModal } from "@/components/command-center/BookConsultantModal";
import { Button } from "@/components/ui/button";
import { ContextualHelp } from "@/components/ui/contextual-help";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileCommandCenter } from "@/components/mobile/MobileCommandCenter";
import { Zap, ArrowRight, CalendarClock } from "lucide-react";

/**
 * CommandCenter
 *
 * This screen is the OPERATING DASHBOARD — not a calculator.
 * All financial numbers must come pre-computed from backend.
 *
 * future redux:
 * const data = useSelector(selectCommandCenterSummary)
 * dispatch(fetchCommandCenterSummary())
 */

export default function CommandCenter({
  summary = {
    liquidCash: 0,
    liquidCashDelta: 0,
    payablesGap: 0,
    receivablesOverdue: 0,
    overdueCount: 0,
    loading: true,
  }
}) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  // Mobile has its own container
  if (isMobile) {
    return <MobileCommandCenter />;
  }

  const handlePrimaryAction = () => {
    navigate("/cash-intelligence");
  };

  const formatCurrency = (amount) => {
    const abs = Math.abs(amount);
    if (abs >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (abs >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (abs >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
    return `₹${amount.toFixed(0)}`;
  };

  return (
    <AppLayout
      title="Command Center"
      description="Your daily operating console"
      actions={
        <ContextualHelp content="Daily priorities, financial risks and recommended actions." />
      }
    >
      <div className="max-w-6xl mx-auto space-y-8">

        {/* ===== Zone A: Vital Signs ===== */}
        <section>
          <div className="grid gap-6 md:grid-cols-3">
            <VitalSignCard
              title="Liquid Cash"
              value={formatCurrency(summary.liquidCash)}
              subtitle="Available bank balance"
              delta={summary.liquidCashDelta}
              loading={summary.loading}
              variant="neutral"
            />

            <VitalSignCard
              title="Payables Gap"
              value={`${summary.payablesGap >= 0 ? "+" : ""}${formatCurrency(summary.payablesGap)}`}
              subtitle="Net position for next 7 days"
              loading={summary.loading}
              variant={summary.payablesGap >= 0 ? "success" : "danger"}
            />

            <VitalSignCard
              title="Receivables Overdue"
              value={formatCurrency(summary.receivablesOverdue)}
              subtitle={
                summary.overdueCount > 0
                  ? `${summary.overdueCount} invoice${summary.overdueCount > 1 ? "s" : ""} beyond 45 days`
                  : "No overdue invoices"
              }
              loading={summary.loading}
              variant={
                summary.overdueCount === 0
                  ? "success"
                  : summary.receivablesOverdue > 100000
                  ? "danger"
                  : "warning"
              }
            />
          </div>
        </section>

        {/* ===== Hero Actions ===== */}
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Button
            size="lg"
            onClick={handlePrimaryAction}
            className="h-14 px-8 text-lg font-semibold shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-primary to-primary/90"
          >
            <Zap className="h-5 w-5 mr-2" />
            What Should I Do Today?
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={() => setBookingModalOpen(true)}
            className="h-14 px-6 text-lg font-semibold border-2 hover:bg-accent"
          >
            <CalendarClock className="h-5 w-5 mr-2" />
            Book a Consultant
          </Button>
        </div>

        {/* ===== Zone B + C ===== */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ActionFeed />
          <CashRunwayChart />
        </div>
      </div>

      <BookConsultantModal open={bookingModalOpen} onOpenChange={setBookingModalOpen} />
    </AppLayout>
  );
}
