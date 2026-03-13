import { useState, useEffect } from "react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

// Import useTickets instead of useCompliance
import { useTickets } from "@/hooks/useTickets";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

import {
  Calendar,
  MessageSquare,
  FileText,
  Clock,
  Send,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from "lucide-react";

import { format, formatDistanceToNow, isValid } from "date-fns";

// RTK Query hooks for comments and ticket detail
import {
  useGetCommentsQuery,
  usePostCommentMutation,
  useGetTicketByIdQuery,
} from "@/Redux/Slices/api/complianceApi";
import { useGetTicketStatusHistoryQuery } from "@/Redux/Slices/api/complianceApi";

/* ================= Constants ================= */

const STATUS_PIPELINE = [
  "initiated",
  "pending_docs",
  "in_progress",
  "filed",
  "approved",
  "closed",
];

const STATUS_LABELS = {
  initiated: "Initiated",
  not_started: "Not Started",
  pending_docs: "Pending Docs",
  in_progress: "In Progress",
  filed: "Filed",
  approved: "Approved",
  overdue: "Overdue",
  ignored: "Ignored",
  closed: "Closed",
};

/* ================= Helper Functions ================= */

const safeFormatDate = (dateValue, formatString, fallback = "—") => {
  if (!dateValue) return fallback;
  
  try {
    const date = new Date(dateValue);
    if (isValid(date)) {
      return format(date, formatString);
    }
    return fallback;
  } catch (error) {
    console.warn("Invalid date value:", dateValue);
    return fallback;
  }
};

const safeFormatDistance = (dateValue, fallback = "—") => {
  if (!dateValue) return fallback;
  
  try {
    const date = new Date(dateValue);
    if (isValid(date)) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    return fallback;
  } catch (error) {
    console.warn("Invalid date value for distance:", dateValue);
    return fallback;
  }
};

// Helper to extract date from various possible paths
const extractDate = (entry, ticket) => {
  // Try different possible date fields
  const possibleDates = [
    entry.at,
    entry.createdAt,
    entry.created_at,
    entry.timestamp,
    entry.date,
    entry.updatedAt,
    ticket?.createdAt,
    ticket?.created_at,
    ticket?.updatedAt
  ];
  
  // Return the first valid date found
  for (const date of possibleDates) {
    if (date) {
      try {
        const d = new Date(date);
        if (isValid(d)) {
          return date;
        }
      } catch (e) {
        // Continue to next option
      }
    }
  }
  
  return null;
};

/* ================= Component ================= */

export function TicketDetailDrawer({
  ticket,
  open,
  onOpenChange,
  onStatusUpdate,
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  // Use useTickets hook
  const {
    getTicketComments,
    addTicketComment,
    updateTicketStatus
  } = useTickets();

  const [statusHistory, setStatusHistory] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [activeSection, setActiveSection] = useState("timeline");
  const [currentTicket, setCurrentTicket] = useState(ticket);

  // Update currentTicket when prop changes
  useEffect(() => {
    setCurrentTicket(ticket);

    if (!ticket) return;

    if (ticket.status_history && ticket.status_history.length > 0) {
      setStatusHistory(ticket.status_history);
    } else {
      // fallback initiated event
      setStatusHistory([
        {
          status: "initiated",
          changed_by_role: "admin",
          at: ticket.createdAt || ticket.created_at || new Date().toISOString(),
          note: "Ticket created"
        }
      ]);
    }
  }, [ticket]);

  /* ================= Effects ================= */

  // Load ticket data when drawer opens
  useEffect(() => {
    if (!currentTicket?._id || !open) return;

    const loadTicketData = async () => {
      setLoading(true);

      try {
        // Fetch comments using getTicketComments from useTickets
        const { data: ticketComments, error } = await getTicketComments(currentTicket._id);

        if (!error) {
          setComments(ticketComments || []);
        } else {
          console.error("Error fetching comments:", error);
          toast({
            title: "Error",
            description: "Failed to load comments",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error loading ticket data:", error);
        toast({
          title: "Error",
          description: "Failed to load ticket data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadTicketData();
  }, [currentTicket?._id, open, getTicketComments, toast]);

  /* ================= Handlers ================= */

  const handleAddComment = async () => {
    if (!currentTicket?._id || !newComment.trim()) return;

    setSubmitting(true);

    try {
      // Use addTicketComment from useTickets - note the payload structure
      const { data: comment, error } = await addTicketComment(currentTicket._id, {
        message: newComment.trim(),
        attachments: [] // Add attachments if needed
      });

      if (!error && comment) {
        setComments(prev => [...prev, comment]);
        setNewComment("");

        toast({
          title: "Success",
          description: "Comment added successfully",
        });
      } else {
        console.error("Error adding comment:", error);
        toast({
          title: "Error",
          description: "Failed to add comment",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    if (!currentTicket?._id) return;

    setUpdatingStatus(true);

    try {
      // Use updateTicketStatus from useTickets - note the payload structure
      const { data: updatedTicket, error } = await updateTicketStatus(
        currentTicket._id,
        {
          status: newStatus,
          note: `Status updated to ${STATUS_LABELS[newStatus]}`
        }
      );

      if (!error && updatedTicket) {
        // Update local state
        setCurrentTicket(updatedTicket);
        if (updatedTicket.status_history) {
          setStatusHistory(updatedTicket.status_history);
        }

        // Call parent callback if provided
        if (onStatusUpdate) {
          onStatusUpdate(updatedTicket);
        }

        toast({
          title: "Success",
          description: `Status updated to ${STATUS_LABELS[newStatus]}`,
        });
      } else {
        console.error("Error updating status:", error);
        toast({
          title: "Error",
          description: "Failed to update status",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (!currentTicket) return null;

  const currentStatusIndex = STATUS_PIPELINE.indexOf(currentTicket.status);
  const isOverdue = currentTicket.status === "overdue";

  /* ================= UI ================= */

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">

        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle className="text-lg">
                {currentTicket.form_name || `${currentTicket.compliance_category?.toUpperCase()} - ${currentTicket.compliance_subtype}`}
              </SheetTitle>

              {currentTicket.form_description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {currentTicket.form_description}
                </p>
              )}
            </div>

            {currentTicket.ticket_number && (
              <span className="text-xs font-mono bg-muted px-2 py-1 rounded shrink-0">
                {currentTicket.ticket_number}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <Badge variant="outline" className="text-xs">
              {currentTicket.compliance_category?.toUpperCase()}
            </Badge>

            {currentTicket.compliance_subtype && (
              <Badge variant="secondary" className="text-xs">
                {currentTicket.compliance_subtype}
              </Badge>
            )}

            <Badge
              className={
                isOverdue
                  ? "bg-destructive/10 text-destructive border-destructive/20"
                  : currentTicket.status === "filed" || currentTicket.status === "approved"
                    ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-primary/10 text-primary border-primary/20"
              }
            >
              {STATUS_LABELS[currentTicket.status] || currentTicket.status}
            </Badge>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-5">

            {/* Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-[10px] text-muted-foreground">
                    Due Date
                  </p>
                  <p className="font-medium">
                    {safeFormatDate(currentTicket.due_date, "dd MMM yyyy")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-[10px] text-muted-foreground">
                    Financial Year
                  </p>
                  <p className="font-medium">
                    FY {currentTicket.financial_year || "—"}
                  </p>
                </div>
              </div>

              {currentTicket.filing_metadata?.srn_number && (
                <div className="flex items-center gap-2 text-sm col-span-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">
                      SRN Number
                    </p>
                    <p className="font-medium text-xs">
                      {currentTicket.filing_metadata.srn_number}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Section Tabs */}
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              {[
                { key: "timeline", label: "Timeline", icon: Clock },
                { key: "comments", label: "Comments", icon: MessageSquare },
                { key: "documents", label: "Documents", icon: FileText },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveSection(key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    activeSection === key
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}

                  {key === "comments" && comments.length > 0 && (
                    <span className="ml-1 bg-primary/10 text-primary text-[10px] px-1.5 rounded-full">
                      {comments.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Loading State */}
            {loading && activeSection === "comments" && (
              <div className="space-y-3 py-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            )}

            {/* Timeline */}
            {activeSection === "timeline" && (
              <div className="space-y-3">

                {/* Status Pipeline */}
                <div className="flex items-center gap-1 overflow-x-auto py-2">
                  {STATUS_PIPELINE.map((status, i) => {
                    const isActive = status === currentTicket.status;
                    const isPast = currentStatusIndex > i;

                    return (
                      <div key={status} className="flex items-center">
                        <button
                          onClick={() => {
                            if (user?.role === 'admin' && !isActive && status !== currentTicket.status) {
                              handleStatusUpdate(status);
                            }
                          }}
                          disabled={updatingStatus || (user?.role !== 'admin')}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap border transition-colors ${
                            isActive
                              ? isOverdue
                                ? "bg-destructive/10 text-destructive border-destructive/30"
                                : "bg-primary/10 text-primary border-primary/30"
                              : isPast
                                ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                                : "bg-muted text-muted-foreground border-border hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                          } ${
                            user?.role === 'admin' && !isActive ? 'cursor-pointer' : 'cursor-default'
                          }`}
                        >
                          {isPast && (
                            <CheckCircle2 className="h-3 w-3 inline mr-1" />
                          )}
                          {STATUS_LABELS[status]}
                        </button>

                        {i < STATUS_PIPELINE.length - 1 && (
                          <ArrowRight className="h-3 w-3 text-muted-foreground mx-0.5 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Quick Status Update (for admins) */}
                {user?.role === 'admin' && (
                  <div className="flex gap-2 mt-2">
                    <select
                      className="flex-1 text-xs border rounded-md px-2 py-1"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleStatusUpdate(e.target.value);
                        }
                      }}
                      disabled={updatingStatus}
                    >
                      <option value="">Update Status...</option>
                      {STATUS_PIPELINE.map(status => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                    {updatingStatus && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                )}

                {/* Status History */}
                {statusHistory.length > 0 ? (
                  <div className="space-y-3 border-l-2 border-border ml-3 pl-4 mt-4">
                    {[...statusHistory]
                      .sort((a, b) => {
                        const dateA = new Date(a.at || a.createdAt || 0);
                        const dateB = new Date(b.at || b.createdAt || 0);
                        return dateA - dateB;
                      })
                      .map((entry, index) => {
                        // Get the date directly from the entry
                        const entryDate = entry.at || entry.createdAt || entry.created_at;
                        
                        // Format the date for display
                        let formattedDate = "—";
                        let relativeTime = "—";
                        
                        if (entryDate) {
                          try {
                            const date = new Date(entryDate);
                            if (isValid(date)) {
                              formattedDate = format(date, "dd MMM yyyy, HH:mm");
                              relativeTime = formatDistanceToNow(date, { addSuffix: true });
                            }
                          } catch (error) {
                            console.warn("Error formatting date:", error);
                          }
                        }
                        
                        return (
                          <div key={entry._id || index} className="relative">
                            <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />

                            <p className="text-xs font-medium">
                              <span className={entry.status === 'overdue' ? 'text-destructive' : ''}>
                                {STATUS_LABELS[entry.status] || entry.status}
                              </span>
                            </p>

                            {entry.note && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {entry.note}
                              </p>
                            )}

                            <div className="flex flex-col mt-1">
                              <p className="text-[10px] text-muted-foreground">
                                {entry.changed_by_role === 'admin' ? 'Accountant' : 'Client'} • {formattedDate}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {relativeTime}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      No status updates recorded yet
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Comments */}
            {activeSection === "comments" && !loading && (
              <div className="space-y-4">

                {comments.length > 0 ? (
                  <div className="space-y-3">
                    {comments.map((comment) => {
                      // Format comment date
                      const commentDate = comment.createdAt || comment.created_at || comment.timestamp;
                      let formattedCommentDate = "—";
                      let commentRelativeTime = "—";
                      
                      if (commentDate) {
                        try {
                          const date = new Date(commentDate);
                          if (isValid(date)) {
                            formattedCommentDate = format(date, "dd MMM yyyy, HH:mm");
                            commentRelativeTime = formatDistanceToNow(date, { addSuffix: true });
                          }
                        } catch (error) {
                          console.warn("Error formatting comment date:", error);
                        }
                      }
                      
                      return (
                        <div
                          key={comment._id}
                          className="p-3 rounded-lg bg-muted/50 border"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">
                                {comment.user_id?.name || comment.user_email || "User"}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1 py-0"
                              >
                                {comment.role === 'admin' ? 'Accountant' : 'Client'}
                              </Badge>
                            </div>

                            <span className="text-[10px] text-muted-foreground" title={formattedCommentDate}>
                              {commentRelativeTime}
                            </span>
                          </div>

                          <p className="text-sm whitespace-pre-wrap">
                            {comment.message}
                          </p>

                          {comment.attachments && comment.attachments.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {comment.attachments.map((att, idx) => (
                                <Badge 
                                  key={idx} 
                                  variant="outline" 
                                  className="text-[9px] cursor-pointer hover:bg-primary/10"
                                >
                                  📎 {typeof att === 'string' ? att.split('/').pop() : 'Attachment'}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      No comments yet. Start the conversation.
                    </p>
                  </div>
                )}

                {/* Add Comment */}
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[60px] text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                  />

                  <Button
                    size="icon"
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || submitting}
                    className="shrink-0 self-end"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <p className="text-[10px] text-muted-foreground">
                  Press Ctrl+Enter to send
                </p>

              </div>
            )}

            {/* Documents */}
            {activeSection === "documents" && (
              <div className="text-center py-8">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium">
                  No documents uploaded yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload filed returns, challans, ARNs and supporting documents
                </p>
                <Button variant="outline" size="sm" className="mt-4">
                  Upload Document
                </Button>
              </div>
            )}

          </div>
        </ScrollArea>

        {/* Footer with filing metadata if available */}
        {currentTicket.filing_metadata && (currentTicket.filing_metadata.acknowledgement_number || currentTicket.filing_metadata.filing_fee) && (
          <div className="border-t p-4 bg-muted/20">
            <p className="text-xs font-medium mb-2">Filing Details</p>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              {currentTicket.filing_metadata.acknowledgement_number && (
                <div>
                  <span className="text-muted-foreground">Ack. No:</span>
                  <span className="ml-1 font-mono">{currentTicket.filing_metadata.acknowledgement_number}</span>
                </div>
              )}
              {currentTicket.filing_metadata.filing_fee && (
                <div>
                  <span className="text-muted-foreground">Fee:</span>
                  <span className="ml-1">₹{currentTicket.filing_metadata.filing_fee}</span>
                </div>
              )}
              {currentTicket.filing_metadata.late_fee && (
                <div>
                  <span className="text-muted-foreground">Late Fee:</span>
                  <span className="ml-1 text-destructive">₹{currentTicket.filing_metadata.late_fee}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}