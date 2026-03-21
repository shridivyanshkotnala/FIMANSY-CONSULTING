import { 
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/*
  PulseTile
  Dashboard metric card (Cashflow, Banking, Inventory etc.)
  Shows value + status color + opens drilldown panel.

  Pure UI component — no API / global state
*/

export function PulseTile({
  title,
  icon: Icon,
  value,
  status,
  subtitle,
  details = [],
  actionLabel,
  onDrillDown
}) {
  const statusColors = {
    green: "border-primary/25 bg-card hover:bg-primary/5",
    amber: "border-warning/25 bg-card hover:bg-warning/5",
    red: "border-destructive/25 bg-card hover:bg-destructive/5",
  };

  const iconColors = {
    green: "text-primary bg-primary/10 border border-primary/20",
    amber: "text-warning bg-warning/10 border border-warning/20",
    red: "text-destructive bg-destructive/10 border border-destructive/20",
  };

  const statusLabel = {
    green: "Healthy",
    amber: "Watch",
    red: "Urgent",
  };

  const StatusIcon =
    status === "green"
      ? CheckCircle2
      : status === "amber"
      ? Clock
      : AlertCircle;

  return (
    <button
      onClick={onDrillDown}
      className={cn(
        "w-full rounded-2xl border p-5 md:p-6 text-left transition-all duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 group",
        statusColors[status]
      )}
    >
      <div className="flex items-start justify-between mb-5">
        <div className={cn("p-3 rounded-xl", iconColors[status])}>
          <Icon className="h-5 w-5" />
        </div>

        <span className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
          status === "green" && "bg-primary/10 text-primary",
          status === "amber" && "bg-warning/10 text-warning",
          status === "red" && "bg-destructive/10 text-destructive"
        )}>
          <StatusIcon className="h-3.5 w-3.5" />
          {statusLabel[status]}
        </span>
      </div>

      <div className="mb-5">
        <p className="text-2xl md:text-[2rem] font-semibold tracking-tight">{value}</p>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{subtitle}</p>
        )}

        {details.length > 0 && (
          <div className="mt-4 rounded-xl border border-border/70 bg-muted/20 p-3 space-y-2">
            {details.map((detail) => (
              <div key={detail.label} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{detail.label}</span>
                <span className="font-semibold text-foreground">{detail.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs text-primary font-medium flex items-center gap-1 transition-transform group-hover:translate-x-0.5">
          {actionLabel}
          <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </button>
  );
}

/*
  DrillDownPanel
  Slide-over side panel opened from a PulseTile
  Used for quick details and navigation to full page
*/

export function DrillDownPanel({
  open,
  onClose,
  title,
  children,
  actionLabel,
  onAction
}) {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl">{title}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {children}
        </div>

        {actionLabel && (
          <div className="mt-8 pt-4 border-t">
            <Button className="w-full" onClick={onAction}>
              {actionLabel}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
