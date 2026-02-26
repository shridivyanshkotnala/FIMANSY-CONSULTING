import { useState } from "react";
import {
  useGetBankDashboardQuery,
  useUpdateTransactionCategoryMutation,
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

  const { data, isLoading, isFetching } =
    useGetBankDashboardQuery({
      status: status === "all" ? undefined : status,
      search,
      page,
      limit,
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

  const mapExpenseTag = (desc = "", category = "") => {
    const text = (desc + " " + category).toLowerCase();
    const mapping = [
      { label: "Labor", keys: ["labor", "labour", "wages", "salary", "payroll", "manpower"] },
      { label: "Job Costing", keys: ["job costing", "jobcosting", "jobcost", "job"] },
      { label: "Lodging", keys: ["lodg", "lodging", "hotel", "stay", "boarding"] },
      { label: "Rent", keys: ["rent", "rentals"] },
      { label: "Transfer", keys: ["transfer", "rtgs", "neft", "neft-", "upi/"] },
      { label: "Vendor Payment", keys: ["vendor", "payment", "payt", "payment to", "pymt"] },
      { label: "Cash Withdrawal", keys: ["wdl", "withdrawal", "cash wdl", "cash withdraw", "atm"] },
      { label: "Advance", keys: ["advance", "employee advance"] },
    ];

    for (const m of mapping) {
      for (const k of m.keys) {
        if (text.includes(k)) return m.label;
      }
    }

    // As a last attempt, if description contains short uppercase words like 'LABOR' or 'JOB', show them
    const uppercaseMatch = desc.match(/\b([A-Z]{3,})\b/);
    if (uppercaseMatch) {
      const word = uppercaseMatch[1].toLowerCase();
      if (word.includes("lab")) return "Labor";
      if (word.includes("job")) return "Job Costing";
      if (word.includes("lodg") || word.includes("hotel")) return "Lodging";
    }

    return "Expense";
  };

  const renderDescription = (t) => {
    const desc = t.description || t.referenceNumber || "";
    const cleaned = cleanDescription(desc);

    if (t.type === "credit") {
      const customer = extractCapitalizedPhrase(desc) || "";
      return (
        <div className="text-sm">
          <div className="font-medium">Deposit</div>
          {customer ? (
            <div className="text-muted-foreground text-sm">Customer: {customer}</div>
          ) : (
            cleaned && (
              <div className="text-muted-foreground text-sm">Details: {cleaned}</div>
            )
          )}
        </div>
      );
    }

    // debit / expense
    const tag = mapExpenseTag(desc, t.category);

    const expenseAccount = t.expenseAccount || t.expenseAccountName || t.account || t.expense_account;
    const vendor = t.vendor || t.vendorName || t.payee || t.supplier;
    const customer = t.customer || t.customerName || t.customer_name;
    const rawDesc = t.description || t.referenceNumber || "";

    return (
      <div className="text-sm">
        <div className="font-medium">{tag}</div>
        {expenseAccount && (
          <div className="text-muted-foreground text-sm">Expense Account: {expenseAccount}</div>
        )}
        {vendor && (
          <div className="text-muted-foreground text-sm">Vendor: {vendor}</div>
        )}
        {customer && (
          <div className="text-muted-foreground text-sm">Customer: {customer}</div>
        )}
        {rawDesc && (
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

  const [updateCategory] = useUpdateTransactionCategoryMutation();

  const handleCategoryChange = async (id, category) => {
    try {
      await updateCategory({ id, category }).unwrap();
    } catch (err) {
      console.error("Category update failed", err);
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
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Running Balance</TableHead>
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

                        <TableCell>
                          <Select
                            value={t.category || ""}
                            onValueChange={(value) => handleCategoryChange(t._id, value)}
                          >
                            <SelectTrigger className="h-8 w-36">
                              <SelectValue placeholder="Set category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="rent">Rent</SelectItem>
                              <SelectItem value="salary">Salary</SelectItem>
                              <SelectItem value="payment">Vendor Payment</SelectItem>
                              <SelectItem value="transfer">Transfer</SelectItem>
                              <SelectItem value="labor">Labor</SelectItem>
                              <SelectItem value="job_costing">Job Costing</SelectItem>
                              <SelectItem value="materials">Materials</SelectItem>
                              <SelectItem value="lodging">Lodging</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>

                        <TableCell className="text-right font-medium">
                          {formatCurrency(runningBalances[idx])}
                        </TableCell>

                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

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



