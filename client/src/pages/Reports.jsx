import { useState } from "react";
import { format, subMonths } from "date-fns";
import {
  BarChart3,
  CalendarIcon,
  Download,
  FileSpreadsheet,
  Landmark,
  MessageSquare,
  Shield,
  WalletCards,
} from "lucide-react";
import { PillarLayout } from "@/components/layout/PillarLayout";
import { QueryResolutionHub } from "@/components/transparency/QueryResolutionHub";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTransparency } from "@/hooks/useTransparency";
import {
  useGetFinancialReportsQuery,
  useLazyGetFinancialReportViewUrlQuery,
} from "@/Redux/Slices/api/financialApi";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MOCK_QUERIES = [
  {
    id: "local-query-001",
    query_number: "QR-2418",
    subject: "Vendor ledger mismatch in March expense pack",
    description: "The office expense report shows INR 48,500 while the supporting vendor ledger totals INR 44,500. Need confirmation on the missing adjustment entry before publishing the report.",
    status: "awaiting_response",
    priority: "high",
    category: "discrepancy",
    created_at: "2026-03-18T09:15:00.000Z",
    updated_at: "2026-03-21T11:20:00.000Z",
    due_date: "2026-03-25T00:00:00.000Z",
    resolution_notes: "",
    resolved_at: null,
  },
  {
    id: "local-query-002",
    query_number: "QR-2415",
    subject: "Approval pending for payroll variance note",
    description: "Payroll report is ready, but the salary variance note needs founder approval before sharing the final MIS deck with leadership.",
    status: "open",
    priority: "urgent",
    category: "approval_needed",
    created_at: "2026-03-17T07:30:00.000Z",
    updated_at: "2026-03-20T13:45:00.000Z",
    due_date: "2026-03-23T00:00:00.000Z",
    resolution_notes: "",
    resolved_at: null,
  },
];

const MOCK_COMMENTS = {
  "local-query-001": [
    {
      id: "comment-001",
      content: "Cross-checking the ledger export against the uploaded bills. Will update after reconciling the manual adjustment.",
      user_name: "Aarav",
      is_internal: false,
      created_at: "2026-03-21T11:20:00.000Z",
    },
  ],
  "local-query-002": [
    {
      id: "comment-002",
      content: "Variance note drafted. Waiting for founder sign-off before attaching it to the payroll pack.",
      user_name: "Finance Desk",
      is_internal: false,
      created_at: "2026-03-20T13:45:00.000Z",
    },
  ],
};

const REPORT_CARD_META = {
  profit_and_loss: {
    title: "Profit & Loss",
    description: "Income, expenses, and net profit breakdown",
    icon: BarChart3,
  },
  balance_sheet: {
    title: "Balance Sheet",
    description: "Assets, liabilities, and equity snapshot",
    icon: Landmark,
  },
  cashflow_statement: {
    title: "Cash Flow Statement",
    description: "Operating, investing, and financing activities",
    icon: WalletCards,
  },
};

const REPORT_TYPE_LABELS = {
  profit_and_loss: "Profit & Loss",
  balance_sheet: "Balance Sheet",
  cashflow_statement: "Cash Flow Statement",
  other: "Other / Custom",
};

function createLocalId(prefix) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() || Date.now()}`;
}

function formatReportDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return format(date, "dd MMM yyyy");
}

function ReportTypeCard({ type, selected, count, onSelect }) {
  const meta = REPORT_CARD_META[type];
  const Icon = meta.icon;

  return (
    <button type="button" onClick={() => onSelect(type)} className="text-left">
      <div
        className={cn(
          "rounded-[24px] border px-5 py-5 transition-all",
          selected
            ? "border-orange-400/50 bg-[#1b1b1d] shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
            : "border-white/10 bg-[#18181a] hover:border-white/20"
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-[18px] bg-orange-500/15 text-orange-400">
            <Icon className="h-4.5 w-4.5" />
          </div>
          <Badge className="border border-white/10 bg-white/5 text-white hover:bg-white/5">
            {count > 0 ? "Ready" : "No Reports"}
          </Badge>
        </div>
        <div className="mt-6">
          <h3 className="text-xl md:text-[1.7rem] font-semibold text-white">{meta.title}</h3>
          <p className="mt-1.5 text-sm md:text-[15px] leading-6 text-white/55">{meta.description}</p>
          <p className="mt-4 text-sm text-white/45">{count} report{count === 1 ? "" : "s"} available</p>
        </div>
      </div>
    </button>
  );
}

function ReportRow({ report, onView }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-[#151517] p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm md:text-[15px] font-medium text-white">{report.display_file_name || report.original_file_name}</p>
            <Badge className="border border-white/10 bg-white/5 text-white/85 hover:bg-white/5">
              {REPORT_TYPE_LABELS[report.report_type] || "Report"}
            </Badge>
            {report.custom_tags?.map((tag) => (
              <Badge key={tag} className="border border-orange-500/20 bg-orange-500/10 text-orange-300 hover:bg-orange-500/10">
                {tag}
              </Badge>
            ))}
          </div>
          <p className="mt-1.5 text-xs md:text-sm text-white/55">
            Period: {formatReportDate(report.period_start)} - {formatReportDate(report.period_end)}
          </p>
          <p className="mt-1 text-xs md:text-sm text-white/40">
            Uploaded on {formatReportDate(report.uploaded_at || report.createdAt)}
          </p>
        </div>
        <Button className="bg-orange-500 text-white hover:bg-orange-400 h-9 px-4 text-sm" onClick={() => onView(report._id)}>
          View Report
        </Button>
      </div>
    </div>
  );
}

function PaginationBar({ page, totalPages, total, onPageChange, tone = "dark" }) {
  const dark = tone === "dark";

  return (
    <div className="flex flex-col gap-2 border-t border-white/10 pt-3 text-xs md:text-sm md:flex-row md:items-center md:justify-between">
      <span className={dark ? "text-white/50" : "text-muted-foreground"}>
        Page {page} of {totalPages} • {total} items
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className={dark ? "border-white/10 bg-transparent text-white hover:bg-white/10 hover:text-white" : ""}
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={dark ? "border-white/10 bg-transparent text-white hover:bg-white/10 hover:text-white" : ""}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState("financials");
  const [selectedFinancialType, setSelectedFinancialType] = useState("profit_and_loss");
  const [financialPage, setFinancialPage] = useState(1);
  const [otherPage, setOtherPage] = useState(1);
  const [dateRange, setDateRange] = useState({
    from: subMonths(new Date(), 3),
    to: new Date(),
  });
  const [exportFormat, setExportFormat] = useState("excel");
  const [localQueries, setLocalQueries] = useState(MOCK_QUERIES);
  const [localComments, setLocalComments] = useState(MOCK_COMMENTS);

  const periodStart = format(dateRange.from, "yyyy-MM-dd");
  const periodEnd = format(dateRange.to, "yyyy-MM-dd");
  const periodLabel = `${format(dateRange.from, "dd MMM yyyy")} - ${format(dateRange.to, "dd MMM yyyy")}`;

  const {
    data: selectedFinancialResponse,
    isFetching: financialLoading,
  } = useGetFinancialReportsQuery({
    reportType: selectedFinancialType,
    periodStart,
    periodEnd,
    page: financialPage,
    limit: 20,
  });

  const {
    data: otherFinancialResponse,
    isFetching: otherLoading,
  } = useGetFinancialReportsQuery({
    reportType: "other",
    periodStart,
    periodEnd,
    page: otherPage,
    limit: 20,
  });

  const [fetchFinancialViewUrl] = useLazyGetFinancialReportViewUrlQuery();

  const {
    queries: backendQueries,
    createQuery,
    updateQuery,
    addQueryComment,
    fetchQueryComments,
  } = useTransparency();

  const liveQueries = backendQueries.length ? backendQueries : localQueries;
  const urgentQueryCount = liveQueries.filter((query) => ["open", "awaiting_response", "escalated"].includes(query.status)).length;
  const financialSummary = selectedFinancialResponse?.summary || {
    profit_and_loss: 0,
    balance_sheet: 0,
    cashflow_statement: 0,
    other: 0,
  };

  const handleOpenReport = async (reportId) => {
    try {
      const payload = await fetchFinancialViewUrl(reportId).unwrap();
      if (payload?.signedUrl) {
        window.open(payload.signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      toast.error(error?.data?.message || error?.message || "Could not open the report");
    }
  };

  const handleExport = () => {
    toast.success(`Prepared ${selectedFinancialType.replaceAll("_", " ")} reports in ${exportFormat.toUpperCase()} mode.`);
  };

  const handleCreateQuery = async (payload) => {
    try {
      const created = await createQuery(payload);
      if (created) return created;
    } catch {
      // local fallback below
    }

    const now = new Date().toISOString();
    const localQuery = {
      id: createLocalId("query"),
      query_number: `QR-${String(localQueries.length + 2419).padStart(4, "0")}`,
      status: "open",
      created_at: now,
      updated_at: now,
      due_date: null,
      resolution_notes: "",
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
        // local fallback below
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
          resolved_at: nextStatus === "resolved" ? new Date().toISOString() : null,
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
        // local fallback below
      }
    }

    const comment = {
      id: createLocalId("comment"),
      content,
      user_name: "You",
      is_internal: false,
      created_at: new Date().toISOString(),
    };

    setLocalComments((current) => ({
      ...current,
      [queryId]: [...(current[queryId] || []), comment],
    }));

    return comment;
  };

  const handleFetchComments = async (queryId) => {
    const isLocalQuery = localQueries.some((query) => query.id === queryId);

    if (!isLocalQuery) {
      try {
        const response = await fetchQueryComments(queryId);
        if (Array.isArray(response) && response.length) return response;
      } catch {
        // local fallback below
      }
    }

    return localComments[queryId] || [];
  };

  return (
    <PillarLayout>
      <div className="min-h-screen bg-[#0a0a0b] px-3 py-4 text-white md:px-6">
        <div className="mx-auto max-w-7xl space-y-4">
          <div className="rounded-[28px] border border-white/10 bg-[#0f0f11] p-4 md:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-orange-500 text-white">
                  <BarChart3 className="h-7 w-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-3xl md:text-[2rem] font-semibold tracking-tight">Reports</h1>
                    <Badge className="border border-orange-500/30 bg-orange-500/10 text-orange-300 hover:bg-orange-500/10">
                      Live
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-base text-white/55">Insights & Output Layer</p>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 md:flex-row md:items-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start gap-2 rounded-xl border-white/10 bg-transparent px-4 py-4 text-white hover:bg-white/5 hover:text-white">
                      <CalendarIcon className="h-4 w-4 text-white/70" />
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
                          setFinancialPage(1);
                          setOtherPage(1);
                        }
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>

                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger className="w-[128px] rounded-xl border-white/10 bg-transparent text-white h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                  </SelectContent>
                </Select>

                <Button className="rounded-xl bg-orange-500 px-5 py-4 text-sm md:text-base text-white hover:bg-orange-400" onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6 space-y-4">
              <TabsList className="grid h-auto w-full grid-cols-1 gap-2 rounded-[20px] bg-white/8 p-1.5 md:grid-cols-3">
                <TabsTrigger value="financials" className="rounded-xl px-3 py-3 text-sm md:text-base data-[state=active]:bg-[#0d0d0f] data-[state=active]:text-white data-[state=active]:shadow-none">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Financials
                </TabsTrigger>
                <TabsTrigger value="compliance" className="rounded-xl px-3 py-3 text-sm md:text-base data-[state=active]:bg-[#0d0d0f] data-[state=active]:text-white data-[state=active]:shadow-none">
                  <Shield className="mr-2 h-4 w-4" />
                  Compliance Logs
                </TabsTrigger>
                <TabsTrigger value="queries" className="rounded-xl px-3 py-3 text-sm md:text-base data-[state=active]:bg-[#0d0d0f] data-[state=active]:text-white data-[state=active]:shadow-none">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Query Hub
                  <Badge className="ml-2 border border-orange-500/30 bg-orange-500/10 text-orange-300 hover:bg-orange-500/10">{urgentQueryCount}</Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="financials" className="space-y-4">
                <div className="grid gap-3 xl:grid-cols-3">
                  {Object.keys(REPORT_CARD_META).map((type) => (
                    <ReportTypeCard
                      key={type}
                      type={type}
                      selected={selectedFinancialType === type}
                      count={financialSummary[type] || 0}
                      onSelect={(nextType) => {
                        setSelectedFinancialType(nextType);
                        setFinancialPage(1);
                      }}
                    />
                  ))}
                </div>

                <div className="rounded-[24px] border border-white/10 bg-[#171719] p-4 md:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-2xl md:text-[2rem] font-semibold text-white">Financial Summary</h2>
                      <p className="mt-1.5 text-sm md:text-[15px] text-white/50">
                        {REPORT_TYPE_LABELS[selectedFinancialType]} documents for the selected reporting window.
                      </p>
                    </div>
                    <div className="hidden rounded-xl border border-white/10 bg-[#111113] px-3 py-1.5 text-xs text-white/50 md:block">
                      Limit 20 per page
                    </div>
                  </div>

                  <div className="mt-4 rounded-[22px] border border-dashed border-white/10 bg-[#121214] p-4">
                    {financialLoading ? (
                      <p className="text-center text-white/50">Loading financial reports...</p>
                    ) : (selectedFinancialResponse?.data || []).length === 0 ? (
                      <div className="flex min-h-[180px] items-center justify-center text-center text-white/45">
                        Select a report window with uploaded documents to view details here.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {(selectedFinancialResponse?.data || []).map((report) => (
                          <ReportRow key={report._id} report={report} onView={handleOpenReport} />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <PaginationBar
                      page={selectedFinancialResponse?.page || 1}
                      totalPages={selectedFinancialResponse?.total_pages || 1}
                      total={selectedFinancialResponse?.total || 0}
                      onPageChange={setFinancialPage}
                      tone="dark"
                    />
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-[#171719] p-4 md:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl md:text-[1.7rem] font-semibold text-white">Other Reports / Custom Reports</h2>
                      <p className="mt-1.5 text-sm md:text-[15px] text-white/50">
                        Reports tagged as other plus accountant-defined custom financial packs.
                      </p>
                    </div>
                    <Badge className="border border-white/10 bg-white/5 text-white hover:bg-white/5">
                      {otherFinancialResponse?.total || 0} total
                    </Badge>
                  </div>

                  <div className="mt-6 space-y-4">
                    {otherLoading ? (
                      <p className="text-white/50">Loading other reports...</p>
                    ) : (otherFinancialResponse?.data || []).length === 0 ? (
                      <div className="rounded-[24px] border border-dashed border-white/10 bg-[#121214] p-10 text-center text-white/45">
                        No custom or other financial reports found in this period.
                      </div>
                    ) : (
                      (otherFinancialResponse?.data || []).map((report) => (
                        <ReportRow key={report._id} report={report} onView={handleOpenReport} />
                      ))
                    )}
                  </div>

                  <div className="mt-4">
                    <PaginationBar
                      page={otherFinancialResponse?.page || 1}
                      totalPages={otherFinancialResponse?.total_pages || 1}
                      total={otherFinancialResponse?.total || 0}
                      onPageChange={setOtherPage}
                      tone="dark"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="compliance">
                <Card className="border-white/10 bg-[#171719] text-white">
                  <CardContent className="grid gap-4 p-6 md:grid-cols-3">
                    {[
                      {
                        title: "GST Working Papers",
                        description: "Invoice mapping complete and ready for filing.",
                      },
                      {
                        title: "Board Reporting Checklist",
                        description: "One payroll approval note is still pending before final issue.",
                      },
                      {
                        title: "Audit Support Folder",
                        description: "Supporting evidence attached and ready for reviewer access.",
                      },
                    ].map((item) => (
                      <div key={item.title} className="rounded-[24px] border border-white/10 bg-[#121214] p-5">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-400">
                          <FileSpreadsheet className="h-5 w-5" />
                        </div>
                        <h3 className="mt-5 text-xl font-semibold text-white">{item.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-white/55">{item.description}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="queries">
                <div className="rounded-[30px] border border-white/10 bg-white p-4 text-black">
                  <QueryResolutionHub
                    queries={liveQueries}
                    onCreateQuery={handleCreateQuery}
                    onUpdateQuery={handleUpdateQuery}
                    onAddComment={handleAddComment}
                    onFetchComments={handleFetchComments}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </PillarLayout>
  );
}
