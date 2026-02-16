import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  AlertTriangle,
  Receipt,
  Users,
  FileText,
  CheckCircle2,
  XCircle,
  Wallet
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * WeeklyReviewMode
 *
 * IMPORTANT ARCHITECTURE RULE:
 * This component must NEVER calculate financial logic.
 *
 * Backend/Redux should compute:
 * - cash gap
 * - statutory dues
 * - risk detection
 * - action recommendations
 *
 * future redux:
 * const report = useSelector(selectWeeklyReviewReport)
 */

export function WeeklyReviewMode({ open, onOpenChange, report = null, loading = false }) {

  const formatCurrency = (amount) => {
    if (Math.abs(amount) >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    return `₹${(amount / 1000).toFixed(0)}K`;
  };

  const getStatusBadge = (status) => {
    if (status === "overdue") return <Badge variant="destructive">Overdue</Badge>;
    if (status === "due-soon") return <Badge className="bg-warning text-warning-foreground">Due Soon</Badge>;
    return <Badge variant="secondary">Upcoming</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Weekly Cash-Out Review
          </DialogTitle>
          <DialogDescription>
            Operational financial health snapshot
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">

          {loading || !report ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 w-full bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-6">

              {/* Actions */}
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  Priority Actions
                </h3>

                {report.actionItems.map((item, i) => (
                  <div
                    key={i}
                    className={cn(
                      "p-3 rounded-lg border flex items-center gap-3",
                      item.type === "critical" && "bg-destructive/10 border-destructive/20",
                      item.type === "warning" && "bg-warning/10 border-warning/20",
                      item.type === "info" && "bg-muted/50"
                    )}
                  >
                    {item.type === "critical"
                      ? <XCircle className="h-5 w-5 text-destructive" />
                      : item.type === "warning"
                        ? <AlertTriangle className="h-5 w-5 text-warning" />
                        : <CheckCircle2 className="h-5 w-5 text-success" />
                    }

                    <div>
                      <p className="text-sm font-medium">{item.message}</p>
                      {item.action && <p className="text-xs text-muted-foreground">{item.action}</p>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Cash Position */}
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  Cash Position
                </h3>

                <div className="grid grid-cols-3 gap-4 text-center p-4 border rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Available</p>
                    <p className="text-xl font-bold text-success">
                      {formatCurrency(report.cashPosition.available)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Committed</p>
                    <p className="text-xl font-bold text-destructive">
                      {formatCurrency(report.cashPosition.committed)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Net</p>
                    <p className={cn(
                      "text-xl font-bold",
                      report.cashPosition.gap >= 0 ? "text-success" : "text-destructive"
                    )}>
                      {formatCurrency(report.cashPosition.gap)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Statutory dues */}
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-warning" />
                  Statutory Dues
                </h3>

                {report.statutoryDues.map((due, i) => (
                  <div key={i} className="flex justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {due.name === "Payroll"
                        ? <Users className="h-4 w-4 text-muted-foreground" />
                        : <Receipt className="h-4 w-4 text-muted-foreground" />
                      }
                      <div>
                        <p className="text-sm font-medium">{due.name}</p>
                        <p className="text-xs text-muted-foreground">Due: {due.dueDate}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-medium">{formatCurrency(due.amount)}</span>
                      {getStatusBadge(due.status)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Top unpaid */}
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-info" />
                  Top Unpaid Invoices
                </h3>

                {report.topUnpaidInvoices.map(inv => (
                  <div key={inv.id} className="flex justify-between p-3 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{inv.vendor_name}</p>
                      <p className="text-xs text-muted-foreground">{inv.invoice_number}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-medium">{formatCurrency(inv.total_with_gst)}</span>
                      <Badge variant={inv.risk ? "destructive" : "secondary"}>
                        {inv.daysOutstanding}d
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Complete Review
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
