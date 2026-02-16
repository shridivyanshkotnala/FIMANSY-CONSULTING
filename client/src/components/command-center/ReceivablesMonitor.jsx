import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { differenceInDays, format } from "date-fns";
import { AlertCircle, ArrowRight, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  ReceivablesMonitor
  ------------------
  Shows unpaid customer invoices and highlights risk based on aging.

  IMPORTANT:
  We removed Supabase fetching but PRESERVED all financial logic:
    - daysOutstanding calculation
    - overdue classification rules

  Later Redux/API should supply:
    receivables: [
      { id, invoice_number, vendor_name, date_of_issue, total_with_gst, status }
    ]
*/

export function ReceivablesMonitor() {
  const navigate = useNavigate();
  const [receivables, setReceivables] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    /*
      TODO: Replace with Redux selector / API call
      Example:
      dispatch(fetchReceivables())
      OR
      const data = useSelector(selectReceivables)
    */

    // Temporary mock structure
    const mockInvoices = [];

    const today = new Date();

    // PRESERVED BUSINESS LOGIC (do not remove)
    const enriched = mockInvoices.map(inv => ({
      ...inv,
      daysOutstanding: differenceInDays(today, new Date(inv.date_of_issue)),
    }));

    setReceivables(enriched);
    setLoading(false);
  }, []);

  // Currency formatter
  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  /*
    Aging classification rules (FINANCIAL LOGIC — KEEP)
    > 60 = Critical
    > 30 = Overdue
    > 15 = Due Soon
    else = Current
  */
  const getOverdueStatus = (days) => {
    if (days > 60) return { label: "Critical", variant: "destructive", isWarning: false };
    if (days > 30) return { label: "Overdue", variant: "destructive", isWarning: false };
    if (days > 15) return { label: "Due Soon", variant: "outline", isWarning: true };
    return { label: "Current", variant: "secondary", isWarning: false };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Receivables Monitor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Receivables Monitor
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Unpaid customer invoices requiring follow-up
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/documents?filter=receivables")}
        >
          View All <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>

      <CardContent>
        {receivables.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No pending receivables</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice No</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Invoice Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Days Outstanding</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {receivables.map((item) => {
                const status = getOverdueStatus(item.daysOutstanding);
                const isOverdue = item.daysOutstanding > 30;

                return (
                  <TableRow
                    key={item.id}
                    className={cn(
                      "cursor-pointer hover:bg-muted/50",
                      isOverdue && "bg-destructive/5 hover:bg-destructive/10"
                    )}
                    onClick={() => navigate(`/documents/${item.id}`)}
                  >
                    <TableCell className="font-medium">{item.invoice_number}</TableCell>
                    <TableCell>{item.vendor_name}</TableCell>
                    <TableCell>
                      {format(new Date(item.date_of_issue), "dd MMM yyyy")}
                    </TableCell>

                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.total_with_gst)}
                    </TableCell>

                    <TableCell className="text-center">
                      <span className={cn("font-medium", isOverdue && "text-destructive")}>
                        {item.daysOutstanding} days
                      </span>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={status.variant}
                        className={cn(
                          status.isWarning && "border-warning text-warning bg-warning/10"
                        )}
                      >
                        {isOverdue && <AlertCircle className="h-3 w-3 mr-1" />}
                        {status.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
