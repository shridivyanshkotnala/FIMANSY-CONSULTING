// React core
import { useState, useEffect } from "react";

// Router navigation
import { useNavigate } from "react-router-dom";

// Layout Wrapper
import { PillarLayout } from "@/components/layout/PillarLayout";

// UI Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ContextualHelp } from "@/components/ui/contextual-help";
import { EmptyState } from "@/components/ui/empty-state";

// Hooks
import { useCompliance } from "@/hooks/useCompliance";
import { useTickets } from "@/hooks/useTickets";

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
  CheckCircle2,
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

  const {
    complianceProfile,
    obligations,
    directors,
    loading,
    error,
    addDirector,
    refetch
  } = useCompliance();

  const { tickets } = useTickets();

  // Local UI state
  const [showSetup, setShowSetup] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Navigation handler
  const navigate = useNavigate();

  // Filter directors specific to this profile
  const profileDirectors = (directors || []).filter(
    (d) => d.profile_id === complianceProfile?._id
  );

  /*
  ----------------------------------------------------------
  Ticket status key to trigger tab rerender
  ----------------------------------------------------------
  */
  const ticketStatusKey = tickets
    ?.map((t) => `${t._id}-${t.status}`)
    .join("-") || "no-tickets";

  /*
  ----------------------------------------------------------
  Detect data ready
  ----------------------------------------------------------
  */

  useEffect(() => {
    // Stop the temporary generation loader once refetch settles,
    // even if zero obligations are returned.
    if (isGenerating && !loading) {
      setIsGenerating(false);
    }
  }, [isGenerating, loading]);

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
  GENERATING STATE
  ==========================================================
  */

  if (isGenerating) {
    return (
      <PillarLayout>
        <div className="flex items-center justify-center h-64 flex-col gap-4">

          <Loader2 className="h-12 w-12 animate-spin text-primary" />

          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">
              Generating Compliance Obligations
            </h2>

            <p className="text-muted-foreground max-w-md">
              Please wait while we analyze your company profile and generate
              all applicable ROC, MCA, and Income Tax compliance requirements.
            </p>

            <p className="text-sm text-muted-foreground mt-4">
              This usually takes just a few seconds...
            </p>
          </div>

        </div>
      </PillarLayout>
    );
  }

  if (!loading && error) {
    return (
      <PillarLayout>
        <div className="flex items-center justify-center h-64 flex-col gap-4">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <div className="text-center">
            <h2 className="text-xl font-semibold">Failed to load compliance data</h2>
            <p className="text-muted-foreground mt-2">
              Please retry. If this keeps happening, check backend auth/session.
            </p>
          </div>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </PillarLayout>
    );
  }

  /*
  ==========================================================
  EMPTY STATE
  ==========================================================
  */

  if (needsSetup && !showSetup) {
    return (
      <PillarLayout>
        <div className="p-6 max-w-7xl mx-auto">

          <div className="flex items-center gap-3 mb-6">

            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
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

            <h1 className="text-2xl font-bold">
              Compliance Setup
            </h1>

          </div>

          <ComplianceSetupForm
            onComplete={() => {
              setShowSetup(false);
              setIsGenerating(true);
              refetch();
            }}
          />

        </div>
      </PillarLayout>
    );
  }

  /*
  ==========================================================
  MAIN DASHBOARD
  ==========================================================
  */

  return (
    <PillarLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* HEADER */}

        <div className="flex items-center justify-between">

          <div className="flex items-center gap-3">

            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-3">

              <div className="p-2 rounded-xl bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>

              <div>
                <h1 className="text-2xl font-bold">
                  Compliance & GST
                </h1>

                <p className="text-muted-foreground">
                  MCA, ROC, Income Tax & GST obligations
                </p>

                {obligations.length > 0 && (
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {obligations.length} obligations tracked
                  </p>
                )}

              </div>

            </div>

          </div>

          <div className="flex items-center gap-3">

            <Button variant="outline" onClick={() => setShowSetup(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>

            <ContextualHelp
              content="Track MCA filings, DSC expiry, GST reconciliation, and advance tax obligations."
            />

          </div>

        </div>

        {/* SUMMARY */}

        <ComplianceSummaryHeader
          profile={complianceProfile}
          directors={profileDirectors}
        />

        <ComplianceStatusCards obligations={obligations} />

        {/* ================= TABS ================= */}

        <Tabs
          defaultValue="fixed"
          className="space-y-6"
          key={`${obligations.length}-${tickets.length}-${ticketStatusKey}`}
        >

          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">

            <TabsTrigger value="fixed">
              <Calendar className="h-4 w-4 mr-1" />
              Calendar
            </TabsTrigger>

            <TabsTrigger value="conditional">
              <AlertTriangle className="h-4 w-4 mr-1" />
              Conditional
            </TabsTrigger>

            <TabsTrigger value="tracking">
              <ClipboardList className="h-4 w-4 mr-1" />
              Tracking
            </TabsTrigger>

            <TabsTrigger value="directors">
              <Users className="h-4 w-4 mr-1" />
              Directors
            </TabsTrigger>

          </TabsList>

          <TabsContent value="fixed">
            <FixedScheduleTab key={`fixed-${obligations.length}-${ticketStatusKey}`} />
          </TabsContent>

          <TabsContent value="conditional">
            <ConditionalCompliancesTab key={`conditional-${obligations.length}-${ticketStatusKey}`} />
          </TabsContent>

          <TabsContent value="tracking">
            <ComplianceTracking key={`tracking-${ticketStatusKey}`} />
          </TabsContent>

          <TabsContent value="directors">
            <DirectorManagement
              key={`directors-${profileDirectors.length}`}
              directors={profileDirectors}
              loading={loading}
              onAddDirector={addDirector}
            />
          </TabsContent>

        </Tabs>

      </div>
    </PillarLayout>
  );
}