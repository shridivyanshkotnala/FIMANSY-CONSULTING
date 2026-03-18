import { useState, useEffect, useRef } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useTickets } from "@/hooks/useTickets";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar, MessageSquare, FileText, Clock, Send, Loader2, ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

import { STATUS_LABELS, STATUS_TRANSITIONS, STATUS_CONFIG } from "./constants";
import { safeFormatDate } from "./utils";
import { SectionTabs } from "./SectionTabs";
import { TicketTimeline } from "./TicketTimeline";
import { TicketComments } from "./TicketComments";
import { TicketDocuments } from "./TicketDocuments";
import { TicketFilingDetails } from "./TicketFilingDetails";

export function TicketDetailDrawer({ ticket, open, onOpenChange, onStatusUpdate }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { getTicketComments, addTicketComment, updateTicketStatus } = useTickets();

  const [statusHistory, setStatusHistory] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [activeSection, setActiveSection] = useState("timeline");
  const [localTicket, setLocalTicket] = useState(null);

  // 🔥 FIX 1: PROPER PROP SYNC - NEVER IGNORE SAME TICKET UPDATES
  useEffect(() => {
    if (!ticket) return;

    setLocalTicket((prev) => {
      // 🆕 First load
      if (!prev) {
        console.log("🆕 Initial ticket load:", ticket.status);
        return ticket;
      }

      // 🆕 Different ticket
      if (ticket._id !== prev._id) {
        console.log("🆕 Switching ticket:", ticket.status);
        return ticket;
      }

      // 🚨 Skip sync if we're in the middle of a status update
      if (updatingStatus) {
        console.log("⏸️ Skipping prop sync - update in progress");
        return prev;
      }

      // 🔥 SAME ticket → check freshness (FIXES THE BUG!)
      const incomingTime = new Date(ticket.updatedAt || ticket.updated_at || 0).getTime();
      const currentTime = new Date(prev.updatedAt || prev.updated_at || 0).getTime();

      if (incomingTime > currentTime) {
        console.log("🔄 Updating with newer ticket:", ticket.status, "was:", prev.status);
        return ticket;
      }

      console.log("⛔ Ignoring stale prop:", ticket.status);
      return prev;
    });
  }, [ticket, updatingStatus]);

  // 🎯 Handle initial history setup
  useEffect(() => {
    if (!localTicket) return;

    if (!localTicket.status_history || localTicket.status_history.length === 0) {
      const initialHistory = [{
        status: "initiated",
        changed_by_role: "admin",
        at: localTicket.createdAt || localTicket.created_at || new Date().toISOString(),
        note: "Ticket created"
      }];
      setStatusHistory(initialHistory);
    } else {
      setStatusHistory(localTicket.status_history);
    }
  }, [localTicket?._id]); // Only when ticket changes

  // 🎯 Derive status from history if needed (backup)
  useEffect(() => {
    if (localTicket && !localTicket.status && localTicket.status_history?.length > 0) {
      const sortedHistory = [...localTicket.status_history].sort(
        (a, b) => new Date(b.at || b.createdAt || 0) - new Date(a.at || a.createdAt || 0)
      );
      const latestStatus = sortedHistory[0]?.status;
      if (latestStatus) {
        console.log("🔄 Deriving status from history:", latestStatus);
        setLocalTicket(prev => ({ ...prev, status: latestStatus }));
      }
    }
  }, [localTicket]);

  // Load comments when section changes
  useEffect(() => {
    if (!localTicket?._id || !open || activeSection !== "comments") return;

    // Don't fetch if we already have comments for this ticket
    if (comments.length > 0 && comments[0]?.ticket_id === localTicket._id) {
      console.log("✅ Comments already loaded for this ticket");
      return;
    }

    const loadTicketData = async () => {
      setLoading(true);
      try {
        const { data: ticketComments, error } = await getTicketComments(localTicket._id);
        if (!error) {
          console.log("📝 Setting comments:", ticketComments);
          setComments(ticketComments || []);
        } else {
          toast({ title: "Error", description: "Failed to load comments", variant: "destructive" });
        }
      } finally {
        setLoading(false);
      }
    };

    loadTicketData();
  }, [localTicket?._id, open, activeSection, getTicketComments, toast]);

  const handleAddComment = async () => {
    if (!localTicket?._id || !newComment.trim()) return;
    
    setSubmitting(true);
    
    // Store the comment text locally
    const commentText = newComment.trim();
    
    try {
      // Create optimistic comment
      const optimisticComment = {
        _id: `temp-${Date.now()}`,
        ticket_id: localTicket._id,
        organization_id: localTicket.organization_id,
        user_id: {
          _id: user?._id,
          name: user?.name || (user?.role === "admin" || user?.role === "accountant" ? "Accountant" : "Client"),
          email: user?.email
        },
        role: user?.role === "admin" || user?.role === "accountant" ? "accountant" : "user",
        message: commentText,
        content: commentText,
        attachments: [],
        created_at: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        author_role: user?.role === "admin" || user?.role === "accountant" ? "accountant" : "user",
        author_name: user?.name || (user?.role === "admin" || user?.role === "accountant" ? "Accountant" : "Client"),
        author_email: user?.email
      };

      console.log("📝 Adding optimistic comment:", optimisticComment);
      
      // Add optimistic comment immediately
      setComments(prev => {
        const newComments = [...prev, optimisticComment];
        console.log("📝 Comments after optimistic add:", newComments);
        return newComments;
      });
      
      setNewComment("");

      // Send to backend
      const response = await addTicketComment(localTicket._id, {
        message: commentText,
        attachments: []
      });

      console.log("📡 Backend response:", response);

      if (response.error) {
        console.error("❌ Error from addTicketComment:", response.error);
        setComments(prev => prev.filter(c => c._id !== optimisticComment._id));
        toast({ 
          title: "Error", 
          description: "Failed to add comment", 
          variant: "destructive" 
        });
        return;
      }

      // Extract real comment from response
      let realComment = null;
      
      if (response.data && !response.data.success && !response.data.data) {
        realComment = response.data;
      } else if (response.data?.data) {
        realComment = response.data.data;
      } else if (response.data?.success && response.data?.data) {
        realComment = response.data.data;
      } else if (response._id) {
        realComment = response;
      }

      console.log("✅ Extracted real comment:", realComment);

      if (realComment) {
        setComments(prev => {
          const filtered = prev.filter(c => !c._id.toString().startsWith('temp-'));
          const newComments = [...filtered, realComment];
          console.log("📝 Comments after replacing with real comment:", newComments);
          return newComments;
        });
      } else {
        console.log("⚠️ Could not extract real comment, keeping optimistic");
      }

      toast({ title: "Success", description: "Comment added successfully" });
      
    } catch (error) {
      console.error("❌ Exception adding comment:", error);
      setComments(prev => prev.filter(c => !c._id.toString().startsWith('temp-')));
      toast({ 
        title: "Error", 
        description: "Failed to add comment", 
        variant: "destructive" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  // 🔥 FIX 2: BULLETPROOF STATUS UPDATE
  const handleStatusUpdate = async (newStatus) => {
    if (!localTicket?._id) return;

    // 🚨 Set updating FIRST - this blocks the prop sync effect
    setUpdatingStatus(true);

    console.log("🔵 Attempting to update status:", {
      ticketId: localTicket._id,
      from: localTicket.status,
      to: newStatus,
      userRole: user?.role
    });

    // Save current state for rollback
    const previousTicket = { ...localTicket };
    const previousHistory = [...statusHistory];

    // Create optimistic entry
    const now = new Date().toISOString();
    const optimisticEntry = {
      status: newStatus,
      changed_by_role: user?.role === 'admin' ? 'admin' : 'user',
      changed_by: user?._id || 'unknown',
      at: now,
      note: `Status updated to ${STATUS_LABELS[newStatus] || newStatus}`
    };

    console.log("📝 Optimistic entry created:", optimisticEntry);

    // 🔥 FIX 3: OPTIMISTIC UPDATE WITH FRESH TIMESTAMP
    setLocalTicket(prev => ({
      ...prev,
      status: newStatus,
      updatedAt: now,
      updated_at: now,
      status_history: [...(prev.status_history || []), optimisticEntry]
    }));

    setStatusHistory(prev => {
      const newHistory = [...prev, optimisticEntry];
      return newHistory.sort((a, b) =>
        new Date(a.at || a.createdAt || 0) - new Date(b.at || b.createdAt || 0)
      );
    });

    try {
      console.log("📡 Calling updateTicketStatus API...");
      const { data: updatedTicket, error } = await updateTicketStatus(localTicket._id, {
        status: newStatus,
        note: `Status updated to ${STATUS_LABELS[newStatus] || newStatus}`
      });

      console.log("📡 API Response:", { updatedTicket, error });

      if (!error && updatedTicket) {
        console.log("✅ Status update successful");

        // 🔥 FIX 4: FORCE OVERWRITE WITH API TRUTH
        setLocalTicket(updatedTicket);
        
        // Update history if API returned it
        if (updatedTicket.status_history?.length > 0) {
          console.log("📋 Using status_history from API:", updatedTicket.status_history);
          setStatusHistory(updatedTicket.status_history);
        }

        if (onStatusUpdate) onStatusUpdate(updatedTicket);
        toast({ title: "Success", description: `Status updated to ${STATUS_LABELS[newStatus] || newStatus}` });
      } else {
        console.error("❌ Status update failed:", error);
        // Rollback on error
        setLocalTicket(previousTicket);
        setStatusHistory(previousHistory);
        toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
      }
    } catch (error) {
      console.error("❌ Exception in status update:", error);
      // Rollback on error
      setLocalTicket(previousTicket);
      setStatusHistory(previousHistory);
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    } finally {
      // 🚨 Clear updating status LAST
      setUpdatingStatus(false);
    }
  };

  if (!localTicket) return null;

  const isOverdue = localTicket.status === "overdue";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-lg p-0 flex flex-col"
        aria-describedby="ticket-detail-description"
      >
        <p id="ticket-detail-description" className="sr-only">
          Ticket details for {localTicket.form_name || localTicket.compliance_category}
        </p>

        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle className="text-lg">
                {localTicket.form_name || `${localTicket.compliance_category?.toUpperCase()} - ${localTicket.compliance_subtype}`}
              </SheetTitle>
              {localTicket.form_description && (
                <p className="text-sm text-muted-foreground mt-1">{localTicket.form_description}</p>
              )}
            </div>
            {localTicket.ticket_number && (
              <span className="text-xs font-mono bg-muted px-2 py-1 rounded shrink-0">
                {localTicket.ticket_number}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge variant="outline" className="text-xs">{localTicket.compliance_category?.toUpperCase()}</Badge>
            {localTicket.compliance_subtype && (
              <Badge variant="secondary" className="text-xs">{localTicket.compliance_subtype}</Badge>
            )}
            <Badge className={cn(
              isOverdue && "bg-destructive/10 text-destructive border-destructive/20",
              (localTicket.status === "filed" || localTicket.status === "approved") &&
              "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400"
            )}>
              {STATUS_LABELS[localTicket.status] || localTicket.status}
            </Badge>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Due Date</p>
                  <p className="font-medium">{safeFormatDate(localTicket.due_date, "dd MMM yyyy")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Financial Year</p>
                  <p className="font-medium">FY {localTicket.financial_year || "—"}</p>
                </div>
              </div>
              {localTicket.filing_metadata?.srn_number && (
                <div className="flex items-center gap-2 text-sm col-span-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">SRN Number</p>
                    <p className="font-medium text-xs">{localTicket.filing_metadata.srn_number}</p>
                  </div>
                </div>
              )}
            </div>

            <Separator />
            <SectionTabs activeSection={activeSection} onSectionChange={setActiveSection} commentsCount={comments.length} />

            {loading && activeSection === "comments" && (
              <div className="space-y-3 py-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            )}

            {activeSection === "timeline" && (
              <TicketTimeline
                currentTicket={localTicket}
                statusHistory={statusHistory}
                updatingStatus={updatingStatus}
                onStatusUpdate={handleStatusUpdate}
              />
            )}

            {activeSection === "comments" && !loading && (
              <TicketComments
                comments={comments}
                newComment={newComment}
                submitting={submitting}
                onCommentChange={setNewComment}
                onAddComment={handleAddComment}
              />
            )}

            {activeSection === "documents" && <TicketDocuments />}
          </div>
        </ScrollArea>

        {localTicket.filing_metadata && (
          <TicketFilingDetails filingMetadata={localTicket.filing_metadata} />
        )}
      </SheetContent>
    </Sheet>
  );
}