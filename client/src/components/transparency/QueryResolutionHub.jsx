import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Plus,
  Search,
  Filter,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  ChevronRight,
  CalendarClock,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import {
  QUERY_CATEGORIES,
  QUERY_STATUS_COLORS,
  PRIORITY_COLORS,
} from '@/lib/transparency/types';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  open: { label: 'Open', icon: MessageSquare },
  awaiting_response: { label: 'Awaiting Response', icon: Clock },
  resolved: { label: 'Resolved', icon: CheckCircle2 },
  escalated: { label: 'Escalated', icon: AlertTriangle },
};

const priorityOrder = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function formatTimestamp(value) {
  if (!value) return 'No timestamp';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid date';

  return format(date, 'dd MMM yyyy, hh:mm a');
}

function getCategoryLabel(value) {
  return QUERY_CATEGORIES.find((category) => category.value === value)?.label || 'General';
}

function QueryStatCard({ title, value, helper, icon: Icon, tone }) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
          <p className="mt-2 text-xs text-muted-foreground">{helper}</p>
        </div>
        <div className={cn('rounded-2xl p-3', tone)}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function QueryListCard({ query, onOpen }) {
  const statusMeta = STATUS_CONFIG[query.status] || STATUS_CONFIG.open;
  const StatusIcon = statusMeta.icon;

  return (
    <button
      type="button"
      onClick={() => onOpen(query)}
      className="w-full text-left"
    >
      <Card className="group h-full border-border/60 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-medium">
                  {query.query_number || 'Draft Query'}
                </Badge>
                <Badge className={cn('border-0', QUERY_STATUS_COLORS[query.status] || QUERY_STATUS_COLORS.open)}>
                  <StatusIcon className="mr-1 h-3.5 w-3.5" />
                  {statusMeta.label}
                </Badge>
                <Badge className={cn('border-0 capitalize', PRIORITY_COLORS[query.priority] || PRIORITY_COLORS.medium)}>
                  {query.priority || 'medium'}
                </Badge>
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">{query.subject}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{query.description}</p>
              </div>
            </div>
            <ChevronRight className="mt-1 h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-2.5 py-1">{getCategoryLabel(query.category)}</span>
            <span className="rounded-full bg-muted px-2.5 py-1">
              Updated {formatDistanceToNow(new Date(query.updated_at || query.created_at), { addSuffix: true })}
            </span>
            {query.due_date ? (
              <span className="rounded-full bg-muted px-2.5 py-1">Due {format(new Date(query.due_date), 'dd MMM')}</span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

export function QueryResolutionHub({
  queries = [],
  onCreateQuery,
  onUpdateQuery,
  onAddComment,
  onFetchComments,
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [comments, setComments] = useState([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('open');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [newQuery, setNewQuery] = useState({
    subject: '',
    description: '',
    category: 'clarification',
    priority: 'medium',
  });

  const sortedQueries = [...queries].sort((a, b) => {
    const priorityDelta = (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99);
    if (priorityDelta !== 0) return priorityDelta;
    return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);
  });

  const filteredQueries = sortedQueries.filter((query) => {
    const subject = query.subject || '';
    const description = query.description || '';
    const queryNumber = query.query_number || '';
    const searchValue = searchQuery.toLowerCase();
    const matchesSearch =
      subject.toLowerCase().includes(searchValue) ||
      description.toLowerCase().includes(searchValue) ||
      queryNumber.toLowerCase().includes(searchValue);
    const matchesStatus = filterStatus === 'all' || query.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const openQueries = queries.filter((query) => query.status === 'open').length;
  const awaitingQueries = queries.filter((query) => query.status === 'awaiting_response').length;
  const escalatedQueries = queries.filter((query) => query.status === 'escalated').length;
  const resolvedThisMonth = queries.filter((query) => {
    if (query.status !== 'resolved' || !query.resolved_at) return false;
    const resolved = new Date(query.resolved_at);
    const now = new Date();
    return resolved.getMonth() === now.getMonth() && resolved.getFullYear() === now.getFullYear();
  }).length;

  useEffect(() => {
    if (!selectedQuery) return;

    setSelectedStatus(selectedQuery.status || 'open');
    setResolutionNotes(selectedQuery.resolution_notes || '');
    setIsLoadingComments(true);

    Promise.resolve(onFetchComments?.(selectedQuery.id))
      .then((fetchedComments) => {
        setComments(Array.isArray(fetchedComments) ? fetchedComments : []);
      })
      .finally(() => setIsLoadingComments(false));
  }, [selectedQuery, onFetchComments]);

  const resetCreateForm = () => {
    setNewQuery({
      subject: '',
      description: '',
      category: 'clarification',
      priority: 'medium',
    });
  };

  const handleCreate = async () => {
    if (!newQuery.subject.trim() || !newQuery.description.trim()) {
      toast.error('Please fill in the subject and description.');
      return;
    }

    try {
      await onCreateQuery?.({
        ...newQuery,
        subject: newQuery.subject.trim(),
        description: newQuery.description.trim(),
      });
      toast.success('Query created successfully.');
      setIsCreating(false);
      resetCreateForm();
    } catch {
      toast.error('Failed to create the query.');
    }
  };

  const handleStatusChange = async () => {
    if (!selectedQuery) return;

    try {
      await onUpdateQuery?.(selectedQuery.id, {
        status: selectedStatus,
        resolution_notes: resolutionNotes.trim() || null,
      });
      toast.success('Query status updated.');
      setSelectedQuery((current) => current ? {
        ...current,
        status: selectedStatus,
        resolution_notes: resolutionNotes.trim(),
      } : current);
    } catch {
      toast.error('Unable to update the query status.');
    }
  };

  const handleSendComment = async () => {
    if (!selectedQuery || !newComment.trim()) return;

    try {
      await onAddComment?.(selectedQuery.id, newComment.trim());
      const updatedComments = await onFetchComments?.(selectedQuery.id);
      setComments(Array.isArray(updatedComments) ? updatedComments : []);
      setNewComment('');
      toast.success('Comment added.');
    } catch {
      toast.error('Unable to add the comment.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <QueryStatCard
          title="Open Queries"
          value={openQueries}
          helper="Active items waiting for review"
          icon={MessageSquare}
          tone="bg-sky-500/10 text-sky-600"
        />
        <QueryStatCard
          title="Awaiting Response"
          value={awaitingQueries}
          helper="Items blocked on client input"
          icon={Clock}
          tone="bg-amber-500/10 text-amber-600"
        />
        <QueryStatCard
          title="Escalated"
          value={escalatedQueries}
          helper="Needs leadership or finance intervention"
          icon={AlertTriangle}
          tone="bg-rose-500/10 text-rose-600"
        />
        <QueryStatCard
          title="Resolved This Month"
          value={resolvedThisMonth}
          helper="Closed and documented with notes"
          icon={CheckCircle2}
          tone="bg-emerald-500/10 text-emerald-600"
        />
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-xl">Resolution Queue</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Keep finance questions visible, searchable, and moving.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search subject, detail, or query id"
                className="pl-9"
              />
            </div>
            <div className="flex gap-3">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="awaiting_response">Awaiting Response</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setIsCreating(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                New Query
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredQueries.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredQueries.map((query) => (
                <QueryListCard key={query.id} query={query} onOpen={setSelectedQuery} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No matching queries</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Adjust your search or create a new question to keep the reporting workflow moving.
              </p>
              <Button onClick={() => setIsCreating(true)} variant="outline" className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Create Query
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Query</DialogTitle>
            <DialogDescription>
              Capture an issue from reports, compliance review, or document checks so it stays visible.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="query-subject">Subject</Label>
              <Input
                id="query-subject"
                value={newQuery.subject}
                onChange={(event) => setNewQuery((current) => ({ ...current, subject: event.target.value }))}
                placeholder="Mismatch in vendor payment summary"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="query-description">Description</Label>
              <Textarea
                id="query-description"
                value={newQuery.description}
                onChange={(event) => setNewQuery((current) => ({ ...current, description: event.target.value }))}
                placeholder="Describe what needs attention, what was expected, and who should respond."
                className="min-h-32"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select
                  value={newQuery.category}
                  onValueChange={(value) => setNewQuery((current) => ({ ...current, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUERY_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select
                  value={newQuery.priority}
                  onValueChange={(value) => setNewQuery((current) => ({ ...current, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create Query</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={Boolean(selectedQuery)} onOpenChange={(open) => !open && setSelectedQuery(null)}>
        <SheetContent className="w-full sm:max-w-2xl">
          {selectedQuery ? (
            <div className="flex h-full flex-col">
              <SheetHeader>
                <SheetTitle className="pr-8 text-left">{selectedQuery.subject}</SheetTitle>
              </SheetHeader>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{selectedQuery.query_number || 'Draft Query'}</Badge>
                <Badge className={cn('border-0', QUERY_STATUS_COLORS[selectedQuery.status] || QUERY_STATUS_COLORS.open)}>
                  {(STATUS_CONFIG[selectedQuery.status] || STATUS_CONFIG.open).label}
                </Badge>
                <Badge className={cn('border-0 capitalize', PRIORITY_COLORS[selectedQuery.priority] || PRIORITY_COLORS.medium)}>
                  {selectedQuery.priority || 'medium'} priority
                </Badge>
                <Badge variant="secondary">{getCategoryLabel(selectedQuery.category)}</Badge>
              </div>

              <div className="mt-5 rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-sm leading-6 text-foreground">{selectedQuery.description}</p>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Created {formatTimestamp(selectedQuery.created_at)}
                  </span>
                  <span>Last updated {formatTimestamp(selectedQuery.updated_at || selectedQuery.created_at)}</span>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="awaiting_response">Awaiting Response</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="escalated">Escalated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="resolution-notes">Resolution Notes</Label>
                  <Textarea
                    id="resolution-notes"
                    value={resolutionNotes}
                    onChange={(event) => setResolutionNotes(event.target.value)}
                    placeholder="Add the latest outcome or next action."
                    className="min-h-24"
                  />
                </div>
              </div>

              <Button onClick={handleStatusChange} className="mt-4 self-start">
                Save Status Update
              </Button>

              <Separator className="my-6" />

              <div className="flex min-h-0 flex-1 flex-col">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Comments</h3>
                  <span className="text-xs text-muted-foreground">{comments.length} updates</span>
                </div>

                <ScrollArea className="min-h-0 flex-1 rounded-2xl border border-border/70 bg-background/60 p-4">
                  <div className="space-y-4">
                    {isLoadingComments ? (
                      <p className="text-sm text-muted-foreground">Loading comments...</p>
                    ) : comments.length ? (
                      comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>
                              {(comment.user_name || comment.user_email || 'F').slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1 rounded-2xl bg-muted/40 p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium text-foreground">
                                {comment.user_name || comment.user_email || 'Finance Team'}
                              </p>
                              {comment.is_internal ? <Badge variant="outline">Internal</Badge> : null}
                              <span className="text-xs text-muted-foreground">{formatTimestamp(comment.created_at)}</span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-foreground">{comment.content}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No comments yet. Add the first update below.</p>
                    )}
                  </div>
                </ScrollArea>

                <div className="mt-4 flex gap-3">
                  <Textarea
                    value={newComment}
                    onChange={(event) => setNewComment(event.target.value)}
                    placeholder="Share the next update, request, or resolution note."
                    className="min-h-24"
                  />
                  <Button onClick={handleSendComment} size="icon" className="h-auto px-4">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
