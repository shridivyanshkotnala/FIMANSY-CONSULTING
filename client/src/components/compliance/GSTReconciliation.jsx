import { useState, useEffect } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

/*
  ⚠️ SUPABASE REMOVED — COMMENTED OUT (DO NOT DELETE)
  🔄 FUTURE: Replace with Redux RTK Query endpoint
  import { supabase } from "@/integrations/supabase/client";
*/

// ⚠️ CONTEXT API SHIM — MARKED FOR REMOVAL
// 🔄 FUTURE: Replace with Redux selectors
import { useAuth } from "@/hooks/useAuth";

import {
  FileSearch,
  AlertTriangle,
  CheckCircle2,
  ArrowUpDown,
  IndianRupee,
} from "lucide-react";

import { format } from "date-fns";

/* ================= Fallback ================= */

const FALLBACK_DATA = [
  {
    id: "fb-1",
    gstin: "29AABCU9603R1ZM",
    period: "Feb-2026",
    matched_invoices: 42,
    unmatched_invoices: 3,
    itc_available: 185000,
    itc_claimed: 172000,
    itc_gap: 13000,
    reconciled_at: new Date().toISOString(),
  },
  {
    id: "fb-2",
    gstin: "29AABCU9603R1ZM",
    period: "Jan-2026",
    matched_invoices: 38,
    unmatched_invoices: 1,
    itc_available: 210000,
    itc_claimed: 208000,
    itc_gap: 2000,
    reconciled_at: new Date().toISOString(),
  },
];

/* ================= Helpers ================= */

const formatCurrency = (v) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v);

/* ================= Component ================= */

export function GSTReconciliation() {
  const { organization } = useAuth();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);

      /*
        ⚠️ SUPABASE REMOVED — COMMENTED OUT (DO NOT DELETE)
        🔄 FUTURE: Replace with Redux RTK Query endpoint

        const orgId = organization?.id || "7dc52afc-47c2-4ced-86c0-fc8c3131d78c";
        try {
          const timeout = new Promise((r) => setTimeout(() => r("timeout"), 5000));
          const query = supabase
            .from("gst_reconciliation")
            .select("*")
            .eq("organization_id", orgId)
            .order("period", { ascending: false })
            .limit(12);
          const result = await Promise.race([query, timeout]);
          if (result === "timeout" || result?.error) {
            setRecords(FALLBACK_DATA);
          } else {
            const data = result?.data;
            setRecords(data?.length ? data : FALLBACK_DATA);
          }
        } catch {
          setRecords(FALLBACK_DATA);
        }
      */

      // Use fallback data until backend API is wired
      setRecords(FALLBACK_DATA);
      setLoading(false);
    };

    fetch();
  }, [organization?.id]);

  /* ================= Metrics ================= */

  const totalGap = records.reduce(
    (s, r) => s + (r.itc_gap || 0),
    0
  );

  const totalUnmatched = records.reduce(
    (s, r) => s + (r.unmatched_invoices || 0),
    0
  );

  /* ================= Loading ================= */

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>GST Reconciliation</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  /* ================= UI ================= */

  return (
    <div className="space-y-6">

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">

        {/* Periods */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ArrowUpDown className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Periods Reconciled
                </p>
                <p className="text-2xl font-bold">
                  {records.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ITC Gap */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  totalGap > 0
                    ? "bg-warning/10"
                    : "bg-success/10"
                }`}
              >
                <IndianRupee
                  className={`h-5 w-5 ${
                    totalGap > 0
                      ? "text-warning"
                      : "text-success"
                  }`}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Total ITC Gap
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalGap)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Unmatched */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  totalUnmatched > 0
                    ? "bg-destructive/10"
                    : "bg-success/10"
                }`}
              >
                <AlertTriangle
                  className={`h-5 w-5 ${
                    totalUnmatched > 0
                      ? "text-destructive"
                      : "text-success"
                  }`}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Unmatched Invoices
                </p>
                <p className="text-2xl font-bold">
                  {totalUnmatched}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Period List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5" />
            GSTR-2B Reconciliation
          </CardTitle>
          <CardDescription>
            Compare purchase records against GSTR-2B to identify ITC leakage
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">

          {records.map((rec) => (
            <div
              key={rec.id}
              className="p-4 border rounded-lg flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <FileSearch className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">
                    {rec.period}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {rec.matched_invoices ?? 0} matched ·{" "}
                    {rec.unmatched_invoices ?? 0} unmatched
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">

                {(rec.itc_gap || 0) > 0 ? (
                  <Badge
                    variant="secondary"
                    className="bg-warning/10 text-warning border-warning"
                  >
                    Gap:{" "}
                    {formatCurrency(rec.itc_gap || 0)}
                  </Badge>
                ) : (
                  <Badge className="bg-success/10 text-success border-success">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Matched
                  </Badge>
                )}

                {rec.reconciled_at && (
                  <span className="text-xs text-muted-foreground hidden md:block">
                    {format(
                      new Date(rec.reconciled_at),
                      "dd MMM yyyy"
                    )}
                  </span>
                )}

              </div>
            </div>
          ))}

        </CardContent>
      </Card>

    </div>
  );
}