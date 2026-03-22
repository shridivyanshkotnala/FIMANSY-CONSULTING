import { useRef, useState } from "react";
import { FileText, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { uploadFileToSignedUrl } from "@/lib/r2Upload";
import {
  useCompleteAccountantCompanyDocumentUploadMutation,
  useGetAccountantCompanyDocumentsQuery,
  useInitAccountantCompanyDocumentUploadMutation,
} from "@/Redux/Slices/api/companyDocumentsApi";
import { OrgFinancialReportsTab } from "./OrgFinancialReportsTab";

const DOC_TYPES = [
  { value: "loan", label: "Loan" },
  { value: "equity", label: "Equity" },
  { value: "other", label: "Other" },
];

const formatFileSize = (bytes) => {
  const size = Number(bytes || 0);
  if (!size) return "0 B";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDateTime = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

function OrganizationDocsPane({ orgId }) {
  const fileInputRef = useRef(null);
  const { toast } = useToast();
  const [filterType, setFilterType] = useState("all");
  const [uploadType, setUploadType] = useState("loan");
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  const { data: documents = [], isFetching } = useGetAccountantCompanyDocumentsQuery(
    {
      orgId,
      documentType: filterType === "all" ? undefined : filterType,
    },
    { skip: !orgId }
  );

  const [initUpload] = useInitAccountantCompanyDocumentUploadMutation();
  const [completeUpload] = useCompleteAccountantCompanyDocumentUploadMutation();

  const openFilePicker = () => fileInputRef.current?.click();

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

    setUploading(true);
    try {
      const initData = await initUpload({
        orgId,
        body: {
          fileName: file.name,
          contentType: file.type || "application/pdf",
          fileSize: file.size,
          documentType: uploadType,
        },
      }).unwrap();

      await uploadFileToSignedUrl(file, initData.uploadUrl);

      await completeUpload({
        orgId,
        body: {
          key: initData.key,
          fileName: file.name,
          contentType: file.type || "application/pdf",
          fileSize: file.size,
          documentType: uploadType,
        },
      }).unwrap();

      toast({
        title: "Uploaded",
        description: "Company document uploaded successfully",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error?.data?.message || error?.message || "Could not upload document",
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
        <CardTitle>Organization Documents</CardTitle>
        <CardDescription>
          Upload or review Loan, Equity, and Other documents shared by client or accountant.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={uploadType} onValueChange={setUploadType}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="Upload type" />
            </SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="absolute -z-10 h-px w-px opacity-0 pointer-events-none"
            onChange={handleSelectFile}
          />

          <Button size="sm" className="h-8 gap-1.5" onClick={openFilePicker} disabled={uploading}>
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {uploading ? "Uploading..." : "Upload Document"}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={filterType}
            onValueChange={(value) => {
              setFilterType(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {DOC_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isFetching ? (
          <p className="text-sm text-muted-foreground">Loading documents...</p>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 border rounded-md">
            <FileText className="h-9 w-9 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">No company documents uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(() => {
              const totalPages = Math.max(1, Math.ceil(documents.length / PAGE_SIZE));
              const safePage = Math.min(page, totalPages);
              const paginatedDocuments = documents.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

              return (
                <>
                  {paginatedDocuments.map((doc) => {
                    const uploadedByRole = doc?.uploaded_by_role === "accountant" || doc?.uploaded_by_role === "admin"
                      ? "Accountant"
                      : "Client";

                    return (
                      <div key={doc._id} className="rounded-md border p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{doc.display_file_name || doc.original_file_name || "Document"}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {(doc.document_type || "other").toUpperCase()} • {formatFileSize(doc.file_size)} • {uploadedByRole} • {formatDateTime(doc.createdAt)}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(doc.url, "_blank", "noopener,noreferrer")}
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <p className="text-xs text-muted-foreground">
                        Page {safePage} of {totalPages} &middot; {documents.length} document{documents.length !== 1 ? "s" : ""}
                      </p>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 text-xs"
                          disabled={safePage <= 1}
                          onClick={() => setPage(safePage - 1)}
                        >
                          &larr; Prev
                        </Button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter((p) => Math.abs(p - safePage) <= 2)
                          .map((p) => (
                            <Button
                              key={p}
                              variant={p === safePage ? "default" : "outline"}
                              size="sm"
                              className="h-7 w-7 p-0 text-xs"
                              onClick={() => setPage(p)}
                            >
                              {p}
                            </Button>
                          ))}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 text-xs"
                          disabled={safePage >= totalPages}
                          onClick={() => setPage(safePage + 1)}
                        >
                          Next &rarr;
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function OrgCompanyDocumentsTab({ orgId }) {
  return (
    <Tabs defaultValue="organization_docs" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="organization_docs">Organization Docs</TabsTrigger>
        <TabsTrigger value="financial_docs">Financial Docs</TabsTrigger>
      </TabsList>

      <TabsContent value="organization_docs">
        <OrganizationDocsPane orgId={orgId} />
      </TabsContent>

      <TabsContent value="financial_docs">
        <OrgFinancialReportsTab orgId={orgId} />
      </TabsContent>
    </Tabs>
  );
}
