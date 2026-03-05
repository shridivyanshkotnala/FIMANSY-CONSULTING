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

/*
  ⚠️ SUPABASE REMOVED — COMMENTED OUT (DO NOT DELETE)
  🔄 FUTURE: Replace with Redux RTK Query endpoints
  import { supabase } from "@/integrations/supabase/client";
*/

// ⚠️ CONTEXT API SHIM — MARKED FOR REMOVAL
// 🔄 FUTURE: Replace with Redux selectors
import { useAuth } from "@/hooks/useAuth";

import {
  Calendar,
  Building2,
  User,
  MessageSquare,
  FileText,
  Clock,
  Send,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

import { format } from "date-fns";

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

    // Comments are provided by RTK Query; local state is kept in `localComments`.
    // Do nothing here; data will be set from the query.

  export function TicketDetailDrawer({ ticket, open, onOpenChange }) {
    useAuth();
    const [newComment, setNewComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [activeSection, setActiveSection] = useState("timeline");

    // queries — MongoDB lean() docs carry _id not id; support both
    const ticketId = ticket?._id || ticket?.id;
    const { data: comments = [], isLoading: _commentsLoading } = useGetCommentsQuery(ticketId, { skip: !ticketId });
    const { data: ticketDetail } = useGetTicketByIdQuery(ticketId, { skip: !ticketId });
    const { data: fetchedStatusHistory = [], isLoading: _statusLoading } = useGetTicketStatusHistoryQuery(ticketId, { skip: !ticketId });
    const [postComment, { isLoading: _posting }] = usePostCommentMutation();

    useEffect(() => {
      if (!ticket || !open) return;
      // keep local derived state in sync if we ever use it later; currently components read queries directly
    }, [ticketId, open, fetchedStatusHistory, comments, ticket]);

  const handleAddComment = async () => {
    if (!ticket || !newComment.trim()) return;
    setSubmitting(true);
    /*
      ⚠️ SUPABASE REMOVED — COMMENTED OUT (DO NOT DELETE)
      🔄 FUTURE: Replace with Redux RTK Query mutation

      try {
        await supabase.from("compliance_comments").insert({
          obligation_id: ticket.id,
          organization_id: ticket.organization_id,
          user_id: user?.id,
          user_email: user?.email || "User",
          user_role: "user",
          content: newComment.trim(),
        });
        setNewComment("");
        fetchComments();
      } catch {
        // silently fail
      } finally {
        setSubmitting(false);
      }
    */

    try {
      await postComment({
        ticketId: ticket._id || ticket.id,
        body: { message: newComment.trim(), attachments: [] },
      }).unwrap();

      setNewComment("");
    } catch (err) {
      // log and optionally show toast; keep optimistic UI only via RTK update
      console.error("Post comment failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!ticket) return null;

  const currentStatusIndex =
    STATUS_PIPELINE.indexOf(ticket.status);

  const isOverdue = ticket.status === "overdue";

  /* ================= UI ================= */

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">

        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle className="text-lg">
                {ticket.form_name}
              </SheetTitle>

              {ticket.form_description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {ticket.form_description}
                </p>
              )}
            </div>

            {ticket.ticket_number && (
              <span className="text-xs font-mono bg-muted px-2 py-1 rounded shrink-0">
                {ticket.ticket_number}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {ticket.primary_tag && (
              <Badge variant="outline" className="text-xs">
                {ticket.primary_tag}
              </Badge>
            )}

            {ticket.secondary_tag && (
              <Badge variant="secondary" className="text-xs">
                {ticket.secondary_tag}
              </Badge>
            )}

            <Badge
              className={
                isOverdue
                  ? "bg-destructive/10 text-destructive border-destructive/20"
                  : "bg-primary/10 text-primary border-primary/20"
              }
            >
              {STATUS_LABELS[ticket.status] ||
                ticket.status}
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
                    {format(
                      new Date(ticket.due_date),
                      "dd MMM yyyy"
                    )}
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
                    FY {ticket.financial_year || "—"}
                  </p>
                </div>
              </div>

              {/* Company Info — prefer backend ticket detail when available */}
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Company</p>
                  <p className="font-medium truncate">
                    {ticket.company_name || ticketDetail?.organization?.name || ticket.organization_name || "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-[10px] text-muted-foreground">
                    Assigned To
                  </p>
                  <p className="font-medium">
                    Accountant
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Section Tabs */}
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              {[
                { key: "timeline", label: "Timeline", icon: Clock },
                { key: "comments", label: "Comments", icon: MessageSquare },
                { key: "documents", label: "Documents", icon: FileText },
              ].map(({ key, label, icon }) => {
                const Icon = icon;
                return (
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

                    {key === "comments" &&
                      comments.length > 0 && (
                        <span className="ml-1 bg-primary/10 text-primary text-[10px] px-1.5 rounded-full">
                          {comments.length}
                        </span>
                      )}
                  </button>
                );
              })}
            </div>

            {/* Timeline */}
            {activeSection === "timeline" && (
              <div className="space-y-3">

                <div className="flex items-center gap-1 overflow-x-auto py-2">
                  {STATUS_PIPELINE.map((status, i) => {
                    const isActive =
                      status === ticket.status;
                    const isPast =
                      currentStatusIndex > i;

                    return (
                      <div
                        key={status}
                        className="flex items-center"
                      >
                        <div
                          className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap border ${
                            isActive
                              ? isOverdue
                                ? "bg-destructive/10 text-destructive border-destructive/30"
                                : "bg-primary/10 text-primary border-primary/30"
                              : isPast
                              ? "bg-success/10 text-success border-success/30"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {isPast && (
                            <CheckCircle2 className="h-3 w-3 inline mr-1" />
                          )}
                          {STATUS_LABELS[status]}
                        </div>

                        {i <
                          STATUS_PIPELINE.length - 1 && (
                          <ArrowRight className="h-3 w-3 text-muted-foreground mx-0.5 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {(() => {
                  // Build a full ordered timeline from the canonical pipeline.
                  const server = Array.isArray(fetchedStatusHistory) ? fetchedStatusHistory : [];
                  const serverMap = server.reduce((m, h) => {
                    if (h && h.status) m[h.status] = h;
                    return m;
                  }, {});

                  const createdAt = ticket.created_at || ticket.createdAt || ticket?.ticket?.created_at || ticket?.ticket?.createdAt;
                  const lastActivity = ticket.last_activity_at || ticket.updated_at || ticket?.ticket?.last_activity_at || ticket?.ticket?.updated_at;

                  const built = STATUS_PIPELINE.map((status) => {
                    const h = serverMap[status];

                    if (h) {
                      return {
                        status,
                        at: h.at || h.created_at || h.updated_at || null,
                        actor: h.changed_by_role || (h.changed_by && h.changed_by.name) || null,
                        notes: h.note || h.notes || null,
                      };
                    }

                    // synthesize Initiated or current status when server history missing
                    if (status === "initiated") {
                      return { status: "initiated", at: createdAt || null, actor: "System", notes: null };
                    }

                    if (status === ticket.status) {
                      return { status, at: lastActivity || null, actor: "Accountant", notes: null };
                    }

                    // future/unreached status
                    return { status, at: null, actor: null, notes: null };
                  });

                  const anyTimestamps = built.some((e) => e.at);
                  if (!anyTimestamps) {
                    return (
                      <div className="text-center py-6">
                        <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">No status timestamps available yet</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3 border-l-2 border-border ml-3 pl-4">
                      {built.map((entry, idx) => (
                        <div key={entry.status || idx} className="relative">
                          <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />

                          <p className="text-xs font-medium">
                            {STATUS_LABELS[entry.status] || entry.status}
                          </p>

                          {entry.notes && (
                            <p className="text-xs text-muted-foreground mt-0.5">{entry.notes}</p>
                          )}

                          {entry.at ? (
                            <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(entry.at), "dd MMM yyyy, HH:mm")}  {entry.actor || "System"}</p>
                          ) : (
                            <p className="text-[10px] text-muted-foreground mt-1">—</p>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Comments */}
            {activeSection === "comments" && (
              <div className="space-y-4">

                {comments.length > 0 ? (
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <div
                        key={comment._id || comment.id}
                        className="p-3 rounded-lg bg-muted/50 border"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">
                              {comment.user_email || comment.author_email || comment.author?.email || "User"}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1 py-0"
                            >
                              {comment.user_role || comment.role || comment.author_role || "user"}
                            </Badge>
                          </div>

                          <span className="text-[10px] text-muted-foreground">
                            {format(
                              new Date(comment.createdAt || comment.created_at || comment.created_at || comment.createdAt),
                              "dd MMM, HH:mm"
                            )}
                          </span>
                        </div>

                        <p className="text-sm">
                          {comment.message || comment.content || comment.body || ""}
                        </p>
                      </div>
                    ))}
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
                    onChange={(e) =>
                      setNewComment(e.target.value)
                    }
                    className="min-h-[60px] text-sm"
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        (e.metaKey || e.ctrlKey)
                      ) {
                        handleAddComment();
                      }
                    }}
                  />

                  <Button
                    size="icon"
                    onClick={handleAddComment}
                    disabled={
                      !newComment.trim() ||
                      submitting
                    }
                    className="shrink-0 self-end"
                  >
                    <Send className="h-4 w-4" />
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
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                >
                  Upload Document
                </Button>
              </div>
            )}

          </div>
        </ScrollArea>

      </SheetContent>
    </Sheet>
  );
}