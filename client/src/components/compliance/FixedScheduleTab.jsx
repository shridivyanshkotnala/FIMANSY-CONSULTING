import { useMemo, useState } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { ComplianceFilingModal } from "./ComplianceFilingModal";
import { ComplianceCalendar } from "./ComplianceCalendarWidget";

import { useCompliance } from "@/hooks/useCompliance";
import {
  getCurrentFinancialYear,
  getDaysUntilDue,
} from "@/lib/compliance/utils";

import {
  format,
  isSameMonth,
  startOfDay,
  isWithinInterval,
  parseISO,
} from "date-fns";

import {
  Calendar,
  FileText,
  ChevronRight,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/* ================= Helpers ================= */

function getCurrentQuarterRange() {
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();

  if (month >= 3 && month <= 5)
    return { start: new Date(year, 3, 1), end: new Date(year, 5, 30), label: "Q1" };

  if (month >= 6 && month <= 8)
    return { start: new Date(year, 6, 1), end: new Date(year, 8, 30), label: "Q2" };

  if (month >= 9 && month <= 11)
    return { start: new Date(year, 9, 1), end: new Date(year, 11, 31), label: "Q3" };

  return { start: new Date(year, 0, 1), end: new Date(year, 2, 31), label: "Q4" };
}

/* ================= Component ================= */

export function FixedScheduleTab() {
  const { obligations, createObligation, loading } = useCompliance();
  const { toast } = useToast();

  const [filingModal, setFilingModal] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = startOfDay(new Date());
  const fy = getCurrentFinancialYear();

  // Debug: Log obligations from backend
  console.log("📊 Backend obligations:", obligations);
  console.log("📊 Total obligations from backend:", obligations.length);

  /* ================= Filter obligations by time periods ================= */

  const thisMonthObligations = useMemo(() => {
    return obligations.filter((ob) => {
      if (!ob.due_date) return false;
      const dueDate = parseISO(ob.due_date);
      return isSameMonth(dueDate, today);
    });
  }, [obligations, today]);

  const quarterRange = getCurrentQuarterRange();

  const thisQuarterObligations = useMemo(() => {
    return obligations.filter((ob) => {
      if (!ob.due_date) return false;
      const dueDate = parseISO(ob.due_date);
      return isWithinInterval(dueDate, quarterRange);
    });
  }, [obligations, quarterRange]);

  const thisFYObligations = useMemo(() => {
    return obligations.filter((ob) => ob.financial_year === fy);
  }, [obligations, fy]);

  /* ================= Group by category for better display ================= */

  const obligationsByCategory = useMemo(() => {
    const grouped = {};
    obligations.forEach((ob) => {
      const category = ob.compliance_category || ob.category_tag || "other";
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(ob);
    });
    return grouped;
  }, [obligations]);

  /* ================= Filing ================= */

  const handleFiling = async (data) => {
    if (!filingModal) return;

    setIsSubmitting(true);

    const result = await createObligation({
      compliance_category: filingModal.compliance_category || filingModal.primaryTag?.toLowerCase(),
      compliance_subtype: filingModal.compliance_subtype || filingModal.name,
      compliance_description: filingModal.compliance_description || filingModal.description,
      form_name: filingModal.form_name || filingModal.name,
      form_description: filingModal.form_description || filingModal.description,
      due_date: format(filingModal.dueDate, "yyyy-MM-dd"),
      status: "in_progress",
      financial_year: fy,
      notes: data.comment,
      priority: 3,
    });

    if (!result.error) {
      toast({
        title: "Filing initiated",
        description: `${filingModal.name} filing has been initiated.`,
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to initiate filing",
        variant: "destructive",
      });
    }

    setIsSubmitting(false);
    setFilingModal(null);
  };

  /* ================= Render Row ================= */

  const renderObligationRow = (obligation) => {
    const dueDate = parseISO(obligation.due_date);
    const daysUntil = getDaysUntilDue(obligation.due_date);
    const isOverdue = daysUntil < 0 && obligation.status !== "filed";
    const isFiled = obligation.status === "filed";

    // Get display name and description
    const displayName = obligation.form_name || obligation.compliance_subtype || "Unknown";
    const displayDescription = obligation.form_description || obligation.compliance_description || "";
    const category = obligation.compliance_category || obligation.category_tag || "Other";
    
    // Capitalize first letter for badge
    const categoryDisplay = category.charAt(0).toUpperCase() + category.slice(1);

    return (
      <div
        key={obligation._id}
        className={cn(
          "flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer",
          isOverdue &&
            "border-l-4 border-l-destructive bg-destructive/5",
          isFiled && "opacity-60"
        )}
        onClick={() => !isFiled && setFilingModal({
          ...obligation,
          name: displayName,
          description: displayDescription,
          primaryTag: categoryDisplay,
          dueDate: dueDate,
        })}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">
              {displayName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {displayDescription}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          <Badge variant="outline" className="text-xs">
            {categoryDisplay}
          </Badge>

          <div className="text-right min-w-[80px]">
            <p className="text-xs font-medium">
              {format(dueDate, "dd MMM")}
            </p>
            <p
              className={cn(
                "text-xs",
                isOverdue
                  ? "text-destructive"
                  : daysUntil <= 7 && !isFiled
                  ? "text-warning"
                  : "text-muted-foreground"
              )}
            >
              {isFiled
                ? "Filed ✓"
                : isOverdue
                ? `${Math.abs(daysUntil)}d overdue`
                : daysUntil === 0
                ? "Due today"
                : `${daysUntil}d left`}
            </p>
          </div>

          {!isFiled && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
    );
  };

  /* ================= Loading ================= */

  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  /* ================= UI ================= */

  return (
    <div className="space-y-6">

      <ComplianceCalendar />

      {/* Month */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            This Month's Filings
            <Badge variant="secondary" className="ml-auto">
              {thisMonthObligations.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {thisMonthObligations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No filings due this month
            </p>
          ) : (
            thisMonthObligations.map(renderObligationRow)
          )}
        </CardContent>
      </Card>

      {/* Quarter */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            This Quarter's Filings ({quarterRange.label})
            <Badge variant="secondary" className="ml-auto">
              {thisQuarterObligations.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {thisQuarterObligations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No filings due this quarter
            </p>
          ) : (
            thisQuarterObligations.map(renderObligationRow)
          )}
        </CardContent>
      </Card>

      {/* FY */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            This Financial Year (FY {fy})
            <Badge variant="secondary" className="ml-auto">
              {thisFYObligations.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
          {thisFYObligations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No filings for this financial year
            </p>
          ) : (
            thisFYObligations.map(renderObligationRow)
          )}
        </CardContent>
      </Card>

      <ComplianceFilingModal
        open={!!filingModal}
        onOpenChange={(open) => !open && setFilingModal(null)}
        compliance={filingModal}
        onSubmit={handleFiling}
        isSubmitting={isSubmitting}
      />

    </div>
  );
}