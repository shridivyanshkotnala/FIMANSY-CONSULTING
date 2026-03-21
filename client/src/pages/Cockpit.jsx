import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PillarLayout } from "@/components/layout/PillarLayout";
import { PulseTile } from "@/components/cockpit/PulseTile";
import { BookConsultantModal } from "@/components/command-center/BookConsultantModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { MobileCommandCenter } from "@/components/mobile/MobileCommandCenter";
import { Card, CardContent } from "@/components/ui/card";

import {
  TrendingUp,
  CreditCard,
  Shield,
  Zap,
  CalendarClock,
  Building2,
  CalendarRange,
  IndianRupee
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
  const { organization } = useAuth();

  const [mockData] = useState({
    cashBalance: 245000,
    cashStatus: "green",
    lockedCash: 245000,
    overdueInvoices46Plus: 2,
    creditAmount: 310000,
    debitAmount: 198000,
    creditCount: 18,
    debitCount: 11,
    reconciledStatus: "amber",
    complianceDue: 4,
    complianceStatus: "red",
    nextDueDate: new Date().toISOString(),
    complianceItems: [
      { id: "cmp-1", dueDate: "2026-01-20", status: "pending" },
      { id: "cmp-2", dueDate: "2026-03-12", status: "pending" },
      { id: "cmp-3", dueDate: "2026-03-28", status: "pending" },
      { id: "cmp-4", dueDate: "2026-02-07", status: "pending" },
      { id: "cmp-5", dueDate: "2026-02-18", status: "filed" },
    ],
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

  const getFinancialYear = (date) => {
    const month = date.getMonth();
    const year = date.getFullYear();
    const startYear = month >= 3 ? year : year - 1;
    const endYearShort = String(startYear + 1).slice(-2);
    return `FY ${startYear}-${endYearShort}`;
  };

  const getCurrentQuarter = (date) => {
    const month = date.getMonth();
    const year = date.getFullYear();

    if (month >= 3 && month <= 5) {
      return {
        label: "Q1",
        period: `Apr–Jun ${year}`,
        start: new Date(year, 3, 1),
        end: new Date(year, 5, 30, 23, 59, 59, 999),
      };
    }
    if (month >= 6 && month <= 8) {
      return {
        label: "Q2",
        period: `Jul–Sep ${year}`,
        start: new Date(year, 6, 1),
        end: new Date(year, 8, 30, 23, 59, 59, 999),
      };
    }
    if (month >= 9 && month <= 11) {
      return {
        label: "Q3",
        period: `Oct–Dec ${year}`,
        start: new Date(year, 9, 1),
        end: new Date(year, 11, 31, 23, 59, 59, 999),
      };
    }

    return {
      label: "Q4",
      period: `Jan–Mar ${year}`,
      start: new Date(year, 0, 1),
      end: new Date(year, 2, 31, 23, 59, 59, 999),
    };
  };

  const now = new Date();
  const fyLabel = getFinancialYear(now);
  const quarter = getCurrentQuarter(now);
  const organizationName = organization?.organization_name || organization?.name || "Your Organization";
  const netCashDelta = mockData.creditAmount - mockData.debitAmount;

  const compliancePending = mockData.complianceItems.filter((item) => item.status === "pending");
  const overdueCompliances = compliancePending.filter((item) => new Date(item.dueDate) < now).length;
  const pendingThisMonth = compliancePending.filter((item) => {
    const due = new Date(item.dueDate);
    return due.getFullYear() === now.getFullYear() && due.getMonth() === now.getMonth();
  }).length;
  const pendingThisQuarter = compliancePending.filter((item) => {
    const due = new Date(item.dueDate);
    return due >= quarter.start && due <= quarter.end;
  }).length;

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

        <Card className="border-primary/30 bg-gradient-to-r from-primary/10 via-background to-warning/10">
          <CardContent className="p-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/15">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Organization</p>
                  <p className="text-lg font-semibold leading-tight">{organizationName}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-warning/15">
                  <IndianRupee className="h-4 w-4 text-warning" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Current Financial Year</p>
                  <p className="text-lg font-semibold leading-tight">{fyLabel}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-success/15">
                  <CalendarRange className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Current Quarter</p>
                  <p className="text-lg font-semibold leading-tight">{quarter.label} • {quarter.period}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pulse Tiles */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

          <PulseTile
            id="cashflow"
            title="Cash Flow"
            icon={TrendingUp}
            value={formatCurrency(mockData.lockedCash)}
            status={agingData?.health?.status || mockData.cashStatus}
            subtitle="Locked cash from overdue receivables"
            details={[
              { label: "46+ days invoice alerts", value: `${mockData.overdueInvoices46Plus} invoices` },
              { label: "Immediate action needed", value: mockData.overdueInvoices46Plus > 0 ? "Yes" : "No" },
            ]}
            actionLabel="View Cash Flow"
            onDrillDown={() => navigate("/cash-intelligence")}
          />

          <PulseTile id="banking" title="Banking" icon={CreditCard}
            value={formatCurrency(netCashDelta)}
            status={mockData.reconciledStatus}
            subtitle="Net cash (credits - debits)"
            details={[
              { label: "Total credits", value: `${formatCurrency(mockData.creditAmount)} (${mockData.creditCount})` },
              { label: "Total debits", value: `${formatCurrency(mockData.debitAmount)} (${mockData.debitCount})` },
            ]}
            actionLabel="Reconcile Now"
            onDrillDown={() => navigate("/banking")}
          />

          <PulseTile id="compliance" title="Compliance" icon={Shield}
            value={overdueCompliances}
            status={mockData.complianceStatus}
            subtitle="Overdue compliances pending till date"
            details={[
              { label: "Pending this month", value: pendingThisMonth },
              { label: `Pending in ${quarter.label}`, value: pendingThisQuarter },
            ]}
            actionLabel="View Filings"
            onDrillDown={() => navigate("/compliance")}
          />
        </div>
      </div>

      <BookConsultantModal open={bookingModalOpen} onOpenChange={setBookingModalOpen} />
    </PillarLayout>
  );
}
