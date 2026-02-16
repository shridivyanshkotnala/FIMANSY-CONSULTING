import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  TrendingUp,
  Upload,
  AlertCircle,
} from "lucide-react";

/*
  Simple navigation shortcuts panel.
  No API logic here — only routing triggers.
*/

export function QuickActionsPanel() {
  const navigate = useNavigate();

  // Config-driven UI — easier to expand later
  const quickActions = [
    {
      icon: <AlertCircle className="h-5 w-5" />,
      label: "Overdue Invoices",
      description: "Chase pending payments",
      action: () => navigate("/cash-intelligence"),
      variant: "default",
    },
    {
      icon: <CreditCard className="h-5 w-5" />,
      label: "Make Payment",
      description: "Pay vendors & bills",
      action: () => navigate("/banking"),
      variant: "outline",
    },
    {
      icon: <Upload className="h-5 w-5" />,
      label: "Upload Invoice",
      description: "Add new document",
      action: () => navigate("/upload"),
      variant: "outline",
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      label: "Cash Flow",
      description: "View detailed analysis",
      action: () => navigate("/cash-intelligence"),
      variant: "outline",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium">
          Quick Actions
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant}
              className="h-auto flex-col items-start p-4 gap-2"
              onClick={action.action}
            >
              <div className="flex items-center gap-2 w-full">
                {action.icon}
                <span className="font-medium text-sm">{action.label}</span>
              </div>

              <span className="text-xs text-muted-foreground text-left">
                {action.description}
              </span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
