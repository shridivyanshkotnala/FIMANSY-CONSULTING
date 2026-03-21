import { useNavigate } from "react-router-dom";
import { PillarLayout } from "@/components/layout/PillarLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

import { LockedCashPanel } from "@/components/cash-intelligence/LockedCashPanel";
import { AgingAlertsPanel } from "@/components/cash-intelligence/AgingAlertsPanel";
import { DSOTracker } from "@/components/cash-intelligence/DSOTracker";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
  TrendingUp,
  AlertTriangle,
  ArrowLeft,
  AlertCircle,
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

  const navigate = useNavigate();
  // const { data, isLoading, isFetching, error, refetch } = useGetAgingQuery();
  const data = null;
  const error = null;
  const isLoading = false;
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

        </div>


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
        <div className="grid gap-4 grid-cols-1">
          <LockedCashPanel />
        </div>


        {/* ================= Intelligence Modules ================= */}
        <Tabs defaultValue="alerts" className="space-y-6">

          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">

            <TabsTrigger value="alerts" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Alerts</span>
            </TabsTrigger>

            <TabsTrigger value="dso" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">DSO</span>
            </TabsTrigger>

          </TabsList>


          {/* Panels own their own data logic */}
          <TabsContent value="alerts" className="space-y-6">
            <AgingAlertsPanel agingData={data} loading={isLoading} />          
          </TabsContent>

          <TabsContent value="dso" className="space-y-6">
            <DSOTracker />
          </TabsContent>

        </Tabs>

      </div>

    </PillarLayout>
  );
}
