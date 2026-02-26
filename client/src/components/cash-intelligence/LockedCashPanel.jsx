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
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-warning/10">
            <Lock className="h-4 w-4 text-warning" />
          </div>
          Locked Cash
          <ChevronRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{formatCurrency(totalLocked)}</span>
          {atRiskCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {atRiskCount} at risk
            </Badge>
          )}
        </div>

        {/* Aging Buckets */}
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">0–30 days</span>
            <span className="font-medium text-success">{formatCurrency(b0_30)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">31–45 days</span>
            <span className="font-medium text-warning">{formatCurrency(b30_45)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">46+ days</span>
            <span className="font-medium text-destructive">{formatCurrency(b46_plus)}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 flex rounded-full overflow-hidden bg-muted">
          {totalLocked > 0 && (
            <>
              <div className="bg-success"     style={{ width: `${(b0_30    / totalLocked) * 100}%` }} />
              <div className="bg-warning"     style={{ width: `${(b30_45   / totalLocked) * 100}%` }} />
              <div className="bg-destructive" style={{ width: `${(b46_plus / totalLocked) * 100}%` }} />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


