// PayrollRunDashboard.jsx
// Converted TSX → JSX
// Payroll run management — create, process, approve payroll runs

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatINR } from "@/lib/payroll/calculations";
import { format } from "date-fns";
import { Play, CheckCircle2, Clock, AlertCircle, Plus, Calendar } from "lucide-react";

/*
REDUX NOTE
----------
Container should provide:
selectPayrollRuns(state)
selectEmployees(state)
selectSalaryStructures(state)
createPayrollRun(data) -> thunk
updatePayrollRunStatus(id, status) -> thunk
*/

const STATUS_MAP = {
  draft: { label: "Draft", variant: "secondary", icon: Clock },
  processing: { label: "Processing", variant: "default", icon: Play },
  pending_approval: { label: "Pending Approval", variant: "outline", icon: AlertCircle },
  approved: { label: "Approved", variant: "default", icon: CheckCircle2 },
  completed: { label: "Completed", variant: "default", icon: CheckCircle2 },
};

export function PayrollRunDashboard({ payrollRuns, employees, salaryStructures, onRefresh }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRun, setNewRun] = useState({
    payPeriodStart: "",
    payPeriodEnd: "",
    paymentDate: "",
  });

  // BUSINESS LOGIC — aggregation
  const activeRuns = payrollRuns.filter((r) => r.status !== "completed");
  const completedRuns = payrollRuns.filter((r) => r.status === "completed");
  const totalProcessed = completedRuns.reduce((sum, r) => sum + (r.total_net || 0), 0);

  const getStatusBadge = (status) => {
    const info = STATUS_MAP[status] || { label: status, variant: "outline" };
    return <Badge variant={info.variant}>{info.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold">{payrollRuns.length}</div>
          <div className="text-sm text-muted-foreground">Total Runs</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{activeRuns.length}</div>
          <div className="text-sm text-muted-foreground">Active Runs</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{employees.length}</div>
          <div className="text-sm text-muted-foreground">Employees</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{formatINR(totalProcessed)}</div>
          <div className="text-sm text-muted-foreground">YTD Disbursed</div>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Payroll Runs</h2>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> New Payroll Run
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Payroll Run</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Pay Period Start</Label>
                <Input type="date" value={newRun.payPeriodStart} onChange={(e) => setNewRun((p) => ({ ...p, payPeriodStart: e.target.value }))} />
              </div>
              <div>
                <Label>Pay Period End</Label>
                <Input type="date" value={newRun.payPeriodEnd} onChange={(e) => setNewRun((p) => ({ ...p, payPeriodEnd: e.target.value }))} />
              </div>
              <div>
                <Label>Payment Date</Label>
                <Input type="date" value={newRun.paymentDate} onChange={(e) => setNewRun((p) => ({ ...p, paymentDate: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={() => { setIsCreateOpen(false); onRefresh?.(); }}>Create Run</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Runs list */}
      <div className="space-y-3">
        {payrollRuns.map((run) => (
          <Card key={run.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{run.run_number || "Payroll Run"}</p>
                  <p className="text-sm text-muted-foreground">
                    <Calendar className="inline h-3 w-3 mr-1" />
                    {run.pay_period_start && format(new Date(run.pay_period_start), "MMM dd")} –{" "}
                    {run.pay_period_end && format(new Date(run.pay_period_end), "MMM dd, yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {run.total_net > 0 && (
                    <div className="text-right">
                      <p className="font-semibold">{formatINR(run.total_net)}</p>
                      <p className="text-xs text-muted-foreground">Net Pay</p>
                    </div>
                  )}
                  {getStatusBadge(run.status)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {payrollRuns.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            No payroll runs yet. Create your first run above.
          </Card>
        )}
      </div>
    </div>
  );
}
