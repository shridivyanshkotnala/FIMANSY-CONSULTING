// StatutoryDashboard.jsx
// Converted TSX → JSX
// Statutory compliance dashboard — EPF, ESI, PT, TDS challan tracking

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/payroll/calculations";
import { format } from "date-fns";
import { Shield, AlertTriangle, CheckCircle2, Clock, FileText, Download } from "lucide-react";

/*
REDUX NOTE
----------
Container should provide:
selectPayrollRuns(state)
getChallans(payrollRunId) -> thunk
createChallan(data) -> thunk
updateChallanStatus(id, status, details) -> thunk
*/

const STATUTORY_TYPES = [
  { key: "epf", label: "EPF", description: "Employee Provident Fund", dueDay: 15 },
  { key: "esi", label: "ESI", description: "Employee State Insurance", dueDay: 15 },
  { key: "pt", label: "Professional Tax", description: "State PT", dueDay: 10 },
  { key: "tds", label: "TDS", description: "Tax Deducted at Source", dueDay: 7 },
];

export function StatutoryDashboard({ payrollRuns, onRefresh }) {
  // BUSINESS LOGIC — statutory compliance summary
  const latestRun = payrollRuns?.[0];
  const completedRuns = payrollRuns?.filter((r) => r.status === "completed") || [];

  const totalStatutoryYTD = completedRuns.reduce(
    (sum, r) => sum + (r.total_employer_statutory || 0) + (r.total_employee_statutory || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <div className="text-2xl font-bold">{formatINR(totalStatutoryYTD)}</div>
              <div className="text-sm text-muted-foreground">Total Statutory YTD</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <div>
              <div className="text-2xl font-bold">{completedRuns.length}</div>
              <div className="text-sm text-muted-foreground">Completed Runs</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            <div>
              <div className="text-2xl font-bold">
                {payrollRuns ? payrollRuns.length - completedRuns.length : 0}
              </div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Statutory Types */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Statutory Obligations</h2>
        <div className="grid gap-4">
          {STATUTORY_TYPES.map((type) => (
            <Card key={type.key}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{type.label}</Badge>
                      <span className="font-medium">{type.description}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Due by {type.dueDay}th of following month
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-1" /> View Challans
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" /> Generate
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent payroll runs for statutory context */}
      {latestRun && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Latest Payroll Run</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{latestRun.run_number}</p>
                <p className="text-sm text-muted-foreground">
                  {latestRun.pay_period_start &&
                    format(new Date(latestRun.pay_period_start), "MMM dd")} –{" "}
                  {latestRun.pay_period_end &&
                    format(new Date(latestRun.pay_period_end), "MMM dd, yyyy")}
                </p>
              </div>
              <Badge>{latestRun.status}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {(!payrollRuns || payrollRuns.length === 0) && (
        <Card className="p-8 text-center text-muted-foreground">
          No payroll runs found. Run payroll first to see statutory obligations.
        </Card>
      )}
    </div>
  );
}
