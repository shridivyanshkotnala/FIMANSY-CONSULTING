import { useEffect, useState } from "react";
import { format, subMonths } from "date-fns";
import {
  BarChart3,
  CalendarIcon,
  Landmark,
  MessageSquare,
  Shield,
  WalletCards,
  X,
} from "lucide-react";
import { PillarLayout } from "@/components/layout/PillarLayout";
import { QueryResolutionHub } from "@/components/transparency/QueryResolutionHub";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  useGetFinancialReportsQuery,
  useLazyGetFinancialReportViewUrlQuery,
} from "@/Redux/Slices/api/financialApi";
import {
  useGetComplianceLogsQuery,
  useLazyGetComplianceLogViewUrlQuery,
} from "@/Redux/Slices/api/complianceApi";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

const COMPLIANCE_RECURRENCE_OPTIONS = [
  { value: "all", label: "All Frequencies" },
  { value: "annual", label: "Yearly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "monthly", label: "Monthly" },
];

const COMPLIANCE_MONTH_OPTIONS = [
  { value: "april", label: "April" },
  { value: "may", label: "May" },
  { value: "june", label: "June" },
  { value: "july", label: "July" },
  { value: "august", label: "August" },
  { value: "september", label: "September" },
  { value: "october", label: "October" },
  { value: "november", label: "November" },
  { value: "december", label: "December" },
  { value: "january", label: "January" },
  { value: "february", label: "February" },
  { value: "march", label: "March" },
];

const COMPLIANCE_QUARTER_OPTIONS = [
  { value: "q1", label: "Q1 (Apr-Jun)" },
  { value: "q2", label: "Q2 (Jul-Sep)" },
  { value: "q3", label: "Q3 (Oct-Dec)" },
  { value: "q4", label: "Q4 (Jan-Mar)" },
];

function formatReportDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return format(date, "dd MMM yyyy");
}

function getCurrentFinancialYearLabel() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const startYear = month <= 3 ? year - 1 : year;
  const endYear = startYear + 1;
  return `${startYear}-${String(endYear).slice(-2)}`;
}

function toApiDate(value) {
  if (!value) return undefined;
  return format(value, "yyyy-MM-dd");
}

function formatDateRangeLabel(range, fallback) {
  if (!range?.from || !range?.to) return fallback;
  return `${format(range.from, "dd MMM yyyy")} - ${format(range.to, "dd MMM yyyy")}`;
}

function CompactDateRangeFilter({ label, range, onChange, fallback = "Select range", align = "start" }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-9 justify-start gap-2 rounded-lg border-white/10 bg-[#111113] px-3 text-xs text-white/80 hover:bg-white/5 hover:text-white"
        >
          <CalendarIcon className="h-3.5 w-3.5 text-white/60" />
          <span className="text-white/55">{label}</span>
          <span className="truncate text-white">{formatDateRangeLabel(range, fallback)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] rounded-[20px] border border-white/10 bg-[#101012] p-0 text-white shadow-[0_24px_60px_rgba(0,0,0,0.45)]" align={align}>
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">{label}</p>
          <p className="mt-1 text-sm font-medium text-white">{formatDateRangeLabel(range, fallback)}</p>
        </div>
        <Calendar
          mode="range"
          selected={{ from: range?.from, to: range?.to }}
          onSelect={(nextRange) => {
            if (nextRange?.from && nextRange?.to) {
              onChange({ from: nextRange.from, to: nextRange.to });
            }
          }}
          numberOfMonths={1}
          className="p-4"
          classNames={{
            months: "flex flex-col",
            month: "space-y-4",
            caption: "flex items-center justify-center pb-2 pt-1 relative",
            caption_label: "text-sm font-semibold text-white",
            nav: "flex items-center gap-1",
            nav_button: "h-8 w-8 rounded-md border border-white/10 bg-white/5 p-0 text-white opacity-100 hover:bg-white/10",
            nav_button_previous: "absolute left-0",
            nav_button_next: "absolute right-0",
            head_row: "grid grid-cols-7 gap-1",
            head_cell: "h-8 text-center text-[11px] font-medium text-white/45",
            row: "mt-1 grid grid-cols-7 gap-1",
            cell: "h-9 w-9 p-0 text-center text-sm",
            day: "h-9 w-9 rounded-md text-sm text-white hover:bg-white/10",
            day_selected: "bg-orange-500 text-white hover:bg-orange-500 hover:text-white focus:bg-orange-500 focus:text-white",
            day_range_middle: "bg-orange-500/15 text-white",
            day_today: "border border-white/20 bg-white/5 text-white",
            day_outside: "text-white/25",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function ReportFilterBar({
  reportLabel,
  filters,
  onPeriodChange,
  onReset,
}) {
  return (
    <div className="mt-4 flex flex-col gap-2 rounded-[18px] border border-white/10 bg-[#111113] p-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-white/35">Filters</p>
        <p className="mt-1 text-sm font-medium text-white/88">{reportLabel}</p>
      </div>
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <CompactDateRangeFilter
          label="Period"
          range={filters}
          onChange={onPeriodChange}
          fallback="All periods"
        />
        <Button
          type="button"
          variant="outline"
          className="h-9 gap-2 rounded-lg border-white/10 bg-transparent px-3 text-xs text-white/75 hover:bg-white/5 hover:text-white"
          onClick={onReset}
        >
          <X className="h-3.5 w-3.5" />
          Reset
        </Button>
      </div>
    </div>
  );
}

function ReportTypeCard({ type, selected, count, onSelect }) {
  const meta = REPORT_CARD_META[type];
  const Icon = meta.icon;

  return (
    <button type="button" onClick={() => onSelect(type)} className="text-left">
      <div
        className={cn(
          "rounded-[20px] border px-4 py-4 transition-all",
          selected
            ? "border-orange-400/45 bg-[#1b1b1d] shadow-[0_0_0_1px_rgba(255,255,255,0.03)]"
            : "border-white/10 bg-[#18181a] hover:border-white/20"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[16px] bg-orange-500/15 text-orange-400">
            <Icon className="h-4 w-4" />
          </div>
          <Badge className="border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white hover:bg-white/5">
            {count > 0 ? "Ready" : "No Reports"}
          </Badge>
        </div>
        <div className="mt-5">
          <h3 className="text-base font-semibold text-white md:text-[1.3rem] md:leading-none">{meta.title}</h3>
          <p className="mt-2 text-xs leading-5 text-white/52 md:text-[12px]">{meta.description}</p>
          <p className="mt-4 text-xs text-white/42">{count} report{count === 1 ? "" : "s"} available</p>
        </div>
      </div>
    </button>
  );
}

function ReportRow({ report, onView }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-[#151517] p-3.5 md:p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium text-white md:text-[14px]">{report.display_file_name || report.original_file_name}</p>
            <Badge className="border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/85 hover:bg-white/5">
              {REPORT_TYPE_LABELS[report.report_type] || "Report"}
            </Badge>
            {report.custom_tags?.map((tag) => (
              <Badge key={tag} className="border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[11px] text-orange-300 hover:bg-orange-500/10">
                {tag}
              </Badge>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-white/55 md:text-[13px]">
            Period: {formatReportDate(report.period_start)} - {formatReportDate(report.period_end)}
          </p>
          <p className="mt-1 text-xs text-white/40 md:text-[13px]">
            Uploaded on {formatReportDate(report.uploaded_at || report.createdAt)}
          </p>
        </div>
        <Button className="h-9 bg-orange-500 px-4 text-sm text-white hover:bg-orange-400" onClick={() => onView(report._id)}>
          View Report
        </Button>
      </div>
    </div>
  );
}

function ComplianceLogRow({ document, onView }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-[#151517] p-3.5 md:p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium text-white md:text-[14px]">{document.display_file_name || document.original_file_name}</p>
            <Badge className="border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/85 hover:bg-white/5">
              {document.recurrence_label || "Compliance"}
            </Badge>
            {document.compliance_category_label ? (
              <Badge className="border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[11px] text-orange-300 hover:bg-orange-500/10">
                {document.compliance_category_label}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1.5 text-xs text-white/55 md:text-[13px]">{document.compliance_obligation_name || "Verified compliance document"}</p>
          <p className="mt-1 text-xs text-white/40 md:text-[13px]">
            Due on {formatReportDate(document.due_date)} • FY {document.financial_year_label || document.financial_year}
          </p>
          <p className="mt-1 text-xs text-white/40 md:text-[13px]">
            {document.month_label || "-"}{document.quarter_label ? ` • ${document.quarter_label}` : ""}
          </p>
        </div>
        <Button className="h-9 bg-orange-500 px-4 text-sm text-white hover:bg-orange-400" onClick={() => onView(document._id)}>
          View Document
        </Button>
      </div>
    </div>
  );
}

function PaginationBar({ page, totalPages, total, onPageChange, tone = "dark" }) {
  const dark = tone === "dark";

  return (
    <div className="flex flex-col gap-2 border-t border-white/10 pt-3 text-xs md:flex-row md:items-center md:justify-between">
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
  const initialWindow = {
    from: subMonths(new Date(), 3),
    to: new Date(),
  };

  const [activeTab, setActiveTab] = useState("financials");
  const [selectedFinancialType, setSelectedFinancialType] = useState("profit_and_loss");
  const [financialPage, setFinancialPage] = useState(1);
  const [otherPage, setOtherPage] = useState(1);
  const [compliancePage, setCompliancePage] = useState(1);
  const [quickWindow, setQuickWindow] = useState(initialWindow);
  const [financialFilters, setFinancialFilters] = useState(initialWindow);
  const [otherFilters, setOtherFilters] = useState(initialWindow);
  const [selectedComplianceFY, setSelectedComplianceFY] = useState(getCurrentFinancialYearLabel());
  const [selectedComplianceRecurrence, setSelectedComplianceRecurrence] = useState("all");
  const [selectedComplianceMonth, setSelectedComplianceMonth] = useState("all");
  const [selectedComplianceQuarter, setSelectedComplianceQuarter] = useState("all");
  const [selectedComplianceTag, setSelectedComplianceTag] = useState("all");

  const {
    data: selectedFinancialResponse,
    isFetching: financialLoading,
  } = useGetFinancialReportsQuery({
    reportType: selectedFinancialType,
    periodStart: toApiDate(financialFilters?.from),
    periodEnd: toApiDate(financialFilters?.to),
    page: financialPage,
    limit: 20,
  });

  // Card counts must represent total documents per type for current window,
  // independent of selected card/type.
  const { data: profitLossCountResponse } = useGetFinancialReportsQuery({
    reportType: "profit_and_loss",
    periodStart: toApiDate(quickWindow?.from),
    periodEnd: toApiDate(quickWindow?.to),
    page: 1,
    limit: 1,
  });

  const { data: balanceSheetCountResponse } = useGetFinancialReportsQuery({
    reportType: "balance_sheet",
    periodStart: toApiDate(quickWindow?.from),
    periodEnd: toApiDate(quickWindow?.to),
    page: 1,
    limit: 1,
  });

  const { data: cashflowCountResponse } = useGetFinancialReportsQuery({
    reportType: "cashflow_statement",
    periodStart: toApiDate(quickWindow?.from),
    periodEnd: toApiDate(quickWindow?.to),
    page: 1,
    limit: 1,
  });

  const {
    data: otherFinancialResponse,
    isFetching: otherLoading,
  } = useGetFinancialReportsQuery({
    reportType: "other",
    periodStart: toApiDate(otherFilters?.from),
    periodEnd: toApiDate(otherFilters?.to),
    page: otherPage,
    limit: 20,
  });

  const {
    data: complianceLogsResponse,
    isFetching: complianceLoading,
  } = useGetComplianceLogsQuery({
    financial_year: selectedComplianceFY || undefined,
    recurrence_type: selectedComplianceRecurrence !== "all" ? selectedComplianceRecurrence : undefined,
    month:
      selectedComplianceRecurrence === "monthly" && selectedComplianceMonth !== "all"
        ? selectedComplianceMonth
        : undefined,
    quarter:
      selectedComplianceRecurrence === "quarterly" && selectedComplianceQuarter !== "all"
        ? selectedComplianceQuarter
        : undefined,
    obligation_tag: selectedComplianceTag !== "all" ? selectedComplianceTag : undefined,
    page: compliancePage,
    limit: 20,
  });

  const [fetchFinancialViewUrl] = useLazyGetFinancialReportViewUrlQuery();
  const [fetchComplianceLogViewUrl] = useLazyGetComplianceLogViewUrlQuery();
  const complianceFilterOptions = complianceLogsResponse?.filter_options || {
    financial_years: [],
    obligation_tags: [],
  };
  const financialSummary = {
    profit_and_loss: profitLossCountResponse?.total ?? selectedFinancialResponse?.summary?.profit_and_loss ?? 0,
    balance_sheet: balanceSheetCountResponse?.total ?? selectedFinancialResponse?.summary?.balance_sheet ?? 0,
    cashflow_statement: cashflowCountResponse?.total ?? selectedFinancialResponse?.summary?.cashflow_statement ?? 0,
    other: selectedFinancialResponse?.summary?.other ?? 0,
  };

  useEffect(() => {
    if (selectedComplianceRecurrence !== "monthly" && selectedComplianceMonth !== "all") {
      setSelectedComplianceMonth("all");
    }
    if (selectedComplianceRecurrence !== "quarterly" && selectedComplianceQuarter !== "all") {
      setSelectedComplianceQuarter("all");
    }
    setCompliancePage(1);
  }, [selectedComplianceRecurrence]);

  useEffect(() => {
    if (!complianceFilterOptions.financial_years.length) return;
    const hasSelectedYear = complianceFilterOptions.financial_years.some((item) => item.value === selectedComplianceFY);
    if (!hasSelectedYear) {
      setSelectedComplianceFY(complianceFilterOptions.financial_years[0].value);
    }
  }, [complianceFilterOptions.financial_years, selectedComplianceFY]);

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

  const handleOpenComplianceLog = async (documentId) => {
    try {
      const payload = await fetchComplianceLogViewUrl(documentId).unwrap();
      if (payload?.signedUrl) {
        window.open(payload.signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      toast.error(error?.data?.message || error?.message || "Could not open the compliance document");
    }
  };

  return (
    <PillarLayout>
      <div className="min-h-screen bg-[#0a0a0b] px-2 py-3 text-white md:px-5">
        <div className="mx-auto max-w-7xl space-y-3">
          <div className="rounded-[26px] border border-white/10 bg-[#0f0f11] p-3.5 shadow-[0_18px_55px_rgba(0,0,0,0.32)] md:p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-orange-500 text-white">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-semibold tracking-tight md:text-[1.55rem]">Reports</h1>
                    <Badge className="border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[11px] text-orange-300 hover:bg-orange-500/10">
                      Live
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-white/55">Insights & Output Layer</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <CompactDateRangeFilter
                  label="Window"
                  range={quickWindow}
                  fallback="Select reporting window"
                  align="end"
                  onChange={(nextWindow) => {
                    setQuickWindow(nextWindow);
                    setFinancialFilters(nextWindow);
                    setOtherFilters(nextWindow);
                    setFinancialPage(1);
                    setOtherPage(1);
                  }}
                />
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-5 space-y-3">
              <TabsList className="grid h-auto w-full grid-cols-1 gap-2 rounded-[18px] bg-white/8 p-1.5 md:grid-cols-3">
                <TabsTrigger value="financials" className="rounded-lg px-3 py-2.5 text-sm data-[state=active]:bg-[#0d0d0f] data-[state=active]:text-white data-[state=active]:shadow-none">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Financials
                </TabsTrigger>
                <TabsTrigger value="compliance" className="rounded-lg px-3 py-2.5 text-sm data-[state=active]:bg-[#0d0d0f] data-[state=active]:text-white data-[state=active]:shadow-none">
                  <Shield className="mr-2 h-4 w-4" />
                  Compliance Logs
                </TabsTrigger>
                <TabsTrigger value="queries" className="rounded-lg px-3 py-2.5 text-sm data-[state=active]:bg-[#0d0d0f] data-[state=active]:text-white data-[state=active]:shadow-none">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Query Hub
                </TabsTrigger>
              </TabsList>

              <TabsContent value="financials" className="space-y-3">
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

                <div className="rounded-[22px] border border-white/10 bg-[#171719] p-4 md:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-white md:text-[1.18rem]">Financial Summary</h2>
                      <p className="mt-1 text-xs md:text-sm text-white/50">
                        {REPORT_TYPE_LABELS[selectedFinancialType]} documents for the selected reporting window.
                      </p>
                    </div>
                    <div className="hidden rounded-lg border border-white/10 bg-[#111113] px-3 py-1.5 text-[11px] text-white/50 md:block">
                      Limit 20 per page
                    </div>
                  </div>

                  <ReportFilterBar
                    reportLabel={REPORT_TYPE_LABELS[selectedFinancialType]}
                    filters={financialFilters}
                    onPeriodChange={(nextRange) => {
                      setFinancialFilters(nextRange);
                      setFinancialPage(1);
                    }}
                    onReset={() => {
                      setFinancialFilters(quickWindow);
                      setFinancialPage(1);
                    }}
                  />

                  <div className="mt-3 rounded-[20px] border border-dashed border-white/10 bg-[#121214] p-3.5">
                    {financialLoading ? (
                      <p className="text-center text-xs md:text-sm text-white/50">Loading financial reports...</p>
                    ) : (selectedFinancialResponse?.data || []).length === 0 ? (
                      <div className="flex min-h-[140px] items-center justify-center text-center text-sm text-white/45">
                        No reports matched the current period filters.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(selectedFinancialResponse?.data || []).map((report) => (
                          <ReportRow key={report._id} report={report} onView={handleOpenReport} />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <PaginationBar
                      page={selectedFinancialResponse?.page || 1}
                      totalPages={selectedFinancialResponse?.total_pages || 1}
                      total={selectedFinancialResponse?.total || 0}
                      onPageChange={setFinancialPage}
                      tone="dark"
                    />
                  </div>
                </div>

                <div className="rounded-[22px] border border-white/10 bg-[#171719] p-4 md:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-white md:text-[1.08rem]">Other Reports / Custom Reports</h2>
                      <p className="mt-1 text-xs md:text-sm text-white/50">
                        Reports tagged as other plus accountant-defined custom financial packs.
                      </p>
                    </div>
                    <Badge className="border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white hover:bg-white/5">
                      {otherFinancialResponse?.total || 0} total
                    </Badge>
                  </div>

                  <ReportFilterBar
                    reportLabel={REPORT_TYPE_LABELS.other}
                    filters={otherFilters}
                    onPeriodChange={(nextRange) => {
                      setOtherFilters(nextRange);
                      setOtherPage(1);
                    }}
                    onReset={() => {
                      setOtherFilters(quickWindow);
                      setOtherPage(1);
                    }}
                  />

                  <div className="mt-3 space-y-3">
                    {otherLoading ? (
                      <p className="text-xs md:text-sm text-white/50">Loading other reports...</p>
                    ) : (otherFinancialResponse?.data || []).length === 0 ? (
                      <div className="rounded-[20px] border border-dashed border-white/10 bg-[#121214] p-8 text-center text-sm text-white/45">
                        No custom or other reports matched the current filters.
                      </div>
                    ) : (
                      (otherFinancialResponse?.data || []).map((report) => (
                        <ReportRow key={report._id} report={report} onView={handleOpenReport} />
                      ))
                    )}
                  </div>

                  <div className="mt-3">
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

              <TabsContent value="compliance" className="space-y-3">
                <div className="rounded-[22px] border border-white/10 bg-[#171719] p-4 md:p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-white md:text-[1.18rem]">Compliance Logs</h2>
                      <p className="mt-1 text-xs md:text-sm text-white/50">
                        Final verified compliance documents grouped by financial year, recurrence, and obligation tag.
                      </p>
                    </div>
                    <Badge className="border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white hover:bg-white/5">
                      {complianceLogsResponse?.total || 0} verified docs
                    </Badge>
                  </div>

                  <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                    <Select
                      value={selectedComplianceFY}
                      onValueChange={(value) => {
                        setSelectedComplianceFY(value);
                        setCompliancePage(1);
                      }}
                    >
                      <SelectTrigger className="h-9 rounded-lg border-white/10 bg-[#111113] text-xs md:text-sm text-white">
                        <SelectValue placeholder="Financial year" />
                      </SelectTrigger>
                      <SelectContent>
                        {(complianceFilterOptions.financial_years || []).length ? (
                          (complianceFilterOptions.financial_years || []).map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))
                        ) : (
                          <SelectItem value={selectedComplianceFY}>{selectedComplianceFY}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>

                    <Select
                      value={selectedComplianceRecurrence}
                      onValueChange={(value) => {
                        setSelectedComplianceRecurrence(value);
                        setCompliancePage(1);
                      }}
                      disabled={!selectedComplianceFY}
                    >
                      <SelectTrigger className="h-9 rounded-lg border-white/10 bg-[#111113] text-xs md:text-sm text-white">
                        <SelectValue placeholder="Frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPLIANCE_RECURRENCE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedComplianceRecurrence === "monthly" ? (
                      <Select
                        value={selectedComplianceMonth}
                        onValueChange={(value) => {
                          setSelectedComplianceMonth(value);
                          setCompliancePage(1);
                        }}
                      >
                        <SelectTrigger className="h-9 rounded-lg border-white/10 bg-[#111113] text-xs md:text-sm text-white">
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Months</SelectItem>
                          {COMPLIANCE_MONTH_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : selectedComplianceRecurrence === "quarterly" ? (
                      <Select
                        value={selectedComplianceQuarter}
                        onValueChange={(value) => {
                          setSelectedComplianceQuarter(value);
                          setCompliancePage(1);
                        }}
                      >
                        <SelectTrigger className="h-9 rounded-lg border-white/10 bg-[#111113] text-xs md:text-sm text-white">
                          <SelectValue placeholder="Quarter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Quarters</SelectItem>
                          {COMPLIANCE_QUARTER_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex h-9 items-center rounded-lg border border-white/10 bg-[#111113] px-3 text-xs text-white/45 md:text-sm">
                        {selectedComplianceRecurrence === "annual" ? "Yearly compliances selected" : "Select a frequency"}
                      </div>
                    )}

                    <Select
                      value={selectedComplianceTag}
                      onValueChange={(value) => {
                        setSelectedComplianceTag(value);
                        setCompliancePage(1);
                      }}
                    >
                      <SelectTrigger className="h-9 rounded-lg border-white/10 bg-[#111113] text-xs md:text-sm text-white">
                        <SelectValue placeholder="Main tag" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Main Tags</SelectItem>
                        {(complianceFilterOptions.obligation_tags || []).map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-lg border-white/10 bg-transparent px-3 text-xs text-white/75 hover:bg-white/5 hover:text-white md:text-sm"
                      onClick={() => {
                        const resetFinancialYear = complianceFilterOptions.financial_years?.[0]?.value || getCurrentFinancialYearLabel();
                        setSelectedComplianceFY(resetFinancialYear);
                        setSelectedComplianceRecurrence("all");
                        setSelectedComplianceMonth("all");
                        setSelectedComplianceQuarter("all");
                        setSelectedComplianceTag("all");
                        setCompliancePage(1);
                      }}
                    >
                      Reset Filters
                    </Button>
                  </div>

                  <div className="mt-3 rounded-[20px] border border-dashed border-white/10 bg-[#121214] p-3.5">
                    {complianceLoading ? (
                      <p className="text-center text-xs md:text-sm text-white/50">Loading compliance logs...</p>
                    ) : (complianceLogsResponse?.data || []).length === 0 ? (
                      <div className="flex min-h-[140px] items-center justify-center text-center text-sm text-white/45">
                        No final verified compliance documents matched the current filters.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(complianceLogsResponse?.data || []).map((document) => (
                          <ComplianceLogRow key={document._id} document={document} onView={handleOpenComplianceLog} />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <PaginationBar
                      page={complianceLogsResponse?.page || 1}
                      totalPages={complianceLogsResponse?.total_pages || 1}
                      total={complianceLogsResponse?.total || 0}
                      onPageChange={setCompliancePage}
                      tone="dark"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="queries">
                <div className="p-0">
                  <QueryResolutionHub />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </PillarLayout>
  );
}
