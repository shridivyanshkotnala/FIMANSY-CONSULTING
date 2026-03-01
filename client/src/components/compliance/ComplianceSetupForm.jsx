import { useState } from "react";

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

// ⚠️ CONTEXT API — MARKED FOR REMOVAL
// 🔄 FUTURE: Replace with Redux RTK Query selectors
// const complianceProfile = useSelector(state => state.compliance.profile)
// const saveComplianceProfile = useDispatch(...)
import { useCompliance } from "@/hooks/useCompliance";

import { useToast } from "@/hooks/use-toast";

import { Building2, Loader2 } from "lucide-react";

/*
  ==========================================================
  Compliance Setup Form
  ----------------------------------------------------------
  Props:
  - onComplete (optional)
  ==========================================================
*/

export function ComplianceSetupForm({ onComplete }) {

  const { complianceProfile, saveComplianceProfile } = useCompliance();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);

  /*
    ==========================================================
    Initial Form State
    TS removed:
    - CompanyType casting
    - as any
    ==========================================================
  */
  const [formData, setFormData] = useState({
    company_type: complianceProfile?.company_type || "private_limited",
    cin: complianceProfile?.cin || "",
    llpin: complianceProfile?.llpin || "",
    date_of_incorporation: complianceProfile?.date_of_incorporation || "",
    financial_year_end: complianceProfile?.financial_year_end || 3,
    registered_office_address:
      complianceProfile?.registered_office_address || "",
    address_line_1: complianceProfile?.address_line_1 || "",
    city: complianceProfile?.city || "",
    state: complianceProfile?.state || "",
    pincode: complianceProfile?.pincode || "",
    authorized_capital: complianceProfile?.authorized_capital || 0,
    paid_up_capital: complianceProfile?.paid_up_capital || 0,
  });

  /*
    ==========================================================
    Handle Submit
    TS removed: (e: React.FormEvent)
    ==========================================================
  */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.address_line_1.trim() ||
      !formData.city.trim() ||
      !formData.state.trim() ||
      !formData.pincode.trim()
    ) {
      toast({
        title: "Missing address",
        description:
          "Address Line 1, City, State, and Pincode are all required.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const { error } = await saveComplianceProfile(formData);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save compliance profile",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Compliance profile saved successfully",
      });

      if (onComplete) onComplete();
    }

    setIsLoading(false);
  };

  /*
    ==========================================================
    Static Options (TS typing removed)
    ==========================================================
  */
  const companyTypes = [
    { value: "private_limited", label: "Private Limited Company" },
    { value: "opc", label: "One Person Company (OPC)" },
    { value: "llp", label: "Limited Liability Partnership (LLP)" },
    { value: "public_limited", label: "Public Limited Company" },
    { value: "partnership", label: "Partnership Firm" },
    { value: "proprietorship", label: "Sole Proprietorship" },
  ];

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

  /*
    ==========================================================
    Conditional UI Flags
    ==========================================================
  */
  const showCIN = [
    "private_limited",
    "opc",
    "public_limited",
  ].includes(formData.company_type);

  const showLLPIN = formData.company_type === "llp";

  const showCapital = [
    "private_limited",
    "opc",
    "public_limited",
    "llp",
  ].includes(formData.company_type);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Company Compliance Profile
        </CardTitle>
        <CardDescription>
          Set up your company details to enable automated compliance tracking
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">

          <div className="grid gap-4 md:grid-cols-2">

            {/* Company Type */}
            <div className="space-y-2">
              <Label htmlFor="company_type">Company Type</Label>
              <Select
                value={formData.company_type}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    company_type: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company type" />
                </SelectTrigger>
                <SelectContent>
                  {companyTypes.map((type) => (
                    <SelectItem
                      key={type.value}
                      value={type.value}
                    >
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Financial Year End */}
            <div className="space-y-2">
              <Label htmlFor="financial_year_end">
                Financial Year End
              </Label>

              <Select
                value={formData.financial_year_end.toString()}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    financial_year_end: parseInt(value),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>

                <SelectContent>
                  {months.map((month) => (
                    <SelectItem
                      key={month.value}
                      value={month.value.toString()}
                    >
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* CIN */}
            {showCIN && (
              <div className="space-y-2">
                <Label htmlFor="cin">
                  CIN (Corporate Identification Number)
                </Label>
                <Input
                  id="cin"
                  placeholder="e.g., U12345MH2020PTC123456"
                  value={formData.cin}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cin: e.target.value.toUpperCase(),
                    })
                  }
                />
              </div>
            )}

            {/* LLPIN */}
            {showLLPIN && (
              <div className="space-y-2">
                <Label htmlFor="llpin">LLPIN</Label>
                <Input
                  id="llpin"
                  placeholder="e.g., AAA-1234"
                  value={formData.llpin}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      llpin: e.target.value.toUpperCase(),
                    })
                  }
                />
              </div>
            )}

            {/* Incorporation Date */}
            <div className="space-y-2">
              <Label htmlFor="date_of_incorporation">
                Date of Incorporation
              </Label>
              <Input
                id="date_of_incorporation"
                type="date"
                value={formData.date_of_incorporation}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    date_of_incorporation: e.target.value,
                  })
                }
              />
            </div>

            {/* Capital Fields */}
            {showCapital && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="authorized_capital">
                    Authorized Capital (₹)
                  </Label>
                  <Input
                    id="authorized_capital"
                    type="number"
                    min="0"
                    value={formData.authorized_capital || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        authorized_capital:
                          parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paid_up_capital">
                    Paid-up Capital (₹)
                  </Label>
                  <Input
                    id="paid_up_capital"
                    type="number"
                    min="0"
                    value={formData.paid_up_capital || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paid_up_capital:
                          parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </>
            )}
          </div>

          {/* Address Line 1 */}
          <div className="space-y-2">
            <Label htmlFor="address_line_1">
              Address Line 1
              <span className="text-destructive">*</span>
            </Label>

            <Input
              id="address_line_1"
              required
              placeholder="e.g., 123, ABC Tower, MG Road"
              value={formData.address_line_1}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  address_line_1: e.target.value,
                })
              }
            />
          </div>

          {/* City / State / Pincode */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">
                City <span className="text-destructive">*</span>
              </Label>
              <Input
                id="city"
                required
                value={formData.city}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    city: e.target.value,
                  })
                }
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
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    state: e.target.value,
                  })
                }
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
                  setFormData({
                    ...formData,
                    pincode: e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 6),
                  })
                }
              />
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Compliance Profile
          </Button>

        </form>
      </CardContent>
    </Card>
  );
}