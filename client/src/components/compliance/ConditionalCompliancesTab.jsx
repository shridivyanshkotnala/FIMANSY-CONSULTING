import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ComplianceFilingModal } from "./ComplianceFilingModal";
import { TicketDetailDrawer } from "./TicketDetailDrawer/TicketDetailDrawer";
import { useCompliance } from "@/hooks/useCompliance";
import { useTickets } from "@/hooks/useTickets";
import { getCurrentFinancialYear } from "@/lib/compliance/utils";
import { useToast } from "@/hooks/use-toast";

import {
  ArrowRight,
  Loader2,
  Ticket,
  MessageCircle,
  CheckCircle2,
} from "lucide-react";

import { cn } from "@/lib/utils";

/* ================= Helpers ================= */
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

const CLOSED_STATUS = "closed";

export function ConditionalCompliancesTab({ currentDate }) {
  const {
    conditionalItems: serverConditionalItems,
    loadingConditional,
    fetchConditionalCompliances,
  } = useCompliance();

  const {
    createConditionalTicket,
    refetchTickets,
    tickets,
    uploadTicketDocument,
  } = useTickets();

  const { toast } = useToast();

  const isMounted = useRef(true);
  const initialFetchDone = useRef(false);

  const [localConditionalItems, setLocalConditionalItems] = useState([]);
  const [filingModal, setFilingModal] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fy = getCurrentFinancialYear(currentDate);

  /* ================= Sync ================= */
  useEffect(() => {
    setLocalConditionalItems(serverConditionalItems || []);
  }, [serverConditionalItems]);

  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchConditionalCompliances(fy);
      refetchTickets();
    }

    return () => {
      isMounted.current = false;
    };
  }, [fetchConditionalCompliances, refetchTickets, fy]);

  /* ================= Tickets Map ================= */
  const templateTicketsMap = useMemo(() => {
    const map = new Map();

    tickets.forEach((t) => {
      const templateId = t?.template_id?.toString?.() || t?.template_id;
      if (!templateId) return;
      if (!map.has(templateId)) map.set(templateId, []);
      map.get(templateId).push(t);
    });

    // newest first per template
    for (const [templateId, list] of map.entries()) {
      list.sort(
        (a, b) =>
          new Date(b?.createdAt || b?.created_at || 0).getTime() -
          new Date(a?.createdAt || a?.created_at || 0).getTime()
      );
      map.set(templateId, list);
    }

    return map;
  }, [tickets]);

  const getTicket = useCallback(
    (item) => {
      const templateId = item?._id?.toString?.() || item?._id;
      const templateTickets = templateTicketsMap.get(templateId) || [];

      // Active ticket for current workflow
      return templateTickets.find((t) => t.status !== CLOSED_STATUS) || null;
    },
    [templateTicketsMap]
  );

  const hasClosedTicketHistory = useCallback(
    (item) => {
      const templateId = item?._id?.toString?.() || item?._id;
      const templateTickets = templateTicketsMap.get(templateId) || [];
      return templateTickets.some((t) => t.status === CLOSED_STATUS);
    },
    [templateTicketsMap]
  );

  const refreshAllData = useCallback(async () => {
    if (!isMounted.current) return;
    await Promise.all([
      fetchConditionalCompliances(fy),
      refetchTickets(),
    ]);
  }, [fetchConditionalCompliances, refetchTickets, fy]);

  /* ================= Click Handlers ================= */
  const handleFileClick = useCallback((item) => {
    setFilingModal(item);
  }, []);

  const handleViewTicket = useCallback(
    (item) => {
      const ticket = getTicket(item);
      if (ticket) {
        setSelectedTicket(ticket);
        setDrawerOpen(true);
      }
    },
    [getTicket]
  );

  const handleItemClick = useCallback(
    (item) => {
      const activeTicket = getTicket(item);
      if (activeTicket) {
        handleViewTicket(item);
      } else {
        handleFileClick(item);
      }
    },
    [getTicket, handleViewTicket, handleFileClick]
  );

  const handleDrawerClose = useCallback((open) => {
    setDrawerOpen(open);
    if (!open) {
      setTimeout(() => {
        if (isMounted.current) {
          setSelectedTicket(null);
        }
      }, 100);
    }
  }, []);

  /* ================= Create Ticket ================= */
  const handleFiling = async (data) => {
    if (!filingModal) return;

    setIsSubmitting(true);

    try {
      const result = await createConditionalTicket({
        template_id: filingModal._id,
        comment: data.comment || `Starting filing for ${filingModal.name}`,
        attachments: data.attachments || [],
      });

      if (!result || result.error) {
        throw new Error(result?.error?.message || "API failed");
      }

      // ✅ SAFE ACCESS FIX
      const newTicket = result.data?.data || result.data;

      if (!newTicket?._id) {
        throw new Error("Invalid ticket response");
      }

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

      // ✅ ONLY store ticket_id (NO duplicate ticket data)
      setLocalConditionalItems((prev) =>
        prev.map((item) =>
          item._id === filingModal._id
            ? {
                ...item,
                has_ticket: true,
                ticket_id: newTicket._id,
              }
            : item
        )
      );

      // ✅ open drawer immediately with fresh ticket
      setSelectedTicket(newTicket);
      setDrawerOpen(true);
      setFilingModal(null);

      toast({
        title: "✅ Filing Started",
        description: "Conditional ticket created successfully.",
      });

      // background refresh
      setTimeout(() => {
        if (isMounted.current) {
          refreshAllData().catch(console.error);
        }
      }, 500);
    } catch (err) {
      toast({
        title: "Error",
        description: err.message || "Failed to create ticket",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ================= Status Update ================= */
  const handleStatusUpdate = useCallback(
    (updatedTicket) => {
      if (!isMounted.current || !updatedTicket) return;

      // ✅ update only selected ticket
      setSelectedTicket(updatedTicket);

      // ✅ refresh global tickets (source of truth)
      refetchTickets().catch(console.error);
    },
    [refetchTickets]
  );

  /* ================= UI ================= */
  const renderTicketStatus = useCallback(
    (item) => {
      const ticket = getTicket(item);

      if (!ticket) {
        const showRaiseNew = hasClosedTicketHistory(item);
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-help">
                  <Ticket className="h-3 w-3" />
                  <span>{showRaiseNew ? "Raise New Ticket" : "Create Ticket"}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{showRaiseNew ? "Previous ticket closed. Click to raise a new ticket." : "Click to create a ticket"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }

      const status = ticket.status;
      const showFiledIcon =
        status === "filed" || status === "approved";

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                {showFiledIcon && (
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                )}
                <Badge variant={getTicketStatusBadge(status)}>
                  {formatStatusText(status)}
                </Badge>
                <MessageCircle className="h-3 w-3 text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Click to view ticket</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
    [getTicket, hasClosedTicketHistory]
  );

  if (loadingConditional && localConditionalItems.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {localConditionalItems.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Total Conditional Items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {
                localConditionalItems.filter((i) => Boolean(getTicket(i))).length
              }
            </div>
            <p className="text-xs text-muted-foreground">
              With Tickets
            </p>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      <div className="space-y-4">
        {localConditionalItems.map((item) => (
          <Card
            key={item._id}
            className={cn(
              "cursor-pointer hover:shadow-md transition",
              getTicket(item) &&
                "border-primary/20 hover:border-primary/40"
            )}
            onClick={() => handleItemClick(item)}
          >
            <CardContent className="p-5 flex justify-between items-center">
              <div>
                <h3 className="font-semibold">{item.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {item.compliance_description}
                </p>
              </div>

              <div className="flex items-center gap-4">
                {renderTicketStatus(item)}
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal */}
      <ComplianceFilingModal
        open={!!filingModal}
        onOpenChange={(o) => !o && setFilingModal(null)}
        compliance={filingModal}
        onSuccess={handleFiling}
        isSubmitting={isSubmitting}
        mode="conditional"
      />

      {/* Drawer */}
      <TicketDetailDrawer
        ticket={selectedTicket}
        open={drawerOpen}
        onOpenChange={handleDrawerClose}
        onStatusUpdate={handleStatusUpdate}
      />
    </div>
  );
}