import { useState } from "react";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  CONDITIONAL_COMPLIANCES,
  TAG_COLORS,
} from "@/lib/compliance/complianceData";

import { ComplianceFilingModal } from "./ComplianceFilingModal";

// ⚠️ CONTEXT API — MARKED FOR REMOVAL
// 🔄 FUTURE: Replace with Redux RTK Query selectors
// const { createObligation } = useDispatch(...)
import { useCompliance } from "@/hooks/useCompliance";
import { getCurrentFinancialYear } from "@/lib/compliance/utils";
import { useToast } from "@/hooks/use-toast";

import {
  FileText,
  Info,
  Calendar,
  ArrowRight,
} from "lucide-react";

import { cn } from "@/lib/utils";

/*
  ==========================================================
  Conditional Compliances Tab
  ==========================================================
*/

export function ConditionalCompliancesTab() {

  const { createObligation } = useCompliance();
  const { toast } = useToast();

  // Removed TS typing
  const [filingModal, setFilingModal] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fy = getCurrentFinancialYear();

  /*
    ==========================================================
    Handle Filing
    TS removed: (data: { comment: string })
    ==========================================================
  */
  const handleFiling = async (data) => {

    if (!filingModal) return;

    setIsSubmitting(true);

    const [startYear] = fy.split("-").map(Number);

    const dueDate =
      filingModal.dueMonth !== undefined &&
      filingModal.dueDay
        ? new Date(
            filingModal.dueMonth >= 3
              ? startYear
              : startYear + 1,
            filingModal.dueMonth,
            filingModal.dueDay
          )
        : new Date();

    await createObligation({
      compliance_type: "income_tax",
      form_name: filingModal.name,
      form_description: filingModal.description,
      due_date: dueDate.toISOString().split("T")[0],
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

  return (
    <div className="space-y-6">

      {/* ================= Header ================= */}
      <div className="flex items-center justify-between px-1">

        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Info className="h-4 w-4 text-primary" />
            </div>
            Conditional Compliances
          </h2>

          <p className="text-xs text-muted-foreground mt-1 ml-9">
            These apply only if certain conditions are met. File only if applicable to your business.
          </p>
        </div>

        <Badge
          variant="outline"
          className="text-xs border-primary/30 text-primary"
        >
          {CONDITIONAL_COMPLIANCES.length} items
        </Badge>

      </div>

      {/* ================= Compliance List ================= */}
      <div className="space-y-4">

        {CONDITIONAL_COMPLIANCES.map((c) => (

          <Card
            key={c.name}
            className="group border-border/60 hover:border-primary/30 transition-all duration-200 overflow-hidden"
          >
            <CardContent className="p-0">

              <div className="flex items-stretch">

                {/* Accent bar */}
                <div className="w-1 bg-primary/20 group-hover:bg-primary transition-colors duration-200 shrink-0" />

                <div className="flex-1 p-5">

                  <div className="flex items-start justify-between gap-4">

                    {/* Left Content */}
                    <div className="flex-1 min-w-0 space-y-2.5">

                      {/* Title */}
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <h3 className="font-semibold text-sm">
                            {c.name}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Badge
                            className={cn(
                              "text-[10px] px-2 py-0",
                              TAG_COLORS[c.primaryTag] ||
                                TAG_COLORS.Other
                            )}
                          >
                            {c.primaryTag}
                          </Badge>

                          <Badge
                            variant="outline"
                            className="text-[10px] px-2 py-0 border-border"
                          >
                            {c.secondaryTag}
                          </Badge>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {c.description}
                      </p>

                      {/* Applicability */}
                      <div className="bg-muted/50 rounded-lg px-3 py-2 border border-border/50">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          <span className="font-medium text-foreground/70">
                            Applicability:
                          </span>{" "}
                          {c.applicabilityInfo}
                        </p>
                      </div>

                      {/* Due */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 text-primary/60" />
                        <span className="font-medium">Due:</span>
                        <span>{c.dueDateRule}</span>
                      </div>

                    </div>

                    {/* File Button */}
                    <Button
                      size="sm"
                      className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 gap-1.5 mt-1"
                      onClick={() => setFilingModal(c)}
                    >
                      File
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>

                  </div>

                </div>
              </div>

            </CardContent>
          </Card>

        ))}

      </div>

      {/* ================= Filing Modal ================= */}
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
              }
            : null
        }
        onSubmit={handleFiling}
        isSubmitting={isSubmitting}
      />

    </div>
  );
}