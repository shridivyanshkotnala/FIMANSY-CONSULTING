import { useMemo, useState } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import {
  FIXED_SCHEDULE_COMPLIANCES,
  TAG_COLORS,
} from "@/lib/compliance/complianceData";

import { ComplianceFilingModal } from "./ComplianceFilingModal";
import { ComplianceCalendar } from "./ComplianceCalendarWidget";

// ⚠️ CONTEXT API — MARKED FOR REMOVAL
// 🔄 FUTURE: Replace with Redux RTK Query selectors
// const { obligations, createObligation, loading } = useSelector(state => state.compliance)
import { useCompliance } from "@/hooks/useCompliance";
import {
  getCurrentFinancialYear,
  getDaysUntilDue,
} from "@/lib/compliance/utils";

import {
  format,
  isSameMonth,
  isBefore,
  startOfDay,
  isWithinInterval,
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

function getFYRange(fy) {
  const [startYear] = fy.split("-").map(Number);
  return {
    start: new Date(startYear, 3, 1),
    end: new Date(startYear + 1, 2, 31),
  };
}

/* ================= Component ================= */

export function FixedScheduleTab() {
  const { obligations, createObligation, loading } = useCompliance();
  const { toast } = useToast();

  const [filingModal, setFilingModal] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = startOfDay(new Date());
  const fy = getCurrentFinancialYear();

  /* ================= Generate FY Compliances ================= */

  const generatedCompliances = useMemo(() => {
    const fyRange = getFYRange(fy);
    const result = [];

    for (
      let month = fyRange.start.getMonth(),
        year = fyRange.start.getFullYear();
      ;
    ) {
      const d = new Date(year, month, 1);
      if (d > fyRange.end) break;

      FIXED_SCHEDULE_COMPLIANCES.forEach((fc) => {
        const dueDate = fc.getDueDate(month, year);

        if (
          dueDate &&
          dueDate >= fyRange.start &&
          dueDate <= fyRange.end
        ) {
          const existing = obligations.find(
            (ob) =>
              ob.form_name === fc.name &&
              ob.due_date === format(dueDate, "yyyy-MM-dd")
          );

          result.push({
            name: fc.name,
            description: fc.description,
            primaryTag: fc.primaryTag,
            secondaryTag: fc.secondaryTag,
            dueDate,
            status: existing?.status || "not_started",
          });
        }
      });

      month++;
      if (month > 11) {
        month = 0;
        year++;
      }
    }

    const unique = new Map();

    result.forEach((r) => {
      const key = `${r.name}-${format(r.dueDate, "yyyy-MM-dd")}`;
      if (!unique.has(key)) unique.set(key, r);
    });

    return Array.from(unique.values()).sort(
      (a, b) => a.dueDate.getTime() - b.dueDate.getTime()
    );
  }, [fy, obligations]);

  const thisMonthCompliances = generatedCompliances.filter((c) =>
    isSameMonth(c.dueDate, today)
  );

  const quarterRange = getCurrentQuarterRange();

  const thisQuarterCompliances = generatedCompliances.filter((c) =>
    isWithinInterval(c.dueDate, quarterRange)
  );

  const thisFYCompliances = generatedCompliances;

  /* ================= Filing ================= */

  const handleFiling = async (data) => {
    if (!filingModal) return;

    setIsSubmitting(true);

    await createObligation({
      compliance_type: "gst",
      form_name: filingModal.name,
      form_description: filingModal.description,
      due_date: format(filingModal.dueDate, "yyyy-MM-dd"),
      status: "initiated",
      financial_year: fy,
      notes: data.comment,
      priority: 3,
    });

    toast({
      title: "Filing initiated",
      description: `${filingModal.name} filing has been initiated.`,
    });

    setIsSubmitting(false);
    setFilingModal(null);
  };

  /* ================= Render Row ================= */

  const renderComplianceRow = (c) => {
    const daysUntil = getDaysUntilDue(
      format(c.dueDate, "yyyy-MM-dd")
    );

    const isOverdue =
      daysUntil < 0 &&
      c.status !== "filed" &&
      c.status !== "approved";

    const isFiled =
      c.status === "filed" ||
      c.status === "approved";

    return (
      <div
        key={`${c.name}-${format(c.dueDate, "yyyy-MM-dd")}`}
        className={cn(
          "flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer",
          isOverdue &&
            "border-l-4 border-l-destructive bg-destructive/5",
          isFiled && "opacity-60"
        )}
        onClick={() => !isFiled && setFilingModal(c)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">
              {c.name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {c.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          <Badge
            className={cn(
              "text-xs",
              TAG_COLORS[c.primaryTag] ||
                TAG_COLORS.Other
            )}
          >
            {c.primaryTag}
          </Badge>

          <div className="text-right min-w-[80px]">
            <p className="text-xs font-medium">
              {format(c.dueDate, "dd MMM")}
            </p>
            <p
              className={cn(
                "text-xs",
                isOverdue
                  ? "text-destructive"
                  : daysUntil <= 7
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

  if (loading)
    return <Skeleton className="h-96 w-full" />;

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
              {thisMonthCompliances.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {thisMonthCompliances.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No filings due this month
            </p>
          ) : (
            thisMonthCompliances.map(renderComplianceRow)
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
              {thisQuarterCompliances.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {thisQuarterCompliances.map(renderComplianceRow)}
        </CardContent>
      </Card>

      {/* FY */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            This Financial Year (FY {fy})
            <Badge variant="secondary" className="ml-auto">
              {thisFYCompliances.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
          {thisFYCompliances.map(renderComplianceRow)}
        </CardContent>
      </Card>

      <ComplianceFilingModal
        open={!!filingModal}
        onOpenChange={(open) =>
          !open && setFilingModal(null)
        }
        compliance={
          filingModal
            ? {
                name: filingModal.name,
                description: filingModal.description,
                primaryTag: filingModal.primaryTag,
                secondaryTag: filingModal.secondaryTag,
                dueDate: format(
                  filingModal.dueDate,
                  "yyyy-MM-dd"
                ),
              }
            : null
        }
        onSubmit={handleFiling}
        isSubmitting={isSubmitting}
      />

    </div>
  );
}