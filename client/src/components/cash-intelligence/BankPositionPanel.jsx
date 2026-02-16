import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Landmark, ChevronRight, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

/**
 * BankPositionPanel
 *
 * PURE PRESENTATIONAL COMPONENT
 *
 * Receives calculated bank position from Redux/API
 *
 * future:
 * const {accounts,totalBalance,lastSync} = useSelector(selectBankPosition)
 */

export function BankPositionPanel({
  accounts = [],
  totalBalance = 0,
  lastSync = null,
  loading = false,
}) {
  const navigate = useNavigate();

  const formatCurrency = (amount) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
    return `₹${amount.toFixed(0)}`;
  };

  // CC account helpers (SAFE UI CALCULATIONS)
  const ccAccount = accounts.find(a => a.type === "cc");
  const drawingPower = ccAccount ? (ccAccount.limit || 0) - (ccAccount.utilized || 0) : 0;
  const ccUsage = ccAccount?.limit ? ((ccAccount.utilized || 0) / ccAccount.limit) * 100 : 0;

  if (loading) {
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

  return (
    <Card
      className="col-span-1 cursor-pointer transition-all hover:shadow-card-hover group"
      onClick={() => navigate("/banking")}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-success/10">
            <Landmark className="h-4 w-4 text-success" />
          </div>
          Bank Position
          <ChevronRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">

        {/* Total Available */}
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-success">
            {formatCurrency(totalBalance)}
          </span>
          <span className="text-xs text-muted-foreground">available</span>
        </div>

        {/* Current Accounts */}
        <div className="space-y-1.5">
          {accounts.filter(a => a.type === "current").map((acc, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{acc.name}</span>
              <span className="font-medium">{formatCurrency(acc.balance)}</span>
            </div>
          ))}
        </div>

        {/* CC Drawing Power */}
        {ccAccount && (
          <div className="space-y-1.5 pt-1 border-t">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">CC Limit</span>
              <span className="font-medium">{formatCurrency(ccAccount.limit || 0)}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Utilized</span>
              <span className="font-medium text-warning">
                {formatCurrency(ccAccount.utilized || 0)}
              </span>
            </div>

            <Progress value={ccUsage} className="h-1.5" />

            <div className="flex items-center justify-between text-xs">
              <span className="text-success font-medium">Drawing Power</span>
              <span className="font-medium text-success">
                {formatCurrency(drawingPower)}
              </span>
            </div>
          </div>
        )}

        {/* Last Sync */}
        {lastSync && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <RefreshCw className="h-3 w-3" />
            Updated {format(new Date(lastSync), "dd MMM")}
          </div>
        )}

      </CardContent>
    </Card>
  );
}
