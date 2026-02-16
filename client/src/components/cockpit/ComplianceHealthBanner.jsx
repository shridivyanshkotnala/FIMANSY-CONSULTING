import { CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  ComplianceHealthBanner

  Displays overall compliance status at top of dashboard.
  Color + icon change based on status.

  Pure presentation component
  No state, no API
*/

export function ComplianceHealthBanner({ status, message, subMessage }) {
  const statusConfig = {
    green: {
      icon: CheckCircle2,
      bg: "bg-primary/10 border-primary/20",
      iconColor: "text-primary",
      textColor: "text-primary",
    },
    amber: {
      icon: Clock,
      bg: "bg-warning/10 border-warning/20",
      iconColor: "text-warning",
      textColor: "text-warning",
    },
    red: {
      icon: AlertCircle,
      bg: "bg-destructive/10 border-destructive/20",
      iconColor: "text-destructive",
      textColor: "text-destructive",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn("flex items-center gap-3 p-4 rounded-xl border", config.bg)}>
      <div className={cn("p-2 rounded-lg", config.bg)}>
        <Icon className={cn("h-5 w-5", config.iconColor)} />
      </div>

      <div className="flex-1">
        <p className={cn("font-semibold", config.textColor)}>{message}</p>
        {subMessage && (
          <p className="text-sm text-muted-foreground">{subMessage}</p>
        )}
      </div>
    </div>
  );
}
