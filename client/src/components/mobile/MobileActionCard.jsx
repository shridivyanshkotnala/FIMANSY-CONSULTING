import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

/**
 * MobileActionCard
 *
 * Shows an actionable alert card (critical / warning / info)
 * Used on dashboards to push user toward corrective workflow
 *
 * CURRENT:
 * Navigation handled directly using react-router
 *
 * FUTURE (Redux possibility):
 * You may dispatch:
 *   dispatch(openWorkflow("reconcile"))
 * instead of navigate(actionPath)
 * if you later move to workflow-driven UI instead of route-driven UI
 */

export function MobileActionCard({
  icon,
  message,
  actionLabel,
  actionPath,
  secondaryLabel,
  secondaryPath,
  severity,
}) {
  const navigate = useNavigate();

  const getSeverityStyles = () => {
    switch (severity) {
      case "critical":
        return {
          border: "border-l-destructive",
          bg: "bg-destructive/5",
          iconBg: "bg-destructive/10 text-destructive",
        };
      case "warning":
        return {
          border: "border-l-warning",
          bg: "bg-warning/5",
          iconBg: "bg-warning/10 text-warning",
        };
      default:
        return {
          border: "border-l-info",
          bg: "bg-info/5",
          iconBg: "bg-info/10 text-info",
        };
    }
  };

  const styles = getSeverityStyles();

  return (
    <div
      className={cn(
        "rounded-xl border border-l-4 p-4 transition-all active:scale-[0.99]",
        styles.border,
        styles.bg
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg flex-shrink-0", styles.iconBg)}>
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground leading-tight">
            {message}
          </p>

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <button
              onClick={() => navigate(actionPath)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg touch-manipulation active:scale-95 transition-transform"
            >
              {actionLabel}
              <ChevronRight className="h-3 w-3" />
            </button>

            {secondaryLabel && secondaryPath && (
              <button
                onClick={() => navigate(secondaryPath)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-secondary text-secondary-foreground text-xs font-medium rounded-lg touch-manipulation active:scale-95 transition-transform"
              >
                {secondaryLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
