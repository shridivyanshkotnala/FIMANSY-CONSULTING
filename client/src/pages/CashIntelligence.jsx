import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PillarLayout } from "@/components/layout/PillarLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

import { LockedCashPanel } from "@/components/cash-intelligence/LockedCashPanel";
import { CashBurnPanel } from "@/components/cash-intelligence/CashBurnPanel";
import { BankPositionPanel } from "@/components/cash-intelligence/BankPositionPanel";
import { GapIndicatorPanel } from "@/components/cash-intelligence/GapIndicatorPanel";
import { CCCEngine } from "@/components/cash-intelligence/CCCEngine";
import { WeeklyReviewMode } from "@/components/cash-intelligence/WeeklyReviewMode";
import { AgingAlertsPanel } from "@/components/cash-intelligence/AgingAlertsPanel";
import { DSOTracker } from "@/components/cash-intelligence/DSOTracker";
import { TReDSSuggestions } from "@/components/cash-intelligence/TReDSSuggestions";
import { VendorNegotiationSupport } from "@/components/cash-intelligence/VendorNegotiationSupport";
import { useGetAgingQuery } from "@/Redux/Slices/api/cashApi";
import { useGetZohoStatusQuery } from "@/Redux/Slices/api/zohoApi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
  TrendingUp,
  AlertTriangle,
  Calendar,
  BarChart3,
  FileText,
  Handshake,
  ArrowLeft,
  AlertCircle,
  Receipt,
  Users,
  Building2
} from "lucide-react";

/*
========================================================
Cash Intelligence Page (DESKTOP)

ROLE:
Pure orchestration screen.
It only arranges intelligence modules.

RULE:
NO API CALLS HERE
NO CALCULATIONS HERE
NO BUSINESS LOGIC HERE

Each panel owns its own data selector.

Future Architecture:
Redux Store → Panel Selectors → Panels → This Page (layout only)
========================================================
*/

export default function CashIntelligence() {

  const [showWeeklyReview, setShowWeeklyReview] = useState(false);
  const navigate = useNavigate();
  const { data, isLoading, isFetching, error, refetch } = useGetAgingQuery();
  const { data: zoho } = useGetZohoStatusQuery();
  
  return (
    <PillarLayout>

      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* ================= Header ================= */}
        <div className="flex items-center justify-between">

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>

              <div>
                <h1 className="text-2xl font-bold">Cash Intelligence</h1>
                <p className="text-muted-foreground">
                  Monitor and optimize your cash flow
                </p>
              </div>
            </div>
          </div>

          {/* Later: dispatch(openWeeklyReview()) */}
          <Button onClick={() => setShowWeeklyReview(true)} variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Weekly Review
          </Button>
        </div>


        {/* ================= Zoho Connection Check ================= */}
        {!zoho?.connected && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Zoho Books Not Connected</AlertTitle>
            <AlertDescription>
              Please connect your Zoho Books account from the sidebar to view cash intelligence data.
            </AlertDescription>
          </Alert>
        )}

        {/* ================= Error State ================= */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Data</AlertTitle>
            <AlertDescription>
              {error?.data?.message || error?.message || "Failed to load aging data. Please try again."}
            </AlertDescription>
          </Alert>
        )}

        {/* ================= Core Snapshot Panels =================
           These are quick health indicators — should be selector driven
           Example later:
           <LockedCashPanel data={useSelector(selectLockedCash)} />
        ========================================================== */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <LockedCashPanel
            summary={data?.summary ? (() => {
              const b030 = (data.summary.current || 0) + (data.summary.days_1_30 || 0);
              const b3145 = data.summary.days_31_60 || 0;
              const b45plus = (data.summary.days_61_90 || 0) + (data.summary.days_90_plus || 0);
              return {
                totalLocked: data.summary.totalOutstanding || (b030 + b3145 + b45plus),
                atRiskCount: (data.priorityCustomers || []).filter(c => c.invoices?.some(i => i.daysOutstanding > 45)).length,
                buckets: { "0-30": b030, "31-45": b3145, "45+": b45plus },
              };
            })() : null}
            loading={isLoading}
          />
          <CashBurnPanel
            totalBurn={data?.cashBurn?.total || 0}
            categories={(data?.cashBurn?.breakdown || []).filter(b => b.amount > 0).map(b => {
              const iconMap = {
                gst: <Receipt className="h-3.5 w-3.5" />,
                tds: <FileText className="h-3.5 w-3.5" />,
                payroll: <Users className="h-3.5 w-3.5" />,
                vendors: <Building2 className="h-3.5 w-3.5" />,
              };
              return {
                label: b.label,
                amount: b.amount,
                priority: b.amount > 50000 ? "high" : b.amount > 10000 ? "medium" : "low",
                dueDate: b.dueDate || null,
                icon: iconMap[b.type] || null,
              };
            })}
            loading={isLoading}
          />
          <BankPositionPanel
            totalBalance={data?.bankPosition?.available || 0}
            accounts={(data?.bankPosition?.accounts ? [
              ...(data.bankPosition.accounts.hdfc_current ? [{ name: "HDFC Current", type: "current", balance: data.bankPosition.accounts.hdfc_current }] : []),
              ...(data.bankPosition.accounts.icici_current ? [{ name: "ICICI Current", type: "current", balance: data.bankPosition.accounts.icici_current }] : []),
              ...(data.bankPosition.accounts.cc_limit ? [{ name: "CC", type: "cc", limit: data.bankPosition.accounts.cc_limit, utilized: data.bankPosition.accounts.cc_utilized || 0 }] : []),
            ] : [])}
            lastSync={data?.lastUpdated || null}
            loading={isLoading}
          />
          <GapIndicatorPanel
            gapData={data?.gapIndicator ? {
              status: data.gapIndicator.status || "neutral",
              operatingCycle: data.gapIndicator.operatingCycle || 0,
              creditCycle: data.gapIndicator.creditCycle || 0,
              netGap: data.gapIndicator.netGap || 0,
              lockedCash: data.lockedCash?.total || 0,
              availableCash: data.bankPosition?.available || 0,
            } : null}
            loading={isLoading}
          />
        </div>


        {/* ================= Intelligence Modules ================= */}
        <Tabs defaultValue="analytics" className="space-y-6">

          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">

            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>

            <TabsTrigger value="alerts" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Alerts</span>
            </TabsTrigger>

            <TabsTrigger value="dso" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">DSO</span>
            </TabsTrigger>

            <TabsTrigger value="treds" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">TReDS</span>
            </TabsTrigger>

            <TabsTrigger value="negotiate" className="gap-2">
              <Handshake className="h-4 w-4" />
              <span className="hidden sm:inline">Negotiate</span>
            </TabsTrigger>

          </TabsList>


          {/* Panels own their own data logic */}
          <TabsContent value="analytics" className="space-y-6">
            <CCCEngine
              current={data?.gapIndicator ? {
                inventoryDays: 0,
                receivableDays: data.gapIndicator.operatingCycle || 0,
                payableDays: data.gapIndicator.creditCycle || 0,
                ccc: data.gapIndicator.netGap || 0,
              } : null}
              fundingGap={data?.lockedCash?.total || 0}
              trend={0}
              loading={isLoading}
            />
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <AgingAlertsPanel agingData={data} loading={isLoading} />          
          </TabsContent>

          <TabsContent value="dso" className="space-y-6">
            <DSOTracker
              metrics={data?.summary ? {
                currentDSO: data.gapIndicator?.operatingCycle || 0,
                previousDSO: 0,
                trend: "neutral",
                atRiskRevenue: data.summary?.totalOutstanding || 0,
                inflationCost: 0,
                interestCost: 0,
              } : null}
              loading={isLoading}
            />
          </TabsContent>

          <TabsContent value="treds" className="space-y-6">
            <TReDSSuggestions />
          </TabsContent>

          <TabsContent value="negotiate" className="space-y-6">
            <VendorNegotiationSupport />
          </TabsContent>

        </Tabs>

      </div>


      {/* Weekly Review Modal
         Later controlled via Redux UI slice */}
      <WeeklyReviewMode
        open={showWeeklyReview}
        onOpenChange={setShowWeeklyReview}
      />

    </PillarLayout>
  );
}
