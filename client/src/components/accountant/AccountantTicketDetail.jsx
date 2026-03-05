import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  useGetTicketByIdQuery,
  useGetCommentsQuery,
  useGetTicketMetaQuery,
  usePostCommentMutation,
  useMarkTicketReadMutation,
  useUpdateTicketStatusMutation,
  useGetTicketStatusHistoryQuery,
} from "@/Redux/Slices/api/complianceApi";
import { closeDrawer } from "@/Redux/Slices/complianceSlice";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  Calendar,
  CheckCircle2,
  FileText,
  Lock,
  MessageSquare,
  Shield,
  Upload,
  ArrowRight,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { STATUS_CONFIG } from "./compliancecomp/constants";

/* Removed TS Record typing */
const STATUS_TRANSITIONS = {
  initiated: ["pending_docs"],
  not_started: ["initiated"],
  pending_docs: ["in_progress"],
  in_progress: ["filed"],
  filed: ["approved"],
  overdue: ["in_progress", "pending_docs"],
  approved: ["closed"],
  closed: [],
};

/* Removed interface Props */

export function AccountantTicketDetail({ ticket: ticketProp, open, onOpenChange, onStatusChange }) {
  // ticket is re-assigned below after merging with server data; keep a safe default
  // so any pre-hook code that touches it never crashes on undefined.
  let ticket = ticketProp || {};

  const [newComment, setNewComment] = useState("");

  // Redux access to drawer state
  const dispatch = useDispatch();
  const { selectedTicketId, open: drawerOpen } = useSelector((state) => state.complianceUi.drawer);

  // RTK Query hooks — fetch only when we have a selected ticket and drawer is open
  const { data: ticketData, isLoading: _ticketLoading } = useGetTicketByIdQuery(selectedTicketId, { skip: !selectedTicketId || !drawerOpen });
  const { data: commentsData = [], refetch: refetchComments } = useGetCommentsQuery(selectedTicketId, { skip: !selectedTicketId || !drawerOpen });
  const { data: meta } = useGetTicketMetaQuery(selectedTicketId, { skip: !selectedTicketId || !drawerOpen, pollingInterval: drawerOpen ? 20000 : 0 });
  const { data: statusHistory = [] } = useGetTicketStatusHistoryQuery(selectedTicketId, { skip: !selectedTicketId || !drawerOpen });
  const [postComment, { isLoading: posting }] = usePostCommentMutation();
  const [markRead] = useMarkTicketReadMutation();

  // Local refs for meta polling comparison
  const lastMetaRef = useRef(null);

  useEffect(() => {
    if (!meta) return;
    if (lastMetaRef.current && meta.last_comment_at !== lastMetaRef.current) {
      // avoid unhandled rejections from refetch
      refetchComments?.().catch((err) => console.debug("refetchComments failed:", err));
    }
    lastMetaRef.current = meta.last_comment_at;
  }, [meta, refetchComments]);

  // Mark as read when drawer opens
  useEffect(() => {
    if (drawerOpen && selectedTicketId) {
      // call mutation and swallow errors to avoid unhandled promise rejections
      (async () => {
        try {
          const p = markRead(selectedTicketId);
          if (p && typeof p.unwrap === "function") {
            await p.unwrap();
          } else {
            await p;
          }
        } catch (e) {
          // Log for debugging but don't surface to UI here
          console.debug("markRead failed:", e);
        }
      })();
    }
  }, [drawerOpen, selectedTicketId, markRead]);

  // If we have fetched ticket detail from the server, explicitly map all nested fields.
  // Server response: { ticket: {...}, organization: { name, cin, gstin, pan, ... }, obligation: { form_description, ... } }
  if (ticketData) {
    const t   = ticketData.ticket       || {};
    const org = ticketData.organization || {};
    const obl = ticketData.obligation   || {};

    ticket = {
      ...ticket, // keep list-level fields as base (ticket_number, etc.)
      // core ticket
      status:           t.status           || ticket.status,
      due_date:         t.due_date         || obl.due_date        || ticket.due_date,
      financial_year:   t.financial_year   || obl.financial_year  || ticket.financial_year,
      filing_metadata:  t.filing_metadata  || ticket.filing_metadata,
      last_activity_at: t.last_activity_at || ticket.last_activity_at,
      created_at:       t.created_at       || ticket.created_at   || ticket.createdAt,
      status_history:   t.status_history   || ticket.status_history || [],
      // canonical tag fields from ticket or obligation
      category_tag: t.category_tag || obl.category_tag || ticket.category_tag,
      subtag:       t.subtag       || obl.subtag       || ticket.subtag,
      // derived display fields expected by UI
      form_name:        t.subtag       || obl.subtag       || ticket.subtag       || ticket.form_name,
      form_description: obl.form_description || ticket.form_description,
      primary_tag:   (t.category_tag || obl.category_tag || ticket.category_tag || "").toUpperCase(),
      secondary_tag:  t.subtag       || obl.subtag       || ticket.subtag        || ticket.secondary_tag,
      // ticket_number: generated in list view; keep or re-derive
      ticket_number: ticket.ticket_number || (t.id ? `TKT-${String(t.id).slice(-4).toUpperCase()}` : null),
      // organisation fields — org.name is the company name
      organization_name:       org.name                   || ticket.organization_id?.name || ticket.organization_name,
      company_name:            org.name                   || ticket.company_name,
      cin:                     org.cin                    || ticket.cin,
      gstin:                   org.gstin                  || ticket.gstin,
      pan:                     org.pan                    || ticket.pan,
      tan:                     org.tan                    || ticket.tan,
      company_type:            org.company_type           || ticket.company_type,
      date_of_incorporation:   org.date_of_incorporation  || ticket.date_of_incorporation,
      registered_address:      org.registered_address     || ticket.registered_address,
    };
  }

  // No mock comments — real comments come from RTK Query (getComments)

  // Local optimistic status to reflect immediate UI change while mutation is in-flight
  const [optimisticStatus, setOptimisticStatus] = useState(null);

  // Mutation to update ticket status
  const [updateTicketStatus, updateStatusMeta] = useUpdateTicketStatusMutation();
  const updatingStatus = updateStatusMeta?.isLoading;

  const [uploadedDocs] = useState([
    { name: "GSTR-3B_Feb2026.pdf", status: "verified", uploadedAt: "28 Feb" },
    { name: "Sales_Register.xlsx", status: "pending", uploadedAt: "28 Feb" },
  ]);

  // If neither Redux drawer nor prop ticket, nothing to show
  const shouldRender = !!selectedTicketId || !!ticketProp;
  if (!shouldRender) return null;

  // Ensure ticket always has a valid status for STATUS_CONFIG lookup
  if (!ticket.status) ticket = { ...ticket, status: "not_started" };

  // Safe formatter to avoid RangeError for invalid dates
  const safeFormat = (value, fmt) => {
    try {
      if (!value) return "";
      const d = new Date(value);
      if (isNaN(d.getTime())) return "";
      return format(d, fmt);
    } catch {
      return "";
    }
  };

  // Helper: post a comment using RTK mutation
  const handlePostComment = async () => {
    if (!newComment.trim() || !selectedTicketId) return;

    try {
      await postComment({ ticketId: selectedTicketId, body: { message: newComment.trim() } }).unwrap();
      setNewComment("");
    } catch (err) {
      console.error("Post comment failed:", err);
    }
  };

  const formatCommentAt = (c) => {
    const d = c.createdAt || c.created_at || c.created_at;
    try {
      return d ? format(new Date(d), "dd MMM, HH:mm") : "";
    } catch {
      return "";
    }
  };

  // Derived comment list: prefer server comments, fall back to local mock comments
  // commentsData is the array returned directly by RTK transformResponse
  const commentsToRender = Array.isArray(commentsData) ? commentsData : [];

  const handleUpdateStatus = async (nextStatus) => {
    const id = selectedTicketId || ticket.id;
    if (!id) return;

    setOptimisticStatus(nextStatus);

    try {
      await updateTicketStatus({ ticketId: id, status: nextStatus }).unwrap();
      if (typeof onStatusChange === "function") onStatusChange(id, nextStatus);
    } catch (err) {
      console.error("Failed to update status:", err);
      setOptimisticStatus(null);
    }
  };

  const mockDirectors = [
    { name: "Rahul Sharma", designation: "Managing Director", din: "01234567", email: "rahul@stratzi.com", phone: "+91 98765 43210", dsc_expiry: "15 Dec 2026", is_active: true },
    { name: "Priya Mehta", designation: "Director", din: "07654321", email: "priya@stratzi.com", phone: "+91 98765 12345", dsc_expiry: "22 Mar 2027", is_active: true },
    { name: "Amit Patel", designation: "Independent Director", din: "04567890", email: "amit.p@gmail.com", phone: null, dsc_expiry: null, is_active: false },
  ];

  const cfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.not_started;
  const allowedTransitions = STATUS_TRANSITIONS[ticket.status] || [];

  const effectiveOpen = typeof drawerOpen === "boolean" ? drawerOpen : open;

  const handleOpenChange = (val) => {
    if (!val) {
      // close via Redux
      dispatch(closeDrawer());
    }
    if (typeof onOpenChange === "function") onOpenChange(val);
  };

  return (
    <Sheet open={effectiveOpen} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="space-y-3 pb-4">
          {/* Row 1: status badge + tag badges + ticket number */}
          <div className="flex items-center gap-2 flex-wrap pr-6">
            <Badge className={cfg.className}>{cfg.label}</Badge>
            {ticket.primary_tag && (
              <Badge variant="outline" className="text-xs font-medium">
                {ticket.primary_tag}
              </Badge>
            )}
            {ticket.secondary_tag && (
              <Badge variant="secondary" className="text-xs">
                {ticket.secondary_tag}
              </Badge>
            )}
            {ticket.ticket_number && (
              <span className="ml-auto text-xs font-mono text-muted-foreground">
                {ticket.ticket_number}
              </span>
            )}
          </div>

          {/* Row 2: form title */}
          <SheetTitle className="text-lg leading-tight">
            {ticket.form_name || ticket.subtag || ticket.secondary_tag || "—"}
          </SheetTitle>

          {/* Row 3: description */}
          {ticket.form_description && (
            <p className="text-sm text-muted-foreground">{ticket.form_description}</p>
          )}

          {/* Row 4: company + due date */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {ticket.organization_name || ticket.company_name || "—"}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Due: {safeFormat(ticket.due_date, "dd MMM yyyy") || "—"}
            </span>
          </div>
        </SheetHeader>

        <Tabs defaultValue="summary" className="mt-2">
          <TabsList className="grid w-full grid-cols-4 text-xs">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="documents">Docs</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="thread">Thread</TabsTrigger>
          </TabsList>

          {/* ================= SUMMARY ================= */}

          <TabsContent value="summary" className="space-y-4 mt-4">

            {/* Compliance Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <FileText className="h-4 w-4" /> Compliance Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Category</p>
                    <p className="font-medium">
                      {ticket.primary_tag || ticket.category_tag?.toUpperCase() || "—"}
                      {" / "}
                      {ticket.secondary_tag || ticket.subtag || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Financial Year</p>
                    <p className="font-medium">FY {ticket.financial_year || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Due Date</p>
                    <p className="font-medium">
                      {safeFormat(ticket.due_date, "dd MMM yyyy") || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Ticket</p>
                    <p className="font-medium font-mono text-xs">
                      {ticket.ticket_number || "\u2014"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Company Profile */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" /> Company Profile
                </CardTitle>
              </CardHeader>

              <CardContent className="p-4 pt-0 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">

                  <div>
                    <p className="text-muted-foreground text-xs">Organization</p>
                    <p className="font-medium">{ticket.organization_name || ticket.company_name || ticket.organization_id?.name || "—"}</p>
                  </div>

                  <div>
                    <p className="text-muted-foreground text-xs">Company Name</p>
                    <p className="font-medium">
                      {ticket.company_name || ticket.organization_name || ticket.organization_id?.name || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground text-xs">CIN</p>
                    <p className="font-medium font-mono text-xs">
                      {ticket.cin || "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground text-xs">GSTIN</p>
                    <p className="font-medium font-mono text-xs">
                      {ticket.gstin || "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground text-xs">PAN</p>
                    <p className="font-medium font-mono text-xs">
                      {ticket.pan || "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground text-xs">TAN</p>
                    <p className="font-medium font-mono text-xs">
                      {ticket.tan || "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground text-xs">Company Type</p>
                    <p className="font-medium capitalize">
                      {ticket.company_type?.replace(/_/g, " ") || "Private Limited"}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground text-xs">Date of Incorporation</p>
                    <p className="font-medium">
                      {ticket.date_of_incorporation
                        ? safeFormat(ticket.date_of_incorporation, "dd MMM yyyy")
                        : "\u2014"}
                    </p>
                  </div>

                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">Registered Address</p>
                    <p className="font-medium text-xs">
                      {ticket.registered_address || "\u2014"}
                    </p>
                  </div>

                </div>
              </CardContent>
            </Card>

            {/* Directors */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Shield className="h-4 w-4" /> Directors ({mockDirectors.length})
                </CardTitle>
              </CardHeader>

              <CardContent className="p-4 pt-0 space-y-3">
                {mockDirectors.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No directors on record
                  </p>
                ) : (
                  mockDirectors.map((dir, i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between p-3 border rounded-lg bg-muted/30"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{dir.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {dir.designation}{" · "}DIN: {dir.din}
                        </p>
                        {dir.dsc_expiry && (
                          <p className="text-[10px] text-muted-foreground">
                            DSC Expiry: {dir.dsc_expiry}
                          </p>
                        )}
                      </div>

                      <div className="text-right space-y-1">
                        {dir.email && (
                          <p className="text-[10px] text-muted-foreground">
                            {dir.email}
                          </p>
                        )}
                        {dir.phone && (
                          <p className="text-[10px] text-muted-foreground">
                            {dir.phone}
                          </p>
                        )}

                        <Badge
                          className={
                            dir.is_active
                              ? "bg-success/10 text-success border-success/20 text-[10px]"
                              : "bg-muted text-muted-foreground text-[10px]"
                          }
                        >
                          {dir.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================= DOCUMENTS ================= */}

          <TabsContent value="documents" className="space-y-4 mt-4">
            <div className="space-y-2">
              {uploadedDocs.map((doc, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 border rounded-lg bg-card"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{doc.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Uploaded {doc.uploadedAt}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {doc.status === "verified" ? (
                      <Badge className="bg-success/10 text-success border-success/20 text-[10px]">
                        <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                        Verified
                      </Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                      >
                        Verify
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                Upload Return
              </Button>

              <Button variant="outline" className="flex-1 gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Request Docs
              </Button>
            </div>
          </TabsContent>

          {/* ================= STATUS ================= */}

          <TabsContent value="status" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Status Pipeline
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">
                    Current:
                  </span>
                  <Badge className={cfg.className}>
                    {cfg.label}
                  </Badge>
                </div>

                {allowedTransitions.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Move to:
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {allowedTransitions.map((next) => {
                        const nextCfg = STATUS_CONFIG[next];
                        const isPending = updatingStatus && optimisticStatus === next;
                        const isClose = next === "closed";

                        return (
                          <Button
                            key={next}
                            variant={isClose ? "destructive" : "outline"}
                            size="sm"
                            className={isClose ? "gap-1.5" : "gap-1.5"}
                            disabled={updatingStatus && optimisticStatus !== next}
                            onClick={() => handleUpdateStatus(next)}
                          >
                            {isClose ? <Lock className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
                            {isPending ? `${nextCfg?.label || next}…` : (isClose ? "Mark as Closed" : (nextCfg?.label || next))}
                          </Button>
                        );
                      })}
                    </div>

                    {ticket.status === "approved" && (
                      <p className="text-[11px] text-muted-foreground">
                        Closing archives the ticket and removes it from the active queue.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Lock className="h-3.5 w-3.5" />
                    <span>
                      {ticket.status === "closed" ? "Ticket is closed and archived." : "No further transitions available."}
                    </span>
                  </div>
                )}

                <Separator />

                {/* Timeline */}
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Timeline
                  </p>

                  {(() => {
                      const PIPELINE = ["initiated", "pending_docs", "in_progress", "filed", "approved", "closed"];
                      const server = Array.isArray(statusHistory) ? statusHistory : [];
                      const serverMap = server.reduce((m, h) => { if (h && h.status) m[h.status] = h; return m; }, {});
                      const createdAt = ticket.created_at || ticket.createdAt;
                      const lastActivity = ticket.updated_at || ticket.last_activity_at || ticket.lastActivity;

                      const built = PIPELINE.map((status) => {
                        const h = serverMap[status];
                        if (h) {
                          return { status, at: h.at || h.created_at || h.updated_at || null, by: h.changed_by_role ? (h.changed_by_role === "client" ? "Client" : "Accountant") : (h.changed_by?.name || "System") };
                        }

                        if (status === "initiated") return { status: "initiated", at: createdAt || null, by: "System" };
                        if (status === ticket.status) return { status, at: lastActivity || null, by: "Accountant" };
                        return { status, at: null, by: null };
                      });

                      // Estimate missing timestamps up to current status
                      const currentIndex = PIPELINE.indexOf(ticket.status);
                      const firstTs = createdAt ? new Date(createdAt) : null;
                      const lastTs = lastActivity ? new Date(lastActivity) : null;
                      if (firstTs && lastTs && currentIndex > 0) {
                        for (let i = 0; i <= currentIndex; i++) {
                          if (!built[i].at) {
                            const t = firstTs.getTime() + ((lastTs.getTime() - firstTs.getTime()) * (i / Math.max(1, currentIndex)));
                            built[i].at = new Date(t).toISOString();
                            built[i].estimated = true;
                          }
                        }
                      }

                      return built.map((entry, i) => (
                        <div key={entry.status || i} className="flex items-start gap-3">
                          <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />

                          <div>
                            <p className="text-xs font-medium">{STATUS_CONFIG[entry.status]?.label || entry.status}</p>
                            <p className="text-[10px] text-muted-foreground">{entry.at ? safeFormat(entry.at, "dd MMM, HH:mm") + " · " + (entry.by || "System") + (entry.estimated ? " (estimated)" : "") : "—"}</p>
                          </div>
                        </div>
                      ));
                    })()}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================= THREAD ================= */}

          <TabsContent value="thread" className="space-y-4 mt-4">
            <div className="space-y-3">
              {commentsToRender.length === 0 && (
                <div className="text-center py-6">
                  <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No comments yet. Start the conversation.</p>
                </div>
              )}
              {commentsToRender.map((c, i) => {
                const roleLabel = c.author_role === "client" ? "Client" : c.author_role === "accountant" ? "Accountant" : (c.role === "user" ? "Client" : "Accountant");
                const displayName = c.author_name || c.author_email || c.user_email || roleLabel;
                const by = displayName;
                const at = formatCommentAt(c) || c.at || "";
                const text = c.message || c.content || c.text || "";

                return (
                  <div key={c._id || c.id || i} className="p-3 border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{by}</span>
                      <span className="text-[10px] text-muted-foreground">{at}</span>
                    </div>

                    <p className="text-sm text-foreground">{text}</p>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              <Textarea
                placeholder="Add a comment (visible to client)..."
                value={newComment}
                onChange={(e) =>
                  setNewComment(e.target.value)
                }
                rows={3}
              />

              <Button
                className="w-full gap-1.5"
                disabled={!newComment.trim() || posting}
                onClick={handlePostComment}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                {posting ? "Sending..." : "Send Comment"}
              </Button>
            </div>
          </TabsContent>

        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
