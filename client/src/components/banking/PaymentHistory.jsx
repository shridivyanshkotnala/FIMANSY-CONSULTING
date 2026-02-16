import { useState, useEffect } from "react";

/*
  OLD:
  UI -> Supabase -> payments table

  NEW:
  UI -> Redux selector -> payment events timeline
  (events come from backend ledger + bank processor)
*/

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import {
  Search, Eye, CheckCircle2, Clock, XCircle, AlertCircle, ArrowUpRight, RefreshCw, Calendar
} from "lucide-react";

/*
  🔌 FUTURE REDUX

  const payments = useSelector(selectPayments)
  dispatch(fetchPaymentTimeline())
*/

const STATUS_CONFIG = {
  pending: { icon: Clock, color: "text-amber-600", bg: "bg-amber-100" },
  processing: { icon: RefreshCw, color: "text-blue-600", bg: "bg-blue-100" },
  completed: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100" },
  failed: { icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
  cancelled: { icon: AlertCircle, color: "text-gray-600", bg: "bg-gray-100" },
};

export function PaymentHistory() {

  const [payments, setPayments] = useState([]); // later redux
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedPayment, setSelectedPayment] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  /*
    🔴 WILL BECOME:
    dispatch(fetchPaymentTimeline())
  */
  useEffect(() => {
    setTimeout(() => {
      setPayments([]);
      setLoading(false);
    }, 300);
  }, []);

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.payment_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.utr_number?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleViewDetails = (payment) => {
    setSelectedPayment(payment);
    setDetailsOpen(true);
  };

  const StatusBadge = ({ status }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={`${config.bg} ${config.color} border-0`}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
          <Input
            placeholder="Search payment / vendor / UTR"
            value={searchTerm}
            onChange={(e)=>setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status"/>
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
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Timeline</CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-10 text-center">Loading...</div>
          ) : filteredPayments.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              No payments yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredPayments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono">{p.payment_number}</TableCell>
                      <TableCell className="flex items-center gap-2">
                        <Calendar className="h-3 w-3"/>
                        {p.payment_date}
                      </TableCell>
                      <TableCell>{p.vendor_name}</TableCell>
                      <TableCell className="flex items-center gap-1">
                        <ArrowUpRight className="h-3 w-3 text-red-500"/>
                        ₹{p.amount}
                      </TableCell>
                      <TableCell><StatusBadge status={p.status}/></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={()=>handleViewDetails(p)}>
                          <Eye className="h-4 w-4"/>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>

              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4 text-sm">
              <div><b>Payment:</b> {selectedPayment.payment_number}</div>
              <div><b>Status:</b> {selectedPayment.status}</div>
              <div><b>Amount:</b> ₹{selectedPayment.amount}</div>
              <div><b>Vendor:</b> {selectedPayment.vendor_name}</div>
              <div><b>UTR:</b> {selectedPayment.utr_number || "-"}</div>

              {/* Future: ledger events timeline here */}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
