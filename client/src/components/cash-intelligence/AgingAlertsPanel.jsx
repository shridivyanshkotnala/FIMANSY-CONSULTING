import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGetAgingAlertsQuery, useGetAgingBucketsQuery } from "@/Redux/Slices/api/agingApi";

// ===== TEMP DATABASE CLIENT (REMOVE LATER → Backend API / RTK Query) =====
// import { supabase } from "@/integrations/supabase/client";

// ===== AUTH CONTEXT (LATER → REDUX AUTH SLICE SELECTOR) =====
// import { useAuth } from "@/hooks/useAuth";


import {
  Bell,
  Clock,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * AgingInvoice Shape (Converted from TS interface)
 * id: string
 * invoice_number: string
 * vendor_name: string
 * date_of_issue: string
 * total_with_gst: number
 * daysOutstanding: number
 * alertLevel: 'soft' | 'firm' | 'legal'
 * lastReminderSent?: string
 */

export function AgingAlertsPanel() {
  // ===== ORGANIZATION FROM AUTH CONTEXT =====
  // const { organization } = useAuth();

  // ===== LOCAL UI STATE =====
  // const [invoices, setInvoices] = useState([]);




  // ===== CURRENCY FORMATTER =====
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const { data, isLoading } = useGetAgingAlertsQuery();
  const { data: bucketData } = useGetAgingBucketsQuery();

  const bucket_30_45 = bucketData?.data?.bucket_30_45 || [];
  const bucket_46_plus = bucketData?.data?.bucket_46_plus || [];
  const bucket_0_30 = bucketData?.data?.bucket_0_30 || [];


  const invoices = data?.data || [];

  // ===== ALERT BADGE COMPONENT LOGIC =====
  const getAlertBadge = (level) => {
    switch (level) {
      case "legal":
        return <Badge variant="destructive">MSMED Legal</Badge>;
      case "firm":
        return <Badge className="bg-warning text-warning-foreground">Firm Reminder</Badge>;
      default:
        return <Badge variant="secondary">Soft Reminder</Badge>;
    }
  };

  // ===== isLoading SKELETON =====
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
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

  const legalCount = invoices.filter(i => i.alertLevel === "legal").length;
  const firmCount = invoices.filter(i => i.alertLevel === "firm").length;

  return (
    <div className="space-y-6">

      {/* ===== ALERT SUMMARY ===== */}
      {(legalCount > 0 || firmCount > 0) && (
        <Alert variant={legalCount > 0 ? "destructive" : "default"}>
          <Bell className="h-4 w-4" />
          <AlertTitle>Aging Alerts Active</AlertTitle>
          <AlertDescription>
            {legalCount > 0 && (
              <span className="font-medium text-destructive">{legalCount} invoices</span>
            )}{" "}
            {legalCount > 0 && firmCount > 0 && "and "}
            {firmCount > 0 && (
              <span className="font-medium text-warning">{firmCount} invoices</span>
            )}{" "}
            require immediate follow-up. Auto-triggers are ready to send reminders.
          </AlertDescription>
        </Alert>
      )}

      {/* ===== AUTOMATION RULES CARD ===== */}
      {/* <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Aging Alert Automation
          </CardTitle>
          <CardDescription>
            Automated reminders are triggered based on invoice aging
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Day 30</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Soft reminder email sent automatically
              </p>
              <Badge variant="secondary" className="mt-2">Auto-trigger</Badge>
            </div>
            <div className="p-4 rounded-lg border bg-warning/10 border-warning/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="font-medium">Day 45</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Firm reminder with payment terms
              </p>
              <Badge className="mt-2 bg-warning text-warning-foreground">Auto-trigger</Badge>
            </div>
            <div className="p-4 rounded-lg border bg-destructive/10 border-destructive/20">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-destructive" />
                <span className="font-medium">Day 46+</span>
              </div>
              <p className="text-sm text-muted-foreground">
                MSMED legal notice draft generated
              </p>
              <Badge variant="destructive" className="mt-2">Manual review</Badge>
            </div>
          </div>
        </CardContent>
      </Card> */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Aging Distribution
          </CardTitle>
          <CardDescription>
            Breakdown of outstanding receivables by aging bucket
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">

            {/* 0–30 Days */}
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="text-sm text-muted-foreground mb-1">
                0–30 Days
              </div>
              <div className="text-2xl font-semibold">
                {bucket_0_30.length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Invoices recently overdue
              </div>
            </div>

            {/* 30–45 Days */}
            <div className="p-4 rounded-lg border bg-warning/10 border-warning/20">
              <div className="text-sm text-muted-foreground mb-1">
                30–45 Days
              </div>
              <div className="text-2xl font-semibold text-warning">
                {bucket_30_45.length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Moderate risk receivables
              </div>
            </div>

            {/* 46+ Days */}
            <div className="p-4 rounded-lg border bg-destructive/10 border-destructive/20">
              <div className="text-sm text-muted-foreground mb-1">
                46+ Days
              </div>
              <div className="text-2xl font-semibold text-destructive">
                {bucket_46_plus.length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                High risk receivables
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* ===== INVOICES TABLE ===== */}
      <Card>
        <CardHeader>
          <CardTitle>Invoices Requiring Action</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50 text-success" />
              <p>All receivables are within acceptable aging limits</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Paid Amount</TableHead>
                  <TableHead className="text-right">Balance Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Days</TableHead>
                  <TableHead>Alert Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow
                    key={invoice.id}
                    className={cn(
                      invoice.alertLevel === "legal" && "bg-destructive/5"
                    )}
                  >
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.vendor_name}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(invoice.paid_amount ?? invoice.paidAmount ?? 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(
                        (invoice.balance_amount ?? invoice.balance ?? (
                          (invoice.total_with_gst ?? invoice.total ?? 0) - (invoice.paid_amount ?? invoice.paidAmount ?? 0)
                        ))
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="capitalize">{invoice.status ?? invoice.state ?? "unknown"}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        "font-medium",
                        invoice.daysOutstanding > 45 && "text-destructive",
                        invoice.daysOutstanding > 30 && invoice.daysOutstanding <= 45 && "text-warning"
                      )}>
                        {invoice.daysOutstanding}
                      </span>
                    </TableCell>
                    <TableCell>{getAlertBadge(invoice.alertLevel)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>


    </div>
  );
}