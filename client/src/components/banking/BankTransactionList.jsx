import { useState, useEffect } from "react";

/*
 OLD:
   UI directly edits bank_transactions table

 NEW:
   UI displays BANK FEED EVENTS
   Actions dispatch reconciliation intents

 FUTURE REDUX FLOW:
   dispatch(fetchBankFeed())
   dispatch(reconcileTransaction(txId))
*/

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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

import {
  Search, Filter, ArrowUpRight, ArrowDownRight, MoreHorizontal,
  CheckCircle2, Link2, Eye, FileText
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function BankTransactionList() {

  const [transactions, setTransactions] = useState([]); // later redux selector
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  /*
    🔌 FUTURE:
    dispatch(fetchBankFeed())
  */
  useEffect(() => {
    setTimeout(() => {
      setTransactions([]);
      setLoading(false);
    }, 400);
  }, []);

  const formatCurrency = (amount) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.reference_number?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || t.reconciliation_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  /*
    🔌 FUTURE:
    dispatch(reconcileTransaction(txId))
  */
  const handleMarkReconciled = (id) => {
    console.log("Reconcile intent:", id);
  };

  const totalCredits = transactions.reduce((sum, t) => sum + (t.credit_amount || 0), 0);
  const totalDebits = transactions.reduce((sum, t) => sum + (t.debit_amount || 0), 0);
  const unreconciledCount = transactions.filter(t => t.reconciliation_status !== "reconciled").length;

  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <ArrowDownRight className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">Credits</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(totalCredits)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <ArrowUpRight className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-sm text-muted-foreground">Debits</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(totalDebits)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <FileText className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-sm text-muted-foreground">Unreconciled</p>
              <p className="text-xl font-bold">{unreconciledCount}</p>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search description or reference"
            value={searchTerm}
            onChange={(e)=>setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2"/>
            <SelectValue/>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unreconciled">Unreconciled</SelectItem>
            <SelectItem value="reconciled">Reconciled</SelectItem>
          </SelectContent>
        </Select>

      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Bank Feed</CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-10 text-center">Loading bank feed...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              No bank transactions
            </div>
          ) : (
            <div className="overflow-x-auto">

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead/>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredTransactions.map((t)=>(
                    <TableRow key={t.id}>

                      <TableCell>
                        {format(new Date(t.transaction_date),"dd MMM yyyy")}
                      </TableCell>

                      <TableCell className="max-w-xs truncate">
                        {t.description}
                      </TableCell>

                      <TableCell className="text-right text-green-600 font-medium">
                        {formatCurrency(t.credit_amount)}
                      </TableCell>

                      <TableCell className="text-right text-red-600 font-medium">
                        {formatCurrency(t.debit_amount)}
                      </TableCell>

                      <TableCell className="text-right font-medium">
                        {formatCurrency(t.balance)}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            t.reconciliation_status === "reconciled"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          )}
                        >
                          {t.reconciliation_status || "pending"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4"/>
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={()=>handleMarkReconciled(t.id)}>
                              <CheckCircle2 className="h-4 w-4 mr-2"/>
                              Reconcile
                            </DropdownMenuItem>

                            <DropdownMenuItem>
                              <Link2 className="h-4 w-4 mr-2"/>
                              Match Invoice
                            </DropdownMenuItem>

                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2"/>
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>

                    </TableRow>
                  ))}
                </TableBody>
              </Table>

            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
