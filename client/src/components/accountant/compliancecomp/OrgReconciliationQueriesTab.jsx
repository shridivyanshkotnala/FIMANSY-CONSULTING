import { useMemo, useState } from "react";
import {
  useGetOrgReconciliationQueriesQuery,
  useResolveOrgReconciliationQueryMutation,
} from "@/Redux/Slices/api/complianceApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "./EmptyState";

const formatCurrency = (amount) => {
  if (amount == null || amount === "") return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount));
};

const formatDate = (dateValue) => {
  if (!dateValue) return "—";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const cleanDescription = (desc = "") => {
  if (!desc) return "";
  const tokens = desc.split(/\s+/).map((tok) => {
    if (!tok) return "";
    if (tok.includes("/")) return tok;
    if (/^\d{9,}$/.test(tok)) return "";
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

export function OrgReconciliationQueriesTab({ orgId }) {
  const { data: queries = [], isLoading, isFetching } = useGetOrgReconciliationQueriesQuery(orgId, {
    skip: !orgId,
    pollingInterval: 20000,
  });
  const [resolveQuery] = useResolveOrgReconciliationQueryMutation();

  const [open, setOpen] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);

  const sortedQueries = useMemo(
    () => [...queries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [queries]
  );

  const handleView = (query) => {
    setSelectedQuery(query);
    setOpen(true);
  };

  const handleResolve = async () => {
    if (!selectedQuery?._id || !orgId) return;

    try {
      setResolvingId(selectedQuery._id);
      await resolveQuery({ orgId, queryId: selectedQuery._id }).unwrap();
      setOpen(false);
      setSelectedQuery(null);
    } catch (error) {
      console.error("Failed to resolve reconciliation query", error);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reconciliation Queries</CardTitle>
      </CardHeader>

      <CardContent>
        {isLoading || isFetching ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading reconciliation queries...</div>
        ) : sortedQueries.length === 0 ? (
          <EmptyState message="No reconciliation queries for this organization" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Running Balance</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {sortedQueries.map((q) => {
                  const details = q.transactionDetails || {};
                  return (
                    <TableRow key={q._id}>
                      <TableCell>{formatDate(details.transactionDate)}</TableCell>
                      <TableCell className="max-w-xs text-sm">
                        {renderDescription(details)}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${details.type === "credit" ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(details.amount)}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(details.runningBalance)}</TableCell>
                      <TableCell className="capitalize">{details.type || "—"}</TableCell>
                      <TableCell>
                        <Badge className="bg-warning/10 text-warning border-warning/20">Pending Query</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => handleView(q)}>
                          View Query
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Reported Query</DialogTitle>
              <DialogDescription>
                Review user-reported issue for this transaction.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-md border border-border bg-muted/20 p-3 text-sm whitespace-pre-wrap">
              {selectedQuery?.queryMessage || "—"}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Close Dialog
              </Button>
              <Button
                onClick={handleResolve}
                disabled={!selectedQuery?._id || resolvingId === selectedQuery?._id}
              >
                Mark as Resolved
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
