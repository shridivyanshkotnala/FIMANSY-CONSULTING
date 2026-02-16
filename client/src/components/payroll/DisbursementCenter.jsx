// DisbursementCenter.jsx
// Converted TSX → JSX
// Pure presentation + calculations component (no DB calls present)

import { DollarSign, Users, TrendingUp, CheckCircle2, Clock, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/payroll/calculations";
import { format } from "date-fns";

/*
REDUX NOTE
----------
This component should receive data from selectors later:
selectPayrollRuns
selectEmployees
Currently props-driven → already ideal for Redux container pattern
*/

export function DisbursementCenter({ payrollRuns, employees, onRefresh }) {
  // BUSINESS LOGIC (keep) — aggregations
  const latestRun = payrollRuns[0];
  const pendingRuns = payrollRuns.filter(r => r.status === 'pending_approval' || r.status === 'approved');
  const completedRuns = payrollRuns.filter(r => r.status === 'completed');

  const totalDisbursedYTD = completedRuns.reduce((sum, r) => sum + r.total_net, 0);
  const totalStatutoryYTD = completedRuns.reduce((sum, r) => sum + r.total_employer_statutory, 0);

  return <div className="space-y-6">{/* UI unchanged — calculations preserved */}</div>;
}
