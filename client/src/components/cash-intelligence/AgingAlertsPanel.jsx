import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Bell, Mail, MessageSquare, FileText, Send, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useGetCashIntelligenceQuery } from "@/Redux/Slices/api/financialApi";
/**
 * AgingAlertsPanel
 *
 * PURE PRESENTATION COMPONENT
 * Backend owns ALL accounting logic
 */
export function AgingAlertsPanel() {

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [reminderType, setReminderType] = useState("soft");
  const [reminderText, setReminderText] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const { data, isLoading, error } = useGetCashIntelligenceQuery();


  /* ------------------------------------------------ */
  /* Transform backend response → table rows          */
  /* ------------------------------------------------ */

  const actionableInvoices = useMemo(() => {
    if (!data?.aging?.priorityCustomers || !Array.isArray(data?.aging.priorityCustomers)) {
      return [];
    }

    return data?.aging.priorityCustomers.flatMap(customer => {
      if (!customer.invoices || !Array.isArray(customer.invoices)) {
        return [];
      }

      return customer.invoices.map(inv => ({
        id: inv.invoice_number,
        invoice_number: inv.invoice_number,
        vendor_name: customer.customer,
        total_with_gst: inv.amount,
        daysOutstanding: inv.daysOutstanding,
        alertLevel: inv.severity,
      }));
    });
  }, [data?.aging]);

  /* ------------------------------------------------ */

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const getReminderTemplate = (invoice, type) => ({
    soft: `Dear ${invoice.vendor_name},

This is a gentle reminder regarding Invoice #${invoice.invoice_number} for ${formatCurrency(invoice.total_with_gst)}.

The payment is now ${invoice.daysOutstanding} days outstanding. Kindly arrange payment at your earliest convenience.`,

    firm: `Dear ${invoice.vendor_name},

RE: Overdue Payment - Invoice #${invoice.invoice_number}

Invoice is unpaid after ${invoice.daysOutstanding} days. Please treat this as urgent.`,

    legal: `LEGAL NOTICE UNDER MSMED ACT

Invoice #${invoice.invoice_number}
Outstanding: ${formatCurrency(invoice.total_with_gst)}
Delay: ${invoice.daysOutstanding} days

Failure to pay may trigger legal proceedings.`
  }[type]);

  const handleSendReminder = (invoice, type) => {
    setSelectedInvoice(invoice);
    setReminderType(type);
    setReminderText(getReminderTemplate(invoice, type));
    setShowDialog(true);
  };

  const confirmSendReminder = () => {
    // future: dispatch(sendReminder({ invoiceId, type, text }))
    toast.success("Reminder queued (API later)");
    setShowDialog(false);
    setSelectedInvoice(null);
  };

  /* ------------------------------------------------ */
  /* isLoading state                                    */
  /* ------------------------------------------------ */

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-40 w-full" /></CardContent>
      </Card>
    );
  }

  /* ------------------------------------------------ */
  /* Alerts from backend                              */
  /* ------------------------------------------------ */

  const legalCount = data?.aging?.alerts?.legal ?? 0;
  const firmCount = data?.aging?.alerts?.critical ?? 0;

  return (
    <div className="space-y-6">

      {(legalCount > 0 || firmCount > 0) && (
        <Alert variant={legalCount > 0 ? "destructive" : "default"}>
          <Bell className="h-4 w-4" />
          <AlertTitle>Aging Alerts Active</AlertTitle>
          <AlertDescription>
            {legalCount} legal • {firmCount} firm reminders required
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Invoices Requiring Action</CardTitle>
          <CardDescription>Based on backend financial intelligence</CardDescription>
        </CardHeader>

        <CardContent>
          {actionableInvoices.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">All Receivables Healthy</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {data?.aging ?
                  "No overdue invoices found. Your receivables are in good shape!" :
                  "isLoading receivables data..."
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Days</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {actionableInvoices.map(invoice => (
                  <TableRow
                    key={invoice.id}
                    className={cn(
                      invoice.alertLevel === "legal" && "bg-red-50",
                      invoice.alertLevel === "firm" && "bg-amber-50"
                    )}
                  >
                    <TableCell>{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.vendor_name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(invoice.total_with_gst)}</TableCell>
                    <TableCell className="text-center">{invoice.daysOutstanding}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleSendReminder(invoice, "soft")}>
                          <Mail className="h-4 w-4" />
                        </Button>

                        <Button size="sm" variant="ghost" onClick={() => handleSendReminder(invoice, "firm")}>
                          <MessageSquare className="h-4 w-4" />
                        </Button>

                        {invoice.alertLevel === "legal" && (
                          <Button size="sm" variant="destructive" onClick={() => handleSendReminder(invoice, "legal")}>
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Reminder</DialogTitle>
            <DialogDescription>Review message before sending</DialogDescription>
          </DialogHeader>

          <Textarea
            value={reminderText}
            onChange={e => setReminderText(e.target.value)}
            rows={12}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={confirmSendReminder}>
              <Send className="h-4 w-4 mr-2" />Queue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
