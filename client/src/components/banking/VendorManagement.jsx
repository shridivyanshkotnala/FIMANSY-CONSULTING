import { useState, useEffect } from "react";

/*
  ❗ IMPORTANT ARCHITECTURE NOTE

  Previously:
  useAuth()  -> provided organization id
  supabase   -> acted as backend + database + business logic

  Now:
  This component becomes PURE UI + STATE ONLY.

  Later you will connect:
  Redux slice: vendorSlice
  Async thunks:
    - fetchVendors
    - createVendor
    - updateVendor
    - deleteVendor

  This file should NEVER again talk to database directly.
*/

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

import { Plus, Search, Building2, CreditCard, CheckCircle2, XCircle, Edit, Trash2, Phone, Mail } from "lucide-react";

/*
  🔌 FUTURE REDUX CONNECTION (example)

  import { useDispatch, useSelector } from "react-redux";
  import { fetchVendors, createVendor, updateVendor, deleteVendor } from "@/store/vendorSlice";
*/

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
  "Uttarakhand","West Bengal","Delhi","Jammu and Kashmir","Ladakh"
];

export function VendorManagement() {

  // 🔄 Later replace with Redux selector
  const [vendors, setVendors] = useState([]);

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);

  const [formData, setFormData] = useState({
    vendor_name: "",
    display_name: "",
    email: "",
    phone: "",
    gstin: "",
    pan: "",
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    account_type: "current",
    upi_id: "",
    address_line1: "",
    city: "",
    state: "",
    pincode: "",
  });

  /*
    🔴 REPLACE THIS ENTIRE FUNCTION WITH REDUX THUNK

    dispatch(fetchVendors())

    thunk will:
      call backend
      store in redux
      selector will populate vendors
  */
  const fetchVendors = async () => {
    setLoading(true);

    try {
      // TEMP MOCK (remove after backend ready)
      setTimeout(() => {
        setVendors([]);
        setLoading(false);
      }, 300);
    } catch (err) {
      toast.error("Failed to fetch vendors");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  /*
    🔴 WILL BECOME:
    dispatch(createVendor(formData))
    dispatch(updateVendor(id, formData))
  */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.vendor_name.trim()) {
      toast.error("Vendor name is required");
      return;
    }

    try {
      if (editingVendor) {
        toast.success("Vendor updated (mock)");
      } else {
        toast.success("Vendor added (mock)");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchVendors();

    } catch {
      toast.error("Save failed");
    }
  };

  /*
    🔴 WILL BECOME:
    dispatch(deleteVendor(id))
  */
  const handleDelete = async (vendorId) => {
    if (!confirm("Are you sure?")) return;

    toast.success("Vendor deleted (mock)");
    fetchVendors();
  };

  const handleEdit = (vendor) => {
    setEditingVendor(vendor);
    setFormData({
      vendor_name: vendor.vendor_name || "",
      display_name: vendor.display_name || "",
      email: vendor.email || "",
      phone: vendor.phone || "",
      gstin: vendor.gstin || "",
      pan: vendor.pan || "",
      bank_name: vendor.bank_name || "",
      account_number: vendor.account_number || "",
      ifsc_code: vendor.ifsc_code || "",
      account_type: vendor.account_type || "current",
      upi_id: vendor.upi_id || "",
      address_line1: "",
      city: vendor.city || "",
      state: vendor.state || "",
      pincode: "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingVendor(null);
    setFormData({
      vendor_name: "",
      display_name: "",
      email: "",
      phone: "",
      gstin: "",
      pan: "",
      bank_name: "",
      account_number: "",
      ifsc_code: "",
      account_type: "current",
      upi_id: "",
      address_line1: "",
      city: "",
      state: "",
      pincode: "",
    });
  };

  const filteredVendors = vendors.filter((v) =>
    (v.vendor_name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const maskAccountNumber = (acc) => {
    if (!acc || acc.length < 4) return acc;
    return "XXXX" + acc.slice(-4);
  };

  return (
    <div className="space-y-6">

      {/* SEARCH + ADD */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open)=>{setIsDialogOpen(open); if(!open) resetForm();}}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2"/>Add Vendor</Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingVendor ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Vendor Name *</Label>
                <Input
                  value={formData.vendor_name}
                  onChange={(e)=>setFormData({...formData, vendor_name:e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>State</Label>
                <Select value={formData.state} onValueChange={(v)=>setFormData({...formData,state:v})}>
                  <SelectTrigger><SelectValue placeholder="Select state"/></SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={()=>setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit">{editingVendor ? "Update" : "Add"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* TABLE */}
      <Card>
        <CardHeader><CardTitle>Vendor Directory</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center">Loading...</div>
          ) : filteredVendors.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No vendors</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredVendors.map((vendor)=>(
                  <TableRow key={vendor.id}>
                    <TableCell>{vendor.vendor_name}</TableCell>
                    <TableCell className="text-xs">
                      {vendor.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3"/>{vendor.email}</div>}
                      {vendor.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3"/>{vendor.phone}</div>}
                    </TableCell>
                    <TableCell>{maskAccountNumber(vendor.account_number)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={()=>handleEdit(vendor)}><Edit className="h-4 w-4"/></Button>
                      <Button variant="ghost" size="icon" onClick={()=>handleDelete(vendor.id)}><Trash2 className="h-4 w-4"/></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>

            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
