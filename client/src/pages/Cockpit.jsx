import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PillarLayout } from "@/components/layout/PillarLayout";
import { PulseTile } from "@/components/cockpit/PulseTile";
import { BookConsultantModal } from "@/components/command-center/BookConsultantModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { useCompliance } from "@/hooks/useCompliance";
import { useGetBankDashboardQuery } from "@/Redux/Slices/api/bankingApi";
import { useGetAgingBucketsQuery } from "@/Redux/Slices/api/cashIntelligenceApi";
import { MobileCommandCenter } from "@/components/mobile/MobileCommandCenter";
import { Card, CardContent } from "@/components/ui/card";

import {
  TrendingUp,
  CreditCard,
  Shield,
  Wallet,
  Zap,
  CalendarClock,
  Building2,
  CalendarRange,
  IndianRupee
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { endOfMonth, format, isBefore, isWithinInterval, startOfDay, startOfMonth } from "date-fns";

export default function Cockpit() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { organization } = useAuth();

  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  const { obligations = [], currentDate, loading: complianceLoading } = useCompliance();

  const { data: bankDashboardData, isFetching: bankingLoading } = useGetBankDashboardQuery(
    {
      transactionSort: "latest",
      page: 1,
      limit: 1,
    },
    {
      pollingInterval: 20000,
      refetchOnMountOrArgChange: true,
    }
  );

  const { data: agingRaw, isFetching: cashLoading } = useGetAgingBucketsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

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

  const now = new Date(currentDate || new Date());
  const fyLabel = getFinancialYear(now);
  const quarter = getCurrentQuarter(now);
  const organizationName = organization?.organization_name || organization?.name || "Your Organization";

  const bankingSummary = bankDashboardData?.data?.summary || {};
  const creditAmount = Number(bankingSummary.totalCredits || 0);
  const debitAmount = Number(bankingSummary.totalDebits || 0);
  const unreconciledCount = Number(bankingSummary.unreconciledCount || 0);
  const netCashDelta = creditAmount - debitAmount;
  const bankingStatus = netCashDelta < 0 ? "red" : unreconciledCount > 0 ? "amber" : "green";

  const bucketData = agingRaw?.data ?? agingRaw ?? {};
  const sumBucketAmount = (arr) =>
    Array.isArray(arr)
      ? arr.reduce((total, item) => total + Number(item?.balanceAmount || 0), 0)
      : 0;

  const lockedCashAmount =
    sumBucketAmount(bucketData.bucket_0_30) +
    sumBucketAmount(bucketData.bucket_30_45) +
    sumBucketAmount(bucketData.bucket_46_plus);

  const overdueInvoices46Plus = Array.isArray(bucketData.bucket_46_plus)
    ? bucketData.bucket_46_plus.length
    : 0;

  const atRiskInvoices =
    (Array.isArray(bucketData.bucket_30_45) ? bucketData.bucket_30_45.length : 0) + overdueInvoices46Plus;

  const cashStatus = overdueInvoices46Plus > 0 ? "red" : atRiskInvoices > 0 ? "amber" : "green";

  const pendingStatuses = new Set(["filed", "approved", "ignored", "not_applicable"]);
  const today = startOfDay(now);

  const complianceCounts = useMemo(() => {
    const pending = obligations.filter((ob) => !pendingStatuses.has(ob?.status));

    const overdue = pending.filter((ob) => {
      const dueDate = new Date(ob?.due_date);
      return !Number.isNaN(dueDate.getTime()) && isBefore(dueDate, today);
    }).length;

    const monthRange = { start: startOfMonth(today), end: endOfMonth(today) };
    const quarterRange = { start: quarter.start, end: quarter.end };

    const pendingThisMonth = pending.filter((ob) => {
      const dueDate = new Date(ob?.due_date);
      return !Number.isNaN(dueDate.getTime()) && isWithinInterval(dueDate, monthRange);
    }).length;

    const pendingThisQuarter = pending.filter((ob) => {
      const dueDate = new Date(ob?.due_date);
      return !Number.isNaN(dueDate.getTime()) && isWithinInterval(dueDate, quarterRange);
    }).length;

    return {
      overdue,
      pendingThisMonth,
      pendingThisQuarter,
    };
  }, [obligations, today, quarter.start, quarter.end]);

  const complianceStatus = complianceCounts.overdue > 0 ? "red" : complianceCounts.pendingThisQuarter > 0 ? "amber" : "green";

  // TODO: Replace with live payroll summary API when endpoint is finalized.
  const payrollSnapshot = {
    amount: 124000,
    status: "amber",
    employeesPayable: 14,
    nextRunInDays: 3,
  };

  return (
    <PillarLayout>
      <div className="mx-auto w-full max-w-[1380px] space-y-8 px-4 py-6 md:px-8">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Command Centre</h1>
              <p className="text-sm md:text-base text-muted-foreground">A clean view of your daily financial priorities</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm">
              {format(new Date(), "EEEE, dd MMM")}
            </Badge>
            <Button variant="outline" onClick={() => setBookingModalOpen(true)} className="gap-2">
              <CalendarClock className="h-4 w-4" />
              Book a Consultant
            </Button>
          </div>
        </div>

        <Card className="border-border/70 bg-gradient-to-r from-primary/5 via-background to-warning/5 shadow-sm">
          <CardContent className="p-5">
            <div className="grid gap-5 md:grid-cols-3">
              <div className="flex items-start gap-3 md:pr-4 md:border-r md:border-border/60">
                <div className="p-2 rounded-lg bg-primary/15">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Organization</p>
                  <p className="text-lg font-semibold leading-tight mt-0.5">{organizationName}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 md:px-2 md:border-r md:border-border/60">
                <div className="p-2 rounded-lg bg-warning/15">
                  <IndianRupee className="h-4 w-4 text-warning" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Current Financial Year</p>
                  <p className="text-lg font-semibold leading-tight mt-0.5">{fyLabel}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-success/15">
                  <CalendarRange className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Current Quarter</p>
                  <p className="text-lg font-semibold leading-tight mt-0.5">{quarter.label} • {quarter.period}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg md:text-xl font-semibold">Today’s priorities</h2>
            <p className="text-sm text-muted-foreground">Click a card to open the relevant workflow.</p>
          </div>
        </div>

        {/* Pulse Tiles */}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

          <PulseTile
            id="cashflow"
            title="Cash Flow"
            icon={TrendingUp}
            value={formatCurrency(lockedCashAmount)}
            status={cashStatus}
            subtitle="Locked cash from overdue receivables"
            details={[
              { label: "46+ days invoice alerts", value: `${overdueInvoices46Plus} invoices` },
              { label: "Immediate action needed", value: overdueInvoices46Plus > 0 ? "Yes" : "No" },
            ]}
            actionLabel="View Cash Flow"
            onDrillDown={() => navigate("/cash-intelligence")}
            loading={cashLoading}
          />

          <PulseTile id="banking" title="Banking" icon={CreditCard}
            value={formatCurrency(netCashDelta)}
            status={bankingStatus}
            subtitle="Net cash (credits - debits)"
            details={[
              { label: "Total credits", value: formatCurrency(creditAmount) },
              { label: "Total debits", value: formatCurrency(debitAmount) },
            ]}
            actionLabel="Reconcile Now"
            onDrillDown={() => navigate("/banking")}
            loading={bankingLoading}
          />

          <PulseTile id="compliance" title="Compliance" icon={Shield}
            value={complianceCounts.overdue}
            status={complianceStatus}
            subtitle="Overdue compliances pending till date"
            details={[
              { label: "Pending this month", value: complianceCounts.pendingThisMonth },
              { label: `Pending in ${quarter.label}`, value: complianceCounts.pendingThisQuarter },
            ]}
            actionLabel="View Filings"
            onDrillDown={() => navigate("/compliance")}
            loading={complianceLoading}
          />

          <PulseTile id="payroll" title="Payroll" icon={Wallet}
            value={formatCurrency(payrollSnapshot.amount)}
            status={payrollSnapshot.status}
            subtitle="Upcoming payroll outflow"
            details={[
              { label: "Employees payable", value: `${payrollSnapshot.employeesPayable}` },
              { label: "Next run", value: `${payrollSnapshot.nextRunInDays} days` },
            ]}
            actionLabel="Open Payroll"
            onDrillDown={() => navigate("/payroll")}
          />
        </div>
      </div>

      <BookConsultantModal open={bookingModalOpen} onOpenChange={setBookingModalOpen} />
    </PillarLayout>
  );
}
