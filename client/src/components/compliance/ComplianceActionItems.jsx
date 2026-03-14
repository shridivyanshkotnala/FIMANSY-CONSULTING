import { useEffect, useState } from "react";

/*
  ⚠️ SUPABASE REMOVED — COMMENTED OUT (DO NOT DELETE)
  🔄 FUTURE: Replace with Redux RTK Query endpoints
  import { supabase } from "@/integrations/supabase/client";
*/

// ⚠️ CONTEXT API SHIM — MARKED FOR REMOVAL
// 🔄 FUTURE: Replace with Redux selectors
import { useAuth } from "@/hooks/useAuth";

// ⚠️ CONTEXT API — useCompliance replaces direct Supabase calls
// 🔄 FUTURE: Replace with Redux RTK Query endpoint
import { useCompliance } from "@/hooks/useCompliance";

import {
  getDaysUntilDue,
  getCompliancePriority,
  getDscStatus,
  getCurrentFinancialYear,
  generateAdvanceTaxSchedule,
} from "@/lib/compliance/utils";

import { startOfDay, format } from "date-fns";

import {
  FileText,
  Shield,
  Calculator,
  AlertTriangle,
  Building2,
} from "lucide-react";

/*
  This hook generates actionable compliance alerts
  based on:
  - Pending filings
  - DSC expiry
  - Advance tax shortfall
  - Event-based filings
  - MCA status
*/

export function useComplianceActions() {
  const { organization } = useAuth();

  // ⚠️ CONTEXT API — useCompliance replaces direct Supabase calls
  // 🔄 FUTURE: Replace with Redux RTK Query selectors
  const {
    obligations,
    directors,
    advanceTax,
    events,
    complianceProfile,
    loading: complianceLoading,
  } = useCompliance();

  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization?.id) {
      setLoading(false);
      return;
    }

    if (complianceLoading) {
      setLoading(true);
      return;
    }

    const buildActions = () => {
      const actionItems = [];
      const today = startOfDay(new Date());

      /*
        ⚠️ SUPABASE REMOVED — ALL DIRECT QUERIES BELOW ARE COMMENTED OUT
        🔄 FUTURE: Replace with Redux RTK Query endpoints
        Data is now sourced from useCompliance() hook instead.
      */

      /* ===============================
         1️⃣ Pending / Overdue Filings
         (was: supabase.from("compliance_obligations")...)
      =============================== */
      if (obligations && obligations.length > 0) {
        const pendingObs = obligations.filter(
          (ob) =>
            ob.status === "not_started" ||
            ob.status === "in_progress" ||
            ob.status === "overdue"
        );

        pendingObs.forEach((ob) => {
          const daysRemaining = getDaysUntilDue(ob.due_date);
          const { severity } = getCompliancePriority(ob.due_date);

          if (daysRemaining <= 60) {
            let message;
            let actionLabel;

            if (daysRemaining < 0) {
              message = `${ob.form_name} is overdue by ${Math.abs(daysRemaining)} days.`;
              actionLabel = "File Now";
            } else if (daysRemaining === 0) {
              message = `${ob.form_name} (${ob.form_description || "Filing"}) is due today!`;
              actionLabel = "File Now";
            } else if (daysRemaining <= 7) {
              message = `${ob.form_name} due in ${daysRemaining} days. Complete filing soon.`;
              actionLabel = "Start Filing";
            } else {
              message = `${ob.form_name} due in ${daysRemaining} days.`;
              actionLabel = "View Details";
            }

            actionItems.push({
              id: `ob-${ob._id || ob.id || ob.form_name || ob.due_date}`,
              type: "mca_filing",
              severity,
              icon: <FileText className="h-5 w-5" />,
              message,
              actionLabel,
              actionPath: "/compliance",
              dueDate: ob.due_date,
              daysRemaining,
            });
          }
        });
      }

      /* ===============================
         2️⃣ DSC Expiry
         (was: supabase.from("directors")...)
      =============================== */
      if (directors && directors.length > 0) {
        const activeDirectors = directors.filter(
          (d) => d.is_active && d.dsc_expiry_date
        );

        activeDirectors.forEach((dir) => {
          const status = getDscStatus(dir.dsc_expiry_date);

          if (status.status === "expired") {
            actionItems.push({
              id: `dsc-${dir._id || dir.id || dir.name}`,
              type: "dsc_expiry",
              severity: "critical",
              icon: <Shield className="h-5 w-5" />,
              message: `DSC for ${dir.name} has expired. Filings blocked.`,
              actionLabel: "Renew DSC",
              actionPath: "/compliance",
              daysRemaining: status.daysRemaining,
            });
          } else if (status.daysRemaining <= 30) {
            actionItems.push({
              id: `dsc-${dir._id || dir.id || dir.name}`,
              type: "dsc_expiry",
              severity: status.daysRemaining <= 7 ? "critical" : "warning",
              icon: <Shield className="h-5 w-5" />,
              message: `DSC for ${dir.name} expires in ${status.daysRemaining} days.`,
              actionLabel: status.daysRemaining <= 7 ? "Renew Now" : "Schedule Renewal",
              actionPath: "/compliance",
              daysRemaining: status.daysRemaining,
            });
          }
        });
      }

      /* ===============================
         3️⃣ Advance Tax Shortfall
         (was: supabase.from("advance_tax_calculations")...)
      =============================== */
      if (advanceTax && advanceTax.length > 0) {
        const today_str = format(today, "yyyy-MM-dd");

        advanceTax
          .filter((tax) => tax.due_date >= today_str)
          .slice(0, 4)
          .forEach((tax) => {
            const daysRemaining = getDaysUntilDue(tax.due_date);

            if (tax.shortfall > 0 && daysRemaining <= 30) {
              const severity =
                daysRemaining <= 7 ? "critical" : daysRemaining <= 15 ? "warning" : "info";

              const shortfallFormatted =
                tax.shortfall >= 100000
                  ? `₹${(tax.shortfall / 100000).toFixed(1)}L`
                  : `₹${tax.shortfall.toLocaleString("en-IN")}`;

              actionItems.push({
                id: `tax-${tax._id || tax.id || tax.quarter || tax.due_date}`,
                type: "advance_tax",
                severity,
                icon: <Calculator className="h-5 w-5" />,
                message: `Advance Tax Q${tax.quarter} short by ${shortfallFormatted} to avoid interest.`,
                actionLabel: "Pay Now",
                actionPath: "/compliance",
                secondaryLabel: "See Calculation",
                secondaryPath: "/compliance",
                dueDate: tax.due_date,
                daysRemaining,
              });
            }
          });
      }

      /* ===============================
         4️⃣ Event Filings
         (was: supabase.from("compliance_events")...)
      =============================== */
      if (events && events.length > 0) {
        events
          .filter((evt) => !evt.is_acknowledged)
          .forEach((evt) => {
            const daysRemaining = getDaysUntilDue(evt.filing_deadline);

            const severity =
              daysRemaining < 0
                ? "critical"
                : daysRemaining <= 7
                ? "critical"
                : "warning";

            actionItems.push({
              id: `evt-${evt._id || evt.id || evt.event_type || evt.filing_deadline}`,
              type: "event_filing",
              severity,
              icon: <AlertTriangle className="h-5 w-5" />,
              message: `${evt.event_description || evt.event_type} detected. ${evt.required_form} filing required.`,
              actionLabel: daysRemaining < 0 ? "File Immediately" : "Start Filing",
              actionPath: "/compliance",
              dueDate: evt.filing_deadline,
              daysRemaining,
            });
          });
      }

      /* ===============================
         5️⃣ MCA Status
         (was: supabase.from("company_compliance_profiles")...)
      =============================== */
      if (complianceProfile && complianceProfile.mca_status !== "active") {
        actionItems.push({
          id: "mca-status",
          type: "mca_status",
          severity: "critical",
          icon: <Building2 className="h-5 w-5" />,
          message: `Company status: ${complianceProfile.mca_status}. Immediate attention required.`,
          actionLabel: "Check Status",
          actionPath: "/compliance",
        });
      }

      /* ===============================
         Sort by severity → days
      =============================== */
      const severityOrder = { critical: 0, warning: 1, info: 2 };

      actionItems.sort((a, b) => {
        const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
        if (severityDiff !== 0) return severityDiff;
        return (a.daysRemaining ?? 999) - (b.daysRemaining ?? 999);
      });

      setActions(actionItems);
      setLoading(false);
    };

    buildActions();
  }, [organization?.id, complianceLoading, obligations, directors, advanceTax, events, complianceProfile]);

  return { actions, loading };
}