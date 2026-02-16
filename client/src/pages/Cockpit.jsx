import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PillarLayout } from "@/components/layout/PillarLayout";
import { PulseTile, DrillDownPanel } from "@/components/cockpit/PulseTile";
import { ComplianceHealthBanner } from "@/components/cockpit/ComplianceHealthBanner";
import { ActionFeed } from "@/components/command-center/ActionFeed";
import { CashRunwayChart } from "@/components/command-center/CashRunwayChart";
import { BookConsultantModal } from "@/components/command-center/BookConsultantModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileCommandCenter } from "@/components/mobile/MobileCommandCenter";

import {
  TrendingUp,
  CreditCard,
  Package,
  Shield,
  Receipt,
  Zap,
  Users,
  Eye,
  CalendarClock
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useGetAgingQuery } from "@/Redux/Slices/api/cashApi";

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
    lowStockItems: 2,
    inventoryStatus: "amber",
    complianceDue: 1,
    complianceStatus: "red",
    nextDueDate: new Date().toISOString(),
    gstDue: 18000,
    gstStatus: "amber",
    loading: false,
  });

  const [activeDrillDown, setActiveDrillDown] = useState(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const { data: agingData } = useGetAgingQuery();

  if (isMobile) return <MobileCommandCenter />;

  const formatCurrency = (amount) => {
    const absAmount = Math.abs(amount);
    if (absAmount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (absAmount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (absAmount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
    return `₹${amount.toFixed(0)}`;
  };

  const getComplianceHealth = () => {
    if (mockData.complianceStatus === "red") {
      return {
        status: "red",
        message: "Action Required",
        subMessage: `${mockData.complianceDue} compliance items need immediate attention`,
      };
    }
    if (mockData.complianceStatus === "amber") {
      return {
        status: "amber",
        message: "Upcoming Deadlines",
        subMessage: mockData.nextDueDate
          ? `Next due: ${format(new Date(mockData.nextDueDate), "dd MMM yyyy")}`
          : undefined,
      };
    }
    return { status: "green", message: "All Clear", subMessage: "No pending compliance items" };
  };

  const complianceHealth = getComplianceHealth();

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

        {/* Compliance Banner */}
        <ComplianceHealthBanner
          status={complianceHealth.status}
          message={complianceHealth.message}
          subMessage={complianceHealth.subMessage}
        />

        {/* Pulse Tiles */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">

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
            onDrillDown={() => setActiveDrillDown("banking")}
          />

          <PulseTile id="inventory" title="Inventory" icon={Package}
            value={mockData.lowStockItems}
            status={mockData.inventoryStatus}
            subtitle="Items below reorder level"
            actionLabel="View Stock"
            onDrillDown={() => setActiveDrillDown("inventory")}
          />

          <PulseTile id="compliance" title="Compliance" icon={Shield}
            value={mockData.complianceDue}
            status={mockData.complianceStatus}
            subtitle={mockData.nextDueDate ? `Next: ${format(new Date(mockData.nextDueDate), "dd MMM")}` : "All filed"}
            actionLabel="View Filings"
            onDrillDown={() => setActiveDrillDown("compliance")}
          />

          <PulseTile id="gst" title="GST / TDS" icon={Receipt}
            value={formatCurrency(mockData.gstDue)}
            status={mockData.gstStatus}
            subtitle="Next payment due"
            actionLabel="Pay Now"
            onDrillDown={() => setActiveDrillDown("gst")}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ActionFeed />
          <CashRunwayChart />
        </div>
      </div>

      <BookConsultantModal open={bookingModalOpen} onOpenChange={setBookingModalOpen} />
    </PillarLayout>
  );
}
