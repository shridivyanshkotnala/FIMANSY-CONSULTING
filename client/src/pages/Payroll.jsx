// Payroll.jsx
// Converted TSX → JSX
// Payroll management dashboard

import { useState } from "react";
import { PillarLayout } from "@/components/layout/PillarLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePayroll } from "@/hooks/usePayroll"; // CONTEXT → replace with Redux payrollSlice
import { EmployeeList } from "@/components/payroll/EmployeeList";
import { SalaryStructureEditor } from "@/components/payroll/SalaryStructureEditor";
import { PayrollRunDashboard } from "@/components/payroll/PayrollRunDashboard";
import { DisbursementCenter } from "@/components/payroll/DisbursementCenter";
import { StatutoryDashboard } from "@/components/payroll/StatutoryDashboard";
import { WageCodeBanner } from "@/components/payroll/WageCodeBanner";
import { Loader2 } from "lucide-react";

/*
REDUX PLAN
----------
payrollSlice should contain:
 - employees
 - salaryStructures
 - payrollRuns
 - loading
 - error
 - fetchPayrollData()
 - runPayroll()
 - updateEmployee()
*/

export default function Payroll() {
  const [activeTab, setActiveTab] = useState("overview");

  // CONTEXT → replace with Redux selectors later
  const { employees, salaryStructures, payrollRuns, loading, error, refetch } = usePayroll();

  // BUSINESS LOGIC — compliance calculation (preserved)
  const nonCompliantCount = salaryStructures.filter(s => !s.is_wage_code_compliant).length;
  const complianceRate = salaryStructures.length > 0
    ? ((salaryStructures.length - nonCompliantCount) / salaryStructures.length * 100).toFixed(0)
    : 100;

  if (loading) {
    return (
      <PillarLayout>
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PillarLayout>
    );
  }

  return (
    <PillarLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Payroll & Compliance</h1>
          <p className="text-muted-foreground mt-1">100% compliant with Indian Labour & Tax Laws</p>
        </div>

        <WageCodeBanner complianceRate={Number(complianceRate)} nonCompliantCount={nonCompliantCount} totalEmployees={employees.length} />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="salary">Salary</TabsTrigger>
            <TabsTrigger value="run">Run Payroll</TabsTrigger>
            <TabsTrigger value="statutory">Statutory</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <DisbursementCenter payrollRuns={payrollRuns} employees={employees} onRefresh={refetch} />
          </TabsContent>

          <TabsContent value="employees" className="space-y-6 mt-6">
            <EmployeeList employees={employees} onRefresh={refetch} />
          </TabsContent>

          <TabsContent value="salary" className="space-y-6 mt-6">
            <SalaryStructureEditor employees={employees} salaryStructures={salaryStructures} onRefresh={refetch} />
          </TabsContent>

          <TabsContent value="run" className="space-y-6 mt-6">
            <PayrollRunDashboard payrollRuns={payrollRuns} employees={employees} salaryStructures={salaryStructures} onRefresh={refetch} />
          </TabsContent>

          <TabsContent value="statutory" className="space-y-6 mt-6">
            <StatutoryDashboard payrollRuns={payrollRuns} onRefresh={refetch} />
          </TabsContent>
        </Tabs>
      </div>
    </PillarLayout>
  );
}
