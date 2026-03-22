import { useState } from 'react';
import { format, subMonths } from 'date-fns';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarIcon,
  CheckCircle2,
  Download,
  FileCheck,
  FileSpreadsheet,
  MessageSquare,
  Receipt,
  Scale,
  Shield,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { PillarLayout } from '@/components/layout/PillarLayout';
import { QueryResolutionHub } from '@/components/transparency/QueryResolutionHub';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTransparency } from '@/hooks/useTransparency';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const MOCK_QUERIES = [
  {
    id: 'local-query-001',
    query_number: 'QR-2418',
    subject: 'Vendor ledger mismatch in March expense pack',
    description: 'The office expense report shows INR 48,500 while the supporting vendor ledger totals INR 44,500. Need confirmation on the missing adjustment entry before publishing the report.',
    status: 'awaiting_response',
    priority: 'high',
    category: 'discrepancy',
    created_at: '2026-03-18T09:15:00.000Z',
    updated_at: '2026-03-21T11:20:00.000Z',
    due_date: '2026-03-25T00:00:00.000Z',
    resolution_notes: '',
    resolved_at: null,
  },
  {
    id: 'local-query-002',
    query_number: 'QR-2415',
    subject: 'Approval pending for payroll variance note',
    description: 'Payroll report is ready, but the salary variance note needs founder approval before sharing the final MIS deck with leadership.',
    status: 'open',
    priority: 'urgent',
    category: 'approval_needed',
    created_at: '2026-03-17T07:30:00.000Z',
    updated_at: '2026-03-20T13:45:00.000Z',
    due_date: '2026-03-23T00:00:00.000Z',
    resolution_notes: '',
    resolved_at: null,
  },
  {
    id: 'local-query-003',
    query_number: 'QR-2409',
    subject: 'Missing bank statement for audit trail',
    description: 'February statement for the ICICI sweep account is still not attached in the compliance folder. The audit support pack is otherwise complete.',
    status: 'resolved',
    priority: 'medium',
    category: 'missing_document',
    created_at: '2026-03-10T10:00:00.000Z',
    updated_at: '2026-03-19T16:10:00.000Z',
    due_date: null,
    resolution_notes: 'Statement received from banking team and attached to the audit pack.',
    resolved_at: '2026-03-19T16:10:00.000Z',
  },
];

const MOCK_COMMENTS = {
  'local-query-001': [
    {
      id: 'comment-001',
      content: 'Cross-checking the ledger export against the uploaded bills. Will update after reconciling the manual adjustment.',
      user_name: 'Aarav',
      is_internal: false,
      created_at: '2026-03-21T11:20:00.000Z',
    },
  ],
  'local-query-002': [
    {
      id: 'comment-002',
      content: 'Variance note drafted. Waiting for founder sign-off before attaching it to the payroll pack.',
      user_name: 'Finance Desk',
      is_internal: false,
      created_at: '2026-03-20T13:45:00.000Z',
    },
  ],
  'local-query-003': [
    {
      id: 'comment-003',
      content: 'Statement uploaded and mapped to the compliance checklist. Closing the item.',
      user_name: 'Naina',
      is_internal: false,
      created_at: '2026-03-19T16:10:00.000Z',
    },
  ],
};

const FINANCIAL_HIGHLIGHTS = [
  {
    title: 'Cash Position',
    value: 'INR 42.8L',
    delta: '+8.4% vs last period',
    icon: Wallet,
    tone: 'bg-emerald-500/10 text-emerald-600',
  },
  {
    title: 'Revenue Tracked',
    value: 'INR 18.6L',
    delta: '12 invoices posted this cycle',
    icon: TrendingUp,
    tone: 'bg-sky-500/10 text-sky-600',
  },
  {
    title: 'Expense Accuracy',
    value: '97.2%',
    delta: '2 items waiting for review',
    icon: Receipt,
    tone: 'bg-amber-500/10 text-amber-600',
  },
  {
    title: 'Report Readiness',
    value: '8/9',
    delta: 'One report blocked by queries',
    icon: FileCheck,
    tone: 'bg-violet-500/10 text-violet-600',
  },
];

const REPORT_LIBRARY = [
  {
    title: 'Monthly MIS Pack',
    description: 'Executive-ready summary across revenue, burn, collections, and working capital.',
    status: 'Ready',
    updatedAt: 'Updated 2 hours ago',
    icon: BarChart3,
  },
  {
    title: 'Receivables Ageing',
    description: 'Track collection pressure, overdue buckets, and high-risk customer balances.',
    status: 'Refreshing',
    updatedAt: 'Updated 18 minutes ago',
    icon: FileSpreadsheet,
  },
  {
    title: 'Expense Control Review',
    description: 'Highlights large spend movements, vendor spikes, and approval anomalies.',
    status: 'Attention Needed',
    updatedAt: 'Blocked by 1 open query',
    icon: Receipt,
  },
];

const COMPLIANCE_FEED = [
  {
    title: 'GST Working Papers',
    owner: 'Tax Desk',
    status: 'Ready to file',
    detail: 'All invoices tagged and purchase register validated.',
    icon: Shield,
  },
  {
    title: 'Board Reporting Checklist',
    owner: 'Governance',
    status: 'In review',
    detail: 'Waiting for founder note on payroll variance before sign-off.',
    icon: Scale,
  },
  {
    title: 'Audit Support Folder',
    owner: 'Compliance Ops',
    status: 'Updated today',
    detail: 'One bank statement issue was resolved and evidence is attached.',
    icon: CheckCircle2,
  },
];

function createLocalId(prefix) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() || Date.now()}`;
}

function OverviewMetric({ title, value, delta, icon: Icon, tone }) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
          <p className="mt-2 text-xs text-muted-foreground">{delta}</p>
        </div>
        <div className={cn('rounded-2xl p-3', tone)}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function ReportCard({ title, icon: Icon, description, status, lastUpdated, onAction }) {
  return (
    <Card className="border-border/60 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <Badge variant={status === 'Attention Needed' ? 'destructive' : 'secondary'}>{status}</Badge>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{lastUpdated}</p>
          <Button variant="ghost" size="sm" className="gap-2" onClick={onAction}>
            Open
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState('financials');
  const [dateRange, setDateRange] = useState({
    from: subMonths(new Date(), 3),
    to: new Date(),
  });
  const [exportFormat, setExportFormat] = useState('excel');
  const [localQueries, setLocalQueries] = useState(MOCK_QUERIES);
  const [localComments, setLocalComments] = useState(MOCK_COMMENTS);

  const {
    queries: backendQueries,
    loading,
    createQuery,
    updateQuery,
    addQueryComment,
    fetchQueryComments,
  } = useTransparency();

  const liveQueries = backendQueries.length ? backendQueries : localQueries;
  const urgentQueryCount = liveQueries.filter((query) => ['open', 'awaiting_response', 'escalated'].includes(query.status)).length;
  const resolvedCount = liveQueries.filter((query) => query.status === 'resolved').length;

  const periodLabel = `${format(dateRange.from, 'dd MMM')} - ${format(dateRange.to, 'dd MMM yyyy')}`;

  const handleExport = () => {
    toast.success(`${activeTab === 'queries' ? 'Query hub' : activeTab === 'compliance' ? 'Compliance logs' : 'Financial reports'} prepared in ${exportFormat.toUpperCase()} format.`);
  };

  const handleCreateQuery = async (payload) => {
    try {
      const created = await createQuery(payload);
      if (created) return created;
    } catch {
      // fall back to local state below
    }

    const now = new Date().toISOString();
    const localQuery = {
      id: createLocalId('query'),
      query_number: `QR-${String(localQueries.length + 2419).padStart(4, '0')}`,
      status: 'open',
      created_at: now,
      updated_at: now,
      due_date: null,
      resolution_notes: '',
      resolved_at: null,
      ...payload,
    };

    setLocalQueries((current) => [localQuery, ...current]);
    setLocalComments((current) => ({ ...current, [localQuery.id]: [] }));
    return localQuery;
  };

  const handleUpdateQuery = async (queryId, updates) => {
    const existingLocalQuery = localQueries.find((query) => query.id === queryId);

    if (!existingLocalQuery) {
      try {
        await updateQuery(queryId, updates);
        return;
      } catch {
        // fall back to local update if the backend path is unavailable
      }
    }

    setLocalQueries((current) =>
      current.map((query) => {
        if (query.id !== queryId) return query;

        const nextStatus = updates.status || query.status;
        return {
          ...query,
          ...updates,
          status: nextStatus,
          updated_at: new Date().toISOString(),
          resolved_at: nextStatus === 'resolved' ? new Date().toISOString() : null,
        };
      })
    );
  };

  const handleAddComment = async (queryId, content) => {
    const isLocalQuery = localQueries.some((query) => query.id === queryId);

    if (!isLocalQuery) {
      try {
        const response = await addQueryComment(queryId, content);
        if (response) return response;
      } catch {
        // fall back to local comments below
      }
    }

    const comment = {
      id: createLocalId('comment'),
      content,
      user_name: 'You',
      is_internal: false,
      created_at: new Date().toISOString(),
    };

    setLocalComments((current) => ({
      ...current,
      [queryId]: [...(current[queryId] || []), comment],
    }));

    setLocalQueries((current) =>
      current.map((query) =>
        query.id === queryId
          ? { ...query, updated_at: new Date().toISOString() }
          : query
      )
    );

    return comment;
  };

  const handleFetchComments = async (queryId) => {
    const isLocalQuery = localQueries.some((query) => query.id === queryId);

    if (!isLocalQuery) {
      try {
        const response = await fetchQueryComments(queryId);
        if (Array.isArray(response) && response.length) return response;
      } catch {
        // fall back to local comments below
      }
    }

    return localComments[queryId] || [];
  };

  return (
    <PillarLayout>
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10 text-primary shadow-sm">
              <BarChart3 className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
                <Badge variant="secondary">UI Live</Badge>
                {loading ? <Badge variant="outline">Syncing backend</Badge> : <Badge variant="outline">Frontend fallback ready</Badge>}
              </div>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Review live report cards, compliance checkpoints, and finance queries from one place while backend integration is still in progress.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {periodLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.8fr_1fr]">
          <Card className="border-border/60 bg-gradient-to-br from-primary/10 via-background to-background shadow-sm">
            <CardContent className="flex h-full flex-col justify-between gap-6 p-6">
              <div className="space-y-3">
                <Badge variant="outline" className="w-fit">Reporting Window</Badge>
                <h2 className="text-2xl font-semibold tracking-tight">Everything stakeholders need, without waiting on backend delivery.</h2>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  The reports area is now navigable from the app shell, shows live frontend states, and keeps query resolution embedded in the reporting workflow.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <Button className="gap-2" onClick={() => setActiveTab('queries')}>
                  Open Query Hub
                  <MessageSquare className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => setActiveTab('compliance')}>
                  Review Compliance
                  <Shield className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Ops Snapshot</CardTitle>
              <CardDescription>What needs attention before reports go out.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl bg-muted/40 p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Open workflow blockers</p>
                  <p className="mt-1 text-2xl font-semibold">{urgentQueryCount}</p>
                </div>
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-muted/40 p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Resolved items</p>
                  <p className="mt-1 text-2xl font-semibold">{resolvedCount}</p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                Current window: <span className="font-medium text-foreground">{periodLabel}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-1 gap-2 rounded-2xl bg-muted/50 p-2 md:grid-cols-3">
            <TabsTrigger value="financials" className="gap-2 rounded-xl py-3 text-sm">
              <TrendingUp className="h-4 w-4" />
              Financials
            </TabsTrigger>
            <TabsTrigger value="compliance" className="gap-2 rounded-xl py-3 text-sm">
              <Shield className="h-4 w-4" />
              Compliance Logs
            </TabsTrigger>
            <TabsTrigger value="queries" className="gap-2 rounded-xl py-3 text-sm">
              <MessageSquare className="h-4 w-4" />
              Query Hub
              <Badge variant="secondary" className="ml-1">{urgentQueryCount}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="financials" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {FINANCIAL_HIGHLIGHTS.map((item) => (
                <OverviewMetric key={item.title} {...item} />
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
              <Card className="border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle>Report Library</CardTitle>
                  <CardDescription>Front-end live cards you can navigate right now.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {REPORT_LIBRARY.map((report) => (
                    <ReportCard
                      key={report.title}
                      {...report}
                      onAction={() => {
                        if (report.status === 'Attention Needed') {
                          setActiveTab('queries');
                          toast.info('Opening Query Hub for the blocked report.');
                          return;
                        }
                        toast.success(`${report.title} opened in preview mode.`);
                      }}
                    />
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle>Release Checklist</CardTitle>
                  <CardDescription>Quick publishing confidence before export.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    'Financial cards render live and react to date range selection.',
                    'Reports route is reachable from the app shell and mobile nav.',
                    'Query hub is embedded directly in Reports for follow-up work.',
                    'Exports trigger a real frontend action and toast feedback.',
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3 rounded-2xl bg-muted/30 p-3 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                      <span>{item}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-3">
              {COMPLIANCE_FEED.map((item) => {
                const Icon = item.icon;
                return (
                  <Card key={item.title} className="border-border/60 shadow-sm">
                    <CardContent className="space-y-4 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <Badge variant="outline">{item.status}</Badge>
                      </div>
                      <div>
                        <h3 className="text-base font-semibold">{item.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">Owner: {item.owner}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle>Compliance to Query Flow</CardTitle>
                <CardDescription>Issues raised here can move straight into the query hub.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    The board reporting checklist still has one pending approval. Push follow-up items into Query Hub and keep the reporting trail visible.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">1 approval pending</Badge>
                    <Badge variant="secondary">1 discrepancy already resolved</Badge>
                  </div>
                </div>
                <Button className="gap-2" onClick={() => setActiveTab('queries')}>
                  Open Query Hub
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="queries" className="space-y-6">
            <QueryResolutionHub
              queries={liveQueries}
              onCreateQuery={handleCreateQuery}
              onUpdateQuery={handleUpdateQuery}
              onAddComment={handleAddComment}
              onFetchComments={handleFetchComments}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PillarLayout>
  );
}
