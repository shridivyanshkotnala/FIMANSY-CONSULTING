import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useComplianceActions } from "@/components/compliance/ComplianceActionItems";

import {
  AlertTriangle,
  Package,
  FileText,
  Bell,
  ChevronRight,
  Clock,
  Zap
} from "lucide-react";

import { cn } from "@/lib/utils";

/*
  ActionFeed

  Shows important operational + compliance actions.

  CURRENT:
    Mock operational actions (backend removed)
    Real UI logic preserved

  LATER:
    Replace mockActions with Redux selector:
      state.dashboard.actions
*/

export function ActionFeed() {
  const navigate = useNavigate();

  // compliance hook still allowed (frontend rule engine)
  const { actions: complianceActions, loading: complianceLoading } = useComplianceActions();

  // ---- MOCK operational actions (replaces database queries) ----
  const operationalActions = [
    {
      id: "unlinked-transactions",
      severity: "warning",
      icon: <AlertTriangle className="h-5 w-5" />,
      message: "3 bank transactions need linking.",
      actionLabel: "Link Now",
      actionPath: "/banking",
    },
    {
      id: "low-stock",
      severity: "warning",
      icon: <Package className="h-5 w-5" />,
      message: "2 items below safety stock level.",
      actionLabel: "View Inventory",
      actionPath: "/inventory",
    },
    {
      id: "pending-docs",
      severity: "info",
      icon: <FileText className="h-5 w-5" />,
      message: "5 documents need review.",
      actionLabel: "Review Now",
      actionPath: "/documents",
    },
    {
      id: "upcoming-payables",
      severity: "info",
      icon: <Clock className="h-5 w-5" />,
      message: "2 payments due in next 7 days.",
      actionLabel: "View Payables",
      actionPath: "/cash-intelligence",
      secondaryLabel: "Make Payment",
      secondaryPath: "/banking",
    },
  ];

  // Merge + sort
  const actions = useMemo(() => {
    const allActions = [
      ...operationalActions,
      ...complianceActions,
    ];

    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return allActions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }, [complianceActions]);

  const loading = complianceLoading;

  const getSeverityStyles = (severity) => {
    switch (severity) {
      case "critical":
        return "border-l-destructive bg-destructive/5";
      case "warning":
        return "border-l-warning bg-warning/5";
      default:
        return "border-l-info bg-info/5";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Action Feed
          </CardTitle>
        </CardHeader>
        <CardContent className="py-10 text-center text-muted-foreground">
          Loading actions...
        </CardContent>
      </Card>
    );
  }

  if (actions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Action Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <Bell className="h-6 w-6 text-success" />
            </div>
            <p className="text-lg font-medium text-foreground mb-1">All caught up!</p>
            <p className="text-sm text-muted-foreground">No pending actions right now.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex items-center justify-between">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Action Feed
        </CardTitle>
        <Badge variant="secondary" className="text-xs">
          {actions.length} pending
        </Badge>
      </CardHeader>

      <CardContent className="space-y-3">
        {actions.map((action) => (
          <div
            key={action.id}
            className={cn(
              "border-l-4 rounded-lg p-4 transition-all hover:shadow-md",
              getSeverityStyles(action.severity)
            )}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg">{action.icon}</div>

              <div className="flex-1">
                <p className="text-sm font-medium">{action.message}</p>

                <div className="flex items-center gap-2 mt-2">
                  <Button size="sm" onClick={() => navigate(action.actionPath)} className="h-8">
                    {action.actionLabel}
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>

                  {action.secondaryLabel && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(action.secondaryPath)}
                      className="h-8"
                    >
                      {action.secondaryLabel}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
