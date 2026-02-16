// WageCodeBanner.jsx
// Converted TSX → JSX
// Indian Wage Code 2019 compliance banner — shows compliance rate & alerts

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

/*
REDUX NOTE
----------
This is a pure presentational component.
Props come from parent (Payroll page).
No Redux migration needed — already ideal.
*/

export function WageCodeBanner({ complianceRate, nonCompliantCount, totalEmployees }) {
  const isFullyCompliant = nonCompliantCount === 0;

  return (
    <Card
      className={cn(
        "border-l-4",
        isFullyCompliant ? "border-l-success bg-success/5" : "border-l-warning bg-warning/5"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isFullyCompliant ? (
              <CheckCircle2 className="h-6 w-6 text-success" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-warning" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="font-semibold">Indian Wage Code 2019 Compliance</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isFullyCompliant
                  ? "All salary structures are compliant with the new wage code"
                  : `${nonCompliantCount} of ${totalEmployees} structures need attention (Basic < 50% of CTC)`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{complianceRate}%</div>
            <Badge variant={isFullyCompliant ? "default" : "destructive"}>
              {isFullyCompliant ? "Compliant" : "Action Required"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
