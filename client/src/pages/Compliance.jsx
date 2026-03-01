// React core
import { useState } from "react";

// Router navigation
import { useNavigate } from "react-router-dom";

// Layout Wrapper
import { PillarLayout } from "@/components/layout/PillarLayout";

// UI Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ContextualHelp } from "@/components/ui/contextual-help";
import { EmptyState } from "@/components/ui/empty-state";

// ⚠️ CONTEXT API — MARKED FOR REMOVAL
// 🔄 FUTURE: Replace with Redux RTK Query selectors
// const { complianceProfile, obligations, directors, loading } = useSelector(state => state.compliance)
import { useCompliance } from "@/hooks/useCompliance";

// Compliance Components
import { ComplianceSetupForm } from "@/components/compliance/ComplianceSetupForm";
import { ComplianceSummaryHeader } from "@/components/compliance/ComplianceSummaryHeader";
import { ComplianceStatusCards } from "@/components/compliance/ComplianceStatusCards";
import { FixedScheduleTab } from "@/components/compliance/FixedScheduleTab";
import { ConditionalCompliancesTab } from "@/components/compliance/ConditionalCompliancesTab";
import { DirectorManagement } from "@/components/compliance/DirectorManagement";
import { ComplianceTracking } from "@/components/compliance/ComplianceTracking";

// Icons
import {
  Settings,
  Calendar,
  Users,
  Building2,
  Loader2,
  ArrowLeft,
  Shield,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";

/*
  ==========================================================
  Compliance Page
  ----------------------------------------------------------
  Handles:
  - Compliance setup
  - Profile summary
  - Obligations tracking
  - Directors management
  - Filing calendar
  ==========================================================
*/

export default function Compliance() {

  // ⚠️ CURRENT: Context-based data source
  // 🔄 FUTURE: Replace with Redux selectors
  // Example:
  // const complianceProfile = useSelector(state => state.compliance.profile)
  // const obligations = useSelector(state => state.compliance.obligations)
  // const directors = useSelector(state => state.compliance.directors)
  // const loading = useSelector(state => state.compliance.loading)

  const { complianceProfile, obligations, directors, loading, addDirector } = useCompliance();

  // Local UI state
  const [showSetup, setShowSetup] = useState(false);

  // Navigation handler
  const navigate = useNavigate();

  // Determine if company profile is missing
  const needsSetup = !loading && !complianceProfile;

  /*
    ==========================================================
    LOADING STATE
    ==========================================================
  */
  if (loading) {
    return (
      <PillarLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PillarLayout>
    );
  }

  /*
    ==========================================================
    EMPTY STATE — When compliance profile is not configured
    ==========================================================
  */
  if (needsSetup && !showSetup) {
    return (
      <PillarLayout>
        <div className="p-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-6">

            {/* Back Button */}
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>

            {/* Header Section */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Compliance & GST</h1>
                <p className="text-muted-foreground">
                  MCA, ROC, Income Tax & GST obligations
                </p>
              </div>
            </div>
          </div>

          {/* Setup Prompt */}
          <EmptyState
            icon={Building2}
            title="Set Up Compliance Tracking"
            description="Configure your company details to enable automated ROC, MCA, and Income Tax compliance tracking."
            actionLabel="Set Up Now"
            onAction={() => setShowSetup(true)}
          />
        </div>
      </PillarLayout>
    );
  }

  /*
    ==========================================================
    SETUP FORM VIEW
    ==========================================================
  */
  if (showSetup || needsSetup) {
    return (
      <PillarLayout>
        <div className="p-6 max-w-3xl mx-auto">

          <div className="flex items-center gap-3 mb-6">

            {/* Conditional Back Logic */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                complianceProfile
                  ? setShowSetup(false)
                  : navigate("/")
              }
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <h1 className="text-2xl font-bold">Compliance Setup</h1>
          </div>

          {/* Setup Form */}
          <ComplianceSetupForm
            onComplete={() => setShowSetup(false)}
          />
        </div>
      </PillarLayout>
    );
  }

  /*
    ==========================================================
    MAIN COMPLIANCE DASHBOARD
    ==========================================================
  */
  return (
    <PillarLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* ================= HEADER ================= */}
        <div className="flex items-center justify-between">

          <div className="flex items-center gap-3">

            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Compliance & GST</h1>
                <p className="text-muted-foreground">
                  MCA, ROC, Income Tax & GST obligations
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">

            {/* Settings Button */}
            <Button
              variant="outline"
              onClick={() => setShowSetup(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>

            <ContextualHelp
              content="Track MCA filings, DSC expiry, GST reconciliation, and advance tax obligations."
            />
          </div>
        </div>

        {/* ================= SUMMARY HEADER ================= */}
        <ComplianceSummaryHeader
          profile={complianceProfile}
          directors={directors}
        />

        {/* ================= STATUS CARDS ================= */}
        <ComplianceStatusCards
          obligations={obligations}
        />

        {/* ================= TABS ================= */}
        <Tabs defaultValue="fixed" className="space-y-6">

          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">

            <TabsTrigger value="fixed" className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Calendar</span>
            </TabsTrigger>

            <TabsTrigger value="conditional" className="flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Conditional</span>
            </TabsTrigger>

            <TabsTrigger value="tracking" className="flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Tracking</span>
            </TabsTrigger>

            <TabsTrigger value="directors" className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Directors</span>
            </TabsTrigger>

          </TabsList>

          <TabsContent value="fixed">
            <FixedScheduleTab />
          </TabsContent>

          <TabsContent value="conditional">
            <ConditionalCompliancesTab />
          </TabsContent>

          <TabsContent value="tracking">
            <ComplianceTracking />
          </TabsContent>

          <TabsContent value="directors">
            <DirectorManagement
              directors={directors}
              loading={loading}
              onAddDirector={addDirector}
            />
          </TabsContent>

        </Tabs>
      </div>
    </PillarLayout>
  );
}