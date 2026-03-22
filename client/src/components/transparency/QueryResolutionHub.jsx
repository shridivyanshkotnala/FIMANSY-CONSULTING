import { useCallback, useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { MessageSquare, Plus, Paperclip, Send, Upload, Clock3, CheckCircle2, Timer } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

function TicketCard({ ticket, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(ticket)}
      className="w-full rounded-2xl border border-white/10 bg-[#121214] p-4 text-left transition hover:border-orange-400/35 hover:bg-[#151518]"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="border border-white/15 bg-white/5 text-white/90 hover:bg-white/5">{ticket.query_number}</Badge>
        <Badge className={ticket.status === "closed" ? "bg-emerald-500/15 text-emerald-300" : "bg-orange-500/15 text-orange-300"}>
          {ticket.status === "closed" ? "Closed" : "Open"}
        </Badge>
        {ticket.has_unread_accountant_update ? <Badge className="bg-sky-500/15 text-sky-300">Accountant Update</Badge> : null}
      </div>

      <p className="mt-3 text-sm font-semibold text-white">{ticket.subject}</p>
      <p className="mt-1 line-clamp-2 text-xs text-white/60">{ticket.message}</p>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/45">
        <span className="rounded-full border border-white/10 bg-black/30 px-2 py-1">Opened: {formatDateTime(ticket.createdAt || ticket.created_at)}</span>
        {ticket.status === "closed" ? (
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-emerald-300">
            Closed: {formatDateTime(ticket.closed_at)}
          </span>
        ) : null}
      </div>
    </button>
  );
}

function Pagination({ page, totalPages, onPageChange }) {
  return (
    <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-white/55">
      <span>Page {page} of {totalPages}</span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="border-white/15 bg-transparent text-white hover:bg-white/10"
        >
          Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="border-white/15 bg-transparent text-white hover:bg-white/10"
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export function QueryResolutionHub() {
  const { getStats, getTickets, createTicket, getTicketDetail, getComments, addComment, getDocuments, uploadDocument } = useQueryHub();

  const [stats, setStats] = useState({ open_queries: 0, resolved_this_month: 0, avg_resolution_hours: 0 });
  const [openTickets, setOpenTickets] = useState([]);
  const [closedTickets, setClosedTickets] = useState([]);
  const [openPage, setOpenPage] = useState(1);
  const [closedPage, setClosedPage] = useState(1);
  const [openTotalPages, setOpenTotalPages] = useState(1);
  const [closedTotalPages, setClosedTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [createFile, setCreateFile] = useState(null);

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDetail, setTicketDetail] = useState(null);
  const [comments, setComments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [commenting, setCommenting] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const loadStats = useCallback(async () => {
    const result = await getStats();
    setStats(result || {});
  }, [getStats]);

  const loadTickets = useCallback(async (status, page) => {
    const result = await getTickets({ status, page, limit: 6 });
    if (status === "open") {
      setOpenTickets(result?.data || []);
      setOpenTotalPages(result?.total_pages || 1);
    } else {
      setClosedTickets(result?.data || []);
      setClosedTotalPages(result?.total_pages || 1);
    }
  }, [getTickets]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadTickets("open", openPage),
        loadTickets("closed", closedPage),
      ]);
    } catch (error) {
      toast.error(error?.message || "Failed to load query hub");
    } finally {
      setLoading(false);
    }
  }, [loadStats, loadTickets, openPage, closedPage]);

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

  const handleCreateTicket = async () => {
    const message = newMessage.trim();
    if (!message) {
      toast.error("Please enter your query message");
      return;
    }

    setCreating(true);
    try {
      await createTicket({ message, file: createFile });
      toast.success("Query raised successfully");
      setCreateOpen(false);
      setNewMessage("");
      setCreateFile(null);
      setOpenPage(1);
      await refreshAll();
    } catch (error) {
      toast.error(error?.message || "Failed to create query");
    } finally {
      setCreating(false);
    }
  };

  const handleAddComment = async () => {
    if (!selectedTicket) return;
    const message = newComment.trim();
    if (!message) return;

    setCommenting(true);
    try {
      const ticketId = selectedTicket._id || selectedTicket.id;
      await addComment(ticketId, message);
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
      await uploadDocument(ticketId, file, `Supporting document uploaded: ${file.name}`);
      const [updatedDocuments, updatedComments] = await Promise.all([
        getDocuments(ticketId),
        getComments(ticketId),
      ]);
      setDocuments(Array.isArray(updatedDocuments) ? updatedDocuments : []);
      setComments(Array.isArray(updatedComments) ? updatedComments : []);
      await refreshAll();
      toast.success("Document uploaded");
    } catch (error) {
      toast.error(error?.message || "Upload failed");
    } finally {
      setUploadingDoc(false);
      event.target.value = "";
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

  const selectedTicketStatus = ticketDetail?.ticket?.status || selectedTicket?.status;

  return (
    <div className="rounded-[24px] border border-white/10 bg-[#101012] p-4 text-white md:p-5">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold">Query Hub</p>
          <p className="text-xs text-white/50">Raise questions for accountant and track updates.</p>
        </div>
        <Button className="bg-orange-500 text-white hover:bg-orange-400" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> New Query
        </Button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-[#141416] p-3">
          <p className="text-[11px] text-white/50">Avg resolution time</p>
          <p className="mt-1 flex items-center gap-2 text-lg font-semibold"><Timer className="h-4 w-4 text-orange-300" />{formatResolutionTime(stats.avg_resolution_hours)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#141416] p-3">
          <p className="text-[11px] text-white/50">Open / pending</p>
          <p className="mt-1 flex items-center gap-2 text-lg font-semibold"><Clock3 className="h-4 w-4 text-amber-300" />{stats.open_queries || 0}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#141416] p-3">
          <p className="text-[11px] text-white/50">Resolved this month</p>
          <p className="mt-1 flex items-center gap-2 text-lg font-semibold"><CheckCircle2 className="h-4 w-4 text-emerald-300" />{stats.resolved_this_month || 0}</p>
        </div>
      </div>

      <Tabs defaultValue="open" className="mt-4">
        <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl bg-white/5 p-1">
          <TabsTrigger value="open" className="data-[state=active]:bg-[#0f0f10] data-[state=active]:text-white">Opened Tickets</TabsTrigger>
          <TabsTrigger value="closed" className="data-[state=active]:bg-[#0f0f10] data-[state=active]:text-white">Closed Tickets</TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="mt-4">
          <div className="space-y-3">
            {(loading ? [] : openTickets).map((ticket) => (
              <TicketCard key={ticket._id || ticket.id} ticket={ticket} onOpen={openTicket} />
            ))}
            {!loading && openTickets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-8 text-center text-sm text-white/45">No open tickets.</div>
            ) : null}
          </div>
          <Pagination page={openPage} totalPages={openTotalPages} onPageChange={setOpenPage} />
        </TabsContent>

        <TabsContent value="closed" className="mt-4">
          <div className="space-y-3">
            {(loading ? [] : closedTickets).map((ticket) => (
              <TicketCard key={ticket._id || ticket.id} ticket={ticket} onOpen={openTicket} />
            ))}
            {!loading && closedTickets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-8 text-center text-sm text-white/45">No closed tickets.</div>
            ) : null}
          </div>
          <Pagination page={closedPage} totalPages={closedTotalPages} onPageChange={setClosedPage} />
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-white/10 bg-[#101012] text-white sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Raise New Query</DialogTitle>
            <DialogDescription className="text-white/60">Ask your general question for accountant and attach a supporting document if needed.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Textarea
              value={newMessage}
              onChange={(event) => setNewMessage(event.target.value)}
              placeholder="Type your general query message"
              className="min-h-[130px] border-white/15 bg-[#171719] text-white placeholder:text-white/35"
            />
            <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-white/65">
              <label className="flex cursor-pointer items-center gap-2">
                <Paperclip className="h-4 w-4" />
                <span>{createFile ? createFile.name : "Attach supporting document (optional)"}</span>
                <Input type="file" className="hidden" onChange={(e) => setCreateFile(e.target.files?.[0] || null)} />
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="border-white/15 bg-transparent text-white hover:bg-white/10" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTicket} disabled={creating} className="bg-orange-500 text-white hover:bg-orange-400">
              {creating ? "Creating..." : "Create Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={Boolean(selectedTicket)} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <SheetContent className="w-full overflow-y-auto border-white/10 bg-[#0f0f11] text-white sm:max-w-2xl">
          {selectedTicket ? (
            <>
              <SheetHeader>
                <SheetTitle className="text-left text-white">{ticketDetail?.ticket?.subject || selectedTicket.subject}</SheetTitle>
              </SheetHeader>

              <div className="mt-4 rounded-xl border border-white/10 bg-[#151517] p-3 text-sm">
                <p className="text-white/85">{ticketDetail?.ticket?.message || selectedTicket.message}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/50">
                  <span>Opened: {formatDateTime(ticketDetail?.ticket?.createdAt || selectedTicket.createdAt)}</span>
                  {selectedTicketStatus === "closed" ? <span>Closed: {formatDateTime(ticketDetail?.ticket?.closed_at || selectedTicket.closed_at)}</span> : null}
                </div>
              </div>

              <Tabs defaultValue="comments" className="mt-4">
                <TabsList className="grid h-auto w-full grid-cols-3 rounded-xl bg-white/5 p-1">
                  <TabsTrigger value="comments" className="data-[state=active]:bg-[#19191b] data-[state=active]:text-white">Comments</TabsTrigger>
                  <TabsTrigger value="documents" className="data-[state=active]:bg-[#19191b] data-[state=active]:text-white">Documents</TabsTrigger>
                  <TabsTrigger value="updates" className="data-[state=active]:bg-[#19191b] data-[state=active]:text-white">Accountant Updates</TabsTrigger>
                </TabsList>

                <TabsContent value="comments" className="space-y-3 pt-3">
                  {comments.map((comment) => (
                    <div key={comment._id || comment.id} className="rounded-lg border border-white/10 bg-[#151517] p-3">
                      <div className="flex items-center gap-2 text-xs text-white/55">
                        <Badge className={comment.role === "accountant" ? "bg-orange-500/15 text-orange-300" : "bg-white/10 text-white/75"}>
                          {comment.role === "accountant" ? "Accountant" : "You"}
                        </Badge>
                        <span>{formatDateTime(comment.createdAt || comment.created_at)}</span>
                      </div>
                      <p className="mt-2 text-sm text-white/90">{comment.message}</p>
                    </div>
                  ))}

                  <div className="flex gap-2">
                    <Textarea
                      value={newComment}
                      onChange={(event) => setNewComment(event.target.value)}
                      placeholder={selectedTicketStatus === "closed" ? "Ticket is closed" : "Write a comment"}
                      disabled={selectedTicketStatus === "closed"}
                      className="min-h-[90px] border-white/15 bg-[#151517] text-white"
                    />
                    <Button onClick={handleAddComment} disabled={commenting || !newComment.trim() || selectedTicketStatus === "closed"} className="h-auto bg-orange-500 px-4 hover:bg-orange-400">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="documents" className="space-y-3 pt-3">
                  {documents.map((doc) => (
                    <div key={doc._id || doc.key} className="rounded-lg border border-white/10 bg-[#151517] p-3">
                      <p className="text-sm text-white">{doc.display_file_name || doc.original_file_name}</p>
                      <p className="mt-1 text-xs text-white/55">{doc.uploaded_by_role === "accountant" ? "Accountant" : "Client"} • {formatDateTime(doc.createdAt || doc.created_at)}</p>
                      <a className="mt-2 inline-block text-xs text-orange-300 hover:text-orange-200" href={doc.url} target="_blank" rel="noreferrer">View Document</a>
                    </div>
                  ))}

                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/80">
                    <Upload className="h-4 w-4" />
                    {uploadingDoc ? "Uploading..." : "Upload document"}
                    <Input type="file" className="hidden" disabled={uploadingDoc || selectedTicketStatus === "closed"} onChange={handleUploadDocument} />
                  </label>
                </TabsContent>

                <TabsContent value="updates" className="space-y-3 pt-3">
                  {accountantUpdates.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-white/15 bg-black/20 p-5 text-center text-xs text-white/45">No accountant updates yet.</div>
                  ) : (
                    accountantUpdates.map((item) => (
                      <div key={item.id} className="rounded-lg border border-white/10 bg-[#151517] p-3">
                        <div className="flex items-center gap-2 text-xs text-white/55">
                          <Badge className="bg-orange-500/15 text-orange-300">{item.type === "document" ? "Document" : "Message"}</Badge>
                          <span>{formatDateTime(item.at)}</span>
                        </div>
                        <p className="mt-1.5 text-sm text-white/85">{item.text}</p>
                        <p className="mt-1 text-[11px] text-white/40">{item.at ? formatDistanceToNowStrict(new Date(item.at), { addSuffix: true }) : ""}</p>
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
