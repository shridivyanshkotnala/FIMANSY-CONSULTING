import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTickets } from "@/hooks/useTickets";
import { ExternalLink, FileText, Loader2, Upload } from "lucide-react";

const formatDateTime = (dateString) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};

const formatFileSize = (bytes) => {
  const size = Number(bytes || 0);
  if (!size) return "0 B";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export function TicketDocuments({ ticketId }) {
  const fileInputRef = useRef(null);
  const { toast } = useToast();
  const { getTicketDocuments, uploadTicketDocument } = useTickets();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadDocuments = async () => {
    if (!ticketId) return;
    setLoading(true);
    const { data, error } = await getTicketDocuments(ticketId);
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive",
      });
    } else {
      setDocuments(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const handleSelectFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !ticketId) return;

    setUploading(true);
    const { error } = await uploadTicketDocument(ticketId, {
      file,
      intent: "working_doc",
      message: `Client uploaded document: ${file.name}`,
    });

    if (error) {
      toast({
        title: "Upload failed",
        description: error?.message || "Could not upload document",
        variant: "destructive",
      });
    } else {
      toast({ title: "Uploaded", description: "Document uploaded successfully" });
      await loadDocuments();
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setUploading(false);
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 rounded-md border p-3">
        <div>
          <p className="text-sm font-medium">Upload Documents</p>
          <p className="text-xs text-muted-foreground">
            Upload supporting files. Final verification can only be marked by accountant.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="absolute -z-10 h-px w-px opacity-0 pointer-events-none"
            onChange={handleSelectFile}
            accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.xls,.xlsx,.zip,.doc,.docx,.txt"
          />
          <Button
            type="button"
            size="sm"
            onClick={openFilePicker}
            disabled={uploading}
            className="gap-1.5"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading documents...</p>
      ) : documents.length === 0 ? (
        <div className="text-center py-8 border rounded-md">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium">No documents uploaded yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Uploaded files by client or accountant will appear here.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4 gap-1.5"
            onClick={openFilePicker}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Uploading..." : "Upload Document"}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const url = doc?.url;
            const uploadedByRole = doc?.uploaded_by_role === "accountant" || doc?.uploaded_by_role === "admin"
              ? "Accountant"
              : "Client";

            return (
              <div key={doc?._id || `${doc?.key}-${doc?.createdAt}`} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc?.display_file_name || doc?.original_file_name || "Document"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatFileSize(doc?.file_size)} • Uploaded by {uploadedByRole} • {formatDateTime(doc?.createdAt)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        variant={uploadedByRole === "Accountant" ? "default" : "secondary"}
                      >
                        {uploadedByRole} Upload
                      </Badge>
                      {doc?.is_final_verified ? (
                        <Badge className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400">
                          Final Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Working Document</Badge>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5"
                    disabled={!url}
                    onClick={() => {
                      if (url) window.open(url, "_blank", "noopener,noreferrer");
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                    View
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}