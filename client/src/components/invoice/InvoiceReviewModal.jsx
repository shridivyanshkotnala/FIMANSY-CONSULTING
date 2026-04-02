import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, AlertTriangle, FileText, IndianRupee } from "lucide-react";
import { useGetZohoTaxesQuery } from "@/Redux/Slices/api/invoiceApi";
import { getZohoAccountGroupByName, getZohoAccountSelectGroups } from "@/lib/zohoExpenseAccounts";
import {
  findMatchingZohoTdsOption,
  getZohoTdsOptionByValue,
  getZohoTdsSelectGroups,
  inferTdsNatureFromLabel,
  NO_TDS_SELECT_VALUE,
} from "@/lib/zohoTds";

const PAYMENT_MODES = ["Cash", "Bank Transfer", "Credit Card", "UPI", "Cheque", "NEFT", "RTGS", "IMPS"];

const DOCUMENT_CATEGORIES = [
  { value: "expense", label: "Expense", color: "bg-red-100 text-red-800" },
  { value: "revenue", label: "Revenue", color: "bg-green-100 text-green-800" },
  { value: "asset", label: "Asset", color: "bg-blue-100 text-blue-800" },
  { value: "liability", label: "Liability", color: "bg-purple-100 text-purple-800" },
];

export function InvoiceReviewModal({
  open,
  onClose,
  invoice: initialInvoice,
  pdfUrl,
  onSave,
  isSubmitting = false,
  saveLabel = "Save to Ledger",
}) {
  const [invoice, setInvoice] = useState(initialInvoice);
  const { data: zohoTaxes = [] } = useGetZohoTaxesQuery(undefined, { skip: !open });

  useEffect(() => {
    setInvoice(initialInvoice);
  }, [initialInvoice]);

  if (!invoice) return null;

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(Number(amount || 0));

  const handleFieldChange = (field, value) =>
    setInvoice((prev) => (prev ? { ...prev, [field]: value } : null));

  const handleExpenseAccountChange = (value) => {
    const inferredGroup = getZohoAccountGroupByName(value);
    setInvoice((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        expense_account: value,
        ...(inferredGroup ? { expense_account_group: inferredGroup } : {}),
      };
    });
  };

  const handleNumberChange = (field, value) => {
    const numValue = parseFloat(value) || 0;
    setInvoice((prev) => {
      if (!prev) return null;
      const updated = { ...prev, [field]: numValue };
      if (["taxable_amount", "cgst", "sgst", "igst"].includes(field)) {
        updated.total_gst = Number(updated.cgst || 0) + Number(updated.sgst || 0) + Number(updated.igst || 0);
        updated.total_with_gst = Number(updated.taxable_amount || 0) + Number(updated.total_gst || 0);
      }
      return updated;
    });
  };

  const handleTdsChange = (value) => {
    if (value === NO_TDS_SELECT_VALUE) {
      setInvoice((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          is_tds_applicable: false,
          tds_nature: "none",
          tds_section: null,
          tds_rate: null,
          tds_tax_name: "No TDS",
          tds_tax_id: null,
          tds_manual_override: true,
        };
      });
      return;
    }

    const selectedOption = getZohoTdsOptionByValue(tdsGroups, value);
    if (!selectedOption) return;

    setInvoice((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        is_tds_applicable: true,
        tds_nature:
          selectedOption.nature || inferTdsNatureFromLabel(selectedOption.name) || prev.tds_nature || null,
        tds_rate: selectedOption.percentage > 0 ? selectedOption.percentage : (prev.tds_rate ?? null),
        tds_tax_name: selectedOption.name,
        tds_tax_id: selectedOption.id || null,
        tds_manual_override: true,
      };
    });
  };

  const isValidTotal = Number(invoice.total_with_gst || 0) > 0;
  const confidence = Number(invoice.confidence || 0);
  const confidenceColor =
    confidence >= 80 ? "text-green-600" : confidence >= 50 ? "text-yellow-600" : "text-red-600";
  const accountGroups = getZohoAccountSelectGroups(invoice.expense_account);
  const tdsGroups = getZohoTdsSelectGroups(zohoTaxes, invoice.tds_tax_name);
  const matchedTdsOption = findMatchingZohoTdsOption(zohoTaxes, {
    tdsTaxId: invoice.tds_tax_id,
    tdsTaxName: invoice.tds_tax_name,
    tdsRate: invoice.tds_rate,
  });
  const selectedTdsValue = invoice.is_tds_applicable
    ? (matchedTdsOption?.value || NO_TDS_SELECT_VALUE)
    : NO_TDS_SELECT_VALUE;
  const selectedCategory = DOCUMENT_CATEGORIES.find((category) => category.value === invoice.document_category);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Review Invoice
            <Badge variant="secondary" className={selectedCategory?.color}>
              {selectedCategory?.label}
            </Badge>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-4">
            <span>Review and correct extracted data before saving</span>
            <Badge variant="outline" className={confidenceColor}>
              Confidence: {confidence}%
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Invoice Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="invoice_number">Invoice Number</Label>
                  <Input
                    id="invoice_number"
                    value={invoice.invoice_number || ""}
                    onChange={(event) => handleFieldChange("invoice_number", event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="document_category">Category</Label>
                  <Select
                    value={invoice.document_category || "expense"}
                    onValueChange={(value) => handleFieldChange("document_category", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="date_of_issue">Date of Issue</Label>
                  <Input
                    id="date_of_issue"
                    type="date"
                    value={invoice.date_of_issue || ""}
                    onChange={(event) => handleFieldChange("date_of_issue", event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={invoice.due_date || ""}
                    onChange={(event) => handleFieldChange("due_date", event.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Vendor / Customer</h3>
              <div className="space-y-1.5">
                <Label htmlFor="vendor_name">Vendor Name</Label>
                <Input
                  id="vendor_name"
                  value={invoice.vendor_name || ""}
                  onChange={(event) => handleFieldChange("vendor_name", event.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="vendor_gstin">Vendor GSTIN</Label>
                  <Input
                    id="vendor_gstin"
                    value={invoice.vendor_gstin || ""}
                    onChange={(event) => handleFieldChange("vendor_gstin", event.target.value)}
                    placeholder="15-character GSTIN"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vendor_city">Vendor City</Label>
                  <Input
                    id="vendor_city"
                    value={invoice.vendor_city || ""}
                    onChange={(event) => handleFieldChange("vendor_city", event.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="customer_name">Customer Name</Label>
                  <Input
                    id="customer_name"
                    value={invoice.customer_name || ""}
                    onChange={(event) => handleFieldChange("customer_name", event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="place_of_supply">Place of Supply</Label>
                  <Input
                    id="place_of_supply"
                    value={invoice.place_of_supply || ""}
                    onChange={(event) => handleFieldChange("place_of_supply", event.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Categorization</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="expense_account">Zoho Account</Label>
                  <Select value={invoice.expense_account || ""} onValueChange={handleExpenseAccountChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accountGroups.map((group, index) => (
                        <SelectGroup key={group.label}>
                          <SelectLabel>{group.label}</SelectLabel>
                          {group.options.map((account) => (
                            <SelectItem key={`${group.label}-${account}`} value={account}>
                              {account}
                            </SelectItem>
                          ))}
                          {index < accountGroups.length - 1 ? <SelectSeparator /> : null}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="payment_mode">Payment Mode</Label>
                  <Select value={invoice.payment_mode || ""} onValueChange={(value) => handleFieldChange("payment_mode", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_MODES.map((mode) => (
                        <SelectItem key={mode} value={mode}>
                          {mode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tds_tax">TDS</Label>
                <Select value={selectedTdsValue} onValueChange={handleTdsChange}>
                  <SelectTrigger id="tds_tax">
                    <SelectValue placeholder="Select TDS" />
                  </SelectTrigger>
                  <SelectContent>
                    {tdsGroups.map((group, index) => (
                      <SelectGroup key={group.label}>
                        <SelectLabel>{group.label}</SelectLabel>
                        {group.options.map((option) => (
                          <SelectItem key={`${group.label}-${option.value}`} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                        {index < tdsGroups.length - 1 ? <SelectSeparator /> : null}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
                {(invoice.tds_section || invoice.tds_rate) ? (
                  <p className="text-xs text-muted-foreground">
                    {invoice.tds_section ? `Section ${invoice.tds_section}` : "TDS"}
                    {invoice.tds_rate != null ? ` • ${Number(invoice.tds_rate)}%` : ""}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-3 rounded-lg bg-muted/50 p-4">
              <h3 className="flex items-center gap-2 font-medium text-sm text-muted-foreground uppercase tracking-wider">
                <IndianRupee className="h-4 w-4" />
                Amount Details
              </h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="taxable_amount">Taxable Amount</Label>
                  <Input
                    id="taxable_amount"
                    type="number"
                    step="0.01"
                    value={invoice.taxable_amount ?? 0}
                    onChange={(event) => handleNumberChange("taxable_amount", event.target.value)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="cgst">CGST</Label>
                    <Input
                      id="cgst"
                      type="number"
                      step="0.01"
                      value={invoice.cgst ?? 0}
                      onChange={(event) => handleNumberChange("cgst", event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sgst">SGST</Label>
                    <Input
                      id="sgst"
                      type="number"
                      step="0.01"
                      value={invoice.sgst ?? 0}
                      onChange={(event) => handleNumberChange("sgst", event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="igst">IGST</Label>
                    <Input
                      id="igst"
                      type="number"
                      step="0.01"
                      value={invoice.igst ?? 0}
                      onChange={(event) => handleNumberChange("igst", event.target.value)}
                    />
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total GST</span>
                  <span className="font-medium">{formatCurrency(invoice.total_gst)}</span>
                </div>
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Total Amount</span>
                  <span className="text-primary">{formatCurrency(invoice.total_with_gst)}</span>
                </div>
              </div>
            </div>

            {invoice.gst_reasoning ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm text-blue-800">
                  <strong>GST Analysis:</strong> {invoice.gst_reasoning}
                </p>
              </div>
            ) : null}

            {invoice.tds_reasoning ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm text-amber-900">
                  <strong>TDS Analysis:</strong> {invoice.tds_reasoning}
                </p>
              </div>
            ) : null}

            {pdfUrl ? (
              <div className="rounded-lg border bg-card p-4">
                <h3 className="mb-2 font-medium text-sm">Original Document</h3>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  View PDF in new tab
                </a>
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter className="mt-6">
          {!isValidTotal ? (
            <div className="flex flex-1 items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Total amount must be greater than 0</span>
            </div>
          ) : null}
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={() => onSave(invoice)} disabled={!isValidTotal || isSubmitting}>
            {isSubmitting ? "Saving..." : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {saveLabel}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
