import { useState } from "react";
import {
  useGetBankDashboardQuery,
  useAcceptTransactionMutation,
  useReportTransactionIssueMutation,
} from "@/Redux/Slices/api/bankingApi";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

import {
  Search, Filter, ArrowUpRight, ArrowDownRight,
  FileText
} from "lucide-react";

import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function BankTransactionList() {

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const limit = 20;

  const { data, isLoading } =
    useGetBankDashboardQuery({
      status: status === "all" ? undefined : status,
      search,
      page,
      limit,
    }, {
      pollingInterval: 20000,
    });


  const summary = data?.data?.summary;
  const transactions = data?.data?.transactions || [];
  const pagination = data?.data?.pagination;

  const formatCurrency = (amount) => {
    if (amount == null || amount === "") return "-";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const cleanDescription = (desc = "") => {
    if (!desc) return "";
    // Goal: preserve tokens that include '/', keep important transaction ids like 'UPI/12345',
    // remove very long numeric tokens (likely account numbers) and normalize _ \\ - to spaces.
    const tokens = desc.split(/\s+/).map((tok) => {
      if (!tok) return "";
      // keep tokens that include a slash (UPI/..., RTGS/..., ICICR/...)
      if (tok.includes("/")) return tok;
      // remove extremely long pure-numeric tokens (account numbers)
      if (/^\d{9,}$/.test(tok)) return "";
      // normalize backslash, underscore and hyphen to space
      return tok.replace(/[\\_-]+/g, " ");
    });
    return tokens.join(" ").replace(/\s{2,}/g, " ").trim();
  };

  const extractCapitalizedPhrase = (desc = "") => {
    const matches = desc.match(/([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){0,3})/g);
    return matches ? matches[0] : null;
  };

  const normalizeCategory = (value = "") =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/\//g, " ")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ");

  const toLabel = (value = "") =>
    String(value || "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (m) => m.toUpperCase());

  const firstNonEmpty = (...values) => {
    for (const value of values) {
      if (value == null) continue;
      const str = String(value).trim();
      if (str) return str;
    }
    return null;
  };

  const getCategoryLabel = (t, desc = "") => {
    const zohoLabel = t.zohoCategory || "";
    if (zohoLabel) return toLabel(zohoLabel);

    const fallback = t.category || "";
    if (fallback) return toLabel(fallback);

    const text = (desc || "").toLowerCase();
    if (t.type === "credit") {
      if (text.includes("interest")) return "Interest Income";
      if (text.includes("refund")) return "Expense Refund";
      if (text.includes("transfer")) return "Transfer From Another Account";
      return "Deposit";
    }

    if (text.includes("transfer")) return "Transfer";
    if (text.includes("vendor") && text.includes("payment")) return "Vendor Payment";
    return "Expense";
  };

  const renderDescription = (t) => {
    const desc = t.zohoDescription || t.description || t.referenceNumber || "";
    const cleaned = cleanDescription(desc);

    if (t.type === "credit") {
      const tag = getCategoryLabel(t, desc);
      const normalizedTag = normalizeCategory(tag);

      const customer = firstNonEmpty(
        t.customer,
        t.customerName,
        t.customer_name,
        t.payee,
        extractCapitalizedPhrase(desc)
      );

      const vendor = firstNonEmpty(
        t.vendor,
        t.vendorName,
        t.vendor_name,
        t.payee,
        t.supplier
      );

      const accountName = firstNonEmpty(
        t.accountName,
        t.account_name,
        t.fromAccount,
        t.toAccount
      );

      const offsetAccountName = firstNonEmpty(
        t.offsetAccountName,
        t.offset_account_name,
        t.toAccount,
        t.expenseAccount,
        t.expense_account_name
      );

      const isCustomerPayment =
        normalizedTag.includes("customer payment") ||
        normalizedTag.includes("customer advance");
      const isTransferFromAnother =
        normalizedTag.includes("transfer from another account") ||
        normalizedTag.includes("transfer fund");
      const isInterestIncome = normalizedTag.includes("interest income");
      const isOtherIncome = normalizedTag.includes("other income");
      const isExpenseRefund = normalizedTag.includes("expense refund");
      const isOwnersContribution =
        normalizedTag.includes("owners contribution") ||
        normalizedTag.includes("owner s contribution") ||
        normalizedTag.includes("owner contribution");
      const isVendorCreditRefund = normalizedTag.includes("vendor credit refund");
      const isDepositFromAnother = normalizedTag.includes("deposit from another account");

      return (
        <div className="text-sm">
          <div className="font-medium">{tag}</div>

          {isCustomerPayment && customer && (
            <div className="text-muted-foreground text-sm">Customer: {customer}</div>
          )}

          {(isTransferFromAnother || isDepositFromAnother) && accountName && (
            <div className="text-muted-foreground text-sm">To Account: {accountName}</div>
          )}

          {(isTransferFromAnother || isDepositFromAnother) && offsetAccountName && (
            <div className="text-muted-foreground text-sm">From Account: {offsetAccountName}</div>
          )}

          {isOtherIncome && offsetAccountName && (
            <div className="text-muted-foreground text-sm">From Account: {offsetAccountName}</div>
          )}

          {isExpenseRefund && offsetAccountName && (
            <div className="text-muted-foreground text-sm">From Account: {offsetAccountName}</div>
          )}

          {isOwnersContribution && offsetAccountName && (
            <div className="text-muted-foreground text-sm">From Account: {offsetAccountName}</div>
          )}

          {isVendorCreditRefund && vendor && (
            <div className="text-muted-foreground text-sm">Vendor: {vendor}</div>
          )}

          {(isInterestIncome || cleaned) && cleaned && (
            <div className="text-muted-foreground text-sm">Description: {cleaned}</div>
          )}
        </div>
      );
    }

    // debit
    const tag = getCategoryLabel(t, desc);
    const normalizedTag = normalizeCategory(tag);

    const expenseAccount =
      t.expenseAccount ||
      t.expenseAccountName ||
      t.offsetAccount ||
      t.offset_account_name ||
      t.expense_account_name ||
      t.expense_account;
    const vendor = t.vendor || t.vendorName || t.payee || t.supplier;
    const customer = t.customer || t.customerName || t.customer_name;
    const fromAccount = t.fromAccount || t.from_account || null;
    const toAccount = t.toAccount || t.to_account || null;
    const paymentNumber = t.paymentNumber || null;
    const selectedPaymentAmount = t.selectedPaymentAmount;
    const rawDesc = t.zohoDescription || t.description || t.referenceNumber || "";

    const isExpense = normalizedTag.includes("expense");
    const isVendorAdvance = normalizedTag.includes("vendor advance");
    const isVendorPayment = normalizedTag.includes("vendor payment");
    const isTransfer =
      normalizedTag.includes("transfer to another account") ||
      normalizedTag.includes("transfer") ||
      normalizedTag === "transfer";
    const isCardPayment = normalizedTag.includes("card payment");
    const isOwnerDrawings =
      normalizedTag.includes("owner drawings") ||
      normalizedTag.includes("owners drawings") ||
      normalizedTag.includes("drawings");
    const isPaymentRefund = normalizedTag.includes("payment refund");
    const isCreditNoteRefund = normalizedTag.includes("credit note refund");
    const ownerDrawingsAccount = firstNonEmpty(
      toAccount,
      expenseAccount,
      fromAccount,
      t.offsetAccount,
      t.offset_account_name
    );

    return (
      <div className="text-sm">
        <div className="font-medium">{tag}</div>

        {isExpense && expenseAccount && (
          <div className="text-muted-foreground text-sm">Expense Account: {expenseAccount}</div>
        )}

        {isExpense && vendor && (
          <div className="text-muted-foreground text-sm">Vendor: {vendor}</div>
        )}

        {isExpense && customer && (
          <div className="text-muted-foreground text-sm">Customer: {customer}</div>
        )}

        {(isVendorAdvance || isVendorPayment) && vendor && (
          <div className="text-muted-foreground text-sm">Vendor: {vendor}</div>
        )}

        {(isTransfer || isCardPayment) && fromAccount && (
          <div className="text-muted-foreground text-sm">From Account: {fromAccount}</div>
        )}

        {(isTransfer || isCardPayment) && toAccount && (
          <div className="text-muted-foreground text-sm">To Account: {toAccount}</div>
        )}

        {isOwnerDrawings && ownerDrawingsAccount && (
          <div className="text-muted-foreground text-sm">Account: {ownerDrawingsAccount}</div>
        )}

        {(isTransfer || isCardPayment || isOwnerDrawings) && rawDesc && (
          <div className="text-muted-foreground text-sm">Description: {cleanDescription(rawDesc)}</div>
        )}

        {isPaymentRefund && customer && (
          <div className="text-muted-foreground text-sm">Customer: {customer}</div>
        )}

        {isPaymentRefund && paymentNumber && (
          <div className="text-muted-foreground text-sm">Payment #: {paymentNumber}</div>
        )}

        {isPaymentRefund && selectedPaymentAmount != null && (
          <div className="text-muted-foreground text-sm">
            Refunded Amount: {formatCurrency(selectedPaymentAmount)}
          </div>
        )}

        {isCreditNoteRefund && customer && (
          <div className="text-muted-foreground text-sm">Customer: {customer}</div>
        )}

        {rawDesc && !(isTransfer || isCardPayment || isOwnerDrawings) && (
          <div className="text-muted-foreground text-sm">{cleanDescription(rawDesc)}</div>
        )}
      </div>
    );
  };

  // compute running balances (oldest -> newest cumulative, then reverse to match display order)
  const runningBalances = (() => {
    const rev = [...transactions].slice().reverse();
    let running = 0;
    const res = rev.map((tr) => {
      running += tr.type === "credit" ? tr.amount : -tr.amount;
      return running;
    });
    return res.reverse();
  })();

  const [acceptTransaction] = useAcceptTransactionMutation();
  const [reportTransactionIssue] = useReportTransactionIssueMutation();

  const [processingTxnId, setProcessingTxnId] = useState(null);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [selectedIssueTxnId, setSelectedIssueTxnId] = useState(null);
  const [issueMessage, setIssueMessage] = useState("");

  const handleAccept = async (id) => {
    try {
      setProcessingTxnId(id);
      await acceptTransaction({ id }).unwrap();
    } catch (err) {
      console.error("Accept transaction failed", err);
    } finally {
      setProcessingTxnId(null);
    }
  };

  const openIssueDialog = (id) => {
    setSelectedIssueTxnId(id);
    setIssueMessage("");
    setIssueDialogOpen(true);
  };

  const handleSubmitIssue = async () => {
    if (!selectedIssueTxnId || !issueMessage.trim()) return;

    try {
      setProcessingTxnId(selectedIssueTxnId);
      await reportTransactionIssue({
        id: selectedIssueTxnId,
        message: issueMessage.trim(),
      }).unwrap();

      setIssueDialogOpen(false);
      setSelectedIssueTxnId(null);
      setIssueMessage("");
    } catch (err) {
      console.error("Report issue failed", err);
    } finally {
      setProcessingTxnId(null);
    }
  };

  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <ArrowDownRight className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">Credits</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(summary?.totalCredits)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <ArrowUpRight className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-sm text-muted-foreground">Debits</p>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(summary?.totalDebits)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <FileText className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-sm text-muted-foreground">Unreconciled</p>
              <p className="text-xl font-bold">
                {summary?.unreconciledCount || 0}
              </p>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search description"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            className="pl-10"
          />
        </div>

        <Select
          value={status}
          onValueChange={(value) => {
            setPage(1);
            setStatus(value);
          }}
        >
          <SelectTrigger className="w-44">
            <Filter className="h-4 w-4 mr-2"/>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unreconciled">Unreconciled</SelectItem>
            <SelectItem value="matched">Matched</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="ignored">Ignored</SelectItem>
          </SelectContent>
        </Select>

      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Bank Feed</CardTitle>
        </CardHeader>

        <CardContent>

          {isLoading ? (
            <div className="py-10 text-center">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              No transactions found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Running Balance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {transactions.map((t, idx) => (
                      <TableRow key={t._id}>
                        <TableCell>
                          {t.transactionDate && !isNaN(new Date(t.transactionDate))
                            ? format(new Date(t.transactionDate), "dd MMM yyyy")
                            : "—"}
                        </TableCell>

                        <TableCell className="max-w-xs text-sm">
                          {renderDescription(t)}
                        </TableCell>

                        <TableCell
                          className={cn(
                            "text-right font-medium",
                            t.type === "credit"
                              ? "text-green-600"
                              : "text-red-600"
                          )}
                        >
                          {formatCurrency(t.amount)}
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline">{t.reconciliationStatus}</Badge>
                        </TableCell>

                        <TableCell className="text-right font-medium">
                          {formatCurrency(runningBalances[idx])}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-2">
                            {t.acceptedByClient ? (
                              <Badge className="bg-success/10 text-success border-success/20">Accepted</Badge>
                            ) : t.hasPendingBankReconQuery ? (
                              <Badge className="bg-warning/10 text-warning border-warning/20">Pending Query</Badge>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openIssueDialog(t._id)}
                                  disabled={processingTxnId === t._id}
                                >
                                  Report Issue
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleAccept(t._id)}
                                  disabled={processingTxnId === t._id}
                                >
                                  Accept
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>

                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Report Transaction Issue</DialogTitle>
                    <DialogDescription>
                      Tell your accountant what needs correction for this transaction.
                    </DialogDescription>
                  </DialogHeader>

                  <Textarea
                    value={issueMessage}
                    onChange={(e) => setIssueMessage(e.target.value)}
                    placeholder="what issue you are facing? Any categories to update? "
                    rows={5}
                  />

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIssueDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmitIssue}
                      disabled={!issueMessage.trim() || !selectedIssueTxnId || processingTxnId === selectedIssueTxnId}
                    >
                      Submit
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Pagination */}
              <div className="flex items-center justify-between pt-4">

                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>

                <span className="text-sm text-muted-foreground">
                  Page {pagination?.page} of {pagination?.totalPages}
                </span>

                <Button
                  variant="outline"
                  disabled={page >= pagination?.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>

              </div>
            </>
          )}

        </CardContent>
      </Card>

    </div>
  );
}



















































// import { useState, useEffect } from "react";

// /*
//  OLD:
//    UI directly edits bank_transactions table

//  NEW:
//    UI displays BANK FEED EVENTS
//    Actions dispatch reconciliation intents

//  FUTURE REDUX FLOW:
//    dispatch(fetchBankFeed())
//    dispatch(reconcileTransaction(txId))
// */

// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import {
//   Table, TableBody, TableCell, TableHead, TableHeader, TableRow
// } from "@/components/ui/table";
// import {
//   Select, SelectContent, SelectItem, SelectTrigger, SelectValue
// } from "@/components/ui/select";
// import {
//   DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
// } from "@/components/ui/dropdown-menu";

// import {
//   Search, Filter, ArrowUpRight, ArrowDownRight, MoreHorizontal,
//   CheckCircle2, Link2, Eye, FileText
// } from "lucide-react";
// import { format } from "date-fns";
// import { cn } from "@/lib/utils";

// export function BankTransactionList() {

//   const [transactions, setTransactions] = useState([]); // later redux selector
//   const [loading, setLoading] = useState(true);

//   const [searchTerm, setSearchTerm] = useState("");
//   const [statusFilter, setStatusFilter] = useState("all");

//   /*
//     🔌 FUTURE:
//     dispatch(fetchBankFeed())
//   */
//   useEffect(() => {
//     setTimeout(() => {
//       setTransactions([]);
//       setLoading(false);
//     }, 400);
//   }, []);

//   const formatCurrency = (amount) => {
//     if (!amount) return "-";
//     return new Intl.NumberFormat("en-IN", {
//       style: "currency",
//       currency: "INR",
//       maximumFractionDigits: 0,
//     }).format(amount);
//   };

//   const filteredTransactions = transactions.filter((t) => {
//     const matchesSearch =
//       t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       t.reference_number?.toLowerCase().includes(searchTerm.toLowerCase());

//     const matchesStatus =
//       statusFilter === "all" || t.reconciliation_status === statusFilter;

//     return matchesSearch && matchesStatus;
//   });

//   /*
//     🔌 FUTURE:
//     dispatch(reconcileTransaction(txId))
//   */
//   const handleMarkReconciled = (id) => {
//     console.log("Reconcile intent:", id);
//   };

//   const totalCredits = transactions.reduce((sum, t) => sum + (t.credit_amount || 0), 0);
//   const totalDebits = transactions.reduce((sum, t) => sum + (t.debit_amount || 0), 0);
//   const unreconciledCount = transactions.filter(t => t.reconciliation_status !== "reconciled").length;

//   return (
//     <div className="space-y-6">

//       {/* Stats */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

//         <Card>
//           <CardContent className="pt-6 flex items-center gap-3">
//             <ArrowDownRight className="h-8 w-8 text-green-600" />
//             <div>
//               <p className="text-sm text-muted-foreground">Credits</p>
//               <p className="text-xl font-bold text-green-600">{formatCurrency(totalCredits)}</p>
//             </div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardContent className="pt-6 flex items-center gap-3">
//             <ArrowUpRight className="h-8 w-8 text-red-600" />
//             <div>
//               <p className="text-sm text-muted-foreground">Debits</p>
//               <p className="text-xl font-bold text-red-600">{formatCurrency(totalDebits)}</p>
//             </div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardContent className="pt-6 flex items-center gap-3">
//             <FileText className="h-8 w-8 text-amber-600" />
//             <div>
//               <p className="text-sm text-muted-foreground">Unreconciled</p>
//               <p className="text-xl font-bold">{unreconciledCount}</p>
//             </div>
//           </CardContent>
//         </Card>

//       </div>

//       {/* Filters */}
//       <div className="flex flex-col sm:flex-row gap-4">

//         <div className="relative flex-1 max-w-md">
//           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//           <Input
//             placeholder="Search description or reference"
//             value={searchTerm}
//             onChange={(e)=>setSearchTerm(e.target.value)}
//             className="pl-10"
//           />
//         </div>

//         <Select value={statusFilter} onValueChange={setStatusFilter}>
//           <SelectTrigger className="w-40">
//             <Filter className="h-4 w-4 mr-2"/>
//             <SelectValue/>
//           </SelectTrigger>
//           <SelectContent>
//             <SelectItem value="all">All</SelectItem>
//             <SelectItem value="unreconciled">Unreconciled</SelectItem>
//             <SelectItem value="reconciled">Reconciled</SelectItem>
//           </SelectContent>
//         </Select>

//       </div>

//       {/* Table */}
//       <Card>
//         <CardHeader>
//           <CardTitle>Bank Feed</CardTitle>
//         </CardHeader>

//         <CardContent>
//           {loading ? (
//             <div className="py-10 text-center">Loading bank feed...</div>
//           ) : filteredTransactions.length === 0 ? (
//             <div className="py-10 text-center text-muted-foreground">
//               No bank transactions
//             </div>
//           ) : (
//             <div className="overflow-x-auto">

//               <Table>
//                 <TableHeader>
//                   <TableRow>
//                     <TableHead>Date</TableHead>
//                     <TableHead>Description</TableHead>
//                     <TableHead className="text-right">Credit</TableHead>
//                     <TableHead className="text-right">Debit</TableHead>
//                     <TableHead className="text-right">Balance</TableHead>
//                     <TableHead>Status</TableHead>
//                     <TableHead/>
//                   </TableRow>
//                 </TableHeader>

//                 <TableBody>
//                   {filteredTransactions.map((t)=>(
//                     <TableRow key={t.id}>

//                       <TableCell>
//                         {format(new Date(t.transaction_date),"dd MMM yyyy")}
//                       </TableCell>

//                       <TableCell className="max-w-xs truncate">
//                         {t.description}
//                       </TableCell>

//                       <TableCell className="text-right text-green-600 font-medium">
//                         {formatCurrency(t.credit_amount)}
//                       </TableCell>

//                       <TableCell className="text-right text-red-600 font-medium">
//                         {formatCurrency(t.debit_amount)}
//                       </TableCell>

//                       <TableCell className="text-right font-medium">
//                         {formatCurrency(t.balance)}
//                       </TableCell>

//                       <TableCell>
//                         <Badge
//                           variant="outline"
//                           className={cn(
//                             t.reconciliation_status === "reconciled"
//                               ? "bg-green-100 text-green-700"
//                               : "bg-amber-100 text-amber-700"
//                           )}
//                         >
//                           {t.reconciliation_status || "pending"}
//                         </Badge>
//                       </TableCell>

//                       <TableCell className="text-right">
//                         <DropdownMenu>
//                           <DropdownMenuTrigger asChild>
//                             <Button variant="ghost" size="icon">
//                               <MoreHorizontal className="h-4 w-4"/>
//                             </Button>
//                           </DropdownMenuTrigger>

//                           <DropdownMenuContent align="end">
//                             <DropdownMenuItem onClick={()=>handleMarkReconciled(t.id)}>
//                               <CheckCircle2 className="h-4 w-4 mr-2"/>
//                               Reconcile
//                             </DropdownMenuItem>

//                             <DropdownMenuItem>
//                               <Link2 className="h-4 w-4 mr-2"/>
//                               Match Invoice
//                             </DropdownMenuItem>

//                             <DropdownMenuItem>
//                               <Eye className="h-4 w-4 mr-2"/>
//                               View Details
//                             </DropdownMenuItem>
//                           </DropdownMenuContent>
//                         </DropdownMenu>
//                       </TableCell>

//                     </TableRow>
//                   ))}
//                 </TableBody>
//               </Table>

//             </div>
//           )}
//         </CardContent>
//       </Card>

//     </div>
//   );
// }



