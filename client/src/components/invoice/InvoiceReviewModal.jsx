import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, AlertTriangle, FileText, IndianRupee } from "lucide-react";

// ---------------- CONSTANT LISTS ----------------
const EXPENSE_ACCOUNTS = [
  'Office Supplies','Professional Services','Travel & Conveyance','Utilities','Software & Subscriptions','Equipment','Marketing & Advertising','Rent','Insurance','Maintenance','Sales Revenue','Services Income','Fixed Assets','Inventory','Miscellaneous',
];

const PAYMENT_MODES = ['Cash','Bank Transfer','Credit Card','UPI','Cheque','NEFT','RTGS','IMPS'];

const DOCUMENT_CATEGORIES = [
  { value: 'expense', label: 'Expense', color: 'bg-red-100 text-red-800' },
  { value: 'revenue', label: 'Revenue', color: 'bg-green-100 text-green-800' },
  { value: 'asset', label: 'Asset', color: 'bg-blue-100 text-blue-800' },
  { value: 'liability', label: 'Liability', color: 'bg-purple-100 text-purple-800' },
];

// ---------------- COMPONENT ----------------
export function InvoiceReviewModal({ open,onClose,invoice: initialInvoice,pdfUrl,onSave,isSubmitting = false }) {
  const [invoice, setInvoice] = useState(initialInvoice);

  // Sync incoming invoice prop to local state
  useEffect(() => { 
    console.log('🎯 Modal received invoice prop:', initialInvoice);
    setInvoice(initialInvoice); 
  }, [initialInvoice]);

  console.log('🎯 Modal current invoice state:', invoice);

  if (!invoice) {
    console.log('⚠️ Modal returning null - no invoice data');
    return null;
  }

  // ---------------- HELPERS ----------------
  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2}).format(amount);

  const handleFieldChange = (field, value) => setInvoice(prev => prev ? { ...prev, [field]: value } : null);

  // Recalculate GST totals when numeric fields change
  const handleNumberChange = (field, value) => {
    const numValue = parseFloat(value) || 0;
    setInvoice(prev => {
      if (!prev) return null;
      const updated = { ...prev, [field]: numValue };
      if (['taxable_amount','cgst','sgst','igst'].includes(field)) {
        updated.total_gst = updated.cgst + updated.sgst + updated.igst;
        updated.total_with_gst = updated.taxable_amount + updated.total_gst;
      }
      return updated;
    });
  };

  // ---------------- DERIVED STATE ----------------
  const isValidTotal = invoice.total_with_gst > 0;
  const confidenceColor = invoice.confidence >= 80 ? 'text-green-600' : invoice.confidence >= 50 ? 'text-yellow-600' : 'text-red-600';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">

        {/* HEADER */}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Review Invoice
            <Badge variant="secondary" className={DOCUMENT_CATEGORIES.find(c => c.value === invoice.document_category)?.color}>
              {DOCUMENT_CATEGORIES.find(c => c.value === invoice.document_category)?.label}
            </Badge>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-4">
            <span>Review and correct extracted data before saving</span>
            <Badge variant="outline" className={confidenceColor}>Confidence: {invoice.confidence}%</Badge>
          </DialogDescription>
        </DialogHeader>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* LEFT COLUMN - FORM */}
          <div className="space-y-4">

            {/* BASIC INFO */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Invoice Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="invoice_number">Invoice Number</Label>
                  <Input id="invoice_number" value={invoice.invoice_number} onChange={(e)=>handleFieldChange('invoice_number',e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="document_category">Category</Label>
                  <Select value={invoice.document_category} onValueChange={(value)=>handleFieldChange('document_category',value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DOCUMENT_CATEGORIES.map(cat=>(<SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="date_of_issue">Date of Issue</Label>
                  <Input id="date_of_issue" type="date" value={invoice.date_of_issue} onChange={(e)=>handleFieldChange('date_of_issue',e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input id="due_date" type="date" value={invoice.due_date||''} onChange={(e)=>handleFieldChange('due_date',e.target.value)} />
                </div>
              </div>
            </div>

            <Separator />

            {/* VENDOR / CUSTOMER */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Vendor / Customer</h3>
              <div className="space-y-1.5">
                <Label htmlFor="vendor_name">Vendor Name</Label>
                <Input id="vendor_name" value={invoice.vendor_name} onChange={(e)=>handleFieldChange('vendor_name',e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="vendor_gstin">Vendor GSTIN</Label>
                  <Input id="vendor_gstin" value={invoice.vendor_gstin||''} onChange={(e)=>handleFieldChange('vendor_gstin',e.target.value)} placeholder="15-character GSTIN" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vendor_city">Vendor City</Label>
                  <Input id="vendor_city" value={invoice.vendor_city||''} onChange={(e)=>handleFieldChange('vendor_city',e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="customer_name">Customer Name</Label>
                  <Input id="customer_name" value={invoice.customer_name||''} onChange={(e)=>handleFieldChange('customer_name',e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="place_of_supply">Place of Supply</Label>
                  <Input id="place_of_supply" value={invoice.place_of_supply||''} onChange={(e)=>handleFieldChange('place_of_supply',e.target.value)} />
                </div>
              </div>
            </div>

            <Separator />

            {/* CATEGORIZATION */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Categorization</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="expense_account">Expense Account</Label>
                  <Select value={invoice.expense_account||''} onValueChange={(value)=>handleFieldChange('expense_account',value)}>
                    <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                    <SelectContent>{EXPENSE_ACCOUNTS.map(acc=>(<SelectItem key={acc} value={acc}>{acc}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="payment_mode">Payment Mode</Label>
                  <Select value={invoice.payment_mode||''} onValueChange={(value)=>handleFieldChange('payment_mode',value)}>
                    <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
                    <SelectContent>{PAYMENT_MODES.map(mode=>(<SelectItem key={mode} value={mode}>{mode}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - AMOUNTS */}
          <div className="space-y-4">
            <div className="space-y-3 p-4 rounded-lg bg-muted/50">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2"><IndianRupee className="h-4 w-4" />Amount Details</h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="taxable_amount">Taxable Amount</Label>
                  <Input id="taxable_amount" type="number" step="0.01" value={invoice.taxable_amount} onChange={(e)=>handleNumberChange('taxable_amount',e.target.value)} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5"><Label htmlFor="cgst">CGST</Label><Input id="cgst" type="number" step="0.01" value={invoice.cgst} onChange={(e)=>handleNumberChange('cgst',e.target.value)} /></div>
                  <div className="space-y-1.5"><Label htmlFor="sgst">SGST</Label><Input id="sgst" type="number" step="0.01" value={invoice.sgst} onChange={(e)=>handleNumberChange('sgst',e.target.value)} /></div>
                  <div className="space-y-1.5"><Label htmlFor="igst">IGST</Label><Input id="igst" type="number" step="0.01" value={invoice.igst} onChange={(e)=>handleNumberChange('igst',e.target.value)} /></div>
                </div>
                <Separator />
                <div className="flex justify-between items-center text-sm"><span className="text-muted-foreground">Total GST</span><span className="font-medium">{formatCurrency(invoice.total_gst)}</span></div>
                <div className="flex justify-between items-center text-lg font-bold"><span>Total Amount</span><span className="text-primary">{formatCurrency(invoice.total_with_gst)}</span></div>
              </div>
            </div>

            {/* GST REASONING */}
            {invoice.gst_reasoning&&(<div className="p-3 rounded-lg bg-blue-50 border border-blue-200"><p className="text-sm text-blue-800"><strong>GST Analysis:</strong> {invoice.gst_reasoning}</p></div>)}

            {/* PDF LINK */}
            {pdfUrl&&(<div className="p-4 rounded-lg border bg-card"><h3 className="font-medium text-sm mb-2">Original Document</h3><a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1"><FileText className="h-4 w-4" />View PDF in new tab</a></div>)}
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <DialogFooter className="mt-6">
          {!isValidTotal&&(<div className="flex-1 flex items-center gap-2 text-yellow-600"><AlertTriangle className="h-4 w-4" /><span className="text-sm">Total amount must be greater than 0</span></div>)}
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={()=>onSave(invoice)} disabled={!isValidTotal||isSubmitting}>{isSubmitting?'Saving...':(<><CheckCircle2 className="h-4 w-4 mr-2" />Save to Ledger</>)}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
