/**
 * GSTVendorCompliance — Dummy / Placeholder Component
 * ----------------------------------------------------
 * ⚠️ STUB: This is a placeholder component.
 * 🔄 FUTURE: Implement GST vendor compliance tracking.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

export function GSTVendorCompliance() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          GST Vendor Compliance
          <Badge variant="secondary" className="ml-2 text-xs">Coming Soon</Badge>
        </CardTitle>
        <CardDescription>
          Track GST compliance status of your vendors and identify risk
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Vendor compliance tracking is not yet available</p>
          <p className="text-xs mt-1">
            This module will verify vendor GSTIN status, filing frequency, and ITC eligibility.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
