import { useState } from "react";
import {
  useGetPaymentHistoryQuery,
  useRebuildPaymentLedgerMutation,
} from "@/Redux/Slices/api/bankingApi";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import {
  Search, Eye, CheckCircle2, Clock, XCircle, AlertCircle,
  RefreshCw, ArrowUpRight, Filter, IndianRupee, Hash
} from "lucide-react";

import { format } from "date-fns";

const STATUS_CONFIG = {
  pending:    { icon: Clock,         color: "text-amber-600", bg: "bg-amber-100/60",  border: "border-amber-200"  },
  processing: { icon: RefreshCw,     color: "text-blue-600",  bg: "bg-blue-100/60",   border: "border-blue-200"   },
  completed:  { icon: CheckCircle2,  color: "text-green-600", bg: "bg-green-100/60",  border: "border-green-200"  },
  failed:     { icon: XCircle,       color: "text-red-600",   bg: "bg-red-100/60",    border: "border-red-200"    },
  cancelled:  { icon: AlertCircle,   color: "text-gray-500",  bg: "bg-gray-100/60",   border: "border-gray-200"   },
};

const formatCurrency = (amount) => {
  if (amount == null || amount === "") return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (d) => {
  if (!d || isNaN(new Date(d))) return "—";
  return format(new Date(d), "dd MMM yyyy");
};

export function PaymentHistory() {

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useGetPaymentHistoryQuery({
    status: statusFilter,
    search: searchTerm,
    page,
    limit: 20,
  });

  const [rebuildLedger, { isLoading: isRebuilding }] = useRebuildPaymentLedgerMutation();

  const handleRefresh = async () => {
    await rebuildLedger();
    refetch();
  };

  const payments    = data?.data?.payments   || [];
  const pagination  = data?.data?.pagination;

  // Summary stats
  const totalAmount    = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const completedCount = payments.filter((p) => p.status === "completed").length;
  const pendingCount   = payments.filter((p) => ["pending", "processing"].includes(p.status)).length;

  const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const Icon = cfg.icon;
    return (
      <Badge
        variant="outline"
        className={`${cfg.bg} ${cfg.color} ${cfg.border} gap-1.5 px-2.5 py-1 text-xs font-medium`}
      >
        <Icon className="h-3.5 w-3.5" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <IndianRupee className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <p className="text-xl font-bold text-red-500">{formatCurrency(totalAmount)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-xl font-bold">{completedCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Clock className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-sm text-muted-foreground">Pending / Processing</p>
              <p className="text-xl font-bold">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search payment / vendor / UTR"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(value) => { setStatusFilter(value); setPage(1); }}
        >
          <SelectTrigger className="w-44">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={handleRefresh} disabled={isRebuilding}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRebuilding ? "animate-spin" : ""}`} />
          {isRebuilding ? "Syncing…" : "Refresh"}
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Timeline</CardTitle>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-muted-foreground">Loading…</div>
          ) : isError ? (
            <div className="py-10 text-center text-red-500">Failed to load payments</div>
          ) : payments.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No payments found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p._id}>

                        {/* Payment number + UTR */}
                        <TableCell>
                          <div className="font-medium text-sm">{p.paymentNumber || "—"}</div>
                          {p.utrNumber && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              UTR: {p.utrNumber}
                            </div>
                          )}
                        </TableCell>

                        {/* Date */}
                        <TableCell className="text-sm">
                          {formatDate(p.paymentDate)}
                        </TableCell>

                        {/* Vendor */}
                        <TableCell>
                          <div className="font-medium text-sm">{p.vendorName || "—"}</div>
                          {p.referenceNumber && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Ref: {p.referenceNumber}
                            </div>
                          )}
                        </TableCell>

                        {/* Amount */}
                        <TableCell className="text-right font-medium text-sm text-red-500">
                          {formatCurrency(p.amount)}
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <StatusBadge status={p.status} />
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setSelectedPayment(p); setDetailsOpen(true); }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>

                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <Button
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-3">

              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <span className="text-muted-foreground">Payment #</span>
                <span className="font-medium">{selectedPayment.paymentNumber || "—"}</span>

                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{formatDate(selectedPayment.paymentDate)}</span>

                <span className="text-muted-foreground">Vendor</span>
                <span className="font-medium">{selectedPayment.vendorName || "—"}</span>

                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium text-red-500">
                  {formatCurrency(selectedPayment.amount)}
                </span>

                <span className="text-muted-foreground">Status</span>
                <span><StatusBadge status={selectedPayment.status} /></span>

                {selectedPayment.utrNumber && (
                  <>
                    <span className="text-muted-foreground">UTR Number</span>
                    <span className="font-mono text-xs">{selectedPayment.utrNumber}</span>
                  </>
                )}

                {selectedPayment.referenceNumber && (
                  <>
                    <span className="text-muted-foreground">Reference</span>
                    <span className="font-mono text-xs">{selectedPayment.referenceNumber}</span>
                  </>
                )}
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}