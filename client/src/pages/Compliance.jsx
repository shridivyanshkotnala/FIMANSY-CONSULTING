import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PillarLayout } from "@/components/layout/PillarLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContextualHelp } from "@/components/ui/contextual-help";
import { EmptyState } from "@/components/ui/empty-state";

import { ComplianceSetupForm } from "@/components/compliance/ComplianceSetupForm";
import { DirectorManagement } from "@/components/compliance/DirectorManagement";
import { AdvanceTaxCalculator } from "@/components/compliance/AdvanceTaxCalculator";
import { ComplianceCalendar } from "@/components/compliance/ComplianceCalendarWidget";

import {
  Settings,
  Calendar,
  Calculator,
  Users,
  Building2,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Shield
} from "lucide-react";

/*
  Compliance Page
  ---------------
  Pure UI controller for statutory compliance module.

  IMPORTANT:
  Previously used `useCompliance()` hook (Supabase bound)
  Now expects Redux/API data later.

  Future Redux shape example:
  state.compliance = {
    profile,
    obligations,
    directors,
    loading
  }
*/

export default function Compliance() {
  const navigate = useNavigate();
  const [showSetup, setShowSetup] = useState(false);

  // TODO: Replace with Redux selectors later
  const loading = false;
  const complianceProfile = null;
  const obligations = [];
  const directors = [];

  const needsSetup = !loading && !complianceProfile;

  // Pending filings calculation (BUSINESS RULE — KEEP)
  const pendingFilings =
    obligations.filter(ob => ob.status !== "filed" && ob.status !== "not_applicable").length;

  // DSC expiry calculation (BUSINESS RULE — KEEP)
  const expiringDsc =
    directors.filter(dir => {
      if (!dir.dsc_expiry_date) return false;
      const daysLeft =
        Math.floor((new Date(dir.dsc_expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysLeft <= 30;
    }).length;

  // ---------------- LOADING ----------------
  if (loading) {
    return (
      <PillarLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PillarLayout>
    );
  }

  // ---------------- FIRST TIME SETUP ----------------
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
                <h1 className="text-2xl font-bold">Statutory Compliance</h1>
                <p className="text-muted-foreground">MCA, ROC & Income Tax obligations</p>
              </div>
            </div>
          </div>

          <EmptyState
            icon={Building2}
            title="Set Up Compliance Tracking"
            description="Configure company details to enable compliance tracking."
            actionLabel="Set Up Now"
            onAction={() => setShowSetup(true)}
          />
        </div>
      </PillarLayout>
    );
  }

  // ---------------- SETUP FORM ----------------
  if (showSetup || needsSetup) {
    return (
      <PillarLayout>
        <div className="p-6 max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Compliance Setup</h1>
          </div>

          <ComplianceSetupForm onComplete={() => setShowSetup(false)} />
        </div>
      </PillarLayout>
    );
  }

  // ---------------- MAIN DASHBOARD ----------------
  return (
    <PillarLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Header */}
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
                <h1 className="text-2xl font-bold">Statutory Compliance</h1>
                <p className="text-muted-foreground">MCA, ROC & Income Tax obligations</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {pendingFilings > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {pendingFilings} pending
              </Badge>
            )}

            <Button variant="outline" onClick={() => setShowSetup(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>

            <ContextualHelp content="Track filings, DSC expiry, and tax obligations." />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="calendar" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="calendar"><Calendar className="h-4 w-4 mr-2" />Calendar</TabsTrigger>
            <TabsTrigger value="directors"><Users className="h-4 w-4 mr-2" />Directors</TabsTrigger>
            <TabsTrigger value="tax"><Calculator className="h-4 w-4 mr-2" />Advance Tax</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar"><ComplianceCalendar /></TabsContent>
          <TabsContent value="directors"><DirectorManagement /></TabsContent>
          <TabsContent value="tax"><AdvanceTaxCalculator /></TabsContent>
        </Tabs>

      </div>
    </PillarLayout>
  );
}
