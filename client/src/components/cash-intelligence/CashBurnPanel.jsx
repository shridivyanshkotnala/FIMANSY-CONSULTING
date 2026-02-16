import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, AlertCircle, ChevronRight, Building2, Receipt, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

/**
 * CashBurnPanel
 *
 * PRESENTATIONAL ONLY
 * Receives computed liabilities from API/Redux
 *
 * future:
 * const { categories, totalBurn } = useSelector(selectCashBurn)
 */

export function CashBurnPanel({
  categories = [],
  totalBurn = 0,
  loading = false,
}) {
  const navigate = useNavigate();

  const formatCurrency = (amount) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
    return `₹${amount.toFixed(0)}`;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high": return "text-destructive";
      case "medium": return "text-warning";
      default: return "text-muted-foreground";
    }
  };

  // SAFE UI CALCULATION (display only)
  const highPriorityTotal = categories
    .filter(c => c.priority === "high")
    .reduce((sum, c) => sum + c.amount, 0);

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
      onClick={() => navigate("/documents?filter=payables")}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-destructive/10">
            <Flame className="h-4 w-4 text-destructive" />
          </div>
          Cash Burn
          <ChevronRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">

        {/* Total */}
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{formatCurrency(totalBurn)}</span>
          <span className="text-xs text-muted-foreground">this month</span>
        </div>

        {/* Breakdown */}
        <div className="space-y-1.5">
          {categories.map((cat, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className={cn("flex items-center gap-1.5", getPriorityColor(cat.priority))}>
                {cat.icon}
                {cat.label}
                {cat.dueDate && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                    {cat.dueDate}
                  </Badge>
                )}
              </span>
              <span className="font-medium">{formatCurrency(cat.amount)}</span>
            </div>
          ))}
        </div>

        {/* High Priority */}
        <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/5 border border-destructive/10">
          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
          <span className="text-xs text-destructive font-medium">
            {formatCurrency(highPriorityTotal)} high priority
          </span>
        </div>

      </CardContent>
    </Card>
  );
}
