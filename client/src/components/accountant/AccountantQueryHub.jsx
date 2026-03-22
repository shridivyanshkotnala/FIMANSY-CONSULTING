import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Building2, CheckCircle2, Clock3, Send, Timer, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useQueryHub } from "@/hooks/useQueryHub";

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "dd MMM yyyy, hh:mm a");
}

function formatResolutionTime(hours) {
  const total = Number(hours || 0);
  if (!total) return "—";
  if (total >= 24) return `${(total / 24).toFixed(1)}d`;
  return `${total.toFixed(1)}h`;
}

function Pagination({ page, totalPages, onPageChange }) {
  return (
    <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
      <span>Page {page} of {totalPages}</span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Prev</Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</Button>
      </div>
    </div>
  );
}

export function AccountantQueryHub() {
  const { getStats, getTickets, getTicketDetail, getComments, addComment, getDocuments, uploadDocument, updateStatus } = useQueryHub({ isAccountant: true });

  const [stats, setStats] = useState({ open_queries: 0, resolved_this_month: 0, avg_resolution_hours: 0 });
  const [openTickets, setOpenTickets] = useState([]);
  const [closedTickets, setClosedTickets] = useState([]);
  const [openPage, setOpenPage] = useState(1);
  const [closedPage, setClosedPage] = useState(1);
  const [openTotalPages, setOpenTotalPages] = useState(1);
  const [closedTotalPages, setClosedTotalPages] = useState(1);

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDetail, setTicketDetail] = useState(null);
  const [comments, setComments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [commenting, setCommenting] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [closing, setClosing] = useState(false);

  const loadTickets = useCallback(async (status, page) => {
    const result = await getTickets({ status, page, limit: 8 });
    if (status === "open") {
      setOpenTickets(result?.data || []);
      setOpenTotalPages(result?.total_pages || 1);
    } else {
      setClosedTickets(result?.data || []);
      setClosedTotalPages(result?.total_pages || 1);
    }
  }, [getTickets]);

  const refreshAll = useCallback(async () => {
    try {
      const [statsData] = await Promise.all([
        getStats(),
        loadTickets("open", openPage),
        loadTickets("closed", closedPage),
      ]);
      setStats(statsData || {});
    } catch (error) {
      toast.error(error?.message || "Failed to load query hub");
    }
  }, [getStats, loadTickets, openPage, closedPage]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const openTicket = async (ticket) => {
    setSelectedTicket(ticket);
    try {
      const ticketId = ticket._id || ticket.id;
      const [detail, ticketComments, ticketDocuments] = await Promise.all([
        getTicketDetail(ticketId),
        getComments(ticketId),
        getDocuments(ticketId),
      ]);
      setTicketDetail(detail);
      setComments(Array.isArray(ticketComments) ? ticketComments : []);
      setDocuments(Array.isArray(ticketDocuments) ? ticketDocuments : []);
    } catch (error) {
      toast.error(error?.message || "Failed to open ticket");
    }
  };

  const handleAddComment = async () => {
    if (!selectedTicket || !newComment.trim()) return;
    setCommenting(true);
    try {
      const ticketId = selectedTicket._id || selectedTicket.id;
      await addComment(ticketId, newComment.trim());
      const updated = await getComments(ticketId);
      setComments(Array.isArray(updated) ? updated : []);
      setNewComment("");
      await refreshAll();
    } catch (error) {
      toast.error(error?.message || "Failed to post comment");
    } finally {
      setCommenting(false);
    }
  };

  const handleUploadDocument = async (event) => {
    if (!selectedTicket) return;
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    try {
      const ticketId = selectedTicket._id || selectedTicket.id;
      await uploadDocument(ticketId, file, `Accountant uploaded document: ${file.name}`);
      const [nextDocs, nextComments] = await Promise.all([getDocuments(ticketId), getComments(ticketId)]);
      setDocuments(Array.isArray(nextDocs) ? nextDocs : []);
      setComments(Array.isArray(nextComments) ? nextComments : []);
      await refreshAll();
      toast.success("Document uploaded");
    } catch (error) {
      toast.error(error?.message || "Upload failed");
    } finally {
      setUploadingDoc(false);
      event.target.value = "";
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    setClosing(true);
    try {
      const ticketId = selectedTicket._id || selectedTicket.id;
      await updateStatus(ticketId, "closed");
      const detail = await getTicketDetail(ticketId);
      setTicketDetail(detail);
      setSelectedTicket((prev) => prev ? { ...prev, status: "closed" } : prev);
      await refreshAll();
      toast.success("Ticket closed");
    } catch (error) {
      toast.error(error?.message || "Could not close ticket");
    } finally {
      setClosing(false);
    }
  };

  const accountantUpdates = useMemo(() => {
    const commentUpdates = comments
      .filter((item) => item.role === "accountant" || item.author_role === "accountant")
      .map((item) => ({
        id: item._id || item.id,
        type: "comment",
        text: item.message,
        at: item.createdAt || item.created_at,
      }));

    const docUpdates = documents
      .filter((item) => item.uploaded_by_role === "accountant")
      .map((item) => ({
        id: item._id || item.key,
        type: "document",
        text: `Uploaded ${item.display_file_name || item.original_file_name || "document"}`,
        at: item.createdAt || item.created_at,
      }));

    return [...commentUpdates, ...docUpdates].sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
  }, [comments, documents]);

  const ticketStatus = ticketDetail?.ticket?.status || selectedTicket?.status;
  const organization = ticketDetail?.organization || selectedTicket?.organization_id || {};

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Query Hub</h1>
        <p className="text-sm text-muted-foreground">Client-raised queries with thread and documents.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-3">
          <p className="text-xs text-muted-foreground">Avg resolution time</p>
          <p className="mt-1 flex items-center gap-2 text-xl font-semibold"><Timer className="h-4 w-4" />{formatResolutionTime(stats.avg_resolution_hours)}</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-xs text-muted-foreground">Open / pending</p>
          <p className="mt-1 flex items-center gap-2 text-xl font-semibold"><Clock3 className="h-4 w-4" />{stats.open_queries || 0}</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-xs text-muted-foreground">Resolved this month</p>
          <p className="mt-1 flex items-center gap-2 text-xl font-semibold"><CheckCircle2 className="h-4 w-4" />{stats.resolved_this_month || 0}</p>
        </div>
      </div>

      <Tabs defaultValue="open">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="open">Opened Tickets</TabsTrigger>
          <TabsTrigger value="closed">Closed Tickets</TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="space-y-3 pt-3">
          {openTickets.map((ticket) => (
            <button key={ticket._id || ticket.id} className="w-full rounded-xl border bg-card p-4 text-left hover:border-primary/30" onClick={() => openTicket(ticket)}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{ticket.query_number}</Badge>
                <Badge className="bg-orange-500/10 text-orange-600">Open</Badge>
                <Badge variant="secondary">{ticket.organization_id?.name || "Organization"}</Badge>
              </div>
              <p className="mt-2 text-sm font-semibold">{ticket.subject}</p>
              <p className="mt-1 text-xs text-muted-foreground">Opened {formatDateTime(ticket.createdAt || ticket.created_at)}</p>
            </button>
          ))}
          {openTickets.length === 0 ? <div className="rounded-xl border border-dashed p-7 text-center text-sm text-muted-foreground">No open tickets.</div> : null}
          <Pagination page={openPage} totalPages={openTotalPages} onPageChange={setOpenPage} />
        </TabsContent>

        <TabsContent value="closed" className="space-y-3 pt-3">
          {closedTickets.map((ticket) => (
            <button key={ticket._id || ticket.id} className="w-full rounded-xl border bg-card p-4 text-left hover:border-primary/30" onClick={() => openTicket(ticket)}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{ticket.query_number}</Badge>
                <Badge className="bg-emerald-500/10 text-emerald-600">Closed</Badge>
                <Badge variant="secondary">{ticket.organization_id?.name || "Organization"}</Badge>
              </div>
              <p className="mt-2 text-sm font-semibold">{ticket.subject}</p>
              <p className="mt-1 text-xs text-muted-foreground">Closed {formatDateTime(ticket.closed_at)}</p>
            </button>
          ))}
          {closedTickets.length === 0 ? <div className="rounded-xl border border-dashed p-7 text-center text-sm text-muted-foreground">No closed tickets.</div> : null}
          <Pagination page={closedPage} totalPages={closedTotalPages} onPageChange={setClosedPage} />
        </TabsContent>
      </Tabs>

      <Sheet open={Boolean(selectedTicket)} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {selectedTicket ? (
            <>
              <SheetHeader>
                <SheetTitle className="text-left">{ticketDetail?.ticket?.subject || selectedTicket.subject}</SheetTitle>
              </SheetHeader>

              <div className="mt-4 rounded-xl border p-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge className={ticketStatus === "closed" ? "bg-emerald-500/10 text-emerald-600" : "bg-orange-500/10 text-orange-600"}>
                    {ticketStatus === "closed" ? "Closed" : "Open"}
                  </Badge>
                  {ticketStatus !== "closed" ? (
                    <Button size="sm" onClick={handleCloseTicket} disabled={closing}>{closing ? "Closing..." : "Close Ticket"}</Button>
                  ) : null}
                </div>
                <p className="mt-2 text-sm">{ticketDetail?.ticket?.message || selectedTicket.message}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>Opened: {formatDateTime(ticketDetail?.ticket?.createdAt || selectedTicket.createdAt)}</span>
                  <span>Closed: {formatDateTime(ticketDetail?.ticket?.closed_at || selectedTicket.closed_at)}</span>
                </div>
              </div>

              <div className="mt-4 rounded-xl border p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Company Summary</p>
                <div className="grid gap-2 text-sm md:grid-cols-2">
                  <p className="flex items-center gap-2"><Building2 className="h-4 w-4" /> {organization?.name || "—"}</p>
                  <p>GSTIN: {organization?.gstin || "—"}</p>
                  <p>PAN: {organization?.pan || "—"}</p>
                  <p>TAN: {organization?.tan || "—"}</p>
                </div>
              </div>

              <Tabs defaultValue="thread" className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="thread">Thread</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="updates">Accountant Updates</TabsTrigger>
                </TabsList>

                <TabsContent value="thread" className="space-y-3 pt-3">
                  {comments.map((comment) => (
                    <div key={comment._id || comment.id} className="rounded-lg border p-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant={comment.role === "accountant" ? "default" : "secondary"}>{comment.role === "accountant" ? "Accountant" : "Client"}</Badge>
                        <span>{formatDateTime(comment.createdAt || comment.created_at)}</span>
                      </div>
                      <p className="mt-1.5 text-sm">{comment.message}</p>
                    </div>
                  ))}

                  {ticketStatus !== "closed" ? (
                    <div className="flex gap-2">
                      <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Post update to client" className="min-h-[90px]" />
                      <Button className="h-auto" onClick={handleAddComment} disabled={commenting || !newComment.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </TabsContent>

                <TabsContent value="documents" className="space-y-3 pt-3">
                  {documents.map((doc) => (
                    <div key={doc._id || doc.key} className="rounded-lg border p-3">
                      <p className="text-sm font-medium">{doc.display_file_name || doc.original_file_name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{doc.uploaded_by_role === "accountant" ? "Accountant" : "Client"} • {formatDateTime(doc.createdAt || doc.created_at)}</p>
                      <a href={doc.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-primary hover:underline">View document</a>
                    </div>
                  ))}

                  {ticketStatus !== "closed" ? (
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs text-muted-foreground">
                      <Upload className="h-4 w-4" />
                      {uploadingDoc ? "Uploading..." : "Upload document"}
                      <Input type="file" className="hidden" disabled={uploadingDoc} onChange={handleUploadDocument} />
                    </label>
                  ) : null}
                </TabsContent>

                <TabsContent value="updates" className="space-y-3 pt-3">
                  {accountantUpdates.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">No accountant updates yet.</div>
                  ) : accountantUpdates.map((item) => (
                    <div key={item.id} className="rounded-lg border p-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{item.type === "document" ? "Document" : "Message"}</Badge>
                        <span>{formatDateTime(item.at)}</span>
                      </div>
                      <p className="mt-1.5 text-sm">{item.text}</p>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}