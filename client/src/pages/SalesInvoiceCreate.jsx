import { useMemo, useState } from "react";
import { PillarLayout } from "@/components/layout/PillarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import {
  useCreateSalesInvoiceInZohoMutation,
  useCreateZohoCustomerMutation,
  useGetZohoCustomersQuery,
  useGetZohoTaxesQuery,
} from "@/Redux/Slices/api/invoiceApi";
import { useToast } from "@/hooks/use-toast";

const STATE_OPTIONS = [
  { value: "AN", label: "Andaman and Nicobar Islands" },
  { value: "AP", label: "Andhra Pradesh" },
  { value: "AR", label: "Arunachal Pradesh" },
  { value: "AS", label: "Assam" },
  { value: "BR", label: "Bihar" },
  { value: "CG", label: "Chhattisgarh" },
  { value: "CH", label: "Chandigarh" },
  { value: "DD", label: "Dadra and Nagar Haveli and Daman and Diu" },
  { value: "DL", label: "Delhi" },
  { value: "GA", label: "Goa" },
  { value: "GJ", label: "Gujarat" },
  { value: "HR", label: "Haryana" },
  { value: "HP", label: "Himachal Pradesh" },
  { value: "JH", label: "Jharkhand" },
  { value: "JK", label: "Jammu and Kashmir" },
  { value: "KA", label: "Karnataka" },
  { value: "KL", label: "Kerala" },
  { value: "LA", label: "Ladakh" },
  { value: "LD", label: "Lakshadweep" },
  { value: "MH", label: "Maharashtra" },
  { value: "ML", label: "Meghalaya" },
  { value: "MN", label: "Manipur" },
  { value: "MP", label: "Madhya Pradesh" },
  { value: "MZ", label: "Mizoram" },
  { value: "NL", label: "Nagaland" },
  { value: "OD", label: "Odisha" },
  { value: "PB", label: "Punjab" },
  { value: "PY", label: "Puducherry" },
  { value: "RJ", label: "Rajasthan" },
  { value: "SK", label: "Sikkim" },
  { value: "TN", label: "Tamil Nadu" },
  { value: "TS", label: "Telangana" },
  { value: "TR", label: "Tripura" },
  { value: "UK", label: "Uttarakhand" },
  { value: "UP", label: "Uttar Pradesh" },
  { value: "WB", label: "West Bengal" },
];

const createEmptyLine = () => ({
  description: "",
  quantity: 1,
  rate: "",
  taxId: "",
  taxPercentage: 0,
  discount: "",
});

const SPECIAL_TAX_OPTIONS = [
  { id: "special:non-taxable", label: "Non-Taxable", percentage: 0, type: "special" },
  { id: "special:out-of-scope", label: "Out of Scope", percentage: 0, type: "special" },
  { id: "special:non-gst-supply", label: "Non-GST Supply", percentage: 0, type: "special" },
];

const DEFAULT_GST_GROUP_OPTIONS = [
  { id: "preset:GST0", label: "GST0 [0%]", percentage: 0, type: "tax_group" },
  { id: "preset:GST5", label: "GST5 [5%]", percentage: 5, type: "tax_group" },
  { id: "preset:GST12", label: "GST12 [12%]", percentage: 12, type: "tax_group" },
  { id: "preset:GST18", label: "GST18 [18%]", percentage: 18, type: "tax_group" },
  { id: "preset:GST28", label: "GST28 [28%]", percentage: 28, type: "tax_group" },
  { id: "preset:GST40", label: "GST40 [40%]", percentage: 40, type: "tax_group" },
];

const AddressFields = ({ title, value, onChange }) => (
  <div className="space-y-3 rounded-md border p-3">
    <p className="font-medium">{title}</p>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Input placeholder="Attention" value={value.attention || ""} onChange={(e) => onChange("attention", e.target.value)} />
      <Input placeholder="City" value={value.city || ""} onChange={(e) => onChange("city", e.target.value)} />
      <Input placeholder="Address line 1" value={value.address || ""} onChange={(e) => onChange("address", e.target.value)} />
      <Input placeholder="Address line 2" value={value.street2 || ""} onChange={(e) => onChange("street2", e.target.value)} />
      <Input placeholder="State" value={value.state || ""} onChange={(e) => onChange("state", e.target.value)} />
      <Input placeholder="Pin code" value={value.pincode || ""} onChange={(e) => onChange("pincode", e.target.value)} />
      <Input placeholder="Phone" value={value.phone || ""} onChange={(e) => onChange("phone", e.target.value)} />
    </div>
  </div>
);

export default function SalesInvoiceCreate() {
  const { toast } = useToast();
  const [customerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [subject, setSubject] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [lineItems, setLineItems] = useState([createEmptyLine()]);

  const [isCreateCustomerOpen, setIsCreateCustomerOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    displayName: "",
    email: "",
    phone: "",
    billingAddress: {},
    shippingAddress: {},
    shippingSameAsBilling: true,
  });

  const { data: customers = [], isFetching: customersLoading, refetch: refetchCustomers } =
    useGetZohoCustomersQuery(customerSearch);
  const { data: taxes = [], isFetching: taxesLoading } = useGetZohoTaxesQuery();

  const [createZohoCustomer, { isLoading: creatingCustomer }] = useCreateZohoCustomerMutation();
  const [createSalesInvoiceInZoho, { isLoading: creatingInvoice }] = useCreateSalesInvoiceInZohoMutation();

  const taxOptions = useMemo(() => {
    const apiTaxes = (taxes || []).map((t) => ({
      id: t.id,
      label: t.label,
      percentage: Number(t.percentage || 0),
      type: t.type || "tax",
    }));

    const dedup = new Map();
    [...SPECIAL_TAX_OPTIONS, ...DEFAULT_GST_GROUP_OPTIONS, ...apiTaxes].forEach((option) => {
      if (!dedup.has(option.id)) dedup.set(option.id, option);
    });

    return Array.from(dedup.values());
  }, [taxes]);

  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, row) => {
      const qty = Number(row.quantity || 0);
      const rate = Number(row.rate || 0);
      const discountPct = row.discount === "" ? 0 : Number(row.discount || 0);
      const base = qty * rate;
      const discounted = base - base * (discountPct / 100);
      return sum + (Number.isFinite(discounted) ? discounted : 0);
    }, 0);
    return { subtotal };
  }, [lineItems]);

  const updateLineItem = (index, patch) => {
    setLineItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const addLine = () => setLineItems((prev) => [...prev, createEmptyLine()]);
  const removeLine = (index) => {
    setLineItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.displayName.trim()) {
      toast({ title: "Display name is required", variant: "destructive" });
      return;
    }

    try {
      const res = await createZohoCustomer(newCustomer).unwrap();
      await refetchCustomers();
      if (res?.customer?.id) setSelectedCustomerId(res.customer.id);
      setIsCreateCustomerOpen(false);
      setNewCustomer({
        displayName: "",
        email: "",
        phone: "",
        billingAddress: {},
        shippingAddress: {},
        shippingSameAsBilling: true,
      });
      toast({ title: "Customer created in Zoho" });
    } catch (e) {
      toast({ title: e?.data?.message || "Failed to create customer", variant: "destructive" });
    }
  };

  const handleCreateInvoice = async () => {
    if (!selectedCustomerId) {
      toast({ title: "Customer is required", variant: "destructive" });
      return;
    }
    if (!placeOfSupply) {
      toast({ title: "Place of supply is required", variant: "destructive" });
      return;
    }

    const invalid = lineItems.some((r) =>
      !r.description.trim() || !(Number(r.quantity) > 0) || !(Number(r.rate) >= 0) || !r.taxId
    );
    if (invalid) {
      toast({ title: "Fill all required line-item fields including tax", variant: "destructive" });
      return;
    }

    try {
      await createSalesInvoiceInZoho({
        customerId: selectedCustomerId,
        placeOfSupply,
        subject,
        invoiceDate,
        lineItems,
      }).unwrap();

      toast({ title: "Invoice created in Zoho Books" });
      setSubject("");
      setLineItems([createEmptyLine()]);
    } catch (e) {
      toast({ title: e?.data?.message || "Failed to create invoice", variant: "destructive" });
    }
  };

  const isBusy = creatingInvoice || customersLoading || taxesLoading;

  return (
    <PillarLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="rounded-xl border bg-gradient-to-r from-primary/10 via-background to-amber-500/10 p-5 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Create Sales Invoice</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create invoice directly in Zoho Books with customer, GST state, item and tax details.
            </p>
          </div>
          <Sparkles className="h-8 w-8 text-primary" />
        </div>

        <Card className="shadow-sm border-primary/20">
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Name *</Label>
                <Select
                  value={selectedCustomerId}
                  onValueChange={(v) => {
                    if (v === "__create__") {
                      setIsCreateCustomerOpen(true);
                      return;
                    }
                    setSelectedCustomerId(v);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                    <SelectItem value="__create__">+ Create customer in Zoho</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">If customer is missing, create instantly from dropdown.</p>
              </div>

              <div className="space-y-2">
                <Label>Place of Supply (State) *</Label>
                <Select value={placeOfSupply} onValueChange={setPlaceOfSupply}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATE_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Invoice Date *</Label>
                <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Subject (optional)</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Item Details</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                  <Plus className="h-4 w-4 mr-1" /> Add Row
                </Button>
              </div>

              <div className="space-y-3">
                {lineItems.map((row, index) => {
                  const amount = (Number(row.quantity || 0) * Number(row.rate || 0)) || 0;
                  return (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 border rounded-md p-2 bg-muted/20">
                      <Input
                        className="md:col-span-4"
                        placeholder="Description *"
                        value={row.description}
                        onChange={(e) => updateLineItem(index, { description: e.target.value })}
                      />
                      <Input
                        className="md:col-span-1"
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Qty"
                        value={row.quantity}
                        onChange={(e) => updateLineItem(index, { quantity: e.target.value })}
                      />
                      <Input
                        className="md:col-span-2"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Rate"
                        value={row.rate}
                        onChange={(e) => updateLineItem(index, { rate: e.target.value })}
                      />

                      <Select
                        value={row.taxId}
                        onValueChange={(v) => {
                          const selectedTax = taxOptions.find((t) => t.id === v);
                          updateLineItem(index, {
                            taxId: v,
                            taxPercentage: Number(selectedTax?.percentage || 0),
                          });
                        }}
                      >
                        <SelectTrigger className="md:col-span-3">
                          <SelectValue placeholder="Select Tax *" />
                        </SelectTrigger>
                        <SelectContent>
                          {taxOptions.map((tax) => (
                            <SelectItem key={tax.id} value={tax.id}>{tax.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        className="md:col-span-1"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        placeholder="Disc %"
                        value={row.discount}
                        onChange={(e) => updateLineItem(index, { discount: e.target.value })}
                      />

                      <div className="md:col-span-1 flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">₹ {amount.toFixed(2)}</span>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="text-right font-semibold">Subtotal: ₹ {totals.subtotal.toFixed(2)}</div>

            <p className="text-xs text-muted-foreground">
              Tax selection is mandatory for each item. Includes Non-Taxable, Out of Scope, Non-GST Supply and Zoho Tax Groups.
            </p>

            <Button onClick={handleCreateInvoice} disabled={isBusy || !selectedCustomerId || !placeOfSupply}>
              {creatingInvoice ? "Creating..." : "Create Invoice in Zoho"}
            </Button>
          </CardContent>
        </Card>

        <Dialog open={isCreateCustomerOpen} onOpenChange={setIsCreateCustomerOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Create Customer in Zoho</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1">
                  <Label>Display Name *</Label>
                  <Input
                    value={newCustomer.displayName}
                    onChange={(e) => setNewCustomer((p) => ({ ...p, displayName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Phone (optional)</Label>
                  <Input
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Email (optional)</Label>
                  <Input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Address fields are optional. Address is mandatory if you want to generate GST invoices.
              </p>

              <AddressFields
                title="Billing Address"
                value={newCustomer.billingAddress}
                onChange={(k, v) =>
                  setNewCustomer((p) => ({
                    ...p,
                    billingAddress: { ...p.billingAddress, [k]: v },
                  }))
                }
              />

              <div className="flex items-center gap-2">
                <Checkbox
                  id="shippingSame"
                  checked={newCustomer.shippingSameAsBilling}
                  onCheckedChange={(checked) =>
                    setNewCustomer((p) => ({ ...p, shippingSameAsBilling: Boolean(checked) }))
                  }
                />
                <Label htmlFor="shippingSame">Shipping address is same as billing</Label>
              </div>

              {!newCustomer.shippingSameAsBilling && (
                <AddressFields
                  title="Shipping Address"
                  value={newCustomer.shippingAddress}
                  onChange={(k, v) =>
                    setNewCustomer((p) => ({
                      ...p,
                      shippingAddress: { ...p.shippingAddress, [k]: v },
                    }))
                  }
                />
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateCustomerOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateCustomer} disabled={creatingCustomer}>
                  {creatingCustomer ? "Creating..." : "Create Customer"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PillarLayout>
  );
}
