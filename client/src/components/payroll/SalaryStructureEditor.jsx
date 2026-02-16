// SalaryStructureEditor.jsx
// Converted TSX → JSX
// Salary structure management — define CTC breakdowns per employee

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatINR } from "@/lib/payroll/calculations";
import { Edit, Plus, CheckCircle2, AlertTriangle } from "lucide-react";

/*
REDUX NOTE
----------
Container should provide:
selectEmployees(state)
selectSalaryStructures(state)
saveSalaryStructure(employeeId, data) -> thunk
*/

export function SalaryStructureEditor({ employees, salaryStructures, onRefresh }) {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formData, setFormData] = useState({
    ctc_annual: 0,
    basic_annual: 0,
    hra_annual: 0,
    special_allowance_annual: 0,
    conveyance_annual: 0,
    medical_allowance_annual: 0,
    other_allowances_annual: 0,
    bonus_annual: 0,
    lta_annual: 0,
    employer_epf_annual: 0,
    employer_esi_annual: 0,
    employer_gratuity_annual: 0,
    effective_from: new Date().toISOString().split("T")[0],
  });

  // BUSINESS LOGIC — match structure to employee
  const getStructureForEmployee = (empId) => {
    return salaryStructures.find((s) => s.employee_id === empId);
  };

  const handleEdit = (emp) => {
    setSelectedEmployee(emp);
    const existing = getStructureForEmployee(emp.id);
    if (existing) {
      setFormData({
        ctc_annual: existing.ctc_annual || 0,
        basic_annual: existing.basic_annual || 0,
        hra_annual: existing.hra_annual || 0,
        special_allowance_annual: existing.special_allowance_annual || 0,
        conveyance_annual: existing.conveyance_annual || 0,
        medical_allowance_annual: existing.medical_allowance_annual || 0,
        other_allowances_annual: existing.other_allowances_annual || 0,
        bonus_annual: existing.bonus_annual || 0,
        lta_annual: existing.lta_annual || 0,
        employer_epf_annual: existing.employer_epf_annual || 0,
        employer_esi_annual: existing.employer_esi_annual || 0,
        employer_gratuity_annual: existing.employer_gratuity_annual || 0,
        effective_from: existing.effective_from || new Date().toISOString().split("T")[0],
      });
    }
    setIsEditOpen(true);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: Number(value) || 0 }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Salary Structures</h2>
        <Badge variant="outline">{salaryStructures.length} Active Structures</Badge>
      </div>

      <div className="grid gap-4">
        {employees.map((emp) => {
          const structure = getStructureForEmployee(emp.id);
          return (
            <Card key={emp.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {emp.first_name} {emp.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {emp.designation || "Employee"} • {emp.employee_code}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {structure ? (
                      <>
                        <div className="text-right">
                          <p className="font-semibold">{formatINR(structure.ctc_annual)}</p>
                          <p className="text-xs text-muted-foreground">Annual CTC</p>
                        </div>
                        {structure.is_wage_code_compliant ? (
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-warning" />
                        )}
                      </>
                    ) : (
                      <Badge variant="destructive">No Structure</Badge>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleEdit(emp)}>
                      <Edit className="h-4 w-4 mr-1" />
                      {structure ? "Edit" : "Create"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {employees.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            No employees found. Add employees first.
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Salary Structure — {selectedEmployee?.first_name} {selectedEmployee?.last_name}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <Label>Annual CTC (₹)</Label>
              <Input type="number" value={formData.ctc_annual} onChange={(e) => handleChange("ctc_annual", e.target.value)} />
            </div>
            <div>
              <Label>Basic Annual (₹)</Label>
              <Input type="number" value={formData.basic_annual} onChange={(e) => handleChange("basic_annual", e.target.value)} />
            </div>
            <div>
              <Label>HRA Annual (₹)</Label>
              <Input type="number" value={formData.hra_annual} onChange={(e) => handleChange("hra_annual", e.target.value)} />
            </div>
            <div>
              <Label>Special Allowance (₹)</Label>
              <Input type="number" value={formData.special_allowance_annual} onChange={(e) => handleChange("special_allowance_annual", e.target.value)} />
            </div>
            <div>
              <Label>Conveyance (₹)</Label>
              <Input type="number" value={formData.conveyance_annual} onChange={(e) => handleChange("conveyance_annual", e.target.value)} />
            </div>
            <div>
              <Label>Medical Allowance (₹)</Label>
              <Input type="number" value={formData.medical_allowance_annual} onChange={(e) => handleChange("medical_allowance_annual", e.target.value)} />
            </div>
            <div>
              <Label>Effective From</Label>
              <Input type="date" value={formData.effective_from} onChange={(e) => setFormData((prev) => ({ ...prev, effective_from: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={() => { setIsEditOpen(false); onRefresh?.(); }}>Save Structure</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
