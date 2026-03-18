import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

export function TicketDocuments() {
  return (
    <div className="text-center py-8">
      <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
      <p className="text-sm font-medium">No documents uploaded yet</p>
      <p className="text-xs text-muted-foreground mt-1">
        Upload filed returns, challans, ARNs and supporting documents
      </p>
      <Button variant="outline" size="sm" className="mt-4">
        Upload Document
      </Button>
    </div>
  );
}