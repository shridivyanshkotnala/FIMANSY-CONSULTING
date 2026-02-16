import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Download,
  Share2,
  Loader2,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  CalendarClock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/*
  ShareWithCAModal
  ----------------
  Generates CA-ready financial summary report.

  IMPORTANT:
  This component is now a PURE CALCULATION ENGINE.
  No database calls — it expects financial data from Redux/API later.

  Future Redux shape expected:
  state.financial.invoices = [
    { document_category, total_with_gst, total_gst, status, vendor_name, date_of_issue }
  ]
*/

export function ShareWithCAModal({ open, onOpenChange }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    if (!open) return;

    const generateReport = async () => {
      setLoading(true);

      /*
        TODO: Replace with Redux selector
        const invoices = useSelector(selectInvoices)
      */
      const invoices = []; // temporary placeholder

      // ======== FINANCIAL CALCULATIONS (DO NOT MODIFY) ========

      const receivables = invoices
        .filter(inv => inv.document_category === "revenue" && inv.status === "pending")
        .reduce((sum, inv) => sum + Number(inv.total_with_gst), 0);

      const payables = invoices
        .filter(inv => (inv.document_category === "expense" || !inv.document_category) && inv.status === "pending")
        .reduce((sum, inv) => sum + Number(inv.total_with_gst), 0);

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const currentMonthInvoices = invoices.filter(inv => {
        const date = new Date(inv.date_of_issue);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      });

      const outputGST = currentMonthInvoices
        .filter(inv => inv.document_category === "revenue")
        .reduce((sum, inv) => sum + Number(inv.total_gst || 0), 0);

      const inputGST = currentMonthInvoices
        .filter(inv => inv.document_category === "expense" || !inv.document_category)
        .reduce((sum, inv) => sum + Number(inv.total_gst || 0), 0);

      const gstLiability = Math.max(0, outputGST - inputGST);

      // TDS estimation (simple heuristic)
      const tdsLiability = payables * 0.1;

      // MSME risk window calculation (45 day rule)
      const today = new Date();
      const msmeAtRisk = invoices
        .filter(inv => inv.document_category === "expense" && inv.status === "pending")
        .map(inv => {
          const daysSince = Math.floor((today - new Date(inv.date_of_issue)) / (1000 * 60 * 60 * 24));
          return {
            vendor: inv.vendor_name,
            amount: Number(inv.total_with_gst),
            daysRemaining: 45 - daysSince,
          };
        })
        .filter(item => item.daysRemaining <= 10 && item.daysRemaining > -5)
        .slice(0, 5);

      // Compliance deadlines
      const upcomingDeadlines = [
        { name: "TDS Payment", dueDate: format(new Date(currentYear, currentMonth, 7), "dd MMM yyyy") },
        { name: "GSTR-1", dueDate: format(new Date(currentYear, currentMonth, 11), "dd MMM yyyy") },
        { name: "GSTR-3B", dueDate: format(new Date(currentYear, currentMonth, 20), "dd MMM yyyy") },
      ];

      setReportData({
        organizationName: "Your Company",
        reportDate: format(new Date(), "dd MMM yyyy"),
        receivables,
        payables,
        gstLiability,
        tdsLiability,
        msmeAtRisk,
        upcomingDeadlines,
      });

      setLoading(false);
    };

    generateReport();
  }, [open]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const handleShare = async () => {
    if (!reportData) return;

    const text = `Financial Summary

Receivables: ${formatCurrency(reportData.receivables)}
Payables: ${formatCurrency(reportData.payables)}
GST Liability: ${formatCurrency(reportData.gstLiability)}
Generated: ${reportData.reportDate}`;

    if (navigator.share) {
      await navigator.share({ title: "Financial Summary", text });
    } else {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: "Summary copied to clipboard" });
    }
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Financial Summary with CA
          </DialogTitle>
          <DialogDescription>
            System generated accountant-ready report
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : reportData && (
          <div className="space-y-6">
            {/* KPI */}
            <div className="grid grid-cols-2 gap-4">
              <Card><CardContent className="p-4"><ArrowDownLeft className="inline mr-2" />{formatCurrency(reportData.receivables)}</CardContent></Card>
              <Card><CardContent className="p-4"><ArrowUpRight className="inline mr-2" />{formatCurrency(reportData.payables)}</CardContent></Card>
              <Card><CardContent className="p-4"><FileText className="inline mr-2" />{formatCurrency(reportData.gstLiability)}</CardContent></Card>
              <Card><CardContent className="p-4"><FileText className="inline mr-2" />{formatCurrency(reportData.tdsLiability)}</CardContent></Card>
            </div>

            {reportData.msmeAtRisk.length > 0 && (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    MSME Risk
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {reportData.msmeAtRisk.map((item, i) => (
                    <div key={i} className="flex justify-between py-1">
                      <span>{item.vendor}</span>
                      <Badge variant={item.daysRemaining <= 0 ? "destructive" : "secondary"}>
                        {item.daysRemaining > 0 ? `${item.daysRemaining} days` : "OVERDUE"}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" /> Share
          </Button>
          <Button onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" /> Print / Save PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
