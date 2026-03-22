import { useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { FileBarChart, Filter, Loader2, Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { uploadFileToSignedUrl } from "@/lib/r2Upload";
import {
  useCompleteAccountantFinancialReportUploadMutation,
  useGetAccountantFinancialReportsQuery,
  useInitAccountantFinancialReportUploadMutation,
  useLazyGetAccountantFinancialReportViewUrlQuery,
} from "@/Redux/Slices/api/financialApi";

const REPORT_TYPE_OPTIONS = [
  { value: "all", label: "All Reports" },
  { value: "profit_and_loss", label: "Profit & Loss" },
  { value: "balance_sheet", label: "Balance Sheet" },
  { value: "cashflow_statement", label: "Cashflow Statement" },
  { value: "other", label: "Other / Custom" },
];

const REPORT_TYPE_LABELS = {
  profit_and_loss: "Profit & Loss",
  balance_sheet: "Balance Sheet",
  cashflow_statement: "Cashflow Statement",
  other: "Other / Custom",
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return format(date, "dd MMM yyyy");
};

export function OrgFinancialReportsTab({ orgId }) {
  const fileInputRef = useRef(null);
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [reportType, setReportType] = useState("all");
  const [customTag, setCustomTag] = useState("");
  const [search, setSearch] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    reportType: "profit_and_loss",
    customTags: "",
    periodStart: "",
    periodEnd: "",
  });

  const queryArgs = useMemo(
    () => ({
      orgId,
      reportType: reportType === "all" ? undefined : reportType,
      customTag: customTag.trim() || undefined,
      search: search.trim() || undefined,
      periodStart: periodStart || undefined,
      periodEnd: periodEnd || undefined,
      page,
      limit: 20,
    }),
    [orgId, reportType, customTag, search, periodStart, periodEnd, page]
  );

  const { data, isFetching } = useGetAccountantFinancialReportsQuery(queryArgs, { skip: !orgId });
  const [initUpload] = useInitAccountantFinancialReportUploadMutation();
  const [completeUpload] = useCompleteAccountantFinancialReportUploadMutation();
  const [fetchViewUrl] = useLazyGetAccountantFinancialReportViewUrlQuery();

  const reports = data?.data || [];

  const openFilePicker = () => fileInputRef.current?.click();

  const handleView = async (reportId) => {
    try {
      const payload = await fetchViewUrl({ orgId, reportId }).unwrap();
      if (payload?.signedUrl) {
        window.open(payload.signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      toast({
        title: "Unable to open report",
        description: error?.data?.message || error?.message || "Could not generate the report view URL",
        variant: "destructive",
      });
    }
  };

  const handleSelectFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !orgId) return;

    if (file.type !== "application/pdf") {
      toast({
        title: "Invalid file",
        description: "Only PDF files are allowed",
        variant: "destructive",
      });
      return;
    }

    if (!uploadForm.periodStart || !uploadForm.periodEnd) {
      toast({
        title: "Missing report period",
        description: "Choose the report period before uploading the file.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const body = {
        fileName: file.name,
        contentType: file.type || "application/pdf",
        fileSize: file.size,
        reportType: uploadForm.reportType,
        periodStart: uploadForm.periodStart,
        periodEnd: uploadForm.periodEnd,
        customTags: uploadForm.customTags,
      };

      const initData = await initUpload({ orgId, body }).unwrap();
      await uploadFileToSignedUrl(file, initData.uploadUrl);
      await completeUpload({ orgId, body: { ...body, key: initData.key } }).unwrap();

      toast({
        title: "Financial report uploaded",
        description: "The report is now available in the Financial Docs tab.",
      });
      setIsUploadOpen(false);
      setUploadForm({
        reportType: "profit_and_loss",
        customTags: "",
        periodStart: "",
        periodEnd: "",
      });
      setPage(1);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error?.data?.message || error?.message || "Could not upload the financial report",
        variant: "destructive",
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Documents</CardTitle>
        <CardDescription>
          Upload and manage Profit & Loss, Balance Sheet, Cashflow, and custom financial reports for this organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="pl-9" placeholder="Search file name or custom tag" />
          </div>
          <Select value={reportType} onValueChange={(value) => { setReportType(value); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Report type" />
            </SelectTrigger>
            <SelectContent>
              {REPORT_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={customTag}
            onChange={(event) => { setCustomTag(event.target.value); setPage(1); }}
            placeholder="Filter by custom tag"
            className="w-[180px]"
          />
          <Input type="date" value={periodStart} onChange={(event) => { setPeriodStart(event.target.value); setPage(1); }} className="w-[160px]" />
          <Input type="date" value={periodEnd} onChange={(event) => { setPeriodEnd(event.target.value); setPage(1); }} className="w-[160px]" />
          <Button onClick={() => setIsUploadOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Financial Report
          </Button>
        </div>

        {isFetching ? (
          <p className="text-sm text-muted-foreground">Loading financial reports...</p>
        ) : reports.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            <FileBarChart className="mx-auto mb-3 h-10 w-10" />
            No financial reports found for the current filters.
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div key={report._id} className="rounded-xl border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">{report.display_file_name || report.original_file_name}</p>
                      <Badge variant="secondary">{REPORT_TYPE_LABELS[report.report_type] || "Other"}</Badge>
                      {report.custom_tags?.map((tag) => (
                        <Badge key={tag} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Period: {formatDate(report.period_start)} - {formatDate(report.period_end)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Uploaded: {formatDate(report.uploaded_at || report.createdAt)}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => handleView(report._id)}>View</Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-4 text-sm text-muted-foreground">
          <span>
            Page {data?.page || 1} of {data?.total_pages || 1} • {data?.total || 0} reports
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={(data?.page || 1) <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              Prev
            </Button>
            <Button variant="outline" size="sm" disabled={(data?.page || 1) >= (data?.total_pages || 1)} onClick={() => setPage((current) => current + 1)}>
              Next
            </Button>
          </div>
        </div>
      </CardContent>

      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Financial Report</DialogTitle>
            <DialogDescription>
              Choose the report type, report period, and optional custom tags before uploading the PDF.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Type of report</Label>
              <Select value={uploadForm.reportType} onValueChange={(value) => setUploadForm((current) => ({ ...current, reportType: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPE_OPTIONS.filter((option) => option.value !== "all").map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="financial-period-start">Period start</Label>
                <Input id="financial-period-start" type="date" value={uploadForm.periodStart} onChange={(event) => setUploadForm((current) => ({ ...current, periodStart: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="financial-period-end">Period end</Label>
                <Input id="financial-period-end" type="date" value={uploadForm.periodEnd} onChange={(event) => setUploadForm((current) => ({ ...current, periodEnd: event.target.value }))} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="financial-custom-tags">Custom tags</Label>
              <Input
                id="financial-custom-tags"
                value={uploadForm.customTags}
                onChange={(event) => setUploadForm((current) => ({ ...current, customTags: event.target.value }))}
                placeholder="board-pack, investor-update, audit-review"
              />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="absolute -z-10 h-px w-px opacity-0 pointer-events-none"
              onChange={handleSelectFile}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadOpen(false)} disabled={uploading}>Cancel</Button>
            <Button onClick={openFilePicker} disabled={uploading} className="gap-2">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Uploading..." : "Choose PDF & Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
