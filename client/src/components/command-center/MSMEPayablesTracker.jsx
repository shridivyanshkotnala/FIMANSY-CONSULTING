import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ❌ SUPABASE REMOVED — replace with Redux selector / API slice
// import { supabase } from "@/integrations/supabase/client";

// ⚠️ CONTEXT — replace with Redux later
import { useAuth } from "@/hooks/useAuth";

import { useNavigate } from "react-router-dom";
import { differenceInDays, format } from "date-fns";
import { AlertTriangle, Building2, ShieldAlert, Info } from "lucide-react";
import { cn } from "@/lib/utils";

/* ============================================================
   BUSINESS LOGIC — DO NOT DELETE
   These rules implement MSME 43B(h) tax deduction compliance
   Backend will only PROVIDE invoices — calculations stay here
============================================================ */

/** Infer MSME probability from vendor name (heuristic) */
function inferMSMEStatus(vendorName) {
  const lowerName = vendorName.toLowerCase();

  const largeEnterprises = [
    "amazon","aws","google","microsoft","infosys","tcs","wipro",
    "reliance","tata","airtel","vodafone","hdfc","icici","sbi"
  ];
  if (largeEnterprises.some(e => lowerName.includes(e))) return "no";

  const msmePatterns = [
    "services","enterprises","solutions","traders",
    "agency","consultants","associates","works","industries","suppliers"
  ];
  if (msmePatterns.some(p => lowerName.includes(p))) return "likely";

  return "likely"; // conservative assumption
}

/** Risk calculation based on MSME Act deadlines */
function calculateRiskLevel(daysSince, deadline) {
  const daysRemaining = deadline - daysSince;

  if (daysRemaining < 0) return "expired";
  if (daysRemaining <= 5) return "critical";
  if (daysRemaining <= 15) return "warning";
  return "safe";
}

/* ============================================================ */

export function MSMEPayablesTracker() {
  const { organization } = useAuth(); // later → Redux selector
  const navigate = useNavigate();

  const [payables, setPayables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalAtRisk, setTotalAtRisk] = useState(0);

  useEffect(() => {
    if (!organization?.id) return;

    const loadData = async () => {
      setLoading(true);

      /**
       * 🔁 REPLACE THIS BLOCK WITH REDUX/API CALL
       *
       * dispatch(fetchPendingPayables(organization.id))
       * const invoices = useSelector(selectPendingPayables)
       */
      const invoices = []; // ← backend will supply

      /* ---------- CORE CALCULATIONS (KEEP) ---------- */

      const today = new Date();

      const enriched = invoices.map(inv => {
        const daysSince = differenceInDays(today, new Date(inv.date_of_issue));

        const msmeStatus = inferMSMEStatus(inv.vendor_name);

        // MSME law: max 45 days, non-MSME treated 90 operational
        const deadline = msmeStatus !== "no" ? 45 : 90;

        const riskLevel =
          msmeStatus !== "no"
            ? calculateRiskLevel(daysSince, deadline)
            : "safe";

        return {
          ...inv,
          daysSinceInvoice: daysSince,
          msmeStatus,
          paymentDeadline: deadline,
          daysRemaining: deadline - daysSince,
          riskLevel,
        };
      });

      // Sort highest risk first
      const riskOrder = { expired: 0, critical: 1, warning: 2, safe: 3 };
      enriched.sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel]);

      setPayables(enriched);

      // total deduction risk exposure
      const atRisk = enriched
        .filter(p => p.riskLevel === "critical" || p.riskLevel === "expired")
        .reduce((sum, p) => sum + Number(p.total_with_gst || 0), 0);

      setTotalAtRisk(atRisk);

      setLoading(false);
    };

    loadData();
  }, [organization?.id]);

  /* -------------------- UI HELPERS -------------------- */

  const formatCurrency = amount =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const getRiskBadge = risk => {
    switch (risk) {
      case "expired":
        return <Badge variant="destructive">Deduction at Risk</Badge>;
      case "critical":
        return <Badge variant="destructive">Tax Risk Alert</Badge>;
      case "warning":
        return <Badge className="bg-warning text-warning-foreground">Pay Soon</Badge>;
      default:
        return <Badge variant="secondary">On Track</Badge>;
    }
  };

  const getMSMEBadge = status => {
    switch (status) {
      case "yes":
        return <Badge variant="outline" className="border-success text-success">MSME</Badge>;
      case "likely":
        return <Badge variant="outline" className="border-warning text-warning">Likely MSME</Badge>;
      default:
        return <Badge variant="outline">Enterprise</Badge>;
    }
  };

  /* -------------------- LOADING -------------------- */

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>MSME 43B(h) Payables Tracker</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const criticalPayables = payables.filter(
    p => p.riskLevel === "critical" || p.riskLevel === "expired"
  );

  /* -------------------- UI -------------------- */

  return (
    <div className="space-y-6">

      {/* ALERT */}
      {totalAtRisk > 0 && (
        <Alert variant="destructive" className="border-2">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle className="text-lg font-semibold">
            Tax Deduction at Risk: {formatCurrency(totalAtRisk)}
          </AlertTitle>
          <AlertDescription>
            {criticalPayables.length} payment(s) nearing 45-day MSME deadline.
          </AlertDescription>
        </Alert>
      )}

      {/* INFO */}
      <Card className="bg-info/5 border-info/20">
        <CardContent className="p-4 flex gap-3">
          <Info className="h-5 w-5 text-info mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Section 43B(h): unpaid MSME invoices beyond 45 days lose tax deduction.
          </p>
        </CardContent>
      </Card>

      {/* TABLE */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            MSME Payables Tracker
          </CardTitle>
          <CardDescription>
            Protect tax deductions by paying MSME vendors on time
          </CardDescription>
        </CardHeader>

        <CardContent>
          {payables.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No pending payables
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Bill Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>MSME</TableHead>
                  <TableHead>Risk</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {payables.map(item => (
                  <TableRow
                    key={item.id}
                    className={cn(item.riskLevel === "critical" && "bg-destructive/5")}
                    onClick={() => navigate(`/documents/${item.id}`)}
                  >
                    <TableCell>
                      <div className="font-medium">{item.vendor_name}</div>
                      <div className="text-xs text-muted-foreground">{item.invoice_number}</div>
                    </TableCell>

                    <TableCell>{format(new Date(item.date_of_issue), "dd MMM yyyy")}</TableCell>

                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.total_with_gst)}
                    </TableCell>

                    <TableCell>{getMSMEBadge(item.msmeStatus)}</TableCell>

                    <TableCell>{getRiskBadge(item.riskLevel)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
