import { useMemo, useState, useCallback } from "react"; // Add useCallback
import { useNavigate } from "react-router-dom";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { ComplianceFilingModal } from "./ComplianceFilingModal";
import { ComplianceCalendar } from "./ComplianceCalendarWidget";
import { TicketDetailDrawer } from "./TicketDetailDrawer";

import { useCompliance } from "@/hooks/useCompliance";
import { useTickets } from "@/hooks/useTickets";

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
  Ticket,
  MessageCircle,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/* ================= Quarterly subtype definitions ================= */

const QUARTERLY_SUBTYPES = [
  "tds_return",
  "advance_tax_q1",
  "advance_tax_q2",
  "advance_tax_q3",
  "advance_tax_q4",
];

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

const getTicketStatusBadge = (status) => {
  const variants = {
    initiated: "secondary",
    pending_docs: "warning",
    in_progress: "default",
    filed: "success",
    approved: "success",
    overdue: "destructive",
    closed: "outline",
    not_started: "outline",
  };
  return variants[status] || "secondary";
};

/* ================= Component ================= */

export function FixedScheduleTab() {
  const navigate = useNavigate();

  const { obligations, loading, refetch: refetchCompliance } = useCompliance();
  const { createTicket, refetchTickets } = useTickets();

  const { toast } = useToast();

  const [filingModal, setFilingModal] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedObligation, setSelectedObligation] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const today = startOfDay(new Date());
  const fy = getCurrentFinancialYear();
  const quarterRange = getCurrentQuarterRange();

  /* ================= Refresh both data sources ================= */
  const refreshAllData = useCallback(async () => {
    await Promise.all([
      refetchCompliance(),
      refetchTickets()
    ]);
  }, [refetchCompliance, refetchTickets]);

  /* ================= Filters ================= */

  const obligationsWithTickets = useMemo(() => {
    return obligations.filter((ob) => ob.status !== "not_started" || ob.ticket_id);
  }, [obligations]);

  const obligationsWithoutTickets = useMemo(() => {
    return obligations.filter((ob) => ob.status === "not_started" && !ob.ticket_id);
  }, [obligations]);

  const thisMonthObligations = useMemo(() => {
    return obligations.filter((ob) => {
      if (!ob.due_date) return false;
      const dueDate = parseISO(ob.due_date);
      return isSameMonth(dueDate, today) && ob.recurrence_type === "monthly";
    });
  }, [obligations, today]);

  const quarterlyObligations = useMemo(() => {
    return obligations.filter((ob) => {
      if (!ob.due_date) return false;

      const isQuarterly =
        ob.recurrence_type === "quarterly" ||
        QUARTERLY_SUBTYPES.includes(ob.compliance_subtype);

      if (!isQuarterly) return false;

      const dueDate = parseISO(ob.due_date);
      return isWithinInterval(dueDate, quarterRange);
    });
  }, [obligations, quarterRange]);

  const thisFYObligations = useMemo(() => {
    return obligations.filter((ob) => ob.financial_year === fy);
  }, [obligations, fy]);

  /* ================= Ticket Creation ================= */

  const handleCreateTicket = async (data) => {
    if (!filingModal) return;

    setIsSubmitting(true);

    try {
      const result = await createTicket({
        obligation_id: filingModal._id,
        comment: data.comment,
      });

      if (!result.error) {
        toast({
          title: "✅ Ticket created",
          description: `${filingModal.form_name || filingModal.compliance_subtype} filing started`,
        });

        // Refresh both compliance and tickets data
        await refreshAllData();

        setFilingModal(null);
      } else {
        toast({
          title: "Error creating ticket",
          description: result.error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create ticket",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ================= Ticket View ================= */

  const handleViewTicket = (obligation) => {
    setSelectedObligation(obligation);
    setDrawerOpen(true);
  };

  const handleObligationClick = (obligation) => {
    if (obligation.ticket_id || obligation.status !== "not_started") {
      handleViewTicket(obligation);
    } else {
      setFilingModal(obligation);
    }
  };

  const handleDrawerClose = async (open) => {
    setDrawerOpen(open);
    if (!open) {
      setSelectedObligation(null);
      // Refresh data when drawer closes in case status was updated
      await refreshAllData();
    }
  };

  /* ================= Handle Status Update from Drawer ================= */
  const handleTicketUpdate = async () => {
    // Refresh data when ticket status is updated in drawer
    await refreshAllData();
  };

  /* ================= Ticket Status UI ================= */

  const renderTicketStatus = (obligation) => {
    if (!obligation.ticket_id && obligation.status === "not_started") {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-help">
                <Ticket className="h-3 w-3" />
                <span>Create Ticket</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Click to create a ticket for this filing</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <Badge variant={getTicketStatusBadge(obligation.status)}>
                {obligation.status === "in_progress" && "In Progress"}
                {obligation.status === "pending_docs" && "Pending Docs"}
                {obligation.status === "filed" && "Filed"}
                {obligation.status === "approved" && "Approved"}
                {obligation.status === "overdue" && "Overdue"}
                {obligation.status === "closed" && "Closed"}
                {obligation.status === "initiated" && "Initiated"}
                {!["initiated", "in_progress", "pending_docs", "filed", "approved", "overdue", "closed", "not_started"].includes(obligation.status) && obligation.status}
              </Badge>

              {obligation.ticket_id && (
                <MessageCircle className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Click to view ticket details</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  /* ================= Obligation Row ================= */

  const renderObligationRow = (obligation) => {
    const dueDate = parseISO(obligation.due_date);
    const daysUntil = getDaysUntilDue(obligation.due_date);

    const isOverdue =
      daysUntil < 0 &&
      obligation.status !== "filed" &&
      obligation.status !== "approved" &&
      obligation.status !== "closed";

    const displayName = obligation.form_name || obligation.compliance_subtype;
    const displayDescription = obligation.form_description || obligation.compliance_description;

    return (
      <div
        key={obligation._id}
        onClick={() => handleObligationClick(obligation)}
        className={cn(
          "flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 cursor-pointer transition-all",
          isOverdue && "border-l-4 border-l-destructive bg-destructive/5",
          (obligation.ticket_id || obligation.status !== "not_started") && "border-primary/20 hover:border-primary/40"
        )}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{displayName}</p>

              {isOverdue && (
                <AlertCircle className="h-3 w-3 text-destructive shrink-0" />
              )}

              {obligation.status === "filed" && (
                <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
              )}
            </div>

            {displayDescription && (
              <p className="text-xs text-muted-foreground truncate">
                {displayDescription}
              </p>
            )}

            <p className="text-xs text-muted-foreground mt-1">
              Due: {format(dueDate, "dd MMM yyyy")}
              {daysUntil <= 7 && daysUntil > 0 && (
                <span className="ml-2 text-warning">({daysUntil} days left)</span>
              )}
              {isOverdue && (
                <span className="ml-2 text-destructive">({Math.abs(daysUntil)}d overdue)</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 ml-4">
          {renderTicketStatus(obligation)}
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Stats Summary - Optional but helpful */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{obligations.length}</div>
            <p className="text-xs text-muted-foreground">Total Obligations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{obligationsWithTickets.length}</div>
            <p className="text-xs text-muted-foreground">With Tickets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{obligationsWithoutTickets.length}</div>
            <p className="text-xs text-muted-foreground">Ready for Tickets</p>
          </CardContent>
        </Card>
      </div>

      <ComplianceCalendar obligations={obligations} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Quarterly Filings ({quarterRange.label})
            <Badge variant="secondary" className="ml-auto">
              {quarterlyObligations.length}
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-2">
          {quarterlyObligations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No quarterly filings due
            </p>
          ) : (
            quarterlyObligations.map(renderObligationRow)
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Financial Year {fy}
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
        onSuccess={handleCreateTicket}
        mode="ticket"
      />

      <TicketDetailDrawer
        ticket={selectedObligation}
        open={drawerOpen}
        onOpenChange={handleDrawerClose}
        onStatusUpdate={handleTicketUpdate}
      />
    </div>
  );
}