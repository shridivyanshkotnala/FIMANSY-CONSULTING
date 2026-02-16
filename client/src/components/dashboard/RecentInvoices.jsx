import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { FileText, Loader2 } from "lucide-react";

/*
  PURE PRESENTATION COMPONENT
  Renders a list of invoices.
  No fetching, no auth, no database knowledge.
*/

const statusColors = {
  pending: "bg-warning/10 text-warning border-warning/20",
  reviewed: "bg-info/10 text-info border-info/20",
  synced: "bg-success/10 text-success border-success/20",
  error: "bg-destructive/10 text-destructive border-destructive/20",
};

export function RecentInvoices({ invoices = [], loading = false }) {

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Invoices</CardTitle>
        <CardDescription>Latest processed invoices</CardDescription>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>

        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No invoices yet</p>
            <p className="text-xs text-muted-foreground">
              Upload your first invoice to get started
            </p>
          </div>

        ) : (
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">{invoice.vendor_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {invoice.invoice_number} •{" "}
                    {format(new Date(invoice.created_at), "MMM d, yyyy")}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    {formatCurrency(invoice.total_with_gst)}
                  </span>

                  <Badge variant="outline" className={statusColors[invoice.status]}>
                    {invoice.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
