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

// Helper function to format date to YYYY-MM-DD for input[type="date"]
function formatDateForInput(dateValue) {
  if (!dateValue) return "";
  
  // If it's already a string in YYYY-MM-DD format, return it
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }
  
  // Try to parse the date
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return "";
  
  // Format to YYYY-MM-DD
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper function to parse registered_office_address back into components
function parseAddress(fullAddress) {
  if (!fullAddress) return { line1: "", city: "", state: "", pincode: "" };
  
  // Try to parse the address format: "line1, city, state - pincode"
  const lastDashIndex = fullAddress.lastIndexOf(' - ');
  
  if (lastDashIndex === -1) {
    // If not in expected format, just return the whole thing as line1
    return { line1: fullAddress, city: "", state: "", pincode: "" };
  }
  
  const addressBeforePincode = fullAddress.substring(0, lastDashIndex);
  const pincode = fullAddress.substring(lastDashIndex + 3);
  
  // Split the remaining address by comma
  const parts = addressBeforePincode.split(',').map(part => part.trim());
  
  if (parts.length >= 3) {
    return {
      line1: parts[0],
      city: parts[1],
      state: parts[2],
      pincode: pincode
    };
  } else if (parts.length === 2) {
    return {
      line1: parts[0],
      city: parts[1],
      state: "",
      pincode: pincode
    };
  } else {
    return {
      line1: addressBeforePincode,
      city: "",
      state: "",
      pincode: pincode
    };
  }
}

export function ComplianceSetupForm({ onComplete }) {
  const { complianceProfile, saveComplianceProfile } = useCompliance();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Parse the address when complianceProfile loads
  const parsedAddress = parseAddress(complianceProfile?.registered_office_address);

  const [formData, setFormData] = useState({
    company_type: complianceProfile?.company_type || "private_limited",
    cin: complianceProfile?.cin || "",
    llpin: complianceProfile?.llpin || "",
    date_of_incorporation: formatDateForInput(complianceProfile?.date_of_incorporation) || "",
    financial_year_end: complianceProfile?.financial_year_end || 3,
    address_line_1: parsedAddress.line1 || "",
    city: parsedAddress.city || "",
    state: parsedAddress.state || "",
    pincode: parsedAddress.pincode || "",
    authorized_capital: complianceProfile?.authorized_capital || 0,
    paid_up_capital: complianceProfile?.paid_up_capital || 0,
  });

  // Update form when complianceProfile changes (e.g., after save)
  useEffect(() => {
    if (complianceProfile) {
      const parsed = parseAddress(complianceProfile.registered_office_address);
      setFormData({
        company_type: complianceProfile.company_type || "private_limited",
        cin: complianceProfile.cin || "",
        llpin: complianceProfile.llpin || "",
        date_of_incorporation: formatDateForInput(complianceProfile.date_of_incorporation) || "",
        financial_year_end: complianceProfile.financial_year_end || 3,
        address_line_1: parsed.line1 || "",
        city: parsed.city || "",
        state: parsed.state || "",
        pincode: parsed.pincode || "",
        authorized_capital: complianceProfile.authorized_capital || 0,
        paid_up_capital: complianceProfile.paid_up_capital || 0,
      });
      
      console.log("📅 Formatted date:", formatDateForInput(complianceProfile.date_of_incorporation));
    }
  }, [complianceProfile]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ Validate Date of Incorporation
    if (!formData.date_of_incorporation) {
      toast({
        title: "Missing Date",
        description: "Date of Incorporation is required.",
        variant: "destructive",
      });
      return;
    }

    // ✅ Validate Address Fields
    if (
      !formData.address_line_1.trim() ||
      !formData.city.trim() ||
      !formData.state.trim() ||
      !formData.pincode.trim()
    ) {
      toast({
        title: "Missing address",
        description: "Address Line 1, City, State, and Pincode are required.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // COMBINE ADDRESS FIELDS INTO registered_office_address
      const combinedAddress = `${formData.address_line_1}, ${formData.city}, ${formData.state} - ${formData.pincode}`;
      
      // Prepare data for backend
      const submitData = {
        company_type: formData.company_type,
        cin: formData.cin || null,
        llpin: formData.llpin || null,
        date_of_incorporation: formData.date_of_incorporation, // This is already YYYY-MM-DD
        financial_year_end: formData.financial_year_end,
        registered_office_address: combinedAddress,
        authorized_capital: formData.authorized_capital || 0,
        paid_up_capital: formData.paid_up_capital || 0,
      };

      console.log("📤 Submitting data:", submitData);
      console.log("📋 Current profile ID:", complianceProfile?._id);

      const { error } = await saveComplianceProfile(submitData);

      if (error) {
        console.error('❌ Save error:', error);
        toast({
          title: "Error",
          description: "Failed to save compliance profile",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success! 🎉",
          description: "Compliance profile saved. Generating obligations...",
        });
        
        // The useCompliance hook will automatically refetch the data
        // Wait a moment for obligations to generate, then close form
        setTimeout(() => {
          if (onComplete) onComplete();
        }, 2000);
      }
    } catch (err) {
      console.error("❌ Error saving profile:", err);
      toast({
        title: "Error",
        description: "Unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const showCIN = ["private_limited", "opc", "public_limited"].includes(formData.company_type);
  const showLLPIN = formData.company_type === "llp";
  const showCapital = ["private_limited", "opc", "public_limited", "llp"].includes(formData.company_type);

  // Preview combined address
  const addressPreview = formData.address_line_1 && formData.city && formData.state && formData.pincode 
    ? `${formData.address_line_1}, ${formData.city}, ${formData.state} - ${formData.pincode}`
    : "";

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
              <Select
                value={formData.company_type}
                onValueChange={(value) => setFormData({ ...formData, company_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company type" />
                </SelectTrigger>
                <SelectContent>
                  {companyTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Financial Year End */}
            <div className="space-y-2">
              <Label htmlFor="financial_year_end">Financial Year End</Label>
              <Select
                value={formData.financial_year_end.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, financial_year_end: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* CIN / LLPIN */}
            {showCIN && (
              <div className="space-y-2">
                <Label htmlFor="cin">CIN (Corporate Identification Number)</Label>
                <Input
                  id="cin"
                  placeholder="e.g., U12345MH2020PTC123456"
                  value={formData.cin}
                  onChange={(e) => setFormData({ ...formData, cin: e.target.value.toUpperCase() })}
                />
              </div>
            )}
            {showLLPIN && (
              <div className="space-y-2">
                <Label htmlFor="llpin">LLPIN</Label>
                <Input
                  id="llpin"
                  placeholder="e.g., AAA-1234"
                  value={formData.llpin}
                  onChange={(e) => setFormData({ ...formData, llpin: e.target.value.toUpperCase() })}
                />
              </div>
            )}

            {/* Date of Incorporation - REQUIRED */}
            <div className="space-y-2">
              <Label htmlFor="date_of_incorporation">
                Date of Incorporation <span className="text-destructive">*</span>
              </Label>
              <Input
                id="date_of_incorporation"
                type="date"
                required
                value={formData.date_of_incorporation}
                onChange={(e) => setFormData({ ...formData, date_of_incorporation: e.target.value })}
              />
            </div>

            {/* Capital Fields */}
            {showCapital && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="authorized_capital">Authorized Capital (₹)</Label>
                  <Input
                    id="authorized_capital"
                    type="number"
                    min="0"
                    value={formData.authorized_capital || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, authorized_capital: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paid_up_capital">Paid-up Capital (₹)</Label>
                  <Input
                    id="paid_up_capital"
                    type="number"
                    min="0"
                    value={formData.paid_up_capital || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, paid_up_capital: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </>
            )}
          </div>

          {/* Address Line 1 - REQUIRED */}
          <div className="space-y-2">
            <Label htmlFor="address_line_1">
              Address Line 1 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="address_line_1"
              required
              placeholder="e.g., 123, ABC Tower, MG Road"
              value={formData.address_line_1}
              onChange={(e) => setFormData({ ...formData, address_line_1: e.target.value })}
            />
          </div>

          {/* City / State / Pincode - ALL REQUIRED */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">
                City <span className="text-destructive">*</span>
              </Label>
              <Input
                id="city"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">
                State <span className="text-destructive">*</span>
              </Label>
              <Input
                id="state"
                required
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pincode">
                Pincode <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pincode"
                required
                maxLength={6}
                value={formData.pincode}
                onChange={(e) =>
                  setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })
                }
              />
            </div>
          </div>

          {/* Address Preview */}
          {addressPreview && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-xs font-medium text-green-700">Address preview:</p>
              <p className="text-sm text-green-600">{addressPreview}</p>
            </div>
          )}

          {/* Debug Info - Remove in production */}
          {complianceProfile && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-xs">
              <p className="font-medium text-blue-700">Debug:</p>
              <p>Raw date from backend: {complianceProfile.date_of_incorporation}</p>
              <p>Formatted for input: {formatDateForInput(complianceProfile.date_of_incorporation)}</p>
            </div>
          )}

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