import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCompliance } from "@/hooks/useCompliance";
import { useToast } from "@/hooks/use-toast";
import { Building2, Loader2 } from "lucide-react";

// Helper: format date to YYYY-MM-DD
function formatDateForInput(dateValue) {
  if (!dateValue) return "";
  if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;

  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper: parse registered_office_address
function parseAddress(fullAddress) {
  if (!fullAddress) return { line1: "", city: "", state: "", pincode: "" };
  const lastDashIndex = fullAddress.lastIndexOf(" - ");
  if (lastDashIndex === -1) return { line1: fullAddress, city: "", state: "", pincode: "" };

  const addressBeforePincode = fullAddress.substring(0, lastDashIndex);
  const pincode = fullAddress.substring(lastDashIndex + 3);
  const parts = addressBeforePincode.split(",").map((p) => p.trim());

  if (parts.length >= 3) return { line1: parts[0], city: parts[1], state: parts[2], pincode };
  if (parts.length === 2) return { line1: parts[0], city: parts[1], state: "", pincode };
  return { line1: addressBeforePincode, city: "", state: "", pincode };
}

function normalizeOptionalIdentifier(value, regex) {
  const normalized = String(value || "").trim().toUpperCase();
  if (!normalized) return "";
  return regex.test(normalized) ? normalized : "";
}

export function ComplianceSetupForm({ onComplete }) {
  const { complianceProfile, saveComplianceProfile } = useCompliance();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Parse initial address
  const parsedAddress = parseAddress(complianceProfile?.registered_office_address);

  const [formData, setFormData] = useState({
    company_type: complianceProfile?.company_type || "private_limited",
    cin: complianceProfile?.cin || "",
    llpin: complianceProfile?.llpin || "",
    gstin: complianceProfile?.gstin || "",
    pan: complianceProfile?.pan || "",
    tan: complianceProfile?.tan || "",
    date_of_incorporation: formatDateForInput(complianceProfile?.date_of_incorporation) || "",
    financial_year_end: complianceProfile?.financial_year_end || 3,
    address_line_1: parsedAddress.line1 || "",
    city: parsedAddress.city || "",
    state: parsedAddress.state || "",
    pincode: parsedAddress.pincode || "",
    authorized_capital: complianceProfile?.authorized_capital || 0,
    paid_up_capital: complianceProfile?.paid_up_capital || 0,
  });

  // Sync form when profile changes
  useEffect(() => {
    if (complianceProfile) {
      const parsed = parseAddress(complianceProfile.registered_office_address);
      setFormData({
        company_type: complianceProfile.company_type || "private_limited",
        cin: complianceProfile.cin || "",
        llpin: complianceProfile.llpin || "",
        gstin: complianceProfile.gstin || "",
        pan: complianceProfile.pan || "",
        tan: complianceProfile.tan || "",
        date_of_incorporation: formatDateForInput(complianceProfile.date_of_incorporation) || "",
        financial_year_end: complianceProfile.financial_year_end || 3,
        address_line_1: parsed.line1 || "",
        city: parsed.city || "",
        state: parsed.state || "",
        pincode: parsed.pincode || "",
        authorized_capital: complianceProfile.authorized_capital || 0,
        paid_up_capital: complianceProfile.paid_up_capital || 0,
      });
    }
  }, [complianceProfile]);

  // Company & month options
  const companyTypes = [
    { value: "private_limited", label: "Private Limited Company" },
    { value: "opc", label: "One Person Company (OPC)" },
    { value: "llp", label: "Limited Liability Partnership (LLP)" },
    { value: "public_limited", label: "Public Limited Company" },
    { value: "partnership", label: "Partnership Firm" },
    { value: "proprietorship", label: "Sole Proprietorship" },
  ];
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(0, i).toLocaleString("default", { month: "long" }),
  }));

  const showCIN = ["private_limited", "opc", "public_limited"].includes(formData.company_type);
  const showLLPIN = formData.company_type === "llp";
  const showCapital = ["private_limited", "opc", "public_limited", "llp"].includes(formData.company_type);

  const addressPreview = formData.address_line_1 && formData.city && formData.state && formData.pincode
    ? `${formData.address_line_1}, ${formData.city}, ${formData.state} - ${formData.pincode}`
    : "";

  // =========================
  // Form submission
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.date_of_incorporation) {
      toast({ title: "Missing Date", description: "Date of Incorporation is required.", variant: "destructive" });
      return;
    }
    if (!formData.address_line_1 || !formData.city || !formData.state || !formData.pincode) {
      toast({ title: "Missing Address", description: "All address fields are required.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      const tanRegex = /^[A-Z]{4}[0-9]{5}[A-Z]{1}$/;
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/;

      const normalizedPAN = normalizeOptionalIdentifier(formData.pan, panRegex);
      const normalizedTAN = normalizeOptionalIdentifier(formData.tan, tanRegex);
      const normalizedGSTIN = normalizeOptionalIdentifier(formData.gstin, gstinRegex);

      const combinedAddress = `${formData.address_line_1}, ${formData.city}, ${formData.state} - ${formData.pincode}`;
      const submitData = {
        ...formData,
        llpin: String(formData.llpin || "").trim().toUpperCase(),
        pan: normalizedPAN || null,
        tan: normalizedTAN || null,
        gstin: normalizedGSTIN || null,
        date_of_incorporation: formatDateForInput(formData.date_of_incorporation),
        // For LLP, use LLPIN as CIN for all downstream flows that consume CIN.
        cin: formData.company_type === "llp"
          ? (String(formData.llpin || formData.cin || "").trim().toUpperCase())
          : String(formData.cin || "").trim().toUpperCase(),
        registered_office_address: combinedAddress,
      };

      console.log("📤 Submitting:", submitData);

      // Save profile and poll until obligations_generated = true
      const { error, profile: updatedProfile } = await saveComplianceProfile(submitData);
      if (error) throw error;

      toast({ title: "Success! 🎉", description: "Compliance profile saved and obligations generated." });

      // ✅ Redirect after obligations are confirmed
      if (onComplete) onComplete();
    } catch (err) {
      console.error("❌ Save error:", err);
      toast({
        title: "Error",
        description: err?.message || "Failed to save profile or generate obligations.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" /> Company Compliance Profile
        </CardTitle>
        <CardDescription>Set up your company details to enable automated compliance tracking</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Company Type */}
            <div className="space-y-2">
              <Label htmlFor="company_type">Company Type</Label>
              <Select value={formData.company_type} onValueChange={(v) => setFormData({ ...formData, company_type: v })}>
                <SelectTrigger><SelectValue placeholder="Select company type" /></SelectTrigger>
                <SelectContent>{companyTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Financial Year End */}
            <div className="space-y-2">
              <Label htmlFor="financial_year_end">Financial Year End</Label>
              <Select value={formData.financial_year_end.toString()} onValueChange={(v) => setFormData({ ...formData, financial_year_end: parseInt(v) })}>
                <SelectTrigger><SelectValue placeholder="Select month" /></SelectTrigger>
                <SelectContent>{months.map((m) => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* CIN / LLPIN */}
            {showCIN && (
              <div className="space-y-2">
                <Label htmlFor="cin">CIN</Label>
                <Input id="cin" value={formData.cin} onChange={(e) => setFormData({ ...formData, cin: e.target.value.toUpperCase() })} placeholder="U12345MH2020PTC123456" />
              </div>
            )}
            {showLLPIN && (
              <div className="space-y-2">
                <Label htmlFor="llpin">LLPIN</Label>
                <Input
                  id="llpin"
                  value={formData.llpin}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setFormData({ ...formData, llpin: value, cin: value });
                  }}
                  placeholder="AAA-1234"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="pan">PAN</Label>
              <Input
                id="pan"
                value={formData.pan}
                onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                placeholder="ABCDE1234F"
                maxLength={10}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tan">TAN</Label>
              <Input
                id="tan"
                value={formData.tan}
                onChange={(e) => setFormData({ ...formData, tan: e.target.value.toUpperCase() })}
                placeholder="ABCD12345E"
                maxLength={10}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="gstin">GSTIN</Label>
              <Input
                id="gstin"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                placeholder="27ABCDE1234F1Z5"
                maxLength={15}
              />
            </div>

            {/* Date of Incorporation */}
            <div className="space-y-2">
              <Label htmlFor="date_of_incorporation">Date of Incorporation *</Label>
              <Input id="date_of_incorporation" type="date" required value={formData.date_of_incorporation} onChange={(e) => setFormData({ ...formData, date_of_incorporation: e.target.value })} />
            </div>

            {/* Capital Fields */}
            {showCapital && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="authorized_capital">Authorized Capital (₹)</Label>
                  <Input id="authorized_capital" type="number" min="0" value={formData.authorized_capital || ""} onChange={(e) => setFormData({ ...formData, authorized_capital: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paid_up_capital">Paid-up Capital (₹)</Label>
                  <Input id="paid_up_capital" type="number" min="0" value={formData.paid_up_capital || ""} onChange={(e) => setFormData({ ...formData, paid_up_capital: parseFloat(e.target.value) || 0 })} />
                </div>
              </>
            )}
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address_line_1">Address Line 1 *</Label>
            <Input id="address_line_1" required value={formData.address_line_1} onChange={(e) => setFormData({ ...formData, address_line_1: e.target.value })} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input id="city" required value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Input id="state" required value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode *</Label>
              <Input id="pincode" required maxLength={6} value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} />
            </div>
          </div>

          {/* Submit Button */}
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Saving & Generating..." : "Save & Generate Obligations"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}