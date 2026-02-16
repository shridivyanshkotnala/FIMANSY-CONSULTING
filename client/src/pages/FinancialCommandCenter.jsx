// FinancialCommandCenter.jsx
// Converted from TSX → JSX
// Purpose: Main financial dashboard aggregating analytics widgets (KPI, cashflow, compliance, receivables, MSME tracking)

import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinancialKPICards } from "@/components/command-center/FinancialKPICards";
import { ReceivablesMonitor } from "@/components/command-center/ReceivablesMonitor";
import { MSMEPayablesTracker } from "@/components/command-center/MSMEPayablesTracker";
import { CashFlowChart } from "@/components/command-center/CashFlowChart";
import { ComplianceCalendar } from "@/components/command-center/ComplianceCalendar";
import { ShareWithCAModal } from "@/components/command-center/ShareWithCAModal";
import { Share2 } from "lucide-react";

/*
REDUX INTEGRATION PLACEHOLDER
---------------------------------
Future global financial state should live in a Redux slice like:
financialDashboardSlice:
 - kpiData
 - receivables
 - payables (MSME 43B(h))
 - complianceEvents
 - cashflowSeries

Currently child components probably fetch data internally (API/Context/Supabase).
Later they should read from Redux selectors instead.
*/

export default function FinancialCommandCenter() {
  // Local UI state only (modal visibility)
  // This should NOT go to Redux — UI transient state
  const [showShareModal, setShowShareModal] = useState(false);

  return (
    <AppLayout
      title="Financial Command Center"
      actions={
        <Button onClick={() => setShowShareModal(true)} variant="outline">
          <Share2 className="h-4 w-4 mr-2" />
          Share with CA
        </Button>
      }
    >
      <div className="space-y-6">
        {/* KPI summary cards (revenue, gst, profit etc) */}
        {/* FUTURE: Should read from Redux selector: selectFinancialKPIs */}
        <FinancialKPICards />

        {/* Tabbed analytical views */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="msme">MSME 43B(h)</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Cashflow visualization */}
            {/* FUTURE REDUX SOURCE: selectCashflowSeries */}
            <CashFlowChart />
            
            {/* Outstanding customer payments */}
            {/* FUTURE REDUX SOURCE: selectReceivables */}
            <ReceivablesMonitor />
          </TabsContent>

          <TabsContent value="msme" className="space-y-6">
            {/* MSME delayed payments tracker */}
            {/* FUTURE REDUX SOURCE: selectMSMEPayables */}
            <MSMEPayablesTracker />
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            {/* Filing & statutory calendar */}
            {/* FUTURE REDUX SOURCE: selectComplianceEvents */}
            <ComplianceCalendar />
          </TabsContent>
        </Tabs>
      </div>

      {/* Share data with Chartered Accountant */}
      {/* Later this modal should dispatch Redux action like: generateShareReport() */}
      <ShareWithCAModal open={showShareModal} onOpenChange={setShowShareModal} />
    </AppLayout>
  );
}
