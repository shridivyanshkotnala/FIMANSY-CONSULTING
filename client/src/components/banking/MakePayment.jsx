import { useState, useEffect } from "react";

/*
  ARCHITECTURE CHANGE

  OLD FLOW:
  UI -> Supabase -> DB -> Done

  NEW FLOW (what we are preparing for):
  UI -> Redux Action -> Backend API -> Ledger Engine -> Bank Queue

  This file MUST only collect payment intent.
  It must NOT perform payment.
*/

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { Send, Building2, CreditCard, IndianRupee, ChevronDown } from "lucide-react";

/*
  🔌 FUTURE REDUX (NOT NOW)

  const dispatch = useDispatch()

  dispatch(fetchActiveVendors())
  dispatch(fetchPendingInvoices())
  dispatch(createPaymentIntent(payload))
*/

const PAYMENT_MODES = [
  { value: "NEFT", label: "NEFT" },
  { value: "RTGS", label: "RTGS" },
  { value: "IMPS", label: "IMPS" },
  { value: "UPI", label: "UPI" },
  { value: "Cheque", label: "Cheque" },
];

export function MakePayment() {

  // later: from redux selectors
  const [vendors, setVendors] = useState([]);
  const [invoices, setInvoices] = useState([]);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [vendorOpen, setVendorOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const [selectedVendor, setSelectedVendor] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [formData, setFormData] = useState({
    vendor_id: "",
    invoice_id: "",
    amount: "",
    payment_mode: "NEFT",
    from_account: "",
    description: "",
    notes: "",
  });

  /*
    🔴 WILL BECOME
    dispatch(fetchActiveVendors())
    dispatch(fetchPendingInvoices())
  */
  const fetchData = async () => {
    setLoading(true);

    // mock temporary
    setTimeout(() => {
      setVendors([]);
      setInvoices([]);
      setLoading(false);
    }, 300);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleVendorSelect = (vendorId) => {
    const vendor = vendors.find(v => v.id === vendorId);
    setSelectedVendor(vendor || null);
    setFormData(prev => ({ ...prev, vendor_id: vendorId }));
    setVendorOpen(false);
  };

  const handleInvoiceSelect = (invoiceId) => {
    const invoice = invoices.find(i => i.id === invoiceId);
    setSelectedInvoice(invoice || null);

    setFormData(prev => ({
      ...prev,
      invoice_id: invoiceId,
      amount: invoice ? String(invoice.total_with_gst) : "",
      description: invoice ? `Payment for Invoice #${invoice.invoice_number}` : ""
    }));

    setInvoiceOpen(false);
  };

  /*
    🔴 CRITICAL PART — FUTURE ACCOUNTING INTEGRATION

    This will NOT create payment directly.

    Instead backend will:
      1) create payment_intent
      2) validate balance
      3) reserve funds
      4) push to payment queue
      5) ledger posting
      6) bank processing
  */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.vendor_id) return toast.error("Select vendor");
    if (!formData.amount || Number(formData.amount) <= 0) return toast.error("Invalid amount");
    if (!formData.from_account) return toast.error("Select source account");

    setSubmitting(true);

    try {

      const payload = {
        vendor_id: formData.vendor_id,
        invoice_id: formData.invoice_id || null,
        amount: Number(formData.amount),
        payment_mode: formData.payment_mode,
        from_account: formData.from_account,
        description: formData.description,
        notes: formData.notes,
      };

      /*
        🔌 FUTURE
        dispatch(createPaymentIntent(payload))
      */

      console.log("PAYMENT INTENT:", payload);

      toast.success("Payment intent created (mock)");

      setFormData({
        vendor_id: "",
        invoice_id: "",
        amount: "",
        payment_mode: "NEFT",
        from_account: "",
        description: "",
        notes: "",
      });

      setSelectedVendor(null);
      setSelectedInvoice(null);

    } catch {
      toast.error("Payment failed");
    }

    setSubmitting(false);
  };

  if (loading) return <div className="py-20 text-center">Loading...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5"/>
            Initiate Payment
          </CardTitle>
          <CardDescription>
            This creates a payment instruction, not a bank transfer yet.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Vendor */}
            <div className="space-y-2">
              <Label>Vendor</Label>

              <Popover open={vendorOpen} onOpenChange={setVendorOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {selectedVendor ? selectedVendor.vendor_name : "Select vendor"}
                    <ChevronDown className="h-4 w-4 opacity-50"/>
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="p-0">
                  <Command>
                    <CommandInput placeholder="Search vendor"/>
                    <CommandList>
                      <CommandEmpty>No vendor</CommandEmpty>
                      <CommandGroup>
                        {vendors.map(v => (
                          <CommandItem key={v.id} onSelect={()=>handleVendorSelect(v.id)}>
                            {v.vendor_name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e)=>setFormData({...formData,amount:e.target.value})}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Mode */}
            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <Select value={formData.payment_mode} onValueChange={(v)=>setFormData({...formData,payment_mode:v})}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e)=>setFormData({...formData,notes:e.target.value})}
              />
            </div>

            <Button className="w-full" disabled={submitting}>
              {submitting ? "Processing..." : "Create Payment Intent"}
            </Button>

          </form>
        </CardContent>
      </Card>

      {/* Vendor Preview */}
      {selectedVendor && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4"/>
              Beneficiary
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-2">
            <p className="font-medium">{selectedVendor.vendor_name}</p>

            {selectedVendor.account_number && (
              <div className="text-sm">
                <CreditCard className="inline h-4 w-4 mr-2"/>
                XXXX{selectedVendor.account_number.slice(-4)}
              </div>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
}
