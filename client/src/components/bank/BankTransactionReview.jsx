import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, AlertTriangle, Edit2, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------- CATEGORY LISTS -------------------- */

const CREDIT_CATEGORIES = [
  { value: "salary", label: "Salary" },
  { value: "receipt", label: "Customer Receipt" },
  { value: "transfer_in", label: "Transfer In" },
  { value: "interest", label: "Interest Income" },
  { value: "refund", label: "Refund" },
  { value: "investment_income", label: "Investment Income" },
  { value: "other_income", label: "Other Income" },
];

const DEBIT_CATEGORIES = [
  { value: "rent", label: "Rent" },
  { value: "utilities", label: "Utilities" },
  { value: "transfer_out", label: "Transfer Out" },
  { value: "payment", label: "Vendor Payment" },
  { value: "emi", label: "Loan EMI" },
  { value: "charges", label: "Bank Charges" },
  { value: "atm", label: "ATM Withdrawal" },
  { value: "pos", label: "POS Transaction" },
  { value: "upi", label: "UPI Payment" },
  { value: "salary_expense", label: "Salary Expense" },
  { value: "vendor_payment", label: "Vendor Payment" },
  { value: "asset_purchase", label: "Asset Purchase" },
  { value: "other_expense", label: "Other Expense" },
];

/* -------------------- HELPERS -------------------- */

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* -------------------- COMPONENT -------------------- */

export function BankTransactionReview({
  metadata,
  transactions: initialTransactions,
  summary,
  onConfirm,
  onCancel,
  isSubmitting = false,
}) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [editingIndex, setEditingIndex] = useState(null);

  const uncategorizedCount = useMemo(
    () =>
      transactions.filter(
        (t) =>
          t.category === "other" ||
          t.category === "other_income" ||
          t.category === "other_expense"
      ).length,
    [transactions]
  );

  const handleCategoryChange = (index, newCategory) => {
    setTransactions((prev) =>
      prev.map((t, i) => (i === index ? { ...t, category: newCategory } : t))
    );
    setEditingIndex(null);
  };

  const getCategoryLabel = (category, type) => {
    const categories = type === "credit" ? CREDIT_CATEGORIES : DEBIT_CATEGORIES;
    return categories.find((c) => c.value === category)?.label || category;
  };

  const getCategoryColor = (category) => {
    if (category.includes("other")) return "bg-yellow-100 text-yellow-800";
    if (["salary", "receipt", "interest", "investment_income"].includes(category))
      return "bg-green-100 text-green-800";
    if (["rent", "emi", "charges"].includes(category))
      return "bg-red-100 text-red-800";
    return "bg-blue-100 text-blue-800";
  };

  return (
    <div className="space-y-6">
      {/* SUMMARY CARD */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {metadata.bank_name} Statement
            {summary.balance_matches ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Balance Verified
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                <AlertTriangle className="h-3 w-3 mr-1" /> Balance Mismatch
              </Badge>
            )}
          </CardTitle>

          <CardDescription>
            Account: ****{metadata.account_number} • {metadata.account_holder}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoBlock label="Period">
              {formatDate(metadata.statement_period_start)} -{" "}
              {formatDate(metadata.statement_period_end)}
            </InfoBlock>

            <InfoBlock label="Opening Balance">
              {formatCurrency(metadata.opening_balance)}
            </InfoBlock>

            <InfoBlock label="Total Credits" className="bg-green-50 text-green-700">
              {formatCurrency(summary.total_credits)}
            </InfoBlock>

            <InfoBlock label="Total Debits" className="bg-red-50 text-red-700">
              {formatCurrency(summary.total_debits)}
            </InfoBlock>
          </div>

          {uncategorizedCount > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                {uncategorizedCount} transaction(s) need category review
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* TABLE */}
      <Card>
        <CardHeader>
          <CardTitle>Review Transactions ({transactions.length})</CardTitle>
          <CardDescription>
            Click category to edit before saving
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead>Category</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {transactions.map((transaction, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-sm">
                      {formatDate(transaction.transaction_date)}
                    </TableCell>

                    <TableCell>
                      <p className="text-sm truncate max-w-[300px]">
                        {transaction.description}
                      </p>
                      {transaction.reference_number && (
                        <p className="text-xs text-muted-foreground">
                          Ref: {transaction.reference_number}
                        </p>
                      )}
                    </TableCell>

                    <TableCell className="text-right font-mono">
                      {transaction.debit_amount > 0
                        ? <span className="text-red-600">{formatCurrency(transaction.debit_amount)}</span>
                        : "-"}
                    </TableCell>

                    <TableCell className="text-right font-mono">
                      {transaction.credit_amount > 0
                        ? <span className="text-green-600">{formatCurrency(transaction.credit_amount)}</span>
                        : "-"}
                    </TableCell>

                    <TableCell>
                      {editingIndex === index ? (
                        <Select
                          value={transaction.category}
                          onValueChange={(value) => handleCategoryChange(index, value)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(transaction.transaction_type === "credit"
                              ? CREDIT_CATEGORIES
                              : DEBIT_CATEGORIES
                            ).map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge
                          variant="secondary"
                          className={cn("cursor-pointer hover:opacity-80", getCategoryColor(transaction.category))}
                          onClick={() => setEditingIndex(index)}
                        >
                          {getCategoryLabel(transaction.category, transaction.transaction_type)}
                          <Edit2 className="h-3 w-3 ml-1" />
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between border-t bg-muted/50 p-4">
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            <X className="h-4 w-4 mr-2" /> Cancel
          </Button>

          <Button onClick={() => onConfirm(transactions)} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : `Confirm & Save ${transactions.length} Transactions`}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

/* Small reusable block */
function InfoBlock({ label, children, className }) {
  return (
    <div className={cn("p-3 rounded-lg bg-muted", className)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{children}</p>
    </div>
  );
}
