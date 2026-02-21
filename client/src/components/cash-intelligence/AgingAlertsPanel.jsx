import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

// ===== TEMP DATABASE CLIENT (REMOVE LATER → Backend API / RTK Query) =====
// import { supabase } from "@/integrations/supabase/client";

// ===== AUTH CONTEXT (LATER → REDUX AUTH SLICE SELECTOR) =====
// import { useAuth } from "@/hooks/useAuth";

import { differenceInDays, format } from "date-fns";
import {
  Bell,
  Mail,
  MessageSquare,
  AlertTriangle,
  FileText,
  Send,
  Clock,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [reminderType, setReminderType] = useState("soft");
  const [reminderText, setReminderText] = useState("");
  const [showDialog, setShowDialog] = useState(false);

  // ===== FETCH AGING INVOICES =====
  useEffect(() => {
    if (!organization?.id) return;

    const fetchAgingInvoices = async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, vendor_name, date_of_issue, total_with_gst')
        .eq('organization_id', organization.id)
        .eq('document_category', 'revenue')
        .eq('status', 'pending')
        .order('date_of_issue', { ascending: true });

      if (!error && data) {
        const today = new Date();

        // ===== BUSINESS LOGIC (KEEP EVEN AFTER DB REMOVAL) =====
        const enriched = data.map(inv => {
          const days = differenceInDays(today, new Date(inv.date_of_issue));

          let alertLevel = "soft";
          if (days > 45) alertLevel = "legal";
          else if (days > 30) alertLevel = "firm";

          return {
            ...inv,
            daysOutstanding: days,
            alertLevel,
          };
        }).filter(inv => inv.daysOutstanding > 25);

        setInvoices(enriched);
      }
      setLoading(false);
    };

    fetchAgingInvoices();
  }, [organization?.id]);

  // ===== CURRENCY FORMATTER =====
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

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

  // ===== MESSAGE TEMPLATE GENERATOR =====
  const getReminderTemplate = (invoice, type) => {
    const templates = {
      soft: `Dear ${invoice.vendor_name},\n\nThis is a gentle reminder regarding Invoice #${invoice.invoice_number} dated ${format(new Date(invoice.date_of_issue), 'dd MMM yyyy')} for ${formatCurrency(invoice.total_with_gst)}.\n\nThe payment is now ${invoice.daysOutstanding} days outstanding. We kindly request you to expedite the payment at your earliest convenience.\n\nThank you for your continued business.\n\nBest regards`,
      firm: `Dear ${invoice.vendor_name},\n\nRE: Overdue Payment - Invoice #${invoice.invoice_number}\n\nDespite our previous reminders, we note that the above invoice dated ${format(new Date(invoice.date_of_issue), 'dd MMM yyyy')} for ${formatCurrency(invoice.total_with_gst)} remains unpaid after ${invoice.daysOutstanding} days.\n\nWe request immediate payment to avoid any disruption to our business relationship.\n\nPlease treat this as urgent.\n\nRegards`,
      legal: `LEGAL NOTICE UNDER MSMED ACT, 2006\n\nTo: ${invoice.vendor_name}\n\nRE: Invoice #${invoice.invoice_number} - Outstanding Amount: ${formatCurrency(invoice.total_with_gst)}\n\nThis is to formally notify you that the payment for the above invoice dated ${format(new Date(invoice.date_of_issue), 'dd MMM yyyy')} has been overdue for ${invoice.daysOutstanding} days, which exceeds the statutory limit under Section 15 of the MSMED Act, 2006.\n\nAs per Section 16 of the MSMED Act, you are liable to pay compound interest at three times the bank rate on the delayed payment.\n\nWe hereby demand:\n1. Immediate payment of the principal amount\n2. Interest on delayed payment as per the Act\n\nFailure to comply within 7 days will result in filing of a complaint with the MSME Samadhaan portal and initiation of legal proceedings.\n\nThis notice is issued without prejudice to our other legal rights.`,
    };
    return templates[type];
  };

  // ===== OPEN REMINDER DIALOG =====
  const handleSendReminder = (invoice, type) => {
    setSelectedInvoice(invoice);
    setReminderType(type);
    setReminderText(getReminderTemplate(invoice, type));
    setShowDialog(true);
  };

  // ===== SEND REMINDER ACTION (FUTURE → API CALL) =====
  const confirmSendReminder = () => {
    toast.success(`${reminderType === 'legal' ? 'Legal notice' : 'Reminder'} logged for ${selectedInvoice?.vendor_name}`);
    setShowDialog(false);
    setSelectedInvoice(null);
  };

  // ===== LOADING SKELETON =====
  if (loading) {
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
      <Card>
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
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Days</TableHead>
                  <TableHead>Alert Level</TableHead>
                  <TableHead className="text-right">Action</TableHead>
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
                    <TableCell className="text-right">{formatCurrency(invoice.total_with_gst)}</TableCell>
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
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleSendReminder(invoice, "soft")}>
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleSendReminder(invoice, "firm")}>
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        {invoice.alertLevel === "legal" && (
                          <Button size="sm" variant="destructive" onClick={() => handleSendReminder(invoice, "legal")}>
                            <FileText className="h-4 w-4 mr-1" />
                            Legal
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

      {/* ===== SEND REMINDER DIALOG ===== */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {reminderType === "legal" ? "MSMED Legal Notice" : `${reminderType.charAt(0).toUpperCase() + reminderType.slice(1)} Reminder`}
            </DialogTitle>
            <DialogDescription>
              Review and send to {selectedInvoice?.vendor_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={reminderText}
              onChange={(e) => setReminderText(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              This will be logged in the invoice communication history
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSendReminder}>
              <Send className="h-4 w-4 mr-2" />
              Send {reminderType === "legal" ? "Notice" : "Reminder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}