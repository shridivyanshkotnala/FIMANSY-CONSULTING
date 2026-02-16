import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

/*
  PURE VISUALIZATION COMPONENT

  Receives invoices
  Calculates category totals locally
  No database access
*/

const categoryColors = {
  expense: "bg-destructive",
  revenue: "bg-green-500",
  asset: "bg-primary",
  liability: "bg-amber-500",
};

const categoryLabels = {
  expense: "Expenses",
  revenue: "Revenue",
  asset: "Assets",
  liability: "Liabilities",
};

export function CategoryBreakdown({ invoices = [], loading = false }) {

  // ---------- CALCULATIONS ----------
  const data = useMemo(() => {

    if (!invoices.length) return [];

    const categoryMap = new Map();

    invoices.forEach(inv => {
      const category = inv.document_category || "expense";

      const existing = categoryMap.get(category) || { count: 0, total: 0 };

      categoryMap.set(category, {
        count: existing.count + 1,
        total: existing.total + Number(inv.total_with_gst || 0),
      });
    });

    // Keep fixed order
    return ["expense", "revenue", "asset", "liability"]
      .map(cat => categoryMap.get(cat) && ({ category: cat, ...categoryMap.get(cat) }))
      .filter(Boolean);

  }, [invoices]);

  const totalAmount = useMemo(
    () => data.reduce((sum, d) => sum + d.total, 0),
    [data]
  );

  // ---------- FORMAT ----------
  const formatCurrency = (value) => {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value.toFixed(0)}`;
  };

  // ---------- LOADING ----------
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // ---------- UI ----------
  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Categories</CardTitle>
        <CardDescription>Breakdown by document type</CardDescription>
      </CardHeader>

      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            No documents uploaded yet
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((item) => {
              const percentage = totalAmount > 0 ? (item.total / totalAmount) * 100 : 0;

              return (
                <div key={item.category} className="space-y-2">

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${categoryColors[item.category]}`} />
                      <span className="font-medium">{categoryLabels[item.category]}</span>
                      <span className="text-muted-foreground">({item.count})</span>
                    </div>

                    <span className="font-medium">{formatCurrency(item.total)}</span>
                  </div>

                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full ${categoryColors[item.category]} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
