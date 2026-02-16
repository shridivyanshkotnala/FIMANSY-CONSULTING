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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Loader2 } from "lucide-react";

/*
  PURE FORM COMPONENT

  Responsibilities:
  ✔ Collect company compliance data
  ✔ Apply UI rules (conditional fields)
  ✔ Emit validated payload

  Does NOT:
  ✖ Save to DB
  ✖ Call APIs
  ✖ Depend on Supabase
*/

export function ComplianceSetupForm({
  initialData = {},
  submitting = false,
  onSubmit
}) {

  const [formData, setFormData] = useState({
    company_type: initialData.company_type || "private_limited",
    cin: initialData.cin || "",
    llpin: initialData.llpin || "",
    date_of_incorporation: initialData.date_of_incorporation || "",
    financial_year_end: initialData.financial_year_end || 3,
    registered_office_address: initialData.registered_office_address || "",
    authorized_capital: initialData.authorized_capital || 0,
    paid_up_capital: initialData.paid_up_capital || 0,
  });

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

  const showCIN = ["private_limited", "opc", "public_limited"].includes(formData.company_type);
  const showLLPIN = formData.company_type === "llp";
  const showCapital = ["private_limited", "opc", "public_limited", "llp"].includes(formData.company_type);

  const handleSubmit = e => {
    e.preventDefault();

    if (!onSubmit) return;

    onSubmit({
      ...formData,
      cin: formData.cin.toUpperCase(),
      llpin: formData.llpin.toUpperCase(),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Company Compliance Profile
        </CardTitle>
        <CardDescription>
          Enter company details to enable compliance tracking
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">

          <div className="grid gap-4 md:grid-cols-2">

            <div className="space-y-2">
              <Label>Company Type</Label>
              <Select
                value={formData.company_type}
                onValueChange={(v)=>setFormData({...formData, company_type:v})}
              >
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {companyTypes.map(t=>(
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Financial Year End</Label>
              <Select
                value={String(formData.financial_year_end)}
                onValueChange={(v)=>setFormData({...formData, financial_year_end:Number(v)})}
              >
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {months.map(m=>(
                    <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showCIN && (
              <div className="space-y-2">
                <Label>CIN</Label>
                <Input
                  value={formData.cin}
                  onChange={e=>setFormData({...formData, cin:e.target.value})}
                />
              </div>
            )}

            {showLLPIN && (
              <div className="space-y-2">
                <Label>LLPIN</Label>
                <Input
                  value={formData.llpin}
                  onChange={e=>setFormData({...formData, llpin:e.target.value})}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Date of Incorporation</Label>
              <Input
                type="date"
                value={formData.date_of_incorporation}
                onChange={e=>setFormData({...formData, date_of_incorporation:e.target.value})}
              />
            </div>

            {showCapital && (
              <>
                <div className="space-y-2">
                  <Label>Authorized Capital</Label>
                  <Input
                    type="number"
                    value={formData.authorized_capital}
                    onChange={e=>setFormData({...formData, authorized_capital:Number(e.target.value)||0})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Paid-up Capital</Label>
                  <Input
                    type="number"
                    value={formData.paid_up_capital}
                    onChange={e=>setFormData({...formData, paid_up_capital:Number(e.target.value)||0})}
                  />
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label>Registered Office Address</Label>
            <Input
              value={formData.registered_office_address}
              onChange={e=>setFormData({...formData, registered_office_address:e.target.value})}
            />
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
            Save Compliance Profile
          </Button>

        </form>
      </CardContent>
    </Card>
  );
}
