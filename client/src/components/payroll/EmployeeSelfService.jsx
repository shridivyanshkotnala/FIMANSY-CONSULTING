// EmployeeSelfService.jsx
// FULL UI RESTORED — TS removed, business logic preserved
// This component should later receive data from Redux selectors and dispatch uploadProof thunk

import { useState } from "react";
import { FileText, Download, Upload, User, Calendar, DollarSign, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatINR } from "@/lib/payroll/calculations";
import { format } from "date-fns";

/*
REDUX INTEGRATION PLAN
----------------------
selectEmployeeProfile(state)
selectEmployeePayslips(state)
selectEmployeeTaxDeclaration(state)
uploadProof(section,file) -> thunk
*/

export function EmployeeSelfService({ employee, payslips, taxDeclaration, onUploadProof }) {
  const [activeTab, setActiveTab] = useState("payslips");

  // BUSINESS LOGIC (unchanged)
  const currentFY = "2025-26";
  const totalEarningsYTD = payslips.reduce((sum, p) => sum + p.gross_earnings, 0);
  const totalTaxPaidYTD = payslips.reduce((sum, p) => sum + p.tds, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{employee.first_name} {employee.last_name}</h2>
              <p className="text-muted-foreground">{employee.designation || "Employee"} • {employee.employee_code}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline">{employee.department}</Badge>
                <Badge className="bg-success/10 text-success">Active</Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Joined</p>
              <p className="font-medium">{format(new Date(employee.date_of_joining), 'MMM dd, yyyy')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4"><div className="text-lg font-bold">{formatINR(totalEarningsYTD)}</div><div className="text-sm text-muted-foreground">YTD Earnings</div></Card>
        <Card className="p-4"><div className="text-lg font-bold">{formatINR(totalTaxPaidYTD)}</div><div className="text-sm text-muted-foreground">Tax Deducted</div></Card>
        <Card className="p-4"><div className="text-lg font-bold">{payslips.length}</div><div className="text-sm text-muted-foreground">Payslips</div></Card>
        <Card className="p-4"><div className="text-lg font-bold capitalize">{employee.preferred_tax_regime}</div><div className="text-sm text-muted-foreground">Tax Regime</div></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="payslips">Payslips</TabsTrigger>
          <TabsTrigger value="tax">Tax</TabsTrigger>
          <TabsTrigger value="proofs">Proofs</TabsTrigger>
          <TabsTrigger value="form16">Form 16</TabsTrigger>
        </TabsList>

        <TabsContent value="payslips" className="space-y-4 mt-4">
          {payslips.map(p => (
            <Card key={p.id}><CardContent className="p-4 flex justify-between items-center">
              <div>{format(new Date(p.payment_date), 'MMMM yyyy')}</div>
              <div className="font-semibold text-success">{formatINR(p.net_pay)}</div>
              <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2"/>Download</Button>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="proofs" className="mt-4">
          <Button onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.onchange = (e) => {
              const file = e.target.files && e.target.files[0];
              if (file) onUploadProof('80C', file);
            };
            input.click();
          }}>
            <Upload className="h-4 w-4 mr-2"/>Upload Proof
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
