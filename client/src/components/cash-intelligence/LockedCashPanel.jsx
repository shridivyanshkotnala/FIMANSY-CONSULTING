import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, AlertTriangle, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGetAgingBucketsQuery } from "@/Redux/Slices/api/cashIntelligenceApi";

export function LockedCashPanel() {
  const navigate = useNavigate();
  const { data: raw, isLoading, isFetching } = useGetAgingBucketsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const formatCurrency = (amount) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000)   return `₹${(amount / 1000).toFixed(0)}K`;
    return `₹${Number(amount || 0).toFixed(0)}`;
  };

  if (isLoading || isFetching) {
    return (
      <Card className="col-span-1">
        <CardHeader className="pb-2">
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-8 w-20 mb-2 bg-muted rounded animate-pulse" />
          <div className="h-3 w-full bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  // Response: { success, data: { bucket_0_30, bucket_30_45, bucket_46_plus, requiringAction } }
  const bucketData = raw?.data ?? raw ?? {};

  const sum = (arr) =>
    Array.isArray(arr) ? arr.reduce((acc, inv) => acc + (inv.balanceAmount ?? 0), 0) : 0;

  const b0_30    = sum(bucketData.bucket_0_30);
  const b30_45   = sum(bucketData.bucket_30_45);
  const b46_plus = sum(bucketData.bucket_46_plus);
  const totalLocked = b0_30 + b30_45 + b46_plus;

  const atRiskCount = (
    (bucketData.bucket_30_45?.length  ?? 0) +
    (bucketData.bucket_46_plus?.length ?? 0)
  );

  return (
    <Card
      className="col-span-1 cursor-pointer transition-all hover:shadow-card-hover group"
      onClick={() => navigate("/documents?filter=receivables")}
    >
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-warning/10">
            <Lock className="h-4 w-4 text-warning" />
          </div>
          Locked Cash
          <ChevronRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-3 pb-4">
        <div className="grid gap-3 lg:grid-cols-[1.15fr_1fr]">
          <div className="rounded-xl border border-border/60 bg-muted/10 p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold leading-none">{formatCurrency(totalLocked)}</span>
              {atRiskCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {atRiskCount} at risk
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Outstanding receivables currently locked in cycle</p>

            <div className="h-2.5 flex rounded-full overflow-hidden bg-background/70 border border-border/50 max-w-sm">
              {totalLocked > 0 && (
                <>
                  <div className="bg-success" style={{ width: `${(b0_30 / totalLocked) * 100}%` }} />
                  <div className="bg-warning" style={{ width: `${(b30_45 / totalLocked) * 100}%` }} />
                  <div className="bg-destructive" style={{ width: `${(b46_plus / totalLocked) * 100}%` }} />
                </>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/10 p-2.5 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2">
            <div className="rounded-lg border border-border/50 bg-background/40 px-3 py-2">
              <p className="text-[11px] text-muted-foreground">0–30 days</p>
              <p className="text-sm font-semibold text-success mt-0.5">{formatCurrency(b0_30)}</p>
            </div>

            <div className="rounded-lg border border-border/50 bg-background/40 px-3 py-2">
              <p className="text-[11px] text-muted-foreground">31–45 days</p>
              <p className="text-sm font-semibold text-warning mt-0.5">{formatCurrency(b30_45)}</p>
            </div>

            <div className="rounded-lg border border-border/50 bg-background/40 px-3 py-2">
              <p className="text-[11px] text-muted-foreground">46+ days</p>
              <p className="text-sm font-semibold text-destructive mt-0.5">{formatCurrency(b46_plus)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


