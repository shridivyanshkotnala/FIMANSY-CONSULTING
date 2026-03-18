import { useMemo, useState, useCallback, useEffect } from "react";
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
import { TicketDetailDrawer } from "./TicketDetailDrawer/TicketDetailDrawer";

import { useCompliance } from "@/hooks/useCompliance";
import { useTickets } from "@/hooks/useTickets";

import { getCurrentFinancialYear, getDaysUntilDue } from "@/lib/compliance/utils";

import { format, isSameMonth, startOfDay, isWithinInterval, parseISO } from "date-fns";

import { Calendar, FileText, ChevronRight, Ticket, MessageCircle, AlertCircle, CheckCircle2 } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/* ================= Quarterly subtype definitions ================= */
const QUARTERLY_SUBTYPES = ["tds_return", "advance_tax_q1", "advance_tax_q2", "advance_tax_q3", "advance_tax_q4"];

/* ================= Helpers ================= */
function getCurrentQuarterRange() {
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();

  if (month >= 3 && month <= 5) return { start: new Date(year, 3, 1), end: new Date(year, 5, 30), label: "Q1" };
  if (month >= 6 && month <= 8) return { start: new Date(year, 6, 1), end: new Date(year, 8, 30), label: "Q2" };
  if (month >= 9 && month <= 11) return { start: new Date(year, 9, 1), end: new Date(year, 11, 31), label: "Q3" };
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

const formatStatusText = (status) => {
  if (!status) return "";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

/* ================= Component ================= */
export function FixedScheduleTab() {
  const navigate = useNavigate();
  const { obligations: serverObligations, loading, refetch: refetchCompliance } = useCompliance();
  const { createTicket, refetchTickets, tickets, updateTicketStatus } = useTickets();
  const { toast } = useToast();

  // Local state for optimistic updates
  const [localObligations, setLocalObligations] = useState([]);
  const [filingModal, setFilingModal] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [localTickets, setLocalTickets] = useState([]);

  const today = startOfDay(new Date());
  const fy = getCurrentFinancialYear();
  const quarterRange = getCurrentQuarterRange();

  // Sync server obligations with local state when they change
  useEffect(() => {
    setLocalObligations(serverObligations);
  }, [serverObligations]);

  /* ================= Helpers ================= */
  const allTickets = useMemo(() => {
    // Merge server tickets with local optimistic tickets
    const ticketMap = new Map();
    
    // Add server tickets first
    tickets.forEach(t => ticketMap.set(t._id, t));
    // Override with local optimistic updates
    localTickets.forEach(t => ticketMap.set(t._id, t));
    
    return Array.from(ticketMap.values());
  }, [tickets, localTickets]);

  const getTicketForObligation = useCallback(
    (ob) => allTickets.find((t) => t._id === ob.ticket_id),
    [allTickets]
  );

  /* ================= Filters ================= */
  const obligationsWithTickets = useMemo(() => localObligations.filter((ob) => ob.ticket_id), [localObligations]);
  const obligationsWithoutTickets = useMemo(() => localObligations.filter((ob) => !ob.ticket_id), [localObligations]);
  
  const thisMonthObligations = useMemo(
    () => localObligations.filter((ob) => ob.due_date && isSameMonth(parseISO(ob.due_date), today) && ob.recurrence_type === "monthly"),
    [localObligations, today]
  );
  
  const quarterlyObligations = useMemo(
    () =>
      localObligations.filter((ob) => {
        if (!ob.due_date) return false;
        const isQuarterly = ob.recurrence_type === "quarterly" || QUARTERLY_SUBTYPES.includes(ob.compliance_subtype);
        if (!isQuarterly) return false;
        return isWithinInterval(parseISO(ob.due_date), quarterRange);
      }),
    [localObligations, quarterRange]
  );
  
  const thisFYObligations = useMemo(() => localObligations.filter((ob) => ob.financial_year === fy), [localObligations, fy]);

  /* ================= Ticket Handling ================= */
  const handleViewTicket = useCallback(
    (obligation) => {
      const ticket = getTicketForObligation(obligation);
      if (ticket) {
        setSelectedTicket(ticket);
        setDrawerOpen(true);
      }
    },
    [getTicketForObligation]
  );

  const handleObligationClick = (obligation) => {
    if (obligation.ticket_id) {
      handleViewTicket(obligation);
    } else {
      setFilingModal(obligation);
    }
  };

  const handleDrawerClose = useCallback((open) => {
    setDrawerOpen(open);
    if (!open) {
      setSelectedTicket(null);
    }
  }, []);

  /* ================= Optimistic Updates ================= */
  const handleCreateTicket = async (data) => {
    if (!filingModal) return;
    setIsSubmitting(true);

    try {
      const result = await createTicket({ 
        obligation_id: filingModal._id, 
        comment: data.comment 
      });

      if (!result.error && result.data) {
        const newTicket = result.data;
        
        // 🎯 OPTIMISTIC UPDATE 1: Update the obligation to show it has a ticket
        setLocalObligations(prev => 
          prev.map(ob => 
            ob._id === filingModal._id 
              ? { 
                  ...ob, 
                  ticket_id: newTicket._id,
                  // Optionally update status if you want
                  // status: 'initiated' 
                } 
              : ob
          )
        );

        // 🎯 OPTIMISTIC UPDATE 2: Add the new ticket to local tickets
        setLocalTickets((prev) => [...prev, newTicket]);
        
        // 🎯 Open the drawer immediately to show the new ticket
        setSelectedTicket(newTicket);
        setDrawerOpen(true);
        
        toast({ 
          title: "✅ Ticket created", 
          description: `${filingModal.form_name || filingModal.compliance_subtype} filing started` 
        });
        
        setFilingModal(null);

        // Refresh in background (don't await)
        Promise.all([
          refetchCompliance(),
          refetchTickets()
        ]).then(([newObligations]) => {
          // Update local state with fresh server data
          if (newObligations.data) {
            setLocalObligations(newObligations.data);
          }
          // Clear local tickets since we now have server data
          setLocalTickets([]);
        }).catch(console.error);

      } else {
        toast({ 
          title: "Error creating ticket", 
          description: result.error?.message || "Unknown error", 
          variant: "destructive" 
        });
      }
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to create ticket", 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTicketUpdate = useCallback((updatedTicket) => {
    // Update in local tickets
    setLocalTickets((prev) =>
      prev.map((t) => (t._id === updatedTicket._id ? updatedTicket : t))
    );
    
    // Update selected ticket if it's the one in drawer
    if (selectedTicket?._id === updatedTicket._id) {
      setSelectedTicket(updatedTicket);
    }

    // Refresh in background
    refetchTickets().catch(console.error);
  }, [selectedTicket, refetchTickets]);

  /* ================= Ticket Status UI ================= */
  const renderTicketStatus = (obligation) => {
    const ticket = getTicketForObligation(obligation);
    
    if (!ticket) {
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

    // ✅ ALWAYS use ticket.status, NEVER obligation.status
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <Badge variant={getTicketStatusBadge(ticket.status)}>
                {formatStatusText(ticket.status)}
              </Badge>
              <MessageCircle className="h-3 w-3 text-muted-foreground" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Click to view ticket details</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const isObligationOverdue = (ob) => {
    const daysUntil = getDaysUntilDue(ob.due_date);
    const ticket = getTicketForObligation(ob);
    // ✅ Use ticket status if available
    const status = ticket?.status || ob.status;
    return daysUntil < 0 && !["filed", "approved", "closed"].includes(status);
  };

  const renderObligationRow = (obligation) => {
    const dueDate = parseISO(obligation.due_date);
    const daysUntil = getDaysUntilDue(obligation.due_date);
    const isOverdue = isObligationOverdue(obligation);
    const ticket = getTicketForObligation(obligation);
    // ✅ Use ticket status if available
    const status = ticket?.status || obligation.status;
    const displayName = obligation.form_name || obligation.compliance_subtype;
    const displayDescription = obligation.form_description || obligation.compliance_description;
    const showFiledIcon = status === "filed" || status === "approved";

    return (
      <div
        key={obligation._id}
        onClick={() => handleObligationClick(obligation)}
        className={cn(
          "flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 cursor-pointer transition-all",
          isOverdue && "border-l-4 border-l-destructive bg-destructive/5",
          obligation.ticket_id && "border-primary/20 hover:border-primary/40"
        )}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{displayName}</p>
              {isOverdue && <AlertCircle className="h-3 w-3 text-destructive shrink-0" />}
              {showFiledIcon && <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />}
            </div>
            {displayDescription && <p className="text-xs text-muted-foreground truncate">{displayDescription}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              Due: {format(dueDate, "dd MMM yyyy")}
              {daysUntil <= 7 && daysUntil > 0 && <span className="ml-2 text-warning">({daysUntil} days left)</span>}
              {isOverdue && <span className="ml-2 text-destructive">({Math.abs(daysUntil)}d overdue)</span>}
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

  if (loading && localObligations.length === 0) {
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
      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{localObligations.length}</div>
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

      <ComplianceCalendar obligations={localObligations} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />This Month's Filings
            <Badge variant="secondary" className="ml-auto">
              {thisMonthObligations.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {thisMonthObligations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No filings due this month</p>
          ) : (
            thisMonthObligations.map(renderObligationRow)
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />Quarterly Filings ({quarterRange.label})
            <Badge variant="secondary" className="ml-auto">
              {quarterlyObligations.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {quarterlyObligations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No quarterly filings due</p>
          ) : (
            quarterlyObligations.map(renderObligationRow)
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />Financial Year {fy}
            <Badge variant="secondary" className="ml-auto">
              {thisFYObligations.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
          {thisFYObligations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No filings for this financial year</p>
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
        ticket={selectedTicket}
        open={drawerOpen}
        onOpenChange={handleDrawerClose}
        onStatusUpdate={handleTicketUpdate}
      />
    </div>
  );
}