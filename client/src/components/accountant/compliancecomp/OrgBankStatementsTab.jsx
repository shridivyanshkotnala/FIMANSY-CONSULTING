import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetAccountantCompanyDocumentsQuery } from "@/Redux/Slices/api/companyDocumentsApi";
import { FileText } from "lucide-react";

const formatFileSize = (bytes) => {
  const size = Number(bytes || 0);
  if (!size) return "0 B";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDateTime = (dateString) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};

export function OrgBankStatementsTab({ orgId }) {
  const { data: statements = [], isFetching } = useGetAccountantCompanyDocumentsQuery(
    { orgId, documentType: "bank_statement" },
    { skip: !orgId }
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bank Statements</CardTitle>
        <CardDescription>
          All bank statements uploaded by this organization are stored in Cloudflare R2 and listed here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isFetching ? (
          <p className="text-sm text-muted-foreground">Loading bank statements...</p>
        ) : statements.length === 0 ? (
          <div className="text-center py-8 border rounded-md">
            <FileText className="h-9 w-9 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">No bank statements uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {statements.map((doc) => {
              const uploadedByRole = doc?.uploaded_by_role === "accountant" || doc?.uploaded_by_role === "admin"
                ? "Accountant"
                : "Client";

              return (
                <div key={doc._id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{doc.display_file_name || doc.original_file_name || "Bank Statement"}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatFileSize(doc.file_size)} • {uploadedByRole} • {formatDateTime(doc.createdAt)}
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
