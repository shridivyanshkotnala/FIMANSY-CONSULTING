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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { ComplianceFilingModal } from "./ComplianceFilingModal";
import { ComplianceCalendar } from "./ComplianceCalendarWidget";
import { TicketDetailDrawer } from "./TicketDetailDrawer/TicketDetailDrawer";

import { useCompliance } from "@/hooks/useCompliance";
import { useTickets } from "@/hooks/useTickets";

import { getCurrentFinancialYear, getDaysUntilDue, getCurrentQuarterRange } from "@/lib/compliance/utils";

import { format, isSameMonth, startOfDay, isWithinInterval, parseISO } from "date-fns";

import { Calendar, FileText, ChevronRight, Ticket, MessageCircle, AlertCircle, CheckCircle2, EyeOff } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/* ================= Quarterly subtype definitions ================= */
const QUARTERLY_SUBTYPES = ["tds_return", "advance_tax_q1", "advance_tax_q2", "advance_tax_q3", "advance_tax_q4"];

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
export function FixedScheduleTab({ currentDate }) {
  const navigate = useNavigate();
  const {
    obligations: serverObligations,
    loading,
    refetch: refetchCompliance,
    updateObligationStatus,
  } = useCompliance();
  const { createTicket, refetchTickets, tickets, uploadTicketDocument } = useTickets();
  const { toast } = useToast();

  // Local state for optimistic updates
  const [localObligations, setLocalObligations] = useState([]);
  const [filingModal, setFilingModal] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [localTickets, setLocalTickets] = useState([]);
  const [calendarDayPickerOpen, setCalendarDayPickerOpen] = useState(false);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);
  const [selectedCalendarObligations, setSelectedCalendarObligations] = useState([]);
  const [ignoringObligationId, setIgnoringObligationId] = useState(null);
  const [ignoreConfirmOpen, setIgnoreConfirmOpen] = useState(false);
  const [pendingIgnoreObligation, setPendingIgnoreObligation] = useState(null);

  const effectiveCurrentDate = currentDate || new Date();
  const today = startOfDay(new Date(effectiveCurrentDate));
  const fy = getCurrentFinancialYear(effectiveCurrentDate);
  const quarterRange = getCurrentQuarterRange(effectiveCurrentDate);

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

  const normalizeId = useCallback((value) => {
    if (!value) return null;
    if (typeof value === "string") return value;
    if (typeof value === "object") return value?._id?.toString?.() || value?.id?.toString?.() || value?.toString?.();
    return String(value);
  }, []);

  const getTicketForObligation = useCallback(
    (ob) => {
      const obligationId = normalizeId(ob?._id);
      const obligationTicketId = normalizeId(ob?.ticket_id);

      return allTickets.find((t) => {
        const ticketId = normalizeId(t?._id);
        const ticketObligationId = normalizeId(t?.obligation_id);

        // Primary link: obligation.ticket_id -> ticket._id
        if (obligationTicketId && ticketId && obligationTicketId === ticketId) return true;

        // Fallback link: ticket.obligation_id -> obligation._id
        if (obligationId && ticketObligationId && obligationId === ticketObligationId) return true;

        return false;
      });
    },
    [allTickets, normalizeId]
  );

  const visibleObligations = useMemo(
    () =>
      localObligations.filter(
        (ob) => ob.status !== "not_applicable" && ob.status !== "ignored"
      ),
    [localObligations]
  );

  // Calendar should reflect live ticket progress (filed/approved/closed),
  // not only raw obligation.status from generation time.
  const calendarObligations = useMemo(
    () =>
      visibleObligations.map((ob) => {
        const ticket = getTicketForObligation(ob);
        return ticket?.status ? { ...ob, status: ticket.status } : ob;
      }),
    [visibleObligations, getTicketForObligation]
  );

  /* ================= Filters ================= */
  const obligationsWithTickets = useMemo(
    () => visibleObligations.filter((ob) => Boolean(getTicketForObligation(ob))),
    [visibleObligations, getTicketForObligation]
  );
  const obligationsWithoutTickets = useMemo(
    () => visibleObligations.filter((ob) => !getTicketForObligation(ob)),
    [visibleObligations, getTicketForObligation]
  );
  
  const thisMonthObligations = useMemo(
    () => visibleObligations.filter((ob) => ob.due_date && isSameMonth(parseISO(ob.due_date), today) && ob.recurrence_type === "monthly"),
    [visibleObligations, today]
  );
  
  const quarterlyObligations = useMemo(
    () =>
      visibleObligations.filter((ob) => {
        if (!ob.due_date) return false;
        const isQuarterly = ob.recurrence_type === "quarterly" || QUARTERLY_SUBTYPES.includes(ob.compliance_subtype);
        if (!isQuarterly) return false;
        return isWithinInterval(parseISO(ob.due_date), quarterRange);
      }),
    [visibleObligations, quarterRange]
  );
  
  const thisFYObligations = useMemo(() => visibleObligations.filter((ob) => ob.financial_year === fy), [visibleObligations, fy]);

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
    if (getTicketForObligation(obligation)) {
      handleViewTicket(obligation);
    } else {
      setFilingModal(obligation);
    }
  };

  const handleCalendarDayClick = useCallback(
    (day, dayObligations) => {
      if (!Array.isArray(dayObligations) || dayObligations.length === 0) return;

      const sorted = [...dayObligations].sort(
        (a, b) => new Date(a?.due_date || 0) - new Date(b?.due_date || 0)
      );

      if (sorted.length === 1) {
        handleObligationClick(sorted[0]);
        return;
      }

      setSelectedCalendarDay(day);
      setSelectedCalendarObligations(sorted);
      setCalendarDayPickerOpen(true);
    },
    [handleObligationClick]
  );

  const handleIgnoreObligation = useCallback(
    async (obligation) => {
      if (!obligation?._id) return;

      try {
        setIgnoringObligationId(obligation._id);

        const result = await updateObligationStatus(obligation._id, "not_applicable", {
          notes: "Ignored by user (already filed externally)",
        });

        if (result?.error) {
          throw result.error;
        }

        setLocalObligations((prev) =>
          prev.map((ob) =>
            ob._id === obligation._id
              ? { ...ob, status: "not_applicable" }
              : ob
          )
        );

        toast({
          title: "Compliance ignored",
          description: "This obligation is removed from calendar and active lists.",
        });

        refetchCompliance().catch(console.error);
      } catch (error) {
        toast({
          title: "Failed to ignore",
          description: error?.message || "Could not ignore this compliance.",
          variant: "destructive",
        });
      } finally {
        setIgnoringObligationId(null);
      }
    },
    [toast, updateObligationStatus, refetchCompliance]
  );

  const handleDrawerClose = useCallback((open) => {
    setDrawerOpen(open);
    if (!open) {
      setSelectedTicket(null);
    }
  }, []);

  /* ================= Optimistic Updates ================= */
  // 🔥 FIXED: handleCreateTicket with proper error handling and ticket extraction
  const handleCreateTicket = async (data) => {
    if (!filingModal) return;
    setIsSubmitting(true);

    try {
      const result = await createTicket({ 
        obligation_id: filingModal._id, 
        comment: data.comment,
        attachments: Array.isArray(data?.attachments) ? data.attachments : [],
      });

      console.log("📦 Create ticket result:", result); // Debug log

      // 🎯 FIX: Check if result exists and has no error
      if (result && !result.error) {
        // Extract ticket from various possible response formats
        let newTicket = null;
        
        if (result.data) {
          // Case 1: result.data is the ticket directly
          if (result.data._id) {
            newTicket = result.data;
          }
          // Case 2: result.data.data contains the ticket
          else if (result.data.data && result.data.data._id) {
            newTicket = result.data.data;
          }
          // Case 3: result.data.ticket contains the ticket
          else if (result.data.ticket && result.data.ticket._id) {
            newTicket = result.data.ticket;
          }
        }
        
        // If we still don't have a ticket but result itself has _id
        if (!newTicket && result._id) {
          newTicket = result;
        }

        console.log("🎯 Extracted ticket:", newTicket);

        if (newTicket) {
          const selectedFiles = Array.isArray(data?.files) ? data.files : [];

          if (selectedFiles.length > 0) {
            const uploadResults = await Promise.allSettled(
              selectedFiles.map((file) =>
                uploadTicketDocument(newTicket._id, {
                  file,
                  intent: "working_doc",
                  message: `Client uploaded document: ${file.name}`,
                })
              )
            );

            const failedUploads = uploadResults.filter((result) => {
              if (result.status === "rejected") return true;
              return Boolean(result.value?.error);
            }).length;

            if (failedUploads > 0) {
              toast({
                title: "Some uploads failed",
                description: `${failedUploads} of ${selectedFiles.length} document(s) could not be uploaded. You can re-upload from ticket documents tab.`,
                variant: "destructive",
              });
            }
          }

          // 🎯 OPTIMISTIC UPDATE 1: Update the obligation to show it has a ticket
          setLocalObligations(prev => 
            prev.map(ob => 
              ob._id === filingModal._id 
                ? { 
                    ...ob, 
                    ticket_id: newTicket._id,
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
            if (newObligations?.data) {
              setLocalObligations(newObligations.data);
            }
            // Clear local tickets since we now have server data
            setLocalTickets([]);
          }).catch(console.error);
        } else {
          throw new Error("Could not extract ticket from response");
        }
      } else {
        toast({ 
          title: "Error creating ticket", 
          description: result?.error?.message || "Unknown error", 
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error("❌ Error in handleCreateTicket:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create ticket", 
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
    const daysUntil = getDaysUntilDue(ob.due_date, effectiveCurrentDate);
    const ticket = getTicketForObligation(ob);
    // ✅ Use ticket status if available
    const status = ticket?.status || ob.status;
    return daysUntil < 0 && !["filed", "approved", "closed"].includes(status);
  };

  const renderObligationRow = (obligation) => {
    const dueDate = parseISO(obligation.due_date);
    const daysUntil = getDaysUntilDue(obligation.due_date, effectiveCurrentDate);
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
          ticket && "border-primary/20 hover:border-primary/40"
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              setPendingIgnoreObligation(obligation);
              setIgnoreConfirmOpen(true);
            }}
            disabled={ignoringObligationId === obligation._id}
          >
            <EyeOff className="h-3.5 w-3.5 mr-1" />
            Ignore
          </Button>
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
            <div className="text-2xl font-bold">{visibleObligations.length}</div>
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

      <ComplianceCalendar
        obligations={calendarObligations}
        currentDate={effectiveCurrentDate}
        onDayClick={handleCalendarDayClick}
      />

      <Dialog open={calendarDayPickerOpen} onOpenChange={setCalendarDayPickerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedCalendarDay
                ? `Compliances due on ${format(selectedCalendarDay, "dd MMM yyyy")}`
                : "Compliances for selected date"}
            </DialogTitle>
            <DialogDescription>
              Select a compliance below to view ticket status or raise a new ticket.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[55vh] overflow-y-auto space-y-2 pr-1">
            {selectedCalendarObligations.map((obligation) => (
              <div
                key={obligation._id}
                onClick={() => {
                  setCalendarDayPickerOpen(false);
                  handleObligationClick(obligation);
                }}
              >
                {renderObligationRow(obligation)}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

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

      <AlertDialog open={ignoreConfirmOpen} onOpenChange={setIgnoreConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ignore this compliance?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the obligation as not applicable and remove it from calendar and active filing lists.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingIgnoreObligation) {
                  handleIgnoreObligation(pendingIgnoreObligation);
                }
                setPendingIgnoreObligation(null);
              }}
            >
              Confirm Ignore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}