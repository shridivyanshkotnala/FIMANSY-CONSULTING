import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PillarLayout } from "@/components/layout/PillarLayout";
import { PulseTile } from "@/components/cockpit/PulseTile";
import { BookConsultantModal } from "@/components/command-center/BookConsultantModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileCommandCenter } from "@/components/mobile/MobileCommandCenter";

import {
  TrendingUp,
  CreditCard,
  Shield,
  Zap,
  CalendarClock
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

/*
  Cockpit (Command Centre Dashboard)

  Current version: Frontend-only mock data
  Backend removed intentionally.

  Later:
  Replace mock data with Redux query -> fetchCockpitData()
*/

export default function Cockpit() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [mockData] = useState({
    cashBalance: 245000,
    cashStatus: "green",
    cashGap: 32000,
    unreconciled: 3,
    reconciledStatus: "amber",
    complianceDue: 1,
    complianceStatus: "red",
    nextDueDate: new Date().toISOString(),
    loading: false,
  });

  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  // const { data: agingData } = useGetAgingQuery();
  const agingData = null; // Placeholder until API integration
  if (isMobile) return <MobileCommandCenter />;

  const formatCurrency = (amount) => {
    const absAmount = Math.abs(amount);
    if (absAmount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (absAmount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (absAmount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
    return `₹${amount.toFixed(0)}`;
  };

  return (
    <PillarLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Command Centre</h1>
              <p className="text-muted-foreground">Your daily operating console</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setBookingModalOpen(true)} className="gap-2">
              <CalendarClock className="h-4 w-4" />
              Book a Consultant
            </Button>
            <Badge variant="outline" className="text-sm">
              {format(new Date(), "EEEE, dd MMM")}
            </Badge>
          </div>
        </div>

        {/* Pulse Tiles */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

          <PulseTile
            id="cashflow"
            title="Cash Flow"
            icon={TrendingUp}
            value={agingData ? formatCurrency(agingData.summary.totalOutstanding) : formatCurrency(mockData.cashBalance)}
            status={agingData?.health?.status || mockData.cashStatus}
            subtitle={agingData ? `Expected: ${formatCurrency(agingData.expectedInflow.thisMonth)}` : `Gap: ${formatCurrency(mockData.cashGap)}`}
            actionLabel="View Cash Flow"
            onDrillDown={() => navigate("/cash-intelligence")}
          />

          <PulseTile id="banking" title="Banking" icon={CreditCard}
            value={mockData.unreconciled}
            status={mockData.reconciledStatus}
            subtitle="Unreconciled transactions"
            actionLabel="Reconcile Now"
            onDrillDown={() => navigate("/banking")}
          />

          <PulseTile id="compliance" title="Compliance" icon={Shield}
            value={mockData.complianceDue}
            status={mockData.complianceStatus}
            subtitle={mockData.nextDueDate ? `Next: ${format(new Date(mockData.nextDueDate), "dd MMM")}` : "All filed"}
            actionLabel="View Filings"
            onDrillDown={() => navigate("/compliance")}
          />
        </div>
      </div>

      <BookConsultantModal open={bookingModalOpen} onOpenChange={setBookingModalOpen} />
    </PillarLayout>
  );
}
